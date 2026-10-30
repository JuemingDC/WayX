// Modified: 2026-10-30 (chance). Shared contracts separate acquisition, syntax,
// target planning and publication; downloaded bytes never imply convertible code.
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export type Target = "QuantumultX" | "Surge";
export type Phase = "request" | "response";
export interface SourceEntry {
  id: string;
  source: string;
  file: string;
  qx: string;
  surge: string;
  category: string;
}
export type ResourceFormat =
  | "loon-text"
  | "encrypted-loon"
  | "opaque"
  | "html"
  | "text";
export interface AcquisitionRecord {
  url: string;
  sha256: string;
  size: number;
  format: ResourceFormat;
  storage: string;
}
export type SourceDisposition =
  | { kind: "convert"; text: string }
  | { kind: "retain"; reason: string; record: AcquisitionRecord };
export interface Diagnostic {
  code: string;
  source: string;
  reason: string;
  declaration?: string;
  line?: number;
}
export interface TargetArtifact {
  path: string;
  content: string | Uint8Array;
}
export interface PublicationPlan {
  artifacts: TargetArtifact[];
  retained: string[];
  diagnostics: Diagnostic[];
}
export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  accept?: string;
  redirect?: "follow" | "manual";
  allowStatuses?: number[];
}

// Modified: 2026-10-30 (chance). Public semantic boundaries describe source
// data explicitly; provenance is opaque and cannot supply target policy.
export interface SyntaxNode {
  type: string;
  [field: string]: unknown;
}
export interface SourceAction {
  type?: string;
  name: string;
  args: SyntaxNode[];
  [field: string]: unknown;
}
export interface RewriteAst {
  type: "rewrite";
  syntax: "loon-rewrite-v2";
  phase: Phase;
  condition: SyntaxNode;
  actions: SourceAction[];
  raw: string;
}
export interface RewriteOperation {
  kind: string;
  phase: Phase;
  operation?: string;
  actionName: string;
  sourceAction: SourceAction;
}
export interface RewriteSemanticIr {
  type: "rewrite-semantic-ir";
  sourceSyntax: "v2" | "legacy";
  source: string;
  phase: Phase | null;
  condition: SyntaxNode | null;
  operations: RewriteOperation[];
  pipeline: boolean;
  sourcePayload: unknown;
}
export interface ScriptSemanticIr {
  readonly type: "script-semantic-ir";
  readonly sourceSyntax: "v2" | "legacy";
  readonly source: string;
  readonly phase: Phase | "cron";
  readonly condition: SyntaxNode | null;
  readonly trigger: SyntaxNode | null;
  readonly pattern: string | null;
  readonly script: { readonly path: string; readonly argument: unknown };
  readonly argument: unknown;
  readonly options: readonly { name: string; value: unknown }[];
  readonly sourcePayload: unknown;
}
export interface ConversionOutput {
  qx: string;
  surge: string;
  generatedScripts: Map<string, string>;
}
