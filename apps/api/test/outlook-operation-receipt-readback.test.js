import assert from "node:assert/strict";
import test from "node:test";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant_receipt_readback_test";
const MATTER = "matter_receipt_readback_test";
const ACTOR = "user_receipt_readback_test";
const ENTRA = "entra_receipt_readback_test";
const MAILBOX = "readback@amic.kr";
const REST_ID = "rest-readback-a";
const CANONICAL_ID = "immutable:readback-a";
const INTERNET_ID = "<readback-a@amic.law>";
const CONVERSATION_ID = "conversation-readback-a";
const THREAD_ID = "thread:readback-a";

function runtimeFixture() {
  const matterRepository = createMatterRepository({ seedRecords: [{
    model_type: "Matter",
    tenant_id: TENANT,
    matter_id: MATTER,
    status: "open",
    title: "Readback Matter",
    client_id: "client:readback",
    created_by: ACTOR,
    created_at: "2026-08-08T00:00:00.000Z",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }, {
    model_type: "MatterTimelineEvent",
    tenant_id: TENANT,
    matter_id: MATTER,
    event_id: "timeline:readback-a",
    resource_id: "timeline:readback-a",
    occurred_at: "2026-08-08T00:00:00.000Z",
    type: "outlook.email.filed",
    title: "redacted title",
    source_ref: THREAD_ID,
  }] });
  const dmsRepository = createDmsRepository({ seedRecords: [{
    model_type: "DmsEmailThread",
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD_ID,
    graph_message_id: CANONICAL_ID,
    internet_message_id: INTERNET_ID,
    conversation_id: CONVERSATION_ID,
    status: "active",
    filing_time: "2026-08-08T00:00:00.000Z",
    filed_document_ids: ["document:readback-a"],
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
    subject: "never returned subject",
    body_preview: "never returned body",
  }, {
    model_type: "DmsDocument",
    tenant_id: TENANT,
    matter_id: MATTER,
    document_id: "document:readback-a",
    title: "never returned document title",
    workspace_id: "workspace:readback",
    status: "active",
    source_email_thread_id: THREAD_ID,
    current_version_id: "version:readback-a",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }] });
  const emailDmsRepository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: ACTOR }),
    tenant_id: TENANT,
    user_id: ACTOR,
    entra_subject_id: ENTRA,
    mailbox_address_hash: hashMailboxAddress(MAILBOX),
    credential_ref: "aws-secrets-manager:synthetic/readback-test",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: "2026-08-07T00:00:00.000Z",
    expires_at: "2026-08-09T00:00:00.000Z",
    revoked_at: null,
    state_version: 1,
  }] });
  const context = {
    principal: {
      tenant_id: TENANT,
      user_id: ACTOR,
      actor_id: ACTOR,
      entra_subject_id: ENTRA,
      scopes: ["matter.read"],
    },
    rules: [{ id: "readback-allow", effect: "allow", action: "*" }],
    object_acl: [],
  };
  const runtime = {
    matterRuntime: { repository: matterRepository },
    dmsRuntime: { repository: dmsRepository },
    emailDmsRuntime: { repository: emailDmsRepository },
    m365GraphConfig: {
      feature_enabled: true,
      inquiry_feature_enabled: true,
      provider_runtime_enabled: true,
      credential_vault: {
        async resolveDelegatedCredential() {
          return {
            access_token: "never-return-token",
            refresh_token: "never-return-refresh",
            mailbox_address: MAILBOX,
            refresh_profile: "client",
            refresh_profile_proof: "r".repeat(43),
            expires_at: "2026-08-09T00:00:00.000Z",
          };
        },
        async storeDelegatedCredential() { return "aws-secrets-manager:synthetic/readback-next"; },
        async deleteDelegatedCredential() {},
        referenceForGeneration() { return "aws-secrets-manager:synthetic/readback-next"; },
      },
      provider: {
        async getMeMessageMime() {
          return {
            mime_bytes: Buffer.from("MIME bytes never returned"),
            immutable_message_id: CANONICAL_ID,
            internet_message_id: INTERNET_ID,
            message_metadata: {
              conversation_id: CONVERSATION_ID,
              internet_message_id: INTERNET_ID,
              subject: "provider subject never returned",
            },
          };
        },
      },
    },
  };
  return { context, runtime, matterRepository, dmsRepository };
}

function readbackBody(overrides = {}) {
  return {
    matter_id: MATTER,
    item: {
      rest_message_id: REST_ID,
      canonical_graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID,
      conversation_id: CONVERSATION_ID,
      mode: "read",
      provenance: "received",
      ...overrides,
    },
  };
}

test("operation receipt readback revalidates identity, returns only durable safe refs, and is read-only", async () => {
  const fixture = runtimeFixture();
  const beforeIdempotency = fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length;
  const response = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-a",
    context: fixture.context,
    runtime: fixture.runtime,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "passed");
  assert.equal(response.body.items.length, 1);
  const summary = response.body.items[0];
  assert.deepEqual(Object.keys(summary).sort(), [
    "completed_at",
    "document_ids",
    "email_thread_id",
    "item_context_ref",
    "matter_id",
    "operation",
    "outcome",
    "timeline_event_ids",
  ]);
  assert.match(summary.item_context_ref, /^item-context:[a-f0-9]{16}$/u);
  assert.deepEqual(summary.document_ids, ["document:readback-a"]);
  assert.deepEqual(summary.timeline_event_ids, ["timeline:readback-a"]);
  assert.doesNotMatch(JSON.stringify(response.body), /subject|body|participant|MIME|token|storage/u);
  assert.equal(fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length, beforeIdempotency);
});

test("operation receipt readback returns safe empty for provider identity mismatch and permission denial", async () => {
  const fixture = runtimeFixture();
  const mismatch = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody({ internet_message_id: "<wrong@amic.law>" }),
    requestId: "request:readback-mismatch",
    context: fixture.context,
    runtime: fixture.runtime,
  });
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.body.outcome, "empty");
  assert.deepEqual(mismatch.body.items, []);
  assert.equal("denied_count" in mismatch.body, false);

  const denied = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-denied",
    context: { ...fixture.context, rules: [{ id: "deny", effect: "deny", action: "*" }] },
    runtime: fixture.runtime,
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.outcome, "denied");
  assert.equal("denied_count" in denied.body, false);
  assert.deepEqual(denied.body.items ?? null, null);
});
