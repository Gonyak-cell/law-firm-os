import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import {
  DOCUSIGN_CONNECT_SIGNATURE_HEADER,
  DOCX_MIME_TYPE,
  createDocusignEnvelopeEventService,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../../../packages/integrations-core/src/index.js";
import {
  DOCUSIGN_OUTLOOK_REQUESTS_PATH,
  DOCUSIGN_WEBHOOK_PATH,
  createDocusignCompletionArtifactStore,
} from "../src/docusign-api.js";
import { createDocusignFailClosedRuntime } from "../src/docusign-runtime.js";
import { createApiServer } from "../src/server.js";

const TENANT = "tenant-api";
const MATTER = "matter-api";
const ACTOR = "actor-api";
const HMAC_SECRET = "test-only-docusign-connect-secret";
const DOCUMENT_BYTES = Buffer.from("approved-docusign-source");
const DOCUMENT_SHA = createHash("sha256").update(DOCUMENT_BYTES).digest("hex");
const APPROVED_ARTIFACT_ID = "builder-artifact-api";
const AUTHORITY_BINDING = Object.freeze({
  tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api",
  artifact_id: APPROVED_ARTIFACT_ID, document_id: "document-api", version_id: "version-api",
  sha256: DOCUMENT_SHA, approval_receipt_ref: "approval-api",
});
const CONNECTION = Object.freeze({
  tenant_id: TENANT,
  connection_id: "docusign-primary",
  account_id: "account-api",
  base_uri: "https://demo.docusign.net",
  credential_refs: {
    integration_key: "aws-secrets-manager:/lawos/docusign/integration-key",
    service_user_id: "aws-secrets-manager:/lawos/docusign/service-user",
    private_key: "aws-secrets-manager:/lawos/docusign/private-key",
  },
  hmac_secret_ref: "aws-secrets-manager:/lawos/docusign/connect-hmac",
});

function sessionAuth() {
  const principal = Object.freeze({ tenant_id: TENANT, user_id: ACTOR, role_ids: ["lawos_staff"] });
  return Object.freeze({
    capabilities: Object.freeze({}),
    async resolvePermissionContextFromHeaders() {
      return Object.freeze({
        ok: true,
        principal,
        context: Object.freeze({ principal, rules: [], object_acl: [] }),
        token_payload: Object.freeze({ surface: "outlook_addin" }),
      });
    },
  });
}

async function docusignRuntime({ authorizeMatter = async () => ({ allowed: true, authority_binding: AUTHORITY_BINDING }), prepare = true, webhookRequestResolver } = {}) {
  const repository = createDocusignEnvelopeRepository();
  const adapter = {
    createDraft: async () => ({ envelope_id: "envelope-api" }),
    send: async () => ({ status: "sent" }),
    getStatus: async () => ({ status: "delivered" }),
    downloadDocument: async ({ document_id }) => Buffer.from(`pdf-${document_id}`),
  };
  const connectionResolver = async () => CONNECTION;
  const envelopeService = createDocusignEnvelopeService({
    repository,
    connectionResolver,
    approvedDocumentResolver: async () => ({
      authority: AUTHORITY_BINDING,
      document: {
        artifact_id: APPROVED_ARTIFACT_ID,
        document_id: "document-api",
        version_id: "version-api",
        sha256: DOCUMENT_SHA,
        filename: "agreement.docx",
        mime_type: DOCX_MIME_TYPE,
        workspace_id: "workspace-api",
        permission_envelope_id: "permission-api",
        audit_trace_id: "audit-api",
        template_version: "template-v1",
        template_sha256: "b".repeat(64),
        input_sha256: "c".repeat(64),
        approval_receipt_ref: "approval-api",
        immutable: true,
        finalized: true,
        owner_approved: true,
      },
      recipients: [{ recipient_ref: "contact-api", role: "client", routing_order: 1 }],
      anchor_manifest: { anchors: [{ role: "client", anchor: "/client-signature/" }] },
    }),
    artifactReader: async (binding) => ({ ...binding, bytes: DOCUMENT_BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
    adapter,
    clock: () => "2026-08-08T02:00:00.000Z",
  });
  if (prepare) await envelopeService.queueApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: ACTOR },
    request_id: "request-api",
    tenant_id: TENANT,
    matter_id: MATTER,
    connection_id: CONNECTION.connection_id,
    idempotency_key: "send-api",
    approved_artifact_id: APPROVED_ARTIFACT_ID,
    explicit_human_action: true,
    authority_binding: AUTHORITY_BINDING,
  });
  if (prepare) await envelopeService.sendApprovedRequest({
    principal: { tenant_id: TENANT, actor_id: ACTOR },
    request_id: "request-api",
    explicit_human_action: true,
  });
  const eventService = createDocusignEnvelopeEventService({
    repository,
    connectionResolver,
    webhookRequestResolver,
    resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? HMAC_SECRET : null,
    adapter,
    receiptStore: {
      async put(input) {
        return { receipt_ref: `receipt:${input.sha256}`, sha256: input.sha256, immutable: true };
      },
    },
    artifactStore: {
      async ingest(input) {
        return { document_id: `dms:${input.kind}`, version_id: `version:${input.kind}`, sha256: input.sha256, immutable: true };
      },
    },
    clock: () => "2026-08-08T02:05:00.000Z",
  });
  return Object.freeze({ repository, envelope_service: envelopeService, event_service: eventService, authorizeMatter });
}

async function withServer(runtime, callback) {
  const server = createApiServer({
    hrxRuntime: null,
    masterDataRuntime: null,
    matterRuntime: null,
    dmsRuntime: null,
    emailDmsRuntime: null,
    crmIntakeRuntime: null,
    financeRuntime: null,
    analyticsRuntime: null,
    aiRuntime: null,
    portalRuntime: null,
    uiReadinessRuntime: null,
    homeDashboardRuntime: null,
    enterpriseReadinessRuntime: null,
    docusignRuntime: runtime,
    sessionAuth: sessionAuth(),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  }
}

function connectBody(status = "delivered") {
  return Buffer.from(JSON.stringify({
    event: `envelope-${status}`,
    generatedDateTime: "2026-08-08T02:05:00.000Z",
    data: {
      accountId: CONNECTION.account_id,
      envelopeId: "envelope-api",
      envelopeSummary: { status, statusChangedDateTime: "2026-08-08T02:05:00.000Z" },
    },
  }));
}

test("OUTM-34 HTTP webhook preserves raw bytes for HMAC and rejects an altered signature before auth", async () => {
  const runtime = await docusignRuntime();
  await withServer(runtime, async (baseUrl) => {
    const body = connectBody();
    const goodSignature = createHmac("sha256", HMAC_SECRET).update(body).digest("base64");
    const denied = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: createHmac("sha256", HMAC_SECRET).update(Buffer.from("other")).digest("base64") },
      body,
    });
    assert.equal(denied.status, 401);
    assert.deepEqual((await denied.json()).safe_error_codes, ["DOCUSIGN_WEBHOOK_REJECTED"]);
    assert.equal(runtime.repository.loadState().requests[0].state, "sent");

    const accepted = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: goodSignature },
      body,
    });
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 202, JSON.stringify(acceptedBody));
    assert.deepEqual([acceptedBody.outcome, acceptedBody.state], ["processed", "delivered"]);
    assert.equal(acceptedBody.provider_payload_returned, false);
  });
});

test("OUTM-34 HTTP webhook fails closed when a same-account locator returns another envelope", async () => {
  let located;
  const runtime = await docusignRuntime({ webhookRequestResolver: async () => located });
  const state = runtime.repository.loadState();
  const requestA = state.requests[0];
  const requestB = {
    ...requestA,
    request_id: "request-api-other",
    envelope_id: "envelope-api-other",
    idempotency_key: "send-api-other",
    payload_sha256: "d".repeat(64),
    provider_correlation_ref: "docusign-correlation:request-api-other",
    event_hashes: [],
  };
  runtime.repository.replaceState({ ...state, requests: [requestA, requestB] });
  located = runtime.repository.loadState().requests[1];
  const before = runtime.repository.loadState();
  await withServer(runtime, async (baseUrl) => {
    const body = connectBody("delivered");
    const signature = createHmac("sha256", HMAC_SECRET).update(body).digest("base64");
    const response = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: signature },
      body,
    });
    const responseBody = await response.json();
    assert.equal(response.status, 401, JSON.stringify(responseBody));
    assert.deepEqual(responseBody.safe_error_codes, ["DOCUSIGN_WEBHOOK_REJECTED"]);
    assert.equal(responseBody.provider_payload_returned, undefined);
  });
  assert.deepEqual(runtime.repository.loadState(), before);
});

test("OUTM-34 Outlook read route requires Matter authorization and returns no provider identifiers", async () => {
  const allowedRuntime = await docusignRuntime();
  await withServer(allowedRuntime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, {
      headers: { authorization: "Bearer outlook-session" },
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].state, "sent");
    assert.doesNotMatch(JSON.stringify(body), /account-api|demo\.docusign|envelope-api|aws-secrets-manager|tenant-api/u);
  });

  const deniedRuntime = await docusignRuntime({ authorizeMatter: async () => false });
  await withServer(deniedRuntime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, {
      headers: { authorization: "Bearer outlook-session" },
    });
    assert.equal(response.status, 403);
    assert.deepEqual((await response.json()).safe_error_codes, ["DOCUSIGN_MATTER_ACCESS_DENIED"]);
  });
});

test("OUTM-33 HTTP queue and send routes require authz, idempotency and explicit human action", async () => {
  const runtime = await docusignRuntime({ prepare: false });
  await withServer(runtime, async (baseUrl) => {
    const denied = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, {
      method: "POST",
      headers: { authorization: "Bearer outlook-session", "content-type": "application/json" },
      body: JSON.stringify({ matter_id: MATTER }),
    });
    assert.equal(denied.status, 400);
    assert.equal((await denied.json()).detail_exposed, false);

    const queued = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, {
      method: "POST",
      headers: { authorization: "Bearer outlook-session", "content-type": "application/json" },
      body: JSON.stringify({
        request_id: "request-api-http", matter_id: MATTER, connection_id: CONNECTION.connection_id,
        approved_artifact_id: APPROVED_ARTIFACT_ID, idempotency_key: "queue-api-http", explicit_human_action: true,
      }),
    });
    const queuedBody = await queued.json();
    assert.equal(queued.status, 201, JSON.stringify(queuedBody));
    assert.equal(queuedBody.item.state, "approved");

    const crossMatter = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-http/send`, {
      method: "POST",
      headers: { authorization: "Bearer outlook-session", "content-type": "application/json" },
      body: JSON.stringify({ matter_id: "matter-other", idempotency_key: "send-cross-matter", explicit_human_action: true }),
    });
    const crossMatterBody = await crossMatter.json();
    assert.equal(crossMatter.status, 404);
    assert.deepEqual(crossMatterBody.safe_error_codes, ["DOCUSIGN_REQUEST_NOT_FOUND"]);

    const sent = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-http/send`, {
      method: "POST",
      headers: { authorization: "Bearer outlook-session", "content-type": "application/json" },
      body: JSON.stringify({ matter_id: MATTER, idempotency_key: "send-api-http", explicit_human_action: true }),
    });
    const sentBody = await sent.json();
    assert.equal(sent.status, 200, JSON.stringify(sentBody));
    assert.equal(sentBody.item.state, "sent");
    assert.doesNotMatch(JSON.stringify(sentBody), /account-api|demo\.docusign|aws-secrets-manager/u);
  });
});

test("OUTM-33 server default fail-closed authority reaches the live route with zero outbox rows", async () => {
  const runtime = createDocusignFailClosedRuntime({
    authorizeMatter: async () => ({ allowed: true, authority_binding: AUTHORITY_BINDING }),
  });
  await withServer(runtime, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    const healthBody = await health.json();
    assert.deepEqual([health.status, healthBody.docusign.status, healthBody.docusign.worker_injected], [200, "blocked", true]);
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, {
      method: "POST",
      headers: { authorization: "Bearer outlook-session", "content-type": "application/json" },
      body: JSON.stringify({
        request_id: "request-blocked-http", matter_id: MATTER, connection_id: CONNECTION.connection_id,
        approved_artifact_id: APPROVED_ARTIFACT_ID, idempotency_key: "queue-blocked-http", explicit_human_action: true,
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.deepEqual(body.safe_error_codes, ["DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED"]);
    assert.equal(body.detail_exposed, false);
    assert.equal(runtime.repository.loadState().requests.length, 0);
  });
});

test("OUTM-34 repository and secret outages are retryable redacted 503 responses", async () => {
  const readRuntime = {
    envelope_service: { listRequests: async () => { throw new Error("postgresql://user:raw-password@host/db"); } },
    authorizeMatter: async () => true,
  };
  await withServer(readRuntime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, { headers: { authorization: "Bearer outlook-session" } });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.detail_exposed, false);
    assert.doesNotMatch(JSON.stringify(body), /raw-password|postgresql/u);
  });
});

test("OUTM-34 DMS completion boundary writes an idempotent immutable PDF version with matching SHA", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-dms-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repository = createDmsRepository();
  const storage = createFileStorageAdapter({ rootPath: join(dir, "objects") });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository, storage } });
  const bytes = Buffer.from("signed-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const input = {
    tenant_id: TENANT,
    matter_id: MATTER,
    workspace_id: "workspace-api",
    permission_envelope_id: "permission-api",
    audit_trace_id: "audit-api",
    requested_by_actor_id: ACTOR,
    request_id: "request-api",
    envelope_id: "envelope-api",
    kind: "signed_pdf",
    title: "agreement - signed.pdf",
    mime_type: "application/pdf",
    bytes,
    sha256: digest,
  };
  const first = await artifactStore.ingest(input);
  const replay = await artifactStore.ingest(input);
  assert.deepEqual(first, replay);
  assert.equal(first.immutable, true);
  assert.equal(first.sha256, digest);
  const versions = repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion", document_id: first.document_id });
  assert.equal(versions.length, 1);
  assert.equal(versions[0].sha256, digest);
  assert.equal(storage.getObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:${first.document_id}:${first.version_id}` }).sha256, digest);
});
