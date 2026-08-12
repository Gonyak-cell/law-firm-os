import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { validateExternalReleaseReadiness } from "../validate-external-release-readiness.mjs";
import {
  EXTERNAL_RELEASE_RECEIPT_SCHEMA,
  EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
  EXTERNAL_PILOT_DECISION_SCHEMA,
  TENANT_CONFIG_SCHEMA,
  VERIFICATION_CLOSURE_SCHEMA,
  WINDOWS_EXTERNAL_PILOT_BLOCKER,
  prepareExternalPilotBundle,
  validateExternalPilotDecision,
  validateExternalPilotTenantConfig,
} from "../lib/matter-desktop-external-pilot.mjs";
import {
  DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  desktopReleaseArtifactRelativeRoot,
  validateDesktopReleaseArtifactIndex,
} from "../lib/matter-desktop-release-paths.mjs";
import {
  createDesktopBuildManifest,
  serializeDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";
import { verifyExternalPilotBundle } from "../verify-matter-desktop-external-pilot-bundle.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const NOW = Date.parse("2026-08-12T02:00:00.000Z");
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const LAWOS_TENANT_ID = "lawos-firm-a";
const ENTRA_TENANT_ID = "11111111-1111-4111-8111-111111111111";

process.env.NODE_ENV = "test";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function currentVerificationClosure() {
  const nodeExecutable = realpathSync(process.execPath);
  const digest = (relativePath) => sha256(readFileSync(join(ROOT, relativePath)));
  return {
    schema_version: VERIFICATION_CLOSURE_SCHEMA,
    launcher_sha256: digest("scripts/run-trusted-matter-desktop-external-pilot.sh"),
    node_executable: nodeExecutable,
    node_sha256: sha256(readFileSync(nodeExecutable)),
    prepare_cli_sha256: digest("scripts/prepare-matter-desktop-external-pilot.mjs"),
    generator_sha256: digest("scripts/lib/matter-desktop-external-pilot.mjs"),
    verifier_sha256: digest("scripts/verify-matter-desktop-external-pilot-bundle.mjs"),
    trust_resolver_sha256: digest("scripts/lib/matter-desktop-external-pilot-trust.mjs"),
    trust_helper_sha256: digest("scripts/lib/external-release-trust.mjs"),
    updates_sha256: digest("apps/desktop/src/main/updates.js"),
    release_paths_sha256: digest("scripts/lib/matter-desktop-release-paths.mjs"),
    provenance_sha256: digest("scripts/lib/matter-desktop-provenance.mjs"),
  };
}

function launcherArguments(closure) {
  return [
    "--expected-launcher-sha256", closure.launcher_sha256,
    "--node-executable", closure.node_executable,
    "--expected-node-sha256", closure.node_sha256,
    "--expected-prepare-cli-sha256", closure.prepare_cli_sha256,
    "--expected-generator-sha256", closure.generator_sha256,
    "--expected-verifier-sha256", closure.verifier_sha256,
    "--expected-trust-resolver-sha256", closure.trust_resolver_sha256,
    "--expected-trust-helper-sha256", closure.trust_helper_sha256,
    "--expected-updates-sha256", closure.updates_sha256,
    "--expected-release-paths-sha256", closure.release_paths_sha256,
    "--expected-provenance-sha256", closure.provenance_sha256,
  ];
}

function bindingSha256({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }) {
  return sha256(Buffer.from(JSON.stringify({
    pilot_id,
    lawos_tenant_id,
    entra_tenant_id,
    source_sha,
    source_tree,
    version,
  }), "utf8"));
}

function write(root, relativePath, body, mode) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body, mode == null ? undefined : { mode });
  return target;
}

function writeSignedJson(root, relativePath, value, privateKey) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const path = write(root, relativePath, bytes);
  const signatureBytes = sign(null, bytes, privateKey);
  const signaturePath = write(root, `${relativePath}.sig`, signatureBytes);
  return {
    path: relativePath,
    sha256: sha256(bytes),
    signature_ref: {
      path: `${relativePath}.sig`,
      sha256: sha256(signatureBytes),
    },
    absolutePath: path,
    absoluteSignaturePath: signaturePath,
  };
}

function artifact(indexRoot, root, id, suffix, kind, body) {
  write(root, suffix, body);
  return {
    id,
    path: `${indexRoot}/${suffix}`,
    platform: "darwin",
    kind,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
  };
}

function buildReceipt({ version, buildManifest, buildManifestSha256 }) {
  return `# macOS formal build receipt

App ID: \`com.amic.matter.desktop\`
Version: \`${version}\`
Channel: \`formal\`
Build manifest SHA-256: \`${buildManifestSha256}\`
Source SHA: \`${SOURCE_SHA}\`
Source tree: \`${SOURCE_TREE}\`
Source dirty: \`false\`
Renderer SHA-256: \`${buildManifest.renderer.sha256}\`
Renderer files: \`${buildManifest.renderer.file_count}\`
Built at: \`${buildManifest.built_at}\`

- Developer ID signing: applied
- requested signing mode: developer-id
- resolved signing identity: Developer ID Application: Test Release (TESTTEAM123)
- codesign verify: pass
- strict codesign verify: pass
- gatekeeper assess: pass
- public distribution approval: not claimed
- notarization requested: true
- notarization credential source: present
- notarization state: submitted_and_accepted_by_notarytool
- DMG codesign verify: pass
- DMG notarization state: submitted_and_accepted_by_notarytool
- DMG stapler validate: pass
- DMG Gatekeeper assess: pass
- DMG image verify: pass
`;
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "matter-external-pilot-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const desktopPackage = JSON.parse(readFileSync(join(ROOT, "apps/desktop/package.json"), "utf8"));
  const packageLock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"));
  const version = desktopPackage.version;
  const renderer = {
    sha256: "c".repeat(64),
    file_count: 2,
    algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
  };
  const buildManifestValue = createDesktopBuildManifest({
    version,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer,
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    builtAt: "2026-08-12T01:00:00.000Z",
  });
  const buildManifest = serializeDesktopBuildManifest(buildManifestValue);
  const formalRoot = join(root, "formal");
  mkdirSync(formalRoot);
  const indexRoot = desktopReleaseArtifactRelativeRoot({
    version,
    sourceSha: SOURCE_SHA,
    channel: "formal",
  });
  const artifacts = [
    artifact(indexRoot, formalRoot, "macos_zip_archive", "mac/matter.zip", "zip_archive", "exact-notarized-zip-bytes"),
    artifact(indexRoot, formalRoot, "macos_dmg_image", "mac/matter.dmg", "dmg_image", "exact-notarized-dmg-bytes"),
    artifact(indexRoot, formalRoot, "macos_build_manifest", "mac/matter-build-manifest.json", "build_manifest", buildManifest),
    artifact(indexRoot, formalRoot, "macos_build_receipt", "receipts/macos-build.md", "receipt", buildReceipt({
      version,
      buildManifest: buildManifestValue,
      buildManifestSha256: sha256(buildManifest),
    })),
  ];
  const index = validateDesktopReleaseArtifactIndex({
    schema_version: DESKTOP_RELEASE_ARTIFACT_SCHEMA,
    version,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    source_dirty: false,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    artifact_root: indexRoot,
    renderer,
    generated_at: "2026-08-12T01:00:00.000Z",
    generic_build_paths_are_release_truth: false,
    public_release_claim: false,
    production_go_live_claim: false,
    artifacts,
  });
  const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  write(formalRoot, "artifact-index.json", indexBytes);
  write(formalRoot, "checksums.sha256", artifacts.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n") + "\n");

  const electronDist = join(root, "electron-dist");
  write(electronDist, "version", `${packageLock.packages["node_modules/electron"].version}\n`);
  write(electronDist, "LICENSE", "Copyright (c) Electron contributors\nMIT license fixture\n");
  write(electronDist, "LICENSES.chromium.html", "<html><body>Chromium license fixture</body></html>\n");
  const unpdfLicense = write(root, "unpdf-LICENSE", "Copyright (c) 2023-PRESENT Johann Schopplich\nMIT license fixture\n");

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const ownerKeyPair = generateKeyPairSync("ed25519");
  const privateKeyPath = write(
    root,
    "private/release-key.pem",
    privateKey.export({ type: "pkcs8", format: "pem" }),
    0o600,
  );
  chmodSync(privateKeyPath, 0o600);
  const publicKeySha256 = sha256(publicKey.export({ type: "spki", format: "der" }));
  const tenantConfig = {
    schema_version: TENANT_CONFIG_SCHEMA,
    pilot_id: "firm-a-2026-pilot",
    firm_id: "firm-a",
    lawos_tenant_id: LAWOS_TENANT_ID,
    entra_tenant_id: ENTRA_TENANT_ID,
    runtime_endpoint: "https://runtime.firm-a.example.invalid",
    issued_at: "2026-08-12T01:30:00.000Z",
    expires_at: "2026-09-01T00:00:00.000Z",
  };
  const tenantConfigBytes = Buffer.from(`${JSON.stringify(tenantConfig, null, 2)}\n`);
  const tenantConfigPath = write(root, "inputs/tenant-config.json", tenantConfigBytes);
  const verificationClosure = currentVerificationClosure();
  const decisionBase = {
    schema_version: EXTERNAL_PILOT_DECISION_SCHEMA,
    pilot_id: tenantConfig.pilot_id,
    firm_id: tenantConfig.firm_id,
    lawos_tenant_id: tenantConfig.lawos_tenant_id,
    entra_tenant_id: tenantConfig.entra_tenant_id,
    distribution_channel: "external-pilot",
    app_identity: {
      strategy: "reuse-formal-notarized-candidate",
      app_id: "com.amic.matter.desktop",
    },
    formal_candidate: {
      version,
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      artifact_index_sha256: sha256(indexBytes),
      macos_zip_sha256: artifacts[0].sha256,
      macos_dmg_sha256: artifacts[1].sha256,
      package_lock_sha256: sha256(readFileSync(join(ROOT, "package-lock.json"))),
      desktop_package_sha256: sha256(readFileSync(join(ROOT, "apps/desktop/package.json"))),
    },
    tenant_configuration: { sha256: sha256(tenantConfigBytes) },
    signing: {
      algorithm: "ed25519",
      key_id: "matter-external-pilot-test-key-v1",
      public_key_sha256: publicKeySha256,
    },
    trusted_verifier: {
      delivery: "out-of-band-or-preinstalled",
      closure: verificationClosure,
    },
    publication: {
      approved: true,
      destination: "https://downloads.example.invalid/named-pilots/firm-a-2026-pilot/",
      audience: "named-pilot-only",
    },
  };
  const approvalReceipt = {
    schema_version: EXTERNAL_RELEASE_RECEIPT_SCHEMA,
    receipt_type: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    receipt_source: "release_owner",
    verdict: "APPROVED",
    key_id: "matter-external-pilot-owner-key-v1",
    issued_at: "2026-08-12T01:45:00.000Z",
    expires_at: "2026-09-01T00:00:00.000Z",
    pilot_id: tenantConfig.pilot_id,
    lawos_tenant_id: tenantConfig.lawos_tenant_id,
    entra_tenant_id: tenantConfig.entra_tenant_id,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    version,
    artifact_sha256: decisionBase.formal_candidate.artifact_index_sha256,
    binding_sha256: bindingSha256({
      ...tenantConfig,
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      version,
    }),
    role: "release_owner",
    operation: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    approval: {
      approval_id: "MATTER-EXTERNAL-PILOT-TEST-001",
      scope: "named-macos-external-pilot",
      firm_id: tenantConfig.firm_id,
      distribution_channel: decisionBase.distribution_channel,
      app_id: decisionBase.app_identity.app_id,
      publication_destination: decisionBase.publication.destination,
      audience: decisionBase.publication.audience,
      artifact_index_sha256: decisionBase.formal_candidate.artifact_index_sha256,
      tenant_config_sha256: decisionBase.tenant_configuration.sha256,
      release_signing_key_id: decisionBase.signing.key_id,
      release_signing_public_key_sha256: decisionBase.signing.public_key_sha256,
      verification_closure: verificationClosure,
    },
  };
  const writtenApprovalRef = writeSignedJson(
    root,
    "approval/receipt.json",
    approvalReceipt,
    ownerKeyPair.privateKey,
  );
  const approvalRef = {
    path: writtenApprovalRef.path,
    sha256: writtenApprovalRef.sha256,
    signature_ref: writtenApprovalRef.signature_ref,
  };
  const decision = { ...decisionBase, approval: { receipt_ref: approvalRef } };
  const trustRegistry = {
    schema_version: "law-firm-os.external-release-trust-registry.v1",
    generated_at: "2026-08-12T01:00:00.000Z",
    keys: [
      {
        key_id: decision.signing.key_id,
        algorithm: "Ed25519",
        public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
        allowed_receipt_sources: ["release_pipeline"],
        allowed_receipt_types: ["macos_distribution_artifacts"],
        allowed_pilot_ids: [decision.pilot_id],
        allowed_lawos_tenant_ids: [decision.lawos_tenant_id],
        allowed_entra_tenant_ids: [decision.entra_tenant_id],
        allowed_source_shas: [SOURCE_SHA],
        allowed_source_trees: [SOURCE_TREE],
        allowed_versions: [version],
        allowed_roles: ["release_pipeline"],
        allowed_operations: ["macos_distribution_artifacts"],
        allowed_artifact_sha256s: [artifacts[1].sha256],
        allowed_binding_sha256s: [approvalReceipt.binding_sha256],
        valid_from: "2026-08-01T00:00:00.000Z",
        valid_until: "2026-12-31T00:00:00.000Z",
        revoked_at: null,
      },
      {
        key_id: approvalReceipt.key_id,
        algorithm: "Ed25519",
        public_key_spki_pem: ownerKeyPair.publicKey.export({ type: "spki", format: "pem" }),
        allowed_receipt_sources: ["release_owner"],
        allowed_receipt_types: [EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE],
        allowed_pilot_ids: [decision.pilot_id],
        allowed_lawos_tenant_ids: [decision.lawos_tenant_id],
        allowed_entra_tenant_ids: [decision.entra_tenant_id],
        allowed_source_shas: [SOURCE_SHA],
        allowed_source_trees: [SOURCE_TREE],
        allowed_versions: [version],
        allowed_roles: ["release_owner"],
        allowed_operations: [EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE],
        allowed_artifact_sha256s: [decision.formal_candidate.artifact_index_sha256],
        allowed_binding_sha256s: [approvalReceipt.binding_sha256],
        valid_from: "2026-08-01T00:00:00.000Z",
        valid_until: "2026-12-31T00:00:00.000Z",
        revoked_at: null,
      },
    ],
  };
  const trustRegistryBytes = Buffer.from(`${JSON.stringify(trustRegistry, null, 2)}\n`);
  const trustRegistryPath = "trust/registry.json";
  write(root, trustRegistryPath, trustRegistryBytes);
  const trustRegistrySha256 = sha256(trustRegistryBytes);
  const decisionPath = write(root, "inputs/decision.json", `${JSON.stringify(decision, null, 2)}\n`);
  return {
    root,
    version,
    formalRoot,
    artifacts,
    electronDist,
    unpdfLicense,
    privateKeyPath,
    publicKeySha256,
    tenantConfig,
    tenantConfigPath,
    decision,
    decisionPath,
    approvalReceipt,
    verificationClosure,
    approvalEvidenceRoot: root,
    trustRegistryPath,
    trustRegistrySha256,
    outputDir: join(root, "output", "firm-a-pilot"),
  };
}

function preparationOptions(input) {
  return {
    worktreeRoot: ROOT,
    formalReleaseRoot: input.formalRoot,
    decisionPath: input.decisionPath,
    tenantConfigPath: input.tenantConfigPath,
    approvalEvidenceRoot: input.approvalEvidenceRoot,
    verificationClosure: input.verificationClosure,
    testOnlyTrustRoot: {
      test_only: true,
      rootDir: input.approvalEvidenceRoot,
      registryPath: input.trustRegistryPath,
      registrySha256: input.trustRegistrySha256,
    },
    privateKeyPath: input.privateKeyPath,
    electronDistPath: input.electronDist,
    unpdfLicensePath: input.unpdfLicense,
    verifierPath: join(ROOT, "scripts/verify-matter-desktop-external-pilot-bundle.mjs"),
    trustHelperPath: join(ROOT, "scripts/lib/external-release-trust.mjs"),
    packageLockPath: join(ROOT, "package-lock.json"),
    desktopPackagePath: join(ROOT, "apps/desktop/package.json"),
    outputDir: input.outputDir,
    now: NOW,
  };
}

function verificationOptions(input, overrides = {}) {
  return {
    bundleDir: input.outputDir,
    expectedKeySha256: input.publicKeySha256,
    verificationClosure: input.verificationClosure,
    testOnlyTrustRoot: {
      test_only: true,
      rootDir: input.approvalEvidenceRoot,
      registryPath: input.trustRegistryPath,
      registrySha256: input.trustRegistrySha256,
    },
    now: NOW,
    ...overrides,
  };
}

test("prepares and verifies an exact-byte named macOS pilot bundle", async (t) => {
  const input = fixture(t);
  const result = await prepareExternalPilotBundle(preparationOptions(input));

  assert.equal(result.verdict, "PASS");
  assert.equal(result.source_candidate_bytes_preserved, true);
  assert.equal(result.publication_ready, true);
  assert.equal(result.publication_performed, false);
  assert.equal(result.windows_status, "BLOCKED");
  assert.equal(result.windows_blocker_code, WINDOWS_EXTERNAL_PILOT_BLOCKER);
  assert.equal(sha256(readFileSync(join(input.outputDir, "macos/matter.zip"))), input.artifacts[0].sha256);
  assert.equal(sha256(readFileSync(join(input.outputDir, "macos/matter.dmg"))), input.artifacts[1].sha256);
  assert.equal(verifyExternalPilotBundle(verificationOptions(input)).verdict, "PASS");
  assert.throws(
    () => verifyExternalPilotBundle(verificationOptions(input, {
      now: Date.parse("2026-09-02T00:00:00.000Z"),
    })),
    /validity|approval is not currently active/u,
  );

  const manifest = JSON.parse(readFileSync(join(input.outputDir, "release-manifest.json"), "utf8"));
  assert.equal(manifest.tenant_configuration.consumed_automatically_by_binary, false);
  assert.equal(manifest.tenant_configuration.signed_onboarding_required, true);
  assert.equal(manifest.windows.artifacts_included, false);
  assert.equal(manifest.macos_artifact_publication_approved, true);
  assert.equal(manifest.external_pilot_go_live_claim, false);
  assert.equal(manifest.global_release_readiness_claim, false);
  assert.equal(manifest.public_release_claim, false);
  assert.equal(manifest.app_store_distribution_claim, false);
  assert.equal(manifest.lawos_tenant_id, LAWOS_TENANT_ID);
  assert.equal(manifest.entra_tenant_id, ENTRA_TENANT_ID);
  assert.equal(manifest.approval.verification, "trusted_detached_receipt");
  const macosReceipt = JSON.parse(readFileSync(join(input.outputDir, "macos-distribution-receipt.json"), "utf8"));
  assert.equal(macosReceipt.schema_version, EXTERNAL_RELEASE_RECEIPT_SCHEMA);
  assert.equal(macosReceipt.receipt_type, "macos_distribution_artifacts");
  assert.equal(macosReceipt.receipt_source, "release_pipeline");
  assert.equal(macosReceipt.verdict, "PASS");
  assert.equal(macosReceipt.key_id, input.decision.signing.key_id);
  assert.equal(macosReceipt.lawos_tenant_id, LAWOS_TENANT_ID);
  assert.equal(macosReceipt.entra_tenant_id, ENTRA_TENANT_ID);
  assert.equal(macosReceipt.source_tree, SOURCE_TREE);
  assert.equal(macosReceipt.artifact_sha256, input.artifacts[1].sha256);
  assert.equal(macosReceipt.binding_sha256, input.approvalReceipt.binding_sha256);
  assert.equal(macosReceipt.role, "release_pipeline");
  assert.equal(macosReceipt.operation, "macos_distribution_artifacts");
  assert.equal(macosReceipt.artifacts.package.sha256, input.artifacts[1].sha256);
  assert.equal(macosReceipt.signing.artifact_checksums_algorithm, "ed25519");
  assert.equal(macosReceipt.claim_policy.macos_artifact_gate_only, true);
  assert.equal(macosReceipt.claim_policy.external_pilot_go_live_approved, false);
  assert.equal(existsSync(join(input.outputDir, "macos-distribution-receipt.sig")), true);
  assert.equal(existsSync(join(input.outputDir, "macos-distribution-receipt-ref.json")), true);
  assert.equal(existsSync(join(input.outputDir, "approval-receipt.sig")), true);
  assert.equal(existsSync(join(input.outputDir, "verify-bundle.mjs")), false);
  const verifierReference = JSON.parse(readFileSync(join(input.outputDir, "trusted-verifier-reference.json"), "utf8"));
  assert.deepEqual(verifierReference.closure, input.verificationClosure);
  assert.equal(verifierReference.executable_verifier_in_bundle, false);
  assert.equal(verifierReference.bundle_reference_is_trust_root, false);
  const install = readFileSync(join(input.outputDir, "INSTALL.md"), "utf8");
  assert.doesNotMatch(install, /node\s+(?:\.\/)?verify-bundle\.mjs/u);
  assert.match(install, /run-trusted-matter-desktop-external-pilot\.sh verify/u);
  assert.match(install, /--expected-trust-resolver-sha256/u);
  assert.match(install, /--expected-updates-sha256/u);
  assert.match(install, /--node-executable/u);
  assert.match(install, /--bundle \/absolute\/path\/to\/this-bundle/u);
  assert.doesNotMatch(install, /--trust-(?:root|registry|registry-sha256)/u);
  assert.match(install, /TRUST_ROOT_NOT_CONFIGURED/u);

  const intakeInput = {
    schema_version: "law-firm-os.external-release-readiness-input.v0.2",
    tenant_identity_schema_version: "law-firm-os.external-tenant-identity.v1",
    status: "BLOCKED_PENDING_EXTERNAL_INPUTS",
    release: {
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      version: input.version,
      release_channel: "external_pilot",
    },
    pilot: {
      pilot_id: input.decision.pilot_id,
      law_firm_name: "Synthetic Firm A",
      lawos_tenant_id: LAWOS_TENANT_ID,
      entra_tenant_id: ENTRA_TENANT_ID,
      environment: "external_pilot",
    },
    runtime_assumptions: {
      current_runtime_mode: "single_tenant_env_binding",
      tenant_environment_variable: "LAWOS_IDENTITY_TENANT_ID",
      database_tenant_environment_variable: "LAWOS_DATABASE_TENANT_ID",
      federated_tenant_source: "resolved_oidc_protected_config",
      issuer_strategy: "https://login.microsoftonline.com/{entra_tenant_id}/v2.0",
      provisioning_receipt_alone_satisfies_runtime_binding: false,
    },
    gates: {
      api_artifact_deployment: { receipt_ref: null },
      tenant_provisioning: { provisioning_receipt_ref: null, runtime_binding_receipt_ref: null },
      m365_consent_deployment_visibility: { receipt_ref: null },
      macos_distribution: {
        receipt_ref: JSON.parse(readFileSync(
          join(input.outputDir, "macos-distribution-receipt-ref.json"),
          "utf8",
        )),
      },
      operations_support_rollback: { receipt_ref: null },
      backup_restore_rehearsal: { receipt_ref: null },
      legal_owner_approval: { receipt_ref: null },
    },
  };
  const intakePath = join(input.outputDir, "synthetic-readiness-input.json");
  writeFileSync(intakePath, `${JSON.stringify(intakeInput, null, 2)}\n`);
  const contractBytes = readFileSync(join(ROOT, "contracts/external-release-readiness-contract.json"));
  mkdirSync(join(input.outputDir, "contracts"));
  writeFileSync(join(input.outputDir, "contracts/external-release-readiness-contract.json"), contractBytes);
  mkdirSync(join(input.outputDir, "trust"));
  cpSync(join(input.root, input.trustRegistryPath), join(input.outputDir, input.trustRegistryPath));
  const readiness = validateExternalReleaseReadiness({
    rootDir: input.outputDir,
    inputPath: "synthetic-readiness-input.json",
    testOnlyTrustRoot: {
      test_only: true,
      registryPath: input.trustRegistryPath,
      registrySha256: input.trustRegistrySha256,
    },
  });
  const macGate = readiness.gates.find((gate) => gate.gate_id === "macos_distribution");
  assert.equal(
    macGate?.state,
    "verified",
    JSON.stringify(readiness.findings),
  );
  assert.equal(readiness.verdict, "FAIL");
  assert.equal(readiness.readiness, "BLOCKED_PENDING_EXTERNAL_INPUTS");
  assert.equal(readiness.boundary.external_pilot_distribution_approved_by_validator, false);
  const evidenceReadinessReport = process.env.MATTER_DESKTOP_EXTERNAL_PILOT_EVIDENCE_READINESS_REPORT;
  if (evidenceReadinessReport) {
    assert.equal(existsSync(evidenceReadinessReport), false, "evidence readiness target already exists");
    mkdirSync(dirname(evidenceReadinessReport), { recursive: true });
    writeFileSync(evidenceReadinessReport, `${JSON.stringify(readiness, null, 2)}\n`);
  }
  rmSync(intakePath);
  rmSync(join(input.outputDir, "contracts"), { recursive: true });
  rmSync(join(input.outputDir, "trust"), { recursive: true });

  const evidenceBundle = process.env.MATTER_DESKTOP_EXTERNAL_PILOT_EVIDENCE_BUNDLE;
  if (evidenceBundle) {
    assert.equal(existsSync(evidenceBundle), false, "evidence bundle target already exists");
    mkdirSync(dirname(evidenceBundle), { recursive: true });
    cpSync(input.outputDir, evidenceBundle, { recursive: true, errorOnExist: true });
  }
  const evidenceTrustRoot = process.env.MATTER_DESKTOP_EXTERNAL_PILOT_EVIDENCE_TRUST_ROOT;
  if (evidenceTrustRoot) {
    assert.equal(existsSync(evidenceTrustRoot), false, "evidence trust target already exists");
    mkdirSync(dirname(evidenceTrustRoot), { recursive: true });
    mkdirSync(evidenceTrustRoot);
    cpSync(join(input.root, "trust"), join(evidenceTrustRoot, "trust"), { recursive: true });
    writeFileSync(join(evidenceTrustRoot, "registry.sha256"), `${input.trustRegistrySha256}\n`);
  }
});

test("production paths reject a caller-minted trust root and expose no CLI registry bypass", async (t) => {
  const input = fixture(t);
  await assert.rejects(
    prepareExternalPilotBundle({ ...preparationOptions(input), testOnlyTrustRoot: null }),
    (error) => error?.code === "TRUST_ROOT_NOT_CONFIGURED",
  );
  await prepareExternalPilotBundle(preparationOptions(input));
  assert.throws(
    () => verifyExternalPilotBundle({ ...verificationOptions(input), testOnlyTrustRoot: null }),
    (error) => error?.code === "TRUST_ROOT_NOT_CONFIGURED",
  );

  const oldNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await assert.rejects(
      prepareExternalPilotBundle(preparationOptions(input)),
      (error) => error?.code === "TEST_TRUST_ROOT_FORBIDDEN",
    );
    assert.throws(
      () => verifyExternalPilotBundle(verificationOptions(input)),
      (error) => error?.code === "TEST_TRUST_ROOT_FORBIDDEN",
    );
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
  }

  const launcher = join(ROOT, "scripts/run-trusted-matter-desktop-external-pilot.sh");
  const trustedArgs = launcherArguments(input.verificationClosure);
  const verifierCli = spawnSync(launcher, [
    "verify", ...trustedArgs, "--",
    "--bundle", input.outputDir,
    "--expected-key-sha256", input.publicKeySha256,
    "--trust-registry", input.trustRegistryPath,
    "--trust-registry-sha256", input.trustRegistrySha256,
  ], { encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
  assert.notEqual(verifierCli.status, 0);
  assert.match(verifierCli.stderr, /unknown verifier arguments/u);

  const prepareCli = spawnSync(launcher, [
    "prepare", ...trustedArgs, "--",
    "--trust-registry", input.trustRegistryPath,
  ], { encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
  assert.notEqual(prepareCli.status, 0);
  assert.match(prepareCli.stderr, /unknown option: --trust-registry/u);

  const productionCli = spawnSync(launcher, [
    "verify", ...trustedArgs, "--",
    "--bundle", input.outputDir,
    "--expected-key-sha256", input.publicKeySha256,
  ], { encoding: "utf8", env: { ...process.env, NODE_ENV: "production" } });
  assert.notEqual(productionCli.status, 0);
  assert.match(productionCli.stderr, /TRUST_ROOT_NOT_CONFIGURED/u);
});

test("trusted launcher binds the real Node binary and strips ESM loader injection before PASS", async (t) => {
  const input = fixture(t);
  await prepareExternalPilotBundle(preparationOptions(input));
  const launcher = join(ROOT, "scripts/run-trusted-matter-desktop-external-pilot.sh");
  const marker = join(input.root, "loader-ran.txt");
  const loader = write(input.root, "attack-loader.mjs", [
    "import { appendFileSync } from 'node:fs';",
    `appendFileSync(${JSON.stringify(marker)}, 'loaded\\n');`,
    "export async function resolve(specifier, context, nextResolve) {",
    "  return nextResolve(specifier, context);",
    "}",
    "",
  ].join("\n"));
  const attackOptions = `--experimental-loader=${loader}`;
  const loaderControl = spawnSync(input.verificationClosure.node_executable, ["-e", "process.exit(0)"], {
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: attackOptions },
  });
  assert.equal(loaderControl.status, 0, loaderControl.stderr);
  assert.equal(existsSync(marker), true, "attack loader control did not execute");
  rmSync(marker);

  const result = spawnSync(launcher, [
    "verify", ...launcherArguments(input.verificationClosure), "--",
    "--bundle", input.outputDir,
    "--expected-key-sha256", input.publicKeySha256,
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NODE_OPTIONS: attackOptions,
      NODE_PATH: input.root,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TRUST_ROOT_NOT_CONFIGURED/u);
  assert.doesNotMatch(result.stdout, /"verdict":\s*"PASS"/u);
  assert.equal(existsSync(marker), false, "launcher allowed NODE_OPTIONS loader execution");

  const directVerifier = spawnSync(input.verificationClosure.node_executable, [
    join(ROOT, "scripts/verify-matter-desktop-external-pilot-bundle.mjs"),
    ...launcherArguments(input.verificationClosure),
    "--bundle", input.outputDir,
    "--expected-key-sha256", input.publicKeySha256,
  ], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: attackOptions },
  });
  assert.notEqual(directVerifier.status, 0);
  assert.match(directVerifier.stderr, /UNSUPPORTED_DIRECT_ENTRY/u);
  assert.doesNotMatch(directVerifier.stdout, /"verdict":\s*"PASS"/u);
  assert.equal(existsSync(marker), true, "raw Node control did not execute the adversarial loader");
  rmSync(marker);

  const directOutput = join(input.root, "direct-entry-output");
  const directPrepare = spawnSync(input.verificationClosure.node_executable, [
    join(ROOT, "scripts/prepare-matter-desktop-external-pilot.mjs"),
    ...launcherArguments(input.verificationClosure),
    "--formal-release-root", input.formalRoot,
    "--decision", input.decisionPath,
    "--tenant-config", input.tenantConfigPath,
    "--approval-evidence-root", input.root,
    "--private-key", input.privateKeyPath,
    "--output-dir", directOutput,
  ], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", NODE_OPTIONS: attackOptions },
  });
  assert.notEqual(directPrepare.status, 0);
  assert.match(directPrepare.stderr, /UNSUPPORTED_DIRECT_ENTRY/u);
  assert.equal(existsSync(directOutput), false, "raw Node preparation created a release bundle");

  const packageScripts = JSON.parse(readFileSync(join(ROOT, "package.json"))).scripts;
  assert.match(packageScripts["matter-desktop:external-pilot:prepare"], /run-trusted-matter-desktop-external-pilot\.sh/u);
  assert.match(packageScripts["matter-desktop:external-pilot:verify"], /run-trusted-matter-desktop-external-pilot\.sh/u);
  assert.doesNotMatch(packageScripts["matter-desktop:external-pilot:prepare"], /node\s+scripts\/prepare-matter/u);
  assert.doesNotMatch(packageScripts["matter-desktop:external-pilot:verify"], /node\s+scripts\/verify-matter/u);

  const wrongNodeHash = [...launcherArguments(input.verificationClosure)];
  wrongNodeHash[wrongNodeHash.indexOf("--expected-node-sha256") + 1] = "0".repeat(64);
  const wrongHashResult = spawnSync(launcher, ["verify", ...wrongNodeHash, "--"], { encoding: "utf8" });
  assert.notEqual(wrongHashResult.status, 0);
  assert.match(wrongHashResult.stderr, /SHA-256 mismatch.*\/node/u);

  const nodeSymlink = join(input.root, "node-link");
  symlinkSync(input.verificationClosure.node_executable, nodeSymlink);
  const symlinkClosure = { ...input.verificationClosure, node_executable: nodeSymlink };
  const symlinkResult = spawnSync(launcher, ["verify", ...launcherArguments(symlinkClosure), "--"], { encoding: "utf8" });
  assert.notEqual(symlinkResult.status, 0);
  assert.match(symlinkResult.stderr, /regular executable non-symlink/u);
});

test("preparation rejects a detached approval with an invalid signature", async (t) => {
  const input = fixture(t);
  const badSignature = Buffer.alloc(64);
  writeFileSync(join(input.root, input.decision.approval.receipt_ref.signature_ref.path), badSignature);
  const decision = {
    ...input.decision,
    approval: {
      receipt_ref: {
        ...input.decision.approval.receipt_ref,
        signature_ref: {
          ...input.decision.approval.receipt_ref.signature_ref,
          sha256: sha256(badSignature),
        },
      },
    },
  };
  writeFileSync(input.decisionPath, `${JSON.stringify(decision, null, 2)}\n`);
  await assert.rejects(
    prepareExternalPilotBundle(preparationOptions(input)),
    /detached Ed25519 signature does not verify/u,
  );
});

test("bundle verification rejects changed candidate bytes", async (t) => {
  const input = fixture(t);
  await prepareExternalPilotBundle(preparationOptions(input));
  writeFileSync(join(input.outputDir, "macos/matter.zip"), "changed-bytes");
  assert.throws(
    () => verifyExternalPilotBundle(verificationOptions(input)),
    /checksum mismatch: macos\/matter\.zip/u,
  );
});

test("a tampered bundle verifier cannot self-verify the bundle", async (t) => {
  const input = fixture(t);
  await prepareExternalPilotBundle(preparationOptions(input));
  writeFileSync(join(input.outputDir, "verify-bundle.mjs"), "process.stdout.write('fake PASS\\n');\n");
  assert.throws(
    () => verifyExternalPilotBundle(verificationOptions(input)),
    /cannot contain executable verifier code/u,
  );
});

test("signed approval prevents retroactive formal candidate substitution", async (t) => {
  const input = fixture(t);
  const receiptPath = join(input.formalRoot, "receipts/macos-build.md");
  const staleReceipt = readFileSync(receiptPath, "utf8").replace(
    `Version: \`${input.version}\``,
    "Version: `0.1.17`",
  );
  writeFileSync(receiptPath, staleReceipt);
  const indexPath = join(input.formalRoot, "artifact-index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const receiptArtifact = index.artifacts.find((entry) => entry.id === "macos_build_receipt");
  receiptArtifact.bytes = Buffer.byteLength(staleReceipt);
  receiptArtifact.sha256 = sha256(staleReceipt);
  const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  writeFileSync(indexPath, indexBytes);
  writeFileSync(
    join(input.formalRoot, "checksums.sha256"),
    index.artifacts.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n") + "\n",
  );
  const decision = {
    ...input.decision,
    formal_candidate: {
      ...input.decision.formal_candidate,
      artifact_index_sha256: sha256(indexBytes),
    },
  };
  writeFileSync(input.decisionPath, `${JSON.stringify(decision, null, 2)}\n`);

  await assert.rejects(
    prepareExternalPilotBundle(preparationOptions(input)),
    /receipt artifact_sha256 does not match the expected authority scope/u,
  );
});

test("decision and tenant contracts fail closed before publication", (t) => {
  const input = fixture(t);
  const checkedInTemplate = JSON.parse(readFileSync(
    join(ROOT, "docs/desktop/matter-desktop-external-pilot-decision.template.json"),
    "utf8",
  ));
  assert.throws(
    () => validateExternalPilotDecision(checkedInTemplate, { now: NOW }),
    /requires an explicit signed approval receipt/u,
  );
  assert.throws(
    () => validateExternalPilotDecision({
      ...input.decision,
      approval: {
        state: "approved",
        approval_id: "self-attested",
      },
    }, { now: NOW }),
    /approval keys must match the schema/u,
  );
  assert.throws(
    () => validateExternalPilotDecision({
      ...input.decision,
      publication: { ...input.decision.publication, approved: false },
    }, { now: NOW }),
    /requires explicit approval/u,
  );
  assert.throws(
    () => validateExternalPilotDecision({
      ...input.decision,
      app_identity: {
        strategy: "new-pilot-app-id",
        app_id: "com.example.matter.pilot",
      },
    }, { now: NOW }),
    /reuse-formal-notarized-candidate/u,
  );
  assert.throws(
    () => validateExternalPilotTenantConfig({
      ...input.tenantConfig,
      lawos_tenant_id: "another-tenant",
    }, input.decision, { now: NOW }),
    /lawos_tenant_id/u,
  );
});
