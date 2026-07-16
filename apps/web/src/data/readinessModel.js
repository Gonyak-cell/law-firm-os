const COMMON_REQUIRED_FIELDS = Object.freeze([
  "id",
  "tenant_id",
  "matter_trace_ref",
  "status",
  "audit_hint_ref",
  "evidence_ref"
]);

export const LCX_FULL_READINESS_STATES = Object.freeze([
  "not_configured",
  "configured",
  "preflight_passed",
  "approval_requested",
  "owner_approved",
  "provider_receipt_recorded",
  "execution_requested",
  "executed",
  "audited"
]);

export const LCX_FULL_APPROVAL_STATES = Object.freeze(["not_requested", "requested", "approved", "rejected", "expired"]);
export const LCX_FULL_PROVIDER_RECEIPT_STATES = Object.freeze(["missing", "sandbox_recorded", "production_recorded"]);
export const LCX_FULL_RUN_STATES = Object.freeze(["not_started", "dry_run_passed", "execute_blocked", "executed", "rolled_back"]);
export const LCX_FULL_AUDIT_STATES = Object.freeze(["pending", "recorded", "redacted", "sealed"]);
export const LCX_FULL_POLICY_STATES = Object.freeze(["not_configured", "draft", "active", "blocked"]);

function model(name, requiredFields, statuses, optionalFields = []) {
  return Object.freeze({
    name,
    required_fields: Object.freeze([...COMMON_REQUIRED_FIELDS, ...requiredFields]),
    optional_fields: Object.freeze(optionalFields),
    statuses,
    writes_enabled_by_model: false,
    owner_approval_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export const LCX_FULL_MODEL_DECLARATIONS = Object.freeze({
  feature_readiness: model(
    "feature_readiness",
    ["feature_id", "readiness_state", "blocked_claims"],
    LCX_FULL_READINESS_STATES,
    ["owner_role_ref", "provider_receipt_ref", "preflight_ref"]
  ),
  approval_request: model(
    "approval_request",
    ["approval_request_id", "requested_by_ref", "approval_state", "approval_scope"],
    LCX_FULL_APPROVAL_STATES,
    ["owner_receipt_ref", "rejection_reason_ref"]
  ),
  connector_receipt: model(
    "connector_receipt",
    ["connector_receipt_id", "provider_ref", "receipt_state", "provider_scope"],
    LCX_FULL_PROVIDER_RECEIPT_STATES,
    ["sandbox_receipt_ref", "production_receipt_ref"]
  ),
  execution_run: model(
    "execution_run",
    ["execution_run_id", "run_state", "idempotency_key_ref", "rollback_plan_ref"],
    LCX_FULL_RUN_STATES,
    ["dry_run_ref", "execute_receipt_ref"]
  ),
  audit_event: model(
    "audit_event",
    ["audit_event_id", "audit_state", "actor_ref", "action_ref"],
    LCX_FULL_AUDIT_STATES,
    ["redaction_ref", "sealed_receipt_ref"]
  ),
  field_policy_rule: model(
    "field_policy_rule",
    ["field_policy_rule_id", "object_ref", "field_ref", "policy_state"],
    LCX_FULL_POLICY_STATES,
    ["owner_role_ref", "reason_ref"]
  ),
  document_policy_rule: model(
    "document_policy_rule",
    ["document_policy_rule_id", "document_scope_ref", "policy_state", "vault_boundary_ref"],
    LCX_FULL_POLICY_STATES,
    ["legal_hold_ref", "retention_ref"]
  )
});

const READINESS_INDEX = new Map(LCX_FULL_READINESS_STATES.map((state, index) => [state, index]));
const FORBIDDEN_KEY_PATTERN = /(token|secret|password|credential|authorization|raw_|provider_url|callback_url|storage_pointer|storage_path|document_bytes|document_content)/i;
const FORBIDDEN_VALUE_PATTERN = /(Bearer\s+|sk-[A-Za-z0-9]|https?:\/\/|s3:\/\/|gs:\/\/|\/Users\/|refresh_token|id_token|document_bytes)/i;

export function validateLcxFullReadinessModel(models = LCX_FULL_MODEL_DECLARATIONS) {
  const errors = [];
  for (const [name, descriptor] of Object.entries(models)) {
    if (descriptor.name !== name) errors.push(`${name} name drift`);
    for (const field of COMMON_REQUIRED_FIELDS) {
      if (!descriptor.required_fields.includes(field)) errors.push(`${name} missing required field ${field}`);
    }
    if (descriptor.writes_enabled_by_model !== false) errors.push(`${name} must not enable writes`);
    if (descriptor.production_go_live_claim !== false) errors.push(`${name} must not claim production go-live`);
    if (descriptor.public_release_claim !== false) errors.push(`${name} must not claim public release`);
  }
  for (const required of ["feature_readiness", "approval_request", "connector_receipt", "execution_run", "audit_event", "field_policy_rule", "document_policy_rule"]) {
    if (!models[required]) errors.push(`missing ${required}`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), models });
}

export function transitionReadinessState({ from, to, providerReceiptRequired = true } = {}) {
  if (!READINESS_INDEX.has(from)) return Object.freeze({ allowed: false, reason: "unknown_from_state" });
  if (!READINESS_INDEX.has(to)) return Object.freeze({ allowed: false, reason: "unknown_to_state" });
  if (from === to) return Object.freeze({ allowed: true, reason: "no_change" });

  const current = READINESS_INDEX.get(from);
  const next = READINESS_INDEX.get(to);
  if (next !== current + 1) return Object.freeze({ allowed: false, reason: "state_skip_blocked" });
  if (providerReceiptRequired && from === "owner_approved" && to !== "provider_receipt_recorded") {
    return Object.freeze({ allowed: false, reason: "provider_receipt_required" });
  }
  if (!providerReceiptRequired && from === "owner_approved" && to === "provider_receipt_recorded") {
    return Object.freeze({ allowed: false, reason: "provider_receipt_not_applicable" });
  }
  return Object.freeze({ allowed: true, reason: "ordered_transition" });
}

export function redactLcxFullValue(value) {
  if (Array.isArray(value)) return value.map((item) => redactLcxFullValue(item));
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && FORBIDDEN_VALUE_PATTERN.test(value)) return "[lcx-full-redacted]";
    return value;
  }
  let redactedIndex = 0;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => {
      if (FORBIDDEN_KEY_PATTERN.test(key)) {
        const safeKey = `redacted_field_${redactedIndex}`;
        redactedIndex += 1;
        return [safeKey, "[lcx-full-redacted]"];
      }
      return [key, redactLcxFullValue(nested)];
    })
  );
}

export function assertNoForbiddenProjection(value) {
  function hasForbidden(input) {
    if (Array.isArray(input)) return input.some((item) => hasForbidden(item));
    if (!input || typeof input !== "object") {
      return typeof input === "string" && FORBIDDEN_VALUE_PATTERN.test(input);
    }
    return Object.entries(input).some(([key, nested]) => FORBIDDEN_KEY_PATTERN.test(key) || hasForbidden(nested));
  }
  const serialized = JSON.stringify(value);
  return Object.freeze({
    valid: !hasForbidden(value),
    serialized
  });
}

export function projectReadinessRecord(record = {}) {
  return redactLcxFullValue({
    id: record.id ?? "readiness_projection",
    feature_id: record.feature_id ?? "unknown_feature",
    readiness_state: LCX_FULL_READINESS_STATES.includes(record.readiness_state) ? record.readiness_state : "not_configured",
    approval_state: LCX_FULL_APPROVAL_STATES.includes(record.approval_state) ? record.approval_state : "not_requested",
    provider_receipt_state: LCX_FULL_PROVIDER_RECEIPT_STATES.includes(record.provider_receipt_state) ? record.provider_receipt_state : "missing",
    run_state: LCX_FULL_RUN_STATES.includes(record.run_state) ? record.run_state : "not_started",
    audit_state: LCX_FULL_AUDIT_STATES.includes(record.audit_state) ? record.audit_state : "pending",
    blocked_claims: Array.isArray(record.blocked_claims) ? record.blocked_claims : [],
    writes_enabled: false,
    owner_approval_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export const LCX_FULL_SAFE_READINESS_FIXTURES = Object.freeze([
  projectReadinessRecord({
    id: "lcx-full-fixture-matter-vault",
    feature_id: "matter-vault-document-workspace",
    readiness_state: "preflight_passed",
    approval_state: "requested",
    provider_receipt_state: "missing",
    run_state: "execute_blocked",
    audit_state: "recorded",
    blocked_claims: ["provider_receipt", "owner_approval", "production_go_live"]
  }),
  projectReadinessRecord({
    id: "lcx-full-fixture-client-data",
    feature_id: "client-data-enrichment",
    readiness_state: "owner_approved",
    approval_state: "approved",
    provider_receipt_state: "missing",
    run_state: "execute_blocked",
    audit_state: "redacted",
    blocked_claims: ["provider_receipt", "provider_payload"]
  })
]);
