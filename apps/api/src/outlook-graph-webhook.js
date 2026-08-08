import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_NOTIFICATIONS = 100;
export const OUTLOOK_GRAPH_WEBHOOK_PATH = "/api/outlook/graph/notifications";

function response(status, code) {
  return { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: { outcome: status === 202 ? "accepted" : "blocked", safe_error_code: code } };
}

function configuredNotificationUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("notification_url must be the public HTTPS Graph webhook URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || url.pathname.replace(/\/+$/u, "") !== OUTLOOK_GRAPH_WEBHOOK_PATH) {
    throw new TypeError("notification_url must be the public HTTPS Graph webhook URL");
  }
  return url.toString();
}

function text(value, field, maximum = 4096) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) throw Object.assign(new Error(`${field} is invalid`), { status: 400 });
  return value;
}

function messageId(notification) {
  const resource = text(notification.resource, "resource");
  const match = /^(?:me|users\/[^/]+)\/messages\/(.+)$/iu.exec(resource);
  if (!match) throw Object.assign(new Error("resource is invalid"), { status: 400 });
  let id;
  try { id = decodeURIComponent(match[1]); } catch { throw Object.assign(new Error("resource is invalid"), { status: 400 }); }
  text(id, "message_id");
  if (notification.resourceData?.id !== undefined && notification.resourceData.id !== id) throw Object.assign(new Error("resource message identity does not match"), { status: 400 });
  return id;
}

function verifiedState(actual, expectedHash) {
  const actualHash = createHash("sha256").update(text(actual, "clientState", 128)).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return expected.byteLength === actualHash.byteLength && timingSafeEqual(actualHash, expected);
}

function activeConnection(connection, subscription, now) {
  return connection
    && connection.tenant_id === subscription.tenant_id
    && connection.m365_connection_id === subscription.m365_connection_id
    && !connection.revoked_at
    && Number.isFinite(Date.parse(connection.expires_at))
    && Date.parse(connection.expires_at) > now.getTime()
    && connection.connection_authority === "delegated"
    && connection.mailbox_scope === "me"
    && connection.granted_scopes?.includes("Mail.Read");
}

function parsedBody(body) {
  const raw = typeof body === "string" ? body : JSON.stringify(body ?? {});
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw Object.assign(new Error("notification body is too large"), { status: 413 });
  let parsed;
  try { parsed = typeof body === "string" ? JSON.parse(body) : body; } catch { throw Object.assign(new Error("notification JSON is invalid"), { status: 400 }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.value) || parsed.value.length > MAX_NOTIFICATIONS) throw Object.assign(new Error("notification body is invalid"), { status: 400 });
  return parsed.value;
}

export function createOutlookGraphWebhookHandler({ repository, queue, connection_lookup, notification_url, clock = () => new Date() } = {}) {
  if (!repository || !queue || typeof connection_lookup !== "function") throw new TypeError("Outlook Graph webhook dependencies are required");
  configuredNotificationUrl(notification_url);
  function handle(request = {}) {
    if (["GET", "POST"].includes(request.method) && request.query?.validationToken !== undefined) {
      try {
        const token = text(request.query?.validationToken, "validationToken", 1024);
        return { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, body: token };
      } catch {
        return response(400, "OUTLOOK_GRAPH_NOTIFICATION_INVALID");
      }
    }
    if (request.method !== "POST") return response(405, "OUTLOOK_GRAPH_METHOD_NOT_ALLOWED");
    if (!/^application\/json(?:\s*;|$)/iu.test(String(request.headers?.["content-type"] ?? request.headers?.["Content-Type"] ?? ""))) return response(415, "OUTLOOK_GRAPH_CONTENT_TYPE_INVALID");
    let verified;
    try {
      const now = clock();
      const snapshot = repository.snapshot();
      verified = parsedBody(request.body).map((notification) => {
        if (!notification || typeof notification !== "object" || Array.isArray(notification) || notification.changeType !== "created") throw Object.assign(new Error("notification changeType is invalid"), { status: 400 });
        const providerId = text(notification.subscriptionId, "subscriptionId");
        const subscription = snapshot.subscriptions.find((entry) => entry.provider_subscription_id === providerId && entry.status === "active");
        if (!subscription) throw Object.assign(new Error("subscription is unknown"), { status: 404 });
        if (!Number.isFinite(Date.parse(subscription.provider_expires_at)) || Date.parse(subscription.provider_expires_at) <= now.getTime()) throw Object.assign(new Error("subscription is expired"), { status: 410 });
        if (!activeConnection(connection_lookup({ tenant_id: subscription.tenant_id, m365_connection_id: subscription.m365_connection_id }), subscription, now)) throw Object.assign(new Error("subscription connection is inactive"), { status: 410 });
        if (!verifiedState(notification.clientState, subscription.client_state_hash)) throw Object.assign(new Error("clientState does not match"), { status: 403 });
        const id = messageId(notification);
        const sanitized = { subscription_id: subscription.subscription_id, provider_subscription_id: providerId, resource: subscription.resource, message_id: id, change_type: "created" };
        return { ...sanitized, tenant_id: subscription.tenant_id, source: "webhook", received_at: now.toISOString() };
      });
    } catch (error) {
      return response(error?.status === 413 ? 413 : 400, "OUTLOOK_GRAPH_NOTIFICATION_INVALID");
    }
    try {
      const outcomes = verified.map((notification) => queue.enqueue(notification));
      return { ...response(202, null), body: { outcome: "accepted", enqueued: outcomes.filter(({ outcome }) => outcome === "enqueued").length, duplicates: outcomes.filter(({ outcome }) => outcome === "duplicate").length } };
    } catch {
      return response(503, "OUTLOOK_GRAPH_PERSISTENCE_UNAVAILABLE");
    }
  }
  return Object.freeze({ handle });
}
