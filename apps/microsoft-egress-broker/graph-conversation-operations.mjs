import { createHash } from "node:crypto";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const RESOURCES = new Set([
  "me/mailFolders('inbox')/messages",
  "me/mailFolders('sentitems')/messages",
]);
const MAX_JSON_BYTES = 2 * 1024 * 1024;

export class GraphConversationOperationError extends Error {
  constructor(code, status = 400, details = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function invalid() { throw new GraphConversationOperationError("INVALID_REQUEST", 400); }
function object(value) { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value; }
function exact(value, required) {
  object(value);
  if (Object.keys(value).length !== required.length || required.some((field) => !Object.hasOwn(value, field))) invalid();
}
function text(value, maximum = 4096) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function resource(value) { const result = text(value); if (!RESOURCES.has(result)) invalid(); return result; }
function instant(value) { const result = text(value, 64); if (!Number.isFinite(Date.parse(result))) invalid(); return new Date(result).toISOString(); }
function subscriptionId(value) { return text(value, 512); }
function clientStateHash(value) { return createHash("sha256").update(text(value, 128)).digest("hex"); }

function configuredUrl(value) {
  if (typeof value !== "string" || !value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new TypeError("graph_notification_url must be HTTPS");
  return url.toString();
}

async function graphFetch(fetchImpl, url, options) {
  const parsed = new URL(url);
  if (parsed.origin !== GRAPH_ORIGIN || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
    throw new GraphConversationOperationError("TARGET_POLICY_VIOLATION", 500);
  }
  try {
    return await fetchImpl(parsed.toString(), { ...options, redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    if (error instanceof GraphConversationOperationError) throw error;
    throw new GraphConversationOperationError("UPSTREAM_UNAVAILABLE", 503);
  }
}

async function json(response) {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_JSON_BYTES) throw new GraphConversationOperationError("RESPONSE_TOO_LARGE", 502);
  try { return object(JSON.parse(bytes.toString("utf8"))); } catch { throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502); }
}

function upstream(response) {
  if (response.status === 429) throw new GraphConversationOperationError("UPSTREAM_THROTTLED", 429);
  if (response.status === 401 || response.status === 403) throw new GraphConversationOperationError("UPSTREAM_AUTHORIZATION_FAILED", response.status);
  throw new GraphConversationOperationError("UPSTREAM_REJECTED", [400, 404, 409].includes(response.status) ? response.status : 502);
}

function headers(token) {
  return { authorization: `Bearer ${text(token, 32 * 1024)}`, accept: "application/json", "content-type": "application/json", Prefer: 'IdType="ImmutableId"' };
}

function subscription(value, notificationUrl) {
  object(value);
  const normalizedResource = resource(value.resource);
  if (value.changeType !== "created" || value.notificationUrl !== notificationUrl) throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
  return {
    provider_subscription_id: subscriptionId(value.id),
    resource: normalizedResource,
    change_type: "created",
    client_state_hash: clientStateHash(value.clientState),
    expires_at: instant(value.expirationDateTime),
  };
}

export function createGraphConversationOperations({ graph_notification_url } = {}) {
  const notificationUrl = configuredUrl(graph_notification_url);
  const requireConfiguration = () => {
    if (!notificationUrl) throw new GraphConversationOperationError("BROKER_CONFIG_UNAVAILABLE", 503);
    return notificationUrl;
  };
  return Object.freeze({
    "graph.messageSubscription.create": async (fetchImpl, request) => {
      exact(request, ["access_token", "resource", "change_type", "client_state", "expiration_datetime"]);
      if (request.change_type !== "created") invalid();
      const callback = requireConfiguration();
      const response = await graphFetch(fetchImpl, `${GRAPH_ORIGIN}/v1.0/subscriptions`, {
        method: "POST", headers: headers(request.access_token), body: JSON.stringify({ changeType: "created", notificationUrl: callback, resource: resource(request.resource), expirationDateTime: instant(request.expiration_datetime), clientState: text(request.client_state, 128) }),
      });
      if (response.status !== 201) upstream(response);
      return subscription(await json(response), callback);
    },
    "graph.messageSubscription.renew": async (fetchImpl, request) => {
      exact(request, ["access_token", "provider_subscription_id", "expiration_datetime"]);
      const callback = requireConfiguration();
      const id = encodeURIComponent(subscriptionId(request.provider_subscription_id));
      const response = await graphFetch(fetchImpl, `${GRAPH_ORIGIN}/v1.0/subscriptions/${id}`, { method: "PATCH", headers: headers(request.access_token), body: JSON.stringify({ expirationDateTime: instant(request.expiration_datetime) }) });
      if (response.status !== 200) upstream(response);
      return subscription(await json(response), callback);
    },
    "graph.messageSubscription.list": async (fetchImpl, request) => {
      exact(request, ["access_token"]);
      const callback = requireConfiguration();
      const response = await graphFetch(fetchImpl, `${GRAPH_ORIGIN}/v1.0/subscriptions`, { method: "GET", headers: headers(request.access_token) });
      if (response.status !== 200) upstream(response);
      const body = await json(response);
      if (!Array.isArray(body.value) || body.value.length > 100) throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
      return body.value.filter((entry) => entry?.notificationUrl === callback && RESOURCES.has(entry?.resource)).map((entry) => subscription(entry, callback));
    },
    "graph.messageSubscription.delete": async (fetchImpl, request) => {
      exact(request, ["access_token", "provider_subscription_id"]);
      requireConfiguration();
      const id = encodeURIComponent(subscriptionId(request.provider_subscription_id));
      const response = await graphFetch(fetchImpl, `${GRAPH_ORIGIN}/v1.0/subscriptions/${id}`, { method: "DELETE", headers: headers(request.access_token) });
      if (response.status !== 204) upstream(response);
      return { deleted: true, provider_subscription_id: request.provider_subscription_id };
    },
  });
}
