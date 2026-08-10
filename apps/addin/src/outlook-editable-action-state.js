import {
  isFiledEmailContextCurrent,
  outlookItemContextKey,
} from "./outlook-item-events.js";

function editorContextKey(item, matterId) {
  const itemKey = outlookItemContextKey({
    item,
    mode: item?.mode,
    provenance: item?.provenance,
  });
  return itemKey ? JSON.stringify([itemKey, matterId ?? ""]) : "";
}

export function createOutlookEditorContextStore(limit = 16) {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError("editor context limit must be a positive integer");
  }
  const contexts = new Map();
  return Object.freeze({
    save({ item, matterId, value } = {}) {
      const key = editorContextKey(item, matterId);
      if (!key) return false;
      contexts.delete(key);
      contexts.set(key, value);
      while (contexts.size > limit) contexts.delete(contexts.keys().next().value);
      return true;
    },
    load({ item, matterId } = {}) {
      const key = editorContextKey(item, matterId);
      const value = key ? contexts.get(key) : null;
      if (value && key) {
        contexts.delete(key);
        contexts.set(key, value);
      }
      return value ?? null;
    },
    clear() {
      contexts.clear();
    },
    get size() {
      return contexts.size;
    },
  });
}

export function resolveOutlookTaskSourceEmailThreadId({
  existingTask,
  retainedContextSourceEmailThreadId,
  emailResult,
  currentItem,
  matterId,
} = {}) {
  if (existingTask) return null;
  if (
    typeof retainedContextSourceEmailThreadId === "string"
    && retainedContextSourceEmailThreadId
  ) return retainedContextSourceEmailThreadId;
  if (!isFiledEmailContextCurrent({ emailResult, currentItem, matterId })) return null;
  return emailResult?.email_thread_id
    ?? emailResult?.email_thread?.email_thread_id
    ?? null;
}

export async function createOutlookIntentIdempotencyKey(
  prefix,
  input,
  cryptoImpl = globalThis.crypto,
) {
  if (
    typeof cryptoImpl?.subtle?.digest !== "function"
    || typeof globalThis.TextEncoder !== "function"
  ) {
    throw Object.assign(new Error("OUTLOOK_OPERATION_KEY_UNAVAILABLE"), {
      safe_error_code: "OUTLOOK_OPERATION_KEY_UNAVAILABLE",
    });
  }
  const digest = await cryptoImpl.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(input)),
  );
  const fingerprint = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}:${fingerprint}`;
}

export async function withOptionalOutlookMatterReadback(result, readback) {
  try {
    await readback();
    return result;
  } catch {
    return { ...result, outlook_readback_pending: true };
  }
}
