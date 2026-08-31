import { AUTH_STATE } from "./addin-auth.js";
import { createOutlookAuthRuntime } from "./outlook-auth-runtime.js";
import { createOutlookItemRuntime } from "./outlook-item-runtime.js";

const INTERACTION_REQUIRED = "LAWOS_INTERACTION_REQUIRED";

function errorWithCode(code, message = code, details = {}) {
  return Object.assign(new Error(message), { safe_error_code: code, ...details });
}

function itemChangedError() {
  return Object.assign(new Error("OUTLOOK_ITEM_CHANGED_DURING_ACTION"), {
    safe_error_code: "OUTLOOK_ITEM_CHANGED_DURING_ACTION",
    user_message: "처리 중 다른 메일로 이동했습니다. 현재 메일을 다시 선택해 주세요.",
  });
}

/** Neutral task-pane controller: generic state plus injected capability action. */
export function createOutlookTaskPaneRuntime({
  windowObject = globalThis.window ?? globalThis,
  Office = windowObject?.Office ?? globalThis.Office,
  fetchImpl = windowObject?.fetch?.bind(windowObject) ?? globalThis.fetch,
  createPca,
  waitForReady,
  subscribeToItems,
  readBody,
  readClassification,
  resolveRestId,
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
    busy: "",
    error: null,
  };
  let disposed = false;
  let started = false;

  const snapshot = () => Object.freeze({ ...state });
  const emit = () => {
    const next = snapshot();
    for (const listener of listeners) listener(next);
  };
  const update = (patch) => {
    if (disposed) return;
    Object.assign(state, patch);
    emit();
  };

  const auth = createOutlookAuthRuntime({
    windowObject,
    Office,
    fetchImpl,
    createPca,
    requestJson: requestJsonOverride,
    acquireLawosSession: acquireSessionOverride,
    onAuthRequired: (error) => update({ authState: AUTH_STATE.loginRequired, authError: error }),
  });
  const itemRuntime = createOutlookItemRuntime({
    Office,
    waitForReady,
    subscribeToItems,
    readBody,
    readClassification,
    resolveRestId,
    onPending: () => update({ item: null, itemPending: true }),
    onItem: (item) => update({ item, itemPending: false }),
  });

  async function initializeAuth() {
    const result = await auth.initializeAuth();
    update({ authState: result.authState, authError: result.authError });
  }

  async function signIn() {
    update({ busy: "login", authState: AUTH_STATE.acquiring, authError: null, error: null });
    try {
      const result = await auth.signIn();
      update({ authState: result.authState, authError: result.authError });
    } finally {
      update({ busy: "" });
    }
  }

  async function runAction(action, payload = {}) {
    if (state.authState !== AUTH_STATE.authenticated) {
      update({ error: errorWithCode("AUTH_SESSION_REQUIRED") });
      return null;
    }
    const capturedItem = state.item;
    // ItemChanged clears the displayed item before its asynchronous read. The
    // live identity check also catches a swap before the callback runs.
    if (state.itemPending || !capturedItem || !itemRuntime.isCurrentItem(capturedItem)) {
      const error = itemChangedError();
      update({ error });
      return null;
    }
    update({ busy: action, error: null });
    const guardedRequestJson = async (path, options = {}) => {
      if (state.itemPending || !itemRuntime.isCurrentItem(capturedItem)) throw itemChangedError();
      return auth.requestJson(path, options);
    };
    const actionContext = {
      action,
      existingLeadId: payload.existingLeadId,
      item: capturedItem,
      requestJson: guardedRequestJson,
      isCurrentItem: itemRuntime.isCurrentItem,
    };
    try {
      // The auth request layer owns the single silent 401 recovery and replays
      // only the failed HTTP request. Replaying the whole capability action here
      // could duplicate a multi-request business operation.
      const result = await actionHandler(actionContext);
      update({ result });
      return result;
    } catch (error) {
      if (error?.safe_error_code === INTERACTION_REQUIRED || error?.status === 401) {
        update({ authState: AUTH_STATE.loginRequired, authError: error });
      }
      update({ error });
      return null;
    } finally {
      update({ busy: "" });
    }
  }

  function start() {
    if (started) return;
    started = true;
    itemRuntime.start();
    if (authenticateOnStart) void initializeAuth();
  }

  function dispose() {
    disposed = true;
    itemRuntime.dispose();
    listeners.clear();
  }

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
