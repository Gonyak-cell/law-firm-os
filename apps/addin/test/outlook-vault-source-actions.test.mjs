import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH,
  OUTLOOK_VAULT_EMAIL_SAVE_PATH,
  OUTLOOK_VAULT_SENT_SAVE_PATH,
  OUTLOOK_VAULT_SOURCE_PENDING_STORAGE_KEY,
  OUTLOOK_VAULT_SOURCE_STATUS_PATH,
  createOutlookVaultSourcePendingStore,
  parseOutlookVaultSourceSaveResponse,
  projectOutlookVaultSourceEmail,
  resumePendingOutlookVaultSourceSaves,
  saveOutlookAttachmentSourcesToVault,
  saveOutlookEmailSourceToVault,
  saveOutlookEmailWithAttachmentsToVault,
} from "../src/outlook-vault-source-actions.js";

const MATTER = "matter_outlook_vault_client_test";
const ITEM_KEY = [
  "rest-outlook-vault-client",
  "<outlook-vault-client@amic.kr>",
  "conversation-outlook-vault-client",
].join("\u001f");

function email() {
  return {
    canonical_graph_message_id: "immutable:outlook-vault-client",
    rest_message_id: "rest-outlook-vault-client",
    internet_message_id: "<outlook-vault-client@amic.kr>",
    conversation_id: "conversation-outlook-vault-client",
    item_key: ITEM_KEY,
    subject: "Outlook Vault client action",
    body: "must never cross the Vault save request",
    body_preview: "must also be omitted",
    sent_at: "2026-08-28T01:00:00.000Z",
    received_at: "2026-08-28T01:00:03.000Z",
    attachments: [
      {
        attachment_id: "attachment-a",
        name: "a.txt",
        content_type: "text/plain",
        size: 4,
        content_base64: Buffer.from("aaaa").toString("base64"),
      },
      {
        attachment_id: "attachment-b",
        name: "b.pdf",
        content_type: "application/pdf",
        size: 5,
        content_text: "bbbbb",
      },
    ],
  };
}

function response({
  kind,
  matterId = MATTER,
  suffix,
  filingMode = null,
  attachmentId = null,
  outcome = "readback_verified",
} = {}) {
  const exact = Object.freeze({
    document_id: `document_${suffix}`,
    version_id: `version_${suffix}_1`,
    file_object_id: `file_${suffix}_1`,
    sha256: suffix.padEnd(64, suffix[0]).slice(0, 64).replace(/[^a-f0-9]/gu, "a"),
    byte_size: 11,
    mime_type: kind === "save_email" ? "message/rfc822" : "text/plain",
  });
  return Object.freeze({
    request_id: `request-${suffix}`,
    outcome,
    ok: true,
    idempotent_replay: outcome === "idempotent_replay",
    item: Object.freeze({
      operation_id: `vaultop_${"a".repeat(32)}`,
      operation_kind: kind,
      ...exact,
      exact_readback_verified: true,
      raw_path_included: false,
      raw_bytes_included: false,
      mail_pii_included: false,
      token_material_returned: false,
      receipt: Object.freeze({
        operation_kind: kind,
        stage: "readback_verified",
        matter_id: matterId,
        exact_version: exact,
      }),
    }),
    source_binding_sha256: "b".repeat(64),
    provider_authority_verified: true,
    production_ready_claim: false,
    ...(filingMode ? { filing_operation: filingMode } : {}),
    ...(attachmentId ? { selected_attachment_id: attachmentId } : {}),
  });
}

function processingResponse({ kind, stage, matterId = MATTER, filingMode = null } = {}) {
  const operationId = `vaultop_${"a".repeat(32)}`;
  return Object.freeze({
    request_id: `request-processing-${stage}`,
    outcome: "processing",
    ok: true,
    item: Object.freeze({
      operation_id: operationId,
      operation_kind: kind,
      stage,
      retry_after_ms: 250,
      exact_readback_verified: false,
      raw_path_included: false,
      raw_bytes_included: false,
      mail_pii_included: false,
      token_material_returned: false,
      receipt: Object.freeze({
        operation_id: operationId,
        operation_kind: kind,
        stage,
        matter_id: matterId,
        exact_version: null,
      }),
    }),
    source_binding_sha256: "b".repeat(64),
    provider_authority_verified: true,
    production_ready_claim: false,
    ...(filingMode ? { filing_operation: filingMode } : {}),
  });
}

test("Vault source projection strips mail bodies and all Office.js attachment payload bytes", () => {
  const projected = projectOutlookVaultSourceEmail(email());
  assert.equal(projected.item_key, ITEM_KEY);
  assert.equal(projected.attachments.length, 2);
  const serialized = JSON.stringify(projected);
  for (const forbidden of [
    "content_base64",
    "content_text",
    "must never cross",
    "body_preview",
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
  assert.deepEqual(projected.attachments[0], {
    attachment_id: "attachment-a",
    name: "a.txt",
    content_type: "text/plain",
    size: 4,
  });
});

test("explicit email plus attachments action uses only the three Vault source routes and exact readback", async () => {
  const calls = [];
  const receipts = [];
  let operationAssertions = 0;
  const result = await saveOutlookEmailWithAttachmentsToVault({
    matterId: MATTER,
    email: email(),
    requestJson: async (path, options) => {
      calls.push({ path, options });
      if (path === OUTLOOK_VAULT_EMAIL_SAVE_PATH) {
        return response({ kind: "save_email", suffix: "a", filingMode: "manual" });
      }
      const attachmentId = options.body.selected_attachment_ids[0];
      return response({
        kind: "save_email_attachment",
        suffix: attachmentId.endsWith("a") ? "c" : "d",
        attachmentId,
      });
    },
    assertOperationCurrent() {
      operationAssertions += 1;
    },
    onReceipt(value) {
      receipts.push(value);
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.email.operation_kind, "save_email");
  assert.equal(result.attachments.receipts.length, 2);
  assert.deepEqual(calls.map(({ path }) => path), [
    OUTLOOK_VAULT_EMAIL_SAVE_PATH,
    OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH,
    OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH,
  ]);
  assert.equal(operationAssertions, 6);
  assert.equal(receipts.length, 3);
  for (const { options } of calls) {
    const serialized = JSON.stringify(options.body);
    assert.equal(serialized.includes("content_base64"), false);
    assert.equal(serialized.includes("content_text"), false);
    assert.equal(serialized.includes("must never cross"), false);
  }
  assert.deepEqual(
    calls.slice(1).map(({ options }) => options.body.selected_attachment_ids),
    [["attachment-a"], ["attachment-b"]],
  );
});

test("sent email uses the sent-only Vault route and binds the filing mode", async () => {
  let path;
  const saved = await saveOutlookEmailSourceToVault({
    matterId: MATTER,
    email: email(),
    mode: "sent",
    requestJson: async (nextPath) => {
      path = nextPath;
      return response({
        kind: "save_email",
        suffix: "e",
        filingMode: "sent",
        outcome: "idempotent_replay",
      });
    },
  });
  assert.equal(path, OUTLOOK_VAULT_SENT_SAVE_PATH);
  assert.equal(saved.idempotent_replay, true);
  assert.equal(saved.item_key, ITEM_KEY);
});

test("pending source save polls only the status route and never resends the Outlook source", async () => {
  const calls = [];
  const waits = [];
  let statusCount = 0;
  const saved = await saveOutlookEmailSourceToVault({
    matterId: MATTER,
    email: email(),
    requestJson: async (path, options) => {
      calls.push({ path, body: options.body });
      if (path === OUTLOOK_VAULT_EMAIL_SAVE_PATH) {
        return processingResponse({ kind: "save_email", stage: "scanning", filingMode: "manual" });
      }
      statusCount += 1;
      if (statusCount === 1) {
        const promoted = structuredClone(processingResponse({
          kind: "save_email",
          stage: "promoted",
        }));
        promoted.item.receipt.exact_version = response({
          kind: "save_email",
          suffix: "a",
        }).item.receipt.exact_version;
        return promoted;
      }
      const final = structuredClone(response({ kind: "save_email", suffix: "a" }));
      delete final.source_binding_sha256;
      return final;
    },
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });
  assert.equal(saved.outcome, "readback_verified");
  assert.deepEqual(calls.map(({ path }) => path), [
    OUTLOOK_VAULT_EMAIL_SAVE_PATH,
    OUTLOOK_VAULT_SOURCE_STATUS_PATH,
    OUTLOOK_VAULT_SOURCE_STATUS_PATH,
  ]);
  assert.deepEqual(waits, [250, 250]);
  for (const call of calls.slice(1)) {
    assert.deepEqual(Object.keys(call.body), ["operation_id"]);
  }
});

test("task-pane recreation resumes an accepted source by opaque operation only", async () => {
  const values = new Map();
  const officeStorage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  };
  const webStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  const firstStore = createOutlookVaultSourcePendingStore({
    officeStorage,
    webStorage,
    now: () => Date.parse("2026-08-29T06:00:00.000Z"),
  });
  const firstCalls = [];
  const saved = await saveOutlookEmailSourceToVault({
    matterId: MATTER,
    email: email(),
    pendingStore: firstStore,
    maxStatusChecks: 1,
    wait: async () => {},
    requestJson: async (path, options) => {
      firstCalls.push({ path, body: options.body });
      return processingResponse({
        kind: "save_email",
        stage: "scanning",
        filingMode: "manual",
      });
    },
  });
  assert.equal(saved.outcome, "processing");
  assert.deepEqual(firstCalls.map(({ path }) => path), [
    OUTLOOK_VAULT_EMAIL_SAVE_PATH,
    OUTLOOK_VAULT_SOURCE_STATUS_PATH,
  ]);

  const persisted = values.get(OUTLOOK_VAULT_SOURCE_PENDING_STORAGE_KEY);
  assert.equal(typeof persisted, "string");
  for (const forbidden of [
    MATTER,
    ITEM_KEY,
    "immutable:outlook-vault-client",
    "rest-outlook-vault-client",
    "attachment-a",
    "a.txt",
    "Outlook Vault client action",
    "must never cross",
  ]) assert.equal(persisted.includes(forbidden), false, forbidden);
  assert.deepEqual(Object.keys(JSON.parse(persisted).entries[0]).sort(), [
    "attachment_id_included",
    "created_at",
    "graph_message_id_included",
    "mail_pii_included",
    "matter_id_included",
    "operation_id",
    "operation_kind",
    "outlook_item_id_included",
    "source_bytes_included",
    "updated_at",
  ]);

  const recreatedStore = createOutlookVaultSourcePendingStore({
    officeStorage,
    webStorage,
    now: () => Date.parse("2026-08-29T06:01:00.000Z"),
  });
  const resumeCalls = [];
  const resumed = await resumePendingOutlookVaultSourceSaves({
    pendingStore: recreatedStore,
    requestJson: async (path, options) => {
      resumeCalls.push({ path, body: options.body });
      return response({ kind: "save_email", suffix: "a" });
    },
  });
  assert.equal(resumed.status, "complete");
  assert.equal(resumed.receipts[0].exact_version.version_id, "version_a_1");
  assert.equal(resumed.status_only, true);
  assert.equal(resumed.outlook_item_read, false);
  assert.equal(resumed.graph_source_read, false);
  assert.equal(resumed.source_bytes_resent, false);
  assert.deepEqual(resumeCalls, [{
    path: OUTLOOK_VAULT_SOURCE_STATUS_PATH,
    body: { operation_id: `vaultop_${"a".repeat(32)}` },
  }]);
  assert.deepEqual(await recreatedStore.list(), []);
});

test("per-attachment provider failure produces an explicit retry set without resending successful bytes", async () => {
  const calls = [];
  const result = await saveOutlookAttachmentSourcesToVault({
    matterId: MATTER,
    email: email(),
    requestJson: async (path, options) => {
      const attachmentId = options.body.selected_attachment_ids[0];
      calls.push(attachmentId);
      if (attachmentId === "attachment-b") {
        throw Object.assign(new Error("Records denied"), {
          safe_error_code: "VAULT_PROVIDER_RECORDS_DENIED",
        });
      }
      return response({
        kind: "save_email_attachment",
        suffix: "f",
        attachmentId,
      });
    },
  });
  assert.deepEqual(calls, ["attachment-a", "attachment-b"]);
  assert.equal(result.status, "partial");
  assert.equal(result.receipts.length, 1);
  assert.deepEqual(result.retry_attachment_ids, ["attachment-b"]);
  assert.equal(result.failed[0].safe_error_code, "VAULT_PROVIDER_RECORDS_DENIED");
});

test("mismatched provider exact readback is rejected before a client receipt is accepted", () => {
  const mismatched = structuredClone(response({
    kind: "save_email",
    suffix: "a",
    filingMode: "manual",
  }));
  mismatched.item.receipt.exact_version.sha256 = "f".repeat(64);
  assert.throws(
    () => parseOutlookVaultSourceSaveResponse(mismatched, {
      operationKind: "save_email",
      matterId: MATTER,
      itemKey: ITEM_KEY,
      filingMode: "manual",
    }),
    /incomplete or mismatched/u,
  );
});
