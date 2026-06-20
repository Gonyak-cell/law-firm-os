function normalizeSegment(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function deriveMatterNumber({ tenant_id, matter_number_seed, year = new Date().getUTCFullYear() } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_number_seed }, "matter_number_seed");
  return `M-${normalizeSegment(tenant_id)}-${year}-${normalizeSegment(matter_number_seed)}`;
}

export function reserveMatterNumber({ repository, tenant_id, matter_number_seed, idempotency_key, matter_number } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ matter_number_seed }, "matter_number_seed");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository?.getIdempotency?.({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const nextNumber = matter_number ?? deriveMatterNumber({ tenant_id, matter_number_seed });
  const duplicate = repository
    ?.list?.({ tenant_id, model_type: "Matter" })
    ?.find((matter) => matter.matter_number === nextNumber);
  if (duplicate) {
    throw new Error(`Matter number already exists: ${nextNumber}`);
  }
  const response = Object.freeze({
    tenant_id,
    matter_number: nextNumber,
    idempotency_key,
    idempotent_replay: false,
  });
  repository?.recordIdempotency?.({ tenant_id, idempotency_key, operation: "matter_number_reservation", response });
  return response;
}
