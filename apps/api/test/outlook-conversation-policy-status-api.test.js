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
import { createGraphCursorCodec } from "../../../packages/email-dms/src/graph-cursor-codec.js";
import { createPostgresConversationPolicyService } from "../../../packages/email-dms/src/postgres-conversation-policy-service.js";
import { createPostgresConversationSyncStore } from "../../../packages/email-dms/src/postgres-conversation-sync-store.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant-outm28-status-api";
const OWNER = "user-outm28-status-api";
const SUBJECT = "subject-outm28-status-api";
const CONNECTION = "connection-outm28-status-api";
const MATTER = "matter-outm28-status-api";
const MIME_SHA256 = "c".repeat(64);
const THREAD = "thread-outm28-status-api";
const CONVERSATIONS = Object.freeze({
  active: "conversation-outm28-active",
  paused: "conversation-outm28-paused",
  revoked: "conversation-outm28-revoked",
});

const PRINCIPAL = Object.freeze({
  tenant_id: TENANT,
  user_id: OWNER,
  entra_subject_id: SUBJECT,
  role_ids: ["attorney"],
});

function readiness(overrides = {}) {
  return {
    policy_runtime_ready: true,
    subscription_reconciler_ready: true,
    message_auto_filing_ready: true,
    maintenance_worker_ready: true,
    worker_schedule_ready: true,
    auto_filing_enabled: true,
    ...overrides,
  };
}

function request({ runtime, query, body = {}, context = { principal: PRINCIPAL, rules: [{ id: "allow", effect: "allow", action: "*" }], object_acl: [] }, method = "GET", pathname = "/api/outlook/conversation-policies" }) {
  return handleOutlookAddinApiRequest({
    pathname,
    method,
    query,
    body,
    context,
    requestId: "req-outm28-status-api",
    runtime,
  });
}

function trackedRepository(repository, counters) {
  return new Proxy(repository, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      return (...args) => {
        if (Object.hasOwn(counters, property)) counters[property] += 1;
        return value.apply(target, args);
      };
    },
  });
}

function seedDurableOriginalMime(repository) {
  const documentId = `doc:${THREAD}:original-mime:${MIME_SHA256}`;
  const versionId = `version:${THREAD}:original-mime`;
  const fileObjectId = `file:${THREAD}:original-mime`;
  const objectId = `object:${THREAD}:original-mime`;
  const authority = {
    permission_envelope_id: "permission-outm28-status-api",
    audit_trace_id: "audit-outm28-status-api",
  };
  repository.create({
    model_type: "DmsDocument",
    tenant_id: TENANT,
    matter_id: MATTER,
    document_id: documentId,
    workspace_id: `workspace:${MATTER}`,
    folder_id: `folder:${MATTER}:00_Email`,
    title: "OUTM-28 seed.eml",
    status: "active",
    current_version_id: versionId,
    latest_sha256: MIME_SHA256,
    source_email_thread_id: THREAD,
    ...authority,
  });
  repository.create({
    model_type: "DmsDocumentVersion",
    tenant_id: TENANT,
    matter_id: MATTER,
    version_id: versionId,
    document_id: documentId,
    version_number: 1,
    status: "current",
    file_object_id: fileObjectId,
    sha256: MIME_SHA256,
    persisted: true,
    ...authority,
  });
  repository.create({
    model_type: "DmsFileObject",
    tenant_id: TENANT,
    matter_id: MATTER,
    file_object_id: fileObjectId,
    object_id: objectId,
    storage_pointer_ref: objectId,
    sha256: MIME_SHA256,
    byte_size: 586,
    mime_type: "message/rfc822",
    status: "committed",
    ...authority,
  });
  return createDmsRepositoryMimeAuthority(repository, {
    provider: {
      statObject: () => ({
        object_id: objectId,
        sha256: MIME_SHA256,
        byte_size: 586,
        mime_type: "message/rfc822",
      }),
      digestObject: () => ({
        object_id: objectId,
        sha256: MIME_SHA256,
        byte_size: 586,
      }),
    },
  });
}

async function insertPolicy(pool, {
  conversation_id: conversationId,
  policy_id: policyId,
  status,
  pause_reason = null,
  version = 1,
  revoked_at = null,
}) {
  const at = "2026-08-08T00:00:00.000Z";
  await withPostgresTransaction(pool, { tenant_id: TENANT }, async (client) => {
    await client.query(
      `INSERT INTO lawos_email_dms.conversation_policies
         (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,
          mailbox_ref,conversation_id,matter_id,seed_email_thread_id,
          seed_filing_receipt_ref,enabling_actor_id,status,pause_reason,
          version,created_at,updated_at,revoked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$3,$11,$12,$13,$14,$14,$15)`,
      [TENANT, policyId, OWNER, SUBJECT, CONNECTION, "a".repeat(64), conversationId,
        MATTER, THREAD, `outlook-email-file:${THREAD}:${MIME_SHA256}:dms`, status,
        pause_reason, version, at, revoked_at],
    );
  });
}

async function setup(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 4 });
  if (!fixture) return null;
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
    credential_ref: "aws-secrets-manager:synthetic/outm28-status-api",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  const matterRepository = createMatterRepository({ seedRecords: [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      client_id: "client-outm28-status-api",
      title: "OUTM-28 status",
      status: "open",
      created_by: OWNER,
      created_at: "2026-08-08T00:00:00.000Z",
      permission_envelope_id: "perm-outm28-status-api",
      audit_trace_id: "audit-outm28-status-api",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: MATTER,
      member_id: "member-outm28-status-api",
      user_id: OWNER,
      role: "associate",
      status: "active",
      permission_envelope_id: "perm-outm28-status-api",
      audit_trace_id: "audit-outm28-status-api",
    },
  ] });
  const dmsRepository = createDmsRepository();
  const thread = dmsRepository.create({
    ...createEmailThread({
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: THREAD,
      graph_message_id: "message-outm28-status-api",
      internet_message_id: "<message-outm28-status-api@example.test>",
      conversation_id: "conversation-outm28-enabled",
      subject: "OUTM-28 seed",
      account_ref: CONNECTION,
      mailbox_ref: "a".repeat(64),
      filed_document_ids: [`doc:${THREAD}:original-mime:${MIME_SHA256}`],
      filing_user: OWNER,
      filing_time: "2026-08-08T00:00:00.000Z",
    }),
    model_type: "DmsEmailThread",
  });
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-email-file:${THREAD}:${MIME_SHA256}:dms`,
    operation: "outlook_email_file",
    request_fingerprint: outlookEmailFileRequestFingerprint(thread),
    response: {
      outcome: "created",
      email_thread_id: THREAD,
      matter_id: MATTER,
      filed_document_ids: thread.filed_document_ids,
    },
    created_at: "2026-08-08T00:00:00.000Z",
  });
  dmsRepository.create({
    ...createEmailThread({
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: "thread-outm28-noncanonical",
      graph_message_id: "message-outm28-noncanonical",
      internet_message_id: "<message-outm28-noncanonical@example.test>",
      conversation_id: "conversation-outm28-noncanonical",
      subject: "noncanonical seed",
      account_ref: CONNECTION,
      filing_user: OWNER,
      filing_time: "2026-08-08T00:00:00.000Z",
      filed_document_ids: ["document-not-original-mime"],
    }),
    model_type: "DmsEmailThread",
  });
  const uploadRuntime = seedDurableOriginalMime(dmsRepository);

  await insertPolicy(fixture.appPool, { policy_id: "policy-outm28-active", conversation_id: CONVERSATIONS.active, status: "active" });
  await insertPolicy(fixture.appPool, { policy_id: "policy-outm28-paused", conversation_id: CONVERSATIONS.paused, status: "paused", pause_reason: "connection_expired", version: 2 });
  await insertPolicy(fixture.appPool, { policy_id: "policy-outm28-revoked", conversation_id: CONVERSATIONS.revoked, status: "revoked", pause_reason: "disabled", version: 3, revoked_at: "2026-08-08T00:10:00.000Z" });

  const policyService = createPostgresConversationPolicyService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    clock: () => new Date("2026-08-08T00:10:00.000Z"),
  });
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 8) }),
  });
  const conversationRuntime = {
    clock: () => new Date("2026-08-08T00:10:00.000Z"),
    readiness: readiness(),
    store,
    policy_service: policyService,
    subscription_service: { async reconcile() { return { outcome: "active" }; } },
  };
  return {
    fixture,
    runtime: {
      conversationRuntime,
      emailDmsRuntime: { repository: emailDmsRepository },
      matterRuntime: { repository: matterRepository },
      dmsRuntime: { repository: dmsRepository, upload_runtime: uploadRuntime },
    },
    emailDmsRepository,
    matterRepository,
    dmsRepository,
  };
}

function queryFor(conversationId, matterId = MATTER) {
  return {
    m365_connection_id: CONNECTION,
    matter_id: matterId,
    conversation_id: conversationId,
  };
}

function enableBody(overrides = {}) {
  return {
    m365_connection_id: CONNECTION,
    matter_id: MATTER,
    conversation_id: "conversation-outm28-enabled",
    seed_email_thread_id: THREAD,
    expected_version: 0,
    idempotency_key: "enable-outm28-status-api",
    ...overrides,
  };
}

test("OUTM-28 read status and authority are exact and redacted", async (t) => {
  const setupResult = await setup(t);
  if (!setupResult) return;
  const { runtime } = setupResult;
  for (const [status, conversationId] of Object.entries(CONVERSATIONS)) {
    const result = await request({ runtime, query: queryFor(conversationId) });
    assert.equal(result.status, 200, `${status}: ${JSON.stringify(result)}`);
    assert.equal(result.body.outcome, "passed");
    assert.equal(result.body.item.status, status);
    assert.deepEqual(Object.keys(result.body.item).sort(), [
      "conversation_id", "created_at", "matter_id", "pause_reason", "policy_id",
      "revoked_at", "status", "updated_at", "version",
    ]);
    assert.deepEqual(result.body.readiness, {
      authoritative: true,
      runtime_ready: true,
      auto_filing_enabled: true,
    });
    assert.equal(result.body.production_ready_claim, false);
    assert.equal(JSON.stringify(result.body).includes("user-outm28"), false);
    assert.equal(JSON.stringify(result.body).includes("subject-outm28"), false);
    assert.equal(JSON.stringify(result.body).includes("outlook-email-file"), false);
  }
  const absent = await request({ runtime, query: queryFor("conversation-outm28-absent") });
  assert.equal(absent.status, 200);
  assert.equal(absent.body.item, null);
  assert.deepEqual(absent.body.safe_error_codes, []);
  const intruder = await request({
    runtime,
    query: queryFor(CONVERSATIONS.active),
    context: {
      principal: { ...PRINCIPAL, user_id: "user-outm28-intruder", entra_subject_id: "subject-outm28-intruder" },
      rules: [{ id: "allow", effect: "allow", action: "*" }],
      object_acl: [],
    },
  });
  assert.equal(intruder.status, 403);
  assert.equal(intruder.body.item, null);
  const foreignMatter = await request({ runtime, query: queryFor(CONVERSATIONS.active, "matter-outm28-foreign") });
  assert.equal(foreignMatter.status, 403);
  assert.equal(foreignMatter.body.item, null);
  const unsupported = await request({ runtime, query: { ...queryFor(CONVERSATIONS.active), seed_email_thread_id: THREAD } });
  assert.equal(unsupported.status, 400);
  assert.deepEqual(unsupported.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_INVALID"]);
  const missingQuery = await request({ runtime, query: { m365_connection_id: CONNECTION, matter_id: MATTER } });
  assert.equal(missingQuery.status, 400);
  assert.deepEqual(missingQuery.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_INVALID"]);
  const bodyOnGet = await request({ runtime, query: queryFor(CONVERSATIONS.active), body: { tenant_id: TENANT } });
  assert.equal(bodyOnGet.status, 400);
  assert.deepEqual(bodyOnGet.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_INVALID"]);

  let policyReads = 0;
  const trackedRuntime = {
    ...runtime,
    conversationRuntime: {
      ...runtime.conversationRuntime,
      store: {
        ...runtime.conversationRuntime.store,
        async findConversationPolicy(...args) {
          policyReads += 1;
          return runtime.conversationRuntime.store.findConversationPolicy(...args);
        },
      },
    },
  };
  const noMatchingRule = await request({
    runtime: trackedRuntime,
    query: queryFor(CONVERSATIONS.active),
    context: { principal: PRINCIPAL, rules: [], object_acl: [] },
  });
  const objectAclDenied = await request({
    runtime: trackedRuntime,
    query: queryFor(CONVERSATIONS.active),
    context: {
      principal: PRINCIPAL,
      rules: [{ id: "allow", effect: "allow", action: "*" }],
      object_acl: [{
        id: "deny-conversation-status",
        effect: "deny",
        principal_id: OWNER,
        resource_id: CONVERSATIONS.active,
        action: "outlook:email:file",
      }],
    },
  });
  assert.equal(noMatchingRule.status, 403);
  assert.equal(objectAclDenied.status, 403);
  assert.deepEqual(noMatchingRule.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_AUTHORITY_DENIED"]);
  assert.deepEqual(objectAclDenied.body.safe_error_codes, noMatchingRule.body.safe_error_codes);
  assert.deepEqual(Object.keys(objectAclDenied.body).sort(), Object.keys(noMatchingRule.body).sort());
  assert.equal(noMatchingRule.body.item, null);
  assert.equal(objectAclDenied.body.item, null);
  assert.equal(policyReads, 0);

  const unrelatedAcl = await request({
    runtime: trackedRuntime,
    query: queryFor(CONVERSATIONS.active),
    context: {
      principal: PRINCIPAL,
      rules: [],
      object_acl: [{
        id: "allow-different-conversation",
        effect: "allow",
        principal_id: OWNER,
        resource_id: CONVERSATIONS.paused,
        action: "outlook:email:file",
      }],
    },
  });
  assert.equal(unrelatedAcl.status, 403);
  assert.equal(policyReads, 0);
  const matchingAcl = await request({
    runtime: trackedRuntime,
    query: queryFor(CONVERSATIONS.active),
    context: {
      principal: PRINCIPAL,
      rules: [],
      object_acl: [{
        id: "allow-current-conversation",
        effect: "allow",
        principal_id: OWNER,
        resource_id: CONVERSATIONS.active,
        action: "outlook:email:file",
      }],
    },
  });
  assert.equal(matchingAcl.status, 200);
  assert.equal(matchingAcl.body.item.status, "active");
  assert.equal(policyReads, 1);

  const connectionReads = { get: 0 };
  const matterReads = { get: 0, list: 0 };
  const deniedBeforeAuthority = await request({
    runtime: {
      ...runtime,
      emailDmsRuntime: {
        ...runtime.emailDmsRuntime,
        repository: trackedRepository(runtime.emailDmsRuntime.repository, connectionReads),
      },
      matterRuntime: {
        ...runtime.matterRuntime,
        repository: trackedRepository(runtime.matterRuntime.repository, matterReads),
      },
    },
    query: queryFor(CONVERSATIONS.active),
    context: { principal: PRINCIPAL, rules: [], object_acl: [] },
  });
  assert.equal(deniedBeforeAuthority.status, 403);
  assert.deepEqual(connectionReads, { get: 0 });
  assert.deepEqual(matterReads, { get: 0, list: 0 });
});

test("OUTM-28 runtime and mutation-service availability fail closed", async (t) => {
  const setupResult = await setup(t);
  if (!setupResult) return;
  const { runtime } = setupResult;
  const notReady = {
    ...runtime,
    conversationRuntime: {
      ...runtime.conversationRuntime,
      readiness: readiness({ worker_schedule_ready: false, auto_filing_enabled: false }),
    },
  };
  const visibleWhileNotReady = await request({ runtime: notReady, query: queryFor(CONVERSATIONS.active) });
  assert.equal(visibleWhileNotReady.status, 200);
  assert.equal(visibleWhileNotReady.body.item.status, "active");
  assert.deepEqual(visibleWhileNotReady.body.readiness, {
    authoritative: true,
    runtime_ready: false,
    auto_filing_enabled: false,
  });
  const unavailable = await request({
    runtime: { ...runtime, conversationRuntime: { ...runtime.conversationRuntime, store: undefined } },
    query: queryFor(CONVERSATIONS.active),
  });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"]);
  const missingConversationRuntime = await request({ runtime: { ...runtime, conversationRuntime: undefined }, query: queryFor(CONVERSATIONS.active) });
  assert.equal(missingConversationRuntime.status, 503);
  assert.deepEqual(missingConversationRuntime.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"]);
  const mutationServicesUnavailable = {
    ...runtime,
    conversationRuntime: {
      ...runtime.conversationRuntime,
      policy_service: undefined,
      subscription_service: undefined,
    },
  };
  const readOnly = await request({ runtime: mutationServicesUnavailable, query: queryFor(CONVERSATIONS.active) });
  assert.equal(readOnly.status, 200);
  assert.equal(readOnly.body.item.status, "active");
  assert.equal(JSON.stringify(readOnly.body).includes("user-outm28"), false);
  const enableUnavailable = await request({ runtime: mutationServicesUnavailable, method: "POST", body: enableBody(), query: {} });
  assert.equal(enableUnavailable.status, 503);
  assert.deepEqual(enableUnavailable.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"]);
  const revokeUnavailable = await request({
    runtime: mutationServicesUnavailable,
    method: "POST",
    pathname: "/api/outlook/conversation-policies/policy-outm28-active/revoke",
    body: { m365_connection_id: CONNECTION, matter_id: MATTER, expected_version: 1, reason: "disabled", idempotency_key: "revoke-outm28-no-policy-service" },
    query: {},
  });
  assert.equal(revokeUnavailable.status, 503);
  assert.deepEqual(revokeUnavailable.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"]);
  const blockedEnable = await request({ runtime: notReady, method: "POST", body: enableBody({ idempotency_key: "enable-outm28-not-ready" }), query: {} });
  assert.equal(blockedEnable.status, 503);
  assert.deepEqual(blockedEnable.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_NOT_READY"]);
});

test("OUTM-28 seed derivation rejects forged and noncanonical filings without writes", async (t) => {
  const setupResult = await setup(t);
  if (!setupResult) return;
  const { runtime } = setupResult;
  const forged = await request({
    runtime,
    method: "POST",
    body: enableBody({ seed_filing_receipt_ref: "forged-seed", idempotency_key: "enable-outm28-forged" }),
    query: {},
  });
  assert.equal(forged.status, 403);
  assert.equal(forged.body.item, null);
  const forgedReadback = await request({ runtime, query: queryFor("conversation-outm28-enabled") });
  assert.equal(forgedReadback.status, 200);
  assert.equal(forgedReadback.body.item, null);
  const noncanonical = await request({
    runtime,
    method: "POST",
    body: enableBody({
      conversation_id: "conversation-outm28-noncanonical",
      seed_email_thread_id: "thread-outm28-noncanonical",
      idempotency_key: "enable-outm28-noncanonical",
    }),
    query: {},
  });
  assert.equal(noncanonical.status, 403);
  assert.equal(noncanonical.body.item, null);
  const noncanonicalReadback = await request({ runtime, query: queryFor("conversation-outm28-noncanonical") });
  assert.equal(noncanonicalReadback.status, 200);
  assert.equal(noncanonicalReadback.body.item, null);

  const metadataOnly = await request({
    runtime: {
      ...runtime,
      dmsRuntime: {
        ...runtime.dmsRuntime,
        upload_runtime: { async getDocumentIntegrityState() { return null; } },
      },
    },
    method: "POST",
    body: enableBody({ idempotency_key: "enable-outm28-metadata-only" }),
    query: {},
  });
  assert.equal(metadataOnly.status, 403);
  assert.equal(metadataOnly.body.item, null);
  const metadataOnlyReadback = await request({ runtime, query: queryFor("conversation-outm28-enabled") });
  assert.equal(metadataOnlyReadback.status, 200);
  assert.equal(metadataOnlyReadback.body.item, null);

  const seedReads = { get: 0, getIdempotency: 0 };
  const invalidConnection = await request({
    runtime: {
      ...runtime,
      dmsRuntime: {
        ...runtime.dmsRuntime,
        repository: trackedRepository(runtime.dmsRuntime.repository, seedReads),
      },
    },
    method: "POST",
    body: enableBody({
      m365_connection_id: "connection-outm28-invalid",
      idempotency_key: "enable-outm28-invalid-connection",
    }),
    query: {},
  });
  assert.equal(invalidConnection.status, 403);
  assert.deepEqual(seedReads, { get: 0, getIdempotency: 0 });
});

test("OUTM-28 enable derives the seed and rejects poisoned reasons", async (t) => {
  const setupResult = await setup(t);
  if (!setupResult) return;
  const { runtime } = setupResult;
  const malformed = await request({
    runtime,
    method: "POST",
    body: enableBody({ reason: "valid prefix\npoison", idempotency_key: "enable-outm28-malformed-reason" }),
    query: {},
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_INVALID"]);
  const malformedReadback = await request({ runtime, query: queryFor("conversation-outm28-enabled") });
  assert.equal(malformedReadback.status, 200);
  assert.equal(malformedReadback.body.item, null);
  const enabled = await request({ runtime, method: "POST", body: enableBody(), query: {} });
  assert.equal(enabled.status, 201, JSON.stringify(enabled));
  assert.equal(enabled.body.item.status, "active");
  assert.equal(enabled.body.subscription_sync, "synchronized");
  assert.deepEqual(enabled.body.safe_error_codes, []);
  assert.equal(Object.hasOwn(enabled.body.item, "seed_filing_receipt_ref"), false);
});

test("OUTM-28 revoke is reason-safe and fails closed without subscription reconciliation", async (t) => {
  const setupResult = await setup(t);
  if (!setupResult) return;
  const { runtime } = setupResult;
  const malformed = await request({
    runtime,
    method: "POST",
    pathname: "/api/outlook/conversation-policies/policy-outm28-active/revoke",
    body: { m365_connection_id: CONNECTION, matter_id: MATTER, expected_version: 1, reason: "disabled\u0007", idempotency_key: "revoke-outm28-malformed-reason" },
    query: {},
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_INVALID"]);
  const malformedReadback = await request({ runtime, query: queryFor(CONVERSATIONS.active) });
  assert.equal(malformedReadback.status, 200);
  assert.equal(malformedReadback.body.item.status, "active");
  assert.equal(malformedReadback.body.item.pause_reason, null);
  const subscriptionUnavailable = {
    ...runtime,
    conversationRuntime: { ...runtime.conversationRuntime, subscription_service: undefined },
  };
  const revoked = await request({
    runtime: subscriptionUnavailable,
    method: "POST",
    pathname: "/api/outlook/conversation-policies/policy-outm28-active/revoke",
    body: { m365_connection_id: CONNECTION, matter_id: MATTER, expected_version: 1, reason: "disabled", idempotency_key: "revoke-outm28-no-subscription-service" },
    query: {},
  });
  assert.equal(revoked.status, 503, JSON.stringify(revoked));
  assert.equal(revoked.body.item, null);
  assert.deepEqual(revoked.body.safe_error_codes, ["OUTLOOK_CONVERSATION_POLICY_RUNTIME_UNAVAILABLE"]);
  const readback = await request({ runtime, query: queryFor(CONVERSATIONS.active) });
  assert.equal(readback.status, 200);
  assert.equal(readback.body.item.status, "active");
});
