import { createNestablePublicClientApplication } from "@azure/msal-browser";
import {
  AUTH_ERROR_CODES,
  AUTH_STATE,
  LAWOS_SESSION_STORAGE_KEY,
  createAddinAuthError,
  createSessionStore,
  detectNestedAppAuth,
  loadOfficeSsoConfig,
  parseExchangeResponse,
  parseSessionValidation,
} from "./addin-auth.js";
import { fetchAddinApi } from "./addin-http.js";

const INTERACTION_REQUIRED = "LAWOS_INTERACTION_REQUIRED";

function errorWithCode(code, message = code, details = {}) {
  return Object.assign(new Error(message), { safe_error_code: code, ...details });
}

/** Auth/session/HTTP only. Capability entries provide their own API policy. */
export function createOutlookAuthRuntime({
  windowObject = globalThis.window ?? globalThis,
  Office = windowObject?.Office ?? globalThis.Office,
  fetchImpl = windowObject?.fetch?.bind(windowObject) ?? globalThis.fetch,
  createPca = createNestablePublicClientApplication,
  requestJson: requestJsonOverride = null,
  acquireLawosSession: acquireSessionOverride = null,
  onAuthRequired = () => {},
} = {}) {
  let sessionStore = null;
  let runtimeConfigPromise = null;
  let msalBridgePromise = null;
  let authRecoveryPromise = null;

  function notifyAuthRequired(error) {
    if (error?.safe_error_code !== INTERACTION_REQUIRED && error?.status !== 401) return;
    try { onAuthRequired(error); } catch { /* presentation must not break auth cleanup */ }
  }

  function sessionStorage() {
    if (!sessionStore) {
      sessionStore = createSessionStore({
        sessionStorage: windowObject?.sessionStorage,
        officeStorage: windowObject?.OfficeRuntime?.storage,
        key: LAWOS_SESSION_STORAGE_KEY,
      });
    }
    return sessionStore;
  }

  async function runtimeConfig() {
    if (!runtimeConfigPromise) {
      runtimeConfigPromise = loadOfficeSsoConfig({
        location: windowObject?.location,
        fetchImpl: (url, options) => fetchAddinApi({ url, options, fetchImpl }),
      }).catch((error) => {
        runtimeConfigPromise = null;
        throw error;
      });
    }
    return runtimeConfigPromise;
  }

  async function rawRequestJson(path, {
    method = "GET",
    body,
    includeSession = true,
    retryAfterUnauthorized = true,
  } = {}) {
    const config = await runtimeConfig();
    const token = includeSession ? await sessionStorage().get() : "";
    const response = await fetchAddinApi({
      url: `${config.apiBase}${path}`,
      fetchImpl,
      options: {
        method,
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    });
    let payload = {};
    try { payload = await response.json(); } catch { throw errorWithCode("API_RESPONSE_INVALID"); }
    if (!response.ok) {
      const error = errorWithCode(
        payload.safe_error_codes?.[0] ?? payload.safe_error_code ?? "request_failed",
        undefined,
        { status: response.status, payload },
      );
      if (response.status === 401 && includeSession && retryAfterUnauthorized) {
        await sessionStorage().clear();
      }
      throw error;
    }
    return payload;
  }

  async function validateLawosSession() {
    const token = await sessionStorage().get();
    if (!token) return { authenticated: false, safe_error_code: "AUTH_SESSION_REQUIRED" };
    try {
      return parseSessionValidation(await rawRequestJson("/api/auth/session", {
        retryAfterUnauthorized: false,
      }), 200);
    } catch (error) {
      if (error?.status === 401) {
        await sessionStorage().clear();
        return { authenticated: false, safe_error_code: AUTH_ERROR_CODES.sessionInvalid };
      }
      throw error;
    }
  }

  async function initializeMsalBridge() {
    if (!msalBridgePromise) {
      msalBridgePromise = (async () => {
        const config = await runtimeConfig();
        const support = detectNestedAppAuth({ Office, window: windowObject });
        if (!support.supported) {
          throw createAddinAuthError(
            support.reason ?? AUTH_ERROR_CODES.nestedAppAuthUnavailable,
            "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다.",
            { nested_app_auth: support },
          );
        }
        const instance = await createPca({
          auth: {
            clientId: config.clientId,
            authority: config.authority,
            redirectUri: config.naaRedirectUri,
            postLogoutRedirectUri: config.naaRedirectUri,
          },
          cache: { cacheLocation: "memoryStorage", storeAuthStateInCookie: false },
        });
        return Object.freeze({ instance, config });
      })().catch((error) => {
        msalBridgePromise = null;
        throw error;
      });
    }
    return msalBridgePromise;
  }

  async function acquireLawosSession(options = {}) {
    if (acquireSessionOverride) return acquireSessionOverride(options);
    const { interactive = false, force = false } = options;
    if (authRecoveryPromise && !interactive) return authRecoveryPromise;
    const run = (async () => {
      if (!force) {
        const existing = await validateLawosSession();
        if (existing.authenticated) return existing;
      }
      const bridge = await initializeMsalBridge();
      const account = bridge.instance.getActiveAccount?.() ?? null;
      let result;
      try {
        result = interactive
          ? await bridge.instance.acquireTokenPopup({ scopes: bridge.config.scopes, prompt: "select_account" })
          : await bridge.instance.acquireTokenSilent({
              scopes: bridge.config.scopes,
              ...(account ? { account } : {}),
            });
      } catch (error) {
        if (!interactive) {
          throw createAddinAuthError(INTERACTION_REQUIRED, "로그인을 눌러 AMIC OS에 로그인해 주세요.", { cause: error });
        }
        throw error;
      }
      if (result?.account) bridge.instance.setActiveAccount?.(result.account);
      const accessToken = typeof result?.accessToken === "string" ? result.accessToken : "";
      if (!accessToken) {
        throw createAddinAuthError(AUTH_ERROR_CODES.sessionExchangeInvalid, "Microsoft 로그인 토큰을 받지 못했습니다.");
      }
      const exchange = await rawRequestJson("/api/auth/office-sso/exchange", {
        method: "POST",
        includeSession: false,
        retryAfterUnauthorized: false,
        body: { access_token: accessToken },
      });
      await sessionStorage().set(parseExchangeResponse(exchange, 200));
      return validateLawosSession();
    })();
    if (interactive) return run;
    let tracked;
    tracked = run.then(
      (value) => {
        if (authRecoveryPromise === tracked) authRecoveryPromise = null;
        return value;
      },
      (error) => {
        if (authRecoveryPromise === tracked) authRecoveryPromise = null;
        throw error;
      },
    );
    authRecoveryPromise = tracked;
    return tracked;
  }

  async function requestJson(path, options = {}) {
    try {
      if (requestJsonOverride) return await requestJsonOverride(path, options);
      try {
        return await rawRequestJson(path, options);
      } catch (error) {
        if (error?.status === 401 && options.includeSession !== false && options.retryAfterUnauthorized !== false) {
          await acquireLawosSession({ interactive: false, force: true });
          return rawRequestJson(path, { ...options, retryAfterUnauthorized: false });
        }
        throw error;
      }
    } catch (error) {
      notifyAuthRequired(error);
      throw error;
    }
  }

  async function initializeAuth() {
    try {
      await runtimeConfig();
      const session = await acquireLawosSession({ interactive: false });
      return {
        authState: session?.authenticated ? AUTH_STATE.authenticated : AUTH_STATE.loginRequired,
        authError: null,
      };
    } catch (error) {
      return {
        authState: error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable
          || error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported
          ? AUTH_STATE.unavailable
          : AUTH_STATE.loginRequired,
        authError: error,
      };
    }
  }

  async function signIn() {
    try {
      const session = await acquireLawosSession({ interactive: true, force: true });
      return {
        authState: session?.authenticated ? AUTH_STATE.authenticated : AUTH_STATE.loginRequired,
        authError: null,
      };
    } catch (error) {
      return { authState: AUTH_STATE.loginRequired, authError: error };
    }
  }

  return Object.freeze({
    requestJson,
    acquireLawosSession,
    initializeAuth,
    signIn,
  });
}
