#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
  HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
} from "../apps/api/src/lambda.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  }).trim();
}

function git(...args) {
  return run("git", args);
}

const profile = option("--profile", "matter-prod-deploy-admin");
const region = option("--region", "ap-northeast-2");
const functionName = option("--function-name", "lawos-production-api");
const outputPath = resolve(
  option(
    "--output",
    join(tmpdir(), `lawos-home-finance-production-smoke-${Date.now()}.json`),
  ),
);

assert.equal(
  git("status", "--porcelain=v1", "--untracked-files=all"),
  "",
  "home finance production smoke requires a clean exact-main worktree",
);
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
assert.equal(
  git("rev-parse", "origin/main"),
  sourceSha,
  "home finance production smoke requires exact origin/main",
);

const awsArgs = (args) => [
  ...args,
  "--profile", profile,
  "--region", region,
  "--no-cli-pager",
];
const configuration = JSON.parse(run("aws", awsArgs([
  "lambda",
  "get-function-configuration",
  "--function-name",
  functionName,
  "--query",
  "{State:State,LastUpdateStatus:LastUpdateStatus,CodeSha256:CodeSha256,DeploymentCommit:Environment.Variables.LAWOS_DEPLOYMENT_COMMIT,DeploymentTree:Environment.Variables.LAWOS_DEPLOYMENT_TREE}",
  "--output",
  "json",
])));
assert.equal(configuration.State, "Active", "production Lambda must be active");
assert.equal(
  configuration.LastUpdateStatus,
  "Successful",
  "production Lambda update must be successful",
);
assert.equal(
  configuration.DeploymentCommit,
  sourceSha,
  "production Lambda deployment commit must match exact main",
);
assert.equal(
  configuration.DeploymentTree,
  sourceTree,
  "production Lambda deployment tree must match exact main",
);

const invocationDir = mkdtempSync(join(tmpdir(), "lawos-home-finance-smoke-"));
const eventPath = join(invocationDir, "event.json");
const responsePath = join(invocationDir, "response.json");
try {
  writeFileSync(eventPath, `${JSON.stringify({
    lawos_maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
    approval_signature_ref: HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
    require_current_activity: true,
  })}\n`, { mode: 0o600 });
  const invocation = JSON.parse(run("aws", awsArgs([
    "lambda",
    "invoke",
    "--function-name",
    functionName,
    "--invocation-type",
    "RequestResponse",
    "--cli-binary-format",
    "raw-in-base64-out",
    "--payload",
    `fileb://${eventPath}`,
    responsePath,
    "--output",
    "json",
  ])));
  assert.equal(invocation.FunctionError, undefined, "production smoke Lambda invocation failed");
  const receipt = JSON.parse(readFileSync(responsePath, "utf8"));
  assert.equal(receipt.ok, true, `production dashboard smoke failed: ${receipt.reason ?? "unknown"}`);
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.maintenance_action, HOME_FINANCE_DASHBOARD_SMOKE_ACTION);
  assert.equal(Object.values(receipt.checks ?? {}).every(Boolean), true);
  assert.equal(receipt.production_write_executed, false);
  assert.equal(receipt.raw_transaction_values_returned, false);
  assert.equal(receipt.individual_payroll_values_returned, false);

  const report = {
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    function_name: functionName,
    function_code_sha256: configuration.CodeSha256,
    ...receipt,
  };
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    verdict: report.verdict,
    source_sha: sourceSha,
    source_tree: sourceTree,
    function_name: functionName,
    month: receipt.month,
    metrics: receipt.metrics,
    checks: receipt.checks,
    receipt_path: outputPath,
    production_write_executed: false,
  }, null, 2)}\n`);
} finally {
  rmSync(invocationDir, { recursive: true, force: true });
}
