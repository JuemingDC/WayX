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
- Loon `[Argument]` parser, BoxJs descriptor generator and managed subscription merge.
- Rewrite v2 tokenizer/parser/AST for `&& / || / () / as / pipeline`, typed literals, arrays and documented `i/m/s` regex flags.
- Official Loon Rewrite v2 Action registry: 31 current actions, with arity and documented bulk-array validation.
- Fail-closed Rewrite v2 Safe Tier analyzer is now used by the real sync converter; the legacy regex-only v2 parser was removed.
- Conservative QX primitive capability map derived from the official Quantumult X sample; unproved mappings remain Review Tier.
- Tieba QX script now uses a BoxJs `$prefs` bridge to rebuild the Loon `$argument` object; the original script body is preserved.
- DianPing QX script now uses a BoxJs `$prefs` guard to reproduce Loon `enable={davsdmpk_enable}` behavior; disabled mode returns without modifying the response.
- BoxJs subscription now contains functional managed controls for Tieba and DianPing.
- Dedicated pull-request CI checks every converter `.mjs`, `sync-convert.mjs`, and the checkpoint test without contacting upstream sources.
- Existing upstream workflow still calls `node converter/tests/checkpoint.mjs` before conversion.

Verification completed in this session:

- Rewrite v2 parser: 32 assertions passed locally.
- Rewrite v2 action registry tests passed locally.
- BoxJs merge / QX `$prefs` bridge component tests passed locally.
- Combined converter checkpoint passed before the BoxJs extension; the new PR CI is the authoritative full-branch check after the latest commits.
- Complex Rewrite v2 conditions, captures, flags and pipelines are parsed but are **not** automatically promoted to Safe Tier.

## Next work

1. Wait for / inspect the new PR converter CI, then fix any branch-level syntax or checkpoint regression before merge.
2. Implement remote-script inspection/fork registry for scripts that explicitly reject or diverge on Quantumult X.
3. Add `jq_file / mock_file` dependency resolver.
4. Promote MyBlockAds to an automated golden fixture and compare generated output against repository targets.
5. After the checkpoint is merged, rerun upstream monitoring from the new `main` so deprecated lowercase `adblock/` output is no longer regenerated.
