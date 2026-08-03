import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  linkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  ARCHITECTURE_EVIDENCE_SCHEMA_VERSION,
  MatterRf13ArchitectureEvidenceError,
  createArchitectureEvidence,
  sha256,
  serializeArchitectureEvidence,
  validateArchitectureEvidence,
} from "../lib/matter-rf13-architecture-evidence.mjs";

const SOURCE_SHA = "a".repeat(40);
const CLI = resolve(new URL("../generate-matter-rf13-architecture-evidence.mjs", import.meta.url).pathname);
const RESPONSIBILITY_SCHEMA = {
  schema_version: "test.responsibility.v1",
  allowed_tags: ["read-model", "route-dispatch", "test-scenario"],
};
const PATTERNS = [
  { id: "api-route", kind: "route", pattern: "[\\\"']\\/api\\/[a-z-]+", flags: "g" },
  { id: "action", kind: "action", pattern: "[\\\"'](?:create|update)[\\\"']", flags: "g" },
];

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-rfd037-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "src"), { recursive: true });
  return root;
}

function inputFor(files, extra = {}) {
  return {
    schema_version: ARCHITECTURE_EVIDENCE_SCHEMA_VERSION,
    tuw_id: "RFD-TUW-037",
    source_sha: SOURCE_SHA,
    status: "IN_PROGRESS",
    responsibility_schema: RESPONSIBILITY_SCHEMA,
    literal_patterns: PATTERNS,
    files,
    ...extra,
  };
}

function errorCode(error) {
  assert.ok(error instanceof MatterRf13ArchitectureEvidenceError);
  return error.code;
}

test("architecture evidence reruns deterministically and binds source/file hashes", (t) => {
  const root = fixtureRoot(t);
  const source = [
    "/* comments do not count and \\\"/api/comment\\\" is ignored */",
    "const route = \"/api/matter\"; // trailing comment \"/api/ignored\"",
    "const text = \"create\";",
    "export const named = route, second = named;",
    "export { named as renamed };",
    "export default function primary() { return route; }",
    "export * from \"./other.js\";",
    "",
  ].join("\r\n");
  const sourcePath = join(root, "src", "sample.mjs");
  writeFileSync(sourcePath, source, "utf8");
  const input = inputFor([
    { path: "src/sample.mjs", responsibility_tags: ["route-dispatch", "read-model"] },
  ], {
    before: {
      status: "RECORDED",
      source_sha: "b".repeat(40),
      files: [{
        path: "src/sample.mjs",
        byte_size: 1,
        physical_loc: 1,
        pure_code_loc: 1,
        file_sha256: "c".repeat(64),
        responsibility_tags: ["route-dispatch"],
      }],
    },
    behavior_evidence: {
      status: "PENDING",
      references: [{ id: "characterization-001" }],
      note: "Behaviour receipts remain separate.",
    },
  });
  const first = createArchitectureEvidence({ repoRoot: root, input });
  const second = createArchitectureEvidence({ repoRoot: root, input });
  assert.equal(serializeArchitectureEvidence(first), serializeArchitectureEvidence(second));
  assert.equal(first.source_sha, SOURCE_SHA);
  const file = first.after.files[0];
  assert.equal(file.byte_size, Buffer.byteLength(source));
  assert.equal(file.physical_loc, 7);
  assert.equal(file.pure_code_loc, 6);
  assert.deepEqual(file.public_exports.named, ["named", "renamed", "second"]);
  assert.equal(file.public_exports.default, true);
  assert.equal(file.public_exports.star_reexports, 1);
  assert.equal(file.route_action_literals.routes["api-route"], 1);
  assert.equal(file.route_action_literals.actions.action, 1);
  assert.deepEqual(file.responsibility_tags, ["read-model", "route-dispatch"]);
  assert.equal(first.behavior_evidence.references[0].id, "characterization-001");
  assert.equal(first.comparison[0].pure_code_loc_delta, file.pure_code_loc - 1);
  assert.doesNotMatch(serializeArchitectureEvidence(first), /trailing comment|api\/ignored/u);
  assert.match(serializeArchitectureEvidence(first), /measurement-only|pass\/fail gate/u);
});

test("comments and strings do not turn route/action text into executable exports", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "comments.mjs"), [
    "// export const fake = 1; '/api/comment' 'create'",
    "const value = \"/api/string\"; const action = \"create\";",
    "/* export default '/api/block' */",
    "export let real = value;",
  ].join("\r\n"), "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/comments.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  const file = evidence.after.files[0];
  assert.deepEqual(file.public_exports.named, ["real"]);
  assert.equal(file.public_exports.default, false);
  assert.equal(file.route_action_literals.routes["api-route"], 1);
  assert.equal(file.route_action_literals.actions.action, 1);
  assert.equal(file.pure_code_loc, 2);
});

test("Babel export binding measurement handles initializer commas and nested patterns", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "bindings.mjs"), [
    "export const first = build(alpha, beta), second = 2;",
    "export const { third, fourth: renamedFourth } = source;",
    "export const [fifth, sixth] = list;",
  ].join("\n"), "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/bindings.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  assert.deepEqual(evidence.after.files[0].public_exports.named, [
    "fifth",
    "first",
    "renamedFourth",
    "second",
    "sixth",
    "third",
  ]);
});

test("missing, duplicate, escaping, and outside symlink paths fail closed", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "present.mjs"), "export const ok = true;\n", "utf8");
  const base = (files) => inputFor(files);
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([{ path: "src/missing.mjs", responsibility_tags: ["test-scenario"] }]) }),
    (error) => errorCode(error) === "MISSING_FILE",
  );
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([
      { path: "src/present.mjs", responsibility_tags: ["test-scenario"] },
      { path: "src/present.mjs", responsibility_tags: ["test-scenario"] },
    ]) }),
    (error) => errorCode(error) === "DUPLICATE_PATH",
  );
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([{ path: "../outside.mjs", responsibility_tags: ["test-scenario"] }]) }),
    (error) => ["PATH_ESCAPE", "WORKTREE_SECRET_PATH"].includes(errorCode(error)),
  );
  const outside = mkdtempSync(join(tmpdir(), "lawos-rfd037-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const outsidePath = join(outside, "outside.mjs");
  writeFileSync(outsidePath, "export const outside = true;\n", "utf8");
  symlinkSync(outsidePath, join(root, "src", "linked.mjs"));
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([{ path: "src/linked.mjs", responsibility_tags: ["test-scenario"] }]) }),
    (error) => errorCode(error) === "SYMLINK_OUTSIDE_WORKTREE",
  );
  const secretTarget = join(root, "src", "actual-secret.env");
  writeFileSync(secretTarget, "NOT_FOR_EVIDENCE=1\n", "utf8");
  symlinkSync(secretTarget, join(root, "src", "innocent.mjs"));
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([{ path: "src/innocent.mjs", responsibility_tags: ["test-scenario"] }]) }),
    (error) => errorCode(error) === "WORKTREE_SECRET_PATH",
  );
  linkSync(secretTarget, join(root, "src", "hardlink-alias.mjs"));
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: base([{ path: "src/hardlink-alias.mjs", responsibility_tags: ["test-scenario"] }]) }),
    (error) => errorCode(error) === "HARDLINK_ALIAS",
  );
});

test("astral Unicode before an export does not shift lexical masking positions", (t) => {
  const root = fixtureRoot(t);
  const astralPrefix = "😀".repeat(20);
  writeFileSync(join(root, "src", "unicode.mjs"), `const label = "${astralPrefix}";\nexport const astral = true;\n`, "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/unicode.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  assert.deepEqual(evidence.after.files[0].public_exports.named, ["astral"]);
});

test("before snapshots reject unchecked tags, inconsistent literal totals, orphan refs, and COMPLETE+PENDING", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "baseline.mjs"), "export const baseline = true;\n", "utf8");
  const snapshotFile = (overrides = {}) => ({
    path: "src/baseline.mjs",
    byte_size: 1,
    physical_loc: 1,
    pure_code_loc: 1,
    file_sha256: "c".repeat(64),
    responsibility_tags: ["test-scenario"],
    public_exports: { named: [], default: false, star_reexports: 0, commonjs_named: [] },
    route_action_literals: { routes: {}, actions: {}, route_count: 0, action_count: 0, total: 0 },
    behavior_evidence_refs: [],
    ...overrides,
  });
  const run = (before, extra = {}) => createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/baseline.mjs", responsibility_tags: ["test-scenario"] }], {
      before,
      ...extra,
    }),
  });
  assert.throws(
    () => run({ status: "RECORDED", source_sha: "b".repeat(40), files: [snapshotFile({ responsibility_tags: ["unknown-tag"] })] }),
    (error) => errorCode(error) === "SNAPSHOT",
  );
  assert.throws(
    () => run({
      status: "RECORDED",
      source_sha: "b".repeat(40),
      files: [snapshotFile({ route_action_literals: { routes: { "api-route": 1 }, actions: {}, route_count: 0, action_count: 0, total: 0 } })],
    }),
    (error) => errorCode(error) === "SNAPSHOT",
  );
  assert.throws(
    () => run({ status: "RECORDED", source_sha: "b".repeat(40), files: [snapshotFile({ behavior_evidence_refs: ["missing-ref"] })] }, {
      behavior_evidence: { status: "PENDING", references: [{ id: "known-ref" }], note: "" },
    }),
    (error) => errorCode(error) === "SNAPSHOT",
  );
  assert.throws(
    () => run({ status: "RECORDED", source_sha: "b".repeat(40), files: [] }, { status: "COMPLETE" }),
    (error) => errorCode(error) === "STATUS_BEHAVIOR_MISMATCH",
  );
});

test("responsibility tags are checked and output never includes private source content", (t) => {
  const root = fixtureRoot(t);
  const privateMarker = "PRIVATE_ROSTER_MARKER_42";
  writeFileSync(join(root, "src", "safe.mjs"), `const note = "${privateMarker}";\nexport default note;\n`, "utf8");
  assert.throws(
    () => createArchitectureEvidence({
      repoRoot: root,
      input: inputFor([{ path: "src/safe.mjs", responsibility_tags: ["unknown-tag"] }]),
    }),
    (error) => errorCode(error) === "RESPONSIBILITY_TAG_INVALID",
  );
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/safe.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  assert.doesNotMatch(serializeArchitectureEvidence(evidence), new RegExp(privateMarker, "u"));
  assert.throws(
    () => createArchitectureEvidence({
      repoRoot: root,
      input: inputFor([{ path: ".env", responsibility_tags: ["test-scenario"] }]),
    }),
    (error) => errorCode(error) === "WORKTREE_SECRET_PATH",
  );
});

test("source SHA mismatch is rejected instead of producing unbound evidence", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "bound.mjs"), "export const bound = true;\n", "utf8");
  assert.throws(
    () => createArchitectureEvidence({
      repoRoot: root,
      sourceSha: "d".repeat(40),
      input: inputFor([{ path: "src/bound.mjs", responsibility_tags: ["test-scenario"] }]),
    }),
    (error) => errorCode(error) === "SOURCE_SHA_MISMATCH" || errorCode(error) === "SOURCE_SHA_INVALID",
  );
});

test("exported validator recomputes source metrics and comparison instead of trusting mutations", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "trusted.mjs"), "export const trusted = true;\n", "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/trusted.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  const alteredSha = structuredClone(evidence);
  alteredSha.after.source_sha = "f".repeat(40);
  assert.throws(
    () => validateArchitectureEvidence(alteredSha, { repoRoot: root }),
    (error) => errorCode(error) === "SOURCE_SHA_MISMATCH",
  );
  const alteredMetrics = structuredClone(evidence);
  alteredMetrics.after.files[0].pure_code_loc += 1;
  assert.throws(
    () => validateArchitectureEvidence(alteredMetrics, { repoRoot: root }),
    (error) => errorCode(error) === "SOURCE_METRICS_MISMATCH",
  );
  const alteredComparison = structuredClone(evidence);
  alteredComparison.comparison = [{ path: "tampered", byte_size_delta: 999 }];
  assert.throws(
    () => validateArchitectureEvidence(alteredComparison, { repoRoot: root }),
    (error) => errorCode(error) === "COMPARISON_MISMATCH",
  );
});

test("COMPLETE requires a baseline and hash/bytes/source-bound behavior receipt", (t) => {
  const root = fixtureRoot(t);
  const sourcePath = join(root, "src", "complete.mjs");
  const receiptPath = join(root, "src", "behavior-receipt.json");
  const source = "export const complete = true;\n";
  const receipt = "{\"verified\":true}\n";
  writeFileSync(sourcePath, source, "utf8");
  writeFileSync(receiptPath, receipt, "utf8");
  const completeInput = inputFor([{ path: "src/complete.mjs", responsibility_tags: ["test-scenario"] }], {
    status: "COMPLETE",
    source_sha: SOURCE_SHA,
    before: {
      status: "RECORDED",
      source_sha: "b".repeat(40),
      files: [{
        path: "src/complete.mjs",
        byte_size: 1,
        physical_loc: 1,
        pure_code_loc: 1,
        file_sha256: "c".repeat(64),
        responsibility_tags: ["test-scenario"],
        public_exports: { named: [], default: false, star_reexports: 0, commonjs_named: [] },
        route_action_literals: { routes: {}, actions: {}, route_count: 0, action_count: 0, total: 0 },
      }],
    },
    behavior_evidence: {
      status: "VERIFIED",
      references: [{
        id: "behavior-001",
        path: "src/behavior-receipt.json",
        sha256: "0".repeat(64),
        bytes: receipt.length,
        source_sha: SOURCE_SHA,
      }],
      note: "",
    },
  });
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: completeInput }),
    (error) => errorCode(error) === "BEHAVIOR_RECEIPT_MISMATCH",
  );
  completeInput.behavior_evidence.references[0].sha256 = sha256(Buffer.from(receipt));
  const completeEvidence = createArchitectureEvidence({ repoRoot: root, input: completeInput });
  assert.equal(completeEvidence.status, "COMPLETE");
  const noBaseline = structuredClone(completeInput);
  noBaseline.before = { status: "NOT_RECORDED", source_sha: null, files: [], note: "" };
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: noBaseline }),
    (error) => errorCode(error) === "STATUS_BASELINE_REQUIRED",
  );
  const noRefs = structuredClone(completeInput);
  noRefs.behavior_evidence.references = [];
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: noRefs }),
    (error) => errorCode(error) === "STATUS_BEHAVIOR_REQUIRED",
  );
});

test("serialized output is safe JSON with no internal absolute paths", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "safe.mjs"), "export const value = '/api/safe';\n", "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/safe.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  const text = serializeArchitectureEvidence(evidence);
  assert.doesNotMatch(text, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(text, /_resolved_file/u);
  assert.equal(JSON.parse(text).assessment, "MEASUREMENT_ONLY");
});

test("path aliases through an in-worktree symlink are rejected as duplicate evidence", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "real.mjs"), "export const real = true;\n", "utf8");
  symlinkSync(join(root, "src", "real.mjs"), join(root, "src", "alias.mjs"));
  assert.throws(
    () => createArchitectureEvidence({
      repoRoot: root,
      input: inputFor([
        { path: "src/real.mjs", responsibility_tags: ["test-scenario"] },
        { path: "src/alias.mjs", responsibility_tags: ["test-scenario"] },
      ]),
    }),
    (error) => errorCode(error) === "DUPLICATE_PATH",
  );
});

test("input source SHA is retained when no Git metadata exists", (t) => {
  const root = fixtureRoot(t);
  writeFileSync(join(root, "src", "plain.mjs"), "const plain = 1;\n", "utf8");
  const evidence = createArchitectureEvidence({
    repoRoot: root,
    input: inputFor([{ path: "src/plain.mjs", responsibility_tags: ["test-scenario"] }]),
  });
  assert.equal(evidence.source_sha, SOURCE_SHA);
});

test("malformed responsibility schema and no named files fail before reading source", (t) => {
  const root = fixtureRoot(t);
  assert.throws(
    () => createArchitectureEvidence({ repoRoot: root, input: { responsibility_schema: { allowed_tags: [] }, files: [] } }),
    (error) => ["RESPONSIBILITY_SCHEMA", "FILES_REQUIRED"].includes(errorCode(error)),
  );
});

test("CLI rejects invalid input without echoing arbitrary source/path content", (t) => {
  const root = fixtureRoot(t);
  const marker = "PRIVATE_ARBITRARY_INPUT_MARKER_42";
  const inputPath = join(root, "input.json");
  writeFileSync(inputPath, JSON.stringify(inputFor([{
    path: `src/${marker}.mjs`,
    responsibility_tags: ["test-scenario"],
  }])), "utf8");
  const result = spawnSync(process.execPath, [CLI, "--input", inputPath, "--output", join(root, "out.json"), "--repo-root", root], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /MISSING_FILE/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(marker, "u"));
});
