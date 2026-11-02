// Modified: 2026-11-02 (chance). User-authorized QX option omission follows
// the author's pinned examples; absent documentation is not a parameter error.
export const qxHttpOptions = {
  repository: "crossutility/Quantumult-X",
  commit: "af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d",
  files: [
    "sample-task.js",
    "sample-fetch-opts-policy.js",
    "sample-fetch-opts-filter.js",
    "sample-bytes-rewrite.js",
  ],
  request: ["url", "method", "headers", "body", "opts"],
  opts: ["redirection", "skip-cert-verify", "auto-cookie", "policy"],
  response: ["statusCode", "headers", "body", "bodyBytes"],
  deprecated: ["filter"],
  policy:
    "Omit request parameters without a documented QX equivalent without throwing; record omissions outside author script files. This is an explicit semantic exception, not equivalent timeout/cancellation.",
} as const;
