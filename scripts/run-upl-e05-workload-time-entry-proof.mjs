#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";
import { createHrxMatterWorkloadProjection } from "../packages/matter/src/hrx-workload-projection.js";

const ROOT = process.cwd();
const JSON_PATH = "artifacts/manual-qa/upl-e05-workload-time-entry-proof.json";
const MD_PATH = "artifacts/manual-qa/upl-e05-workload-time-entry-proof.md";
const TENANT = "tenant_amic_matter_vault";
const EMPLOYEE = "emp_amic_ytkim";
const ACCOUNT = highestPrivilegeRegisteredAccount();

function check(id, passed, evidence) {
  return Object.freeze({ id, passed: Boolean(passed), evidence });
}

function projectionWith(time_entries) {
  return createHrxMatterWorkloadProjection({
    tenant_id: TENANT,
    time_entries,
    leave_requests: [
      {
        tenant_id: TENANT,
        request_id: "leave-proof-001",
        employee_id: EMPLOYEE,
        start_date: "2026-07-15",
        end_date: "2026-07-15",
        state: "approved",
      },
    ],
    deadlines: [
      {
        tenant_id: TENANT,
        deadline_id: "deadline-proof-001",
        employee_id: EMPLOYEE,
        matter_id: "matter-proof-001",
        due_date: "2026-07-15",
      },
    ],
  })[0];
}

const baseEntries = [
  {
    tenant_id: TENANT,
    time_entry_id: "proof-time-001",
    employee_id: EMPLOYEE,
    matter_id: "matter-proof-001",
    duration_minutes: 60,
    billable: true,
  },
];
const changedEntries = [
  ...baseEntries,
  {
    tenant_id: TENANT,
    time_entry_id: "proof-time-002",
    employee_id: EMPLOYEE,
    matter_id: "matter-proof-002",
    duration_minutes: 45,
    billable: false,
  },
];

const baseProjection = projectionWith(baseEntries);
const changedProjection = projectionWith(changedEntries);
assert.equal(changedProjection.total_hours, 1.75);
assert.equal(changedProjection.total_hours > baseProjection.total_hours, true);

let server;
try {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  const baseUrl = `http://${started.host}:${started.port}`;
  const forgedResponse = await fetch(`${baseUrl}/api/hrx/analytics`, {
    headers: {
      "x-lawos-tenant-id": TENANT,
      "x-lawos-actor-id": "user_amic_jwsuh",
      "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
      "x-lawos-hrx-scopes": "hrx.analytics.read,hrx.employee.read,hrx.leave.read,hrx.audit.read",
    },
  });
  const forgedBody = await forgedResponse.json();
  const response = await fetch(`${baseUrl}/api/hrx/analytics`, { headers: await apiSessionHeaders(baseUrl, ACCOUNT) });
  const body = await response.json();
  assert.equal(response.status, 200);

  const sourceRows = body.workload_projection.filter((row) => row.workload_source === "time_entry_aggregation");
  const conflictRows = body.workload_conflicts.filter((conflict) => conflict.conflict_type === "leave_deadline_overlap");
  const serializedWorkload = JSON.stringify(body.workload_projection);

  const checks = [
    check("e05-unsigned-forged-hrx-headers-blocked", forgedResponse.status === 401 && forgedBody.safe_error_codes?.includes("AUTH_SESSION_REQUIRED"), {
      status: forgedResponse.status,
      safe_error_codes: forgedBody.safe_error_codes,
    }),
    check("e05-api-analytics-200", response.status === 200, "/api/hrx/analytics"),
    check("e05-workload-source-time-entry", sourceRows.length === body.workload_projection.length && sourceRows.length > 0, {
      source_count: sourceRows.length,
      row_count: body.workload_projection.length,
    }),
    check("e05-time-entry-change-reflected", changedProjection.time_entry_count === baseProjection.time_entry_count + 1 && changedProjection.total_hours > baseProjection.total_hours, {
      before: { time_entry_count: baseProjection.time_entry_count, total_hours: baseProjection.total_hours },
      after: { time_entry_count: changedProjection.time_entry_count, total_hours: changedProjection.total_hours },
    }),
    check("e05-leave-deadline-conflict", conflictRows.length > 0 && changedProjection.leave_deadline_conflict_count === 1, {
      api_conflicts: conflictRows.length,
      projection_conflicts: changedProjection.leave_deadline_conflict_count,
    }),
    check("e05-no-client-or-matter-detail-leak", !serializedWorkload.includes("Sensitive Client") && !serializedWorkload.includes("matter-001"), {
      matter_ids_rendered: serializedWorkload.includes("matter-001"),
    }),
  ];

  const artifact = {
    schema_version: "lawos.upl_e05.workload_time_entry_proof.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-E-05"],
    pass: checks.every((item) => item.passed),
    production_ready_claim: false,
    go_live_claim: false,
    api_readback: {
      forged_status: forgedResponse.status,
      status: response.status,
      workload_row_count: body.workload_projection.length,
      workload_conflict_count: body.workload_conflicts.length,
      analytics_workload: body.analytics.workload,
    },
    projection_change_readback: {
      before: baseProjection,
      after: changedProjection,
    },
    checks,
  };

  mkdirSync(resolve(ROOT, dirname(JSON_PATH)), { recursive: true });
  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    `# UPL-E-05 Workload Time Entry Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

## Checks

| Check | Result | Evidence |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- Production ready claim: false
- Go-live claim: false
- Workload source: time entry aggregation
- Conflict type: leave_deadline_overlap
`,
  );

  console.log(JSON.stringify({
    pass: artifact.pass,
    artifact: JSON_PATH,
    workload_row_count: body.workload_projection.length,
    workload_conflict_count: body.workload_conflicts.length,
    changed_total_hours: changedProjection.total_hours,
  }, null, 2));

  if (!artifact.pass) process.exitCode = 1;
} finally {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}
