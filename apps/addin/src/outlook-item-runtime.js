import {
  readOutlookItemBody,
  readOutlookItemClassification,
} from "./outlook-item-content.js";
import { resolveCurrentOutlookRestMessageId } from "./outlook-item-id.js";
import {
  outlookItemIdentityKey,
  subscribeToOutlookItemChanges,
} from "./outlook-item-events.js";
import { waitForOfficeReady } from "./office-ready.js";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function identityKey(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  const normalizedKey = outlookItemIdentityKey(snapshot);
  if (normalizedKey) return normalizedKey;
  const officeId = text(snapshot.office_item_id);
  if (officeId) return `office:${officeId}`;
  const values = [snapshot.graph_message_id, snapshot.internet_message_id, snapshot.conversation_id].map(text);
  return values.every(Boolean) ? values.join("\u001f") : "";
}

export function createOutlookItemRuntime({
  Office = globalThis.Office,
  waitForReady = waitForOfficeReady,
  subscribeToItems = subscribeToOutlookItemChanges,
  readBody = readOutlookItemBody,
  readClassification = readOutlookItemClassification,
  resolveRestId = resolveCurrentOutlookRestMessageId,
  onPending = () => {},
  onItem = () => {},
} = {}) {
  let disposed = false;
  let started = false;
  let officeReadyPromise = null;
  let itemGeneration = 0;
  let surfaceGeneration = 0;
  let unsubscribeItems = () => {};

  function currentItemSnapshot() {
    const item = Office?.context?.mailbox?.item;
    if (!item) return null;
    let restMessageId = null;
    try {
      restMessageId = resolveRestId({ Office }).rest_message_id;
    } catch {
      // A preview may render without a REST id; actions fail closed later.
    }
    return {
      office_item_id: text(item.itemId) || null,
      graph_message_id: restMessageId,
      internet_message_id: text(item.internetMessageId) || null,
      conversation_id: text(item.conversationId) || null,
      subject: text(item.subject) || "제목 없음",
      body_preview: "",
    };
  }

  async function readCurrentItem() {
    const before = currentItemSnapshot();
    if (!before) return null;
    const item = Office?.context?.mailbox?.item;
    let bodyPreview = "";
    try {
      bodyPreview = (await readBody({ item, Office })).slice(0, 500);
    } catch {
      // A subject and identity remain useful when the bounded preview fails.
    }
    const classification = await readClassification({ item });
    return Object.freeze({ ...before, body_preview: bodyPreview, ...classification });
  }

  async function refreshItem() {
    const generation = ++itemGeneration;
    onPending();
    const before = currentItemSnapshot();
    if (!before) {
      if (!disposed && generation === itemGeneration) onItem(null);
      return null;
    }
    const next = await readCurrentItem();
    const after = currentItemSnapshot();
    if (
      disposed
      || generation !== itemGeneration
      || identityKey(before) === ""
      || identityKey(before) !== identityKey(after)
    ) return null;
    onItem(next);
    return next;
  }

  async function reinitializeOfficeSurface() {
    if (disposed) return;
    const currentSurface = ++surfaceGeneration;
    ++itemGeneration;
    unsubscribeItems();
    unsubscribeItems = () => {};
    await refreshItem();
    if (disposed || currentSurface !== surfaceGeneration) return;
    unsubscribeItems = subscribeToItems({
      Office,
      onChange: () => { void refreshItem(); },
    }) ?? (() => {});
  }

  function ensureOfficeReady() {
    if (!officeReadyPromise) {
      const firstReady = waitForReady({
        Office,
        onLateReady: () => {
          officeReadyPromise = Promise.resolve({ status: "ready" });
          void reinitializeOfficeSurface();
        },
      });
      officeReadyPromise = firstReady;
      void firstReady.then(() => reinitializeOfficeSurface());
    }
    return officeReadyPromise;
  }

  function start() {
    if (started) return;
    started = true;
    void ensureOfficeReady();
  }

  function dispose() {
    disposed = true;
    ++surfaceGeneration;
    ++itemGeneration;
    unsubscribeItems();
    unsubscribeItems = () => {};
  }

  return Object.freeze({
    start,
    dispose,
    ensureOfficeReady,
    refreshItem,
    currentItemSnapshot,
    isCurrentItem: (source) => identityKey(source) !== "" && identityKey(source) === identityKey(currentItemSnapshot()),
  });
}
