# Pako gzip provider

Upstream: https://github.com/nodeca/pako
Version: 2.1.0
Commit: 3c06216518c259b569a5168dee867e6dabbe5160
Bundle: dist/pako.min.js (unmodified, including upstream notices)
License: MIT (LICENSE) AND Zlib (ZLIB-LICENSE; copied from lib/zlib/inflate.js)

Modified: 2026-11-02 (chance). The browser bundle is embedded as a string in
src/vendor/pako/runtime.ts and initialized lazily in an isolated CommonJS scope.
WayX supplies only the Loon API boundary: Uint8Array input/output, exact byte
views, native-source preference and COMPRESSION_FAILED/DECOMPRESSION_FAILED
errors. Compression algorithms and CRC/trailer validation remain upstream Pako.
Different valid gzip encodings/header metadata and error text are not claimed
byte-for-byte identical to Loon's native implementation.

Upstream bundle SHA-256: ede2693a4a6a5126b9d35669062b358ecab6ae7b9b86a1cf302feb45a8514907

Both upstream license notices are included in generated provider code.
