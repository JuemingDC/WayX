# WayX Conversion Specification

| Field | Value |
| --- | --- |
| Revised | 2026-11-17 |
| Maintainer | chance |
| Authority | Single conversion and maintenance specification |
| Format | English headings, dated tables, mapping examples |
| Runtime policy | 13 |
| Validation mode | api-runtime-compatibility |

## 1. Scope and Maintenance

### 1.1 Ownership and Evidence

| Date | Area | Required rule / mapping |
| --- | --- | --- |
| 2026-11-16 | Specification ownership | All conversion, publication and maintenance rules → this file; retired designs → Git history; no parallel specification MD files |
| 2026-11-16 | Future revisions | Update the applicable dated rule row and add a dated revision row with the new mapping or rule example; update existing rules instead of appending contradictory policies |
| 2026-11-16 | Documentation style | Headings + tables + code examples; no narrative change notes; preserve required vendor licenses/provenance separately |
| 2026-11-02 | Conversion directions | Loon → Quantumult X; Loon → Surge; Quantumult X → Surge |
| 2026-11-12 | Native Surge inputs | Validate/copy Surge configuration + preserve native SDK; no Surge → QX conversion |
| 2026-11-02 | Egern | Native content only; excluded from the conversion chain |
| 2026-11-05 | Script scope | Adblock and Module, including HTTP and task triggers → same target API policy |
| 2026-11-02 | Deferred controls | Client configuration control APIs, including `$config` → no new mapping |
| 2026-11-03 | Excluded tools | DNS / GeoIP / ASN → no conversion bindings, inventories, missing-capability counts or roadmap entries; preserve author calls |
| 2026-10-25 | Default invariant | Preserve matching, phase, types, missing paths, array shifts, action order/boundaries, errors, skips and rollback behavior |
| 2026-10-25 | Evidence | Source official documentation or reproducible source-client behavior + target capability evidence; target syntax success alone ≠ source equivalence |
| 2026-10-25 | Exceptions | Apply only the explicitly scoped differences in this file; no extension to adjacent APIs/actions |
| 2026-10-25 | Uncertain semantics | Preserve source declaration + diagnose; no guessed widening, deletion or fake success |
| 2026-11-13 | Development batch | Finish code/config/tests/specification and relevant isolated checks → one final remote update → existing Actions publication |
| 2026-11-13 | Generated resources | No local production acquisition/regeneration or direct generated-artifact commits; isolated fixtures and read-only inspection allowed |
| 2026-10-23 | Implementation edits | Nearby `Modified: YYYY-MM-DD (chance)` comment naming the changed behavior; remove superseded code |
| 2026-11-03 | Retired implementations | Git history only; no unused branches, duplicate catalogs, author-composition experiments or static author-value proofs |

### 1.2 Source Authorities

| Date | Contract | Primary evidence |
| --- | --- | --- |
| 2026-11-16 | Loon syntax / API | [Rewrite v2](https://nsloon.app/en/docs/Rewrite/rewrite_v2/), [Script v2](https://nsloon.app/docs/Script/script_v2/), [Script API](https://nsloon.app/docs/Script/script_api/), [Rules](https://nsloon.app/docs/Rule/domain_rule/) |
| 2026-11-16 | Quantumult X | User-uploaded official sample configuration; [official repository](https://github.com/crossutility/Quantumult-X), `sample.conf`, rewrite documentation and official script examples |
| 2026-11-16 | Surge | [Official manual](https://manual.nssurge.com/), [URL Rewrite](https://manual.nssurge.com/http/url-rewrite.html), [Body Rewrite](https://manual.nssurge.com/http/body-rewrite.html), [API](https://manual.nssurge.com/scripting/api.html) |
| 2026-11-16 | Regex dialect | [ICU syntax](https://unicode-org.github.io/icu/userguide/strings/regexp.html); user-supplied QX author confirmation (2026-10-26) and Surge support confirmation (2026-11-01) for inline modes |
| 2026-11-16 | JQ | [jqlang 1.8 manual](https://jqlang.org/manual/v1.8/); official jq 1.8.2 binary + pinned SHA-256 in Actions; no inferred client engine version/file API |
| 2026-11-17 | Callback trailers | [Official API reference](https://manual.nssurge.com/scripting/api.html#httpclient) and [TestFlight post /460](https://t.me/SurgeTestFlightFeed/460); documented minimum iOS 6.0.0 / Mac 6.12.0; no inferred build number |
| 2026-11-10 | Compatibility examples | [NSNanoCat fetch](https://github.com/NSNanoCat/util/blob/49e40678c71f5075f451bf9aea6a91fd5c75ca5f/polyfill/fetch.mjs), [notification](https://github.com/NSNanoCat/util/blob/3cfb2cac62f0331344a44ea7e3d0b18ce7c82058/lib/notification.mjs), [done](https://github.com/NSNanoCat/util/blob/main/lib/done.mjs); implementation evidence ≠ official contract or device test |

## 2. Parsing, Conditions and Regex

### 2.1 Compilation and Action Boundaries

| Date | Input / stage | Required result |
| --- | --- | --- |
| 2026-10-30 | Pipeline | Source → AST → target-neutral Semantic IR → target planning/emission → one final output audit |
| 2026-10-30 | Source AST/IR | Preserve original declaration, section, phase, pattern/flags, captures, variables, options, action order and declaration identity |
| 2026-10-30 | IR boundary | No target action/section names, helper URLs or fallback decisions in source IR |
| 2026-10-25 | Plan kinds | `native-equivalent`, `guarded-helper`, `phase-dispatcher`, `unsupported`; native first when behavior is supported |
| 2026-10-25 | Unsupported mapping | Comment source declaration + diagnostic; no misleading active rule |
| 2026-10-25 | Scanner | Protect regex alternation, logical OR, strings/raw strings, jq pipes, variables, arrays, parentheses and Script options |
| 2026-11-15 | Continuous JSON/JQ actions | One source pipeline → one native jq expression; preserve order and per-expression scope |
| 2026-11-15 | Same URL JSON/JQ declarations | Group identical fixed condition + flags + phase in source IR before target planning; include separate source lines; preserve original dependency indices and comments |
| 2026-11-15 | Different conditions/phases | Keep separate; no post-emission rule-string merging |
| 2026-11-15 | Mixed declarations | Continuous JSON/JQ stays together; non-JSON actions retain independent planning boundaries |
| 2026-11-15 | Failed JSON dependency | Diagnose the entire affected JSON pipeline; never publish a shortened pipeline |
| 2026-10-25 | Independent action failure | Preserve neighboring successful independent actions; no declaration-text deduplication |
| 2026-10-25 | Independent repeated actions | Preserve multiplicity/order; routing-only exact duplicates may be deduplicated |
| 2026-10-25 | Cross-section execution | Preserve known client lifecycle/first-match limits; emitted line order alone ≠ full pipeline equivalence |

### 2.2 Regex and Captures

| Date | Source / context | Target / validation rule |
| --- | --- | --- |
| 2026-11-16 | Rewrite v2 literal validation | Native ICU compile; never reject `(?>...)`, possessive quantifiers or Unicode properties solely because JavaScript RegExp rejects them |
| 2026-11-16 | `(?>a\|ab)` | Preserve atomic group exactly; never replace with `(?:a\|ab)` |
| 2026-11-16 | Invalid ICU / unavailable ICU | Fail source validation/publication; no catch-and-accept bypass |
| 2026-11-16 | JS helper execution | Validate JavaScript regex before emitting helpers; incompatible literals remain diagnosed; native ICU acceptance does not certify JS execution |
| 2026-10-26 | `/pattern/ims` | Remove only outer delimiters; keep body escapes, classes, groups, quantifiers, lookarounds and suffix flags in AST |
| 2026-11-05 | Loon i/m/s → QX / Surge native URL/Header/Body/Script | Preserve flags as inline modes in stable i/m/s order; retain local scoped modes |
| 2026-11-05 | Header embedded matcher | Preserve source scoped modes, e.g. `(?i:pattern)` |
| 2026-11-01 | Surge native x mode | Preserve ICU `(?x)` and scoped forms; do not invent Loon `/pattern/x` suffix or JS `/x` support |
| 2026-11-01 | Surge body regex without source m | Prefix `(?-m)` / `(?i-m)` / `(?s-m)`; compensate only Surge body default multiline |
| 2026-11-01 | Surge URL / QX body | No Surge body-default compensation; no extra i/s/x without source evidence |
| 2026-10-26 | Recognizable HTTP(S) authority `example.com` | Target URL regex → `example\.com`; protect escaped dots, classes, groups, wildcards; no edits to path/query, MITM, resource URLs or source AST |
| 2026-10-26 | Literal-host normalization exception | Authorized match narrowing: `exampleXcom` stops matching; idempotent; no claim of strict source equivalence |
| 2026-11-05 | Valid native QX | Format check/copy; bypass Loon flag compiler and target regex rewriting |
| 2026-11-05 | Retained paused targets | Restore uniquely identifiable regex flags from frozen source snapshots only; preserve links/order/non-regex content; ambiguous fields → report; no source resumption |
| 2026-10-25 | Dynamic Regex | Complete `/pattern/flags` or typed Regex node only; no expression execution or second interpolation; invalid/missing value → no match |
| 2026-10-25 | Conditions | Typed equality/regex/logical groups over URL/method/status/header, declared arguments and captures; request cannot read response data |
| 2026-10-25 | Captures | Independent condition aliases and action-local `$0…$n`; validate uniqueness, bindings, reachability and indices |
| 2026-10-25 | Failed branch / missing capture | No capture leakage; missing optional capture skips current action; empty captured string remains valid |
| 2026-10-25 | Condition context | Declaration-start snapshot; action Header templates may read earlier Header mutations |
| 2026-10-25 | Prefilter | Allow false positive only with safe inner no-op; no unauthorized false negative; unconstrained mutation helper → `^` |
| 2026-10-25 | Echo / synthetic response | No unproven broad matcher; retain precise conditions or diagnose |
| 2026-10-25 | Serialized target patterns | Validate actual outer matcher, transport and structure; final native ICU audit; no substitution with helper internal checks |
| 2026-10-25 | Surge pattern parameters | Common quote-aware encoder for commas/whitespace/quotes; preserve backslashes; reject truncated/duplicate parameters |

```text
# 2026-11-16 | Issue #517 | source
request if ${url} ~= /^https?:\/\/mapi\.dianping\.com\/mapi\/operating\/(?>indexopsmodules|loadsplashconfig)/i then reject(404)

# Quantumult X
(?i)^https?:\/\/mapi\.dianping\.com\/mapi\/operating\/(?>indexopsmodules|loadsplashconfig) url reject

# Surge: [URL Rewrite]
(?i)^https?:\/\/mapi\.dianping\.com\/mapi\/operating\/(?>indexopsmodules|loadsplashconfig) _ reject

# Atomic semantics
^(?>a|ab)c$ + abc => no match
^(?:a|ab)c$ + abc => match
```

### 2.3 Strings, Templates and Parameters

| Date | Source | Required behavior |
| --- | --- | --- |
| 2026-10-25 | String templates | Expand registered built-ins, declared parameters and captures once; escaped interpolation/raw strings remain literal |
| 2026-10-25 | Raw String | Double backtick escapes stay literal; raw JSON-looking value remains String unless the specific source action defines JSON parsing |
| 2026-10-25 | Batch arrays | Preserve order and scalar/array roles; reject empty/nested arrays and mismatched lengths where source grammar forbids them |
| 2026-10-25 | Dynamic Header/path | Shared template/variable parser; unknown references diagnosed |
| 2026-10-25 | URL replacement | Preserve unmatched prefix/suffix and capture meaning; no second interpretation of JS `$&`/`$$` |
| 2026-10-25 | Static URL equality | Escaped, anchored native URL matcher; no static lowering of dynamic strings |
| 2026-10-25 | Surge native replacement | Supported capture/parameter placeholders only; ambiguous whitespace/dollar/backslash → helper or review |
| 2026-10-25 | Script path/tag/img_url | Fixed nonempty path String/Raw String; preserve lexical token and literal interpolation |
| 2026-10-25 | PluginObject | Nonempty unique declared parameter identifiers; no built-ins, captures or duplicate bindings |
| 2026-10-25 | Dynamic options | Boolean enable/debug; finite positive numeric timeout; distinguish undeclared, invalid-default and missing-default cases |
| 2026-10-25 | Dynamic cron | Declared nonempty String default, five/six fields; Surge placeholder, QX supported default + enabled; field count ≠ complete schedule validation |

## 3. Rewrite, JSON/JQ and Script Declarations

### 3.1 Native Actions

| Date | Source operation | Quantumult X | Surge / boundary |
| --- | --- | --- | --- |
| 2026-10-25 | `reject(404)` | `url reject` | `[URL Rewrite] pattern _ reject` |
| 2026-10-25 | Explicit `REJECT-200` | `url reject-200` | Existing explicit 200/Map Local mapping |
| 2026-10-25 | REJECT-IMG/DICT/ARRAY | Dedicated native action | Existing image/JSON Map Local mapping; preserve payload/status |
| 2026-10-25 | REJECT-DROP / REJECT-NO-DROP | Existing `reject` adaptation | Preserve supported target rejection; QX adaptation ≠ native connection/drop behavior |
| 2026-10-25 | URL redirect | Native `url 302/307 target`; exact supported conditions → `url-and-header` | Native redirect with supported captures |
| 2026-10-25 | Unrepresentable QX redirect | Comment + review | No broad `script-echo-response` redirect fallback |
| 2026-10-25 | Header add/set/del/replace | request-header / response-header | http-request / http-response + header-add/header-del/header-replace-regex; set → del then add |
| 2026-10-25 | Header text rule | Complete Header text, CRLF boundaries; two identical phase action tokens | Native fields when semantics fit; helper otherwise |
| 2026-10-25 | Header replace | Preserve field prefix and adjust capture numbering | Preserve duplicates/order using full-header-mode where needed |
| 2026-10-25 | Duplicate Header add | No dictionary-based equivalence claim | Preserve field/value arrays and order; unsupported lookup semantics remain review |
| 2026-10-25 | Body replace | Supported request/response-body form | Native Body Rewrite when behavior fits |
| 2026-10-25 | Remote mock | Native supported remote response or stable helper | Remote URL never passed as local file |
| 2026-10-25 | Text request mock | Verified lifecycle + text/Base64=false only | Shared runtime; no guessed binary extension |
| 2026-11-01 | reject-img native QX → Surge | Native source preserved | Map Local tiny-gif, status 200 |
| 2026-11-01 | Quoted Surge arguments | Preserve complete parameters and repeated-action boundaries | Official quoted syntax, iOS 5.21.0+/Mac 6.8.0+ |

### 3.2 JSON and JQ

| Date | Source operation | Standard jq / required behavior |
| --- | --- | --- |
| 2026-11-14 | JSON path | Typed String/Number segments; dot/bracket syntax; own properties; safe special keys including `__proto__` |
| 2026-11-14 | add | `setpath(PATH; VALUE)`; overwrite/create paths under the explicit user policy |
| 2026-11-14 | replace | `setpath(PATH; VALUE)`; no has/getpath/existence guard; preserve actual value types and native jq errors |
| 2026-10-28 | Independent object-key deletes | One `del(.a,.data.ads)`; keep quoted special keys |
| 2026-10-28 | Numeric or overlapping delete paths | Sequential `reduce PATHS[] as $p (.; delpaths([$p]))`; preserve array shifts and duplicate-index effects |
| 2026-10-28 | Single numeric delete path | `delpaths([PATH])` |
| 2026-11-15 | Same pipeline operations | Ordered `expr1 \| expr2`; no universal type guards, snapshots or catch/rollback wrapper |
| 2026-11-15 | Author jq / jq_file | Preserve program tokens, scope, conditions, types, interpolation, comments semantics and action order; no algebraic rewriting |
| 2026-11-14 | jq_file / legacy jq-path | Resolve source URL in Actions snapshot → inline actual program; no Resource/JQ copy or JQ File link |
| 2026-11-14 | jq `-f` | CLI option only; not evidence of a client configuration file-loading API |
| 2026-11-14 | Single-line encoding | Token-aware whitespace/comment handling + target quote escaping; preserve string data and nested interpolation |
| 2026-10-25 | Dependency identity | Bind by original declaration + action index; reuse same-run URL bytes, not one action result for a whole chain |
| 2026-11-15 | Failed/empty/uninlineable JQ file | Preserve diagnostic/reference evidence; withhold affected JSON pipeline |
| 2026-10-25 | Exact `else .end` repair | Original jq compile fails AND corrected `else . end` compiles → narrowly repair; do not edit strings/comments/legal `.end`; no other guessed fix |
| 2026-11-14 | Native QX output | `jsonjq-request-body` / `jsonjq-response-body` |
| 2026-11-14 | Native Surge output | `[Body Rewrite] http-request-jq` / `http-response-jq` |
| 2026-10-25 | Native jq preferred | Fixed jq/files/nested paths/flags do not alone force JavaScript |
| 2026-10-25 | Necessary JS JQ subset | Identity, fixed assignment, del/delete-many and supported paths only; no claim of complete jqlang support |
| 2026-10-25 | JS action transaction | Commit successful action; rollback failing current action; keep prior actions; continue supported later actions; do not impose this on native jq |
| 2026-11-16 | Device boundaries | Standard jq compilation and fixtures ≠ client empty-output/error/lifecycle certification |

```jq
# 2026-11-15 | one source pipeline, one native expression
setpath(["data","enabled"]; false) | del(.data.ads) | .data.items |= map(select(.ad != true))

# Typed values
setpath(["data","items"]; [])
setpath(["data","text"]; "[]")

# Sequential index deletion
reduce [["items",0],["items",0]][] as $p (.; delpaths([$p]))
```

```text
# 2026-11-15 | source
response if ${url} ~= /^https:\/\/api\.example\/v1/ then response.json.replace("data.enabled", false) | response.json.delete("data.ads")

# Quantumult X
^https:\/\/api\.example\/v1 url jsonjq-response-body 'setpath(["data","enabled"]; false) | del(.data.ads)'

# Surge: [Body Rewrite]
http-response-jq ^https:\/\/api\.example\/v1 'setpath(["data","enabled"]; false) | del(.data.ads)'
```

### 3.3 Phase Ownership and Author Scripts

| Date | Case | Required rule |
| --- | --- | --- |
| 2026-10-25 | Synchronous dispatcher | Source-index identities, ordered commits, independent captures, separate request/response and one `$done`; only first member owns emitted reference |
| 2026-10-25 | Unmatched dispatcher | Official no-op `{}`; Header-only hit preserves current body |
| 2026-10-25 | Surge HTTP scripts | First matching script per phase; do not assume no-op permits another script |
| 2026-10-25 | Separate native/actions | No absorption into a broad dispatcher; retain explicit cross-action lifecycle limitation |
| 2026-10-25 | Author async / legacy / unsupported actions | No automatic concatenation into synchronous dispatcher |
| 2026-10-25 | Narrow author-script owner | Same phase, identical single unflagged URL matcher, supported Body/JSON/text request mock, no conflicting legacy/native-JQ/parameters; matching dispatcher precedes author script |
| 2026-11-05 | Trigger fields | Preserve phase, body/binary independently, explicit timeout/enable/debug/argument and supported task trigger |
| 2026-10-25 | QX script enable | Force representable active author declarations enabled, including false/default-off/dynamic; keep commented source inactive |
| 2026-11-17 | QX declaration options | No invented enable/timeout/debug/argument fields; remote Loon Script arguments use official URL-fragment transport; bodyBytes remains supported |
| 2026-11-05 | Surge performance options | Use target native defaults; no copied Loon 10/20/300-second defaults, no forced max-size=-1; preserve explicit supported settings |
| 2026-11-17 | QX argument transport | Remote HTTP(S) scripts: fixed String/Raw String and legacy literal String → reserved `_wayx_argument` fragment envelope; PluginObject → typed declared defaults; retain existing fragments/query; missing defaults, dynamic Strings, local-only paths and reserved-key collision → omission diagnostic; invalid bindings still fail |
| 2026-10-25 | Surge arguments | Supported String / PluginObject encoding and placeholder transport; unproven dynamic transport → review |
| 2026-11-01 | QX script-request/response-header | Surge corresponding HTTP phase + requires-body=false |
| 2026-11-01 | QX script-request/response-body | Surge corresponding HTTP phase + requires-body=true |
| 2026-11-01 | QX script-echo-response | Surge http-request + requires-body=false; adapt synthetic response result |
| 2026-11-01 | QX script-analyze-echo-response | Surge http-request + requires-body=true; preserve request-body wait |
| 2026-11-05 | Syntax checks | Validate source entrypoint in function context (top-level return permitted), then final classic program |
| 2026-11-05 | Missing/mixed provenance | Not a blocker by itself; infer API family and actual target phase/binary input; unknown default storage name still fails at invocation |

### 3.4 Native QX and Header Conditions

| Date | Source | Required result |
| --- | --- | --- |
| 2026-11-13 | Valid native QX configuration | Preserve original active syntax/order/comments; format corrections only; rebind script resources through managed publication |
| 2026-11-13 | Native QX JavaScript | No API adapter; strip installation/development comments in published copy, keep executable behavior + required licenses; archive exact original |
| 2026-11-01 | Invalid native QX formatting | Comment section headings/unsupported metadata; quote bare jq; normalize known uppercase REJECT action and known DOMAIN/IP/USER-AGENT type names only |
| 2026-11-02 | HTTP(S) JS after echo-response/analyze-echo-response | Correct to matching script echo action; do not reinterpret JSON/data/local resource |
| 2026-11-01 | EmbyPlugin exact registered faulty row | Source URL `ddgksf2013/Rewrite/master/Function/EmbyPlugin.conf` + exact declaration match → `$1Accept-Encoding: gzip, deflate, br$2` with both CRLF captures; no extension to other sources |
| 2026-11-01 | EmbyPlugin Surge | Native Accept-Encoding replacement; absent field is not added |
| 2026-11-01 | Same-author same-app QX fragments | Concatenate filter/rewrite in source order; never merge different authors |
| 2026-11-03 | url-and-header parsing | URL first; method/path/header serialized predicates second; no unknown layout assumptions |
| 2026-11-03 | Supported Header guard | Nonempty separator-independent token patterns, method prefix/boundary, explicitly case-insensitive named-field prefix |
| 2026-11-03 | Safe disjoint URLs | Preserve URL + Header with request guard; response scripts use reserved argument outside shared author body; full-header-mode for duplicates |
| 2026-11-03 | Exact same URL + same reject action + distinct Headers | Authorized Surge-only URL-only native merge; all declarations in group must have Headers; retain source comments + exception marker |
| 2026-11-03 | Authorized merge actions | reject, reject-200, reject-dict, reject-array; keep distinct response types; report `authorized-url-only-merge` |
| 2026-11-03 | Authorized merge difference | Deliberate match widening to all matching URLs, even without source Header match; no equivalence claim |
| 2026-11-03 | Different URL guarded reject | Require fixed literal host, no identical URL peer, no known same-host conflict; otherwise review; preserve first-match shadow risk |
| 2026-11-03 | Overlap detection | Expand finite `^https?` / `^http?` prefixes, preserve alternation; `.+` may cross paths; unknown overlap stays review |

## 4. Routing Rules and Aggregation

### 4.1 Rule Conversion

| Date | Source / policy | Required mapping |
| --- | --- | --- |
| 2026-10-25 | Rule schema | Shared tables: 29 source types, 15 policies, 31 Rewrite v2 actions; target-unavailable fields explicitly null; new types require table + matrix updates |
| 2026-10-25 | General Rule | Preserve supported type/policy/parameters; unsupported network predicates → diagnostic, never HTTP-script substitution |
| 2026-10-25 | Surge module PROXY | External module parameter binding; QX module policy remains named source policy |
| 2026-10-25 | DOMAIN-WILDCARD | Surge DOMAIN-WILDCARD; QX host-wildcard; preserve `*`, `?`, classes/ranges/negative classes under user policy; no suffix approximation |
| 2026-10-25 | Malformed URL-REGEX `{n, m}` | Outside escapes/classes/quoted literals, valid bounds only → remove space after comma; preserve source + repair evidence |
| 2026-10-25 | Exact dns.weixin.qq.com / dns.weixin.qq.com.cn | DIRECT in converted standalone DOMAIN rows; no suffix/keyword/logical/subdomain extension |
| 2026-10-25 | URL-REGEX + REJECT | QX `url reject`; only explicit REJECT-200 → reject-200; no URL-based status inference |
| 2026-10-25 | Surge destination IP rules | IP-CIDR/IP-CIDR6/GEOIP/IP-ASN, including logical children → exactly one no-resolve; preserve other parameters; authorized DNS behavior difference |
| 2026-10-25 | Surge matching options | Supported pre-matching/extended-matching only; no reject-only pre-matching on DIRECT; independent official version gates |
| 2026-10-25 | QX Rule output | Native supported names/sections only; no Surge no-resolve or unsupported properties |
| 2026-10-25 | QX native URL reject | Empty 404 + client-managed repeated-request delay; no custom counters/timers or replacement with reject-200 |
| 2026-10-25 | Native reject timing | URL rewrite backoff, network filter rejection and Surge REJECT-DROP escalation remain separate; no helper backoff certification |

### 4.2 Classification and Collections

| Date | Input / collection | Aggregation rule |
| --- | --- | --- |
| 2026-10-25 | Policy precedence | Explicit row action > registered DIRECT/PROXY action > category/application default |
| 2026-10-25 | Geosite | `category@attribute` and `category@!attribute`; preserve actual source attributes; no invented geography/policy inference |
| 2026-10-25 | V2Fly + MetaCubeX | Joint primary inputs, independently acquired/verified; same exact rule → merge provenance |
| 2026-10-25 | Source registry | `.github/sources/rules.json`; V2Fly official data + SHA-256; no duplicate same-upstream SagerNet download; exclude direct blackmatrix7 only |
| 2026-10-25 | Coverage | Explicit independent services with additional source rules only; no automatic recursive child expansion |
| 2026-10-25 | Service selectors | Google Play/FCM/Trust Services/Scholar; Disney ESPN/Hulu/Star+; Apple Update/Intelligence; Microsoft Azure/Bing/PKI/OneDrive; domestic collaboration/storage and overseas storage/password services |
| 2026-10-25 | MetaCubeX missing @!cn | Do not substitute full Microsoft/Azure/Bing lists for complements |
| 2026-10-25 | Source attribution | Preserve author, URL, license, digest; exact duplicate sources retain all evidence |
| 2026-10-25 | Ownership | Existing app collection first; other domestic apps → media_cn; overseas apps → media; unowned general DIRECT → cn, proxy → proxy |
| 2026-10-25 | Ownership evidence | Explicit Geosite tags/service declarations and specific suffix evidence; no guessing from .cn, IP location, company name or shared CDN hosting |
| 2026-10-25 | Specific services | Specific app host beats cloud parent; configured AI/YouTube/GitHub priority; ambiguous shared rules stay source-classified + reported |
| 2026-10-25 | media_cn PROXY | Move to media after policy resolution; no media_cn_proxy artifact |
| 2026-10-25 | Full-proxy collections | Google, YouTube, Facebook/Meta, X, Telegram, GitHub, overseas AI, Netflix, Disney → proxy only; source DIRECT rows retained in cn |
| 2026-10-25 | Full-proxy exceptions | Keep REJECT/standalone filterfix; no selectors/defaults/layout that restore app DIRECT rows |
| 2026-10-25 | Other collections | Preserve explicit actions; media_cn actionless default DIRECT; otherwise configured source default |
| 2026-10-25 | App-specific unique action | Adopt configured action for same native predicate from unmarked generic inputs; retain provenance; no majority voting or overwriting explicit conflicts |
| 2026-10-25 | Deduplication | Exact type + operand + action + expressible parameters only; no suffix coverage compression, parent/child pruning, cross-policy deletion or regex removal by coverage |
| 2026-10-25 | Exclusions | Registry rule_exclusions/exclude_tags applied to both targets and all inputs; no generated-file edits; wildcard exclusion does not remove corresponding CIDR |
| 2026-10-25 | Unsupported predicates | Whole declaration filtered for desktop identity/process/user or unrepresentable AND terms; never remove just one conjunct to widen matching |
| 2026-10-25 | Unsupported valid regex/type/options | Ignore only under registered routing policy, count in Action report, no conversion Issue; malformed input still fails |
| 2026-10-25 | Domain regex lowering | Exact finite expansion to native DOMAIN/SUFFIX/wildcard only; no approximate match widening |
| 2026-10-25 | sing-box | Versions 1–5; supported fields only; whole unrepresentable condition omitted |
| 2026-10-25 | Standalone source | Preserve independent output, comments, order and policies; no app/cn/proxy merge or cross-source dedup |

### 4.3 Output and Routing Layers

| Date | Collection / target | Output rule |
| --- | --- | --- |
| 2026-10-27 | QX aggregated filters | One file per collection; native direct/reject/ssid; require existing ssid policy group; no force-policy override |
| 2026-10-27 | Surge external RULE-SET | No row policy; configured split/combined outputs |
| 2026-10-27 | Apple | CN/update DIRECT → named proxy/TestFlight → remaining actionless Apple DIRECT; explicit row actions retained |
| 2026-10-27 | Apple inputs | QuixoticHeart apple-cn/apple-proxy + V2Fly/MetaCubeX apple-update + Tartarus TestFlight; preserve original matching types and licenses |
| 2026-10-27 | Apple QX | Single apple.list, native specificity/layer order, before general cn/proxy/IP fallback |
| 2026-10-27 | Apple Surge | apple_cn.list DIRECT → apple_proxy.list proxy; direct fallback merged with official logical exclusions only where necessary; no third fallback file |
| 2026-10-27 | Microsoft | Actionless CN layers before company/OneDrive defaults; keep explicit actions, GitHub/AI ownership and filenames; Surge direct/proxy split |
| 2026-10-25 | Steam | steam@cn DIRECT + remaining Steam proxy; QX one mixed file, Surge split |
| 2026-10-25 | Full-proxy Surge apps | One .list each; no _direct/_proxy pair |
| 2026-10-25 | Spotify Surge | One spotify.list, caller chooses policy; explicit accepted loss of per-row routing; no fabricated DIRECT source |
| 2026-10-25 | Other mixed collections | Split supported DIRECT/PROXY as configured; REJECT separate |
| 2026-10-25 | filterfix | QX filterfix.list; Surge filterfix.dconf `[Rule]` with mixed policies + main-profile `#!include`; no RULE-SET/module substitution |
| 2026-11-10 | Routing headers | English Name/Updated/Source Authors/Category/Source; Category Adblock, app or general; refresh date on each successful daily rule sync |
| 2026-10-25 | Cleanup/failure | Delete only tracked owned stale files; preserve manual files and old output on failure; store filtered detail in rules-result.json |

## 5. Script API

### 5.1 Runtime Architecture

| Date | Area | Required rule |
| --- | --- | --- |
| 2026-11-02 | Baseline | ScriptHub `b943361f11be5795b3eb10f9cc4e5497642922fc`, script-converter.js facade/Header strategy; GPL provenance in vendor/script-hub |
| 2026-11-02 | Author program | Ordinary JavaScript business expressions, functions, classes, Env receivers, this, aliases and closures; one body per source URL/target |
| 2026-11-02 | API bindings | Source-named facade for direct globals and globalThis/window/global; local shadowing preserved; copy host dictionaries |
| 2026-11-16 | globalThis discovery | Recognize TypeScript intrinsic globalThis; computed aliases retain required facade; local same-name bindings stay ordinary JS |
| 2026-11-02 | Inventory | Descriptive source references + target capability runtime/native-only/unavailable/unclassified; no author-name/value/dataflow whitelist |
| 2026-11-02 | Failure policy | No empty APIs/timers, full-text done replacement, resolve(null) network suppression or catch-and-pass-through |
| 2026-11-05 | Identity | Actual target runtime/timers/defaults; no fake Loon device/version, single-shot interval or unlimited body |
| 2026-11-11 | Selection | Lexical executable API references + dependency closure; ignore comments/string API words; no business URL/value-based pruning |
| 2026-11-11 | Simple body bridge | Direct request URL/body and response-body reads + static body completion → minimal lexical adapter; preserve scope, exact bytes, one commit |
| 2026-11-11 | Dynamic globals | Escapes/computed globals/eval/Function/this → conservative required API retention; no unsupported reflection emulation |
| 2026-11-11 | Lazy providers | Initialize at actual access inside author control flow; never evaluate getters across if/try boundaries |
| 2026-11-11 | Constant folding | Generator-owned client/layout code only; remove unreachable helpers/host captures/providers/config; do not rewrite author expressions |

### 5.2 Context, HTTP and Completion Mappings

| Date | Source contract | Quantumult X | Surge / boundary |
| --- | --- | --- | --- |
| 2026-11-02 | Header dictionary | Case-insensitive lowercase Proxy; get/set/delete/in/hasOwnProperty/Symbol/descriptor | Same; copy native input; original case/duplicate-case keys not preserved; Proxy invariants still enforced |
| 2026-11-02 | HTTP methods | `$task.fetch` Promise; GET/POST/PUT/DELETE/HEAD/OPTIONS/PATCH | `$httpClient` callbacks; same seven methods; dynamic methods, concurrency, errors/missing response preserved |
| 2026-11-02 | Redirect / cookie / TLS | opts redirection / auto-cookie / skip-cert-verify | auto-redirect / auto-cookie / insecure; map source defaults explicitly |
| 2026-11-02 | Loon node | opts.policy | policy; single-request routing only, no config writes |
| 2026-11-02 | Loon HTTP timeout | Omit unsupported native timeout/cancellation | Milliseconds → Surge seconds |
| 2026-11-10 | Binary request | `bodyBytes: ArrayBuffer`; exact view range | `body: Uint8Array`; text body takes priority; no duplicate payload fields |
| 2026-11-02 | Loon body-base64 | Decode to actual bodyBytes | Decode to actual binary body |
| 2026-11-02 | HTTP response | statusCode + headers + body/bodyBytes | status + headers + body; preserve callback `(error,response,data)` |
| 2026-11-02 | Native QX decoded body | Preserve String even when bodyBytes present | Foreign byte decode uses explicit charset, default UTF-8; missing/unknown decoder rejects UNSUPPORTED_RESPONSE_CHARSET |
| 2026-11-02 | Dynamic completion | Validate result before locking one host submission; author may catch validation error and retry | Same; preserve native submit errors and exact byte views |
| 2026-11-02 | Synthetic response | Flat source/target shape + proper echo declaration | response-wrapped shape; correct status and bytes |
| 2026-11-10 | QX scheme/path reads | Derive from actual URL; preserve query/escaping | Expose source fields through facade |
| 2026-11-10 | QX `$done({path})` | Source behavior retained | Full url with original scheme/host/port; preserve query/escaping |
| 2026-11-10 | QX `$done({url})` | Preserve full URL | Preserve changes to scheme/host/port; modified url wins over stale derived path |
| 2026-11-02 | QX undocumented options | Omit at invocation; retain argument construction side effects/errors | No invented support; unknown completion fields follow explicit contract validation |
| 2026-11-17 | Loon `$argument` | Read `_wayx_argument` from native `$environment.variables`; documented sourcePath fragment fallback; decode envelope to original String or typed object | Surge transport unchanged; no fabricated QX native `$argument`; no source-client saved settings synchronization |

### 5.3 Storage, Notifications and Standard Providers

| Date | Source contract | Target rule / example |
| --- | --- | --- |
| 2026-11-02 | Store read/write | Dynamic String keys/values; `$persistentStore.read/write` ↔ `$prefs.valueForKey/setValueForKey`; known source-name default key only |
| 2026-11-02 | Single-key deletion | Target native remove or null deletion; empty String never used as deletion probe |
| 2026-11-02 | Loon remove-all → QX | Real `$prefs.removeAllValues()` |
| 2026-11-02 | Loon remove-all → Surge | Authorized omission, return undefined; no partial key clearing or success claim |
| 2026-11-10 | Loon openUrl / QX open-url | Surge action=open-url + url; Loon string link retained |
| 2026-11-10 | Loon clipboard / QX update-pasteboard | Surge action=clipboard + text; clipboard wins if both actions requested; QX retains both fields |
| 2026-11-10 | Remote notification image | QX/Surge media-url |
| 2026-11-10 | Surge embedded PNG/JPEG/GIF/WebP | Recognized Data URI/Base64 signature → media-base64 + media-base64-mime; unknown media omitted |
| 2026-11-10 | Notification delay | Authorized omission, submit immediately; preserve content and supported actions |
| 2026-11-02 | ALPN; completion node/policy | Authorized Surge omission; argument evaluation preserved; request policy still supported |
| 2026-11-02 | Native store/error/cookie differences | Retain native missing/null/undefined/empty/error behavior; no strict whole-program equivalence claim |
| 2026-11-05 | Environment metadata | Actual available name/time/target identity only; missing source version/build/path omitted and documented; no deleting author conditions |
| 2026-11-02 | Timers | Actual target setTimeout/setInterval with milliseconds/arguments; no one-shot Loon emulation |
| 2026-11-02 | UTF-8 / Base64 | Standard isolated codec + native-first capability; exact BufferSource offsets, fatal/stream/BOM behavior |
| 2026-11-02 | gzip / ungzip | Native Loon first, otherwise lazy Pako 2.1.0 (`3c06216518c259b569a5168dee867e6dabbe5160`); synchronous Uint8Array; gzip-only framing + CRC/trailer/full-stream validation |
| 2026-11-02 | AES | Native Loon first, otherwise noble-ciphers 2.4.0; synchronous ECB/CBC/CTR/GCM; 16/24/32-byte keys; no password derivation or silent padding |
| 2026-11-02 | AES CBC / ECB | CBC IV 16 bytes; ECB no IV; PKCS7 default or none |
| 2026-11-02 | AES CTR / GCM | CTR IV 16 bytes/no padding; GCM nonce 12 bytes, optional AAD, separate authenticated 16-byte tag |
| 2026-11-02 | AES values/errors | Actual Uint8Array views; encrypt `{ciphertext,tag?}`, decrypt bytes; invalid types/lengths/authentication throw; no identical native message guarantee |
| 2026-11-02 | URL / URLSearchParams | Complete native pair first, otherwise lazy whatwg-url 14.2.0; linked searchParams, IDNA, setters, iteration, parse/canParse |
| 2026-11-02 | Legacy TextDecoder | Native labels first, otherwise Exodus bytes 1.16.0; standard legacy encodings/stream/fatal/BOM; unknown labels reject |
| 2026-11-02 | Provider distribution | Pinned lock/manifest/digests, isolated lazy bundles, required GPL/MIT/Zlib/BSD notices; no runtime Node dependencies/downloads or host-global mutation |
| 2026-11-02 | Unsupported WASM/file/control APIs | Actual host support required; no empty implementation or synthetic success |

### 5.4 Surge Trailers

| Date | Source / case | Surge mapping | Boundary |
| --- | --- | --- | --- |
| 2026-11-16 | `$response.h2_trailers` | Read actual `$response.trailers` | HTTP response + requires-body=true; official minimum iOS 6.0.0/Mac 6.12.0 for response-script API |
| 2026-11-16 | `$done({h2_trailers: value})` | `$done({trailers: value})` | Buffered response script; native HTTP/2 write restriction |
| 2026-11-16 | Omitted completion trailers | Omitted | Preserve upstream trailers |
| 2026-11-16 | Explicit empty dictionary | `trailers: {}` | Clear trailer section |
| 2026-11-16 | Whole response completion | Keep mapped trailers | No accidental loss after read/edit |
| 2026-11-17 | Callback `response.h2_trailers` | Actual `$httpClient` callback `response.trailers` | Chunked HTTP/1.1 or HTTP/2 response with a trailer section; seven methods; independent of intercept phase/requires-body/binary mode; no HTTP/2-only read restriction |
| 2026-11-16 | Callback absence / empty | Absent stays absent; explicit `{}` stays present | Preserve native response ownership, getters, callback errors and exact data bytes |
| 2026-11-16 | Native field/value array → Loon | Case-insensitive dictionary | Last duplicate wins; no array-duplicate preservation claim |
| 2026-11-16 | Direct native trailer array result | Preserve order/duplicates | Validate String field/value; do not mutate input |
| 2026-11-16 | Request/synthetic/QX trailers | No new mapping | Response/callback feature does not establish request/echo/Promise trailer API |
| 2026-11-16 | Filtering / limits | Native Surge enforcement | Invalid field filtering, 32-field response-script limit, HTTP/2 writes; no protocol fabrication/old-client emulation |
| 2026-11-16 | gRPC status/message | Preserve unless author explicitly edits | Body changes or `$done({})` do not clear trailers |
| 2026-11-17 | Callback API version | Official API reference: iOS 6.0.0+ / Mac 6.12.0+ | Explicitly documented callback minimum; no guessed build or old-client emulation |
| 2026-11-17 | Callback full-header-mode | Default dictionary; enabled mode supplies `{field, value}` arrays for headers and trailers | Preserve `(error, response, data)`; no trailer section means no trailers key; Loon facade keeps its documented dictionary projection |
| 2026-11-17 | gRPC headers-only early failure | Author reads `response.h2_trailers || response.headers` through Loon facade; native Surge reads `response.trailers || response.headers` | Do not synthesize trailers from headers, rewrite author business logic or infer RPC success from HTTP 200 |
| 2026-11-17 | Request trailers | Not exposed to http-request scripts; author explicitly defers support | No invented request mapping; no body-buffer/forwarding emulation |

```javascript
// 2026-11-16 | Loon source -> Surge target
$response.h2_trailers                 // -> $response.trailers
$done({h2_trailers: {"grpc-status":"0"}}); // -> $done({trailers:{"grpc-status":"0"}})
$httpClient.get(url, (error, response, data) => {
  const status = response.h2_trailers?.["grpc-status"];
  // Source facade reads the actual Surge callback response.trailers.
});
```

```javascript
// 2026-11-17 | Loon source: explicitly authored gRPC status lookup
$httpClient.post(options, (error, response, data) => {
  if (error || !response) {
    $done({});
    return;
  }
  const fields = response.h2_trailers || response.headers;
  console.log(fields["grpc-status"]);
  $done({});
});

// Native Surge equivalent lookup:
// const fields = response.trailers || response.headers;
// HTTP 200 alone does not establish gRPC success.
// Conversion preserves an absent trailer section; it adds no fallback itself.
```

### 5.5 Quantumult X Script Arguments

| Date | Contract | Mapping / evidence |
| --- | --- | --- |
| 2026-11-17 | Official transport | [Official sample-task.js](https://github.com/crossutility/Quantumult-X/blob/master/sample-task.js): remote rewrite/task script URL fragments; variables since v1.5.6 build 918; older documented sourcePath remains readable |
| 2026-11-17 | Types | Empty String stays String; legacy JSON-looking argument stays String; PluginObject number/boolean defaults become actual JSON number/boolean; missing defaults not invented |
| 2026-11-17 | Scope | Same remote script URL may carry different declaration payloads; backup rebinding preserves fragments; source archives unchanged; native QX scripts are not wrapped |
| 2026-11-17 | Runtime policy 13 | Full and selected API kernels retain the environment dependency when source code uses $argument; no added provider bundle |
| 2026-11-17 | Boundaries | Fragment values are configuration, not secrets; source-client UI values are not synchronized; no native network timeout/cancellation inferred from timer examples |

```text
# 2026-11-17 | Loon fixed argument -> QX remote operand
script("https://example.test/a.js", "mode=clean")
https://example.test/a.js#_wayx_argument=%7B%22value%22%3A%22mode%3Dclean%22%7D
# QX host variables -> Loon facade:
# {"_wayx_argument":"{\"value\":\"mode=clean\"}"} -> $argument === "mode=clean"
# Declared defaults flag=false, count=2 -> $argument === {flag:false,count:2}
```

## 6. Acquisition, Metadata and Resource Lifecycle

### 6.1 Discovery and Transport

| Date | Input / stage | Required rule |
| --- | --- | --- |
| 2026-10-30 | HTTP | `src/ingest/resources.ts`, configured Surge UA from observed HAR; WAYX_FETCH_UA override; no invented latest-version UA |
| 2026-11-12 | Kelee / RuCu6 exception | Native Node HTTP(S), reference downloader Loon UA, Accept-Language, 60-second default and five transient attempts; other profiles unchanged |
| 2026-11-12 | Kelee state | Resumed in `.github/sources/kelee-pause.json`; future registry pauses remain authoritative across discovery/acquisition/conversion |
| 2026-11-08 | Existing Kelee catalog + catalog HTTP 403 | Retain registered entries, try registered body URLs; monitor DEFERRED/succeeded=false; preserve mirror; no catalog completeness claim |
| 2026-11-08 | Catalog 401/malformed/no prior entries | Fail; do not reuse HTTP 403 isolation |
| 2026-10-25 | Retry | Transient network/timeout and HTTP 408/425/429/5xx only; permanent errors/size limits fail without repeated retries |
| 2026-10-25 | Limits | Decoded text default 128 MiB; binary mock 512 MiB; count actual bytes; explicit per-call override allowed; not client body-size capability |
| 2026-10-25 | Run snapshot | Original URL + request profile identity, first successful bytes, URL/profile/SHA/size manifest, integrity checks; bounded failures cached for run |
| 2026-10-25 | Conversion context | Resolve dependencies once per source revision; bind URL/content digest + original action indices; isolated planner copies; no network in emission |
| 2026-11-01 | Upstream URLs | Original author URL only; no third-party mirror fallback; publication resource URL is separate |
| 2026-11-10 | GitHub authentication | Actions token automatically only to exact https://api.github.com origin; preserve explicit auth; no leakage to raw/third parties |
| 2026-10-25 | Catalog authority | Manual loon-static + generated loon catalog; preserve stable ids/paths/order; malformed/incomplete discovery cannot delete old resources |
| 2026-10-25 | RuCu6 discovery | Message https://t.me/GitCube/327 or Telegram alias; parse actual body/plugin links; follow HTTPS short links until plugin URL/import parameter; never fetch import page |
| 2026-10-25 | RuCu6 URLs | rucu6.pages.dev/Plugins/*.lpx; JSON/list override supported; no category filtering or guessed filenames; failed shortlink retains full catalog |
| 2026-10-25 | Kelee discovery | hub.kelee.one/list.json official Lpx adblock/dependencies; feed order and source URL identity preserved |
| 2026-10-08 | Excluded upstreams | Kelee Bilibili_remove_ads.lpx and RuCu6 bilibili.lpx; query/fragment does not bypass exclusion; managed stale targets/helpers removed |
| 2026-11-12 | Moyu website | Discover actual same-site JSON catalog fetch from https://ddgksf2013.top HTML; no website JS execution |
| 2026-11-12 | Moyu catalog | Actual script/rewrite entries first; GitHub AdBlock/Function/Html supplements only for apps not superseded; invalid/empty/missing catalog fails without deleting baseline |
| 2026-11-12 | Moyu ignored entries | Remote configs, install bridges, AppRaven favorites, routing/icon links → separately counted, not fake modules |
| 2026-11-12 | Moyu headers | Scope JSON/HTML Accept, same-site Referer, Accept-Language, no-cache/Pragma to website; retain resource UA, no auth leak |
| 2026-11-12 | JS install declarations | Parse real comments only; no business execution or filename-inferred matcher; recognize JS files containing actual QX config |
| 2026-11-12 | Content classification | Functional/membership tools → Module; ad blocking → Adblock; native Surge → Surge only |
| 2026-11-12 | Dead origins | Registry-declared JavDB/Lofter fallback and HTTP 404/410 skipped explicitly; no success claim for other failures |
| 2026-11-05 | Known unavailable whole URL | `config/unavailable-sources.json` → skip whole acquisition; unavailable dependency → comment only affected declaration |
| 2026-10-30 | Encrypted/opaque input | Archive original bytes/URL/SHA/size/type before status; .lpxe or binary classified opaque; no guessed decryption/parsing |
| 2026-10-30 | Opaque publication | Verified archive → retain prior output or archive-only first input; never report converted; plaintext recovery clears active state, not history |
| 2026-10-30 | HTML/invalid ordinary text | Real source failure; never relabel as encryption success |

### 6.2 Metadata and Backups

| Date | Item | Required mapping / lifecycle |
| --- | --- | --- |
| 2026-11-10 | Adblock/Module Updated | Explicit upstream date only, including `#!date`, `@UpdateTime`, `> UpdateTime`; missing → `上游未标注`; retain distinct merged dates |
| 2026-11-10 | Conversion clock | No generated conversion timestamp; spec rule changes carry dates here; Rule sync date remains separate |
| 2026-11-10 | Manual/frozen content | Preserve author dates; fix owned metadata from frozen source without reacquisition |
| 2026-10-25 | Config comments | Preserve upstream comments/author/source/name/description/icon; Converted by chance + applicable Category; QX section headings commented, Surge native sections active |
| 2026-10-25 | MITM | Format conversion only; no hostname scope widening |
| 2026-10-25 | Inline notes | Only unique one-comment/one-rule binding; otherwise ordinary comments; split comment attached once; inactive source stays inactive |
| 2026-10-30 | `#!source` | Preserve author value as comment; Loon download-URL binding ≠ content integrity signature; no rebinding to target URL |
| 2026-10-30 | Icons | lige47 → fmz200 → Qure Color; explicit aliases/name normalization, unnumbered preference; no arbitrary substring or generic fallback |
| 2026-10-30 | Existing icon | Existing nonempty author URL wins; fill absent metadata only with `# Icon: URL` + collection attribution; no undocumented active directive |
| 2026-11-01 | Native QX icons | No backfill in valid native QX body; converted/Surge metadata only |
| 2026-10-30 | Icon downloads | Shared run snapshot + monitor reuse; reference original image URLs, no image mirrors; unmatched remains unchanged |
| 2026-11-01 | Plugin archive | `Resource/Backup/plugin/<URL SHA>/<filename>`; exact response bytes |
| 2026-11-01 | Script archive | `Resource/Backup/script/<URL SHA>/<filename>`; exact BOM/newlines/comments/signatures |
| 2026-11-02 | API evidence | `Resource/Backup/script-api/<URL SHA>.json`; original/program/plan hashes, UTF-16 positions, capability status |
| 2026-11-01 | Archive identity | Query significant; fragment excluded from fetch identity and preserved in published script URL |
| 2026-11-01 | Backup refresh | Fetch referenced active HTTP(S) scripts every sync even when plugin unchanged; same path replaced on byte change; old versions in Git |
| 2026-11-01 | Backup index | Original/acquisition URL, digest, size, path; no backup banner in author content |
| 2026-11-01 | Retained/paused source | Label source snapshot state; permitted referenced-script backups do not resume plugin discovery/conversion |
| 2026-11-01 | Download failure | Verified old archive → retained + report; none → original URL + unresolved/missing status; no invented backup URL |
| 2026-11-01 | Backup validation | Reject empty/HTML/oversized fake scripts, invalid hashes, missing WayX references and rollback errors |
| 2026-11-01 | Rebinding | Active script operand only; preserve comments/regex/icon/redirect/arguments; one transaction for artifacts/index/references |
| 2026-11-13 | Published executable | Executable author behavior + required legal notices only; strip install instructions/development comments, including native QX |
| 2026-11-05 | Final layout | `type/(Quantumult X\|Surge)/source-author/app/config-or-script`; colocated readable source-named scripts, no hash-coded filenames |
| 2026-11-05 | Layout state | Reversible `.github/sources/layout-state.json`: prepare working identities → convert/rebind → publish final tree; raw evidence excluded |
| 2026-11-05 | Names / cleanup | Unique readable Surge script identities; reference-closure cleanup after rebinding; preserve manual/frozen/relative dependencies and raw archives |

## 7. Automation, Reports and Validation

### 7.1 Architecture and Commands

| Date | Location / command | Contract |
| --- | --- | --- |
| 2026-10-30 | src/domain | Pure contracts/regex/conditions/routing; no filesystem/network imports |
| 2026-10-30 | src/ingest | Discovery, transport, snapshots, pauses, format classification |
| 2026-10-30 | src/parser / src/emit | AST/IR/planning / target configurations and helpers |
| 2026-10-30 | src/validation | Native ICU, target format and publication evidence |
| 2026-10-30 | src/publish / src/application | Transactions/indexes / orchestration, reports, Issues and gates |
| 2026-10-30 | src/index.ts | Public conversion re-exports; no second implementation |
| 2026-10-30 | Runtime | Locked npm ci + supported Node; erasable TypeScript; no Python/MJS forwarding entrypoints |
| 2026-11-13 | `npm run typecheck` | Compiler only; strict unused-local/parameter checks |
| 2026-11-13 | `node tests/<affected-suite>.ts` | Relevant isolated regression; no redundant full local replay |
| 2026-11-17 | `npm test` | Developer/PR and implementation/spec push contract suites before acquisition; scheduled/manual production sync does not repeat developer suites |
| 2026-10-30 | `node src/cli.ts prepare` | Expected head, working layout, logs, main/test branch budget |
| 2026-10-30 | `catalog`, `rules`, `sync` | Discover → acquire/aggregate/convert once per run |
| 2026-10-30 | `verify` | One final type/script/actual-output/ICU audit; no canonical regeneration |
| 2026-10-30 | `monitor`, `reports`, `issues` | Official changes → evidence reconciliation → category Issues; read-only outside publication context |
| 2026-10-30 | `gate`, `publish`, `summary` | Require machine evidence → checked transactional publication → counts/exceptions |
| 2026-10-30 | `regenerate` | Explicit developer canonical comparison only; never routine daily synchronization |
| 2026-10-30 | `icons` | Metadata-only refresh of registered targets; no plugin/routing regeneration |

### 7.2 Publication and Monitoring

| Date | Stage | Required behavior |
| --- | --- | --- |
| 2026-11-01 | Workflow | `.github/workflows/converter-check.yml`, WayX Automation; main, optional test only |
| 2026-10-31 | Schedule | `30 21 * * *` UTC → next day 05:30 Asia/Shanghai |
| 2026-11-01 | Triggers | Implementation/config/test/spec pushes, PR, manual, daily; generated commits do not retrigger |
| 2026-11-17 | Order | Prepare logs/branch budget → PR/push contract tests → catalog → routing/sync → backup/API/rebind/cleanup → final audit → monitor/reports/Issues → gates → publish |
| 2026-11-01 | Same-repo test PR | Exact PR head + authorized existing test publication; external PR read-only artifacts/candidates |
| 2026-10-25 | Per-plugin transaction | Source/targets/helpers rollback together; failure retains valid old baseline, first failure deferred; other plugins continue |
| 2026-10-25 | Hard gates | Rollback failure, missing/incomplete evidence, required monitor/Issue failure, unexpected remote head or dirty managed state blocks publication |
| 2026-10-25 | Content comparison | Compare actual per-file content; unchanged files keep mtime/date; no unrelated rewrites; legacy conversion-clock differences ignored |
| 2026-10-25 | Removed managed inputs | Remove owned stale source/targets/helpers after valid catalog; protect reused paths/manual resources; failed discovery never authorizes deletion |
| 2026-10-25 | Reports | Distinguish converted, updated, unchanged, retained, deferred; verified = actual generated output format passed, not device certification |
| 2026-10-25 | Reconciliation | Reuse run records and final file hashes; no extra canonical reconstruction |
| 2026-10-25 | Monitor | Official document/repository changes only; reuse discovery bytes; mirrors + state atomic; conditional requests require intact mirror |
| 2026-10-25 | Incomplete comparisons | Download failure, truncated GitHub diff or non-forward history retains baseline + failure; no guessed capability expansion |
| 2026-10-25 | Read-only PR | No Issues/mirror/state mutation; save candidates/artifacts only |
| 2026-10-25 | Artifacts | Logs, snapshots, generated outputs, reports and candidates; 14-day retention; runtime logs not committed |

### 7.3 Stable IDs, Issues and README

| Date | Item | Required rule |
| --- | --- | --- |
| 2026-11-12 | Adblock identity | `.github/sources/adblock-numbers.json`: monotonic AD0001 IDs, never renumber/reuse; same ID for QX/Surge; logical/published aliases retained |
| 2026-11-12 | Visible IDs | Config `# WayX ID: AD0001`; README ID column; filenames/business JS unchanged |
| 2026-11-12 | Automatic Issues | At most five reusable categories: fetch, conversion, routing, monitoring, validation/automation |
| 2026-11-12 | Fetch Issue body | One stable AD number per line only; no URLs/stacks/prose |
| 2026-11-12 | Other Issue bodies | Current consolidated problem evidence; full logs in Action artifacts; overwrite category body, no per-failure comment spam |
| 2026-11-12 | Recovery/recurrence | Close recovered category after complete successful evidence; reopen same identity on recurrence; incomplete execution cannot clear old problems |
| 2026-11-12 | Migration/budget | Write category summary before closing duplicate/per-item Issues; manual Issues consume budget; merge non-fetch categories if required |
| 2026-11-13 | History reads | 100/page; project number/title/state + open-body only before Node capture; bounded output avoids ENOBUFS |
| 2026-10-25 | Report parsing | Only ENOENT permits absent report; corrupt JSON/schema/version/IO fails; sync v1/v2, monitor v1; review baseline mandatory |
| 2026-11-03 | README sections | BoxJs → Module → Adblock → Rule; collapsed GitHub details/summary with counts and blank-line boundaries |
| 2026-10-25 | README sources | Actual registry/Source URL owner, not author signature; source-first occurrence order; A–Z/pinyin inside each source; numeric/other group separate |
| 2026-10-25 | Rule links | Reject → Proxy → Direct; mixed-policy links under Proxy with preserved-policy note |
| 2026-10-25 | README links | Actual published files only; missing target `—`; one entry/resource; remove empty groups; HTML-escape names; update-interval=86400 |

### 7.4 Required Evidence

| Date | Check | Required coverage / limitation |
| --- | --- | --- |
| 2026-11-16 | Source regex regression | Issue #517 patterns → source review + native QX/Surge output; atomic/non-atomic distinction; malformed ICU still rejected |
| 2026-11-16 | Trailers contracts | Full/selected runtime, seven methods, phases, buffering independence, absence/empty/arrays, bytes, getters, aliases and native isolation |
| 2026-11-11 | Runtime selection | Full kernel versus selected adapter outputs/calls/errors; lexical shadowing and lazy error timing |
| 2026-11-02 | API contracts | Header operations, HTTP errors/concurrency, dynamic storage, completion retry, notifications, bytes, real timers and synthetic backup integration |
| 2026-11-02 | Providers | Independent zlib/NIST/Node crypto/WHATWG/encoding vectors; invalid framing/authentication/labels and cross-realm slices |
| 2026-10-25 | Rewrite/IR oracle | Hit/no-op, URL/method/header/body/status, captures, action order, phase ownership, one done, null/false/empty/missing, Unicode/prototype keys, dependency rollback |
| 2026-10-25 | Golden | Fixed offline fixtures after semantic review; no changing golden just to hide errors |
| 2026-10-25 | Native jq | Official pinned compile + output/type/error checks; target-only equality ≠ source proof |
| 2026-10-25 | Final target audit | Actual serialized matchers, sections, options, script syntax, unique identities, paths, raw checksums, reference closure, README and reversible layout |
| 2026-11-16 | Certification | Finite fixtures/native ICU/zero Issues/compatible API report ≠ complete source semantics, real-device execution or all client versions |

## 8. Dated Revisions

| Date | Rule / mapping added or revised | Demonstration / contract |
| --- | --- | --- |
| 2026-11-17 | Argument transport end-to-end regression | JingDong jd_price.js fragment decodes to {value:{Cookies:""}}; validate original URL and typed value before changing only its QX golden digest/size |
| 2026-11-17 | Early-failure and migration regression fixes | Prepare logs before tests; offline retention preserves migrated AD identity; response-phase QX argument tests include native response context |
| 2026-11-17 | QX arguments, runtime policy 13 | Official URL fragment → environment.variables/sourcePath → Loon $argument; fixed strings and typed PluginObject defaults; original fragments retained |
| 2026-11-17 | Official callback contract clarification | Chunked HTTP/1.1 + HTTP/2; iOS 6.0.0 / Mac 6.12.0; dictionary/array/absence contract; headers-only gRPC example; request trailers remain unsupported |
| 2026-11-16 | Single English specification | Duplicate conversion/maintenance docs → this file; dated rule tables + examples; history in Git |
| 2026-11-16 | JSON/JQ dependency-failure regression | Missing file → withhold entire JSON/JQ pipeline; independent Header mutation survives |
| 2026-11-16 | Source regex validation, Issue #517 | `(?>indexopsmodules\|loadsplashconfig)` → unchanged ICU-native QX/Surge matcher; invalid ICU still fails |
| 2026-11-16 | HTTP callback trailers, policy 12 | Loon callback `response.h2_trailers` ← actual Surge callback `response.trailers`; no intercept body-buffer requirement |
| 2026-11-16 | Response-script trailers, policy 11 | `$response.h2_trailers` ↔ `$response.trailers`; `$done({h2_trailers:{}})` → `$done({trailers:{}})`; buffered response only |
| 2026-11-16 | Global API resolution | `globalThis.$done(value)` → facade call; locally shadowed globalThis remains local |
| 2026-11-15 | Source-level JSON/JQ grouping | Identical URL/condition/flags/phase JSON declarations → one ordered source pipeline → one native jq rule |
| 2026-11-14 | Inline JQ files | `jq_file("program.jq")` → fetched program inline; no Resource/JQ or CLI-file-option assumption |
| 2026-11-13 | Native QX published JS | Original bytes → exact archive; executable/legal content → published native copy without API runtime |
| 2026-11-13 | Bounded Issue history | Closed record → number/title/state only; open record additionally body |
| 2026-11-12 | Stable IDs/categories | One source → shared AD number; repeated failure → same category Issue |
| 2026-11-12 | Kelee/RuCu6 transport | Registered sources → native HTTPS + observed downloader identity; Kelee resumed by registry |
| 2026-11-12 | Moyu discovery | Website HTML → actual same-site catalog → typed native QX/Surge resources |
| 2026-11-11 | Lazy access, policy 10 | Unexecuted `if` branch with URL API → zero provider initialization |
| 2026-11-11 | Selected adapters, policy 9 | Executable lexical references → dependency closure; simple body completion → minimal bridge |
| 2026-11-10 | HTTP/notifications, policy 8 | bodyBytes ↔ binary body; open-url/clipboard/media → supported Surge fields |
| 2026-11-10 | Completion URL, policy 7 | QX `{url: otherOrigin}` → Surge full URL unchanged; path-only → same-origin reconstructed URL |
| 2026-11-10 | Update metadata | Explicit upstream date → Updated; missing date → 上游未标注; no conversion-clock replacement |
| 2026-11-05 | Target layout/defaults | type/client/author/app; preserve explicit settings, use actual target defaults |
| 2026-11-05 | QX source flags | `/pattern/ims` → native `(?ims)pattern` throughout supported fields |
| 2026-11-03 | Header-condition exception | Same exact URL + same reject + distinct Headers → authorized Surge-only URL merge |
| 2026-11-02 | Runtime API policy | Author operations → shared target-native facade; no author-code whitelist or fabricated APIs |
| 2026-11-01 | Native QX repairs | Echo JS → script echo; exact Emby Header capture fix; no generalized source rewriting |
| 2026-11-01 | Surge flags/body mode | Preserve ICU modes; source body without m → `(?-m)` |
| 2026-10-30 | TypeScript/archives/icons | One src CLI; exact opaque/script archives; fill absent icon metadata only |
| 2026-10-28 | Sequential deletion | Numeric/overlapping paths → ordered delpaths reduction; independent object paths → del |
| 2026-10-27 | Routing layers | Apple CN/update → TestFlight/proxy → fallback; QX proxy policy → ssid |
| 2026-10-26 | Literal host / flags | Target authority dots → escaped; source i/m/s retained with confirmed client modes |
| 2026-10-25 | Semantic contract | Typed AST/IR, exact action/path/order/error preservation; explicitly scoped setpath/no-resolve exceptions |
| 2026-10-23 | Implementation maintenance | Changed behavior → nearby dated comment; dead logic removed |
