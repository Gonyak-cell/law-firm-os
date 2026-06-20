#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const cases = new Map([
  ["people-home", "apps/web/e2e/hrx/people-home.spec.ts"],
  ["employee-list", "apps/web/e2e/hrx/employee-list.spec.ts"],
  ["employee-profile", "apps/web/e2e/hrx/employee-profile.spec.ts"],
  ["hr-documents", "apps/web/e2e/hrx/hr-documents.spec.ts"],
  ["leave-request", "apps/web/e2e/hrx/leave-request.spec.ts"],
  ["manager-approval", "apps/web/e2e/hrx/manager-approval.spec.ts"],
  ["candidate-portal", "apps/web/e2e/hrx/candidate-portal.spec.ts"],
  ["recruiting-pipeline", "apps/web/e2e/hrx/recruiting-pipeline.spec.ts"],
  ["hrx-policy-console", "apps/web/e2e/hrx/hrx-policy-console.spec.ts"],
  ["hrx-audit-viewer", "apps/web/e2e/hrx/hrx-audit-viewer.spec.ts"],
  ["hrx-step-up-challenge", "apps/web/e2e/hrx/hrx-step-up-challenge.spec.ts"],
  ["hrx-analytics", "apps/web/e2e/hrx/hrx-analytics.spec.ts"],
  ["hrx-ai-assistant", "apps/web/e2e/hrx/hrx-ai-assistant.spec.ts"],
]);

const requested = process.argv.slice(2);
const selected = requested.length === 0 || requested.includes("hrx")
  ? [...cases.values()]
  : requested.map((name) => cases.get(name));

if (!requested.includes("hrx") && selected.some((file) => !file)) {
  console.error(`Unknown web:e2e case. Known cases: ${[...cases.keys()].join(", ")}`);
  process.exit(1);
}

const run = spawnSync(process.execPath, ["--test", ...selected], { stdio: "inherit" });
process.exit(run.status ?? 1);
