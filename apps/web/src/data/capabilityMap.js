export const backendCapabilities = Object.freeze([
  {
    id: "client",
    label: "고객",
    route: "clients",
    owner: "client",
    readEndpoints: [
      "GET /master-data/records",
      "GET /master-data/relationships",
      "GET /master-data/client-groups/:id",
      "GET /api/crm/leads",
      "GET /api/crm/opportunities",
      "GET /api/intake/requests",
      "GET /api/portal/projections",
      "GET /api/portal/rfi",
      "GET /api/portal/dashboard"
    ],
    actionEndpoints: [
      "POST /api/crm/leads",
      "POST /api/crm/opportunities",
      "POST /api/crm/opportunities/:id/handoff",
      "POST /api/intake/requests",
      "POST /api/intake/conflict-checks",
      "POST /api/intake/clearance-tokens",
      "POST /api/portal/external-users",
      "POST /api/portal/external-acls",
      "POST /api/portal/rfi",
      "POST /api/portal/rfi-responses",
      "POST /api/portal/approvals",
      "POST /api/portal/secure-links",
      "POST /api/portal/dashboard",
      "POST /api/portal/projections"
    ],
    auditEndpoints: ["GET /api/intake/audit", "GET /api/portal/audit"],
    boundary: "고객 정보와 연결된 Matter를 권한 범위 안에서 확인합니다."
  },
  {
    id: "matter",
    label: "Matter",
    route: "matters",
    owner: "matter",
    readEndpoints: [
      "GET /api/matters",
      "GET /api/matters/:matter_id",
      "GET /api/matters/:matter_id/command-center",
      "GET /api/matters/:matter_id/vault-summary",
      "GET /api/matters/:matter_id/timeline",
      "GET /api/finance/time-entries",
      "GET /api/finance/invoices",
      "GET /api/finance/ar-aging",
      "GET /api/analytics/dashboards",
      "GET /api/analytics/matter-profitability",
      "GET /api/ai/review-queue"
    ],
    actionEndpoints: [
      "POST /api/matters",
      "POST /api/matters/openings",
      "POST /api/matters/:matter_id/documents",
      "POST /api/matters/:matter_id/team-members",
      "POST /api/finance/time-entries",
      "POST /api/finance/wip",
      "POST /api/finance/payments",
      "POST /api/analytics/refresh",
      "POST /api/analytics/matter-profitability",
      "POST /api/analytics/exports",
      "POST /api/ai/policies",
      "POST /api/ai/retrieval",
      "POST /api/ai/outputs",
      "POST /api/ai/exports"
    ],
    auditEndpoints: ["GET /api/matters/audit", "GET /api/finance/audit", "GET /api/analytics/audit", "GET /api/ai/audit"],
    boundary: "Matter 진행 상황, 팀, 문서, 청구 흐름을 확인합니다."
  },
  {
    id: "people",
    label: "구성원",
    route: "people",
    owner: "people",
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
    boundary: "구성원, 근태관리, 전자결재를 한곳에서 확인합니다."
  },
  {
    id: "vault",
    label: "Vault",
    route: "vault",
    owner: "vault",
    readEndpoints: [
      "GET /api/vault/documents",
      "GET /api/vault/search",
      "GET /api/vault/file-objects/:file_object_id/download",
      "GET /api/data-room/rooms",
      "GET /api/data-room/projections"
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
      "POST /api/vault/search",
      "POST /api/data-room/rooms",
      "POST /api/data-room/projections"
    ],
    auditEndpoints: ["GET /api/vault/audit"],
    boundary: "Vault 문서와 권한 상태를 확인합니다. 권한이 없는 본문은 숨깁니다."
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
