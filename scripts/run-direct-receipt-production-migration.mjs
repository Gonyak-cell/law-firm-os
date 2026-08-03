#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION = "MIGRATE_PAYMENT_MATCHES_TO_ALLOCATIONS";

function option(name, fallback = null, argv = process.argv) {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
}

function hasFlag(name, argv = process.argv) {
  return argv.includes(name);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  }).trim();
}

export async function runDirectReceiptProductionMigration(argv = process.argv, { runCommand = run } = {}) {
  const git = (...args) => runCommand("git", args);
  const profile = option("--profile", "matter-prod-deploy-admin", argv);
  const region = option("--region", "ap-northeast-2", argv);
  const functionName = option("--function-name", "lawos-production-api", argv);
  const execute = hasFlag("--execute", argv);
  const idempotencyKey = option("--idempotency-key", null, argv);
  const confirmation = option("--confirm", null, argv);
  const outputPath = resolve(
    option(
      "--output",
      join(tmpdir(), `lawos-direct-receipt-production-migration-${Date.now()}.json`),
      argv,
    ),
  );
  const receiptRef = createHash("sha256").update(outputPath).digest("hex").slice(0, 16);

  const dirtyStatus = git("status", "--porcelain=v1", "--untracked-files=all");
  if (dirtyStatus !== "") {
    const changedEntryCount = dirtyStatus.split("\n").filter(Boolean).length;
    const statusDigest = createHash("sha256").update(dirtyStatus).digest("hex");
    const error = new Error(
      `direct receipt production migration requires a clean exact-main worktree [code=DIRECT_RECEIPT_CLEAN_TREE_REQUIRED changed_entry_count=${changedEntryCount} status_digest=${statusDigest}]`,
    );
    error.code = "DIRECT_RECEIPT_CLEAN_TREE_REQUIRED";
    error.changed_entry_count = changedEntryCount;
    error.status_digest = statusDigest;
    throw error;
  }
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

  const {
    DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
    DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
  } = await import("../apps/api/src/lambda.js");

  const awsArgs = (args) => [
    ...args,
    "--profile", profile,
    "--region", region,
    "--no-cli-pager",
  ];
  const configuration = JSON.parse(runCommand("aws", awsArgs([
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
    const invocation = JSON.parse(runCommand("aws", awsArgs([
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
      receipt_ref: receiptRef,
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
      receipt_ref: receiptRef,
    }, null, 2)}\n`);
    return report;
  } finally {
    rmSync(invocationDir, { recursive: true, force: true });
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    await runDirectReceiptProductionMigration();
  } catch (error) {
    if (error?.code === "DIRECT_RECEIPT_CLEAN_TREE_REQUIRED") {
      process.stderr.write(`${JSON.stringify({
        code: error.code,
        changed_entry_count: error.changed_entry_count,
        status_digest: error.status_digest,
      })}\n`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
