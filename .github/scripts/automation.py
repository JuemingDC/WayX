"""GitHub Actions orchestration; converter and runtime versions stay independent."""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

RUNTIME = Path('.github/monitor/.runtime')
MANAGED = ['.github/sources/', 'Resource/Loon', 'Adblock/Quantumult X',
           'Adblock/Surge', 'Script', 'Rule', 'README.md']
CLEAN = ['.github/sources/loon.json', *MANAGED[1:]]


def run(args: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(args, check=True, text=True,
                            stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else ''


def output(name: str, value: str) -> None:
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
        stream.write(f'{name}={value}\n')


def write_result(result: dict) -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / 'pipeline-result.json').write_text(
        json.dumps(result, indent=2) + '\n', encoding='utf-8')


def execute_checks(stage: str, checks: list[tuple[str, list[str]]]) -> None:
    """Run every independent check; only anomalies enter the review queue."""
    RUNTIME.mkdir(parents=True, exist_ok=True)
    report_file = RUNTIME / 'validation-results.json'
    report = read_report('validation-results.json', {'version': 1, 'stages': {}})
    if report.get('version') != 1 or not isinstance(report.get('stages'), dict):
        raise ValueError('Invalid validation-results.json')
    results = []
    # Invalidate an earlier result before starting so interrupted runs cannot pass.
    report['stages'][stage] = {'complete': False, 'checks': results}
    report_file.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    for index, (check, command) in enumerate(checks):
        stem = f'{stage}-{index:04d}'
        log_file = RUNTIME / (stem + '.log')
        evidence_file = RUNTIME / (stem + '.json')
        evidence_file.unlink(missing_ok=True)
        env = dict(os.environ)
        env.pop('WAYX_CHECK_REPORT', None)
        if stage == 'verify':
            env['WAYX_CHECK_REPORT'] = str(evidence_file.resolve())
        with log_file.open('w', encoding='utf-8') as stream:
            try:
                process = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT,
                                         env=env, text=True, check=False)
                code = process.returncode
            except OSError as error:
                stream.write(str(error))
                code = 127
        item = {'id': check, 'command': command, 'status': 'passed' if code == 0 else 'failed',
                'exitCode': code, 'log': log_file.as_posix()}
        if evidence_file.exists():
            try:
                evidence = json.loads(evidence_file.read_text(encoding='utf-8'))
                if evidence.get('version') != 1 or not isinstance(evidence.get('findings'), list):
                    raise ValueError('Invalid check evidence')
                item['findings'] = evidence['findings']
                item['checked'] = evidence.get('checked', 0)
                item['coverage'] = evidence.get('coverage', {})
                if item['findings']:
                    item['status'] = 'failed'
            except (ValueError, AttributeError) as error:
                item['status'] = 'failed'
                item['findings'] = [{'code': 'invalid-check-evidence', 'text': str(error)}]
        if item['status'] == 'failed':
            text = log_file.read_text(encoding='utf-8', errors='replace')
            item['detail'] = text if len(text) <= 4000 else text[:2000] + '\n[full log in artifact]\n' + text[-2000:]
            print(f'::error title=WayX validation::{stage}/{check}: see {log_file}')
        results.append(item)
        report_file.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    report['stages'][stage]['complete'] = True
    report_file.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    failed = sum(item['status'] == 'failed' for item in results)
    print(f'{stage}: passed={len(results) - failed}, failed={failed}; details: {report_file}')
    if failed:
        raise RuntimeError(f'{stage}: {failed} check(s) require review')


def prepare() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / 'validation-results.json').unlink(missing_ok=True)
    refs = run(['git', 'ls-remote', '--heads', 'origin'], capture=True)
    branches = [line.split()[1].removeprefix('refs/heads/')
                for line in refs.splitlines()]
    if not 1 <= len(branches) <= 2 or 'main' not in branches:
        raise RuntimeError('WayX requires main and at most one test branch')
    unexpected = set(branches) - {'main', 'test'}
    if unexpected:
        raise RuntimeError('Unexpected WayX branch: ' + ', '.join(sorted(unexpected)))


def syntax() -> None:
    checks = []
    for directory in ['.github/converter', '.github/scripts', 'Script']:
        for file in sorted(Path(directory).rglob('*')):
            if file.is_file() and file.suffix in {'.js', '.mjs'}:
                checks.append(('syntax:' + file.as_posix(), ['node', '--check', str(file)]))
    checks.append(('python-syntax', [sys.executable, '-m', 'compileall', '-q',
                                   '.github/converter', '.github/scripts', '.github/monitor']))
    execute_checks('syntax', checks)


def checkpoint() -> None:
    execute_checks('checkpoint', [(suite, ['node', f'.github/converter/tests/{suite}.mjs'])
                   for suite in ['core', 'rewrite', 'script', 'conversion', 'architecture',
                                 'workflow', 'official-capabilities', 'runtime']])


def regex() -> None:
    """Compile emitted HTTP matchers with the runner's ICU regex engine."""
    import ctypes
    import ctypes.util
    import re

    name = ctypes.util.find_library('icui18n')
    if not name:
        raise RuntimeError('ICU regex library is required for target publication audit')
    library = ctypes.CDLL(name)
    suffix = re.search(r'\.(\d+)$', name)

    def symbol(base: str):
        value = getattr(library, base, None)
        if value is None and suffix:
            value = getattr(library, base + '_' + suffix[1], None)
        if value is None:
            raise RuntimeError('ICU regex symbol unavailable: ' + base)
        return value

    open_regex = symbol('uregex_open')
    open_regex.argtypes = [ctypes.c_void_p, ctypes.c_int32, ctypes.c_uint32,
                          ctypes.c_void_p, ctypes.POINTER(ctypes.c_int32)]
    open_regex.restype = ctypes.c_void_p
    close_regex = symbol('uregex_close')
    close_regex.argtypes = [ctypes.c_void_p]
    error_name = symbol('u_errorName')
    error_name.argtypes = [ctypes.c_int32]
    error_name.restype = ctypes.c_char_p
    patterns = json.load(sys.stdin)
    failures = []
    for item in patterns:
        encoded = item['pattern'].encode('utf-16-le')
        buffer = ctypes.create_string_buffer(encoded + b'\0\0')
        status = ctypes.c_int32(0)
        compiled = open_regex(buffer, len(encoded) // 2, 0, None, ctypes.byref(status))
        if compiled:
            close_regex(compiled)
        if status.value > 0:
            failures.append(item['label'] + ': ' + error_name(status.value).decode()
                            + ': ' + item['pattern'])
    if failures:
        raise RuntimeError('ICU target regex audit failed:\n' + '\n'.join(failures))
    print(f'ICU target regex audit passed: {len(patterns)} unique patterns')


def verify() -> None:
    commands = [
        ['tools/regenerate-canonical.mjs', '--successful-only'],
        ['tests/catalog.mjs'], ['tools/validate-conversion-policy.mjs', '--all'],
        ['tools/update-readme.mjs'], ['tools/verify-managed-conversions.mjs'],
        ['tools/audit-repository.mjs'], ['tests/artifacts.mjs'],
    ]
    execute_checks('verify', [(file, ['node', '.github/converter/' + file, *args])
                              for file, *args in commands] + [('rule-aggregation', [sys.executable, '.github/converter/rules.py', 'check'])])


def rules() -> None:
    execute_checks('rules', [('aggregate', [sys.executable, '.github/converter/rules.py', 'sync'])])


def catalog() -> None:
    execute_checks('catalog', [('discovery', [sys.executable, '.github/converter/tools/refresh-kelee-catalog.py'])])


def sync() -> None:
    execute_checks('loon_sync', [('full-catalog', ['node', '.github/scripts/sync-convert.mjs'])])


def monitor() -> None:
    execute_checks('monitor', [('upstreams', [sys.executable, '.github/monitor/monitor_upstreams.py'])])


def reports() -> None:
    execute_checks('reports', [('reconciliation', ['node', '.github/converter/tools/conversion-reports.mjs'])])


def issues() -> None:
    args = ['node', '.github/scripts/propose-conversion-issues.mjs']
    if not os.environ.get('PUBLISH_BRANCH'):
        args.append('--dry-run')
    run(args)


def gate() -> None:
    stages = json.loads(os.environ['STAGES'])
    required = ['syntax', 'catalog', 'rules', 'checkpoint', 'loon_sync', 'verify', 'reports', 'issues']
    monitor = os.environ.get('MONITOR_ENABLED') == 'true'
    if monitor:
        required.append('monitor')
    failed = [name for name in required if stages.get(name, {}).get('outcome') != 'success']
    validation = read_report('validation-results.json', {'version': 1, 'stages': {}})
    audited = [name for name in required if name != 'issues']
    if (validation.get('version') != 1 or any(
            validation.get('stages', {}).get(name, {}).get('complete') is not True or
            not validation['stages'][name].get('checks') or
            any(check.get('status') != 'passed' for check in validation['stages'][name]['checks'])
            for name in audited)):
        failed.append('validation integrity')
    if os.environ.get('SYNC_PUBLISHABLE') != 'true':
        failed.append('sync integrity')
    if monitor and os.environ.get('MONITOR_COMPLETE') != 'true':
        failed.append('monitor integrity')
    write_result({'publishable': not failed, 'failedGates': failed,
                  'stages': {name: value.get('outcome') for name, value in stages.items()}})
    output('publishable', str(not failed).lower())
    for name in failed:
        print('::error::Publication blocked: ' + name)


def publish() -> None:
    output('publication', 'blocked')
    if os.environ.get('PUBLISHABLE') != 'true':
        raise RuntimeError('Publication gates did not pass')
    branch = os.environ.get('PUBLISH_BRANCH', '')
    if not branch:
        output('publication', 'read-only')
        return
    if branch not in {'main', 'test'}:
        raise RuntimeError('Unexpected publication branch: ' + branch)
    expected = os.environ['EXPECTED_HEAD']
    if run(['git', 'rev-parse', 'HEAD'], capture=True) != expected:
        raise RuntimeError('Checked-out HEAD differs from requested baseline')
    run(['git', 'add', '-A', '--', *MANAGED])
    if os.environ.get('MONITOR_ENABLED') == 'true':
        run(['git', 'add', '-A', '--', '.github/monitor/state.json', '.github/monitor/upstream'])
    refs = run(['git', 'ls-remote', 'origin', 'refs/heads/' + branch], capture=True)
    remote_sha = refs.split()[0] if refs else ''
    if remote_sha != expected:
        print('::error::Destination advanced; rerun from its new baseline before publishing.')
        raise RuntimeError('Destination advanced')
    diff = subprocess.run(['git', 'diff', '--cached', '--quiet'], check=False)
    if diff.returncode == 0:
        output('publication', 'unchanged')
    elif diff.returncode == 1:
        run(['git', 'config', 'user.name', 'chance-upstream-bot'])
        run(['git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
        run(['git', 'commit', '-m', 'chore: sync upstream and regenerate targets'])
        run(['git', 'push', 'origin', 'HEAD:' + branch])
        output('publication', 'pushed')
    else:
        raise RuntimeError('Cannot inspect staged Git diff')
    if run(['git', 'status', '--porcelain', '--untracked-files=all', '--', *CLEAN], capture=True):
        raise RuntimeError('Managed working tree is not clean after publication')


def read_report(name: str, default: dict) -> dict:
    file = RUNTIME / name
    return json.loads(file.read_text(encoding='utf-8')) if file.exists() else default


def summary() -> None:
    result = read_report('pipeline-result.json', {'publishable': False})
    result['publication'] = os.environ.get('PUBLICATION') or 'blocked'
    write_result(result)
    sync = read_report('sync-failures.json', {})
    monitor = read_report('monitor-result.json', {})
    discovery = read_report('catalog-discovery.json', {})
    lines = ['# WayX Actions result', '', f"Publication: {result['publication']}", '']
    for key in ['validatedPlugins', 'convertedPlugins', 'updatedPlugins', 'unchangedPlugins',
                'retainedPlugins', 'deferredPlugins']:
        lines.append(f'- {key}: {len(sync.get(key, []))}')
    rule_report = read_report('rules-result.json', {})
    lines.append(f"- Aggregated rule sets: {len(rule_report.get('counts', {}))}")
    lines.append(f"- Intentionally ignored rules: {len(rule_report.get('filtered', []))}")
    lines.append(f"- Quarantined source rules: {len(rule_report.get('quarantined', []))}")
    lines.append(f"- Monitor failures: {len(monitor.get('failures', []))}")
    for key in ['added', 'updated', 'removed']:
        lines.append(f'- Discovery {key}: {len(discovery.get(key, []))}')
    validation = read_report('validation-results.json', {'stages': {}})
    passed = sum(check['status'] == 'passed' for stage in validation['stages'].values() for check in stage['checks'])
    failed = [(name, check) for name, stage in validation['stages'].items() for check in stage['checks'] if check['status'] == 'failed']
    lines += ['', f'- Automated checks passed: {passed}', f'- Checks requiring review: {len(failed)}',
              '- Details: validation-results.json and per-check logs in the run artifact']
    for name, check in failed:
        lines.append(f"- {name}/{check['id']}: {check['log']}")
    lines += ['', 'Failed gates: ' + ', '.join(result.get('failedGates', []))]
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')


def final() -> None:
    if os.environ.get('PUBLISHABLE') != 'true' or os.environ.get('PUBLICATION_OUTCOME') != 'success':
        raise RuntimeError('Publication blocked or failed')


COMMANDS = {function.__name__: function for function in
            [prepare, syntax, catalog, rules, checkpoint, sync, verify, monitor, reports, issues, gate, publish, summary, regex, final]}

if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
            raise RuntimeError('Expected command: ' + ', '.join(COMMANDS))
        COMMANDS[sys.argv[1]]()
    except (RuntimeError, subprocess.CalledProcessError, OSError, ValueError, KeyError) as error:
        print('::error::' + str(error), file=sys.stderr)
        sys.exit(1)
