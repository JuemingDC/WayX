# Offline Script API providers

Modified: 2026-11-02 (chance). These providers supply generic API capabilities,
independently of author source patterns. Runtime downloads, Node imports and
business-program evaluation are not used. Author source remains unchanged.

| Provider                | Pin                                                    | Purpose                                                   |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| paulmillr/noble-ciphers | 2.4.0, commit d9e8a6a599e7ed729d9be03854c46a3c73bd9a79 | Synchronous AES ECB/CBC/CTR/GCM                           |
| jsdom/whatwg-url        | 14.2.0                                                 | URL/URLSearchParams with linked state and IDNA            |
| ExodusOSS/bytes         | 1.16.0                                                 | Legacy Encoding Standard decoders and tables              |
| esbuild                 | 0.25.1                                                 | Reproducible development bundler; not included at runtime |

whatwg-url 14.2.0 is the pinned Node-18-compatible implementation baseline.
Its UTF-8 dependencies are injected into an isolated factory without Node modules.
New major releases require separate engine/dependency validation. Its
webidl-conversions 7.0.0, tr46 5.1.1 and punycode 2.3.1 dependencies are pinned
in package-lock.json and manifest.json. Each provider embeds all applicable
MIT/BSD license texts from licenses/. Generated author adapters contain these
notices as part of the provider factory.

Rebuild from the repository root:

```sh
npm ci --prefix vendor/script-api-providers --ignore-scripts
node vendor/script-api-providers/build.ts
```

The build writes src/vendor/providers/\*.ts and manifest.json, never production
Script/Resource snapshots. package-lock.json pins package integrity; manifest.json
records provider SHA-256, byte length and bundled inputs. API tests verify hashes.

Factories initialize lazily inside each script execution. AES/Pako are included
for the declared Loon source profile; URL/encoding are included for both Loon and
QX source profiles. This selection does not inspect author API calls. The build
uses neutral exports for Exodus rather than its browser profile, which assumes
native legacy decoders exist. A scoped Object.hasOwn fallback supports engines
with the required ES2020 primitives without changing host globals. URL receives
only scoped UTF-8 codecs; the upstream URL wrapper installs classes into its own
private globals object. No host globals are overwritten.

The adapter implements only the Loon AES argument/result boundary: actual
Uint8Array inputs and exact slices, explicit mode/key/IV/padding/AAD/tag validation,
separate GCM tag and synchronous errors. Algorithms and authentication remain
upstream. TextDecoder preserves standard argument effects and BufferSource views;
it delegates supported native labels first and initializes Exodus only when needed.

About 500 KB of UTF-8 provider text (plus Pako and the author program) is embedded
per common script. The full set is available by source profile rather than
source-specific reachability proofs. Provider parsing and memory are a real cost;
initialization remains lazy. Package/algorithm/specification updates require an
explicit pin change, independent API vectors and one complete Actions publication.

References: https://github.com/paulmillr/noble-ciphers/tree/2.4.0,
https://github.com/jsdom/whatwg-url/tree/v14.2.0,
https://github.com/ExodusOSS/bytes/tree/v1.16.0.
