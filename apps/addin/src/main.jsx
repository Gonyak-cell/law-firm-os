import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Archive,
  Check,
  FileText,
  FolderDown,
  Link2,
  MailCheck,
  ShieldCheck,
  TimerReset,
  UserPlus,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { createNestablePublicClientApplication } from "@azure/msal-browser";
import {
  buildInquiryRegistrationRequest,
  inquiryResultCopy,
  outlookActionErrorMessage,
} from "./inquiry-actions.js";
import {
  resolveCurrentOutlookRestMessageId,
} from "./outlook-item-id.js";
import {
  OUTLOOK_ITEM_CONTENT_ERROR_CODES,
  assertStableOutlookItemIdentity,
  readOutlookAttachments,
  readOutlookComposeMessage,
  readOutlookItemBody,
  readOutlookItemClassification,
  readOutlookItemTimestamps,
} from "./outlook-item-content.js";
import { saveOutlookAttachments } from "./outlook-attachment-actions.js";
import { createOutlookFilingRequest } from "./outlook-filing.js";
import {
  AUTH_ERROR_CODES,
  AUTH_STATE,
  GRAPH_STATE,
  LAWOS_SESSION_STORAGE_KEY,
  createAddinAuthError,
  createSessionStore,
  detectNestedAppAuth,
  loadOfficeSsoConfig,
  openOfficeOAuthDialog,
  parseExchangeResponse,
  parseSessionValidation,
} from "./addin-auth.js";
import {
  createRegistrationLatch,
  startOfficeTaskPane,
  waitForOfficeReady,
} from "./office-ready.js";
import {
  handleOutlookMessageSend,
  registerOutlookSendHandler,
} from "./outlook-send-events.js";
import {
  isFiledEmailContextCurrent,
  isOutlookActionContextCurrent,
  isSameOutlookItem,
  outlookItemIdentityKey,
  subscribeToOutlookItemChanges,
} from "./outlook-item-events.js";
import {
  DEFAULT_ADDIN_API_TIMEOUT_MS,
  fetchAddinApi,
} from "./addin-http.js";
import {
  disconnectCurrentOutlookConnection,
  isOutlookConnectionDisconnected,
  outlookConnectionPayload,
  parseOutlookConnectionRecord,
} from "./outlook-connection-actions.js";
import "./styles.css";

const ADDIN_SESSION_STORAGE_KEY = LAWOS_SESSION_STORAGE_KEY;
let msalBridgePromise = null;
let runtimeConfigPromise = null;
let sessionStore = null;
let authRecoveryPromise = null;
let officeReadyPromise = null;
let unauthorizedHandler = null;
let sessionRecoveredHandler = null;
const OFFICE_READY_EVENT = "lawos:office-ready";
const CLIENT_OUTLOOK_CALLBACK_MODE = "server_complete_v1";

function authStorage() {
  if (!sessionStore) {
    sessionStore = createSessionStore({
      sessionStorage: window.sessionStorage,
      officeStorage: window.OfficeRuntime?.storage,
      key: ADDIN_SESSION_STORAGE_KEY,
    });
  }
  return sessionStore;
}

async function runtimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadOfficeSsoConfig({
      location: window.location,
      fetchImpl: (url, options) => fetchAddinApi({
        url,
        options,
        fetchImpl: window.fetch.bind(window),
      }),
    }).catch((error) => {
      runtimeConfigPromise = null;
      throw error;
    });
  }
  return runtimeConfigPromise;
}

async function apiBaseUrl() {
  const config = await runtimeConfig();
  return config.apiBase;
}

async function addinSessionToken() {
  return authStorage().get();
}

async function ensureOfficeReady() {
  if (officeReadyPromise) return officeReadyPromise;
  officeReadyPromise = waitForOfficeReady({
    Office: window.Office,
    onLateReady: () => {
      officeReadyPromise = Promise.resolve({ status: "ready" });
      window.dispatchEvent(new window.Event(OFFICE_READY_EVENT));
    },
  });
  return officeReadyPromise;
}

async function initializeMsalBridge() {
  if (!msalBridgePromise) {
    msalBridgePromise = (async () => {
      await ensureOfficeReady();
      const config = await runtimeConfig();
      const support = detectNestedAppAuth({ Office: window.Office, window });
      if (!support.supported) {
        throw createAddinAuthError(
          support.reason ?? AUTH_ERROR_CODES.nestedAppAuthUnavailable,
          "이 Outlook 환경에서는 Nested App Auth 1.1을 사용할 수 없습니다.",
          { nested_app_auth: support },
        );
      }
      const instance = await createNestablePublicClientApplication({
        auth: {
          clientId: config.clientId,
          authority: config.authority,
          redirectUri: config.naaRedirectUri,
          postLogoutRedirectUri: config.naaRedirectUri,
        },
        cache: {
          // Graph/NAA tokens are memory-only and never persisted by LawOS.
          cacheLocation: "memoryStorage",
          storeAuthStateInCookie: false,
        },
      });
      const accounts = instance.getAllAccounts();
      const receipt = {
        configured: true,
        initialized: true,
        account_count: accounts.length,
        scopes: config.scopes,
        nested_app_auth: "1.1",
        provider_runtime_executed: false,
        graph_request_executed: false,
        token_material_returned: false,
        production_write_claim: false,
      };
      recordOutlookEventProbe("msal_bridge", receipt);
      return { ...receipt, instance, config, receipt };
    })().catch((error) => {
      msalBridgePromise = null;
      throw error;
    });
  }
  return msalBridgePromise;
}

async function rawRequestJson(path, {
  method = "GET",
  body,
  headers: requestHeaders = {},
  includeSession = true,
  retryAfterUnauthorized = true,
  timeoutMs = DEFAULT_ADDIN_API_TIMEOUT_MS,
} = {}) {
  const baseUrl = await apiBaseUrl();
  const token = includeSession ? await addinSessionToken() : "";
  const headers = {
    "content-type": "application/json",
    ...requestHeaders,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetchAddinApi({
    url: `${baseUrl}${path}`,
    timeoutMs,
    fetchImpl: window.fetch.bind(window),
    options: {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error("API_RESPONSE_INVALID");
    error.safe_error_code = "API_RESPONSE_INVALID";
    throw error;
  }
  if (!response.ok) {
    const code = payload.safe_error_codes?.[0]
      ?? payload.safe_error_code
      ?? payload.message
      ?? "request_failed";
    const error = new Error(code);
    error.safe_error_code = code;
    error.status = response.status;
    error.payload = payload;
    if (response.status === 401 && includeSession && retryAfterUnauthorized) {
      await authStorage().clear();
      unauthorizedHandler?.();
    }
    throw error;
  }
  return payload;
}

async function requestJson(path, options = {}) {
  try {
    return await rawRequestJson(path, options);
  } catch (error) {
    if (error?.status === 401 && options.includeSession !== false && options.retryAfterUnauthorized !== false) {
      try {
        await acquireLawosSession({ interactive: false, force: true });
        const retried = await rawRequestJson(path, { ...options, retryAfterUnauthorized: false });
        sessionRecoveredHandler?.();
        return retried;
      } catch {
        // A command/event path must remain non-interactive and fail closed.
      }
    }
    throw error;
  }
}

async function validateLawosSession() {
  const token = await addinSessionToken();
  if (!token) return { authenticated: false, safe_error_code: "AUTH_SESSION_REQUIRED" };
  try {
    const payload = await rawRequestJson("/api/auth/session", { retryAfterUnauthorized: false });
    return parseSessionValidation(payload, 200);
  } catch (error) {
    if (error?.status === 401) {
      await authStorage().clear();
      return { authenticated: false, safe_error_code: error.safe_error_code ?? "AUTH_SESSION_INVALID" };
    }
    throw error;
  }
}

async function acquireLawosSession({ interactive = false, force = false } = {}) {
  if (authRecoveryPromise && !interactive) return authRecoveryPromise;
  const run = (async () => {
    if (!force) {
      const existing = await validateLawosSession();
      if (existing.authenticated) return existing;
    }
    const bridge = await initializeMsalBridge();
    const activeAccount = bridge.instance.getActiveAccount?.() ?? null;
    const silentRequest = {
      scopes: bridge.config.scopes,
      ...(activeAccount ? { account: activeAccount } : {}),
    };
    let result;
    if (interactive && force) {
      result = await bridge.instance.acquireTokenPopup({
        scopes: bridge.config.scopes,
        prompt: "select_account",
      });
    } else {
      try {
        result = await bridge.instance.acquireTokenSilent(silentRequest);
      } catch (error) {
        if (!interactive) {
          throw createAddinAuthError("LAWOS_INTERACTION_REQUIRED", "로그인을 눌러 AMIC OS에 로그인해 주세요.", { cause: error });
        }
        result = await bridge.instance.acquireTokenPopup({
          scopes: bridge.config.scopes,
          prompt: "select_account",
        });
      }
    }
    if (result?.account) {
      bridge.instance.setActiveAccount?.(result.account);
    }
    const entraAccessToken = typeof result?.accessToken === "string" ? result.accessToken : "";
    if (!entraAccessToken) {
      throw createAddinAuthError(AUTH_ERROR_CODES.sessionExchangeInvalid, "Microsoft 로그인 토큰을 받지 못했습니다.");
    }
    const exchange = await rawRequestJson("/api/auth/office-sso/exchange", {
      method: "POST",
      includeSession: false,
      retryAfterUnauthorized: false,
      body: { access_token: entraAccessToken },
    });
    // Drop the Entra token before storing or returning the LawOS session.
    const lawosToken = parseExchangeResponse(exchange, 200);
    await authStorage().set(lawosToken);
    return validateLawosSession();
  })();
  if (!interactive) {
    authRecoveryPromise = run.finally(() => { authRecoveryPromise = null; });
  }
  return run;
}

function recordOutlookEventProbe(key, value) {
  window.__LAWOS_OUTLOOK_EVENT_PROBE = {
    ...(window.__LAWOS_OUTLOOK_EVENT_PROBE ?? {}),
    [key]: value,
  };
}

function completeSendEvent(event, payload = {}) {
  const completion = { allowEvent: true, ...payload };
  recordOutlookEventProbe("last_completion", {
    allowEvent: completion.allowEvent,
    completed_at: new Date().toISOString(),
  });
  if (typeof event?.completed === "function") event.completed(completion);
  return completion;
}

function officeItemSnapshot() {
  const item = window.Office?.context?.mailbox?.item;
  if (!item) return null;
  let graphMessageId = null;
  try {
    graphMessageId = resolveCurrentOutlookRestMessageId({ Office: window.Office }).rest_message_id;
  } catch {
    // Smart-alert metadata can still be inspected, but filing must fail
    // closed when Office cannot provide a REST-stable message identity.
  }
  return {
    graph_message_id: graphMessageId,
    internet_message_id: typeof item.internetMessageId === "string" && item.internetMessageId.trim() ? item.internetMessageId : null,
    conversation_id: typeof item.conversationId === "string" && item.conversationId.trim() ? item.conversationId : null,
    from: item.from ? { name: item.from.displayName, email: item.from.emailAddress } : { name: null, email: null },
    to: Array.isArray(item.to) ? item.to.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    cc: Array.isArray(item.cc) ? item.cc.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    bcc: [],
    subject: item.subject ?? "제목 없음",
    body_preview: "",
    mailbox_ref: "mailbox:officejs",
    account_ref: window.Office?.context?.mailbox?.userProfile?.emailAddress ?? null,
    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((attachment) => ({
          attachment_id: attachment.id,
          name: attachment.name,
          content_type: attachment.contentType,
          size: attachment.size,
        }))
      : [],
  };
}

async function readCurrentOutlookItem({ includeAttachments = false, includeTimestamps = false, requireStableIdentity = false, allowBodyReadFailure = false } = {}) {
  const snapshot = officeItemSnapshot();
  if (!snapshot) return null;
  if (requireStableIdentity) assertStableOutlookItemIdentity(snapshot);
  const officeItem = window.Office?.context?.mailbox?.item;
  let bodyText = "";
  try {
    bodyText = await readOutlookItemBody({ item: officeItem, Office: window.Office });
  } catch (error) {
    if (!allowBodyReadFailure) throw error;
  }
  const classification = await readOutlookItemClassification({ item: officeItem });
  const next = {
    ...snapshot,
    attachments: snapshot.attachments.map((attachment) => ({
      ...attachment,
      ...classification,
    })),
    ...(includeTimestamps ? await readOutlookItemTimestamps({ item: officeItem }) : {}),
    // Only the bounded preview crosses the LawOS boundary. Raw body text is
    // never sent or persisted by this Add-in.
    body_preview: bodyText.slice(0, 500),
  };
  if (!includeAttachments) {
    if (requireStableIdentity && !isSameOutlookItem(snapshot, officeItemSnapshot())) {
      throw itemChangedDuringActionError();
    }
    return next;
  }
  const attachments = await readOutlookAttachments({
    item: officeItem,
    attachments: Array.isArray(officeItem?.attachments) ? officeItem.attachments : [],
    Office: window.Office,
  });
  if (requireStableIdentity && !isSameOutlookItem(snapshot, officeItemSnapshot())) {
    throw itemChangedDuringActionError();
  }
  return { ...next, ...attachments };
}

async function addWarningNotification(alertBody) {
  const warnings = alertBody?.item?.warnings ?? [];
  const notificationMessages = window.Office?.context?.mailbox?.item?.notificationMessages;
  if (warnings.length === 0 || typeof notificationMessages?.addAsync !== "function") return;
  const messageType = window.Office?.MailboxEnums?.ItemNotificationMessageType?.InformationalMessage ?? "informationalMessage";
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
}

export async function onMessageSendHandler(event = {}) {
  return handleOutlookMessageSend({
    event: {
      completed: (payload) => completeSendEvent(event, payload),
    },
    readMessage: (options) => readOutlookComposeMessage({
      item: window.Office?.context?.mailbox?.item,
      mailbox: window.Office?.context?.mailbox,
      Office: window.Office,
      ...options,
    }),
    requestJson,
    addWarningNotification,
    record: recordOutlookEventProbe,
  });
}

function registerOutlookEventHandlers() {
  // Commands may run without a mounted React pane. Keep this hook silent and
  // non-interactive: the handler never opens a popup or Office dialog.
  window.__LAWOS_INIT_MSAL_BRIDGE = initializeMsalBridge;
  window.__LAWOS_RESOLVE_CURRENT_OUTLOOK_REST_MESSAGE_ID =
    () => resolveCurrentOutlookRestMessageId({
      Office: window.Office,
    });
  window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS = {
    ...(window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS ?? {}),
    onMessageSendHandler,
  };
  const associated = new Set(window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS ?? []);
  const registered = registerOutlookSendHandler({
    Office: window.Office,
    handler: onMessageSendHandler,
  });
  if (registered) {
    associated.add("onMessageSendHandler");
  }
  window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS = [...associated];
  return registered;
}

const registerOutlookEventHandlersOnce = createRegistrationLatch(registerOutlookEventHandlers);

function oauthStateFromAuthorizationUrl(authorizationUrl) {
  try { return new URL(authorizationUrl).searchParams.get("state") ?? ""; } catch { return ""; }
}

function itemChangedDuringActionError() {
  return Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
    safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
    user_message: "처리 중 다른 메일로 이동했습니다. 완료된 기록은 Matter에서 확인하고, 현재 메일은 다시 처리해 주세요.",
  });
}

function actionContextChangedError() {
  return Object.assign(new Error("OUTLOOK_ACTION_CONTEXT_CHANGED"), {
    safe_error_code: "OUTLOOK_ACTION_CONTEXT_CHANGED",
    user_message: "처리 중 메일 또는 Matter 선택이 바뀌었습니다. 완료된 기록은 Matter에서 확인하고, 현재 선택은 다시 처리해 주세요.",
  });
}

function filedEmailDoesNotMatchError() {
  return Object.assign(new Error("OUTLOOK_FILED_EMAIL_MISMATCH"), {
    safe_error_code: "OUTLOOK_FILED_EMAIL_MISMATCH",
    user_message: "현재 메일을 먼저 선택한 Matter에 보관한 뒤 다시 시도해 주세요.",
  });
}

function StatusLine({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <div className={`status-line ${tone}`}>
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function outcomeLabel(value, fallback) {
  return {
    created: "보관 완료",
    attachments_saved: "첨부 저장 완료",
    idempotent_replay: "이미 처리됨",
  }[value] ?? fallback;
}

function busyLabel(value) {
  return {
    new_inquiry: "새 문의를 등록하고 있습니다.",
    link_inquiry: "기존 문의에 연결하고 있습니다.",
    file: "Matter에 메일을 보관하고 있습니다.",
    sent_file: "보낸 메일을 Matter에 보관하고 있습니다.",
    attachments: "첨부 파일을 저장하고 있습니다.",
    followup: "후속 업무를 만들고 있습니다.",
    alerts: "발송 전 확인 사항을 점검하고 있습니다.",
  }[value] ?? "처리하고 있습니다.";
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATE.loading);
  const [authError, setAuthError] = useState("");
  const [graphConnection, setGraphConnection] = useState({ state: GRAPH_STATE.loading, status: "loading", stateVersion: 0, missingScopes: [] });
  const [disconnectConfirmationOpen, setDisconnectConfirmationOpen] = useState(false);
  const [matters, setMatters] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState("");
  const selectedMatterIdRef = useRef("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [inquiryResult, setInquiryResult] = useState(null);
  const [emailResult, setEmailResult] = useState(null);
  const [attachmentResult, setAttachmentResult] = useState(null);
  const [followupResult, setFollowupResult] = useState(null);
  const [alertResult, setAlertResult] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [item, setItem] = useState(() => officeItemSnapshot());
  const [officeReadyEpoch, setOfficeReadyEpoch] = useState(0);
  const itemAvailable = item !== null;
  const authenticated = authState === AUTH_STATE.authenticated;
  const graphConnected = graphConnection.state === GRAPH_STATE.connected;
  const credentialCleanupPending = graphConnection.status === "revoked"
    && graphConnection.credentialCleanupPending === true;
  const readyForBusiness = authenticated && graphConnected;

  useEffect(() => {
    if (!graphConnected) setDisconnectConfirmationOpen(false);
  }, [graphConnected]);

  function resetItemActionResults() {
    setInquiryResult(null);
    setEmailResult(null);
    setAttachmentResult(null);
    setFollowupResult(null);
    setAlertResult(null);
  }

  function selectMatter(matterId) {
    selectedMatterIdRef.current = matterId;
    setSelectedMatterId(matterId);
    setEmailResult(null);
    setAttachmentResult(null);
    setFollowupResult(null);
  }

  function actionErrorMessage(error) {
    if (error?.user_message) return error.user_message;
    if (error?.safe_error_code === "LAWOS_INTERACTION_REQUIRED" || error?.safe_error_code === "AUTH_SESSION_REQUIRED") {
      return "AMIC OS에 로그인한 뒤 다시 시도해 주세요.";
    }
    if (error?.safe_error_code === "ADDIN_API_REQUEST_TIMEOUT") {
      return "AMIC OS 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (error?.safe_error_code === "OUTLOOK_OAUTH_PROVIDER_ERROR") {
      return "Microsoft 연결을 완료하지 않았습니다. 다시 시도해 주세요.";
    }
    if (error?.safe_error_code === AUTH_ERROR_CODES.dialogUnavailable) {
      return "Microsoft 연결 창을 열지 못했습니다. Outlook에서 다시 시도해 주세요.";
    }
    if (error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable || error?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported) {
      return "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다.";
    }
    if (
      error?.safe_error_code === "OUTLOOK_OAUTH_CALLBACK_INVALID"
      || error?.safe_error_code === AUTH_ERROR_CODES.dialogStateMismatch
      || error?.safe_error_code === AUTH_ERROR_CODES.dialogTimeout
      || error?.safe_error_code === AUTH_ERROR_CODES.dialogOriginInvalid
      || error?.safe_error_code === AUTH_ERROR_CODES.dialogMessageInvalid
    ) {
      return "Outlook 연결 요청이 만료되었거나 일치하지 않습니다.";
    }
    if (error?.safe_error_code === OUTLOOK_ITEM_CONTENT_ERROR_CODES.item_identity_required) {
      return "실제 Outlook 메일 식별자를 확인할 수 없어 이 메일을 저장하지 않았습니다. Outlook에서 받은 메일을 다시 열어 주세요.";
    }
    return outlookActionErrorMessage(error);
  }

  async function loadBase() {
    setError("");
    const [boot, matterBody, inquiryBody] = await Promise.all([
      requestJson("/api/outlook/bootstrap"),
      requestJson("/api/outlook/matters?limit=50"),
      requestJson("/api/outlook/inquiries?limit=50"),
    ]);
    const nextMatters = matterBody.items ?? [];
    const nextMatterId = nextMatters[0]?.matter_id ?? "";
    const nextInquiries = inquiryBody.items ?? [];
    setBootstrap(boot.item);
    setMatters(nextMatters);
    selectMatter(nextMatterId);
    setInquiries(nextInquiries);
    setSelectedLeadId(nextInquiries[0]?.lead_id ?? "");
    await refreshMatter(nextMatterId);
  }

  async function loadInquiries() {
    const body = await requestJson("/api/outlook/inquiries?limit=50");
    const nextInquiries = body.items ?? [];
    setInquiries(nextInquiries);
    setSelectedLeadId((current) => (
      nextInquiries.some((inquiry) => inquiry.lead_id === current)
        ? current
        : nextInquiries[0]?.lead_id ?? ""
    ));
  }

  async function refreshMatter(matterId = selectedMatterId) {
    if (!matterId) {
      setTimeline([]);
      setDocuments([]);
      return;
    }
    const [timelineBody, documentBody] = await Promise.all([
      requestJson(`/api/outlook/matters/${encodeURIComponent(matterId)}/timeline`),
      requestJson(`/api/outlook/matters/${encodeURIComponent(matterId)}/documents`),
    ]);
    setTimeline(timelineBody.item?.visible_entries ?? []);
    setDocuments(documentBody.items ?? []);
  }

  async function refreshGraphConnection({ loadBusinessData = true } = {}) {
    const body = await requestJson("/api/outlook/connection");
    const next = parseOutlookConnectionRecord(body);
    setGraphConnection(next);
    if (loadBusinessData && next.state === GRAPH_STATE.connected) {
      try {
        await loadBase();
      } catch (error) {
        // Keep the real connection status even if a secondary business read
        // fails; callers can show the read error without inventing a logout.
        if (error && typeof error === "object") error.graph_connection_state = next.state;
        throw error;
      }
    } else if (next.state !== GRAPH_STATE.connected) {
      setBootstrap(null);
      setMatters([]);
      setInquiries([]);
      setTimeline([]);
      setDocuments([]);
      resetItemActionResults();
    }
    return next;
  }

  useEffect(() => {
    const handleLateOfficeReady = () => setOfficeReadyEpoch((current) => current + 1);
    window.addEventListener(OFFICE_READY_EVENT, handleLateOfficeReady);
    return () => window.removeEventListener(OFFICE_READY_EVENT, handleLateOfficeReady);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    void ensureOfficeReady().then(() => {
      if (cancelled) return;
      setItem(officeItemSnapshot());
      unsubscribe = subscribeToOutlookItemChanges({
        Office: window.Office,
        onChange: () => {
          setItem(officeItemSnapshot());
          resetItemActionResults();
          setError("");
        },
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [officeReadyEpoch]);

  useEffect(() => {
    let cancelled = false;
    unauthorizedHandler = () => {
      if (cancelled) return;
      setAuthState(AUTH_STATE.loginRequired);
      setAuthError("세션이 만료되었습니다. 다시 로그인해 주세요.");
      setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
      setBootstrap(null);
      setMatters([]);
      setInquiries([]);
      setTimeline([]);
      setDocuments([]);
    };
    sessionRecoveredHandler = () => {
      if (cancelled) return;
      setAuthState(AUTH_STATE.authenticated);
      setAuthError("");
      refreshGraphConnection().catch((nextError) => setError(actionErrorMessage(nextError)));
    };
    (async () => {
      try {
        await runtimeConfig();
        if (cancelled) return;
        setAuthState(AUTH_STATE.acquiring);
        const session = await acquireLawosSession({ interactive: false });
        if (!session?.authenticated) {
          setAuthState(AUTH_STATE.loginRequired);
          setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
          return;
        }
        if (cancelled) return;
        setAuthState(AUTH_STATE.authenticated);
        setAuthError("");
        try {
          await refreshGraphConnection();
        } catch (nextError) {
          if (nextError?.graph_connection_state !== GRAPH_STATE.connected) {
            setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
          }
          setError(actionErrorMessage(nextError));
        }
      } catch (nextError) {
        if (cancelled) return;
        const code = nextError?.safe_error_code;
        if (code === "LAWOS_INTERACTION_REQUIRED" || code === "AUTH_SESSION_REQUIRED") {
          setAuthState(AUTH_STATE.loginRequired);
        } else if (code === AUTH_ERROR_CODES.nestedAppAuthUnavailable || code === AUTH_ERROR_CODES.nestedAppAuthUnsupported) {
          setAuthState(AUTH_STATE.unavailable);
          setAuthError(actionErrorMessage(nextError));
        } else {
          setAuthState(AUTH_STATE.loginRequired);
          setAuthError(actionErrorMessage(nextError));
        }
      }
    })();
    return () => {
      cancelled = true;
      if (unauthorizedHandler) unauthorizedHandler = null;
      if (sessionRecoveredHandler) sessionRecoveredHandler = null;
    };
  }, [officeReadyEpoch]);

  async function signIn() {
    setBusy("login");
    setAuthState(AUTH_STATE.acquiring);
    setAuthError("");
    setError("");
    try {
      const session = await acquireLawosSession({ interactive: true, force: true });
      if (!session?.authenticated) throw createAddinAuthError("AUTH_SESSION_REQUIRED", "AMIC OS 로그인을 확인해 주세요.");
      setAuthState(AUTH_STATE.authenticated);
      try {
        await refreshGraphConnection();
      } catch (nextError) {
        if (nextError?.graph_connection_state !== GRAPH_STATE.connected) {
          setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
        }
        setError(actionErrorMessage(nextError));
      }
    } catch (nextError) {
      setAuthState(nextError?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable || nextError?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported ? AUTH_STATE.unavailable : AUTH_STATE.loginRequired);
      setAuthError(actionErrorMessage(nextError));
    } finally {
      setBusy("");
    }
  }

  async function connectOutlook() {
    const previousGraphState = graphConnection.state;
    if (previousGraphState !== GRAPH_STATE.connected) {
      setGraphConnection((current) => ({ ...current, state: GRAPH_STATE.connecting }));
    }
    setBusy("connect");
    setError("");
    try {
      const config = await runtimeConfig();
      const started = await requestJson("/api/outlook/connection/authorize", {
        method: "POST",
        headers: {
          "x-lawos-outlook-callback-mode": CLIENT_OUTLOOK_CALLBACK_MODE,
        },
        body: { redirect_uri: config.callbackUri },
      });
      const item = outlookConnectionPayload(started);
      const authorizationUrl = item?.authorization_url ?? started?.authorization_url;
      const attemptRef = item?.attempt_ref ?? started?.attempt_ref;
      const state = item?.state ?? started?.state ?? oauthStateFromAuthorizationUrl(authorizationUrl);
      if (!authorizationUrl || !state) {
        throw createAddinAuthError(AUTH_ERROR_CODES.dialogMessageInvalid, "Outlook 연결 주소를 받지 못했습니다.");
      }
      await openOfficeOAuthDialog({
        Office: window.Office,
        window,
        location: window.location,
        authorizationUrl,
        state,
        callbackUri: config.callbackUri,
        path: config.oauthStartPath,
        ...(attemptRef
          ? {
              checkAuthorizationAttempt: async () => {
                const body = await requestJson(
                  `/api/outlook/connection?attempt_ref=${encodeURIComponent(attemptRef)}`,
                );
                return outlookConnectionPayload(body)?.authorization_attempt?.status
                  === "complete";
              },
            }
          : {}),
        onComplete: async ({ code, state: callbackState, callbackUri }) => {
          await requestJson("/api/outlook/connection/complete", {
            method: "POST",
            body: { code, state: callbackState, redirect_uri: callbackUri },
          });
        },
      });
      await refreshGraphConnection();
    } catch (nextError) {
      if (previousGraphState !== GRAPH_STATE.connected && nextError?.graph_connection_state !== GRAPH_STATE.connected) {
        setGraphConnection((current) => ({
          ...current,
          state: previousGraphState === GRAPH_STATE.reconnectRequired
            ? GRAPH_STATE.reconnectRequired
            : GRAPH_STATE.notConnected,
        }));
      }
      setError(actionErrorMessage(nextError));
    } finally {
      setBusy("");
    }
  }

  async function disconnectOutlook() {
    if (!graphConnected && !credentialCleanupPending) return;
    setDisconnectConfirmationOpen(false);
    setGraphConnection((current) => ({ ...current, state: GRAPH_STATE.connecting }));
    setBusy("disconnect");
    setError("");
    try {
      const reason = "사용자가 Outlook 연결을 해제함";
      const result = await disconnectCurrentOutlookConnection({
        readConnection: async () => parseOutlookConnectionRecord(
          await requestJson("/api/outlook/connection"),
        ),
        deleteConnection: async (connection) => parseOutlookConnectionRecord(
          await requestJson(`/api/outlook/connection?expected_state_version=${encodeURIComponent(connection.stateVersion)}&reason=${encodeURIComponent(reason)}`, {
            method: "DELETE",
          }),
        ),
      });
      setGraphConnection(result.connection);
      if (isOutlookConnectionDisconnected(result.connection)) {
        setBootstrap(null);
        setMatters([]);
        setInquiries([]);
        setTimeline([]);
        setDocuments([]);
        resetItemActionResults();
      }
    } catch (nextError) {
      setGraphConnection(
        nextError?.authoritative_connection ?? graphConnection,
      );
      setError(actionErrorMessage(nextError));
    } finally {
      setBusy("");
    }
  }

  async function runAction(name, fn) {
    if (!readyForBusiness) {
      setError(authenticated ? "Outlook 연결 후 사용할 수 있습니다." : "AMIC OS 로그인 후 사용할 수 있습니다.");
      return;
    }
    if (!itemAvailable) {
      setError("Outlook에서 처리할 메일을 먼저 열어 주세요.");
      return;
    }
    setBusy(name);
    setError("");
    try {
      await fn();
    } catch (nextError) {
      setError(actionErrorMessage(nextError));
    } finally {
      setBusy("");
    }
  }

  async function registerInquiry(action) {
    const currentItem = officeItemSnapshot();
    assertStableOutlookItemIdentity(currentItem);
    const identity = resolveCurrentOutlookRestMessageId({
      Office: window.Office,
    });
    const request = await buildInquiryRegistrationRequest({
      action,
      rest_message_id: identity.rest_message_id,
      ...(action === "link_existing"
        ? { existing_lead_id: selectedLeadId }
        : {}),
    });
    const body = await requestJson("/api/outlook/inquiries", {
      method: "POST",
      body: request,
    });
    if (!isSameOutlookItem(currentItem, officeItemSnapshot())) {
      throw itemChangedDuringActionError();
    }
    setInquiryResult({
      action,
      outcome: body.outcome,
      item: body.item,
    });
    await loadInquiries();
  }

  async function fileEmail({ mode = "manual" } = {}) {
    const matterId = selectedMatterId;
    const currentItem = await readCurrentOutlookItem({ includeTimestamps: true, requireStableIdentity: true });
    const sourceItemKey = outlookItemIdentityKey(currentItem);
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      throw actionContextChangedError();
    }
    const filingRequest = createOutlookFilingRequest({
      matterId,
      email: currentItem,
      mode,
    });
    const body = await requestJson(filingRequest.path, {
      method: filingRequest.method,
      body: filingRequest.body,
    });
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      await refreshMatter(matterId);
      throw actionContextChangedError();
    }
    setEmailResult({
      ...body,
      filing_mode: mode,
      local_outlook_item_key: sourceItemKey,
      local_matter_id: matterId,
    });
    setAttachmentResult(null);
    setFollowupResult(null);
    await refreshMatter(matterId);
  }

  async function fileSentEmail() {
    return fileEmail({ mode: "sent" });
  }

  async function saveAttachments() {
    const matterId = selectedMatterId;
    const currentItem = await readCurrentOutlookItem({ includeAttachments: true, requireStableIdentity: true });
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      throw actionContextChangedError();
    }
    if (!isFiledEmailContextCurrent({ emailResult, currentItem, matterId })) {
      throw filedEmailDoesNotMatchError();
    }
    const { result, notices } = await saveOutlookAttachments({
      currentItem,
      matterId,
      emailResult,
      requestJson,
      errorMessage: outlookActionErrorMessage,
    });
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      await refreshMatter(matterId);
      throw actionContextChangedError();
    }
    setAttachmentResult(result);
    if (notices.length > 0) setError(`저장하지 않은 첨부: ${notices.join(", ")}`);
    await refreshMatter(matterId);
  }

  async function createFollowup() {
    const matterId = selectedMatterId;
    const currentItem = await readCurrentOutlookItem({ requireStableIdentity: true });
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      throw actionContextChangedError();
    }
    if (!isFiledEmailContextCurrent({ emailResult, currentItem, matterId })) {
      throw filedEmailDoesNotMatchError();
    }
    const threadId = emailResult?.email_thread?.email_thread_id ?? `thread:${currentItem.conversation_id}`;
    const dueAt = new Date(Date.now() + (24 * 60 * 60 * 1000))
      .toISOString();
    const body = await requestJson("/api/outlook/followups", {
      method: "POST",
      body: {
        matter_id: matterId,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: dueAt,
        source_email_thread_id: threadId,
      },
    });
    if (!isOutlookActionContextCurrent({
      sourceItem: currentItem,
      currentItem: officeItemSnapshot(),
      sourceMatterId: matterId,
      currentMatterId: selectedMatterIdRef.current,
    })) {
      await refreshMatter(matterId);
      throw actionContextChangedError();
    }
    setFollowupResult(body);
    await refreshMatter(matterId);
  }

  async function evaluateAlerts() {
    const currentItem = await readCurrentOutlookItem({ allowBodyReadFailure: true });
    if (!currentItem) throw itemChangedDuringActionError();
    const body = await requestJson("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: { message: currentItem },
    });
    if (!isSameOutlookItem(currentItem, officeItemSnapshot())) {
      throw itemChangedDuringActionError();
    }
    setAlertResult(body);
  }

  const selectedMatter = matters.find((matter) => matter.matter_id === selectedMatterId) ?? matters[0];
  const inquiryCopy = inquiryResult
    ? inquiryResultCopy(inquiryResult)
    : null;

  return (
    <main className="addin-shell" data-outlook-addin-taskpane="true">
      <header className="pane-header">
        <div>
          <p className="eyebrow">Outlook</p>
          <h1>메일 처리</h1>
        </div>
        <span className="mode-badge">확인 후 저장</span>
      </header>

      <section className="status-stack" aria-label="연결 상태" aria-live="polite" data-testid="connection-status">
        <StatusLine
          icon={ShieldCheck}
          label="AMIC OS 로그인"
          value={authState === AUTH_STATE.authenticated ? "로그인됨" : authState === AUTH_STATE.loading || authState === AUTH_STATE.acquiring ? "확인 중" : authState === AUTH_STATE.unavailable ? "사용 불가" : "로그인 필요"}
          tone={authState === AUTH_STATE.authenticated ? "good" : authState === AUTH_STATE.unavailable ? "warn" : "neutral"}
        />
        <StatusLine
          icon={MailCheck}
          label="Outlook 연결"
          value={graphConnected ? "연결됨" : credentialCleanupPending ? "연결 정보 정리 필요" : graphConnection.state === GRAPH_STATE.loading || graphConnection.state === GRAPH_STATE.connecting ? "확인 중" : graphConnection.state === GRAPH_STATE.reconnectRequired ? "다시 연결 필요" : "연결 필요"}
          tone={graphConnected ? "good" : credentialCleanupPending ? "warn" : "neutral"}
        />
        <StatusLine icon={AlertTriangle} label="발송 전 확인" value="안내만 표시" tone="warn" />
      </section>

      <section className="pane-section auth-section" aria-labelledby="auth-title" data-testid="auth-controls">
        <div className="section-title">
          <ShieldCheck size={15} />
          <h2 id="auth-title">연결 설정</h2>
        </div>
        {authState === AUTH_STATE.authenticated ? (
          <p className="safe-copy">AMIC OS에 로그인되어 있습니다.</p>
        ) : authState === AUTH_STATE.unavailable ? (
          <p className="error" role="alert">{authError || "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다."}</p>
        ) : (
          <>
            <p className="safe-copy">Client·Matter 기능을 쓰려면 AMIC OS 로그인이 필요합니다.</p>
            <button type="button" onClick={signIn} disabled={busy !== "" || authState === AUTH_STATE.loading || authState === AUTH_STATE.acquiring} data-testid="lawos-login-button">
              <ShieldCheck size={15} />
              {authState === AUTH_STATE.loading || authState === AUTH_STATE.acquiring ? "로그인 확인 중" : "AMIC OS 로그인"}
            </button>
            {authError ? <p className="field-note" role="status">{authError}</p> : null}
          </>
        )}
        {authenticated ? (
          <div className="connection-controls" data-testid="graph-controls">
            <p className="safe-copy">
              {graphConnected
                ? "Client·Matter용 Outlook 연결이 활성화되어 있습니다."
                : credentialCleanupPending
                  ? "Outlook 연결은 해제됐습니다. 저장된 연결 정보 정리를 다시 시도해 주세요."
                : graphConnection.state === GRAPH_STATE.loading || graphConnection.state === GRAPH_STATE.connecting
                  ? "Outlook 연결 상태를 확인하고 있습니다."
                : graphConnection.state === GRAPH_STATE.reconnectRequired
                  ? "Outlook을 다시 연결해 주세요."
                  : "Client·Matter 기능을 사용하려면 Outlook 연결이 필요합니다."}
            </p>
            <div className="button-row">
              {credentialCleanupPending ? (
                <button type="button" onClick={disconnectOutlook} disabled={busy !== ""} data-testid="outlook-cleanup-retry-button">
                  <RefreshCw size={15} />
                  연결 정보 정리 다시 시도
                </button>
              ) : (
                <button type="button" onClick={connectOutlook} disabled={busy !== "" || graphConnection.state === GRAPH_STATE.loading || graphConnection.state === GRAPH_STATE.connecting} data-testid="outlook-connect-button">
                  <RefreshCw size={15} />
                  {graphConnected ? "다시 연결" : "Outlook 연결"}
                </button>
              )}
              {graphConnected ? (
                <button className="secondary-button" type="button" onClick={() => setDisconnectConfirmationOpen(true)} disabled={busy !== ""} data-testid="outlook-disconnect-button">
                  <Unplug size={15} />
                  연결 해제
                </button>
              ) : null}
            </div>
            {graphConnected && disconnectConfirmationOpen ? (
              <div className="connection-controls" role="group" aria-label="Outlook 연결 해제 확인" data-testid="outlook-disconnect-confirmation">
                <p className="safe-copy">저장된 Outlook 연결과 토큰을 해제할까요?</p>
                <div className="button-row">
                  <button className="secondary-button" type="button" onClick={() => setDisconnectConfirmationOpen(false)} disabled={busy !== ""}>
                    취소
                  </button>
                  <button type="button" onClick={disconnectOutlook} disabled={busy !== ""} data-testid="outlook-disconnect-confirm-button">
                    연결 해제
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {!readyForBusiness ? (
        <p className="notice" role="status" aria-live="polite" data-testid="business-gate">
          {authenticated ? "Outlook 연결을 완료하면 Client·Matter 기능을 사용할 수 있습니다." : "AMIC OS 로그인 후 Client·Matter 기능이 열립니다."}
        </p>
      ) : null}

      <section className="pane-section">
        <div className="section-title">
          <FileText size={15} />
          <h2>현재 메일</h2>
        </div>
        <strong className="subject">{item?.subject ?? "메일을 열어 주세요"}</strong>
        <p className="safe-copy">{item?.body_preview ?? "처리할 메일을 선택하면 내용이 표시됩니다."}</p>
      </section>

      <section className="pane-section action-section" aria-labelledby="mail-actions-title">
        <div className="section-title">
          <MailCheck size={15} />
          <h2 id="mail-actions-title">이 메일 처리</h2>
        </div>

        <div className="action-list">
          <div className="action-item">
            <div className="action-copy">
              <strong>새 문의로 등록</strong>
              <span>현재 메일을 근거로 문의 기록을 만듭니다.</span>
            </div>
            <button
              type="button"
              onClick={() => runAction(
                "new_inquiry",
                () => registerInquiry("new"),
              )}
              disabled={!readyForBusiness || !itemAvailable || busy !== ""}
              data-testid="new-inquiry-button"
            >
              <UserPlus size={15} />
              새 문의 등록
            </button>
          </div>

          <div className="action-item">
            <div className="action-copy">
              <strong>기존 문의에 연결</strong>
              <span>이미 접수한 문의에 이 메일을 추가합니다.</span>
            </div>
            <label htmlFor="existing-inquiry-select">연결할 문의</label>
            <select
              id="existing-inquiry-select"
              value={selectedLeadId}
              onChange={(event) => setSelectedLeadId(event.target.value)}
              disabled={!readyForBusiness || inquiries.length === 0 || busy !== ""}
              data-testid="existing-inquiry-select"
            >
              {inquiries.length === 0
                ? <option value="">연결할 문의가 없습니다</option>
                : inquiries.map((inquiry) => (
                  <option key={inquiry.lead_id} value={inquiry.lead_id}>
                    {inquiry.display_name}
                  </option>
                ))}
            </select>
            <button
              className="secondary-button"
              type="button"
              onClick={() => runAction(
                "link_inquiry",
                () => registerInquiry("link_existing"),
              )}
              disabled={!readyForBusiness || !itemAvailable || !selectedLeadId || busy !== ""}
              data-testid="link-inquiry-button"
            >
              <Link2 size={15} />
              기존 문의에 연결
            </button>
          </div>

          <div className="action-item">
            <div className="action-copy">
              <strong>Matter에 보관</strong>
              <span>선택한 Matter의 메일 기록에 보관합니다.</span>
            </div>
            <label htmlFor="matter-select">보관할 Matter</label>
            <select
              id="matter-select"
              value={selectedMatterId}
              onChange={(event) => selectMatter(event.target.value)}
              disabled={!readyForBusiness || matters.length === 0 || busy !== ""}
              data-testid="matter-select"
            >
              {matters.length === 0
                ? <option value="">선택할 Matter가 없습니다</option>
                : matters.map((matter) => (
                  <option key={matter.matter_id} value={matter.matter_id}>
                    {matter.lookup_label}
                  </option>
                ))}
            </select>
            <p className="field-note">
              {selectedMatter?.client_display_name ?? "고객 정보 없음"}
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => runAction("file", fileEmail)}
              disabled={!readyForBusiness || !itemAvailable || !selectedMatterId || busy !== ""}
              data-testid="file-email-button"
            >
              <Archive size={15} />
              Matter에 보관
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => runAction("sent_file", fileSentEmail)}
              disabled={!readyForBusiness || !itemAvailable || !selectedMatterId || busy !== ""}
              data-testid="file-sent-email-button"
            >
              <Archive size={15} />
              보낸 메일 보관
            </button>
            <p className="field-note">보낸 편지함에서 연 메일만 선택해 사용하세요. 서버가 보낸 사람과 보관함을 확인합니다.</p>
          </div>
        </div>
      </section>

      {inquiryCopy ? (
        <section
          className="action-result success"
          role="status"
          aria-live="polite"
          data-testid="inquiry-status"
          data-action={inquiryResult.action}
          data-lead-id={inquiryResult.item?.lead_id ?? ""}
          data-replay={inquiryResult.item?.idempotent_replay === true ? "true" : "false"}
        >
          <Check size={17} />
          <div>
            <strong>{inquiryCopy.title}</strong>
            <span>{inquiryCopy.detail}</span>
          </div>
        </section>
      ) : null}

      {emailResult ? (
        <section className="action-result success" role="status" aria-live="polite">
          <Check size={17} />
          <div>
            <strong>
              {emailResult.outcome === "idempotent_replay"
                ? emailResult.filing_mode === "sent"
                  ? "이미 보낸 메일을 Matter에 보관했습니다."
                  : "이미 Matter에 보관된 메일입니다."
                : emailResult.filing_mode === "sent"
                  ? "보낸 메일을 Matter에 보관했습니다."
                  : "Matter에 보관했습니다."}
            </strong>
            <span>{selectedMatter?.lookup_label ?? selectedMatterId}</span>
          </div>
        </section>
      ) : null}

      <section className="pane-section">
        <div className="section-title">
          <TimerReset size={15} />
          <h2>추가 작업</h2>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => runAction("attachments", saveAttachments)} disabled={!readyForBusiness || !emailResult || busy !== ""} data-testid="save-attachments-button">
            <FolderDown size={15} />
            첨부 파일 저장
          </button>
          <button className="secondary-button" type="button" onClick={() => runAction("followup", createFollowup)} disabled={!readyForBusiness || !emailResult || busy !== ""} data-testid="create-task-button">
            <Check size={15} />
            후속 업무 만들기
          </button>
          <button className="secondary-button full-width" type="button" onClick={() => runAction("alerts", evaluateAlerts)} disabled={!readyForBusiness || !itemAvailable || busy !== ""} data-testid="smart-alert-button">
            <AlertTriangle size={15} />
            발송 전 확인
          </button>
        </div>
      </section>

      <section className="operation-summary" data-testid="proof-status" aria-label="추가 작업 결과">
        <span data-testid="email-status" data-outcome={emailResult?.outcome ?? ""}>{outcomeLabel(emailResult?.outcome, "Matter 보관 전")}</span>
        <span data-testid="attachment-status" data-outcome={attachmentResult?.outcome ?? ""}>{outcomeLabel(attachmentResult?.outcome, "첨부 저장 전")}</span>
        <span data-testid="followup-status" data-outcome={followupResult?.outcome ?? ""}>{outcomeLabel(followupResult?.outcome, "후속 업무 전")}</span>
        <span data-testid="alert-status" data-warning-count={alertResult?.item?.warning_count ?? 0}>확인할 내용 {alertResult?.item?.warning_count ?? 0}건</span>
      </section>

      <section className="pane-section two-col">
        <div>
          <div className="section-title">
            <MailCheck size={15} />
            <h2>최근 기록</h2>
          </div>
          <ul className="compact-list" data-testid="timeline-list">
            {timeline.length === 0
              ? <li className="empty-item">기록이 없습니다.</li>
              : timeline.slice(0, 4).map((entry) => (
                <li key={entry.event_id}>{entry.title}</li>
              ))}
          </ul>
        </div>
        <div>
          <div className="section-title">
            <FolderDown size={15} />
            <h2>문서</h2>
          </div>
          <ul className="compact-list" data-testid="document-list">
            {documents.length === 0
              ? <li className="empty-item">문서가 없습니다.</li>
              : documents.slice(0, 4).map((document) => (
                <li key={document.document_id}>{document.title}</li>
              ))}
          </ul>
        </div>
      </section>

      {busy ? <p className="notice" role="status" aria-live="polite" data-testid="busy-state">{busyLabel(busy)}</p> : null}
      {error ? <p className="error" role="alert" data-testid="error-state">{error}</p> : null}
    </main>
  );
}

function mount() {
  window.addEventListener(OFFICE_READY_EVENT, registerOutlookEventHandlersOnce);
  startOfficeTaskPane({
    render: () => createRoot(document.getElementById("root")).render(<App />),
    waitForReady: ensureOfficeReady,
    register: registerOutlookEventHandlersOnce,
  });
}

void mount();
