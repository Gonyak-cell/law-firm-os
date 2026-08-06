export const LAWOS_SESSION_STORAGE_KEY = "lawos_addin_session_token";
export const NESTED_APP_AUTH_REQUIREMENT_SET = "NestedAppAuth";
export const NESTED_APP_AUTH_MIN_VERSION = "1.1";
export const DEFAULT_OAUTH_START_PATH = "/addin/oauth-start.html";
export const OAUTH_DIALOG_MESSAGE_TYPE = "lawos-outlook-oauth";
export const OUTLOOK_OAUTH_DIALOG_TIMEOUT_MS = 9 * 60 * 1000;
export const OUTLOOK_OAUTH_DIALOG_OPTIONS = Object.freeze({
  height: 70,
  width: 42,
  // Microsoft sign-in pages reject iframe embedding.
  displayInIframe: false,
});

export const AUTH_STATE = Object.freeze({
  loading: "loading",
  loginRequired: "login_required",
  acquiring: "acquiring",
  authenticated: "authenticated",
  unavailable: "unavailable",
});

export const GRAPH_STATE = Object.freeze({
  loading: "loading",
  notConnected: "not_connected",
  connecting: "connecting",
  connected: "connected",
  reconnectRequired: "reconnect_required",
  unavailable: "unavailable",
});

export const AUTH_ERROR_CODES = Object.freeze({
  runtimeConfigInvalid: "ADDIN_RUNTIME_CONFIG_INVALID",
  runtimeConfigUnavailable: "ADDIN_RUNTIME_CONFIG_UNAVAILABLE",
  nestedAppAuthUnavailable: "NESTED_APP_AUTH_UNAVAILABLE",
  nestedAppAuthUnsupported: "NESTED_APP_AUTH_UNSUPPORTED",
  sessionExchangeInvalid: "LAWOS_SESSION_EXCHANGE_INVALID",
  sessionInvalid: "LAWOS_SESSION_INVALID",
  dialogUnavailable: "OUTLOOK_OAUTH_DIALOG_UNAVAILABLE",
  dialogTimeout: "OUTLOOK_OAUTH_DIALOG_TIMEOUT",
  dialogOriginInvalid: "OUTLOOK_OAUTH_DIALOG_ORIGIN_INVALID",
  dialogMessageInvalid: "OUTLOOK_OAUTH_DIALOG_MESSAGE_INVALID",
  dialogStateMismatch: "OUTLOOK_OAUTH_DIALOG_STATE_MISMATCH",
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values) {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

export function createAddinAuthError(code, message = code, details = {}) {
  const error = new Error(message);
  error.name = "AddinAuthError";
  error.safe_error_code = code;
  Object.assign(error, details);
  return error;
}

export function isLawosSessionToken(value) {
  return /^lawos_session_v1\.[A-Za-z0-9._~-]+$/u.test(text(value));
}

/**
 * Runtime configuration is fetched from the add-in origin. It may contain
 * public Entra identifiers and routes, but never a credential or session.
 */
export function parseRuntimeConfig(input = {}, { origin = "" } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "런타임 설정 형식이 올바르지 않습니다.",
    );
  }

  const apiBase = firstText(
    input.api_base,
    input.apiBase,
    input.api_base_url,
    input.apiBaseUrl,
    origin,
  ).replace(/\/+$/u, "");
  const clientId = firstText(input.client_id, input.clientId, input.entra_client_id, input.entraClientId);
  const tenantId = firstText(input.tenant_id, input.tenantId, input.entra_tenant_id, input.entraTenantId, "organizations");
  const apiScope = firstText(
    input.api_scope,
    input.apiScope,
    input.office_sso_scope,
    input.officeSsoScope,
  );
  const callbackUri = firstText(
    input.callback_uri,
    input.callbackUrl,
    input.callback_url,
    input.outlook_callback_uri,
    input.outlookCallbackUri,
    input.oauth_callback_uri,
    input.oauthCallbackUri,
  );
  const scopes = uniqueStrings(
    input.scopes
      ?? input.office_sso_scopes
      ?? input.officeSsoScopes
      ?? (apiScope ? [apiScope] : []),
  );

  if (!apiBase || !clientId || !tenantId || scopes.length === 0 || !callbackUri) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "런타임 설정에 인증·API 정보가 없습니다.",
      { missing: { apiBase: !apiBase, clientId: !clientId, tenantId: !tenantId, scopes: scopes.length === 0, callbackUri: !callbackUri } },
    );
  }
  const expectedApiScope = `api://${clientId}/access_as_user`;
  if (
    apiScope !== expectedApiScope
    || scopes.length !== 1
    || scopes[0] !== expectedApiScope
  ) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "Office 로그인 범위가 허용된 API 범위와 다릅니다.",
    );
  }

  let apiBaseUrl;
  let callbackUrl;
  try {
    apiBaseUrl = new URL(apiBase, origin || undefined);
    callbackUrl = new URL(callbackUri, apiBaseUrl.href);
  } catch (error) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "런타임 설정의 주소 형식이 올바르지 않습니다.",
      { cause: error },
    );
  }
  if (apiBaseUrl.protocol !== "https:" && apiBaseUrl.hostname !== "localhost" && apiBaseUrl.hostname !== "127.0.0.1") {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "API 주소는 HTTPS여야 합니다.",
    );
  }
  if (callbackUrl.protocol !== "https:" && callbackUrl.hostname !== "localhost" && callbackUrl.hostname !== "127.0.0.1") {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "OAuth 콜백 주소는 HTTPS여야 합니다.",
    );
  }
  if (callbackUrl.origin !== apiBaseUrl.origin) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "OAuth 콜백 주소는 API와 같은 origin이어야 합니다.",
    );
  }

  const authorityInput = firstText(
    input.authority,
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}`,
  );
  let authorityUrl;
  try {
    authorityUrl = new URL(authorityInput);
  } catch (error) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "Microsoft 로그인 주소 형식이 올바르지 않습니다.",
      { cause: error },
    );
  }
  if (
    authorityUrl.protocol !== "https:"
    || authorityUrl.hostname !== "login.microsoftonline.com"
    || authorityUrl.username
    || authorityUrl.password
    || authorityUrl.search
    || authorityUrl.hash
    || authorityUrl.pathname.replace(/\/+$/u, "") !== `/${encodeURIComponent(tenantId)}`
  ) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.runtimeConfigInvalid,
      "Microsoft 로그인 주소는 허용된 Entra 주소여야 합니다.",
    );
  }
  const authority = authorityUrl.href.replace(/\/+$/u, "");
  const oauthStartPath = firstText(input.oauth_start_path, input.oauthStartPath, DEFAULT_OAUTH_START_PATH);
  const naaRedirectUri = new URL("/addin/index.html", apiBaseUrl.href).href;

  return Object.freeze({
    apiBase: apiBaseUrl.href.replace(/\/+$/u, ""),
    api_base: apiBaseUrl.href.replace(/\/+$/u, ""),
    clientId,
    client_id: clientId,
    tenantId,
    tenant_id: tenantId,
    apiScope: apiScope || scopes[0],
    api_scope: apiScope || scopes[0],
    scopes: Object.freeze(scopes),
    authority,
    naaRedirectUri,
    naa_redirect_uri: naaRedirectUri,
    callbackUri: callbackUrl.href,
    callback_uri: callbackUrl.href,
    oauthStartPath,
    oauth_start_path: oauthStartPath,
  });
}

/** The same-origin API is authoritative for all public Entra settings. */
export async function loadOfficeSsoConfig({
  fetchImpl = globalThis.fetch,
  location = globalThis.location,
  apiPath = "/api/auth/office-sso/config",
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigUnavailable, "인증 설정을 불러올 수 없습니다.");
  }
  const origin = text(location?.origin);
  const apiUrl = new URL(apiPath, origin || "http://localhost");
  if (origin && apiUrl.origin !== origin) {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigInvalid, "인증 설정은 현재 add-in 주소에서만 불러올 수 있습니다.");
  }
  let apiResponse;
  try {
    apiResponse = await fetchImpl(apiUrl.href, {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
  } catch (error) {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigUnavailable, "인증 설정을 불러오지 못했습니다.", { cause: error });
  }
  if (!apiResponse?.ok) {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigUnavailable, "인증 설정을 불러오지 못했습니다.", { status: apiResponse?.status ?? 0 });
  }
  let apiPayload;
  try { apiPayload = await apiResponse.json(); } catch (error) {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigInvalid, "인증 설정 형식이 올바르지 않습니다.", { cause: error });
  }
  const apiConfig = apiPayload?.item ?? apiPayload?.config ?? apiPayload;
  if (!apiConfig || apiConfig.configured === false) {
    throw createAddinAuthError(AUTH_ERROR_CODES.runtimeConfigUnavailable, "Office 로그인이 아직 설정되지 않았습니다.");
  }

  const mergedConfig = {
    ...apiConfig,
    api_base: origin,
  };
  const authoritativeScopes = apiConfig.scopes
    ?? apiConfig.office_sso_scopes
    ?? (apiConfig.api_scope ? [apiConfig.api_scope] : null);
  if (authoritativeScopes) mergedConfig.scopes = authoritativeScopes;
  return parseRuntimeConfig(mergedConfig, { origin });
}

export function detectNestedAppAuth({ Office = globalThis.Office, window = globalThis.window } = {}) {
  const requirements = Office?.context?.requirements;
  if (!requirements || typeof requirements.isSetSupported !== "function") {
    return Object.freeze({ supported: false, requirementSupported: false, bridgeAvailable: false, reason: AUTH_ERROR_CODES.nestedAppAuthUnsupported });
  }
  let requirementSupported = false;
  try {
    requirementSupported = requirements.isSetSupported(
      NESTED_APP_AUTH_REQUIREMENT_SET,
      NESTED_APP_AUTH_MIN_VERSION,
    ) === true;
  } catch {
    return Object.freeze({ supported: false, requirementSupported: false, bridgeAvailable: false, reason: AUTH_ERROR_CODES.nestedAppAuthUnsupported });
  }
  const bridgeAvailable = Boolean(window?.nestedAppAuthBridge);
  return Object.freeze({
    supported: requirementSupported && bridgeAvailable,
    requirementSupported,
    bridgeAvailable,
    reason: requirementSupported && bridgeAvailable
      ? null
      : requirementSupported
        ? AUTH_ERROR_CODES.nestedAppAuthUnavailable
        : AUTH_ERROR_CODES.nestedAppAuthUnsupported,
  });
}

export function parseExchangeResponse(payload = {}, status = 200) {
  if (status === 401 || status === 403) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.sessionExchangeInvalid,
      "LawOS 로그인을 확인해 주세요.",
      { status, api_code: firstText(payload.safe_error_code, payload.safe_error_codes?.[0], payload.reason) },
    );
  }
  const token = firstText(
    payload.session_token,
    payload.token,
    payload.item?.session_token,
    payload.item?.token,
    payload.session?.session_token,
    payload.session?.token,
    payload.data?.session_token,
  );
  if (!isLawosSessionToken(token)) {
    throw createAddinAuthError(
      AUTH_ERROR_CODES.sessionExchangeInvalid,
      "LawOS 세션을 발급받지 못했습니다.",
      { status, token_material_returned: false },
    );
  }
  return token;
}

export function parseSessionValidation(payload = {}, status = 200) {
  const safeCode = firstText(
    payload.safe_error_code,
    payload.safe_error_codes?.[0],
    payload.reason,
  );
  if (status < 200 || status >= 300 || payload.ok === false || payload.authenticated === false) {
    return Object.freeze({ authenticated: false, safe_error_code: safeCode || AUTH_ERROR_CODES.sessionInvalid });
  }
  return Object.freeze({
    authenticated: true,
    principal: payload.principal ?? payload.item?.principal ?? payload.session?.principal ?? null,
    session: payload.session ?? payload.item?.session ?? payload.item ?? null,
  });
}

export function parseDialogMessage({
  origin,
  expectedOrigin,
  rawMessage,
  expectedState,
} = {}) {
  if (text(origin) !== text(expectedOrigin)) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogOriginInvalid, "OAuth 대화상자 출처를 확인할 수 없습니다.");
  }
  let message = rawMessage;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 대화상자 응답 형식이 올바르지 않습니다.");
    }
  }
  if (!message || typeof message !== "object" || message.type !== OAUTH_DIALOG_MESSAGE_TYPE) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 대화상자 응답을 확인할 수 없습니다.");
  }
  const state = text(message.state);
  if (!state || state !== text(expectedState)) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogStateMismatch, "OAuth 연결 요청이 만료되었거나 일치하지 않습니다.");
  }
  if (text(message.error)) {
    throw createAddinAuthError("OUTLOOK_OAUTH_PROVIDER_ERROR", "Microsoft 연결이 완료되지 않았습니다.", { provider_error: text(message.error) });
  }
  const code = text(message.code);
  if (!code) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 대화상자 응답에 코드가 없습니다.");
  }
  return Object.freeze({ type: message.type, state, code });
}

export function buildOAuthStartUrl({ origin, path = DEFAULT_OAUTH_START_PATH, authorizationUrl, state } = {}) {
  const targetOrigin = text(origin);
  if (!targetOrigin || !text(authorizationUrl) || !text(state)) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 연결 정보를 만들 수 없습니다.");
  }
  const url = new URL(path, targetOrigin);
  if (url.origin !== targetOrigin) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogOriginInvalid, "OAuth 대화상자 주소가 현재 add-in과 다릅니다.");
  }
  url.hash = new URLSearchParams({ authorization_url: authorizationUrl, state }).toString();
  return url.href;
}

/**
 * Open the Office OAuth dialog and complete exactly one validated response.
 *
 * Keeping the dialog lifecycle here makes the host-specific bridge injectable
 * in tests while the task pane only supplies the API completion callback.
 */
export function openOfficeOAuthDialog({
  Office = globalThis.Office,
  window = globalThis.window,
  location = window?.location ?? globalThis.location,
  origin = location?.origin,
  authorizationUrl,
  state,
  callbackUri,
  path = DEFAULT_OAUTH_START_PATH,
  onComplete,
  timeoutMs = OUTLOOK_OAUTH_DIALOG_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  const office = Office ?? window?.Office ?? globalThis.Office;
  const dialogApi = office?.context?.ui;
  if (typeof dialogApi?.displayDialogAsync !== "function") {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "이 Outlook 환경에서는 연결 창을 열 수 없습니다.");
  }
  if (typeof onComplete !== "function") {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 연결 완료 처리가 설정되지 않았습니다.");
  }
  if (
    !Number.isSafeInteger(timeoutMs)
    || timeoutMs < 1
    || typeof setTimeoutImpl !== "function"
    || typeof clearTimeoutImpl !== "function"
  ) {
    throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "OAuth 연결 제한 시간이 올바르지 않습니다.");
  }
  const expectedOrigin = text(origin);
  const dialogUrl = buildOAuthStartUrl({
    origin: expectedOrigin,
    path,
    authorizationUrl,
    state,
  });
  const dialogOptions = { ...OUTLOOK_OAUTH_DIALOG_OPTIONS };

  return new Promise((resolve, reject) => {
    let settled = false;
    let handlingMessage = false;
    let dialog = null;
    let timer = null;

    const closeDialog = () => {
      try { dialog?.close?.(); } catch { /* best effort */ }
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeoutImpl(timer);
      closeDialog();
      if (error) reject(error); else resolve();
    };
    const messageHandler = async (event) => {
      if (settled || handlingMessage) return;
      handlingMessage = true;
      try {
        const message = parseDialogMessage({
          origin: event?.origin,
          expectedOrigin,
          rawMessage: event?.message,
          expectedState: state,
        });
        await onComplete({ ...message, callbackUri });
        finish();
      } catch (error) {
        finish(error);
      } finally {
        handlingMessage = false;
      }
    };

    timer = setTimeoutImpl(() => {
      finish(createAddinAuthError(
        AUTH_ERROR_CODES.dialogTimeout,
        "Outlook 연결 요청 시간이 만료되었습니다.",
      ));
    }, timeoutMs);

    try {
      dialogApi.displayDialogAsync(
        dialogUrl,
        dialogOptions,
        (result) => {
          const successStatus = office?.AsyncResultStatus?.Succeeded ?? "succeeded";
          const succeeded = result?.status === successStatus
            || result?.status === "succeeded"
            || result?.status === 0;
          dialog = result?.value ?? null;
          if (!succeeded) {
            finish(createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "연결 창을 열지 못했습니다."));
            return;
          }
          if (typeof dialog?.addEventHandler !== "function") {
            finish(createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "연결 응답을 받을 수 없습니다."));
            return;
          }
          const eventType = office?.EventType?.DialogMessageReceived ?? "DialogMessageReceived";
          const errorType = office?.EventType?.DialogEventReceived ?? "DialogEventReceived";
          try {
            dialog.addEventHandler(eventType, messageHandler);
            dialog.addEventHandler(errorType, (event) => {
              if (event?.error) {
                finish(createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "연결 창이 닫혔습니다.", { dialog_error: event.error }));
              }
            });
          } catch (error) {
            finish(createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "연결 응답을 받을 수 없습니다.", { cause: error }));
          }
        },
      );
    } catch (error) {
      finish(createAddinAuthError(AUTH_ERROR_CODES.dialogUnavailable, "연결 창을 열지 못했습니다.", { cause: error }));
    }
  });
}

export function createSessionStore({
  sessionStorage = globalThis.sessionStorage,
  officeStorage = globalThis.OfficeRuntime?.storage,
  key = LAWOS_SESSION_STORAGE_KEY,
} = {}) {
  async function readSessionStorage() {
    try { return text(sessionStorage?.getItem?.(key)); } catch { return ""; }
  }
  async function readOfficeStorage() {
    try { return text(await officeStorage?.getItem?.(key)); } catch { return ""; }
  }
  return Object.freeze({
    async get() {
      const sessionToken = await readSessionStorage();
      if (isLawosSessionToken(sessionToken)) return sessionToken;
      if (sessionToken) {
        try { sessionStorage?.removeItem?.(key); } catch { /* best effort */ }
      }
      const officeToken = await readOfficeStorage();
      if (isLawosSessionToken(officeToken)) return officeToken;
      if (officeToken) {
        try { await officeStorage?.removeItem?.(key); } catch { /* best effort */ }
      }
      return "";
    },
    async set(token) {
      if (!isLawosSessionToken(token)) {
        throw createAddinAuthError(AUTH_ERROR_CODES.sessionExchangeInvalid, "LawOS 세션만 저장할 수 있습니다.");
      }
      const value = text(token);
      try { await officeStorage?.setItem?.(key, value); } catch { /* Storage is optional in command contexts. */ }
      try { sessionStorage?.setItem?.(key, value); } catch { /* Storage is optional in command contexts. */ }
      return value;
    },
    async clear() {
      try { await officeStorage?.removeItem?.(key); } catch { /* best effort */ }
      try { sessionStorage?.removeItem?.(key); } catch { /* best effort */ }
    },
  });
}
