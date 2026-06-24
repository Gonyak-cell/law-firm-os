const CLIENT_LEGAL_SUFFIXES = Object.freeze([
  "주식회사",
  "회계법인",
  "법무법인",
  "유한회사",
  "(주)",
  "㈜",
  "Inc.",
  "Ltd.",
  "LLC",
  "LLP",
]);
const CLIENT_LEGAL_PREFIXES = Object.freeze(["(주)", "㈜"]);

function freeze(value) {
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function compact(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function requiredString(input, field) {
  const value = compact(input?.[field]);
  if (!value) throw new TypeError(`${field} is required`);
  return value;
}

function stripLegalSuffixes(value) {
  let next = compact(value);
  const stripped = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of CLIENT_LEGAL_PREFIXES) {
      if (next.startsWith(prefix)) {
        next = compact(next.slice(prefix.length));
        stripped.push(prefix);
        changed = true;
      }
    }
    for (const suffix of CLIENT_LEGAL_SUFFIXES) {
      if (next.endsWith(suffix)) {
        next = compact(next.slice(0, -suffix.length));
        stripped.push(suffix);
        changed = true;
      }
    }
  }
  return freeze({ value: next, stripped_suffixes: freeze(stripped) });
}

function normalizeMatterCodeSegment(value, field) {
  const segment = requiredString({ [field]: value }, field);
  if (segment.includes("/")) throw new Error(`${field} cannot contain /`);
  return segment;
}

export function normalizeMatterClientShortName({
  client_display_name,
  client_short_name,
  existing_clients = [],
} = {}) {
  const displayName = requiredString({ client_display_name }, "client_display_name");
  const explicitShortName = compact(client_short_name);
  const stripped = explicitShortName
    ? freeze({ value: explicitShortName, stripped_suffixes: freeze([]) })
    : stripLegalSuffixes(displayName);
  const shortName = compact(stripped.value);
  if (!shortName) throw new TypeError("client_short_name is required");

  const ambiguous = existing_clients.some(
    (client) =>
      client.client_short_name === shortName
      && compact(client.client_display_name) !== displayName,
  );

  return freeze({
    client_display_name: displayName,
    client_short_name: shortName,
    stripped_suffixes: stripped.stripped_suffixes,
    needs_review: ambiguous,
    blocked_claims: freeze(ambiguous ? ["client_short_name_ambiguous"] : []),
  });
}

export function deriveMatterCode({
  client_short_name,
  matter_type_english,
  matter_detail_type_korean,
} = {}) {
  const segments = [
    normalizeMatterCodeSegment(client_short_name, "client_short_name"),
    normalizeMatterCodeSegment(matter_type_english, "matter_type_english"),
    normalizeMatterCodeSegment(matter_detail_type_korean, "matter_detail_type_korean"),
  ];
  const matterCode = segments.join("/");
  if (matterCode.length > 120) throw new RangeError("matter_code must be 120 characters or less");
  return matterCode;
}

export function validateMatterCode(matter_code) {
  const value = requiredString({ matter_code }, "matter_code");
  const segments = value.split("/");
  const errors = [];
  if (segments.length !== 3 || segments.some((segment) => compact(segment) === "")) {
    errors.push("matter_code_must_have_three_segments");
  }
  if (value.length > 120) errors.push("matter_code_too_long");
  return freeze({
    valid: errors.length === 0,
    matter_code: value,
    segments: freeze(segments),
    errors: freeze(errors),
  });
}

export function reserveMatterCode({
  repository,
  tenant_id,
  matter_id,
  matter_code,
  client_short_name,
  matter_type_english,
  matter_detail_type_korean,
  idempotency_key,
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository?.getIdempotency?.({ tenant_id, idempotency_key });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true });

  const nextCode = compact(matter_code)
    ? validateMatterCode(matter_code).matter_code
    : deriveMatterCode({ client_short_name, matter_type_english, matter_detail_type_korean });
  const validation = validateMatterCode(nextCode);
  if (!validation.valid) throw new Error(`Matter code invalid: ${validation.errors.join(", ")}`);

  const duplicate = repository
    ?.list?.({ tenant_id, model_type: "Matter" })
    ?.find((matter) => matter.matter_code === nextCode && (!matter_id || matter.matter_id !== matter_id));
  if (duplicate) throw new Error(`Matter code already exists: ${nextCode}`);

  const response = freeze({
    tenant_id,
    matter_id: matter_id ?? null,
    matter_code: nextCode,
    idempotency_key,
    idempotent_replay: false,
    uniqueness_scope: "tenant",
  });
  repository?.recordIdempotency?.({ tenant_id, idempotency_key, operation: "matter_code_reservation", response });
  return response;
}

export function upsertMatterClient({ repository, client, idempotency_key } = {}) {
  const tenantId = requiredString(client, "tenant_id");
  const clientId = requiredString(client, "client_id");
  if (idempotency_key) {
    const replay = repository?.getIdempotency?.({ tenant_id: tenantId, idempotency_key });
    if (replay) return freeze({ ...replay.response, idempotent_replay: true });
  }

  const normalizedName = normalizeMatterClientShortName({
    client_display_name: client.client_display_name,
    client_short_name: client.client_short_name,
    existing_clients: repository?.list?.({ tenant_id: tenantId, model_type: "MatterClient" }) ?? [],
  });
  if (normalizedName.needs_review) {
    throw new Error(`Client short name requires review: ${normalizedName.client_short_name}`);
  }

  const now = client.updated_at ?? client.created_at ?? new Date().toISOString();
  const persisted = repository.upsert({
    ...client,
    model_type: "MatterClient",
    tenant_id: tenantId,
    client_id: clientId,
    client_display_name: normalizedName.client_display_name,
    client_short_name: normalizedName.client_short_name,
    status: client.status ?? "active",
    created_by: client.created_by ?? client.updated_by,
    created_at: client.created_at ?? now,
    updated_by: client.updated_by ?? client.created_by,
    updated_at: now,
  });
  const response = freeze({
    outcome: "upserted",
    client: persisted,
    idempotent_replay: false,
  });
  if (idempotency_key) {
    repository?.recordIdempotency?.({
      tenant_id: tenantId,
      idempotency_key,
      operation: "matter_client_upsert",
      response,
    });
  }
  return response;
}

export function upsertCanonicalMatterIdentity({
  repository,
  client,
  matter,
  idempotency_key,
  actor_id,
} = {}) {
  const tenantId = requiredString(matter, "tenant_id");
  const matterId = requiredString(matter, "matter_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository?.getIdempotency?.({ tenant_id: tenantId, idempotency_key });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true });

  const clientResult = upsertMatterClient({
    repository,
    client: {
      ...client,
      tenant_id: tenantId,
      client_id: client?.client_id ?? matter.client_id,
      created_by: client?.created_by ?? actor_id ?? matter.created_by,
      created_at: client?.created_at ?? matter.created_at,
      updated_by: client?.updated_by ?? actor_id ?? matter.created_by,
      updated_at: client?.updated_at ?? matter.updated_at ?? matter.created_at,
      source_revision: client?.source_revision ?? matter.source_revision,
    },
    idempotency_key: `${idempotency_key}:client`,
  });
  const codeReservation = reserveMatterCode({
    repository,
    tenant_id: tenantId,
    matter_id: matterId,
    matter_code: matter.matter_code,
    client_short_name: clientResult.client.client_short_name,
    matter_type_english: matter.matter_type_english,
    matter_detail_type_korean: matter.matter_detail_type_korean,
    idempotency_key: `${idempotency_key}:matter-code`,
  });
  const persistedMatter = repository.upsert({
    ...matter,
    model_type: "Matter",
    tenant_id: tenantId,
    matter_id: matterId,
    matter_code: codeReservation.matter_code,
    matter_name: matter.matter_name ?? matter.title,
    title: matter.title ?? matter.matter_name,
    client_id: clientResult.client.client_id,
    client_display_name: clientResult.client.client_display_name,
    status: matter.status ?? "opening",
    source_revision: matter.source_revision ?? client?.source_revision ?? null,
  });
  const response = freeze({
    outcome: "upserted",
    client: clientResult.client,
    matter: persistedMatter,
    matter_code_reservation: clone(codeReservation),
    idempotent_replay: false,
  });
  repository.recordIdempotency({
    tenant_id: tenantId,
    idempotency_key,
    operation: "canonical_matter_identity_upsert",
    response,
  });
  return response;
}
