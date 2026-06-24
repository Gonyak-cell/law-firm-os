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

export async function fetchMatterListViews({
  ctx = "allow",
  limit = 10,
  permissionRef = "ui_sf_b_w02_list_views",
  auditHintRef = "ui_sf_b_w02_list_views_probe"
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
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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

function normalizeMatterTeamMemberPayload(payload = {}) {
  const safeMember = payload.member ?? {};
  return {
    ...payload,
    tenant_id: MATTER_TENANT_ID,
    permission_ref: payload.permission_ref ?? "ui_cmp_g4_matter_team",
    audit_hint_ref: payload.audit_hint_ref ?? "ui_cmp_g4_matter_team_probe",
    actor_id: payload.actor_id ?? MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
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

export function completeMatterStatus({ matterId, ctx = "allow" } = {}) {
  const safeMatterId = String(matterId ?? "matter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const stamp = Date.now();
  return postMatterRuntime({
    path: `/api/matters/${encodeURIComponent(matterId)}/status-transitions`,
    payload: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_sf_b_w02_matter_status_transition",
      audit_hint_ref: "ui_sf_b_w02_matter_status_transition_probe",
      actor_id: MATTER_PRINCIPAL.user_id,
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
      actor_id: MATTER_PRINCIPAL.user_id,
      viewed_at: new Date().toISOString()
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
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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

export async function fetchMatterAudit({
  ctx = "allow",
  permissionRef = DEFAULT_MATTER_PERMISSION_REF,
  auditHintRef = DEFAULT_MATTER_AUDIT_HINT_REF
} = {}) {
  const context = MATTER_PERMISSION_CONTEXTS[ctx] ?? MATTER_PERMISSION_CONTEXTS.allow;
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

async function fetchMatterVaultCollection({
  path,
  matterId,
  ctx = "allow",
  permissionRef,
  auditHintRef
} = {}) {
  const context = VAULT_PERMISSION_CONTEXTS[ctx] ?? VAULT_PERMISSION_CONTEXTS.allow;
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
  const context = CRM_INTAKE_PERMISSION_CONTEXTS[ctx] ?? CRM_INTAKE_PERMISSION_CONTEXTS.allow;
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
    auditEvent: body.audit_event ?? null,
    safeErrorCodes: body.safe_error_codes ?? [],
    auditHintRef: body.audit_hint_ref ?? null,
    idempotentReplay: body.idempotent_replay === true,
    productionReadyClaim: body.production_ready_claim === true
  };
}

async function patchCrmIntakeRuntime({ path, payload, ctx = "allow" } = {}) {
  const context = CRM_INTAKE_PERMISSION_CONTEXTS[ctx] ?? CRM_INTAKE_PERMISSION_CONTEXTS.allow;
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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

export function fetchIntakeRequests(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/requests" });
}

export function fetchIntakeAudit(options = {}) {
  return fetchCrmIntakeCollection({ ...options, path: "/api/intake/audit" });
}

export function handoffCrmOpportunityToIntake({
  opportunityId,
  requestedScopeSummary = "Client intake request",
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
      idempotency_key: `conflict:${conflictId}`,
      conflict_check: {
        conflict_check_id: conflictId,
        tenant_id: CRM_INTAKE_TENANT_ID,
        intake_request_id: intakeRequest?.intake_request_id,
        party_snapshot: { party_ids: partyIds },
        status: "snapshot_recorded",
        owner_user_id: CRM_INTAKE_PRINCIPAL.user_id
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
      actor_id: CRM_INTAKE_PRINCIPAL.user_id,
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
      actor_id: FINANCE_PRINCIPAL.user_id,
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
      actor_id: FINANCE_PRINCIPAL.user_id,
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
      actor_id: FINANCE_PRINCIPAL.user_id,
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
