const PROFILE_KINDS = Object.freeze({
  CIVIL_LITIGATION: "civil_litigation",
  CRIMINAL_LITIGATION: "criminal_litigation",
  ADMINISTRATIVE_LITIGATION: "administrative_litigation",
  DEAL: "deal",
  CORPORATE_ADVISORY: "corporate_advisory",
  DISPUTE: "dispute",
});

const PROFILE_FIELDS = Object.freeze({
  [PROFILE_KINDS.CIVIL_LITIGATION]: Object.freeze([
    "jurisdiction_court",
    "case_number",
    "case_name",
    "chamber_name",
    "court_contact_stakeholder_id",
    "court_clerk_stakeholder_id",
  ]),
  [PROFILE_KINDS.CRIMINAL_LITIGATION]: Object.freeze([
    "police_case_number",
    "prosecution_sibling_number",
    "police_station",
    "police_officer_stakeholder_id",
    "prosecution_office",
    "prosecutor_stakeholder_id",
    "criminal_case_number",
    "case_name",
    "case_contact_stakeholder_id",
  ]),
  [PROFILE_KINDS.ADMINISTRATIVE_LITIGATION]: Object.freeze([
    "jurisdiction_court",
    "administrative_case_number",
    "case_name",
    "agency_name",
    "disposition_name",
    "agency_contact_stakeholder_id",
    "court_clerk_stakeholder_id",
  ]),
  [PROFILE_KINDS.DEAL]: Object.freeze([
    "transaction_value",
    "stage",
    "counterparty_name",
    "counterparty_law_firm",
    "sell_side_advisor",
    "buy_side_advisor",
    "accounting_firm",
    "direct_shareholder_contact",
  ]),
  [PROFILE_KINDS.CORPORATE_ADVISORY]: Object.freeze([
    "advisory_topic",
    "request_scope",
    "engagement_mode",
    "stage",
    "requester_stakeholder_id",
    "due_date",
    "delivery_reference",
  ]),
  [PROFILE_KINDS.DISPUTE]: Object.freeze([
    "dispute_type",
    "dispute_summary",
    "counterparty_name",
    "counterparty_stakeholder_id",
  ]),
});

const DEAL_STAGES = new Set(["origination", "marketing", "indicative_offer", "due_diligence", "negotiation", "signing", "closing", "post_closing", "on_hold", "terminated"]);
const ADVISORY_STAGES = new Set(["requested", "research", "drafting", "client_review", "delivered", "closed", "on_hold"]);
const ENGAGEMENT_MODES = new Set(["retainer", "ad_hoc", "project"]);
const STAKEHOLDER_ROLES = new Set([
  "court_clerk",
  "court_contact",
  "police_officer",
  "prosecutor",
  "agency_officer",
  "counterparty_contact",
  "counterparty_lawyer",
  "sell_side_advisor_lawyer",
  "buy_side_advisor_lawyer",
  "accountant",
  "company_contact",
  "shareholder",
  "client_contact",
  "other",
]);
const STAKEHOLDER_SIDES = new Set(["client", "counterparty", "seller", "buyer", "authority", "advisor", "other"]);
const STAKEHOLDER_CONTACT_MODES = new Set(["crm_contact", "company_representative", "shareholder_direct", "no_contact"]);
const EVIDENCE_CONFIDENCE = new Set(["manual_verified", "evidence_supported", "lane_default_review", "unknown"]);
const REVIEW_STATUSES = new Set(["verified", "review_required", "not_available"]);
const STAKEHOLDER_REFERENCE_ROLES = Object.freeze({
  court_contact_stakeholder_id: new Set(["court_contact"]),
  court_clerk_stakeholder_id: new Set(["court_clerk"]),
  police_officer_stakeholder_id: new Set(["police_officer"]),
  prosecutor_stakeholder_id: new Set(["prosecutor"]),
  case_contact_stakeholder_id: new Set(["police_officer", "prosecutor", "company_contact", "other"]),
  agency_contact_stakeholder_id: new Set(["agency_officer"]),
  requester_stakeholder_id: new Set(["client_contact", "company_contact"]),
  counterparty_stakeholder_id: new Set(["counterparty_contact", "counterparty_lawyer"]),
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function safeId(value, fallback) {
  return String(value ?? fallback ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 128);
}

function isRawContactReference(value) {
  const text = String(value ?? "").trim();
  const normalized = text.replaceAll(/[()\s.-]/g, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || /^\+?\d{7,15}$/.test(normalized);
}

function safeContactReference(value, field) {
  if (isRawContactReference(value)) throw new TypeError(`${field} must be an opaque reference`);
  const identifier = safeId(value);
  if (!identifier) throw new TypeError(`${field} is invalid`);
  return identifier;
}

function safeText(value, field, { max = 500 } = {}) {
  const text = requiredString(value, field);
  if (text.length > max || /<script\b|javascript:/i.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function optionalSafeText(value, field, options) {
  if (value === undefined || value === null || value === "") return null;
  return safeText(value, field, options);
}

function normalizeChoice(value, allowed, field) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = safeText(value, field, { max: 64 });
  if (!allowed.has(normalized)) throw new TypeError(`${field} is unsupported`);
  return normalized;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireMatter(matter) {
  if (!matter?.tenant_id || !matter?.matter_id) throw new TypeError("matter is required");
  return matter;
}

export function profileKindForMatter(matter = {}) {
  const axis = String(matter.matter_type_english ?? matter.matter_axis ?? "").trim();
  const litigationAxis = String(matter.matter_litigation_axis ?? "").trim();
  if (axis === "LIT" && litigationAxis === "CIV") return PROFILE_KINDS.CIVIL_LITIGATION;
  if (axis === "LIT" && litigationAxis === "CRM") return PROFILE_KINDS.CRIMINAL_LITIGATION;
  if (axis === "LIT" && litigationAxis === "ADM") return PROFILE_KINDS.ADMINISTRATIVE_LITIGATION;
  if (axis === "DEAL") return PROFILE_KINDS.DEAL;
  if (axis === "Advisory") return PROFILE_KINDS.CORPORATE_ADVISORY;
  return PROFILE_KINDS.DISPUTE;
}

export function matterProfileFields(profileKind) {
  const fields = PROFILE_FIELDS[profileKind];
  if (!fields) throw new TypeError("profile_kind is unsupported");
  return fields;
}

function validateTransactionValue(value) {
  if (!isPlainObject(value)) throw new TypeError("transaction_value is invalid");
  const amount = value.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) throw new TypeError("transaction_value.amount is invalid");
  const currency = value.currency === undefined ? "KRW" : safeText(value.currency, "transaction_value.currency", { max: 3 });
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError("transaction_value.currency is invalid");
  const basis = optionalSafeText(value.basis, "transaction_value.basis", { max: 80 });
  return Object.freeze({ amount, currency, basis });
}

function validateDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const text = safeText(value, field, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))) throw new TypeError(`${field} is invalid`);
  return text;
}

function validateProfileData(profileKind, input = {}) {
  if (!isPlainObject(input)) throw new TypeError("profile.data is invalid");
  const allowed = new Set(matterProfileFields(profileKind));
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new TypeError(`${key} is not allowed for ${profileKind}`);
  }
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "transaction_value") {
      result[key] = validateTransactionValue(value);
      continue;
    }
    if (key === "direct_shareholder_contact") {
      if (typeof value !== "boolean") throw new TypeError("direct_shareholder_contact is invalid");
      result[key] = value;
      continue;
    }
    if (key === "stage") {
      result[key] = normalizeChoice(value, profileKind === PROFILE_KINDS.DEAL ? DEAL_STAGES : ADVISORY_STAGES, "stage");
      continue;
    }
    if (key === "engagement_mode") {
      result[key] = normalizeChoice(value, ENGAGEMENT_MODES, "engagement_mode");
      continue;
    }
    if (key === "due_date") {
      result[key] = validateDate(value, "due_date");
      continue;
    }
    if (key.endsWith("_stakeholder_id")) {
      const identifier = safeId(value);
      if (!identifier) throw new TypeError(`${key} is invalid`);
      result[key] = identifier;
      continue;
    }
    result[key] = safeText(value, key);
  }
  return Object.freeze(result);
}

function normalizeEvidence(input = {}) {
  if (!isPlainObject(input)) throw new TypeError("profile.evidence is invalid");
  const sourceRef = optionalSafeText(input.source_ref, "evidence.source_ref", { max: 800 });
  const confidence = normalizeChoice(input.confidence ?? "unknown", EVIDENCE_CONFIDENCE, "evidence.confidence") ?? "unknown";
  const reviewStatus = normalizeChoice(input.review_status ?? "not_available", REVIEW_STATUSES, "evidence.review_status") ?? "not_available";
  const verifiedAt = input.verified_at && !Number.isNaN(Date.parse(input.verified_at)) ? input.verified_at : null;
  return Object.freeze({ source_ref: sourceRef, confidence, review_status: reviewStatus, verified_at: verifiedAt });
}

export function serializeMatterProfile(record = {}) {
  if (!record) return null;
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.resource_id ?? record.profile_id,
    profile_id: record.profile_id ?? record.resource_id,
    matter_id: record.matter_id,
    profile_kind: record.profile_kind,
    schema_version: record.schema_version ?? "lawos.matter_profile.v1",
    data: clone(record.data ?? {}),
    evidence: normalizeEvidence(record.evidence ?? {}),
    status: record.status ?? "active",
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
    updated_by: record.updated_by ?? record.created_by ?? null,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

export function getMatterProfile({ repository, tenant_id, matter_id } = {}) {
  requiredString(tenant_id, "tenant_id");
  requiredString(matter_id, "matter_id");
  return serializeMatterProfile(repository?.get?.({ tenant_id, model_type: "MatterProfile", resource_id: `matter_profile_${matter_id}` }) ?? null);
}

function assertProfileStakeholderReferences({ repository, matter, data } = {}) {
  for (const [field, stakeholderId] of Object.entries(data ?? {})) {
    if (!field.endsWith("_stakeholder_id")) continue;
    const stakeholder = repository?.get?.({
      tenant_id: matter.tenant_id,
      model_type: "MatterStakeholder",
      resource_id: stakeholderId,
    });
    if (
      !stakeholder ||
      stakeholder.matter_id !== matter.matter_id ||
      stakeholder.status === "deleted" ||
      !STAKEHOLDER_REFERENCE_ROLES[field]?.has(stakeholder.relationship_role)
    ) {
      throw new TypeError("stakeholder reference is invalid");
    }
  }
}

function profileRecord({ matter, actor_id, profile, now, current } = {}) {
  const profileKind = profileKindForMatter(matter);
  if (profile?.profile_kind && profile.profile_kind !== profileKind) throw new TypeError("profile_kind does not match matter classification");
  const data = validateProfileData(profileKind, profile?.data ?? current?.data ?? {});
  const evidence = normalizeEvidence(profile?.evidence ?? current?.evidence ?? {});
  const profileId = `matter_profile_${matter.matter_id}`;
  return {
    ...(current ?? {}),
    model_type: "MatterProfile",
    resource_id: profileId,
    profile_id: profileId,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    profile_kind: profileKind,
    schema_version: "lawos.matter_profile.v1",
    data,
    evidence,
    status: "active",
    created_by: current?.created_by ?? actor_id,
    created_at: current?.created_at ?? now,
    updated_by: actor_id,
    updated_at: now,
    raw_contact_values_included: false,
    production_ready_claim: false,
  };
}

export function createMatterProfile({ repository, matter, actor_id, profile, audit, occurred_at } = {}) {
  if (!repository?.upsert) throw new TypeError("repository is required");
  requireMatter(matter);
  requiredString(actor_id, "actor_id");
  const now = occurred_at && !Number.isNaN(Date.parse(occurred_at)) ? occurred_at : new Date().toISOString();
  const current = repository.get({ tenant_id: matter.tenant_id, model_type: "MatterProfile", resource_id: `matter_profile_${matter.matter_id}` });
  const next = profileRecord({ matter, actor_id, profile, now, current });
  assertProfileStakeholderReferences({ repository, matter, data: next.data });
  const persisted = repository.upsert(next);
  audit?.append?.({
    tenant_id: matter.tenant_id,
    actor_id,
    action: "matter.profile.saved",
    object_type: "MatterProfile",
    object_id: persisted.profile_id,
    reason: "matter_profile_saved",
    occurred_at: now,
    metadata: { matter_id: matter.matter_id, profile_kind: persisted.profile_kind, raw_contact_values_included: false },
  });
  return serializeMatterProfile(persisted);
}

export function updateMatterProfile({ repository, matter, actor_id, patch, audit, occurred_at } = {}) {
  if (!repository?.update) throw new TypeError("repository is required");
  requireMatter(matter);
  requiredString(actor_id, "actor_id");
  if (!isPlainObject(patch)) throw new TypeError("profile patch is invalid");
  const profileId = `matter_profile_${matter.matter_id}`;
  const current = repository.get({ tenant_id: matter.tenant_id, model_type: "MatterProfile", resource_id: profileId });
  if (!current) return createMatterProfile({ repository, matter, actor_id, profile: patch, audit, occurred_at });
  const now = occurred_at && !Number.isNaN(Date.parse(occurred_at)) ? occurred_at : new Date().toISOString();
  const mergedData = { ...(current.data ?? {}), ...(patch.data ?? {}) };
  for (const [key, value] of Object.entries(mergedData)) {
    if (value === "" || value === null) delete mergedData[key];
  }
  const next = profileRecord({
    matter,
    actor_id,
    profile: {
      ...patch,
      data: mergedData,
      evidence: { ...(current.evidence ?? {}), ...(patch.evidence ?? {}) },
    },
    now,
    current,
  });
  assertProfileStakeholderReferences({ repository, matter, data: next.data });
  const persisted = repository.update({ tenant_id: matter.tenant_id, model_type: "MatterProfile", resource_id: profileId }, next);
  audit?.append?.({
    tenant_id: matter.tenant_id,
    actor_id,
    action: "matter.profile.updated",
    object_type: "MatterProfile",
    object_id: persisted.profile_id,
    reason: "matter_profile_updated",
    occurred_at: now,
    metadata: { matter_id: matter.matter_id, profile_kind: persisted.profile_kind, raw_contact_values_included: false },
  });
  return serializeMatterProfile(persisted);
}

function normalizeStakeholder(stakeholder = {}) {
  if (!isPlainObject(stakeholder)) throw new TypeError("stakeholder is invalid");
  if (Object.keys(stakeholder).some((key) => /(^|_)(phone|telephone|mobile(?:_number)?|email|contact_value)(_|$)/i.test(String(key).replace(/([a-z])([A-Z])/g, "$1_$2")))) {
    throw new TypeError("raw contact values are not allowed");
  }
  const relationshipRole = normalizeChoice(stakeholder.relationship_role, STAKEHOLDER_ROLES, "relationship_role");
  const contactMode = normalizeChoice(stakeholder.contact_mode ?? "no_contact", STAKEHOLDER_CONTACT_MODES, "contact_mode") ?? "no_contact";
  if (!relationshipRole) throw new TypeError("relationship_role is required");
  const contactId = stakeholder.contact_id ? safeContactReference(stakeholder.contact_id, "contact_id") : null;
  const contactPointId = stakeholder.contact_point_id ? safeContactReference(stakeholder.contact_point_id, "contact_point_id") : null;
  if (contactMode === "crm_contact" && !contactId) throw new TypeError("contact_id is required for crm_contact");
  if (contactMode !== "crm_contact" && (contactId || contactPointId)) throw new TypeError("contact references require crm_contact");
  return Object.freeze({
    display_name: safeText(stakeholder.display_name, "display_name", { max: 160 }),
    organization_name: optionalSafeText(stakeholder.organization_name, "organization_name", { max: 160 }),
    entity_kind: normalizeChoice(stakeholder.entity_kind ?? "person", new Set(["person", "organization"]), "entity_kind") ?? "person",
    relationship_role: relationshipRole,
    side: normalizeChoice(stakeholder.side ?? "other", STAKEHOLDER_SIDES, "side") ?? "other",
    phase: optionalSafeText(stakeholder.phase, "phase", { max: 80 }),
    contact_mode: contactMode,
    contact_id: contactId,
    contact_point_id: contactPointId,
    source_ref: optionalSafeText(stakeholder.source_ref, "source_ref", { max: 800 }),
    confidence: normalizeChoice(stakeholder.confidence ?? "manual_verified", EVIDENCE_CONFIDENCE, "confidence") ?? "manual_verified",
    review_status: normalizeChoice(stakeholder.review_status ?? "review_required", REVIEW_STATUSES, "review_status") ?? "review_required",
  });
}

export function serializeMatterStakeholder(record = {}) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    resource_id: record.resource_id ?? record.stakeholder_id,
    stakeholder_id: record.stakeholder_id ?? record.resource_id,
    matter_id: record.matter_id,
    display_name: record.display_name,
    organization_name: record.organization_name ?? null,
    entity_kind: record.entity_kind ?? "person",
    relationship_role: record.relationship_role,
    side: record.side ?? "other",
    phase: record.phase ?? null,
    contact_mode: record.contact_mode ?? "no_contact",
    contact_id: record.contact_id ?? null,
    contact_point_id: record.contact_point_id ?? null,
    source_ref: record.source_ref ?? null,
    confidence: record.confidence ?? "unknown",
    review_status: record.review_status ?? "not_available",
    status: record.status ?? "active",
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

export function listMatterStakeholders({ repository, tenant_id, matter_id } = {}) {
  requiredString(tenant_id, "tenant_id");
  requiredString(matter_id, "matter_id");
  return Object.freeze(
    (repository?.list?.({ tenant_id, model_type: "MatterStakeholder", matter_id }) ?? [])
      .filter((record) => record.status !== "deleted" && record.silent !== true && record.hidden_from_actor !== true)
      .sort((left, right) => String(left.display_name ?? "").localeCompare(String(right.display_name ?? "")))
      .map(serializeMatterStakeholder),
  );
}

export function registerMatterStakeholder({ repository, matter, actor_id, stakeholder, audit, occurred_at } = {}) {
  if (!repository?.create) throw new TypeError("repository is required");
  requireMatter(matter);
  requiredString(actor_id, "actor_id");
  const normalized = normalizeStakeholder(stakeholder);
  const now = occurred_at && !Number.isNaN(Date.parse(occurred_at)) ? occurred_at : new Date().toISOString();
  const stakeholderId = safeId(
    null,
    `matter_stakeholder_${matter.matter_id}_${normalized.relationship_role}_${normalized.display_name}_${Date.parse(now) || Date.now()}`,
  );
  const persisted = repository.create({
    model_type: "MatterStakeholder",
    resource_id: stakeholderId,
    stakeholder_id: stakeholderId,
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    ...normalized,
    status: "active",
    created_by: actor_id,
    created_at: now,
    updated_by: actor_id,
    updated_at: now,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
  audit?.append?.({
    tenant_id: matter.tenant_id,
    actor_id,
    action: "matter.stakeholder.registered",
    object_type: "MatterStakeholder",
    object_id: stakeholderId,
    reason: "matter_stakeholder_registered",
    occurred_at: now,
    metadata: {
      matter_id: matter.matter_id,
      relationship_role: persisted.relationship_role,
      contact_mode: persisted.contact_mode,
      contact_reference_included: Boolean(persisted.contact_id || persisted.contact_point_id),
      raw_contact_values_included: false,
    },
  });
  return serializeMatterStakeholder(persisted);
}

export function matterProfileSeedForMatter(matter = {}) {
  const profileKind = profileKindForMatter(matter);
  const detail = String(matter.matter_detail_type_korean ?? "").trim();
  const sourceRef = String(matter.source_ref ?? "").trim();
  const confidence = matter.confidence === "lane_default_review" ? "lane_default_review" : "evidence_supported";
  const evidence = { source_ref: sourceRef || null, confidence: sourceRef ? confidence : "unknown", review_status: "review_required" };
  if (!detail || !sourceRef) return { profile_kind: profileKind, data: {}, evidence };
  if (profileKind === PROFILE_KINDS.CIVIL_LITIGATION) return { profile_kind: profileKind, data: { case_name: detail }, evidence };
  if (profileKind === PROFILE_KINDS.CRIMINAL_LITIGATION) return { profile_kind: profileKind, data: { case_name: detail }, evidence };
  if (profileKind === PROFILE_KINDS.ADMINISTRATIVE_LITIGATION) return { profile_kind: profileKind, data: { case_name: detail }, evidence };
  if (profileKind === PROFILE_KINDS.CORPORATE_ADVISORY) return { profile_kind: profileKind, data: { advisory_topic: detail }, evidence };
  if (profileKind === PROFILE_KINDS.DISPUTE) return { profile_kind: profileKind, data: { dispute_summary: detail }, evidence };
  return { profile_kind: profileKind, data: {}, evidence };
}

export { PROFILE_KINDS, STAKEHOLDER_ROLES };
