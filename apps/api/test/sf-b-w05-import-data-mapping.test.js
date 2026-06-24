import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp05_synthetic";
const ACTOR_ID = "user_rp05_import_owner";
const JOB_ID = "import_job_sf_b_w05";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["import_data_user"] },
    rules: [{ id: `rule_sf_b_w05_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...headers,
  };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function query(permission = "read") {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: `perm_ref_sf_b_w05_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w05_${permission}`,
  }).toString();
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w05_write",
    audit_hint_ref: "audit_hint_sf_b_w05_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

async function createReadyJob(baseUrl) {
  await json(baseUrl, "/api/import-jobs", {
    method: "POST",
    body: body({
      idempotency_key: "sf-b-w05-job-create",
      job_id: JOB_ID,
      target_object: "crm_account_facade",
    }),
  });
  await json(baseUrl, `/api/import-jobs/${JOB_ID}/source-files`, {
    method: "POST",
    body: body({
      idempotency_key: "sf-b-w05-source-stage",
      source_file: {
        file_name: "accounts.csv",
        mime_type: "text/csv",
        row_count: 12,
        columns: [
          { source_field: "company_name", label: "Company name" },
          { source_field: "account_status", label: "Status" },
        ],
        sample_rows: [{ company_name: "Raw Secret Client LLC", account_status: "active" }],
      },
    }),
  });
  await json(baseUrl, `/api/import-jobs/${JOB_ID}/field-mappings`, {
    method: "POST",
    body: body({
      idempotency_key: "sf-b-w05-mapping-save",
      field_mappings: [
        { source_field: "company_name", target_field: "display_name" },
        { source_field: "account_status", target_field: "status" },
      ],
    }),
  });
}

test("SF-B-W05R health and target registry expose import/data mapping routes safely", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const boundedContext = health.body.bounded_contexts.find((item) => item.bounded_context === "import-data-mapping");
    assert.equal(health.status, 200);
    assert.ok(boundedContext);
    assert.equal(boundedContext.production_ready_claim, false);
    assert.equal(boundedContext.execute_owner_blocked, true);
    assert.ok(boundedContext.endpoints.includes("POST /api/import-jobs/:jobId/dry-run"));
    assert.ok(boundedContext.endpoints.includes("GET /api/import-jobs/:jobId/error-report"));

    const targets = await json(baseUrl, `/api/import-targets?${query("target_read")}`);
    assert.equal(targets.status, 200);
    assert.equal(targets.body.items.some((target) => target.target_object === "crm_account_facade"), true);
    assert.equal(targets.body.items.some((target) => target.target_object === "dms_document_bytes"), false);
    assert.equal(targets.body.blocked_targets.some((target) => target.target_object === "dms_document_bytes"), true);
    assert.equal(targets.body.raw_schema_mutation_allowed, false);

    const denied = await json(baseUrl, `/api/import-targets?${query("denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("SF-B-W05R creates and lists import jobs with safe metadata and idempotency", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/import-jobs", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w05-job-create-idempotent",
        job_id: "import_job_sf_b_w05_idempotent",
        target_object: "crm_contact_facade",
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.target_object, "crm_contact_facade");
    assert.equal(created.body.item.raw_rows_included, false);
    assert.equal(created.body.item.direct_personal_contact_identifier_included, false);
    assert.equal(created.body.production_ready_claim, false);

    const replay = await json(baseUrl, "/api/import-jobs", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w05-job-create-idempotent",
        job_id: "import_job_sf_b_w05_idempotent",
        target_object: "crm_contact_facade",
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const list = await json(baseUrl, `/api/import-jobs?${query("job_read")}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.items.some((item) => item.job_id === "import_job_sf_b_w05_idempotent"), true);
    assert.equal(JSON.stringify(list.body).includes(ACTOR_ID), false);
  });
});

test("SF-B-W05R stages source, maps fields, previews, and dry-runs without raw row leakage", async () => {
  await withServer(async (baseUrl) => {
    await createReadyJob(baseUrl);

    const preview = await json(baseUrl, `/api/import-jobs/${JOB_ID}/preview?${query("preview")}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.item.validation_summary.issue_count, 0);
    assert.equal(preview.body.item.raw_rows_included, false);
    assert.equal(preview.body.item.storage_pointer_included, false);
    assert.equal(JSON.stringify(preview.body).includes("Raw Secret Client LLC"), false);

    const dryRun = await json(baseUrl, `/api/import-jobs/${JOB_ID}/dry-run`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w05-dry-run" }),
    });
    assert.equal(dryRun.status, 200);
    assert.equal(dryRun.body.outcome, "passed");
    assert.equal(dryRun.body.item.mutation_count, 0);
    assert.equal(dryRun.body.item.ui_state, "ready_for_owner_approval");
    assert.equal(dryRun.body.item.raw_personal_identifiers_included, false);

    const unsafeMapping = await json(baseUrl, `/api/import-jobs/${JOB_ID}/field-mappings`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w05-unsafe-mapping",
        field_mappings: [{ source_field: "company_name", target_field: "owner_user_id" }],
      }),
    });
    assert.equal(unsafeMapping.status, 400);
    assert.equal(unsafeMapping.body.ui_state, "blocked");
  });
});

test("SF-B-W05R execute and rollback are route-backed owner/receipt blocked, not fake import success", async () => {
  await withServer(async (baseUrl) => {
    await createReadyJob(baseUrl);
    await json(baseUrl, `/api/import-jobs/${JOB_ID}/dry-run`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w05-dry-run-execute" }),
    });

    const execute = await json(baseUrl, `/api/import-jobs/${JOB_ID}/execute`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w05-execute-owner-blocked" }),
    });
    assert.equal(execute.status, 200);
    assert.equal(execute.body.outcome, "owner_blocked");
    assert.equal(execute.body.ui_state, "owner_blocked");
    assert.equal(execute.body.item.target_records_mutated, false);
    assert.equal(execute.body.item.created_count, 0);
    assert.equal(execute.body.item.raw_rows_included, false);

    const rollback = await json(baseUrl, `/api/import-jobs/${JOB_ID}/rollback`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w05-rollback-blocked" }),
    });
    assert.equal(rollback.status, 200);
    assert.equal(rollback.body.outcome, "blocked");
    assert.equal(rollback.body.item.rollback_state, "execution_not_applied");
    assert.equal(rollback.body.item.target_records_reverted, 0);

    const report = await json(baseUrl, `/api/import-jobs/${JOB_ID}/error-report?${query("error_report")}`);
    assert.equal(report.status, 200);
    assert.equal(report.body.items[0].raw_row_included, false);
    assert.equal(report.body.item.raw_personal_identifiers_included, false);

    const blockedTarget = await json(baseUrl, "/api/import-jobs", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w05-blocked-target",
        job_id: "import_job_sf_b_w05_blocked",
        target_object: "dms_document_bytes",
      }),
    });
    assert.equal(blockedTarget.status, 400);
    assert.equal(blockedTarget.body.ui_state, "blocked");
  });
});
