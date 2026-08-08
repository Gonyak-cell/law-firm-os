import { createHash } from "node:crypto";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const NOTIFICATION_PATH = "/api/outlook/graph/notifications";
const RESOURCES = new Set([
  "me/mailFolders('inbox')/messages",
  "me/mailFolders('sentitems')/messages",
]);
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_SUBSCRIPTION_PAGES = 10;

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
function receivedDateFilter(value) { return `receivedDateTime ge ${instant(value)}`; }
function validReceivedDateFilter(value) {
  const prefix = "receivedDateTime ge ";
  if (typeof value !== "string" || !value.startsWith(prefix)) return false;
  try { return receivedDateFilter(value.slice(prefix.length)) === value; } catch { return false; }
}
function subscriptionId(value) { return text(value, 512); }
function clientStateHash(value) { return createHash("sha256").update(text(value, 128)).digest("hex"); }

function configuredUrl(value) {
  if (typeof value !== "string" || !value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || url.pathname.replace(/\/+$/u, "") !== NOTIFICATION_PATH) throw new TypeError("graph_notification_url must be the exact HTTPS Graph webhook URL");
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
  if (response.status === 410) throw new GraphConversationOperationError("DELTA_CURSOR_EXPIRED", 409);
  if (response.status === 429) throw new GraphConversationOperationError("UPSTREAM_THROTTLED", 429);
  if (response.status === 401 || response.status === 403) throw new GraphConversationOperationError("UPSTREAM_AUTHORIZATION_FAILED", response.status);
  throw new GraphConversationOperationError("UPSTREAM_REJECTED", [400, 404, 409].includes(response.status) ? response.status : 502);
}

function headers(token) {
  return { authorization: `Bearer ${text(token, 32 * 1024)}`, accept: "application/json", "content-type": "application/json", Prefer: 'IdType="ImmutableId"' };
}

function subscription(value, notificationUrl, binding = null) {
  object(value);
  const normalizedResource = resource(value.resource);
  if (value.changeType !== "created" || value.notificationUrl !== notificationUrl
    || value.lifecycleNotificationUrl !== notificationUrl) {
    throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return {
    provider_subscription_id: subscriptionId(value.id),
    resource: normalizedResource,
    change_type: "created",
    client_state_hash: clientStateHash(value.clientState),
    notification_url: notificationUrl,
    expires_at: instant(value.expirationDateTime),
    ...(binding ?? {}),
  };
}

function subscriptionNextLink(value) {
  if (value === undefined) return null;
  let url;
  try { url = new URL(text(value, 16 * 1024)); } catch {
    throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const keys = [...url.searchParams.keys()];
  if (url.origin !== GRAPH_ORIGIN || url.pathname !== "/v1.0/subscriptions"
    || url.username || url.password || url.hash
    || keys.some((key) => !new Set(["$skiptoken", "$top"]).has(key))
    || new Set(keys).size !== keys.length) {
    throw new GraphConversationOperationError("TARGET_POLICY_VIOLATION", 500);
  }
  return url.toString();
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
        method: "POST", headers: headers(request.access_token), body: JSON.stringify({ changeType: "created", notificationUrl: callback, lifecycleNotificationUrl: callback, resource: resource(request.resource), expirationDateTime: instant(request.expiration_datetime), clientState: text(request.client_state, 128) }),
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
      exact(request, ["access_token", "entra_tenant_id", "account_id"]);
      const callback = requireConfiguration();
      const binding = {
        entra_tenant_id: text(request.entra_tenant_id, 512),
        account_id: text(request.account_id, 512),
      };
      const listed = [];
      const visited = new Set();
      let url = `${GRAPH_ORIGIN}/v1.0/subscriptions`;
      for (let page = 0; page < MAX_SUBSCRIPTION_PAGES; page += 1) {
        if (visited.has(url)) {
          throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
        }
        visited.add(url);
        const response = await graphFetch(fetchImpl, url, {
          method: "GET",
          headers: headers(request.access_token),
        });
        if (response.status !== 200) upstream(response);
        const body = await json(response);
        if (!Array.isArray(body.value) || body.value.length > 100) {
          throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
        }
        listed.push(...body.value.filter((entry) =>
          entry?.notificationUrl === callback
          && entry?.lifecycleNotificationUrl === callback
          && RESOURCES.has(entry?.resource))
          .map((entry) => subscription(entry, callback, binding)));
        const next = subscriptionNextLink(body["@odata.nextLink"]);
        if (!next) return listed;
        url = next;
      }
      throw new GraphConversationOperationError(
        "SUBSCRIPTION_PAGE_BUDGET_EXHAUSTED",
        502,
      );
    },
    "graph.messageSubscription.delete": async (fetchImpl, request) => {
      exact(request, ["access_token", "provider_subscription_id"]);
      requireConfiguration();
      const id = encodeURIComponent(subscriptionId(request.provider_subscription_id));
      const response = await graphFetch(fetchImpl, `${GRAPH_ORIGIN}/v1.0/subscriptions/${id}`, { method: "DELETE", headers: headers(request.access_token) });
      if (response.status === 404) return { deleted: true, provider_subscription_id: request.provider_subscription_id, already_missing: true };
      if (response.status !== 204) upstream(response);
      return { deleted: true, provider_subscription_id: request.provider_subscription_id };
    },
    "graph.messageDelta.list": async (fetchImpl, request) => {
      exact(request, ["access_token", "resource", "delta_link", "start_at"]);
      const targetResource = resource(request.resource);
      const pathname = `/v1.0/${targetResource}/delta`;
      let url;
      if (request.delta_link === null) {
        url = new URL(pathname, GRAPH_ORIGIN);
        url.searchParams.set("$select", "id");
        url.searchParams.set("$filter", receivedDateFilter(request.start_at));
        url.searchParams.set("changeType", "created");
        url.searchParams.set("$top", "100");
      } else {
        if (request.start_at !== null) invalid();
        url = new URL(text(request.delta_link, 16 * 1024));
        const allowed = new Set(["$select", "$filter", "$top", "$skiptoken", "$deltatoken", "changeType"]);
        if (url.origin !== GRAPH_ORIGIN || url.pathname !== pathname || [...url.searchParams.keys()].some((key) => !allowed.has(key))) {
          throw new GraphConversationOperationError("TARGET_POLICY_VIOLATION", 500);
        }
        if ((url.searchParams.has("$select") && url.searchParams.get("$select") !== "id")
          || (url.searchParams.has("$filter") && !validReceivedDateFilter(url.searchParams.get("$filter")))
          || (url.searchParams.has("$top") && url.searchParams.get("$top") !== "100")
          || (url.searchParams.has("changeType") && url.searchParams.get("changeType") !== "created")) {
          throw new GraphConversationOperationError("TARGET_POLICY_VIOLATION", 500);
        }
      }
      const response = await graphFetch(fetchImpl, url, { method: "GET", headers: headers(request.access_token) });
      if (response.status !== 200) upstream(response);
      const body = await json(response);
      if (!Array.isArray(body.value) || body.value.length > 1000) throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
      const messages = body.value.map((entry) => {
        object(entry);
        return { message_id: text(entry.id), removed: entry["@removed"] !== undefined };
      });
      const continuation = (field) => {
        const value = body[field];
        if (value === undefined) return null;
        const candidate = new URL(text(value, 16 * 1024));
        if (candidate.origin !== GRAPH_ORIGIN || candidate.pathname !== pathname) throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
        return candidate.toString();
      };
      const nextLink = continuation("@odata.nextLink");
      const deltaLink = continuation("@odata.deltaLink");
      if ((nextLink === null) === (deltaLink === null)) throw new GraphConversationOperationError("UPSTREAM_RESPONSE_INVALID", 502);
      return { messages, next_link: nextLink, delta_link: deltaLink };
    },
  });
}
