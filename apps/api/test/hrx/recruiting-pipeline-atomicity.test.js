import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const PIPELINE_TABLES = Object.freeze([
  "hrx_job_openings",
  "hrx_candidate_consents",
  "hrx_candidates",
  "hrx_applications",
  "hrx_interviews",
  "hrx_offers",
]);
const CLOCK = "2026-07-31T03:00:00.000Z";

function recruitingSourceAuthority(calls) {
  return Object.freeze({
    status() {
      return Object.freeze({ ready: true });
    },
    preparePipeline({ tenant_id: tenantId, input }) {
      assert.equal(Object.hasOwn(input, "idempotency_key"), false);
      for (const field of [
        "source_ref",
        "resume_ref",
        "approval_ref",
        "evidence_ref",
        "schedule_source_ref",
        "compensation_ref",
        "document_ref",
      ]) {
        assert.equal(Object.hasOwn(input, field), false);
      }
      calls.count += 1;
      const authorityRef = `${tenantId}:${calls.count}`;
      return Object.freeze({
        job_opening: {
          approval_ref: `Approval:${authorityRef}:job`,
          opened_at: CLOCK,
        },
        candidate: {
          source_ref: `ATS:${authorityRef}:candidate`,
          resume_ref: `DMS:${authorityRef}:resume`,
          retention_policy_id: "candidate-retention-2y",
          retention_expires_at: `${input.retention_expires_at}T00:00:00.000Z`,
          consent: {
            consent_id: `consent:${authorityRef}`,
            granted_at: CLOCK,
            expires_at: `${input.consent_expires_at}T23:59:59.000Z`,
            evidence_ref: `Consent:${authorityRef}`,
          },
        },
        application: { submitted_at: CLOCK },
        interview: {
          scheduled_for: new Date(
            `${input.interview_date}T${input.interview_time}:00+09:00`,
          ).toISOString(),
          schedule_source_ref: `Calendar:${authorityRef}:interview`,
        },
        offer: {
          compensation_ref: `Compensation:${authorityRef}`,
          document_ref: `DMS:${authorityRef}:offer`,
          approval_ref: `Approval:${authorityRef}:offer`,
        },
      });
    },
  });
}

function interviewFaultStore(store) {
  let armed = false;
  let triggered = false;
  let insertedBeforeFault = [];
  return {
    ...store,
    armInterviewFault() {
      armed = true;
      triggered = false;
      insertedBeforeFault = [];
    },
    clearInterviewFault() {
      armed = false;
    },
    faultEvidence() {
      return Object.freeze({ triggered, insertedBeforeFault: [...insertedBeforeFault] });
    },
    transaction(callback) {
      return store.transaction((transactionStore) => callback(Object.freeze({
        ...transactionStore,
        query(operation, params = {}) {
          if (
            armed &&
            operation === "insert" &&
            params.table === "hrx_interviews"
          ) {
            triggered = true;
            throw Object.assign(new Error("injected interview insert fault"), {
              status: 503,
              safe_error_code: "TEST_RECRUITING_INTERVIEW_INSERT_FAULT",
            });
          }
          const result = transactionStore.query(operation, params);
          if (
            armed &&
            operation === "insert" &&
            PIPELINE_TABLES.includes(params.table)
          ) {
            insertedBeforeFault.push(params.table);
          }
          return result;
        },
      })));
    },
  };
}

function requestContext(tenantId) {
  return Object.freeze({
    tenant_id: tenantId,
    actor_id: "user-people-admin",
    actor_role: "hr_admin",
    hrx_scopes: ["hrx.candidate.read", "hrx.candidate.write"],
    session_bound: true,
  });
}

function post(context, tenantId, body) {
  return handleHrxApiRequest({
    pathname: "/api/hrx/recruiting/pipeline",
    method: "POST",
    context,
    requestContext: requestContext(tenantId),
    body,
  });
}

function get(context, tenantId) {
  return handleHrxApiRequest({
    pathname: "/api/hrx/recruiting/pipeline",
    method: "GET",
    context,
    requestContext: requestContext(tenantId),
  });
}

function pipelineRequest() {
  return {
    idempotency_key: "recruiting-pipeline:durable-retry-001",
    job_title: "Atomic Recruiting Counsel",
    department_ref: "org_legal",
    position_count: 1,
    hiring_manager_employee_id: "emp-recruiting-admin",
    candidate_name: "Durable Candidate",
    candidate_email: "durable.candidate@example.test",
    interviewer_employee_id: "emp-recruiting-admin",
    interview_date: "2026-08-10",
    interview_time: "10:30",
    consent_expires_at: "2027-08-10",
    retention_expires_at: "2028-08-10",
  };
}

test("recruiting pipeline transaction rolls back faults and replays one durable tenant-scoped receipt", (t) => {
  const storeFile = join(
    mkdtempSync(join(tmpdir(), "hrx-recruiting-pipeline-atomicity-")),
    "store.json",
  );
  const durableStore = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(durableStore);
  const store = interviewFaultStore(durableStore);
  const authorityCalls = { count: 0 };
  const context = createHrxRuntimeContext({
    store,
    clock: () => CLOCK,
    recruitingSourceAuthority: recruitingSourceAuthority(authorityCalls),
    seedRuntimeFixtures: false,
  });
  for (const tenantId of ["tenant-recruiting-a", "tenant-recruiting-b"]) {
    context.repository.createEmployee({
      tenant_id: tenantId,
      employee_id: "emp-recruiting-admin",
      display_name: "Recruiting Administrator",
      status: "active",
    });
  }

  const body = pipelineRequest();
  const { idempotency_key: _missingKey, ...missingKeyBody } = body;
  const missingKey = post(context, "tenant-recruiting-a", missingKeyBody);
  assert.equal(missingKey.status, 400);
  assert.equal(
    missingKey.body.safe_error_code,
    "HRX_RECRUITING_PIPELINE_IDEMPOTENCY_KEY_REQUIRED",
  );
  assert.equal(authorityCalls.count, 0);

  store.armInterviewFault();
  const failed = post(context, "tenant-recruiting-a", body);
  assert.equal(failed.status, 503);
  assert.equal(failed.body.safe_error_code, "TEST_RECRUITING_INTERVIEW_INSERT_FAULT");
  assert.deepEqual(store.faultEvidence(), {
    triggered: true,
    insertedBeforeFault: PIPELINE_TABLES.slice(0, 4),
  });
  const failedSnapshot = durableStore.snapshot();
  for (const table of [...PIPELINE_TABLES, "hrx_recruiting_pipeline_receipts"]) {
    assert.equal(failedSnapshot.tables[table].length, 0, `${table} must roll back`);
  }
  assert.equal(
    failedSnapshot.tables.hrx_audit_events.some(
      (event) => event.action === "hrx.recruiting.pipeline.create",
    ),
    false,
  );

  store.clearInterviewFault();
  const created = post(context, "tenant-recruiting-a", body);
  assert.equal(created.status, 201);
  assert.equal(created.body.idempotent_replay, false);
  assert.equal(created.body.ids.consent_id.startsWith("consent:"), true);
  const createdSnapshot = durableStore.snapshot();
  for (const table of [...PIPELINE_TABLES, "hrx_recruiting_pipeline_receipts"]) {
    assert.equal(createdSnapshot.tables[table].length, 1, `${table} must commit once`);
  }
  assert.equal(
    createdSnapshot.tables.hrx_audit_events.filter(
      (event) => event.action === "hrx.recruiting.pipeline.create",
    ).length,
    1,
  );

  const replay = post(context, "tenant-recruiting-a", body);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent_replay, true);
  assert.deepEqual(replay.body.ids, created.body.ids);
  assert.deepEqual(replay.body.receipt, created.body.receipt);
  const conflict = post(context, "tenant-recruiting-a", {
    ...body,
    candidate_name: "Different Candidate",
  });
  assert.equal(conflict.status, 409);
  assert.equal(
    conflict.body.safe_error_code,
    "HRX_RECRUITING_PIPELINE_IDEMPOTENCY_CONFLICT",
  );
  assert.equal(authorityCalls.count, 2);
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(reopenedStore);
  const reopenedAuthorityCalls = { count: 0 };
  const reopened = createHrxRuntimeContext({
    store: reopenedStore,
    clock: () => CLOCK,
    recruitingSourceAuthority: recruitingSourceAuthority(reopenedAuthorityCalls),
    seedRuntimeFixtures: false,
  });
  const durableReplay = post(reopened, "tenant-recruiting-a", body);
  assert.equal(durableReplay.status, 200);
  assert.equal(durableReplay.body.idempotent_replay, true);
  assert.deepEqual(durableReplay.body.receipt, created.body.receipt);
  assert.equal(reopenedAuthorityCalls.count, 0);
  const durableReplayAuthorityCalls = reopenedAuthorityCalls.count;

  const otherTenant = post(reopened, "tenant-recruiting-b", body);
  assert.equal(otherTenant.status, 201);
  assert.equal(otherTenant.body.idempotent_replay, false);
  assert.notDeepEqual(otherTenant.body.ids, created.body.ids);
  assert.equal(reopenedAuthorityCalls.count, 1);
  const finalSnapshot = reopenedStore.snapshot();
  for (const table of [...PIPELINE_TABLES, "hrx_recruiting_pipeline_receipts"]) {
    assert.equal(finalSnapshot.tables[table].length, 2, `${table} must isolate tenants`);
  }
  assert.equal(get(reopened, "tenant-recruiting-a").body.applications.length, 1);
  assert.equal(get(reopened, "tenant-recruiting-b").body.applications.length, 1);
  assert.equal(
    finalSnapshot.tables.hrx_recruiting_pipeline_receipts.filter(
      (receipt) => receipt.tenant_id === "tenant-recruiting-a",
    ).length,
    1,
  );
  assert.equal(
    finalSnapshot.tables.hrx_recruiting_pipeline_receipts.filter(
      (receipt) => receipt.tenant_id === "tenant-recruiting-b",
    ).length,
    1,
  );
  t.diagnostic(JSON.stringify({
    missing_key_status: missingKey.status,
    injected_fault_status: failed.status,
    attempted_before_fault: store.faultEvidence().insertedBeforeFault,
    rolled_back_table_counts: Object.fromEntries(
      [...PIPELINE_TABLES, "hrx_recruiting_pipeline_receipts"].map(
        (table) => [table, failedSnapshot.tables[table].length],
      ),
    ),
    created_status: created.status,
    same_process_replay_status: replay.status,
    process_reopen_replay_status: durableReplay.status,
    replay_receipt_stable:
      JSON.stringify(durableReplay.body.receipt) === JSON.stringify(created.body.receipt),
    other_tenant_status: otherTenant.status,
    final_receipts_by_tenant: Object.fromEntries(
      ["tenant-recruiting-a", "tenant-recruiting-b"].map(
        (tenantId) => [
          tenantId,
          finalSnapshot.tables.hrx_recruiting_pipeline_receipts.filter(
            (receipt) => receipt.tenant_id === tenantId,
          ).length,
        ],
      ),
    ),
    provider_authority_calls_for_reopen_replay: durableReplayAuthorityCalls,
    provider_authority_calls_after_other_tenant_create: reopenedAuthorityCalls.count,
  }));
  reopenedStore.close();
});
