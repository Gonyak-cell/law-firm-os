import {
  GroupEgressError,
  credential,
  exactObject,
  fail,
} from "./contract.mjs";
import { createBoundedRequest } from "./bounded-request.mjs";
import { assertResponse, readJson } from "./response-json.mjs";
export const GRAPH_ORIGIN = "https://graph.microsoft.com";
export const LOGIN_ORIGIN = "https://login.microsoftonline.com";
const READ_RETRIES = 2;
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
function authorizationFailure(status) {
  if (status === 401 || status === 403) {
    fail("UPSTREAM_AUTHORIZATION_FAILED", status);
  }
}
function finalReadFailure(status) {
  authorizationFailure(status);
  if (status === 429) fail("UPSTREAM_THROTTLED", 429);
  if (status >= 500) fail("UPSTREAM_UNAVAILABLE", 503);
  fail("UPSTREAM_REJECTED", 502);
}
function retryDelay(response, attempt, clock) {
  let raw = null;
  try {
    raw = response.headers?.get?.("retry-after");
  } catch {
    return attempt === 0 ? 25 : 100;
  }
  if (raw && /^\d{1,4}$/u.test(raw)) {
    return Math.min(Number(raw) * 1000, 1000);
  }
  if (raw) {
    const target = Date.parse(raw);
    let current = Number.NaN;
    try {
      current = Number(clock());
    } catch {
      return attempt === 0 ? 25 : 100;
    }
    if (Number.isFinite(target) && Number.isFinite(current)) {
      return Math.max(0, Math.min(target - current, 1000));
    }
  }
  return attempt === 0 ? 25 : 100;
}
function fixedGraphUrl(value) {
  const url = new URL(value);
  if (
    url.origin !== GRAPH_ORIGIN
    || url.protocol !== "https:"
    || url.username
    || url.password
    || url.hash
  ) {
    fail("TARGET_POLICY_VIOLATION", 500);
  }
  return url;
}
function graphHeaders(token, contentType = false) {
  const headers = { authorization: `Bearer ${token}`, accept: "application/json" };
  if (contentType) headers["content-type"] = "application/json";
  return headers;
}
async function discardBody(response) {
  try {
    if (response.body) await response.body.cancel();
  } catch {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
}
export function createHttpClient({
  tenantId,
  credentialRef,
  withCredential,
  fetchImpl,
  clock,
  sleep,
  requestTimeoutMs,
  setTimeoutImpl,
  clearTimeoutImpl,
}) {
  const request = createBoundedRequest({
    fetchImpl, timeoutMs: requestTimeoutMs, setTimeoutImpl, clearTimeoutImpl,
  });
  async function wait(milliseconds) {
    try {
      await sleep(milliseconds);
    } catch {
      fail("UPSTREAM_UNAVAILABLE", 503);
    }
  }
  async function token() {
    let consumed = false;
    let completed = false;
    let callbackError = null;
    let callbackResult = null;
    try {
      const result = await withCredential(credentialRef, async (raw) => {
        try {
          if (consumed) fail("CREDENTIAL_UNAVAILABLE", 503);
          consumed = true;
          const resolved = credential(raw);
          const body = new URLSearchParams({
            client_id: resolved.client_id,
            client_secret: resolved.client_secret,
            grant_type: "client_credentials",
            scope: `${GRAPH_ORIGIN}/.default`,
          });
          let payload;
          try {
            payload = await request(
              `${LOGIN_ORIGIN}/${tenantId}/oauth2/v2.0/token`,
              {
                method: "POST",
                headers: {
                  accept: "application/json",
                  "content-type": "application/x-www-form-urlencoded",
                },
                body: body.toString(),
                redirect: "error",
              },
              async (rawResponse) => {
                const response = assertResponse(rawResponse);
                if (response.status !== 200) {
                  await discardBody(response);
                  finalReadFailure(response.status);
                }
                return readJson(response);
              },
            );
          } catch (error) {
            if (error instanceof GroupEgressError) throw error;
            fail("UPSTREAM_UNAVAILABLE", 503);
          }
          exactObject(payload, {
            required: ["token_type", "expires_in", "access_token"],
            optional: ["ext_expires_in", "scope"],
            code: "UPSTREAM_RESPONSE_INVALID",
            status: 502,
          });
          if (
            payload.token_type !== "Bearer"
            || !Number.isInteger(payload.expires_in)
            || payload.expires_in < 1
            || payload.expires_in > 86400
            || (payload.ext_expires_in !== undefined
              && (!Number.isInteger(payload.ext_expires_in)
                || payload.ext_expires_in < 1 || payload.ext_expires_in > 86400))
            || typeof payload.access_token !== "string"
            || payload.access_token.length < 1
            || payload.access_token.length > 64 * 1024
            || /[\u0000-\u001f\u007f\s]/u.test(payload.access_token)
            || (payload.scope !== undefined
              && payload.scope !== `${GRAPH_ORIGIN}/.default`)
          ) {
            fail("UPSTREAM_RESPONSE_INVALID", 502);
          }
          completed = true;
          callbackResult = payload.access_token;
          return callbackResult;
        } catch (error) {
          callbackError = error;
          throw error;
        }
      });
      if (!consumed || !completed || result !== callbackResult) {
        fail("CREDENTIAL_UNAVAILABLE", 503);
      }
      return result;
    } catch (error) {
      if (error === callbackError && error instanceof GroupEgressError) throw error;
      fail("CREDENTIAL_UNAVAILABLE", 503);
    }
  }
  async function get(accessToken, value) {
    const url = fixedGraphUrl(value);
    for (let attempt = 0; attempt <= READ_RETRIES; attempt += 1) {
      let rawResponse;
      try {
        rawResponse = await request(
          url.toString(),
          {
            method: "GET",
            headers: graphHeaders(accessToken),
            redirect: "error",
          },
          async (value) => {
            const response = assertResponse(value);
            if (response.status !== 200) {
              await discardBody(response);
              return { response, payload: null };
            }
            return { response, payload: await readJson(response) };
          },
        );
      } catch (error) {
        if (error instanceof GroupEgressError) throw error;
        if (attempt === READ_RETRIES) fail("UPSTREAM_UNAVAILABLE", 503);
        await wait(attempt === 0 ? 25 : 100);
        continue;
      }
      const { response, payload } = rawResponse;
      if (response.status === 200) return payload;
      authorizationFailure(response.status);
      if (!TRANSIENT.has(response.status) || attempt === READ_RETRIES) {
        finalReadFailure(response.status);
      }
      await wait(retryDelay(response, attempt, clock));
    }
    fail("UPSTREAM_UNAVAILABLE", 503);
  }
  async function write(accessToken, value, { method, body }) {
    const url = fixedGraphUrl(value);
    if (method !== "POST" && method !== "DELETE") {
      fail("TARGET_POLICY_VIOLATION", 500);
    }
    let rawResponse;
    try {
      rawResponse = await request(
        url.toString(),
        {
          method,
          headers: graphHeaders(accessToken, method === "POST"),
          ...(body === undefined ? {} : { body }),
          redirect: "error",
        },
        async (value) => {
          const response = assertResponse(value);
          await discardBody(response);
          return response;
        },
      );
    } catch {
      return { ambiguous: true, status: null };
    }
    let response;
    try {
      response = assertResponse(rawResponse);
    } catch {
      return { ambiguous: true, status: null };
    }
    authorizationFailure(response.status);
    return { ambiguous: response.status !== 204, status: response.status };
  }

  return Object.freeze({ token, get, write });
}
