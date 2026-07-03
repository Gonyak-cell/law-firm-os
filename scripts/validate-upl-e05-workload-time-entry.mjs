#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxMatterWorkloadProjection } from "../packages/matter/src/hrx-workload-projection.js";

const ROOT = process.cwd();
const requiredFiles = [
  "packages/matter/src/hrx-workload-projection.js",
  "packages/matter/test/hrx-workload-projection.test.js",
  "apps/api/src/hrx-runtime-context.js",
  "apps/api/test/hrx-runtime-api.test.js",
  "apps/api/test/hrx/ai.test.js",
  "apps/web/src/people/analytics/HRAnalytics.tsx",
  "apps/web/src/people/hrxApiClient.ts",
  "scripts/run-upl-e05-workload-time-entry-proof.mjs",
  "artifacts/manual-qa/upl-e05-workload-time-entry-proof.json",
  "artifacts/manual-qa/upl-e05-workload-time-entry-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const projectionSource = read("packages/matter/src/hrx-workload-projection.js");
const runtimeSource = read("apps/api/src/hrx-runtime-context.js");
const apiClientSource = read("apps/web/src/people/hrxApiClient.ts");
const analyticsUiSource = read("apps/web/src/people/analytics/HRAnalytics.tsx");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-e05-workload-time-entry-proof.json"));

for (const marker of [
  "time_entries",
  "workload_source: \"time_entry_aggregation\"",
  "leave_deadline_conflict_count",
  "leave_deadline_overlap",
  "assignment_fallback",
]) {
  assert.ok(projectionSource.includes(marker), `projection source missing marker: ${marker}`);
}

for (const marker of [
  "matterTimeEntrySeed",
  "matterDeadlineSeed",
  "time_entries: context.matterTimeEntries",
  "workload_conflicts",
  "workload_source",
]) {
  assert.ok(runtimeSource.includes(marker), `runtime source missing marker: ${marker}`);
}

assert.ok(apiClientSource.includes("workload_conflicts"), "web API client must expose workload conflicts");
assert.ok(analyticsUiSource.includes("휴가-기한 충돌"), "People analytics UI must render conflict row");
assert.ok(analyticsUiSource.includes("시간기록"), "People analytics UI must label time-entry source");

const before = createHrxMatterWorkloadProjection({
  tenant_id: "tenant-validator",
  time_entries: [
    {
      tenant_id: "tenant-validator",
      employee_id: "emp-001",
      matter_id: "matter-001",
      duration_minutes: 60,
      billable: true,
    },
  ],
})[0];
const after = createHrxMatterWorkloadProjection({
  tenant_id: "tenant-validator",
  time_entries: [
    {
      tenant_id: "tenant-validator",
      employee_id: "emp-001",
      matter_id: "matter-001",
      duration_minutes: 60,
      billable: true,
    },
    {
      tenant_id: "tenant-validator",
      employee_id: "emp-001",
      matter_id: "matter-002",
      duration_minutes: 30,
      billable: false,
    },
  ],
  leave_requests: [
    {
      tenant_id: "tenant-validator",
      employee_id: "emp-001",
      request_id: "leave-validator",
      state: "submitted",
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    },
  ],
  deadlines: [
    {
      tenant_id: "tenant-validator",
      employee_id: "emp-001",
      deadline_id: "deadline-validator",
      due_date: "2026-07-15",
    },
  ],
})[0];
assert.equal(after.workload_source, "time_entry_aggregation");
assert.equal(after.time_entry_count, before.time_entry_count + 1);
assert.equal(after.total_hours > before.total_hours, true);
assert.equal(after.leave_deadline_conflict_count, 1);
assert.equal(Object.hasOwn(after, "matter_id"), false);
assert.equal(Object.hasOwn(after, "client_name"), false);

assert.equal(artifact.pass, true, "proof artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-E-05"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
for (const id of [
  "e05-api-analytics-200",
  "e05-workload-source-time-entry",
  "e05-time-entry-change-reflected",
  "e05-leave-deadline-conflict",
  "e05-no-client-or-matter-detail-leak",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-e05-workload-time-entry",
  artifact: "artifacts/manual-qa/upl-e05-workload-time-entry-proof.json",
}, null, 2));
