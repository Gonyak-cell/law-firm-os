import { evaluateRouteDecision } from "./permission-gate.js";
import { createDmsRepositoryMimeAuthority } from "../../../packages/email-dms/src/email-filing-service.js";
import {
  resolveConversationPolicySeed,
  verifyConversationPolicyAuthority,
} from "./outlook-conversation-current-authority.js";

const BASE = "/api/outlook/conversation-policies";
const FIELDS = Object.freeze([
  "tenant_id", "m365_connection_id", "matter_id", "conversation_id",
  "seed_email_thread_id", "seed_filing_receipt_ref", "expected_version",
  "idempotency_key", "reason",
  "actor_id",
]);
const QUERY_FIELDS = Object.freeze([
  "m365_connection_id",
  "matter_id",
  "conversation_id",
]);
const RUNTIME_READY_FIELDS = Object.freeze([
  "policy_runtime_ready",
  "subscription_reconciler_ready",
  "message_auto_filing_ready",
  "maintenance_worker_ready",
  "worker_schedule_ready",
]);
const SAFE_POLICY_FIELDS = Object.freeze([
  "policy_id",
  "matter_id",
  "conversation_id",
  "status",
  "pause_reason",
  "version",
  "created_at",
  "updated_at",
  "revoked_at",
]);

function response(status, requestId, outcome, extra = {}) {
  return { status, body: { request_id: requestId, outcome, production_ready_claim: false, ...extra } };
}

function runtimeUnavailable(requestId, extra = {}) {
  return response(503, requestId, "blocked", {
    item: null,
    safe_error_codes: ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"],
    ...extra,
  });
}

function blocked(error, requestId) {
  const message = String(error?.message ?? "");
  const authority = !(error instanceof TypeError)
    && /authority|owner|principal|Matter|connection|seed/u.test(message);
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

function exactQuery(query) {
  if (!query || typeof query !== "object" || Array.isArray(query)
    || Object.keys(query).some((field) => !QUERY_FIELDS.includes(field))) throw new TypeError("conversation policy query contains unsupported fields");
  if (QUERY_FIELDS.some((field) => typeof query[field] !== "string" || query[field].trim() === "")) {
    throw new TypeError("conversation policy query requires connection, Matter, and conversation identifiers");
  }
}

function normalizedReason(value, { required = false } = {}) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError("conversation policy reason must be printable text");
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 500) {
    throw new TypeError("conversation policy reason must be 1-500 characters");
  }
  return normalized;
}

function safePolicyProjection(policy) {
  if (!policy) return null;
  return Object.freeze(Object.fromEntries(SAFE_POLICY_FIELDS.map((field) => [
    field,
    field === "pause_reason" || field === "revoked_at" ? policy[field] ?? null
      : field === "version" ? Number(policy[field])
        : policy[field],
  ])));
}

function runtimeReadiness(runtime) {
  const readiness = runtime?.conversationRuntime?.readiness;
  if (!readiness || typeof readiness !== "object") return null;
  if (RUNTIME_READY_FIELDS.some((field) => typeof readiness[field] !== "boolean")
    || typeof readiness.auto_filing_enabled !== "boolean") return null;
  return Object.freeze({
    authoritative: true,
    runtime_ready: RUNTIME_READY_FIELDS.every((field) => readiness[field] === true),
    auto_filing_enabled: readiness.auto_filing_enabled === true,
  });
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

function permissionAllowed(context, input, resourceId = input.seed_email_thread_id ?? input.policy_id) {
  const scopedContext = {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      (entry.resource_id === undefined || entry.resource_id === resourceId)
      && (entry.resource_type === undefined || entry.resource_type === "email_thread")
    )),
  };
  return evaluateRouteDecision({
    context: scopedContext,
    resource: {
      tenant_id: input.tenant_id,
      matter_id: input.matter_id,
      resource_type: "email_thread",
      resource_id: resourceId,
    },
    action: "outlook:email:file",
  }).effect === "allow";
}

function durableMimeAuthority(runtime) {
  if (typeof runtime?.dmsRuntime?.upload_runtime?.getDocumentIntegrityState === "function") {
    return runtime.dmsRuntime.upload_runtime;
  }
  if (!runtime?.dmsRuntime?.repository
    || typeof runtime?.dmsRuntime?.storage?.statObject !== "function"
    || typeof runtime?.dmsRuntime?.storage?.digestObject !== "function") return null;
  return createDmsRepositoryMimeAuthority(runtime.dmsRuntime.repository, {
    provider: runtime.dmsRuntime.storage,
  });
}

async function syncSubscriptions(runtime, input) {
  const result = await runtime.conversationRuntime.subscription_service.reconcile({
    tenant_id: input.tenant_id,
    user_id: input.user_id,
    entra_subject_id: input.entra_subject_id,
    actor_id: "graph-subscription-reconciler",
    m365_connection_id: input.m365_connection_id,
  });
  if (typeof result?.outcome !== "string" || result.outcome.trim() === "") {
    throw new Error("conversation subscription reconciliation returned no authoritative outcome");
  }
  return result.outcome === "retry_scheduled" ? "retry_scheduled" : "synchronized";
}

export function isOutlookConversationPolicyPath(pathname) {
  return pathname === BASE || /^\/api\/outlook\/conversation-policies\/[^/]+\/revoke$/u.test(pathname);
}

export async function handleOutlookConversationPolicyApiRequest({ pathname, method, query = {}, body = {}, context, requestId, runtime } = {}) {
  if (!isOutlookConversationPolicyPath(pathname)) return null;
  try {
    const match = pathname.match(/^\/api\/outlook\/conversation-policies\/([^/]+)\/revoke$/u);
    const policyId = match ? decodeURIComponent(match[1]) : null;
    if (pathname === BASE && method === "GET") {
      exactQuery(query);
      if (Object.keys(body).length !== 0) throw new TypeError("conversation policy GET body is not supported");
      if (!runtime?.emailDmsRuntime?.repository || !runtime?.matterRuntime?.repository) {
        return runtimeUnavailable(requestId, { readiness: null });
      }
      if (!runtime?.conversationRuntime || typeof runtime.conversationRuntime.clock !== "function") {
        return runtimeUnavailable(requestId, { readiness: null });
      }
      const input = principalInput(context, query);
      if (!permissionAllowed(context, input, input.conversation_id)) {
        throw new Error("current Matter permission authority is required");
      }
      const readiness = runtimeReadiness(runtime);
      if (!readiness || typeof runtime?.conversationRuntime?.store?.findConversationPolicy !== "function") {
        return runtimeUnavailable(requestId, { readiness: null });
      }
      const authority = verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input,
        clock: runtime.conversationRuntime.clock,
      });
      if (!authority.allowed) throw new Error(`conversation policy authority denied: ${authority.reason}`);
      const policy = await runtime.conversationRuntime.store.findConversationPolicy(input);
      if (!policy) {
        return response(200, requestId, "passed", {
          item: null,
          readiness,
          safe_error_codes: [],
        });
      }
      return response(200, requestId, "passed", {
        item: safePolicyProjection(policy),
        readiness,
        safe_error_codes: [],
      });
    }
    const enable = pathname === BASE && method === "POST";
    const mutationMethod = enable ? "enable" : match && method === "POST" ? "revoke" : null;
    const mimeAuthority = enable ? durableMimeAuthority(runtime) : null;
    if (method === "POST" && (
      !mutationMethod
      || typeof runtime?.conversationRuntime?.clock !== "function"
      || typeof runtime?.conversationRuntime?.policy_service?.[mutationMethod] !== "function"
      || typeof runtime?.conversationRuntime?.subscription_service?.reconcile !== "function"
      || !runtime?.emailDmsRuntime?.repository
      || !runtime?.matterRuntime?.repository
      || (enable && (!runtime?.dmsRuntime?.repository || !mimeAuthority))
    )) {
      return runtimeUnavailable(requestId);
    }
    exactBody(body);
    let input = principalInput(context, policyId ? { ...body, policy_id: policyId } : body);
    input = {
      ...input,
      reason: normalizedReason(input.reason, { required: Boolean(match && method === "POST") }),
    };
    if (!permissionAllowed(context, input)) throw new Error("current Matter permission authority is required");
    const readiness = runtimeReadiness(runtime);
    if (enable && (!readiness?.runtime_ready || !readiness.auto_filing_enabled)) {
      return response(503, requestId, "blocked", {
        item: null,
        safe_error_codes: ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_NOT_READY"],
      });
    }
    if (enable) {
      const authority = verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input,
        clock: runtime.conversationRuntime.clock,
      });
      if (!authority.allowed) throw new Error(`conversation policy authority denied: ${authority.reason}`);
      const resolvedSeed = await resolveConversationPolicySeed({
        repository: runtime?.dmsRuntime?.repository,
        durable_mime_authority: mimeAuthority,
        tenant_id: input.tenant_id,
        matter_id: input.matter_id,
        conversation_id: input.conversation_id,
        m365_connection_id: input.m365_connection_id,
        seed_email_thread_id: input.seed_email_thread_id,
        seed_filing_receipt_ref: input.seed_filing_receipt_ref,
      });
      if (!resolvedSeed) {
        throw new Error("conversation policy seed filing authority is required");
      }
      input = { ...input, seed_filing_receipt_ref: resolvedSeed.seed_filing_receipt_ref };
      const verification = async () => {
        const current = verifyConversationPolicyAuthority({
          runtimes: runtime,
          principal: context.principal,
          input,
          clock: runtime.conversationRuntime.clock,
        });
        if (!current.allowed) return false;
        return Boolean(await resolveConversationPolicySeed({
          repository: runtime.dmsRuntime.repository,
          durable_mime_authority: mimeAuthority,
          tenant_id: input.tenant_id,
          matter_id: input.matter_id,
          conversation_id: input.conversation_id,
          m365_connection_id: input.m365_connection_id,
          seed_email_thread_id: input.seed_email_thread_id,
          seed_filing_receipt_ref: input.seed_filing_receipt_ref,
        }));
      };
      const result = await runtime.conversationRuntime.policy_service.enable({
        ...input,
        mailbox_ref: authority.connection.mailbox_address_hash,
      }, { authorize: verification });
      let subscription_sync;
      try {
        subscription_sync = await syncSubscriptions(runtime, input);
      } catch {
        return runtimeUnavailable(requestId);
      }
      return response(result.outcome === "created" ? 201 : 200, requestId, result.outcome, { item: safePolicyProjection(result.policy), subscription_sync, safe_error_codes: [] });
    }
    if (match && method === "POST") {
      const authorized = () => verifyConversationPolicyAuthority({
        runtimes: runtime,
        principal: context.principal,
        input: { ...input, policy_id: policyId },
        clock: runtime.conversationRuntime.clock,
      }).allowed;
      const result = await runtime.conversationRuntime.policy_service.revoke({ ...input, policy_id: policyId }, { authorize: authorized });
      let subscription_sync;
      try {
        subscription_sync = await syncSubscriptions(runtime, input);
      } catch {
        return runtimeUnavailable(requestId);
      }
      return response(200, requestId, result.outcome, { item: safePolicyProjection(result.policy), subscription_sync, safe_error_codes: [] });
    }
    return response(405, requestId, "blocked", { item: null, safe_error_codes: ["OUTLOOK_CONVERSATION_POLICY_METHOD_NOT_ALLOWED"] });
  } catch (error) {
    return blocked(error, requestId);
  }
}
