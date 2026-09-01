import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH,
  OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH,
  attachExactVaultVersionToOutlookCompose,
  parseOutlookVaultAttachmentAuthorization,
  retryOutlookVaultAttachmentCompletion,
} from "../src/outlook-vault-compose-attachment.js";

const MATTER = "matter_outlook_vault_compose";
const OPERATION_ID = `vaultop_${"a".repeat(32)}`;
const EXACT = Object.freeze({
  document_id: "document_outlook_vault_compose",
  version_id: "version_outlook_vault_compose_4",
  file_object_id: "file_outlook_vault_compose_4",
  sha256: "b".repeat(64),
  byte_size: 37,
  mime_type: "application/pdf",
});

function authorizationResponse(overrides = {}) {
  return {
    request_id: "request-outlook-vault-compose-authorize",
    outcome: "attachment_delivery_authorized",
    ok: true,
    operation_id: OPERATION_ID,
    attachment_name: "compose-exact.pdf",
    exact_version: EXACT,
    delivery_uri: "https://lawos-api.example.test/api/outlook/vault/attachments/delivery/lawos_ovd_v1.opaque.ciphertext.tag",
    expires_at: "2026-08-29T02:00:30.000Z",
    receipt: {
      operation_kind: "attach_outlook",
      stage: "authorized",
      matter_id: MATTER,
      exact_version: EXACT,
    },
    lawos_delivery_channel: true,
    provider_authority_verified: true,
    provider_grant_returned: false,
    raw_bytes_included: false,
    storage_locator_returned: false,
    production_ready_claim: false,
    ...overrides,
  };
}

function completionResponse(overrides = {}) {
  return {
    request_id: "request-outlook-vault-compose-complete",
    outcome: "attachment_verified",
    ok: true,
    operation_id: OPERATION_ID,
    operation_kind: "attach_outlook",
    exact_version: EXACT,
    receipt: {
      operation_kind: "attach_outlook",
      stage: "attached",
      matter_id: MATTER,
      exact_version: EXACT,
    },
    attachment_ack_sha256: "c".repeat(64),
    graph_host_verified: true,
    client_ack_authoritative: false,
    host_verification_authority: "microsoft-graph-draft-mime",
    attachment_id_returned: false,
    attachment_name_returned: false,
    provider_grant_returned: false,
    raw_bytes_included: false,
    storage_locator_returned: false,
    production_ready_claim: false,
    ...overrides,
  };
}

function fakeOffice({ addSucceeds = true, attachmentSize = EXACT.byte_size } = {}) {
  const calls = [];
  const attachments = [];
  const item = {
    itemId: "office-compose-draft-001",
    saveAsync(callback) {
      calls.push({ method: "saveAsync" });
      callback({ status: "succeeded", value: "office-compose-draft-001" });
    },
    addFileAttachmentAsync(uri, name, options, callback) {
      calls.push({ method: "addFileAttachmentAsync", uri, name, options });
      if (!addSucceeds) {
        callback({ status: "failed", error: { code: 5001 } });
        return;
      }
      attachments.push({
        id: "office-vault-attachment-001",
        name,
        size: attachmentSize,
      });
      callback({ status: "succeeded", value: "office-vault-attachment-001" });
    },
    getAttachmentsAsync(callback) {
      calls.push({ method: "getAttachmentsAsync" });
      callback({ status: "succeeded", value: structuredClone(attachments) });
    },
  };
  return {
    Office: {
      AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" } },
      context: {
        mailbox: {
          item,
          convertToRestId(value, version) {
            assert.equal(version, "v2.0");
            return value.replace("office-", "rest-");
          },
        },
      },
    },
    calls,
    attachments,
  };
}

const cryptoImpl = Object.freeze({
  getRandomValues(value) {
    value.fill(7);
    return value;
  },
});

test("explicit compose action saves the draft, authorizes one URI, adds one exact attachment, verifies host metadata, then completes", async () => {
  const host = fakeOffice();
  const requests = [];
  const receipts = [];
  let assertions = 0;
  const completion = await attachExactVaultVersionToOutlookCompose({
    matterId: MATTER,
    exactVersion: EXACT,
    Office: host.Office,
    cryptoImpl,
    assertOperationCurrent() { assertions += 1; },
    onReceipt(value) { receipts.push(value); },
    requestJson: async (path, options) => {
      requests.push({ path, options });
      return path === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH
        ? authorizationResponse()
        : completionResponse();
    },
  });

  assert.equal(completion.outcome, "attachment_verified");
  assert.equal(completion.receipt.stage, "attached");
  assert.deepEqual(host.calls.map(({ method }) => method), [
    "saveAsync",
    "addFileAttachmentAsync",
    "getAttachmentsAsync",
  ]);
  assert.deepEqual(requests.map(({ path }) => path), [
    OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH,
    OUTLOOK_VAULT_ATTACHMENT_COMPLETE_PATH,
  ]);
  assert.equal(requests[0].options.body.compose_target_ref, "rest-compose-draft-001");
  assert.equal(requests[0].options.body.request_nonce_sha256, "07".repeat(32));
  assert.equal(requests[0].options.timeoutMs, undefined);
  assert.equal(requests[1].options.headers["idempotency-key"], OPERATION_ID);
  assert.equal(requests[1].options.timeoutMs, 110_000);
  assert.deepEqual(requests[1].options.body.attachment_ack, {
    attachment_id: "office-vault-attachment-001",
    attachment_name: "compose-exact.pdf",
    attachment_size: EXACT.byte_size,
  });
  assert.equal(host.calls[1].options.isInline, false);
  assert.equal(assertions, 6);
  assert.equal(receipts.length, 1);
  for (const request of requests) {
    const serialized = JSON.stringify(request.options.body);
    assert.equal(serialized.includes("base64"), false);
    assert.equal(serialized.includes("document_bytes"), false);
    assert.equal(serialized.includes("provider_export_ref"), false);
  }
});

test("completion failure produces a memory-only pending receipt and retry never adds the attachment twice", async () => {
  const host = fakeOffice();
  const requests = [];
  const pendingStates = [];
  let completionAttempts = 0;
  const requestJson = async (path, options) => {
    requests.push({ path, options });
    if (path === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH) {
      return authorizationResponse();
    }
    completionAttempts += 1;
    if (completionAttempts === 1) {
      throw Object.assign(new Error("temporary completion outage"), {
        safe_error_code: "OUTLOOK_VAULT_ATTACHMENT_COMPLETION_UNAVAILABLE",
      });
    }
    return completionResponse();
  };

  await assert.rejects(
    attachExactVaultVersionToOutlookCompose({
      matterId: MATTER,
      exactVersion: EXACT,
      Office: host.Office,
      cryptoImpl,
      requestJson,
      onPendingCompletion(value) { pendingStates.push(value); },
    }),
    (error) => error.receipt_pending === true
      && error.operation_id === OPERATION_ID
      && error.add_attachment_must_not_repeat === true,
  );
  assert.equal(pendingStates.length, 1);
  assert.equal(pendingStates[0].memory_only, true);
  assert.equal(pendingStates[0].persistent_storage_allowed, false);
  assert.equal(pendingStates[0].attachment_id, "office-vault-attachment-001");

  const replay = await retryOutlookVaultAttachmentCompletion({
    pending: pendingStates[0],
    Office: host.Office,
    requestJson,
  });
  assert.equal(replay.outcome, "attachment_verified");
  assert.equal(
    host.calls.filter(({ method }) => method === "addFileAttachmentAsync").length,
    1,
  );
  assert.equal(
    host.calls.filter(({ method }) => method === "getAttachmentsAsync").length,
    2,
  );
  assert.equal(
    requests.filter(({ path }) => path === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH).length,
    1,
  );
  assert.equal(completionAttempts, 2);
});

test("host metadata mismatch remains receipt-pending and can be reconciled without a second Vault download", async () => {
  const host = fakeOffice({ attachmentSize: EXACT.byte_size - 1 });
  const pendingStates = [];
  let completionRequests = 0;
  const requestJson = async (path) => {
    if (path === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH) {
      return authorizationResponse();
    }
    completionRequests += 1;
    return completionResponse();
  };
  await assert.rejects(
    attachExactVaultVersionToOutlookCompose({
      matterId: MATTER,
      exactVersion: EXACT,
      Office: host.Office,
      cryptoImpl,
      requestJson,
      onPendingCompletion(value) { pendingStates.push(value); },
    }),
    (error) => error.safe_error_code
      === "OUTLOOK_VAULT_ATTACHMENT_HOST_METADATA_MISMATCH"
      && error.receipt_pending === true,
  );
  assert.equal(completionRequests, 0);
  host.attachments[0].size = EXACT.byte_size;
  const replay = await retryOutlookVaultAttachmentCompletion({
    pending: pendingStates[0],
    Office: host.Office,
    requestJson,
  });
  assert.equal(replay.receipt.stage, "attached");
  assert.equal(completionRequests, 1);
  assert.equal(
    host.calls.filter(({ method }) => method === "addFileAttachmentAsync").length,
    1,
  );
});

test("failed Office add never posts completion and does not claim a receipt-pending attachment", async () => {
  const host = fakeOffice({ addSucceeds: false });
  let completionRequests = 0;
  let pendingCallbacks = 0;
  await assert.rejects(
    attachExactVaultVersionToOutlookCompose({
      matterId: MATTER,
      exactVersion: EXACT,
      Office: host.Office,
      cryptoImpl,
      requestJson: async (path) => {
        if (path === OUTLOOK_VAULT_ATTACHMENT_AUTHORIZE_PATH) {
          return authorizationResponse();
        }
        completionRequests += 1;
        return completionResponse();
      },
      onPendingCompletion() { pendingCallbacks += 1; },
    }),
    (error) => error.safe_error_code === "OUTLOOK_VAULT_ATTACHMENT_HOST_ADD_FAILED"
      && error.receipt_pending !== true,
  );
  assert.equal(completionRequests, 0);
  assert.equal(pendingCallbacks, 0);
});

test("authorization parser rejects a different exact version or non-HTTPS delivery URI", () => {
  assert.throws(
    () => parseOutlookVaultAttachmentAuthorization(
      authorizationResponse({
        exact_version: { ...EXACT, sha256: "d".repeat(64) },
      }),
      { matterId: MATTER, exactVersion: EXACT },
    ),
    /incomplete or mismatched/u,
  );
  assert.throws(
    () => parseOutlookVaultAttachmentAuthorization(
      authorizationResponse({
        delivery_uri: "http://lawos-api.example.test/private-token",
      }),
      { matterId: MATTER, exactVersion: EXACT },
    ),
    /incomplete or mismatched/u,
  );
});
