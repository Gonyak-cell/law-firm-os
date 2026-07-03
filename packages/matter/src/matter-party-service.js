const MATTER_PARTY_ROLES = new Set([
  "client",
  "adverse_party",
  "counterparty",
  "opposing_counsel",
  "related_party",
  "witness",
  "court",
  "agency",
  "other",
]);

const CONFLICT_SUBJECT_ROLES = new Set(["adverse_party", "counterparty", "opposing_counsel", "related_party"]);

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function safeId(value, fallback) {
  return String(value ?? fallback ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 96);
}

function safeText(value, field, { min = 2, max = 160 } = {}) {
  const text = requiredString(value, field);
  if (text.length < min || text.length > max) throw new TypeError(`${field} is invalid`);
  if (/<script\b|javascript:/i.test(text)) throw new TypeError(`${field} includes unsafe content`);
  return text;
}

function normalizeRole(value) {
  const role = String(value ?? "adverse_party").trim();
  if (["adverse", "opponent", "opposing_party"].includes(role)) return "adverse_party";
  if (MATTER_PARTY_ROLES.has(role)) return role;
  throw new TypeError(`Unsupported MatterParty role: ${role}`);
}

function visibleMatterPartyRecords(records = []) {
  return records
    .filter((record) => record.silent !== true && record.hidden_from_actor !== true && record.status !== "deleted")
    .sort((left, right) => String(right.registered_at ?? "").localeCompare(String(left.registered_at ?? "")));
}

export function serializeMatterParty(record = {}) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.resource_id ?? record.matter_party_id,
    matter_party_id: record.matter_party_id ?? record.resource_id,
    matter_id: record.matter_id,
    party_id: record.party_id ?? null,
    display_name: record.display_name,
    party_role: record.party_role,
    role_scope: record.role_scope ?? "matter_party",
    conflict_subject: record.conflict_subject === true,
    retroactive_entry: record.retroactive_entry === true,
    retroactive_source: record.retroactive_source ?? null,
    status: record.status ?? "active",
    registered_at: record.registered_at ?? null,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

export function listMatterParties({ repository, tenant_id, matter_id, party_role } = {}) {
  requiredString(tenant_id, "tenant_id");
  requiredString(matter_id, "matter_id");
  const role = party_role ? normalizeRole(party_role) : null;
  return Object.freeze(
    visibleMatterPartyRecords(repository.list({ tenant_id, model_type: "MatterParty", matter_id }))
      .filter((record) => !role || record.party_role === role)
      .map(serializeMatterParty),
  );
}

export function registerMatterParty({ repository, matter, party, actor_id, audit } = {}) {
  requiredString(actor_id, "actor_id");
  if (!repository?.create) throw new TypeError("repository is required");
  if (!matter?.tenant_id || !matter?.matter_id) throw new TypeError("matter is required");
  const role = normalizeRole(party?.party_role ?? party?.role);
  const displayName = safeText(party?.display_name ?? party?.name, "display_name");
  const registeredAt = party?.registered_at && !Number.isNaN(Date.parse(party.registered_at))
    ? party.registered_at
    : new Date().toISOString();
  const tenantId = party?.tenant_id ?? matter.tenant_id;
  const matterId = party?.matter_id ?? matter.matter_id;
  if (tenantId !== matter.tenant_id) throw new TypeError("MatterParty tenant mismatch");
  if (matterId !== matter.matter_id) throw new TypeError("MatterParty matter mismatch");
  const conflictSubject = party?.conflict_subject ?? CONFLICT_SUBJECT_ROLES.has(role);
  const matterPartyId = safeId(
    party?.matter_party_id,
    `matter_party_${matterId}_${role}_${displayName}_${Date.parse(registeredAt) || Date.now()}`,
  );
  const persisted = repository.create({
    model_type: "MatterParty",
    resource_id: matterPartyId,
    tenant_id: tenantId,
    matter_id: matterId,
    matter_party_id: matterPartyId,
    party_id: party?.party_id ? safeId(party.party_id) : null,
    display_name: displayName,
    party_role: role,
    role_scope: conflictSubject ? "matter_conflict_subject" : "matter_party",
    conflict_subject: conflictSubject === true,
    retroactive_entry: party?.retroactive_entry === true,
    retroactive_source: party?.retroactive_source ?? (party?.retroactive_entry === true ? "manual_retroactive_entry" : "manual_entry"),
    status: party?.status ?? "active",
    registered_at: registeredAt,
    created_by: actor_id,
    created_at: registeredAt,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
  audit?.append?.({
    tenant_id: persisted.tenant_id,
    actor_id,
    action: "matter.party.registered",
    object_type: "MatterParty",
    object_id: persisted.matter_party_id,
    decision: "allow",
    reason: "matter_party_registered",
    occurred_at: registeredAt,
    metadata: {
      matter_id: persisted.matter_id,
      party_role: persisted.party_role,
      conflict_subject: persisted.conflict_subject,
      retroactive_entry: persisted.retroactive_entry,
      raw_contact_values_included: false,
    },
  });
  return serializeMatterParty(persisted);
}
