export const CMP_G11_TUW_IDS = Object.freeze(
  Array.from({ length: 48 }, (_, index) => `CMP-G11-W11-T${String(index + 1).padStart(3, "0")}`),
);

export const CMP_CONSOLE_UI_STATES = Object.freeze([
  "loading",
  "empty",
  "denied",
  "review-required",
  "error",
]);

export const CMP_CONSOLE_BACKEND_EVIDENCE = Object.freeze([
  "CMP-G1-W01",
  "CMP-G2-W02",
  "CMP-G3-W03",
  "CMP-G4-W04",
  "CMP-G5-W05",
  "CMP-G6-W06",
  "CMP-G7-W07",
  "CMP-G8-W08",
  "CMP-G9-W09",
  "CMP-G10-W10",
]);

export const CMP_CONSOLE_API_CONTEXT = Object.freeze({
  tenant_id: "tenant-a",
  actor_id: "cmp-g11-console-actor",
  permission_receipt_id: "permission-cmp-g11-ui",
  audit_event_type: "cmp.ui.console.viewed",
  idempotency_key: "cmp-g11-ui-idempotency",
});

export const CMP_CONSOLE_RUNTIME_READINESS =
  "runtime_ui_evidence_only__backend_runtime_required__durable_persistence_open";

const CMP_CONSOLE_ROWS = [
  ["CMP-G11-W11-T001", "IA", "Navigation", "Information architecture navigation", "", "NavItem", "Shell/Rail/Sidebar"],
  ["CMP-G11-W11-T002", "IA", "Router", "Client-Matter-People app router", "", "RouteConfig", "App.jsx"],
  ["CMP-G11-W11-T003", "Home", "Triangle", "Client-Matter-People triangle overview", "", "ClientMatterPeopleOverview", "Home / Command Center"],
  ["CMP-G11-W11-T004", "Home", "Command center", "Command Center home screen", "/home", "CommandCenterView", "Home / Command Center"],
  ["CMP-G11-W11-T005", "Clients", "List", "Clients and Parties list screen", "/clients", "ClientListView", "Clients and Parties"],
  ["CMP-G11-W11-T006", "Clients", "Dashboard", "Client dashboard screen", "/clients/:id", "ClientDashboardView", "Client dashboard"],
  ["CMP-G11-W11-T007", "Parties", "Profile", "Party profile screen", "/parties/:id", "PartyProfileView", "Party profile"],
  ["CMP-G11-W11-T008", "Parties", "Graph", "Relationship graph screen", "/relationships/graph", "RelationshipGraphView", "Relationship graph"],
  ["CMP-G11-W11-T009", "CRM", "Pipeline", "Opportunity pipeline screen", "/crm/opportunities", "OpportunityPipelineView", "Opportunity pipeline"],
  ["CMP-G11-W11-T010", "Intake", "Workspace", "Intake and conflict workspace screen", "/intake", "IntakeWorkspaceView", "Intake/conflict workspace"],
  ["CMP-G11-W11-T011", "Matters", "Matter home", "Matter home screen", "/matters/:id", "MatterCommandCenterView", "Matter home"],
  ["CMP-G11-W11-T012", "Matters", "Opening wizard", "Matter opening wizard", "/matters/open", "MatterOpeningWizardView", "Matter opening wizard"],
  ["CMP-G11-W11-T013", "Matters", "Staffing", "Matter team and staffing panel", "/matters/:id/team", "MatterTeamCapacityView", "Matter team/staffing panel"],
  ["CMP-G11-W11-T014", "Matters", "Task board", "Task and deadline board", "/matters/:id/tasks", "MatterTaskBoardView", "Task/deadline board"],
  ["CMP-G11-W11-T015", "Matters", "Timeline", "Matter timeline", "/matters/:id/timeline", "MatterTimelineView", "Matter timeline"],
  ["CMP-G11-W11-T016", "People", "Directory", "People directory screen", "/people", "PeopleDirectoryView", "People directory"],
  ["CMP-G11-W11-T017", "People", "Profile", "Employee profile screen", "/people/:id", "EmployeeProfileView", "Employee profile"],
  ["CMP-G11-W11-T018", "People", "Capacity calendar", "Workload and capacity calendar screen", "/people/capacity", "CapacityCalendarView", "Workload/capacity calendar"],
  ["CMP-G11-W11-T019", "People", "Leave/attendance", "Leave and attendance panel", "/people/:id/attendance", "LeaveAttendanceView", "Leave/attendance panel"],
  ["CMP-G11-W11-T020", "People", "Lifecycle checklist", "Onboarding and offboarding checklist UI", "/people/onboarding", "OnboardingOffboardingView", "Onboarding/offboarding checklist"],
  ["CMP-G11-W11-T021", "Vault/HR", "HR document vault", "HR document vault screen", "/vault/hr-documents", "HRDocumentVaultView", "HR document vault"],
  ["CMP-G11-W11-T022", "Vault", "Matter workspace", "Matter vault workspace", "/vault/matters/:id", "MatterVaultWorkspaceView", "Matter vault workspace"],
  ["CMP-G11-W11-T023", "Vault", "Document detail", "Document detail screen", "/vault/documents/:id", "DocumentDetailView", "Document detail"],
  ["CMP-G11-W11-T024", "Vault", "Versions", "Version history screen", "/vault/documents/:id/versions", "VersionHistoryView", "Version history"],
  ["CMP-G11-W11-T025", "Vault/Email", "Email filing", "Email filing view", "/vault/email-filing", "EmailFilingView", "Email filing view"],
  ["CMP-G11-W11-T026", "Vault/SecureLink", "Secure links", "Secure link manager", "/vault/secure-links", "SecureLinkManagerView", "Secure link manager"],
  ["CMP-G11-W11-T027", "Portal/DataRoom", "Projection", "Data room projection screen", "/data-rooms/:id", "DataRoomProjectionView", "Data room projection"],
  ["CMP-G11-W11-T028", "Vault/AI", "Evidence viewer", "Vault search and RAG evidence viewer", "/vault/search", "VaultSearchEvidenceView", "Vault search/RAG evidence viewer"],
  ["CMP-G11-W11-T029", "Finance", "Time entry", "Time entry workspace", "/billing/time", "TimeEntryWorkspaceView", "Time entry workspace"],
  ["CMP-G11-W11-T030", "Finance", "WIP", "WIP dashboard", "/billing/wip", "WIPDashboardView", "WIP dashboard"],
  ["CMP-G11-W11-T031", "Finance", "PreBill", "PreBill review screen", "/billing/prebills", "PreBillReviewView", "PreBill review"],
  ["CMP-G11-W11-T032", "Finance", "Invoice", "Invoice detail screen", "/billing/invoices/:id", "InvoiceDetailView", "Invoice detail"],
  ["CMP-G11-W11-T033", "Finance", "Payment/AR", "Payment and AR dashboard", "/finance/ar", "PaymentARDashboardView", "Payment/AR dashboard"],
  ["CMP-G11-W11-T034", "Analytics", "Matter profitability", "Matter profitability screen", "/analytics/matter-profitability", "MatterProfitabilityView", "Matter profitability"],
  ["CMP-G11-W11-T035", "Analytics", "Utilization", "Employee utilization and cost contribution screen", "/analytics/employee-utilization", "EmployeeUtilizationView", "Employee utilization/cost contribution"],
  ["CMP-G11-W11-T036", "AI", "Review queue", "AI review queue screen", "/ai/review", "AIReviewQueueView", "AI review queue"],
  ["CMP-G11-W11-T037", "Admin/Audit", "Audit timeline", "Audit event timeline screen", "/admin/audit", "AuditTimelineView", "Audit event timeline"],
  ["CMP-G11-W11-T038", "Admin/People", "Link manager", "User to Employee link manager", "/admin/user-employee-links", "UserEmployeeLinkManagerView", "User to Employee link manager"],
  ["CMP-G11-W11-T039", "Admin/Vault", "Connector settings", "Vault connector settings screen", "/admin/vault-connectors", "VaultConnectorStatusView", "Vault connector settings"],
  ["CMP-G11-W11-T040", "Admin/Security", "Policy editor", "Role and permission policy editor", "/admin/policies", "PermissionPolicyEditorView", "Role/permission policy editor"],
  ["CMP-G11-W11-T041", "Admin/Security", "Wall/Hold console", "Ethical wall and legal hold console", "/admin/holds-walls", "HoldWallConsoleView", "Ethical wall/legal hold console"],
  ["CMP-G11-W11-T042", "Common states", "Denied state", "PermissionDeniedState reusable component", "", "PermissionDeniedState", "All screens"],
  ["CMP-G11-W11-T043", "Common states", "Review state", "ReviewRequiredState reusable component", "", "ReviewRequiredState", "All screens"],
  ["CMP-G11-W11-T044", "Badges", "Security badges", "LegalHold, Privilege, and HRSensitive badges", "", "VaultSecurityBadges", "All Vault/AI screens"],
  ["CMP-G11-W11-T045", "API client", "Domain clients", "apiClient domain clients", "", "ApiClient", "All screens"],
  ["CMP-G11-W11-T046", "i18n", "Glossary", "i18n glossary alignment", "", "CopyCatalog", "All screens"],
  ["CMP-G11-W11-T047", "A11y", "Keyboard", "Responsive and keyboard navigation spec", "", "A11ySpec", "All screens"],
  ["CMP-G11-W11-T048", "E2E", "Playwright", "Playwright primary workflow scenarios", "", "PlaywrightScenarios", "All critical flows"],
];

export const cmpConsoleCatalog = Object.freeze(
  CMP_CONSOLE_ROWS.map(([tuw_id, capability, feature, title, route, model, surface]) =>
    Object.freeze({
      tuw_id,
      capability,
      feature,
      title,
      route,
      model,
      surface,
      ui_states: CMP_CONSOLE_UI_STATES,
      backend_evidence_required: CMP_CONSOLE_BACKEND_EVIDENCE,
      runtime_readiness: CMP_CONSOLE_RUNTIME_READINESS,
    }),
  ),
);

export const cmpConsoleRoutes = Object.freeze(cmpConsoleCatalog.filter((entry) => entry.route));

export const cmpConsoleGroups = Object.freeze(
  cmpConsoleCatalog.reduce((groups, entry) => {
    const current = groups.get(entry.capability) ?? [];
    current.push(entry);
    groups.set(entry.capability, current);
    return groups;
  }, new Map()),
);
