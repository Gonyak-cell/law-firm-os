#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION,
} from "../apps/api/src/lambda.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
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
const execute = hasFlag("--execute");
const idempotencyKey = option("--idempotency-key");
const confirmation = option("--confirm");
const outputPath = resolve(
  option(
    "--output",
    join(tmpdir(), `lawos-direct-receipt-production-migration-${Date.now()}.json`),
  ),
);

assert.equal(
  git("status", "--porcelain=v1", "--untracked-files=all"),
  "",
  "direct receipt production migration requires a clean exact-main worktree",
);
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
assert.equal(
  git("rev-parse", "origin/main"),
  sourceSha,
  "direct receipt production migration requires exact origin/main",
);
if (execute) {
  assert.ok(idempotencyKey, "--idempotency-key is required with --execute");
  assert.equal(
    confirmation,
    DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION,
    `--confirm must equal ${DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION}`,
  );
}

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
assert.equal(configuration.LastUpdateStatus, "Successful", "production Lambda update must be successful");
assert.equal(configuration.DeploymentCommit, sourceSha, "production Lambda commit must match exact main");
assert.equal(configuration.DeploymentTree, sourceTree, "production Lambda tree must match exact main");

const invocationDir = mkdtempSync(join(tmpdir(), "lawos-direct-receipt-migration-"));
let sequence = 0;
function invoke(payload) {
  sequence += 1;
  const eventPath = join(invocationDir, `event-${sequence}.json`);
  const responsePath = join(invocationDir, `response-${sequence}.json`);
  writeFileSync(eventPath, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
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
  assert.equal(invocation.FunctionError, undefined, "production migration Lambda invocation failed");
  return JSON.parse(readFileSync(responsePath, "utf8"));
}

try {
  const dryRun = invoke({
    lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
    approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
    execute: false,
  });
  assert.equal(dryRun.ok, true, `production migration dry-run failed: ${dryRun.reason ?? "unknown"}`);
  assert.equal(dryRun.status, "PASS_DRY_RUN");
  assert.equal(dryRun.production_write_executed, false);
  assert.equal(dryRun.auto_promoted_revenue_count, 0);

  let migration = null;
  let postCheck = null;
  if (execute) {
    migration = invoke({
      lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
      confirmation,
      execute: true,
      idempotency_key: idempotencyKey,
    });
    assert.equal(migration.ok, true, `production migration failed: ${migration.reason ?? "unknown"}`);
    assert.equal(migration.status, "PASS");
    assert.equal(migration.after.pending_backfill_count, 0);
    assert.equal(migration.auto_promoted_revenue_count, 0);

    postCheck = invoke({
      lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
      approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
      execute: false,
    });
    assert.equal(postCheck.ok, true);
    assert.equal(postCheck.status, "PASS_DRY_RUN");
    assert.equal(postCheck.before.pending_backfill_count, 0);
    assert.equal(postCheck.auto_promoted_revenue_count, 0);
  }

  const report = {
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    function_name: functionName,
    function_code_sha256: configuration.CodeSha256,
    dry_run: dryRun,
    migration,
    post_check: postCheck,
    production_write_executed: migration?.production_write_executed === true,
    raw_payment_ids_recorded: false,
    raw_invoice_ids_recorded: false,
    client_values_recorded: false,
  };
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    verdict: report.verdict,
    source_sha: sourceSha,
    source_tree: sourceTree,
    function_name: functionName,
    dry_run: dryRun.before,
    migration: migration
      ? {
          created_count: migration.created_count,
          idempotent_replay: migration.idempotent_replay,
          before: migration.before,
          after: migration.after,
        }
      : null,
    post_check: postCheck?.before ?? null,
    production_write_executed: report.production_write_executed,
    receipt_path: outputPath,
  }, null, 2)}\n`);
} finally {
  rmSync(invocationDir, { recursive: true, force: true });
}
