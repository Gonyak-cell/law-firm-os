import { createNestablePublicClientApplication } from "@azure/msal-browser";
import {
  LAWOS_SESSION_STORAGE_KEY,
  createSessionStore,
  loadOfficeSsoConfig,
  parseExchangeResponse,
} from "./addin-auth.js";
import { fetchAddinApi } from "./addin-http.js";
import { readOutlookComposeMessage } from "./outlook-item-content.js";
import {
  handleOutlookMessageSend,
  registerOutlookSendHandler,
} from "./outlook-send-events.js";

function runtimeError(code) {
  return Object.assign(new Error(code), { safe_error_code: code });
}

function runtimeOrigin(Office, location) {
  const candidates = [
    Office?.context?.urls?.javascriptRuntimeUrl,
    location?.href,
    location?.origin,
  ];
  for (const candidate of candidates) {
    try {
      const url = new URL(String(candidate ?? "").trim());
      if (
        url.protocol === "https:"
        || url.hostname === "localhost"
        || url.hostname === "127.0.0.1"
      ) {
        return url.origin;
      }
    } catch {
      // Try the next host-provided runtime URL.
    }
  }
  throw runtimeError("OUTLOOK_EVENT_ORIGIN_INVALID");
}

export function createOutlookEventRequestJson({
  Office = globalThis.Office,
  location = globalThis.location,
  fetchImpl = globalThis.fetch,
  sessionStorage = globalThis.sessionStorage,
  officeStorage = globalThis.OfficeRuntime?.storage,
  createPca = createNestablePublicClientApplication,
  loadConfig = loadOfficeSsoConfig,
} = {}) {
  const sessionStore = createSessionStore({
    sessionStorage,
    officeStorage,
    key: LAWOS_SESSION_STORAGE_KEY,
  });
  const origin = runtimeOrigin(Office, location);
  let configPromise = null;
  let pcaPromise = null;
  let sessionPromise = null;

  const fetchPayload = async (url, options, timeoutMs) => {
    const response = await fetchAddinApi({
      url,
      timeoutMs,
      fetchImpl,
      options,
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      if (response.status !== 401) throw runtimeError("API_RESPONSE_INVALID");
      payload = {};
    }
    return { response, payload };
  };
  const runtimeConfig = () => {
    if (!configPromise) {
      configPromise = loadConfig({
        location: { origin },
        fetchImpl: (url, options) => fetchAddinApi({
          url,
          fetchImpl,
          options,
        }),
      }).catch((error) => {
        configPromise = null;
        throw error;
      });
    }
    return configPromise;
  };
  const acquireProviderAccessToken = async () => {
    // Both Outlook HTML and JavaScript-only event runtimes use Microsoft's
    // Nested App Authentication bridge. Keep provider tokens in MSAL's
    // memory cache only; LawOS receives a token only for the same-origin
    // exchange below and stores only its own signed session.
    const config = await runtimeConfig();
    if (!pcaPromise) {
      pcaPromise = Promise.resolve().then(() => createPca({
        auth: {
          clientId: config.clientId,
          authority: config.authority,
          redirectUri: config.naaRedirectUri,
          postLogoutRedirectUri: config.naaRedirectUri,
        },
        cache: {
          cacheLocation: "memoryStorage",
          storeAuthStateInCookie: false,
        },
      })).catch((error) => {
        pcaPromise = null;
        throw error;
      });
    }
    let accessToken;
    try {
      const pca = await pcaPromise;
      const activeAccount = pca.getActiveAccount?.() ?? null;
      const result = await pca.acquireTokenSilent({
        scopes: config.scopes,
        ...(activeAccount ? { account: activeAccount } : {}),
      });
      accessToken = typeof result?.accessToken === "string"
        ? result.accessToken.trim()
        : "";
    } catch {
      throw runtimeError("OUTLOOK_EVENT_AUTH_UNAVAILABLE");
    }
    if (!accessToken) throw runtimeError("OUTLOOK_EVENT_AUTH_UNAVAILABLE");
    return accessToken;
  };

  const acquireLawosSession = () => {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      const accessToken = await acquireProviderAccessToken();
      const { response, payload } = await fetchPayload(
        `${origin}/api/auth/office-sso/exchange`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        },
      );
      const token = parseExchangeResponse(payload, response.status);
      await sessionStore.set(token);
      return token;
    })().finally(() => {
      sessionPromise = null;
    });
    return sessionPromise;
  };

  return async function requestJson(path, {
    method = "GET",
    body,
    timeoutMs,
  } = {}) {
    const url = new URL(path, `${origin}/`);
    if (url.origin !== origin || !url.pathname.startsWith("/api/outlook/")) {
      throw runtimeError("OUTLOOK_EVENT_API_PATH_INVALID");
    }
    const execute = (token) => fetchPayload(url.href, {
      method,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }, timeoutMs);
    let token = await sessionStore.get();
    if (!token) token = await acquireLawosSession();
    let result = await execute(token);
    if (result.response.status === 401) {
      await sessionStore.clear();
      token = await acquireLawosSession();
      result = await execute(token);
      if (result.response.status === 401) await sessionStore.clear();
    }
    if (!result.response.ok) {
      throw runtimeError(
        result.payload?.safe_error_codes?.[0]
        ?? result.payload?.safe_error_code
        ?? "OUTLOOK_EVENT_REQUEST_FAILED",
      );
    }
    return result.payload;
  };
}

export function createOutlookEventRuntime({
  Office = globalThis.Office,
  mailbox = Office?.context?.mailbox,
  requestJson = createOutlookEventRequestJson({ Office }),
  globalObject = globalThis,
  now = () => new Date().toISOString(),
} = {}) {
  const record = (key, value) => {
    globalObject.__LAWOS_OUTLOOK_EVENT_PROBE = {
      ...(globalObject.__LAWOS_OUTLOOK_EVENT_PROBE ?? {}),
      [key]: value,
    };
  };
  const complete = (event, payload = {}) => {
    const completion = { allowEvent: true, ...payload };
    record("last_completion", {
      allowEvent: completion.allowEvent,
      completed_at: now(),
    });
    event?.completed?.(completion);
    return completion;
  };
  const addWarningNotification = async (alertBody) => {
    const warnings = alertBody?.item?.warnings ?? [];
    const notificationMessages = mailbox?.item?.notificationMessages;
    if (warnings.length === 0 || typeof notificationMessages?.addAsync !== "function") return;
    const messageType = Office?.MailboxEnums?.ItemNotificationMessageType?.InformationalMessage
      ?? "informationalMessage";
    await new Promise((resolve) => {
      notificationMessages.addAsync(
        "lawos-smart-alert-warning",
        {
          type: messageType,
          message: `확인할 내용이 ${warnings.length}건 있습니다.`,
          icon: "Icon.16x16",
          persistent: false,
        },
        () => resolve(),
      );
    });
  };
  const onMessageSendHandler = (event = {}) => handleOutlookMessageSend({
    event: { completed: (payload) => complete(event, payload) },
    readMessage: (options) => readOutlookComposeMessage({
      item: mailbox?.item,
      mailbox,
      Office,
      ...options,
    }),
    requestJson,
    addWarningNotification,
    record,
  });
  const register = () => registerOutlookSendHandler({
    Office,
    handler: onMessageSendHandler,
  });
  return Object.freeze({ onMessageSendHandler, register });
}
