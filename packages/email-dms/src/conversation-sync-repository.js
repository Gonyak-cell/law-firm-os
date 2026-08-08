import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import { assertNoDmsPersistedSecrets } from "../../dms/src/persistence-guard.js";

const COLLECTIONS = Object.freeze([
  "policies",
  "subscriptions",
  "cursors",
  "jobs",
  "receipts",
  "audit_events",
  "idempotency",
]);

function emptyState() {
  return {
    schema_version: "lawos.outlook-conversation-sync.v1",
    policies: [],
    subscriptions: [],
    cursors: [],
    jobs: [],
    receipts: [],
    audit_events: [],
    idempotency: [],
  };
}

function normalizeState(value = {}) {
  const normalized = { ...emptyState(), ...structuredClone(value ?? {}) };
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(normalized[collection])) {
      throw new TypeError(`conversation sync ${collection} must be an array`);
    }
  }
  assertNoDmsPersistedSecrets(normalized, "conversation_sync_state");
  return normalized;
}

export function createConversationSyncRepository({ filePath } = {}) {
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: emptyState(),
    normalizeValue: normalizeState,
  });
  let state = controller.value;

  function snapshot() {
    return Object.freeze(structuredClone(state));
  }

  function transaction(operation) {
    if (typeof operation !== "function") {
      throw new TypeError("conversation sync transaction callback is required");
    }
    const draft = structuredClone(state);
    const result = operation(draft);
    assertNoDmsPersistedSecrets(draft, "conversation_sync_state");
    controller.commit(draft);
    state = controller.value;
    return structuredClone(result);
  }

  return Object.freeze({
    authority: "email-dms-conversation-sync",
    durable: Boolean(filePath),
    snapshot,
    transaction,
    reload() {
      state = controller.reload().value;
      return snapshot();
    },
  });
}
