import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH,
  OUTLOOK_VAULT_EMAIL_SAVE_PATH,
  OUTLOOK_VAULT_SOURCE_STATUS_PATH,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant_outlook_vault_source_test";
const ACTOR = "user_outlook_vault_source_test";
const ENTRA = "entra_outlook_vault_source_test";
const MATTER = "matter_outlook_vault_source_test";
const MAILBOX = "lawyer@amic.kr";
const REST_ID = "graph-outlook-vault-source-test";
const IMMUTABLE_ID = `immutable:${REST_ID}`;
const INTERNET_ID = "<outlook-vault-source-test@amic.kr>";
const CONVERSATION_ID = "conversation-outlook-vault-source-test";
const ATTACHMENT_ID = "attachment-contract-test";
const ATTACHMENT_BYTES = Buffer.from("canonical Graph MIME attachment bytes\n");
const BOUNDARY = "outlook-vault-source-boundary";

function canonicalMime() {
  return Buffer.from([
    "From: opposing@example.com",
    `To: ${MAILBOX}`,
    "Date: Fri, 28 Aug 2026 01:00:00 +0000",
    "Subject: Outlook Vault source save",
    `Message-ID: ${INTERNET_ID}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${BOUNDARY}\"`,
    "",
    `--${BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Canonical body",
    `--${BOUNDARY}`,
    "Content-Type: text/plain; name=\"contract.txt\"",
    "Content-Disposition: attachment; filename=\"contract.txt\"",
    "Content-Transfer-Encoding: base64",
    "",
    ATTACHMENT_BYTES.toString("base64"),
    `--${BOUNDARY}--`,
    "",
  ].join("\r\n"));
}

function emailInput() {
  return Object.freeze({
    canonical_graph_message_id: IMMUTABLE_ID,
    rest_message_id: REST_ID,
    internet_message_id: INTERNET_ID,
    conversation_id: CONVERSATION_ID,
    item_key: [REST_ID, INTERNET_ID, CONVERSATION_ID].join("\u001f"),
    subject: "Outlook Vault source save",
    from: { name: "상대방", email: "opposing@example.com" },
    to: [{ name: "AMIC 변호사", email: MAILBOX }],
    cc: [],
    bcc: [],
    sent_at: "2026-08-28T01:00:00.000Z",
    received_at: "2026-08-28T01:00:03.000Z",
    attachments: [{
      attachment_id: ATTACHMENT_ID,
      name: "contract.txt",
      content_type: "text/plain",
      size: ATTACHMENT_BYTES.byteLength,
    }],
  });
}

function decisions(operationId, recordsEffect = "allow") {
  const value = (kind, effect = "allow") => Object.freeze({
    effect,
    decision_ref: `decision-${kind}:${operationId}`,
  });
  return Object.freeze({
    permission: value("permission"),
    ethical_wall: value("ethical-wall"),
    records: value("records", recordsEffect),
    dlp: value("dlp"),
  });
}

function vaultProvider({
  recordsEffect = "allow",
  readbackStates = ["readback_verified"],
} = {}) {
  const calls = [];
  const commits = new Map();
  const readbackCountByOperation = new Map();
  const authorityRef = "amic-vault-api:outlook-source-test";
  const revision = "amic-vault-source:outlook-test";
  return Object.freeze({
    authority_kind: "amic-vault-api",
    calls,
    async preflightUpload(input) {
      calls.push({ method: "preflightUpload", input });
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: revision,
        preflight_ref: `preflight:${input.operation_id}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        resolved: Object.freeze({
          vault_tenant_id: TENANT,
          vault_actor_id: ACTOR,
          vault_matter_id: `vault-${MATTER}`,
          vault_workspace_id: `workspace-${MATTER}`,
          vault_folder_id: null,
        }),
        decisions: decisions(input.operation_id, recordsEffect),
        audit: Object.freeze({
          event_id: `audit-preflight:${input.operation_id}`,
          correlation_id: input.correlation_id,
        }),
      });
    },
    async commitUpload(input) {
      calls.push({ method: "commitUpload", input });
      let result = commits.get(input.operation.operation_id);
      if (!result) {
        const suffix = input.operation.operation_id.slice("vaultop_".length);
        const exact = Object.freeze({
          document_id: `document_${suffix}`,
          version_id: `version_${suffix}_1`,
          file_object_id: `file_${suffix}_1`,
          sha256: input.file.sha256,
          byte_size: input.file.byte_size,
          mime_type: input.file.mime_type,
        });
        result = Object.freeze({
          exact,
          response: Object.freeze({
            authority_kind: "amic-vault-api",
            authority_ref: authorityRef,
            provider_revision: revision,
            state: "quarantined",
            provider_operation_ref: `provider-operation:${input.operation.operation_id}`,
            accepted: Object.freeze({
              sha256: input.file.sha256,
              byte_size: input.file.byte_size,
              mime_type: input.file.mime_type,
            }),
            exact_version: null,
            retry_after_ms: 1_000,
            audit: Object.freeze({
              event_id: `audit-commit:${input.operation.operation_id}`,
              correlation_id: input.operation.correlation_id,
            }),
          }),
        });
        commits.set(input.operation.operation_id, result);
      }
      return result.response;
    },
    async readbackUpload(input) {
      calls.push({ method: "readbackUpload", input });
      const count = readbackCountByOperation.get(input.operation.operation_id) ?? 0;
      const state = readbackStates[Math.min(count, readbackStates.length - 1)];
      readbackCountByOperation.set(input.operation.operation_id, count + 1);
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: revision,
        state,
        provider_operation_ref: input.commit.provider_operation_ref,
        exact_version: new Set(["promoted", "readback_verified"]).has(state)
          ? commits.get(input.operation.operation_id)?.exact
          : null,
        retry_after_ms: state === "readback_verified" ? null : 500,
        decisions: decisions(input.operation.operation_id),
        audit: Object.freeze({
          event_id: `audit-readback:${input.operation.operation_id}`,
          correlation_id: input.operation.correlation_id,
        }),
      });
    },
  });
}

function runtime({ provider = vaultProvider() } = {}) {
  const matterRepository = createMatterRepository({
    seedRecords: [{
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_code: "VAULT/OUTLOOK/SOURCE",
      matter_name: "Outlook Vault source test",
      client_id: "client_outlook_vault_source_test",
      client_display_name: "Outlook Vault source test client",
      title: "Outlook Vault source test",
      status: "open",
      created_by: ACTOR,
      created_at: "2026-08-28T00:00:00.000Z",
      permission_envelope_id: "permission-outlook-vault-source",
      audit_trace_id: "audit-outlook-vault-source",
    }],
  });
  const dmsRepository = createDmsRepository();
  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: ACTOR }),
      tenant_id: TENANT,
      user_id: ACTOR,
      entra_subject_id: ENTRA,
      mailbox_address_hash: hashMailboxAddress(MAILBOX),
      credential_ref: "aws-secrets-manager:synthetic/outlook-vault-source-test",
      granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
      consented_at: "2026-08-28T00:00:00.000Z",
      expires_at: "2026-08-29T00:00:00.000Z",
      revoked_at: null,
      state_version: 1,
    }],
  });
  let graphCalls = 0;
  const value = {
    matterRuntime: { repository: matterRepository },
    dmsRuntime: { repository: dmsRepository },
    emailDmsRuntime: { repository: emailDmsRepository },
    vaultUploadProvider: provider,
    sessionAuth: {
      async resolveVaultCapabilities() {
        return Object.freeze({
          authoritative: true,
          capabilities: Object.freeze([
            Object.freeze({ id: "upload", allowed: true, safe_reason_code: null }),
          ]),
        });
      },
    },
    m365GraphConfig: {
      feature_enabled: true,
      inquiry_feature_enabled: true,
      provider_runtime_enabled: true,
      clock: () => new Date("2026-08-28T00:30:00.000Z"),
      credential_vault: {
        async resolveDelegatedCredential() {
          return Object.freeze({
            access_token: "test-access-token-never-return",
            refresh_token: "test-refresh-token-never-return",
            mailbox_address: MAILBOX,
            refresh_profile: "client",
            refresh_profile_proof: "p".repeat(43),
            expires_at: "2026-08-29T00:00:00.000Z",
          });
        },
      },
      provider: {
        async getMeMessageMime() {
          graphCalls += 1;
          return Object.freeze({
            mime_bytes: canonicalMime(),
            immutable_message_id: IMMUTABLE_ID,
            internet_message_id: INTERNET_ID,
            provider_request_id: "provider-outlook-vault-source-test",
            message_metadata: Object.freeze({
              conversation_id: CONVERSATION_ID,
              internet_message_id: INTERNET_ID,
              subject: "Outlook Vault source save",
              sender: { display_name: "상대방", address: "opposing@example.com" },
              from: { display_name: "상대방", address: "opposing@example.com" },
              recipients: [{ display_name: "AMIC 변호사", address: MAILBOX, recipient_type: "to" }],
              received_at: "2026-08-28T01:00:03.000Z",
              has_attachments: true,
              is_in_sent_items: false,
              is_draft: false,
            }),
          });
        },
      },
    },
  };
  return Object.freeze({
    value,
    provider,
    dmsRepository,
    get graphCalls() {
      return graphCalls;
    },
  });
}

function context() {
  return Object.freeze({
    principal: Object.freeze({
      tenant_id: TENANT,
      user_id: ACTOR,
      entra_subject_id: ENTRA,
    }),
    rules: Object.freeze([Object.freeze({
      id: "outlook-vault-source-test-allow",
      effect: "allow",
      action: "*",
    })]),
    object_acl: Object.freeze([]),
  });
}

async function request(harness, pathname, body, requestId) {
  return handleOutlookAddinApiRequest({
    pathname,
    method: "POST",
    body,
    context: context(),
    requestId,
    runtime: harness.value,
  });
}

test("explicit Outlook email Vault save uploads canonical Graph MIME and returns exact provider readback", async () => {
  const harness = runtime();
  const result = await request(harness, OUTLOOK_VAULT_EMAIL_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
  }, "request-outlook-vault-email");

  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.outcome, "readback_verified");
  assert.equal(result.body.item.operation_kind, "save_email");
  assert.equal(result.body.item.mime_type, "message/rfc822");
  assert.equal(result.body.item.sha256, createHash("sha256").update(canonicalMime()).digest("hex"));
  assert.equal(result.body.item.receipt.stage, "readback_verified");
  assert.equal(harness.graphCalls, 1);
  const commit = harness.provider.calls.find(({ method }) => method === "commitUpload");
  assert.equal(commit.input.file.bytes.equals(canonicalMime()), true);
  assert.equal(commit.input.file.filename.endsWith(".eml"), true);
  assert.equal(harness.dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes(REST_ID), false);
  assert.equal(serialized.includes(INTERNET_ID), false);
  assert.equal(serialized.includes("test-access-token"), false);

  const replay = await request(harness, OUTLOOK_VAULT_EMAIL_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
  }, "request-outlook-vault-email-replay");
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.item.receipt.receipt_id, result.body.item.receipt.receipt_id);
  assert.equal(harness.provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
});

test("explicit Outlook attachment Vault save extracts server Graph bytes and accepts no client payload", async () => {
  const harness = runtime();
  const result = await request(harness, OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
    selected_attachment_ids: [ATTACHMENT_ID],
  }, "request-outlook-vault-attachment");

  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.outcome, "readback_verified");
  assert.equal(result.body.item.operation_kind, "save_email_attachment");
  assert.equal(result.body.item.sha256, createHash("sha256").update(ATTACHMENT_BYTES).digest("hex"));
  assert.equal(result.body.item.byte_size, ATTACHMENT_BYTES.byteLength);
  assert.equal(result.body.selected_attachment_id, ATTACHMENT_ID);
  const commit = harness.provider.calls.find(({ method }) => method === "commitUpload");
  assert.equal(commit.input.file.bytes.equals(ATTACHMENT_BYTES), true);
  assert.equal(commit.input.file.bytes.equals(canonicalMime()), false);
  assert.equal(Object.hasOwn(emailInput().attachments[0], "content_base64"), false);
  assert.equal(harness.dmsRepository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
});

test("rotated Outlook attachment IDs replay the canonical Graph MIME part without another Vault version", async () => {
  const harness = runtime();
  const first = await request(harness, OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
    selected_attachment_ids: [ATTACHMENT_ID],
  }, "request-outlook-vault-attachment-original-id");
  assert.equal(first.status, 201, JSON.stringify(first.body));

  const rotatedAttachmentId = "attachment-contract-test-rotated";
  const rotatedEmail = Object.freeze({
    ...emailInput(),
    attachments: [Object.freeze({
      ...emailInput().attachments[0],
      attachment_id: rotatedAttachmentId,
    })],
  });
  const replay = await request(harness, OUTLOOK_VAULT_ATTACHMENT_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: rotatedEmail,
    selected_attachment_ids: [rotatedAttachmentId],
  }, "request-outlook-vault-attachment-rotated-id");

  assert.equal(replay.status, 200, JSON.stringify(replay.body));
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.selected_attachment_id, rotatedAttachmentId);
  assert.equal(replay.body.source_binding_sha256, first.body.source_binding_sha256);
  assert.equal(replay.body.item.receipt.receipt_id, first.body.item.receipt.receipt_id);
  assert.equal(
    harness.provider.calls.filter(({ method }) => method === "commitUpload").length,
    1,
  );
});

test("Outlook Vault source status resumes quarantine without a second Graph read or byte commit", async () => {
  const provider = vaultProvider({
    readbackStates: ["scanning", "promoted", "readback_verified"],
  });
  const harness = runtime({ provider });
  const pending = await request(harness, OUTLOOK_VAULT_EMAIL_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
  }, "request-outlook-vault-pending");
  assert.equal(pending.status, 202);
  assert.equal(pending.body.outcome, "processing");
  assert.equal(pending.body.item.stage, "scanning");

  const statusBody = { operation_id: pending.body.item.operation_id };
  const promoted = await request(
    harness,
    OUTLOOK_VAULT_SOURCE_STATUS_PATH,
    statusBody,
    "request-outlook-vault-promoted",
  );
  assert.equal(promoted.status, 202);
  assert.equal(promoted.body.item.stage, "promoted");
  assert.equal(promoted.body.source_binding_sha256, pending.body.source_binding_sha256);
  const completed = await request(
    harness,
    OUTLOOK_VAULT_SOURCE_STATUS_PATH,
    statusBody,
    "request-outlook-vault-completed",
  );
  assert.equal(completed.status, 201);
  assert.equal(completed.body.outcome, "readback_verified");
  assert.equal(completed.body.source_binding_sha256, pending.body.source_binding_sha256);
  assert.equal(harness.graphCalls, 1);
  assert.equal(provider.calls.filter(({ method }) => method === "commitUpload").length, 1);
  assert.equal(provider.calls.filter(({ method }) => method === "readbackUpload").length, 3);
  for (const call of provider.calls.filter(({ method }) => method === "readbackUpload")) {
    assert.equal("file" in call.input, false);
    assert.equal(JSON.stringify(call.input).includes(REST_ID), false);
  }
});

test("missing Vault provider and Records denial commit no bytes or final receipt", async () => {
  const absent = runtime({ provider: null });
  const missing = await request(absent, OUTLOOK_VAULT_EMAIL_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
  }, "request-outlook-vault-provider-missing");
  assert.equal(missing.status, 503);
  assert.deepEqual(missing.body.safe_error_codes, ["VAULT_PROVIDER_UNAVAILABLE"]);
  assert.equal(absent.graphCalls, 0);
  assert.equal(absent.dmsRepository.snapshot().idempotency.length, 0);

  const deniedProvider = vaultProvider({ recordsEffect: "deny" });
  const denied = runtime({ provider: deniedProvider });
  const blocked = await request(denied, OUTLOOK_VAULT_EMAIL_SAVE_PATH, {
    tenant_id: TENANT,
    matter_id: MATTER,
    email: emailInput(),
  }, "request-outlook-vault-records-denied");
  assert.equal(blocked.status, 403);
  assert.deepEqual(blocked.body.safe_error_codes, ["VAULT_PROVIDER_RECORDS_DENIED"]);
  assert.equal(deniedProvider.calls.some(({ method }) => method === "commitUpload"), false);
  const idempotency = denied.dmsRepository.snapshot().idempotency;
  assert.equal(idempotency.length, 1);
  assert.match(idempotency[0].idempotency_key, /^amic-os-vault-operation-owner:/u);
  assert.equal(idempotency.some(({ operation }) => (
    operation === "amic_os_vault_source_save_state"
    || operation === "amic_os_vault_source_save_final"
  )), false);
  assert.equal(denied.dmsRepository.listAudit({ tenant_id: TENANT }).length, 0);
});

test("provider-backed Outlook rejects every legacy filing sink without Graph, provider, or DMS mutation", async () => {
  const harness = runtime();
  for (const pathname of [
    "/api/outlook/email/file",
    "/api/outlook/sent/file",
    "/api/outlook/attachments/save",
  ]) {
    const result = await request(harness, pathname, {
      tenant_id: TENANT,
      matter_id: MATTER,
      attachments: [{
        attachment_id: ATTACHMENT_ID,
        content_base64: ATTACHMENT_BYTES.toString("base64"),
      }],
    }, `request-retired-${pathname.split("/").at(-1)}`);
    assert.equal(result.status, 403);
    assert.deepEqual(result.body.safe_error_codes, [
      "OUTLOOK_LEGACY_VAULT_WRITE_RETIRED",
    ]);
  }
  assert.equal(harness.graphCalls, 0);
  assert.equal(harness.provider.calls.length, 0);
  for (const model_type of [
    "DmsDocument",
    "DmsDocumentVersion",
    "DmsFileObject",
  ]) {
    assert.equal(harness.dmsRepository.list({ tenant_id: TENANT, model_type }).length, 0);
  }
  assert.equal(harness.dmsRepository.listAudit({ tenant_id: TENANT }).length, 0);
});
