"""GitHub Actions orchestration; converter and runtime versions stay independent."""
from __future__ import annotations

import compileall
import json
import os
from pathlib import Path
import subprocess
import sys

RUNTIME = Path('.github/monitor/.runtime')
MANAGED = ['.github/sources/', 'Resource/Loon', 'Adblock/Quantumult X',
           'Adblock/Surge', 'Script', 'README.md']
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


def prepare() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    refs = run(['git', 'ls-remote', '--heads', 'origin'], capture=True)
    branches = [line.split()[1].removeprefix('refs/heads/')
                for line in refs.splitlines()]
    if not 1 <= len(branches) <= 2 or 'main' not in branches:
        raise RuntimeError('WayX requires main and at most one test branch')
    unexpected = set(branches) - {'main', 'test'}
    if unexpected:
        raise RuntimeError('Unexpected WayX branch: ' + ', '.join(sorted(unexpected)))


def syntax() -> None:
    for directory in ['.github/converter', '.github/scripts', 'Script']:
        for file in sorted(Path(directory).rglob('*')):
            if file.is_file() and file.suffix in {'.js', '.mjs'}:
                run(['node', '--check', str(file)])
    for directory in ['.github/converter', '.github/scripts', '.github/monitor']:
        if not compileall.compile_dir(directory, quiet=1):
            raise RuntimeError('Python syntax check failed: ' + directory)


def checkpoint() -> None:
    for suite in ['core', 'rewrite', 'script', 'conversion', 'architecture',
                  'workflow', 'official-capabilities', 'runtime']:
        run(['node', f'.github/converter/tests/{suite}.mjs'])


def verify() -> None:
    commands = [
        ['tools/regenerate-canonical.mjs', '--successful-only'],
        ['tests/catalog.mjs'], ['tools/validate-conversion-policy.mjs', '--all'],
        ['tools/update-readme.mjs'], ['tools/verify-managed-conversions.mjs'],
        ['tools/audit-repository.mjs'], ['tests/artifacts.mjs'],
    ]
    for file, *args in commands:
        run(['node', '.github/converter/' + file, *args])


def issues() -> None:
    args = ['node', '.github/scripts/propose-conversion-issues.mjs']
    if not os.environ.get('PUBLISH_BRANCH'):
        args.append('--dry-run')
    run(args)


def gate() -> None:
    stages = json.loads(os.environ['STAGES'])
    required = ['syntax', 'catalog', 'checkpoint', 'loon_sync', 'verify', 'reports', 'issues']
    monitor = os.environ.get('MONITOR_ENABLED') == 'true'
    if monitor:
        required.append('monitor')
    failed = [name for name in required if stages.get(name, {}).get('outcome') != 'success']
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
    lines.append(f"- Monitor failures: {len(monitor.get('failures', []))}")
    for key in ['added', 'updated', 'removed']:
        lines.append(f'- Discovery {key}: {len(discovery.get(key, []))}')
    lines += ['', 'Failed gates: ' + ', '.join(result.get('failedGates', []))]
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
        stream.write('\n'.join(lines) + '\n')


def final() -> None:
    if os.environ.get('PUBLISHABLE') != 'true' or os.environ.get('PUBLICATION_OUTCOME') != 'success':
        raise RuntimeError('Publication blocked or failed')


COMMANDS = {function.__name__: function for function in
            [prepare, syntax, checkpoint, verify, issues, gate, publish, summary, final]}

if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
            raise RuntimeError('Expected command: ' + ', '.join(COMMANDS))
        COMMANDS[sys.argv[1]]()
    except (RuntimeError, subprocess.CalledProcessError, OSError, ValueError, KeyError) as error:
        print('::error::' + str(error), file=sys.stderr)
        sys.exit(1)
