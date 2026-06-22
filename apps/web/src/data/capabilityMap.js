export const backendCapabilities = Object.freeze([
  {
    id: "api-health",
    label: "Runtime health",
    route: "home",
    owner: "platform",
    readEndpoints: ["GET /api/health"],
    actionEndpoints: [],
    auditEndpoints: [],
    boundary: "service descriptor only; no permission context required"
  },
  {
    id: "clients-master-data",
    label: "Clients and master data",
    route: "clients",
    owner: "master-data",
    readEndpoints: [
      "GET /master-data/records",
      "GET /master-data/relationships",
      "GET /master-data/client-groups/:id"
    ],
    actionEndpoints: [],
    auditEndpoints: [],
    boundary: "live mode must be explicit and fail closed without mock fallback"
  },
  {
    id: "matter-core",
    label: "Matter core",
    route: "matters",
    owner: "matter",
    readEndpoints: [
      "GET /api/matters",
      "GET /api/matters/:matter_id",
      "GET /api/matters/:matter_id/command-center",
      "GET /api/matters/:matter_id/vault-summary",
      "GET /api/matters/:matter_id/timeline"
    ],
    actionEndpoints: [
      "POST /api/matters",
      "POST /api/matters/openings",
      "POST /api/matters/:matter_id/documents",
      "POST /api/matters/:matter_id/team-members"
    ],
    auditEndpoints: ["GET /api/matters/audit"],
    boundary: "production_ready_claim remains false until external receipts exist"
  },
  {
    id: "vault-dms",
    label: "Vault and DMS",
    route: "vault",
    owner: "vault",
    readEndpoints: [
      "GET /api/vault/documents",
      "GET /api/vault/search",
      "GET /api/vault/file-objects/:file_object_id/download"
    ],
    actionEndpoints: [
      "POST /api/vault/workspaces",
      "POST /api/vault/folders",
      "POST /api/vault/documents",
      "POST /api/vault/documents/upload",
      "POST /api/vault/documents/:document_id/versions",
      "POST /api/vault/documents/:document_id/checkout-locks",
      "POST /api/vault/documents/:document_id/privilege-label",
      "POST /api/vault/documents/:document_id/legal-hold",
      "POST /api/vault/search"
    ],
    auditEndpoints: ["GET /api/vault/audit"],
    boundary: "document bytes stay out of renderer-owned state"
  },
  {
    id: "crm-intake",
    label: "CRM and intake",
    route: "intake",
    owner: "crm-intake",
    readEndpoints: ["GET /api/crm/leads", "GET /api/crm/opportunities", "GET /api/intake/requests"],
    actionEndpoints: [
      "POST /api/crm/leads",
      "POST /api/crm/opportunities",
      "POST /api/crm/opportunities/:id/handoff",
      "POST /api/intake/requests",
      "POST /api/intake/conflict-checks",
      "POST /api/intake/clearance-tokens"
    ],
    auditEndpoints: ["GET /api/intake/audit"],
    boundary: "conflict and clearance state must be server-owned"
  },
  {
    id: "finance",
    label: "Finance, billing, trust, WIP",
    route: "finance",
    owner: "finance",
    readEndpoints: ["GET /api/finance/time-entries", "GET /api/finance/invoices", "GET /api/finance/ar-aging"],
    actionEndpoints: ["POST /api/finance/time-entries", "POST /api/finance/wip", "POST /api/finance/payments"],
    auditEndpoints: ["GET /api/finance/audit"],
    boundary: "bank credentials and production payment authority are never displayed"
  },
  {
    id: "analytics",
    label: "Analytics and profitability",
    route: "analytics",
    owner: "analytics",
    readEndpoints: ["GET /api/analytics/dashboards", "GET /api/analytics/matter-profitability"],
    actionEndpoints: [
      "POST /api/analytics/refresh",
      "POST /api/analytics/matter-profitability",
      "POST /api/analytics/exports"
    ],
    auditEndpoints: ["GET /api/analytics/audit"],
    boundary: "raw matter detail stays omitted from read models"
  },
  {
    id: "ai-governance",
    label: "AI review and governance",
    route: "ask",
    owner: "ai",
    readEndpoints: ["GET /api/ai/review-queue"],
    actionEndpoints: [
      "POST /api/ai/policies",
      "POST /api/ai/retrieval",
      "POST /api/ai/outputs",
      "POST /api/ai/exports"
    ],
    auditEndpoints: ["GET /api/ai/audit"],
    boundary: "AI output never bypasses permission-before-AI or human review"
  },
  {
    id: "portal-data-room",
    label: "Portal and data room",
    route: "portal",
    owner: "portal",
    readEndpoints: [
      "GET /api/portal/projections",
      "GET /api/portal/rfi",
      "GET /api/portal/dashboard",
      "GET /api/data-room/rooms",
      "GET /api/data-room/projections"
    ],
    actionEndpoints: [
      "POST /api/portal/external-users",
      "POST /api/portal/external-acls",
      "POST /api/portal/rfi",
      "POST /api/portal/rfi-responses",
      "POST /api/portal/approvals",
      "POST /api/portal/secure-links",
      "POST /api/portal/dashboard",
      "POST /api/portal/projections",
      "POST /api/data-room/rooms",
      "POST /api/data-room/projections"
    ],
    auditEndpoints: ["GET /api/portal/audit"],
    boundary: "external ACL and secure-link material are never client-side secrets"
  },
  {
    id: "people-hrx",
    label: "People and HRX",
    route: "people",
    owner: "hrx",
    readEndpoints: [
      "GET /api/hrx/employees",
      "GET /api/hrx/employees/:id",
      "GET /api/hrx/employee-user-links",
      "GET /api/hrx/documents",
      "GET /api/hrx/leave",
      "GET /api/hrx/approvals",
      "GET /api/hrx/candidate/portal",
      "GET /api/hrx/recruiting/pipeline",
      "GET /api/hrx/lifecycle/onboarding",
      "GET /api/hrx/lifecycle/offboarding",
      "GET /api/hrx/policies",
      "GET /api/hrx/audit",
      "GET /api/hrx/analytics",
      "GET /api/hrx/ai/reviews"
    ],
    actionEndpoints: [
      "POST /api/hrx/employee-user-links",
      "POST /api/hrx/employee-user-links/:id/revoke",
      "POST /api/hrx/leave",
      "POST /api/hrx/approvals/:id/:action",
      "POST /api/hrx/recruiting/applications/:id/stage",
      "POST /api/hrx/lifecycle/onboarding/:id/tasks/:task_id",
      "POST /api/hrx/lifecycle/offboarding/:id/close",
      "POST /api/hrx/policies",
      "POST /api/hrx/ai/assistant"
    ],
    auditEndpoints: ["GET /api/hrx/audit"],
    boundary: "sensitive HR fields remain masked unless server scope allows them"
  },
  {
    id: "ui-readiness",
    label: "UI readiness",
    route: "readiness",
    owner: "ui-readiness",
    readEndpoints: ["GET /api/ui/readiness", "GET /api/ui/audit"],
    actionEndpoints: [
      "POST /api/ui/checks",
      "POST /api/ui/critical-path-runs",
      "POST /api/ui/adjudications"
    ],
    auditEndpoints: ["GET /api/ui/audit"],
    boundary: "UI evidence is not owner approval"
  },
  {
    id: "enterprise-ops",
    label: "Enterprise readiness",
    route: "ops",
    owner: "enterprise",
    readEndpoints: ["GET /api/enterprise/readiness", "GET /api/enterprise/audit"],
    actionEndpoints: [
      "POST /api/enterprise/items",
      "POST /api/enterprise/release-candidates",
      "POST /api/enterprise/go-no-go"
    ],
    auditEndpoints: ["GET /api/enterprise/audit"],
    boundary: "go_live_approved and public release remain false without receipts"
  }
]);

export const capabilitySummary = Object.freeze({
  domains: backendCapabilities.length,
  readEndpoints: backendCapabilities.reduce((sum, item) => sum + item.readEndpoints.length, 0),
  actionEndpoints: backendCapabilities.reduce((sum, item) => sum + item.actionEndpoints.length, 0),
  auditEndpoints: backendCapabilities.reduce((sum, item) => sum + item.auditEndpoints.length, 0),
  productionGoLive: false,
  publicRelease: false,
  ownerApproval: false
});
