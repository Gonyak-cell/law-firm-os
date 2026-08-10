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
import {
  createOutlookApiResponseError,
  createOutlookAuthOwnerChangedError,
  createOutlookAuthOwnerFence,
} from "./outlook-session-fence.js";

const INTERACTION_REQUIRED = "LAWOS_INTERACTION_REQUIRED";

function errorWithCode(code, message = code, details = {}) {
  return Object.assign(new Error(message), { safe_error_code: code, ...details });
}

function annotateAuthOwner(error, requestOwner, recoveryOwner = null) {
  Object.defineProperties(error, {
    authRequestOwner: { value: requestOwner, configurable: true },
    authRecoveryOwner: { value: recoveryOwner, configurable: true },
  });
  return error;
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
  let authRecoveryOwner = null;
  const authOwnerFence = createOutlookAuthOwnerFence();

  function notifyAuthRequired(error) {
    if (
      error?.safe_error_code !== INTERACTION_REQUIRED
      && error?.safe_error_code !== "AUTH_SESSION_REQUIRED"
      && error?.status !== 401
    ) return;
    const owner = error?.authRecoveryOwner ?? error?.authRequestOwner;
    if (owner && !authOwnerFence.isCurrent(owner)) return;
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
    authOwner = null,
    sessionToken,
    sessionOwner = null,
  } = {}) {
    const requestOwnerStart = authOwner ?? authOwnerFence.capture();
    if (!authOwnerFence.isCurrent(requestOwnerStart)) {
      throw createOutlookAuthOwnerChangedError();
    }
    const config = await runtimeConfig();
    if (!authOwnerFence.isCurrent(requestOwnerStart)) {
      throw createOutlookAuthOwnerChangedError();
    }
    const token = includeSession
      ? (sessionToken === undefined ? await sessionStorage().get() : sessionToken)
      : "";
    const requestOwner = includeSession
      ? sessionOwner ?? authOwnerFence.bindToken(requestOwnerStart, token)
      : requestOwnerStart;
    if (
      includeSession
      && (
        !requestOwner?.tokenBound
        || requestOwner.token !== String(token ?? "").trim()
        || (sessionOwner && requestOwner !== sessionOwner)
      )
    ) {
      throw createOutlookAuthOwnerChangedError();
    }
    if (!requestOwner || !authOwnerFence.isCurrent(requestOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
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
    if (!authOwnerFence.isCurrent(requestOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    const sessionUnauthorized = response.status === 401 && includeSession;
    let recoveryOwner = null;
    let sessionClearPromise = null;
    if (sessionUnauthorized) {
      recoveryOwner = authOwnerFence.begin();
      sessionClearPromise = sessionStorage()
        .clearIfCurrent(requestOwner.token)
        .catch(() => undefined);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      if (sessionClearPromise) await sessionClearPromise;
      if (recoveryOwner && !authOwnerFence.isCurrent(recoveryOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      if (!recoveryOwner && !authOwnerFence.isCurrent(requestOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      throw annotateAuthOwner(createOutlookApiResponseError({
        status: response.status,
        parseFailed: true,
      }), requestOwner, recoveryOwner);
    }
    if (recoveryOwner && !authOwnerFence.isCurrent(recoveryOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    if (!recoveryOwner && !authOwnerFence.isCurrent(requestOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    if (!response.ok) {
      if (sessionClearPromise) await sessionClearPromise;
      throw annotateAuthOwner(createOutlookApiResponseError({
        status: response.status,
        payload,
      }), requestOwner, recoveryOwner);
    }
    if (!authOwnerFence.isCurrent(requestOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    return payload;
  }

  async function captureSessionOwner(owner = authOwnerFence.capture()) {
    if (!authOwnerFence.canUsePersistedToken(owner)) {
      throw errorWithCode("AUTH_SESSION_REQUIRED");
    }
    const token = await sessionStorage().get();
    if (!token) throw errorWithCode("AUTH_SESSION_REQUIRED");
    if (!authOwnerFence.isCurrent(owner)) throw createOutlookAuthOwnerChangedError();
    if (owner.tokenBound && owner.token !== token) {
      throw createOutlookAuthOwnerChangedError();
    }
    const boundOwner = owner.tokenBound ? owner : authOwnerFence.bindToken(owner, token);
    if (!boundOwner || !authOwnerFence.isCurrent(boundOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    return boundOwner;
  }

  async function validateLawosSession({ tokenSnapshot = undefined, owner = null } = {}) {
    const validationOwner = owner ?? authOwnerFence.capture();
    if (!authOwnerFence.canUsePersistedToken(validationOwner)) {
      return { authenticated: false, safe_error_code: "AUTH_SESSION_REQUIRED", authOwner: validationOwner };
    }
    const token = tokenSnapshot === undefined ? await sessionStorage().get() : tokenSnapshot;
    if (!token) return { authenticated: false, safe_error_code: "AUTH_SESSION_REQUIRED" };
    if (!authOwnerFence.isCurrent(validationOwner)) throw createOutlookAuthOwnerChangedError();
    const boundValidationOwner = validationOwner.tokenBound
      ? validationOwner
      : authOwnerFence.bindToken(validationOwner, token);
    if (!boundValidationOwner || !authOwnerFence.isCurrent(boundValidationOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    try {
      const session = parseSessionValidation(await rawRequestJson("/api/auth/session", {
        retryAfterUnauthorized: false,
        authOwner: boundValidationOwner,
        sessionToken: token,
        sessionOwner: boundValidationOwner,
      }), 200);
      return { ...session, authOwner: boundValidationOwner };
    } catch (error) {
      if (error?.status === 401) {
        await sessionStorage().clearIfCurrent(error.authRequestOwner?.token ?? token);
        const recoveryOwner = error.authRecoveryOwner;
        if (!recoveryOwner || !authOwnerFence.isCurrent(recoveryOwner)) {
          throw createOutlookAuthOwnerChangedError();
        }
        return {
          authenticated: false,
          safe_error_code: AUTH_ERROR_CODES.sessionInvalid,
          authOwner: recoveryOwner,
        };
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

  async function installSessionToken(owner, token) {
    if (!authOwnerFence.isCurrent(owner) || !authOwnerFence.setToken(owner, token)) {
      throw createOutlookAuthOwnerChangedError();
    }
    const boundOwner = authOwnerFence.bindToken(owner, token);
    if (!boundOwner) throw createOutlookAuthOwnerChangedError();
    try {
      await sessionStorage().set(token);
    } catch (error) {
      if (authOwnerFence.currentToken() !== token) {
        await sessionStorage().clearIfCurrent(token);
      }
      throw error;
    }
    if (!authOwnerFence.isCurrent(boundOwner)) {
      if (authOwnerFence.currentToken() !== token) {
        await sessionStorage().clearIfCurrent(token);
      }
      throw createOutlookAuthOwnerChangedError();
    }
    return boundOwner;
  }

  async function acquireLawosSession({ interactive = false, force = false, owner = null } = {}) {
    let activeOwner = owner ?? authOwnerFence.capture();
    if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
    if (
      authRecoveryPromise
      && !interactive
      && authRecoveryOwner?.ownerEpoch === activeOwner.ownerEpoch
    ) {
      const existing = await authRecoveryPromise;
      if (!authOwnerFence.isCurrent(existing?.authOwner ?? activeOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      return existing;
    }
    const run = (async () => {
      if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
      if (acquireSessionOverride) {
        const session = await acquireSessionOverride({ interactive, force });
        if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
        if (session?.session_token) {
          const token = parseExchangeResponse(session, 200);
          activeOwner = await installSessionToken(activeOwner, token);
        }
        return { ...session, authOwner: activeOwner };
      }
      if (!force) {
        const existing = await validateLawosSession({ owner: activeOwner });
        activeOwner = existing.authOwner ?? activeOwner;
        if (existing.authenticated) return existing;
      }
      const bridge = await initializeMsalBridge();
      if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
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
      if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
      if (result?.account) bridge.instance.setActiveAccount?.(result.account);
      const accessToken = typeof result?.accessToken === "string" ? result.accessToken : "";
      if (!accessToken) {
        throw createAddinAuthError(AUTH_ERROR_CODES.sessionExchangeInvalid, "Microsoft 로그인 토큰을 받지 못했습니다.");
      }
      const exchange = await rawRequestJson("/api/auth/office-sso/exchange", {
        method: "POST",
        includeSession: false,
        retryAfterUnauthorized: false,
        authOwner: activeOwner,
        body: { access_token: accessToken },
      });
      const lawosToken = parseExchangeResponse(exchange, 200);
      activeOwner = await installSessionToken(activeOwner, lawosToken);
      const session = await validateLawosSession({
        tokenSnapshot: lawosToken,
        owner: activeOwner,
      });
      if (!authOwnerFence.isCurrent(session.authOwner ?? activeOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      return session;
    })().catch((error) => {
      if (error?.safe_error_code === "AUTH_SESSION_OWNER_CHANGED") throw error;
      if (!authOwnerFence.isCurrent(activeOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      throw annotateAuthOwner(error, activeOwner);
    });
    if (interactive) return run;
    let tracked;
    tracked = run.then(
      (value) => {
        if (authRecoveryPromise === tracked) {
          authRecoveryPromise = null;
          authRecoveryOwner = null;
        }
        return value;
      },
      (error) => {
        if (authRecoveryPromise === tracked) {
          authRecoveryPromise = null;
          authRecoveryOwner = null;
        }
        throw error;
      },
    );
    authRecoveryPromise = tracked;
    authRecoveryOwner = activeOwner;
    return tracked;
  }

  async function requestJson(path, options = {}) {
    const {
      authOwner = null,
      sessionOwner = null,
      onAuthOwnerChanged = null,
      ...publicOptions
    } = options;
    const requestOwner = sessionOwner ?? authOwner ?? authOwnerFence.capture();
    try {
      if (!authOwnerFence.isCurrent(requestOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      try {
        if (requestJsonOverride) {
          const result = await requestJsonOverride(path, publicOptions);
          if (!authOwnerFence.isCurrent(requestOwner)) {
            throw createOutlookAuthOwnerChangedError();
          }
          return result;
        }
        return await rawRequestJson(path, {
          ...publicOptions,
          authOwner,
          sessionOwner,
        });
      } catch (error) {
        let unauthorizedError = error;
        if (
          requestJsonOverride
          && error?.status === 401
          && publicOptions.includeSession !== false
          && !error?.authRecoveryOwner
        ) {
          if (!authOwnerFence.isCurrent(requestOwner)) {
            throw createOutlookAuthOwnerChangedError();
          }
          const recoveryOwner = authOwnerFence.begin();
          if (requestOwner.tokenBound) {
            await sessionStorage().clearIfCurrent(requestOwner.token);
          }
          if (!authOwnerFence.isCurrent(recoveryOwner)) {
            throw createOutlookAuthOwnerChangedError();
          }
          unauthorizedError = annotateAuthOwner(error, requestOwner, recoveryOwner);
        }
        const recoveryOwner = unauthorizedError?.authRecoveryOwner;
        if (
          unauthorizedError?.status === 401
          && publicOptions.includeSession !== false
          && publicOptions.retryAfterUnauthorized !== false
          && recoveryOwner
          && authOwnerFence.isCurrent(recoveryOwner)
        ) {
          if (onAuthOwnerChanged && onAuthOwnerChanged(recoveryOwner) !== true) {
            throw createOutlookAuthOwnerChangedError();
          }
          const session = await acquireLawosSession({
            interactive: false,
            force: true,
            owner: recoveryOwner,
          });
          if (session?.authenticated !== true) {
            let failedOwner = session?.authOwner ?? recoveryOwner;
            if (failedOwner?.tokenBound && authOwnerFence.isCurrent(failedOwner)) {
              await sessionStorage().clearIfCurrent(failedOwner.token);
              if (!authOwnerFence.isCurrent(failedOwner)) {
                throw createOutlookAuthOwnerChangedError();
              }
              authOwnerFence.clearToken(failedOwner);
              failedOwner = authOwnerFence.capture();
            }
            throw annotateAuthOwner(errorWithCode("AUTH_SESSION_REQUIRED"), failedOwner);
          }
          let recoveredOwner = session.authOwner;
          if (!recoveredOwner?.tokenBound) {
            try {
              recoveredOwner = await captureSessionOwner(recoveryOwner);
            } catch (error) {
              if (error?.safe_error_code === "AUTH_SESSION_REQUIRED") {
                throw annotateAuthOwner(error, recoveryOwner);
              }
              throw error;
            }
          }
          if (
            !recoveredOwner.token
            || !recoveredOwner.tokenBound
            || !authOwnerFence.isCurrent(recoveredOwner)
          ) {
            throw createOutlookAuthOwnerChangedError();
          }
          if (onAuthOwnerChanged && onAuthOwnerChanged(recoveredOwner) !== true) {
            throw createOutlookAuthOwnerChangedError();
          }
          const retryOptions = {
            ...publicOptions,
            retryAfterUnauthorized: false,
          };
          const result = requestJsonOverride
            ? await requestJsonOverride(path, retryOptions)
            : await rawRequestJson(path, {
                ...retryOptions,
                authOwner: recoveredOwner,
                sessionOwner: recoveredOwner,
              });
          if (!authOwnerFence.isCurrent(recoveredOwner)) {
            throw createOutlookAuthOwnerChangedError();
          }
          return result;
        }
        throw unauthorizedError;
      }
    } catch (error) {
      notifyAuthRequired(error);
      throw error;
    }
  }

  async function initializeAuth() {
    const owner = authOwnerFence.begin({ allowTokenAdoption: true });
    try {
      await runtimeConfig();
      if (!authOwnerFence.isCurrent(owner)) throw createOutlookAuthOwnerChangedError();
      const session = await acquireLawosSession({ interactive: false, owner });
      return {
        authState: session?.authenticated ? AUTH_STATE.authenticated : AUTH_STATE.loginRequired,
        authError: null,
        authOwner: session?.authOwner ?? owner,
      };
    } catch (error) {
      return {
        authState: error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable
          || error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported
          ? AUTH_STATE.unavailable
          : AUTH_STATE.loginRequired,
        authError: error,
        authOwner: error?.authRecoveryOwner ?? error?.authRequestOwner ?? owner,
      };
    }
  }

  async function signIn() {
    const owner = authOwnerFence.begin();
    try {
      const session = await acquireLawosSession({
        interactive: true,
        force: true,
        owner,
      });
      return {
        authState: session?.authenticated ? AUTH_STATE.authenticated : AUTH_STATE.loginRequired,
        authError: null,
        authOwner: session?.authOwner ?? owner,
      };
    } catch (error) {
      return {
        authState: AUTH_STATE.loginRequired,
        authError: error,
        authOwner: error?.authRecoveryOwner ?? error?.authRequestOwner ?? owner,
      };
    }
  }

  async function createSessionRequestContext() {
    let owner = await captureSessionOwner();
    return Object.freeze({
      isCurrent: () => authOwnerFence.isCurrent(owner),
      requestJson(path, options = {}) {
        if (!authOwnerFence.isCurrent(owner)) {
          return Promise.reject(createOutlookAuthOwnerChangedError());
        }
        return requestJson(path, {
          ...options,
          authOwner: owner,
          sessionOwner: owner,
          onAuthOwnerChanged(nextOwner) {
            if (!authOwnerFence.isCurrent(nextOwner)) return false;
            owner = nextOwner;
            return true;
          },
        });
      },
    });
  }

  return Object.freeze({
    requestJson,
    acquireLawosSession,
    initializeAuth,
    signIn,
    createSessionRequestContext,
    isAuthOwnerCurrent: authOwnerFence.isCurrent,
  });
}
