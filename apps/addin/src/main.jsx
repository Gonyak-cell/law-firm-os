import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  InteractionRequiredAuthError,
  createNestablePublicClientApplication,
} from "@azure/msal-browser";
import {
  applyOutlookCanonicalMessageIdentity,
  createOutlookCanonicalMessageIdentityRequest,
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
import { fileOutlookEmail } from "./outlook-filing.js";
import { fileOutlookEmailWithAttachments } from "./outlook-filing-orchestration.js";
import {
  createOutlookFilingCorrectionCurrentRequest,
  createOutlookFilingCorrectionRequest,
  mapOutlookFilingCorrectionError,
  parseOutlookFilingCorrectionCurrentResponse,
  parseOutlookFilingCorrectionResponse,
} from "./outlook-filing-correction.js";
import { OutlookFilingCorrectionPanel } from "./outlook-filing-correction-panel.jsx";
import { OutlookFilingOverview } from "./outlook-filing-overview.jsx";
import { OutlookConversationPolicyFeature } from "./outlook-conversation-policy-feature.jsx";
import { OutlookDocumentSigningFeature } from "./outlook-document-signing-feature.jsx";
import { OutlookPrecedentPanel } from "./outlook-precedent-panel.jsx";
import {
  buildOutlookPrecedentDeepLink,
  createOutlookPrecedentReadinessRequest,
  createOutlookPrecedentSearchRequest,
  parseOutlookPrecedentReadiness,
  projectOutlookPrecedentDisplay,
  sanitizeOutlookPrecedentSearchResponse,
} from "./outlook-precedent-search.js";
import { loadOutlookMatterActivity } from "./outlook-matter-activity.js";
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
  isFiledEmailContextCurrent,
  isOutlookActionContextCurrent,
  createOutlookOperationSnapshot,
  isOutlookOperationSnapshotContextCurrent,
  isSameOutlookItem,
  outlookItemChangeDisposition,
  outlookItemContextKey,
  outlookItemIdentityKey,
  subscribeToOutlookItemChanges,
} from "./outlook-item-events.js";
import {
  createOutlookEditorContextStore,
  createOutlookIntentIdempotencyKey,
  resolveOutlookTaskSourceEmailThreadId,
  withOptionalOutlookMatterReadback,
} from "./outlook-editable-action-state.js";
import {
  createOutlookMatterRevalidationRequest,
  createOutlookMatterSearchDebouncer,
  createOutlookMatterSelection,
  outlookMatterSelectionForContext,
  revalidateOutlookMatterSelection,
} from "./outlook-matter-search.js";
import {
  isoToLocalDateTime,
  localDateTimeToIso,
} from "./outlook-task-datetime.js";
import {
  createOutlookApiResponseError,
  createOutlookAuthOwnerChangedError,
  createOutlookAuthOwnerFence,
  createOutlookBusyFence,
  createOutlookBusinessReadFence,
  isOutlookOperationSessionCurrent,
} from "./outlook-session-fence.js";
import { createOutlookOperationReceiptController } from "./outlook-operation-receipt-controller.js";
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
import {
  OutlookCriticalValueRow,
  OutlookFlatActionRow,
  OutlookInlineOperationState,
  OutlookOneLineField,
  OutlookOverlay,
  outlookRailButtonId,
} from "./outlook-compact-shell.jsx";
import {
  OutlookMatterCompactShell,
  outlookMatterRailForContext,
} from "./outlook-matter-shell.jsx";
import {
  attachExactVaultVersionToOutlookCompose,
  retryOutlookVaultAttachmentCompletion,
} from "./outlook-vault-compose-attachment.js";
import {
  createOutlookVaultSourcePendingStore,
  parseOutlookVaultExactVersion,
  resumePendingOutlookVaultSourceSaves,
  saveOutlookAttachmentSourcesToVault,
  saveOutlookEmailWithAttachmentsToVault,
} from "./outlook-vault-source-actions.js";
import {
  OUTLOOK_OPERATION_STATES,
  normalizeOutlookOperationError,
} from "./outlook-operation-state.js";
import {
  OUTLOOK_READINESS_ACTIONS,
  presentOutlookReadiness,
} from "./outlook-readiness-status.js";
import {
  notifyOutlookStartupRecovered,
  notifyOutlookStartupUnauthorized,
  registerOutlookStartupAuthHandlers,
  resolveOutlookStartupStorage,
  startOutlookStartup,
  subscribeOutlookStartup,
  waitForOutlookStartupMailbox,
} from "./outlook-startup-runtime.js";
import {
  closeOutlookOverlay,
  createOutlookOverlayState,
  invalidateOutlookOverlayForItemChange,
  openOutlookOverlay,
} from "./outlook-overlay-state.js";
import "./styles.css";

const ADDIN_SESSION_STORAGE_KEY = LAWOS_SESSION_STORAGE_KEY;
let msalBridgePromise = null;
let runtimeConfigPromise = null;
let sessionStore = null;
let authRecoveryPromise = null;
let authRecoveryOwner = null;
let interactiveAuthPromise = null;
let officeReadyPromise = null;
const authOwnerFence = createOutlookAuthOwnerFence();
const OFFICE_READY_EVENT = "lawos:office-ready";
const CLIENT_OUTLOOK_CALLBACK_MODE = "server_complete_v1";
const OUTLOOK_ADDIN_BUILD = globalThis.__LAWOS_OUTLOOK_SURFACE_PROFILE?.build ?? "";
const OUTLOOK_VAULT_EXACT_ATTACHMENT_ENABLED =
  globalThis.__LAWOS_OUTLOOK_SURFACE_PROFILE?.profile
    ?.vaultExactAttachmentEnabled === true;
const OUTLOOK_VAULT_SOURCE_SAVE_ENABLED =
  globalThis.__LAWOS_OUTLOOK_SURFACE_PROFILE?.profile
    ?.vaultSourceSaveEnabled === true;

function safeOutlookVaultAttachmentCandidate(document) {
  if (document?.exact_version_available !== true) return null;
  try {
    const exactVersion = parseOutlookVaultExactVersion(
      document.exact_version,
      "document.exact_version",
    );
    if (exactVersion.document_id !== document.document_id
        || exactVersion.version_id !== document.current_version_id
        || (document.latest_sha256
          && exactVersion.sha256 !== document.latest_sha256)) return null;
    const title = typeof document.title === "string"
      ? document.title.normalize("NFC").trim().slice(0, 240)
      : "";
    if (!title) return null;
    return Object.freeze({
      key: JSON.stringify([exactVersion.document_id, exactVersion.version_id]),
      title,
      exactVersion,
    });
  } catch {
    return null;
  }
}

function outlookVaultAttachmentCandidates(documents) {
  const seen = new Set();
  return Object.freeze((Array.isArray(documents) ? documents : []).flatMap((document) => {
    const candidate = safeOutlookVaultAttachmentCandidate(document);
    if (!candidate || seen.has(candidate.key)) return [];
    seen.add(candidate.key);
    return [candidate];
  }));
}

function formatVaultAttachmentBytes(value) {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes < 1) return "—";
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function createOutlookFilingReceiptCallback({
  operationSnapshot,
  reconcileOperationReceipt,
} = {}) {
  if (!operationSnapshot || typeof reconcileOperationReceipt !== "function") {
    throw new TypeError("Outlook filing receipt callback context is required");
  }
  return (serverReceipt) => reconcileOperationReceipt(
    operationSnapshot,
    serverReceipt,
    serverReceipt?.filing_operation ? "file_email" : "save_attachments",
  );
}

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

function annotateAuthOwner(error, requestOwner, recoveryOwner = null) {
  Object.defineProperties(error, {
    authRequestOwner: { value: requestOwner, configurable: true },
    authRecoveryOwner: { value: recoveryOwner, configurable: true },
  });
  return error;
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
          "이 Outlook 환경에서는 보안 로그인을 사용할 수 없습니다.",
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
      recordOutlookCommandBridgeProbe("msal_bridge", receipt);
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
  authOwner = null,
  sessionToken,
  sessionOwner = null,
  timeoutMs = DEFAULT_ADDIN_API_TIMEOUT_MS,
} = {}) {
  const requestOwnerStart = authOwner ?? authOwnerFence.capture();
  if (!authOwnerFence.isCurrent(requestOwnerStart)) {
    throw createOutlookAuthOwnerChangedError();
  }
  const baseUrl = await apiBaseUrl();
  const token = includeSession
    ? (sessionToken === undefined ? await addinSessionToken() : sessionToken)
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
  const ownerCurrentAtResponse = authOwnerFence.isCurrent(requestOwner);
  if (!ownerCurrentAtResponse) throw createOutlookAuthOwnerChangedError();
  const sessionUnauthorized = response.status === 401 && includeSession;
  let sessionClearPromise = null;
  let authRecoveryOwner = null;
  if (sessionUnauthorized) {
    authRecoveryOwner = notifyOutlookStartupUnauthorized(requestOwner);
    if (!authRecoveryOwner && authOwnerFence.isCurrent(requestOwner)) {
      authRecoveryOwner = authOwnerFence.begin();
    }
    if (authRecoveryOwner) {
      sessionClearPromise = authStorage()
        .clearIfCurrent(requestOwner.token)
        .catch(() => undefined);
    }
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    if (sessionClearPromise) await sessionClearPromise;
    if (!authRecoveryOwner && !authOwnerFence.isCurrent(requestOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    throw annotateAuthOwner(createOutlookApiResponseError({
      status: response.status,
      parseFailed: true,
    }), requestOwner, authRecoveryOwner);
  }
  if (!authRecoveryOwner && !authOwnerFence.isCurrent(requestOwner)) {
    throw createOutlookAuthOwnerChangedError();
  }
  if (!response.ok) {
    if (sessionClearPromise) await sessionClearPromise;
    throw annotateAuthOwner(createOutlookApiResponseError({
      status: response.status,
      payload,
    }), requestOwner, authRecoveryOwner);
  }
  if (!authOwnerFence.isCurrent(requestOwner)) throw createOutlookAuthOwnerChangedError();
  return payload;
}

async function requestJson(path, options = {}) {
  try {
    return await rawRequestJson(path, options);
  } catch (error) {
    const recoveryOwner = error?.authRecoveryOwner;
    if (
      error?.status === 401
      && options.includeSession !== false
      && options.retryAfterUnauthorized !== false
      && recoveryOwner
      && authOwnerFence.isCurrent(recoveryOwner)
    ) {
      try {
        await acquireLawosSession({ interactive: false, force: true, owner: recoveryOwner });
        if (!authOwnerFence.isCurrent(recoveryOwner)) throw createOutlookAuthOwnerChangedError();
        const retried = await rawRequestJson(path, {
          ...options,
          retryAfterUnauthorized: false,
          authOwner: recoveryOwner,
        });
        if (!authOwnerFence.isCurrent(recoveryOwner)) throw createOutlookAuthOwnerChangedError();
        if (notifyOutlookStartupRecovered(recoveryOwner) === false) {
          throw createOutlookAuthOwnerChangedError();
        }
        return retried;
      } catch {
        // A command/event path must remain non-interactive and fail closed.
      }
    }
    throw error;
  }
}

async function validateLawosSession({ tokenSnapshot = undefined, owner = null } = {}) {
  const validationOwner = owner ?? authOwnerFence.capture();
  if (!authOwnerFence.canUsePersistedToken(validationOwner)) {
    return {
      authenticated: false,
      safe_error_code: "AUTH_SESSION_REQUIRED",
      authOwner: validationOwner,
    };
  }
  const token = tokenSnapshot === undefined ? await addinSessionToken() : tokenSnapshot;
  if (!token) {
    return {
      authenticated: false,
      safe_error_code: "AUTH_SESSION_REQUIRED",
      authOwner: validationOwner,
    };
  }
  if (!authOwnerFence.isCurrent(validationOwner)) throw createOutlookAuthOwnerChangedError();
  const boundValidationOwner = validationOwner.tokenBound
    ? validationOwner
    : authOwnerFence.bindToken(validationOwner, token);
  if (!boundValidationOwner || !authOwnerFence.isCurrent(boundValidationOwner)) {
    throw createOutlookAuthOwnerChangedError();
  }
  try {
    const payload = await rawRequestJson("/api/auth/session", {
      retryAfterUnauthorized: false,
      authOwner: boundValidationOwner,
      sessionToken: token,
      sessionOwner: boundValidationOwner,
    });
    return { ...parseSessionValidation(payload, 200), authOwner: boundValidationOwner };
  } catch (error) {
    if (error?.status === 401) {
      await authStorage().clearIfCurrent(error.authRequestOwner?.token ?? token);
      const recoveryOwner = error.authRecoveryOwner;
      if (!recoveryOwner || !authOwnerFence.isCurrent(recoveryOwner)) {
        throw createOutlookAuthOwnerChangedError();
      }
      return {
        authenticated: false,
        safe_error_code: error.safe_error_code ?? "AUTH_SESSION_INVALID",
        authOwner: recoveryOwner,
      };
    }
    throw error;
  }
}

async function acquireLawosSession({ interactive = false, force = false, owner = null } = {}) {
  let activeOwner = owner ?? authOwnerFence.capture();
  if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
  if (interactiveAuthPromise && interactive) {
    const existing = await interactiveAuthPromise;
    if (!authOwnerFence.isCurrent(existing?.authOwner ?? activeOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    return existing;
  }
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
    if (!force) {
      const existing = await validateLawosSession({ owner: activeOwner });
      activeOwner = existing.authOwner ?? activeOwner;
      if (existing.authenticated) return existing;
    }
    const bridge = await initializeMsalBridge();
    if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
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
          if (error instanceof InteractionRequiredAuthError) {
            throw createAddinAuthError("LAWOS_INTERACTION_REQUIRED", "AMIC OS 로그인이 필요합니다.", { cause: error });
          }
          throw error;
        }
        result = await bridge.instance.acquireTokenPopup({
          scopes: bridge.config.scopes,
          prompt: "select_account",
        });
      }
    }
    if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
    const entraAccessToken = typeof result?.accessToken === "string" ? result.accessToken : "";
    if (!entraAccessToken) {
      throw createAddinAuthError(AUTH_ERROR_CODES.sessionExchangeInvalid, "Microsoft 로그인을 완료하지 못했습니다.");
    }
    const exchange = await rawRequestJson("/api/auth/office-sso/exchange", {
      method: "POST",
      includeSession: false,
      retryAfterUnauthorized: false,
      authOwner: activeOwner,
      body: { access_token: entraAccessToken },
    });
    // Drop the Entra token before storing or returning the LawOS session.
    const lawosToken = parseExchangeResponse(exchange, 200);
    if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
    if (!authOwnerFence.setToken(activeOwner, lawosToken)) {
      throw createOutlookAuthOwnerChangedError();
    }
    const boundRecoveryOwner = authOwnerFence.bindToken(activeOwner, lawosToken);
    if (!boundRecoveryOwner) throw createOutlookAuthOwnerChangedError();
    try {
      await authStorage().set(lawosToken);
    } catch (error) {
      if (authOwnerFence.currentToken() !== lawosToken) {
        await authStorage().clearIfCurrent(lawosToken);
      }
      throw error;
    }
    if (!authOwnerFence.isCurrent(boundRecoveryOwner)) {
      if (authOwnerFence.currentToken() !== lawosToken) {
        await authStorage().clearIfCurrent(lawosToken);
      }
      throw createOutlookAuthOwnerChangedError();
    }
    const session = await validateLawosSession({
      tokenSnapshot: lawosToken,
      owner: boundRecoveryOwner,
    });
    if (!authOwnerFence.isCurrent(session.authOwner ?? boundRecoveryOwner)) {
      throw createOutlookAuthOwnerChangedError();
    }
    return session;
  })().catch((error) => {
    if (error?.safe_error_code === "AUTH_SESSION_OWNER_CHANGED") throw error;
    if (!authOwnerFence.isCurrent(activeOwner)) throw createOutlookAuthOwnerChangedError();
    throw annotateAuthOwner(error, activeOwner, activeOwner);
  });
  if (interactive) {
    interactiveAuthPromise = run;
    return interactiveAuthPromise;
  }
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

function recordOutlookCommandBridgeProbe(key, value) {
  window.__LAWOS_OUTLOOK_COMMAND_BRIDGE_PROBE = {
    ...(window.__LAWOS_OUTLOOK_COMMAND_BRIDGE_PROBE ?? {}),
    [key]: value,
  };
}

function normalizedMailboxAddress(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function officeItemSnapshot(canonicalIdentity = null) {
  const item = window.Office?.context?.mailbox?.item;
  if (!item) return null;
  let restMessageId = null;
  try {
    restMessageId = resolveCurrentOutlookRestMessageId({ Office: window.Office }).rest_message_id;
  } catch {
    // Smart-alert metadata can still be inspected, but filing must fail
    // closed when Office cannot provide a REST-stable message identity.
  }
  const mailboxAddress = normalizedMailboxAddress(
    window.Office?.context?.mailbox?.userProfile?.emailAddress,
  );
  const senderAddress = normalizedMailboxAddress(item.from?.emailAddress);
  const compose = typeof item.subject?.getAsync === "function";
  const snapshot = {
    rest_message_id: restMessageId,
    graph_message_id: restMessageId,
    internet_message_id: typeof item.internetMessageId === "string" && item.internetMessageId.trim() ? item.internetMessageId : null,
    conversation_id: typeof item.conversationId === "string" && item.conversationId.trim() ? item.conversationId : null,
    mode: compose ? "compose" : "read",
    provenance: compose
      ? "draft"
      : senderAddress && mailboxAddress && senderAddress === mailboxAddress
        ? "sent"
        : "received",
    from: item.from ? { name: item.from.displayName, email: item.from.emailAddress } : { name: null, email: null },
    to: Array.isArray(item.to) ? item.to.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    cc: Array.isArray(item.cc) ? item.cc.map((recipient) => ({ name: recipient.displayName, email: recipient.emailAddress })) : [],
    bcc: [],
    subject: compose ? "작성 중인 메일" : item.subject ?? "제목 없음",
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
  if (!canonicalIdentity) return snapshot;
  try {
    return applyOutlookCanonicalMessageIdentity({
      item: snapshot,
      response: { item: canonicalIdentity },
    });
  } catch {
    return snapshot;
  }
}

async function readCurrentOutlookItem({ includeAttachments = false, includeTimestamps = false, requireStableIdentity = false, allowBodyReadFailure = false, canonicalIdentity = null } = {}) {
  const snapshot = officeItemSnapshot(canonicalIdentity);
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
    if (requireStableIdentity && !isSameOutlookItem(snapshot, officeItemSnapshot(canonicalIdentity))) {
      throw itemChangedDuringActionError();
    }
    return next;
  }
  const attachments = await readOutlookAttachments({
    item: officeItem,
    attachments: Array.isArray(officeItem?.attachments) ? officeItem.attachments : [],
    Office: window.Office,
  });
  if (requireStableIdentity && !isSameOutlookItem(snapshot, officeItemSnapshot(canonicalIdentity))) {
    throw itemChangedDuringActionError();
  }
  return { ...next, ...attachments };
}

async function readCurrentOutlookVaultSourceItem() {
  const snapshot = officeItemSnapshot();
  if (!snapshot || snapshot.mode !== "read") {
    throw Object.assign(new Error("OUTLOOK_READ_ITEM_REQUIRED"), {
      safe_error_code: "OUTLOOK_READ_ITEM_REQUIRED",
      user_message: "저장할 받은 메일 또는 보낸 메일을 열어 주세요.",
    });
  }
  assertStableOutlookItemIdentity(snapshot);
  const officeItem = window.Office?.context?.mailbox?.item;
  const timestamps = await readOutlookItemTimestamps({ item: officeItem });
  if (!isSameOutlookItem(snapshot, officeItemSnapshot())) {
    throw itemChangedDuringActionError();
  }
  return Object.freeze({ ...snapshot, ...timestamps });
}

function registerOutlookCommandBridge() {
  // Commands may run without a mounted React pane. Expose only the silent
  // authentication and current-item helpers; the active product registers no
  // automatic send handler.
  window.__LAWOS_INIT_MSAL_BRIDGE = initializeMsalBridge;
  window.__LAWOS_RESOLVE_CURRENT_OUTLOOK_REST_MESSAGE_ID =
    () => resolveCurrentOutlookRestMessageId({
      Office: window.Office,
    });
  return true;
}

const registerOutlookCommandBridgeOnce = createRegistrationLatch(registerOutlookCommandBridge);

function oauthStateFromAuthorizationUrl(authorizationUrl) {
  try { return new URL(authorizationUrl).searchParams.get("state") ?? ""; } catch { return ""; }
}

function itemChangedDuringActionError() {
  return Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
    safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
    user_message: "처리 중 다른 메일로 이동했습니다. 완료된 기록은 Matter에서 확인하고, 새로 연 메일은 다시 처리해 주세요.",
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
    user_message: "선택한 메일을 먼저 Matter에 저장한 뒤 다시 시도해 주세요.",
  });
}

function busyLabel(value) {
  return {
    login: "AMIC OS 로그인을 확인하고 있습니다.",
    connect: "Outlook 연결을 확인하고 있습니다.",
    disconnect: "Outlook 연결을 해제하고 있습니다.",
    file: "Matter에 메일을 저장하고 있습니다.",
    sent_file: "보낸 메일을 Matter에 저장하고 있습니다.",
    attachments: "첨부 파일을 저장하고 있습니다.",
    vault_file: "Vault에 메일과 첨부를 저장하고 있습니다.",
    vault_sent_file: "Vault에 보낸 메일과 첨부를 저장하고 있습니다.",
    vault_attachments: "Vault에 실패한 첨부를 다시 저장하고 있습니다.",
    vault_resume: "중단된 Vault 저장 상태를 확인하고 있습니다.",
    task: "업무를 저장하고 있습니다.",
    time_draft: "시간 기록 초안을 저장하고 있습니다.",
    readbacks: "Matter 활동과 문서를 불러오고 있습니다.",
    alerts: "스마트 경고를 점검하고 있습니다.",
    correction: "저장 위치를 바꾸고 있습니다.",
  }[value] ?? "처리하고 있습니다.";
}

function localDateValue(date = new Date()) {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60_000))
    .toISOString()
    .slice(0, 10);
}

function emptyTaskDraft() {
  return {
    title: "",
    status: "todo",
    due_at: "",
    estimated_minutes: "",
    assigned_to_user_id: "",
  };
}

function emptyTimeDraft() {
  return {
    work_date: localDateValue(),
    narrative: "",
    duration_minutes: "30",
    billable: true,
  };
}

function emptyFilingCorrection() {
  return {
    currentPlacement: null,
    targetQuery: "",
    targetMatters: [],
    targetMatterId: "",
    reason: "",
    confirmed: false,
    resultOnly: false,
    result: null,
    notice: null,
  };
}

function emptyPrecedentSearch() {
  return {
    readiness: null,
    query: "",
    stableQuery: "",
    items: [],
    selectedItem: null,
    nextCursor: null,
    busy: false,
    error: "",
    empty: false,
    indexStale: false,
    retry: null,
  };
}

function filingCorrectionErrorNotice(error) {
  const mapped = mapOutlookFilingCorrectionError(error);
  const message = {
    permission_changed: "Matter 권한을 확인한 뒤 다시 시도해 주세요.",
    stale_item: "현재 저장 위치를 다시 불러온 뒤 시도해 주세요.",
    duplicate: "기존 저장 위치 변경 결과를 확인해 주세요.",
    offline: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
    reconnect_required: "AMIC OS에 다시 로그인한 뒤 시도해 주세요.",
    failed: "저장 위치를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.",
  }[mapped.state] ?? "저장 위치를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.";
  return Object.freeze({
    status: mapped.state,
    visibleMessage: message,
    fullMessage: message,
    testId: "filing-correction-state",
  });
}

function actionResultNotice(name, result) {
  const replay = result?.outcome === "idempotent_replay"
    || result?.idempotent_replay === true
    || result?.email?.outcome === "idempotent_replay";
  const partial = result?.status === "partial" || result?.outcome === "partial";
  const processing = result?.status === "processing" || result?.outcome === "processing";
  const readbackPending = result?.outlook_readback_pending === true;
  if (name === "vault_resume") {
    const failedCount = result?.failed?.length ?? 0;
    const idle = result?.status === "idle";
    return {
      status: processing
        ? OUTLOOK_OPERATION_STATES.working
        : partial
          ? OUTLOOK_OPERATION_STATES.partial
          : idle ? OUTLOOK_OPERATION_STATES.idle : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: processing
        ? "Vault 보안 검사가 진행 중입니다."
        : partial
          ? "일부 Vault 저장 상태를 다시 확인해야 합니다."
          : idle
            ? "확인할 중단 저장 작업이 없습니다."
            : "중단됐던 Vault 저장의 정확 버전을 확인했습니다.",
      fullMessage: processing
        ? "저장된 작업 ID로만 상태를 확인하며 메일이나 첨부를 다시 전송하지 않습니다."
        : partial
          ? `다시 확인할 Vault 작업 ${failedCount}개가 남았습니다.`
          : idle
            ? "메일이나 첨부를 읽거나 전송하지 않았습니다."
            : "상태 전용 확인으로 정확 버전 영수증을 복구했습니다.",
    };
  }
  if (name === "vault_file" || name === "vault_sent_file") {
    const retryCount = result?.retry_attachment_ids?.length ?? 0;
    const sent = name === "vault_sent_file";
    return {
      status: processing
        ? OUTLOOK_OPERATION_STATES.working
        : partial
        ? OUTLOOK_OPERATION_STATES.partial
        : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: processing
        ? "Vault 보안 검사가 진행 중입니다."
        : partial
        ? `${sent ? "보낸 메일" : "메일"}은 Vault에 저장됐고 일부 첨부는 다시 시도해야 합니다.`
        : replay
          ? `이미 Vault에 저장된 ${sent ? "보낸 메일" : "메일"}입니다.`
          : `${sent ? "보낸 메일과 첨부" : "메일 및 첨부 파일"}를 Vault에 저장했습니다.`,
      fullMessage: processing
        ? "작업 ID로 상태를 계속 확인하며 메일 원본이나 첨부를 다시 전송하지 않습니다."
        : partial
        ? `Vault 메일 원본 저장은 완료됐습니다. 다시 시도할 첨부 ${retryCount}개가 남았습니다.`
        : replay
          ? "같은 Matter의 Vault 원본과 정확 버전 영수증을 확인했습니다."
          : "Vault가 반환한 메일 원본과 첨부의 정확 버전 영수증을 확인했습니다.",
    };
  }
  if (name === "vault_attachments") {
    const retryCount = result?.retry_attachment_ids?.length ?? 0;
    return {
      status: partial
        ? OUTLOOK_OPERATION_STATES.partial
        : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: partial
        ? "일부 Vault 첨부는 다시 시도해야 합니다."
        : "실패했던 첨부를 Vault에 저장했습니다.",
      fullMessage: partial
        ? `다시 시도할 Vault 첨부 ${retryCount}개가 남았습니다.`
        : "재시도한 첨부의 정확 버전 영수증을 확인했습니다.",
    };
  }
  if (name === "file") {
    const retryCount = result?.retry_attachment_ids?.length ?? 0;
    return {
      status: partial || readbackPending
        ? OUTLOOK_OPERATION_STATES.partial
        : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: partial && readbackPending
        ? "메일은 저장됐습니다. 일부 첨부와 Matter 목록을 다시 확인해 주세요."
        : partial
          ? "메일은 저장됐고 일부 첨부는 다시 시도해야 합니다."
          : readbackPending
            ? "메일은 저장됐지만 Matter 목록은 새로 불러오지 못했습니다."
            : replay ? "이미 저장된 메일입니다." : "메일 및 첨부 파일을 저장했습니다.",
      fullMessage: partial && readbackPending
        ? `메일 저장은 완료됐습니다. 다시 시도할 첨부 ${retryCount}개가 남았고 Matter 활동과 문서를 새로 불러오지 못했습니다.`
        : partial
          ? `메일 저장은 완료됐습니다. 다시 시도할 첨부 ${retryCount}개가 남았습니다.`
          : readbackPending
            ? "메일 저장은 완료됐습니다. Matter 활동과 문서만 다시 불러와 주세요."
            : replay ? "같은 Matter의 기존 메일 저장 기록을 확인했습니다." : "선택한 Matter에 메일 원본과 확인된 첨부를 저장했습니다.",
    };
  }
  if (name === "sent_file") {
    return {
      status: readbackPending
        ? OUTLOOK_OPERATION_STATES.partial
        : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: readbackPending
        ? "보낸 메일은 저장됐지만 Matter 목록은 새로 불러오지 못했습니다."
        : replay ? "이미 저장된 보낸 메일입니다." : "보낸 메일을 저장했습니다.",
      fullMessage: readbackPending
        ? "보낸 메일 저장은 완료됐습니다. Matter 활동과 문서만 다시 불러와 주세요."
        : replay ? "같은 Matter의 기존 보낸 메일 저장 기록을 확인했습니다." : "선택한 Matter에 보낸 메일 원본을 저장했습니다.",
    };
  }
  if (name === "attachments") {
    const retryCount = result?.retry_attachment_ids?.length ?? 0;
    return {
      status: partial || readbackPending
        ? OUTLOOK_OPERATION_STATES.partial
        : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: partial && readbackPending
        ? "일부 첨부와 Matter 목록을 다시 확인해 주세요."
        : partial
          ? "일부 첨부는 다시 시도해야 합니다."
          : readbackPending
            ? "첨부 파일은 저장됐지만 Matter 목록은 새로 불러오지 못했습니다."
            : "첨부 파일을 저장했습니다.",
      fullMessage: partial && readbackPending
        ? `다시 시도할 첨부 ${retryCount}개가 남았고 Matter 활동과 문서를 새로 불러오지 못했습니다.`
        : partial
          ? `다시 시도할 첨부 ${retryCount}개가 남았습니다.`
          : readbackPending
            ? "첨부 파일 저장은 완료됐습니다. Matter 활동과 문서만 다시 불러와 주세요."
            : "확인된 첨부 파일 저장을 마쳤습니다.",
    };
  }
  if (name === "task") {
    const activityId = result?.item?.activity_id ?? "";
    const version = result?.item?.version ?? "";
    return {
      status: readbackPending ? OUTLOOK_OPERATION_STATES.partial : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: readbackPending ? "업무는 저장됐지만 목록은 새로 불러오지 못했습니다." : replay ? "같은 업무 요청을 확인했습니다." : result?.outcome === "task_updated" ? "업무를 수정했습니다." : "업무를 만들었습니다.",
      fullMessage: readbackPending ? `업무 ${activityId}, 버전 ${version} 저장은 완료됐습니다. Matter 활동과 문서만 다시 불러와 주세요.` : activityId ? `업무 ${activityId}, 버전 ${version}을 저장했습니다.` : "업무 저장 결과를 확인했습니다.",
    };
  }
  if (name === "time_draft") {
    const draftRef = result?.item?.draft_ref ?? "";
    const version = result?.item?.version ?? "";
    return {
      status: readbackPending ? OUTLOOK_OPERATION_STATES.partial : replay ? OUTLOOK_OPERATION_STATES.duplicate : OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: readbackPending ? "시간 기록 초안은 저장됐지만 목록은 새로 불러오지 못했습니다." : replay ? "같은 시간 기록 초안을 확인했습니다." : "시간 기록 초안을 만들었습니다.",
      fullMessage: readbackPending ? `초안 ${draftRef}, 버전 ${version} 저장은 완료됐습니다. Matter 활동과 문서만 다시 불러와 주세요.` : draftRef ? `초안 ${draftRef}, 버전 ${version}을 저장했습니다. 제출 또는 승인은 수행하지 않았습니다.` : "시간 기록 초안 저장 결과를 확인했습니다.",
    };
  }
  if (name === "alerts") {
    const count = result?.item?.warning_count ?? result?.item?.warnings?.length ?? 0;
    return {
      status: OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: count ? `스마트 경고 ${count}건을 확인했습니다.` : "스마트 경고가 없습니다.",
      fullMessage: count ? `선택한 메일에서 검토할 스마트 경고 ${count}건을 찾았습니다.` : "선택한 메일에서 추가로 검토할 스마트 경고를 찾지 못했습니다.",
    };
  }
  if (name === "vault_attach" || name === "vault_attach_retry") {
    return {
      status: OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: "선택한 Vault 버전을 첨부했습니다.",
      fullMessage: "Vault의 정확한 문서 버전과 Outlook 첨부 결과를 확인했습니다.",
    };
  }
  if (name === "readbacks") {
    return {
      status: OUTLOOK_OPERATION_STATES.complete,
      visibleMessage: "Matter 활동과 문서를 새로 불러왔습니다.",
      fullMessage: `활동 ${result?.timeline_count ?? 0}건과 문서 ${result?.document_count ?? 0}건을 확인했습니다.`,
    };
  }
  return {
    status: OUTLOOK_OPERATION_STATES.complete,
    visibleMessage: "작업을 마쳤습니다.",
    fullMessage: "요청한 작업을 마쳤습니다.",
  };
}

function CompactIntervention({ intervention }) {
  if (!intervention) return null;
  return (
    <div className="outlook-flat-action-row" data-testid={intervention.testId}>
      <OutlookInlineOperationState
        status={intervention.status}
        visibleMessage={intervention.visibleMessage}
        fullMessage={intervention.fullMessage}
      />
      {intervention.action ? (
        <button
          type="button"
          className="outlook-flat-action-button"
          onClick={intervention.action}
          disabled={intervention.disabled}
          data-testid={intervention.actionTestId}
        >
          {intervention.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function outlookItemContext(item) {
  return {
    item,
    mode: item?.mode,
    provenance: item?.provenance,
  };
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATE.loading);
  const [authError, setAuthError] = useState("");
  const [graphConnection, setGraphConnection] = useState({ state: GRAPH_STATE.loading, status: "loading", stateVersion: 0, missingScopes: [] });
  const [outlookReadiness, setOutlookReadiness] = useState(null);
  const [outlookStartupOutcome, setOutlookStartupOutcome] = useState(null);
  const [matters, setMatters] = useState([]);
  const [matterSearchQuery, setMatterSearchQuery] = useState("");
  const matterSearchDebouncerRef = useRef(null);
  const filingCorrectionDebouncerRef = useRef(null);
  const filingCorrectionEpochRef = useRef(0);
  const filingCorrectionSearchEpochRef = useRef(0);
  const filingCorrectionContextRef = useRef(null);
  const filingCorrectionTargetRef = useRef(null);
  const filingCorrectionReceiptRef = useRef(null);
  const precedentEpochRef = useRef(0);
  const precedentContextRef = useRef(null);
  const [matterSelection, setMatterSelection] = useState(null);
  const matterSelectionRef = useRef(null);
  const selectedMatterIdRef = useRef("");
  const [emailResult, setEmailResult] = useState(null);
  const [attachmentResult, setAttachmentResult] = useState(null);
  const [vaultSourceSaveResult, setVaultSourceSaveResult] = useState(null);
  const [taskDraft, setTaskDraft] = useState(() => emptyTaskDraft());
  const [taskResult, setTaskResult] = useState(null);
  const [timeDraft, setTimeDraft] = useState(() => emptyTimeDraft());
  const [timeDraftResult, setTimeDraftResult] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [vaultAttachmentCandidateKey, setVaultAttachmentCandidateKey] = useState("");
  const [vaultAttachmentPending, setVaultAttachmentPending] = useState(null);
  const [vaultAttachmentResult, setVaultAttachmentResult] = useState(null);
  const vaultAttachmentPendingArchiveRef = useRef(new Map());
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [receiptRecovery, setReceiptRecovery] = useState(null);
  const [overlayState, setOverlayState] = useState(() => createOutlookOverlayState());
  const [filingCorrection, setFilingCorrection] = useState(() => emptyFilingCorrection());
  const [precedentSearch, setPrecedentSearch] = useState(() => emptyPrecedentSearch());
  const precedentSearchRef = useRef(precedentSearch);
  precedentSearchRef.current = precedentSearch;
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false);
  const editorContextsRef = useRef(null);
  const taskDraftRef = useRef(taskDraft);
  const taskResultRef = useRef(taskResult);
  const taskSourceEmailThreadIdRef = useRef(null);
  const timeDraftRef = useRef(timeDraft);
  const timeDraftResultRef = useRef(timeDraftResult);
  taskDraftRef.current = taskDraft;
  taskResultRef.current = taskResult;
  timeDraftRef.current = timeDraft;
  timeDraftResultRef.current = timeDraftResult;
  if (!editorContextsRef.current) {
    editorContextsRef.current = createOutlookEditorContextStore();
  }
  const overlayStateRef = useRef(overlayState);
  overlayStateRef.current = overlayState;
  const canonicalIdentityRef = useRef(null);
  const operationEpochRef = useRef(0);
  const activeOperationStartKeyRef = useRef("");
  const businessReadFenceRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const sessionAuthenticatedRef = useRef(false);
  const unauthorizedBoundaryHandledRef = useRef(false);
  const operationSessionGenerationsRef = useRef(new Map());
  const vaultSourcePendingStoreRef = useRef(null);
  if (!vaultSourcePendingStoreRef.current) {
    vaultSourcePendingStoreRef.current = createOutlookVaultSourcePendingStore({
      officeStorage: window.OfficeRuntime?.storage,
      webStorage: resolveOutlookStartupStorage(window),
    });
  }
  const activeBusyTokenRef = useRef(null);
  const busyFenceRef = useRef(null);
  if (!busyFenceRef.current) busyFenceRef.current = createOutlookBusyFence();
  if (!businessReadFenceRef.current) {
    businessReadFenceRef.current = createOutlookBusinessReadFence();
  }
  const receiptControllerRef = useRef(null);
  if (!receiptControllerRef.current) {
    receiptControllerRef.current = createOutlookOperationReceiptController({ requestJson });
  }
  const receiptController = receiptControllerRef.current;
  const itemContextRef = useRef(null);
  const [item, setItem] = useState(() => officeItemSnapshot());
  const [officeReadyEpoch, setOfficeReadyEpoch] = useState(0);
  const itemAvailable = item !== null;
  const authenticated = authState === AUTH_STATE.authenticated;
  const graphConnected = graphConnection.state === GRAPH_STATE.connected;
  const credentialCleanupPending = graphConnection.status === "revoked"
    && graphConnection.credentialCleanupPending === true;
  const selectedMatter = outlookMatterSelectionForContext({
    selection: matterSelection,
    itemContext: outlookItemContext(item),
  });
  const selectedMatterId = selectedMatter?.matter_id ?? "";
  const selectedMatterDisplay = selectedMatter
    ? [selectedMatter.matter_code, selectedMatter.title, selectedMatter.client_display_name]
        .filter(Boolean)
        .join(" · ")
    : "";

  function currentOfficeItemSnapshot() {
    return officeItemSnapshot(canonicalIdentityRef.current);
  }

  function invalidateBusinessReadGeneration() {
    return businessReadFenceRef.current.invalidate();
  }

  function beginSessionBoundary(
    authenticatedNext,
    expectedOwner = null,
    { lifecycleRestart = false } = {},
  ) {
    if (expectedOwner && !authOwnerFence.isCurrent(expectedOwner)) return null;
    invalidateBusinessReadGeneration();
    invalidatePrecedentView();
    filingCorrectionReceiptRef.current = null;
    sessionGenerationRef.current += 1;
    sessionAuthenticatedRef.current = authenticatedNext === true;
    if (authenticatedNext !== true) setOutlookReadiness(null);
    unauthorizedBoundaryHandledRef.current = lifecycleRestart
      ? false
      : authenticatedNext !== true;
    operationSessionGenerationsRef.current.clear();
    releaseBusy();
    if (lifecycleRestart) return authOwnerFence.restart();
    const nextToken = authenticatedNext === true
      ? authOwnerFence.currentToken()
      : "";
    return authOwnerFence.begin({ token: nextToken || null });
  }

  function beginBusy(name) {
    const token = busyFenceRef.current.begin(name);
    activeBusyTokenRef.current = token;
    setBusy(name);
    return token;
  }

  function releaseBusy() {
    activeBusyTokenRef.current = null;
    busyFenceRef.current.invalidate();
    setBusy("");
  }

  function endBusy(token) {
    if (!busyFenceRef.current.end(token)) return false;
    if (activeBusyTokenRef.current === token) {
      activeBusyTokenRef.current = null;
      setBusy("");
      return true;
    }
    return false;
  }

  function captureBusinessRead({
    currentItem = currentOfficeItemSnapshot(),
    matterId = selectedMatterIdRef.current,
  } = {}) {
    return businessReadFenceRef.current.capture({
      authenticated: sessionAuthenticatedRef.current,
      itemContextKey: outlookItemContextKey(outlookItemContext(currentItem)),
      matterId,
    });
  }

  function isBusinessReadCurrent(
    snapshot,
    {
      currentItem = currentOfficeItemSnapshot(),
      matterId = selectedMatterForItem(currentItem)?.matter_id ?? "",
    } = {},
  ) {
    return businessReadFenceRef.current.isCurrent(snapshot, {
      authenticated: sessionAuthenticatedRef.current,
      itemContextKey: outlookItemContextKey(outlookItemContext(currentItem)),
      matterId,
    });
  }

  function assertBusinessReadCurrent(snapshot, options = {}) {
    if (!isBusinessReadCurrent(snapshot, options)) throw actionContextChangedError();
    return options.currentItem ?? currentOfficeItemSnapshot();
  }

  function isFilingCorrectionContextCurrent(snapshot) {
    const currentItem = currentOfficeItemSnapshot();
    const currentMatterId = selectedMatterForItem(currentItem)?.matter_id ?? "";
    const currentOverlay = overlayStateRef.current;
    return Boolean(snapshot)
      && snapshot.epoch === filingCorrectionEpochRef.current
      && snapshot.sessionGeneration === sessionGenerationRef.current
      && sessionAuthenticatedRef.current
      && snapshot.itemContextKey === outlookItemContextKey(outlookItemContext(currentItem))
      && isSameOutlookItem(snapshot.currentItem, currentItem)
      && snapshot.matterId === currentMatterId
      && isBusinessReadCurrent(snapshot.businessReadFence, { currentItem, matterId: currentMatterId })
      && currentOverlay.open
      && currentOverlay.featureId === "all-functions"
      && currentOverlay.view === "filing-correction";
  }

  function assertFilingCorrectionContextCurrent(snapshot, operationStartKey) {
    if (
      !isFilingCorrectionContextCurrent(snapshot)
      || (operationStartKey && (
        activeOperationStartKeyRef.current !== operationStartKey
        || operationSessionGenerationsRef.current.get(operationStartKey) !== snapshot.sessionGeneration
      ))
    ) throw actionContextChangedError();
  }

  function recoverFilingCorrectionReceipt(snapshot, expected = null) {
    const receipt = filingCorrectionReceiptRef.current;
    const boundExpected = receipt?.expected;
    const requestBinding = receipt?.request?.request_binding;
    const identityFields = ["email_thread_id", "original_receipt_id", "document_id", "source_matter_id"];
    if (
      !receipt
      || receipt.sessionGeneration !== snapshot.sessionGeneration
      || receipt.itemContextKey !== snapshot.itemContextKey
      || receipt.matterId !== snapshot.matterId
      || !isSameOutlookItem(receipt.currentItem, snapshot.currentItem)
      || !boundExpected
      || boundExpected.source_matter_id !== snapshot.matterId
      || identityFields.some((field) => requestBinding?.[field] !== boundExpected[field])
      || (expected && identityFields.some((field) => expected[field] !== boundExpected[field]))
    ) return null;
    const result = parseOutlookFilingCorrectionResponse(receipt.response, {
      request: receipt.request,
      current: { item_context_key: snapshot.itemContextKey, session_generation: snapshot.sessionGeneration },
    });
    return result.apply_to_current_view ? result : null;
  }

  function invalidateFilingCorrectionView() {
    filingCorrectionEpochRef.current += 1;
    filingCorrectionSearchEpochRef.current += 1;
    filingCorrectionDebouncerRef.current?.cancel();
    filingCorrectionContextRef.current = null;
    filingCorrectionTargetRef.current = null;
    setFilingCorrection(emptyFilingCorrection());
  }

  function updatePrecedentSearch(updater) {
    setPrecedentSearch((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      precedentSearchRef.current = next;
      return next;
    });
  }

  function invalidatePrecedentRequest() {
    precedentEpochRef.current += 1;
    precedentContextRef.current = null;
  }

  function invalidatePrecedentView() {
    invalidatePrecedentRequest();
    updatePrecedentSearch(emptyPrecedentSearch());
  }

  const mutateOverlay = useCallback((updater) => {
    setOverlayState((current) => {
      const next = updater(current);
      overlayStateRef.current = next;
      return next;
    });
  }, []);

  function clearBusinessView({ closeOverlay = true } = {}) {
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    if (closeOverlay) {
      mutateOverlay((state) => {
        const closed = closeOutlookOverlay(state, "auth-required");
        return createOutlookOverlayState({
          generation: closed.generation + 1,
          invalidated: true,
          closeReason: closed.closeReason,
          restoreFocusTo: closed.restoreFocusTo,
        });
      });
    }
    closeMatterSearch();
    canonicalIdentityRef.current = null;
    storeMatterSelection(null);
    setBootstrap(null);
    setTimeline([]);
    setDocuments([]);
    setError("");
    resetItemActionResults();
    clearEditorContexts();
    clearCompletedReceiptArchive();
  }

  useEffect(() => {
    const debouncer = createOutlookMatterSearchDebouncer({ requestJson });
    matterSearchDebouncerRef.current = debouncer;
    return () => {
      debouncer.cancel();
      if (matterSearchDebouncerRef.current === debouncer) {
        matterSearchDebouncerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const updateOnline = () => {
      const next = globalThis.navigator?.onLine !== false;
      setOnline(next);
      if (!next) invalidatePrecedentView();
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    const debouncer = createOutlookMatterSearchDebouncer({ requestJson });
    filingCorrectionDebouncerRef.current = debouncer;
    return () => {
      debouncer.cancel();
      if (filingCorrectionDebouncerRef.current === debouncer) filingCorrectionDebouncerRef.current = null;
    };
  }, []);

  useEffect(() => () => {
    receiptController.dispose();
  }, []);

  function rememberEditorContext(
    item = currentOfficeItemSnapshot(),
    matterId = selectedMatterIdRef.current,
  ) {
    editorContextsRef.current.save({
      item,
      matterId,
      value: Object.freeze({
        taskDraft: Object.freeze({ ...taskDraftRef.current }),
        taskResult: taskResultRef.current,
        taskSourceEmailThreadId: taskSourceEmailThreadIdRef.current,
        timeDraft: Object.freeze({ ...timeDraftRef.current }),
        timeDraftResult: timeDraftResultRef.current,
      }),
    });
  }

  function restoreEditorContext(item, matterId) {
    const stored = editorContextsRef.current.load({ item, matterId });
    const nextTaskDraft = stored ? { ...stored.taskDraft } : emptyTaskDraft();
    const nextTaskResult = stored?.taskResult ?? null;
    const nextTimeDraft = stored ? { ...stored.timeDraft } : emptyTimeDraft();
    const nextTimeDraftResult = stored?.timeDraftResult ?? null;
    taskDraftRef.current = nextTaskDraft;
    taskResultRef.current = nextTaskResult;
    taskSourceEmailThreadIdRef.current = stored?.taskSourceEmailThreadId ?? null;
    timeDraftRef.current = nextTimeDraft;
    timeDraftResultRef.current = nextTimeDraftResult;
    setTaskDraft(nextTaskDraft);
    setTaskResult(nextTaskResult);
    setTimeDraft(nextTimeDraft);
    setTimeDraftResult(nextTimeDraftResult);
  }

  function clearEditorContexts() {
    editorContextsRef.current.clear();
    restoreEditorContext(null, "");
  }

  function vaultAttachmentPendingKey(
    currentItem = currentOfficeItemSnapshot(),
    matterId = selectedMatterForItem(currentItem)?.matter_id ?? "",
  ) {
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    return itemContextKey && matterId
      ? `${itemContextKey}\u001f${matterId}`
      : "";
  }

  function rememberVaultAttachmentPending(key, pending) {
    if (!key || !pending) return;
    const archive = vaultAttachmentPendingArchiveRef.current;
    archive.set(key, pending);
    while (archive.size > 16) archive.delete(archive.keys().next().value);
    if (key === vaultAttachmentPendingKey()) setVaultAttachmentPending(pending);
  }

  function clearVaultAttachmentPickerView() {
    setVaultAttachmentCandidateKey("");
    setVaultAttachmentPending(null);
    setVaultAttachmentResult(null);
  }

  function resetItemActionResults() {
    setEmailResult(null);
    setAttachmentResult(null);
    setVaultSourceSaveResult(null);
    taskResultRef.current = null;
    timeDraftResultRef.current = null;
    setTaskResult(null);
    setTimeDraftResult(null);
    setTimeline([]);
    setDocuments([]);
    setLastResult(null);
    clearVaultAttachmentPickerView();
  }

  function clearCompletedReceiptArchive() {
    receiptController.clear();
    setReceiptRecovery(null);
  }

  function invalidateOperationContext() {
    operationEpochRef.current += 1;
    invalidateBusinessReadGeneration();
    activeOperationStartKeyRef.current =
      `invalidated:${operationEpochRef.current}`;
  }

  function storeMatterSelection(selection, { invalidate = false } = {}) {
    if (invalidate) invalidateOperationContext();
    matterSelectionRef.current = selection;
    selectedMatterIdRef.current = selection?.matter_id ?? "";
    setMatterSelection(selection);
  }

  function selectMatter(matterId) {
    const currentItem = officeItemSnapshot(canonicalIdentityRef.current);
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    rememberEditorContext(currentItem, selectedMatterIdRef.current);
    receiptController.invalidateContext();
    if (!matterId) {
      storeMatterSelection(null, { invalidate: true });
      resetItemActionResults();
      restoreEditorContext(currentItem, "");
      setReceiptRecovery(null);
      return;
    }
    const nextMatter = matters.find((entry) => entry.matter_id === matterId);
    if (!nextMatter) {
      setError("선택한 Matter를 다시 검색해 주세요.");
      return;
    }
    const selection = createOutlookMatterSelection({
      itemContext: outlookItemContext(currentItem),
      matter: nextMatter,
    });
    storeMatterSelection(selection, { invalidate: true });
    resetItemActionResults();
    restoreEditorContext(currentItem, nextMatter.matter_id);
    setReceiptRecovery(null);
    const receiptReadFence = captureBusinessRead({
      currentItem,
      matterId: nextMatter.matter_id,
    });
    void restoreSelectedMatterReceiptContext({
      matterId: nextMatter.matter_id,
      sourceItem: currentItem,
      businessReadFence: receiptReadFence,
    }).catch((nextError) => {
      if (isBusinessReadCurrent(receiptReadFence, {
        currentItem,
        matterId: nextMatter.matter_id,
      })) setError(actionErrorMessage(nextError));
    });
  }

  async function restoreSelectedMatterReceiptContext({
    matterId,
    sourceItem,
    businessReadFence = null,
  } = {}) {
    if (!matterId || !sourceItem) return;
    const readFence = businessReadFence ?? captureBusinessRead({
      currentItem: sourceItem,
      matterId,
    });
    if (!isBusinessReadCurrent(readFence, { currentItem: sourceItem, matterId })) return;
    if (sourceItem.mode === "compose" && sourceItem.provenance === "draft") {
      setReceiptRecovery(null);
      await refreshMatter(matterId, { businessReadFence: readFence });
      return;
    }
    let pinnedItem = sourceItem;
    if (!pinnedItem.canonical_graph_message_id) {
      const identityRequest = createOutlookCanonicalMessageIdentityRequest({
        item: sourceItem,
        matterId,
      });
      const identityResponse = await requestJson(identityRequest.path, {
        method: identityRequest.method,
        body: identityRequest.body,
      });
      if (
        !isSameOutlookItem(sourceItem, officeItemSnapshot())
        || !isBusinessReadCurrent(readFence, { currentItem: sourceItem, matterId })
      ) return;
      canonicalIdentityRef.current = identityResponse.item;
      pinnedItem = applyOutlookCanonicalMessageIdentity({
        item: sourceItem,
        response: identityResponse,
      });
      setItem(pinnedItem);
    }
    const receipts = await receiptController.restore({
      matterId,
      currentItem: pinnedItem,
      isCurrent: () => {
        const currentItem = officeItemSnapshot();
        return isSameOutlookItem(pinnedItem, currentItem)
          && selectedMatterForItem(currentItem)?.matter_id === matterId
          && isBusinessReadCurrent(readFence, { currentItem, matterId });
      },
    });
    const currentItem = officeItemSnapshot();
    if (
      !isSameOutlookItem(pinnedItem, currentItem)
      || selectedMatterForItem(currentItem)?.matter_id !== matterId
      || !isBusinessReadCurrent(readFence, { currentItem, matterId })
    ) return;
    setReceiptRecovery(receipts[0] ?? null);
    await refreshMatter(matterId, {
      receiptReadbackItem: pinnedItem,
      businessReadFence: readFence,
    });
  }

  function closeMatterSearch() {
    matterSearchDebouncerRef.current?.cancel();
    setMatterSearchQuery("");
    setMatters([]);
  }

  function handleMatterSearchQueryChange(event) {
    const query = event.target.value;
    setMatterSearchQuery(query);
    setMatters([]);
    const openedOverlay = overlayStateRef.current;
    const searchReadFence = captureBusinessRead({
      currentItem: currentOfficeItemSnapshot(),
      matterId: selectedMatterIdRef.current,
    });
    const request = matterSearchDebouncerRef.current?.search({
      opened: openedOverlay.open && openedOverlay.featureId === "matter.search",
      query,
      onResults: (result) => {
        const currentOverlay = overlayStateRef.current;
        if (
          isBusinessReadCurrent(searchReadFence, {
            currentItem: currentOfficeItemSnapshot(),
            matterId: selectedMatterIdRef.current,
          })
          &&
          currentOverlay.open
          && currentOverlay.featureId === "matter.search"
          && currentOverlay.itemContextKey === openedOverlay.itemContextKey
        ) setMatters(result.items);
      },
      onError: (nextError) => {
        const currentOverlay = overlayStateRef.current;
        if (
          !isBusinessReadCurrent(searchReadFence, {
            currentItem: currentOfficeItemSnapshot(),
            matterId: selectedMatterIdRef.current,
          })
          ||
          !currentOverlay.open
          || currentOverlay.featureId !== "matter.search"
          || currentOverlay.itemContextKey !== openedOverlay.itemContextKey
        ) return;
        setMatters([]);
        setError(actionErrorMessage(nextError));
      },
    });
    if (!request) matterSearchDebouncerRef.current?.cancel();
  }

  function openFilingCorrection() {
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "filing-correction",
      openerId: state.openerId,
      itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("filing-correction-back")?.focus());
    const eligible = authenticated && currentItem?.mode === "read" && Boolean(matter);
    const liveFiling = eligible
      && isFiledEmailContextCurrent({ emailResult, currentItem, matterId: matter.matter_id })
      && emailResult?.email_thread_id
      && emailResult?.timeline_event_id
      && emailResult?.document_ids?.length === 1;
    const expected = liveFiling ? Object.freeze({
      email_thread_id: emailResult.email_thread_id,
      original_receipt_id: emailResult.timeline_event_id,
      document_id: emailResult.document_ids[0],
      source_matter_id: matter.matter_id,
    }) : null;
    if (eligible && (expected || emailResult === null)) {
      try {
        const recoveredResult = recoverFilingCorrectionReceipt({
          currentItem,
          itemContextKey,
          matterId: matter.matter_id,
          sessionGeneration: sessionGenerationRef.current,
        }, expected);
        if (recoveredResult) {
          setFilingCorrection((current) => ({
            ...current,
            currentPlacement: recoveredResult.current,
            resultOnly: true,
            result: recoveredResult,
            notice: null,
          }));
          return;
        }
      } catch {
        filingCorrectionReceiptRef.current = null;
      }
    }
    if (!expected) {
      const message = "선택한 메일을 현재 Matter에 저장한 뒤 다시 시도해 주세요.";
      setFilingCorrection((current) => ({
        ...current,
        notice: { status: OUTLOOK_OPERATION_STATES.staleItem, visibleMessage: message, fullMessage: message, testId: "filing-correction-state" },
      }));
      return;
    }
    const snapshot = Object.freeze({
      epoch: filingCorrectionEpochRef.current,
      currentItem,
      itemContextKey,
      matterId: matter.matter_id,
      sessionGeneration: sessionGenerationRef.current,
      businessReadFence: captureBusinessRead({ currentItem, matterId: matter.matter_id }),
      expected,
    });
    filingCorrectionContextRef.current = snapshot;
    setFilingCorrection((current) => ({
      ...current,
      notice: { status: OUTLOOK_OPERATION_STATES.working, visibleMessage: "현재 저장 위치를 확인하고 있습니다.", fullMessage: "현재 저장 위치를 확인하고 있습니다.", testId: "filing-correction-state" },
    }));
    void (async () => {
      try {
        const request = createOutlookFilingCorrectionCurrentRequest(expected);
        const body = await requestJson(request.path);
        if (!isFilingCorrectionContextCurrent(snapshot)) return;
        const currentPlacement = parseOutlookFilingCorrectionCurrentResponse(body, expected);
        if (!isFilingCorrectionContextCurrent(snapshot)) return;
        setFilingCorrection((current) => ({ ...current, currentPlacement, notice: null }));
      } catch (nextError) {
        if (isFilingCorrectionContextCurrent(snapshot)) {
          setFilingCorrection((current) => ({ ...current, notice: filingCorrectionErrorNotice(nextError) }));
        }
      }
    })();
  }

  function handleFilingCorrectionQueryChange(event) {
    const query = event.target.value;
    const snapshot = filingCorrectionContextRef.current;
    const searchEpoch = ++filingCorrectionSearchEpochRef.current;
    filingCorrectionTargetRef.current = null;
    setFilingCorrection((current) => ({
      ...current,
      targetQuery: query,
      targetMatters: [],
      targetMatterId: "",
      confirmed: false,
      result: null,
      notice: null,
    }));
    const request = filingCorrectionDebouncerRef.current?.search({
      opened: isFilingCorrectionContextCurrent(snapshot),
      query,
      onResults: (result) => {
        if (searchEpoch !== filingCorrectionSearchEpochRef.current || !isFilingCorrectionContextCurrent(snapshot)) return;
        setFilingCorrection((current) => ({
          ...current,
          targetMatters: result.items.filter((matter) => matter.matter_id !== snapshot.matterId),
        }));
      },
      onError: (nextError) => {
        if (searchEpoch !== filingCorrectionSearchEpochRef.current || !isFilingCorrectionContextCurrent(snapshot)) return;
        setFilingCorrection((current) => ({ ...current, notice: filingCorrectionErrorNotice(nextError) }));
      },
    });
    if (!request) filingCorrectionDebouncerRef.current?.cancel();
  }

  function handleFilingCorrectionTargetChange(event) {
    const targetMatterId = event.target.value;
    const candidate = filingCorrection.targetMatters.find((matter) => matter.matter_id === targetMatterId);
    try {
      filingCorrectionTargetRef.current = candidate
        ? createOutlookMatterSelection({
            itemContext: outlookItemContext(currentOfficeItemSnapshot()),
            matter: candidate,
          })
        : null;
    } catch {
      filingCorrectionTargetRef.current = null;
    }
    setFilingCorrection((current) => ({
      ...current,
      targetMatterId: filingCorrectionTargetRef.current?.matter_id ?? "",
      confirmed: false,
      result: null,
    }));
  }

  async function submitFilingCorrection() {
    const snapshot = filingCorrectionContextRef.current;
    const targetSelection = filingCorrectionTargetRef.current;
    if (!isFilingCorrectionContextCurrent(snapshot) || !targetSelection) {
      if (snapshot && isFilingCorrectionContextCurrent(snapshot)) {
        setFilingCorrection((current) => ({ ...current, notice: filingCorrectionErrorNotice(actionContextChangedError()) }));
      }
      return null;
    }
    let operationStartKey;
    let busyToken;
    try {
      operationStartKey = beginOperation();
      busyToken = beginBusy("correction");
    } catch (nextError) {
      setFilingCorrection((current) => ({ ...current, notice: filingCorrectionErrorNotice(nextError) }));
      return null;
    }
    setFilingCorrection((current) => ({ ...current, result: null, notice: null }));
    try {
      const targetRequest = createOutlookMatterRevalidationRequest({
        selection: targetSelection,
        itemContext: outlookItemContext(snapshot.currentItem),
      });
      const targetBody = await requestJson(targetRequest.path);
      assertFilingCorrectionContextCurrent(snapshot, operationStartKey);
      const refreshedTarget = revalidateOutlookMatterSelection({
        selection: targetSelection,
        itemContext: outlookItemContext(snapshot.currentItem),
        searchResponse: targetBody,
      });
      if (refreshedTarget.matter_id === snapshot.matterId) throw actionContextChangedError();
      filingCorrectionTargetRef.current = refreshedTarget;

      const currentRequest = createOutlookFilingCorrectionCurrentRequest(snapshot.expected);
      const currentBody = await requestJson(currentRequest.path);
      assertFilingCorrectionContextCurrent(snapshot, operationStartKey);
      const currentPlacement = parseOutlookFilingCorrectionCurrentResponse(currentBody, snapshot.expected);
      const request = await createOutlookFilingCorrectionRequest({
        item_context_key: snapshot.itemContextKey,
        session_generation: snapshot.sessionGeneration,
        email_thread_id: snapshot.expected.email_thread_id,
        current_placement: currentPlacement,
        target_matter_id: refreshedTarget.matter_id,
        reason: filingCorrection.reason,
      });
      assertFilingCorrectionContextCurrent(snapshot, operationStartKey);
      const body = await requestJson(request.path, {
        method: request.method,
        body: request.body,
        retryAfterUnauthorized: false,
      });
      const liveItemContextKey = outlookItemContextKey(outlookItemContext(currentOfficeItemSnapshot()));
      const result = parseOutlookFilingCorrectionResponse(body, {
        request,
        current: { item_context_key: liveItemContextKey, session_generation: sessionGenerationRef.current },
      });
      if (!sessionAuthenticatedRef.current || sessionGenerationRef.current !== snapshot.sessionGeneration) return result;
      filingCorrectionReceiptRef.current = Object.freeze({
        response: body,
        request,
        currentItem: snapshot.currentItem,
        itemContextKey: snapshot.itemContextKey,
        matterId: snapshot.matterId,
        expected: snapshot.expected,
        sessionGeneration: snapshot.sessionGeneration,
      });
      if (!result.apply_to_current_view || !isFilingCorrectionContextCurrent(snapshot)) return result;
      setFilingCorrection((current) => ({ ...current, resultOnly: true, result, notice: null }));
      try {
        await refreshMatter(snapshot.matterId, {
          receiptReadbackItem: snapshot.currentItem,
          businessReadFence: snapshot.businessReadFence,
        });
        if (!isFilingCorrectionContextCurrent(snapshot)) return result;
      } catch {
        if (isFilingCorrectionContextCurrent(snapshot)) {
          const message = "저장 위치는 바뀌었지만 Matter 목록은 새로 불러오지 못했습니다.";
          setFilingCorrection((current) => ({
            ...current,
            notice: { status: OUTLOOK_OPERATION_STATES.partial, visibleMessage: message, fullMessage: message, testId: "filing-correction-readback-pending" },
          }));
        }
      }
      return result;
    } catch (nextError) {
      if (isFilingCorrectionContextCurrent(snapshot)) {
        setFilingCorrection((current) => ({ ...current, notice: filingCorrectionErrorNotice(nextError) }));
      }
      return null;
    } finally {
      endBusy(busyToken);
    }
  }

  function backFromFilingCorrection() {
    invalidateFilingCorrectionView();
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "catalog",
      openerId: state.openerId,
      itemContextKey: state.itemContextKey,
    }));
    queueMicrotask(() => {
      const opener = document.getElementById("filing-correction-open");
      if (opener && !opener.disabled) opener.focus();
      else document.querySelector('[role="dialog"] [data-testid="outlook-overlay-close"]:not(:disabled)')?.focus();
    });
  }

  function openConversationPolicy() {
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    if (!sessionAuthenticatedRef.current || currentItem?.mode !== "read" || !matter || !itemContextKey || !currentItem.conversation_id) return;
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "conversation-auto-save",
      openerId: state.openerId,
      itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("conversation-auto-save-back")?.focus());
  }

  function backFromConversationPolicy() {
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "catalog",
      openerId: state.openerId,
      itemContextKey: state.itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("conversation-auto-save-open")?.focus());
  }

  function openDocumentSigning() {
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    if (!sessionAuthenticatedRef.current || !currentItem || !matter || !itemContextKey) return;
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "document-create-and-sign-status",
      openerId: state.openerId,
      itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("document-create-and-sign-status-back")?.focus());
  }

  function backFromDocumentSigning() {
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "catalog",
      openerId: state.openerId,
      itemContextKey: state.itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("document-create-and-sign-status-open")?.focus());
  }

  function capturePrecedentContext() {
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const currentOverlay = overlayStateRef.current;
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    if (
      !sessionAuthenticatedRef.current
      || !currentItem
      || !matter
      || !itemContextKey
      || globalThis.navigator?.onLine === false
      || !currentOverlay.open
      || currentOverlay.featureId !== "all-functions"
      || currentOverlay.view !== "precedent-search"
    ) return null;
    const snapshot = Object.freeze({
      epoch: ++precedentEpochRef.current,
      currentItem,
      itemContextKey,
      matterId: matter.matter_id,
      sessionGeneration: sessionGenerationRef.current,
      overlayGeneration: currentOverlay.generation,
      businessReadFence: captureBusinessRead({ currentItem, matterId: matter.matter_id }),
    });
    precedentContextRef.current = snapshot;
    return snapshot;
  }

  function isPrecedentContextCurrent(snapshot) {
    const currentItem = currentOfficeItemSnapshot();
    const matterId = selectedMatterForItem(currentItem)?.matter_id ?? "";
    const currentOverlay = overlayStateRef.current;
    return Boolean(snapshot)
      && precedentContextRef.current === snapshot
      && snapshot.epoch === precedentEpochRef.current
      && snapshot.sessionGeneration === sessionGenerationRef.current
      && sessionAuthenticatedRef.current
      && globalThis.navigator?.onLine !== false
      && snapshot.itemContextKey === outlookItemContextKey(outlookItemContext(currentItem))
      && isSameOutlookItem(snapshot.currentItem, currentItem)
      && snapshot.matterId === matterId
      && isBusinessReadCurrent(snapshot.businessReadFence, { currentItem, matterId })
      && currentOverlay.open
      && currentOverlay.featureId === "all-functions"
      && currentOverlay.view === "precedent-search"
      && currentOverlay.generation === snapshot.overlayGeneration;
  }

  async function readPrecedentReadiness(snapshot) {
    const request = createOutlookPrecedentReadinessRequest({ matterId: snapshot.matterId });
    if (!request) throw Object.assign(new Error("OUTLOOK_PRECEDENT_MATTER_REQUIRED"), { safe_error_code: "OUTLOOK_PRECEDENT_MATTER_REQUIRED" });
    const body = await requestJson(request.path, { method: request.method });
    if (!isPrecedentContextCurrent(snapshot)) return null;
    const readiness = parseOutlookPrecedentReadiness(body);
    return isPrecedentContextCurrent(snapshot) ? readiness : null;
  }

  function blockPrecedentSearch(error) {
    const indexStale = error?.safe_error_code === "PRECEDENT_INDEX_STALE";
    updatePrecedentSearch({
      ...emptyPrecedentSearch(),
      indexStale,
    });
  }

  async function refreshPrecedentReadiness() {
    const snapshot = capturePrecedentContext();
    if (!snapshot) return null;
    updatePrecedentSearch({ ...emptyPrecedentSearch(), busy: true });
    try {
      const readiness = await readPrecedentReadiness(snapshot);
      if (!readiness || !isPrecedentContextCurrent(snapshot)) return null;
      updatePrecedentSearch({ ...emptyPrecedentSearch(), readiness });
      return readiness;
    } catch (nextError) {
      if (isPrecedentContextCurrent(snapshot)) blockPrecedentSearch(nextError);
      return null;
    }
  }

  async function runPrecedentSearch({ query, cursor = null, append = false } = {}) {
    const snapshot = capturePrecedentContext();
    if (!snapshot) return null;
    const startingState = precedentSearchRef.current;
    const retry = Object.freeze({ query, cursor, append });
    updatePrecedentSearch((current) => ({
      ...current,
      ...(append ? {} : { stableQuery: "", items: [], selectedItem: null, nextCursor: null, empty: false }),
      query: typeof query === "string" ? query : "",
      busy: true,
      error: "",
      retry,
    }));
    let readiness = null;
    try {
      readiness = await readPrecedentReadiness(snapshot);
      if (!readiness || !isPrecedentContextCurrent(snapshot)) return null;
      const request = createOutlookPrecedentSearchRequest({
        readiness,
        query,
        matterId: snapshot.matterId,
        cursor,
        limit: 10,
      });
      if (!request || (append && request.cursor !== cursor)) {
        throw Object.assign(new Error("OUTLOOK_PRECEDENT_SEARCH_INVALID"), { safe_error_code: "OUTLOOK_PRECEDENT_SEARCH_INVALID" });
      }
      const body = await requestJson(request.path, { method: request.method });
      if (!isPrecedentContextCurrent(snapshot)) return null;
      const sanitized = sanitizeOutlookPrecedentSearchResponse(body, { matterId: snapshot.matterId });
      const projected = sanitized.items.map(projectOutlookPrecedentDisplay);
      if (!isPrecedentContextCurrent(snapshot)) return null;
      const current = precedentSearchRef.current;
      const priorItems = append ? current.items : [];
      if (append && (current.stableQuery !== request.query || current.nextCursor !== request.cursor)) return null;
      const sourceIds = new Set(priorItems.map((item) => item.copyable.source_id));
      if (projected.some((item) => sourceIds.has(item.copyable.source_id))) {
        throw Object.assign(new Error("OUTLOOK_PRECEDENT_RESPONSE_INVALID"), { safe_error_code: "OUTLOOK_PRECEDENT_RESPONSE_INVALID" });
      }
      const items = [...priorItems, ...projected];
      updatePrecedentSearch({
        readiness,
        query: typeof query === "string" ? query : "",
        stableQuery: request.query,
        items,
        selectedItem: append ? current.selectedItem : null,
        nextCursor: sanitized.next_cursor,
        busy: false,
        error: "",
        empty: items.length === 0,
        indexStale: false,
        retry: null,
      });
      return sanitized;
    } catch (nextError) {
      if (!isPrecedentContextCurrent(snapshot)) return null;
      if (!readiness || ["PRECEDENT_INDEX_STALE", "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE", "OUTLOOK_PRECEDENT_READINESS_INVALID"].includes(nextError?.safe_error_code)) {
        blockPrecedentSearch(nextError);
        return null;
      }
      updatePrecedentSearch(append
        ? {
            ...startingState,
            readiness,
            busy: false,
            error: "검색 결과를 확인할 수 없습니다. 다시 시도해 주세요.",
            retry,
          }
        : {
            ...emptyPrecedentSearch(),
            readiness,
            query: typeof query === "string" ? query : "",
            error: "검색 결과를 확인할 수 없습니다. 다시 시도해 주세요.",
            retry,
          });
      return null;
    }
  }

  function openPrecedentSearch() {
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    if (!sessionAuthenticatedRef.current || !currentItem || !matter || globalThis.navigator?.onLine === false) return;
    invalidateFilingCorrectionView();
    invalidatePrecedentView();
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "precedent-search",
      openerId: state.openerId,
      itemContextKey: outlookItemContextKey(outlookItemContext(currentItem)),
    }));
    queueMicrotask(() => {
      document.getElementById("precedent-search-back")?.focus();
      void refreshPrecedentReadiness();
    });
  }

  function backFromPrecedentSearch() {
    invalidatePrecedentView();
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId: "all-functions",
      view: "catalog",
      openerId: state.openerId,
      itemContextKey: state.itemContextKey,
    }));
    queueMicrotask(() => document.getElementById("precedent-search-open")?.focus());
  }

  function retryPrecedentSearch() {
    const retry = precedentSearchRef.current.retry;
    if (retry) {
      void runPrecedentSearch(retry);
      return;
    }
    void refreshPrecedentReadiness();
  }

  function openVaultDocument(documentId) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(documentId ?? "")) return;
    const value = `?view=vault&document_id=${encodeURIComponent(documentId)}#vault-search-documents`;
    let target;
    try { target = new URL(value, `${window.location.origin}/`); } catch { return; }
    const keys = [...target.searchParams.keys()];
    if (
      target.origin !== window.location.origin
      || target.pathname !== "/"
      || target.username
      || target.password
      || target.hash !== "#vault-search-documents"
      || keys.length !== 2
      || keys[0] !== "view"
      || keys[1] !== "document_id"
      || target.searchParams.get("view") !== "vault"
      || target.searchParams.get("document_id") !== documentId
    ) return;
    window.open(target.toString(), "_blank", "noopener,noreferrer");
  }

  function openPrecedentDeepLink(value) {
    const projected = precedentSearchRef.current.selectedItem?.copyable;
    if (!projected || value !== projected.deep_link) return;
    let expected;
    let target;
    try {
      expected = buildOutlookPrecedentDeepLink(projected);
      target = new URL(value, `${window.location.origin}/`);
    } catch {
      return;
    }
    const keys = [...target.searchParams.keys()];
    if (
      value !== expected
      || target.origin !== window.location.origin
      || target.pathname !== "/"
      || target.username
      || target.password
      || target.hash !== "#vault-search-documents"
      || keys.join("\u001f") !== "view\u001fmatter_id\u001fdocument_id\u001fdocument_version_id\u001fdocument_sha256"
      || target.searchParams.get("view") !== "vault"
      || target.searchParams.get("matter_id") !== projected.source_matter_id
      || target.searchParams.get("document_id") !== projected.document_id
      || target.searchParams.get("document_version_id") !== projected.version_id
      || target.searchParams.get("document_sha256") !== projected.content_sha256
    ) return;
    window.open(target.toString(), "_blank", "noopener,noreferrer");
  }

  function openCanonicalMatterDocument(value) {
    const match = typeof value === "string"
      ? /^matter:\/\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/documents\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})\/versions\/([A-Za-z0-9][A-Za-z0-9._:-]{0,255})$/u.exec(value)
      : null;
    const currentItem = currentOfficeItemSnapshot();
    const matterId = selectedMatterForItem(currentItem)?.matter_id ?? "";
    if (!match || match[1] !== matterId) return;
    openVaultDocument(match[2]);
  }

  function captureAllFunctionsFeatureContext(view, { connectionBound = false } = {}) {
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const currentOverlay = overlayStateRef.current;
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    const itemIdentityKey = outlookItemIdentityKey(currentItem);
    const conversationId = currentItem?.conversation_id ?? "";
    const m365ConnectionId = connectionBound ? graphConnection.m365ConnectionId ?? "" : null;
    if (
      !sessionAuthenticatedRef.current
      || !currentItem
      || !matter
      || !itemContextKey
      || !itemIdentityKey
      || !currentOverlay.open
      || currentOverlay.featureId !== "all-functions"
      || currentOverlay.view !== view
      || currentOverlay.itemContextKey !== itemContextKey
    ) return null;
    const sessionGeneration = sessionGenerationRef.current;
    const overlayGeneration = currentOverlay.generation;
    return Object.freeze({
      contextKey: [sessionGeneration, itemContextKey, itemIdentityKey, matter.matter_id, conversationId, overlayGeneration, view, m365ConnectionId ?? ""].join("\u001d"),
      sessionGeneration,
      currentItem,
      itemContextKey,
      itemIdentityKey,
      matterId: matter.matter_id,
      conversationId,
      overlayGeneration,
      view,
      connectionBound,
      m365ConnectionId,
    });
  }

  function isAllFunctionsFeatureContextCurrent(captured, featureSnapshot) {
    const currentItem = currentOfficeItemSnapshot();
    const matterId = selectedMatterForItem(currentItem)?.matter_id ?? "";
    const currentOverlay = overlayStateRef.current;
    return Boolean(captured)
      && featureSnapshot?.contextKey === captured.contextKey
      && featureSnapshot?.matterId === captured.matterId
      && (!Object.hasOwn(featureSnapshot, "conversationId") || featureSnapshot.conversationId === captured.conversationId)
      && (!captured.connectionBound || featureSnapshot?.m365ConnectionId === captured.m365ConnectionId)
      && captured.sessionGeneration === sessionGenerationRef.current
      && sessionAuthenticatedRef.current
      && captured.itemContextKey === outlookItemContextKey(outlookItemContext(currentItem))
      && captured.itemIdentityKey === outlookItemIdentityKey(currentItem)
      && isSameOutlookItem(captured.currentItem, currentItem)
      && captured.matterId === matterId
      && captured.conversationId === (currentItem?.conversation_id ?? "")
      && (!captured.connectionBound || captured.m365ConnectionId === (graphConnection.m365ConnectionId ?? ""))
      && currentOverlay.open
      && currentOverlay.featureId === "all-functions"
      && currentOverlay.view === captured.view
      && currentOverlay.generation === captured.overlayGeneration
      && currentOverlay.itemContextKey === captured.itemContextKey;
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
    return normalizeOutlookOperationError(error).visible_action;
  }

  async function loadBase() {
    setError("");
    const readFence = captureBusinessRead();
    const boot = await requestJson("/api/outlook/bootstrap");
    assertBusinessReadCurrent(readFence);
    setBootstrap(boot.item);
  }

  async function refreshMatter(
    matterId = selectedMatterIdRef.current,
    {
      operationSnapshot = null,
      receiptReadbackItem = null,
      businessReadFence = null,
    } = {},
  ) {
    if (!matterId) {
      setTimeline([]);
      setDocuments([]);
      setReceiptRecovery(null);
      return Object.freeze({ timeline_count: 0, document_count: 0 });
    }
    const readbackItem = receiptReadbackItem ?? currentOfficeItemSnapshot();
    const readFence = businessReadFence ?? captureBusinessRead({
      currentItem: readbackItem,
      matterId,
    });
    const [activity, documentBody] = await Promise.all([
      loadOutlookMatterActivity({ matterId, requestJson }),
      requestJson(`/api/outlook/matters/${encodeURIComponent(matterId)}/documents`),
    ]);
    if (!isBusinessReadCurrent(readFence, {
      currentItem: readbackItem,
      matterId,
    })) {
      if (operationSnapshot) assertOperationContextCurrent(operationSnapshot);
      return Object.freeze({ timeline_count: 0, document_count: 0 });
    }
    if (operationSnapshot) {
      assertOperationContextCurrent(operationSnapshot);
    }
    if (
      receiptReadbackItem
      && (
        !isSameOutlookItem(receiptReadbackItem, currentOfficeItemSnapshot())
        || selectedMatterForItem(currentOfficeItemSnapshot())?.matter_id !== matterId
      )
    ) return Object.freeze({ timeline_count: 0, document_count: 0 });
    setTimeline(activity.rows);
    setDocuments(documentBody.items ?? []);
    if (receiptReadbackItem) {
      syncCompletedReceiptRecovery({
        currentItem: receiptReadbackItem,
        matterId,
        timeline: activity.rows,
        documents: documentBody.items,
      });
    }
    return Object.freeze({
      timeline_count: activity.rows.length,
      document_count: documentBody.items?.length ?? 0,
    });
  }

  async function refreshGraphConnection({ loadBusinessData = true } = {}) {
    const readFence = captureBusinessRead();
    setOutlookReadiness(null);
    let body;
    try {
      body = await requestJson("/api/outlook/connection");
    } catch (nextError) {
      if (!isBusinessReadCurrent(readFence)) return null;
      throw nextError;
    }
    if (!isBusinessReadCurrent(readFence)) return null;
    const next = parseOutlookConnectionRecord(body);
    setGraphConnection(next);
    await refreshOutlookReadiness({ readFence });
    if (loadBusinessData && next.state === GRAPH_STATE.connected) {
      try {
        await loadBase();
      } catch (error) {
        if (!isBusinessReadCurrent(readFence)) return next;
        // Keep the real connection status even if a secondary business read
        // fails; callers can show the read error without inventing a logout.
        if (error && typeof error === "object") error.graph_connection_state = next.state;
        throw error;
      }
    } else if (next.state !== GRAPH_STATE.connected) {
      invalidateBusinessReadGeneration();
      clearBusinessView();
    }
    return next;
  }

  async function refreshOutlookReadiness({ readFence = captureBusinessRead() } = {}) {
    try {
      const body = await requestJson("/api/outlook/readiness");
      if (!isBusinessReadCurrent(readFence)) return null;
      const presentation = presentOutlookReadiness(body);
      setOutlookReadiness(presentation);
      return presentation;
    } catch {
      if (!isBusinessReadCurrent(readFence)) return null;
      const presentation = presentOutlookReadiness(null);
      setOutlookReadiness(presentation);
      return presentation;
    }
  }

  function runOutlookReadinessAction() {
    if (outlookReadiness?.action === OUTLOOK_READINESS_ACTIONS.confirmMicrosoft) {
      void connectOutlook();
      return;
    }
    void refreshOutlookReadiness();
  }

  function retryOutlookStartup() {
    window.location.reload();
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
      const initialItem = currentOfficeItemSnapshot();
      itemContextRef.current = outlookItemContext(initialItem);
      setItem(initialItem);
      unsubscribe = subscribeToOutlookItemChanges({
        Office: window.Office,
        onChange: () => {
          const previousContext = itemContextRef.current;
          rememberEditorContext(previousContext?.item, selectedMatterIdRef.current);
          canonicalIdentityRef.current = null;
          const nextItem = officeItemSnapshot();
          const currentContext = outlookItemContext(nextItem);
          const currentOverlay = overlayStateRef.current;
          const openerId = currentOverlay.openerId
            || (currentOverlay.featureId ? outlookRailButtonId(currentOverlay.featureId) : null);
          const disposition = outlookItemChangeDisposition({
            previousContext,
            currentContext,
            openerId,
          });
          itemContextRef.current = currentContext;
          invalidateOperationContext();
          invalidateFilingCorrectionView();
          invalidatePrecedentView();
          receiptController.invalidateContext();
          matterSearchDebouncerRef.current?.cancel();
          releaseBusy();
          setItem(nextItem);
          if (disposition.close_overlay) {
            mutateOverlay((state) => invalidateOutlookOverlayForItemChange(
              state,
              outlookItemContextKey(currentContext),
            ));
            setMatterSearchQuery("");
            setMatters([]);
          }
          if (disposition.clear_matter_selection) {
            storeMatterSelection(null);
          }
          resetItemActionResults();
          restoreEditorContext(nextItem, selectedMatterIdRef.current);
          setReceiptRecovery(null);
          setError("");
          if (disposition.restore_focus_to) {
            queueMicrotask(() => {
              document.getElementById(disposition.restore_focus_to)?.focus();
            });
          }
        },
      });
    });
    return () => {
      cancelled = true;
      invalidateBusinessReadGeneration();
      unsubscribe();
    };
  }, [officeReadyEpoch]);

  useEffect(() => {
    let active = true;
    let startupOwner = authOwnerFence.capture();
    const unregisterAuthHandlers = registerOutlookStartupAuthHandlers({
      unauthorized: (requestOwner) => {
        if (
          !active
          || !authOwnerFence.isCurrent(requestOwner)
          || unauthorizedBoundaryHandledRef.current
        ) return null;
        const recoveryOwner = beginSessionBoundary(false, requestOwner);
        if (!recoveryOwner) return null;
        startupOwner = recoveryOwner;
        setOutlookStartupOutcome({ state: "login_required", reason: "no_credential" });
        setAuthState(AUTH_STATE.loginRequired);
        setAuthError("세션이 만료되었습니다. 다시 로그인해 주세요.");
        setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
        clearBusinessView();
        return recoveryOwner;
      },
      recovered: (recoveryOwner) => {
        if (!active || !authOwnerFence.isCurrent(recoveryOwner)) return false;
        const authenticatedOwner = beginSessionBoundary(true, recoveryOwner);
        if (!authenticatedOwner) return false;
        clearBusinessView();
        clearCompletedReceiptArchive();
        setOutlookStartupOutcome(null);
        setAuthState(AUTH_STATE.authenticated);
        setAuthError("");
        const recoveryReadFence = captureBusinessRead();
        refreshGraphConnection().catch((nextError) => {
          if (isBusinessReadCurrent(recoveryReadFence)) setError(actionErrorMessage(nextError));
        });
        return true;
      },
    });
    const applyStartup = (result) => {
      if (!active || !authOwnerFence.isCurrent(startupOwner)) return;
      setOutlookStartupOutcome({ state: result.state, reason: result.reason });
      if (result.authenticated !== true) {
        beginSessionBoundary(false);
        setAuthState(AUTH_STATE.loginRequired);
        setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
        clearBusinessView();
        return;
      }
      if (!beginSessionBoundary(true, startupOwner)) return;
      clearBusinessView();
      setAuthState(AUTH_STATE.authenticated);
      setAuthError("");
      setOutlookReadiness(result.presentation ?? null);
      if (result.state === "ready") {
        setGraphConnection(result.connection);
        if (result.bootstrap) setBootstrap(result.bootstrap);
      } else {
        setGraphConnection({
          ...(result.connection ?? {}),
          state: GRAPH_STATE.notConnected,
          status: "not_connected",
          stateVersion: result.connection?.stateVersion ?? 0,
          missingScopes: result.connection?.missingScopes ?? [],
        });
      }
    };
    setAuthState(AUTH_STATE.acquiring);
    const unsubscribe = subscribeOutlookStartup(applyStartup);
    startOutlookStartup({
      acquireSession: async ({ interactive = false, force = false } = {}) => {
        if (interactive) {
          setAuthState(AUTH_STATE.acquiring);
          setAuthError("");
        }
        const session = await acquireLawosSession({
          interactive,
          force,
          owner: startupOwner,
        });
        if (session?.authOwner && authOwnerFence.isCurrent(session.authOwner)) {
          startupOwner = session.authOwner;
        }
        if (!session || typeof session !== "object" || !Object.hasOwn(session, "authOwner")) {
          return session;
        }
        const { authOwner: _authOwner, ...publicSession } = session;
        return publicSession;
      },
      requestJson,
      storage: resolveOutlookStartupStorage(window),
      officeMailboxAddress: waitForOutlookStartupMailbox({
        host: window,
        waitForReady: ensureOfficeReady,
        readyEvent: OFFICE_READY_EVENT,
      }),
      build: OUTLOOK_ADDIN_BUILD,
      cryptoImpl: globalThis.crypto,
    }).catch((nextError) => {
      if (!active || !authOwnerFence.isCurrent(startupOwner)) return;
      beginSessionBoundary(false);
      clearBusinessView();
      setOutlookStartupOutcome({ state: "deferred", reason: "transient_failure" });
      setAuthState(AUTH_STATE.loginRequired);
      setAuthError(actionErrorMessage(nextError));
    });
    return () => {
      active = false;
      unsubscribe();
      unregisterAuthHandlers();
    };
  }, []);

  async function signIn() {
    const signInOwner = beginSessionBoundary(false);
    const busyToken = beginBusy("login");
    clearBusinessView();
    setAuthState(AUTH_STATE.acquiring);
    setAuthError("");
    setError("");
    try {
      const session = await acquireLawosSession({ interactive: true, force: true, owner: signInOwner });
      if (!authOwnerFence.isCurrent(signInOwner)) return;
      if (!session?.authenticated) throw createAddinAuthError("AUTH_SESSION_REQUIRED", "AMIC OS 로그인을 확인해 주세요.");
      if (!beginSessionBoundary(true, signInOwner)) return;
      clearCompletedReceiptArchive();
      clearEditorContexts();
      setOutlookStartupOutcome(null);
      setAuthState(AUTH_STATE.authenticated);
      const signInReadFence = captureBusinessRead();
      try {
        await refreshGraphConnection();
      } catch (nextError) {
        if (!isBusinessReadCurrent(signInReadFence)) return;
        if (nextError?.graph_connection_state !== GRAPH_STATE.connected) {
          setGraphConnection({ state: GRAPH_STATE.notConnected, status: "not_connected", stateVersion: 0, missingScopes: [] });
        }
        setError(actionErrorMessage(nextError));
      }
    } catch (nextError) {
      if (!authOwnerFence.isCurrent(signInOwner)) return;
      beginSessionBoundary(false);
      clearBusinessView();
      setAuthState(nextError?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnavailable || nextError?.safe_error_code === AUTH_ERROR_CODES.nestedAppAuthUnsupported ? AUTH_STATE.unavailable : AUTH_STATE.loginRequired);
      setAuthError(actionErrorMessage(nextError));
    } finally {
      endBusy(busyToken);
    }
  }

  async function connectOutlook() {
    const previousGraphState = graphConnection.state;
    const connectionReadFence = captureBusinessRead();
    if (previousGraphState !== GRAPH_STATE.connected) {
      setGraphConnection((current) => ({ ...current, state: GRAPH_STATE.connecting }));
    }
    const busyToken = beginBusy("connect");
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
      setOutlookStartupOutcome(null);
    } catch (nextError) {
      if (!isBusinessReadCurrent(connectionReadFence)) return;
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
      endBusy(busyToken);
    }
  }

  async function disconnectOutlook() {
    if (!graphConnected && !credentialCleanupPending) return;
    invalidateBusinessReadGeneration();
    const disconnectFence = captureBusinessRead();
    setGraphConnection((current) => ({ ...current, state: GRAPH_STATE.connecting }));
    const busyToken = beginBusy("disconnect");
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
      if (!isBusinessReadCurrent(disconnectFence)) return;
      setGraphConnection(result.connection);
      if (isOutlookConnectionDisconnected(result.connection)) {
        invalidateBusinessReadGeneration();
        clearBusinessView();
      }
    } catch (nextError) {
      if (!isBusinessReadCurrent(disconnectFence)) return;
      setGraphConnection(
        nextError?.authoritative_connection ?? graphConnection,
      );
      setError(actionErrorMessage(nextError));
    } finally {
      endBusy(busyToken);
    }
  }

  async function runAction(name, fn, { requiresGraph = true } = {}) {
    if (!authenticated || (requiresGraph && !graphConnected)) {
      setError(authenticated ? "Outlook 연결 후 사용할 수 있습니다." : "AMIC OS 로그인 후 사용할 수 있습니다.");
      return;
    }
    if (!itemAvailable) {
      setError("Outlook에서 처리할 메일을 먼저 열어 주세요.");
      return;
    }
    const actionItem = currentOfficeItemSnapshot();
    const actionMatterId = selectedMatterIdRef.current;
    const actionReadFence = captureBusinessRead({
      currentItem: actionItem,
      matterId: actionMatterId,
    });
    const applyToCurrentView = () => (
      isBusinessReadCurrent(actionReadFence, {
        currentItem: currentOfficeItemSnapshot(),
        matterId: actionMatterId,
      })
      && isSameOutlookItem(actionItem, currentOfficeItemSnapshot())
      && selectedMatterIdRef.current === actionMatterId
    );
    const busyToken = beginBusy(name);
    setError("");
    setLastResult(null);
    try {
      const result = await fn();
      if (applyToCurrentView()) setLastResult(actionResultNotice(name, result));
      return result;
    } catch (nextError) {
      if (applyToCurrentView()) setError(actionErrorMessage(nextError));
      return null;
    } finally {
      endBusy(busyToken);
    }
  }

  function beginOperation() {
    const randomId = globalThis.crypto?.randomUUID?.();
    if (!randomId) {
      throw Object.assign(new Error("OUTLOOK_OPERATION_KEY_UNAVAILABLE"), {
        safe_error_code: "OUTLOOK_OPERATION_KEY_UNAVAILABLE",
        user_message: "작업을 시작할 수 없습니다. Outlook을 다시 시작해 주세요.",
      });
    }
    operationEpochRef.current += 1;
    const operationStartKey =
      `outlook-operation:${operationEpochRef.current}:${randomId}`;
    activeOperationStartKeyRef.current = operationStartKey;
    operationSessionGenerationsRef.current.set(
      operationStartKey,
      sessionGenerationRef.current,
    );
    while (operationSessionGenerationsRef.current.size > 32) {
      operationSessionGenerationsRef.current.delete(
        operationSessionGenerationsRef.current.keys().next().value,
      );
    }
    return operationStartKey;
  }

  function selectedMatterForItem(currentItem = currentOfficeItemSnapshot()) {
    return outlookMatterSelectionForContext({
      selection: matterSelectionRef.current,
      itemContext: outlookItemContext(currentItem),
    });
  }

  function syncCompletedReceiptRecovery({
    currentItem = currentOfficeItemSnapshot(),
    matterId = selectedMatterForItem(currentItem)?.matter_id,
    timeline,
    documents,
  } = {}) {
    if (!currentItem || !matterId) {
      setReceiptRecovery(null);
      return Object.freeze([]);
    }
    const receipts = receiptController.sync({ currentItem, matterId, timeline, documents });
    setReceiptRecovery(receipts[0] ?? null);
    return receipts;
  }

  function assertOperationContextCurrent(operationSnapshot) {
    const currentItem = currentOfficeItemSnapshot();
    const currentMatter = selectedMatterForItem(currentItem);
    const operationGeneration = operationSessionGenerationsRef.current.get(
      operationSnapshot?.operation_start_key,
    );
    if (!isOutlookOperationSnapshotContextCurrent({
      snapshot: operationSnapshot,
      currentItem,
      currentMode: currentItem?.mode,
      currentProvenance: currentItem?.provenance,
      currentMatterId: currentMatter?.matter_id,
      currentOperationStartKey: activeOperationStartKeyRef.current,
      currentCanonicalGraphMessageId:
        currentItem?.canonical_graph_message_id,
    })
      || operationGeneration !== sessionGenerationRef.current
      || !sessionAuthenticatedRef.current
    ) throw actionContextChangedError();
    return currentItem;
  }

  function reconcileOperationReceipt(operationSnapshot, receipt, operation = "operation") {
    const operationGeneration = operationSessionGenerationsRef.current.get(
      operationSnapshot?.operation_start_key,
    );
    if (
      operationGeneration !== sessionGenerationRef.current
      || !sessionAuthenticatedRef.current
    ) {
      return Object.freeze({
        state: "stale_session",
        apply_to_current_view: false,
        server_write_completed: receipt != null,
        rollback_requested: false,
        recovery_action: "reauthenticate",
        receipt,
        original_operation: operationSnapshot,
      });
    }
    const reconciliation = receiptController.recordCompletion({
      operationSnapshot,
      receipt,
      operation,
      currentItem: currentOfficeItemSnapshot(),
      currentMatterId: selectedMatterForItem(currentOfficeItemSnapshot())?.matter_id,
      currentOperationStartKey: activeOperationStartKeyRef.current,
    });
    const { stored, result } = reconciliation;
    if (!result.apply_to_current_view) {
      setReceiptRecovery(null);
      throw Object.assign(actionContextChangedError(), {
        completed_receipt: stored,
        recovery_action: result.recovery_action,
      });
    }
    setReceiptRecovery(stored);
    return result;
  }

  async function revalidateMatterForMutation({ currentItem, operationStartKey } = {}) {
    const itemContext = outlookItemContext(currentItem);
    const selection = outlookMatterSelectionForContext({
      selection: matterSelectionRef.current,
      itemContext,
    });
    const revalidationRequest = createOutlookMatterRevalidationRequest({
      selection,
      itemContext,
    });
    const readFence = captureBusinessRead({
      currentItem,
      matterId: selection?.matter_id ?? "",
    });
    const matterBody = await requestJson(revalidationRequest.path);
    if (!isBusinessReadCurrent(readFence, {
      currentItem,
      matterId: selection?.matter_id ?? "",
    })) throw actionContextChangedError();
    const refreshedSelection = revalidateOutlookMatterSelection({
      selection,
      itemContext,
      searchResponse: matterBody,
    });
    const currentSelection = selectedMatterForItem(
      officeItemSnapshot(canonicalIdentityRef.current),
    );
    if (
      activeOperationStartKeyRef.current !== operationStartKey
      || !isSameOutlookItem(currentItem, officeItemSnapshot(canonicalIdentityRef.current))
      || currentSelection?.matter_id !== refreshedSelection.matter_id
    ) throw actionContextChangedError();
    storeMatterSelection(refreshedSelection);
    if (!isBusinessReadCurrent(readFence, {
      currentItem,
      matterId: refreshedSelection.matter_id,
    })) throw actionContextChangedError();
    return refreshedSelection;
  }

  async function prepareMatterMutation({
    currentItem,
    operationStartKey,
    resolveCanonicalIdentity = false,
  } = {}) {
    const refreshedSelection = await revalidateMatterForMutation({
      currentItem,
      operationStartKey,
    });

    let pinnedItem = currentItem;
    if (resolveCanonicalIdentity) {
      const identityRequest = createOutlookCanonicalMessageIdentityRequest({
        item: currentItem,
        matterId: refreshedSelection.matter_id,
      });
      const identityReadFence = captureBusinessRead({
        currentItem,
        matterId: refreshedSelection.matter_id,
      });
      const identityResponse = await requestJson(identityRequest.path, {
        method: identityRequest.method,
        body: identityRequest.body,
      });
      pinnedItem = applyOutlookCanonicalMessageIdentity({
        item: currentItem,
        response: identityResponse,
      });
      if (!isSameOutlookItem(currentItem, officeItemSnapshot())) {
        throw actionContextChangedError();
      }
      assertBusinessReadCurrent(identityReadFence, {
        currentItem,
        matterId: refreshedSelection.matter_id,
      });
      canonicalIdentityRef.current = identityResponse.item;
    }
    const operationSnapshot = createOutlookOperationSnapshot({
      item: pinnedItem,
      mode: pinnedItem.mode,
      provenance: pinnedItem.provenance,
      matterId: refreshedSelection.matter_id,
      operationStartKey,
    });
    assertOperationContextCurrent(operationSnapshot);
    if (resolveCanonicalIdentity) setItem(pinnedItem);
    return Object.freeze({
      currentItem: pinnedItem,
      matterId: refreshedSelection.matter_id,
      operationSnapshot,
    });
  }

  async function archiveEmailWithAttachments({ previousReceipt = null } = {}) {
    const operationStartKey = beginOperation();
    const sourceItem = await readCurrentOutlookItem({
      includeTimestamps: true,
      requireStableIdentity: true
    });
    const {
      currentItem,
      matterId,
      operationSnapshot,
    } = await prepareMatterMutation({
      currentItem: sourceItem,
      operationStartKey,
      resolveCanonicalIdentity: true,
    });
    const sourceOfficeItem = window.Office?.context?.mailbox?.item;
    const sourceItemKey = outlookItemIdentityKey(currentItem);
    if (previousReceipt && !isFiledEmailContextCurrent({ emailResult, currentItem, matterId })) {
      throw filedEmailDoesNotMatchError();
    }
    const receipt = await fileOutlookEmailWithAttachments({
      matterId,
      email: currentItem,
      previousReceipt: previousReceipt,
      requestJson,
      readAttachments: async ({ attachmentIds }) => {
        if (!isOutlookActionContextCurrent({
          sourceItem: currentItem,
          currentItem: officeItemSnapshot(),
          sourceMatterId: matterId,
          currentMatterId: selectedMatterIdRef.current,
        })) {
          throw actionContextChangedError();
        }
        const selected = (Array.isArray(sourceOfficeItem?.attachments) ? sourceOfficeItem.attachments : [])
          .filter((attachment) => attachmentIds.includes(attachment.id));
        return readOutlookAttachments({ item: sourceOfficeItem, attachments: selected, Office: window.Office });
      },
      errorMessage: actionErrorMessage,
      assertOperationCurrent: () =>
        assertOperationContextCurrent(operationSnapshot),
      onReceipt: createOutlookFilingReceiptCallback({
        operationSnapshot,
        reconcileOperationReceipt,
      }),
    });
    assertOperationContextCurrent(operationSnapshot);
    setEmailResult({
      ...receipt.email,
      filing_mode: "manual",
      local_outlook_item_key: sourceItemKey,
      local_matter_id: matterId,
    });
    setAttachmentResult(receipt);
    return withOptionalOutlookMatterReadback(receipt, () => refreshMatter(
      matterId,
      { operationSnapshot },
    ));
  }

  async function fileEmail() {
    return archiveEmailWithAttachments();
  }

  async function fileSentEmail() {
    const operationStartKey = beginOperation();
    const sourceItem = await readCurrentOutlookItem({
      includeTimestamps: true,
      requireStableIdentity: true,
    });
    const {
      currentItem,
      matterId,
      operationSnapshot,
    } = await prepareMatterMutation({
      currentItem: sourceItem,
      operationStartKey,
      resolveCanonicalIdentity: true,
    });
    const receipt = await fileOutlookEmail({
      matterId,
      email: currentItem,
      mode: "sent",
      requestJson,
      assertOperationCurrent: () => assertOperationContextCurrent(operationSnapshot),
      onReceipt: (serverReceipt) => reconcileOperationReceipt(
        operationSnapshot,
        serverReceipt,
        "file_email",
      ),
    });
    assertOperationContextCurrent(operationSnapshot);
    setEmailResult({
      ...receipt,
      filing_mode: "sent",
      local_outlook_item_key: outlookItemIdentityKey(currentItem),
      local_matter_id: matterId,
    });
    setAttachmentResult(null);
    return withOptionalOutlookMatterReadback(receipt, () => refreshMatter(
      matterId,
      { operationSnapshot },
    ));
  }

  async function saveAttachments() {
    return archiveEmailWithAttachments({ previousReceipt: attachmentResult });
  }

  async function saveCurrentOutlookSourceToVault({
    expectedProvenance,
    retryAttachmentIds = null,
  } = {}) {
    if (!OUTLOOK_VAULT_SOURCE_SAVE_ENABLED) {
      throw Object.assign(new Error("OUTLOOK_VAULT_SOURCE_SAVE_DISABLED"), {
        safe_error_code: "OUTLOOK_VAULT_SOURCE_SAVE_DISABLED",
        user_message: "이 AMIC OS 배포에서는 Vault 메일 저장을 사용할 수 없습니다.",
      });
    }
    const operationStartKey = beginOperation();
    const sourceItem = await readCurrentOutlookVaultSourceItem();
    if (sourceItem.provenance !== expectedProvenance) {
      throw Object.assign(new Error("OUTLOOK_VAULT_SOURCE_PROVENANCE_MISMATCH"), {
        safe_error_code: "OUTLOOK_VAULT_SOURCE_PROVENANCE_MISMATCH",
        user_message: expectedProvenance === "sent"
          ? "보낸 메일을 열어 주세요."
          : "받은 메일을 열어 주세요.",
      });
    }
    const {
      currentItem,
      matterId,
      operationSnapshot,
    } = await prepareMatterMutation({
      currentItem: sourceItem,
      operationStartKey,
      resolveCanonicalIdentity: true,
    });
    const filingMode = expectedProvenance === "sent" ? "sent" : "manual";
    const localItemKey = outlookItemIdentityKey(currentItem);
    if (retryAttachmentIds !== null) {
      const prior = vaultSourceSaveResult;
      if (
        !prior
        || prior.local_outlook_item_key !== localItemKey
        || prior.local_matter_id !== matterId
        || prior.filing_mode !== filingMode
        || !Array.isArray(retryAttachmentIds)
        || retryAttachmentIds.length === 0
        || retryAttachmentIds.some((attachmentId) => (
          !prior.retry_attachment_ids?.includes(attachmentId)
        ))
      ) {
        throw Object.assign(new Error("OUTLOOK_VAULT_SOURCE_RETRY_CONTEXT_MISMATCH"), {
          safe_error_code: "OUTLOOK_VAULT_SOURCE_RETRY_CONTEXT_MISMATCH",
          user_message: "열어 둔 메일과 Matter의 Vault 저장 결과를 다시 확인해 주세요.",
        });
      }
    }
    const vaultSourceItem = Object.freeze({
      canonical_graph_message_id: currentItem.canonical_graph_message_id,
      rest_message_id: currentItem.rest_message_id,
      internet_message_id: currentItem.internet_message_id,
      conversation_id: currentItem.conversation_id,
      item_key: localItemKey,
      subject: typeof currentItem.subject === "string"
        ? currentItem.subject.normalize("NFC").trim() || "제목 없음"
        : "제목 없음",
      sent_at: currentItem.sent_at ?? null,
      received_at: currentItem.received_at ?? null,
      attachments: currentItem.attachments,
    });
    const common = {
      matterId,
      email: vaultSourceItem,
      mode: filingMode,
      requestJson,
      pendingStore: vaultSourcePendingStoreRef.current,
      assertOperationCurrent: () => assertOperationContextCurrent(operationSnapshot),
    };
    const receipt = retryAttachmentIds === null
      ? await saveOutlookEmailWithAttachmentsToVault(common)
      : await saveOutlookAttachmentSourcesToVault({
          ...common,
          attachmentIds: retryAttachmentIds,
          filingMode,
        });
    assertOperationContextCurrent(operationSnapshot);
    const stored = Object.freeze({
      ...receipt,
      idempotent_replay: receipt.idempotent_replay === true
        || (Array.isArray(receipt.receipts)
          && receipt.receipts.length > 0
          && receipt.receipts.every((entry) => entry.idempotent_replay === true)),
      filing_mode: filingMode,
      local_outlook_item_key: localItemKey,
      local_matter_id: matterId,
    });
    setEmailResult(null);
    setAttachmentResult(null);
    setVaultSourceSaveResult(stored);
    return stored;
  }

  async function fileEmailToVault() {
    return saveCurrentOutlookSourceToVault({ expectedProvenance: "received" });
  }

  async function fileSentEmailToVault() {
    return saveCurrentOutlookSourceToVault({ expectedProvenance: "sent" });
  }

  async function retryVaultSourceAttachments() {
    const prior = vaultSourceSaveResult;
    return saveCurrentOutlookSourceToVault({
      expectedProvenance: prior?.filing_mode === "sent" ? "sent" : "received",
      retryAttachmentIds: prior?.retry_attachment_ids ?? [],
    });
  }

  async function resumeVaultSourceSaves() {
    return resumePendingOutlookVaultSourceSaves({
      pendingStore: vaultSourcePendingStoreRef.current,
      requestJson,
    });
  }

  async function evaluateAlerts() {
    const currentItem = await readCurrentOutlookItem({ allowBodyReadFailure: true });
    if (!currentItem) throw itemChangedDuringActionError();
    const body = await requestJson("/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: { message: currentItem },
    });
    if (!isSameOutlookItem(currentItem, currentOfficeItemSnapshot())) {
      throw itemChangedDuringActionError();
    }
    return body;
  }

  function assertSimpleOperationContextCurrent({ currentItem, matterId, operationStartKey }) {
    const nextItem = currentOfficeItemSnapshot();
    if (
      activeOperationStartKeyRef.current !== operationStartKey
      || !isSameOutlookItem(currentItem, nextItem)
      || selectedMatterForItem(nextItem)?.matter_id !== matterId
      || !isOutlookOperationSessionCurrent({
        operationSessionGenerations: operationSessionGenerationsRef.current,
        operationStartKey,
        sessionGeneration: sessionGenerationRef.current,
        authenticated: sessionAuthenticatedRef.current,
      })
    ) throw actionContextChangedError();
  }

  async function saveEditableTask() {
    const operationStartKey = beginOperation();
    const currentItem = currentOfficeItemSnapshot();
    if (!currentItem || currentItem.mode !== "read") {
      throw Object.assign(new Error("OUTLOOK_READ_ITEM_REQUIRED"), {
        safe_error_code: "OUTLOOK_READ_ITEM_REQUIRED",
      });
    }
    assertStableOutlookItemIdentity(currentItem);
    const refreshedMatter = await revalidateMatterForMutation({
      currentItem,
      operationStartKey,
    });
    const title = taskDraft.title.trim();
    if (!title) throw new TypeError("업무 제목을 입력해 주세요.");
    const estimatedMinutes = taskDraft.estimated_minutes === ""
      ? null
      : Number(taskDraft.estimated_minutes);
    if (estimatedMinutes !== null && (!Number.isSafeInteger(estimatedMinutes) || estimatedMinutes <= 0)) {
      throw new TypeError("예상 시간은 1분 이상의 정수로 입력해 주세요.");
    }
    const task = {
      title,
      status: taskDraft.status,
      due_at: localDateTimeToIso(taskDraft.due_at),
      estimated_minutes: estimatedMinutes,
      assigned_to_user_id: taskDraft.assigned_to_user_id.trim() || null,
    };
    const existingTask = taskResultRef.current?.item;
    const sourceEmailThreadId = resolveOutlookTaskSourceEmailThreadId({
      existingTask,
      retainedContextSourceEmailThreadId: taskSourceEmailThreadIdRef.current,
      emailResult,
      currentItem,
      matterId: refreshedMatter.matter_id,
    });
    taskSourceEmailThreadIdRef.current = sourceEmailThreadId;
    const intent = {
      operation: existingTask ? "update" : "create",
      item_context_key: outlookItemContextKey(outlookItemContext(currentItem)),
      matter_id: refreshedMatter.matter_id,
      task_id: existingTask?.activity_id ?? null,
      expected_version: existingTask?.version ?? null,
      source_email_thread_id: sourceEmailThreadId,
      task,
    };
    rememberEditorContext(currentItem, refreshedMatter.matter_id);
    const idempotencyKey = await createOutlookIntentIdempotencyKey("outlook-task", intent);
    const body = existingTask
      ? await requestJson(`/api/outlook/tasks/${encodeURIComponent(existingTask.activity_id)}`, {
          method: "PATCH",
          body: {
            matter_id: refreshedMatter.matter_id,
            idempotency_key: idempotencyKey,
            expected_version: existingTask.version,
            patch: task,
          },
        })
      : await requestJson("/api/outlook/tasks", {
          method: "POST",
          body: {
            matter_id: refreshedMatter.matter_id,
            idempotency_key: idempotencyKey,
            ...(sourceEmailThreadId ? { source_email_thread_id: sourceEmailThreadId } : {}),
            task,
          },
        });
    assertSimpleOperationContextCurrent({
      currentItem,
      matterId: refreshedMatter.matter_id,
      operationStartKey,
    });
    if (!body?.item?.activity_id || !Number.isSafeInteger(body.item.version)) {
      throw new TypeError("업무 저장 응답을 확인할 수 없습니다.");
    }
    const nextTaskDraft = {
      ...taskDraftRef.current,
      title: body.item.title ?? taskDraftRef.current.title,
      status: body.item.status ?? taskDraftRef.current.status,
      due_at: isoToLocalDateTime(body.item.due_at),
      estimated_minutes: body.item.estimated_minutes == null ? "" : String(body.item.estimated_minutes),
      assigned_to_user_id: body.item.assigned_to_user_id ?? "",
    };
    taskResultRef.current = body;
    taskDraftRef.current = nextTaskDraft;
    setTaskResult(body);
    setTaskDraft(nextTaskDraft);
    rememberEditorContext(currentItem, refreshedMatter.matter_id);
    return withOptionalOutlookMatterReadback(body, () => refreshMatter(
      refreshedMatter.matter_id,
      {
        receiptReadbackItem: currentItem,
      },
    ));
  }

  async function saveTimeEntryDraft() {
    const operationStartKey = beginOperation();
    const currentItem = currentOfficeItemSnapshot();
    if (!currentItem) throw itemChangedDuringActionError();
    assertStableOutlookItemIdentity(currentItem);
    const itemContextKey = outlookItemContextKey(outlookItemContext(currentItem));
    if (!itemContextKey) throw itemChangedDuringActionError();
    const refreshedMatter = await revalidateMatterForMutation({
      currentItem,
      operationStartKey,
    });
    const narrative = timeDraft.narrative.trim();
    const durationMinutes = Number(timeDraft.duration_minutes);
    if (!narrative || /\r|\n/u.test(narrative)) {
      throw new TypeError("한 줄 업무 내용을 입력해 주세요.");
    }
    if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
      throw new TypeError("시간은 1분 이상의 정수로 입력해 주세요.");
    }
    const requestBody = {
      matter_id: refreshedMatter.matter_id,
      work_date: timeDraft.work_date,
      narrative,
      duration_minutes: durationMinutes,
      billable: timeDraft.billable,
      item_context_key: itemContextKey,
    };
    rememberEditorContext(currentItem, refreshedMatter.matter_id);
    const body = await requestJson("/api/outlook/time-entry-drafts", {
      method: "POST",
      body: {
        ...requestBody,
        idempotency_key: await createOutlookIntentIdempotencyKey(
          "outlook-time-entry-draft",
          requestBody,
        ),
      },
    });
    assertSimpleOperationContextCurrent({
      currentItem,
      matterId: refreshedMatter.matter_id,
      operationStartKey,
    });
    if (!body?.item?.draft_ref || !Number.isSafeInteger(body.item.version)) {
      throw new TypeError("시간 기록 초안 응답을 확인할 수 없습니다.");
    }
    timeDraftResultRef.current = body;
    setTimeDraftResult(body);
    rememberEditorContext(currentItem, refreshedMatter.matter_id);
    return withOptionalOutlookMatterReadback(body, () => refreshMatter(
      refreshedMatter.matter_id,
      {
        receiptReadbackItem: currentItem,
      },
    ));
  }

  async function refreshReadbacks() {
    const currentItem = currentOfficeItemSnapshot();
    const matterId = selectedMatterForItem(currentItem)?.matter_id ?? "";
    const readFence = captureBusinessRead({ currentItem, matterId });
    return refreshMatter(matterId, {
      receiptReadbackItem: currentItem,
      businessReadFence: readFence,
    });
  }

  async function prepareVaultAttachmentMutation() {
    const operationStartKey = beginOperation();
    const currentItem = currentOfficeItemSnapshot();
    const matter = selectedMatterForItem(currentItem);
    const officeItem = window.Office?.context?.mailbox?.item;
    if (!currentItem || currentItem.mode !== "compose" || !officeItem) {
      throw Object.assign(new Error("현재 Outlook 작성창에서는 Vault 첨부를 사용할 수 없습니다."), {
        safe_error_code: "OUTLOOK_VAULT_COMPOSE_UNAVAILABLE",
        user_message: "현재 Outlook 작성창에서는 Vault 첨부를 사용할 수 없습니다.",
      });
    }
    if (!matter) {
      throw Object.assign(new Error("첨부할 문서의 Matter를 먼저 선택해 주세요."), {
        safe_error_code: "OUTLOOK_MATTER_SELECTION_REQUIRED",
        user_message: "첨부할 문서의 Matter를 먼저 선택해 주세요.",
      });
    }
    const sessionGeneration = sessionGenerationRef.current;
    const refreshedMatter = await revalidateMatterForMutation({
      currentItem,
      operationStartKey,
    });
    const pendingKey = vaultAttachmentPendingKey(
      currentItem,
      refreshedMatter.matter_id,
    );
    const binding = Object.freeze({
      operationStartKey,
      sessionGeneration,
      currentItem,
      officeItem,
      matterId: refreshedMatter.matter_id,
      pendingKey,
    });
    const assertCurrent = () => {
      const nextItem = currentOfficeItemSnapshot();
      const nextMatter = selectedMatterForItem(nextItem);
      if (activeOperationStartKeyRef.current !== binding.operationStartKey
          || sessionGenerationRef.current !== binding.sessionGeneration
          || sessionAuthenticatedRef.current !== true
          || window.Office?.context?.mailbox?.item !== binding.officeItem
          || nextItem?.mode !== "compose"
          || !isSameOutlookItem(binding.currentItem, nextItem)
          || nextMatter?.matter_id !== binding.matterId) {
        throw actionContextChangedError();
      }
      return nextItem;
    };
    assertCurrent();
    return Object.freeze({ ...binding, assertCurrent });
  }

  async function attachSelectedVaultVersion() {
    const candidate = outlookVaultAttachmentCandidates(documents)
      .find((entry) => entry.key === vaultAttachmentCandidateKey);
    if (!candidate) {
      throw Object.assign(new Error("Vault 문서의 정확한 현재 버전을 선택해 주세요."), {
        safe_error_code: "OUTLOOK_VAULT_EXACT_VERSION_REQUIRED",
        user_message: "Vault 문서의 정확한 현재 버전을 선택해 주세요.",
      });
    }
    const binding = await prepareVaultAttachmentMutation();
    const completion = await attachExactVaultVersionToOutlookCompose({
      matterId: binding.matterId,
      exactVersion: candidate.exactVersion,
      requestJson,
      assertOperationCurrent: binding.assertCurrent,
      onPendingCompletion: (pending) => {
        rememberVaultAttachmentPending(binding.pendingKey, pending);
      },
    });
    vaultAttachmentPendingArchiveRef.current.delete(binding.pendingKey);
    binding.assertCurrent();
    setVaultAttachmentPending(null);
    setVaultAttachmentResult(completion);
    return completion;
  }

  async function retryVaultAttachmentCompletion() {
    const binding = await prepareVaultAttachmentMutation();
    const pending = vaultAttachmentPendingArchiveRef.current.get(binding.pendingKey)
      ?? vaultAttachmentPending;
    if (!pending) {
      throw Object.assign(new Error("다시 확인할 Vault 첨부 작업이 없습니다."), {
        safe_error_code: "OUTLOOK_VAULT_ATTACHMENT_RECEIPT_NOT_FOUND",
        user_message: "다시 확인할 Vault 첨부 작업이 없습니다.",
      });
    }
    const completion = await retryOutlookVaultAttachmentCompletion({
      pending,
      requestJson,
      assertOperationCurrent: binding.assertCurrent,
      onPendingCompletion: (nextPending) => {
        rememberVaultAttachmentPending(binding.pendingKey, nextPending);
      },
    });
    vaultAttachmentPendingArchiveRef.current.delete(binding.pendingKey);
    binding.assertCurrent();
    setVaultAttachmentPending(null);
    setVaultAttachmentResult(completion);
    return completion;
  }

  function copyCriticalValue(value) {
    if (!value) return;
    const write = window.navigator?.clipboard?.writeText;
    if (typeof write !== "function") {
      setError("이 Outlook 환경에서는 클립보드 복사를 사용할 수 없습니다.");
      return;
    }
    void write.call(window.navigator.clipboard, value)
      .catch(() => setError("값을 복사하지 못했습니다. 직접 선택해 주세요."));
  }

  function openFeatureOverlay({ featureId, view }) {
    const currentRail = outlookMatterRailForContext({
      itemMode: item?.mode,
      vaultExactAttachmentEnabled: OUTLOOK_VAULT_EXACT_ATTACHMENT_ENABLED,
    });
    if (!currentRail.some((entry) => entry.featureId === featureId)) return;
    invalidatePrecedentView();
    if (featureId === "all-functions") invalidateFilingCorrectionView();
    if (overlayStateRef.current.featureId === "matter.search") closeMatterSearch();
    if (featureId === "matter.search") {
      setMatterSearchQuery("");
      setMatters([]);
    }
    if (featureId === "task.create" && !taskResult && !taskDraft.title.trim()) {
      setTaskDraft((current) => ({ ...current, title: item?.subject ?? "" }));
    }
    if (featureId === "time-entry.draft" && !timeDraft.narrative.trim()) {
      setTimeDraft((current) => ({
        ...current,
        narrative: item?.subject ? `메일 검토: ${item.subject}`.slice(0, 500) : "",
      }));
    }
    if (featureId === "vault.attach-exact-version") {
      setVaultAttachmentCandidateKey("");
      setVaultAttachmentResult(null);
      setVaultAttachmentPending(
        vaultAttachmentPendingArchiveRef.current.get(vaultAttachmentPendingKey())
          ?? null,
      );
    }
    mutateOverlay((state) => openOutlookOverlay(state, {
      featureId,
      view,
      openerId: outlookRailButtonId(featureId),
      itemContextKey: outlookItemContextKey(outlookItemContext(item)),
    }));
  }

  const closeFeatureOverlay = useCallback((reason) => {
    if (overlayStateRef.current.featureId === "vault.attach-exact-version") {
      clearVaultAttachmentPickerView();
    }
    if (overlayStateRef.current.featureId === "all-functions") {
      invalidateFilingCorrectionView();
      invalidatePrecedentView();
    }
    if (overlayStateRef.current.featureId === "matter.search") {
      matterSearchDebouncerRef.current?.cancel();
      setMatterSearchQuery("");
      setMatters([]);
    }
    mutateOverlay((state) => closeOutlookOverlay(state, reason));
  }, [mutateOverlay]);

  const recoveredReceiptNotice = receiptRecovery
    ? {
        status: receiptRecovery.outcome === "idempotent_replay"
          ? OUTLOOK_OPERATION_STATES.duplicate
          : OUTLOOK_OPERATION_STATES.complete,
        visibleMessage: receiptRecovery.filing_mode === "sent"
          ? "저장된 보낸 메일 기록을 확인했습니다."
          : "저장된 메일 기록을 확인했습니다.",
        fullMessage: "저장 기록을 확인했습니다.",
      }
    : null;

  let intervention = null;
  if (!authenticated) {
    const checking = authState === AUTH_STATE.loading || authState === AUTH_STATE.acquiring;
    intervention = {
      status: authState === AUTH_STATE.unavailable
        ? OUTLOOK_OPERATION_STATES.failed
        : checking
          ? OUTLOOK_OPERATION_STATES.working
          : OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: authState === AUTH_STATE.unavailable ? "이 Outlook 환경에서는 AMIC OS 로그인을 사용할 수 없습니다." : checking ? "AMIC OS 로그인을 확인하고 있습니다." : "AMIC OS 로그인이 필요합니다.",
      fullMessage: authError || (checking ? "로그인 세션 확인이 끝날 때까지 기다려 주세요." : "AMIC OS에 로그인한 뒤 Outlook 기능을 사용해 주세요."),
      testId: "business-gate",
      ...(!checking && authState !== AUTH_STATE.unavailable
        ? { action: signIn, actionLabel: "AMIC OS 로그인", actionTestId: "lawos-login-button" }
        : {}),
    };
  } else if (credentialCleanupPending) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "Outlook 연결 정보 정리가 필요합니다.",
      fullMessage: "연결 해제 뒤 남은 자격 증명 정리를 다시 시도해 주세요.",
      testId: "business-gate",
      action: disconnectOutlook,
      actionLabel: "연결 정보 정리",
      actionTestId: "outlook-cleanup-retry-button",
    };
  } else if (graphConnection.state === GRAPH_STATE.loading || graphConnection.state === GRAPH_STATE.connecting) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.working,
      visibleMessage: "Outlook 연결을 확인하고 있습니다.",
      fullMessage: "Microsoft 연결 확인이 끝날 때까지 기다려 주세요.",
      testId: "business-gate",
    };
  } else if (
    outlookStartupOutcome?.state === "revoked"
    && outlookStartupOutcome.reason === "installation_revoked"
  ) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "이 PC의 AMIC OS 설치를 확인할 수 없습니다.",
      fullMessage: "AMIC OS 설치가 활성 상태인지 확인한 뒤 다시 시도해 주세요.",
      testId: "business-gate",
      action: retryOutlookStartup,
      actionLabel: "설치 상태 다시 확인",
      actionTestId: "outlook-installation-retry-button",
    };
  } else if (outlookStartupOutcome?.state === "revoked") {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "Outlook 계정이 AMIC OS 계정과 일치하지 않습니다.",
      fullMessage: "현재 Outlook 계정과 같은 계정으로 AMIC OS에 다시 로그인해 주세요.",
      testId: "business-gate",
      action: signIn,
      actionLabel: "다시 로그인",
      actionTestId: "outlook-account-relogin-button",
    };
  } else if (outlookStartupOutcome?.state === "deferred") {
    intervention = {
      status: online
        ? OUTLOOK_OPERATION_STATES.reconnectRequired
        : OUTLOOK_OPERATION_STATES.offline,
      visibleMessage: online
        ? "Outlook 준비 상태를 확인하지 못했습니다."
        : "네트워크에 연결되어 있지 않습니다.",
      fullMessage: online
        ? "잠시 후 준비 상태를 다시 확인해 주세요."
        : "네트워크 연결을 복구한 뒤 준비 상태를 다시 확인해 주세요.",
      testId: "business-gate",
      action: retryOutlookStartup,
      actionLabel: "다시 확인",
      actionTestId: "outlook-startup-retry-button",
    };
  } else if (outlookStartupOutcome?.state === "connection_required") {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: "Outlook 연결이 필요합니다.",
      fullMessage: "Microsoft 계정을 Outlook에 연결한 뒤 다시 시도해 주세요.",
      testId: "business-gate",
      action: connectOutlook,
      actionLabel: "Outlook 연결",
      actionTestId: "outlook-connect-button",
    };
  } else if (
    outlookReadiness
    && outlookReadiness.action !== OUTLOOK_READINESS_ACTIONS.none
  ) {
    intervention = {
      ...outlookReadiness,
      testId: "outlook-readiness-status",
      action: runOutlookReadinessAction,
      actionTestId: "outlook-readiness-action",
    };
  } else if (!graphConnected) {
    const checking = graphConnection.state === GRAPH_STATE.loading || graphConnection.state === GRAPH_STATE.connecting;
    intervention = {
      status: checking
        ? OUTLOOK_OPERATION_STATES.working
        : OUTLOOK_OPERATION_STATES.reconnectRequired,
      visibleMessage: checking ? "Outlook 연결을 확인하고 있습니다." : "Outlook 연결이 필요합니다.",
      fullMessage: checking ? "Microsoft 연결 확인이 끝날 때까지 기다려 주세요." : "Microsoft 연결을 완료한 뒤 Matter 기능을 사용해 주세요.",
      testId: "business-gate",
      ...(!checking
        ? { action: connectOutlook, actionLabel: "Outlook 연결", actionTestId: "outlook-connect-button" }
        : {}),
    };
  } else if (!itemAvailable) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.idle,
      visibleMessage: "Outlook에서 처리할 메일을 열어 주세요.",
      fullMessage: "받은 메일, 보낸 메일 또는 작성 중인 메일을 연 뒤 다시 시도해 주세요.",
      testId: "business-gate",
    };
  } else if (error) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.failed,
      visibleMessage: error,
      fullMessage: error,
      testId: "error-state",
    };
  } else if (busy) {
    intervention = {
      status: OUTLOOK_OPERATION_STATES.working,
      visibleMessage: busyLabel(busy),
      fullMessage: busyLabel(busy),
      testId: "busy-state",
    };
  } else if (lastResult || recoveredReceiptNotice) {
    intervention = {
      ...(lastResult ?? recoveredReceiptNotice),
      testId: receiptRecovery && !lastResult ? "outlook-receipt-recovery" : "operation-result",
    };
  }

  const visibleMatterRail = outlookMatterRailForContext({
    itemMode: item?.mode,
    vaultExactAttachmentEnabled: OUTLOOK_VAULT_EXACT_ATTACHMENT_ENABLED,
  });
  const vaultAttachmentCandidates = outlookVaultAttachmentCandidates(documents);
  const selectedVaultAttachmentCandidate = vaultAttachmentCandidates
    .find((entry) => entry.key === vaultAttachmentCandidateKey) ?? null;

  const conversationFeatureContext = overlayState.view === "conversation-auto-save"
    ? captureAllFunctionsFeatureContext("conversation-auto-save", { connectionBound: true })
    : null;
  const documentFeatureContext = overlayState.view === "document-create-and-sign-status"
    ? captureAllFunctionsFeatureContext("document-create-and-sign-status")
    : null;
  const liveConversationSeed = conversationFeatureContext
    && isFiledEmailContextCurrent({
      emailResult,
      currentItem: conversationFeatureContext.currentItem,
      matterId: conversationFeatureContext.matterId,
    })
    && typeof emailResult?.email_thread_id === "string"
    && emailResult.email_thread_id.trim() === emailResult.email_thread_id
    ? emailResult.email_thread_id
    : "";
  const recoveredConversationSeed = conversationFeatureContext
    && !liveConversationSeed
    && receiptRecovery?.operation === "file_email"
    && receiptRecovery.matter_id === conversationFeatureContext.matterId
    && receiptRecovery.item_context_ref === receiptController.itemContextRef(conversationFeatureContext.currentItem)
    && typeof receiptRecovery.email_thread_id === "string"
    && receiptRecovery.email_thread_id.trim() === receiptRecovery.email_thread_id
    ? receiptRecovery.email_thread_id
    : "";
  const conversationSeedEmailThreadId = liveConversationSeed || recoveredConversationSeed;

  const overlayHeading = overlayState.view === "filing-correction"
    ? "저장 위치 바꾸기"
    : overlayState.view === "precedent-search"
      ? "유사 사건·선례 찾기"
      : overlayState.view === "conversation-auto-save"
        ? "대화 자동 저장"
        : overlayState.view === "document-create-and-sign-status"
          ? "문서 만들기·서명 상태"
      : visibleMatterRail.find(
        (entry) => entry.featureId === overlayState.featureId,
      )?.label ?? "Outlook 기능";

  const primaryAction = item?.mode === "compose"
    ? {
        label: "보내기 전 확인",
        disabled: !authenticated || !graphConnected || !itemAvailable || busy !== "",
        run: () => runAction("alerts", evaluateAlerts),
      }
    : item?.provenance === "sent"
      ? {
          label: "보낸 메일 저장",
          disabled: !authenticated || !graphConnected || !selectedMatterId || busy !== "",
          run: () => runAction(
            OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "vault_sent_file" : "sent_file",
            OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? fileSentEmailToVault : fileSentEmail,
          ),
        }
      : {
          label: "메일 및 첨부 파일 저장",
          disabled: !authenticated || !graphConnected || !selectedMatterId || item?.provenance !== "received" || busy !== "",
          run: () => runAction(
            OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "vault_file" : "file",
            OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? fileEmailToVault : fileEmail,
          ),
        };

  return (
    <OutlookMatterCompactShell
      profile="matter-full"
      itemMode={item?.mode}
      vaultExactAttachmentEnabled={OUTLOOK_VAULT_EXACT_ATTACHMENT_ENABLED}
      activeFeature={overlayState.open ? overlayState.featureId ?? "" : ""}
      disabledFeatures={(featureId) => (
        !authenticated
        || !itemAvailable
        || busy !== ""
        || (featureId === "vault.attach-exact-version"
          && (item?.mode !== "compose" || !selectedMatterId))
        || (featureId === "mail.save-with-attachments" && (!graphConnected || item?.mode !== "read"))
        || (featureId === "task.create" && item?.mode !== "read")
      )}
      onFeatureSelect={openFeatureOverlay}
      status={overlayState.open ? null : <CompactIntervention intervention={intervention} />}
      footer={(
        <button
          type="button"
          className="outlook-primary-action"
          disabled={primaryAction.disabled}
          onClick={() => void primaryAction.run()}
          data-testid="outlook-primary-filing-button"
        >
          {primaryAction.label}
        </button>
      )}
      overlay={(
        <OutlookOverlay
          state={overlayState}
          heading={overlayHeading}
          onClose={closeFeatureOverlay}
        >
          {overlayState.featureId === "vault.attach-exact-version" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAction(
                  "vault_attach",
                  attachSelectedVaultVersion,
                  { requiresGraph: false },
                );
              }}
              data-testid="outlook-vault-attachment-picker"
            >
              <p className="outlook-one-line" role="status">
                선택한 Matter의 현재 Vault 버전만 첨부합니다.
              </p>
              <OutlookOneLineField
                id="outlook-vault-attachment-version"
                name="vault_exact_version"
                label="Vault 문서 버전"
                as="select"
                value={vaultAttachmentCandidateKey}
                onChange={(event) => {
                  setVaultAttachmentCandidateKey(event.target.value);
                  setVaultAttachmentResult(null);
                }}
                disabled={busy !== "" || Boolean(vaultAttachmentPending)}
                data-testid="outlook-vault-attachment-version"
              >
                <option value="">Vault 문서와 현재 버전을 선택해 주세요</option>
                {vaultAttachmentCandidates.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.title} — {candidate.exactVersion.version_id}
                  </option>
                ))}
              </OutlookOneLineField>
              {vaultAttachmentCandidates.length === 0 ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">첨부 가능한 현재 버전이 없습니다.</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction(
                      "readbacks",
                      refreshReadbacks,
                      { requiresGraph: false },
                    )}
                    disabled={busy !== ""}
                    data-testid="outlook-vault-attachment-refresh"
                  >
                    새로고침
                  </button>
                </div>
              ) : null}
              {selectedVaultAttachmentCandidate ? (
                <div data-testid="outlook-vault-exact-version">
                  <div className="outlook-flat-action-row">
                    <span className="outlook-flat-action-label">버전 ID</span>
                    <code className="outlook-critical-value" tabIndex={0} aria-label="버전 ID">
                      {selectedVaultAttachmentCandidate.exactVersion.version_id}
                    </code>
                  </div>
                  <div className="outlook-flat-action-row">
                    <span className="outlook-flat-action-label">SHA-256</span>
                    <code className="outlook-critical-value" tabIndex={0} aria-label="SHA-256">
                      {selectedVaultAttachmentCandidate.exactVersion.sha256}
                    </code>
                  </div>
                  <div className="outlook-flat-action-row">
                    <span className="outlook-flat-action-label">파일</span>
                    <span className="outlook-one-line">
                      {formatVaultAttachmentBytes(selectedVaultAttachmentCandidate.exactVersion.byte_size)} · {selectedVaultAttachmentCandidate.exactVersion.mime_type}
                    </span>
                  </div>
                </div>
              ) : null}
              {vaultAttachmentPending ? (
                <div className="outlook-flat-action-row" data-testid="outlook-vault-attachment-pending">
                  <OutlookInlineOperationState
                    status={OUTLOOK_OPERATION_STATES.partial}
                    visibleMessage="첨부는 추가됐고 완료 확인이 남아 있습니다."
                    fullMessage="같은 첨부를 다시 추가하지 않고 완료 확인만 다시 시도합니다."
                  />
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction(
                      "vault_attach_retry",
                      retryVaultAttachmentCompletion,
                      { requiresGraph: false },
                    )}
                    disabled={busy !== ""}
                    data-testid="outlook-vault-attachment-retry"
                  >
                    완료 확인
                  </button>
                </div>
              ) : null}
              {vaultAttachmentResult ? (
                <OutlookInlineOperationState
                  status={OUTLOOK_OPERATION_STATES.complete}
                  visibleMessage="선택한 Vault 버전을 첨부했습니다."
                  fullMessage="Outlook 첨부 결과와 Vault 완료 영수증을 확인했습니다."
                />
              ) : null}
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">선택한 정확 버전만 첨부합니다.</span>
                <button
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={() => closeFeatureOverlay("cancel")}
                  disabled={busy !== ""}
                  data-testid="outlook-vault-attachment-cancel"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="outlook-flat-action-button"
                  disabled={!selectedVaultAttachmentCandidate || Boolean(vaultAttachmentPending) || busy !== ""}
                  data-testid="outlook-vault-attachment-submit"
                >
                  첨부
                </button>
              </div>
            </form>
          ) : null}

          {overlayState.featureId === "mail.save-with-attachments" ? (
            <>
              {selectedMatterDisplay ? (
                <OutlookCriticalValueRow
                  label="선택한 Matter"
                  value={selectedMatterDisplay}
                  onCopy={copyCriticalValue}
                />
              ) : (
                <p className="outlook-one-line">저장할 Matter를 선택해 주세요.</p>
              )}
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">
                  {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED
                    ? "Vault에 메일 및 첨부 저장"
                    : "메일 및 첨부 파일 저장"}
                </span>
                <button
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={() => void runAction(
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "vault_file" : "file",
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? fileEmailToVault : fileEmail,
                  )}
                  disabled={!selectedMatterId || item?.provenance !== "received" || busy !== ""}
                  data-testid="file-email-button"
                  data-storage-authority={OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "amic-vault-api" : "lawos-dms"}
                >
                  저장
                </button>
              </div>
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">
                  {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED
                    ? "Vault에 보낸 메일 및 첨부 저장"
                    : "보낸 메일 저장"}
                </span>
                <button
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={() => void runAction(
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "vault_sent_file" : "sent_file",
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? fileSentEmailToVault : fileSentEmail,
                  )}
                  disabled={!selectedMatterId || item?.provenance !== "sent" || busy !== ""}
                  data-testid="file-sent-email-button"
                  data-storage-authority={OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "amic-vault-api" : "lawos-dms"}
                >
                  저장
                </button>
              </div>
              {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED
                && vaultSourceSaveResult?.retry_attachment_ids?.length > 0 ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">실패한 Vault 첨부 다시 저장</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction("vault_attachments", retryVaultSourceAttachments)}
                    disabled={busy !== ""}
                    data-testid="retry-vault-source-attachments-button"
                  >
                    다시 저장
                  </button>
                </div>
              ) : !OUTLOOK_VAULT_SOURCE_SAVE_ENABLED && emailResult ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">첨부 파일 다시 저장</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction("attachments", saveAttachments)}
                    disabled={busy !== ""}
                    data-testid="save-attachments-button"
                  >
                    다시 저장
                  </button>
                </div>
              ) : null}
              {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">중단된 Vault 저장 상태 확인</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction("vault_resume", resumeVaultSourceSaves, { requiresGraph: false })}
                    disabled={busy !== ""}
                    data-testid="resume-vault-source-save-button"
                  >
                    확인
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {overlayState.featureId === "matter.search" ? (
            <>
              <OutlookOneLineField
                id="matter-search-input"
                name="matter_search"
                label="Matter 검색"
                type="search"
                value={matterSearchQuery}
                onChange={handleMatterSearchQueryChange}
                placeholder="Matter 번호, 제목 또는 고객명…"
                autoComplete="off"
                disabled={busy !== ""}
                data-testid="matter-search-input"
              />
              <OutlookOneLineField
                id="matter-select"
                name="matter_id"
                label="Matter 선택"
                as="select"
                value={selectedMatterId}
                onChange={(event) => selectMatter(event.target.value)}
                disabled={matters.length === 0 || busy !== ""}
                autoComplete="off"
                data-testid="matter-select"
              >
                <option value="">저장할 Matter를 선택해 주세요</option>
                {matters.map((matter) => (
                  <option key={matter.matter_id} value={matter.matter_id}>
                    {matter.matter_code ? `${matter.matter_code} — ${matter.title}` : matter.title}
                  </option>
                ))}
              </OutlookOneLineField>
              {selectedMatterDisplay ? (
                <OutlookCriticalValueRow
                  label="선택한 Matter"
                  value={selectedMatterDisplay}
                  onCopy={copyCriticalValue}
                />
              ) : null}
            </>
          ) : null}

          {overlayState.featureId === "task.create" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAction("task", saveEditableTask, { requiresGraph: false });
              }}
              data-testid="task-form"
            >
              <OutlookOneLineField
                id="task-draft-title"
                name="task_title"
                label="업무 제목"
                type="text"
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="업무 제목…"
                autoComplete="off"
                maxLength={240}
                required
              />
              <OutlookOneLineField
                id="task-draft-status"
                name="task_status"
                label="업무 상태"
                as="select"
                value={taskDraft.status}
                onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}
                autoComplete="off"
              >
                <option value="todo">할 일</option>
                <option value="in_progress">진행 중</option>
                <option value="blocked">차단됨</option>
                <option value="done">완료</option>
                <option value="cancelled">취소됨</option>
              </OutlookOneLineField>
              <OutlookOneLineField
                id="task-draft-due"
                name="task_due_at"
                label="마감일"
                type="datetime-local"
                value={taskDraft.due_at}
                onChange={(event) => setTaskDraft((current) => ({ ...current, due_at: event.target.value }))}
                autoComplete="off"
              />
              <OutlookOneLineField
                id="task-draft-estimated"
                name="task_estimated_minutes"
                label="예상 시간(분)"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={taskDraft.estimated_minutes}
                onChange={(event) => setTaskDraft((current) => ({ ...current, estimated_minutes: event.target.value }))}
                placeholder="예상 시간(분)…"
                autoComplete="off"
              />
              <OutlookOneLineField
                id="task-draft-assignee"
                name="task_assignee"
                label="담당자 사용자 ID"
                type="text"
                value={taskDraft.assigned_to_user_id}
                onChange={(event) => setTaskDraft((current) => ({ ...current, assigned_to_user_id: event.target.value }))}
                placeholder="담당자 사용자 ID(선택)…"
                autoComplete="off"
                maxLength={256}
              />
              {taskResult?.item?.activity_id ? (
                <>
                  <OutlookCriticalValueRow
                    label="업무 ID"
                    value={taskResult.item.activity_id}
                    onCopy={copyCriticalValue}
                  />
                  <OutlookCriticalValueRow
                    label="업무 버전"
                    value={taskResult.item.version}
                    onCopy={copyCriticalValue}
                  />
                </>
              ) : null}
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">
                  {taskResult?.item?.activity_id ? "관련 작업 수정" : "관련 작업 만들기"}
                </span>
                <button
                  type="submit"
                  className="outlook-flat-action-button"
                  disabled={!selectedMatterId || busy !== ""}
                  data-testid="create-task-button"
                >
                  저장
                </button>
              </div>
            </form>
          ) : null}

          {overlayState.featureId === "time-entry.draft" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAction("time_draft", saveTimeEntryDraft, { requiresGraph: false });
              }}
              data-testid="time-entry-draft-form"
            >
              <OutlookOneLineField
                id="time-entry-work-date"
                name="time_entry_work_date"
                label="업무일"
                type="date"
                value={timeDraft.work_date}
                onChange={(event) => setTimeDraft((current) => ({ ...current, work_date: event.target.value }))}
                autoComplete="off"
                required
              />
              <OutlookOneLineField
                id="time-entry-narrative"
                name="time_entry_narrative"
                label="업무 내용"
                type="text"
                value={timeDraft.narrative}
                onChange={(event) => setTimeDraft((current) => ({ ...current, narrative: event.target.value }))}
                placeholder="한 줄 업무 내용…"
                autoComplete="off"
                maxLength={500}
                required
              />
              <OutlookOneLineField
                id="time-entry-duration"
                name="time_entry_duration_minutes"
                label="시간(분)"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={timeDraft.duration_minutes}
                onChange={(event) => setTimeDraft((current) => ({ ...current, duration_minutes: event.target.value }))}
                placeholder="시간(분)…"
                autoComplete="off"
                required
              />
              <label className="outlook-flat-action-row" htmlFor="time-entry-billable">
                <span className="outlook-flat-action-label">청구 가능</span>
                <input
                  id="time-entry-billable"
                  name="time_entry_billable"
                  type="checkbox"
                  checked={timeDraft.billable}
                  onChange={(event) => setTimeDraft((current) => ({ ...current, billable: event.target.checked }))}
                />
              </label>
              {timeDraftResult?.item?.draft_ref ? (
                <>
                  <OutlookCriticalValueRow
                    label="시간 기록 초안 ID"
                    value={timeDraftResult.item.draft_ref}
                    onCopy={copyCriticalValue}
                  />
                  <OutlookCriticalValueRow
                    label="시간 기록 초안 버전"
                    value={timeDraftResult.item.version}
                    onCopy={copyCriticalValue}
                  />
                </>
              ) : null}
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">시간 기록 초안 만들기</span>
                <button
                  type="submit"
                  className="outlook-flat-action-button"
                  disabled={!selectedMatterId || busy !== ""}
                  data-testid="create-time-entry-draft-button"
                >
                  저장
                </button>
              </div>
            </form>
          ) : null}

          {overlayState.featureId === "all-functions" && overlayState.view === "catalog" ? (
            <>
              <div className="outlook-flat-action-row" data-action-row="conversation.auto-save">
                <span className="outlook-flat-action-label">대화 자동 저장</span>
                <button
                  id="conversation-auto-save-open"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={openConversationPolicy}
                  disabled={!authenticated || !itemAvailable || item?.mode !== "read" || !selectedMatterId || !outlookItemContextKey(outlookItemContext(item)) || busy !== ""}
                  data-testid="conversation-auto-save-open"
                >
                  열기
                </button>
              </div>
              <div className="outlook-flat-action-row" data-action-row="document.create-and-sign-status">
                <span className="outlook-flat-action-label">문서 만들기·서명 상태</span>
                <button
                  id="document-create-and-sign-status-open"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={openDocumentSigning}
                  disabled={!authenticated || !itemAvailable || !selectedMatterId || !outlookItemContextKey(outlookItemContext(item)) || busy !== ""}
                  data-testid="document-create-and-sign-status-open"
                >
                  열기
                </button>
              </div>
              <div className="outlook-flat-action-row" data-action-row="filing.correct-placement">
                <span className="outlook-flat-action-label">저장 위치 바꾸기</span>
                <button
                  id="filing-correction-open"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={openFilingCorrection}
                  disabled={!authenticated || !itemAvailable || item?.mode !== "read" || !selectedMatterId || busy !== ""}
                  data-testid="filing-correction-open"
                >
                  열기
                </button>
              </div>
              <div className="outlook-flat-action-row" data-action-row="precedent.search">
                <span className="outlook-flat-action-label">유사 사건·선례 찾기</span>
                <button
                  id="precedent-search-open"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={openPrecedentSearch}
                  disabled={!authenticated || !itemAvailable || !selectedMatterId || !online || busy !== ""}
                  data-testid="precedent-search-open"
                >
                  열기
                </button>
              </div>
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">
                  {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED
                    ? "Vault에 보낸 메일 및 첨부 저장"
                    : "보낸 메일 저장"}
                </span>
                <button
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={() => void runAction(
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "vault_sent_file" : "sent_file",
                    OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? fileSentEmailToVault : fileSentEmail,
                  )}
                  disabled={!graphConnected || !selectedMatterId || item?.provenance !== "sent" || busy !== ""}
                  data-testid="file-sent-email-button"
                  data-storage-authority={OUTLOOK_VAULT_SOURCE_SAVE_ENABLED ? "amic-vault-api" : "lawos-dms"}
                >
                  저장
                </button>
              </div>
              {OUTLOOK_VAULT_SOURCE_SAVE_ENABLED
                && vaultSourceSaveResult?.retry_attachment_ids?.length > 0 ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">실패한 Vault 첨부 다시 저장</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction("vault_attachments", retryVaultSourceAttachments)}
                    disabled={!graphConnected || busy !== ""}
                    data-testid="retry-vault-source-attachments-button"
                  >
                    다시 저장
                  </button>
                </div>
              ) : !OUTLOOK_VAULT_SOURCE_SAVE_ENABLED && emailResult ? (
                <div className="outlook-flat-action-row">
                  <span className="outlook-flat-action-label">첨부 파일 다시 저장</span>
                  <button
                    type="button"
                    className="outlook-flat-action-button"
                    onClick={() => void runAction("attachments", saveAttachments)}
                    disabled={!graphConnected || busy !== ""}
                    data-testid="save-attachments-button"
                  >
                    다시 저장
                  </button>
                </div>
              ) : null}
              <OutlookFlatActionRow
                label="Matter 활동과 문서"
                actionId="matter-readbacks"
                onClick={() => void runAction("readbacks", refreshReadbacks, { requiresGraph: false })}
                disabled={!selectedMatterId}
                busy={busy !== ""}
              >
                새로고침
              </OutlookFlatActionRow>
              <ul aria-label="Matter 활동" data-testid="timeline-list">
                {timeline.length === 0
                  ? <li className="outlook-one-line">활동 없음</li>
                  : timeline.slice(0, 4).map((entry) => (
                    <li className="outlook-one-line" key={entry.event_id}>{entry.title}</li>
                  ))}
              </ul>
              <ul aria-label="Matter 문서" data-testid="document-list">
                {documents.length === 0
                  ? <li className="outlook-one-line">문서 없음</li>
                  : documents.slice(0, 4).map((document) => (
                    <li className="outlook-one-line" key={document.document_id}>{document.title}</li>
                  ))}
              </ul>
              <div className="outlook-flat-action-row">
                <span className="outlook-flat-action-label">보내기 전 확인</span>
                <button
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={() => void runAction("alerts", evaluateAlerts)}
                  disabled={!graphConnected || busy !== ""}
                  data-testid="smart-alert-button"
                >
                  확인
                </button>
              </div>
            </>
          ) : null}

          {overlayState.featureId === "all-functions" && overlayState.view === "conversation-auto-save" ? (
            <>
              <div className="outlook-flat-action-row" data-action-row="conversation.auto-save.back">
                <span className="outlook-flat-action-label">대화 자동 저장</span>
                <button
                  id="conversation-auto-save-back"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={backFromConversationPolicy}
                  data-testid="conversation-auto-save-back"
                >
                  뒤로
                </button>
              </div>
              {conversationFeatureContext ? (
                <OutlookConversationPolicyFeature
                  requestJson={requestJson}
                  contextKey={conversationFeatureContext.contextKey}
                  matterId={conversationFeatureContext.matterId}
                  conversationId={conversationFeatureContext.conversationId}
                  m365ConnectionId={conversationFeatureContext.m365ConnectionId}
                  seedEmailThreadId={conversationSeedEmailThreadId}
                  connectionRequired={!graphConnected || !conversationFeatureContext.m365ConnectionId}
                  offline={!online}
                  isContextCurrent={(snapshot) => isAllFunctionsFeatureContextCurrent(conversationFeatureContext, snapshot)}
                  onReconnect={online && busy === "" ? connectOutlook : undefined}
                />
              ) : null}
            </>
          ) : null}

          {overlayState.featureId === "all-functions" && overlayState.view === "document-create-and-sign-status" ? (
            <>
              <div className="outlook-flat-action-row" data-action-row="document.create-and-sign-status.back">
                <span className="outlook-flat-action-label">문서 만들기·서명 상태</span>
                <button
                  id="document-create-and-sign-status-back"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={backFromDocumentSigning}
                  data-testid="document-create-and-sign-status-back"
                >
                  뒤로
                </button>
              </div>
              {documentFeatureContext ? (
                <OutlookDocumentSigningFeature
                  requestJson={requestJson}
                  contextKey={documentFeatureContext.contextKey}
                  matterId={documentFeatureContext.matterId}
                  offline={!online}
                  isContextCurrent={(snapshot) => isAllFunctionsFeatureContextCurrent(documentFeatureContext, snapshot)}
                  onCopy={copyCriticalValue}
                  onOpenDocument={openCanonicalMatterDocument}
                />
              ) : null}
            </>
          ) : null}

          {overlayState.featureId === "all-functions" && overlayState.view === "precedent-search" ? (
            <>
              <div className="outlook-flat-action-row" data-action-row="precedent-search-back">
                <span className="outlook-flat-action-label">유사 사건·선례 찾기</span>
                <button
                  id="precedent-search-back"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={backFromPrecedentSearch}
                  data-testid="precedent-search-back"
                >
                  뒤로
                </button>
              </div>
              <OutlookPrecedentPanel
                authoritative={precedentSearch.readiness?.authoritative === true}
                runtimeReady={precedentSearch.readiness?.runtime_ready === true}
                authoritativeReady={precedentSearch.readiness?.authoritative === true}
                query={precedentSearch.query}
                onQueryChange={(query) => {
                  invalidatePrecedentRequest();
                  updatePrecedentSearch((current) => ({
                    ...current,
                    query,
                    stableQuery: "",
                    items: [],
                    selectedItem: null,
                    nextCursor: null,
                    busy: false,
                    empty: false,
                    error: "",
                    retry: null,
                  }));
                }}
                onSubmit={(query) => void runPrecedentSearch({ query })}
                items={precedentSearch.items}
                selectedItem={precedentSearch.selectedItem}
                onSelect={(selectedItem) => updatePrecedentSearch((current) => (
                  current.items.includes(selectedItem) ? { ...current, selectedItem } : current
                ))}
                onCopy={copyCriticalValue}
                onOpenDeepLink={openPrecedentDeepLink}
                busy={precedentSearch.busy}
                error={precedentSearch.error}
                empty={precedentSearch.empty}
                indexStale={precedentSearch.indexStale}
                onRetry={retryPrecedentSearch}
              />
              {precedentSearch.readiness
                && precedentSearch.nextCursor
                && !precedentSearch.busy
                && !precedentSearch.error ? (
                  <div className="outlook-flat-action-row" data-action-row="precedent.search.next">
                    <span className="outlook-flat-action-label">검색 결과</span>
                    <button
                      type="button"
                      className="outlook-flat-action-button"
                      data-testid="outlook-precedent-next"
                      onClick={() => void runPrecedentSearch({
                        query: precedentSearch.stableQuery,
                        cursor: precedentSearch.nextCursor,
                        append: true,
                      })}
                    >
                      더 보기
                    </button>
                  </div>
                ) : null}
            </>
          ) : null}

          {overlayState.featureId === "all-functions" && overlayState.view === "filing-correction" ? (
            <>
              <div className="outlook-flat-action-row" data-action-row="filing.correct-placement.back">
                <span className="outlook-flat-action-label">저장 위치 바꾸기</span>
                <button
                  id="filing-correction-back"
                  type="button"
                  className="outlook-flat-action-button"
                  onClick={backFromFilingCorrection}
                  data-testid="filing-correction-back"
                >
                  뒤로
                </button>
              </div>
              {filingCorrection.resultOnly && filingCorrection.result ? (
                <>
                  <OutlookCriticalValueRow
                    label="현재 Matter"
                    value={filingCorrection.result.current.matter_id}
                    onCopy={copyCriticalValue}
                  />
                  <OutlookCriticalValueRow
                    label="정정 ID"
                    value={filingCorrection.result.current.correction_id}
                    onCopy={copyCriticalValue}
                  />
                  <p className="outlook-one-line" role="status" data-testid="filing-correction-result">
                    {filingCorrection.result.outcome === "idempotent_replay" ? "이미 변경됨" : "변경됨"}
                  </p>
                </>
              ) : filingCorrection.currentPlacement ? (
                <OutlookFilingCorrectionPanel
                  currentPlacement={filingCorrection.currentPlacement}
                  currentMatter={selectedMatter}
                  currentMatterDisplay={selectedMatterDisplay}
                  targetMatters={filingCorrection.targetMatters}
                  targetMatterId={filingCorrection.targetMatterId}
                  targetQuery={filingCorrection.targetQuery}
                  reason={filingCorrection.reason}
                  confirmed={filingCorrection.confirmed}
                  busy={busy === "correction"}
                  result={filingCorrection.result}
                  onTargetQueryChange={handleFilingCorrectionQueryChange}
                  onTargetMatterChange={handleFilingCorrectionTargetChange}
                  onReasonChange={(event) => setFilingCorrection((current) => ({ ...current, reason: event.target.value, result: null }))}
                  onConfirmationChange={(event) => setFilingCorrection((current) => ({ ...current, confirmed: event.target.checked, result: null }))}
                  onSubmit={() => void submitFilingCorrection()}
                  onCopy={copyCriticalValue}
                />
              ) : null}
              <CompactIntervention intervention={filingCorrection.notice} />
            </>
          ) : null}

          {overlayState.open && !["filing-correction", "precedent-search", "conversation-auto-save", "document-create-and-sign-status"].includes(overlayState.view)
            ? <CompactIntervention intervention={intervention} />
            : null}
        </OutlookOverlay>
      )}
    >
      <OutlookFilingOverview
        item={item}
        selectedMatterDisplay={selectedMatterDisplay}
        busy={busy}
        filed={Boolean(emailResult || receiptRecovery)}
      />
    </OutlookMatterCompactShell>
  );
}

function mount() {
  window.addEventListener(OFFICE_READY_EVENT, registerOutlookCommandBridgeOnce);
  startOfficeTaskPane({
    render: () => createRoot(document.getElementById("root")).render(<App />),
    waitForReady: ensureOfficeReady,
    register: registerOutlookCommandBridgeOnce,
  });
}

if (!import.meta.env.SSR) void mount();
