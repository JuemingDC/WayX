# WayX Converter Status

## 2026-09-29 checkpoint

Implemented and committed:

- Canonical output: `Adblock/Quantumult X/`, `Adblock/Surge/`.
- QX Loon Rule mapping, including `URL-REGEX + REJECT* -> reject-200`.
- QX logical `AND / OR / NOT` preservation as comments.
- QX IP rule removal of Loon-only trailing options such as `no-resolve`.
- Surge Module external policies such as `PROXY` are not assumed; they are commented for explicit policy binding.
- JQ whitespace-only minifier; no algorithm/path/type rewrite.
- QX script action registry with verified RuCu6 `12306.js -> script-analyze-echo-response` and `header.js -> script-response-header`.
- Loon `[Argument]` parser and BoxJs descriptor generator.
- Rewrite v2 tokenizer/parser/AST for `&& / || / () / as / pipeline`, typed literals, arrays and documented `i/m/s` regex flags.
- Official Loon Rewrite v2 Action registry: 31 current actions, with arity and documented bulk-array validation.
- Conservative QX primitive capability map derived from the official Quantumult X sample; unproved mappings remain Review Tier.
- GitHub Actions calls `node converter/tests/checkpoint.mjs` before upstream conversion.
- Existing sync converter uses the canonical Rule, Script and JQ cores.

Verification:

- Rewrite v2 parser/action-registry tests were added to the converter checkpoint.
- MyBlockAds golden-case JQ review remains the reference: 11 rules / 9 unique expressions; syntax and representative output equivalence were previously checked.
- Complex Rewrite v2 conditions, captures and pipelines are parsed but are **not** automatically promoted to Safe Tier merely because parsing succeeds.

## Next work

1. Add Rewrite v2 semantic validation and target mappers; keep any non-provable condition/pipeline fail-closed.
2. Implement BoxJs subscription merge + `$prefs` bridge for parameterized QX scripts.
3. Implement remote-script inspection/fork registry for scripts that explicitly reject QX.
4. Add `jq_file / mock_file` dependency resolver.
5. Promote MyBlockAds to an automated golden fixture and compare generated output against repository targets.
6. Merge this checkpoint before allowing the upstream monitor to regenerate targets, so deprecated lowercase `adblock/` output cannot recur.
