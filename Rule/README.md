# WayX Rule Sets

Python aggregates the registered upstreams into native Quantumult X and Surge lists. Source authors, URLs and licenses are recorded in `.github/sources/rules.json`; source checksums and generated output counts are recorded in `.github/sources/rules-state.json`.

## Categories

- `adblock`: 217heidai + limbopro + HaGeZi Light + AWAvenue Only Ads + anti-AD, merged with exact same-policy deduplication.
- `adblock_extra`: optional Sukka base domains. Keep this disabled unless extra filtering is wanted.
- Named applications: Google, Facebook/Meta, Netflix, Disney, YouTube, Telegram, Steam, X, Spotify, GitHub, Apple and Microsoft.
- Steam uses the maintained V2Fly `steam@cn` / `steam@!cn` attributes and MetaCubeX domestic feeds. Quantumult X combines direct/proxy rows in `steam.list`; Surge uses `steam_direct.list` and `steam_proxy.list`. Domestic entries are not inferred from domain spelling.
- Apple follows source-backed layers: QuixoticHeart apple-cn plus V2Fly/MetaCubeX apple-update use DIRECT first; QuixoticHeart apple-proxy and Tartarus TestFlight use PROXY second; remaining actionless Apple rules default to DIRECT. Explicit source-row actions remain present. Duplicate actionless matchers use the first configured layer. QX keeps one mixed apple.list and renders proxy actions as ssid. In Surge install apple_cn.list with DIRECT, then apple_proxy.list with your proxy group, then apple_direct.list with DIRECT, before general fallback lists. This protects software-update hosts from broad cdn-apple.com proxy matching. QuixoticHeart attribution and source URLs are retained.
- `ai`: overseas AI services only, using the `ai` policy, including OpenAI, Claude, Gemini, Copilot and Apple Intelligence. Inputs include V2Fly, MetaCubeX, Nexitally, DustinWin and Sukka. Domestic AI tags are excluded from every AI input.
- `media`: other overseas applications, including non-video services.
- `media_cn`: domestic applications.
- `proxy` and `cn`: broader fallback lists. A profile still needs a final/default policy for unmatched requests.
- `filterfix`: an independent upstream correction list. It never merges into cn, Apple or other collections. Quantumult X uses `filterfix.list`; Surge uses the single `filterfix.dconf` detached `[Rule]` section, retaining both DIRECT and PROXY entries without splitting.

Only direct blackmatrix7 inputs are excluded. Other maintainers' upstream choices are accepted. V2Fly and Mihomo/MetaCubeX are joint primary sources: both are acquired independently, merged with equal standing, and retain their authors, URLs and checksums. Neither acts as a fallback for the other. SagerNet's official geosite builder consumes the same V2Fly release, so that identical input is downloaded only once and verified against its official SHA-256 checksum.

Metadata categories are `Adblock` for advertising collections, `app` for named applications/AI/media, and `general` for cn/proxy fallbacks.

Telegram also merges Loyalsoldier telegramcidr IPv4/IPv6 rules. Registry `rule_exclusions` removes the requested 91cg wildcard family from proxy only, across both targets; other match types and categories remain independent.

Supplemental application inputs include Sukka stream lists, ACL4SSR ProxyMedia and DustinWin media. General inputs include Sukka domestic/global, Loyalsoldier direct/proxy, gaoyifan Chinese IPv4/IPv6 ranges and DH-Teams Geo_AS_IP_CN_All_Surge IPv4/IPv6 ranges. DH-Teams merges into cn with DIRECT. These merge into the existing category files. Sources explicitly registered with `standalone: true` keep independent output files.

## Service coverage

<!-- Modified: 2026-10-25 (chance). Explicitly select measured child-service declarations while preserving policy selectors and existing collection scope. -->

Selected independent service tags retain details that optimized aggregate tags can omit. Google adds Play, FCM, Trust Services and Scholar; Disney adds ESPN, Hulu and Star+. Microsoft selects Azure, Bing, PKI and OneDrive with matching `@cn`/`@!cn` selectors on the direct/proxy sides. Domestic media adds collaboration, documents and cloud storage; overseas media adds cloud storage and password managers. Existing policy precedence, named-app ownership, AI exclusions and standalone sources still apply. These additions retain specific declarations; they do not imply every added hostname was previously unmatched. Other named collections keep their existing selectors where candidate child tags add no declarations.

<!-- Modified: 2026-10-25 (chance). Use V2Fly and MetaCubeX as joint primary inputs, preserving both source evidence and explicit actions. -->

Mihomo/MetaCubeX covers every registered domestic/overseas application collection and supplies independent service JSON feeds for Apple Update (DIRECT), Intelligence (AI) and TV+ (default DIRECT when actionless), the Google and Disney child services above, domestic collaboration/documents/storage (DIRECT), and overseas storage/password managers (PROXY). Microsoft inputs use `microsoft@cn`, `azure@cn` and `bing@cn` as DIRECT, and PKI/OneDrive as PROXY. MetaCubeX currently publishes no complementary `@!cn` files: full Microsoft, Azure or Bing feeds must not substitute for the missing proxy complement. Actionless overseas media feeds use the existing `Media` placeholder so application policy resolution still applies. Both primary sources drive the existing QX/Surge outputs; exact duplicates retain combined source attribution.

## Policies and order

<!-- Modified: 2026-10-25 (chance). Document mixed Apple resource policy and ordering; do not confuse repository coverage with device connectivity. -->

Quantumult X lists carry per-rule policies: explicit DIRECT outside proxy-only collections stays `direct`, every REJECT-family action becomes `reject`, and all other or unspecified actions become `ssid`, including application names and Media placeholders. Mixed lists retain these per-rule exceptions. Do not apply `force-policy` to mixed direct/reject/proxy files. Rules sharing the same normalized action are deduplicated together.

Quantumult X always keeps one file per collection with native per-line actions, including mixed direct/proxy collections. Domestic applications in `media_cn` default to DIRECT only when neither a per-line action nor a registered DIRECT/PROXY feed action exists; an explicitly written DIRECT/PROXY/REJECT remains authoritative outside proxy-only collections. Classification does not invent a direct exception based on server location.

Surge lists omit policy fields. `surge_output` controls file layout independently of Quantumult X: Apple uses `apple_cn.list`, `apple_proxy.list` and `apple_direct.list` in that order; Microsoft and Steam use `_direct.list` and `_proxy.list`; Google and the other proxy-only application collections retain one `.list` referenced with a proxy policy. Spotify combines all source direct/proxy matchers in `spotify.list`, without policies. A combined Surge list receives one policy from the main profile; it does not retain per-line direct/proxy routing. Spotify is not assigned invented DIRECT rules merely because a CDN might be locally reachable. Rejection actions remain in separate files when needed. Other collections automatically split if they contain distinct actions. Source declarations are retained; the generator never adds AND/NOT exclusions or drops a proxy rule because a direct declaration overlaps.

Independent mixed-policy sources use `.dconf` rather than RULE-SET or a module. Download `Surge/filterfix.dconf` alongside the main profile and include it before broader rules:

```ini
[Rule]
#!include filterfix.dconf
```

The referenced file contains its own `[Rule]` heading and per-line policies. `PROXY` must name an existing proxy or policy group in the main profile. Do not install this file as a module or reference it with RULE-SET. See the [official detached profile section format](https://manual.nssurge.com/profile/format.html).

Application and media inputs are assigned by application evidence before aggregation: named applications use their own collections, other domestic applications use `media_cn`, other overseas applications use `media`, and general direct/proxy declarations stay in `cn`/`proxy`, even when a matcher is also associated with an application. Ownership comes from upstream application/service tags and explicitly classified supplements. The configured domestic/overseas classification tags only establish ownership; they do not add declarations or change actions. A `.cn` suffix, IP location or company name alone is not application evidence. More-specific upstream associations take precedence; explicit priorities handle AI, YouTube and GitHub subservices. Ambiguous shared rules keep their source category and are reported. Advertising and standalone sources retain their boundaries.

After classification, `routing_policies` keeps Google, YouTube, Facebook/Meta, X, Telegram, GitHub, overseas AI, Netflix and Disney proxy-only. Upstream DIRECT declarations (explicit per-line actions or a registered DIRECT source default) for these applications move to cn with their action intact, without changing their policy. Other actionless application placeholders use PROXY; source DIRECT/PROXY and rejection actions are preserved. Matchers and attribution are retained and exact duplicates are merged within the final collection and action. These collections cannot declare direct selectors, a DIRECT default or a split Surge layout. REJECT and standalone filterfix are unaffected. Other collections preserve explicitly written source actions. For inputs without a DIRECT/PROXY/rejection action, `default_policies` can resolve a placeholder after classification; `media_cn` uses DIRECT, while the other categories retain their registered source defaults. Aggregation only normalizes supported target syntax and removes exact duplicates in the resulting output; overlapping suffixes, exact domains and different actions/options outside the explicit proxy-only override remain. Geosite attributes do not implicitly change policy. Explicit selectors and user exclusions still apply. There is no coverage compression, opposite-action pruning, synthesized AND/NOT or incremental adblock filtering. Domestic applications excluded from the overseas AI scope can move to `media_cn`. Conflicting rules remain present; choose their effective precedence in the main profile. Explicit proxy exceptions need to precede broad Apple routing rules. Match domain rules before general IP/GEOIP fallbacks.

<!-- Modified: 2026-10-23 (chance). Preserve feed routing actions and general collection boundaries; remove cross-feed application default overrides. -->
Per-line source DIRECT/PROXY actions take precedence over the registered source action. A registered DIRECT/PROXY action takes precedence over inferred application/category defaults, including when a media input is assigned to a named application. General direct/proxy inputs remain in cn/proxy and are not absorbed into application collections. Application identity selects the collection, not the routing action. Sources with conflicting actions retain those declarations in their respective collections; profile ordering determines which one matches. REJECT and independent filterfix keep their existing boundaries. No application default rewrites a source DIRECT into PROXY or a source PROXY into DIRECT.

<!-- Modified: 2026-10-23 (chance). Keep media_cn direct-only by moving proxy declarations to media. -->
After policy resolution, PROXY declarations assigned to media_cn move to media with their source action and attribution intact. DIRECT declarations remain in media_cn. Both targets retain the existing media_cn.list name; media_cn_direct.list and media_cn_proxy.list are not needed. Standalone and rejection declarations are unaffected.

## Automation and limitations

The existing Action downloads registered inputs, groups and deduplicates collections and generates both targets once. It checks actual generated formats once at the end, without regression suites, canonical reconversion or build replay. Reports reuse that evidence. Timestamps change only when that output changes. Source download/checksum failures prevent publication; incomplete builds preserve the previous outputs. Stale feeds with an explicitly configured freshness contract and unexpected large reductions fail validation. Curated lists do not expire merely because their rule content has not changed.

Domain regexes in the bounded supported subset (anchored literals, alternatives, finite classes/repetitions and dot wildcards) are converted exactly to native domain filters. Other domain regular expressions are intentionally ignored. Desktop process-name, process-path and user/UID predicates are intentionally excluded from both mobile targets, including entire compound rules containing such a condition; their declarations are counted in the Action report without creating conversion Issues. Other predicates/options without an equivalent native target are also omitted; an unsupported AND condition is omitted as a whole. Convertible regex declarations remain even when another literal suffix overlaps. Malformed declarations, schema/download failures are reported through managed Issues; full source declarations are saved in `rules-result.json` in the Action artifact. Supported declarations can continue to publish while these exceptions await review. Unsupported-type omissions are not review Issues. All full generation, merging, deduplication and validation run in the existing Action.

Classification relies on upstream application evidence; it is not an independent guarantee that every upstream entry is accurate or that a large union has fewer false positives. This routing collection does not replace response-rewrite plugins or browser cosmetic filtering. Existing hand-maintained files are not overwritten or pruned by the aggregator.

For large lists, open the GitHub Raw URL rather than relying on a truncated file preview. Generated counts and source checksums are recorded in the state file and run artifact.

<!-- Modified: 2026-10-27 (chance). Default actionless Apple declarations to DIRECT and render QX proxy actions as ssid. -->

<!-- Modified: 2026-10-27 (chance). Add ordered Apple CN/proxy/fallback layers; TestFlight uses proxy (QX ssid). -->
