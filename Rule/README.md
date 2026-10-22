# WayX Rule Sets

Python aggregates the registered upstreams into native Quantumult X and Surge lists. Source authors, URLs and licenses are recorded in `.github/sources/rules.json`; source checksums and generated output counts are recorded in `.github/sources/rules-state.json`.

## Categories

- `adblock`: 217heidai + limbopro + HaGeZi Light + AWAvenue Only Ads + anti-AD, merged with same-policy domain coverage deduplication.
- `adblock_extra`: optional incremental Sukka base domains. Keep this disabled unless extra filtering is wanted.
- Named applications: Google, Facebook/Meta, Netflix, Disney, YouTube, Telegram, Steam, X, Spotify, GitHub, Apple and Microsoft.
- Steam uses the maintained V2Fly `steam@cn` / `steam@!cn` attributes and MetaCubeX domestic supplements. Quantumult X combines direct/proxy rows in `steam.list`; Surge uses `steam_direct.list` and `steam_proxy.list`. Domestic entries are not inferred from domain spelling.
- Apple merges Tartarus2014’s dedicated TestFlight list into the existing proxy exceptions (`beta.apple.com` and `testflight.apple.com`). Install `apple_proxy.list` with a proxy policy before `apple_direct.list`; Quantumult X preserves the per-rule proxy actions in `apple.list`.
- `ai`: overseas AI services only, using the `ai` policy, including OpenAI, Claude, Gemini, Copilot and Apple Intelligence. Inputs include V2Fly, MetaCubeX, Nexitally, DustinWin and Sukka. Domestic AI tags are excluded from every AI input.
- `media`: other overseas applications, including non-video services.
- `media_cn`: domestic applications.
- `proxy` and `cn`: broader fallback lists. A profile still needs a final/default policy for unmatched requests.
- `filterfix`: an independent upstream correction list. It never merges into cn, Apple or other collections. Quantumult X uses `filterfix.list`; Surge uses the single `filterfix.dconf` detached `[Rule]` section, retaining both DIRECT and PROXY entries without splitting.

Only direct blackmatrix7 inputs are excluded. Other maintainers' upstream choices are accepted. MetaCubeX generated categories and its own supplements are used alongside the official V2Fly release. SagerNet's official geosite builder consumes the same V2Fly release, so that identical input is downloaded only once and verified against its official SHA-256 checksum.

Metadata categories are `Adblock` for advertising collections, `app` for named applications/AI/media, and `general` for cn/proxy fallbacks.

Telegram also merges Loyalsoldier telegramcidr IPv4/IPv6 rules. Registry `rule_exclusions` removes the requested 91cg wildcard family from proxy only, across both targets; other match types and categories remain independent.

Supplemental application inputs include Sukka stream lists, ACL4SSR ProxyMedia and DustinWin media. General inputs include Sukka domestic/global, Loyalsoldier direct/proxy, gaoyifan Chinese IPv4/IPv6 ranges and DH-Teams Geo_AS_IP_CN_All_Surge IPv4/IPv6 ranges. DH-Teams merges into cn with DIRECT. These merge into the existing category files. Sources explicitly registered with `standalone: true` keep independent output files.

## Policies and order

Quantumult X lists carry per-rule built-in policies: explicit DIRECT stays `direct`, every REJECT-family action becomes `reject`, and all other or unspecified actions become `proxy`, including application names and Media placeholders. Mixed lists retain these per-rule exceptions. Do not apply `force-policy` to mixed direct/reject/proxy files. Rules sharing the same normalized action are deduplicated together.

Surge lists omit policy fields. Reference each list with RULE-SET and the desired policy. Steam, Apple and Microsoft have separate `_direct` and `_proxy` lists. Other mixed-policy categories are split the same way. Proxy rules use native AND/NOT exclusions where needed so a more-specific direct exception remains effective even when the proxy list is installed before a broad brand-direct list. Rejection variants retain separate Surge lists if an input supplies them.

Independent mixed-policy sources use `.dconf` rather than RULE-SET or a module. Download `Surge/filterfix.dconf` alongside the main profile and include it before broader rules:

```ini
[Rule]
#!include filterfix.dconf
```

The referenced file contains its own `[Rule]` heading and per-line policies. `PROXY` must name an existing proxy or policy group in the main profile. Do not install this file as a module or reference it with RULE-SET. See the [official detached profile section format](https://manual.nssurge.com/profile/format.html).

Apply personal exceptions and local-network handling first, then advertising rules, named applications and their direct exceptions, media/media_cn, and broad proxy/cn fallbacks. The registry declares AI as the highest-priority routing category. Known AI rules shared with any brand belong to AI and are removed from overlapping routing collections; advertising/rejection rules remain independent. Explicit supplemental ownership is indexed before classification so source ordering cannot change the result. AI precedes other named applications; YouTube precedes Google; GitHub precedes Microsoft; specific brand proxy exceptions precede broad brand-direct rules. Put direct exceptions before broader conflicting proxy rules. Match domain rules before resolving general IP/GEOIP fallbacks. Shared CDN names are not assigned to an application solely from corporate ownership. Keep direct and proxy fallbacks ordered according to your intended policy; overlaps are not a proof of a universally correct route.

## Automation and limitations

The existing Action downloads registered inputs, groups and deduplicates collections and generates both targets once. It checks actual generated formats once at the end, without regression suites, canonical reconversion or build replay. Reports reuse that evidence. Timestamps change only when that output changes. Source download/checksum failures prevent publication; incomplete builds preserve the previous outputs. Stale feeds with an explicitly configured freshness contract and unexpected large reductions fail validation. Curated lists do not expire merely because their rule content has not changed.

Domain regexes in the bounded supported subset (anchored literals, alternatives, finite classes/repetitions and dot wildcards) are converted exactly to native domain filters. Other domain regular expressions are intentionally ignored. Desktop process-name, process-path and user/UID predicates are intentionally excluded from both mobile targets, including entire compound rules containing such a condition; their declarations are counted in the Action report without creating conversion Issues. Other predicates/options without an equivalent native target are also omitted; an unsupported AND condition is omitted as a whole. Matching declarations already covered by a provable literal domain suffix do not need an additional regex rule. Malformed declarations, schema/download failures and ambiguous ownership are reported through managed Issues; full source declarations are saved in `rules-result.json` in the Action artifact. Supported declarations can continue to publish while these exceptions await review. Unsupported-type omissions are not review Issues. All full generation, merging, deduplication and validation run in the existing Action.

This collection preserves upstream classifications; it is not an independent guarantee that every upstream entry is accurate or that a large union has fewer false positives. This routing collection does not replace response-rewrite plugins or browser cosmetic filtering. Existing hand-maintained files are not overwritten or pruned by the aggregator.

For large lists, open the GitHub Raw URL rather than relying on a truncated file preview. Generated counts and source checksums are recorded in the state file and run artifact.
