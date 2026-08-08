import { createHash } from "node:crypto";

function codedError(code, message) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
    status: 409,
  });
}

function requiredString(input, field, code = "EMAIL_FILING_CORRECTION_INVALID") {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw codedError(code, `${field} is required`);
  }
  return value.trim();
}

function occurredAt(value) {
  const normalized = requiredString({ value }, "value");
  if (!Number.isFinite(Date.parse(normalized))) {
    throw codedError("EMAIL_FILING_CORRECTION_INVALID", "occurred_at must be an ISO timestamp");
  }
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function mimeSha256(input) {
  const value = requiredString(input, "mime_sha256");
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw codedError("EMAIL_FILING_CORRECTION_INVALID", "mime_sha256 must be lowercase SHA-256");
  }
  return value;
}

function reason(input) {
  const value = requiredString(input, "reason");
  if (/[\r\n]/u.test(value) || value.length > 500) {
    throw codedError("EMAIL_FILING_CORRECTION_INVALID", "reason must be one line with at most 500 characters");
  }
  return value;
}

function fingerprint(fields) {
  return sha256(JSON.stringify(fields));
}

export function normalizeOriginalEmailFiling(input = {}) {
  const normalized = Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    email_thread_id: requiredString(input, "email_thread_id"),
    document_id: requiredString(input, "document_id"),
    mime_sha256: mimeSha256(input),
    original_receipt_id: requiredString(input, "original_receipt_id"),
    matter_id: requiredString(input, "matter_id"),
    actor_id: requiredString(input, "actor_id"),
    occurred_at: occurredAt(input.occurred_at),
  });
  return normalized;
}

export function originalEmailFilingPlacementId(input = {}) {
  const original = normalizeOriginalEmailFiling(input);
  return `placement:original:${fingerprint([
    original.tenant_id,
    original.email_thread_id,
    original.document_id,
    original.mime_sha256,
    original.original_receipt_id,
    original.matter_id,
  ])}`;
}

export function emailFilingCorrectionFingerprint(input = {}) {
  const normalizedReason = reason(input);
  return fingerprint([
    requiredString(input, "tenant_id"),
    requiredString(input, "email_thread_id"),
    requiredString(input, "document_id"),
    mimeSha256(input),
    requiredString(input, "original_receipt_id"),
    requiredString(input, "source_matter_id"),
    requiredString(input, "target_matter_id"),
    sha256(normalizedReason),
    requiredString(input, "prior_placement_id"),
    requiredString(input, "actor_id", "EMAIL_FILING_CORRECTION_ACTOR_REQUIRED"),
  ]);
}

export function createOriginalEmailFilingPlacement(input = {}) {
  const original = normalizeOriginalEmailFiling(input);
  const { matter_id: matterId, ...immutableOriginal } = original;
  const placementId = originalEmailFilingPlacementId(original);
  const payloadFingerprint = fingerprint([placementId, original.actor_id, original.occurred_at]);
  return Object.freeze({
    model_type: "EmailFilingPlacementOrigin",
    event_kind: "original",
    correction_id: `origin:${payloadFingerprint}`,
    placement_id: placementId,
    ...immutableOriginal,
    source_matter_id: matterId,
    target_matter_id: matterId,
    reason: "",
    reason_hash: sha256(""),
    idempotency_key: `original:${original.original_receipt_id}`,
    payload_fingerprint: payloadFingerprint,
    prior_placement_id: null,
    status: "original",
  });
}

export function createEmailFilingCorrection(input = {}) {
  const sourceMatterId = requiredString(input, "source_matter_id");
  const targetMatterId = requiredString(input, "target_matter_id");
  if (sourceMatterId === targetMatterId) {
    throw codedError("EMAIL_FILING_CORRECTION_SAME_MATTER", "source and target Matter must differ");
  }
  const normalizedReason = reason(input);
  const actorId = requiredString(input, "actor_id", "EMAIL_FILING_CORRECTION_ACTOR_REQUIRED");
  const correctionId = requiredString(input, "correction_id");
  const event = {
    model_type: "EmailFilingCorrection",
    event_kind: "correction",
    correction_id: correctionId,
    placement_id: `placement:${correctionId}`,
    tenant_id: requiredString(input, "tenant_id"),
    email_thread_id: requiredString(input, "email_thread_id"),
    document_id: requiredString(input, "document_id"),
    mime_sha256: mimeSha256(input),
    original_receipt_id: requiredString(input, "original_receipt_id"),
    source_matter_id: sourceMatterId,
    target_matter_id: targetMatterId,
    reason: normalizedReason,
    reason_hash: sha256(normalizedReason),
    actor_id: actorId,
    occurred_at: occurredAt(input.occurred_at),
    idempotency_key: requiredString(input, "idempotency_key"),
    payload_fingerprint: emailFilingCorrectionFingerprint(input),
    prior_placement_id: requiredString(input, "prior_placement_id"),
    status: "applied",
  };
  return Object.freeze(event);
}

export function normalizeEmailFilingPlacementEvent(input = {}) {
  if (input.event_kind === "original") {
    const original = createOriginalEmailFilingPlacement({ ...input, matter_id: input.target_matter_id });
    if (
      input.model_type !== original.model_type
      || input.placement_id !== original.placement_id
      || input.correction_id !== original.correction_id
      || input.payload_fingerprint !== original.payload_fingerprint
      || input.source_matter_id !== original.source_matter_id
      || input.target_matter_id !== original.target_matter_id
      || input.reason !== original.reason
      || input.reason_hash !== original.reason_hash
      || input.idempotency_key !== original.idempotency_key
      || input.prior_placement_id !== null
      || input.status !== original.status
    ) {
      throw codedError("EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT", "stored original placement conflicts with immutable filing");
    }
    return original;
  }
  const correction = createEmailFilingCorrection(input);
  if (
    input.event_kind !== correction.event_kind
    || input.model_type !== correction.model_type
    || input.placement_id !== correction.placement_id
    || input.reason_hash !== correction.reason_hash
    || input.payload_fingerprint !== correction.payload_fingerprint
    || input.status !== correction.status
  ) {
    throw codedError("EMAIL_FILING_CORRECTION_INVALID", "stored correction fingerprint is invalid");
  }
  return correction;
}

function placementProjection(event) {
  return Object.freeze({
    placement_id: event.placement_id,
    correction_id: event.correction_id,
    event_kind: event.event_kind,
    tenant_id: event.tenant_id,
    email_thread_id: event.email_thread_id,
    original_receipt_id: event.original_receipt_id,
    source_matter_id: event.source_matter_id,
    target_matter_id: event.target_matter_id,
    matter_id: event.target_matter_id,
    document_id: event.document_id,
    mime_sha256: event.mime_sha256,
    reason: event.reason,
    reason_hash: event.reason_hash,
    actor_id: event.actor_id,
    occurred_at: event.occurred_at,
    prior_placement_id: event.prior_placement_id,
    status: event.status,
    document_reference: Object.freeze({
      matter_id: event.target_matter_id,
      document_id: event.document_id,
      mime_sha256: event.mime_sha256,
    }),
  });
}

export function deriveEmailFilingPlacementChain({ original_filing, placements = [] } = {}) {
  const origin = createOriginalEmailFilingPlacement(original_filing);
  const normalized = placements.map(normalizeEmailFilingPlacementEvent);
  const origins = normalized.filter((event) => event.event_kind === "original");
  if (origins.length > 1) {
    throw codedError("EMAIL_FILING_CORRECTION_CHAIN_CONFLICT", "placement chain contains multiple origins");
  }
  const storedOrigin = origins[0] ?? origin;
  if (storedOrigin.placement_id !== origin.placement_id || storedOrigin.payload_fingerprint !== origin.payload_fingerprint) {
    throw codedError("EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT", "original placement identity changed");
  }
  const corrections = normalized.filter((event) => event.event_kind === "correction");
  const children = new Map();
  for (const correction of corrections) {
    if (children.has(correction.prior_placement_id)) {
      throw codedError("EMAIL_FILING_CORRECTION_CHAIN_CONFLICT", "placement chain contains a fork");
    }
    children.set(correction.prior_placement_id, correction);
  }
  const history = [storedOrigin];
  while (children.has(history.at(-1).placement_id)) {
    const child = children.get(history.at(-1).placement_id);
    const parent = history.at(-1);
    if (
      child.source_matter_id !== parent.target_matter_id
      || child.tenant_id !== origin.tenant_id
      || child.email_thread_id !== origin.email_thread_id
      || child.document_id !== origin.document_id
      || child.mime_sha256 !== origin.mime_sha256
      || child.original_receipt_id !== origin.original_receipt_id
      || history.some((event) => event.placement_id === child.placement_id)
    ) {
      throw codedError("EMAIL_FILING_CORRECTION_CHAIN_CONFLICT", "placement chain is not continuous");
    }
    history.push(child);
  }
  if (history.length !== corrections.length + 1) {
    throw codedError("EMAIL_FILING_CORRECTION_CHAIN_CONFLICT", "placement chain contains an orphan");
  }
  const projected = Object.freeze(history.map(placementProjection));
  return Object.freeze({ history: projected, current: projected.at(-1), origin });
}
