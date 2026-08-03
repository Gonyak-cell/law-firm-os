import { readFileSync } from "node:fs";
import {
  MATTER_ROLLBACK_ATTEST_ACTION,
  canonicalSha256,
  exactKeys,
  fail,
  requiredText,
  resolveApprovedMatterRollbackAdapter,
  sha256Bytes,
  timestamp,
  validateFileDescriptor,
  validateMatterRollbackAuthorityReference,
} from "./matter-rollback-contract.mjs";

export const MATTER_ROLLBACK_RAW_EXECUTION_SCHEMA = "law-firm-os.matter-rollback.raw-execution.v2";
export const MATTER_ROLLBACK_STEP_MAX_AGE_MS = 20 * 60 * 1000;

const API_STEPS = Object.freeze(["A_BEFORE", "B_CURRENT", "A_ROLLBACK"]);
const DESKTOP_STEPS = Object.freeze(["B_CURRENT", "A_ROLLBACK"]);

function sourceFor(packet, stepId) {
  return stepId === "B_CURRENT" ? packet.current_b.manifest.source : packet.target_a.manifest.source;
}

function targetFor(packet, stepId) {
  return stepId === "B_CURRENT" ? packet.current_b.manifest : packet.target_a.manifest;
}

function validateMutation(value, stepId) {
  exactKeys(value, ["attempted", "started", "completed", "failed", "unknown"], "mutation telemetry");
  if (Object.values(value).some((entry) => typeof entry !== "boolean")) fail("MATTER_ROLLBACK_MUTATION_TELEMETRY", "mutation telemetry must be boolean");
  if (!value.attempted) {
    if (value.started || value.completed || value.failed || value.unknown) fail("MATTER_ROLLBACK_MUTATION_TELEMETRY", "non-attempted mutation cannot have a later state");
  } else if (!value.started || !value.completed || value.failed || value.unknown) {
    fail("MATTER_ROLLBACK_MUTATION_TELEMETRY", "authoritative PASS requires attempted, started, and completed mutation telemetry");
  }
  if (stepId === "A_BEFORE" && value.attempted) fail("MATTER_ROLLBACK_MUTATION_TELEMETRY", "A_BEFORE must remain read-only");
  if (stepId !== "A_BEFORE" && !value.attempted) fail("MATTER_ROLLBACK_MUTATION_TELEMETRY", `${stepId} must attest its transition`);
}

function validateCounts(value) {
  exactKeys(value, [
    "data_rollback_write_count", "database_write_count", "bucket_write_count",
    "network_write_count", "production_contact_count",
  ], "execution counts");
  if (Object.values(value).some((entry) => entry !== 0)) fail("MATTER_ROLLBACK_WRITE_BOUNDARY", "rollback evidence reports a forbidden write or production contact");
}

function validateStepEvidence(raw, packet, surface, expectedStep, ordinal, previousSha256, repoRoot, now) {
  exactKeys(raw, [
    "schema_version", "receipt_id", "packet_id", "packet_sha256", "execution_nonce", "run_id",
    "surface", "step_id", "ordinal", "environment", "adapter_sha256", "invocation_id",
    "started_at", "finished_at", "source", "artifacts", "checks", "mutation", "counts",
    "previous_receipt_sha256", "raw_evidence",
  ], "raw execution receipt");
  if (raw.schema_version !== MATTER_ROLLBACK_RAW_EXECUTION_SCHEMA || raw.packet_id !== packet.packet_id
    || raw.packet_sha256 !== packet.packet_sha256 || raw.execution_nonce !== packet.execution_nonce
    || raw.environment !== packet.environment || raw.surface !== surface || raw.step_id !== expectedStep || raw.ordinal !== ordinal) {
    fail("MATTER_ROLLBACK_RAW_RECEIPT_BINDING", "raw execution receipt identity or order differs from the packet");
  }
  requiredText(raw.receipt_id, "raw receipt_id", /^[A-Za-z0-9._:-]{8,128}$/u);
  requiredText(raw.run_id, "run_id", /^[A-Za-z0-9._:-]{8,128}$/u);
  requiredText(raw.invocation_id, "invocation_id", /^[A-Za-z0-9._:-]{8,128}$/u);
  if (raw.adapter_sha256 !== packet.execution_boundary.adapters[surface].sha256
    || raw.previous_receipt_sha256 !== previousSha256) fail("MATTER_ROLLBACK_RAW_RECEIPT_BINDING", "raw receipt adapter or hash-chain binding differs");
  const started = timestamp(raw.started_at, "raw started_at");
  const finished = timestamp(raw.finished_at, "raw finished_at");
  if (started < timestamp(packet.generated_at, "packet generated_at") || finished < started
    || finished > timestamp(packet.expires_at, "packet expires_at") || now - finished > MATTER_ROLLBACK_STEP_MAX_AGE_MS) {
    fail("MATTER_ROLLBACK_RECEIPT_FRESHNESS", "raw receipt is stale, future-dated, or out of order");
  }
  const expectedSource = sourceFor(packet, expectedStep);
  exactKeys(raw.source, ["sha", "tree"], "raw source");
  if (canonicalSha256(raw.source) !== canonicalSha256(expectedSource)) fail("MATTER_ROLLBACK_SOURCE_PROVENANCE", "raw receipt source differs from exact packet source/tree");
  const target = targetFor(packet, expectedStep);
  if (surface === "api") {
    exactKeys(raw.artifacts, ["api_artifact_sha256", "api_environment_sha256", "api_s3_version_id"], "API raw artifacts");
    if (raw.artifacts.api_artifact_sha256 !== target.api.artifact.sha256
      || raw.artifacts.api_environment_sha256 !== target.api.environment_sha256
      || raw.artifacts.api_s3_version_id !== target.api.s3.version_id) fail("MATTER_ROLLBACK_ARTIFACT_HASH", "API raw receipt is not exact-artifact bound");
    exactKeys(raw.checks, [
      "health_status", "login_status", "durable_readback_scope_sha256",
      "durable_readback_sha256", "durable_readback_record_count",
    ], "API checks");
    if (raw.checks.health_status !== "ok" || raw.checks.login_status !== "PASS"
      || !/^[0-9a-f]{64}$/u.test(raw.checks.durable_readback_scope_sha256 ?? "")
      || !/^[0-9a-f]{64}$/u.test(raw.checks.durable_readback_sha256 ?? "")
      || !Number.isInteger(raw.checks.durable_readback_record_count) || raw.checks.durable_readback_record_count <= 0) {
      fail("MATTER_ROLLBACK_API_CHECK", "API raw health, login, or durable readback evidence failed");
    }
  } else {
    exactKeys(raw.artifacts, ["package_manifest_sha256", "disk_image_sha256", "archive_sha256", "release_receipt_sha256"], "desktop raw artifacts");
    const expected = target.desktop.release_evidence;
    if (raw.artifacts.package_manifest_sha256 !== expected.build_manifest.sha256
      || raw.artifacts.disk_image_sha256 !== JSON.parse(readFileSync(expected.receipt.path, "utf8")).artifacts.disk_image.sha256
      || raw.artifacts.archive_sha256 !== target.desktop.archive.sha256
      || raw.artifacts.release_receipt_sha256 !== expected.receipt.sha256) {
      fail("MATTER_ROLLBACK_ARTIFACT_HASH", "desktop raw receipt is not RFD-TUW-012 exact-artifact bound");
    }
    exactKeys(raw.checks, ["launch_status", "login_status", "isolated_user_data_path_sha256", "isolated_user_data_empty_before"], "desktop checks");
    if (raw.checks.launch_status !== "PASS" || raw.checks.login_status !== "PASS"
      || !/^[0-9a-f]{64}$/u.test(raw.checks.isolated_user_data_path_sha256 ?? "")
      || raw.checks.isolated_user_data_empty_before !== true) fail("MATTER_ROLLBACK_DESKTOP_CHECK", "desktop launch, login, or isolation evidence failed");
  }
  validateMutation(raw.mutation, expectedStep);
  validateCounts(raw.counts);
  validateFileDescriptor(raw.raw_evidence, "raw immutable evidence", { privateFile: true, repoRoot });
  return Object.freeze({ started, finished, raw });
}

function validateAttestedStep(bundle, packet, options) {
  exactKeys(bundle, ["receipt", "attestation"], "attested step bundle");
  const receipt = validateFileDescriptor(bundle.receipt, "raw execution receipt", { privateFile: true, repoRoot: options.repoRoot });
  let raw;
  try { raw = JSON.parse(readFileSync(receipt.path, "utf8")); }
  catch { fail("MATTER_ROLLBACK_JSON", "raw execution receipt is not valid JSON"); }
  const step = validateStepEvidence(raw, packet, options.surface, options.expectedStep, options.ordinal, options.previousSha256, options.repoRoot, options.now);
  const attestation = validateMatterRollbackAuthorityReference(bundle.attestation, {
    packet,
    action: MATTER_ROLLBACK_ATTEST_ACTION,
    role: packet.approval.attestor_role,
    statementSha256: canonicalSha256(raw),
    source: raw.source,
    repoRoot: options.repoRoot,
    now: options.now,
  });
  const signedAt = timestamp(attestation.signed_at, "attestation signed_at");
  if (signedAt < step.finished || signedAt - step.finished > 5 * 60 * 1000) {
    fail("MATTER_ROLLBACK_ATTESTATION_CHRONOLOGY", "independent attestation did not follow its raw observation promptly");
  }
  return Object.freeze({ ...bundle, raw, receipt, attestation, started: step.started, finished: step.finished });
}

export function normalizeMatterRollbackAdapterResult(result, {
  packet,
  surface,
  runId,
  invocationId,
  invocationStartedAt = null,
  adapterSha256,
  repoRoot = process.cwd(),
  now = Date.now(),
} = {}) {
  exactKeys(result, ["surface", "run_id", "invocation_id", "started_at", "finished_at", "steps"], `${surface} adapter result`);
  if (result.surface !== surface || result.run_id !== runId || result.invocation_id !== invocationId
    || adapterSha256 !== packet.execution_boundary.adapters[surface].sha256 || !Array.isArray(result.steps)) {
    fail("MATTER_ROLLBACK_ADAPTER_RESULT", "adapter result differs from the registered invocation");
  }
  const expectedSteps = surface === "api" ? API_STEPS : DESKTOP_STEPS;
  if (result.steps.length !== expectedSteps.length) fail("MATTER_ROLLBACK_ADAPTER_RESULT", "adapter result has an incomplete step set");
  const startedAt = timestamp(result.started_at, "adapter started_at");
  const finishedAt = timestamp(result.finished_at, "adapter finished_at");
  if (finishedAt < startedAt || finishedAt > now
    || (invocationStartedAt && startedAt < timestamp(invocationStartedAt, "registered invocation started_at"))) {
    fail("MATTER_ROLLBACK_ADAPTER_RESULT", "adapter invocation chronology is invalid");
  }
  let previousSha256 = null;
  let previousFinished = startedAt;
  const rawReceiptIds = new Set();
  const attestationApprovalIds = new Set();
  const normalizedSteps = result.steps.map((bundle, ordinal) => {
    const normalized = validateAttestedStep(bundle, packet, {
      surface,
      expectedStep: expectedSteps[ordinal],
      ordinal,
      previousSha256,
      repoRoot,
      now,
    });
    if (normalized.raw.run_id !== runId || normalized.raw.invocation_id !== invocationId) {
      fail("MATTER_ROLLBACK_RAW_RECEIPT_BINDING", "raw receipt differs from the runner invocation identity");
    }
    if (normalized.started < previousFinished || normalized.finished > finishedAt) {
      fail("MATTER_ROLLBACK_RECEIPT_CHRONOLOGY", "raw step chronology is not monotonic inside the adapter invocation");
    }
    if (rawReceiptIds.has(normalized.raw.receipt_id)
      || attestationApprovalIds.has(normalized.attestation.approval_id)) {
      fail("MATTER_ROLLBACK_EVIDENCE_ID_DUPLICATE", "raw receipt and attestation identities must be unique inside the invocation");
    }
    rawReceiptIds.add(normalized.raw.receipt_id);
    attestationApprovalIds.add(normalized.attestation.approval_id);
    previousSha256 = normalized.receipt.sha256;
    previousFinished = normalized.finished;
    return normalized;
  });
  let durableReadback = null;
  if (surface === "api") {
    const observations = normalizedSteps.map(({ raw }) => ({
      scope_sha256: raw.checks.durable_readback_scope_sha256,
      snapshot_sha256: raw.checks.durable_readback_sha256,
      record_count: raw.checks.durable_readback_record_count,
    }));
    const baseline = observations[0];
    if (observations.some((value) => canonicalSha256(value) !== canonicalSha256(baseline))) {
      fail("MATTER_ROLLBACK_DURABLE_READBACK_MISMATCH", "A/B/A durable readback scope, snapshot, or record count differs");
    }
    durableReadback = Object.freeze(baseline);
  }
  const steps = normalizedSteps.map((normalized) => Object.freeze({
    receipt: normalized.receipt,
    attestation: normalized.attestation,
  }));
  return Object.freeze({
    surface,
    run_id: runId,
    invocation_id: invocationId,
    adapter_sha256: adapterSha256,
    started_at: result.started_at,
    finished_at: result.finished_at,
    mutation: { attempted: true, started: true, completed: true, failed: false, unknown: false },
    durable_readback: durableReadback,
    evidence_ids: Object.freeze({
      raw_receipt_ids: Object.freeze([...rawReceiptIds]),
      attestation_approval_ids: Object.freeze([...attestationApprovalIds]),
    }),
    steps,
  });
}

export async function importApprovedMatterRollbackAdapter(packet, surface, candidate) {
  const approved = resolveApprovedMatterRollbackAdapter(packet, surface, candidate);
  const exactBytes = readFileSync(approved.path);
  if (sha256Bytes(exactBytes) !== approved.sha256 || exactBytes.length !== approved.bytes) {
    fail("MATTER_ROLLBACK_ADAPTER_NOT_APPROVED", "approved rollback adapter bytes drifted before import");
  }
  const module = await import(`data:text/javascript;base64,${exactBytes.toString("base64")}#${approved.sha256}`);
  if (typeof module[approved.export_name] !== "function") fail("MATTER_ROLLBACK_ADAPTER", "approved rollback adapter export is missing");
  return Object.freeze({ approved, execute: module[approved.export_name] });
}
