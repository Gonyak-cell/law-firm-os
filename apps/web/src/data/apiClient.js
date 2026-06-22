const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const TENANT_ID = "matter-client-tenant";
const MATTER_TENANT_ID = "matter-runtime-tenant";
const VAULT_TENANT_ID = "matter-vault-tenant";
const CRM_INTAKE_TENANT_ID = "matter-client-tenant";
const FINANCE_TENANT_ID = "matter-runtime-tenant";
const ANALYTICS_TENANT_ID = "matter-runtime-tenant";
const AI_TENANT_ID = "matter-runtime-tenant";
const PORTAL_TENANT_ID = "matter-client-tenant";
const UI_READINESS_TENANT_ID = "matter-runtime-tenant";
const ENTERPRISE_TENANT_ID = "matter-runtime-tenant";
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
  user_id: "matter_vault_operator",
  tenant_id: VAULT_TENANT_ID,
  role_ids: ["dms_reader"]
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
  const context = PERMISSION_CONTEXTS[ctx] ?? PERMISSION_CONTEXTS.allow;
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

export async function fetchMatterRecords({
  ctx = "allow",
  limit = 25,
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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

async function postMatterRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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
    item: body.item ?? null,
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    productionReadyClaim: body.production_ready_claim === true
  };
}

export function createMatterOpening({ payload, ctx = "allow" } = {}) {
  return postMatterRuntime({ path: "/api/matters/openings", payload, ctx });
}

export function addMatterTeamMember({ matterId, payload, ctx = "allow" } = {}) {
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/team-members`,
    payload,
    ctx
  });
}

export async function fetchMatterVaultSummary({
  matterId,
  ctx = "allow",
  permissionRef = "ui_mv_matter_vault_summary",
  auditHintRef = "ui_mv_matter_vault_probe"
} = {}) {
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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

export async function fetchVaultDocuments({
  ctx = "allow",
  permissionRef = DEFAULT_VAULT_PERMISSION_REF,
  auditHintRef = DEFAULT_VAULT_AUDIT_HINT_REF
} = {}) {
  const context = VAULT_PERMISSION_CONTEXTS[ctx] ?? VAULT_PERMISSION_CONTEXTS.allow;
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

async function fetchCrmIntakeCollection({
  path,
  ctx = "allow",
  permissionRef = DEFAULT_CRM_INTAKE_PERMISSION_REF,
  auditHintRef = DEFAULT_CRM_INTAKE_AUDIT_HINT_REF
} = {}) {
  const context = CRM_INTAKE_PERMISSION_CONTEXTS[ctx] ?? CRM_INTAKE_PERMISSION_CONTEXTS.allow;
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

export function fetchCrmOpportunities(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/crm/opportunities" });
}

export function fetchIntakeRequests(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/requests" });
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

export function fetchFinanceTimeEntries(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/time-entries" });
}

export function fetchFinanceInvoices(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/invoices" });
}

export function fetchFinanceArAging(options = {}) {
  return fetchFinanceCollection({ ...options, path: "/api/finance/ar-aging" });
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
