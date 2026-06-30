const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const runtimeTenant = (...parts) => parts.join("_");
const TENANT_ID = runtimeTenant("tenant", "rp04", "synthetic");
const MATTER_TENANT_ID = runtimeTenant("tenant", "rp05", "synthetic");
const VAULT_TENANT_ID = "tenant_amic_matter_vault";
const CRM_INTAKE_TENANT_ID = runtimeTenant("tenant", "cmp", "g6", "synthetic");
const FINANCE_TENANT_ID = runtimeTenant("tenant", "cmp", "g7", "synthetic");
const ANALYTICS_TENANT_ID = runtimeTenant("tenant", "cmp", "g8", "synthetic");
const AI_TENANT_ID = "matter-runtime-tenant";
const PORTAL_TENANT_ID = "matter-client-tenant";
const UI_READINESS_TENANT_ID = "matter-runtime-tenant";
const ENTERPRISE_TENANT_ID = "matter-runtime-tenant";
const ADMIN_PERMISSION_TENANT_ID = runtimeTenant("tenant", "sf", "b", "w06", "synthetic");
const DATA_CLOUD_TENANT_ID = runtimeTenant("tenant", "sf", "b", "w07", "synthetic");
const DEFAULT_PERMISSION_REF = "ui_cmp_r4_master_data_live";
const DEFAULT_AUDIT_HINT_REF = "ui_cmp_r4_master_data_probe";
const DEFAULT_MATTER_PERMISSION_REF = "ui_cmp_g4_matter_live";
const DEFAULT_MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_probe";
const DEFAULT_VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const DEFAULT_VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";
const DEFAULT_CRM_INTAKE_PERMISSION_REF = "ui_cmp_g6_crm_intake_live";
const DEFAULT_CRM_INTAKE_AUDIT_HINT_REF = "ui_cmp_g6_crm_intake_probe";
const DEFAULT_FINANCE_PERMISSION_REF = "ui_cmp_g7_finance_live";
const DEFAULT_FINANCE_AUDIT_HINT_REF = "ui_cmp_g7_finance_probe";
const DEFAULT_ANALYTICS_PERMISSION_REF = "ui_cmp_g8_analytics_live";
const DEFAULT_ANALYTICS_AUDIT_HINT_REF = "ui_cmp_g8_analytics_probe";
const DEFAULT_AI_PERMISSION_REF = "ui_cmp_g9_ai_live";
const DEFAULT_AI_AUDIT_HINT_REF = "ui_cmp_g9_ai_probe";
const DEFAULT_PORTAL_PERMISSION_REF = "ui_cmp_g10_portal_live";
const DEFAULT_PORTAL_AUDIT_HINT_REF = "ui_cmp_g10_portal_probe";
const DEFAULT_UI_READINESS_PERMISSION_REF = "ui_cmp_g11_readiness_live";
const DEFAULT_UI_READINESS_AUDIT_HINT_REF = "ui_cmp_g11_readiness_probe";
const DEFAULT_ENTERPRISE_PERMISSION_REF = "ui_cmp_g12_enterprise_live";
const DEFAULT_ENTERPRISE_AUDIT_HINT_REF = "ui_cmp_g12_enterprise_probe";
const DEFAULT_ADMIN_PERMISSION_REF = "ui_sf_b_w06_permission_admin";
const DEFAULT_ADMIN_AUDIT_HINT_REF = "ui_sf_b_w06_permission_admin_probe";
const DEFAULT_DATA_CLOUD_PERMISSION_REF = "ui_sf_b_w07_data_cloud_enrichment";
const DEFAULT_DATA_CLOUD_AUDIT_HINT_REF = "ui_sf_b_w07_data_cloud_probe";
const DEFAULT_REPORT_PERMISSION_REF = "ui_sf_b_w08_report_builder";
const DEFAULT_REPORT_AUDIT_HINT_REF = "ui_sf_b_w08_report_builder_probe";
const DEFAULT_PROFILE_PERMISSION_REF = "ui_profile_me";
const DEFAULT_PROFILE_AUDIT_HINT_REF = "ui_profile_me_probe";
export const LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos.session.envelope";
export const LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os.desktop-web-session-envelope.v0.1";
export {
  advanceExecutionRun,
  createApprovalRequest,
  createExecutionRun,
  decideApprovalRequest,
  evaluateProviderReceipt,
  projectConnectorReceipt
} from "./approvalProviderRunKernel.js";
export {
  IMPORT_FIELD_ALLOWLISTS,
  activateSegment as activateLcxFullSegment,
  assertImportEnrichmentSafe as assertLcxFullImportEnrichmentSafe,
  createConsentCoverage as createLcxFullConsentCoverage,
  createEnrichmentJob as createLcxFullEnrichmentJob,
  createIdentityCandidates as createLcxFullIdentityCandidates,
  dryRunImport as dryRunLcxFullImport,
  executeImportSynthetic as executeLcxFullImportSynthetic,
  rollbackImport as rollbackLcxFullImport,
  stageImportSource as stageLcxFullImportSource,
  validateImportMapping as validateLcxFullImportMapping
} from "./importEnrichmentKernel.js";
export {
  assertExternalProviderWorkflowSafe as assertLcxFullExternalProviderWorkflowSafe,
  createBillingReconciliation as createLcxFullBillingReconciliation,
  createContractDraftPackage as createLcxFullContractDraftPackage,
  createESignSendRequest as createLcxFullESignSendRequest,
  createInvoiceIssueRequest as createLcxFullInvoiceIssueRequest,
  createMatterCommsSendRequest as createLcxFullMatterCommsSendRequest,
  createMatterMessageDraft as createLcxFullMatterMessageDraft,
  createPaymentSendRequest as createLcxFullPaymentSendRequest,
  createTaxInvoiceIssueRequest as createLcxFullTaxInvoiceIssueRequest,
  validateContractSigners as validateLcxFullContractSigners,
  validateMatterRecipients as validateLcxFullMatterRecipients
} from "./externalProviderWorkflowKernel.js";
export {
  assertPeopleWorkflowSafe as assertLcxFullPeopleWorkflowSafe,
  buildPeopleReadinessCatalog as buildLcxFullPeopleReadinessCatalog,
  configurePeopleSetupRows as configureLcxFullPeopleSetupRows,
  createPeopleGovernancePacket as createLcxFullPeopleGovernancePacket,
  createPeopleIntegrationRequest as createLcxFullPeopleIntegrationRequest
} from "./peopleWorkflowKernel.js";
export {
  assertGlobalDecisionAuditSafe as assertLcxFullGlobalDecisionAuditSafe,
  buildAuditRequiredAction as buildLcxFullAuditRequiredAction,
  buildGlobalDecisionPackets as buildLcxFullGlobalDecisionPackets,
  buildReceiptReconciliation as buildLcxFullReceiptReconciliation,
  listGlobalAuditSurfaces as listLcxFullGlobalAuditSurfaces
} from "./globalDecisionAuditKernel.js";
export {
  LCX_FULL_AUDIT_STATES,
  LCX_FULL_MODEL_DECLARATIONS,
  LCX_FULL_PROVIDER_RECEIPT_STATES,
  LCX_FULL_READINESS_STATES,
  LCX_FULL_SAFE_READINESS_FIXTURES,
  assertNoForbiddenProjection,
  projectReadinessRecord,
  redactLcxFullValue,
  transitionReadinessState,
  validateLcxFullReadinessModel
} from "./readinessModel.js";

const SESSION_DOMAINS = ["client", "matter", "vault", "crm", "default"];
const SAFE_SESSION_STATES = new Set(["signed_in"]);
const SAFE_REVIEW_STATES = new Set(["allow", "review", "denied"]);
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const FORBIDDEN_SESSION_TEXT = /(password|reset|bearer|cookie|secret|credential|authorization|token|sk-)/i;

const PRINCIPAL = {
  user_id: "matter_client_operator",
  tenant_id: TENANT_ID,
  role_ids: ["master_data_reader"]
};

const MATTER_PRINCIPAL = {
  user_id: "matter_matter_operator",
  tenant_id: MATTER_TENANT_ID,
  role_ids: ["matter_runtime_user"]
};

const VAULT_PRINCIPAL = {
  user_id: "user_amic_jwsuh",
  tenant_id: VAULT_TENANT_ID,
  role_ids: ["system_super_admin", "tenant_owner", "managing_partner", "security_admin", "matter_vault_admin", "matter_vault_user", "dms_reader"]
};

const CRM_INTAKE_PRINCIPAL = {
  user_id: "matter_client_intake_operator",
  tenant_id: CRM_INTAKE_TENANT_ID,
  role_ids: ["crm_intake_user", "conflict_reviewer"]
};

const FINANCE_PRINCIPAL = {
  user_id: "matter_finance_operator",
  tenant_id: FINANCE_TENANT_ID,
  role_ids: ["finance_user"]
};

const ANALYTICS_PRINCIPAL = {
  user_id: "matter_analytics_operator",
  tenant_id: ANALYTICS_TENANT_ID,
  role_ids: ["analytics_user"]
};

const AI_PRINCIPAL = {
  user_id: "matter_ai_review_operator",
  tenant_id: AI_TENANT_ID,
  role_ids: ["ai_reviewer"]
};

const PORTAL_PRINCIPAL = {
  user_id: "matter_client_portal_operator",
  tenant_id: PORTAL_TENANT_ID,
  role_ids: ["portal_operator", "data_room_operator"]
};

const UI_READINESS_PRINCIPAL = {
  user_id: "matter_readiness_operator",
  tenant_id: UI_READINESS_TENANT_ID,
  role_ids: ["ui_readiness_reviewer"]
};

const ENTERPRISE_PRINCIPAL = {
  user_id: "matter_enterprise_operator",
  tenant_id: ENTERPRISE_TENANT_ID,
  role_ids: ["enterprise_operator"]
};

const ADMIN_PERMISSION_PRINCIPAL = {
  user_id: "matter_admin_operator",
  tenant_id: ADMIN_PERMISSION_TENANT_ID,
  role_ids: ["security_admin", "people_admin"]
};

const DATA_CLOUD_PRINCIPAL = {
  user_id: "matter_data_cloud_operator",
  tenant_id: DATA_CLOUD_TENANT_ID,
  role_ids: ["data_cloud_operator"]
};

const REPORT_PRINCIPAL = {
  user_id: "matter_report_builder_operator",
  tenant_id: ANALYTICS_TENANT_ID,
  role_ids: ["report_builder", "analytics_user"]
};

const PERMISSION_CONTEXTS = {
  allow: {
    principal: PRINCIPAL,
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: PRINCIPAL,
    rules: [{ id: "rule_review", effect: "review_required", action: "search" }],
    object_acl: []
  }
};

const MATTER_PERMISSION_CONTEXTS = {
  allow: {
    principal: MATTER_PRINCIPAL,
    rules: [{ id: "rule_matter_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: MATTER_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: MATTER_PRINCIPAL,
    rules: [{ id: "rule_matter_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const VAULT_PERMISSION_CONTEXTS = {
  allow: {
    principal: VAULT_PRINCIPAL,
    rules: [{ id: "rule_vault_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: VAULT_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: VAULT_PRINCIPAL,
    rules: [{ id: "rule_vault_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

function safeSessionRef(value) {
  if (typeof value !== "string") return null;
  const ref = value.trim();
  if (!ref || ref.includes("@") || !SAFE_REF_PATTERN.test(ref) || FORBIDDEN_SESSION_TEXT.test(ref)) return null;
  return ref;
}

function safeSessionRefList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => safeSessionRef(value)).filter(Boolean).slice(0, 24);
}

function safeTenantRefs(value, fallbackTenantRef = null) {
  const tenantRefs = {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  for (const domain of SESSION_DOMAINS) {
    const ref = safeSessionRef(source[domain]);
    if (ref) tenantRefs[domain] = ref;
  }
  const fallback = safeSessionRef(fallbackTenantRef);
  if (fallback && !tenantRefs.default) tenantRefs.default = fallback;
  return tenantRefs;
}

function readStoredSessionEnvelope(source) {
  try {
    const storage = source?.sessionStorage ?? globalThis.sessionStorage;
    const raw = storage?.getItem?.(LAWOS_SESSION_ENVELOPE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readUrlSessionEnvelope(source) {
  try {
    const location = source?.location ?? globalThis.location;
    const search = typeof location?.search === "string" ? location.search : "";
    const params = new URLSearchParams(search);
    if (params.get("desktop") !== "1") return null;

    const actorRef = safeSessionRef(params.get("desktop_actor_ref"));
    const tenantRef = safeSessionRef(params.get("desktop_tenant_ref"));
    if (!actorRef || !tenantRef) return null;

    const sessionRef = safeSessionRef(params.get("desktop_session_ref")) ?? `desktop:${actorRef}:0`;
    const sourceRef = safeSessionRef(params.get("desktop_source_ref")) ?? "desktop_offline_login";
    return {
      schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
      state: "signed_in",
      session_ref: sessionRef,
      source: sourceRef,
      actor_ref: actorRef,
      tenant_refs: {
        default: tenantRef,
        client: TENANT_ID,
        matter: MATTER_TENANT_ID,
        vault: VAULT_TENANT_ID,
        crm: CRM_INTAKE_TENANT_ID
      },
      role_ids: params.getAll("desktop_role_ref"),
      scopes: params.getAll("desktop_scope_ref"),
      review_state: SAFE_REVIEW_STATES.has(params.get("desktop_review_state")) ? params.get("desktop_review_state") : "allow",
      expires_at: params.get("desktop_expires_at")
    };
  } catch {
    return null;
  }
}

function hasForbiddenSessionKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenSessionKey(item));
  return Object.entries(value).some(([key, nested]) => {
    if (FORBIDDEN_SESSION_TEXT.test(key)) return true;
    return hasForbiddenSessionKey(nested);
  });
}

export function readLawosSessionEnvelope(source = globalThis) {
  const raw = source?.__LAWOS_SESSION_CONTEXT__ ?? readUrlSessionEnvelope(source) ?? readStoredSessionEnvelope(source);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (hasForbiddenSessionKey(raw)) return null;

  const schemaVersion = safeSessionRef(raw.schema_version);
  const state = typeof raw.state === "string" ? raw.state : null;
  const actorRef = safeSessionRef(raw.actor_ref ?? raw.user_ref ?? raw.user_id);
  const sessionRef = safeSessionRef(raw.session_ref);
  const sourceRef = safeSessionRef(raw.source ?? raw.source_ref);
  const tenantRefs = safeTenantRefs(raw.tenant_refs, raw.tenant_ref ?? raw.tenant_id);
  const reviewState = SAFE_REVIEW_STATES.has(raw.review_state) ? raw.review_state : "allow";
  const expiresAt = typeof raw.expires_at === "string" ? raw.expires_at : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;

  if (schemaVersion !== LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION) return null;
  if (!SAFE_SESSION_STATES.has(state) || !actorRef) return null;
  if (Object.keys(tenantRefs).length === 0) return null;
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return null;

  return {
    schema_version: schemaVersion,
    state,
    session_ref: sessionRef,
    source: sourceRef ?? "desktop_session",
    actor_ref: actorRef,
    tenant_refs: tenantRefs,
    role_ids: safeSessionRefList(raw.role_ids),
    scopes: safeSessionRefList(raw.scopes),
    review_state: reviewState,
    expires_at: expiresAt
  };
}

function tenantRefForDomain(envelope, domain, fallbackTenantId) {
  if (!envelope) return fallbackTenantId;
  return envelope.tenant_refs[domain] ?? envelope.tenant_refs.default ?? fallbackTenantId;
}

function principalWithSession(basePrincipal, domain, envelope = readLawosSessionEnvelope()) {
  if (!envelope) return basePrincipal;
  return {
    ...basePrincipal,
    user_id: envelope.actor_ref,
    tenant_id: tenantRefForDomain(envelope, domain, basePrincipal.tenant_id),
    role_ids: envelope.role_ids.length > 0 ? envelope.role_ids : basePrincipal.role_ids,
    session_context_ref: envelope.session_ref,
    session_source_ref: envelope.source,
    session_principal_source: "desktop_web_session_envelope"
  };
}

function actorRefForDomain(_domain, fallbackActorId) {
  return readLawosSessionEnvelope()?.actor_ref ?? fallbackActorId;
}

function permissionContextFor(ctx, contexts, domain) {
  const envelope = readLawosSessionEnvelope();
  const requestedMode = SAFE_REVIEW_STATES.has(ctx) ? ctx : "allow";
  const effectiveMode =
    envelope && requestedMode === "allow" && envelope.review_state !== "allow"
      ? envelope.review_state
      : requestedMode;
  const baseContext = contexts[effectiveMode] ?? contexts.allow;
  return {
    ...baseContext,
    principal: principalWithSession(baseContext.principal, domain, envelope),
    rules: [...(baseContext.rules ?? [])],
    object_acl: [...(baseContext.object_acl ?? [])]
  };
}

const CRM_INTAKE_PERMISSION_CONTEXTS = {
  allow: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [{ id: "rule_crm_intake_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: CRM_INTAKE_PRINCIPAL,
    rules: [{ id: "rule_crm_intake_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const FINANCE_PERMISSION_CONTEXTS = {
  allow: {
    principal: FINANCE_PRINCIPAL,
    rules: [{ id: "rule_finance_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: FINANCE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: FINANCE_PRINCIPAL,
    rules: [{ id: "rule_finance_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const ANALYTICS_PERMISSION_CONTEXTS = {
  allow: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [{ id: "rule_analytics_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ANALYTICS_PRINCIPAL,
    rules: [{ id: "rule_analytics_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const AI_PERMISSION_CONTEXTS = {
  allow: {
    principal: AI_PRINCIPAL,
    rules: [{ id: "rule_ai_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: AI_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: AI_PRINCIPAL,
    rules: [{ id: "rule_ai_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const PORTAL_PERMISSION_CONTEXTS = {
  allow: {
    principal: PORTAL_PRINCIPAL,
    rules: [{ id: "rule_portal_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: PORTAL_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: PORTAL_PRINCIPAL,
    rules: [{ id: "rule_portal_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const UI_READINESS_PERMISSION_CONTEXTS = {
  allow: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [{ id: "rule_ui_readiness_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: UI_READINESS_PRINCIPAL,
    rules: [{ id: "rule_ui_readiness_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const ENTERPRISE_PERMISSION_CONTEXTS = {
  allow: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [{ id: "rule_enterprise_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ENTERPRISE_PRINCIPAL,
    rules: [{ id: "rule_enterprise_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const ADMIN_PERMISSION_CONTEXTS = {
  allow: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [{ id: "rule_admin_permission_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: ADMIN_PERMISSION_PRINCIPAL,
    rules: [{ id: "rule_admin_permission_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const DATA_CLOUD_PERMISSION_CONTEXTS = {
  allow: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [{ id: "rule_data_cloud_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: DATA_CLOUD_PRINCIPAL,
    rules: [{ id: "rule_data_cloud_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

const REPORT_PERMISSION_CONTEXTS = {
  allow: {
    principal: REPORT_PRINCIPAL,
    rules: [{ id: "rule_report_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: REPORT_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: REPORT_PRINCIPAL,
    rules: [{ id: "rule_report_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

// Gated master-data responses (200/403/...) share this 8-key shape. Other
// statuses (404 unknown route, 405, 500) use a smaller shape and must parse
// to an explicit error — never assume the full shape unconditionally.
const GATED_RESPONSE_KEYS = [
  "request_id",
  "outcome",
  "items",
  "page_info",
  "safe_error_codes",
  "omitted_fields",
  "audit_hint_ref",
  "ui_state"
];

export async function fetchMasterDataRecords({
  ctx = "allow",
  modelType = null,
  filters = null,
  limit = 25,
  permissionRef = DEFAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, PERMISSION_CONTEXTS, "client");
  const params = new URLSearchParams({
    tenant_id: TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });
  if (modelType) params.set("model_type", modelType);
  if (filters && typeof filters === "object" && !Array.isArray(filters)) {
    params.set("filters", JSON.stringify(filters));
  }

  let body;
  try {
    const response = await fetch(`/master-data/records?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasGatedShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    GATED_RESPONSE_KEYS.every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasGatedShape) {
    return { kind: "error" };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info,
    safeErrorCodes: body.safe_error_codes,
    omittedFields: body.omitted_fields,
    auditHintRef: body.audit_hint_ref
  };
}

export async function fetchUserProfile({
  ctx = "allow",
  permissionRef = DEFAULT_PROFILE_PERMISSION_REF,
  auditHintRef = DEFAULT_PROFILE_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, PERMISSION_CONTEXTS, "client");
  const params = new URLSearchParams({
    tenant_id: TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let response;
  let body;
  try {
    response = await fetch(`/api/profile/me?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error", uiState: "error" };
  }

  const hasProfileShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasProfileShape) return { kind: "error", uiState: "error" };

  if (!response.ok || body.outcome !== "passed") {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: body.ui_state ?? (body.outcome === "review_required" ? "review" : "denied"),
      item: null,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: body.item ? "data" : "empty",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.item ? body.ui_state : "empty",
    item: body.item ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterRecords({
  ctx = "allow",
  limit = 25,
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });

  let body;
  try {
    const response = await fetch(`/api/matters?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasMatterShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasMatterShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterListViews({
  ctx = "allow",
  limit = 10,
  permissionRef = "ui_sf_b_w02_list_views",
  auditHintRef = "ui_sf_b_w02_list_views_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });

  let body;
  try {
    const response = await fetch(`/api/matters/list-views?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasListViewShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasListViewShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterRecentlyViewed({
  ctx = "allow",
  limit = 5,
  permissionRef = "ui_sf_b_w02_recently_viewed",
  auditHintRef = "ui_sf_b_w02_recently_viewed_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef,
    limit: String(limit)
  });

  let body;
  try {
    const response = await fetch(`/api/matters/recently-viewed?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasRecentShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasRecentShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function writeMatterRuntime({ method = "POST", path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  let body;
  try {
    const response = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    matter: body.matter ?? null,
    ownerAssignment: body.owner_assignment ?? null,
    fieldPatch: body.field_patch ?? null,
    transition: body.transition ?? null,
    bulkAction: body.bulk_action ?? null,
    auditEvent: body.audit_event ?? null,
    timelineEvent: body.timeline_event ?? null,
    deadlineChangeRequest: body.deadline_change_request ?? null,
    confirmation: body.confirmation ?? null,
    providerState: body.provider_state ?? null,
    approvalRequest: body.approval_request ?? null,
    publishState: body.publish_state ?? null,
    preview: body.preview ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    stateIdempotent: body.state_idempotent === true,
    uiState: body.ui_state ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function postMatterRuntime({ path, payload, ctx = "allow" } = {}) {
  return writeMatterRuntime({ method: "POST", path, payload, ctx });
}

function patchMatterRuntime({ path, payload, ctx = "allow" } = {}) {
  return writeMatterRuntime({ method: "PATCH", path, payload, ctx });
}

async function fetchMatterRuntimeCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.items)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchMatterRuntimeItem({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("item" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function adminPermissionPayload(overrides = {}) {
  return {
    tenant_id: ADMIN_PERMISSION_TENANT_ID,
    permission_ref: DEFAULT_ADMIN_PERMISSION_REF,
    audit_hint_ref: DEFAULT_ADMIN_AUDIT_HINT_REF,
    actor_id: ADMIN_PERMISSION_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeAdminPermissionBody(body = {}) {
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome ?? null,
    statusOutcome: body.outcome ?? null,
    uiState: body.ui_state ?? null,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    physicalSchemaMutated: body.physical_schema_mutated === true,
    physicalSchemaMutationAllowed: body.physical_schema_mutation_allowed === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchAdminPermissionCollection({ path, ctx = "allow" } = {}) {
  const context = ADMIN_PERMISSION_CONTEXTS[ctx] ?? ADMIN_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ADMIN_PERMISSION_TENANT_ID,
    permission_ref: DEFAULT_ADMIN_PERMISSION_REF,
    audit_hint_ref: DEFAULT_ADMIN_AUDIT_HINT_REF
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeAdminPermissionBody(body);
}

async function writeAdminPermissionRuntime({ method = "POST", path, payload, ctx = "allow" } = {}) {
  const context = ADMIN_PERMISSION_CONTEXTS[ctx] ?? ADMIN_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(adminPermissionPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeAdminPermissionBody(body);
}

export function fetchPermissionSets({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/permission-sets", ctx });
}

export function createPermissionSet({
  permissionSetId = `permission_set_ui_${Date.now()}`,
  label = "Client Matter 검토 권한",
  description = "Client와 Matter 작업면 검토 권한",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    path: "/api/admin/permission-sets",
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-set:create:${permissionSetId}`,
      permission_set_id: permissionSetId,
      label,
      description,
      rule_refs: ["client:read", "matter:read", "audit:read"],
      object_acl_refs: ["Client", "Matter"]
    }
  });
}

export function patchPermissionSet({
  permissionSetId = "permission_set_client_matter_reviewer",
  label = "Client Matter 검토 권한 갱신",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "PATCH",
    path: `/api/admin/permission-sets/${encodeURIComponent(permissionSetId)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-set:patch:${permissionSetId}:${Date.now()}`,
      patch: {
        label,
        description: "승인 검토가 필요한 권한 세트 변경",
        rule_refs: ["client:read", "matter:read", "audit:read"]
      }
    }
  });
}

export function fetchPermissionAssignments({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/permission-assignments", ctx });
}

export function assignPermissionSet({
  permissionSetId = "permission_set_client_matter_reviewer",
  targetLabel = "Client Matter 검토 그룹",
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  return writeAdminPermissionRuntime({
    path: "/api/admin/permission-assignments",
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-assignment:${permissionSetId}:${stamp}`,
      assignment_id: `permission_assignment_ui_${stamp}`,
      permission_set_id: permissionSetId,
      target_actor_ref: "actor:ui-review-group",
      target_label: targetLabel
    }
  });
}

export function revokePermissionSetAssignment({
  assignmentId = "permission_assignment_reviewer_seed",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "DELETE",
    path: `/api/admin/permission-assignments/${encodeURIComponent(assignmentId)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:permission-assignment:revoke:${assignmentId}:${Date.now()}`
    }
  });
}

export function fetchObjectManagerObjects({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/object-manager/objects", ctx });
}

export function fetchObjectManagerFields({ objectName = "Client", ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({
    path: `/api/admin/object-manager/objects/${encodeURIComponent(objectName)}/fields`,
    ctx
  });
}

export function patchObjectFieldPolicy({
  objectName = "Client",
  fieldName = "status",
  visibility = "visible",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    method: "PATCH",
    path: `/api/admin/object-manager/objects/${encodeURIComponent(objectName)}/fields/${encodeURIComponent(fieldName)}`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:field-policy:${objectName}:${fieldName}:${Date.now()}`,
      visibility,
      owner_approval_required: true
    }
  });
}

export function fetchConnectedApps({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/connected-apps", ctx });
}

export function createConnectedApp({
  appId = `connected_app_ui_${Date.now()}`,
  label = "외부 캘린더 연결",
  ctx = "allow"
} = {}) {
  return writeAdminPermissionRuntime({
    path: "/api/admin/connected-apps",
    ctx,
    payload: {
      idempotency_key: `ui:admin:connected-app:create:${appId}`,
      app_id: appId,
      label
    }
  });
}

export function disableConnectedApp({ appId = "connected_app_microsoft_graph", ctx = "allow" } = {}) {
  return writeAdminPermissionRuntime({
    path: `/api/admin/connected-apps/${encodeURIComponent(appId)}/disable`,
    ctx,
    payload: {
      idempotency_key: `ui:admin:connected-app:disable:${appId}:${Date.now()}`
    }
  });
}

export function fetchAdminPermissionAudit({ ctx = "allow" } = {}) {
  return fetchAdminPermissionCollection({ path: "/api/admin/audit", ctx });
}

function dataCloudPayload(overrides = {}) {
  return {
    tenant_id: DATA_CLOUD_TENANT_ID,
    permission_ref: DEFAULT_DATA_CLOUD_PERMISSION_REF,
    audit_hint_ref: DEFAULT_DATA_CLOUD_AUDIT_HINT_REF,
    actor_id: DATA_CLOUD_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeDataCloudBody(body = {}) {
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome ?? null,
    statusOutcome: body.outcome ?? null,
    uiState: body.ui_state ?? null,
    item: body.item ?? null,
    result: body.result ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    providerPayloadIncluded: body.provider_payload_included === true,
    rawIdentifiersIncluded: body.raw_identifiers_included === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchDataCloudCollection({ path, ctx = "allow" } = {}) {
  const context = DATA_CLOUD_PERMISSION_CONTEXTS[ctx] ?? DATA_CLOUD_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: DATA_CLOUD_TENANT_ID,
    permission_ref: DEFAULT_DATA_CLOUD_PERMISSION_REF,
    audit_hint_ref: DEFAULT_DATA_CLOUD_AUDIT_HINT_REF
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !(("outcome" in body) && ("safe_error_codes" in body))) {
    return { kind: "error" };
  }
  return normalizeDataCloudBody(body);
}

async function writeDataCloudRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = DATA_CLOUD_PERMISSION_CONTEXTS[ctx] ?? DATA_CLOUD_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(dataCloudPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !(("outcome" in body) && ("safe_error_codes" in body))) {
    return { kind: "error" };
  }
  return normalizeDataCloudBody(body);
}

export function fetchDataCloudProviders({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/providers", ctx });
}

export function createDataCloudProvider({
  providerId = `provider_ui_${Date.now()}`,
  label = "검토 대상 외부 연동",
  ctx = "allow"
} = {}) {
  return writeDataCloudRuntime({
    path: "/api/data-cloud/providers",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:provider:${providerId}`,
      provider_id: providerId,
      label,
      data_categories: ["firmographic", "relationship"]
    }
  });
}

export function createDataCloudConsentRecord({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/consent-records",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:consent:${stamp}`,
      consent_record_id: `consent_ui_${stamp}`,
      subject_label: "Client 보강 대상",
      data_categories: ["firmographic", "relationship"],
      lawful_basis: "owner_review_required",
      retention_policy_ref: "retention_owner_review"
    }
  });
}

export function createEnrichmentJob({ jobId = `data_cloud_job_ui_${Date.now()}`, ctx = "allow" } = {}) {
  return writeDataCloudRuntime({
    path: "/api/data-cloud/enrichment-jobs",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:job:${jobId}`,
      job_id: jobId,
      provider_id: "provider_salesforce_data_cloud",
      target_object: "Client",
      target_refs: [{ object_type: "Client", record_ref: "client-ui-record", label: "Client" }],
      data_categories: ["firmographic", "relationship"]
    }
  });
}

export function fetchEnrichmentPreview({ jobId, ctx = "allow" } = {}) {
  return fetchDataCloudCollection({
    path: `/api/data-cloud/enrichment-jobs/${encodeURIComponent(jobId)}/preview`,
    ctx
  });
}

export function executeEnrichmentJob({ jobId, ctx = "allow" } = {}) {
  return writeDataCloudRuntime({
    path: `/api/data-cloud/enrichment-jobs/${encodeURIComponent(jobId)}/execute`,
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:execute:${jobId}:${Date.now()}`
    }
  });
}

export function fetchEnrichmentResults({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/enrichment-results", ctx });
}

export function runIdentityResolution({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/identity-resolution",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:identity:${stamp}`,
      identity_resolution_id: `identity_resolution_ui_${stamp}`
    }
  });
}

export function fetchUnifiedCustomerProfile({ profileId = "unified_profile_client_seed", ctx = "allow" } = {}) {
  return fetchDataCloudCollection({
    path: `/api/data-cloud/unified-profiles/${encodeURIComponent(profileId)}`,
    ctx
  });
}

export function activateDataCloudSegment({ ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeDataCloudRuntime({
    path: "/api/data-cloud/segment-activations",
    ctx,
    payload: {
      idempotency_key: `ui:data-cloud:segment:${stamp}`,
      activation_id: `segment_activation_ui_${stamp}`,
      segment_label: "Client 검토 세그먼트",
      destination_label: "외부 연동 대상"
    }
  });
}

export function fetchDataCloudAudit({ ctx = "allow" } = {}) {
  return fetchDataCloudCollection({ path: "/api/data-cloud/audit", ctx });
}

function importDataPayload(overrides = {}) {
  return {
    tenant_id: MATTER_TENANT_ID,
    permission_ref: "ui_sf_b_w05_import_data_mapping",
    audit_hint_ref: "ui_sf_b_w05_import_data_mapping_probe",
    actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
    ...overrides
  };
}

async function fetchImportDataCollection({ path, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: "ui_sf_b_w05_import_data_mapping",
    audit_hint_ref: "ui_sf_b_w05_import_data_mapping_probe"
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.items)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: body.items,
    blockedTargets: Array.isArray(body.blocked_targets) ? body.blocked_targets : [],
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchClientMatterImportTargets({ ctx = "allow" } = {}) {
  return fetchImportDataCollection({ path: "/api/import-targets", ctx });
}

export function fetchClientMatterImportJobs({ ctx = "allow" } = {}) {
  return fetchImportDataCollection({ path: "/api/import-jobs", ctx });
}

export function createClientMatterImportJob({ targetObject = "crm_account_facade", jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: "/api/import-jobs",
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-create-${jobId}`,
      job_id: jobId,
      target_object: targetObject,
      source_type: "csv_manifest"
    })
  });
}

function importSourceColumns(targetObject) {
  if (targetObject === "matter_runtime_patch") {
    return {
      columns: [
        { source_field: "matter_title", label: "Matter 제목" },
        { source_field: "matter_risk", label: "위험도" }
      ],
      sample_rows: [{ matter_title: "redacted by API", matter_risk: "standard" }]
    };
  }
  return {
    columns: [
      { source_field: "company_name", label: "회사명" },
      { source_field: "account_status", label: "상태" }
    ],
    sample_rows: [{ company_name: "redacted by API", account_status: "active" }]
  };
}

function importFieldMappings(targetObject) {
  if (targetObject === "matter_runtime_patch") {
    return [
      { source_field: "matter_title", target_field: "title" },
      { source_field: "matter_risk", target_field: "risk_level" }
    ];
  }
  return [
    { source_field: "company_name", target_field: "display_name" },
    { source_field: "account_status", target_field: "status" }
  ];
}

export function stageImportSourceFile({ jobId = "import_job_ui_sf_b_w05", targetObject = "crm_account_facade", ctx = "allow" } = {}) {
  const source = importSourceColumns(targetObject);
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/source-files`,
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-stage-${jobId}`,
      source_file: {
        file_name: "client-matter-import.csv",
        mime_type: "text/csv",
        row_count: 12,
        columns: source.columns,
        sample_rows: source.sample_rows
      }
    })
  });
}

export function fetchClientMatterImportPreview({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/preview`,
    ctx,
    permissionRef: "ui_sf_b_w05_import_data_mapping",
    auditHintRef: "ui_sf_b_w05_import_data_mapping_probe"
  });
}

export function saveImportFieldMapping({ jobId = "import_job_ui_sf_b_w05", targetObject = "crm_account_facade", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/field-mappings`,
    ctx,
    payload: importDataPayload({
      idempotency_key: `ui-sf-b-w05-mapping-${jobId}`,
      field_mappings: importFieldMappings(targetObject)
    })
  });
}

export function dryRunClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/dry-run`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-dry-run-${jobId}` })
  });
}

export function executeClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/execute`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-execute-${jobId}` })
  });
}

export function rollbackClientMatterImport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/rollback`,
    ctx,
    payload: importDataPayload({ idempotency_key: `ui-sf-b-w05-rollback-${jobId}` })
  });
}

export function fetchClientMatterImportErrorReport({ jobId = "import_job_ui_sf_b_w05", ctx = "allow" } = {}) {
  return fetchImportDataCollection({
    path: `/api/import-jobs/${encodeURIComponent(jobId)}/error-report`,
    ctx
  });
}

function normalizeRecordActionObject(objectName) {
  const key = String(objectName ?? "").trim().toLowerCase().replace(/[-\s]/g, "_");
  if (["matter", "matters"].includes(key)) return "matter";
  if (["client", "clients", "client_group", "clientgroup"].includes(key)) return "client";
  if (["account", "accounts"].includes(key)) return "account";
  if (["contact", "contacts"].includes(key)) return "contact";
  return "matter";
}

function recordActionRuntime(objectName, ctx = "allow") {
  const normalized = normalizeRecordActionObject(objectName);
  if (normalized === "matter") {
    return {
      objectName: normalized,
      tenantId: MATTER_TENANT_ID,
      principal: MATTER_PRINCIPAL,
      context: permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter"),
      permissionRef: "ui_sf_b_w02_record_actions_matter",
      auditHintRef: "ui_sf_b_w02_record_actions_matter_probe"
    };
  }
  if (normalized === "client") {
    return {
      objectName: normalized,
      tenantId: TENANT_ID,
      principal: PRINCIPAL,
      context: permissionContextFor(ctx, PERMISSION_CONTEXTS, "client"),
      permissionRef: "ui_sf_b_w02_record_actions_client",
      auditHintRef: "ui_sf_b_w02_record_actions_client_probe"
    };
  }
  return {
    objectName: normalized,
    tenantId: CRM_INTAKE_TENANT_ID,
    principal: CRM_INTAKE_PRINCIPAL,
    context: permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm"),
    permissionRef: "ui_sf_b_w02_record_actions_client",
    auditHintRef: "ui_sf_b_w02_record_actions_client_probe"
  };
}

function recordActionActorDomain(objectName) {
  const normalized = normalizeRecordActionObject(objectName);
  if (normalized === "matter") return "matter";
  if (normalized === "client") return "client";
  return "crm";
}

function normalizeRecordActionBody(body = {}) {
  return {
    kind: "data",
    statusOutcome: body.outcome ?? null,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    fieldPatch: body.field_patch ?? null,
    bulkAction: body.bulk_action ?? null,
    auditEvent: body.audit_event ?? null,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    stateIdempotent: body.state_idempotent === true,
    uiState: body.ui_state ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchRecordActionRuntime({ objectName, suffix, ctx = "allow" } = {}) {
  const runtime = recordActionRuntime(objectName, ctx);
  const params = new URLSearchParams({
    tenant_id: runtime.tenantId,
    permission_ref: runtime.permissionRef,
    audit_hint_ref: runtime.auditHintRef
  });
  let body;
  try {
    const response = await fetch(`/api/record-actions/${runtime.objectName}${suffix}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(runtime.context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeRecordActionBody(body);
}

async function writeRecordActionRuntime({ objectName, suffix, payload, ctx = "allow" } = {}) {
  const runtime = recordActionRuntime(objectName, ctx);
  let body;
  try {
    const response = await fetch(`/api/record-actions/${runtime.objectName}${suffix}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(runtime.context)
      },
      body: JSON.stringify({
        tenant_id: runtime.tenantId,
        permission_ref: runtime.permissionRef,
        audit_hint_ref: runtime.auditHintRef,
        actor_id: actorRefForDomain(recordActionActorDomain(objectName), runtime.principal.user_id),
        ...payload
      })
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return normalizeRecordActionBody(body);
}

export function fetchRecordActionFields({ objectName = "matter", ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: "/fields", ctx });
}

export function fetchRecordBulkActions({ objectName = "matter", ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: "/bulk-actions", ctx });
}

export function fetchRecordActionAudit({ objectName = "matter", recordId, ctx = "allow" } = {}) {
  return fetchRecordActionRuntime({ objectName, suffix: `/${encodeURIComponent(recordId)}/audit`, ctx });
}

export function updateRecordActionField({ objectName = "matter", recordId, fieldUpdates = {}, ctx = "allow" } = {}) {
  const safeRecordId = String(recordId ?? "record").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return writeRecordActionRuntime({
    objectName,
    suffix: `/${encodeURIComponent(recordId)}/field-update`,
    payload: {
      idempotency_key: `ui:record-action:${normalizeRecordActionObject(objectName)}:${safeRecordId}:field:${stamp}`,
      field_updates: fieldUpdates,
      reason: "record_field_update"
    },
    ctx
  });
}

export function bulkUpdateRecordActions({ objectName = "matter", recordIds = [], actionType = "field_update", fieldUpdates = {}, targetStatus = null, ctx = "allow" } = {}) {
  const stamp = Date.now();
  return writeRecordActionRuntime({
    objectName,
    suffix: "/bulk-updates",
    payload: {
      idempotency_key: `ui:record-action:${normalizeRecordActionObject(objectName)}:bulk:${actionType}:${stamp}`,
      record_ids: recordIds,
      action_type: actionType,
      field_updates: fieldUpdates,
      target_status: targetStatus,
      bulk_action_ref: `ui_bulk_${normalizeRecordActionObject(objectName)}_${stamp}`,
      reason: actionType === "owner_change" ? "owner_decision_required" : "bulk_record_action"
    },
    ctx
  });
}

function normalizeMatterTeamMemberPayload(payload = {}) {
  const safeMember = payload.member ?? {};
  return {
    ...payload,
    tenant_id: MATTER_TENANT_ID,
    permission_ref: payload.permission_ref ?? "ui_cmp_g4_matter_team",
    audit_hint_ref: payload.audit_hint_ref ?? "ui_cmp_g4_matter_team_probe",
    actor_id: payload.actor_id ?? actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
    member: {
      ...safeMember,
      tenant_id: MATTER_TENANT_ID
    }
  };
}

function normalizeMatterOpeningPayload(payload = {}) {
  return {
    ...payload,
    tenant_id: MATTER_TENANT_ID,
    matter: payload.matter
      ? {
          ...payload.matter,
          tenant_id: MATTER_TENANT_ID
        }
      : payload.matter,
    clearance_token: payload.clearance_token
      ? {
          ...payload.clearance_token,
          tenant_id: MATTER_TENANT_ID
        }
      : payload.clearance_token
  };
}

export function createMatterOpening({ payload, ctx = "allow" } = {}) {
  return postMatterRuntime({ path: "/api/matters/openings", payload: normalizeMatterOpeningPayload(payload), ctx });
}

export function addMatterTeamMember({ matterId, payload, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/team-members`,
    payload: normalizeMatterTeamMemberPayload(payload),
    ctx
  });
}

export function saveMatterListView({ label = "개시 Matter", status = "opening", listViewId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: "/api/matters/list-views",
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_list_views_write",
      audit_hint_ref: "ui_sf_b_w02_list_views_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      list_view_id: listViewId,
      label,
      filter: { status },
      sort: "updated_desc"
    },
    ctx
  });
}

export function bulkCompleteMatterStatus({ matterIds = [], ctx = "allow" } = {}) {
  const safeMatterIds = [...new Set(matterIds.map((matterId) => String(matterId ?? "").trim()).filter(Boolean))];
  const stamp = Date.now();
  return postMatterRuntime({
    path: "/api/matters/bulk/status-transitions",
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_bulk_status_transition",
      audit_hint_ref: "ui_sf_b_w02_matter_bulk_status_transition_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:bulk:status:closed:${stamp}`,
      matter_ids: safeMatterIds,
      target_status: "closed",
      reason: "bulk_status_complete"
    },
    ctx
  });
}

export function changeMatterOwner({ matterId, employeeId = "emp-001", ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/owner-change`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_owner_change",
      audit_hint_ref: "ui_sf_b_w02_matter_owner_change_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:owner:${employeeId}:${stamp}`,
      owner: {
        employee_id: employeeId
      },
      reason: "record_owner_changed"
    },
    ctx
  });
}

export function updateMatterInlineFields({
  matterId,
  fieldUpdates = { wip_status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_inline_patch",
      audit_hint_ref: "ui_sf_b_w02_matter_inline_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:inline:${stamp}`,
      field_updates: fieldUpdates,
      reason: "inline_field_edit"
    },
    ctx
  });
}

export function createMatterDocumentFacade({ matterId, title, contentText, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/documents`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_mv_matter_document_facade",
      audit_hint_ref: "ui_mv_matter_document_facade_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:document:${stamp}`,
      content_text: contentText ?? "Matter 문서 연결 기록",
      document: {
        document_id: `doc_${safeMatterId}_${stamp}`,
        title: title ?? "Matter 문서 연결 기록",
        status: "active",
        current_version_id: `version_doc_${safeMatterId}_${stamp}_1`,
        mime_type: "text/plain"
      }
    },
    ctx
  });
}

export function fetchMatterDocumentTemplates({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/document-templates`,
    ctx,
    permissionRef: "ui_sf_b_w04_document_template_read",
    auditHintRef: "ui_sf_b_w04_document_template_read_probe"
  });
}

export function createMatterBuilderDraft({
  matterId,
  draftId,
  title = "위임계약서 초안",
  body = "문서 초안 본문",
  templateId = "matter_engagement_letter",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const safeDraftId = draftId ?? `builder_draft_${safeMatterId}_${stamp}`;
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_draft_create",
      audit_hint_ref: "ui_sf_b_w04_builder_draft_create_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:${stamp}`,
      draft: {
        draft_id: safeDraftId,
        template_id: templateId,
        title,
        body
      }
    },
    ctx
  });
}

export function patchMatterBuilderDraft({
  matterId,
  draftId,
  patch = { status: "ready_for_review", body: "검토 요청 전 초안 정리" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "builder_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_draft_patch",
      audit_hint_ref: "ui_sf_b_w04_builder_draft_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function fetchMatterBuilderDraftPreview({ matterId, draftId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/preview`,
    ctx,
    permissionRef: "ui_sf_b_w04_builder_preview",
    auditHintRef: "ui_sf_b_w04_builder_preview_probe"
  });
}

export function requestMatterBuilderApproval({ matterId, draftId, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "builder_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/approval-requests`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_approval_request",
      audit_hint_ref: "ui_sf_b_w04_builder_approval_request_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:builder:${safeDraftId}:approval:${stamp}`
    },
    ctx
  });
}

export function fetchMatterBuilderApprovalRequests({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-approval-requests`,
    ctx,
    permissionRef: "ui_sf_b_w04_builder_approval_read",
    auditHintRef: "ui_sf_b_w04_builder_approval_read_probe"
  });
}

export function publishMatterBuilderDraftToVault({ matterId, draftId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/builder-drafts/${encodeURIComponent(draftId)}/publish-to-vault`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_builder_publish",
      audit_hint_ref: "ui_sf_b_w04_builder_publish_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export function createMatterEmailDraft({
  matterId,
  draftId,
  subject = "Matter 진행상황 안내",
  body = "이메일 초안 본문",
  templateId = "matter_status_update_email",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const safeDraftId = draftId ?? `email_draft_${safeMatterId}_${stamp}`;
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_draft_create",
      audit_hint_ref: "ui_sf_b_w04_email_draft_create_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:email:${safeDraftId}:${stamp}`,
      draft: {
        draft_id: safeDraftId,
        template_id: templateId,
        subject,
        body,
        recipient_refs: ["client_contact_ref"]
      }
    },
    ctx
  });
}

export function patchMatterEmailDraft({
  matterId,
  draftId,
  patch = { subject: "Matter 진행상황 안내 업데이트", body: "이메일 초안 정리" },
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDraftId = String(draftId ?? "email_draft").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts/${encodeURIComponent(draftId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_draft_patch",
      audit_hint_ref: "ui_sf_b_w04_email_draft_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:email:${safeDraftId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function requestMatterEmailDraftSendBoundary({ matterId, draftId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/email-drafts/${encodeURIComponent(draftId)}/send`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w04_email_send_boundary",
      audit_hint_ref: "ui_sf_b_w04_email_send_boundary_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export function completeMatterStatus({ matterId, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/status-transitions`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_status_transition",
      audit_hint_ref: "ui_sf_b_w02_matter_status_transition_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:status:closed:${stamp}`,
      target_status: "closed",
      reason: "status_complete"
    },
    ctx
  });
}

export function markMatterRecentlyViewed({ matterId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/recently-viewed`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_recently_viewed",
      audit_hint_ref: "ui_sf_b_w02_recently_viewed_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      viewed_at: new Date().toISOString()
    },
    ctx
  });
}

export function fetchMatterActivities({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities`,
    ctx,
    permissionRef: "ui_sf_b_w03_activity_read",
    auditHintRef: "ui_sf_b_w03_activity_read_probe"
  });
}

export function createMatterActivity({
  matterId,
  activityType = "task",
  title = "검토 작업",
  status = "todo",
  dueAt,
  bodyText,
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_activity_write",
      audit_hint_ref: "ui_sf_b_w03_activity_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:activity:${stamp}`,
      activity: {
        activity_id: `activity_${safeMatterId}_${stamp}`,
        activity_type: activityType,
        title,
        status,
        due_at: dueAt ?? new Date(Date.now() + 86400000).toISOString(),
        body: bodyText
      }
    },
    ctx
  });
}

export function patchMatterActivity({ matterId, activityId, patch = { status: "in_progress" }, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeActivityId = String(activityId ?? "activity").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/activities/${encodeURIComponent(activityId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_activity_patch",
      audit_hint_ref: "ui_sf_b_w03_activity_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:activity:${safeActivityId}:patch:${stamp}`,
      patch
    },
    ctx
  });
}

export function fetchMatterCalendarEvents({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events`,
    ctx,
    permissionRef: "ui_sf_b_w03_calendar_read",
    auditHintRef: "ui_sf_b_w03_calendar_read_probe"
  });
}

export function createMatterCalendarEvent({
  matterId,
  title = "주요 기한",
  startsAt,
  endsAt,
  criticality = "critical",
  legalConsequence = "court_deadline",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const starts = startsAt ?? new Date(Date.now() + 172800000).toISOString();
  const ends = endsAt ?? new Date(new Date(starts).getTime() + 3600000).toISOString();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_calendar_write",
      audit_hint_ref: "ui_sf_b_w03_calendar_write_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:calendar:${stamp}`,
      event: {
        event_id: `calendar_${safeMatterId}_${stamp}`,
        title,
        status: "scheduled",
        starts_at: starts,
        ends_at: ends,
        criticality,
        legal_consequence: legalConsequence,
        reminder_rule: "two_business_days"
      }
    },
    ctx
  });
}

export function patchMatterCalendarEvent({ matterId, eventId, patch = {}, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeEventId = String(eventId ?? "event").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  const starts = patch.starts_at ?? new Date(Date.now() + 259200000).toISOString();
  const ends = patch.ends_at ?? new Date(new Date(starts).getTime() + 3600000).toISOString();
  return patchMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/calendar-events/${encodeURIComponent(eventId)}`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_calendar_patch",
      audit_hint_ref: "ui_sf_b_w03_calendar_patch_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:calendar:${safeEventId}:patch:${stamp}`,
      patch: {
        ...patch,
        starts_at: starts,
        ends_at: ends
      }
    },
    ctx
  });
}

export function fetchMatterDeadlines({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeCollection({
    path: `/api/matters/${encodeURIComponent(matterId)}/deadlines`,
    ctx,
    permissionRef: "ui_sf_b_w03_deadline_read",
    auditHintRef: "ui_sf_b_w03_deadline_read_probe"
  });
}

export function confirmMatterDeadlineChange({
  matterId,
  deadlineId,
  confirmerUserId = runtimeTenant("user", "rp05", "associate"),
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDeadlineId = String(deadlineId ?? "deadline").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/deadlines/${encodeURIComponent(deadlineId)}/confirm-change`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_deadline_confirm",
      audit_hint_ref: "ui_sf_b_w03_deadline_confirm_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      confirmer_user_id: confirmerUserId,
      idempotency_key: `ui:${safeMatterId}:deadline:${safeDeadlineId}:confirm:${stamp}`
    },
    ctx
  });
}

export function fetchMatterChannel({ matterId, ctx = "allow" } = {}) {
  return fetchMatterRuntimeItem({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel`,
    ctx,
    permissionRef: "ui_sf_b_w03_channel_read",
    auditHintRef: "ui_sf_b_w03_channel_read_probe"
  });
}

export function createMatterChannelMessage({
  matterId,
  message = "내부 준비 메모",
  ctx = "allow"
} = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel/messages`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_channel_message",
      audit_hint_ref: "ui_sf_b_w03_channel_message_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id),
      idempotency_key: `ui:${safeMatterId}:channel:${stamp}`,
      message: {
        message_id: `channel_message_${safeMatterId}_${stamp}`,
        body: message
      }
    },
    ctx
  });
}

export function syncMatterChannelProvider({ matterId, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/channel/provider-sync`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w03_channel_provider_sync",
      audit_hint_ref: "ui_sf_b_w03_channel_provider_sync_probe",
      actor_id: actorRefForDomain("matter", MATTER_PRINCIPAL.user_id)
    },
    ctx
  });
}

export async function fetchMatterCommandCenter({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_command_center",
  auditHintRef = "ui_mv_matter_command_center_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/matters/${encodeURIComponent(matterId)}/command-center?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasCommandShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body);
  if (!hasCommandShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item,
    team: body.team ?? [],
    clientReport: body.client_report ?? null,
    vaultSummary: body.vault_summary ?? null,
    vaultLink: body.matter_vault_link ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterVaultSummary({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_vault_summary",
  auditHintRef = "ui_mv_matter_vault_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/matters/${encodeURIComponent(matterId)}/vault-summary?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasSummaryShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body);
  if (!hasSummaryShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    item: body.item,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterTimeline({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_timeline",
  auditHintRef = "ui_mv_matter_timeline_probe"
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/matters/${encodeURIComponent(matterId)}/timeline?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("item" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    item: body.item,
    uiState: body.ui_state,
    safeErrorCodes: body.safe_error_codes ?? [],
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchMatterAudit({
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, "matter");
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/matters/audit?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultDocuments({
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: VAULT_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/vault/documents?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasVaultShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "ui_state", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasVaultShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultBridgeStatus({ ctx = "allow", bridgeToken = null } = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers.Authorization = `Bearer ${bridgeToken}`;

  let response;
  let body;
  try {
    response = await fetch("/api/matters/vault-bridge/status", { headers });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasStatusShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "state_idempotent", "count_leak_prevented", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasStatusShape) return { kind: "error" };

  if (!response.ok) {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref ?? null,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    sourceMode: body.item?.source_mode ?? null,
    clientUpsertPath: body.item?.client_upsert_path ?? null,
    matterUpsertPath: body.item?.matter_upsert_path ?? null,
    runtimeWriteReady: body.item?.runtime_write_ready === true,
    repositoryDurable: body.item?.repository_durable === true,
    safeErrorCodes: body.safe_error_codes,
    stateIdempotent: body.state_idempotent === true,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultMatterLookup({ ctx = "allow", query = "", bridgeToken = null } = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers.Authorization = `Bearer ${bridgeToken}`;
  const params = new URLSearchParams({
    tenant_id: MATTER_TENANT_ID,
    permission_ref: DEFAULT_VAULT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_VAULT_AUDIT_HINT_REF,
    q: query
  });

  let response;
  let body;
  try {
    response = await fetch(`/api/matters/vault-bridge/matter-lookup?${params.toString()}`, { headers });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasLookupShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "count_leak_prevented", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items) &&
    Array.isArray(body.safe_error_codes);
  if (!hasLookupShape) return { kind: "error" };

  if (!response.ok) {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: body.ui_state,
      items: [],
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref,
      countLeakPrevented: body.count_leak_prevented === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchVaultUploadPreflight({
  ctx = "allow",
  selectedMatter = null,
  bridgeStatus = null,
  bridgeToken = null
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const headers = { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) };
  if (bridgeToken) headers.Authorization = `Bearer ${bridgeToken}`;
  const payload = {
    tenant_id: MATTER_TENANT_ID,
    permission_ref: DEFAULT_VAULT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_VAULT_AUDIT_HINT_REF,
    action: "upload_preflight",
    selected_matter_ref: selectedMatter?.selected_ref ?? "",
    matter_id: selectedMatter?.matter_id ?? "",
    matter_code: selectedMatter?.matter_code ?? "",
    source_mode: bridgeStatus?.sourceMode ?? null,
    runtime_write_ready: bridgeStatus?.runtimeWriteReady === true,
    repository_durable: bridgeStatus?.repositoryDurable === true,
    production_ready_claim: bridgeStatus?.productionReadyClaim === true,
    permission_check_only: true
  };

  let response;
  let body;
  try {
    response = await fetch("/api/matters/vault-bridge/upload-preflight", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasPreflightShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "item", "safe_error_codes", "state_idempotent", "count_leak_prevented", "vault_document_write_enabled", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.safe_error_codes);
  if (!hasPreflightShape) return { kind: "error" };

  if (!response.ok || body.item === null || body.outcome !== "preflight_passed") {
    return {
      kind: "guarded",
      status: response.status,
      requestId: body.request_id,
      outcome: body.outcome,
      uiState: body.ui_state,
      safeErrorCodes: body.safe_error_codes,
      auditHintRef: body.audit_hint_ref ?? null,
      stateIdempotent: body.state_idempotent === true,
      countLeakPrevented: body.count_leak_prevented === true,
      vaultDocumentWriteEnabled: body.vault_document_write_enabled === true,
      productionReadyClaim: body.production_ready_claim === true
    };
  }

  return {
    kind: "data",
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item,
    preflightRef: body.item.preflight_ref,
    selectedMatterRef: body.item.selected_matter_ref,
    allowedNextStep: body.item.allowed_next_step,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref ?? null,
    stateIdempotent: body.state_idempotent === true,
    countLeakPrevented: body.count_leak_prevented === true,
    vaultDocumentWriteEnabled: body.vault_document_write_enabled === true || body.item?.vault_document_write_enabled === true,
    productionReadyClaim: body.production_ready_claim === true || body.item?.production_ready_claim === true
  };
}

async function fetchMatterVaultCollection({
  path,
  matterId,
  ctx = "allow",
  permissionRef,
  auditHintRef
} = {}) {
  const context = permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, "vault");
  const params = new URLSearchParams({
    tenant_id: VAULT_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  const items = matterId ? body.items.filter((item) => item.matter_id === matterId) : body.items;
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: items.length === 0 ? "empty" : body.ui_state,
    outcome: body.outcome,
    items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchMatterVaultDocuments({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/documents",
    matterId,
    ctx,
    permissionRef: "ui_mv_matter_vault_documents",
    auditHintRef: "ui_mv_matter_vault_documents_probe"
  });
}

export function fetchMatterVaultSearch({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/search",
    matterId,
    ctx,
    permissionRef: "ui_mv_matter_vault_search",
    auditHintRef: "ui_mv_matter_vault_search_probe"
  });
}

export function fetchMatterVaultAudit({ matterId, ctx = "allow" } = {}) {
  return fetchMatterVaultCollection({
    path: "/api/vault/audit",
    matterId: null,
    ctx,
    permissionRef: "ui_mv_matter_vault_audit",
    auditHintRef: "ui_mv_matter_vault_audit_probe"
  });
}

async function fetchCrmIntakeCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_CRM_INTAKE_PERMISSION_REF,
  auditHintRef = DEFAULT_CRM_INTAKE_AUDIT_HINT_REF
} = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  const params = new URLSearchParams({
    tenant_id: CRM_INTAKE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function uiRuntimeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uiStableId(prefix, value) {
  const safeValue = String(value ?? "record")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `${prefix}_${safeValue || "record"}`;
}

async function postCrmIntakeRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let body;
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    opportunity: body.opportunity ?? null,
    validation: body.validation ?? null,
    mergeCandidates: body.merge_candidates ?? [],
    canonicalWriteStatus: body.canonical_write_status ?? null,
    canonicalRecordTypes: body.canonical_record_types ?? [],
    rollbackMetadataRef: body.rollback_metadata_ref ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function patchCrmIntakeRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, "crm");
  let body;
  try {
    const response = await fetch(path, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    statusOutcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    opportunity: body.opportunity ?? null,
    validation: body.validation ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchCrmOpportunities(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/opportunities" });
}

export function fetchCrmLeads(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/leads" });
}

export function fetchCrmActivities(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_activity_read",
    auditHintRef: "ui_lcx_vltui_05_activity_read_probe",
    ...options,
    path: "/api/crm/activities"
  });
}

export function createCrmActivity({
  activityId,
  partyId = "party_cmp_g6_client_001",
  opportunityId = "opp_cmp_g6_synthetic_001",
  activityType = "note",
  subject = "Client 후속 조치",
  confidential = false,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeActivityId = activityId ?? `activity_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/activities",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_activity_write",
      audit_hint_ref: "ui_lcx_vltui_05_activity_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:activity:${safeActivityId}:${stamp}`,
      reason: "client_activity_created",
      activity: {
        crm_activity_id: safeActivityId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        party_id: partyId,
        opportunity_id: opportunityId,
        activity_type: activityType,
        subject,
        confidential,
        status: "active"
      }
    }
  });
}

export function patchCrmActivity({
  activityId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeActivityId = String(activityId ?? "activity").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/activities/${encodeURIComponent(activityId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_activity_patch",
      audit_hint_ref: "ui_lcx_vltui_05_activity_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:activity:${safeActivityId}:patch:${stamp}`,
      reason: "client_activity_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmProposals(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_proposal_read",
    auditHintRef: "ui_lcx_vltui_05_proposal_read_probe",
    ...options,
    path: "/api/crm/proposals"
  });
}

export function createCrmProposal({
  proposalId,
  opportunityId = "opp_cmp_g6_synthetic_001",
  partyId = "party_cmp_g6_client_001",
  displayName = "Client 제안 초안",
  vaultDocumentRef = "vault_doc_cmp_g6_proposal_ui",
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeProposalId = proposalId ?? `proposal_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/proposals",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_proposal_write",
      audit_hint_ref: "ui_lcx_vltui_05_proposal_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:proposal:${safeProposalId}:${stamp}`,
      reason: "client_proposal_created",
      proposal: {
        proposal_id: safeProposalId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        opportunity_id: opportunityId,
        party_id: partyId,
        fee_estimate_ref: `fee_estimate:${safeProposalId}`,
        display_name: displayName,
        status: "draft",
        proposal_status: "draft",
        approval_state: "review_required",
        vault_document_ref: vaultDocumentRef
      }
    }
  });
}

export function patchCrmProposal({
  proposalId,
  fieldUpdates = { approval_state: "review_required" },
  ctx = "allow"
} = {}) {
  const safeProposalId = String(proposalId ?? "proposal").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/proposals/${encodeURIComponent(proposalId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_proposal_patch",
      audit_hint_ref: "ui_lcx_vltui_05_proposal_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:proposal:${safeProposalId}:patch:${stamp}`,
      reason: "client_proposal_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmAccounts(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/accounts" });
}

export function createCrmAccount({
  displayName = "신규 계정",
  accountId,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeAccountId = accountId ?? `account_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/accounts",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_account_write",
      audit_hint_ref: "ui_sf_b_w01_account_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:account:${safeAccountId}:${stamp}`,
      reason: "account_created",
      account: {
        account_id: safeAccountId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        display_name: displayName,
        status: "active"
      }
    }
  });
}

export function patchCrmAccount({
  accountId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeAccountId = String(accountId ?? "account").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/accounts/${encodeURIComponent(accountId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_account_patch",
      audit_hint_ref: "ui_sf_b_w01_account_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:account:${safeAccountId}:patch:${stamp}`,
      reason: "account_inline_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmContacts(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/contacts" });
}

export function createCrmContact({
  displayName = "신규 연락처",
  contactId,
  accountId,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeContactId = contactId ?? `contact_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/contacts",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_contact_write",
      audit_hint_ref: "ui_sf_b_w01_contact_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:contact:${safeContactId}:${stamp}`,
      reason: "contact_created",
      contact: {
        contact_id: safeContactId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        account_id: accountId ?? null,
        display_name: displayName,
        status: "active",
        primary_contact_fingerprint: `ui-contact-fingerprint-${safeContactId}`
      }
    }
  });
}

export function patchCrmContact({
  contactId,
  fieldUpdates = { status: "review_required" },
  ctx = "allow"
} = {}) {
  const safeContactId = String(contactId ?? "contact").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/contacts/${encodeURIComponent(contactId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_contact_patch",
      audit_hint_ref: "ui_sf_b_w01_contact_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:contact:${safeContactId}:patch:${stamp}`,
      reason: "contact_inline_patch",
      field_updates: fieldUpdates
    }
  });
}

export function fetchCrmAccountContacts({ accountId, ...options } = {}) {
  if (!accountId) {
    return Promise.resolve({ kind: "data", uiState: "empty", outcome: "passed", items: [], safeErrorCodes: [] });
  }
  return fetchCrmIntakeCollection({ ...options, path: `/api/crm/accounts/${encodeURIComponent(accountId)}/contacts` });
}

export function fetchCrmMergeProposals(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_sf_b_w01_merge_read",
    auditHintRef: "ui_sf_b_w01_merge_read_probe",
    ...options,
    path: "/api/crm/duplicate-merge-proposals"
  });
}

export function fetchCrmClientSettings(options = {}) {
  return fetchCrmIntakeCollection({
    permissionRef: "ui_lcx_vltui_05_client_settings_read",
    auditHintRef: "ui_lcx_vltui_05_client_settings_read_probe",
    ...options,
    path: "/api/crm/client-settings"
  });
}

export function patchCrmClientSetting({
  policyId,
  fieldUpdates = { duplicate_review_required: true },
  ctx = "allow"
} = {}) {
  const safePolicyId = String(policyId ?? "client_policy").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return patchCrmIntakeRuntime({
    path: `/api/crm/client-settings/${encodeURIComponent(policyId)}`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_lcx_vltui_05_client_settings_patch",
      audit_hint_ref: "ui_lcx_vltui_05_client_settings_patch_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:client-setting:${safePolicyId}:patch:${stamp}`,
      reason: "client_policy_patch",
      field_updates: fieldUpdates
    }
  });
}

export function createCrmMergeProposal({
  proposalId,
  displayName = "CMP G6 synthetic",
  sourcePartyId,
  targetPartyId,
  ownerApprovalRef,
  dualControlApproverId,
  ctx = "allow"
} = {}) {
  const stamp = Date.now();
  const safeProposalId = proposalId ?? `dup_merge_ui_${stamp}`;
  return postCrmIntakeRuntime({
    path: "/api/crm/duplicate-merge-proposals",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_merge_write",
      audit_hint_ref: "ui_sf_b_w01_merge_write_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:merge:${safeProposalId}:${stamp}`,
      proposal: {
        proposal_id: safeProposalId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        display_name: displayName,
        identifier_type: "business_number",
        identifier_value: "cmp-g6-001",
        source_party_id: sourcePartyId ?? null,
        target_party_id: targetPartyId ?? null,
        owner_decision: ownerApprovalRef ? "approved" : "review_required",
        owner_approval_ref: ownerApprovalRef ?? null,
        dual_control_approver_id: dualControlApproverId ?? null,
        reason: "duplicate_merge_proposal_created"
      }
    }
  });
}

export function executeCrmMergeProposal({ proposalId, ctx = "allow" } = {}) {
  const stamp = Date.now();
  return postCrmIntakeRuntime({
    path: `/api/crm/duplicate-merge-proposals/${encodeURIComponent(proposalId)}/execute`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: "ui_sf_b_w01_merge_execute",
      audit_hint_ref: "ui_sf_b_w01_merge_execute_probe",
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `ui:crm:merge:${proposalId}:execute:${stamp}`,
      reason: "duplicate_merge_execute_requested"
    }
  });
}

export function fetchIntakeRequests(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/requests" });
}

export function fetchIntakeAudit(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/audit" });
}

export function handoffCrmOpportunityToIntake({
  opportunityId,
  requestedScopeSummary = "Client 상담·문의 요청",
  ctx = "allow"
} = {}) {
  const requestId = uiRuntimeId("intake_ui");
  return postCrmIntakeRuntime({
    path: `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/handoff`,
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `handoff:${requestId}`,
      intake_request_id: requestId,
      requested_scope_summary: requestedScopeSummary
    }
  });
}

export function createIntakeConflictCheck({ intakeRequest, ctx = "allow" } = {}) {
  const conflictId = uiRuntimeId("conflict_ui");
  const partyIds = Array.isArray(intakeRequest?.party_ids)
    ? intakeRequest.party_ids
    : [intakeRequest?.requesting_party_id].filter(Boolean);
  return postCrmIntakeRuntime({
    path: "/api/intake/conflict-checks",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `conflict:${conflictId}`,
      conflict_check: {
        conflict_check_id: conflictId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        party_snapshot: { party_ids: partyIds },
        status: "snapshot_recorded",
        owner_user_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id)
      }
    }
  });
}

export function issueIntakeClearanceToken({ intakeRequest, conflictCheck, ctx = "allow" } = {}) {
  const clearanceId = uiRuntimeId("clearance_ui");
  return postCrmIntakeRuntime({
    path: "/api/intake/clearance-tokens",
    ctx,
    payload: {
      tenant_id: CRM_INTAKE_TENANT_ID,
      permission_ref: DEFAULT_CRM_INTAKE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_CRM_INTAKE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("crm", CRM_INTAKE_PRINCIPAL.user_id),
      idempotency_key: `clearance:${clearanceId}`,
      now: "2026-06-20T00:00:00.000Z",
      token: {
        clearance_token_id: clearanceId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        conflict_check_id: conflictCheck?.conflict_check_id,
        engagement_id: `engagement:${clearanceId}`,
        snapshot_hash: conflictCheck?.snapshot_hash,
        expires_at: "2026-06-27T00:00:00.000Z"
      }
    }
  });
}

async function fetchFinanceCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_FINANCE_PERMISSION_REF,
  auditHintRef = DEFAULT_FINANCE_AUDIT_HINT_REF
} = {}) {
  const context = FINANCE_PERMISSION_CONTEXTS[ctx] ?? FINANCE_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: FINANCE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function postFinanceRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = FINANCE_PERMISSION_CONTEXTS[ctx] ?? FINANCE_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchFinanceTimeEntries(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/time-entries" });
}

export function fetchFinanceInvoices(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/invoices" });
}

export function fetchFinanceArAging(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/ar-aging" });
}

export function fetchFinanceAudit(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/audit" });
}

export function createFinanceTimeEntry({
  matterId,
  durationMinutes = 30,
  roleId = "partner",
  workDate = "2026-06-20",
  narrative = "Matter billing time",
  ctx = "allow"
} = {}) {
  const timeEntryId = uiStableId("time_ui", matterId);
  return postFinanceRuntime({
    path: "/api/finance/time-entries",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-time:${matterId}`,
      time_entry: {
        time_entry_id: timeEntryId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        role_id: roleId,
        work_date: workDate,
        narrative,
        duration_minutes: durationMinutes,
        billable: true
      }
    }
  });
}

export function generateFinanceWip({ matterId, ctx = "allow" } = {}) {
  return postFinanceRuntime({
    path: "/api/finance/wip",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-wip:${matterId}`,
      matter_id: matterId
    }
  });
}

export function importFinancePayment({ matterId, amount = 100000, currency = "KRW", ctx = "allow" } = {}) {
  const paymentId = uiStableId("payment_ui", matterId);
  return postFinanceRuntime({
    path: "/api/finance/payments",
    ctx,
    payload: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: DEFAULT_FINANCE_PERMISSION_REF,
      audit_hint_ref: DEFAULT_FINANCE_AUDIT_HINT_REF,
      actor_id: actorRefForDomain("matter", FINANCE_PRINCIPAL.user_id),
      idempotency_key: `ui-payment:${matterId}`,
      payment: {
        payment_id: paymentId,
        tenant_id: FINANCE_TENANT_ID,
        matter_id: matterId,
        bank_reference: `ui-payment:${matterId}`,
        amount,
        currency
      }
    }
  });
}

export async function fetchAnalyticsDashboards({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = ANALYTICS_PERMISSION_CONTEXTS[ctx] ?? ANALYTICS_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });

  let body;
  try {
    const response = await fetch(`/api/analytics/dashboards?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }

  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };

  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

function normalizeAnalyticsCollectionBody(body) {
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function postAnalyticsRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = ANALYTICS_PERMISSION_CONTEXTS[ctx] ?? ANALYTICS_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(payload)
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchAnalyticsClientProfitability({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = ANALYTICS_PERMISSION_CONTEXTS[ctx] ?? ANALYTICS_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await fetch(`/api/analytics/client-profitability?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeAnalyticsCollectionBody(body);
}

export async function fetchAnalyticsMatterProfitability({
  ctx = "allow",
  permissionRef = DEFAULT_ANALYTICS_PERMISSION_REF,
  auditHintRef = DEFAULT_ANALYTICS_AUDIT_HINT_REF
} = {}) {
  const context = ANALYTICS_PERMISSION_CONTEXTS[ctx] ?? ANALYTICS_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await fetch(`/api/analytics/matter-profitability?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info ?? null,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function refreshAnalyticsDashboards({ ctx = "allow" } = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/refresh",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: "ui-analytics-refresh"
    }
  });
}

export function refreshMatterProfitability({ matterId, wipItems = [], invoices = [], payments = [], ctx = "allow" } = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/matter-profitability",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-profitability:${matterId}`,
      matter_id: matterId,
      time_entries: wipItems.map((item) => ({ standard_value: Number(item.amount ?? item.standard_value ?? 0) })),
      invoices: invoices.map((item) => ({ amount_due: Number(item.amount_due ?? item.invoice_total ?? 0) })),
      payments: payments.map((item) => ({ amount: Number(item.amount ?? item.payment_total ?? 0) }))
    }
  });
}

export function refreshClientProfitability({
  clientGroupId = "client_group_ui",
  clientGroupLabel = "Client 그룹",
  ctx = "allow"
} = {}) {
  return postAnalyticsRuntime({
    path: "/api/analytics/client-profitability",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-client-profitability:${clientGroupId}`,
      client_group_id: clientGroupId,
      client_group_label: clientGroupLabel
    }
  });
}

export function createAnalyticsExport({ dashboardId, ctx = "allow" } = {}) {
  const safeDashboardId = dashboardId ?? "dashboard";
  return postAnalyticsRuntime({
    path: "/api/analytics/exports",
    ctx,
    payload: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF,
      audit_hint_ref: DEFAULT_ANALYTICS_AUDIT_HINT_REF,
      actor_id: ANALYTICS_PRINCIPAL.user_id,
      idempotency_key: `ui-analytics-export:${safeDashboardId}`,
      analytics_export: {
        tenant_id: ANALYTICS_TENANT_ID,
        analytics_export_id: `analytics_export_${String(safeDashboardId).replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        dashboard_id: safeDashboardId,
        export_format: "csv",
        permission_ref: DEFAULT_ANALYTICS_PERMISSION_REF
      }
    }
  });
}

function reportPayload(overrides = {}) {
  return {
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: DEFAULT_REPORT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_REPORT_AUDIT_HINT_REF,
    actor_id: REPORT_PRINCIPAL.user_id,
    ...overrides
  };
}

function normalizeReportBody(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !("outcome" in body)) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id ?? null,
    outcome: body.outcome,
    uiState: body.ui_state,
    item: body.item ?? null,
    items: Array.isArray(body.items) ? body.items : [],
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    rawSqlIncluded: body.raw_sql_included === true,
    rawQueryPayloadIncluded: body.raw_query_payload_included === true,
    sourcePayloadIncluded: body.source_payload_included === true,
    arbitrarySqlExecuted: body.arbitrary_sql_executed === true,
    sourceObjectMutated: body.source_object_mutated === true,
    countLeakPrevented: body.count_leak_prevented === true,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchReportRuntime({ path, ctx = "allow" } = {}) {
  const context = REPORT_PERMISSION_CONTEXTS[ctx] ?? REPORT_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ANALYTICS_TENANT_ID,
    permission_ref: DEFAULT_REPORT_PERMISSION_REF,
    audit_hint_ref: DEFAULT_REPORT_AUDIT_HINT_REF
  });
  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeReportBody(body);
}

async function writeReportRuntime({ path, payload, method = "POST", ctx = "allow" } = {}) {
  const context = REPORT_PERMISSION_CONTEXTS[ctx] ?? REPORT_PERMISSION_CONTEXTS.allow;
  let body;
  try {
    const response = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
      },
      body: JSON.stringify(reportPayload(payload))
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return normalizeReportBody(body);
}

export function fetchReportDefinitions({ ctx = "allow" } = {}) {
  return fetchReportRuntime({ path: "/api/reports", ctx });
}

export function createReportDefinition({ reportId = `report_ui_${Date.now()}`, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: "/api/reports",
    ctx,
    payload: {
      idempotency_key: `ui-report:create:${reportId}`,
      report_id: reportId,
      name: "Client 손익 보고서",
      object_scope: "Client",
      column_refs: ["client_group", "matter_count", "profitability_amount"],
      filter_manifest: [{ field: "period", operator: "current", value_label: "현재" }],
      grouping_manifest: ["client_group"],
      chart_manifest: { type: "bar", metric: "profitability_amount" }
    }
  });
}

export function patchReportDefinition({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}`,
    method: "PATCH",
    ctx,
    payload: {
      idempotency_key: `ui-report:patch:${reportId}`,
      name: "Client 손익 검토 보고서",
      chart_manifest: { type: "line", metric: "profitability_amount" }
    }
  });
}

export function runReportQuery({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}/run`,
    ctx,
    payload: {
      idempotency_key: `ui-report:run:${reportId}:${Date.now()}`
    }
  });
}

export function shareReportDefinition({ reportId, ctx = "allow" } = {}) {
  return writeReportRuntime({
    path: `/api/reports/${encodeURIComponent(reportId)}/share`,
    ctx,
    payload: {
      idempotency_key: `ui-report:share:${reportId}:${Date.now()}`,
      target_type: "role",
      target_ref_label: "검토 대상 역할"
    }
  });
}

export function fetchReportAudit({ reportId, ctx = "allow" } = {}) {
  const path = reportId ? `/api/reports/${encodeURIComponent(reportId)}/audit` : "/api/reports/audit";
  return fetchReportRuntime({ path, ctx });
}

export async function fetchAiReviewQueue({
  ctx = "allow",
  permissionRef = DEFAULT_AI_PERMISSION_REF,
  auditHintRef = DEFAULT_AI_AUDIT_HINT_REF
} = {}) {
  const context = AI_PERMISSION_CONTEXTS[ctx] ?? AI_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: AI_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await fetch(`/api/ai/review-queue?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function fetchPortalCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_PORTAL_PERMISSION_REF,
  auditHintRef = DEFAULT_PORTAL_AUDIT_HINT_REF
} = {}) {
  const context = PORTAL_PERMISSION_CONTEXTS[ctx] ?? PORTAL_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: PORTAL_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await fetch(`${path}?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function fetchPortalDashboard(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/portal/dashboard" });
}

export function fetchPortalRfi(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/portal/rfi" });
}

export function fetchDataRoomProjections(options = {}) {
  return fetchPortalCollection({ ...options, path: "/api/data-room/projections" });
}

export async function fetchUiReadinessChecks({
  ctx = "allow",
  routeId = null,
  permissionRef = DEFAULT_UI_READINESS_PERMISSION_REF,
  auditHintRef = DEFAULT_UI_READINESS_AUDIT_HINT_REF
} = {}) {
  const context = UI_READINESS_PERMISSION_CONTEXTS[ctx] ?? UI_READINESS_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: UI_READINESS_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  if (routeId) params.set("route_id", routeId);
  let body;
  try {
    const response = await fetch(`/api/ui/readiness?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export async function fetchEnterpriseReadinessItems({
  ctx = "allow",
  permissionRef = DEFAULT_ENTERPRISE_PERMISSION_REF,
  auditHintRef = DEFAULT_ENTERPRISE_AUDIT_HINT_REF
} = {}) {
  const context = ENTERPRISE_PERMISSION_CONTEXTS[ctx] ?? ENTERPRISE_PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: ENTERPRISE_TENANT_ID,
    permission_ref: permissionRef,
    audit_hint_ref: auditHintRef
  });
  let body;
  try {
    const response = await fetch(`/api/enterprise/readiness?${params.toString()}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context) }
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const hasShape =
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    ["request_id", "outcome", "items", "safe_error_codes", "audit_hint_ref", "production_ready_claim", "go_live_approved"]
      .every((key) => key in body) &&
    Array.isArray(body.items);
  if (!hasShape) return { kind: "error" };
  return {
    kind: "data",
    requestId: body.request_id,
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    safeErrorCodes: body.safe_error_codes,
    auditHintRef: body.audit_hint_ref,
    countLeakPrevented: body.count_leak_prevented === true,
    productionReadyClaim: body.production_ready_claim === true,
    goLiveApproved: body.go_live_approved === true
  };
}
