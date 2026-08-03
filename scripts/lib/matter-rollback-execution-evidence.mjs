import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  MATTER_ROLLBACK_RF13_DIST_SIDECAR_SCHEMA,
  MATTER_ROLLBACK_SEAL_ACTION,
  canonicalSha256,
  exactKeys,
  fail,
  outsideRoot,
  readJsonFile,
  readMatterRollbackPacket,
  resolvePrivateOutputPath,
  sha256Bytes,
  timestamp,
  validateFileDescriptor,
  validateMatterRollbackAuthorityReference,
  validateMatterRollbackSignedStatement,
} from "./matter-rollback-contract.mjs";
import { normalizeMatterRollbackAdapterResult } from "./matter-rollback-raw-evidence.mjs";
import { commitMatterRollbackEvidenceTransaction } from "./matter-rollback-finalization-store.mjs";

export * from "./matter-rollback-raw-evidence.mjs";
export const MATTER_ROLLBACK_RECEIPT_SCHEMA = "law-firm-os.matter-rollback.receipt.v2";
export const MATTER_ROLLBACK_SEAL_MAX_AGE_MS = 5 * 60 * 1000;

const PREPARED_FINALS = new WeakSet();
const COMMITTED_FINALS = new WeakSet();

function same(left, right) {
  return canonicalSha256(left) === canonicalSha256(right);
}

function packetReference(packetRef) {
  return Object.freeze({
    path: packetRef.path,
    sha256: packetRef.sha256,
    bytes: packetRef.bytes,
    packet_id: packetRef.packet.packet_id,
    packet_sha256: packetRef.packet.packet_sha256,
  });
}

function receiptDigest(receipt) {
  const body = { ...receipt };
  delete body.canonical_digest;
  return canonicalSha256(body);
}

export function matterRollbackExecutionIdentity(packet, runId, platform = "macos") {
  return Object.freeze({
    schema_version: "law-firm-os.matter-rollback.execution-identity.v1",
    packet_id: packet.packet_id,
    packet_sha256: packet.packet_sha256,
    execution_nonce: packet.execution_nonce,
    run_id: runId,
    target_source_sha: packet.target_a.manifest.source.sha,
    target_source_tree: packet.target_a.manifest.source.tree,
    platform,
    route: packet.route,
  });
}

export function matterRollbackFinalReceiptId(packet, runId, platform = "macos") {
  return `rfd017-final-${canonicalSha256(matterRollbackExecutionIdentity(packet, runId, platform))}`;
}

function currentBArtifactHashes(packet) {
  const manifest = packet.current_b.manifest;
  const releaseReceiptDescriptor = manifest.desktop.release_evidence.receipt;
  const releaseReceipt = readJsonFile(releaseReceiptDescriptor.path, "current B RFD-TUW-012 receipt");
  if (releaseReceipt.sha256 !== releaseReceiptDescriptor.sha256 || releaseReceipt.bytes !== releaseReceiptDescriptor.bytes) {
    fail("MATTER_ROLLBACK_ARTIFACT_HASH", "current B RFD-TUW-012 receipt drifted after packet validation");
  }
  const archive = validateFileDescriptor(manifest.desktop.archive, "current B desktop archive");
  const diskImageSha256 = releaseReceipt.value?.artifacts?.disk_image?.sha256;
  if (!/^[0-9a-f]{64}$/u.test(diskImageSha256 ?? "")) {
    fail("MATTER_ROLLBACK_ARTIFACT_HASH", "current B RFD-TUW-012 receipt lacks the exact disk image hash");
  }
  return [diskImageSha256, archive.sha256].sort();
}

function withDigest(body) {
  return Object.freeze({ ...body, canonical_digest: canonicalSha256(body) });
}

export function buildMatterRollbackPartialReceipt({ packetRef, approval, executionCheckpoint, apiExecution, generatedAt }) {
  const packet = packetRef.packet;
  const generated = timestamp(generatedAt, "partial receipt generated_at");
  if (generated < timestamp(apiExecution.finished_at, "API finished_at")) fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "partial receipt predates API completion");
  return withDigest({
    schema_version: MATTER_ROLLBACK_RECEIPT_SCHEMA,
    receipt_id: matterRollbackFinalReceiptId(packet, apiExecution.run_id),
    state: "API_ATTESTED",
    packet: packetReference(packetRef),
    packet_id: packet.packet_id,
    packet_sha256: packet.packet_sha256,
    execution_nonce: packet.execution_nonce,
    environment: packet.environment,
    run_id: apiExecution.run_id,
    authority: { approval, execution_checkpoint: executionCheckpoint },
    api_execution: apiExecution,
    desktop_execution: null,
    adapter_invocation_count: 1,
    generated_at: generatedAt,
    claims: {
      actual_staging_round_trip: false,
      data_rollback_write_count: 0,
      production_contacted: false,
      production_rollback_claim: false,
      synthetic_or_dry_run: false,
    },
  });
}

function readPacketReference(reference, repoRoot, now, macosLiveValidations) {
  exactKeys(reference, ["path", "sha256", "bytes", "packet_id", "packet_sha256"], "packet reference");
  const packetRef = readMatterRollbackPacket(reference.path, { repoRoot, now, macosLiveValidations });
  if (packetRef.sha256 !== reference.sha256 || packetRef.bytes !== reference.bytes
    || packetRef.packet.packet_id !== reference.packet_id || packetRef.packet.packet_sha256 !== reference.packet_sha256) {
    fail("MATTER_ROLLBACK_PACKET_REFERENCE", "rollback packet reference drifted");
  }
  return packetRef;
}

function validateExecutionRecord(record, packet, surface, repoRoot, now) {
  exactKeys(record, [
    "surface", "run_id", "invocation_id", "adapter_sha256", "started_at", "finished_at",
    "mutation", "durable_readback", "evidence_ids", "steps",
  ], `${surface} execution record`);
  const normalized = normalizeMatterRollbackAdapterResult({
    surface: record.surface,
    run_id: record.run_id,
    invocation_id: record.invocation_id,
    started_at: record.started_at,
    finished_at: record.finished_at,
    steps: record.steps,
  }, {
    packet,
    surface,
    runId: record.run_id,
    invocationId: record.invocation_id,
    adapterSha256: record.adapter_sha256,
    repoRoot,
    now,
  });
  if (!same(record, normalized)) fail("MATTER_ROLLBACK_RECEIPT_TAMPERED", `${surface} execution record differs from raw evidence`);
  return normalized;
}

function authorityChronology(receipt, packet, repoRoot, now) {
  exactKeys(receipt.authority, ["approval", "execution_checkpoint"], "receipt authority");
  const common = {
    packet,
    role: packet.approval.owner_role,
    statementSha256: packet.packet_sha256,
    source: packet.target_a.manifest.source,
    repoRoot,
    now,
  };
  const approval = validateMatterRollbackAuthorityReference(receipt.authority.approval, {
    ...common,
    action: packet.approval.action,
  });
  const checkpoint = validateMatterRollbackAuthorityReference(receipt.authority.execution_checkpoint, {
    ...common,
    action: packet.approval.execution_action,
  });
  const generated = timestamp(packet.generated_at, "packet generated_at");
  const apiStarted = timestamp(receipt.api_execution.started_at, "API started_at");
  const approvalAt = timestamp(approval.signed_at, "approval signed_at");
  const checkpointAt = timestamp(checkpoint.signed_at, "checkpoint signed_at");
  for (const signedAt of [approvalAt, checkpointAt]) {
    if (signedAt < generated || signedAt > apiStarted) fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "authority checkpoint is not between packet creation and execution");
  }
  if (approvalAt >= checkpointAt || approval.approval_id === checkpoint.approval_id) {
    fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "packet approval must precede a distinct execution checkpoint");
  }
  return { approval, checkpoint };
}

export function validateMatterRollbackPartialReceipt(receipt, {
  packetRef = null,
  repoRoot = process.cwd(),
  now = Date.now(),
  macosLiveValidations = null,
} = {}) {
  if (receipt?.schema_version !== MATTER_ROLLBACK_RECEIPT_SCHEMA || receipt.state !== "API_ATTESTED"
    || receipt.desktop_execution !== null || receipt.adapter_invocation_count !== 1) {
    fail("MATTER_ROLLBACK_PARTIAL_RECEIPT", "partial rollback receipt state is invalid");
  }
  if (receiptDigest(receipt) !== receipt.canonical_digest) fail("MATTER_ROLLBACK_RECEIPT_TAMPERED", "partial receipt canonical digest differs");
  const actualPacketRef = packetRef ?? readPacketReference(receipt.packet, repoRoot, now, macosLiveValidations);
  if (!same(receipt.packet, packetReference(actualPacketRef))) fail("MATTER_ROLLBACK_PACKET_REFERENCE", "partial receipt packet reference differs");
  const api = validateExecutionRecord(receipt.api_execution, actualPacketRef.packet, "api", repoRoot, now);
  if (receipt.run_id !== api.run_id || receipt.packet_id !== actualPacketRef.packet.packet_id
    || receipt.packet_sha256 !== actualPacketRef.packet.packet_sha256 || receipt.execution_nonce !== actualPacketRef.packet.execution_nonce
    || receipt.receipt_id !== matterRollbackFinalReceiptId(actualPacketRef.packet, receipt.run_id)
    || api.durable_readback === null) {
    fail("MATTER_ROLLBACK_RECEIPT_BINDING", "partial receipt run, packet, or nonce differs");
  }
  const authority = authorityChronology(receipt, actualPacketRef.packet, repoRoot, now);
  return Object.freeze({ packetRef: actualPacketRef, api, authority });
}

export function attachMatterRollbackDesktopReceipt(partial, { packetRef, desktopExecution, generatedAt, repoRoot = process.cwd(), now = Date.now() }) {
  const validated = validateMatterRollbackPartialReceipt(partial, { packetRef, repoRoot, now });
  if (desktopExecution.run_id !== partial.run_id || timestamp(desktopExecution.started_at, "desktop started_at") < timestamp(validated.api.finished_at, "API finished_at")) {
    fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "desktop execution does not follow API execution in the same run");
  }
  const generated = timestamp(generatedAt, "final receipt generated_at");
  if (generated < timestamp(desktopExecution.finished_at, "desktop finished_at")) fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "final receipt predates desktop completion");
  const body = {
    ...partial,
    state: "SEAL_REQUIRED",
    desktop_execution: desktopExecution,
    adapter_invocation_count: 2,
    generated_at: generatedAt,
    claims: { ...partial.claims, actual_staging_round_trip: packetRef.packet.environment === "staging" },
  };
  delete body.canonical_digest;
  return withDigest(body);
}

export function validateMatterRollbackReceipt(receipt, {
  sealReceiptPath,
  sealSignaturePath,
  repoRoot = process.cwd(),
  now = Date.now(),
  macosLiveValidations = null,
} = {}) {
  validateMatterRollbackFinalReceiptEnvelope(receipt);
  const packetRef = readPacketReference(receipt.packet, repoRoot, now, macosLiveValidations);
  const packet = packetRef.packet;
  if (receipt.packet_id !== packet.packet_id || receipt.packet_sha256 !== packet.packet_sha256
    || receipt.execution_nonce !== packet.execution_nonce || receipt.environment !== packet.environment
    || receipt.receipt_id !== matterRollbackFinalReceiptId(packet, receipt.run_id)) {
    fail("MATTER_ROLLBACK_RECEIPT_BINDING", "final receipt packet, nonce, or environment differs");
  }
  const api = validateExecutionRecord(receipt.api_execution, packet, "api", repoRoot, now);
  const desktop = validateExecutionRecord(receipt.desktop_execution, packet, "desktop", repoRoot, now);
  if (receipt.run_id !== api.run_id || receipt.run_id !== desktop.run_id
    || api.invocation_id === desktop.invocation_id
    || timestamp(desktop.started_at, "desktop started_at") < timestamp(api.finished_at, "API finished_at")
    || timestamp(receipt.generated_at, "receipt generated_at") < timestamp(desktop.finished_at, "desktop finished_at")) {
    fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "final receipt chronology or run identity is invalid");
  }
  const authority = authorityChronology(receipt, packet, repoRoot, now);
  const evidenceIds = [
    ...api.evidence_ids.raw_receipt_ids,
    ...api.evidence_ids.attestation_approval_ids,
    ...desktop.evidence_ids.raw_receipt_ids,
    ...desktop.evidence_ids.attestation_approval_ids,
    authority.approval.approval_id,
    authority.checkpoint.approval_id,
  ];
  if (new Set(evidenceIds).size !== evidenceIds.length || api.durable_readback === null || desktop.durable_readback !== null) {
    fail("MATTER_ROLLBACK_EVIDENCE_ID_DUPLICATE", "execution evidence identities or durable-readback surfaces are invalid");
  }
  exactKeys(receipt.claims, ["actual_staging_round_trip", "data_rollback_write_count", "production_contacted", "production_rollback_claim", "synthetic_or_dry_run"], "receipt claims");
  if (packet.environment !== "staging" || receipt.claims.actual_staging_round_trip !== true
    || receipt.claims.data_rollback_write_count !== 0 || receipt.claims.production_contacted !== false
    || receipt.claims.production_rollback_claim !== false || receipt.claims.synthetic_or_dry_run !== false) {
    fail("MATTER_ROLLBACK_RECEIPT_CLAIM", "authoritative PASS is limited to real staging evidence with no data rollback writes");
  }
  if (!sealReceiptPath || !sealSignaturePath) fail("MATTER_ROLLBACK_SEAL_REQUIRED", "final independent seal receipt and signature are required");
  const seal = validateMatterRollbackSignedStatement({
    packet,
    statementSha256: receipt.canonical_digest,
    source: packet.target_a.manifest.source,
    action: MATTER_ROLLBACK_SEAL_ACTION,
    role: packet.approval.attestor_role,
    receiptPath: sealReceiptPath,
    signaturePath: sealSignaturePath,
    repoRoot,
    now,
  });
  const sealAt = timestamp(seal.signed_at, "seal signed_at");
  const generatedAt = timestamp(receipt.generated_at, "receipt generated_at");
  if (sealAt < generatedAt || sealAt > now || now - sealAt > MATTER_ROLLBACK_SEAL_MAX_AGE_MS) {
    fail("MATTER_ROLLBACK_SEAL_FRESHNESS", "final seal is stale, future-dated, or predates the receipt");
  }
  if (evidenceIds.includes(seal.approval_id)) {
    fail("MATTER_ROLLBACK_EVIDENCE_ID_DUPLICATE", "final seal identity must be unique across the execution");
  }
  const currentBArtifacts = currentBArtifactHashes(packet);
  const identity = matterRollbackExecutionIdentity(packet, receipt.run_id);
  const result = Object.freeze({
    verdict: "READY_TO_COMMIT",
    authoritative: false,
    environment: "staging",
    packet_id: packet.packet_id,
    packet_sha256: packet.packet_sha256,
    execution_nonce: packet.execution_nonce,
    run_id: receipt.run_id,
    receipt_canonical_digest: receipt.canonical_digest,
    final_receipt_id: receipt.receipt_id,
    execution_identity_sha256: canonicalSha256(identity),
    adapter_invocation_count: 2,
    api_sequence: "A->B->A",
    desktop_sequence: "B->A",
    durable_readback_preserved: true,
    durable_readback: api.durable_readback,
    data_rollback_write_count: 0,
    staging_round_trip_proved: true,
    approval_receipt_sha256: authority.approval.receipt.sha256,
    execution_checkpoint_receipt_sha256: authority.checkpoint.receipt.sha256,
    seal_receipt_sha256: sha256Bytes(readFileSync(sealReceiptPath)),
    seal_approval_id: seal.approval_id,
    current_b_source_sha: packet.current_b.manifest.source.sha,
    current_b_source_tree: packet.current_b.manifest.source.tree,
    current_b_artifact_sha256: currentBArtifacts,
    platform: "macos",
    production_rollback_claim: false,
  });
  PREPARED_FINALS.add(result);
  return result;
}

export function validateMatterRollbackFinalReceiptEnvelope(receipt) {
  exactKeys(receipt, [
    "schema_version", "receipt_id", "state", "packet", "packet_id", "packet_sha256", "execution_nonce",
    "environment", "run_id", "authority", "api_execution", "desktop_execution", "adapter_invocation_count",
    "generated_at", "claims", "canonical_digest",
  ], "final rollback receipt");
  if (receipt.schema_version !== MATTER_ROLLBACK_RECEIPT_SCHEMA || receipt.state !== "SEAL_REQUIRED"
    || receipt.adapter_invocation_count !== 2 || receipt.desktop_execution === null) {
    fail("MATTER_ROLLBACK_RECEIPT_STATE", "final rollback receipt lacks two registered adapter invocations");
  }
  if (receiptDigest(receipt) !== receipt.canonical_digest) fail("MATTER_ROLLBACK_RECEIPT_TAMPERED", "final receipt canonical digest differs");
  return receipt;
}

export function buildMatterRollbackRf13DistSidecar(receipt, validation) {
  if (!PREPARED_FINALS.has(validation) || validation.verdict !== "READY_TO_COMMIT"
    || validation.receipt_canonical_digest !== receipt.canonical_digest
    || validation.final_receipt_id !== receipt.receipt_id) {
    fail("MATTER_ROLLBACK_RECEIPT_SIDECAR_REQUIRES_STAGING_PASS", "RF13-DIST sidecar requires this validator's prepared staging finalization");
  }
  return Object.freeze({
    schema_version: MATTER_ROLLBACK_RF13_DIST_SIDECAR_SCHEMA,
    receipt_id: receipt.receipt_id,
    gate: "rollback",
    status: "PASS",
    source_sha: validation.current_b_source_sha,
    source_tree: validation.current_b_source_tree,
    artifact_sha256: validation.current_b_artifact_sha256,
    executed: true,
    authoritative: true,
    template: false,
  });
}

export function commitMatterRollbackFinalization(receipt, validation, {
  replayRegistryPath,
  sidecarPath = null,
  repoRoot = process.cwd(),
} = {}) {
  if (!PREPARED_FINALS.has(validation) || validation.verdict !== "READY_TO_COMMIT"
    || validation.receipt_canonical_digest !== receipt.canonical_digest
    || validation.final_receipt_id !== receipt.receipt_id) {
    fail("MATTER_ROLLBACK_FINALIZATION_NOT_PREPARED", "rollback finalization requires this validator's prepared receipt capability");
  }
  const sidecar = sidecarPath ? buildMatterRollbackRf13DistSidecar(receipt, validation) : null;
  const committed = commitMatterRollbackEvidenceTransaction({
    replayRegistryPath,
    executionIdentitySha256: validation.execution_identity_sha256,
    marker: {
      schema_version: "law-firm-os.matter-rollback.replay-seal.v2",
      packet_id: validation.packet_id,
      packet_sha256: validation.packet_sha256,
      execution_nonce: validation.execution_nonce,
      run_id: validation.run_id,
      final_receipt_id: validation.final_receipt_id,
      receipt_canonical_digest: validation.receipt_canonical_digest,
      seal_approval_id: validation.seal_approval_id,
      seal_receipt_sha256: validation.seal_receipt_sha256,
      approval_receipt_sha256: validation.approval_receipt_sha256,
      execution_checkpoint_receipt_sha256: validation.execution_checkpoint_receipt_sha256,
      target_source_sha: validation.current_b_source_sha,
      target_source_tree: validation.current_b_source_tree,
      platform: validation.platform,
    },
    sidecarPath,
    sidecar,
    repoRoot,
  });
  const result = Object.freeze({
    ...validation,
    verdict: "PASS",
    authoritative: true,
    ...committed,
  });
  COMMITTED_FINALS.add(result);
  return result;
}

function readCommittedPrivateEvidence(path, sha256, bytes, label) {
  try {
    if (!isAbsolute(path) || !existsSync(path) || lstatSync(path).isSymbolicLink()
      || !statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0
      || realpathSync(path) !== path || statSync(path).size !== bytes) {
      fail("MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH", `${label} is no longer the committed private file`);
    }
    const body = readFileSync(path);
    if (sha256Bytes(body) !== sha256) {
      fail("MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH", `${label} bytes drifted after commit`);
    }
    return body;
  } catch (error) {
    if (error?.code === "MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH") throw error;
    fail("MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH", `${label} is unavailable`);
  }
}

export function validateMatterRollbackRf13DistSidecar(sidecar, {
  validation,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
} = {}) {
  if (!COMMITTED_FINALS.has(validation) || validation.verdict !== "PASS" || validation.authoritative !== true) {
    fail("MATTER_ROLLBACK_LIVE_AUTHORITY_REQUIRED", "RF13-DIST rollback consumers require same-process committed finalization authority");
  }
  exactKeys(sidecar, [
    "schema_version", "receipt_id", "gate", "status", "source_sha", "source_tree",
    "artifact_sha256", "executed", "authoritative", "template",
  ], "RF13-DIST rollback sidecar");
  if (!Array.isArray(expectedArtifactSha256) || expectedArtifactSha256.length === 0
    || expectedArtifactSha256.some((value) => !/^[0-9a-f]{64}$/u.test(value))) {
    fail("MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH", "RF13-DIST expected artifact hashes are invalid");
  }
  const expectedArtifacts = [...expectedArtifactSha256].sort();
  const sidecarBytes = Buffer.from(`${JSON.stringify(sidecar, null, 2)}\n`);
  const persistedSidecar = readCommittedPrivateEvidence(
    validation.rf13_dist_sidecar_path,
    validation.rf13_dist_sidecar_sha256,
    validation.rf13_dist_sidecar_bytes,
    "committed RF13-DIST rollback sidecar",
  );
  readCommittedPrivateEvidence(
    validation.replay_marker_path,
    validation.replay_marker_sha256,
    validation.replay_marker_bytes,
    "committed rollback replay marker",
  );
  if (sidecar.schema_version !== MATTER_ROLLBACK_RF13_DIST_SIDECAR_SCHEMA
    || sidecar.receipt_id !== validation.final_receipt_id
    || sidecar.gate !== "rollback" || sidecar.status !== "PASS"
    || sidecar.source_sha !== expectedSourceSha || sidecar.source_tree !== expectedSourceTree
    || canonicalSha256(sidecar.artifact_sha256) !== canonicalSha256(expectedArtifacts)
    || canonicalSha256(validation.current_b_artifact_sha256) !== canonicalSha256(expectedArtifacts)
    || validation.current_b_source_sha !== expectedSourceSha || validation.current_b_source_tree !== expectedSourceTree
    || validation.rf13_dist_sidecar_sha256 !== sha256Bytes(sidecarBytes)
    || validation.rf13_dist_sidecar_bytes !== sidecarBytes.length
    || !persistedSidecar.equals(sidecarBytes)
    || sidecar.executed !== true || sidecar.authoritative !== true || sidecar.template !== false) {
    fail("MATTER_ROLLBACK_SIDECAR_BINDING_MISMATCH", "RF13-DIST rollback sidecar differs from committed exact-source authority");
  }
  return Object.freeze({
    verdict: "PASS",
    authoritative: true,
    final_receipt_id: validation.final_receipt_id,
    source_sha: validation.current_b_source_sha,
    source_tree: validation.current_b_source_tree,
    artifact_sha256: Object.freeze([...expectedArtifacts]),
    rf13_dist_sidecar_sha256: validation.rf13_dist_sidecar_sha256,
    replay_marker_sha256: validation.replay_marker_sha256,
    receipt_canonical_digest: validation.receipt_canonical_digest,
    approval_receipt_sha256: validation.approval_receipt_sha256,
    execution_checkpoint_receipt_sha256: validation.execution_checkpoint_receipt_sha256,
    seal_receipt_sha256: validation.seal_receipt_sha256,
    execution_identity_sha256: validation.execution_identity_sha256,
  });
}

export function validateEmptyIsolatedDirectory(candidate, { repoRoot = process.cwd() } = {}) {
  if (typeof candidate !== "string" || !isAbsolute(candidate)) fail("MATTER_ROLLBACK_ISOLATED_DIRECTORY", "isolated directory path is invalid");
  const path = resolve(candidate);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory() || realpathSync(path) !== path
    || !outsideRoot(repoRoot, path) || readdirSync(path).length !== 0) {
    fail("MATTER_ROLLBACK_ISOLATED_DIRECTORY", "isolated user-data directory must be empty, canonical, and outside the worktree");
  }
  return path;
}

export function readPrivateJson(candidate, label, { repoRoot = process.cwd() } = {}) {
  const ref = readJsonFile(candidate, label, { privateFile: true, repoRoot });
  return Object.freeze({ path: ref.path, bytes: ref.bytes, sha256: ref.sha256, value: ref.value });
}

export function resolveMatterRollbackSidecarOutputPath(candidate, options = {}) {
  return resolvePrivateOutputPath(candidate, options);
}
