import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  MACOS_RELEASE_APPROVAL_SCHEMA,
  MACOS_RELEASE_CHECKPOINT,
  MACOS_RELEASE_MANIFEST_SCHEMA,
  RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA,
  collectMacosReleaseBoundaryReceipt,
  createMacosReleaseManifestBinding,
  sha256,
} from "../../lib/matter-desktop-macos-release-boundary.mjs";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  createDesktopBuildManifest,
} from "../../lib/matter-desktop-provenance.mjs";
import {
  MATTER_ROLLBACK_ACTION,
  MATTER_ROLLBACK_ATTEST_ACTION,
  MATTER_ROLLBACK_EXECUTION_ACTION,
  MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION,
  MATTER_ROLLBACK_SEAL_ACTION,
  MATTER_ROLLBACK_TARGET_MANIFEST_SCHEMA,
  buildMatterRollbackPacket,
  canonicalSha256,
  describeMatterRollbackAdapter,
  sha256Bytes,
  writePrivateJson,
} from "../../lib/matter-rollback-contract.mjs";
import { canonicalizeJson } from "../../lib/runtime-safety-approval-contract.mjs";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
export const API_RUNNER = path.join(REPO_ROOT, "scripts/run-matter-api-rollback.mjs");
export const DESKTOP_RUNNER = path.join(REPO_ROOT, "scripts/run-matter-desktop-rollback.mjs");
export const VALIDATOR = path.join(REPO_ROOT, "scripts/validate-matter-rollback-receipt.mjs");
export const PREPARER = path.join(REPO_ROOT, "scripts/prepare-matter-rollback-packet.mjs");

const FINGERPRINT = "AB".repeat(32);
const TEAM_ID = "LHDXU66NX3";

export function privateWrite(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  writeFileSync(filePath, value, { mode: 0o600 });
  chmodSync(filePath, 0o600);
  return filePath;
}

export function descriptor(filePath) {
  const body = readFileSync(filePath);
  return Object.freeze({ path: filePath, sha256: sha256Bytes(body), bytes: body.length });
}

function json(filePath, value, mode = 0o600) {
  mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode });
  chmodSync(filePath, mode);
  return filePath;
}

function iso(milliseconds) {
  return new Date(milliseconds).toISOString();
}

function gitIdentity(revision) {
  const sha = execFileSync("git", ["-C", REPO_ROOT, "rev-parse", revision], { encoding: "utf8" }).trim();
  const tree = execFileSync("git", ["-C", REPO_ROOT, "rev-parse", `${sha}^{tree}`], { encoding: "utf8" }).trim();
  return { sha, tree };
}

function releaseEvidence(root, label, source, clock) {
  const releaseRoot = path.join(root, `release-${label}`);
  const version = `0.1.${label === "a" ? "16" : "17"}`;
  const artifactRoot = `apps/desktop/dist/releases/${version}/${source.sha}/formal`;
  const macRoot = path.join(releaseRoot, artifactRoot);
  const appPath = path.join(macRoot, "matter.app");
  const executable = path.join(appPath, "Contents/MacOS/matter");
  const resource = path.join(appPath, "Contents/Resources/app/main.cjs");
  mkdirSync(path.dirname(executable), { recursive: true });
  mkdirSync(path.dirname(resource), { recursive: true });
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  writeFileSync(resource, `module.exports = '${label}';\n`);
  const dmgPath = path.join(macRoot, `matter-${label}-macos.dmg`);
  writeFileSync(dmgPath, `immutable disk image ${label}\n`);
  const manifestPath = path.join(macRoot, `matter-${label}-macos-build-manifest.json`);
  const manifest = createDesktopBuildManifest({
    version,
    sourceSha: source.sha,
    sourceTree: source.tree,
    sourceDirty: false,
    renderer: {
      sha256: label === "a" ? "a".repeat(64) : "b".repeat(64),
      file_count: 1,
      algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM,
    },
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
    builtAt: iso(clock - 5 * 60 * 1000),
  });
  json(manifestPath, manifest, 0o644);
  const approval = {
    schema_version: MACOS_RELEASE_APPROVAL_SCHEMA,
    checkpoint_id: MACOS_RELEASE_CHECKPOINT,
    approval_id: `RFD-TUW-012-${label}-fixture`,
    decision: "APPROVED",
    approved_at: iso(clock - 10 * 60 * 1000),
    expires_at: iso(clock + 24 * 60 * 60 * 1000),
    source_sha: source.sha,
    source_tree: source.tree,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    signing_identity: {
      fingerprint_algorithm: "sha256",
      certificate_fingerprint: FINGERPRINT,
      team_id: TEAM_ID,
    },
    operations: { developer_id_signing: true, notarization_submission: true, notary_status_query: true },
    public_release_approved: false,
    owner_approval_claim: false,
  };
  const approvalPath = json(path.join(macRoot, `rfd012-${label}-approval.json`), approval, 0o644);
  const appRequest = label === "a" ? "11111111-1111-4111-8111-111111111111" : "33333333-3333-4333-8333-333333333333";
  const dmgRequest = label === "a" ? "22222222-2222-4222-8222-222222222222" : "44444444-4444-4444-8444-444444444444";
  const runner = ({ id }) => {
    if (id.endsWith("_identity_verify")) return { status: 0, stderr: `Authority=Developer ID Application: fixture (${TEAM_ID})\nTeamIdentifier=${TEAM_ID}\n` };
    if (id.endsWith("_identity_fingerprint")) return { status: 0, stdout: `sha256 Fingerprint=${FINGERPRINT.match(/../gu).join(":")}\n` };
    if (id.endsWith("_notary_status")) {
      const requestId = id.startsWith("app_") ? appRequest : dmgRequest;
      return { status: 0, stdout: JSON.stringify({ id: requestId, status: "Accepted" }) };
    }
    return { status: 0 };
  };
  const receipt = collectMacosReleaseBoundaryReceipt({
    repoRoot: releaseRoot,
    manifestPath,
    appPath,
    dmgPath,
    approval,
    appNotaryRequestId: appRequest,
    dmgNotaryRequestId: dmgRequest,
    notaryProfile: "fixture-profile-never-contacted",
    expectedSourceSha: source.sha,
    expectedSourceTree: source.tree,
    sourceDirty: false,
    runner,
    now: iso(clock - 2 * 60 * 1000),
  });
  const receiptPath = path.join(macRoot, `rfd012-${label}-receipt.json`);
  json(receiptPath, receipt, 0o644);
  const receiptBody = readFileSync(receiptPath);
  const releaseManifest = {
    schema_version: MACOS_RELEASE_MANIFEST_SCHEMA,
    release_id: `matter-desktop-v${version}-rfd012-${label}-test-only`,
    artifact_root: artifactRoot,
    source_sha: source.sha,
    source_tree: source.tree,
    source_dirty: false,
    channel: "formal-candidate",
    app_id: "com.amic.matter.desktop",
    public_release_claim: false,
    production_go_live_claim: false,
    owner_approval_claim: false,
    macos_release_boundary: createMacosReleaseManifestBinding(receipt, sha256(receiptBody)),
  };
  const releaseManifestPath = json(path.join(macRoot, `rfd012-${label}-release.json`), releaseManifest, 0o644);
  const distReceiptPath = json(path.join(macRoot, `rfd012-${label}-rf13-dist.blocked.json`), {
    schema_version: RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA,
    receipt_id: `rfd012-${label}-test-only-structural`,
    gate: "macos_release",
    status: "BLOCKED",
    source_sha: source.sha,
    source_tree: source.tree,
    artifact_sha256: [receipt.artifacts.disk_image.sha256],
    executed: false,
    authoritative: false,
    template: true,
  }, 0o644);
  return {
    checkpoint_id: "RFD-TUW-012",
    repo_root: releaseRoot,
    receipt: descriptor(receiptPath),
    approved_intake: descriptor(approvalPath),
    build_manifest: descriptor(manifestPath),
    release_manifest: descriptor(releaseManifestPath),
    dist_receipt: descriptor(distReceiptPath),
    application_path: appPath,
    disk_image_path: dmgPath,
    windows_native_qa: null,
  };
}

function uncheckedJsonReference(filePath, value) {
  const body = readFileSync(filePath);
  return Object.freeze({ path: filePath, sha256: sha256Bytes(body), bytes: body.length, manifest: value });
}

function immutableArtifact(root, sourceSha, filename, body) {
  const directory = path.join(root, "artifacts", sourceSha);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return privateWrite(path.join(directory, filename), body);
}

function adapterSource(surface) {
  return `import { createHash, sign } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const surface = ${JSON.stringify(surface)};
const schema = "law-firm-os.matter-rollback.raw-execution.v2";
const action = "lawos-matter-rollback:attest";
const canonical = (v) => v === null || typeof v === "boolean" || typeof v === "string" || typeof v === "number"
  ? JSON.stringify(v)
  : Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]"
    : "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const put = (p, v) => { mkdirSync(new URL(".", "file://" + p).pathname, { recursive: true }); writeFileSync(p, v, { mode: 0o600 }); chmodSync(p, 0o600); };
const desc = (p) => { const b = readFileSync(p); return { path: p, sha256: hash(b), bytes: b.length }; };
async function execute({ packet, isolatedUserData, invocation }) {
  const config = JSON.parse(readFileSync(process.env.MATTER_ROLLBACK_TEST_ADAPTER_CONFIG, "utf8"));
  const stepIds = surface === "api" ? ["A_BEFORE", "B_CURRENT", "A_ROLLBACK"] : ["B_CURRENT", "A_ROLLBACK"];
  const bundles = [];
  let previous = null;
  for (let ordinal = 0; ordinal < stepIds.length; ordinal += 1) {
    const stepId = stepIds[ordinal];
    const target = stepId === "B_CURRENT" ? packet.current_b.manifest : packet.target_a.manifest;
    const observedAt = new Date(Math.max(Date.now(), Date.parse(invocation.started_at))).toISOString();
    const prefix = join(config.output_root, invocation.invocation_id + "-" + ordinal);
    const evidencePath = prefix + ".raw-evidence.json";
    put(evidencePath, JSON.stringify({ observed_at: observedAt, surface, step_id: stepId, source_sha: target.source.sha }) + "\\n");
    const releaseReceipt = surface === "desktop" ? JSON.parse(readFileSync(target.desktop.release_evidence.receipt.path, "utf8")) : null;
    const artifacts = surface === "api" ? {
      api_artifact_sha256: target.api.artifact.sha256,
      api_environment_sha256: target.api.environment_sha256,
      api_s3_version_id: target.api.s3.version_id,
    } : {
      package_manifest_sha256: target.desktop.release_evidence.build_manifest.sha256,
      disk_image_sha256: releaseReceipt.artifacts.disk_image.sha256,
      archive_sha256: target.desktop.archive.sha256,
      release_receipt_sha256: target.desktop.release_evidence.receipt.sha256,
    };
    const checks = surface === "api" ? {
      health_status: "ok",
      login_status: "PASS",
      durable_readback_scope_sha256: config.durable_readback_scope_by_step?.[stepId] ?? config.durable_readback_scope_sha256,
      durable_readback_sha256: config.durable_readback_by_step?.[stepId] ?? config.durable_readback_sha256,
      durable_readback_record_count: config.durable_readback_count_by_step?.[stepId] ?? config.durable_readback_record_count,
    } : {
      launch_status: "PASS", login_status: "PASS", isolated_user_data_path_sha256: hash(isolatedUserData),
      isolated_user_data_empty_before: true,
    };
    const attempted = stepId !== "A_BEFORE";
    const raw = {
      schema_version: schema,
      receipt_id: config.raw_receipt_id_by_step?.[stepId] ?? "raw-" + surface + "-" + invocation.invocation_id + "-" + ordinal,
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      execution_nonce: packet.execution_nonce,
      run_id: invocation.run_id,
      surface,
      step_id: stepId,
      ordinal,
      environment: packet.environment,
      adapter_sha256: packet.execution_boundary.adapters[surface].sha256,
      invocation_id: invocation.invocation_id,
      started_at: observedAt,
      finished_at: observedAt,
      source: target.source,
      artifacts,
      checks,
      mutation: { attempted, started: attempted, completed: attempted, failed: false, unknown: false },
      counts: { data_rollback_write_count: 0, database_write_count: 0, bucket_write_count: 0, network_write_count: 0, production_contact_count: 0 },
      previous_receipt_sha256: previous,
      raw_evidence: desc(evidencePath),
    };
    const rawPath = prefix + ".raw-receipt.json";
    put(rawPath, JSON.stringify(raw, null, 2) + "\\n");
    const rawDescriptor = desc(rawPath);
    const attestation = {
      schema_version: "law-firm-os.runtime-safety.approval.v1",
      approval_id: config.attestation_id_by_step?.[stepId] ?? "attest-" + surface + "-" + invocation.invocation_id + "-" + ordinal,
      key_id: config.attestor_key_id,
      role: config.attestor_role,
      decision: "approved",
      packet_sha256: hash(canonical(raw)),
      source_sha: target.source.sha,
      source_tree: target.source.tree,
      action,
      environment: packet.environment,
      signed_at: observedAt,
      expires_at: new Date(Date.parse(observedAt) + 10 * 60 * 1000).toISOString(),
      data_scope: ["none"],
      contact_scope: ["none"],
    };
    const attestationPath = prefix + ".attestation.json";
    const signaturePath = prefix + ".attestation.sig";
    put(attestationPath, JSON.stringify(attestation, null, 2) + "\\n");
    put(signaturePath, sign(null, Buffer.from(canonical(attestation)), config.attestor_private_key_pem));
    bundles.push({
      receipt: rawDescriptor,
      attestation: {
        action,
        approval_id: attestation.approval_id,
        signed_at: attestation.signed_at,
        expires_at: attestation.expires_at,
        receipt: desc(attestationPath),
        signature: desc(signaturePath),
      },
    });
    previous = rawDescriptor.sha256;
  }
  return {
    surface,
    run_id: invocation.run_id,
    invocation_id: invocation.invocation_id,
    started_at: invocation.started_at,
    finished_at: new Date().toISOString(),
    steps: bundles,
  };
}
export const ${surface === "api" ? "executeMatterApiRollback" : "executeMatterDesktopRollback"} = execute;
`;
}

function hashNamedModule(root, stem, source) {
  const temporary = privateWrite(path.join(root, `${stem}.tmp.mjs`), source);
  const digest = sha256Bytes(readFileSync(temporary));
  const target = path.join(root, `${stem}-${digest}.mjs`);
  renameSync(temporary, target);
  return target;
}

export function makeFixture(testContext, {
  environment = "staging",
  apiAdapterSource,
  desktopAdapterSource,
  durableReadbackByStep = null,
  durableReadbackScopeByStep = null,
  durableReadbackCountByStep = null,
  rawReceiptIdByStep = null,
  attestationIdByStep = null,
} = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "matter-rollback-v2-")));
  chmodSync(root, 0o700);
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const clock = Date.now();
  const aSource = gitIdentity("HEAD^");
  const bSource = gitIdentity("HEAD");
  const ownerKeys = generateKeyPairSync("ed25519");
  const attestorKeys = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: iso(clock - 24 * 60 * 60 * 1000),
    keys: [
      {
        key_id: "rollback-owner-key",
        algorithm: "Ed25519",
        public_key_spki_pem: ownerKeys.publicKey.export({ type: "spki", format: "pem" }),
        roles: ["rollback-owner"],
        actions: [MATTER_ROLLBACK_ACTION, MATTER_ROLLBACK_EXECUTION_ACTION, MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION],
        environments: ["staging", "production"],
        valid_from: iso(clock - 24 * 60 * 60 * 1000),
        valid_until: iso(clock + 24 * 60 * 60 * 1000),
        revoked_at: null,
      },
      {
        key_id: "rollback-attestor-key",
        algorithm: "Ed25519",
        public_key_spki_pem: attestorKeys.publicKey.export({ type: "spki", format: "pem" }),
        roles: ["rollback-attestor"],
        actions: [MATTER_ROLLBACK_ATTEST_ACTION, MATTER_ROLLBACK_SEAL_ACTION],
        environments: ["staging", "production"],
        valid_from: iso(clock - 24 * 60 * 60 * 1000),
        valid_until: iso(clock + 24 * 60 * 60 * 1000),
        revoked_at: null,
      },
    ],
  };
  const registryPath = json(path.join(root, "trust-registry.json"), registry);
  const authority = {
    action: MATTER_ROLLBACK_ACTION,
    owner_role: "rollback-owner",
    attestor_role: "rollback-attestor",
    trust_registry: descriptor(registryPath),
  };
  function target(label, source) {
    const apiPath = immutableArtifact(root, source.sha, `api-${source.sha}.zip`, `api-${label}\n`);
    const apiDescriptor = descriptor(apiPath);
    const archivePath = immutableArtifact(root, source.sha, `desktop-${source.sha}.zip`, `desktop-${label}\n`);
    return {
      schema_version: MATTER_ROLLBACK_TARGET_MANIFEST_SCHEMA,
      manifest_id: `matter-rollback-${label}`,
      environment,
      source,
      schema_compatibility: { version: "matter-schema-v1", readable_versions: ["matter-schema-v1"], data_rollback_required: false },
      api: {
        artifact: apiDescriptor,
        s3: {
          bucket: `lawos-${environment}-rollback-artifacts`,
          key: `matter/${source.sha}/${apiDescriptor.sha256}.zip`,
          version_id: `version-${label}-immutable`,
        },
        environment_sha256: label === "a" ? "3".repeat(64) : "4".repeat(64),
        health: { status: "ok", source_revision: source.sha },
      },
      desktop: {
        platform: "macos",
        archive: descriptor(archivePath),
        release_evidence: releaseEvidence(root, label, source, clock),
      },
      rollback_authority: authority,
    };
  }
  const aManifest = target("a", aSource);
  const bManifest = target("b", bSource);
  const aPath = json(path.join(root, "a-manifest.json"), aManifest);
  const bPath = json(path.join(root, "b-manifest.json"), bManifest);
  const aRef = uncheckedJsonReference(aPath, aManifest);
  const bRef = uncheckedJsonReference(bPath, bManifest);
  const apiAdapterPath = hashNamedModule(root, "api-adapter", apiAdapterSource ?? adapterSource("api"));
  const desktopAdapterPath = hashNamedModule(root, "desktop-adapter", desktopAdapterSource ?? adapterSource("desktop"));
  const adapterOutputRoot = path.join(root, "adapter-output");
  mkdirSync(adapterOutputRoot, { mode: 0o700 });
  const adapterConfigPath = json(path.join(root, "adapter-config.json"), {
    output_root: adapterOutputRoot,
    durable_readback_scope_sha256: "8".repeat(64),
    durable_readback_scope_by_step: durableReadbackScopeByStep,
    durable_readback_sha256: "9".repeat(64),
    durable_readback_record_count: 7,
    durable_readback_by_step: durableReadbackByStep,
    durable_readback_count_by_step: durableReadbackCountByStep,
    raw_receipt_id_by_step: rawReceiptIdByStep,
    attestation_id_by_step: attestationIdByStep,
    attestor_key_id: "rollback-attestor-key",
    attestor_role: "rollback-attestor",
    attestor_private_key_pem: attestorKeys.privateKey.export({ type: "pkcs8", format: "pem" }),
  });
  return {
    root,
    clock,
    environment,
    aSource,
    bSource,
    aManifest,
    bManifest,
    aPath,
    bPath,
    aRef,
    bRef,
    ownerPrivateKey: ownerKeys.privateKey,
    attestorPrivateKey: attestorKeys.privateKey,
    apiAdapterPath,
    desktopAdapterPath,
    apiAdapter: describeMatterRollbackAdapter(apiAdapterPath, "api"),
    desktopAdapter: describeMatterRollbackAdapter(desktopAdapterPath, "desktop"),
    adapterConfigPath,
    packetGeneratedAt: iso(clock - 60 * 1000),
    packetExpiresAt: iso(clock + 60 * 60 * 1000),
    authoritySignedAt: iso(clock - 30 * 1000),
  };
}

export function makePacket(fixture, overrides = {}) {
  return buildMatterRollbackPacket({
    environment: fixture.environment,
    currentRef: fixture.bRef,
    targetRef: fixture.aRef,
    apiAdapter: fixture.apiAdapter,
    desktopAdapter: fixture.desktopAdapter,
    packetId: "rfd017-fixture-packet",
    executionNonce: "e".repeat(64),
    generatedAt: fixture.packetGeneratedAt,
    expiresAt: fixture.packetExpiresAt,
    ...overrides,
  });
}

export function writePacket(fixture, packet = makePacket(fixture)) {
  const packetPath = path.join(fixture.root, `packet-${packet.packet_id}.json`);
  writePrivateJson(packetPath, packet);
  const body = readFileSync(packetPath);
  return Object.freeze({ path: packetPath, sha256: sha256Bytes(body), bytes: body.length, packet });
}

export function signedStatement(fixture, {
  statementSha256,
  source = fixture.aSource,
  action,
  role = "rollback-owner",
  keyId = "rollback-owner-key",
  privateKey = fixture.ownerPrivateKey,
  name,
  signedAt = fixture.authoritySignedAt,
} = {}) {
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: `rfd017-${name}`,
    key_id: keyId,
    role,
    decision: "approved",
    packet_sha256: statementSha256,
    source_sha: source.sha,
    source_tree: source.tree,
    action,
    environment: fixture.environment,
    signed_at: signedAt,
    expires_at: iso(Date.parse(signedAt) + 20 * 60 * 1000),
    data_scope: ["none"],
    contact_scope: ["none"],
  };
  const receiptPath = json(path.join(fixture.root, `${name}.json`), receipt);
  const signaturePath = privateWrite(path.join(fixture.root, `${name}.sig`), sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey));
  return { receipt, receiptPath, signaturePath };
}

export function packetAuthorities(fixture, packet) {
  const approval = signedStatement(fixture, { statementSha256: packet.packet_sha256, action: MATTER_ROLLBACK_ACTION, name: "packet-approval" });
  const checkpoint = signedStatement(fixture, {
    statementSha256: packet.packet_sha256,
    action: MATTER_ROLLBACK_EXECUTION_ACTION,
    name: "execution-checkpoint",
    signedAt: iso(Date.parse(fixture.authoritySignedAt) + 1),
  });
  return { approval, checkpoint };
}

export function finalSeal(fixture, receipt, signedAt = new Date().toISOString()) {
  return signedStatement(fixture, {
    statementSha256: receipt.canonical_digest,
    source: fixture.aSource,
    action: MATTER_ROLLBACK_SEAL_ACTION,
    role: "rollback-attestor",
    keyId: "rollback-attestor-key",
    privateKey: fixture.attestorPrivateKey,
    name: `final-seal-${Date.now()}`,
    signedAt,
  });
}

export function runCli(script, args, fixture, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, MATTER_ROLLBACK_TEST_ADAPTER_CONFIG: fixture.adapterConfigPath, ...extraEnv },
  });
}

export function parseJsonOutput(result) {
  return JSON.parse(result.status === 0 ? result.stdout : result.stderr);
}

export function executeApiCli(fixture, packetRef, authorities, { runId = "run-fixture-0001", invocationId = "api-fixture-0001", receiptPath } = {}) {
  const output = receiptPath ?? path.join(fixture.root, "rollback-receipt.json");
  const result = runCli(API_RUNNER, [
    "--mode", "execute",
    "--adapter", "real",
    "--profile", fixture.environment === "production" ? "matter-prod-deploy-admin" : "matter-staging-admin",
    "--packet", packetRef.path,
    "--approval-receipt", authorities.approval.receiptPath,
    "--approval-signature", authorities.approval.signaturePath,
    "--execution-checkpoint-receipt", authorities.checkpoint.receiptPath,
    "--execution-checkpoint-signature", authorities.checkpoint.signaturePath,
    "--adapter-module", fixture.apiAdapterPath,
    "--run-id", runId,
    "--invocation-id", invocationId,
    "--receipt", output,
  ], fixture);
  return { result, receiptPath: output };
}

export function executeDesktopCli(fixture, packetRef, receiptPath, { invocationId = "desktop-fixture-0001", isolatedPath } = {}) {
  const isolated = isolatedPath ?? path.join(fixture.root, "isolated-user-data");
  mkdirSync(isolated, { mode: 0o700 });
  const result = runCli(DESKTOP_RUNNER, [
    "--platform", "macos",
    "--adapter", "real",
    "--profile", fixture.environment === "production" ? "matter-prod-deploy-admin" : "matter-staging-admin",
    "--packet", packetRef.path,
    "--isolated-user-data", isolated,
    "--adapter-module", fixture.desktopAdapterPath,
    "--invocation-id", invocationId,
    "--receipt", receiptPath,
  ], fixture);
  return { result, isolatedPath: isolated };
}
