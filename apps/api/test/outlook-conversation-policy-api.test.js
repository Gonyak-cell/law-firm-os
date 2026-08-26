import assert from "node:assert/strict";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createEmailThread } from "../../../packages/email-dms/src/email-model.js";
import {
  createDmsRepositoryMimeAuthority,
  outlookEmailFileRequestFingerprint,
} from "../../../packages/email-dms/src/email-filing-service.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { listEmailDmsPostgresMigrations } from "../../../packages/email-dms/src/migrations/index.js";
import { createPostgresConversationPolicyService } from "../../../packages/email-dms/src/postgres-conversation-policy-service.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createApiServer } from "../src/server.js";
import { createTrustedOutlookInstallationTestAuthority } from "./helpers/outlook-trusted-installation-runtime.js";

const TENANT = "tenant-outm25-http";
const OWNER = "user-outm25-http";
const SUBJECT = "subject-outm25-http";
const CONNECTION = "connection-outm25-http";
const MATTER = "matter-outm25-http";
const THREAD = "thread-outm25-http";
const MIME_SHA256 = "b".repeat(64);
const RECEIPT = `outlook-email-file:${THREAD}:${MIME_SHA256}:dms`;
const OWNER_PRINCIPAL = Object.freeze({
  tenant_id: TENANT,
  user_id: OWNER,
  entra_subject_id: SUBJECT,
  role_ids: ["attorney"],
});
const INTRUDER_PRINCIPAL = Object.freeze({
  tenant_id: TENANT,
  user_id: "same-tenant-intruder",
  entra_subject_id: "subject-intruder",
  role_ids: ["attorney"],
});
const OUTLOOK_INSTALLATION_AUTHORITY =
  createTrustedOutlookInstallationTestAuthority([
    OWNER_PRINCIPAL,
    INTRUDER_PRINCIPAL,
  ]);

function sessionAuth() {
  return OUTLOOK_INSTALLATION_AUTHORITY.wrapSessionAuth({
    capabilities: {},
    async resolvePermissionContextFromHeaders(headers) {
      const intruder = headers.authorization === "Bearer intruder";
      const principal = intruder ? INTRUDER_PRINCIPAL : OWNER_PRINCIPAL;
      return { ok: true, principal, context: {
        principal,
        rules: [{ id: "outm25-http-allow", effect: "allow", action: "*" }],
        object_acl: [],
      } };
    },
  });
}

test("OUTM-25 HTTP policy route derives the owner from the signed session and rejects same-tenant revoke", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 4 });
  if (!fixture) return;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  const emailDmsRepository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: OWNER,
    entra_subject_id: SUBJECT,
    mailbox_address_hash: "a".repeat(64),
    credential_ref: "aws-secrets-manager:synthetic/outm25-http",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  const matterRepository = createMatterRepository({ seedRecords: [
    { model_type: "Matter", tenant_id: TENANT, matter_id: MATTER, client_id: "client-outm25-http", title: "OUTM-25", status: "open", created_by: OWNER, created_at: "2026-08-08T00:00:00.000Z", permission_envelope_id: "perm-outm25-http", audit_trace_id: "audit-outm25-http" },
    { model_type: "MatterMember", tenant_id: TENANT, matter_id: MATTER, member_id: "member-outm25-http", user_id: OWNER, role: "associate", status: "active", permission_envelope_id: "perm-outm25-http", audit_trace_id: "audit-outm25-http" },
  ] });
  const dmsRepository = createDmsRepository();
  const thread = dmsRepository.create({
    ...createEmailThread({
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: THREAD,
      graph_message_id: "message-outm25-http",
      internet_message_id: "<message-outm25-http@example.test>",
      conversation_id: "conversation-outm25-http",
      subject: "Seed filing",
      account_ref: CONNECTION,
      mailbox_ref: "a".repeat(64),
      filed_document_ids: [`doc:${THREAD}:original-mime:${MIME_SHA256}`],
      filing_user: OWNER,
      filing_time: "2026-08-08T00:00:00.000Z",
    }),
    model_type: "DmsEmailThread",
  });
  const documentId = thread.filed_document_ids[0];
  const versionId = `version:${THREAD}:original-mime`;
  const fileObjectId = `file:${THREAD}:original-mime`;
  const objectId = `object:${THREAD}:original-mime`;
  const dmsAuthority = { permission_envelope_id: "perm-outm25-http", audit_trace_id: "audit-outm25-http" };
  dmsRepository.create({ model_type: "DmsDocument", tenant_id: TENANT, matter_id: MATTER,
    document_id: documentId, workspace_id: `workspace:${MATTER}`, folder_id: `folder:${MATTER}:00_Email`,
    title: "Seed filing.eml", status: "active", current_version_id: versionId,
    latest_sha256: MIME_SHA256, source_email_thread_id: THREAD, ...dmsAuthority });
  dmsRepository.create({ model_type: "DmsDocumentVersion", tenant_id: TENANT, matter_id: MATTER,
    version_id: versionId, document_id: documentId, version_number: 1, status: "current",
    file_object_id: fileObjectId, sha256: MIME_SHA256, persisted: true, ...dmsAuthority });
  dmsRepository.create({ model_type: "DmsFileObject", tenant_id: TENANT, matter_id: MATTER,
    file_object_id: fileObjectId, object_id: objectId, storage_pointer_ref: objectId,
    sha256: MIME_SHA256, byte_size: 586, mime_type: "message/rfc822", status: "committed",
    ...dmsAuthority });
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: RECEIPT,
    operation: "outlook_email_file",
    request_fingerprint: outlookEmailFileRequestFingerprint(thread),
    response: { outcome: "created", email_thread_id: THREAD, matter_id: MATTER, filed_document_ids: thread.filed_document_ids },
    created_at: "2026-08-08T00:00:00.000Z",
  });
  const subscriptionCalls = [];
  const uploadRuntime = createDmsRepositoryMimeAuthority(dmsRepository, { provider: {
    statObject: () => ({ object_id: objectId, sha256: MIME_SHA256, byte_size: 586, mime_type: "message/rfc822" }),
    digestObject: () => ({ object_id: objectId, sha256: MIME_SHA256, byte_size: 586 }),
  } });
  const policyService = createPostgresConversationPolicyService({ pool: fixture.appPool, tenant_id: TENANT, clock: () => new Date("2026-08-08T00:00:00.000Z") });
  const conversationRuntime = {
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
    readiness: {
      policy_runtime_ready: true,
      subscription_reconciler_ready: true,
      message_auto_filing_ready: true,
      maintenance_worker_ready: true,
      worker_schedule_ready: true,
      auto_filing_enabled: true,
    },
    policy_service: policyService,
    subscription_service: { async reconcile(input) { subscriptionCalls.push(input); return { outcome: "active" }; } },
  };
  const server = createApiServer({
    matterRuntime: { repository: matterRepository },
    dmsRuntime: { repository: dmsRepository, upload_runtime: uploadRuntime },
    emailDmsRuntime: { repository: emailDmsRepository },
    outlookConversationRuntime: conversationRuntime,
    outlookDesktopRuntime: OUTLOOK_INSTALLATION_AUTHORITY.runtime,
    sessionAuth: sessionAuth(),
    stepUpAuthority: {},
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const enable = await fetch(`${base}/api/outlook/conversation-policies`, {
    method: "POST",
    headers: { authorization: "Bearer owner", "content-type": "application/json" },
    body: JSON.stringify({ tenant_id: TENANT, m365_connection_id: CONNECTION, matter_id: MATTER, conversation_id: "conversation-outm25-http", seed_email_thread_id: THREAD, seed_filing_receipt_ref: RECEIPT, expected_version: 0, idempotency_key: "enable-outm25-http" }),
  });
  const enabled = await enable.json();
  assert.equal(enable.status, 201, JSON.stringify(enabled));
  assert.deepEqual(Object.keys(enabled.item).sort(), [
    "conversation_id", "created_at", "matter_id", "pause_reason", "policy_id",
    "revoked_at", "status", "updated_at", "version",
  ]);
  assert.equal(Object.hasOwn(enabled.item, "user_id"), false);
  assert.equal(Object.hasOwn(enabled.item, "entra_subject_id"), false);
  assert.equal(Object.hasOwn(enabled.item, "mailbox_ref"), false);
  assert.equal(Object.hasOwn(enabled.item, "seed_email_thread_id"), false);
  assert.equal(Object.hasOwn(enabled.item, "enabling_actor_id"), false);
  assert.equal(Object.hasOwn(enabled.item, "production_ready_claim"), false);
  assert.equal(enabled.subscription_sync, "synchronized");
  assert.equal(subscriptionCalls[0].user_id, OWNER);

  const revokeBody = { tenant_id: TENANT, m365_connection_id: CONNECTION, matter_id: MATTER, expected_version: 1, reason: "disabled", idempotency_key: "revoke-outm25-http" };
  const intruder = await fetch(`${base}/api/outlook/conversation-policies/${enabled.item.policy_id}/revoke`, {
    method: "POST",
    headers: { authorization: "Bearer intruder", "content-type": "application/json" },
    body: JSON.stringify(revokeBody),
  });
  assert.equal(intruder.status, 403);
  const owner = await fetch(`${base}/api/outlook/conversation-policies/${enabled.item.policy_id}/revoke`, {
    method: "POST",
    headers: { authorization: "Bearer owner", "content-type": "application/json" },
    body: JSON.stringify(revokeBody),
  });
  const revoked = await owner.json();
  assert.equal(owner.status, 200, JSON.stringify(revoked));
  assert.equal(revoked.item.status, "revoked");
});
