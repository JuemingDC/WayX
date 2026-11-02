# ScriptHub compatibility reuse

Upstream: https://github.com/Script-Hub-Org/Script-Hub
Revision: b943361f11be5795b3eb10f9cc4e5497642922fc
File: script-converter.js
License: GPL-3.0 (full text in LICENSE).

Modified: 2026-11-02 (chance). WayX reuses the upstream runtime compatibility
approach and Header lowercase Proxy implementation in headers.ts. The copied
get/set normalization is extended with delete/has/define/descriptor and Symbol
handling. HTTP Promise/callback bridging in the WayX runtime follows the upstream
qxMock approach with seven-method dispatch, proper rejection, status/byte mapping,
source defaults and declared parameter omission. Storage deletion uses explicit
native deletion rather than trying an empty value. Timer no-ops, global string
replacement of $done and exception-to-pass-through suppression are not retained.
The GPL notice applies to the adapter code, not to the independently authored
upstream plugin/script bodies archived by the synchronization pipeline.
