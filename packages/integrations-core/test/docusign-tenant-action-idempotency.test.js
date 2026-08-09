import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  DOCX_MIME_TYPE,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
  createPostgresDocusignEnvelopeRepository,
} from "../src/index.js";

const BYTES = Buffer.from("tenant-scoped-action-idempotency");
const SHA = createHash("sha256").update(BYTES).digest("hex");

function tenantFixture(tenantId) {
  const matterId = `matter-${tenantId}`;
  const authority = Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    workspace_id: `workspace-${tenantId}`,
    artifact_id: `artifact-${tenantId}`,
    document_id: `document-${tenantId}`,
    version_id: `version-${tenantId}`,
    sha256: SHA,
    approval_receipt_ref: `approval-${tenantId}`,
    permission_envelope_id: `permission-${tenantId}`,
    audit_trace_id: `audit-${tenantId}`,
  });
  return Object.freeze({
    tenantId,
    matterId,
    actorId: `actor-${tenantId}`,
    connection: Object.freeze({
      tenant_id: tenantId,
      connection_id: `connection-${tenantId}`,
      account_id: `account-${tenantId}`,
      base_uri: "https://demo.docusign.net",
      credential_refs: Object.freeze({
        integration_key: "aws-secrets-manager:/lawos/docusign/key",
        service_user_id: "aws-secrets-manager:/lawos/docusign/user",
        private_key: "aws-secrets-manager:/lawos/docusign/private",
      }),
    }),
    source: Object.freeze({
      authority,
      document: Object.freeze({
        ...authority,
        filename: `${tenantId}.docx`,
        mime_type: DOCX_MIME_TYPE,
        template_version: "template-v1",
        template_sha256: "a".repeat(64),
        input_sha256: "b".repeat(64),
        immutable: true,
        finalized: true,
        owner_approved: true,
      }),
      recipients: Object.freeze([{ recipient_ref: `recipient-${tenantId}`, role: "client", routing_order: 1 }]),
      anchor_manifest: Object.freeze({ anchors: Object.freeze([{ role: "client", anchor: "/client-signature/" }]) }),
    }),
  });
}

const TENANT_A = tenantFixture("tenant-action-a");
const TENANT_B = tenantFixture("tenant-action-b");
const FIXTURES = new Map([[TENANT_A.tenantId, TENANT_A], [TENANT_B.tenantId, TENANT_B]]);

function service(repository, counters) {
  return createDocusignEnvelopeService({
    repository,
    clock: () => "2026-08-09T01:00:00.000Z",
    connectionResolver: async ({ tenant_id }) => FIXTURES.get(tenant_id).connection,
    approvedDocumentResolver: async ({ tenant_id }) => FIXTURES.get(tenant_id).source,
    artifactReader: async (binding) => ({ ...binding, bytes: BYTES }),
    recipientResolver: async ({ tenant_id, recipient_ref }) => ({ tenant_id, recipient_ref, name: "Signer", email: "signer@example.test" }),
    adapter: Object.freeze({
      async createDraft({ connection }) {
        counters.create.push(connection.tenant_id);
        return { envelope_id: `envelope-${connection.tenant_id}` };
      },
      async send({ connection }) {
        counters.send.push(connection.tenant_id);
        return { status: "sent" };
      },
      async findByCorrelation({ connection, provider_correlation_ref }) {
        counters.find.push(connection.tenant_id);
        return {
          envelope_id: `reconciled-${connection.tenant_id}`,
          provider_correlation_ref,
          account_id: connection.account_id,
          status: "created",
        };
      },
    }),
  });
}

async function queue(outbox, fixture, requestId) {
  return outbox.queueApprovedRequest({
    principal: { tenant_id: fixture.tenantId, actor_id: fixture.actorId },
    request_id: requestId,
    tenant_id: fixture.tenantId,
    matter_id: fixture.matterId,
    connection_id: fixture.connection.connection_id,
    approved_artifact_id: fixture.source.document.artifact_id,
    idempotency_key: `queue:${fixture.tenantId}:${requestId}`,
    explicit_human_action: true,
    authority_binding: fixture.source.authority,
  });
}

function actionInput(fixture, requestId, key) {
  return {
    principal: { tenant_id: fixture.tenantId, actor_id: fixture.actorId },
    request_id: requestId,
    action_idempotency_key: key,
    explicit_human_action: true,
  };
}

test("OUTM-33 file action keys are tenant-scoped across send restart and same-tenant mismatch", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-tenant-action-send-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const counters = { create: [], send: [], find: [] };
  const first = service(createDocusignEnvelopeRepository({ filePath }), counters);
  await queue(first, TENANT_A, "request-a");
  await queue(first, TENANT_B, "request-b");
  assert.equal((await first.sendApprovedRequest(actionInput(TENANT_A, "request-a", "shared-send-key"))).outcome, "sent");

  const restarted = service(createDocusignEnvelopeRepository({ filePath }), counters);
  assert.equal((await restarted.sendApprovedRequest(actionInput(TENANT_B, "request-b", "shared-send-key"))).outcome, "sent");
  assert.equal((await restarted.sendApprovedRequest(actionInput(TENANT_B, "request-b", "shared-send-key"))).outcome, "sent");
  await assert.rejects(
    restarted.reconcileRequest(actionInput(TENANT_B, "request-b", "shared-send-key")),
    (error) => error?.safe_error_code === "DOCUSIGN_ACTION_IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(counters, { create: [TENANT_A.tenantId, TENANT_B.tenantId], send: [TENANT_A.tenantId, TENANT_B.tenantId], find: [] });
});

test("OUTM-33 file reconcile keys are tenant-scoped across restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-tenant-action-reconcile-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  const counters = { create: [], send: [], find: [] };
  const first = service(createDocusignEnvelopeRepository({ filePath }), counters);
  await queue(first, TENANT_A, "reconcile-a");
  await queue(first, TENANT_B, "reconcile-b");
  for (const fixture of [TENANT_A, TENANT_B]) {
    await first.repository.transact({ tenant_id: fixture.tenantId }, (state) => {
      const index = state.requests.findIndex((entry) => entry.tenant_id === fixture.tenantId);
      state.requests[index] = { ...state.requests[index], state: "reconciliation_required", attempt_phase: "create_failed", operation_lease: null };
    });
  }
  assert.equal((await first.reconcileRequest(actionInput(TENANT_A, "reconcile-a", "shared-reconcile-key"))).outcome, "reconciled");
  const restarted = service(createDocusignEnvelopeRepository({ filePath }), counters);
  assert.equal((await restarted.reconcileRequest(actionInput(TENANT_B, "reconcile-b", "shared-reconcile-key"))).outcome, "reconciled");
  assert.deepEqual(counters.find, [TENANT_A.tenantId, TENANT_B.tenantId]);
});

test("OUTM-33 PostgreSQL action keys preserve tenant parity and same-tenant conflicts", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const counters = { create: [], send: [], find: [] };
  const outbox = service(createPostgresDocusignEnvelopeRepository({ pool: postgres.appPool }), counters);
  await queue(outbox, TENANT_A, "pg-a");
  await queue(outbox, TENANT_B, "pg-b");
  await outbox.sendApprovedRequest(actionInput(TENANT_A, "pg-a", "shared-pg-key"));
  const restarted = service(createPostgresDocusignEnvelopeRepository({ pool: postgres.appPool }), counters);
  await restarted.sendApprovedRequest(actionInput(TENANT_B, "pg-b", "shared-pg-key"));
  await assert.rejects(
    restarted.reconcileRequest(actionInput(TENANT_B, "pg-b", "shared-pg-key")),
    (error) => error?.safe_error_code === "DOCUSIGN_ACTION_IDEMPOTENCY_CONFLICT",
  );
  assert.deepEqual(counters.create, [TENANT_A.tenantId, TENANT_B.tenantId]);
});
