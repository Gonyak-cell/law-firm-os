import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  RFD_TUW_CONTRACTS,
  RF13_EVIDENCE_ROOT,
  RF13_EVIDENCE_SCHEMA,
  buildRf13ProgressTemplate,
  deriveRf13Gates,
} from "../lib/matter-rf13-debt-remediation-contract.mjs";
import {
  COLD_START_SCHEMA,
} from "../lib/matter-desktop-cold-start-contract.mjs";
import {
  RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA,
  RF13_PROFILE_OPERATION_RECEIPT_SCHEMA,
  RF13_WEB_FULL_RECEIPT_SCHEMA,
  validateProfileDecisionEvidence,
  validateProfileMeasurementProducerEvidence,
  validateProfileOperationEvidence,
  validateWebFullProducerEvidence,
} from "../lib/matter-rf13-operational-evidence.mjs";
import {
  RF13_OPERATIONAL_ATTESTATION_POLICIES,
  RF13_OPERATIONAL_PACKET_SCHEMA,
  RF13_PROFILE_MEASUREMENT_PACKET_SCHEMA,
  buildRf13ProfileMeasurementPacket,
  buildRf13ReceiptAttestationPacket,
  hashRf13OperationalPacket,
} from "../lib/matter-rf13-operational-attestation.mjs";
import {
  Rf13ProgressValidationError,
  finalizeMatterRf13GoalValidationSession,
  hashRf13Bytes,
  prepareMatterRf13GoalValidationSession,
  validateMatterRf13Progress,
  validateRf13EvidenceReference,
} from "../lib/matter-rf13-debt-remediation-validator.mjs";
import {
  buildRf13CompletionPacket,
  hashRf13CompletionPacket,
  serializeRf13CompletionPacket,
  validateRf13CompletionAttestation,
} from "../lib/matter-rf13-debt-remediation-attestation.mjs";
import { canonicalizeJson } from "../lib/runtime-safety-approval-contract.mjs";
import {
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE,
  JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
  jsonPostgresProductionInfrastructureResultSha256,
} from "../lib/json-postgres-production-execution.mjs";
import { preflightRfd010ReleaseCandidate } from "../lib/rfd010-release-candidate.mjs";
import { PROFILE_MEDIA_DECISION_SCHEMA_VERSION } from "../validate-profile-media-operability-decision.mjs";

const REPO_ROOT = resolve(new URL("../../", import.meta.url).pathname);
const SCRIPT = resolve(REPO_ROOT, "scripts/validate-matter-rf13-debt-remediation-goal.mjs");
const SPEC = JSON.parse(readFileSync(
  resolve(new URL("./fixtures/matter-rf13-debt-remediation-spec.json", import.meta.url).pathname),
  "utf8",
));
const SPEC_BY_ID = new Map(SPEC.map((unit) => [unit.id, unit]));
const SOURCE = Object.freeze({
  source_sha: "1".repeat(40),
  source_tree: "2".repeat(40),
  source_manifest_sha256: "3".repeat(64),
  working_tree_sha256: "2".repeat(64),
  source_dirty: false,
});
const PLAN_SHA256 = "4".repeat(64);
const COUNTS = Object.freeze({ total: 1, passed: 1, failed: 0, skipped: 0 });

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function tempRoot(testContext) {
  const root = mkdtempSync(resolve(tmpdir(), "rf13-progress-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function git(root, args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: root, encoding, stdio: ["ignore", "pipe", "pipe"] });
}

function write(root, relativePath, value) {
  const absolute = resolve(root, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  writeFileSync(absolute, bytes);
  return { path: relativePath, bytes: bytes.length, sha256: digest(bytes) };
}

function sourceFromGit(root, revision = "HEAD") {
  const sourceSha = git(root, ["rev-parse", revision]).trim();
  const sourceTree = git(root, ["rev-parse", `${sourceSha}^{tree}`]).trim();
  const sourceManifest = git(root, ["ls-tree", "-r", "-z", "--full-tree", sourceSha], null);
  return Object.freeze({
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_manifest_sha256: digest(sourceManifest),
    working_tree_sha256: digest(`clean:${sourceSha}`),
    source_dirty: false,
  });
}

function evidenceSource(source) {
  return {
    sha: source.source_sha,
    tree: source.source_tree,
    manifest_sha256: source.source_manifest_sha256,
    fingerprint_sha256: source.working_tree_sha256,
    dirty: source.source_dirty,
  };
}

function completionRoot(testContext, {
  usesBabelParser = false,
  declaresBabelParser = false,
  extraCandidatePath = false,
} = {}) {
  const root = tempRoot(testContext);
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "RF13 Test"]);
  git(root, ["config", "user.email", "rf13@example.invalid"]);
  write(root, ".gitignore", ".omo/\n");
  const devDependencies = declaresBabelParser ? { "@babel/parser": "^7.29.7" } : {};
  write(root, "package.json", `${JSON.stringify({
    name: "law-firm-os",
    version: "0.1.17",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    dependencies: {},
    devDependencies,
  }, null, 2)}\n`);
  write(root, "apps/desktop/package.json", `${JSON.stringify({
    name: "@law-firm-os/desktop", version: "0.1.17", private: true,
  }, null, 2)}\n`);
  write(root, "package-lock.json", `${JSON.stringify({
    name: "law-firm-os",
    version: "0.1.17",
    lockfileVersion: 3,
    packages: {
      "": { name: "law-firm-os", version: "0.1.17", workspaces: ["apps/*", "packages/*"], dependencies: {}, devDependencies },
      "apps/desktop": { name: "@law-firm-os/desktop", version: "0.1.17" },
    },
  }, null, 2)}\n`);
  for (const boundPath of new Set(SPEC.flatMap((unit) => [
    ...unit.producer_paths,
    ...(unit.implementation_dependency_paths ?? []),
  ]))) {
    write(root, boundPath, "export {};\n");
  }
  write(root, "scripts/lib/matter-rf13-architecture-evidence.mjs", usesBabelParser
    ? 'import { parse } from "@babel/parser";\nexport { parse };\n'
    : "export {};\n");
  write(root, "apps/web/src/App.jsx", "export const App = 'baseline';\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "sealed baseline fixture"]);
  const baselineSource = sourceFromGit(root);
  write(root, "apps/web/src/App.jsx", "export const App = 'candidate lazy surface';\n");
  if (extraCandidatePath) write(root, "apps/web/src/expanded-experiment.js", "export const expanded = true;\n");
  git(root, ["add", "apps/web/src/App.jsx", ...(extraCandidatePath ? ["apps/web/src/expanded-experiment.js"] : [])]);
  git(root, ["commit", "-m", "candidate lazy surface"]);
  const source = sourceFromGit(root);
  return {
    root,
    source,
    baselineSource,
  };
}

function cloneTemplate() {
  return structuredClone(buildRf13ProgressTemplate({ planSha256: PLAN_SHA256, source: SOURCE }));
}

function specEvidenceKind(unitId) {
  return unitId === "RFD-TUW-001"
    ? "baseline_capture"
    : unitId === "RFD-TUW-010"
      ? "rfd010_release_candidate"
    : `${unitId.toLowerCase().replaceAll("-", "_")}_acceptance`;
}

function genericEvidence(root, unitId, mutateReceipt = (receipt) => receipt, source = SOURCE, options = {}) {
  const spec = SPEC_BY_ID.get(unitId);
  const producers = spec.producer_paths.map((producerPath) => {
    const producer = write(root, producerPath, "export {};\n");
    return { path: producer.path, sha256: producer.sha256 };
  });
  const implementationDependencies = (spec.implementation_dependency_paths ?? []).map((dependencyPath) => {
    const dependency = write(root, dependencyPath, "export {};\n");
    return { path: dependency.path, sha256: dependency.sha256 };
  });
  const receipt = mutateReceipt({
    schema_version: RF13_EVIDENCE_SCHEMA,
    goal_id: "RF13-DIST",
    tuw_id: unitId,
    evidence_kind: specEvidenceKind(unitId),
    scope: "RF13_DIST",
    source: {
      sha: source.source_sha,
      tree: source.source_tree,
      manifest_sha256: source.source_manifest_sha256,
      fingerprint_sha256: source.working_tree_sha256,
      dirty: source.source_dirty,
    },
    producers,
    implementation_dependencies: implementationDependencies,
    scenario: { id: specEvidenceKind(unitId), runner: spec.runner, exit_code: 0 },
    test_counts: { ...COUNTS },
    observations: structuredClone(options.observations ?? spec.accepted_observations),
  });
  const relativePath = `${RF13_EVIDENCE_ROOT}/${unitId.toLowerCase()}-acceptance.json`;
  const evidence = write(root, relativePath, `${JSON.stringify(receipt, null, 2)}\n`);
  return {
    id: `${unitId.toLowerCase()}-acceptance`,
    kind: specEvidenceKind(unitId),
    scope: "RF13_DIST",
    ...evidence,
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    source_manifest_sha256: source.source_manifest_sha256,
    source_fingerprint_sha256: source.working_tree_sha256,
    test_counts: { ...COUNTS },
  };
}

function receiptLink(tuwId, reference) {
  return {
    tuw_id: tuwId,
    path: reference.path,
    sha256: reference.sha256,
    bytes: reference.bytes,
  };
}

function baselineEvidence(root, source = SOURCE) {
  const historical = write(
    root,
    ".omo/evidence/rf13-final-gate-20260731/rf13-evidence-manifest.json",
    "{\"classification\":\"QA_ONLY\"}\n",
  );
  const state = {
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    source_dirty: source.source_dirty,
    diff_sha256: "5".repeat(64),
    status_sha256: "6".repeat(64),
    manifest_sha256: "7".repeat(64),
    working_tree_sha256: source.working_tree_sha256,
  };
  const captures = ["capture-1", "capture-2"].map((captureId) => {
    const metadata = write(root, `${RF13_EVIDENCE_ROOT}/${captureId}.json`, `${captureId}\n`);
    const raw = Object.fromEntries(["status", "diff", "manifest", "head", "tree"].map((kind) => [
      kind,
      write(root, `${RF13_EVIDENCE_ROOT}/${captureId}.${kind}`, `${captureId}:${kind}\n`),
    ]));
    return {
      capture_id: captureId,
      metadata: { path: metadata.path.split("/").at(-1), bytes: metadata.bytes, sha256: metadata.sha256 },
      raw: Object.fromEntries(Object.entries(raw).map(([key, value]) => [
        key,
        { path: value.path.split("/").at(-1), bytes: value.bytes, sha256: value.sha256 },
      ])),
      source_state: { ...state },
    };
  });
  const producers = SPEC_BY_ID.get("RFD-TUW-001").producer_paths.map((producerPath) => {
    const producer = write(root, producerPath, "export {};\n");
    return { path: producer.path, sha256: producer.sha256 };
  });
  const baseline = write(root, `${RF13_EVIDENCE_ROOT}/baseline-manifest.json`, `${JSON.stringify({
    schema_version: "law-firm-os.rf13-debt-remediation-baseline.v2",
    checkpoint_id: "RFD-TUW-001",
    sealed_source_manifest_sha256: source.source_manifest_sha256,
    producers,
    capture: { first: captures[0], second: captures[1], byte_equivalent: true, files_changed_between_captures: 0 },
    goals: [{ path: "workbook/matter-rf13-maintenance-debt-remediation-plan-2026-07-31.md", sha256: PLAN_SHA256 }],
    historical_rf13: {
      directory: ".omo/evidence/rf13-final-gate-20260731",
      classification: "QA_ONLY",
      distributable: false,
      formal_release_allowed: false,
      canonical_selection: { status: "NONE" },
      files: [{
        path: historical.path.split("/").at(-1),
        role: "rf13-evidence-manifest.json",
        generation: "initial",
        bytes: historical.bytes,
        sha256: historical.sha256,
      }],
    },
    verdict: "PASS_BASELINE_CAPTURED_QA_ONLY",
  }, null, 2)}\n`);
  return {
    id: "rfd-tuw-001-baseline",
    kind: "baseline_capture",
    scope: "HISTORICAL_QA_ONLY",
    ...baseline,
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    source_manifest_sha256: source.source_manifest_sha256,
    source_fingerprint_sha256: source.working_tree_sha256,
    test_counts: { total: 2, passed: 2, failed: 0, skipped: 0 },
  };
}

function canonicalRfd010Evidence(root, source) {
  const receipt = preflightRfd010ReleaseCandidate({
    repoRoot: root,
    expectedSourceSha: source.source_sha,
    expectedSourceTree: source.source_tree,
    version: "0.1.17",
    releaseId: "matter-desktop-v0.1.17",
    tag: "matter-desktop-v0.1.17",
    channel: "formal",
  });
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.checks.release_authorized_branch.status, "PASS");
  const evidence = write(
    root,
    ".omo/evidence/rfd010-release-candidate/current-receipt.json",
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  write(
    root,
    ".omo/evidence/rfd010-release-candidate/current-receipt.json.snapshot.json",
    `${JSON.stringify({
      schema_version: receipt.candidateSnapshot.schema_version,
      source_sha: receipt.candidateSnapshot.source_sha,
      source_tree: receipt.candidateSnapshot.source_tree,
      version: receipt.candidateSnapshot.version,
      channel: receipt.candidateSnapshot.channel,
      relative_root: receipt.candidateSnapshot.relative_root,
      manifest: receipt.candidateSnapshot.manifest,
      manifest_sha256: receipt.candidateSnapshot.manifest_sha256,
      file_count: receipt.candidateSnapshot.file_count,
      read_only: receipt.candidateSnapshot.read_only,
    }, null, 2)}\n`,
  );
  return {
    id: "rfd-tuw-010-release-candidate",
    kind: "rfd010_release_candidate",
    scope: "RF13_DIST",
    ...evidence,
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    source_manifest_sha256: source.source_manifest_sha256,
    source_fingerprint_sha256: source.working_tree_sha256,
    test_counts: { ...COUNTS },
  };
}

function completedManifest(root, manifestSource, {
  baselineSource = manifestSource,
  candidateSource = manifestSource,
} = {}) {
  const manifest = structuredClone(buildRf13ProgressTemplate({
    planSha256: PLAN_SHA256,
    source: manifestSource,
  }));
  const rfd010 = canonicalRfd010Evidence(root, manifestSource);
  const references = new Map();
  for (const unit of manifest.units) {
    if (Number(unit.id.slice(-3)) >= 38) {
      unit.status = new Set(["RFD-TUW-038"]).has(unit.id)
        ? "BLOCKED_BY_ARTIFACT"
        : new Set(["RFD-TUW-041", "RFD-TUW-042"]).has(unit.id)
          ? "BLOCKED_BY_EVIDENCE"
          : "NOT_STARTED";
      unit.evidence = [];
      continue;
    }
    unit.status = "COMPLETE";
    let reference;
    if (unit.id === "RFD-TUW-001") reference = baselineEvidence(root, manifestSource);
    else if (unit.id === "RFD-TUW-010") reference = rfd010;
    else if (unit.id === "RFD-TUW-037") {
      reference = genericEvidence(root, unit.id, (receipt) => receipt, candidateSource);
    } else reference = genericEvidence(root, unit.id, (receipt) => receipt, manifestSource);
    unit.evidence = [reference];
    references.set(unit.id, reference);
  }
  return manifest;
}

function completionAttestation(packetSha256, source) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const now = Date.parse("2026-08-01T00:00:00.000Z");
  const registryBytes = Buffer.from(JSON.stringify({
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-08-01T00:00:00.000Z",
    keys: [{
      key_id: "rf13-test-attestor",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      roles: ["rf13_evidence_attestor"],
      actions: ["lawos-rf13-dist-goal-completion"],
      environments: ["release"],
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_until: "2027-01-01T00:00:00.000Z",
      revoked_at: null,
    }],
  }));
  const approval = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "rf13-test-approval",
    key_id: "rf13-test-attestor",
    role: "rf13_evidence_attestor",
    decision: "approved",
    packet_sha256: packetSha256,
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    action: "lawos-rf13-dist-goal-completion",
    environment: "release",
    signed_at: "2026-08-01T00:00:00.000Z",
    expires_at: "2026-12-31T00:00:00.000Z",
    data_scope: [],
    contact_scope: [],
  };
  const receiptBytes = Buffer.from(JSON.stringify(approval));
  return {
    registryBytes,
    receiptBytes,
    signatureBytes: sign(null, Buffer.from(canonicalizeJson(approval)), privateKey),
    expectedRegistrySha256: digest(registryBytes),
    now,
  };
}

async function preparedCompletionFixture(testContext, completionOptions = {}) {
  const { root, source, baselineSource } = completionRoot(testContext, completionOptions);
  const manifest = completedManifest(root, source, { baselineSource, candidateSource: source });
  let liveSource = source;
  let sourceReadCount = 0;
  const prepared = await prepareMatterRf13GoalValidationSession(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => {
      sourceReadCount += 1;
      return liveSource;
    },
  });
  return {
    root,
    source,
    manifest,
    prepared,
    setLiveSource(value) {
      liveSource = value;
    },
    getSourceReadCount() {
      return sourceReadCount;
    },
  };
}

function assertCode(code) {
  return (error) => {
    assert.equal(error instanceof Rf13ProgressValidationError, true);
    assert.equal(error.code, code);
    return true;
  };
}

function operationalSource(source = SOURCE) {
  return Object.freeze({ sha: source.source_sha, tree: source.source_tree, dirty: source.source_dirty });
}

function schemaReference(reference, schemaVersion) {
  return Object.freeze({ ...reference, schema_version: schemaVersion });
}

function signedOperationalAttestation({
  policy,
  packet,
  source = SOURCE,
  keyId = `${policy.purpose}-key`,
  approvalId = `${policy.purpose}-approval`,
  signedAt = new Date(Date.now() - 60_000).toISOString(),
  expiresAt = new Date(Date.now() + 86_400_000).toISOString(),
  keyOverrides = {},
  receiptOverrides = {},
  signingPrivateKey,
  includePacket = false,
} = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(Date.now() - 120_000).toISOString(),
    keys: [{
      key_id: keyId,
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      roles: [policy.role],
      actions: [policy.action],
      environments: [policy.environment],
      valid_from: new Date(Date.now() - 365 * 86_400_000).toISOString(),
      valid_until: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      revoked_at: null,
      ...keyOverrides,
    }],
  };
  const registryBytes = Buffer.from(JSON.stringify(registry));
  const approval = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: approvalId,
    key_id: keyId,
    role: policy.role,
    decision: "approved",
    packet_sha256: hashRf13OperationalPacket(packet),
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    action: policy.action,
    environment: policy.environment,
    signed_at: signedAt,
    expires_at: expiresAt,
    data_scope: [],
    contact_scope: [],
    ...receiptOverrides,
  };
  const receiptBytes = Buffer.from(JSON.stringify(approval));
  return {
    attestation: {
      registryBytes,
      receiptBytes,
      signatureBytes: sign(
        null,
        Buffer.from(canonicalizeJson(approval)),
        signingPrivateKey ?? privateKey,
      ),
      expectedRegistrySha256: digest(registryBytes),
      ...(includePacket ? { packetBytes: Buffer.from(JSON.stringify(packet)) } : {}),
    },
    approval,
    registry,
    privateKey,
  };
}

function reuseOperationalSigningKey(authority, signingAuthority) {
  const registry = structuredClone(authority.registry);
  registry.keys[0].public_key_spki_pem =
    signingAuthority.registry.keys[0].public_key_spki_pem;
  const registryBytes = Buffer.from(JSON.stringify(registry));
  return {
    ...authority.attestation,
    registryBytes,
    signatureBytes: sign(
      null,
      Buffer.from(canonicalizeJson(authority.approval)),
      signingAuthority.privateKey,
    ),
    expectedRegistrySha256: digest(registryBytes),
  };
}

test("template matches the explicit workbook fixture and derives rather than stores G0-G7", async () => {
  const manifest = cloneTemplate();
  const result = await validateMatterRf13Progress(manifest, {
    expectedPlanSha256: PLAN_SHA256,
    structureOnly: true,
  });

  assert.equal(result.verdict, "PASS_STRUCTURE");
  assert.deepEqual(manifest.units.map(({ id }) => id), SPEC.map(({ id }) => id));
  assert.deepEqual(
    manifest.units.map(({ id, dependencies }) => [id, dependencies]),
    SPEC.map(({ id, dependencies }) => [id, dependencies]),
  );
  assert.equal(manifest.units.every((unit) => unit.status === "NOT_STARTED" && unit.evidence.length === 0), true);
  assert.deepEqual(
    SPEC.map(({ id }) => ({
      id,
      runner: RFD_TUW_CONTRACTS[id].runner,
      producer_paths: [...RFD_TUW_CONTRACTS[id].producer_paths],
      implementation_dependency_paths: [...RFD_TUW_CONTRACTS[id].implementation_dependency_paths],
    })),
    SPEC.map(({ id, runner, producer_paths, implementation_dependency_paths = [] }) => ({
      id,
      runner,
      producer_paths,
      implementation_dependency_paths,
    })),
  );
  assert.equal(Object.hasOwn(manifest, "gates"), false);
  assert.deepEqual(result.gates, {
    G0: "FAIL", G1: "FAIL", G2: "FAIL", G3: "FAIL",
    G4: "FAIL", G5: "FAIL", G6: "FAIL", G7: "FAIL",
  });
});

test("structure-only mode never exposes authoritative completion fields", async () => {
  const manifest = cloneTemplate();
  for (const unit of manifest.units) unit.status = "COMPLETE";
  const result = await validateMatterRf13Progress(manifest, {
    expectedPlanSha256: PLAN_SHA256,
    structureOnly: true,
  });
  assert.equal(result.verdict, "PASS_STRUCTURE");
  assert.equal(result.goal_complete, false);
  assert.equal(result.source_sealed, false);
  assert.equal(result.incomplete_units.length, 42);
  assert.deepEqual(new Set(Object.values(result.gates)), new Set(["FAIL"]));
});

test("shape validator rejects missing, duplicate, reordered dependency, invalid status, and entered gates", async (t) => {
  const cases = [
    ["MISSING_TUW", (value) => value.units.pop()],
    ["DUPLICATE_TUW", (value) => { value.units[41] = structuredClone(value.units[40]); }],
    ["TUW_ORDER_MISMATCH", (value) => { [value.units[0], value.units[1]] = [value.units[1], value.units[0]]; }],
    ["DEPENDENCY_MISMATCH", (value) => value.units[4].dependencies.reverse()],
    ["INVALID_STATUS", (value) => { value.units[0].status = "PASS"; }],
    ["PLAN_HASH_DRIFT", (value) => { value.plan.sha256 = "9".repeat(64); }],
    ["UNKNOWN_KEY", (value) => { value.gates = { G0: "PASS" }; }],
  ];
  for (const [code, mutate] of cases) {
    await t.test(code, async () => {
      const manifest = cloneTemplate();
      mutate(manifest);
      await assert.rejects(
        validateMatterRf13Progress(manifest, { expectedPlanSha256: PLAN_SHA256, structureOnly: true }),
        assertCode(code),
      );
    });
  }
});

test("COMPLETE requires typed evidence and cannot jump an incomplete dependency", async (t) => {
  const missing = cloneTemplate();
  missing.units[0].status = "COMPLETE";
  await assert.rejects(validateMatterRf13Progress(missing, {
    repoRoot: tempRoot(t),
    expectedPlanSha256: PLAN_SHA256,
    currentSource: SOURCE,
  }), assertCode("MISSING_ACCEPTANCE_EVIDENCE"));

  const root = tempRoot(t);
  const impossible = cloneTemplate();
  impossible.units[1].status = "COMPLETE";
  impossible.units[1].evidence = [genericEvidence(root, "RFD-TUW-002")];
  await assert.rejects(validateMatterRf13Progress(impossible, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: SOURCE,
  }), assertCode("IMPOSSIBLE_DEPENDENCY_COMPLETION"));

  const staleSource = cloneTemplate();
  await assert.rejects(validateMatterRf13Progress(staleSource, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: { ...SOURCE, working_tree_sha256: "7".repeat(64) },
  }), assertCode("SOURCE_SNAPSHOT_DRIFT"));
});

test("self-consistent stale receipts cannot complete a dirty or different current source", async (t) => {
  const evidenceSource = Object.freeze({
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    source_manifest_sha256: "c".repeat(64),
    working_tree_sha256: "d".repeat(64),
    source_dirty: false,
  });
  const dirtySource = Object.freeze({
    source_sha: "e".repeat(40),
    source_tree: "f".repeat(40),
    source_manifest_sha256: "1".repeat(64),
    working_tree_sha256: "2".repeat(64),
    source_dirty: true,
  });
  const dirtyRoot = tempRoot(t);
  const dirtyManifest = structuredClone(buildRf13ProgressTemplate({ planSha256: PLAN_SHA256, source: dirtySource }));
  dirtyManifest.units[0].status = "COMPLETE";
  dirtyManifest.units[0].evidence = [baselineEvidence(dirtyRoot, dirtySource)];
  await assert.rejects(validateMatterRf13Progress(dirtyManifest, {
    repoRoot: dirtyRoot,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: dirtySource,
  }), assertCode("UNSEALED_COMPLETION_SOURCE"));

  const differentRoot = tempRoot(t);
  const differentManifest = cloneTemplate();
  differentManifest.units[0].status = "COMPLETE";
  differentManifest.units[0].evidence = [baselineEvidence(differentRoot, evidenceSource)];
  await assert.rejects(validateMatterRf13Progress(differentManifest, {
    repoRoot: differentRoot,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: SOURCE,
    readCurrentSource: async () => SOURCE,
  }), assertCode("SOURCE_SEAL_MISMATCH"));
});

test("current-clean source work still needs trusted attestation and preserves honest operational blocks", async (t) => {
  const { root, source, baselineSource } = completionRoot(t);
  const manifest = completedManifest(root, source, { baselineSource, candidateSource: source });
  const rfd010Reference = manifest.units.find((unit) => unit.id === "RFD-TUW-010").evidence[0];
  const rfd010ReceiptPath = resolve(root, rfd010Reference.path);
  const rfd010ManifestPath = `${rfd010ReceiptPath}.snapshot.json`;
  const originalReceiptBytes = readFileSync(rfd010ReceiptPath);
  const originalManifestBytes = readFileSync(rfd010ManifestPath);
  const acceptedRfd010 = await validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-010" },
    reference: rfd010Reference,
  });
  assert.equal(acceptedRfd010.accepted, true);
  assert.equal(acceptedRfd010.canonical_validator_pass, true);
  rmSync(rfd010ManifestPath);
  const missingRfd010 = await validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-010" },
    reference: rfd010Reference,
  });
  assert.equal(missingRfd010.accepted, false);
  assert.equal(missingRfd010.canonical_validator_pass, false);
  writeFileSync(rfd010ManifestPath, originalManifestBytes);
  const tamperedRfd010 = JSON.parse(originalReceiptBytes);
  tamperedRfd010.observed.candidate_snapshot_file_count += 1;
  const tamperedRfd010Bytes = Buffer.from(`${JSON.stringify(tamperedRfd010, null, 2)}\n`);
  writeFileSync(rfd010ReceiptPath, tamperedRfd010Bytes);
  const tamperedRfd010Result = await validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-010" },
    reference: {
      ...rfd010Reference,
      bytes: tamperedRfd010Bytes.length,
      sha256: digest(tamperedRfd010Bytes),
    },
  });
  assert.equal(tamperedRfd010Result.accepted, false);
  assert.equal(tamperedRfd010Result.canonical_validator_pass, false);
  writeFileSync(rfd010ReceiptPath, originalReceiptBytes);
  let packetSha256;
  await assert.rejects(validateMatterRf13Progress(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => source,
  }), (error) => {
    assertCode("TRUSTED_COMPLETION_ATTESTATION_REQUIRED")(error);
    packetSha256 = error.details.packet_sha256;
    assert.match(packetSha256, /^[0-9a-f]{64}$/u);
    return true;
  });

  const invalidAttestation = completionAttestation(packetSha256, source);
  invalidAttestation.signatureBytes = Buffer.from(invalidAttestation.signatureBytes);
  invalidAttestation.signatureBytes[0] ^= 0xff;
  await assert.rejects(validateMatterRf13Progress(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => source,
    completionAttestation: invalidAttestation,
  }), assertCode("RF13_COMPLETION_ATTESTATION_INVALID"));

  const result = await validateMatterRf13Progress(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => source,
    completionAttestation: completionAttestation(packetSha256, source),
  });
  assert.equal(result.verdict, "INCOMPLETE");
  assert.equal(result.goal_complete, false);
  assert.equal(result.source_sealed, true);
  assert.equal(result.evidence_verified, 37);
  assert.deepEqual(result.incomplete_units, [
    "RFD-TUW-038", "RFD-TUW-039", "RFD-TUW-040", "RFD-TUW-041", "RFD-TUW-042",
  ]);
  assert.deepEqual(result.gates, {
    G0: "PASS", G1: "PASS", G2: "PASS", G3: "PASS",
    G4: "PASS", G5: "PASS", G6: "FAIL", G7: "FAIL",
  });
});

test("source mutation after attestation prevents the final completion verdict", async (t) => {
  const { root, source, baselineSource } = completionRoot(t);
  const manifest = completedManifest(root, source, { baselineSource, candidateSource: source });
  let packetSha256;
  await assert.rejects(validateMatterRf13Progress(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => source,
  }), (error) => {
    packetSha256 = error.details.packet_sha256;
    return error.code === "TRUSTED_COMPLETION_ATTESTATION_REQUIRED";
  });
  let reads = 0;
  await assert.rejects(validateMatterRf13Progress(manifest, {
    repoRoot: root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: source,
    readCurrentSource: async () => {
      reads += 1;
      return reads < 3 ? source : { ...source, working_tree_sha256: "9".repeat(64), source_dirty: true };
    },
    completionAttestation: completionAttestation(packetSha256, source),
  }), assertCode("SOURCE_CHANGED_DURING_VALIDATION"));
});

test("prepared Goal validation consumes only exact canonical packet bytes and one independent attestation", async (t) => {
  const exact = await preparedCompletionFixture(t);
  assert.deepEqual(Object.keys(exact.prepared), [
    "completionPacketBytes", "completionPacketSha256", "sessionCapability",
  ]);
  assert.equal(exact.prepared.outcomes, undefined);
  assert.equal(
    hashRf13Bytes(exact.prepared.completionPacketBytes),
    exact.prepared.completionPacketSha256,
  );
  assert.deepEqual(
    exact.prepared.completionPacketBytes,
    serializeRf13CompletionPacket(JSON.parse(exact.prepared.completionPacketBytes)),
  );
  assert.throws(
    () => JSON.stringify(exact.prepared.sessionCapability),
    assertCode("RF13_PREPARED_SESSION_SERIALIZATION"),
  );
  assert.throws(
    () => structuredClone(exact.prepared.sessionCapability),
    (error) => error?.name === "DataCloneError",
  );
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: {},
    completionPacketBytes: exact.prepared.completionPacketBytes,
    completionAttestation: completionAttestation(exact.prepared.completionPacketSha256, exact.source),
  }), assertCode("RF13_PREPARED_SESSION_REPLAY"));

  rmSync(resolve(exact.root, exact.manifest.units[0].evidence[0].path));
  const exactAttestation = completionAttestation(exact.prepared.completionPacketSha256, exact.source);
  const exactResult = await finalizeMatterRf13GoalValidationSession({
    sessionCapability: exact.prepared.sessionCapability,
    completionPacketBytes: exact.prepared.completionPacketBytes,
    completionAttestation: exactAttestation,
  });
  assert.equal(exactResult.source_sealed, true);
  assert.equal(exactResult.evidence_verified, 37);
  assert.equal(exact.getSourceReadCount(), 5);
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: exact.prepared.sessionCapability,
    completionPacketBytes: exact.prepared.completionPacketBytes,
    completionAttestation: exactAttestation,
  }), assertCode("RF13_PREPARED_SESSION_REPLAY"));

  const changed = await preparedCompletionFixture(t);
  const changedBytes = Buffer.from(changed.prepared.completionPacketBytes);
  changedBytes[changedBytes.length - 1] ^= 1;
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: changed.prepared.sessionCapability,
    completionPacketBytes: changedBytes,
    completionAttestation: completionAttestation(changed.prepared.completionPacketSha256, changed.source),
  }), assertCode("RF13_PREPARED_PACKET_MISMATCH"));

  const reordered = await preparedCompletionFixture(t);
  const reorderedPacket = JSON.parse(reordered.prepared.completionPacketBytes);
  const reorderedBytes = Buffer.from(JSON.stringify(Object.fromEntries(
    Object.entries(reorderedPacket).reverse(),
  )));
  assert.equal(reorderedBytes.equals(reordered.prepared.completionPacketBytes), false);
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: reordered.prepared.sessionCapability,
    completionPacketBytes: reorderedBytes,
    completionAttestation: completionAttestation(reordered.prepared.completionPacketSha256, reordered.source),
  }), assertCode("RF13_PREPARED_PACKET_MISMATCH"));

  const stale = await preparedCompletionFixture(t);
  const staleOrigin = await preparedCompletionFixture(t, {
    usesBabelParser: true,
    declaresBabelParser: true,
  });
  assert.equal(
    staleOrigin.prepared.completionPacketBytes.equals(stale.prepared.completionPacketBytes),
    false,
  );
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: stale.prepared.sessionCapability,
    completionPacketBytes: staleOrigin.prepared.completionPacketBytes,
    completionAttestation: completionAttestation(stale.prepared.completionPacketSha256, stale.source),
  }), assertCode("RF13_PREPARED_PACKET_MISMATCH"));

  const tampered = await preparedCompletionFixture(t);
  const tamperedPacket = JSON.parse(tampered.prepared.completionPacketBytes);
  tamperedPacket.units[0].observations_sha256 = "f".repeat(64);
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: tampered.prepared.sessionCapability,
    completionPacketBytes: serializeRf13CompletionPacket(tamperedPacket),
    completionAttestation: completionAttestation(tampered.prepared.completionPacketSha256, tampered.source),
  }), assertCode("RF13_PREPARED_PACKET_MISMATCH"));

  const drifted = await preparedCompletionFixture(t);
  drifted.setLiveSource({
    ...drifted.source,
    working_tree_sha256: "9".repeat(64),
    source_dirty: true,
  });
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: drifted.prepared.sessionCapability,
    completionPacketBytes: drifted.prepared.completionPacketBytes,
    completionAttestation: completionAttestation(drifted.prepared.completionPacketSha256, drifted.source),
  }), assertCode("SOURCE_CHANGED_DURING_VALIDATION"));

  const attested = await preparedCompletionFixture(t);
  const foreign = await preparedCompletionFixture(t, {
    usesBabelParser: true,
    declaresBabelParser: true,
  });
  const attestation = completionAttestation(attested.prepared.completionPacketSha256, attested.source);
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: foreign.prepared.sessionCapability,
    completionPacketBytes: foreign.prepared.completionPacketBytes,
    completionAttestation: attestation,
  }), assertCode("RF13_COMPLETION_ATTESTATION_INVALID"));
  await finalizeMatterRf13GoalValidationSession({
    sessionCapability: attested.prepared.sessionCapability,
    completionPacketBytes: attested.prepared.completionPacketBytes,
    completionAttestation: attestation,
  });
  const replayed = await prepareMatterRf13GoalValidationSession(attested.manifest, {
    repoRoot: attested.root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: attested.source,
    readCurrentSource: async () => attested.source,
  });
  await assert.rejects(finalizeMatterRf13GoalValidationSession({
    sessionCapability: replayed.sessionCapability,
    completionPacketBytes: replayed.completionPacketBytes,
    completionAttestation: attestation,
  }), assertCode("RF13_COMPLETION_ATTESTATION_REPLAY"));
});

test("completion attestation verifies a detached signature over the exact packet", () => {
  const manifest = {
    goal_id: "RF13-DIST",
    plan: { sha256: PLAN_SHA256 },
    source: {
      head_sha: SOURCE.source_sha,
      tree_sha: SOURCE.source_tree,
      source_manifest_sha256: SOURCE.source_manifest_sha256,
      working_tree_sha256: SOURCE.working_tree_sha256,
      source_dirty: false,
    },
    units: [{ id: "RFD-TUW-014", status: "COMPLETE" }],
  };
  const dependency = {
    path: "scripts/run-formal-macos-package-qa.mjs",
    sha256: "b".repeat(64),
    git_blob_sha1: "c".repeat(40),
  };
  const outcomes = new Map([
    ["RFD-TUW-010", {
      candidate_valid: true,
      canonical_validator_pass: true,
      evidence_sha256: "a".repeat(64),
      producers: [],
      rfd010_release_authority_status: "DEFERRED_EXTERNAL_AUTHORITY",
    }],
    ["RFD-TUW-014", {
      candidate_valid: true,
      evidence_sha256: "d".repeat(64),
      observations: { macos_native_qa: true, windows_native_qa: true },
      producers: [],
      implementation_dependencies: [dependency],
    }],
  ]);
  const packet = buildRf13CompletionPacket({ manifest, outcomes });
  assert.deepEqual(packet.units[0].implementation_dependencies, [dependency]);
  const attestation = completionAttestation(hashRf13CompletionPacket(packet), SOURCE);
  assert.match(validateRf13CompletionAttestation(packet, attestation).approval_receipt_sha256, /^[0-9a-f]{64}$/u);
  const dependencyDrift = structuredClone(packet);
  dependencyDrift.units[0].implementation_dependencies[0].sha256 = "e".repeat(64);
  assert.throws(
    () => validateRf13CompletionAttestation(dependencyDrift, attestation),
    (error) => error.code === "RF13_COMPLETION_ATTESTATION_INVALID",
  );
});

test("RFD-TUW-037 cannot close over an undeclared transitively hoisted parser", async (t) => {
  const missing = completionRoot(t, { usesBabelParser: true });
  await assert.rejects(validateMatterRf13Progress(completedManifest(missing.root, missing.source, {
    baselineSource: missing.baselineSource,
    candidateSource: missing.source,
  }), {
    repoRoot: missing.root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: missing.source,
    readCurrentSource: async () => missing.source,
  }), assertCode("RFD037_PARSER_DEPENDENCY_UNBOUND"));

  const declared = completionRoot(t, { usesBabelParser: true, declaresBabelParser: true });
  await assert.rejects(validateMatterRf13Progress(completedManifest(declared.root, declared.source, {
    baselineSource: declared.baselineSource,
    candidateSource: declared.source,
  }), {
    repoRoot: declared.root,
    expectedPlanSha256: PLAN_SHA256,
    currentSource: declared.source,
    readCurrentSource: async () => declared.source,
  }), assertCode("TRUSTED_COMPLETION_ATTESTATION_REQUIRED"));
});

test("baseline evidence is accepted only as a content-addressed QA_ONLY classification", async (t) => {
  const root = tempRoot(t);
  const reference = baselineEvidence(root);
  const outcome = await validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-001" },
    reference,
    planSha256: PLAN_SHA256,
  });
  assert.equal(outcome.accepted, true);

  const stale = structuredClone(reference);
  stale.scope = "RF13_DIST";
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-001" }, reference: stale, planSha256: PLAN_SHA256,
  }), assertCode("BASELINE_SCOPE_MISMATCH"));
});

test("evidence validation rejects arbitrary PASS, stale scope, hash/source drift, and fabricated native claims", async (t) => {
  const root = tempRoot(t);
  const arbitrary = write(root, `${RF13_EVIDENCE_ROOT}/rfd-tuw-002-arbitrary.txt`, "PASS\n");
  const arbitraryRef = {
    id: "rfd-tuw-002-arbitrary",
    kind: specEvidenceKind("RFD-TUW-002"),
    scope: "RF13_DIST",
    ...arbitrary,
    source_sha: SOURCE.source_sha,
    source_tree: SOURCE.source_tree,
    source_manifest_sha256: SOURCE.source_manifest_sha256,
    source_fingerprint_sha256: SOURCE.working_tree_sha256,
    test_counts: { ...COUNTS },
  };
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-002" }, reference: arbitraryRef, planSha256: PLAN_SHA256,
  }), assertCode("EVIDENCE_JSON_INVALID"));

  const stale = { ...arbitraryRef, scope: "HISTORICAL_QA_ONLY" };
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-002" }, reference: stale, planSha256: PLAN_SHA256,
  }), assertCode("STALE_QA_EVIDENCE"));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-002" },
    reference: { ...arbitraryRef, path: "../outside.json" },
    planSha256: PLAN_SHA256,
  }), assertCode("UNSAFE_PATH"));

  const valid = genericEvidence(root, "RFD-TUW-002");
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-002" },
    reference: { ...valid, sha256: "9".repeat(64) },
    planSha256: PLAN_SHA256,
  }), assertCode("EVIDENCE_HASH_DRIFT"));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-002" },
    reference: { ...valid, source_sha: "8".repeat(40) },
    planSha256: PLAN_SHA256,
  }), assertCode("SOURCE_BINDING_DRIFT"));

  const native = genericEvidence(root, "RFD-TUW-012", (receipt) => ({
    ...receipt,
    scenario: { ...receipt.scenario, runner: "NODE_TEST" },
  }));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-012" }, reference: native, planSha256: PLAN_SHA256,
  }), assertCode("SCENARIO_CONTRACT_MISMATCH"));

  const privateClaim = genericEvidence(root, "RFD-TUW-003", (receipt) => ({
    ...receipt,
    reviewer_email: "fake.person@amic.example",
  }));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-003" }, reference: privateClaim, planSha256: PLAN_SHA256,
  }), assertCode("PRIVATE_OR_SECRET_MATERIAL"));

  const genericSourceSeal = genericEvidence(root, "RFD-TUW-010");
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root, unit: { id: "RFD-TUW-010" }, reference: genericSourceSeal, planSha256: PLAN_SHA256,
  }), assertCode("RFD010_RECEIPT_PATH_MISMATCH"));
});

test("RFD-TUW-014 binds native launchers, internal dependencies, and injection bypass evidence", async (t) => {
  const root = tempRoot(t);
  const missingWindows = genericEvidence(root, "RFD-TUW-014", (receipt) => ({
    ...receipt,
    producers: receipt.producers.filter(({ path }) => !path.includes("windows")),
  }));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-014" },
    reference: missingWindows,
    planSha256: PLAN_SHA256,
  }), assertCode("PRODUCER_SET_MISMATCH"));

  for (const unitId of ["RFD-TUW-012", "RFD-TUW-013", "RFD-TUW-014"]) {
    const directRunnerClaim = genericEvidence(root, unitId, (receipt) => ({
      ...receipt,
      producers: receipt.implementation_dependencies.filter(({ path }) => (
        path.startsWith("scripts/run-formal-") && path.endsWith("-package-qa.mjs")
      )),
    }));
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root,
      unit: { id: unitId },
      reference: directRunnerClaim,
      planSha256: PLAN_SHA256,
    }), assertCode("PRODUCER_SET_MISMATCH"));
  }

  const missingDependencyClaim = genericEvidence(root, "RFD-TUW-014", (receipt) => ({
    ...receipt,
    implementation_dependencies: receipt.implementation_dependencies.slice(0, -1),
  }));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-014" },
    reference: missingDependencyClaim,
    planSha256: PLAN_SHA256,
  }), assertCode("IMPLEMENTATION_DEPENDENCY_SET_MISMATCH"));

  const missingLauncher = genericEvidence(root, "RFD-TUW-014");
  rmSync(resolve(root, "scripts/run-formal-macos-package-qa.sh"));
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-014" },
    reference: missingLauncher,
    planSha256: PLAN_SHA256,
  }), assertCode("EVIDENCE_READ_FAILED"));

  const driftedRunner = genericEvidence(root, "RFD-TUW-014");
  write(root, "scripts/run-formal-windows-package-qa.mjs", "export const drift = true;\n");
  await assert.rejects(validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-014" },
    reference: driftedRunner,
    planSha256: PLAN_SHA256,
  }), assertCode("EVIDENCE_HASH_DRIFT"));

  for (const bypassObservation of [
    "node_options_bypass_rejected",
    "node_path_bypass_rejected",
    "preload_bypass_rejected",
  ]) {
    const bypassClaim = genericEvidence(root, "RFD-TUW-014", (receipt) => ({
      ...receipt,
      observations: { ...receipt.observations, [bypassObservation]: false },
    }));
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root,
      unit: { id: "RFD-TUW-014" },
      reference: bypassClaim,
      planSha256: PLAN_SHA256,
    }), assertCode("OBSERVABLE_MISMATCH"));
  }

  const accepted = genericEvidence(root, "RFD-TUW-014");
  const outcome = await validateRf13EvidenceReference({
    repoRoot: root,
    unit: { id: "RFD-TUW-014" },
    reference: accepted,
    planSha256: PLAN_SHA256,
  });
  assert.equal(outcome.producers.length, 2);
  assert.equal(outcome.implementation_dependencies.length, 4);
});

test("Windows uses native_qa PASS with PASS or BLOCKED_BY_AUTHORITY release semantics", async (t) => {
  const units = cloneTemplate().units.map((unit) => ({ ...unit, status: "COMPLETE" }));
  const pass = new Map(SPEC.map(({ id }) => [id, { accepted: true, source_sealed: true }]));
  pass.set("RFD-TUW-013", {
    accepted: true,
    source_sealed: true,
    native_qa: "PASS",
    windows_release: "PASS",
  });
  assert.deepEqual(deriveRf13Gates(units, pass, { sourceSealed: true }), {
    G0: "PASS", G1: "PASS", G2: "PASS", G3: "PASS",
    G4: "PASS", G5: "PASS", G6: "PASS", G7: "PASS",
  });

  const held = new Map(pass);
  held.set("RFD-TUW-013", {
    accepted: true,
    source_sealed: true,
    native_qa: "PASS",
    windows_release: "BLOCKED_BY_AUTHORITY",
  });
  assert.equal(deriveRf13Gates(units, held, { sourceSealed: true }).G2, "PASS_MACOS_PRIMARY");
  assert.equal(deriveRf13Gates(units, held).G2, "FAIL");

  const root = tempRoot(t);
  for (const oldTerm of ["SIGNED", "HELD_BY_AUTHORITY"]) {
    const reference = genericEvidence(root, "RFD-TUW-013", (receipt) => ({
      ...receipt,
      observations: { ...receipt.observations, windows_release: oldTerm },
    }));
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root,
      unit: { id: "RFD-TUW-013" },
      reference,
      planSha256: PLAN_SHA256,
    }), assertCode("OBSERVABLE_MISMATCH"));
  }
});

function profileMetrics(overrides = {}) {
  const base = {
    monthly_changes: 1,
    operator_minutes_p95: 30,
    desktop_reinstall_count: 0,
    profile_api_reads: { expected: 10, passed: 10 },
    rollback: { minutes: 15, exact_hash_match: true, profile_reads_passed: 10 },
  };
  return {
    ...base,
    ...overrides,
    profile_api_reads: { ...base.profile_api_reads, ...(overrides.profile_api_reads ?? {}) },
    rollback: { ...base.rollback, ...(overrides.rollback ?? {}) },
  };
}

function profileInfrastructureResult({
  kind,
  action,
  generatedAt,
  baselineArtifact,
  targetArtifact,
  baselineManifest,
  targetManifest,
  targetArtifactVersion,
  transitionSha256,
  lineage,
  priorPromoteExecutionAuthorityFields,
}) {
  const value = {
    schema_version: kind === "review"
      ? "law-firm-os.json-postgres-production-reviewed-change-set.v1"
      : "law-firm-os.json-postgres-production-infrastructure-result.v1",
    operation: kind === "review"
      ? "create-profile-artifact-change-set"
      : "execute-profile-artifact-change-set",
    purpose: "profile-artifact-rebind",
    outcome: "PASS",
    source_sha: SOURCE.source_sha,
    source_tree: SOURCE.source_tree,
    profile_artifact_action: action,
    baseline_artifact_sha256: baselineArtifact.sha256,
    baseline_artifact_manifest_sha256: digest(`artifact-manifest:${baselineArtifact.sha256}`),
    baseline_artifact_key: `lawos-production/${SOURCE.source_sha}/${baselineArtifact.sha256}.zip`,
    target_artifact_sha256: targetArtifact.sha256,
    target_artifact_manifest_sha256: digest(`artifact-manifest:${targetArtifact.sha256}`),
    target_artifact_key: `lawos-production/${SOURCE.source_sha}/${targetArtifact.sha256}.zip`,
    baseline_profile_generation_ref: baselineArtifact.generation_ref,
    target_profile_generation_ref: targetArtifact.generation_ref,
    baseline_private_manifest_sha256: baselineManifest.sha256,
    baseline_profile_counts: {
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    target_private_manifest_sha256: targetManifest.sha256,
    target_profile_counts: {
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    target_artifact_version_verified: true,
    target_artifact_version_head_verified_count: 1,
    target_artifact_object_lock_mode: "COMPLIANCE",
    target_artifact_server_side_encryption: "aws:kms",
    target_artifact_kms_key_ref_sha256: "e".repeat(64),
    target_artifact_version: targetArtifactVersion,
    profile_artifact_transition_sha256: transitionSha256,
    baseline_artifact_version: lineage.baseline_artifact_version,
    baseline_execution_packet_sha256: lineage.baseline_execution_packet_sha256,
    target_artifact_upload_packet_sha256: lineage.target_artifact_upload_packet_sha256,
    target_artifact_upload_receipt_sha256: lineage.target_artifact_upload_receipt_sha256,
    previous_runtime_generation: lineage.previous_runtime_generation,
    target_execution_packet_sha256: lineage.target_execution_packet_sha256,
    target_runtime_generation: lineage.target_runtime_generation,
    baseline_approval_id_sha256: lineage.baseline_approval_id_sha256,
    target_approval_id_sha256: lineage.target_approval_id_sha256,
    baseline_owner_trust_registry_sha256: lineage.baseline_owner_trust_registry_sha256,
    target_owner_trust_registry_sha256: lineage.target_owner_trust_registry_sha256,
    target_parameters_sha256: lineage.target_parameters_sha256,
    reviewed_change_set_sha256: digest(`reviewed:${action}:${transitionSha256}`),
    ...(priorPromoteExecutionAuthorityFields ?? {}),
    packet_sha256: lineage.target_execution_packet_sha256,
    approval_receipt_sha256: digest(`approval-receipt:${action}:${kind}`),
    registry_sha256: lineage.target_owner_trust_registry_sha256,
    generated_at: generatedAt,
    aws_mutation_count: 1,
    production_data_write_count: 0,
    production_write_count: 0,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
    ...(kind === "review"
      ? {}
      : {
        production_traffic_enabled: true,
        lambda_eni_bootstrap_enabled: false,
        temporary_eni_allow_count: 0,
      }),
  };
  return {
    ...value,
    result_sha256: jsonPostgresProductionInfrastructureResultSha256(value),
  };
}

function rehashProfileInfrastructureResult(value) {
  value.result_sha256 = jsonPostgresProductionInfrastructureResultSha256(value);
  return value;
}

function profileProductionSmoke({ generatedAt, artifact }) {
  return {
    schema_version: "law-firm-os.profile-production-api-smoke.v1",
    producer: "run-profile-production-api-smoke",
    generated_at: generatedAt,
    verdict: "PASS",
    source: {
      sha: SOURCE.source_sha,
      tree: SOURCE.source_tree,
      api_source_revision: SOURCE.source_sha,
    },
    api_artifact: {
      filename: artifact.filename,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
    },
    profile_photo: {
      generation_verified: true,
      expected_profile_count: 10,
      passed_profile_count: 10,
    },
    profile_reads: {
      expected: 10,
      passed: 10,
      http_200: 10,
      outcome_passed: 10,
      ui_state_populated: 10,
      photo_included: 10,
      png_decoded: 10,
      generation_match: 10,
      content_digest_match: 10,
    },
    boundary: {
      authorized_production_read_only: true,
      health_get_count: 1,
      authenticated_get_count: 10,
      total_get_count: 11,
      api_write_request_count: 0,
      external_mutation_count: 0,
      database_mutation_count: 0,
      aws_control_plane_call_count: 0,
      deployment_count: 0,
      desktop_deploy_count: 0,
      desktop_reinstall_count: 0,
      local_receipt_write_count: 1,
    },
    private_values_emitted: false,
  };
}

function writeOperationalReceipt(root, relativePath, value, expectedSchema) {
  return schemaReference(
    write(root, relativePath, `${JSON.stringify(value, null, 2)}\n`),
    expectedSchema,
  );
}

function priorPromoteSigningMaterial() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const keyId = "profile-prior-promote-attestor-key";
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    keys: [{
      key_id: keyId,
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      roles: [JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE],
      actions: [JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION],
      environments: [JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT],
      valid_from: new Date(Date.now() - 365 * 86_400_000).toISOString(),
      valid_until: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      revoked_at: null,
    }],
  };
  const registryBytes = Buffer.from(JSON.stringify(registry));
  return Object.freeze({
    privateKey,
    keyId,
    fingerprintSha256: digest(publicKey.export({ type: "spki", format: "der" })),
    registryBytes,
    registrySha256: digest(registryBytes),
  });
}

function authenticatePriorPromoteExecution({ receipt, source, signedAt, signing }) {
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const authority = {
    schema_version: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION,
    action: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION,
    environment: JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
    receipt_bytes_sha256: digest(receiptBytes),
    receipt_result_sha256: receipt.result_sha256,
    trust_registry_sha256: signing.registrySha256,
    source_sha: source.source_sha,
    source_tree: source.source_tree,
    signer_key_id: signing.keyId,
    signer_fingerprint_sha256: signing.fingerprintSha256,
    signed_at: signedAt,
  };
  const authorityBytes = Buffer.from(JSON.stringify(authority));
  const signatureBytes = sign(null, Buffer.from(canonicalizeJson(authority)), signing.privateKey);
  return Object.freeze({
    receiptBytes,
    authorityBytes,
    signatureBytes,
    trustRegistryBytes: signing.registryBytes,
    fields: Object.freeze({
      prior_promote_execution_receipt_sha256: receipt.result_sha256,
      prior_promote_execution_receipt_bytes_sha256: digest(receiptBytes),
      prior_promote_execution_receipt_authority_sha256: digest(authorityBytes),
      prior_promote_execution_receipt_signature_sha256: digest(signatureBytes),
      prior_promote_execution_receipt_trust_registry_sha256: signing.registrySha256,
      prior_promote_execution_receipt_signer_key_id: signing.keyId,
      prior_promote_execution_receipt_signer_fingerprint_sha256: signing.fingerprintSha256,
      prior_promote_execution_receipt_authority_signed_at: signedAt,
    }),
  });
}

function profileEvidenceFixture(testContext, {
  metrics = profileMetrics(),
  generatedAt,
  reviewDate,
  decision = "defer_server_file",
  adminGoalReference = null,
  rfd042Source = SOURCE,
  operationApprovalId = "profile-operation-approval",
  operationKeyId = "profile-operation-key",
  decisionApprovalId = "profile-decision-approval",
  decisionKeyId = "profile-decision-key",
  mutateMeasurement = (value) => value,
  mutateNestedReceipts = (value) => value,
  mutateOperationalReferences = (value) => value,
  mutateOperation = (value) => value,
  mutateDecision = (value) => value,
} = {}) {
  const root = tempRoot(testContext);
  const baselineStarted = Date.now() - 4 * 60 * 60 * 1000;
  const measurementGeneratedAt = generatedAt ?? new Date(baselineStarted - 20 * 60 * 1000).toISOString();
  const measurementSignedAt = new Date(Date.parse(measurementGeneratedAt) + 60_000).toISOString();
  const operationGeneratedAt = new Date(baselineStarted + 22 * 60_000).toISOString();
  const operationSignedAt = new Date(baselineStarted + 23 * 60_000).toISOString();
  const decisionSignedAt = new Date(Date.now() - 60_000).toISOString();
  const measurementBody = mutateMeasurement({
    schema_version: RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA,
    producer: "profile-media-production-observer",
    generated_at: measurementGeneratedAt,
    environment: "PRODUCTION",
    source: {
      source_sha: SOURCE.source_sha,
      source_tree: SOURCE.source_tree,
      source_dirty: false,
    },
    metrics,
  });
  const measurement = write(
    root,
    `${RF13_EVIDENCE_ROOT}/fixtures/profile-measurement.json`,
    `${JSON.stringify(measurementBody, null, 2)}\n`,
  );
  const baselineArtifact = {
    filename: "lawos-production-baseline.zip",
    sha256: "b".repeat(64),
    bytes: 4096,
    generation_ref: `profile_generation_${"b".repeat(32)}`,
  };
  const candidateArtifact = {
    filename: "lawos-production-candidate.zip",
    sha256: "a".repeat(64),
    bytes: 4200,
    generation_ref: `profile_generation_${"a".repeat(32)}`,
  };
  const baselineManifest = { sha256: "c".repeat(64), bytes: 1024, profile_count: 10 };
  const candidateManifest = { sha256: "d".repeat(64), bytes: 1088, profile_count: 10 };
  const promoteVersion = "immutable-profile-version-candidate";
  const rollbackVersion = "immutable-profile-version-baseline";
  const promoteTransition = digest("profile-promote-transition");
  const rollbackTransition = digest("profile-rollback-transition");
  const baselineAUploadPacket = digest(`upload-packet:${baselineArtifact.sha256}`);
  const candidateBPacket = digest(`upload-packet:${candidateArtifact.sha256}`);
  const priorPromoteSigning = priorPromoteSigningMaterial();
  const activeOwnerTrustRegistry = priorPromoteSigning.registrySha256;
  const promoteLineage = {
    baseline_artifact_version: rollbackVersion,
    baseline_execution_packet_sha256: baselineAUploadPacket,
    target_artifact_upload_packet_sha256: candidateBPacket,
    target_artifact_upload_receipt_sha256: digest(`upload-receipt:${candidateArtifact.sha256}`),
    previous_runtime_generation: 7,
    target_execution_packet_sha256: candidateBPacket,
    target_runtime_generation: 8,
    baseline_approval_id_sha256: digest("baseline-a-approval"),
    target_approval_id_sha256: digest("candidate-b-approval"),
    baseline_owner_trust_registry_sha256: digest("baseline-owner-trust-registry"),
    target_owner_trust_registry_sha256: activeOwnerTrustRegistry,
    target_parameters_sha256: digest("candidate-b-stack-parameters"),
  };
  const rollbackLineage = {
    baseline_artifact_version: promoteVersion,
    baseline_execution_packet_sha256: promoteLineage.target_execution_packet_sha256,
    target_artifact_upload_packet_sha256: baselineAUploadPacket,
    target_artifact_upload_receipt_sha256: digest(`upload-receipt:${baselineArtifact.sha256}`),
    previous_runtime_generation: promoteLineage.target_runtime_generation,
    target_execution_packet_sha256: digest("restored-a-execution-packet"),
    target_runtime_generation: 9,
    baseline_approval_id_sha256: promoteLineage.target_approval_id_sha256,
    target_approval_id_sha256: digest("restored-a-approval"),
    baseline_owner_trust_registry_sha256: activeOwnerTrustRegistry,
    target_owner_trust_registry_sha256: activeOwnerTrustRegistry,
    target_parameters_sha256: digest("restored-a-stack-parameters"),
  };
  const promoteReview = profileInfrastructureResult({
    kind: "review",
    action: "promote",
    generatedAt: new Date(baselineStarted + 90_000).toISOString(),
    baselineArtifact,
    targetArtifact: candidateArtifact,
    baselineManifest,
    targetManifest: candidateManifest,
    targetArtifactVersion: promoteVersion,
    transitionSha256: promoteTransition,
    lineage: promoteLineage,
  });
  const promoteExecution = profileInfrastructureResult({
    kind: "execution",
    action: "promote",
    generatedAt: new Date(baselineStarted + 150_000).toISOString(),
    baselineArtifact,
    targetArtifact: candidateArtifact,
    baselineManifest,
    targetManifest: candidateManifest,
    targetArtifactVersion: promoteVersion,
    transitionSha256: promoteTransition,
    lineage: promoteLineage,
  });
  const priorPromoteAuthority = authenticatePriorPromoteExecution({
    receipt: promoteExecution,
    source: SOURCE,
    signedAt: new Date(baselineStarted + 180_000).toISOString(),
    signing: priorPromoteSigning,
  });
  const nestedBodies = mutateNestedReceipts({
    promote_review: promoteReview,
    promote_execution: promoteExecution,
    candidate_smoke: profileProductionSmoke({
      generatedAt: new Date(baselineStarted + 270_000).toISOString(),
      artifact: candidateArtifact,
    }),
    rollback_review: profileInfrastructureResult({
      kind: "review",
      action: "rollback",
      generatedAt: new Date(baselineStarted + 330_000).toISOString(),
      baselineArtifact: candidateArtifact,
      targetArtifact: baselineArtifact,
      baselineManifest: candidateManifest,
      targetManifest: baselineManifest,
      targetArtifactVersion: rollbackVersion,
      transitionSha256: rollbackTransition,
      lineage: rollbackLineage,
      priorPromoteExecutionAuthorityFields: priorPromoteAuthority.fields,
    }),
    rollback_execution: profileInfrastructureResult({
      kind: "execution",
      action: "rollback",
      generatedAt: new Date(baselineStarted + 390_000).toISOString(),
      baselineArtifact: candidateArtifact,
      targetArtifact: baselineArtifact,
      baselineManifest: candidateManifest,
      targetManifest: baselineManifest,
      targetArtifactVersion: rollbackVersion,
      transitionSha256: rollbackTransition,
      lineage: rollbackLineage,
      priorPromoteExecutionAuthorityFields: priorPromoteAuthority.fields,
    }),
    restored_smoke: profileProductionSmoke({
      generatedAt: new Date(baselineStarted + 20.5 * 60_000).toISOString(),
      artifact: baselineArtifact,
    }),
  });
  const nestedSchemas = {
    promote_review: "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    promote_execution: "law-firm-os.json-postgres-production-infrastructure-result.v1",
    candidate_smoke: "law-firm-os.profile-production-api-smoke.v1",
    rollback_review: "law-firm-os.json-postgres-production-reviewed-change-set.v1",
    rollback_execution: "law-firm-os.json-postgres-production-infrastructure-result.v1",
    restored_smoke: "law-firm-os.profile-production-api-smoke.v1",
  };
  const nestedReferences = Object.fromEntries(Object.entries(nestedBodies).map(([key, value]) => [
    key,
    writeOperationalReceipt(
      root,
      `${RF13_EVIDENCE_ROOT}/fixtures/profile-${key.replaceAll("_", "-")}.json`,
      value,
      nestedSchemas[key],
    ),
  ]));
  const priorPromoteAuthorityReferences = {
    authority: write(
      root,
      `${RF13_EVIDENCE_ROOT}/fixtures/profile-prior-promote-authority.json`,
      priorPromoteAuthority.authorityBytes,
    ),
    signature: write(
      root,
      `${RF13_EVIDENCE_ROOT}/fixtures/profile-prior-promote-authority.sig`,
      priorPromoteAuthority.signatureBytes,
    ),
    trust_registry: write(
      root,
      `${RF13_EVIDENCE_ROOT}/fixtures/profile-prior-promote-trust-registry.json`,
      priorPromoteAuthority.trustRegistryBytes,
    ),
  };
  const operationalReferences = mutateOperationalReferences(structuredClone(nestedReferences));
  const operationBody = mutateOperation({
    schema_version: RF13_PROFILE_OPERATION_RECEIPT_SCHEMA,
    producer: "profile-media-api-operation",
    generated_at: operationGeneratedAt,
    environment: "PRODUCTION",
    source: {
      source_sha: SOURCE.source_sha,
      source_tree: SOURCE.source_tree,
      source_dirty: false,
    },
    measurement_receipt: measurement,
    artifacts: {
      baseline: baselineArtifact,
      candidate: candidateArtifact,
      restored: { ...baselineArtifact },
    },
    private_manifests: {
      baseline: baselineManifest,
      candidate: candidateManifest,
      restored: { ...baselineManifest },
    },
    operational_receipts: operationalReferences,
    prior_promote_execution_authority: priorPromoteAuthorityReferences,
    deployment_controls: {
      immutable_versioned_object: true,
      candidate_object_version_ref_sha256: digest(promoteVersion),
      restored_object_version_ref_sha256: digest(rollbackVersion),
      at_rest_encryption: "AWS_KMS",
      kms_key_ref_sha256: "e".repeat(64),
      owner_trust_registry_sha256: activeOwnerTrustRegistry,
      reviewed_change_set: true,
      promote_review_receipt_sha256: operationalReferences.promote_review.sha256,
      promote_execution_receipt_sha256: operationalReferences.promote_execution.sha256,
      rollback_review_receipt_sha256: operationalReferences.rollback_review.sha256,
      rollback_execution_receipt_sha256: operationalReferences.rollback_execution.sha256,
      ad_hoc_direct_update: false,
    },
    events: [
      {
        step: "baseline_read",
        started_at: new Date(baselineStarted).toISOString(),
        completed_at: new Date(baselineStarted + 60_000).toISOString(),
        artifact_sha256: baselineArtifact.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
      {
        step: "candidate_deploy",
        started_at: new Date(baselineStarted + 2 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 3 * 60_000).toISOString(),
        from_artifact_sha256: baselineArtifact.sha256,
        to_artifact_sha256: candidateArtifact.sha256,
        review_receipt_sha256: operationalReferences.promote_review.sha256,
        execution_receipt_sha256: operationalReferences.promote_execution.sha256,
      },
      {
        step: "candidate_read",
        started_at: new Date(baselineStarted + 4 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 5 * 60_000).toISOString(),
        artifact_sha256: candidateArtifact.sha256,
        smoke_receipt_sha256: operationalReferences.candidate_smoke.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
      {
        step: "rollback_deploy",
        started_at: new Date(baselineStarted + 6 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 7 * 60_000).toISOString(),
        from_artifact_sha256: candidateArtifact.sha256,
        to_artifact_sha256: baselineArtifact.sha256,
        review_receipt_sha256: operationalReferences.rollback_review.sha256,
        execution_receipt_sha256: operationalReferences.rollback_execution.sha256,
      },
      {
        step: "restored_baseline_read",
        started_at: new Date(baselineStarted + 20 * 60_000).toISOString(),
        completed_at: new Date(baselineStarted + 21 * 60_000).toISOString(),
        artifact_sha256: baselineArtifact.sha256,
        smoke_receipt_sha256: operationalReferences.restored_smoke.sha256,
        profile_reads_expected: 10,
        profile_reads_passed: 10,
      },
    ],
    desktop: { redeploys: 0, reinstalls: 0 },
  });
  const operation = write(
    root,
    `${RF13_EVIDENCE_ROOT}/fixtures/profile-operation.json`,
    `${JSON.stringify(operationBody, null, 2)}\n`,
  );
  const rfd041 = genericEvidence(root, "RFD-TUW-041", (receipt) => receipt, SOURCE, {
    observations: { profile_operation_receipt: operation, measurement_receipt: measurement },
  });
  const decisionBody = mutateDecision({
    schema_version: PROFILE_MEDIA_DECISION_SCHEMA_VERSION,
    status: "DECIDED",
    decision: {
      defer_server_file: decision === "defer_server_file",
      create_admin_goal: decision === "create_admin_goal",
    },
    measurement_receipt: measurement,
    owner_role: "profile_media_product_owner",
    review_date: reviewDate ?? decisionSignedAt.slice(0, 10),
    admin_goal_reference: adminGoalReference,
  });
  const decisionReceipt = write(
    root,
    `${RF13_EVIDENCE_ROOT}/fixtures/profile-decision.json`,
    `${JSON.stringify(decisionBody, null, 2)}\n`,
  );
  const rfd042 = genericEvidence(root, "RFD-TUW-042", (receipt) => receipt, rfd042Source, {
    observations: {
      rfd041_receipt: receiptLink("RFD-TUW-041", rfd041),
      decision_receipt: decisionReceipt,
    },
  });
  const measurementPacketInput = {
    reference: schemaReference(measurement, RF13_PROFILE_MEASUREMENT_RECEIPT_SCHEMA),
    source: operationalSource(SOURCE),
    generatedAt: measurementBody.generated_at,
    metrics: measurementBody.metrics,
  };
  let measurementPacket;
  try {
    measurementPacket = buildRf13ProfileMeasurementPacket(measurementPacketInput);
  } catch {
    measurementPacket = {
      schema_version: RF13_PROFILE_MEASUREMENT_PACKET_SCHEMA,
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.purpose,
      receipt: measurementPacketInput.reference,
      source: measurementPacketInput.source,
      generated_at: measurementPacketInput.generatedAt,
      environment: "PRODUCTION",
      metrics: measurementPacketInput.metrics,
    };
  }
  const measurementAuthority = signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement,
    packet: measurementPacket,
    signedAt: measurementSignedAt,
    keyId: "profile-measurement-key",
    approvalId: "profile-measurement-approval",
    includePacket: true,
  });
  let operationPacket;
  try {
    operationPacket = buildRf13ReceiptAttestationPacket({
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation.purpose,
      reference: schemaReference(operation, operationBody.schema_version),
      source: operationalSource(SOURCE),
    });
  } catch {
    operationPacket = {
      schema_version: RF13_OPERATIONAL_PACKET_SCHEMA,
      purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation.purpose,
      receipt: schemaReference(operation, operationBody.schema_version),
      source: operationalSource(SOURCE),
    };
  }
  const operationAuthority = signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation,
    packet: operationPacket,
    signedAt: operationSignedAt,
    keyId: operationKeyId,
    approvalId: operationApprovalId,
  });
  const decisionPacket = buildRf13ReceiptAttestationPacket({
    purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision.purpose,
    reference: schemaReference(decisionReceipt, decisionBody.schema_version),
    source: operationalSource(rfd042Source),
  });
  const decisionAuthority = signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileDecision,
    packet: decisionPacket,
    source: rfd042Source,
    signedAt: decisionSignedAt,
    keyId: decisionKeyId,
    approvalId: decisionApprovalId,
  });
  const authorities = {
    "RFD-TUW-041": {
      measurementAttestation: measurementAuthority.attestation,
      operationAttestation: operationAuthority.attestation,
      priorPromoteExecutionAuthority: {
        authorityBytes: priorPromoteAuthority.authorityBytes,
        signatureBytes: priorPromoteAuthority.signatureBytes,
        trustRegistryBytes: priorPromoteAuthority.trustRegistryBytes,
      },
    },
    "RFD-TUW-042": {
      decisionAttestation: decisionAuthority.attestation,
    },
  };
  return {
    root,
    measurement,
    operation,
    decisionReceipt,
    rfd041,
    rfd042,
    authorities,
    packets: { measurement: measurementPacket, operation: operationPacket, decision: decisionPacket },
    signed: { measurement: measurementAuthority, operation: operationAuthority, decision: decisionAuthority },
    nested: {
      bodies: nestedBodies,
      references: nestedReferences,
      priorPromoteAuthority,
      priorPromoteAuthorityReferences,
    },
    timeline: { baselineStarted, operationGeneratedAt, decisionSignedAt },
  };
}

test("RFD-TUW-038 through 040 reject caller-authored timing, booleans, text archives, and swapped lineage", async (t) => {
  await t.test("plain-text zip cannot stand in for a canonical cold-start receipt", async (st) => {
    const root = tempRoot(st);
    const fakeZip = write(root, `${RF13_EVIDENCE_ROOT}/fixtures/not-an-archive.zip`, "plain text\n");
    const reference = genericEvidence(root, "RFD-TUW-038", (receipt) => receipt, SOURCE, {
      observations: { cold_start_receipt: fakeZip },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root, unit: { id: "RFD-TUW-038" }, reference, planSha256: PLAN_SHA256,
    }), assertCode("RFD_PERFORMANCE_ARTIFACT_MISMATCH"));
  });

  await t.test("caller timing arrays are outside the closed RFD038 schema", async (st) => {
    const root = tempRoot(st);
    const cold = write(root, `${RF13_EVIDENCE_ROOT}/fixtures/cold.json`, `${JSON.stringify({ schema_version: COLD_START_SCHEMA })}\n`);
    const reference = genericEvidence(root, "RFD-TUW-038", (receipt) => receipt, SOURCE, {
      observations: { cold_start_receipt: cold, cold_start_runs: [1, 2, 3, 4, 5] },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root, unit: { id: "RFD-TUW-038" }, reference, planSha256: PLAN_SHA256,
    }), assertCode("UNKNOWN_KEY"));
  });

  await t.test("canonical-looking JSON still needs the opaque live cold-start capability", async (st) => {
    const root = tempRoot(st);
    const cold = write(root, `${RF13_EVIDENCE_ROOT}/fixtures/cold.json`, `${JSON.stringify({ schema_version: COLD_START_SCHEMA })}\n`);
    const reference = genericEvidence(root, "RFD-TUW-038", (receipt) => receipt, SOURCE, {
      observations: { cold_start_receipt: cold },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root, unit: { id: "RFD-TUW-038" }, reference, planSha256: PLAN_SHA256,
    }), assertCode("RFD038_LIVE_COLD_START_AUTHORITY_REQUIRED"));
  });

  await t.test("a plain object cannot forge the opaque cold-start capability", async (st) => {
    const root = tempRoot(st);
    const cold = write(root, `${RF13_EVIDENCE_ROOT}/fixtures/cold.json`, `${JSON.stringify({ schema_version: COLD_START_SCHEMA })}\n`);
    const reference = genericEvidence(root, "RFD-TUW-038", (receipt) => receipt, SOURCE, {
      observations: { cold_start_receipt: cold },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root,
      unit: { id: "RFD-TUW-038" },
      reference,
      planSha256: PLAN_SHA256,
      operationalAuthorities: {
        "RFD-TUW-038": {
          coldStart: { measurementValidation: {}, receiptBytes: Buffer.from("{}\n") },
        },
      },
    }), assertCode("RFD_COLD_START_RECEIPT_INVALID"));
  });

  for (const [unitId, observations] of [
    ["RFD-TUW-039", {
      ...SPEC_BY_ID.get("RFD-TUW-039").accepted_observations,
      custom_origin_ok: true,
      offline_ok: true,
      restart_ok: true,
    }],
    ["RFD-TUW-040", {
      ...SPEC_BY_ID.get("RFD-TUW-040").accepted_observations,
      improvement_percent: 99,
      runtime_errors: 0,
    }],
  ]) {
    await t.test(`${unitId} rejects hand-authored booleans and percentages`, async (st) => {
      const root = tempRoot(st);
      const reference = genericEvidence(root, unitId, (receipt) => receipt, SOURCE, { observations });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: root, unit: { id: unitId }, reference, planSha256: PLAN_SHA256,
      }), assertCode("UNKNOWN_KEY"));
    });
  }

  await t.test("RFD039 rejects a receipt swapped into the RFD038 lineage slot", async (st) => {
    const root = tempRoot(st);
    const rfd037 = genericEvidence(root, "RFD-TUW-037");
    const placeholder = write(root, `${RF13_EVIDENCE_ROOT}/fixtures/placeholder.json`, "{}\n");
    const reference = genericEvidence(root, "RFD-TUW-039", (receipt) => receipt, SOURCE, {
      observations: {
        dependency_receipts: {
          rfd037: receiptLink("RFD-TUW-037", rfd037),
          rfd038: receiptLink("RFD-TUW-038", rfd037),
        },
        package_qa_receipt: placeholder,
        package_qa_transcript: placeholder,
        parent_baseline_source: evidenceSource(SOURCE),
        changed_paths: ["apps/web/src/App.jsx"],
      },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: root, unit: { id: "RFD-TUW-039" }, reference, planSha256: PLAN_SHA256,
    }), assertCode("RFD_LINEAGE_RECEIPT_SWAPPED"));
  });
});

test("RFD-TUW-040 web-full receipt needs a detached governed attestation bound to the exact bytes", async (t) => {
  const receipt = {
    schema_version: RF13_WEB_FULL_RECEIPT_SCHEMA,
    producer: "rfd040-web-full-navigation-qa",
    generated_at: new Date(Date.now() - 120_000).toISOString(),
    source: {
      source_sha: SOURCE.source_sha,
      source_tree: SOURCE.source_tree,
      source_dirty: false,
    },
    navigation: { full_app_rendered: true, deep_link_verified: true, restart_verified: true },
    diagnostics: { chunk_errors: 0, runtime_errors: 0, blank_screens: 0 },
    test_counts: { total: 3, passed: 3, failed: 0, skipped: 0 },
  };
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const reference = { path: `${RF13_EVIDENCE_ROOT}/fixtures/web-full.json`, sha256: digest(bytes), bytes: bytes.length };
  const packet = buildRf13ReceiptAttestationPacket({
    purpose: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull.purpose,
    reference: schemaReference(reference, RF13_WEB_FULL_RECEIPT_SCHEMA),
    source: operationalSource(SOURCE),
  });
  const valid = signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
    signedAt: new Date(Date.now() - 60_000).toISOString(),
  });
  await assert.rejects(validateWebFullProducerEvidence({
    bytes,
    reference,
    receiptSource: evidenceSource(SOURCE),
  }), (error) => error?.code === "RFD040_WEB_FULL_AUTHORITY_REQUIRED");
  await assert.rejects(validateWebFullProducerEvidence({
    bytes,
    reference,
    receiptSource: evidenceSource(SOURCE),
    attestation: { authoritative: true, receipt_sha256: reference.sha256 },
  }), (error) => error?.code === "RFD040_WEB_FULL_AUTHORITY_INVALID");
  await assert.rejects(validateWebFullProducerEvidence({
    bytes,
    reference,
    receiptSource: evidenceSource(SOURCE),
    attestation: async () => ({ authoritative: true, receipt_sha256: reference.sha256 }),
  }), (error) => error?.code === "RFD040_WEB_FULL_AUTHORITY_INVALID");

  const accepted = await validateWebFullProducerEvidence({
    bytes,
    reference,
    receiptSource: evidenceSource(SOURCE),
    attestation: valid.attestation,
  });
  assert.equal(accepted.receipt.navigation.restart_verified, true);
  assert.equal(accepted.attestation.approval_id, "web_full-approval");

  const invalidAttestations = [];
  const wrongSigningKey = generateKeyPairSync("ed25519").privateKey;
  invalidAttestations.push(["wrong key", signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
    signingPrivateKey: wrongSigningKey,
  }).attestation]);
  for (const [name, receiptOverrides] of [
    ["wrong role", { role: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileMeasurement.role }],
    ["wrong action", { action: RF13_OPERATIONAL_ATTESTATION_POLICIES.profileOperation.action }],
    ["wrong environment", { environment: "staging" }],
    ["wrong source", { source_sha: "9".repeat(40) }],
    ["wrong receipt hash", { packet_sha256: "9".repeat(64) }],
  ]) {
    invalidAttestations.push([name, signedOperationalAttestation({
      policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
      packet,
      receiptOverrides,
    }).attestation]);
  }
  invalidAttestations.push(["expired", signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
    signedAt: new Date(Date.now() - 7_200_000).toISOString(),
    expiresAt: new Date(Date.now() - 3_600_000).toISOString(),
  }).attestation]);
  invalidAttestations.push(["future signed_at", signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
    signedAt: new Date(Date.now() + 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
  }).attestation]);
  invalidAttestations.push(["revoked", signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
    keyOverrides: { revoked_at: new Date(Date.now() - 86_400_000).toISOString() },
  }).attestation]);
  const tampered = signedOperationalAttestation({
    policy: RF13_OPERATIONAL_ATTESTATION_POLICIES.webFull,
    packet,
  }).attestation;
  tampered.receiptBytes = Buffer.from(JSON.stringify({
    ...JSON.parse(tampered.receiptBytes.toString("utf8")),
    approval_id: "tampered-after-signing",
  }));
  invalidAttestations.push(["tampered approval", tampered]);

  for (const [name, attestation] of invalidAttestations) {
    await t.test(name, async () => {
      await assert.rejects(validateWebFullProducerEvidence({
        bytes,
        reference,
        receiptSource: evidenceSource(SOURCE),
        attestation,
      }), (error) => error?.code === "RFD040_WEB_FULL_AUTHORITY_INVALID");
    });
  }

  await t.test("attestation replay against different receipt bytes is rejected", async () => {
    const replayBytes = Buffer.from(`${JSON.stringify({ ...receipt, generated_at: new Date(Date.now() - 90_000).toISOString() })}\n`);
    const replayReference = { ...reference, sha256: digest(replayBytes), bytes: replayBytes.length };
    await assert.rejects(validateWebFullProducerEvidence({
      bytes: replayBytes,
      reference: replayReference,
      receiptSource: evidenceSource(SOURCE),
      attestation: valid.attestation,
    }), (error) => error?.code === "RFD040_WEB_FULL_AUTHORITY_INVALID");
  });
});

test("RFD-TUW-041 binds production metrics and a closed immutable API artifact operation", async (t) => {
  const accepted = profileEvidenceFixture(t);
  const outcome = await validateRf13EvidenceReference({
    repoRoot: accepted.root,
    unit: { id: "RFD-TUW-041" },
    reference: accepted.rfd041,
    planSha256: PLAN_SHA256,
    operationalAuthorities: accepted.authorities,
  });
  assert.equal(outcome.profile_evidence.measurement_policy.environment, "PRODUCTION");
  assert.equal(outcome.profile_evidence.measurement_policy.metrics.profile_api_reads.passed, 10);
  assert.equal(outcome.profile_evidence.profile_operation.receipt.schema_version, RF13_PROFILE_OPERATION_RECEIPT_SCHEMA);
  assert.notEqual(
    outcome.profile_evidence.measurement_policy.attestation.key_id,
    outcome.profile_evidence.profile_operation.attestation.key_id,
  );
  assert.doesNotMatch(
    JSON.stringify(outcome.profile_evidence.profile_operation.receipt),
    /display_name|work_email|employee_id|photo_bytes|data:image/iu,
  );

  await t.test("TEST_ONLY context alone cannot complete RFD041", async (st) => {
    const fixture = profileEvidenceFixture(st);
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: { "RFD-TUW-041": { profileTestContext: {} } },
    }), assertCode("RFD041_PROFILE_MEASUREMENT_AUTHORITY_REQUIRED"));
  });

  await t.test("ordinary acceptedMeasurement object cannot mint the same-process capability", async (st) => {
    const fixture = profileEvidenceFixture(st);
    await assert.rejects(validateProfileOperationEvidence({
      bytes: readFileSync(resolve(fixture.root, fixture.operation.path)),
      reference: fixture.operation,
      measurementReference: fixture.measurement,
      acceptedMeasurement: {
        generated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        metrics: profileMetrics(),
        attestation: { signed_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() },
      },
      receiptSource: evidenceSource(SOURCE),
      attestation: fixture.authorities["RFD-TUW-041"].operationAttestation,
    }), (error) => error?.code === "RFD041_PROFILE_OPERATION_ORDER_INVALID");
  });

  await t.test("an accepted measurement capability cannot be rebound to another receipt", async (st) => {
    const first = profileEvidenceFixture(st);
    const second = profileEvidenceFixture(st, {
      generatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    });
    const acceptedMeasurement = validateProfileMeasurementProducerEvidence({
      bytes: readFileSync(resolve(first.root, first.measurement.path)),
      reference: first.measurement,
      receiptSource: evidenceSource(SOURCE),
      attestation: first.authorities["RFD-TUW-041"].measurementAttestation,
    });
    await assert.rejects(validateProfileOperationEvidence({
      bytes: readFileSync(resolve(second.root, second.operation.path)),
      reference: second.operation,
      measurementReference: second.measurement,
      acceptedMeasurement,
      repoRoot: second.root,
      receiptSource: evidenceSource(SOURCE),
      attestation: second.authorities["RFD-TUW-041"].operationAttestation,
    }), (error) => error?.code === "RFD041_MEASUREMENT_BINDING_MISMATCH");
  });

  await t.test("tampered upstream measurement signature is rejected before operation", async (st) => {
    const fixture = profileEvidenceFixture(st);
    const signature = Buffer.from(fixture.authorities["RFD-TUW-041"].measurementAttestation.signatureBytes);
    signature[0] ^= 0xff;
    fixture.authorities["RFD-TUW-041"].measurementAttestation = {
      ...fixture.authorities["RFD-TUW-041"].measurementAttestation,
      signatureBytes: signature,
    };
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_MEASUREMENT_AUTHORITY_INVALID"));
  });

  await t.test("upstream measurement packet hash drift is rejected before operation", async (st) => {
    const fixture = profileEvidenceFixture(st);
    const packet = JSON.parse(fixture.authorities["RFD-TUW-041"].measurementAttestation.packetBytes.toString("utf8"));
    packet.metrics.monthly_changes += 1;
    fixture.authorities["RFD-TUW-041"].measurementAttestation = {
      ...fixture.authorities["RFD-TUW-041"].measurementAttestation,
      packetBytes: Buffer.from(JSON.stringify(packet)),
    };
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_MEASUREMENT_AUTHORITY_INVALID"));
  });

  await t.test("measurement attestation cannot be replayed as operation authority", async (st) => {
    const fixture = profileEvidenceFixture(st);
    fixture.authorities["RFD-TUW-041"].operationAttestation =
      fixture.authorities["RFD-TUW-041"].measurementAttestation;
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
  });

  for (const [name, options] of [
    ["approval id", { operationApprovalId: "profile-measurement-approval" }],
    ["key id", { operationKeyId: "profile-measurement-key" }],
  ]) {
    await t.test(`${name} cannot be reused across measurement and operation`, async (st) => {
      const fixture = profileEvidenceFixture(st, options);
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
    });
  }

  await t.test("same Ed25519 key under a different key id cannot be reused across measurement and operation", async (st) => {
    const fixture = profileEvidenceFixture(st);
    fixture.authorities["RFD-TUW-041"].operationAttestation =
      reuseOperationalSigningKey(fixture.signed.operation, fixture.signed.measurement);
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
  });

  await t.test("boolean-only measurement authority cannot replace detached signed metrics", async (st) => {
    const fixture = profileEvidenceFixture(st);
    fixture.authorities["RFD-TUW-041"].measurementAttestation = {
      authoritative: true,
      receipt_sha256: fixture.measurement.sha256,
    };
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_MEASUREMENT_AUTHORITY_INVALID"));
  });

  await t.test("missing measurement receipt fails before an operation claim", async (st) => {
    const fixture = profileEvidenceFixture(st);
    rmSync(resolve(fixture.root, fixture.measurement.path));
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("EVIDENCE_READ_FAILED"));
  });

  await t.test("invalid live metrics cannot be promoted by an authoritative boolean", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      metrics: profileMetrics({ profile_api_reads: { passed: 11 } }),
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD_PROFILE_METRICS_INVALID"));
  });

  for (const monthlyChanges of [-1, 1.5]) {
    await t.test(`monthly change count ${monthlyChanges} is not a safe non-negative integer`, async (st) => {
      const fixture = profileEvidenceFixture(st, {
        metrics: profileMetrics({ monthly_changes: monthlyChanges }),
      });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD_PROFILE_METRICS_INVALID"));
    });
  }

  await t.test("operation receipt hash drift is rejected before adapter authority", async (st) => {
    const fixture = profileEvidenceFixture(st);
    write(fixture.root, fixture.operation.path, `${JSON.stringify({ tampered: true })}\n`);
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("EVIDENCE_HASH_DRIFT"));
  });

  await t.test("a missing nested operational receipt cannot be replaced by its signed hash", async (st) => {
    const fixture = profileEvidenceFixture(st);
    rmSync(resolve(fixture.root, fixture.nested.references.promote_execution.path));
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_OPERATION_RECEIPT_INVALID"));
  });

  await t.test("nested operational bytes are re-read after the signed operation is created", async (st) => {
    const fixture = profileEvidenceFixture(st);
    write(fixture.root, fixture.nested.references.candidate_smoke.path, "{\"tampered\":true}\n");
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_OPERATION_RECEIPT_INVALID"));
  });

  await t.test("missing detached prior-promote authority cannot be replaced by signed digest fields", async (st) => {
    const fixture = profileEvidenceFixture(st);
    delete fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority;
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_OPERATION_FAILED"));
  });

  for (const field of ["authorityBytes", "signatureBytes", "trustRegistryBytes"]) {
    await t.test(`tampered prior-promote ${field} is rejected against its signed content reference`, async (st) => {
      const fixture = profileEvidenceFixture(st);
      const bytes = Buffer.from(fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority[field]);
      bytes[0] ^= 0xff;
      fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority = {
        ...fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority,
        [field]: bytes,
      };
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD041_PROFILE_OPERATION_RECEIPT_INVALID"));
    });
  }

  for (const [label, field, value] of [
    ["receipt bytes digest", "prior_promote_execution_receipt_bytes_sha256", "1".repeat(64)],
    ["authority digest", "prior_promote_execution_receipt_authority_sha256", "2".repeat(64)],
    ["signature digest", "prior_promote_execution_receipt_signature_sha256", "3".repeat(64)],
    ["trust registry digest", "prior_promote_execution_receipt_trust_registry_sha256", "4".repeat(64)],
    ["signer key id", "prior_promote_execution_receipt_signer_key_id", "forged-prior-promote-key"],
    ["signer fingerprint", "prior_promote_execution_receipt_signer_fingerprint_sha256", "5".repeat(64)],
    ["authority signed_at", "prior_promote_execution_receipt_authority_signed_at", "2026-07-31T00:00:00.000Z"],
  ]) {
    await t.test(`self-consistent rollback ${label} cannot replace independent prior-promote authority`, async (st) => {
      const fixture = profileEvidenceFixture(st, {
        mutateNestedReceipts(receipts) {
          const next = structuredClone(receipts);
          for (const key of ["rollback_review", "rollback_execution"]) {
            next[key][field] = value;
            rehashProfileInfrastructureResult(next[key]);
          }
          return next;
        },
      });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD041_PROFILE_OPERATION_FAILED"));
    });
  }

  for (const [name, mutateNestedReceipts] of [
    ["nested schema", (value) => {
      const next = structuredClone(value);
      next.candidate_smoke.schema_version = "law-firm-os.profile-production-api-smoke.v0";
      return next;
    }],
    ["nested operation", (value) => {
      const next = structuredClone(value);
      next.promote_review.operation = "execute-profile-artifact-change-set";
      return next;
    }],
    ["nested purpose", (value) => {
      const next = structuredClone(value);
      next.rollback_execution.purpose = "generic-deploy";
      return next;
    }],
    ["nested result digest", (value) => {
      const next = structuredClone(value);
      next.promote_execution.result_sha256 = "0".repeat(64);
      return next;
    }],
    ["nested object-lock mode", (value) => {
      const next = structuredClone(value);
      next.promote_execution.target_artifact_object_lock_mode = "GOVERNANCE";
      rehashProfileInfrastructureResult(next.promote_execution);
      return next;
    }],
    ["nested server-side encryption", (value) => {
      const next = structuredClone(value);
      next.promote_execution.target_artifact_server_side_encryption = "AES256";
      rehashProfileInfrastructureResult(next.promote_execution);
      return next;
    }],
    ["nested KMS key reference", (value) => {
      const next = structuredClone(value);
      next.rollback_execution.target_artifact_kms_key_ref_sha256 = "f".repeat(64);
      rehashProfileInfrastructureResult(next.rollback_execution);
      return next;
    }],
    ["execution reviewed change-set binding", (value) => {
      const next = structuredClone(value);
      next.rollback_execution.reviewed_change_set_sha256 = "1".repeat(64);
      rehashProfileInfrastructureResult(next.rollback_execution);
      return next;
    }],
    ["rollback prior promote lineage", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].prior_promote_execution_receipt_sha256 = "9".repeat(64);
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback original A object version", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].target_artifact_version = "not-the-original-a-version";
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback original A artifact manifest", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].target_artifact_manifest_sha256 = "7".repeat(64);
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback current B execution packet", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].baseline_execution_packet_sha256 = "8".repeat(64);
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback current B runtime generation", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].previous_runtime_generation = 99;
        next[key].target_runtime_generation = 100;
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback reused approval", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].target_approval_id_sha256 = next[key].baseline_approval_id_sha256;
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
    ["rollback owner trust registry drift", (value) => {
      const next = structuredClone(value);
      for (const key of ["rollback_review", "rollback_execution"]) {
        next[key].target_owner_trust_registry_sha256 = "6".repeat(64);
        next[key].registry_sha256 = next[key].target_owner_trust_registry_sha256;
        rehashProfileInfrastructureResult(next[key]);
      }
      return next;
    }],
  ]) {
    await t.test(`${name} cannot be self-asserted inside a signed operation`, async (st) => {
      const fixture = profileEvidenceFixture(st, { mutateNestedReceipts });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), (error) => {
        assert.equal(error instanceof Rf13ProgressValidationError, true);
        assert.match(error.code, /^RFD041_PROFILE_OPERATION_(?:RECEIPT_INVALID|FAILED)$/u);
        return true;
      });
    });
  }

  for (const [name, mutateOperationalReferences] of [
    ["promote and rollback review", (value) => ({
      ...value,
      promote_review: value.rollback_review,
      rollback_review: value.promote_review,
    })],
    ["candidate and restored smoke", (value) => ({
      ...value,
      candidate_smoke: value.restored_smoke,
      restored_smoke: value.candidate_smoke,
    })],
  ]) {
    await t.test(`${name} receipt references cannot be swapped`, async (st) => {
      const fixture = profileEvidenceFixture(st, { mutateOperationalReferences });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD041_PROFILE_OPERATION_FAILED"));
    });
  }

  await t.test("owner-pinned nested bytes work without repo path reopen and reject later byte mutation", async (st) => {
    const fixture = profileEvidenceFixture(st);
    const accepted = await validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    });
    const pinnedOperationalReceipts = Object.fromEntries(Object.entries(
      JSON.parse(readFileSync(resolve(fixture.root, fixture.operation.path), "utf8")).operational_receipts,
    ).map(([key, reference]) => [key, {
      reference,
      bytes: readFileSync(resolve(fixture.root, reference.path)),
    }]));
    const direct = await validateProfileOperationEvidence({
      bytes: readFileSync(resolve(fixture.root, fixture.operation.path)),
      reference: fixture.operation,
      measurementReference: fixture.measurement,
      acceptedMeasurement: accepted.profile_evidence.measurement_policy,
      pinnedOperationalReceipts,
      priorPromoteExecutionAuthority: fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority,
      receiptSource: evidenceSource(SOURCE),
      attestation: fixture.authorities["RFD-TUW-041"].operationAttestation,
    });
    assert.equal(direct.receipt.schema_version, RF13_PROFILE_OPERATION_RECEIPT_SCHEMA);

    const tampered = {
      ...pinnedOperationalReceipts,
      candidate_smoke: {
        ...pinnedOperationalReceipts.candidate_smoke,
        bytes: Buffer.from("{\"tampered\":true}\n"),
      },
    };
    await assert.rejects(validateProfileOperationEvidence({
      bytes: readFileSync(resolve(fixture.root, fixture.operation.path)),
      reference: fixture.operation,
      measurementReference: fixture.measurement,
      acceptedMeasurement: accepted.profile_evidence.measurement_policy,
      pinnedOperationalReceipts: tampered,
      priorPromoteExecutionAuthority: fixture.authorities["RFD-TUW-041"].priorPromoteExecutionAuthority,
      receiptSource: evidenceSource(SOURCE),
      attestation: fixture.authorities["RFD-TUW-041"].operationAttestation,
    }), (error) => error?.code === "RFD041_PROFILE_OPERATION_RECEIPT_INVALID");
  });

  await t.test("measurement evidence cannot carry an individual profile identifier", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      mutateMeasurement(value) { return { ...value, employee_id: "employee_private_fixture" }; },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("PRIVATE_FIELD"));
  });

  await t.test("profile operation cannot predate its accepted production measurement", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      generatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 30_000).toISOString(),
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-041" },
      reference: fixture.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PROFILE_OPERATION_ORDER_INVALID"));
  });

  for (const [name, mutate] of [
    ["old weak v2 schema", (value) => ({ ...value, schema_version: "law-firm-os.profile-media-api-operation.v2" })],
    ["generic encryption self-label", (value) => ({
      ...value,
      deployment_controls: { ...value.deployment_controls, at_rest_encryption: "APPROVED_AT_REST_ENCRYPTION" },
    })],
    ["missing object-version binding", (value) => {
      const next = structuredClone(value);
      delete next.deployment_controls.candidate_object_version_ref_sha256;
      return next;
    }],
    ["rollback artifact drift", (value) => ({
      ...value,
      artifacts: {
        ...value.artifacts,
        restored: { ...value.artifacts.restored, sha256: "9".repeat(64) },
      },
    })],
    ["non-monotonic A/B/A events", (value) => {
      const next = structuredClone(value);
      next.events[2].started_at = next.events[0].started_at;
      return next;
    }],
  ]) {
    await t.test(name, async (st) => {
      const fixture = profileEvidenceFixture(st, { mutateOperation: mutate });
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-041" },
        reference: fixture.rfd041,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), (error) => {
        assert.equal(error instanceof Rf13ProgressValidationError, true);
        assert.match(error.code, /^(?:RFD041_PROFILE_OPERATION_(?:RECEIPT_INVALID|ORDER_INVALID|FAILED)|RFD_OPERATIONAL_RECEIPT_INVALID)$/u);
        return true;
      });
    });
  }
});

test("RFD-TUW-042 recomputes the decision from accepted production metrics", async (t) => {
  const accepted = profileEvidenceFixture(t);
  const outcome = await validateRf13EvidenceReference({
    repoRoot: accepted.root,
    unit: { id: "RFD-TUW-042" },
    reference: accepted.rfd042,
    planSha256: PLAN_SHA256,
    operationalAuthorities: accepted.authorities,
  });
  assert.equal(outcome.profile_evidence.profile_decision.decision, "defer_server_file");
  assert.equal(outcome.profile_evidence.profile_decision.defer_eligible, true);
  assert.equal(outcome.profile_evidence.profile_decision.attestation.approval_id, "profile-decision-approval");

  await t.test("review cannot predate the measurement", async (st) => {
    const fixture = profileEvidenceFixture(st, { reviewDate: "2000-01-01" });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_REVIEW_DATE_MISMATCH"));
  });

  await t.test("review cannot claim a future 2099 decision date", async (st) => {
    const fixture = profileEvidenceFixture(st, { reviewDate: "2099-12-31" });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_REVIEW_DATE_MISMATCH"));
  });

  await t.test("ordinary upstream objects cannot mint decision capabilities", async (st) => {
    const fixture = profileEvidenceFixture(st);
    await assert.rejects(validateProfileDecisionEvidence({
      bytes: readFileSync(resolve(fixture.root, fixture.decisionReceipt.path)),
      reference: fixture.decisionReceipt,
      measurementReference: fixture.measurement,
      repoRoot: fixture.root,
      acceptedMeasurement: { generated_at: new Date().toISOString(), metrics: profileMetrics() },
      acceptedOperation: { receipt: { source: { source_sha: SOURCE.source_sha, source_tree: SOURCE.source_tree, source_dirty: false } } },
      attestation: fixture.authorities["RFD-TUW-042"].decisionAttestation,
    }), (error) => error?.code === "RFD042_ACCEPTED_MEASUREMENT_REQUIRED");
  });

  await t.test("decision cannot combine accepted capabilities from different measurement lineages", async (st) => {
    const first = profileEvidenceFixture(st);
    const second = profileEvidenceFixture(st, {
      generatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    });
    const firstOutcome = await validateRf13EvidenceReference({
      repoRoot: first.root,
      unit: { id: "RFD-TUW-041" },
      reference: first.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: first.authorities,
    });
    const secondOutcome = await validateRf13EvidenceReference({
      repoRoot: second.root,
      unit: { id: "RFD-TUW-041" },
      reference: second.rfd041,
      planSha256: PLAN_SHA256,
      operationalAuthorities: second.authorities,
    });
    await assert.rejects(validateProfileDecisionEvidence({
      bytes: readFileSync(resolve(second.root, second.decisionReceipt.path)),
      reference: second.decisionReceipt,
      measurementReference: second.measurement,
      repoRoot: second.root,
      acceptedMeasurement: firstOutcome.profile_evidence.measurement_policy,
      acceptedOperation: secondOutcome.profile_evidence.profile_operation,
      attestation: second.authorities["RFD-TUW-042"].decisionAttestation,
    }), (error) => error?.code === "RFD042_MEASUREMENT_BINDING_MISMATCH");
  });

  await t.test("operation attestation cannot be replayed as decision authority", async (st) => {
    const fixture = profileEvidenceFixture(st);
    fixture.authorities["RFD-TUW-042"].decisionAttestation =
      fixture.authorities["RFD-TUW-041"].operationAttestation;
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
  });

  await t.test("tampered upstream operation signature blocks the decision", async (st) => {
    const fixture = profileEvidenceFixture(st);
    const signature = Buffer.from(fixture.authorities["RFD-TUW-041"].operationAttestation.signatureBytes);
    signature[0] ^= 0xff;
    fixture.authorities["RFD-TUW-041"].operationAttestation = {
      ...fixture.authorities["RFD-TUW-041"].operationAttestation,
      signatureBytes: signature,
    };
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD041_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
  });

  for (const [name, options] of [
    ["approval id", { decisionApprovalId: "profile-operation-approval" }],
    ["key id", { decisionKeyId: "profile-operation-key" }],
  ]) {
    await t.test(`${name} cannot be reused by operation and decision`, async (st) => {
      const fixture = profileEvidenceFixture(st, options);
      await assert.rejects(validateRf13EvidenceReference({
        repoRoot: fixture.root,
        unit: { id: "RFD-TUW-042" },
        reference: fixture.rfd042,
        planSha256: PLAN_SHA256,
        operationalAuthorities: fixture.authorities,
      }), assertCode("RFD042_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
    });
  }

  await t.test("same Ed25519 key under a different key id cannot be reused by operation and decision", async (st) => {
    const fixture = profileEvidenceFixture(st);
    fixture.authorities["RFD-TUW-042"].decisionAttestation =
      reuseOperationalSigningKey(fixture.signed.decision, fixture.signed.operation);
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_PRODUCTION_PROFILE_AUTHORITY_INVALID"));
  });

  await t.test("RFD042 cannot swap in an RFD041 receipt from another source seal", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      rfd042Source: {
        source_sha: "8".repeat(40),
        source_tree: "7".repeat(40),
        source_manifest_sha256: "6".repeat(64),
        working_tree_sha256: "5".repeat(64),
        source_dirty: false,
      },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_RFD041_SOURCE_MISMATCH"));
  });

  await t.test("eligible metrics cannot be overridden by create_admin_goal", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      decision: "create_admin_goal",
      adminGoalReference: {
        path: "workbook/matter-profile-media-admin-goal-missing.md",
        sha256: "0".repeat(64),
        bytes: 1,
      },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("RFD042_PROFILE_DECISION_MISMATCH"));
  });

  await t.test("ineligible metrics require a real re-readable admin Goal", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      metrics: profileMetrics({ monthly_changes: 2 }),
      decision: "create_admin_goal",
      adminGoalReference: {
        path: "workbook/matter-profile-media-admin-goal-missing.md",
        sha256: "0".repeat(64),
        bytes: 1,
      },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("ADMIN_GOAL_FILE_INVALID"));
  });

  await t.test("forged admin_goal_validated self-attestation is rejected", async (st) => {
    const fixture = profileEvidenceFixture(st, {
      mutateDecision(value) { return { ...value, admin_goal_validated: true }; },
    });
    await assert.rejects(validateRf13EvidenceReference({
      repoRoot: fixture.root,
      unit: { id: "RFD-TUW-042" },
      reference: fixture.rfd042,
      planSha256: PLAN_SHA256,
      operationalAuthorities: fixture.authorities,
    }), assertCode("FIELD_SET_INVALID"));
  });
});

test("CLI is read-only by default, writes only explicit safe output, and redacts hostile input", (t) => {
  const root = tempRoot(t);
  const before = readdirSync(root);
  const template = spawnSync(process.execPath, [SCRIPT, "--template"], { cwd: root, encoding: "utf8" });
  assert.equal(template.status, 0, template.stderr);
  const templateValue = JSON.parse(template.stdout);
  assert.equal(templateValue.units.length, 42);
  const tree = spawnSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: REPO_ROOT, encoding: "utf8" });
  const sourceManifest = spawnSync("git", ["ls-tree", "-r", "-z", "--full-tree", "HEAD"], {
    cwd: REPO_ROOT,
    maxBuffer: 256 * 1024 * 1024,
  });
  assert.equal(tree.status, 0);
  assert.equal(sourceManifest.status, 0);
  assert.equal(templateValue.source.tree_sha, tree.stdout.trim());
  assert.equal(templateValue.source.source_manifest_sha256, digest(sourceManifest.stdout));
  assert.deepEqual(readdirSync(root), before);

  const output = resolve(root, "template.json");
  const explicit = spawnSync(process.execPath, [SCRIPT, "--template", "--output", output], { cwd: root, encoding: "utf8" });
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(JSON.parse(readFileSync(output, "utf8")).units.length, 42);
  const overwrite = spawnSync(process.execPath, [SCRIPT, "--template", "--output", output], { cwd: root, encoding: "utf8" });
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /OUTPUT_WRITE_FAILED/u);

  const structural = spawnSync(process.execPath, [SCRIPT, "--manifest", output, "--structure-only"], { cwd: root, encoding: "utf8" });
  assert.equal(structural.status, 0, structural.stderr);
  assert.equal(JSON.parse(structural.stdout).verdict, "PASS_STRUCTURE");
  const incomplete = spawnSync(process.execPath, [SCRIPT, "--manifest", output], { cwd: root, encoding: "utf8" });
  assert.equal(incomplete.status, 1);
  assert.equal(JSON.parse(incomplete.stdout).verdict, "INCOMPLETE");
  assert.equal(incomplete.stderr, "");

  const marker = "FAKE_SECRET_MARKER_7f3b";
  const hostile = JSON.parse(readFileSync(output, "utf8"));
  hostile[`api_token_${marker}`] = marker;
  const hostilePath = resolve(root, "hostile.json");
  writeFileSync(hostilePath, JSON.stringify(hostile));
  const rejected = spawnSync(process.execPath, [SCRIPT, "--manifest", hostilePath], { cwd: root, encoding: "utf8" });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /SECRET_KEY/u);
  assert.doesNotMatch(`${rejected.stdout}${rejected.stderr}`, new RegExp(marker, "u"));
});
