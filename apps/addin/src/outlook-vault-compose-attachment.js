import { parseOutlookVaultExactVersion } from "./outlook-vault-source-actions.js";

export const OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH =
  "/api/outlook/vault/attachments/authorize";
export const OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH =
  "/api/outlook/vault/attachments/complete";
const OUTLOOK_VAULT_ATTACHMENT_COMPLETE_TIMEOUT_MS = 110_000;

const SHA256 = /^[a-f0-9]{64}$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const PENDING_SCHEMA = "law-firm-os.outlook-vault-attachment-pending.v1";

function requiredText(value, field, maxLength = 512) {
  if (typeof value !== "string"
      || !value
      || value !== value.trim()
      || value.length > maxLength
      || /[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
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

function operationError(code, message, cause = null) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), {
    safe_error_code: code,
  });
}

function asyncSucceeded(Office, result) {
  const succeeded = Office?.AsyncResultStatus?.Succeeded ?? "succeeded";
  return result?.status === succeeded
    || String(result?.status ?? "").toLowerCase()
      === String(succeeded).toLowerCase();
}

function officeCallback(Office, invoke, errorCode, errorMessage) {
  return new Promise((resolve, reject) => {
    try {
      invoke((result) => {
        if (!asyncSucceeded(Office, result)) {
          reject(operationError(errorCode, errorMessage));
          return;
        }
        resolve(result?.value);
      });
    } catch (error) {
      reject(operationError(errorCode, errorMessage, error));
    }
  });
}

function composeItem(Office) {
  const item = Office?.context?.mailbox?.item;
  if (!item || typeof item.saveAsync !== "function"
      || typeof item.addFileAttachmentAsync !== "function"
      || typeof item.getAttachmentsAsync !== "function") {
    throw operationError(
      "OUTLOOK_VAULT_COMPOSE_UNAVAILABLE",
      "현재 Outlook 작성창에서는 Vault 첨부를 사용할 수 없습니다.",
    );
  }
  return item;
}

async function saveComposeTarget({ Office, item }) {
  const value = await officeCallback(
    Office,
    (callback) => item.saveAsync(callback),
    "OUTLOOK_VAULT_COMPOSE_SAVE_FAILED",
    "작성 중인 메일을 저장하지 못해 Vault 문서를 첨부하지 않았습니다.",
  );
  const officeItemId = requiredText(
    value ?? item.itemId,
    "compose_target_ref",
    512,
  );
  const mailbox = Office?.context?.mailbox;
  if (typeof mailbox?.convertToRestId !== "function") {
    throw operationError(
      "OUTLOOK_VAULT_COMPOSE_ID_CONVERSION_UNAVAILABLE",
      "저장된 Outlook 초안을 확인할 수 없어 Vault 문서를 첨부하지 않았습니다.",
    );
  }
  try {
    return requiredText(
      mailbox.convertToRestId(
        officeItemId,
        Office?.MailboxEnums?.RestVersion?.v2_0 ?? "v2.0",
      ),
      "compose_target_ref",
      512,
    );
  } catch (error) {
    throw operationError(
      "OUTLOOK_VAULT_COMPOSE_ID_CONVERSION_FAILED",
      "저장된 Outlook 초안을 확인할 수 없어 Vault 문서를 첨부하지 않았습니다.",
      error,
    );
  }
}

function requestNonceSha256(cryptoImpl) {
  const random = new Uint8Array(32);
  if (!cryptoImpl || typeof cryptoImpl.getRandomValues !== "function") {
    throw operationError(
      "OUTLOOK_VAULT_RANDOM_SOURCE_UNAVAILABLE",
      "Vault 첨부 요청을 안전하게 만들 수 없습니다.",
    );
  }
  cryptoImpl.getRandomValues(random);
  return [...random].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function parseOutlookVaultAttachmentAuthorization(response, {
  matterId,
  exactVersion,
} = {}) {
  const exact = parseOutlookVaultExactVersion(
    response?.exact_version,
    "exact_version",
  );
  const receiptExact = parseOutlookVaultExactVersion(
    response?.receipt?.exact_version,
    "receipt.exact_version",
  );
  let deliveryUrl;
  try {
    deliveryUrl = new URL(requiredText(response?.delivery_uri, "delivery_uri", 2_048));
  } catch {
    throw new TypeError("delivery_uri is invalid");
  }
  if (deliveryUrl.protocol !== "https:"
      || response?.outcome !== "attachment_delivery_authorized"
      || response?.ok !== true
      || !OPERATION_ID.test(response?.operation_id ?? "")
      || response?.receipt?.operation_kind !== "attach_outlook"
      || response?.receipt?.stage !== "authorized"
      || response?.receipt?.matter_id !== matterId
      || response?.provider_authority_verified !== true
      || response?.provider_grant_returned !== false
      || response?.raw_bytes_included !== false
      || response?.storage_locator_returned !== false
      || response?.production_ready_claim !== false
      || !sameExactVersion(exact, exactVersion)
      || !sameExactVersion(receiptExact, exactVersion)) {
    throw new TypeError("Outlook Vault attachment authorization is incomplete or mismatched");
  }
  return Object.freeze({
    operation_id: response.operation_id,
    attachment_name: requiredText(response.attachment_name, "attachment_name", 240),
    delivery_uri: deliveryUrl.toString(),
    expires_at: requiredText(response.expires_at, "expires_at", 32),
    exact_version: exact,
    receipt: response.receipt,
  });
}

export function parseOutlookVaultAttachmentCompletion(response, {
  operationId,
  exactVersion,
} = {}) {
  const exact = parseOutlookVaultExactVersion(
    response?.exact_version,
    "exact_version",
  );
  const receiptExact = parseOutlookVaultExactVersion(
    response?.receipt?.exact_version,
    "receipt.exact_version",
  );
  if (response?.outcome !== "attachment_verified"
      || response?.ok !== true
      || response?.operation_id !== operationId
      || response?.operation_kind !== "attach_outlook"
      || response?.receipt?.operation_kind !== "attach_outlook"
      || response?.receipt?.stage !== "attached"
      || !SHA256.test(response?.attachment_ack_sha256 ?? "")
      || response?.graph_host_verified !== true
      || response?.client_ack_authoritative !== false
      || response?.host_verification_authority !== "microsoft-graph-draft-mime"
      || response?.attachment_id_returned !== false
      || response?.attachment_name_returned !== false
      || response?.provider_grant_returned !== false
      || response?.raw_bytes_included !== false
      || response?.storage_locator_returned !== false
      || response?.production_ready_claim !== false
      || !sameExactVersion(exact, exactVersion)
      || !sameExactVersion(receiptExact, exactVersion)) {
    throw new TypeError("Outlook Vault attachment completion is incomplete or mismatched");
  }
  return Object.freeze({
    operation_id: response.operation_id,
    outcome: response.outcome,
    exact_version: exact,
    attachment_ack_sha256: response.attachment_ack_sha256,
    graph_host_verified: true,
    client_ack_authoritative: false,
    host_verification_authority: response.host_verification_authority,
    receipt: response.receipt,
  });
}

async function addAuthorizedAttachment({ Office, item, authorization }) {
  const value = await officeCallback(
    Office,
    (callback) => item.addFileAttachmentAsync(
      authorization.delivery_uri,
      authorization.attachment_name,
      Object.freeze({ isInline: false }),
      callback,
    ),
    "OUTLOOK_VAULT_ATTACHMENT_HOST_ADD_FAILED",
    "Outlook이 Vault 문서를 첨부하지 못했습니다.",
  );
  return requiredText(value, "attachment_id", 512);
}

async function readAttachments({ Office, item }) {
  const value = await officeCallback(
    Office,
    (callback) => item.getAttachmentsAsync(callback),
    "OUTLOOK_VAULT_ATTACHMENT_HOST_VERIFY_FAILED",
    "Outlook 첨부 결과를 확인하지 못했습니다.",
  );
  if (!Array.isArray(value)) {
    throw operationError(
      "OUTLOOK_VAULT_ATTACHMENT_HOST_VERIFY_FAILED",
      "Outlook 첨부 결과를 확인하지 못했습니다.",
    );
  }
  return value;
}

function verifyHostAttachment({ attachments, pending }) {
  const match = attachments.find((attachment) => (
    String(attachment?.id ?? attachment?.attachmentId ?? "")
      === pending.attachment_id
  ));
  const name = typeof match?.name === "string" ? match.name.normalize("NFC") : "";
  const size = Number(match?.size);
  if (!match
      || name !== pending.attachment_name
      || !Number.isSafeInteger(size)
      || size !== pending.exact_version.byte_size) {
    throw operationError(
      "OUTLOOK_VAULT_ATTACHMENT_HOST_METADATA_MISMATCH",
      "Outlook 첨부 결과가 선택한 Vault 버전과 일치하지 않습니다.",
    );
  }
  return Object.freeze({
    attachment_id: pending.attachment_id,
    attachment_name: name,
    attachment_size: size,
  });
}

function pendingState({ authorization, composeTargetRef, attachmentId, attachmentAck = null }) {
  return Object.freeze({
    schema_version: PENDING_SCHEMA,
    stage: attachmentAck ? "completion_required" : "host_verification_required",
    operation_id: authorization.operation_id,
    compose_target_ref: composeTargetRef,
    attachment_id: attachmentId,
    attachment_name: authorization.attachment_name,
    exact_version: authorization.exact_version,
    attachment_ack: attachmentAck,
    memory_only: true,
    persistent_storage_allowed: false,
    add_attachment_must_not_repeat: true,
  });
}

function validatePending(value) {
  if (value?.schema_version !== PENDING_SCHEMA
      || !OPERATION_ID.test(value?.operation_id ?? "")
      || value?.memory_only !== true
      || value?.persistent_storage_allowed !== false
      || value?.add_attachment_must_not_repeat !== true) {
    throw new TypeError("Outlook Vault pending completion is invalid");
  }
  return value;
}

function pendingFailure(error, pending) {
  return Object.assign(
    operationError(
      error?.safe_error_code ?? "OUTLOOK_VAULT_ATTACHMENT_RECEIPT_PENDING",
      error?.message ?? "Outlook 첨부 완료 확인이 남아 있습니다.",
      error,
    ),
    {
      receipt_pending: true,
      operation_id: pending.operation_id,
      add_attachment_must_not_repeat: true,
    },
  );
}

async function completePending({
  pending,
  Office,
  item,
  requestJson,
  assertOperationCurrent,
}) {
  let next = validatePending(pending);
  if (!next.attachment_ack) {
    const attachments = await readAttachments({ Office, item });
    const attachmentAck = verifyHostAttachment({ attachments, pending: next });
    next = pendingState({
      authorization: {
        operation_id: next.operation_id,
        attachment_name: next.attachment_name,
        exact_version: next.exact_version,
      },
      composeTargetRef: next.compose_target_ref,
      attachmentId: next.attachment_id,
      attachmentAck,
    });
  }
  assertOperationCurrent();
  const response = await requestJson(OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH, {
    method: "POST",
    timeoutMs: OUTLOOK_VAULT_ATTACHMENT_COMPLETE_TIMEOUT_MS,
    headers: Object.freeze({ "idempotency-key": next.operation_id }),
    body: Object.freeze({
      operation_id: next.operation_id,
      exact_version: next.exact_version,
      compose_target_ref: next.compose_target_ref,
      attachment_ack: next.attachment_ack,
    }),
  });
  assertOperationCurrent();
  return Object.freeze({
    completion: parseOutlookVaultAttachmentCompletion(response, {
      operationId: next.operation_id,
      exactVersion: next.exact_version,
    }),
    response,
    pending: next,
  });
}

export async function retryOutlookVaultAttachmentCompletion({
  pending,
  requestJson,
  Office = globalThis.Office,
  assertOperationCurrent = () => {},
  onReceipt = () => {},
  onPendingCompletion = () => {},
} = {}) {
  if (typeof requestJson !== "function"
      || typeof assertOperationCurrent !== "function"
      || typeof onReceipt !== "function"
      || typeof onPendingCompletion !== "function") {
    throw new TypeError("Outlook Vault completion callbacks are required");
  }
  const item = composeItem(Office);
  try {
    const result = await completePending({
      pending,
      Office,
      item,
      requestJson,
      assertOperationCurrent,
    });
    onReceipt(result.response);
    return result.completion;
  } catch (error) {
    const safePending = validatePending(pending);
    onPendingCompletion(safePending);
    throw pendingFailure(error, safePending);
  }
}

/**
 * Runs only after the user has explicitly picked one exact Vault version.
 * Picker cancellation belongs to the caller and must call none of this module.
 */
export async function attachExactVaultVersionToOutlookCompose({
  matterId,
  exactVersion,
  requestJson,
  Office = globalThis.Office,
  cryptoImpl = globalThis.crypto,
  assertOperationCurrent = () => {},
  onReceipt = () => {},
  onPendingCompletion = () => {},
} = {}) {
  if (typeof requestJson !== "function"
      || typeof assertOperationCurrent !== "function"
      || typeof onReceipt !== "function"
      || typeof onPendingCompletion !== "function") {
    throw new TypeError("Outlook Vault attachment callbacks are required");
  }
  const canonicalMatterId = requiredText(matterId, "matter_id", 256);
  const canonicalExactVersion = parseOutlookVaultExactVersion(
    exactVersion,
    "exact_version",
  );
  const item = composeItem(Office);
  assertOperationCurrent();
  const composeTargetRef = await saveComposeTarget({ Office, item });
  assertOperationCurrent();
  const nonce = requestNonceSha256(cryptoImpl);
  const response = await requestJson(OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH, {
    method: "POST",
    headers: Object.freeze({ "idempotency-key": `outlook-vault-attach:${nonce}` }),
    body: Object.freeze({
      matter_id: canonicalMatterId,
      exact_version: canonicalExactVersion,
      request_nonce_sha256: nonce,
      compose_target_ref: composeTargetRef,
    }),
  });
  assertOperationCurrent();
  const authorization = parseOutlookVaultAttachmentAuthorization(response, {
    matterId: canonicalMatterId,
    exactVersion: canonicalExactVersion,
  });
  const attachmentId = await addAuthorizedAttachment({
    Office,
    item,
    authorization,
  });
  let pending = pendingState({
    authorization,
    composeTargetRef,
    attachmentId,
  });
  try {
    assertOperationCurrent();
    const result = await completePending({
      pending,
      Office,
      item,
      requestJson,
      assertOperationCurrent,
    });
    pending = result.pending;
    onReceipt(result.response);
    return result.completion;
  } catch (error) {
    onPendingCompletion(pending);
    throw pendingFailure(error, pending);
  }
}
