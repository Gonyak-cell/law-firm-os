// Live data client for the P5 user-profiles-list surface (opt-in via ?data=live).
//
// Requests go to the RELATIVE path /master-data/records so the Vite dev-server
// proxy (apps/web/vite.config.js) forwards them to the apps/api server on
// 127.0.0.1:4180. The API has no CORS/OPTIONS handling, so the browser must
// never call it cross-origin (the permission-context header would trigger a
// preflight). Synthetic tenant only — no real client data.

const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const TENANT_ID = "tenant_rp04_synthetic";
const PERMISSION_REF = "ui_p5_user_profiles_live";
const AUDIT_HINT_REF = "ui_p5_live_probe";

const PRINCIPAL = {
  user_id: "user_rp04_owner",
  tenant_id: TENANT_ID,
  role_ids: ["master_data_reader"]
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

export async function fetchMasterDataRecords({ ctx = "allow" } = {}) {
  const context = PERMISSION_CONTEXTS[ctx] ?? PERMISSION_CONTEXTS.allow;
  const params = new URLSearchParams({
    tenant_id: TENANT_ID,
    permission_ref: PERMISSION_REF,
    audit_hint_ref: AUDIT_HINT_REF,
    limit: "25"
  });

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
    uiState: body.ui_state,
    outcome: body.outcome,
    items: body.items,
    pageInfo: body.page_info
  };
}
