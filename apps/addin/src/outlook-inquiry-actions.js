import { AUTH_STATE } from "./addin-auth.js";
import { validateInquiryResponse } from "./inquiry-actions.js";
import { createOutlookAuthRuntime } from "./outlook-auth-runtime.js";
import { resolveCurrentOutlookRestMessageId } from "./outlook-item-id.js";
import { outlookItemIdentityKey, subscribeToOutlookItemChanges } from "./outlook-item-events.js";
import { createOutlookBusyFence } from "./outlook-session-fence.js";
import { waitForOfficeReady } from "./office-ready.js";

const INTERACTION_REQUIRED = "LAWOS_INTERACTION_REQUIRED";
const ITEM_CHANGED = "OUTLOOK_ITEM_CHANGED_DURING_ACTION";
const ITEM_CHANGED_MESSAGE = "처리 중 다른 메일로 이동했습니다. 선택한 메일을 다시 열어 주세요.";
const COMPLETED_RECEIPT_LIMIT = 16;

function text(value) { return typeof value === "string" ? value.trim() : ""; }

function identityKey(snapshot) {
  return snapshot && typeof snapshot === "object" ? outlookItemIdentityKey(snapshot) : "";
}

function itemChangedError() {
  return Object.assign(new Error(ITEM_CHANGED), {
    safe_error_code: ITEM_CHANGED,
    user_message: ITEM_CHANGED_MESSAGE,
  });
}

function normalizeInquiryActionResult(result, sourceItemContextKey, current, action) {
  const leadId = typeof result?.item?.lead_id === "string" ? result.item.lead_id.trim() : "";
  if (!result || typeof result !== "object" || result.action !== action || result.outcome !== "registered" || result.refreshInquiries !== true || result.item?.lead_id !== leadId || !leadId || leadId.length > 512 || /[\u0000-\u001f\u007f]/u.test(leadId) || typeof result.item?.idempotent_replay !== "boolean") throw Object.assign(new Error("API_RESPONSE_INVALID"), { safe_error_code: "API_RESPONSE_INVALID" });
  return Object.freeze({ ...result, item: Object.freeze({ lead_id: leadId, idempotent_replay: result.item.idempotent_replay }), source_item_context_key: sourceItemContextKey, apply_to_current_view: current, ...(current ? { stale_item: undefined } : { stale_item: true }) });
}

/** Preserve a committed response while preventing it from applying to a newly selected item. */
export function buildInquiryActionResult({ action, body, item, isCurrentItem } = {}) {
  const validatedItem = validateInquiryResponse(action, body);
  const sourceItemContextKey = outlookItemIdentityKey(item);
  const current = typeof isCurrentItem !== "function" || isCurrentItem(item);
  return Object.freeze({
    action,
    outcome: "registered",
    item: validatedItem,
    refreshInquiries: true,
    source_item_context_key: sourceItemContextKey,
    apply_to_current_view: current,
    ...(current ? {} : { stale_item: true }),
  });
}

function createInquiryItemRuntime({
  Office,
  waitForReady = waitForOfficeReady,
  subscribeToItems = subscribeToOutlookItemChanges,
  onPending = () => {},
  onItem = () => {},
} = {}) {
  let disposed = false; let started = false;
  let readyPromise = null;
  let generation = 0;
  let surfaceGeneration = 0;
  let unsubscribe = () => {};

  const currentItemSnapshot = () => {
    const item = Office?.context?.mailbox?.item;
    if (!item) return null;
    let restMessageId = null;
    try { restMessageId = resolveCurrentOutlookRestMessageId({ Office }).rest_message_id; } catch { /* fail closed at action */ }
    return { office_item_id: text(item.itemId) || null, graph_message_id: restMessageId, internet_message_id: text(item.internetMessageId) || null, conversation_id: text(item.conversationId) || null, subject: text(item.subject) || "제목 없음", body_preview: "" };
  };

  const refreshItem = async () => {
    const currentGeneration = ++generation;
    onPending();
    const before = currentItemSnapshot();
    if (!before) {
      if (!disposed && currentGeneration === generation) onItem(null);
      return null;
    }
    const after = currentItemSnapshot();
    if (disposed || currentGeneration !== generation || !identityKey(before) || identityKey(before) !== identityKey(after)) return null;
    const next = Object.freeze({ ...before });
    onItem(next);
    return next;
  };

  const reinitialize = async () => {
    if (disposed) return;
    const currentSurface = ++surfaceGeneration;
    ++generation;
    unsubscribe(); unsubscribe = () => {};
    await refreshItem();
    if (disposed || currentSurface !== surfaceGeneration) return;
    unsubscribe = subscribeToItems({ Office, onChange: () => { void refreshItem(); } }) ?? (() => {});
  };

  const ensureOfficeReady = () => {
    if (!readyPromise) {
      const firstReady = waitForReady({
        Office,
        onLateReady: () => { readyPromise = Promise.resolve({ status: "ready" }); void reinitialize(); },
      });
      readyPromise = firstReady;
      void firstReady.then(() => reinitialize());
    }
    return readyPromise;
  };
  const start = () => { if (!started) { started = true; void ensureOfficeReady(); } };
  const dispose = () => {
    disposed = true; ++surfaceGeneration; ++generation;
    unsubscribe(); unsubscribe = () => {};
  };

  return Object.freeze({
    start,
    dispose,
    ensureOfficeReady,
    refreshItem,
    currentItemSnapshot,
    isCurrentItem: (source) => Boolean(identityKey(source)) && identityKey(source) === identityKey(currentItemSnapshot()),
  });
}

export function createOutlookInquiryRuntime({
  windowObject = globalThis.window ?? globalThis,
  Office = windowObject?.Office ?? globalThis.Office,
  fetchImpl = windowObject?.fetch?.bind(windowObject) ?? globalThis.fetch,
  createPca,
  waitForReady,
  subscribeToItems,
  requestJson: requestJsonOverride = null,
  acquireLawosSession: acquireSessionOverride = null,
  actionHandler = async () => ({}),
  initialAuthState = AUTH_STATE.loading,
  authenticateOnStart = true,
} = {}) {
  const listeners = new Set();
  const state = {
    authState: initialAuthState,
    authError: null,
    item: null,
    itemPending: false,
    result: null,
    staleResult: null,
    busy: "",
    error: null,
  };
  let disposed = false;
  let started = false;
  const completedReceipts = new Map();
  const busyFence = createOutlookBusyFence();
  const snapshot = () => Object.freeze({ ...state });
  const emit = () => { const next = snapshot(); for (const listener of listeners) listener(next); };
  const update = (patch) => { if (!disposed) { Object.assign(state, patch); emit(); } };
  const endBusy = (operation) => {
    if (busyFence.end(operation)) update({ busy: "" });
  };
  const clearReceipts = (patch = {}) => {
    completedReceipts.clear();
    update({ result: null, staleResult: null, ...patch });
  };
  const staleRecovery = (result, viewItemContextKey) => Object.freeze({ stale_item: true, apply_to_current_view: false, source_item_context_key: result?.source_item_context_key ?? "", view_item_context_key: viewItemContextKey ?? "" });
  const rememberReceipt = (key, result) => {
    if (!key || !result) return;
    completedReceipts.delete(key);
    completedReceipts.set(key, result);
    while (completedReceipts.size > COMPLETED_RECEIPT_LIMIT) completedReceipts.delete(completedReceipts.keys().next().value);
  };
  const receiptForItem = (item) => completedReceipts.get(identityKey(item)) ?? null;
  const auth = createOutlookAuthRuntime({
    windowObject,
    Office,
    fetchImpl,
    createPca,
    requestJson: requestJsonOverride,
    acquireLawosSession: acquireSessionOverride,
    onAuthRequired: (error) => {
      busyFence.invalidate();
      clearReceipts({ authState: AUTH_STATE.loginRequired, authError: error, busy: "" });
    },
  });
  const itemRuntime = createInquiryItemRuntime({
    Office,
    waitForReady,
    subscribeToItems,
    onPending: () => update({ item: null, itemPending: true }),
    onItem: (item) => {
      const itemChanged = identityKey(state.item) !== identityKey(item);
      const receipt = receiptForItem(item); const staleForItem = state.staleResult?.view_item_context_key === identityKey(item) ? state.staleResult : null;
      update({ item, itemPending: false, result: receipt ?? (itemChanged ? null : state.result), staleResult: receipt ? null : itemChanged ? staleForItem : state.staleResult });
    },
  });

  async function initializeAuth() {
    const result = await auth.initializeAuth();
    if (!auth.isAuthOwnerCurrent(result.authOwner)) return;
    if (result.authState === AUTH_STATE.authenticated) update({ authState: result.authState, authError: result.authError });
    else clearReceipts({ authState: result.authState, authError: result.authError });
  }

  async function signIn() {
    const busyOperation = busyFence.begin("login");
    clearReceipts({ busy: "login", authState: AUTH_STATE.acquiring, authError: null, error: null });
    let signInOwner = null;
    try {
      const result = await auth.signIn();
      signInOwner = result.authOwner;
      if (!auth.isAuthOwnerCurrent(signInOwner)) return;
      if (result.authState === AUTH_STATE.authenticated) update({ authState: result.authState, authError: result.authError });
      else clearReceipts({ authState: result.authState, authError: result.authError });
    } finally {
      endBusy(busyOperation);
    }
  }

  async function runAction(action, payload = {}) {
    if (state.authState !== AUTH_STATE.authenticated) {
      update({ error: Object.assign(new Error("AUTH_SESSION_REQUIRED"), { safe_error_code: "AUTH_SESSION_REQUIRED" }) });
      return null;
    }
    const capturedItem = state.item;
    if (state.itemPending || !capturedItem || !itemRuntime.isCurrentItem(capturedItem)) {
      update({ error: itemChangedError() });
      return null;
    }
    let actionSession;
    try {
      actionSession = await auth.createSessionRequestContext();
    } catch (error) {
      if (error?.safe_error_code === "AUTH_SESSION_REQUIRED") {
        busyFence.invalidate();
        clearReceipts({
          authState: AUTH_STATE.loginRequired,
          authError: error,
          busy: "",
          error,
        });
      } else if (error?.safe_error_code !== "AUTH_SESSION_OWNER_CHANGED") {
        update({ error });
      }
      return null;
    }
    if (!actionSession.isCurrent() || state.authState !== AUTH_STATE.authenticated) return null;
    const busyOperation = busyFence.begin(action);
    update({ busy: action, error: null, staleResult: null });
    const guardedRequestJson = async (path, options = {}) => {
      if (state.itemPending || !itemRuntime.isCurrentItem(capturedItem)) throw itemChangedError();
      return actionSession.requestJson(path, options);
    };
    const actionContext = { action, existingLeadId: payload.existingLeadId, item: capturedItem, requestJson: guardedRequestJson, isCurrentItem: itemRuntime.isCurrentItem };
    try {
      const result = await actionHandler(actionContext);
      if (!actionSession.isCurrent()) return null;
      const capturedKey = identityKey(capturedItem);
      const currentViewItem = itemRuntime.currentItemSnapshot(); const currentViewKey = identityKey(currentViewItem);
      const current = Boolean(capturedKey) && capturedKey === currentViewKey;
      const normalizedResult = normalizeInquiryActionResult(result, capturedKey, current, action);
      if (normalizedResult?.source_item_context_key === capturedKey && typeof normalizedResult.apply_to_current_view === "boolean") rememberReceipt(capturedKey, normalizedResult);
      update({ result: current ? normalizedResult : null, staleResult: current ? null : normalizedResult?.stale_item ? staleRecovery(normalizedResult, currentViewKey) : null });
      return normalizedResult;
    } catch (error) {
      if (!actionSession.isCurrent()) return null;
      if (error?.safe_error_code === INTERACTION_REQUIRED || error?.status === 401) clearReceipts({ authState: AUTH_STATE.loginRequired, authError: error });
      update({ error });
      return null;
    } finally {
      endBusy(busyOperation);
    }
  }

  const start = () => {
    if (started) return;
    started = true;
    itemRuntime.start();
    if (authenticateOnStart) void initializeAuth();
  };
  const dispose = () => {
    disposed = true;
    busyFence.invalidate();
    completedReceipts.clear(); itemRuntime.dispose();
    listeners.clear();
  };

  return Object.freeze({
    getState: snapshot,
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener is required");
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    start,
    dispose,
    ensureOfficeReady: itemRuntime.ensureOfficeReady,
    refreshItem: itemRuntime.refreshItem,
    currentItemSnapshot: itemRuntime.currentItemSnapshot,
    isCurrentItem: itemRuntime.isCurrentItem,
    requestJson: auth.requestJson,
    signIn,
    runAction,
  });
}
