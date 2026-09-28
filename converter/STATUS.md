# WayX Converter Status

## 2026-09-28 checkpoint

Implemented and committed:

- Canonical output: `Adblock/Quantumult X/`, `Adblock/Surge/`.
- QX Loon Rule mapping, including `URL-REGEX + REJECT* -> reject-200`.
- QX logical `AND / OR / NOT` preservation as comments.
- QX IP rule removal of Loon-only trailing options such as `no-resolve`.
- Surge Module external policies such as `PROXY` are not assumed; they are commented for explicit policy binding.
- JQ whitespace-only minifier; no algorithm/path/type rewrite.
- QX script action registry with verified RuCu6 `12306.js -> script-analyze-echo-response` and `header.js -> script-response-header`.
- Loon `[Argument]` parser and BoxJs descriptor generator.
- GitHub Actions calls `node converter/tests/checkpoint.mjs` before upstream conversion.
- Existing sync converter now uses the canonical Rule, Script and JQ cores.

Verified locally before repository write: checkpoint tests 14/14 passed.
MyBlockAds golden-case JQ review: 11 rules / 9 unique expressions; syntax and representative output equivalence were checked before this checkpoint.

## Next session

1. Complete Rewrite v2 tokenizer/parser/AST for `&& / || / as / pipeline`.
2. Register every official Loon Rewrite v2 action.
3. Implement BoxJs subscription merge + `$prefs` bridge for parameterized QX scripts.
4. Implement remote-script inspection/fork registry for scripts that explicitly reject QX.
5. Add `jq_file / mock_file` dependency resolver.
6. Promote MyBlockAds to an automated golden fixture and compare generated output against repository targets.
