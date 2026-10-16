"""Rule aggregation domain: verified inputs, semantic grouping, target output and transactions.
Author: chance
Category: Converter / Rule Aggregation
"""
from __future__ import annotations

import concurrent.futures
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.request

ROOT = Path.cwd()
RUNTIME = Path('.github/monitor/.runtime')
CONFIG = Path('.github/sources/rules.json')
STATE = Path('.github/sources/rules-state.json')
MARKER = '# Managed by: WayX Rule Aggregator'
QX_TYPES = {'DOMAIN': 'host', 'DOMAIN-SUFFIX': 'host-suffix',
            'DOMAIN-KEYWORD': 'host-keyword', 'DOMAIN-WILDCARD': 'host-wildcard',
            'IP-CIDR': 'ip-cidr', 'IP-CIDR6': 'ip6-cidr', 'IP-ASN': 'ip-asn'}


def digest(data):
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()


def json_file(file, fallback=None):
    try:
        return json.loads(Path(file).read_text(encoding='utf-8'))
    except FileNotFoundError:
        if fallback is not None:
            return fallback
        raise


def fetch(url, timeout=35):
    headers = {'User-Agent': 'WayX-rule-aggregator', 'Accept': 'application/vnd.github+json'}
    if url.startswith('https://api.github.com/') and os.environ.get('GITHUB_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=timeout) as response:
                data = response.read(32 * 1024 * 1024 + 1)
            if len(data) > 32 * 1024 * 1024:
                raise ValueError('Source exceeds bounded download size: ' + url)
            return data
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def load_inputs(config, online):
    directory = RUNTIME / 'rule-inputs'
    index_file = directory / 'index.json'
    if not online:
        index = json_file(index_file)
        if index.get('version') != 1 or index.get('configuration') != digest(CONFIG.read_bytes()):
            raise ValueError('Missing or stale rule input evidence')
        data = {}
        for item in index['sources']:
            payload = (directory / item['id']).read_bytes()
            if digest(payload) != item['sha256']:
                raise ValueError('Rule input checksum mismatch: ' + item['id'])
            data[item['id']] = payload
        return data, index
    directory.mkdir(parents=True, exist_ok=True)
    # Resolve and pin the official release; sing-box's official geosite producer
    # consumes this same V2Fly release rather than maintaining a separate list.
    release = json.loads(fetch(config['geosite']['release_api']))
    if (datetime.now(timezone.utc) - datetime.fromisoformat(release['published_at'].replace('Z', '+00:00'))).days > 14:
        raise ValueError('Official geosite release is stale')
    assets = {item['name']: item['browser_download_url'] for item in release['assets']}
    descriptors = [*config['sources'], {'id': 'geosite', 'author': 'V2Fly', 'format': 'protobuf',
                    'url': assets['dlc.dat'], 'license': 'MIT', 'revision': release['tag_name']},
                   {'id': 'geosite-checksum', 'author': 'V2Fly', 'format': 'checksum',
                    'url': assets['dlc.dat.sha256sum'], 'license': 'MIT'}]

    def download(item):
        errors = []
        for url in [item['url'], *item.get('mirrors', [])]:
            try:
                payload = fetch(url, timeout=item.get('timeout', 35))
                if not payload.strip() and not item.get('allow_empty'):
                    raise ValueError('Empty rule source: ' + item['id'])
                if payload.lstrip().lower().startswith((b'<!doctype', b'<html')):
                    raise ValueError('HTML received instead of rules: ' + item['id'])
                if item.get('max_age_days'):
                    match = re.search(rb'# Last Updated: ([^\r\n]+)', payload)
                    if not match or (datetime.now(timezone.utc) - datetime.fromisoformat(match[1].decode().replace('Z', '+00:00'))).days > item['max_age_days']:
                        raise ValueError('Stale/missing source timestamp: ' + item['id'])
                return item['id'], payload, {**item, 'fetched_url': url, 'sha256': digest(payload)}
            except (OSError, ValueError) as error:
                errors.append(str(error))
        raise ValueError(item['id'] + ': ' + '; '.join(errors))

    rows = list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(download, descriptors))
    data = {key: payload for key, payload, _ in rows}
    checksum = data['geosite-checksum'].decode().split()[0]
    if not re.fullmatch('[a-f0-9]{64}', checksum) or digest(data['geosite']) != checksum:
        raise ValueError('Official V2Fly release checksum mismatch')
    index = {'version': 1, 'configuration': digest(CONFIG.read_bytes()),
             'sources': [item for _, _, item in rows]}
    for key, payload, _ in rows:
        (directory / key).write_bytes(payload)
    index_file.write_text(json.dumps(index, indent=2) + '\n')
    return data, index


@dataclass(frozen=True, order=True)
class Rule:
    kind: str
    value: str
    options: tuple = ()


def normalized(kind, value, options=()):
    kind = kind.upper()
    if kind == 'PROCESS-NAME':
        if not value or re.search(r'[\r\n,\x00]', value) or options:
            raise ValueError('Invalid process rule')
        return Rule(kind, value)
    if kind not in QX_TYPES:
        raise ValueError('Unsupported native rule type: ' + kind)
    if not value or re.search(r'[\s,\x00]', value):
        raise ValueError('Invalid rule operand: ' + value)
    value = value.lower().rstrip('.')
    if kind in ('DOMAIN', 'DOMAIN-SUFFIX'):
        value = value.encode('idna').decode()
        if not re.fullmatch(r'[a-z0-9_-]+(?:\.[a-z0-9_-]+)*', value):
            raise ValueError('Invalid domain: ' + value)
    elif kind in ('IP-CIDR', 'IP-CIDR6'):
        network = ipaddress.ip_network(value, strict=False)
        if network.version != (6 if kind == 'IP-CIDR6' else 4):
            raise ValueError('IP family mismatch')
        value = str(network)
    elif kind == 'IP-ASN' and not value.isdecimal():
        raise ValueError('Invalid ASN')
    options = tuple(sorted(set(item.lower() for item in options)))
    if set(options) - {'no-resolve', 'extended-matching'}:
        raise ValueError('Unsupported native rule parameters')
    return Rule(kind, value, options)


def native_rules(text, source, anomalies):
    result = []
    if source['format'] == 'sing-box-json':
        document = json.loads(text)
        if document.get('version') not in (1, 2, 3) or not isinstance(document.get('rules'), list):
            raise ValueError('Unsupported sing-box rule-set schema')
        for number, item in enumerate(document['rules'], 1):
            if set(item) - {'domain', 'domain_suffix', 'domain_keyword', 'domain_regex', 'ip_cidr'}:
                raise ValueError('Unsupported sing-box rule-set predicate')
            fields = {key: [value] if isinstance(value, str) else value for key, value in item.items()}
            exact = set(fields.get('domain', []))
            suffixes = fields.get('domain_suffix', [])
            for key, values in fields.items():
                if not isinstance(values, list) or any(not isinstance(value, str) for value in values):
                    raise ValueError('Invalid sing-box operand array')
                for value in values:
                    if key == 'domain_regex':
                        if not regex_covered(value, {s.lstrip('.') for s in suffixes if not s.startswith('.') or s[1:] in exact}):
                            anomalies.append({'source': source['id'], 'category': source['category'], 'declaration': 'regexp:' + value,
                                              'code': 'unsupported-domain-regexp', 'reason': 'No equivalent native domain-regexp filter'})
                        continue
                    kind = {'domain': 'DOMAIN', 'domain_suffix': 'DOMAIN-SUFFIX', 'domain_keyword': 'DOMAIN-KEYWORD', 'ip_cidr': 'IP-CIDR6' if ':' in value else 'IP-CIDR'}[key]
                    if key == 'domain_suffix' and value.startswith('.'):
                        if value[1:] in exact: value = value[1:]
                        else: kind, value = 'DOMAIN-WILDCARD', '*' + value
                    result.append((normalized(kind, value), source.get('policy', 'PROXY')))
        return result
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(('#', ';', '//')):
            continue
        try:
            fields = [part.strip() for part in line.split(',')]
            policy = source.get('policy', 'PROXY')
            options = []
            if source['format'] == 'domainset':
                rule = normalized('DOMAIN-SUFFIX' if line.startswith('.') else 'DOMAIN', line.lstrip('.'))
            elif source['format'] == 'geosite-text':
                value, *attributes = line.split()
                if any(not token.startswith('@') for token in attributes):
                    raise ValueError('Unsupported geosite fields')
                prefix, value = value.split(':', 1) if ':' in value else ('domain', value)
                kinds = {'domain': 'DOMAIN-SUFFIX', 'full': 'DOMAIN', 'keyword': 'DOMAIN-KEYWORD'}
                rule = normalized(kinds.get(prefix, prefix), value)
                if '@cn' in attributes:
                    policy = 'DIRECT'
            else:
                if len(fields) < 2:
                    raise ValueError('Missing rule operand')
                for field in fields[2:]:
                    if field.upper() in ('DIRECT', 'PROXY') or field.upper().startswith('REJECT'):
                        policy = field.upper()
                    else:
                        options.append(field)
                rule = normalized(fields[0], fields[1], options)
            result.append((rule, policy))
        except (ValueError, UnicodeError) as error:
            anomalies.append({'source': source['id'], 'line': number, 'declaration': line,
                              'code': 'unsupported-source-rule', 'reason': str(error)})
    return result


def wire_fields(data):
    """Decode bounded protobuf wire fields; reject malformed/unknown wire types."""
    offset = 0
    def varint():
        nonlocal offset
        value = 0
        for shift in range(0, 70, 7):
            if offset >= len(data):
                raise ValueError('Truncated protobuf varint')
            byte = data[offset]; offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value
        raise ValueError('Oversized protobuf varint')
    while offset < len(data):
        key = varint(); field, wire = key >> 3, key & 7
        if not field:
            raise ValueError('Invalid protobuf field number')
        if wire == 0:
            value = varint()
        elif wire == 2:
            length = varint()
            if length > len(data) - offset:
                raise ValueError('Truncated protobuf payload')
            value = data[offset:offset + length]; offset += length
        else:
            raise ValueError('Unsupported protobuf wire type: ' + str(wire))
        yield field, wire, value


def regex_covered(pattern, suffixes):
    depth = 0; escaped = False; in_class = False
    for char in pattern:
        if escaped: escaped = False; continue
        if char == '\\': escaped = True; continue
        if char == '[': in_class = True
        elif char == ']': in_class = False
        elif not in_class:
            if char == '(': depth += 1
            elif char == ')': depth -= 1
            elif char == '|' and depth == 0: return False
    match = re.search(r'((?:\\\.[A-Za-z0-9_-]+)+)\$$', pattern)
    if not match or depth or in_class: return False
    domain = match[1].replace('\\.', '.').lstrip('.')
    labels = domain.split('.')
    return any('.'.join(labels[i:]) in suffixes for i in range(len(labels)))


def geosites(data, anomalies):
    sites = {}
    for field, wire, payload in wire_fields(data):
        if (field, wire) != (1, 2):
            raise ValueError('Unknown GeoSiteList schema')
        name = None; entries = []
        for key, typ, value in wire_fields(payload):
            if (key, typ) == (1, 2):
                name = value.decode().lower()
            elif (key, typ) == (2, 2):
                kind = 0; operand = None; attributes = set()
                for k, t, v in wire_fields(value):
                    if (k, t) == (1, 0): kind = v
                    elif (k, t) == (2, 2): operand = v.decode()
                    elif (k, t) == (3, 2):
                        for ak, at, av in wire_fields(v):
                            if (ak, at) == (1, 2): attributes.add(av.decode().lower())
                            elif ak not in (2, 3): raise ValueError('Unknown domain attribute schema')
                    else: raise ValueError('Unknown domain schema')
                if operand is None or kind not in range(4):
                    raise ValueError('Invalid domain record')
                entries.append((kind, operand, frozenset(attributes)))
            else:
                raise ValueError('Unknown GeoSite schema')
        if not name or name in sites:
            raise ValueError('Missing/duplicate geosite name')
        sites[name] = entries
    if not sites:
        raise ValueError('Empty geosite database')
    return sites


def compact(rules):
    """Same-bucket/policy domain coverage only; no cross-policy pruning."""
    rules = set(rules)
    suffixes = {(rule.value, rule.options) for rule in rules if rule.kind == 'DOMAIN-SUFFIX'}
    result = []
    for rule in rules:
        if rule.kind in ('DOMAIN', 'DOMAIN-SUFFIX'):
            labels = rule.value.split('.')
            start = 1 if rule.kind == 'DOMAIN-SUFFIX' else 0
            if any(('.'.join(labels[i:]), rule.options) in suffixes for i in range(start, len(labels))):
                continue
        result.append(rule)
    rank = {'DOMAIN': 0, 'DOMAIN-SUFFIX': 1, 'DOMAIN-WILDCARD': 2,
            'DOMAIN-KEYWORD': 3, 'IP-CIDR': 4, 'IP-CIDR6': 5, 'IP-ASN': 6, 'PROCESS-NAME': 7}
    return sorted(result, key=lambda rule: (rank[rule.kind], rule.value, rule.options))


def serialize(rule, policy, target):
    if policy not in ('DIRECT', 'PROXY') and not policy.startswith('REJECT'):
        # Application policies are explicit names supplied by the source registry.
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', policy):
            raise ValueError('Invalid policy name')
    if target == 'QuantumultX':
        action = 'reject' if policy.startswith('REJECT') else policy.lower() if policy in ('DIRECT', 'PROXY') else policy
        return ','.join((QX_TYPES[rule.kind], rule.value, action))
    return ','.join((rule.kind, rule.value, *rule.options))


def surge_proxy_exclusions(rule, policy, direct_rules):
    base = serialize(rule, policy, 'Surge')
    exclusions = []
    for direct in direct_rules:
        if rule.options != direct.options:
            continue
        if rule.kind == 'DOMAIN' and direct.kind == 'DOMAIN' and rule.value == direct.value:
            return None
        if rule.kind == 'DOMAIN-SUFFIX' and direct.kind in ('DOMAIN', 'DOMAIN-SUFFIX') and (direct.value == rule.value or direct.value.endswith('.' + rule.value)):
            if direct.kind == 'DOMAIN-SUFFIX' and direct.value == rule.value:
                return None
            exclusions.append(direct)
    if not exclusions:
        return base
    return 'AND,((' + base + '),' + ','.join('(NOT,((' + serialize(item, 'DIRECT', 'Surge') + ')))' for item in sorted(set(exclusions))) + ')'


def build(config, inputs):
    anomalies = []; buckets = {}; authors = {}; urls = {}
    sites = geosites(inputs['geosite'], anomalies)
    app_names = {app['name'] for app in config['applications']}
    owned_exact = {}; owned_suffix = {}
    def add(name, policy, rules, author, source):
        key = (name, policy)
        rules = set(rules)
        buckets.setdefault(key, set()).update(rules)
        if name in app_names:
            for rule in rules:
                owned_exact.setdefault(rule, set()).add(name)
                if rule.kind == 'DOMAIN-SUFFIX': owned_suffix.setdefault(rule.value, set()).add(name)
        authors.setdefault(key, set()).add(author)
        urls.setdefault(key, set()).add(source)
    def select(tags, group):
        result = set()
        suffixes = {value.lower() for tag in tags if tag in sites for kind, value, attrs in sites[tag] if kind == 2 and 'ads' not in attrs}
        for tag in tags:
            if tag not in sites:
                raise ValueError('Unknown configured geosite: ' + tag)
            for kind, operand, attributes in sites[tag]:
                if 'ads' in attributes:
                    continue
                if kind == 1:
                    if regex_covered(operand, suffixes):
                        continue
                    anomalies.append({'source': 'V2Fly', 'category': group, 'declaration': 'regexp:' + operand,
                                      'code': 'unsupported-domain-regexp', 'reason': 'No equivalent native domain-regexp rule in the target filter formats'})
                    continue
                try:
                    result.add(normalized({0: 'DOMAIN-KEYWORD', 2: 'DOMAIN-SUFFIX', 3: 'DOMAIN'}[kind], operand))
                except (ValueError, UnicodeError) as error:
                    anomalies.append({'source': 'V2Fly', 'category': group, 'declaration': operand,
                                      'code': 'unsupported-source-rule', 'reason': str(error)})
        return result
    origin = config['geosite']['repository']
    named = set()
    for app in config['applications']:
        name = app['name']; ordinary = select(app['tags'], name)
        proxy = select(app.get('proxy_tags', []), name)
        if app.get('split'):
            # Attributes describe access points, not a universal proxy policy.
            # The registry makes the brand default and proxy exceptions explicit.
            add(name, 'DIRECT', ordinary - proxy, 'V2Fly', origin)
            add(name, name, proxy, 'V2Fly', origin)
        else:
            add(name, name, ordinary, 'V2Fly', origin)
        named.update(ordinary | proxy)
    cn = select(config['collections']['cn'], 'cn')
    foreign = select(config['collections']['proxy'], 'proxy')
    domestic_apps = select(config['collections']['media_cn'], 'media_cn')
    overseas_apps = select(config['collections']['media'], 'media')
    # Prefer specific named apps over broad collections, retaining deliberate
    # opposite-policy exceptions. Do not infer nationality from domain suffix.
    add('media_cn', 'DIRECT', domestic_apps - named, 'V2Fly', origin)
    add('media', 'Media', overseas_apps - domestic_apps - cn - named, 'V2Fly', origin)
    add('cn', 'DIRECT', cn - named - domestic_apps, 'V2Fly', origin)
    add('proxy', 'PROXY', foreign - named - overseas_apps - domestic_apps - cn, 'V2Fly', origin)
    for source in config['sources']:
        rows = native_rules(inputs[source['id']].decode('utf-8-sig'), source, anomalies)
        for rule, policy in rows:
            destination = source['category']
            # Supplemental known app domains inherit that app's user-visible
            # category; broad supplement domains stay in cn/proxy/media.
            if destination in ('cn', 'proxy', 'media') and source.get('classify_apps', True):
                candidates = set(owned_exact.get(rule, set()))
                if rule.kind in ('DOMAIN', 'DOMAIN-SUFFIX'):
                    labels = rule.value.split('.')
                    for i in range(len(labels)):
                        candidates.update(owned_suffix.get('.'.join(labels[i:]), set()))
                for app in config['applications']:
                    if candidates.intersection(app.get('children', [])):
                        candidates.discard(app['name'])
                if len(candidates) > 1:
                    anomalies.append({'source': source['id'], 'category': destination, 'declaration': rule.kind + ',' + rule.value, 'code': 'ambiguous-app-ownership', 'reason': 'Multiple named applications: ' + ', '.join(sorted(candidates))})
                elif candidates:
                    destination = next(iter(candidates))
                    policy = 'DIRECT' if policy == 'DIRECT' else destination
            if destination == 'media' and policy == 'PROXY':
                policy = 'Media'
            add(destination, policy, [rule], source['author'], source['url'])
    for app in config['applications']:
        if app.get('children'):
            child_rules = set().union(*(rules for (name, _), rules in buckets.items() if name in app['children']))
            for key in list(buckets):
                if key[0] == app['name']:
                    buckets[key].difference_update(child_rules)
    # Extra remains optional and contains only new matching coverage.
    baseline = buckets.get(('adblock', 'REJECT'), set())
    suffixes = {rule.value for rule in baseline if rule.kind == 'DOMAIN-SUFFIX'}
    for key in list(buckets):
        if key[0] == 'adblock_extra':
            buckets[key] = {rule for rule in buckets[key] if rule not in baseline and not (
                rule.kind in ('DOMAIN', 'DOMAIN-SUFFIX') and any('.'.join(rule.value.split('.')[i:]) in suffixes for i in range(len(rule.value.split('.')))))}
    rendered = {}; metadata = {}
    split_names = set(config['split_names']) | {name for name, policy in buckets if policy == 'DIRECT' and any(n == name and p != 'DIRECT' for n, p in buckets)}
    for target in ('QuantumultX', 'Surge'):
        grouped = {}
        for (name, policy), rules in buckets.items():
            suffix = ('_direct' if policy == 'DIRECT' else '_proxy') if target == 'Surge' and name in split_names else ''
            if target == 'Surge' and policy.startswith('REJECT') and policy != 'REJECT':
                suffix += '_' + policy.lower().replace('-', '_')
            file = 'Rule/' + target + '/' + name + suffix + '.list'
            group = grouped.setdefault(file, [])
            mixed = len({p for n, p in buckets if n == name}) > 1
            group.append((name, policy, sorted(rules) if mixed else compact(rules)))
        for file, groups in grouped.items():
            # Final ordering uses specificity across policies, not a blanket direct/proxy preference.
            groups.sort(key=lambda group: group[1] == 'DIRECT')
            lines = []; seen = set(); source_authors = set(); sources = set(); ordered = []
            for name, policy, rules in groups:
                source_authors.update(authors[(name, policy)]); sources.update(urls[(name, policy)])
                for rule in rules:
                    if target == 'QuantumultX' and (rule.kind not in QX_TYPES or 'extended-matching' in rule.options):
                        anomalies.append({'source': ' / '.join(sorted(authors[(name, policy)])), 'category': name, 'target': target, 'declaration': rule.kind + ',' + rule.value, 'code': 'unsupported-target-rule', 'reason': 'Native rule type/options are not supported by Quantumult X'})
                        continue
                    ordered.append((rule, policy))
            for rule, policy in sorted(ordered, key=lambda pair: (0 if pair[0].kind == 'DOMAIN' else 1 if pair[0].kind == 'DOMAIN-SUFFIX' else 2 if pair[0].kind in ('DOMAIN-WILDCARD', 'DOMAIN-KEYWORD') else 3, -pair[0].value.count('.'), pair[0].value, pair[1] != 'DIRECT', pair[1], pair[0].kind, pair[0].options)):
                    line = surge_proxy_exclusions(rule, policy, buckets.get((groups[0][0], 'DIRECT'), set())) if target == 'Surge' and policy != 'DIRECT' and groups[0][0] in split_names else serialize(rule, policy, target)
                    if line is not None and line not in seen:
                        lines.append(line); seen.add(line)
            if not lines:
                continue
            rendered[file] = '\n'.join(lines) + '\n'
            metadata[file] = {'authors': sorted(source_authors), 'sources': sorted(sources),
                              'category': 'Advertising' if groups[0][0].startswith('adblock') else 'Routing',
                              'count': len(lines), 'policy': groups[0][1]}
    unique = {}
    for item in anomalies:
        key = (item['source'], item['code'], item['declaration'], item.get('target', 'both'))
        if key not in unique: unique[key] = {**item, 'categories': []}
        if item.get('category') and item['category'] not in unique[key]['categories']: unique[key]['categories'].append(item['category'])
    return rendered, metadata, list(unique.values())


def header(file, meta, stamp):
    return '\n'.join(['# Name: ' + Path(file).stem, '# Updated: ' + stamp,
                      '# Source Authors: ' + ', '.join(meta['authors']), '# Category: ' + meta['category'],
                      '# Sources: ' + ' ; '.join(meta['sources']),
                      '# Licenses: See .github/sources/rules.json and original source repositories',
                      '# Rules: ' + str(meta['count']), MARKER, '']) + '\n'


def body(text):
    return '\n'.join(line for line in text.splitlines() if line and not line.startswith('#')) + '\n'


def apply_outputs(outputs, metadata, state, writer=None):
    """Stage the complete plan and restore every managed byte on write failure."""
    writer = writer or (lambda file, data: file.write_bytes(data))
    old = {}; plan = {}
    stamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    for name, content in outputs.items():
        file = Path(name); previous = file.read_bytes() if file.exists() else None
        if previous is not None and MARKER not in previous.decode():
            raise ValueError('Refusing to overwrite an unmanaged rule file: ' + name)
        candidate = header(name, metadata[name], stamp) + content
        without_stamp = lambda text: re.sub(r'^# Updated:.*$', '# Updated:', text, flags=re.M)
        if previous is not None and without_stamp(previous.decode()) == without_stamp(candidate):
            continue
        old[file] = previous; plan[file] = (header(name, metadata[name], stamp) + content).encode()
    for name in state.get('outputs', {}):
        if name not in outputs:
            file = Path(name)
            if file.exists():
                previous = file.read_bytes()
                if MARKER not in previous.decode():
                    raise ValueError('Stale path no longer managed: ' + name)
                old[file] = previous; plan[file] = None
    try:
        for file, data in plan.items():
            file.parent.mkdir(parents=True, exist_ok=True)
            if data is None: file.unlink()
            else: writer(file, data)
    except BaseException:
        for file, previous in old.items():
            if previous is None: file.unlink(missing_ok=True)
            else: file.write_bytes(previous)
        raise
    return len(plan), old


def run(mode, online=True):
    config = json_file(CONFIG)
    if config.get('version') != 1:
        raise ValueError('Unsupported rule registry version')
    names = [item['name'] for item in config['applications']]
    if len(set(names)) != len(names) or any(not re.fullmatch(r'[a-z][a-z0-9_]*', name) for name in names):
        raise ValueError('Invalid or duplicate application category')
    identifiers = [item['id'] for item in config['sources']]
    if len(set(identifiers)) != len(identifiers) or any(not re.fullmatch(r'[a-z0-9_-]+', name) for name in identifiers):
        raise ValueError('Invalid or duplicate source identifier')
    for item in config['sources']:
        if not re.fullmatch(r'[a-z][a-z0-9_]*', item['category']) or any(not url.startswith('https://') for url in [item['url'], *item.get('mirrors', [])]):
            raise ValueError('Invalid source URL/category')
        if any('/blackmatrix7/' in url.lower() for url in [item['url'], *item.get('mirrors', [])]):
            raise ValueError('Direct blackmatrix7 sources are excluded')
    inputs, index = load_inputs(config, online=mode == 'sync' and online)
    outputs, metadata, anomalies = build(config, inputs)
    if not outputs:
        raise ValueError('No generated rule sets')
    state = json_file(STATE, {'version': 1, 'outputs': {}})
    counts = {file: meta['count'] for file, meta in metadata.items()}
    report = {'version': 1, 'complete': True, 'quarantined': anomalies,
              'sources': index['sources'], 'counts': counts}
    if mode == 'sync':
        for file, count in counts.items():
            prior = state.get('counts', {}).get(file, 0)
            if state.get('configuration') == digest(CONFIG.read_bytes()) and state.get('generator') == digest(Path(__file__).read_bytes()) and prior > 100 and count < prior / 2:
                raise ValueError('Unexpected rule count decrease: ' + file)
        changed, originals = apply_outputs(outputs, metadata, state)
        try:
            temporary = STATE.with_suffix('.tmp')
            temporary.write_text(json.dumps({'version': 1, 'outputs': {file: digest(content) for file, content in outputs.items()},
                                        'counts': counts, 'sources': index['sources'], 'configuration': digest(CONFIG.read_bytes()), 'generator': digest(Path(__file__).read_bytes())}, indent=2) + '\n')
            os.replace(temporary, STATE)
        except BaseException:
            for file, previous in originals.items():
                if previous is None: file.unlink(missing_ok=True)
                else: file.write_bytes(previous)
            raise
        report['updatedFiles'] = changed
    else:
        if state.get('outputs') != {file: digest(content) for file, content in outputs.items()}:
            raise ValueError('Rule state differs from deterministic replay')
        for file, content in outputs.items():
            text = Path(file).read_text()
            if re.sub(r'^# Updated:.*$', '# Updated:', text, flags=re.M) != re.sub(r'^# Updated:.*$', '# Updated:', header(file, metadata[file], '') + content, flags=re.M) or MARKER not in text or any(not re.search(r'^# ' + key + ': .+', text, re.M) for key in ['Name', 'Updated', 'Source Authors', 'Category']):
                raise ValueError('Generated rule output/metadata mismatch: ' + file)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / 'rules-result.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Rule aggregation: files=' + str(len(outputs)) + ', rules=' + str(sum(counts.values())) + ', quarantined=' + str(len(anomalies)))


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in ('sync', 'check'):
            raise ValueError('Expected sync or check')
        run(sys.argv[1])
    except Exception as error:
        RUNTIME.mkdir(parents=True, exist_ok=True)
        (RUNTIME / 'rules-result.json').write_text(json.dumps({'version': 1, 'complete': False, 'error': str(error), 'quarantined': []}, indent=2) + '\n')
        print('Rule aggregation failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
