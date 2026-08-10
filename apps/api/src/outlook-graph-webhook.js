import { createHash, timingSafeEqual } from "node:crypto";
import { GRAPH_LIFECYCLE_EVENTS, GRAPH_MESSAGE_RESOURCES } from "../../../packages/email-dms/src/conversation-sync-model.js";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_NOTIFICATIONS = 100;
export const OUTLOOK_GRAPH_WEBHOOK_PATH = "/api/outlook/graph/notifications";

function response(status, code) {
  return { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: { outcome: status === 202 ? "accepted" : "blocked", safe_error_code: code } };
}

function configuredNotificationUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("notification_url must be the public HTTPS Graph webhook URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || url.pathname.replace(/\/+$/u, "") !== OUTLOOK_GRAPH_WEBHOOK_PATH) throw new TypeError("notification_url must be the public HTTPS Graph webhook URL");
  return url.toString();
}

function text(value, field, maximum = 4096) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) throw Object.assign(new Error(`${field} is invalid`), { status: 400 });
  return value;
}

function instant(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw Object.assign(new Error(`${field} is invalid`), { status: 400 });
  return date;
}

function messageIdentity(notification, subscription) {
  const resource = text(notification.resource, "resource");
  const match = /^users\/([^/]+)\/messages\/([^/]+)$/iu.exec(resource);
  if (!match) throw Object.assign(new Error("resource is invalid"), { status: 400 });
  let accountId;
  let messageId;
  try {
    accountId = decodeURIComponent(match[1]);
    messageId = decodeURIComponent(match[2]);
  } catch {
    throw Object.assign(new Error("resource is invalid"), { status: 400 });
  }
  if (accountId.toLowerCase() !== subscription.entra_subject_id.toLowerCase()) throw Object.assign(new Error("resource account identity does not match"), { status: 400 });
  text(messageId, "message_id");
  if (notification.resourceData?.id !== messageId) throw Object.assign(new Error("resource message identity does not match"), { status: 400 });
  if (notification.resourceData?.["@odata.type"] !== undefined && notification.resourceData["@odata.type"] !== "#Microsoft.Graph.Message") throw Object.assign(new Error("resource type is invalid"), { status: 400 });
  return messageId;
}

function verifiedState(actual, expectedHash) {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/u.test(expectedHash)) return false;
  const actualHash = createHash("sha256").update(text(actual, "clientState", 128)).digest();
  const expected = Buffer.from(expectedHash, "hex");
  return expected.byteLength === actualHash.byteLength && timingSafeEqual(actualHash, expected);
}

function activeAuthority(authority, now) {
  const subscription = authority?.subscription;
  const connection = authority?.connection;
  return subscription && connection
    && subscription.status === "active"
    && GRAPH_MESSAGE_RESOURCES.includes(subscription.resource)
    && connection.tenant_id === subscription.tenant_id
    && connection.m365_connection_id === subscription.m365_connection_id
    && connection.user_id === subscription.user_id
    && connection.entra_subject_id === subscription.entra_subject_id
    && connection.mailbox_address_hash === subscription.mailbox_ref
    && !connection.revoked_at
    && instant(connection.expires_at, "connection.expires_at").getTime() > now.getTime()
    && connection.connection_authority === "delegated"
    && connection.mailbox_scope === "me"
    && connection.granted_scopes?.includes("Mail.Read");
}

function parsedBody(body) {
  const raw = typeof body === "string" ? body : JSON.stringify(body ?? {});
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw Object.assign(new Error("notification body is too large"), { status: 413 });
  let parsed;
  try { parsed = typeof body === "string" ? JSON.parse(body) : body; } catch { throw Object.assign(new Error("notification JSON is invalid"), { status: 400 }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.value) || parsed.value.length < 1 || parsed.value.length > MAX_NOTIFICATIONS) throw Object.assign(new Error("notification body is invalid"), { status: 400 });
  return parsed.value;
}

function snapshotAuthorityLookup(repository, connectionLookup) {
  if (!repository?.snapshot || typeof connectionLookup !== "function") return null;
  return async ({ provider_subscription_id }) => {
    const subscription = repository.snapshot().subscriptions.find((entry) => entry.provider_subscription_id === provider_subscription_id);
    if (!subscription) return null;
    return { subscription, connection: await connectionLookup({ tenant_id: subscription.tenant_id, m365_connection_id: subscription.m365_connection_id }) };
  };
}

export function createOutlookGraphWebhookHandler({ repository, authority_lookup, queue, connection_lookup, notification_url, clock = () => new Date() } = {}) {
  const lookup = authority_lookup ?? snapshotAuthorityLookup(repository, connection_lookup);
  if (typeof lookup !== "function" || typeof queue?.enqueue !== "function") throw new TypeError("Outlook Graph webhook dependencies are required");
  configuredNotificationUrl(notification_url);

  async function verify(notification, now) {
    if (!notification || typeof notification !== "object" || Array.isArray(notification)) throw Object.assign(new Error("notification is invalid"), { status: 400 });
    const providerId = text(notification.subscriptionId, "subscriptionId");
    const authority = await lookup({ provider_subscription_id: providerId });
    if (!activeAuthority(authority, now)) throw Object.assign(new Error("subscription authority is inactive"), { status: 400 });
    const subscription = authority.subscription;
    if (notification.tenantId !== subscription.entra_tenant_id) throw Object.assign(new Error("notification tenant is invalid"), { status: 400 });
    if (!verifiedState(notification.clientState, subscription.client_state_hash)) throw Object.assign(new Error("clientState does not match"), { status: 400 });
    const providerExpiry = instant(subscription.provider_expires_at, "subscription.provider_expires_at");
    const notifiedExpiry = instant(notification.subscriptionExpirationDateTime, "subscriptionExpirationDateTime");
    if (providerExpiry.getTime() <= now.getTime() || providerExpiry.getTime() !== notifiedExpiry.getTime()) throw Object.assign(new Error("subscription expiration does not match"), { status: 400 });
    const common = { tenant_id: subscription.tenant_id, subscription_id: subscription.subscription_id, provider_subscription_id: providerId, resource: subscription.resource, source: "webhook", received_at: now.toISOString(), subscription_expiration_at: notifiedExpiry.toISOString() };
    if (notification.lifecycleEvent !== undefined) {
      const lifecycle = text(notification.lifecycleEvent, "lifecycleEvent", 64);
      if (!GRAPH_LIFECYCLE_EVENTS.includes(lifecycle) || notification.changeType !== undefined
        || notification.resource !== undefined || notification.resourceData !== undefined) {
        throw Object.assign(new Error("lifecycle notification is invalid"), { status: 400 });
      }
      return { ...common, lifecycle_event: lifecycle };
    }
    if (notification.changeType !== "created") throw Object.assign(new Error("notification changeType is invalid"), { status: 400 });
    return { ...common, message_id: messageIdentity(notification, subscription), change_type: "created" };
  }

  async function handle(request = {}) {
    if (["GET", "POST"].includes(request.method) && request.query?.validationToken !== undefined) {
      try {
        const token = text(request.query.validationToken, "validationToken", 1024);
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
      if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("clock is invalid");
      verified = await Promise.all(parsedBody(request.body).map((notification) => verify(notification, now)));
    } catch (error) {
      return response(error?.status === 413 ? 413 : 400, "OUTLOOK_GRAPH_NOTIFICATION_INVALID");
    }
    try {
      const outcomes = [];
      for (const notification of verified) outcomes.push(await queue.enqueue(notification));
      return { ...response(202, null), body: { outcome: "accepted", enqueued: outcomes.filter(({ outcome }) => outcome === "enqueued").length, duplicates: outcomes.filter(({ outcome }) => outcome === "duplicate").length } };
    } catch {
      return response(503, "OUTLOOK_GRAPH_PERSISTENCE_UNAVAILABLE");
    }
  }

  return Object.freeze({ handle });
}
