import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createDefaultDmsRuntime,
  createDefaultMatterRuntime,
  startApiServer,
} from "../src/server.js";
import { createDmsRepository, createFileStorageAdapter } from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";

const TENANT = "tenant_outlook_addin_test";
const MATTER = "matter_outlook_addin_test";
const ACTOR = "outlook_addin_test_user";

function permissionHeaders() {
  return {
    "content-type": "application/json",
    "x-lawos-permission-context": JSON.stringify({
      principal: {
        user_id: ACTOR,
        tenant_id: TENANT,
        role_ids: ["matter_runtime_user", "dms_reader", "outlook_addin_user"],
      },
      rules: [{ id: "outlook-addin-test-allow", effect: "allow", action: "*" }],
      object_acl: [],
    }),
  };
}

async function jsonFetch(baseUrl, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...permissionHeaders(), ...(init.headers ?? {}) },
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${path} failed: ${JSON.stringify(body)}`);
  return body;
}

function seedMatterRepository() {
  return createMatterRepository({
    seedRecords: [
      {
        model_type: "MatterClient",
        tenant_id: TENANT,
        client_id: "client_outlook_addin_test",
        client_display_name: "오피스 애드인 테스트 고객",
        client_short_name: "OUTLOOKADDIN",
        status: "active",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
      },
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "OUTLOOK/LIT/CIV/애드인",
        matter_name: "Outlook Add-in filing test",
        client_id: "client_outlook_addin_test",
        client_display_name: "오피스 애드인 테스트 고객",
        title: "Outlook Add-in filing test",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
        permission_envelope_id: "perm:outlook:addin:test",
        audit_trace_id: "audit:outlook:addin:test",
      },
    ],
  });
}

function emailFixture() {
  return {
    graph_message_id: "graph-outlook-addin-test-001",
    internet_message_id: "<outlook-addin-test-001@amic.law>",
    conversation_id: "conversation-outlook-addin-test",
    from: { name: "상대방", email: "opposing@example.com" },
    to: [{ name: "AMIC 변호사", email: "lawyer@amic.law" }],
    cc: [{ name: "고객", email: "client@example.com" }],
    bcc: [],
    subject: "Outlook filing regression",
    body_preview: "첨부 확인 부탁드립니다.",
    sent_at: "2026-07-03T01:00:00.000Z",
    received_at: "2026-07-03T01:00:03.000Z",
    mailbox_ref: "mailbox:test",
    account_ref: "account:test",
    attachments: [
      {
        attachment_id: "att-contract",
        name: "contract.txt",
        content_type: "text/plain",
        content_text: "contract attachment bytes",
        confidentiality: "confidential",
      },
    ],
  };
}

test("Outlook add-in routes file email, save attachments, create follow-up, and warn without blocking send", async () => {
  const matterRepository = seedMatterRepository();
  const dmsRepository = createDmsRepository();
  const storage = createFileStorageAdapter({
    adapter_id: "outlook-addin-test-storage",
    rootPath: join(mkdtempSync(join(tmpdir(), "outlook-addin-dms-")), "objects"),
  });
  const dmsRuntime = createDefaultDmsRuntime({ repository: dmsRepository, storage });
  const matterRuntime = createDefaultMatterRuntime({ repository: matterRepository, dmsRuntime });
  const started = await startApiServer({ port: 0, matterRuntime, dmsRuntime });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    const bootstrap = await jsonFetch(baseUrl, `/api/outlook/bootstrap?tenant_id=${TENANT}`);
    assert.equal(bootstrap.item.taskpane_loaded, true);
    assert.equal(bootstrap.item.external_receipt_boundary.entra_admin_consent_receipt_present, false);

    const matters = await jsonFetch(baseUrl, `/api/outlook/matters?tenant_id=${TENANT}&q=OUTLOOK`);
    assert.equal(matters.items.length, 1);
    assert.equal(matters.items[0].matter_id, MATTER);

    const fileBody = await jsonFetch(baseUrl, "/api/outlook/email/file", {
      method: "POST",
      body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
    });
    assert.equal(fileBody.outcome, "created");
    assert.equal(fileBody.email_thread.field_contract_count, 18);
    assert.equal(fileBody.email_thread.raw_body_included, false);
    assert.equal(fileBody.matter_timeline.visible_entries.some((entry) => entry.type === "outlook.email.filed"), true);

    const replayBody = await jsonFetch(baseUrl, "/api/outlook/email/file", {
      method: "POST",
      body: JSON.stringify({ tenant_id: TENANT, matter_id: MATTER, email: emailFixture() }),
    });
    assert.equal(replayBody.outcome, "idempotent_replay");
    assert.equal(replayBody.idempotent_replay, true);

    const attachmentBody = await jsonFetch(baseUrl, "/api/outlook/attachments/save", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        selected_attachment_ids: ["att-contract"],
        attachments: emailFixture().attachments,
      }),
    });
    assert.equal(attachmentBody.outcome, "attachments_saved");
    assert.equal(attachmentBody.items.length, 1);
    assert.equal(attachmentBody.items[0].file_object.storage_pointer_ref_included, false);
    assert.equal(attachmentBody.folder_structure[0], "00_Email");
    assert.equal(attachmentBody.folder_structure.at(-1), "99_Archive");

    const duplicateBody = await jsonFetch(baseUrl, "/api/outlook/attachments/save", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email_thread_id: fileBody.email_thread.email_thread_id,
        selected_attachment_ids: ["att-contract"],
        attachments: emailFixture().attachments,
      }),
    });
    assert.equal(duplicateBody.duplicate_count, 1);

    const followup = await jsonFetch(baseUrl, "/api/outlook/followups", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        kind: "task",
        title: "메일 검토 후 후속 조치",
        due_at: "2026-07-10T09:00:00.000Z",
        source_email_thread_id: fileBody.email_thread.email_thread_id,
      }),
    });
    assert.equal(followup.outcome, "created");
    assert.equal(followup.auto_created_without_lawyer_approval, false);

    const sent = await jsonFetch(baseUrl, "/api/outlook/sent/file", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        matter_id: MATTER,
        email: { ...emailFixture(), graph_message_id: "graph-outlook-sent-001", conversation_id: "conversation-outlook-sent" },
      }),
    });
    assert.equal(sent.external_send_state, "provider_gated_no_external_send_claim");

    const alerts = await jsonFetch(baseUrl, "/api/outlook/smart-alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({
        message: {
          to: [{ name: "외부", email: "external@example.com" }],
          body_preview: "첨부 확인 부탁드립니다.",
          attachments: [{ attachment_id: "conf", name: "secret.pdf", confidentiality: "highly_confidential" }],
        },
      }),
    });
    assert.equal(alerts.item.warning_count, 1);
    assert.equal(alerts.item.send_blocked, false);

    const docs = await jsonFetch(baseUrl, `/api/outlook/matters/${MATTER}/documents?tenant_id=${TENANT}`);
    assert.equal(docs.items.length, 1);
    assert.equal(docs.document_bytes_included, false);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
});
