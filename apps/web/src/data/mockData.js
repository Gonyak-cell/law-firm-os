export const matters = [
  {
    id: "MAT-248",
    name: "Project Atlas LDD",
    client: "Hanbit Holdings",
    owner: "Kim Seoyun",
    phase: "Due diligence",
    status: "redline_v12",
    risk: "High",
    docs: 184,
    value: "KRW 1.8B",
    lastSeen: "Today"
  },
  {
    id: "MAT-231",
    name: "Nexus SPA Markup",
    client: "BluePeak Ventures",
    owner: "Lee Dohyun",
    phase: "Client review",
    status: "partner_review",
    risk: "Medium",
    docs: 39,
    value: "USD 420K",
    lastSeen: "Today"
  },
  {
    id: "MAT-219",
    name: "Riverstone Injunction",
    client: "Riverstone Korea",
    owner: "Park Minjae",
    phase: "Hearing prep",
    status: "filing_ready",
    risk: "High",
    docs: 92,
    value: "CAD 210K",
    lastSeen: "Yesterday"
  },
  {
    id: "MAT-205",
    name: "Orion Advisory Retainer",
    client: "Orion Bio",
    owner: "Choi Yujin",
    phase: "Active",
    status: "monthly_advice",
    risk: "Low",
    docs: 21,
    value: "SGD 88K",
    lastSeen: "Jun 8"
  }
];

export const events = [
  {
    time: "8:12:50 AM",
    name: "[Matter] Element Changed",
    module: "Matter",
    path: "/matters/MAT-248/diligence",
    properties: { document_status: "redline_v12", trust_balance: "KRW 1.8B", permission_scope: "deal_team" }
  },
  {
    time: "8:12:50 AM",
    name: "[ERP] Invoice Approved",
    module: "Billing",
    path: "/billing/proforma/BILL-072",
    properties: { wip_hours: "42.8h", partner: "Kim Seoyun", approval_status: "approved" }
  },
  {
    time: "8:12:49 AM",
    name: "[CRM] Client Viewed",
    module: "Client",
    path: "/clients/hanbit-holdings",
    properties: { lead_stage: "conflict_check", client_tier: "enterprise", country: "KR" }
  },
  {
    time: "8:12:47 AM",
    name: "[DMS] Document Changed",
    module: "DMS",
    path: "/documents/SPAv12",
    properties: { version: "v12", lock_state: "attorney_review", pages: "186" }
  },
  {
    time: "8:12:45 AM",
    name: "[Audit] Permission Evaluated",
    module: "Audit",
    path: "/audit/permission-kernel",
    properties: { deny_precedence: "true", actor: "associate", result: "allow" }
  }
];

export const contentRows = [
  { name: "Project Atlas diligence dashboard", type: "Dashboard", editor: "KS", modified: "1 hour ago", views: 18, status: "Pinned" },
  { name: "MAT-248 Event Segmentation", type: "Analysis", editor: "KS", modified: "2 hours ago", views: 12, status: "Shared" },
  { name: "Conflict check funnel", type: "Funnel", editor: "LD", modified: "3 hours ago", views: 7, status: "Private" },
  { name: "Partner review cohort", type: "Cohort", editor: "PM", modified: "Yesterday", views: 4, status: "Pinned" },
  { name: "DMS version activity", type: "Chart", editor: "CY", modified: "2 days ago", views: 10, status: "Draft" }
];

export const experiments = [
  { key: "FLAG-014", name: "Attorney review escalation", state: "Running", traffic: "41%", owner: "Seoyun Kim" },
  { key: "EXP-009", name: "Matter dashboard onboarding", state: "Draft", traffic: "0%", owner: "Dohyun Lee" },
  { key: "FLAG-006", name: "Billing approval guardrail", state: "Live", traffic: "100%", owner: "Minjae Park" }
];

export const adminRows = [
  { name: "Seoyun Kim", role: "Admin", team: "Corporate", status: "Active" },
  { name: "Dohyun Lee", role: "Manager", team: "Litigation", status: "Active" },
  { name: "Minjae Park", role: "Member", team: "DMS", status: "Invited" }
];

export const profileRows = [
  { user: "Alex Smith", id: "a87bd9", firstSeen: "Jun 3", location: "Seoul", country: "KR", sessions: "118" },
  { user: "Jamie Chen", id: "b27c10", firstSeen: "Jun 4", location: "Singapore", country: "SG", sessions: "84" },
  { user: "Morgan Lee", id: "c58f31", firstSeen: "Jun 5", location: "Toronto", country: "CA", sessions: "67" },
  { user: "Priya Shah", id: "d91a42", firstSeen: "Jun 6", location: "New York", country: "US", sessions: "51" },
  { user: "Taylor Kim", id: "e14c76", firstSeen: "Jun 7", location: "London", country: "GB", sessions: "39" }
];

export const prompts = [
  "Which matters changed risk tier this week?",
  "Show documents waiting for partner review.",
  "Summarize trust-account exceptions by client.",
  "Find audit events denied by permission kernel."
];
