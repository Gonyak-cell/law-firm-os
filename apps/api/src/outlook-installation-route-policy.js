export const OUTLOOK_INSTALLATION_ROUTE_CLASSES = Object.freeze({
  lifecycleExempt: "lifecycle_exempt",
  providerWebhookExempt: "provider_webhook_exempt",
  desktopLifecycleExempt: "desktop_lifecycle_exempt",
  protectedRead: "protected_read",
  protectedOperation: "protected_operation",
  unknown: "unknown",
  notApplicable: "not_applicable",
});

const C = OUTLOOK_INSTALLATION_ROUTE_CLASSES;

const ROUTES = [
  ["outlook.bootstrap", "GET", "/api/outlook/bootstrap", C.lifecycleExempt],
  ["outlook.connection.read", "GET", "/api/outlook/connection", C.lifecycleExempt],
  ["outlook.readiness", "GET", "/api/outlook/readiness", C.lifecycleExempt],
  ["outlook.connection.authorize", "POST", "/api/outlook/connection/authorize", C.lifecycleExempt],
  ["outlook.connection.complete", "POST", "/api/outlook/connection/complete", C.lifecycleExempt],
  ["outlook.connection.delete", "DELETE", "/api/outlook/connection", C.lifecycleExempt],
  ["outlook.connection.callback", "GET", "/api/outlook/connection/callback", C.lifecycleExempt],
  ["outlook.graph.validation", "GET", "/api/outlook/graph/notifications", C.providerWebhookExempt],
  ["outlook.graph.notifications", "POST", "/api/outlook/graph/notifications", C.providerWebhookExempt],

  ["outlook.inquiries.read", "GET", "/api/outlook/inquiries", C.protectedRead],
  ["outlook.inquiries.create", "POST", "/api/outlook/inquiries", C.protectedOperation],
  ["outlook.inquiries.resolve", "POST", "/api/outlook/inquiries/message/resolve", C.protectedOperation],
  ["outlook.inquiries.evidence.read", "GET", "/api/outlook/inquiries/evidence/:evidence_id/content", C.protectedRead],
  ["outlook.matters.read", "GET", "/api/outlook/matters", C.protectedRead],
  ["outlook.precedents.read", "GET", "/api/outlook/precedents", C.protectedRead],
  ["outlook.precedents.readiness", "GET", "/api/outlook/precedents/readiness", C.protectedRead],
  ["outlook.matters.timeline.read", "GET", "/api/outlook/matters/:matter_id/timeline", C.protectedRead],
  ["outlook.matters.documents.read", "GET", "/api/outlook/matters/:matter_id/documents", C.protectedRead],
  ["outlook.messages.identity", "POST", "/api/outlook/messages/identity", C.protectedOperation],
  ["outlook.operation_receipts.read", "POST", "/api/outlook/operation-receipts/readback", C.protectedRead],
  ["outlook.email.file", "POST", "/api/outlook/email/file", C.protectedOperation],
  ["outlook.email.corrections.create", "POST", "/api/outlook/email/corrections", C.protectedOperation],
  ["outlook.email.corrections.read", "GET", "/api/outlook/email/corrections/current", C.protectedRead],
  ["outlook.sent.file", "POST", "/api/outlook/sent/file", C.protectedOperation],
  ["outlook.attachments.save", "POST", "/api/outlook/attachments/save", C.protectedOperation],
  ["outlook.tasks.create", "POST", "/api/outlook/tasks", C.protectedOperation],
  ["outlook.tasks.update", "PATCH", "/api/outlook/tasks/:task_id", C.protectedOperation],
  ["outlook.followups.create", "POST", "/api/outlook/followups", C.protectedOperation],
  ["outlook.time_entry_drafts.create", "POST", "/api/outlook/time-entry-drafts", C.protectedOperation],
  ["outlook.smart_alerts.evaluate", "POST", "/api/outlook/smart-alerts/evaluate", C.protectedOperation],
  ["outlook.conversation_policies.read", "GET", "/api/outlook/conversation-policies", C.protectedRead],
  ["outlook.conversation_policies.create", "POST", "/api/outlook/conversation-policies", C.protectedOperation],
  ["outlook.conversation_policies.revoke", "POST", "/api/outlook/conversation-policies/:policy_id/revoke", C.protectedOperation],

  ["outlook.documents.read", "GET", "/api/outlook/documents", C.protectedRead],
  ["outlook.documents.approval_request", "POST", "/api/outlook/documents/approval-requests", C.protectedOperation],
  ["outlook.documents.publish", "POST", "/api/outlook/documents/:draft_id/publish", C.protectedOperation],
  ["outlook.esign_requests.read", "GET", "/api/outlook/esign-requests", C.protectedRead],
  ["outlook.esign_requests.create", "POST", "/api/outlook/esign-requests", C.protectedOperation],
  ["outlook.esign_requests.send", "POST", "/api/outlook/esign-requests/:request_id/send", C.protectedOperation],
  ["outlook.esign_requests.reconcile", "POST", "/api/outlook/esign-requests/:request_id/reconcile", C.protectedOperation],

  ["desktop.activation.challenge", "POST", "/api/desktop/activation-challenges", C.desktopLifecycleExempt],
  ["desktop.activation.proof_seed", "POST", "/api/desktop/activation-proof-seeds", C.desktopLifecycleExempt],
  ["desktop.activation.consume", "POST", "/api/desktop/activation-consumptions", C.desktopLifecycleExempt],
  ["desktop.installations.register", "POST", "/api/desktop/installations", C.desktopLifecycleExempt],
  ["desktop.installations.read", "GET", "/api/desktop/installations/:installation_id", C.desktopLifecycleExempt],
  ["desktop.installations.heartbeat", "POST", "/api/desktop/installations/:installation_id/heartbeat", C.desktopLifecycleExempt],
  ["desktop.installations.retire", "POST", "/api/desktop/installations/:installation_id/retire", C.desktopLifecycleExempt],
];

export const OUTLOOK_INSTALLATION_ROUTE_POLICIES = Object.freeze(ROUTES.map(([
  id,
  method,
  template,
  classification,
]) => Object.freeze({ id, method, template, classification })));

function normalizedPathname(value) {
  if (typeof value !== "string" || !value.startsWith("/") || /[?#]/u.test(value)) return null;
  return value.replace(/\/+$/u, "") || "/";
}

function matchesTemplate(pathname, template) {
  const pathSegments = pathname.split("/");
  const templateSegments = template.split("/");
  return pathSegments.length === templateSegments.length
    && templateSegments.every((segment, index) => (
      segment.startsWith(":")
        ? pathSegments[index].length > 0
        : segment === pathSegments[index]
    ));
}

function policyMatches(method, pathname) {
  return OUTLOOK_INSTALLATION_ROUTE_POLICIES.filter((policy) => (
    policy.method === method && matchesTemplate(pathname, policy.template)
  ));
}

function isPolicySurface(pathname) {
  return pathname.startsWith("/api/outlook")
    || pathname === "/api/desktop"
    || pathname.startsWith("/api/desktop/");
}

function unknownDecision(applicable) {
  return Object.freeze({
    known: false,
    match_count: 0,
    classification: applicable ? C.unknown : C.notApplicable,
    requires_active_installation: applicable,
    fail_closed: true,
  });
}

export function classifyOutlookInstallationRoute(method, pathname) {
  const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "";
  const normalizedPath = normalizedPathname(pathname);
  if (!normalizedPath) return unknownDecision(true);
  const applicable = isPolicySurface(normalizedPath);
  if (!applicable) return unknownDecision(false);
  const matches = policyMatches(normalizedMethod, normalizedPath);
  if (matches.length !== 1) return unknownDecision(true);
  const [policy] = matches;
  return Object.freeze({
    known: true,
    match_count: 1,
    policy_id: policy.id,
    method: policy.method,
    template: policy.template,
    classification: policy.classification,
    requires_active_installation: [C.protectedRead, C.protectedOperation]
      .includes(policy.classification),
    fail_closed: true,
  });
}

function samplePath(template) {
  return template.replace(/:[a-z_]+/gu, "policy-sample");
}

export function auditOutlookInstallationRoutePolicies() {
  const duplicateCount = (values) => values.length - new Set(values).size;
  let ambiguousSampleCount = 0;
  let unclassifiedSampleCount = 0;
  for (const policy of OUTLOOK_INSTALLATION_ROUTE_POLICIES) {
    const matches = policyMatches(policy.method, samplePath(policy.template));
    if (matches.length === 0) unclassifiedSampleCount += 1;
    if (matches.length > 1) ambiguousSampleCount += 1;
  }
  return Object.freeze({
    policy_count: OUTLOOK_INSTALLATION_ROUTE_POLICIES.length,
    duplicate_id_count: duplicateCount(OUTLOOK_INSTALLATION_ROUTE_POLICIES.map(({ id }) => id)),
    duplicate_route_count: duplicateCount(OUTLOOK_INSTALLATION_ROUTE_POLICIES.map(({ method, template }) => `${method} ${template}`)),
    ambiguous_sample_count: ambiguousSampleCount,
    unclassified_sample_count: unclassifiedSampleCount,
    fail_closed: true,
  });
}
