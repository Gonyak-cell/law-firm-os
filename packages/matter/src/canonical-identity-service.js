import { createHash } from "node:crypto";

const CLIENT_LEGAL_SUFFIXES = Object.freeze([
  "주식회사",
  "회계법인",
  "법무법인",
  "유한회사",
  "유한책임회사",
  "사단법인",
  "재단법인",
  "(주)",
  "㈜",
  "Inc.",
  "Ltd.",
  "LLC",
  "LLP",
]);
const CLIENT_LEGAL_PREFIXES = Object.freeze(["(주)", "㈜"]);
const CANONICAL_MATTER_CODE_AXES = Object.freeze(["LIT", "Advisory", "DEAL", "Dispute"]);
const CANONICAL_LITIGATION_AXES = Object.freeze(["CIV", "CRM", "ADM"]);
const MATTER_CODE_AXIS_ALIASES = Object.freeze({
  LIT: "LIT",
  litigation: "LIT",
  ADV: "Advisory",
  Advisory: "Advisory",
  advisory: "Advisory",
  기업자문: "Advisory",
  DEAL: "DEAL",
  DISP: "Dispute",
  DIST: "Dispute",
  Dispute: "Dispute",
  dispute: "Dispute",
  분쟁: "Dispute",
  "M&A": "DEAL",
  mna: "DEAL",
  ma: "DEAL",
  신주투자: "DEAL",
  매각자문: "DEAL",
  인수자문: "DEAL",
});
const LITIGATION_AXIS_ALIASES = Object.freeze({
  CIV: "CIV",
  Civil: "CIV",
  civil: "CIV",
  민사: "CIV",
  CRM: "CRM",
  CRIM: "CRM",
  Criminal: "CRM",
  criminal: "CRM",
  형사: "CRM",
  ADM: "ADM",
  Admin: "ADM",
  Administrative: "ADM",
  administrative: "ADM",
  행정: "ADM",
});

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

function requiredArray(input, field) {
  const value = input?.[field];
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} is required`);
  return freeze(value.map((item) => requiredString({ item }, "item")));
}

function stableId(prefix, values) {
  const hash = createHash("sha256")
    .update(values.map((value) => compact(value)).join("\u001f"))
    .digest("hex")
    .slice(0, 24);
  return `${prefix}_${hash}`;
}

function sourceRevisionOrApprovalRef(request) {
  const sourceRevision = compact(request?.sourceRevision);
  const migrationApprovalRef = compact(request?.migrationApprovalRef);
  if (!sourceRevision && !migrationApprovalRef) {
    throw new TypeError("sourceRevision or migrationApprovalRef is required");
  }
  return sourceRevision || migrationApprovalRef;
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

export function mapVaultMatterAppClientUpsertRequest(request = {}, { actor_id } = {}) {
  const tenantId = requiredString(request, "tenantRef");
  const clientShortName = requiredString(request, "clientShortName");
  const sourceRevision = sourceRevisionOrApprovalRef(request);
  const approvalRef = requiredString(request, "approvalRef");
  const supportingEvidenceRefs = requiredArray(request, "supportingEvidenceRefs");
  const clientId = compact(request.clientId) || stableId("client", [tenantId, clientShortName, approvalRef]);
  return freeze({
    tenant_id: tenantId,
    idempotency_key: requiredString(request, "idempotencyKeyHash"),
    client: freeze({
      model_type: "MatterClient",
      tenant_id: tenantId,
      client_id: clientId,
      client_display_name: requiredString(request, "clientDisplayName"),
      client_short_name: clientShortName,
      status: request.status ?? "active",
      source_revision: sourceRevision,
      approval_ref: approvalRef,
      migration_approval_ref: request.migrationApprovalRef ?? null,
      supporting_evidence_refs: supportingEvidenceRefs,
      created_by: actor_id ?? request.migrationOperatorRef ?? "vault-approved-mapping",
      created_at: request.createdAt ?? new Date().toISOString(),
      updated_by: actor_id ?? request.migrationOperatorRef ?? "vault-approved-mapping",
      updated_at: request.updatedAt ?? new Date().toISOString(),
    }),
  });
}

export function mapVaultMatterAppMatterUpsertRequest(request = {}, { actor_id, client } = {}) {
  const tenantId = requiredString(request, "tenantRef");
  const clientId = requiredString(request, "clientId");
  const matterCode = requiredString(request, "matterCode");
  const matterType = normalizeMatterType(requiredString(request, "matterTypeEnglish"));
  const matterTypeEnglish = matterType.axis;
  const matterLitigationAxis = normalizeMatterLitigationAxis(
    request.matterLitigationAxis ?? request.litigationAxis ?? request.litigationTypeEnglish ?? matterType.litigation_axis,
    { required: matterTypeEnglish === "LIT" },
  );
  const matterDetailTypeKorean = requiredString(request, "matterDetailTypeKorean");
  const clientShortName = client?.client_short_name ?? request.clientShortName;
  const expectedCode = deriveMatterCode({
    client_short_name: clientShortName,
    matter_type_english: matterTypeEnglish,
    matter_litigation_axis: matterLitigationAxis,
    matter_detail_type_korean: matterDetailTypeKorean,
  });
  if (normalizeMatterCode(matterCode) !== expectedCode) {
    throw new Error("matterCode must match clientShortName/matterTypeEnglish/matterDetailTypeKorean");
  }
  const sourceRevision = sourceRevisionOrApprovalRef(request);
  const matterId = compact(request.matterAppMatterId) || stableId("matter", [tenantId, matterCode]);
  return freeze({
    tenant_id: tenantId,
    idempotency_key: requiredString(request, "idempotencyKeyHash"),
    matter: freeze({
      model_type: "Matter",
      tenant_id: tenantId,
      matter_id: matterId,
      client_id: clientId,
      client_display_name: requiredString(request, "clientDisplayName"),
      matter_code: expectedCode,
      matter_name: requiredString(request, "matterName"),
      title: requiredString(request, "matterName"),
      matter_type_english: matterTypeEnglish,
      matter_litigation_axis: matterLitigationAxis,
      matter_detail_type_korean: matterDetailTypeKorean,
      client_case_role: request.clientCaseRole ?? request.client_case_role ?? null,
      client_case_role_confidence: request.clientCaseRoleConfidence ?? request.client_case_role_confidence ?? null,
      practice_group: request.practiceGroup ?? null,
      responsible_lawyer: request.responsibleLawyer ?? null,
      opened_at: request.openedAt ?? null,
      closed_at: request.closedAt ?? null,
      status: request.status ?? "opening",
      source_revision: sourceRevision,
      source_updated_at: request.sourceUpdatedAt ?? null,
      approval_ref: request.approvalRef ?? null,
      migration_approval_ref: request.migrationApprovalRef ?? null,
      created_by: actor_id ?? request.migrationOperatorRef ?? "vault-approved-mapping",
      created_at: request.createdAt ?? new Date().toISOString(),
      permission_envelope_id: request.permissionEnvelopeId ?? `perm:${tenantId}:${matterId}`,
      audit_trace_id: request.auditTraceId ?? `audit:${tenantId}:${matterId}`,
    }),
  });
}

function normalizeMatterCodeSegment(value, field) {
  const segment = requiredString({ [field]: value }, field);
  if (segment.includes("/")) throw new Error(`${field} cannot contain /`);
  return segment;
}

function normalizeMatterCodeAxis(value) {
  const axis = normalizeMatterCodeSegment(value, "matter_type_english");
  const canonical = MATTER_CODE_AXIS_ALIASES[axis];
  if (!canonical) throw new Error(`matterTypeEnglish must be one of ${CANONICAL_MATTER_CODE_AXES.join(", ")}`);
  return canonical;
}

function normalizeMatterType(value) {
  const axis = normalizeMatterCodeSegment(value, "matter_type_english");
  if (LITIGATION_AXIS_ALIASES[axis]) {
    return freeze({ axis: "LIT", litigation_axis: LITIGATION_AXIS_ALIASES[axis] });
  }
  return freeze({ axis: normalizeMatterCodeAxis(axis), litigation_axis: null });
}

function normalizeMatterLitigationAxis(value, { required = false } = {}) {
  const raw = compact(value);
  if (!raw) {
    if (required) throw new Error(`matterLitigationAxis must be one of ${CANONICAL_LITIGATION_AXES.join(", ")}`);
    return null;
  }
  const canonical = LITIGATION_AXIS_ALIASES[raw];
  if (!canonical) throw new Error(`matterLitigationAxis must be one of ${CANONICAL_LITIGATION_AXES.join(", ")}`);
  return canonical;
}

function normalizeMatterCode(value) {
  const matterCode = requiredString({ matter_code: value }, "matter_code");
  const segments = matterCode.split("/").map((segment) => compact(segment));
  if (segments.length !== 3 && segments.length !== 4) return matterCode;
  const axis = MATTER_CODE_AXIS_ALIASES[compact(segments[1])] ?? compact(segments[1]);
  if (segments.length === 3) {
    const litigationAxis = LITIGATION_AXIS_ALIASES[compact(segments[1])];
    if (litigationAxis) return [segments[0], "LIT", litigationAxis, segments[2]].join("/");
    return [segments[0], axis, segments[2]].join("/");
  }
  return [segments[0], axis, LITIGATION_AXIS_ALIASES[segments[2]] ?? segments[2], segments[3]].join("/");
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
  matter_litigation_axis,
  matter_detail_type_korean,
} = {}) {
  const matterType = normalizeMatterType(matter_type_english);
  const segments = [
    normalizeMatterCodeSegment(client_short_name, "client_short_name"),
    matterType.axis,
  ];
  const litigationAxis = normalizeMatterLitigationAxis(matter_litigation_axis ?? matterType.litigation_axis, {
    required: matterType.axis === "LIT",
  });
  if (matterType.axis === "LIT") segments.push(litigationAxis);
  segments.push(normalizeMatterCodeSegment(matter_detail_type_korean, "matter_detail_type_korean"));
  const matterCode = segments.join("/");
  if (matterCode.length > 120) throw new RangeError("matter_code must be 120 characters or less");
  return matterCode;
}

export function validateMatterCode(matter_code) {
  const value = normalizeMatterCode(matter_code);
  const segments = value.split("/");
  const errors = [];
  if (![3, 4].includes(segments.length) || segments.some((segment) => compact(segment) === "")) {
    errors.push("matter_code_must_have_three_segments_or_lit_four_segments");
  }
  if (segments.length >= 3 && !CANONICAL_MATTER_CODE_AXES.includes(segments[1])) {
    errors.push("matter_code_axis_must_be_lit_advisory_deal_or_dispute");
  }
  if (segments.length === 3 && segments[1] === "LIT") errors.push("lit_matter_code_must_include_civ_crm_or_adm");
  if (segments.length === 4 && segments[1] !== "LIT") errors.push("only_lit_matter_code_can_have_four_segments");
  if (segments.length === 4 && !CANONICAL_LITIGATION_AXES.includes(segments[2])) {
    errors.push("litigation_axis_must_be_civ_crm_or_adm");
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
  matter_litigation_axis,
  matter_detail_type_korean,
  idempotency_key,
} = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository?.getIdempotency?.({ tenant_id, idempotency_key });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true });

  const nextCode = compact(matter_code)
    ? validateMatterCode(matter_code).matter_code
    : deriveMatterCode({ client_short_name, matter_type_english, matter_litigation_axis, matter_detail_type_korean });
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
    matter_litigation_axis: matter.matter_litigation_axis,
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

export function upsertMatterAppClientFromVaultContract({ repository, request, actor_id } = {}) {
  const mapped = mapVaultMatterAppClientUpsertRequest(request, { actor_id });
  const replay = repository?.getIdempotency?.({
    tenant_id: mapped.tenant_id,
    idempotency_key: mapped.idempotency_key,
  });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true, action: "skipped_idempotent" });

  const existingById = repository.get({
    tenant_id: mapped.tenant_id,
    model_type: "MatterClient",
    client_id: mapped.client.client_id,
  });
  const existingByShortName = repository
    .list({ tenant_id: mapped.tenant_id, model_type: "MatterClient" })
    .find((client) => client.client_short_name === mapped.client.client_short_name);
  const existing = existingById ?? existingByShortName;
  const clientRecord = existingByShortName && !compact(request.clientId)
    ? freeze({
        ...mapped.client,
        client_id: existingByShortName.client_id,
        created_by: existingByShortName.created_by,
        created_at: existingByShortName.created_at,
      })
    : mapped.client;
  const clientResult = upsertMatterClient({
    repository,
    client: clientRecord,
    idempotency_key: `${mapped.idempotency_key}:record`,
  });
  const response = freeze({
    clientId: clientResult.client.client_id,
    clientDisplayName: clientResult.client.client_display_name,
    clientShortName: clientResult.client.client_short_name,
    sourceRevision: clientResult.client.source_revision,
    action: existing ? "reused" : "created",
    client: clientResult.client,
    idempotent_replay: false,
  });
  repository.recordIdempotency({
    tenant_id: mapped.tenant_id,
    idempotency_key: mapped.idempotency_key,
    operation: "matter_app_client_upsert_contract",
    response,
  });
  return response;
}

export function upsertMatterAppMatterFromVaultContract({ repository, request, actor_id } = {}) {
  const tenantId = requiredString(request, "tenantRef");
  const clientId = requiredString(request, "clientId");
  const client = repository.get({ tenant_id: tenantId, model_type: "MatterClient", client_id: clientId });
  if (!client) throw new Error("Matter app client must exist before matter upsert");

  const mapped = mapVaultMatterAppMatterUpsertRequest(request, { actor_id, client });
  const replay = repository?.getIdempotency?.({
    tenant_id: mapped.tenant_id,
    idempotency_key: mapped.idempotency_key,
  });
  if (replay) return freeze({ ...replay.response, idempotent_replay: true, action: "skipped_idempotent" });

  const existing = repository.get({
    tenant_id: mapped.tenant_id,
    model_type: "Matter",
    matter_id: mapped.matter.matter_id,
  });
  const identityResult = upsertCanonicalMatterIdentity({
    repository,
    client,
    matter: mapped.matter,
    idempotency_key: `${mapped.idempotency_key}:identity`,
    actor_id,
  });
  const response = freeze({
    matterAppMatterId: identityResult.matter.matter_id,
    matterCode: identityResult.matter.matter_code,
    clientId: identityResult.matter.client_id,
    sourceRevision: identityResult.matter.source_revision,
    action: existing ? "reused" : "created",
    matter: identityResult.matter,
    client: identityResult.client,
    idempotent_replay: false,
  });
  repository.recordIdempotency({
    tenant_id: mapped.tenant_id,
    idempotency_key: mapped.idempotency_key,
    operation: "matter_app_matter_upsert_contract",
    response,
  });
  return response;
}
