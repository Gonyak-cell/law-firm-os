import { evaluateRouteDecision } from "./permission-gate.js";
import { verifyConversationPolicyAuthority } from "./outlook-conversation-current-authority.js";

const BASE = "/api/outlook/conversation-policies";
const FIELDS = Object.freeze([
  "tenant_id", "m365_connection_id", "matter_id", "conversation_id",
  "seed_email_thread_id", "seed_filing_receipt_ref", "expected_version",
  "idempotency_key", "reason",
  "actor_id",
]);

function response(status, requestId, outcome, extra = {}) {
  return { status, body: { request_id: requestId, outcome, production_ready_claim: false, ...extra } };
}

function blocked(error, requestId) {
  const message = String(error?.message ?? "");
  const authority = /authority|owner|principal|Matter|connection|seed/u.test(message);
  const conflict = /version|conflict|immutable/u.test(message);
  return response(authority ? 403 : conflict ? 409 : 400, requestId, "blocked", {
    item: null,
    safe_error_codes: [authority ? "OUTLOOK_CONVERSATION_POLICY_AUTHORITY_DENIED"
      : conflict ? "OUTLOOK_CONVERSATION_POLICY_CONFLICT" : "OUTLOOK_CONVERSATION_POLICY_INVALID"],
  });
}

function exactBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some((field) => !FIELDS.includes(field))) throw new TypeError("conversation policy request contains unsupported fields");
}

function principalInput(context, body) {
  const principal = context?.principal;
  if (!principal?.tenant_id || !principal.user_id || !principal.entra_subject_id) throw new Error("signed Microsoft principal authority is required");
  if (body.tenant_id !== undefined && body.tenant_id !== principal.tenant_id) throw new Error("conversation policy tenant authority does not match");
  return {
    ...body,
    tenant_id: principal.tenant_id,
    user_id: principal.user_id,
    entra_subject_id: principal.entra_subject_id,
    actor_id: principal.user_id,
  };
}

function permissionAllowed(context, input) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: input.tenant_id,
      matter_id: input.matter_id,
      resource_type: "email_thread",
      resource_id: input.seed_email_thread_id ?? input.policy_id,
    },
    action: "outlook:email:file",
  }).effect === "allow";
}

async function syncSubscriptions(runtime, input) {
  try {
    const result = await runtime.conversationRuntime.subscription_service.reconcile({
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      entra_subject_id: input.entra_subject_id,
      actor_id: "graph-subscription-reconciler",
      m365_connection_id: input.m365_connection_id,
    });
    return result.outcome === "retry_scheduled" ? "retry_scheduled" : "synchronized";
  } catch {
    return "retry_scheduled";
  }
}

export function isOutlookConversationPolicyPath(pathname) {
  return pathname === BASE || /^\/api\/outlook\/conversation-policies\/[^/]+\/revoke$/u.test(pathname);
}

export async function handleOutlookConversationPolicyApiRequest({ pathname, method, body = {}, context, requestId, runtime } = {}) {
  if (!isOutlookConversationPolicyPath(pathname)) return null;
  if (!runtime?.conversationRuntime?.policy_service || !runtime?.conversationRuntime?.subscription_service) {
    return response(503, requestId, "blocked", { item: null, safe_error_codes: ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"] });
  }
  try {
    exactBody(body);
    const match = pathname.match(/^\/api\/outlook\/conversation-policies\/([^/]+)\/revoke$/u);
    const policyId = match ? decodeURIComponent(match[1]) : null;
    const input = principalInput(context, policyId ? { ...body, policy_id: policyId } : body);
    if (!permissionAllowed(context, input)) throw new Error("current Matter permission authority is required");
    if (pathname === BASE && method === "POST") {
      const verification = () => verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input,
        require_seed: true,
        clock: runtime.conversationRuntime.clock,
      }).allowed;
      const authority = verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input,
        require_seed: true,
        clock: runtime.conversationRuntime.clock,
      });
      if (!authority.allowed) throw new Error(`conversation policy authority denied: ${authority.reason}`);
      const result = await runtime.conversationRuntime.policy_service.enable({
        ...input,
        mailbox_ref: authority.connection.mailbox_address_hash,
      }, { authorize: verification });
      const subscription_sync = await syncSubscriptions(runtime, input);
      return response(result.outcome === "created" ? 201 : 200, requestId, result.outcome, { item: result.policy, subscription_sync });
    }
    if (match && method === "POST") {
      const authorized = () => verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input: { ...input, policy_id: policyId },
        clock: runtime.conversationRuntime.clock,
      }).allowed;
      const result = await runtime.conversationRuntime.policy_service.revoke({ ...input, policy_id: policyId }, { authorize: authorized });
      const subscription_sync = await syncSubscriptions(runtime, input);
      return response(200, requestId, result.outcome, { item: result.policy, subscription_sync });
    }
    return response(405, requestId, "blocked", { item: null, safe_error_codes: ["OUTLOOK_CONVERSATION_POLICY_METHOD_NOT_ALLOWED"] });
  } catch (error) {
    return blocked(error, requestId);
  }
}
