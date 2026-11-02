// Modified: 2026-11-02 (chance). Share generated-helper ownership between
// generation and reference-aware retirement; arbitrary author files are not owned.
const GENERATED_HELPER_FILENAME_RE =
  /^(?:features_(?:qx|surge)|phase_(?:qx|surge)_(?:request|response)|mock|header|complex_qx|mock_file|json_add_qx|redirect|reject|complex_surge|request_mock|json_mutation_surge|legacy_header|legacy_json_add_(?:qx|surge)|legacy_mock|legacy_request_mock)_[0-9a-f]{10}\.js$/;
export function isWayxGeneratedHelperFilename(name: unknown) {
  return GENERATED_HELPER_FILENAME_RE.test(String(name ?? ""));
}
