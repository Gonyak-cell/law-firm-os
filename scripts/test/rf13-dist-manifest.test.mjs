import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  RF13_DIST_CANARY_FIXTURE_SCHEMA,
  assertRf13DistCanaryCapability,
  buildBlockedCanaryTemplate,
  buildBlockedRf13DistManifest,
  evidenceReferenceForFile,
  runRfd018ActualCanary,
  runSyntheticCanaryMonitor,
  validateCanaryReceipt,
  validateRf13DistDeployedApiSidecars,
  validateRf13DistManifest,
  validateRf13DistPrivacyMemberReceipt,
  validateRf13DistRestartSidecar,
  validateRf13DistRollbackSidecar,
} from "../lib/rf13-dist-contract.mjs";
import {
  buildReleaseFixture,
  writeHandwrittenHumanAuthority,
} from "./helpers/rf13-dist-fixture.mjs";
import { assertRf13HumanAuthorityCapability } from "../lib/rf13-dist-authority-contract.mjs";
import { runAuthoritativeRfd018Canary } from "../run-rfd018-canary-monitor.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const SCRIPT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const MANIFEST_SCRIPT = path.join(SCRIPT_ROOT, "validate-rf13-dist-manifest.mjs");
const CANARY_RUNNER = path.join(SCRIPT_ROOT, "run-rfd018-canary-monitor.mjs");
const CANARY_VALIDATOR = path.join(SCRIPT_ROOT, "validate-rfd018-canary-receipt.mjs");
const REPOSITORY_ROOT = path.resolve(SCRIPT_ROOT, "..");

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function tempRepo(testContext) {
  const root = mkdtempSync(path.join(tmpdir(), "rf13-dist-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeJson(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return evidenceReferenceForFile(root, relativePath);
}

function latencyActions() {
  return [
    "home_read",
    "matter_read",
    "people_read",
    "time_entry_read",
    "billing_read",
  ].map((action, index) => ({
    action,
    baseline_median_ms: 100 + index,
    samples_ms: [105, 98, 101, 99, 102],
    recheck_after_minutes: 5,
    recheck_samples_ms: [103, 100, 99, 101, 102],
  }));
}

function monitoring() {
  return {
    duration_minutes: 15,
    five_xx_count: 0,
    timeout_count: 0,
    consecutive_core_read_failures: 0,
    login_failure_count: 0,
    tenant_exposure_count: 0,
    write_integrity_failure_count: 0,
    uncertain_write_result_count: 0,
    signature_or_hash_mismatch_count: 0,
    latency_actions: latencyActions(),
  };
}

function checks(status = "PASS") {
  return {
    isolated_profile_install: status,
    health: status,
    login: status,
    home: status,
    matter: status,
    people: status,
    time_billing: status,
    restart: status,
  };
}

function syntheticFixture({ userCount = 1 } = {}) {
  return {
    schema_version: RF13_DIST_CANARY_FIXTURE_SCHEMA,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    macos_artifact_sha256: "c".repeat(64),
    synthetic: true,
    user_count: userCount,
    observations: Array.from({ length: userCount }, () => checks()),
    monitoring: monitoring(),
    boundary: {
      sanitized: true,
      identities_present: false,
      private_hashes_present: false,
      real_client_data_used: false,
      network_contacted_by_fixture: false,
      mutation_executed_by_fixture: false,
    },
  };
}

function cleanShaReceipt() {
  return {
    verdict: "PASS",
    mode: "current",
    protected_entrypoints: [
      "scripts/build-matter-desktop-mac.mjs",
      "scripts/build-matter-desktop-win.mjs",
      "scripts/build-matter-desktop-win-installer.mjs",
      "scripts/release-matter-desktop-formal.mjs",
    ],
    protected_entrypoint_count: 4,
    formal_bypass_count: 0,
    structural_contracts: [
      "scripts/build-matter-desktop-mac.mjs",
      "scripts/build-matter-desktop-win.mjs",
      "scripts/build-matter-desktop-win-installer.mjs",
      "scripts/release-matter-desktop-formal.mjs",
    ].map((relativePath) => ({
      relative_path: relativePath,
      gate_invocation: "top_level",
      formal_channel_binding: "canonical_channel_policy",
      no_mutation_before_gate: true,
      preflight_max_lines: 120,
    })),
    allowed_refs: [
      "main",
      "integration/forest-v<semver>",
      "release/forest-v<semver>",
      "DETACHED exact SHA",
    ],
    gate: {
      enforced: true,
      verdict: "PASS",
      source_sha: SOURCE_SHA,
      source_branch: "main",
      ignored_evidence_dirty_paths: [],
    },
    source_identity: {
      sha: SOURCE_SHA,
      tree: SOURCE_TREE,
      branch: "main",
      dirty: false,
      dirty_paths: [],
      ignored_generated_evidence_paths: [],
    },
  };
}

function assertCode(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

const isDirectTestModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectTestModule) {

test("RFD-TUW-018 blocked templates are valid schema but never PASS", () => {
  const manifest = buildBlockedRf13DistManifest();
  assert.equal(validateRf13DistManifest(manifest).status, "BLOCKED");
  assert.equal(manifest.status, "BLOCKED");
  assert.equal(manifest.template, true);
  assert.equal(Object.values(manifest.claims).some(Boolean), false);

  const canary = buildBlockedCanaryTemplate();
  assert.equal(validateCanaryReceipt(canary).status, "BLOCKED");
  assert.equal(canary.user_count, 0);
  assert.equal(canary.boundary.network_contacted_by_monitor, false);
});

test("checked-in RFD-TUW-018 evidence templates are BLOCKED and executable as sanitized fixtures", () => {
  const templateRoot = path.join(REPOSITORY_ROOT, "docs/launch/evidence/rfd-tuw-018");
  const manifest = JSON.parse(readFileSync(path.join(templateRoot, "rf13-dist-manifest.blocked.json"), "utf8"));
  const canary = JSON.parse(readFileSync(path.join(templateRoot, "canary-receipt.blocked.json"), "utf8"));
  assert.equal(validateRf13DistManifest(manifest).status, "BLOCKED");
  assert.equal(validateCanaryReceipt(canary).status, "BLOCKED");

  const synthetic = spawnSync(process.execPath, [
    CANARY_RUNNER,
    "--fixture", path.join(templateRoot, "canary-observation.synthetic.json"),
  ], { encoding: "utf8" });
  assert.equal(synthetic.status, 3);
  assert.equal(JSON.parse(synthetic.stdout).status, "BLOCKED");
  assert.equal(synthetic.stderr, "");
});

test("authoritative canary entrypoint rejects caller observations and adapter injection", async () => {
  const bindings = {
    repoRoot: REPOSITORY_ROOT,
    rfd015ReceiptPath: path.join(REPOSITORY_ROOT, "missing-rfd015.json"),
    packageQaCapability: null,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: "c".repeat(64),
    apiEndpointSha256: "d".repeat(64),
  };
  for (const injected of [
    { observations: [checks()] },
    { adapter: { launch() {} } },
  ]) {
    await assert.rejects(
      runAuthoritativeRfd018Canary({ ...bindings, ...injected }),
      (error) => error.code === "INVALID_ARGUMENT",
    );
  }
  await assert.rejects(
    runRfd018ActualCanary({
      restartCapability: null,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      artifactSha256: "c".repeat(64),
      observations: [checks()],
    }),
    (error) => error.code === "SCHEMA_KEYS_MISMATCH",
  );
});

test("authoritative canary entrypoint blocks before launch when live prerequisites are absent", async (testContext) => {
  const root = tempRepo(testContext);
  const result = await runAuthoritativeRfd018Canary({
    repoRoot: root,
    rfd015ReceiptPath: path.join(root, "missing-rfd015.json"),
    packageQaCapability: null,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: "c".repeat(64),
    apiEndpointSha256: "d".repeat(64),
  });
  assert.equal(result.verdict, "BLOCKED_BY_ARTIFACT/AUTHORITY");
  assert.equal(result.blocker, "RFD014_NATIVE_CAPABILITY_REQUIRED");
  assert.equal(result.capability, null);
  assert.equal(result.actual_canary_executed, false);
  assert.equal(result.rollback_trigger_injected, false);
  assert.deepEqual(result.boundary, {
    network_contacted: false,
    mutation_executed: false,
    installed_package_launched: false,
  });
  assert.deepEqual(readdirSync(root), []);
});

test("read-only synthetic canary records one or two anonymous users and remains BLOCKED", () => {
  for (const userCount of [1, 2]) {
    const receipt = runSyntheticCanaryMonitor(syntheticFixture({ userCount }));
    assert.equal(receipt.status, "BLOCKED");
    assert.equal(receipt.user_count, userCount);
    assert.deepEqual(receipt.reason_codes, ["SYNTHETIC_FIXTURE_ONLY"]);
    assert.equal(receipt.boundary.network_contacted_by_monitor, false);
    assert.equal(receipt.boundary.mutation_executed_by_monitor, false);
    assert.equal(receipt.boundary.identities_recorded, false);
    assert.equal(validateCanaryReceipt(receipt).authoritative, false);
  }
});

test("rollback trigger injection is deterministic, sanitized, and cannot produce PASS", () => {
  const receipt = runSyntheticCanaryMonitor(syntheticFixture(), {
    injectTrigger: "CORE_READ_CONSECUTIVE_FAILURE",
  });
  assert.equal(receipt.status, "BLOCKED");
  assert.deepEqual(receipt.rollback_trigger, {
    triggered: true,
    codes: ["CORE_READ_CONSECUTIVE_FAILURE"],
    source: "synthetic_injection",
  });
  assert.equal(receipt.monitoring.consecutive_core_read_failures, 2);
  assert.equal(receipt.reason_codes.includes("ROLLBACK_REQUIRED"), true);
  assert.equal(validateCanaryReceipt(receipt).status, "BLOCKED");
});

test("latency rollback injection applies the five-sample and five-minute rule", () => {
  const receipt = runSyntheticCanaryMonitor(syntheticFixture(), { injectTrigger: "LATENCY_REGRESSION" });
  assert.deepEqual(receipt.rollback_trigger.codes, ["LATENCY_REGRESSION"]);
  assert.equal(receipt.monitoring.latency_actions[0].samples_ms.length, 5);
  assert.equal(receipt.monitoring.latency_actions[0].recheck_after_minutes, 5);
  assert.equal(receipt.status, "BLOCKED");
});

test("uncertain write-result injection is an explicit rollback trigger", () => {
  const receipt = runSyntheticCanaryMonitor(syntheticFixture(), { injectTrigger: "UNCERTAIN_WRITE_RESULT" });
  assert.deepEqual(receipt.rollback_trigger.codes, ["UNCERTAIN_WRITE_RESULT"]);
  assert.equal(receipt.monitoring.uncertain_write_result_count, 1);
  assert.equal(receipt.reason_codes.includes("ROLLBACK_REQUIRED"), true);
  assert.equal(receipt.status, "BLOCKED");
});

test("canary fixture rejects identity fields and secret-like values without echoing them", (testContext) => {
  const root = tempRepo(testContext);
  const fixture = syntheticFixture();
  fixture.observations[0].email = "private-person@example.invalid";
  const fixturePath = path.join(root, "canary.json");
  writeFileSync(fixturePath, JSON.stringify(fixture));
  const result = spawnSync(process.execPath, [CANARY_RUNNER, "--fixture", fixturePath], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SENSITIVE_MATERIAL_REJECTED/u);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /private-person@example\.invalid/u);
});

test("serialized canary PASS, approval-like receipt, and hand-written capability remain non-authoritative", (testContext) => {
  const { root, canaryReceipt, manifest } = buildReleaseFixture(testContext);
  const options = {
    expectedReleaseId: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: canaryReceipt.macos_artifact_sha256,
    expectedReceiptSha256: manifest.gates.canary.receipt.sha256,
    repoRoot: root,
  };
  assertCode(() => validateCanaryReceipt(canaryReceipt, options), "HUMAN_AUTHORITY_REQUIRED");
  const capabilityBindings = {
    receiptSha256: options.expectedReceiptSha256,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: canaryReceipt.macos_artifact_sha256,
    userCount: 2,
  };
  assertCode(
    () => assertRf13DistCanaryCapability({
      schema_version: "law-firm-os.rf13-dist.canary-live-capability.v1",
      receipt_sha256: options.expectedReceiptSha256,
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      artifact_sha256: canaryReceipt.macos_artifact_sha256,
      user_count: 2,
      verdict: "PASS",
      rollback_trigger_injected: true,
      rollback_injection_code: "CORE_READ_CONSECUTIVE_FAILURE",
    }, capabilityBindings),
    "CANARY_LIVE_AUTHORITY_REQUIRED",
  );
  assert.equal(JSON.stringify(canaryReceipt).includes("email"), false);
  assert.equal(JSON.stringify(canaryReceipt).includes("user_id"), false);
});

test("unsigned canary authority and cloned human capability cannot authorize a canary", (testContext) => {
  const { root, canaryReceipt, manifest } = buildReleaseFixture(testContext);
  const authority = JSON.parse(readFileSync(path.join(root, canaryReceipt.evidence.authority_receipt.path), "utf8"));
  unlinkSync(path.join(root, authority.signature.path));
  assertCode(() => validateCanaryReceipt(canaryReceipt, {
    expectedReleaseId: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: canaryReceipt.macos_artifact_sha256,
    expectedReceiptSha256: manifest.gates.canary.receipt.sha256,
    repoRoot: root,
  }), "HUMAN_AUTHORITY_REQUIRED");
  assertCode(() => assertRf13HumanAuthorityCapability(structuredClone({
    capability_type: "rf13-human-authority",
    capability_version: 1,
    test_only: false,
  }), {
    releaseId: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    environment: "canary",
    action: "canary_acceptance",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: [canaryReceipt.macos_artifact_sha256],
    releaseScope: "macos_canary",
    canaryUserCount: 2,
  }), "HUMAN_AUTHORITY_CAPABILITY_INVALID");
});

test("hand-written macOS PASS sidecar and plain-text DMG cannot authorize RF13-DIST", (testContext) => {
  const { root, artifactRoot, manifest, artifacts } = buildReleaseFixture(testContext);
  const dmg = artifacts.find(({ id }) => id === "macos_dmg_image");
  assert.equal(readFileSync(path.join(root, dmg.path), "utf8"), "artifact:macos_dmg_image\n");
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "MACOS_LIVE_AUTHORITY_REQUIRED",
  );
  assertCode(
    () => validateRf13DistManifest(manifest, {
      expectedSourceSha: SOURCE_SHA,
      repoRoot: root,
      _commitAuthorityActions: true,
    }),
    "MACOS_LIVE_AUTHORITY_REQUIRED",
  );
  assert.equal(existsSync(path.join(root, artifactRoot, "evidence/authority-actions")), false);
});

test("structurally consistent Windows PASS still cannot replace live macOS authority", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext, { windowsReleaseStatus: "PASS" });
  assert.equal(manifest.claims.windows_external_distribution_ready, true);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "MACOS_LIVE_AUTHORITY_REQUIRED",
  );
});

test("shared fixture preserves exact source and archive-member overrides before live authority block", (testContext) => {
  const sourceSha = "1".repeat(40);
  const sourceTree = "2".repeat(40);
  const archiveMember = {
    path: "Matter.app/Contents/Resources/app.asar",
    type: "file",
    sha256: digest("custom archive member"),
    bytes: 21,
  };
  const { root, artifactRoot, manifest } = buildReleaseFixture(testContext, {
    sourceSha,
    sourceTree,
    artifactBodies: { macos_zip_archive: "custom archive bytes\n" },
    archiveMembers: { macos_zip_archive: [archiveMember] },
  });

  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: sourceSha, repoRoot: root }),
    "MACOS_LIVE_AUTHORITY_REQUIRED",
  );
  assert.equal(artifactRoot.includes(sourceSha), true);
  assert.equal(manifest.source.tree, sourceTree);
  const privacyMember = manifest.gates.privacy.members.find(({ artifact_id }) => artifact_id === "macos_zip_archive");
  const privacyReceipt = JSON.parse(readFileSync(path.join(root, privacyMember.receipt.path), "utf8"));
  const memberManifest = JSON.parse(readFileSync(path.join(root, privacyReceipt.member_manifest_path), "utf8"));
  assert.deepEqual(memberManifest.members, [archiveMember]);
});

test("Windows release PASS rejects an arbitrary certificate fingerprint", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext, { windowsReleaseStatus: "PASS" });
  const receiptPath = manifest.gates.windows_release.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.approved_certificate_fingerprint_sha256 = "f".repeat(64);
  manifest.gates.windows_release.receipt = writeJson(root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "WINDOWS_SIGNING_AUTHORITY_INVALID",
  );
});

test("Windows release sidecar rejects a non-canonical strict-receipt byte binding", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const receiptPath = manifest.gates.windows_release.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.rfd013_receipt.bytes += 1;
  manifest.gates.windows_release.receipt = writeJson(root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "EVIDENCE_HASH_MISMATCH",
  );
});

test("authority-blocked Windows release cannot claim signing execution", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const receiptPath = manifest.gates.windows_release.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.signing_execution = true;
  manifest.gates.windows_release.receipt = writeJson(root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "WINDOWS_AUTHORITY_BLOCK_INVALID",
  );
});

test("historical dirty internal RF13 receipt is explicitly rejected", () => {
  const internal = JSON.parse(readFileSync(
    path.join(REPOSITORY_ROOT, ".omo/evidence/rf13-final-gate-20260731/rf13-evidence-manifest.json"),
    "utf8",
  ));
  assert.equal(internal.schema_version, "law-firm-os.rf13-final-gate.v1");
  assert.equal(internal.build.release_channel, "internal");
  assert.equal(internal.build.source_dirty, true);
  assertCode(() => validateRf13DistManifest(internal, { expectedSourceSha: SOURCE_SHA }), "HISTORICAL_RF13_REJECTED");
});

test("historical RF13 receipt cannot be substituted for a clean-SHA gate receipt", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const internal = JSON.parse(readFileSync(
    path.join(REPOSITORY_ROOT, ".omo/evidence/rf13-final-gate-20260731/rf13-evidence-manifest.json"),
    "utf8",
  ));
  const receiptPath = manifest.gates.clean_sha.receipt.path;
  manifest.gates.clean_sha.receipt = writeJson(root, receiptPath, internal);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "HISTORICAL_RF13_REJECTED",
  );
});

test("stale source SHA and historical generic artifact paths are rejected", (testContext) => {
  const first = buildReleaseFixture(testContext);
  assertCode(
    () => validateRf13DistManifest(first.manifest, { expectedSourceSha: "e".repeat(40), repoRoot: first.root }),
    "SOURCE_SHA_MISMATCH",
  );

  const second = buildReleaseFixture(testContext);
  second.manifest.artifacts[0].path = "apps/desktop/dist/mac/matter-internal-1.2.3.zip";
  assertCode(
    () => validateRf13DistManifest(second.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: second.root }),
    "HISTORICAL_ARTIFACT_REJECTED",
  );

  const third = buildReleaseFixture(testContext);
  third.manifest.artifacts[0].id = "matter-internal-build-manifest";
  assertCode(
    () => validateRf13DistManifest(third.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: third.root }),
    "HISTORICAL_ARTIFACT_REJECTED",
  );

  const fourth = buildReleaseFixture(testContext);
  const receiptPath = fourth.manifest.gates.macos_release.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(fourth.root, receiptPath), "utf8"));
  receipt.receipt_id = "matter-internal-release-receipt";
  fourth.manifest.gates.macos_release.receipt = writeJson(fourth.root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(fourth.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: fourth.root }),
    "HISTORICAL_RF13_REJECTED",
  );
});

test("final manifest requires an explicit expected SHA and rejects stale gate receipts", (testContext) => {
  const first = buildReleaseFixture(testContext);
  assertCode(
    () => validateRf13DistManifest(first.manifest, { repoRoot: first.root }),
    "EXPECTED_SOURCE_SHA_REQUIRED",
  );

  const second = buildReleaseFixture(testContext);
  const receiptPath = second.manifest.gates.clean_sha.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(second.root, receiptPath), "utf8"));
  receipt.source_identity.sha = "e".repeat(40);
  second.manifest.gates.clean_sha.receipt = writeJson(second.root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(second.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: second.root }),
    "SOURCE_BINDING_MISMATCH",
  );
});

test("clean-SHA source-mode or relocated receipts cannot satisfy RF13-DIST", (testContext) => {
  const first = buildReleaseFixture(testContext);
  const receiptPath = first.manifest.gates.clean_sha.receipt.path;
  const sourceOnlyReceipt = JSON.parse(readFileSync(path.join(first.root, receiptPath), "utf8"));
  sourceOnlyReceipt.mode = "source";
  sourceOnlyReceipt.gate.enforced = false;
  first.manifest.gates.clean_sha.receipt = writeJson(first.root, receiptPath, sourceOnlyReceipt);
  assertCode(
    () => validateRf13DistManifest(first.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: first.root }),
    "CLEAN_SHA_RECEIPT_INVALID",
  );

  const second = buildReleaseFixture(testContext);
  second.manifest.gates.clean_sha.receipt = writeJson(second.root, "docs/launch/evidence/clean-sha-gate.json", cleanShaReceipt());
  assertCode(
    () => validateRf13DistManifest(second.manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: second.root }),
    "CLEAN_SHA_RECEIPT_PATH_INVALID",
  );
});

test("symlinked evidence cannot traverse the exact-SHA evidence root", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const receiptPath = manifest.gates.macos_release.receipt.path;
  const receiptAbsolute = path.join(root, receiptPath);
  const targetAbsolute = path.join(path.dirname(receiptAbsolute), "macos-release-real.json");
  writeFileSync(targetAbsolute, readFileSync(receiptAbsolute));
  rmSync(receiptAbsolute);
  symlinkSync(path.basename(targetAbsolute), receiptAbsolute);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "UNSAFE_EVIDENCE_FILE",
  );
});

test("missing privacy member evidence is rejected", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  manifest.gates.privacy.members.pop();
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRIVACY_MEMBER_EVIDENCE_MISSING",
  );
});

test("staged privacy index must cover the Windows package directory", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const indexPath = manifest.gates.privacy.index.path;
  const index = JSON.parse(readFileSync(path.join(root, indexPath), "utf8"));
  index.members = index.members.filter(({ artifact_id: artifactId }) => artifactId !== "windows_package_directory");
  manifest.gates.privacy.index = writeJson(root, indexPath, index);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRIVACY_INDEX_COVERAGE_MISMATCH",
  );
});

test("mutually consistent hand-written privacy sidecar and capability remain non-authoritative", (testContext) => {
  const { root, artifactRoot, manifest, artifacts } = buildReleaseFixture(testContext);
  const artifact = artifacts.find(({ id }) => id === "macos_build_receipt");
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === artifact.id);
  const receipt = JSON.parse(readFileSync(path.join(root, member.receipt.path), "utf8"));
  const expectedBuildManifestSha256 = artifacts.find(({ id }) => id === "macos_build_manifest").sha256;
  const forgedCapability = {
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    build_manifest_sha256: expectedBuildManifestSha256,
    member_manifest_sha256: null,
    strict_native_qa_receipt_sha256: null,
    inspection_method: "artifact_bytes",
    verdict: "PASS",
  };
  assert.throws(
    () => validateRf13DistPrivacyMemberReceipt(receipt, {
      artifact,
      artifactRoot,
      expectedBuildManifestSha256,
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      repoRoot: root,
      validation: forgedCapability,
    }),
    (error) => error?.code === "LIVE_PRIVACY_VALIDATION_REQUIRED",
  );
});

test("Windows package-directory privacy sidecar and cloned validation remain non-authoritative", (testContext) => {
  const { root, artifactRoot, manifest, artifacts } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "windows_package_directory");
  const receipt = JSON.parse(readFileSync(path.join(root, member.receipt.path), "utf8"));
  const artifact = {
    id: receipt.artifact_id,
    platform: "win32",
    kind: receipt.artifact_kind,
    bytes: receipt.artifact_bytes,
    sha256: receipt.artifact_sha256,
  };
  const expectedBuildManifestSha256 = artifacts.find(({ id }) => id === "windows_build_manifest").sha256;
  assertCode(
    () => validateRf13DistPrivacyMemberReceipt(receipt, {
      artifact,
      artifactRoot,
      expectedBuildManifestSha256,
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      repoRoot: root,
      validation: {
        artifact_id: artifact.id,
        artifact_kind: artifact.kind,
        artifact_sha256: artifact.sha256,
        artifact_bytes: artifact.bytes,
        source_sha: SOURCE_SHA,
        source_tree: SOURCE_TREE,
        build_manifest_sha256: expectedBuildManifestSha256,
        member_manifest_sha256: receipt.member_manifest_sha256,
        verdict: "PASS",
      },
    }),
    "LIVE_PRIVACY_VALIDATION_REQUIRED",
  );
});

test("pending Windows installer builder scan cannot pass without native installed-tree completion", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "windows_installer");
  manifest.gates.privacy.members = manifest.gates.privacy.members.map((entry) => (
    entry === member ? { artifact_id: entry.artifact_id, receipt: entry.builder_receipt } : entry
  ));
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "SCHEMA_KEYS_MISMATCH",
  );
});

test("Windows installed-tree privacy completion must bind the native-QA receipt", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "windows_installer");
  const receiptPath = member.native_receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.native_qa_receipt.sha256 = digest("different native QA receipt");
  member.native_receipt = writeJson(root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "EVIDENCE_HASH_MISMATCH",
  );
});

test("Windows installed-tree privacy completion must bind the builder source payload", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "windows_installer");
  const receiptPath = member.native_receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.source_payload_manifest_sha256 = digest("different source payload");
  member.native_receipt = writeJson(root, receiptPath, receipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRIVACY_INSTALLER_NATIVE_EVIDENCE_INVALID",
  );
});

test("raw archive-byte scan cannot substitute for expanded-member privacy evidence", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "macos_dmg_image");
  const receiptPath = member.receipt.path;
  const receipt = JSON.parse(readFileSync(path.join(root, receiptPath), "utf8"));
  receipt.scan_method = "artifact_bytes";
  receipt.member_manifest_sha256 = null;
  member.receipt = writeJson(root, receiptPath, receipt);
  const indexPath = manifest.gates.privacy.index.path;
  const index = JSON.parse(readFileSync(path.join(root, indexPath), "utf8"));
  const indexed = index.members.find(({ artifact_id: artifactId }) => artifactId === "macos_dmg_image");
  indexed.receipt = {
    ...member.receipt,
    bytes: readFileSync(path.join(root, member.receipt.path)).length,
  };
  manifest.gates.privacy.index = writeJson(root, indexPath, index);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRIVACY_MEMBER_EVIDENCE_INVALID",
  );
});

test("tampered archive member-manifest bytes are rejected", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  const member = manifest.gates.privacy.members.find(({ artifact_id: artifactId }) => artifactId === "macos_zip_archive");
  const receipt = JSON.parse(readFileSync(path.join(root, member.receipt.path), "utf8"));
  const memberManifestPath = path.join(root, receipt.member_manifest_path);
  writeFileSync(memberManifestPath, `${readFileSync(memberManifestPath, "utf8")}\n`);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRIVACY_MEMBER_MANIFEST_INVALID",
  );
});

test("artifact bytes changed after index sealing are rejected", (testContext) => {
  const { root, manifest, artifacts } = buildReleaseFixture(testContext);
  writeFileSync(path.join(root, artifacts[0].path), "tampered\n");
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "RELEASE_INDEX_INVALID",
  );
});

test("production claim without a matching human authority receipt is rejected", (testContext) => {
  const { root, manifest } = buildReleaseFixture(testContext);
  manifest.claims.production_go_live = true;
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "PRODUCTION_AUTHORITY_MISSING",
  );
});

test("macOS-primary production claim rejects approval-like and scope-forged human authority", (testContext) => {
  const { root, manifest, evidenceRoot, artifacts } = buildReleaseFixture(testContext);
  manifest.claims.production_go_live = true;
  manifest.production_authority_receipt = writeHandwrittenHumanAuthority(root, evidenceRoot, {
    receiptFile: "production-authority",
    receiptId: "RFD018-PRODUCTION-AUTHORITY",
    releaseId: `RF13-DIST-1.2.3-${SOURCE_SHA}`,
    environment: "production",
    action: "production_go_live",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    artifactSha256: artifacts.filter(({ platform }) => platform === "darwin").map(({ sha256 }) => sha256),
    releaseScope: "macos_primary",
    canaryUserCount: null,
    nonce: "RFD018-PRODUCTION-NONCE-0001",
  });
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "HUMAN_AUTHORITY_REQUIRED",
  );

  const authorityPath = manifest.production_authority_receipt.path;
  const authority = JSON.parse(readFileSync(path.join(root, authorityPath), "utf8"));
  authority.release_scope = "all_platforms";
  manifest.production_authority_receipt = writeJson(root, authorityPath, authority);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "HUMAN_AUTHORITY_BINDING_MISMATCH",
  );
});

test("hand-written or cloned RFD-TUW-015 capability cannot authorize exact API and login sidecars", (testContext) => {
  const { root, manifest, artifacts } = buildReleaseFixture(testContext);
  const exactReceipt = JSON.parse(readFileSync(path.join(root, manifest.gates.exact_source_api.receipt.path), "utf8"));
  const loginReceipt = JSON.parse(readFileSync(path.join(root, manifest.gates.login.receipt.path), "utf8"));
  const dmg = artifacts.find(({ id }) => id === "macos_dmg_image");
  const expectedArtifactHashes = manifest.gates.exact_source_api.artifact_ids
    .map((id) => artifacts.find((artifact) => artifact.id === id).sha256)
    .sort();
  const options = {
    exactSourceApiReceipt: exactReceipt,
    loginReceipt,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: dmg.sha256,
    expectedArtifactHashes,
  };
  assertCode(
    () => validateRf13DistDeployedApiSidecars(options),
    "DEPLOYED_API_LIVE_AUTHORITY_REQUIRED",
  );
  assertCode(
    () => validateRf13DistDeployedApiSidecars({ ...options, capability: structuredClone(exactReceipt.authority) }),
    "DEPLOYED_API_LIVE_AUTHORITY_REQUIRED",
  );
});

test("hand-written restart PASS sidecar and cloned RFD-TUW-016 capability remain non-authoritative", (testContext) => {
  const { root, manifest, artifacts } = buildReleaseFixture(testContext);
  const receipt = JSON.parse(readFileSync(path.join(root, manifest.gates.restart.receipt.path), "utf8"));
  const deployedReceipt = JSON.parse(readFileSync(path.join(root, manifest.gates.exact_source_api.receipt.path), "utf8"));
  const expectedArtifactHashes = manifest.gates.restart.artifact_ids
    .map((id) => artifacts.find((artifact) => artifact.id === id).sha256)
    .sort();
  const options = {
    receipt,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedArtifactSha256: artifacts.find(({ id }) => id === "macos_dmg_image").sha256,
    expectedArtifactHashes,
    expectedDeployedApiAuthority: deployedReceipt.authority,
  };
  assertCode(() => validateRf13DistRestartSidecar(options), "RESTART_LIVE_AUTHORITY_REQUIRED");
  assertCode(
    () => validateRf13DistRestartSidecar({ ...options, capability: structuredClone(receipt.authority) }),
    "RESTART_LIVE_AUTHORITY_REQUIRED",
  );
});

test("hand-written rollback PASS sidecar and cloned finalization cannot authorize RF13-DIST", (testContext) => {
  const { root, manifest, artifacts } = buildReleaseFixture(testContext);
  const receipt = JSON.parse(readFileSync(path.join(root, manifest.gates.rollback.receipt.path), "utf8"));
  const expectedArtifactHashes = manifest.gates.rollback.artifact_ids
    .map((id) => artifacts.find((artifact) => artifact.id === id).sha256)
    .sort();
  assertCode(
    () => validateRf13DistRollbackSidecar({
      receipt,
      validation: {
        verdict: "PASS",
        authoritative: true,
        current_b_source_sha: SOURCE_SHA,
        current_b_source_tree: SOURCE_TREE,
        current_b_artifact_sha256: expectedArtifactHashes,
      },
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      expectedArtifactHashes,
    }),
    "MATTER_ROLLBACK_LIVE_AUTHORITY_REQUIRED",
  );
});

test("synthetic canary receipt cannot satisfy the final RF13-DIST canary gate", (testContext) => {
  const { root, manifest, evidenceRoot, artifacts } = buildReleaseFixture(testContext);
  const macosDmg = artifacts.find(({ id }) => id === "macos_dmg_image");
  const fixture = syntheticFixture();
  fixture.macos_artifact_sha256 = macosDmg.sha256;
  const syntheticReceipt = runSyntheticCanaryMonitor(fixture);
  manifest.gates.canary.receipt = writeJson(root, `${evidenceRoot}/synthetic-canary.json`, syntheticReceipt);
  assertCode(
    () => validateRf13DistManifest(manifest, { expectedSourceSha: SOURCE_SHA, repoRoot: root }),
    "CANARY_GATE_NOT_PASSING",
  );
});

test("CLI contracts keep templates and synthetic runs non-PASS and write no files", (testContext) => {
  const root = tempRepo(testContext);
  const before = readFileSync(new URL(import.meta.url), "utf8").length;
  const manifestTemplate = spawnSync(process.execPath, [MANIFEST_SCRIPT, "--template"], { cwd: root, encoding: "utf8" });
  assert.equal(manifestTemplate.status, 3);
  assert.equal(JSON.parse(manifestTemplate.stdout).status, "BLOCKED");
  assert.equal(manifestTemplate.stderr, "");

  const canaryTemplate = spawnSync(process.execPath, [CANARY_RUNNER], { cwd: root, encoding: "utf8" });
  assert.equal(canaryTemplate.status, 3);
  assert.equal(JSON.parse(canaryTemplate.stdout).status, "BLOCKED");
  assert.equal(canaryTemplate.stderr, "");

  const receiptPath = path.join(root, "blocked-canary.json");
  writeFileSync(receiptPath, canaryTemplate.stdout);
  const canaryValidation = spawnSync(process.execPath, [
    CANARY_VALIDATOR,
    "--receipt", receiptPath,
    "--source-sha", "0".repeat(40),
    "--source-tree", "0".repeat(40),
    "--artifact-sha256", "0".repeat(64),
    "--repo-root", root,
  ], { cwd: root, encoding: "utf8" });
  assert.equal(canaryValidation.status, 3);
  assert.equal(JSON.parse(canaryValidation.stdout).verdict, "BLOCKED");

  const release = buildReleaseFixture(testContext);
  const finalManifestPath = path.join(release.root, "rf13-dist-final.json");
  writeFileSync(finalManifestPath, `${JSON.stringify(release.manifest, null, 2)}\n`);
  const fileOnlyFinal = spawnSync(process.execPath, [
    MANIFEST_SCRIPT,
    "--manifest", finalManifestPath,
    "--source-sha", SOURCE_SHA,
    "--repo-root", release.root,
  ], { cwd: release.root, encoding: "utf8" });
  assert.equal(fileOnlyFinal.status, 3);
  assert.equal(fileOnlyFinal.stderr, "");
  assert.equal(JSON.parse(fileOnlyFinal.stdout).verdict, "BLOCKED");
  assert.notEqual(JSON.parse(fileOnlyFinal.stdout).code, undefined);
  assert.equal(readFileSync(new URL(import.meta.url), "utf8").length, before);
});
}
