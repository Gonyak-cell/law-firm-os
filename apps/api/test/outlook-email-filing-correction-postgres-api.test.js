import assert from "node:assert/strict";
import test from "node:test";
import {
  DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
  DMS_SPECIALIZED_AUTHORITY_RECORD_TYPES,
} from "../../../packages/dms/src/central-ledger.js";
import { createOriginalEmailFilingPlacement } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import {
  PG_CORRECTION_ACTOR,
  PG_DOCUMENT,
  PG_FILE_OBJECT,
  PG_MATTER_A,
  PG_MATTER_B,
  PG_MIME_SHA256,
  PG_ORIGINAL_ACTOR,
  PG_ORIGINAL_AT,
  PG_OTHER_TENANT,
  PG_RECEIPT,
  PG_TENANT,
  PG_THREAD,
  PG_VERSION,
  correctionContext,
  createPostgresCorrectionFixture,
  runCorrectionRequest,
} from "./helpers/outlook-email-filing-correction-postgres-fixture.js";

const CURRENT_PATH = "/api/outlook/email/corrections/current";
const CORRECTION_PATH = "/api/outlook/email/corrections";

function originalFiling() {
  return {
    tenant_id: PG_TENANT,
    email_thread_id: PG_THREAD,
    document_id: PG_DOCUMENT,
    mime_sha256: PG_MIME_SHA256,
    original_receipt_id: PG_RECEIPT,
    matter_id: PG_MATTER_A,
    actor_id: PG_ORIGINAL_ACTOR,
    occurred_at: PG_ORIGINAL_AT,
  };
}

function correctionBody(current, overrides = {}) {
  return {
    email_thread_id: PG_THREAD,
    original_receipt_id: PG_RECEIPT,
    document_id: PG_DOCUMENT,
    mime_sha256: PG_MIME_SHA256,
    source_matter_id: PG_MATTER_A,
    target_matter_id: PG_MATTER_B,
    expected_placement_id: current.placement_id,
    reason: "PostgreSQL production authority correction",
    idempotency_key: "outm21-pg-a-to-b",
    ...overrides,
  };
}

function getCurrent(fixture, options = {}) {
  return runCorrectionRequest(fixture, {
    method: "GET",
    pathname: CURRENT_PATH,
    query: { email_thread_id: PG_THREAD },
    requestId: "req-outm21-pg-current",
    ...options,
  });
}

async function matterLedgerState(fixture) {
  const query = { tenant_id: PG_TENANT, domain_id: MATTER_DOMAIN_DESCRIPTOR.domain_id };
  return {
    records: await fixture.ledger.list(query),
    audit: await fixture.ledger.listAudit(query),
    idempotency: await fixture.ledger.listIdempotency(query),
  };
}

function rollbackRuntime(runtimes) {
  const base = runtimes.matterRuntime.repository;
  let repository;
  repository = Object.freeze({
    ...base,
    transaction(fn) {
      return base.transaction(() => fn(repository));
    },
    create(record) {
      if (record.model_type === "EmailFilingPlacementReference") {
        throw new Error("synthetic PostgreSQL target-link failure");
      }
      return base.create(record);
    },
  });
  return Object.freeze({
    ...runtimes,
    matterRuntime: Object.freeze({ ...runtimes.matterRuntime, repository }),
  });
}

test("OUTM-21 production authority binds corrections to specialized lawos_dms state", async (t) => {
  const fixture = await createPostgresCorrectionFixture(t);
  if (!fixture) return;
  const specialized = await fixture.uploadRuntime.getDocumentState({
    tenant_id: PG_TENANT,
    document_id: PG_DOCUMENT,
  });
  assert.equal(specialized.document.current_version_id, PG_VERSION);
  assert.equal(specialized.versions[0].created_by, PG_ORIGINAL_ACTOR);
  assert.equal(specialized.file_objects[0].file_object_id, PG_FILE_OBJECT);
  assert.equal(specialized.file_objects[0].sha256, PG_MIME_SHA256);
  assert.equal(specialized.file_objects[0].status, "committed");
  const auxiliaryScope = {
    tenant_id: PG_TENANT,
    domain_id: DMS_AUXILIARY_DOMAIN_DESCRIPTOR.domain_id,
  };
  const auxiliaryRecords = await fixture.ledger.list(auxiliaryScope);
  assert.equal(auxiliaryRecords.find((entry) => (
    entry.record_type === "DmsEmailThread" && entry.record_id === PG_THREAD
  ))?.payload.status, "active");
  assert.equal(auxiliaryRecords.some((entry) => (
    DMS_SPECIALIZED_AUTHORITY_RECORD_TYPES.includes(entry.record_type)
  )), false);
  assert.equal((await fixture.ledger.listAudit(auxiliaryScope)).some((entry) => (
    entry.event_id === PG_RECEIPT && entry.event_type === "dms.email.thread.file"
  )), true);

  const firstAuthority = fixture.authority();
  const initial = await getCurrent(fixture, { authority: firstAuthority });
  assert.equal(initial.status, 200, JSON.stringify(initial.body));
  const expectedOriginal = createOriginalEmailFilingPlacement(originalFiling());
  assert.equal(initial.body.item.placement_id, expectedOriginal.placement_id);
  assert.equal(initial.body.item.matter_id, PG_MATTER_A);

  const created = await runCorrectionRequest(fixture, {
    authority: firstAuthority,
    method: "POST",
    pathname: CORRECTION_PATH,
    body: correctionBody(initial.body.item),
    requestId: "req-outm21-pg-create",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.outcome, "created");
  assert.equal(created.body.item.matter_id, PG_MATTER_B);
  assert.equal(created.body.timeline_events.length, 2);
  assert.ok(created.body.timeline_events.every((event) => (
    event.document_version_id === PG_VERSION && event.copied_mime === false
  )));

  const restartedAuthority = fixture.authority();
  const restarted = await getCurrent(fixture, { authority: restartedAuthority });
  assert.equal(restarted.status, 200, JSON.stringify(restarted.body));
  assert.equal(restarted.body.item.placement_id, created.body.item.placement_id);
  const replay = await runCorrectionRequest(fixture, {
    authority: restartedAuthority,
    method: "POST",
    pathname: CORRECTION_PATH,
    body: correctionBody(initial.body.item),
    requestId: "req-outm21-pg-replay",
  });
  assert.equal(replay.status, 200, JSON.stringify(replay.body));
  assert.equal(replay.body.outcome, "idempotent_replay");

  assert.equal(await fixture.uploadRuntime.getDocumentState({
    tenant_id: PG_OTHER_TENANT,
    document_id: PG_DOCUMENT,
  }), null);
  const crossTenant = await getCurrent(fixture, {
    authority: fixture.authority(),
    tenantId: PG_OTHER_TENANT,
    context: correctionContext(PG_OTHER_TENANT, "user-outm21-pg-other"),
    requestId: "req-outm21-pg-cross-tenant",
  });
  assert.equal(crossTenant.status, 409);
  assert.deepEqual(crossTenant.body.safe_error_codes, [
    "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
  ]);
  assert.equal(JSON.stringify(crossTenant.body).includes(PG_MATTER_A), false);

  const beforeFailure = await matterLedgerState(fixture);
  const failed = await runCorrectionRequest(fixture, {
    authority: fixture.authority(),
    method: "POST",
    pathname: CORRECTION_PATH,
    body: correctionBody(created.body.item, {
      source_matter_id: PG_MATTER_B,
      target_matter_id: PG_MATTER_A,
      idempotency_key: "outm21-pg-b-to-a-failed",
    }),
    requestId: "req-outm21-pg-rollback",
    runtimeTransform: rollbackRuntime,
  });
  assert.equal(failed.status, 500, JSON.stringify(failed.body));
  assert.deepEqual(failed.body.safe_error_codes, ["OUTLOOK_EMAIL_CORRECTION_FAILED"]);
  assert.deepEqual(await matterLedgerState(fixture), beforeFailure);

  const afterFailure = await getCurrent(fixture, { authority: fixture.authority() });
  assert.equal(afterFailure.status, 200, JSON.stringify(afterFailure.body));
  assert.equal(afterFailure.body.item.placement_id, created.body.item.placement_id);
  const correctionAudit = beforeFailure.audit.find((entry) => (
    entry.event_type === "dms.email.filing.correct"
  ));
  assert.equal(correctionAudit.actor_id, PG_CORRECTION_ACTOR);
});
test("OUTM-21 source-authority tamper fails closed without correction or filing mutation", async (t) => {
  const fixture = await createPostgresCorrectionFixture(t);
  if (!fixture) return;
  const auxiliaryScope = {
    tenant_id: PG_TENANT,
    domain_id: DMS_AUXILIARY_DOMAIN_DESCRIPTOR.domain_id,
  };
  const snapshot = async () => ({
    matter: await matterLedgerState(fixture),
    auxiliary: {
      records: await fixture.ledger.list(auxiliaryScope),
      audit: await fixture.ledger.listAudit(auxiliaryScope),
      idempotency: await fixture.ledger.listIdempotency(auxiliaryScope),
    },
    specialized: await fixture.uploadRuntime.getDocumentState({
      tenant_id: PG_TENANT,
      document_id: PG_DOCUMENT,
    }),
  });
  const before = await snapshot();
  const result = await getCurrent(fixture, {
    requestId: "req-outm21-pg-source-tamper",
    runtimeTransform(runtimes) {
      const live = runtimes.dmsRuntime.upload_runtime;
      return {
        ...runtimes,
        dmsRuntime: {
          ...runtimes.dmsRuntime,
          upload_runtime: {
            ...live,
            async getDocumentState(input) {
              const state = await live.getDocumentState(input);
              return { ...state, document: { ...state.document,
                source_email_thread_id: "email-thread-outm21-pg-tampered" } };
            },
          },
        },
      };
    },
  });
  assert.equal(result.status, 409, JSON.stringify(result.body));
  assert.deepEqual(result.body.safe_error_codes, [
    "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
  ]);
  assert.deepEqual(await snapshot(), before);
});
