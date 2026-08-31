import {
  outlookSourceItemKey,
  parseCapturedOutlookSourceIdentity,
} from "../../../packages/email-dms/src/outlook-source-identity.js";

export const OUTLOOK_VAULT_EMAIL_SAVE_PATH = "/api/outlook/vault/email/save";
export const OUTLOOK_VAULT_SENT_SAVE_PATH = "/api/outlook/vault/sent/save";
export const OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH = "/api/outlook/vault/attachments/save";
export const OUTLOOK_VAULT_SOURCE_STATUS_PATH = "/api/outlook/vault/source/status";
export const OUTLOOK_VAULT_SOURCE_PENDING_STORAGE_KEY = "lawos.outlook.vault-source.pending.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const OPERATION_KINDS = new Set(["save_email", "save_email_attachment"]);
const PENDING_SCHEMA = "law-firm-os.outlook-vault-source-pending.v1";
const PENDING_ENTRY_FIELDS = Object.freeze([
  "operation_id",
  "operation_kind",
  "created_at",
  "updated_at",
  "outlook_item_id_included",
  "graph_message_id_included",
  "attachment_id_included",
  "matter_id_included",
  "source_bytes_included",
  "mail_pii_included",
]);
const MAX_PENDING_OPERATIONS = 32;

function requiredText(value, field, maxLength = 2048) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > maxLength
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) throw new TypeError(`${field} is required and exact`);
  return value;
}

function exactSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function exactOperationId(value, field = "operation_id") {
  if (typeof value !== "string" || !OPERATION_ID.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function exactOperationKind(value, field = "operation_kind") {
  if (!OPERATION_KINDS.has(value)) throw new TypeError(`${field} is invalid`);
  return value;
}

function exactIso(value, field) {
  const text = requiredText(value, field, 64);
  if (Number.isNaN(Date.parse(text))) throw new TypeError(`${field} is invalid`);
  return text;
}

function safePendingEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.length !== PENDING_ENTRY_FIELDS.length
      || keys.some((key, index) => key !== [...PENDING_ENTRY_FIELDS].sort()[index])) return null;
  if (
    value.outlook_item_id_included !== false
    || value.graph_message_id_included !== false
    || value.attachment_id_included !== false
    || value.matter_id_included !== false
    || value.source_bytes_included !== false
    || value.mail_pii_included !== false
  ) return null;
  try {
    return Object.freeze({
      operation_id: exactOperationId(value.operation_id),
      operation_kind: exactOperationKind(value.operation_kind),
      created_at: exactIso(value.created_at, "created_at"),
      updated_at: exactIso(value.updated_at, "updated_at"),
      outlook_item_id_included: false,
      graph_message_id_included: false,
      attachment_id_included: false,
      matter_id_included: false,
      source_bytes_included: false,
      mail_pii_included: false,
    });
  } catch {
    return null;
  }
}

function parsePendingSnapshot(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 32_768) return [];
  try {
    const value = JSON.parse(raw);
    if (value?.schema !== PENDING_SCHEMA || !Array.isArray(value.entries)) return [];
    return value.entries.map(safePendingEntry).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Persist only opaque accepted-operation coordinates. Outlook/Graph IDs,
 * attachment IDs, Matter IDs, mail PII, source metadata and bytes are never
 * projected into either OfficeRuntime.storage or the guarded web fallback.
 */
export function createOutlookVaultSourcePendingStore({
  officeStorage = globalThis.OfficeRuntime?.storage,
  webStorage = (() => {
    try { return globalThis.localStorage ?? null; } catch { return null; }
  })(),
  key = OUTLOOK_VAULT_SOURCE_PENDING_STORAGE_KEY,
  now = Date.now,
} = {}) {
  let mutationTail = Promise.resolve();

  async function readSnapshots() {
    const snapshots = [];
    try { snapshots.push(parsePendingSnapshot(await officeStorage?.getItem?.(key))); } catch { /* optional */ }
    try { snapshots.push(parsePendingSnapshot(webStorage?.getItem?.(key))); } catch { /* optional */ }
    const merged = new Map();
    for (const entry of snapshots.flat()) {
      const previous = merged.get(entry.operation_id);
      if (!previous || entry.updated_at > previous.updated_at) merged.set(entry.operation_id, entry);
    }
    return [...merged.values()]
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .slice(-MAX_PENDING_OPERATIONS);
  }

  async function persist(entries) {
    const serialized = JSON.stringify(Object.freeze({
      schema: PENDING_SCHEMA,
      entries: Object.freeze(entries),
    }));
    let writes = 0;
    try {
      if (typeof officeStorage?.setItem === "function") {
        await officeStorage.setItem(key, serialized);
        writes += 1;
      }
    } catch { /* use guarded fallback */ }
    try {
      if (typeof webStorage?.setItem === "function") {
        webStorage.setItem(key, serialized);
        writes += 1;
      }
    } catch { /* optional */ }
    if (writes === 0) {
      const error = new Error("Vault source pending operation storage is unavailable");
      error.safe_error_code = "VAULT_SOURCE_PENDING_STORAGE_UNAVAILABLE";
      throw error;
    }
  }

  function enqueue(operation) {
    const run = mutationTail.then(operation, operation);
    mutationTail = run.catch(() => undefined);
    return run;
  }

  return Object.freeze({
    async list() {
      await mutationTail;
      return Object.freeze(await readSnapshots());
    },
    async remember({ operation_id: operationId, operation_kind: operationKind } = {}) {
      const checkedId = exactOperationId(operationId);
      const checkedKind = exactOperationKind(operationKind);
      return enqueue(async () => {
        const entries = await readSnapshots();
        const timestamp = new Date(now()).toISOString();
        const previous = entries.find((entry) => entry.operation_id === checkedId);
        const next = Object.freeze({
          operation_id: checkedId,
          operation_kind: checkedKind,
          created_at: previous?.created_at ?? timestamp,
          updated_at: timestamp,
          outlook_item_id_included: false,
          graph_message_id_included: false,
          attachment_id_included: false,
          matter_id_included: false,
          source_bytes_included: false,
          mail_pii_included: false,
        });
        const merged = entries.filter((entry) => entry.operation_id !== checkedId);
        merged.push(next);
        await persist(merged.slice(-MAX_PENDING_OPERATIONS));
        return next;
      });
    },
    async forget(operationId) {
      const checkedId = exactOperationId(operationId);
      return enqueue(async () => {
        const entries = await readSnapshots();
        const next = entries.filter((entry) => entry.operation_id !== checkedId);
        if (next.length === entries.length) return false;
        await persist(next);
        return true;
      });
    },
  });
}

function attachmentMetadata(value = {}) {
  const attachmentId = requiredText(
    value.attachment_id ?? value.id,
    "attachment_id",
  );
  const name = requiredText(value.name, "attachment.name", 255);
  const contentType = typeof value.content_type === "string"
    ? value.content_type.trim().toLowerCase()
    : typeof value.mime_type === "string"
      ? value.mime_type.trim().toLowerCase()
      : "application/octet-stream";
  if (!MIME_TYPE.test(contentType)) throw new TypeError("attachment.content_type is invalid");
  const size = Number(value.size ?? value.byte_size);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new TypeError("attachment.size is invalid");
  }
  return Object.freeze({
    attachment_id: attachmentId,
    name,
    content_type: contentType,
    size,
  });
}

/** Project only identity and metadata needed for server-side Graph resolution. */
export function projectOutlookVaultSourceEmail(email) {
  const identity = parseCapturedOutlookSourceIdentity(email);
  const canonicalGraphMessageId = requiredText(
    email?.canonical_graph_message_id,
    "canonical_graph_message_id",
  );
  const attachments = (Array.isArray(email?.attachments) ? email.attachments : [])
    .map(attachmentMetadata);
  const ids = attachments.map(({ attachment_id: attachmentId }) => attachmentId);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("Outlook attachment identity is duplicated");
  }
  return Object.freeze({
    canonical_graph_message_id: canonicalGraphMessageId,
    rest_message_id: identity.rest_message_id,
    internet_message_id: identity.internet_message_id,
    conversation_id: identity.conversation_id,
    item_key: outlookSourceItemKey(identity),
    subject: requiredText(email?.subject, "subject", 998),
    sent_at: typeof email?.sent_at === "string" ? email.sent_at : null,
    received_at: typeof email?.received_at === "string" ? email.received_at : null,
    attachments: Object.freeze(attachments),
  });
}

export function parseOutlookVaultExactVersion(value, field = "item") {
  const exact = Object.freeze({
    document_id: requiredText(value?.document_id, `${field}.document_id`, 256),
    version_id: requiredText(value?.version_id, `${field}.version_id`, 256),
    file_object_id: requiredText(value?.file_object_id, `${field}.file_object_id`, 256),
    sha256: exactSha256(value?.sha256, `${field}.sha256`),
    byte_size: value?.byte_size,
    mime_type: typeof value?.mime_type === "string" ? value.mime_type.toLowerCase() : "",
  });
  if (!Number.isSafeInteger(exact.byte_size) || exact.byte_size < 1 || !MIME_TYPE.test(exact.mime_type)) {
    throw new TypeError(`${field} integrity fields are invalid`);
  }
  return exact;
}

function sameExactVersion(left, right) {
  return [
    "document_id",
    "version_id",
    "file_object_id",
    "sha256",
    "byte_size",
    "mime_type",
  ].every((field) => left[field] === right[field]);
}

function parseOutlookVaultSourceProgress(response, {
  operationKind,
  matterId = null,
  operationId: expectedOperationId = null,
} = {}) {
  const item = response?.item;
  const receipt = item?.receipt;
  const operationId = exactOperationId(item?.operation_id, "item.operation_id");
  const receiptMatterId = requiredText(receipt?.matter_id, "item.receipt.matter_id", 256);
  const retryAfterMs = item?.retry_after_ms;
  if (
    response?.outcome !== "processing"
    || response?.ok !== true
    || response?.provider_authority_verified !== true
    || !SHA256.test(response?.source_binding_sha256 ?? "")
    || item?.operation_kind !== operationKind
    || (expectedOperationId !== null && operationId !== expectedOperationId)
    || !new Set(["quarantined", "scanning", "promoted"]).has(item?.stage)
    || receipt?.operation_id !== operationId
    || receipt?.operation_kind !== operationKind
    || receipt?.stage !== item.stage
    || (matterId !== null && receiptMatterId !== matterId)
    || item?.exact_readback_verified !== false
    || item?.raw_path_included !== false
    || item?.raw_bytes_included !== false
    || item?.mail_pii_included !== false
    || item?.token_material_returned !== false
    || response?.production_ready_claim !== false
    || !Number.isSafeInteger(retryAfterMs)
    || retryAfterMs < 250
    || retryAfterMs > 60_000
    || (new Set(["quarantined", "scanning"]).has(item.stage) && receipt?.exact_version !== null)
  ) {
    throw new TypeError("Outlook Vault source progress response is incomplete or mismatched");
  }
  return Object.freeze({
    operationId,
    operationKind,
    matterId: receiptMatterId,
    retryAfterMs,
    sourceBindingSha256: response.source_binding_sha256,
  });
}

function waitFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function resolveOutlookVaultSourceSave({
  response,
  operationKind,
  matterId,
  requestJson,
  assertOperationCurrent,
  pendingStore = null,
  wait = waitFor,
  maxStatusChecks = 12,
}) {
  let current = response;
  const initialMetadata = Object.freeze({
    source_binding_sha256: response?.source_binding_sha256,
    filing_operation: response?.filing_operation,
    selected_attachment_id: response?.selected_attachment_id,
  });
  const withInitialMetadata = (value) => Object.freeze({
    ...value,
    ...(value?.source_binding_sha256 == null && initialMetadata.source_binding_sha256 != null
      ? { source_binding_sha256: initialMetadata.source_binding_sha256 }
      : {}),
    ...(value?.filing_operation == null && initialMetadata.filing_operation != null
      ? { filing_operation: initialMetadata.filing_operation }
      : {}),
    ...(value?.selected_attachment_id == null && initialMetadata.selected_attachment_id != null
      ? { selected_attachment_id: initialMetadata.selected_attachment_id }
      : {}),
  });
  for (let statusChecks = 0; current?.outcome === "processing"; statusChecks += 1) {
    const progress = parseOutlookVaultSourceProgress(current, { operationKind, matterId });
    await pendingStore?.remember?.({
      operation_id: progress.operationId,
      operation_kind: operationKind,
    });
    if (statusChecks >= maxStatusChecks) return withInitialMetadata(current);
    assertOperationCurrent();
    await wait(Math.min(progress.retryAfterMs, 5_000));
    assertOperationCurrent();
    current = await requestJson(OUTLOOK_VAULT_SOURCE_STATUS_PATH, {
      method: "POST",
      body: Object.freeze({ operation_id: progress.operationId }),
    });
  }
  return withInitialMetadata(current);
}

export function parseOutlookVaultSourceSaveResponse(response, {
  operationKind,
  matterId,
  itemKey,
  filingMode = null,
  selectedAttachmentId = null,
  operationId: expectedOperationId = null,
} = {}) {
  const outcome = response?.outcome;
  const item = response?.item;
  const operationId = exactOperationId(item?.operation_id, "item.operation_id");
  const exact = parseOutlookVaultExactVersion(item);
  const receiptExact = parseOutlookVaultExactVersion(item?.receipt?.exact_version, "item.receipt.exact_version");
  if (
    !["readback_verified", "idempotent_replay"].includes(outcome)
    || response?.ok !== true
    || !requiredText(response?.request_id, "request_id")
    || response?.provider_authority_verified !== true
    || !SHA256.test(response?.source_binding_sha256 ?? "")
    || item?.operation_kind !== operationKind
    || (expectedOperationId !== null && operationId !== expectedOperationId)
    || item?.exact_readback_verified !== true
    || item?.receipt?.operation_kind !== operationKind
    || item?.receipt?.stage !== "readback_verified"
    || item?.receipt?.matter_id !== matterId
    || item?.raw_path_included !== false
    || item?.raw_bytes_included !== false
    || item?.mail_pii_included !== false
    || item?.token_material_returned !== false
    || response?.production_ready_claim !== false
    || !sameExactVersion(exact, receiptExact)
    || (filingMode !== null && response?.filing_operation !== filingMode)
    || (selectedAttachmentId !== null
      && response?.selected_attachment_id !== selectedAttachmentId)
  ) {
    throw new TypeError("Outlook Vault source save response is incomplete or mismatched");
  }
  return Object.freeze({
    request_id: response.request_id,
    outcome,
    idempotent_replay: outcome === "idempotent_replay" || response.idempotent_replay === true,
    operation_id: operationId,
    operation_kind: operationKind,
    matter_id: matterId,
    item_key: itemKey,
    source_binding_sha256: response.source_binding_sha256,
    selected_attachment_id: selectedAttachmentId,
    exact_version: exact,
    receipt: item.receipt,
  });
}

function pendingOutlookVaultSourceReceipt(response, {
  operationKind,
  matterId = null,
  itemKey = null,
  selectedAttachmentId = null,
} = {}) {
  const progress = parseOutlookVaultSourceProgress(response, { operationKind, matterId });
  return Object.freeze({
    status: "processing",
    outcome: "processing",
    operation_id: progress.operationId,
    operation_kind: progress.operationKind,
    matter_id: progress.matterId,
    item_key: itemKey,
    source_binding_sha256: progress.sourceBindingSha256,
    selected_attachment_id: selectedAttachmentId,
    retry_after_ms: progress.retryAfterMs,
    exact_version: null,
    receipt: response.item.receipt,
    raw_path_included: false,
    raw_bytes_included: false,
    mail_pii_included: false,
    token_material_returned: false,
  });
}

async function forgetPendingBestEffort(pendingStore, operationId) {
  try { await pendingStore?.forget?.(operationId); } catch { /* stale opaque IDs are safe to replay */ }
}

export async function saveOutlookEmailSourceToVault({
  matterId,
  email,
  mode = "manual",
  requestJson,
  assertOperationCurrent = () => {},
  onReceipt = () => {},
  pendingStore = null,
  wait,
  maxStatusChecks,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  if (typeof assertOperationCurrent !== "function" || typeof onReceipt !== "function") {
    throw new TypeError("operation callbacks are required");
  }
  const nextMatterId = requiredText(matterId, "matter_id", 256);
  if (!new Set(["manual", "sent"]).has(mode)) throw new TypeError("mode must be manual or sent");
  const projected = projectOutlookVaultSourceEmail(email);
  const itemKey = outlookSourceItemKey(projected);
  assertOperationCurrent();
  let response = await requestJson(
    mode === "sent" ? OUTLOOK_VAULT_SENT_SAVE_PATH : OUTLOOK_VAULT_EMAIL_SAVE_PATH,
    {
      method: "POST",
      body: Object.freeze({
        matter_id: nextMatterId,
        email: projected,
      }),
    },
  );
  response = await resolveOutlookVaultSourceSave({
    response,
    operationKind: "save_email",
    matterId: nextMatterId,
    requestJson,
    assertOperationCurrent,
    pendingStore,
    wait,
    maxStatusChecks,
  });
  assertOperationCurrent();
  if (response?.outcome === "processing") {
    return pendingOutlookVaultSourceReceipt(response, {
      operationKind: "save_email",
      matterId: nextMatterId,
      itemKey,
    });
  }
  const receipt = parseOutlookVaultSourceSaveResponse(response, {
    operationKind: "save_email",
    matterId: nextMatterId,
    itemKey,
    filingMode: mode,
  });
  await forgetPendingBestEffort(pendingStore, receipt.operation_id);
  onReceipt(response);
  return receipt;
}

export async function saveOutlookAttachmentSourcesToVault({
  matterId,
  email,
  attachmentIds = null,
  filingMode = "manual",
  requestJson,
  assertOperationCurrent = () => {},
  onReceipt = () => {},
  pendingStore = null,
  wait,
  maxStatusChecks,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  if (typeof assertOperationCurrent !== "function" || typeof onReceipt !== "function") {
    throw new TypeError("operation callbacks are required");
  }
  const nextMatterId = requiredText(matterId, "matter_id", 256);
  const projected = projectOutlookVaultSourceEmail(email);
  const itemKey = outlookSourceItemKey(projected);
  const available = new Map(projected.attachments.map((attachment) => (
    [attachment.attachment_id, attachment]
  )));
  const selected = attachmentIds === null
    ? [...available.keys()]
    : attachmentIds.map((value) => requiredText(value, "attachment_id"));
  if (new Set(selected).size !== selected.length
      || selected.some((attachmentId) => !available.has(attachmentId))) {
    throw new TypeError("selected Outlook attachment identity is invalid");
  }
  if (!new Set(["manual", "sent"]).has(filingMode)) {
    throw new TypeError("filingMode must be manual or sent");
  }
  const receipts = [];
  const pending = [];
  const failed = [];
  for (const attachmentId of selected) {
    assertOperationCurrent();
    let response;
    try {
      response = await requestJson(OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH, {
        method: "POST",
        body: Object.freeze({
          matter_id: nextMatterId,
          filing_mode: filingMode,
          email: projected,
          selected_attachment_ids: Object.freeze([attachmentId]),
        }),
      });
      response = await resolveOutlookVaultSourceSave({
        response,
        operationKind: "save_email_attachment",
        matterId: nextMatterId,
        requestJson,
        assertOperationCurrent,
        pendingStore,
        wait,
        maxStatusChecks,
      });
    } catch (error) {
      failed.push(Object.freeze({
        attachment_id: attachmentId,
        name: available.get(attachmentId).name,
        safe_error_code: error?.safe_error_code ?? null,
        error,
      }));
      continue;
    }
    assertOperationCurrent();
    if (response?.outcome === "processing") {
      pending.push(pendingOutlookVaultSourceReceipt(response, {
        operationKind: "save_email_attachment",
        matterId: nextMatterId,
        itemKey,
        selectedAttachmentId: attachmentId,
      }));
      continue;
    }
    const receipt = parseOutlookVaultSourceSaveResponse(response, {
      operationKind: "save_email_attachment",
      matterId: nextMatterId,
      itemKey,
      selectedAttachmentId: attachmentId,
    });
    await forgetPendingBestEffort(pendingStore, receipt.operation_id);
    onReceipt(response);
    receipts.push(receipt);
  }
  const status = failed.length > 0
    ? "partial"
    : pending.length > 0 ? "processing" : "complete";
  return Object.freeze({
    status,
    outcome: status === "complete" ? "readback_verified" : status,
    matter_id: nextMatterId,
    item_key: itemKey,
    receipts: Object.freeze(receipts),
    pending_operations: Object.freeze(pending),
    failed: Object.freeze(failed),
    retry_attachment_ids: Object.freeze(failed.map(({ attachment_id: id }) => id)),
    request_count: selected.length,
  });
}

export async function saveOutlookEmailWithAttachmentsToVault(options = {}) {
  const email = await saveOutlookEmailSourceToVault(options);
  if (email.outcome === "processing") {
    return Object.freeze({
      status: "processing",
      outcome: "processing",
      matter_id: email.matter_id,
      item_key: email.item_key,
      email,
      attachments: Object.freeze({
        status: "deferred",
        outcome: "deferred",
        matter_id: email.matter_id,
        item_key: email.item_key,
        receipts: Object.freeze([]),
        pending_operations: Object.freeze([]),
        failed: Object.freeze([]),
        retry_attachment_ids: Object.freeze([]),
        request_count: 0,
      }),
      retry_attachment_ids: Object.freeze([]),
      idempotent_replay: false,
    });
  }
  const attachments = await saveOutlookAttachmentSourcesToVault({
    ...options,
    filingMode: options.mode ?? "manual",
  });
  return Object.freeze({
    status: attachments.status,
    outcome: attachments.status === "complete" ? email.outcome : attachments.outcome,
    matter_id: email.matter_id,
    item_key: email.item_key,
    email,
    attachments,
    retry_attachment_ids: attachments.retry_attachment_ids,
    idempotent_replay: attachments.status === "complete"
      && email.idempotent_replay
      && attachments.receipts.every((receipt) => receipt.idempotent_replay),
  });
}

/** Resume only server-accepted source operations; no Outlook item is read. */
export async function resumePendingOutlookVaultSourceSaves({
  pendingStore,
  requestJson,
  assertOperationCurrent = () => {},
  wait = waitFor,
  maxStatusChecks = 12,
} = {}) {
  if (typeof pendingStore?.list !== "function" || typeof requestJson !== "function") {
    throw new TypeError("pendingStore and requestJson are required");
  }
  if (typeof assertOperationCurrent !== "function") {
    throw new TypeError("assertOperationCurrent is required");
  }
  const entries = await pendingStore.list();
  const receipts = [];
  const pending = [];
  const failed = [];
  for (const entry of entries) {
    let current = null;
    try {
      for (let statusChecks = 0; statusChecks < maxStatusChecks; statusChecks += 1) {
        assertOperationCurrent();
        current = await requestJson(OUTLOOK_VAULT_SOURCE_STATUS_PATH, {
          method: "POST",
          body: Object.freeze({ operation_id: entry.operation_id }),
        });
        assertOperationCurrent();
        if (current?.outcome !== "processing") break;
        const progress = parseOutlookVaultSourceProgress(current, {
          operationKind: entry.operation_kind,
          operationId: entry.operation_id,
        });
        if (statusChecks + 1 < maxStatusChecks) {
          await wait(Math.min(progress.retryAfterMs, 5_000));
        }
      }
      if (current?.outcome === "processing") {
        pending.push(pendingOutlookVaultSourceReceipt(current, {
          operationKind: entry.operation_kind,
        }));
        continue;
      }
      const matterId = requiredText(
        current?.item?.receipt?.matter_id,
        "item.receipt.matter_id",
        256,
      );
      const receipt = parseOutlookVaultSourceSaveResponse(current, {
        operationKind: entry.operation_kind,
        operationId: entry.operation_id,
        matterId,
        itemKey: null,
      });
      await forgetPendingBestEffort(pendingStore, entry.operation_id);
      receipts.push(receipt);
    } catch (error) {
      failed.push(Object.freeze({
        operation_id: entry.operation_id,
        operation_kind: entry.operation_kind,
        safe_error_code: error?.safe_error_code ?? "VAULT_SOURCE_RESUME_FAILED",
        error,
      }));
    }
  }
  const status = pending.length > 0
    ? "processing"
    : failed.length > 0 ? "partial" : receipts.length > 0 ? "complete" : "idle";
  return Object.freeze({
    status,
    outcome: status === "complete" ? "readback_verified" : status,
    receipts: Object.freeze(receipts),
    pending_operations: Object.freeze(pending),
    failed: Object.freeze(failed),
    retry_attachment_ids: Object.freeze([]),
    request_count: entries.length,
    status_only: true,
    outlook_item_read: false,
    graph_source_read: false,
    source_bytes_resent: false,
  });
}
