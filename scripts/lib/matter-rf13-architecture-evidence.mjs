import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { parse as parseJavaScript } from "@babel/parser";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, normalize, relative, resolve, sep, win32 } from "node:path";

/**
 * RFD-TUW-037 is deliberately a measurement contract, not a quality gate.
 * In particular, this module never decides that a file is "small enough" and
 * never treats a split as behavioural success.  It records reproducible
 * measurements and leaves the behavioural evidence slots for the owning TUWs.
 */
export const ARCHITECTURE_EVIDENCE_SCHEMA_VERSION =
  "law-firm-os.rf13-maintainability-architecture-evidence.v1";
export const ARCHITECTURE_EVIDENCE_TUW = "RFD-TUW-037";

export const PURE_CODE_LOC_METHOD =
  "lexical-js-family-v1: physical lines with at least one non-whitespace token after // and /* */ comments plus quoted/template string contents are blanked while line endings are preserved; regex literals and template interpolation are conservatively treated as strings; this is an approximation, not a parser or pass/fail gate";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[a-z][a-z0-9._-]{0,95}$/u;
const SAFE_TAG = /^[a-z][a-z0-9._:/-]{0,95}$/u;
const SAFE_EXPORT_NAME = /^[A-Za-z_$][\w$]*$/u;
const SAFE_PATH = /^[^\\\0]+$/u;
const SAFE_FLAGS = /^[dgimsuvy]*$/u;

export const DEFAULT_RESPONSIBILITY_SCHEMA = Object.freeze({
  schema_version: "law-firm-os.rf13-responsibility-tags.v1",
  allowed_tags: Object.freeze([
    "api-composition",
    "authorization",
    "browser-scenario",
    "catalog",
    "domain-service",
    "evidence-publication",
    "finance-boundary",
    "mutation-orchestration",
    "persistence",
    "read-model",
    "route-dispatch",
    "runtime-composition",
    "support-fixture",
    "test-scenario",
    "validation",
    "web-surface",
  ]),
});

// The patterns are intentionally boring and explicit.  They count literals
// that are visible in source strings, not inferred routes from identifiers.
export const DEFAULT_LITERAL_PATTERNS = Object.freeze([
  Object.freeze({
    id: "api-route-literal",
    kind: "route",
    pattern: "[\\\"'`]\\/(?:api|health)(?:\\/|[\\\"'`])",
    flags: "g",
  }),
  Object.freeze({
    id: "matter-route-literal",
    kind: "route",
    pattern: "[\\\"'`]\\/matter(?:s|\\/|[\\\"'`])",
    flags: "g",
  }),
  Object.freeze({
    id: "action-literal",
    kind: "action",
    pattern: "[\\\"'`](?:create|update|delete|archive|close|restore|approve|reject|reverse)[\\\"'`]",
    flags: "g",
  }),
]);

const TOP_LEVEL_INPUT_KEYS = new Set([
  "schema_version",
  "tuw_id",
  "source_sha",
  "status",
  "status_reason",
  "responsibility_schema",
  "literal_patterns",
  "route_patterns",
  "action_patterns",
  "files",
  "before",
  "behavior_evidence",
]);

const FILE_INPUT_KEYS = new Set([
  "path",
  "responsibility_tags",
  "responsibilities",
  "behavior_evidence_refs",
]);

const SNAPSHOT_KEYS = new Set(["status", "source_sha", "files", "note"]);
const BEHAVIOR_KEYS = new Set(["status", "references", "note"]);
const BEHAVIOR_REFERENCE_KEYS = new Set(["id", "path", "sha256", "bytes", "source_sha"]);
const OUTPUT_TOP_LEVEL_KEYS = new Set([
  "schema_version",
  "tuw_id",
  "status",
  "status_reason",
  "assessment",
  "source_sha",
  "measurement_method",
  "responsibility_schema",
  "literal_patterns",
  "before",
  "after",
  "comparison",
  "behavior_evidence",
]);
const OUTPUT_SNAPSHOT_KEYS = new Set(["status", "source_sha", "files", "note"]);

export class MatterRf13ArchitectureEvidenceError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "MatterRf13ArchitectureEvidenceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new MatterRf13ArchitectureEvidenceError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value, code, label) {
  if (!isRecord(value)) fail(code, `${label} must be an object`);
  return value;
}

function assertClosedObject(value, keys, code, label) {
  assertRecord(value, code, label);
  const unknown = Object.keys(value).filter((key) => !keys.has(key));
  if (unknown.length > 0) fail(code, `${label} has unsupported fields`);
}

function codePointCompare(left, right) {
  const a = Array.from(String(left));
  const b = Array.from(String(right));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const aPoint = a[index].codePointAt(0);
    const bPoint = b[index].codePointAt(0);
    if (aPoint !== bPoint) return aPoint - bPoint;
  }
  return a.length - b.length;
}

function sortStrings(values) {
  return [...values].sort(codePointCompare);
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(codePointCompare)
      .map((key) => [key, sortObject(value[key])]),
  );
}

export function canonicalizeArchitectureEvidence(value) {
  return sortObject(value);
}

export function serializeArchitectureEvidence(value) {
  return `${JSON.stringify(canonicalizeArchitectureEvidence(value), null, 2)}\n`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeText(value, code, label, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0) || /[\0\r\n]/u.test(value)) {
    fail(code, `${label} is invalid`);
  }
  // Evidence must not become a transport for credentials or private material.
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/iu.test(value)
    || /\bBearer\s+[A-Za-z0-9._~+/-]+=*/iu.test(value)
    || /\b(?:password|passwd|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*[:=]/iu.test(value)
    || /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?:\/\/)[^\s/:@]+:[^\s@]+@/iu.test(value)
  ) {
    fail("SECRET_MATERIAL", `${label} contains secret material`);
  }
  return value;
}

function assertSha(value, code, label, pattern = SHA256) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code, `${label} is invalid`);
  return value;
}

function secretLikePath(value) {
  const lower = value.toLowerCase();
  const segments = lower.split("/");
  return segments.some((segment) => (
    segment === ".env"
    || segment.startsWith(".env.")
    || /(?:credential|password|secret|private[-_]?key|access[-_]?token|refresh[-_]?token|roster|employee|hrx|pii|photo)/u.test(segment)
  ));
}

function normalizeRelativePath(value, code = "PATH_INVALID") {
  assertSafeText(value, code, "path");
  if (!SAFE_PATH.test(value) || value.startsWith("/") || win32.isAbsolute(value) || isAbsolute(value)) {
    fail(code, "path must be a relative POSIX path");
  }
  const normalized = normalize(value).replaceAll(sep, "/");
  if (
    normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.startsWith("/")
    || secretLikePath(normalized)
  ) {
    fail(secretLikePath(normalized) ? "WORKTREE_SECRET_PATH" : "PATH_ESCAPE", "path is not allowed");
  }
  return normalized;
}

function ensureWithinRoot(root, candidate, code = "PATH_ESCAPE") {
  const rel = relative(root, candidate);
  if (rel === "" || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) {
    fail(code, "path escapes worktree");
  }
}

function resolveSourceFile(root, relativePath) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const candidate = resolve(root, normalizedPath);
  ensureWithinRoot(root, candidate);
  if (!existsSync(candidate)) fail("MISSING_FILE", "named source file is missing");

  let resolvedPath;
  try {
    resolvedPath = realpathSync(candidate);
  } catch {
    fail("PATH_UNREADABLE", "named source file cannot be resolved");
  }
  ensureWithinRoot(root, resolvedPath, "SYMLINK_OUTSIDE_WORKTREE");
  const resolvedRelativePath = relative(root, resolvedPath).replaceAll(sep, "/");
  if (secretLikePath(resolvedRelativePath)) fail("WORKTREE_SECRET_PATH", "resolved source path is secret-like");
  let stat;
  try {
    stat = statSync(resolvedPath);
  } catch {
    fail("PATH_UNREADABLE", "named source file cannot be read");
  }
  if (!stat.isFile()) fail("NOT_REGULAR_FILE", "named source path is not a regular file");
  if (Number.isSafeInteger(stat.nlink) && stat.nlink > 1) fail("HARDLINK_ALIAS", "hard-linked source paths are not allowed");
  return { path: normalizedPath, absolutePath: resolvedPath };
}

function gitHead(repoRoot) {
  try {
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!SHA1.test(value)) fail("SOURCE_SHA_INVALID", "git HEAD is not a full SHA-1");
    return value;
  } catch (error) {
    if (error instanceof MatterRf13ArchitectureEvidenceError) throw error;
    return null;
  }
}

function sourceShaFor({ repoRoot, explicitSourceSha, inputSourceSha }) {
  if (explicitSourceSha !== undefined && inputSourceSha !== undefined && explicitSourceSha !== inputSourceSha) {
    fail("SOURCE_SHA_MISMATCH", "source_sha inputs do not agree");
  }
  const explicit = explicitSourceSha ?? inputSourceSha;
  if (explicit !== undefined) assertSha(explicit, "SOURCE_SHA_INVALID", "source_sha", SHA1);
  const head = gitHead(repoRoot);
  if (head && explicit && head !== explicit) fail("SOURCE_SHA_MISMATCH", "source_sha does not match worktree HEAD");
  if (explicit) return explicit;
  if (head) return head;
  fail("SOURCE_SHA_REQUIRED", "source_sha is required outside a Git worktree");
}

function normalizeResponsibilitySchema(schema) {
  const source = schema ?? DEFAULT_RESPONSIBILITY_SCHEMA;
  assertClosedObject(source, new Set(["schema_version", "allowed_tags", "tags"]), "RESPONSIBILITY_SCHEMA", "responsibility_schema");
  const schemaVersion = source.schema_version ?? DEFAULT_RESPONSIBILITY_SCHEMA.schema_version;
  assertSafeText(schemaVersion, "RESPONSIBILITY_SCHEMA", "responsibility_schema.schema_version");
  const tagsValue = source.allowed_tags ?? source.tags;
  if (!Array.isArray(tagsValue) || tagsValue.length === 0) fail("RESPONSIBILITY_SCHEMA", "responsibility_schema.allowed_tags is required");
  const tags = tagsValue.map((tag) => {
    if (typeof tag !== "string" || !SAFE_TAG.test(tag) || secretLikePath(tag)) fail("RESPONSIBILITY_TAG_INVALID", "responsibility tag is invalid");
    return tag;
  });
  if (new Set(tags).size !== tags.length) fail("RESPONSIBILITY_TAG_DUPLICATE", "responsibility tags are duplicated");
  return { schema_version: schemaVersion, allowed_tags: sortStrings(tags) };
}

function normalizePattern(pattern, expectedKind = undefined) {
  assertClosedObject(pattern, new Set(["id", "kind", "pattern", "flags"]), "LITERAL_PATTERN", "literal pattern");
  if (typeof pattern.id !== "string" || !SAFE_ID.test(pattern.id)) fail("LITERAL_PATTERN", "literal pattern id is invalid");
  const kind = pattern.kind ?? expectedKind;
  if (kind !== "route" && kind !== "action") fail("LITERAL_PATTERN", "literal pattern kind is invalid");
  if (typeof pattern.pattern !== "string" || pattern.pattern.length === 0 || pattern.pattern.length > 500 || /[\0\r\n]/u.test(pattern.pattern)) {
    fail("LITERAL_PATTERN", "literal pattern source is invalid");
  }
  assertSafeText(pattern.pattern, "LITERAL_PATTERN", "literal pattern source");
  const flags = pattern.flags ?? "g";
  if (typeof flags !== "string" || !SAFE_FLAGS.test(flags) || new Set(flags).size !== flags.length) fail("LITERAL_PATTERN", "literal pattern flags are invalid");
  let compiled;
  try {
    compiled = new RegExp(pattern.pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch {
    fail("LITERAL_PATTERN", "literal pattern cannot be compiled");
  }
  // Compiling above also rejects unsupported flags. Keep the local variable
  // so a future linter does not mistake this validation for a no-op.
  void compiled;
  return { id: pattern.id, kind, pattern: pattern.pattern, flags: flags.includes("g") ? flags : `${flags}g` };
}

function normalizePatterns(input) {
  let patterns = input.literal_patterns;
  if (patterns === undefined) {
    const routes = input.route_patterns ?? [];
    const actions = input.action_patterns ?? [];
    if (!Array.isArray(routes) || !Array.isArray(actions)) fail("LITERAL_PATTERN", "route_patterns and action_patterns must be arrays");
    patterns = [
      ...routes.map((pattern) => normalizePattern(pattern, "route")),
      ...actions.map((pattern) => normalizePattern(pattern, "action")),
    ];
  } else {
    if (!Array.isArray(patterns)) fail("LITERAL_PATTERN", "literal_patterns must be an array");
    patterns = patterns.map((pattern) => normalizePattern(pattern));
  }
  if (patterns.length === 0) patterns = DEFAULT_LITERAL_PATTERNS.map((pattern) => normalizePattern(pattern));
  const ids = patterns.map((pattern) => pattern.id);
  if (new Set(ids).size !== ids.length) fail("LITERAL_PATTERN_DUPLICATE", "literal pattern ids are duplicated");
  return patterns.sort((left, right) => codePointCompare(left.id, right.id));
}

function normalizeBehaviorEvidence(value, fallbackStatus = "PENDING") {
  const source = value ?? { status: fallbackStatus, references: [], note: "" };
  assertClosedObject(source, BEHAVIOR_KEYS, "BEHAVIOR_EVIDENCE", "behavior_evidence");
  const status = source.status ?? fallbackStatus;
  if (!["PENDING", "VERIFIED", "NOT_RECORDED", "IN_PROGRESS"].includes(status)) fail("BEHAVIOR_EVIDENCE", "behavior evidence status is invalid");
  const references = source.references ?? [];
  if (!Array.isArray(references)) fail("BEHAVIOR_EVIDENCE", "behavior evidence references must be an array");
  const normalizedReferences = references.map((reference) => {
    assertClosedObject(reference, BEHAVIOR_REFERENCE_KEYS, "BEHAVIOR_EVIDENCE", "behavior evidence reference");
    if (typeof reference.id !== "string" || !SAFE_ID.test(reference.id)) fail("BEHAVIOR_EVIDENCE", "behavior evidence reference id is invalid");
    const result = { id: reference.id };
    if (reference.path !== undefined) result.path = normalizeRelativePath(reference.path, "BEHAVIOR_EVIDENCE");
    if (reference.sha256 !== undefined) result.sha256 = assertSha(reference.sha256, "BEHAVIOR_EVIDENCE", "behavior evidence sha256");
    if (reference.bytes !== undefined && (!Number.isSafeInteger(reference.bytes) || reference.bytes < 0)) fail("BEHAVIOR_EVIDENCE", "behavior evidence bytes are invalid");
    if (reference.bytes !== undefined) result.bytes = reference.bytes;
    if (reference.source_sha !== undefined) result.source_sha = assertSha(reference.source_sha, "BEHAVIOR_EVIDENCE", "behavior evidence source_sha", SHA1);
    return result;
  });
  if (new Set(normalizedReferences.map((reference) => reference.id)).size !== normalizedReferences.length) fail("BEHAVIOR_EVIDENCE", "behavior evidence references are duplicated");
  return {
    status,
    references: normalizedReferences.sort((left, right) => codePointCompare(left.id, right.id)),
    note: source.note === undefined ? "" : assertSafeText(source.note, "BEHAVIOR_EVIDENCE", "behavior evidence note", { allowEmpty: true }),
  };
}

function splitPhysicalLines(source) {
  if (source.length === 0) return [];
  const lines = [];
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "\r" && source[index] !== "\n") continue;
    lines.push(source.slice(start, index));
    if (source[index] === "\r" && source[index + 1] === "\n") index += 1;
    start = index + 1;
  }
  if (start < source.length) lines.push(source.slice(start));
  return lines;
}

function writeBlank(output, source, start, end) {
  for (let index = start; index < end; index += 1) {
    const character = source[index];
    output[index] = character === "\r" || character === "\n" ? character : " ";
  }
}

function looksLikeRegexStart(source, index) {
  let cursor = index - 1;
  while (cursor >= 0 && /\s/u.test(source[cursor])) cursor -= 1;
  if (cursor < 0) return true;
  const previous = source[cursor];
  if (/[=(:,!&|?{}[\];+\-*%^~<>]/u.test(previous)) return true;
  const prefix = source.slice(Math.max(0, cursor - 12), cursor + 1);
  return /\b(?:return|case|throw|else|do|typeof|void|delete|yield|await)$/u.test(prefix);
}

function lexicalMask(source, { preserveStrings }) {
  // Keep UTF-16 code-unit indexing in lock-step with `source[index]`. Using
  // Array.from here would collapse astral characters into one element and
  // shift every subsequent mask/export position.
  const output = source.split("");
  let state = "normal";
  let index = 0;
  let stringStart = -1;
  let quote = "";
  let regexStart = -1;
  let regexClass = false;
  let regexEscaped = false;
  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (state === "normal") {
      if (character === "/" && next === "/") {
        state = "line-comment";
        writeBlank(output, source, index, index + 2);
        index += 2;
        continue;
      }
      if (character === "/" && next === "*") {
        state = "block-comment";
        writeBlank(output, source, index, index + 2);
        index += 2;
        continue;
      }
      if (character === "/" && looksLikeRegexStart(source, index)) {
        state = "regex";
        regexStart = index;
        regexClass = false;
        regexEscaped = false;
        index += 1;
        continue;
      }
      if (character === "'" || character === '"' || character === "`") {
        quote = character;
        stringStart = index;
        state = "string";
        index += 1;
        continue;
      }
      index += 1;
      continue;
    }
    if (state === "line-comment") {
      if (character === "\r" || character === "\n") {
        state = "normal";
        index += 1;
      } else {
        output[index] = " ";
        index += 1;
      }
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        writeBlank(output, source, index, index + 2);
        index += 2;
        state = "normal";
      } else {
        output[index] = character === "\r" || character === "\n" ? character : " ";
        index += 1;
      }
      continue;
    }
    if (state === "regex") {
      if (regexEscaped) {
        regexEscaped = false;
        index += 1;
        continue;
      }
      if (character === "\\") {
        regexEscaped = true;
        index += 1;
        continue;
      }
      if (character === "[") {
        regexClass = true;
        index += 1;
        continue;
      }
      if (character === "]") {
        regexClass = false;
        index += 1;
        continue;
      }
      if (character === "/" && !regexClass) {
        index += 1;
        while (index < source.length && /[A-Za-z]/u.test(source[index])) index += 1;
        if (!preserveStrings) writeBlank(output, source, regexStart, index);
        else writeBlank(output, source, regexStart, index);
        state = "normal";
        regexStart = -1;
      } else {
        if (character === "\r" || character === "\n") {
          // An unterminated regex is treated as ordinary source after its
          // line; fail-closed masking is preferable to swallowing later code.
          if (!preserveStrings) writeBlank(output, source, regexStart, index);
          state = "normal";
          regexStart = -1;
        }
        index += 1;
      }
      continue;
    }
    // Quoted and template literals are not interpreted. This is deliberate:
    // it keeps this low-dependency evidence tool language-safe and prevents a
    // `//` or `/*` inside a string from becoming a fake comment.
    if (state === "string") {
      if (character === "\\") {
        if (!preserveStrings) {
          output[index] = character === "\r" || character === "\n" ? character : " ";
          if (index + 1 < source.length) output[index + 1] = source[index + 1] === "\r" || source[index + 1] === "\n" ? source[index + 1] : " ";
        }
        index += 2;
        continue;
      }
      if (character === quote) {
        if (!preserveStrings) writeBlank(output, source, stringStart, index + 1);
        state = "normal";
        quote = "";
        stringStart = -1;
        index += 1;
        continue;
      }
      if (!preserveStrings) output[index] = character === "\r" || character === "\n" ? character : " ";
      index += 1;
    }
  }
  if (state === "string" && !preserveStrings && stringStart >= 0) writeBlank(output, source, stringStart, source.length);
  return output.join("");
}

function pureCodeLoc(source) {
  const stripped = lexicalMask(source, { preserveStrings: false });
  return splitPhysicalLines(stripped).filter((line) => /\S/u.test(line)).length;
}

function countMatches(source, pattern) {
  const masked = lexicalMask(source, { preserveStrings: true });
  let regex;
  try {
    regex = new RegExp(pattern.pattern, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  } catch {
    fail("LITERAL_PATTERN", "literal pattern cannot be compiled");
  }
  let count = 0;
  // Guard against zero-width patterns looping forever while still preserving
  // the explicit regex semantics.
  for (const match of masked.matchAll(regex)) {
    count += 1;
    if (count > 100_000) fail("LITERAL_PATTERN", "literal pattern produced too many matches");
    void match;
  }
  return count;
}

function bindingNames(pattern, names) {
  if (!pattern) return;
  switch (pattern.type) {
    case "Identifier":
      names.add(pattern.name);
      return;
    case "AssignmentPattern":
    case "RestElement":
      bindingNames(pattern.left ?? pattern.argument, names);
      return;
    case "ObjectPattern":
      for (const property of pattern.properties ?? []) {
        if (property.type === "RestElement") bindingNames(property.argument, names);
        else bindingNames(property.value, names);
      }
      return;
    case "ArrayPattern":
      for (const element of pattern.elements ?? []) bindingNames(element, names);
      return;
    default:
      // Babel's parser can add new binding node kinds. Refuse to silently
      // undercount them; a future syntax update must add an explicit case.
      fail("EXPORT_PARSE_UNSUPPORTED", "export binding syntax is unsupported");
  }
}

function exportedName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return null;
}

function publicExports(source) {
  let ast;
  try {
    ast = parseJavaScript(source, {
      sourceType: "unambiguous",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "importMeta",
        "topLevelAwait",
      ],
    });
  } catch {
    fail("EXPORT_PARSE_FAILED", "source syntax could not be parsed for export measurement");
  }
  const named = new Set();
  let defaultExport = false;
  let starReexports = 0;
  for (const statement of ast.program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      defaultExport = true;
      continue;
    }
    if (statement.type === "ExportAllDeclaration") {
      starReexports += 1;
      if (statement.exported) {
        const name = exportedName(statement.exported);
        if (!name) fail("EXPORT_PARSE_UNSUPPORTED", "export namespace syntax is unsupported");
        if (name === "default") defaultExport = true;
        else named.add(name);
      }
      continue;
    }
    if (statement.type !== "ExportNamedDeclaration") continue;
    if (statement.declaration) {
      const declaration = statement.declaration;
      if (declaration.type === "VariableDeclaration") {
        for (const variable of declaration.declarations) bindingNames(variable.id, named);
      } else if (declaration.id?.name) {
        named.add(declaration.id.name);
      } else {
        fail("EXPORT_PARSE_UNSUPPORTED", "export declaration syntax is unsupported");
      }
    }
    for (const specifier of statement.specifiers ?? []) {
      const name = exportedName(specifier.exported);
      if (!name) fail("EXPORT_PARSE_UNSUPPORTED", "export specifier syntax is unsupported");
      if (name === "default") defaultExport = true;
      else named.add(name);
    }
  }
  const stripped = lexicalMask(source, { preserveStrings: false });
  const commonjs = new Set();
  const commonjsPattern = /\b(?:module\.exports|exports)\.([A-Za-z_$][\w$]*)/gu;
  for (const match of stripped.matchAll(commonjsPattern)) commonjs.add(match[1]);
  return {
    named: sortStrings(named),
    default: defaultExport,
    star_reexports: starReexports,
    commonjs_named: sortStrings(commonjs),
  };
}

function normalizePublicExports(value) {
  const source = value ?? { named: [], default: false, star_reexports: 0, commonjs_named: [] };
  assertClosedObject(source, new Set(["named", "default", "star_reexports", "commonjs_named"]), "SNAPSHOT", "snapshot public_exports");
  if (!Array.isArray(source.named) || source.named.some((name) => typeof name !== "string" || !SAFE_EXPORT_NAME.test(name))) fail("SNAPSHOT", "snapshot named exports are invalid");
  if (!Array.isArray(source.commonjs_named) || source.commonjs_named.some((name) => typeof name !== "string" || !SAFE_EXPORT_NAME.test(name))) fail("SNAPSHOT", "snapshot CommonJS exports are invalid");
  if (typeof source.default !== "boolean" || !Number.isSafeInteger(source.star_reexports) || source.star_reexports < 0) fail("SNAPSHOT", "snapshot export counts are invalid");
  return {
    named: sortStrings(source.named),
    default: source.default,
    star_reexports: source.star_reexports,
    commonjs_named: sortStrings(source.commonjs_named),
  };
}

function normalizeRouteActionLiterals(value) {
  const source = value ?? { routes: {}, actions: {}, route_count: 0, action_count: 0, total: 0 };
  assertClosedObject(source, new Set(["routes", "actions", "route_count", "action_count", "total"]), "SNAPSHOT", "snapshot route_action_literals");
  for (const group of ["routes", "actions"]) {
    assertRecord(source[group], "SNAPSHOT", `snapshot ${group}`);
    for (const [id, count] of Object.entries(source[group])) {
      if (!SAFE_ID.test(id) || !Number.isSafeInteger(count) || count < 0) fail("SNAPSHOT", "snapshot literal counts are invalid");
    }
  }
  for (const key of ["route_count", "action_count", "total"]) {
    if (!Number.isSafeInteger(source[key]) || source[key] < 0) fail("SNAPSHOT", "snapshot literal totals are invalid");
  }
  const routeTotal = Object.values(source.routes).reduce((total, count) => total + count, 0);
  const actionTotal = Object.values(source.actions).reduce((total, count) => total + count, 0);
  if (source.route_count !== routeTotal || source.action_count !== actionTotal || source.total !== routeTotal + actionTotal) {
    fail("SNAPSHOT", "snapshot literal totals are inconsistent");
  }
  return {
    routes: Object.fromEntries(Object.keys(source.routes).sort(codePointCompare).map((id) => [id, source.routes[id]])),
    actions: Object.fromEntries(Object.keys(source.actions).sort(codePointCompare).map((id) => [id, source.actions[id]])),
    route_count: source.route_count,
    action_count: source.action_count,
    total: source.total,
  };
}

function metricsForSource(source, patterns, bytes = Buffer.from(source, "utf8")) {
  const routeCounts = {};
  const actionCounts = {};
  for (const pattern of patterns) {
    const count = countMatches(source, pattern);
    if (pattern.kind === "route") routeCounts[pattern.id] = count;
    else actionCounts[pattern.id] = count;
  }
  const routeLiteralCount = Object.values(routeCounts).reduce((total, count) => total + count, 0);
  const actionLiteralCount = Object.values(actionCounts).reduce((total, count) => total + count, 0);
  return {
    byte_size: bytes.byteLength,
    physical_loc: splitPhysicalLines(source).length,
    pure_code_loc: pureCodeLoc(source),
    public_exports: publicExports(source),
    route_action_literals: {
      routes: routeCounts,
      actions: actionCounts,
      route_count: routeLiteralCount,
      action_count: actionLiteralCount,
      total: routeLiteralCount + actionLiteralCount,
    },
  };
}

function normalizeFileInput(file, responsibilitySchema, behaviorReferenceIds = new Set()) {
  assertClosedObject(file, FILE_INPUT_KEYS, "FILE_INPUT", "file input");
  const path = normalizeRelativePath(file.path);
  const tagsValue = file.responsibility_tags ?? file.responsibilities;
  if (!Array.isArray(tagsValue) || tagsValue.length === 0) fail("RESPONSIBILITY_TAGS_REQUIRED", "every named file requires responsibility tags");
  const tags = tagsValue.map((tag) => {
    if (typeof tag !== "string" || !SAFE_TAG.test(tag) || !responsibilitySchema.allowed_tags.includes(tag)) fail("RESPONSIBILITY_TAG_INVALID", "file responsibility tag is not in the checked schema");
    return tag;
  });
  if (new Set(tags).size !== tags.length) fail("RESPONSIBILITY_TAG_DUPLICATE", "file responsibility tags are duplicated");
  const refs = file.behavior_evidence_refs ?? [];
  if (!Array.isArray(refs) || refs.some((ref) => typeof ref !== "string" || !SAFE_ID.test(ref))) fail("BEHAVIOR_EVIDENCE", "file behavior evidence references are invalid");
  if (refs.some((ref) => !behaviorReferenceIds.has(ref))) fail("BEHAVIOR_EVIDENCE", "file behavior evidence reference is orphaned");
  return {
    path,
    responsibility_tags: sortStrings(tags),
    behavior_evidence_refs: sortStrings(refs),
  };
}

function validateFileUniqueness(files) {
  const paths = files.map((file) => file.path);
  if (new Set(paths).size !== paths.length) fail("DUPLICATE_PATH", "named file paths are duplicated");
}

function normalizeInput(input) {
  assertClosedObject(input, TOP_LEVEL_INPUT_KEYS, "INPUT_SCHEMA", "architecture evidence input");
  if (input.schema_version !== undefined && input.schema_version !== ARCHITECTURE_EVIDENCE_SCHEMA_VERSION) fail("SCHEMA_VERSION", "input schema_version is unsupported");
  if (input.tuw_id !== undefined && input.tuw_id !== ARCHITECTURE_EVIDENCE_TUW) fail("TUW_ID", "input tuw_id is unsupported");
  const status = input.status ?? "IN_PROGRESS";
  if (!["IN_PROGRESS", "BASELINE_RECORDED", "COMPLETE"].includes(status)) fail("STATUS", "architecture evidence status is invalid");
  const statusReason = input.status_reason === undefined
    ? "Upstream architecture splits remain in progress; measurements do not establish behaviour parity."
    : assertSafeText(input.status_reason, "STATUS_REASON", "status_reason");
  const responsibilitySchema = normalizeResponsibilitySchema(input.responsibility_schema);
  const patterns = normalizePatterns(input);
  if (!Array.isArray(input.files) || input.files.length === 0) fail("FILES_REQUIRED", "at least one named file is required");
  const behaviorEvidence = normalizeBehaviorEvidence(input.behavior_evidence);
  const behaviorReferenceIds = new Set(behaviorEvidence.references.map((reference) => reference.id));
  const files = input.files.map((file) => normalizeFileInput(file, responsibilitySchema, behaviorReferenceIds));
  validateFileUniqueness(files);
  const before = normalizeSnapshotInput(input.before, responsibilitySchema, behaviorReferenceIds);
  const afterPlaceholder = { status: "RECORDED", source_sha: input.source_sha ?? null, files };
  if (status === "COMPLETE" && behaviorEvidence.status !== "VERIFIED") fail("STATUS_BEHAVIOR_MISMATCH", "COMPLETE architecture evidence requires VERIFIED behavior evidence");
  if (status === "COMPLETE" && input.source_sha !== undefined) {
    validateCompleteState({ status, sourceSha: input.source_sha, before, after: afterPlaceholder, behaviorEvidence });
  }
  return {
    status,
    status_reason: statusReason,
    responsibility_schema: responsibilitySchema,
    literal_patterns: patterns,
    files,
    before,
    behavior_evidence: behaviorEvidence,
    source_sha: input.source_sha,
  };
}

function normalizeSnapshotInput(value, responsibilitySchema = undefined, behaviorReferenceIds = new Set()) {
  if (value === undefined || value === null) return { status: "NOT_RECORDED", source_sha: null, files: [], note: "" };
  assertClosedObject(value, SNAPSHOT_KEYS, "SNAPSHOT", "before");
  const status = value.status ?? "RECORDED";
  if (!["NOT_RECORDED", "RECORDED", "IN_PROGRESS"].includes(status)) fail("SNAPSHOT", "snapshot status is invalid");
  let sourceSha = null;
  if (value.source_sha !== undefined && value.source_sha !== null) sourceSha = assertSha(value.source_sha, "SNAPSHOT", "snapshot source_sha", SHA1);
  const files = value.files ?? [];
  if (!Array.isArray(files)) fail("SNAPSHOT", "snapshot files must be an array");
  if (status === "NOT_RECORDED" && (sourceSha !== null || files.length > 0)) fail("SNAPSHOT", "NOT_RECORDED snapshot cannot contain baseline data");
  const normalizedFiles = files.map((file) => normalizeSnapshotFile(file, responsibilitySchema?.allowed_tags, behaviorReferenceIds));
  validateFileUniqueness(normalizedFiles);
  return {
    status,
    source_sha: sourceSha,
    files: normalizedFiles.sort((left, right) => codePointCompare(left.path, right.path)),
    note: value.note === undefined ? "" : assertSafeText(value.note, "SNAPSHOT", "snapshot note", { allowEmpty: true }),
  };
}

function normalizeSnapshotFile(file, allowedTags = undefined, behaviorReferenceIds = new Set()) {
  assertRecord(file, "SNAPSHOT", "snapshot file");
  const allowed = new Set([
    "path", "byte_size", "physical_loc", "pure_code_loc", "file_sha256",
    "responsibility_tags", "public_exports", "route_action_literals", "behavior_evidence_refs",
  ]);
  assertClosedObject(file, allowed, "SNAPSHOT", "snapshot file");
  const path = normalizeRelativePath(file.path, "SNAPSHOT");
  for (const field of ["byte_size", "physical_loc", "pure_code_loc"]) {
    if (!Number.isSafeInteger(file[field]) || file[field] < 0) fail("SNAPSHOT", "snapshot metric is invalid");
  }
  const fileSha = assertSha(file.file_sha256, "SNAPSHOT", "snapshot file_sha256");
  const tags = file.responsibility_tags ?? [];
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string" || !SAFE_TAG.test(tag))) fail("SNAPSHOT", "snapshot responsibility tags are invalid");
  if (allowedTags && tags.some((tag) => !allowedTags.includes(tag))) fail("SNAPSHOT", "snapshot responsibility tag is not in the checked schema");
  const refs = file.behavior_evidence_refs ?? [];
  if (!Array.isArray(refs) || refs.some((ref) => typeof ref !== "string" || !SAFE_ID.test(ref))) fail("SNAPSHOT", "snapshot behavior references are invalid");
  if (refs.some((ref) => !behaviorReferenceIds.has(ref))) fail("SNAPSHOT", "snapshot behavior evidence reference is orphaned");
  return {
    path,
    byte_size: file.byte_size,
    physical_loc: file.physical_loc,
    pure_code_loc: file.pure_code_loc,
    file_sha256: fileSha,
    responsibility_tags: sortStrings(tags),
    public_exports: normalizePublicExports(file.public_exports),
    route_action_literals: normalizeRouteActionLiterals(file.route_action_literals),
    behavior_evidence_refs: sortStrings(refs),
  };
}

function validateCompleteState({ status, sourceSha, before, after, behaviorEvidence }) {
  if (status !== "COMPLETE") return;
  if (before.status !== "RECORDED" || before.source_sha === null || before.files.length === 0) {
    fail("STATUS_BASELINE_REQUIRED", "COMPLETE architecture evidence requires a recorded before baseline");
  }
  if (after.status !== "RECORDED" || after.source_sha !== sourceSha || after.files.length === 0) {
    fail("STATUS_AFTER_REQUIRED", "COMPLETE architecture evidence requires a valid after snapshot bound to source_sha");
  }
  if (behaviorEvidence.status !== "VERIFIED" || behaviorEvidence.references.length === 0) {
    fail("STATUS_BEHAVIOR_REQUIRED", "COMPLETE architecture evidence requires verified behavior references");
  }
  for (const reference of behaviorEvidence.references) {
    if (
      reference.path === undefined
      || reference.sha256 === undefined
      || reference.bytes === undefined
      || reference.source_sha === undefined
      || reference.source_sha !== sourceSha
    ) {
      fail("STATUS_BEHAVIOR_BINDING", "COMPLETE behavior references require hash, bytes, and matching source_sha");
    }
  }
}

function outputFile(inputFile, resolvedFile, source, bytes, patterns) {
  const metrics = metricsForSource(source, patterns, bytes);
  return {
    path: inputFile.path,
    file_sha256: sha256(bytes),
    ...metrics,
    responsibility_tags: inputFile.responsibility_tags,
    behavior_evidence_refs: inputFile.behavior_evidence_refs,
    // Keep the resolved path out of the report. It could reveal an operator's
    // home directory and is not necessary to reproduce the evidence.
    _resolved_file: resolvedFile.absolutePath,
  };
}

function stripInternalFields(file) {
  const { _resolved_file: ignored, ...publicFile } = file;
  void ignored;
  return publicFile;
}

function compareSnapshots(before, after) {
  const beforeByPath = new Map(before.files.map((file) => [file.path, file]));
  const afterByPath = new Map(after.files.map((file) => [file.path, file]));
  const paths = sortStrings([...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]);
  return paths.map((path) => {
    const current = afterByPath.get(path);
    const previous = beforeByPath.get(path);
    if (!previous) {
      return {
        path,
        before: null,
        after: {
          byte_size: current.byte_size,
          physical_loc: current.physical_loc,
          pure_code_loc: current.pure_code_loc,
          responsibility_tags: current.responsibility_tags,
        },
        byte_size_delta: null,
        physical_loc_delta: null,
        pure_code_loc_delta: null,
        responsibility_added: before.status === "RECORDED" ? current.responsibility_tags : null,
        responsibility_removed: before.status === "RECORDED" ? [] : null,
      };
    }
    if (!current) {
      return {
        path,
        before: {
          byte_size: previous.byte_size,
          physical_loc: previous.physical_loc,
          pure_code_loc: previous.pure_code_loc,
          responsibility_tags: previous.responsibility_tags,
        },
        after: null,
        byte_size_delta: null,
        physical_loc_delta: null,
        pure_code_loc_delta: null,
        responsibility_added: null,
        responsibility_removed: before.status === "RECORDED" ? previous.responsibility_tags : null,
      };
    }
    const previousTags = new Set(previous.responsibility_tags);
    const currentTags = new Set(current.responsibility_tags);
    return {
      path,
      before: {
        byte_size: previous.byte_size,
        physical_loc: previous.physical_loc,
        pure_code_loc: previous.pure_code_loc,
        responsibility_tags: previous.responsibility_tags,
      },
      after: {
        byte_size: current.byte_size,
        physical_loc: current.physical_loc,
        pure_code_loc: current.pure_code_loc,
        responsibility_tags: current.responsibility_tags,
      },
      byte_size_delta: current.byte_size - previous.byte_size,
      physical_loc_delta: current.physical_loc - previous.physical_loc,
      pure_code_loc_delta: current.pure_code_loc - previous.pure_code_loc,
      responsibility_added: sortStrings(current.responsibility_tags.filter((tag) => !previousTags.has(tag))),
      responsibility_removed: sortStrings(previous.responsibility_tags.filter((tag) => !currentTags.has(tag))),
    };
  });
}

function canonicalEqual(left, right) {
  return serializeArchitectureEvidence(left) === serializeArchitectureEvidence(right);
}

function validateAfterSource(value, repoRoot) {
  let root;
  try {
    root = realpathSync(resolve(repoRoot));
  } catch {
    fail("SOURCE_ROOT_INVALID", "source root cannot be resolved");
  }
  const head = gitHead(root);
  if (head && head !== value.source_sha) fail("SOURCE_SHA_MISMATCH", "evidence source_sha does not match current worktree HEAD");
  const patterns = value.literal_patterns.map((pattern) => normalizePattern(pattern));
  const seen = new Set();
  for (const file of value.after.files) {
    const resolved = resolveSourceFile(root, file.path);
    if (seen.has(resolved.absolutePath)) fail("DUPLICATE_PATH", "after files resolve to the same source file");
    seen.add(resolved.absolutePath);
    let bytes;
    try {
      bytes = readFileSync(resolved.absolutePath);
    } catch {
      fail("SOURCE_FILE_UNREADABLE", "after source file cannot be read");
    }
    const source = bytes.toString("utf8");
    const expectedMetrics = metricsForSource(source, patterns, bytes);
    if (file.file_sha256 !== sha256(bytes) || !canonicalEqual({
      byte_size: file.byte_size,
      physical_loc: file.physical_loc,
      pure_code_loc: file.pure_code_loc,
      public_exports: file.public_exports,
      route_action_literals: file.route_action_literals,
    }, expectedMetrics)) {
      fail("SOURCE_METRICS_MISMATCH", "after file metrics do not match current source bytes");
    }
  }
}

function validateBehaviorReceiptReferences(behaviorEvidence, repoRoot, sourceSha) {
  let root;
  try {
    root = realpathSync(resolve(repoRoot));
  } catch {
    fail("SOURCE_ROOT_INVALID", "source root cannot be resolved");
  }
  for (const reference of behaviorEvidence.references) {
    if (reference.source_sha !== undefined && reference.source_sha !== sourceSha) fail("STATUS_BEHAVIOR_BINDING", "behavior reference source_sha does not match evidence source_sha");
    if (reference.path === undefined) continue;
    const resolved = resolveSourceFile(root, reference.path);
    let bytes;
    try {
      bytes = readFileSync(resolved.absolutePath);
    } catch {
      fail("BEHAVIOR_RECEIPT_UNREADABLE", "behavior receipt cannot be read");
    }
    if (reference.bytes !== undefined && reference.bytes !== bytes.byteLength) fail("BEHAVIOR_RECEIPT_MISMATCH", "behavior receipt byte count does not match");
    if (reference.sha256 !== undefined && reference.sha256 !== sha256(bytes)) fail("BEHAVIOR_RECEIPT_MISMATCH", "behavior receipt hash does not match");
  }
}

function validateOutputShape(value, { repoRoot = process.cwd() } = {}) {
  assertClosedObject(value, OUTPUT_TOP_LEVEL_KEYS, "OUTPUT_SCHEMA", "architecture evidence");
  if (value.schema_version !== ARCHITECTURE_EVIDENCE_SCHEMA_VERSION) fail("SCHEMA_VERSION", "output schema_version is unsupported");
  if (value.tuw_id !== ARCHITECTURE_EVIDENCE_TUW) fail("TUW_ID", "output tuw_id is unsupported");
  if (!["IN_PROGRESS", "BASELINE_RECORDED", "COMPLETE"].includes(value.status)) fail("STATUS", "output status is invalid");
  assertSafeText(value.status_reason, "STATUS_REASON", "output status_reason");
  if (value.assessment !== "MEASUREMENT_ONLY") fail("OUTPUT_SCHEMA", "output assessment must be MEASUREMENT_ONLY");
  assertSha(value.source_sha, "SOURCE_SHA_INVALID", "output source_sha", SHA1);
  assertClosedObject(value.measurement_method, new Set(["physical_loc", "pure_code_loc", "export_detection", "route_action_detection", "gate_policy"]), "OUTPUT_SCHEMA", "measurement_method");
  for (const [key, text] of Object.entries(value.measurement_method)) assertSafeText(text, "OUTPUT_SCHEMA", `measurement_method.${key}`);
  const responsibilitySchema = normalizeResponsibilitySchema(value.responsibility_schema);
  if (!Array.isArray(value.literal_patterns)) fail("OUTPUT_SCHEMA", "output literal_patterns must be an array");
  const outputPatterns = value.literal_patterns.map((pattern) => normalizePattern(pattern));
  if (new Set(outputPatterns.map((pattern) => pattern.id)).size !== outputPatterns.length) fail("OUTPUT_SCHEMA", "output literal pattern ids are duplicated");
  const behaviorEvidence = normalizeBehaviorEvidence(value.behavior_evidence);
  const behaviorReferenceIds = new Set(behaviorEvidence.references.map((reference) => reference.id));
  for (const snapshot of [value.before, value.after]) {
    assertClosedObject(snapshot, OUTPUT_SNAPSHOT_KEYS, "OUTPUT_SCHEMA", "output snapshot");
    if (!["NOT_RECORDED", "RECORDED", "IN_PROGRESS"].includes(snapshot.status)) fail("OUTPUT_SCHEMA", "output snapshot status is invalid");
    if (snapshot.source_sha !== null) assertSha(snapshot.source_sha, "OUTPUT_SCHEMA", "output snapshot source_sha", SHA1);
    if (!Array.isArray(snapshot.files)) fail("OUTPUT_SCHEMA", "output snapshot files must be an array");
    snapshot.files.forEach((file) => normalizeSnapshotFile(file, responsibilitySchema.allowed_tags, behaviorReferenceIds));
    validateFileUniqueness(snapshot.files);
    assertSafeText(snapshot.note, "OUTPUT_SCHEMA", "output snapshot note", { allowEmpty: true });
  }
  if (value.after.source_sha !== value.source_sha) fail("SOURCE_SHA_MISMATCH", "after source_sha must match top-level source_sha");
  validateAfterSource(value, repoRoot);
  if (!Array.isArray(value.comparison)) fail("OUTPUT_SCHEMA", "output comparison must be an array");
  const expectedComparison = compareSnapshots(value.before, value.after);
  if (!canonicalEqual(value.comparison, expectedComparison)) fail("COMPARISON_MISMATCH", "comparison is not derived from before and after snapshots");
  validateCompleteState({ status: value.status, sourceSha: value.source_sha, before: value.before, after: value.after, behaviorEvidence });
  validateBehaviorReceiptReferences(behaviorEvidence, repoRoot, value.source_sha);
  const encoded = serializeArchitectureEvidence(value);
  if (/-----BEGIN|Bearer\s+|password\s*[:=]|client[_-]?secret\s*[:=]/iu.test(encoded)) fail("SECRET_MATERIAL", "output contains secret material");
  return value;
}

export function validateArchitectureEvidence(value, options = {}) {
  return validateOutputShape(value, options);
}

export function createArchitectureEvidence({
  repoRoot = process.cwd(),
  input,
  sourceSha,
} = {}) {
  const root = realpathSync(resolve(repoRoot));
  const normalizedInput = normalizeInput(input ?? {});
  const currentSourceSha = sourceShaFor({ repoRoot: root, explicitSourceSha: sourceSha, inputSourceSha: normalizedInput.source_sha });
  const resolvedFiles = [];
  const seenResolvedPaths = new Set();
  for (const inputFile of normalizedInput.files) {
    const resolved = resolveSourceFile(root, inputFile.path);
    if (seenResolvedPaths.has(resolved.absolutePath)) fail("DUPLICATE_PATH", "named files resolve to the same file");
    seenResolvedPaths.add(resolved.absolutePath);
    const bytes = readFileSync(resolved.absolutePath);
    const source = bytes.toString("utf8");
    resolvedFiles.push(outputFile(inputFile, resolved, source, bytes, normalizedInput.literal_patterns));
  }
  resolvedFiles.sort((left, right) => codePointCompare(left.path, right.path));
  const publicFiles = resolvedFiles.map(stripInternalFields);
  const after = {
    status: "RECORDED",
    source_sha: currentSourceSha,
    files: publicFiles,
    note: "Current worktree measurements; no behavioural parity claim.",
  };
  const before = normalizedInput.before;
  const result = {
    schema_version: ARCHITECTURE_EVIDENCE_SCHEMA_VERSION,
    tuw_id: ARCHITECTURE_EVIDENCE_TUW,
    status: normalizedInput.status,
    status_reason: normalizedInput.status_reason,
    assessment: "MEASUREMENT_ONLY",
    source_sha: currentSourceSha,
    measurement_method: {
      physical_loc: "non-empty source split on CRLF, LF, or CR; a terminal line ending does not create an extra physical line",
      pure_code_loc: PURE_CODE_LOC_METHOD,
      export_detection: "explicit ECMAScript export declarations, export lists, star re-exports, and CommonJS property assignments after lexical masking",
      route_action_detection: "only the checked literal_patterns regular expressions are applied after comments are blanked while quoted/template strings remain visible",
      gate_policy: "measurement-only; no LOC threshold, export threshold, route threshold, or split-count pass/fail gate",
    },
    responsibility_schema: normalizedInput.responsibility_schema,
    literal_patterns: normalizedInput.literal_patterns,
    before,
    after,
    comparison: compareSnapshots(before, after),
    behavior_evidence: normalizedInput.behavior_evidence,
  };
  return validateArchitectureEvidence(canonicalizeArchitectureEvidence(result), { repoRoot: root });
}

export function architectureEvidenceTemplate() {
  return {
    schema_version: ARCHITECTURE_EVIDENCE_SCHEMA_VERSION,
    tuw_id: ARCHITECTURE_EVIDENCE_TUW,
    status: "IN_PROGRESS",
    status_reason: "Upstream architecture splits remain in progress; measurements do not establish behaviour parity.",
    responsibility_schema: DEFAULT_RESPONSIBILITY_SCHEMA,
    literal_patterns: DEFAULT_LITERAL_PATTERNS,
    files: [
      {
        path: "apps/api/src/matter-small-firm-api.js",
        responsibility_tags: ["api-composition", "route-dispatch"],
        behavior_evidence_refs: [],
      },
    ],
    before: { status: "NOT_RECORDED", source_sha: null, files: [], note: "Populate from an independently captured baseline; never infer it from current files." },
    behavior_evidence: { status: "PENDING", references: [], note: "Record characterization/regression receipts separately from architecture measurements." },
  };
}

// Explicit aliases keep the contract discoverable to callers that use the
// verb "generate" for a pure in-memory operation. They are intentionally
// aliases rather than second implementations, so deterministic semantics stay
// in one place.
export const generateArchitectureEvidence = createArchitectureEvidence;
export const createMatterRf13ArchitectureEvidence = createArchitectureEvidence;
export const validateMatterRf13ArchitectureEvidence = validateArchitectureEvidence;
