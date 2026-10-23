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
DESKTOP_TYPES = frozenset({'PROCESS-NAME', 'PROCESS-PATH', 'PROCESS-NAME-REGEX',
                           'PROCESS-PATH-REGEX', 'UID', 'USER', 'USER-ID'})
DESKTOP_JSON = frozenset({'process_name', 'process_path', 'process_path_regex',
                          'process_name_regex', 'package_name_regex', 'user', 'user_id', 'package_name'})
QX_TYPES = {'DOMAIN': 'host', 'DOMAIN-SUFFIX': 'host-suffix',
            'DOMAIN-KEYWORD': 'host-keyword', 'DOMAIN-WILDCARD': 'host-wildcard',
            'IP-CIDR': 'ip-cidr', 'IP-CIDR6': 'ip6-cidr', 'IP-ASN': 'ip-asn', 'GEOIP': 'geoip'}
NATIVE_TYPES = {value.upper(): key for key, value in QX_TYPES.items()}


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
    kind = NATIVE_TYPES.get(kind.upper(), kind.upper())
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
    elif kind == 'GEOIP' and not re.fullmatch('[a-z]{2}', value):
        raise ValueError('Invalid country code')
    elif kind == 'IP-ASN' and not value.isdecimal():
        raise ValueError('Invalid ASN')
    options = tuple(sorted(set(item.lower() for item in options)))
    if set(options) - {'no-resolve', 'extended-matching'}:
        raise ValueError('Unsupported native rule parameters')
    return Rule(kind, value, options)


def native_rules(text, source, anomalies, *, with_origin=False):
    result = []
    def emit(rule, policy, explicit=False):
        result.append((rule, policy, explicit) if with_origin else (rule, policy))
    if source['format'] == 'sing-box-json':
        document = json.loads(text)
        if document.get('version') not in (1, 2, 3, 4, 5) or not isinstance(document.get('rules'), list):
            raise ValueError('Unsupported sing-box rule-set schema')
        for number, item in enumerate(document['rules'], 1):
            if set(item) & DESKTOP_JSON:
                # These fields are AND predicates: omitting only the field would broaden matching.
                anomalies.append({'source': source['id'], 'declaration': json.dumps(item, sort_keys=True),
                                  'code': 'filtered-desktop-rule', 'reason': 'Desktop/application identity condition intentionally excluded'})
                continue
            if set(item) - {'domain', 'domain_suffix', 'domain_keyword', 'domain_regex', 'ip_cidr'}:
                anomalies.append({'source': source['id'], 'declaration': json.dumps(item, sort_keys=True),
                                  'code': 'filtered-unsupported-rule', 'reason': 'No native equivalent for all predicates; entire condition omitted'})
                continue
            if item.get('ip_cidr') and any(item.get(key) for key in ('domain', 'domain_suffix', 'domain_keyword', 'domain_regex')):
                anomalies.append({'source': source['id'], 'declaration': json.dumps(item, sort_keys=True),
                                  'code': 'filtered-unsupported-rule', 'reason': 'Combined domain/IP AND condition cannot be flattened into independent rules'})
                continue
            fields = {key: [value] if isinstance(value, str) else value for key, value in item.items()}
            exact = set(fields.get('domain', []))
            for key, values in fields.items():
                if not isinstance(values, list) or any(not isinstance(value, str) for value in values):
                    raise ValueError('Invalid sing-box operand array')
                for value in values:
                    if key == 'domain_regex':
                        converted = regex_native(value)
                        if converted is not None:
                            for rule in converted:
                                emit(rule, source.get('policy', 'PROXY'))
                        else:
                            anomalies.append({'source': source['id'], 'category': source['category'], 'declaration': 'regexp:' + value,
                                              'code': 'filtered-unsupported-regexp', 'reason': 'Outside bounded exact native conversion subset; no widening allowed'})
                        continue
                    kind = {'domain': 'DOMAIN', 'domain_suffix': 'DOMAIN-SUFFIX', 'domain_keyword': 'DOMAIN-KEYWORD', 'ip_cidr': 'IP-CIDR6' if ':' in value else 'IP-CIDR'}[key]
                    if key == 'domain_suffix' and value.startswith('.'):
                        if value[1:] in exact: value = value[1:]
                        else: kind, value = 'DOMAIN-WILDCARD', '*' + value
                    emit(normalized(kind, value), source.get('policy', 'PROXY'))
        return result
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(('#', ';', '//')):
            continue
        try:
            if re.search(r'(?:^|[,()])\s*(?:' + '|'.join(sorted(DESKTOP_TYPES)) + r')\s*,', line, re.I):
                anomalies.append({'source': source['id'], 'line': number, 'declaration': line,
                                  'code': 'filtered-desktop-rule', 'reason': 'Desktop identity condition intentionally excluded'})
                continue
            fields = [part.strip() for part in line.split(',')]
            policy = source.get('policy', 'PROXY')
            explicit = False
            options = []
            if source['format'] == 'domain-suffixes':
                rule = normalized('DOMAIN-SUFFIX', line.lstrip('.'))
            elif source['format'] == 'cidr':
                rule = normalized('IP-CIDR6' if ':' in line else 'IP-CIDR', line, ('no-resolve',))
            elif source['format'] == 'domainset':
                rule = normalized('DOMAIN-SUFFIX' if line.startswith('.') else 'DOMAIN', line.lstrip('.'))
            elif source['format'] == 'geosite-text':
                value, *attributes = line.split()
                if any(not token.startswith('@') for token in attributes):
                    raise ValueError('Unsupported geosite fields')
                prefix, value = value.split(':', 1) if ':' in value else ('domain', value)
                kinds = {'domain': 'DOMAIN-SUFFIX', 'full': 'DOMAIN', 'keyword': 'DOMAIN-KEYWORD'}
                if prefix == 'regexp':
                    converted = regex_native(value)
                    if converted is None:
                        anomalies.append({'source': source['id'], 'line': number, 'declaration': line,
                                          'code': 'filtered-unsupported-regexp', 'reason': 'No exact native regex conversion; intentionally omitted'})
                        continue
                    for item in converted:
                        emit(item, policy)
                    continue
                rule = normalized(kinds.get(prefix, prefix), value)
            else:
                if len(fields) < 2:
                    raise ValueError('Missing rule operand')
                for field in fields[2:]:
                    if field.upper() in ('DIRECT', 'PROXY') or field.upper().startswith('REJECT'):
                        policy = field.upper()
                        explicit = True
                    else:
                        options.append(field)
                rule = normalized(fields[0], fields[1], options)
            emit(rule, policy, explicit)
        except (ValueError, UnicodeError) as error:
            anomalies.append({'source': source['id'], 'line': number, 'declaration': line,
                              'code': 'filtered-unsupported-rule' if str(error).startswith(('Unsupported native rule type:', 'Unsupported native rule parameters')) else 'unsupported-source-rule',
                              'reason': str(error)})
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


def regex_native(pattern, limit=256):
    """Expand a bounded finite regex language to exact DOMAIN/DOMAIN-SUFFIX rules.

    Supports literal alternatives, finite ASCII classes, optional groups and
    bounded repetitions; dot/dot-star/dot-plus become native wildcards.
    Rejects unanchored patterns, assertions, backreferences, unbounded class repetition and excessive expansion; never approximates a regex.
    """
    if len(pattern) > 4096: return None
    try: re.compile(pattern)
    except (re.error, RecursionError): return None
    suffix = False
    for prefix in (r'(^|\.)', r'(?:^|\.)'):
        if pattern.startswith(prefix):
            pattern = pattern[len(prefix):]; suffix = True; break
    else:
        if not pattern.startswith('^'): return None
        pattern = pattern[1:]
    if not pattern.endswith('$'): return None
    pattern = pattern[:-1]; position = 0

    def combine(left, right):
        if len(left) * len(right) > limit: raise ValueError('Expansion limit')
        result = {a + b for a in left for b in right}
        if any(len(value) > 253 for value in result): raise ValueError('Domain length')
        return result

    def expression(nested=False):
        nonlocal position
        choices = set(); sequence = {''}
        while position < len(pattern) and pattern[position] != ')':
            char = pattern[position]; position += 1
            if char == '|':
                if not nested: raise ValueError('Alternation crosses anchors')
                choices.update(sequence); sequence = {''}; continue
            if char == '(':
                if pattern[position:position+2] == '?:': position += 2
                atom = expression(True)
                if position >= len(pattern) or pattern[position] != ')': raise ValueError('Unclosed group')
                position += 1
            elif char == '\\':
                if position >= len(pattern): raise ValueError('Trailing escape')
                escaped = pattern[position]; position += 1
                if escaped == 'd': atom = set('0123456789')
                elif escaped in '.-_': atom = {escaped}
                else: raise ValueError('Unsupported escape')
            elif char == '[':
                atom = set()
                while position < len(pattern) and pattern[position] != ']':
                    first = pattern[position]; position += 1
                    if not re.fullmatch('[a-zA-Z0-9_-]', first): raise ValueError('Unsupported class')
                    if position + 1 < len(pattern) and pattern[position] == '-' and pattern[position+1] != ']':
                        last = pattern[position+1]; position += 2
                        if not ((first.isdigit() and last.isdigit()) or ('a' <= first <= last <= 'z') or ('A' <= first <= last <= 'Z')):
                            raise ValueError('Unsupported range')
                        atom.update(chr(code) for code in range(ord(first), ord(last)+1))
                    else: atom.add(first)
                if not atom or position >= len(pattern): raise ValueError('Invalid class')
                position += 1
            elif char == '.': atom = {'?'}
            elif re.fullmatch('[a-zA-Z0-9_-]', char): atom = {char}
            else: raise ValueError('Unsupported operator')
            if atom == {'?'} and position < len(pattern) and pattern[position] in '*+':
                atom = {'*' if pattern[position] == '*' else '?*'}; position += 1
                if position < len(pattern) and pattern[position] == '?': position += 1
            minimum = maximum = 1
            if position < len(pattern) and pattern[position] == '?':
                minimum = 0; position += 1
            elif position < len(pattern) and pattern[position] == '{':
                count = re.match(r'\{(\d+)(?:,(\d+))?\}', pattern[position:])
                if not count: raise ValueError('Unbounded repetition')
                minimum = int(count[1]); maximum = int(count[2] or count[1]); position += len(count[0])
                if not 0 <= minimum <= maximum <= 8: raise ValueError('Repetition limit')
            if position < len(pattern) and pattern[position] == '?': position += 1  # lazy quantifier: same language
            repeated = set(); power = {''}
            for n in range(maximum + 1):
                if n >= minimum: repeated.update(power)
                if len(repeated) > limit: raise ValueError('Expansion limit')
                if n < maximum: power = combine(power, atom)
            sequence = combine(sequence, repeated)
        choices.update(sequence)
        if len(choices) > limit: raise ValueError('Expansion limit')
        return choices
    try:
        values = expression()
        if position != len(pattern): return None
        result = set()
        for value in values:
            if '*' in value or '?' in value:
                result.add(normalized('DOMAIN-WILDCARD', value))
                if suffix: result.add(normalized('DOMAIN-WILDCARD', '*.' + value))
            else: result.add(normalized('DOMAIN-SUFFIX' if suffix else 'DOMAIN', value))
        return result
    except (ValueError, UnicodeError, RecursionError):
        return None


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


def qx_policy(policy):
    value = str(policy or '').strip().upper()
    return 'REJECT' if value.startswith('REJECT') else 'DIRECT' if value == 'DIRECT' else 'PROXY'


def serialize(rule, policy, target):
    if target == 'QuantumultX':
        return ','.join((QX_TYPES[rule.kind], rule.value, qx_policy(policy).lower()))
    if policy not in ('DIRECT', 'PROXY') and not policy.startswith('REJECT'):
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', policy):
            raise ValueError('Invalid policy name')
    return ','.join((rule.kind, rule.value.upper() if rule.kind == 'GEOIP' else rule.value, *rule.options))


def build(config, inputs):
    anomalies = []; buckets = {}; authors = {}; urls = {}
    records = []
    sites = geosites(inputs['geosite'], anomalies)
    app_names = {app['name'] for app in config['applications']}
    # A routing requirement is authoritative, unlike an actionless source's
    # default. Resolve it after ownership; source DIRECT declarations belong to
    # cn rather than changing a proxy-only service's routing requirement.
    routing_policies = config.get('routing_policies', {})
    if any(name not in app_names or policy != 'PROXY'
           for name, policy in routing_policies.items()):
        raise ValueError('Invalid application routing policy')
    if any(app.get('split') or app.get('proxy_tags')
           for app in config['applications'] if app['name'] in routing_policies):
        raise ValueError('Proxy-only applications cannot declare direct/proxy selectors')
    scope_exclusions = {}
    rule_exclusions = {}
    for name, specifications in config.get('rule_exclusions', {}).items():
        if name not in app_names | {'adblock', 'adblock_extra', 'media', 'media_cn', 'cn', 'proxy'}:
            raise ValueError('Unknown rule exclusion category: ' + name)
        rule_exclusions[name] = []
        for specification in specifications:
            if set(specification) != {'kind', 'value_regex'} or specification['kind'] not in QX_TYPES:
                raise ValueError('Invalid configured rule exclusion')
            rule_exclusions[name].append((specification['kind'], re.compile(specification['value_regex'])))
    def excluded(name, rule):
        if any(rule.kind == kind and pattern.search(rule.value) for kind, pattern in rule_exclusions.get(name, [])):
            return True
        rules = scope_exclusions.get(name, set())
        if not rules: return False
        return Rule(rule.kind, rule.value) in rules or (rule.kind in ('DOMAIN', 'DOMAIN-SUFFIX') and any(
            Rule('DOMAIN-SUFFIX', '.'.join(rule.value.split('.')[i:])) in rules
            for i in range(len(rule.value.split('.')))))
    def add(name, policy, rules, author, source, explicit=False):
        for rule in rules:
            # Explicit user removals apply before classification; application
            # scope selectors are checked against the final destination.
            if any(rule.kind == kind and pattern.search(rule.value)
                   for kind, pattern in rule_exclusions.get(name, [])):
                continue
            records.append((name, policy, rule, author, source, explicit))
    def select(tags, group):
        result = set()
        entries = []
        for selector in tags:
            tag, separator, attribute = selector.partition('@')
            if tag not in sites:
                raise ValueError('Unknown configured geosite: ' + tag)
            if separator and not re.fullmatch(r'!?[a-z0-9_-]+', attribute):
                raise ValueError('Invalid geosite attribute selector: ' + selector)
            for entry in sites[tag]:
                if separator and ((attribute.lstrip('!') in entry[2]) == attribute.startswith('!')):
                    continue
                entries.append(entry)
        for kind, operand, attributes in entries:
            if kind == 1:
                converted = regex_native(operand)
                if converted is not None:
                    result.update(converted); continue
                anomalies.append({'source': 'V2Fly', 'category': group, 'declaration': 'regexp:' + operand,
                                  'code': 'filtered-unsupported-regexp', 'reason': 'Outside bounded exact native conversion subset; no widening allowed'})
                continue
            try:
                result.add(normalized({0: 'DOMAIN-KEYWORD', 2: 'DOMAIN-SUFFIX', 3: 'DOMAIN'}[kind], operand))
            except (ValueError, UnicodeError) as error:
                anomalies.append({'source': 'V2Fly', 'category': group, 'declaration': operand,
                                  'code': 'unsupported-source-rule', 'reason': str(error)})
        return result
    for app in config['applications']:
        scope_exclusions[app['name']] = select(app.get('exclude_tags', []), app['name'])
    origin = config['geosite']['repository']
    for app in config['applications']:
        name = app['name']; ordinary = {rule for rule in select(app['tags'], name) if not excluded(name, rule)}
        proxy = {rule for rule in select(app.get('proxy_tags', []), name) if not excluded(name, rule)}
        if app.get('split'):
            # Attributes describe access points, not a universal proxy policy.
            # The registry makes the brand default and proxy exceptions explicit.
            add(name, 'DIRECT', ordinary - proxy, 'V2Fly', origin)
            add(name, name, proxy, 'V2Fly', origin)
        else:
            add(name, name, ordinary, 'V2Fly', origin)
    cn = select(config['collections']['cn'], 'cn')
    foreign = select(config['collections']['proxy'], 'proxy')
    domestic_apps = select(config['collections']['media_cn'], 'media_cn')
    overseas_apps = select(config['collections']['media'], 'media')
    # First collect all inputs without subtracting other collections. Assignment
    # below resolves ownership before applying configured routing requirements.
    add('media_cn', 'DIRECT', domestic_apps, 'V2Fly', origin)
    add('media', 'Media', overseas_apps, 'V2Fly', origin)
    add('cn', 'DIRECT', cn, 'V2Fly', origin)
    add('proxy', 'PROXY', foreign, 'V2Fly', origin)
    parsed_sources = [(source, native_rules(inputs[source['id']].decode('utf-8-sig'), source, anomalies, with_origin=True))
                      for source in config['sources']]
    for source, rows in parsed_sources:
        if source.get('standalone'):
            continue
        for rule, policy, explicit in rows:
            add(source['category'], policy, [rule], source['author'], source['url'], explicit)

    classification = config.get('classification', {})
    priority = classification.get('priority', [])
    if len(set(priority)) != len(priority) or set(priority) - app_names:
        raise ValueError('Invalid classification priority')
    ownership = {}
    suffix_owners = {}
    def index(name, rules):
        for rule in rules:
            if excluded(name, rule):
                continue
            ownership.setdefault(Rule(rule.kind, rule.value), set()).add(name)
            if rule.kind == 'DOMAIN-SUFFIX':
                suffix_owners.setdefault(rule.value, set()).add(name)
    for app in config['applications']:
        index(app['name'], select([*app['tags'], *app.get('proxy_tags', [])], app['name']))
    index('media_cn', domestic_apps | select(classification.get('domestic_tags', []), 'media_cn'))
    index('media', overseas_apps | select(classification.get('overseas_tags', []), 'media'))
    # Explicit application supplements also provide ownership evidence. General
    # direct/proxy feeds, IP geolocation and TLDs never establish app identity.
    for name, policy, rule, author, source, explicit in records:
        if name in app_names | {'media', 'media_cn'}:
            index(name, [rule])

    def destination(name, policy, rule, source):
        if name.startswith('adblock') or policy.startswith('REJECT'):
            return name
        # Modified: 2026-10-23 (chance). Keep general feeds in cn/proxy;
        # application ownership must not absorb or reinterpret their actions.
        if name in ('cn', 'proxy'):
            return 'cn' if qx_policy(policy) == 'DIRECT' else 'proxy'
        candidates = set(ownership.get(Rule(rule.kind, rule.value), ()))
        if rule.kind in ('DOMAIN', 'DOMAIN-SUFFIX') and not candidates & app_names:
            labels = rule.value.split('.')
            # A more-specific upstream domain association wins over a parent.
            for offset in range(len(labels)):
                matches = suffix_owners.get('.'.join(labels[offset:]), ())
                if matches:
                    candidates.update(matches)
                    if candidates & app_names:
                        break
        named = candidates & app_names
        preferred = next((item for item in priority if item in named), None)
        if preferred:
            return preferred
        if len(named) == 1:
            return next(iter(named))
        if len(named) > 1:
            if name in named:
                return name
            anomalies.append({'source': source, 'category': name,
                              'declaration': rule.kind + ',' + rule.value,
                              'code': 'ambiguous-app-ownership',
                              'reason': 'Conflicting upstream app ownership: ' + ', '.join(sorted(named))})
            return name
        if 'media_cn' in candidates:
            return 'media_cn'
        if 'media' in candidates:
            return 'media'
        return name

    default_policies = config.get('default_policies', {})
    if any(name not in app_names | {'media', 'media_cn', 'cn', 'proxy'} or policy not in ('DIRECT', 'PROXY')
           for name, policy in default_policies.items()):
        raise ValueError('Invalid category default policy')
    if any(name in routing_policies and policy != routing_policies[name]
           for name, policy in default_policies.items()):
        raise ValueError('Category default conflicts with application routing policy')
    # Modified: 2026-10-23 (chance). Application defaults resolve only
    # actionless placeholders; explicit/registered DIRECT/PROXY bypass them.
    application_defaults = {}
    for name, policy, rule, author, source, explicit in records:
        if name in app_names and not explicit and not policy.startswith('REJECT') and not excluded(name, rule):
            application_defaults.setdefault((name, rule), set()).add(qx_policy(policy))
    explicit_rules = set()
    for name, policy, rule, author, source, explicit in records:
        target = destination(name, policy, rule, source)
        if excluded(target, rule):
            continue
        # Keep upstream direct access declarations without adding DIRECT to a
        # proxy-only app list or rewriting the source action as PROXY. Do this
        # before application defaults can replace a generic source's DIRECT.
        if target in routing_policies and policy == 'DIRECT':
            target = 'cn'
            if excluded(target, rule):
                continue
        # Modified: 2026-10-23 (chance). Source row actions and registered
        # DIRECT/PROXY feed actions are authoritative. Infer a category default
        # only for placeholders; remove the former cross-feed action override.
        if not explicit and policy not in ('DIRECT', 'PROXY') and not policy.startswith('REJECT'):
            preferred = application_defaults.get((target, rule), set())
            if name != target and len(preferred) == 1:
                policy = next(iter(preferred))
            policy = default_policies.get(target, policy)
        if target in routing_policies and policy not in ('DIRECT', 'PROXY') and not policy.startswith('REJECT'):
            policy = routing_policies[target]
        # Modified: 2026-10-23 (chance). Move media_cn proxy actions to media
        # after policy resolution; keep media_cn direct-only without rewriting actions.
        if target == 'media_cn' and qx_policy(policy) == 'PROXY':
            target = 'media'
            if excluded(target, rule):
                continue
        if explicit:
            explicit_rules.add((target, rule, qx_policy(policy)))
        key = (target, policy)
        buckets.setdefault(key, set()).add(rule)
        authors.setdefault(key, set()).add(author)
        urls.setdefault(key, set()).add(source)
    rendered = {}; metadata = {}
    def surge_action(policy):
        return policy if policy == 'DIRECT' or policy.startswith('REJECT') else 'PROXY'
    layouts = config.get('surge_output', {})
    categories = app_names | {'media', 'media_cn', 'cn', 'proxy', 'adblock', 'adblock_extra'}
    if any(name not in categories or layout not in ('split', 'combined') for name, layout in layouts.items()):
        raise ValueError('Invalid Surge output layout')
    if any(layouts.get(name) == 'split' for name in routing_policies):
        raise ValueError('Proxy-only applications require a single Surge rule-set')
    split_names = {name for name, _ in buckets if name not in routing_policies and (layouts.get(name) == 'split' or (
        layouts.get(name) != 'combined' and
        len({surge_action(policy) for n, policy in buckets if n == name}) > 1))}
    for target in ('QuantumultX', 'Surge'):
        grouped = {}
        for (name, policy), rules in buckets.items():
            suffix = ('_' + surge_action(policy).lower().replace('-', '_')) if target == 'Surge' and name in split_names else ''
            if target == 'Surge' and name not in split_names and policy.startswith('REJECT') and (
                    policy != 'REJECT' or any(n == name and not p.startswith('REJECT') for n, p in buckets)):
                suffix = '_' + policy.lower().replace('-', '_')
            file = 'Rule/' + target + '/' + name + suffix + '.list'
            group = grouped.setdefault(file, [])
            group.append((name, policy, sorted(rules)))
        for file, groups in grouped.items():
            # Final ordering uses specificity across policies, not a blanket direct/proxy preference.
            groups.sort(key=lambda group: group[1] == 'DIRECT')
            lines = []; seen = set(); source_authors = set(); sources = set(); ordered = []
            for name, policy, rules in groups:
                source_authors.update(authors[(name, policy)]); sources.update(urls[(name, policy)])
                for rule in rules:
                    if target == 'QuantumultX' and (rule.kind not in QX_TYPES or 'extended-matching' in rule.options):
                        anomalies.append({'source': ' / '.join(sorted(authors[(name, policy)])), 'category': name, 'target': target, 'declaration': rule.kind + ',' + rule.value, 'code': 'filtered-unsupported-target', 'reason': 'Native rule type/options are not supported by Quantumult X'})
                        continue
                    ordered.append((rule, policy))
            if target == 'QuantumultX':
                # Coalesce placeholder names before deduplication; retain opposite-action exceptions.
                actions = {}
                for rule, policy in ordered:
                    actions.setdefault(qx_policy(policy), set()).add(rule)
                ordered = [(rule, action) for action, rules in actions.items()
                           for rule in sorted(rules)]
            def output_key(pair):
                rule, policy = pair
                rank = 0 if rule.kind == 'DOMAIN' else 1 if rule.kind == 'DOMAIN-SUFFIX' else 2 if rule.kind in ('DOMAIN-WILDCARD', 'DOMAIN-KEYWORD') else 3
                return (rank, -rule.value.count('.'), rule.value,
                        (groups[0][0], rule, qx_policy(policy)) not in explicit_rules,
                        0 if policy == 'DIRECT' else 1 if policy.startswith('REJECT') else 2,
                        policy, rule.kind, rule.options)
            for rule, policy in sorted(ordered, key=output_key):
                    line = serialize(rule, policy, target)
                    if line is not None and line not in seen:
                        lines.append(line); seen.add(line)
            if not lines:
                continue
            rendered[file] = '\n'.join(lines) + '\n'
            metadata[file] = {'authors': sorted(source_authors), 'sources': sorted(sources),
                              'category': 'Adblock' if groups[0][0].startswith('adblock') else 'general' if groups[0][0] in ('cn', 'proxy') else 'app',
                              'count': len(lines), 'policy': groups[0][1]}
    # Independent sources retain their own order, comments and per-line policies.
    # Surge detached [Rule] sections support mixed policies; external RULE-SETs do not.
    for source, rows in parsed_sources:
        if not source.get('standalone'):
            continue
        comments = [line for line in inputs[source['id']].decode('utf-8-sig').splitlines()
                    if line.lstrip().startswith(('#', ';', '//'))]
        comments = [('# ' + line if line.lstrip().startswith('#!') else line) for line in comments]
        for target in ('QuantumultX', 'Surge'):
            lines = []
            for rule, policy, explicit in rows:
                if target == 'QuantumultX' and (rule.kind not in QX_TYPES or 'extended-matching' in rule.options):
                    anomalies.append({'source': source['id'], 'category': source['category'], 'target': target,
                                      'declaration': rule.kind + ',' + rule.value, 'code': 'filtered-unsupported-target',
                                      'reason': 'Native rule type/options are not supported by Quantumult X'})
                    continue
                if target == 'Surge':
                    lines.append(','.join((rule.kind, rule.value.upper() if rule.kind == 'GEOIP' else rule.value,
                                           policy, *rule.options)))
                else:
                    lines.append(serialize(rule, policy, target))
            extension = '.dconf' if target == 'Surge' else '.list'
            file = 'Rule/' + target + '/' + source['category'] + extension
            if file in rendered:
                raise ValueError('Independent source output collides with a collection: ' + file)
            section = ['# Include this file in the profile [Rule] section with #!include.',
                       '# PROXY must refer to an existing proxy or policy group in that profile.', '[Rule]'] if target == 'Surge' else []
            rendered[file] = '\n'.join([*comments, '', *section, *lines]) + '\n'
            metadata[file] = {'authors': [source['author']], 'sources': [source['url']],
                              'category': 'general', 'count': len(lines), 'policy': 'mixed'}
    unique = {}
    for item in anomalies:
        key = (item['source'], item['code'], item['declaration'], item.get('target', 'both'))
        if key not in unique: unique[key] = {**item, 'categories': []}
        if item.get('category') and item['category'] not in unique[key]['categories']: unique[key]['categories'].append(item['category'])
    return rendered, metadata, list(unique.values())


def header(file, meta, stamp):
    return '\n'.join(['# Name: ' + Path(file).stem, '# Updated: ' + stamp, '# Converted by: chance',
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
    report = {'version': 1, 'complete': True, 'quarantined': [item for item in anomalies if not item['code'].startswith('filtered-')],
              'filtered': [item for item in anomalies if item['code'].startswith('filtered-')],
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
    print('Rule aggregation: files=' + str(len(outputs)) + ', rules=' + str(sum(counts.values())) + ', quarantined=' + str(len(report['quarantined'])) + ', ignored=' + str(len(report['filtered'])))


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
