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
  allowEmpty?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  accept?: string;
  redirect?: "follow" | "manual";
  allowStatuses?: number[];
}

// Modified: 2026-10-30 (chance). Public semantic boundaries describe source
// data explicitly; provenance is opaque and cannot supply target policy.
export interface VariableNode {
  type: "variable";
  name: string;
  raw: string;
  value?: never;
}
export interface StringNode {
  type: "string" | "raw-string";
  value: string;
  raw: string;
}
export type ScalarNode =
  | VariableNode
  | StringNode
  | { type: "number"; value: number; raw: string }
  | { type: "boolean"; value: boolean; raw: string }
  | { type: "null"; value: null; raw: string }
  | { type: "regex"; pattern: string; flags: string; raw: string };
export type RewriteValue =
  | ScalarNode
  | { type: "array"; items: RewriteValue[] };
export type ComparisonNode = {
  type: "comparison";
  operator: "==" | "~=";
  left: RewriteValue;
  right: RewriteValue;
  capture: string | null;
};
export type RewriteCondition =
  | ComparisonNode
  | { type: "group"; expression: RewriteCondition }
  | {
      type: "logical";
      operator: "&&" | "||";
      left: RewriteCondition;
      right: RewriteCondition;
    };
export interface SourceAction {
  type: "action";
  name: string;
  args: RewriteValue[];
}
export interface RewriteAst {
  type: "rewrite";
  syntax: "loon-rewrite-v2";
  phase: Phase;
  condition: RewriteCondition;
  actions: SourceAction[];
  raw: string;
  sourceActionIndices?: number[];
  sourceActionCount?: number;
}
export interface UrlRegexCondition {
  type: "url-regex";
  pattern: string;
}
export type RewriteOperationKind =
  | "reject"
  | "redirect"
  | "url-rewrite"
  | "header"
  | "body-regex"
  | "json"
  | "mock"
  | "action"
  | "unknown";
export interface LegacyMock {
  type: string;
  status: number;
  data: string | null;
  dataPath: string | null;
  base64: boolean;
}
export type LegacyRewriteOperation = {
  raw: string;
  phase?: Phase;
  operation?: string;
} & (
  | { kind: "reject"; action: string; variant: string; status: number | null }
  | {
      kind: "redirect";
      status: number;
      target: string;
      redirectMode: "absolute-location";
    }
  | { kind: "url-rewrite"; target: string; rewriteMode: "transparent-replace" }
  | {
      kind: "header" | "body-regex" | "json";
      phase: Phase;
      operation: string;
      rest: string;
    }
  | {
      kind: "mock";
      phase: Phase;
      operation: "inline";
      optionNames: string[];
      mock: LegacyMock;
    }
  | { kind: "unknown"; reason?: string }
);
export type V2RewriteOperation = {
  actionName: string;
  sourceAction: SourceAction;
  phase?: Phase;
  operation?: string;
} & (
  | {
      kind: "reject";
      variant: string;
      status: string | number | boolean | null;
    }
  | {
      kind: "redirect";
      status: string | number | boolean | null;
      targetNode: RewriteValue | null;
      redirectMode: "matched-range-template";
    }
  | {
      kind: "header" | "body-regex" | "json" | "mock";
      phase: Phase;
      operation: string;
    }
  | { kind: "action"; phase: Phase }
);
export type RewriteOperation = LegacyRewriteOperation | V2RewriteOperation;
interface RewriteIrBase {
  type: "rewrite-semantic-ir";
  source: string;
  phase: Phase | null;
  pipeline: boolean;
}
export type LegacyRewriteIr = RewriteIrBase & {
  sourceSyntax: "legacy";
  condition: UrlRegexCondition;
  operations: LegacyRewriteOperation[];
  sourcePayload: { pattern: string; action: string };
};
export type V2RewriteIr = RewriteIrBase & {
  sourceSyntax: "v2";
  condition: RewriteCondition | null;
  operations: V2RewriteOperation[];
  sourcePayload: { ast: RewriteAst };
};
export type RewriteSemanticIr = LegacyRewriteIr | V2RewriteIr;
export type ScriptValue =
  | Exclude<ScalarNode, { type: "regex" }>
  | {
      type: "plugin-object";
      items: VariableNode[];
      raw: string;
      value?: never;
    };
export type ScriptArgument =
  | StringNode
  | Extract<ScriptValue, { type: "plugin-object" }>;
export type ScriptPhase = Phase | "cron" | "network-changed" | "generic";
export type ScriptTrigger =
  | { type: "cron"; expression: ScriptValue; raw: string }
  | { type: "event"; name: "network-changed"; raw: string }
  | { type: "generic"; raw: string };
export interface ScriptOption<T> {
  type: "option";
  name: string;
  value: T;
  raw: string;
}
export interface ScriptV2Ast {
  type: "script";
  syntax: "loon-script-v2";
  phase: ScriptPhase;
  condition: RewriteCondition | null;
  trigger: ScriptTrigger | null;
  script: {
    path: string;
    pathNode: StringNode;
    argument: ScriptArgument | null;
  };
  options: ScriptOption<ScriptValue>[];
  raw: string;
}
export interface LegacyScriptAst {
  type: "script";
  syntax: "loon-script-legacy";
  phase: Phase;
  httpType: string;
  pattern: string;
  script: { path: string | null };
  options: ScriptOption<string>[];
  optionMap: Map<string, string>;
  tag: string | null;
  requiresBody: boolean;
  binaryBodyMode: boolean;
  timeout: string | null;
  maxSize: string | null;
  argument: string | null;
  enable: string | null;
  debug: string | null;
  raw: string;
}
interface ScriptIrBase<A, O, P> {
  readonly type: "script-semantic-ir";
  readonly source: string;
  readonly script: { readonly path: string; readonly argument: A | null };
  readonly argument: A | null;
  readonly options: readonly Readonly<ScriptOption<O>>[];
  readonly sourcePayload: P;
}
export type LegacyScriptIr = ScriptIrBase<string, string, LegacyScriptAst> & {
  readonly sourceSyntax: "legacy";
  readonly phase: Phase;
  readonly condition: UrlRegexCondition;
  readonly trigger: null;
  readonly pattern: string;
};
export type V2ScriptIr = ScriptIrBase<
  ScriptArgument,
  ScriptValue,
  ScriptV2Ast
> & {
  readonly sourceSyntax: "v2";
  readonly phase: ScriptPhase;
  readonly condition: RewriteCondition | null;
  readonly trigger: ScriptTrigger | null;
  readonly pattern: null;
};
export type ScriptSemanticIr = LegacyScriptIr | V2ScriptIr;
export interface ConversionOutput {
  qx: string;
  surge: string;
  generatedScripts: Map<string, string | Buffer>;
}

export type ConversionTarget = "qx" | "surge";
export interface ParsedPlugin {
  header: string[];
  sections: Map<string, string[]>;
}
export interface SourceSectionItem {
  comments: string[];
  line: string | null;
  sourceIndex: number;
  pipelineMember?: boolean;
  atomicJsonPipeline?: boolean;
}
export interface PreparedRewriteDeclaration {
  ast?: RewriteAst;
  ir?: LegacyRewriteIr;
  error?: unknown;
}
export interface SourceScriptRecord {
  qx: string;
  surge: string;
  source: string;
  sourceError: string | null;
}
export interface RewriteDependencyRecord {
  sourceFile?: string;
  error?: string;
  content?: string;
  bodyBase64?: string;
  bodyText?: string;
  bodyBytes?: Uint8Array;
  legacyAlias?: boolean;
  byAction?: Record<number, RewriteDependencyRecord>;
}
export interface ConversionContext {
  parsed: ParsedPlugin;
  declarations: Map<string, PreparedRewriteDeclaration>;
  scriptMap: Map<string, SourceScriptRecord>;
  mockFiles: Map<string, RewriteDependencyRecord>;
  jqFiles: Map<string, RewriteDependencyRecord>;
  sourceUrl: string;
  sourceDigest: string;
}
export type ConversionStage =
  | "materialize-context"
  | "convert"
  | "validate-qx"
  | "validate-surge";
export type ConversionStageListener = (stage: ConversionStage) => void;
export interface LoonArgumentDeclaration {
  id: string;
  kind: string;
  values: string[];
  hasDefault: boolean;
  defaultValue: string | undefined;
  valueType: "boolean" | "number" | "string";
  tag: string;
  desc: string;
  options: Record<string, string>;
  raw: string;
}
export interface SurgeArgumentEntry extends LoonArgumentDeclaration {
  surgeName: string;
  placeholder: string;
}
export interface SurgeArgumentTable {
  entries: SurgeArgumentEntry[];
  byId: Map<string, SurgeArgumentEntry>;
}

export type ManagedFileChanges = Map<string, string | Uint8Array | null>;
export interface ValidationFinding {
  file: string;
  line: number;
  code: string;
  text: string;
}
export interface CatalogMetadata {
  order: number;
  source: string;
  file: string;
  id: string;
  name: unknown;
  desc: unknown;
  tag: unknown;
  date: unknown;
}

// Modified: 2026-11-26 (chance). Track target output and split source members through Rewrite planning.
export type RewriteOutputSection =
  | "rewrite"
  | "url"
  | "header"
  | "body"
  | "map"
  | "script"
  | "comment";
export interface RewriteLinePlan {
  section: RewriteOutputSection;
  line?: string;
  lines?: string[];
  reason?: string;
  issue?: boolean;
  issueCode?: string;
  qxInlineNoteEligible?: boolean;
  ok?: boolean;
  members?: never;
}
export type RewritePlan =
  | RewriteLinePlan
  | {
      section: "drop";
      reason: string;
      line?: never;
      lines?: never;
      members?: never;
    }
  | {
      section: "split";
      members: RewritePlan[];
      line?: never;
      lines?: never;
    };

export interface RewritePlannerOptions {
  sourceLine?: string;
  sourceUrl?: string;
  rawBase?: string;
  stamp?: string;
  category?: string;
  id?: string;
  argumentRefs?: string[];
  argumentTable?: SurgeArgumentTable | null;
  generatedScripts?: ConversionOutput["generatedScripts"];
  mockFiles?: ConversionContext["mockFiles"];
  jqFiles?: ConversionContext["jqFiles"];
  featureCompatibilityPhases?: ReadonlySet<string>;
}
