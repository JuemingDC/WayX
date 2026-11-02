// Modified: 2026-11-02 (chance). Argument schemas are declaration metadata;
// input decoding is an API runtime responsibility, without source-flow proofs.
export type ArgumentSchema =
  | {
      kind: "object";
      fields: Record<string, "boolean" | "number" | "string">;
      enumValues?: Record<string, string[]>;
    }
  | { kind: "string" };
