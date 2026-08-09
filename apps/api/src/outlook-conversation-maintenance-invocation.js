import { randomUUID } from "node:crypto";

export const LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION =
  "lawos_outlook_conversation_worker";

export async function runOutlookConversationMaintenanceInvocation({
  runtime,
  tenant_id,
  limit = 10,
} = {}) {
  const tenantId = String(tenant_id ?? "").trim();
  if (!tenantId) throw new Error("LAWOS_IDENTITY_TENANT_ID is required for the Outlook conversation worker");
  const worker = runtime?.outlookConversationRuntime?.maintenance_worker;
  if (typeof worker?.runOnce !== "function") {
    throw new Error("Outlook conversation maintenance runtime is unavailable");
  }
  const result = await worker.runOnce({
    tenant_id: tenantId,
    worker_id: `outlook-conversation-maintenance:${randomUUID()}`,
    limit,
  });
  return Object.freeze({
    outcome: "PASS",
    worker: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
    ...result,
    provider_payload_included: false,
    credential_material_included: false,
  });
}

export async function handleOutlookConversationMaintenanceEvent(
  event = {},
  { runtime_factory, env = process.env } = {},
) {
  const action = event.lawos_maintenance_action ?? event.maintenance_action;
  if (action !== LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION) return null;
  if (event.rawPath || event.path || event.httpMethod || event.requestContext?.http) {
    return Object.freeze({
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, reason: "maintenance_action_requires_direct_invoke", public_http_endpoint: false }),
      isBase64Encoded: false,
    });
  }
  if (typeof runtime_factory !== "function") throw new TypeError("runtime_factory is required");
  return runOutlookConversationMaintenanceInvocation({
    runtime: await runtime_factory(),
    tenant_id: env.LAWOS_IDENTITY_TENANT_ID,
    limit: 1,
  });
}
