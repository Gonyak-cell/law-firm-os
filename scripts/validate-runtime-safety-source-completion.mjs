#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const SOURCE_COMPLETION_SCHEMA_VERSION = "law-firm-os.runtime-safety-source-completion.v1";

const REQUIRED_PATHS = Object.freeze([
  "apps/api/src/aws-secret-reference.js",
  "apps/api/src/entra-oidc-provider.js",
  "apps/api/src/hrx-runtime-context.js",
  "apps/api/src/lambda.js",
  "apps/api/src/local-durable-store-paths.js",
  "apps/api/src/persistence-authority.js",
  "apps/api/src/postgres-api-runtime-authority.js",
  "apps/api/src/server.js",
  "apps/api/src/session-auth.js",
  "apps/api/src/vault-dms-runtime-context.js",
  "docs/runbooks/store-env-catalog.md",
  "packages/dms/src/postgres-upload-runtime.js",
  "packages/hrx/src/migrations/030_hrx_operational_authority.sql",
  "packages/hrx/src/postgres-store-v2.js",
  "packages/hrx/src/store/file-store.js",
  "packages/persistence/src/domain-ledger.js",
  "packages/persistence/src/postgres/domain-ledger.js",
  "packages/persistence/src/postgres/migrations/005_domain_runtime_authority.sql",
  "packages/persistence/src/postgres/migrations/006_entra_oidc_authority.sql",
  "packages/persistence/src/postgres/migrations/007_break_glass_multi_approval.sql",
  "packages/persistence/src/postgres/migrations/008_dms_permanent_delete_approval.sql",
  "packages/persistence/src/postgres/migrations/009_authenticated_tenant_context.sql",
  "packages/persistence/src/record-domain-adapter.js",
  "packages/runtime-auth/src/postgres-identity-ledger.js",
  "scripts/validate-runtime-safety-source-completion.mjs",
]);

const VERIFICATION_COMMANDS = Object.freeze([
  Object.freeze({
    id: "postgres-full-api-authority",
    argv: Object.freeze([
      "node", "--test", "--test-concurrency=1",
      "apps/api/test/postgres-api-runtime-authority.test.js",
      "apps/api/test/postgres-vault-dms-api.test.js",
      "packages/persistence/test/record-domain-seed-preservation.test.js",
      "packages/crm/test/central-ledger.test.js",
      "packages/master-data/test/central-ledger.test.js",
    ]),
  }),
  Object.freeze({
    id: "entra-break-glass-persistence-authority",
    argv: Object.freeze([
      "node", "--test", "--test-concurrency=1",
      "apps/api/test/entra-oidc-provider.test.js",
      "apps/api/test/entra-session-auth-postgres.test.js",
      "apps/api/test/break-glass-postgres.test.js",
      "apps/api/test/admin-security-api.test.js",
      "apps/api/test/persistence-authority.test.js",
    ]),
  }),
  Object.freeze({
    id: "operational-json-authority-disabled",
    argv: Object.freeze([
      "node", "--test", "--test-concurrency=1",
      "apps/api/test/operational-step-up-preflight.test.js",
      "apps/api/test/lambda-session-secret.test.js",
    ]),
  }),
  Object.freeze({
    id: "dms-provider-security",
    argv: Object.freeze([
      "node", "--test", "--test-concurrency=1",
      "packages/dms/test/security-regressions.test.js",
      "packages/dms/test/postgres-security-regressions.test.js",
      "packages/dms/test/s3-storage-adapter.test.js",
      "apps/api/test/postgres-vault-dms-api.test.js",
    ]),
  }),
  Object.freeze({
    id: "postgres-migration-transaction-rls",
    argv: Object.freeze([
      "node", "--test", "--test-concurrency=1",
      "packages/persistence/test/domain-ledger.test.js",
      "packages/persistence/test/migration-runner.test.js",
      "packages/persistence/test/postgres-transaction.test.js",
      "packages/persistence/test/postgres-repository-contract.test.js",
      "apps/api/test/hrx/durability.test.js",
      "packages/hrx/test/postgres-store-v2.test.js",
    ]),
  }),
  Object.freeze({
    id: "offline-and-evidence-contracts",
    argv: Object.freeze([
      "node", "--test",
      "scripts/test/offline-capability-decision.test.mjs",
      "scripts/test/runtime-safety-contracts.test.mjs",
      "scripts/test/central-ledger-cutover-contract.test.mjs",
    ]),
  }),
  Object.freeze({ id: "runtime-safety-governance", argv: Object.freeze(["node", "scripts/validate-runtime-safety-governance.mjs"]) }),
  Object.freeze({ id: "runtime-safety-evidence-strict", argv: Object.freeze(["node", "scripts/validate-runtime-safety-evidence.mjs", "--mode", "strict"]) }),
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} requires a value`);
  return value;
}

function options(name) {
  return process.argv.flatMap((argument, index) => argument === name ? [process.argv[index + 1]] : [])
    .map((value) => {
      if (!value || value.startsWith("--")) throw new TypeError(`${name} requires a value`);
      return resolve(value);
    });
}

function assertExpected(value, expected, label) {
  if (expected && value !== expected) {
    const error = new Error(`${label} does not match the approved exact source`);
    error.code = "RUNTIME_SAFETY_EXACT_SOURCE_MISMATCH";
    throw error;
  }
}

function assertClean(label) {
  const status = git("status", "--porcelain=v1", "--untracked-files=all");
  if (status) {
    const error = new Error(`source worktree must be clean ${label}`);
    error.code = "RUNTIME_SAFETY_SOURCE_DIRTY";
    throw error;
  }
}

function assertTrackedAtHead(path) {
  if (!existsSync(resolve(ROOT, path))) throw new Error(`required source path is missing: ${path}`);
  execFileSync("git", ["cat-file", "-e", `HEAD:${path}`], { cwd: ROOT, stdio: "ignore" });
}

function runVerification(command) {
  const startedAt = new Date().toISOString();
  const completed = spawnSync(command.argv[0], command.argv.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
  const output = `${completed.stdout ?? ""}${completed.stderr ?? ""}`;
  if (completed.error || completed.status !== 0) {
    const error = new Error(`source verification failed: ${command.id}`);
    error.code = "RUNTIME_SAFETY_SOURCE_VERIFICATION_FAILED";
    error.details = {
      command_id: command.id,
      exit_code: completed.status ?? null,
      signal: completed.signal ?? null,
      output_sha256: sha256(output),
    };
    throw error;
  }
  return Object.freeze({
    command_id: command.id,
    argv: command.argv,
    exit_code: 0,
    started_at: startedAt,
    finished_at: finishedAt,
    output_sha256: sha256(output),
  });
}

function writeReceipt(path, receipt) {
  const outputPath = resolve(path);
  if (!isAbsolute(outputPath)) throw new TypeError("--output must resolve to an absolute path");
  const rel = relative(ROOT, outputPath);
  if (rel !== ".." && !rel.startsWith("../")) {
    throw new TypeError("--output must be outside the source worktree so clean-source evidence remains true");
  }
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

try {
  const expectedSha = option("--expected-sha");
  const expectedTree = option("--expected-tree");
  const outputPath = option("--output");
  const evidenceOutputRoots = options("--evidence-output-root");
  if (evidenceOutputRoots.length === 0) {
    throw new TypeError("at least one --evidence-output-root is required for strict evidence path validation");
  }
  if (expectedSha && !SHA_PATTERN.test(expectedSha)) throw new TypeError("--expected-sha must be a full Git SHA");
  if (expectedTree && !SHA_PATTERN.test(expectedTree)) throw new TypeError("--expected-tree must be a full Git tree SHA");

  const startedAt = new Date().toISOString();
  const sourceSha = git("rev-parse", "HEAD^{commit}");
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  assertExpected(sourceSha, expectedSha, "HEAD SHA");
  assertExpected(sourceTree, expectedTree, "HEAD tree");
  assertClean("before verification");
  REQUIRED_PATHS.forEach(assertTrackedAtHead);
  const results = VERIFICATION_COMMANDS.map((command) => command.id === "runtime-safety-evidence-strict"
    ? runVerification(Object.freeze({
        ...command,
        argv: Object.freeze([
          ...command.argv,
          ...evidenceOutputRoots.flatMap((root) => ["--output-root", root]),
        ]),
      }))
    : runVerification(command));
  assertClean("after verification");
  const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
  const receipt = Object.freeze({
    schema_version: SOURCE_COMPLETION_SCHEMA_VERSION,
    approval_id: "LAWOS-RUNTIME-SAFETY-CONDITIONAL-FULL-EXECUTION-APPROVAL-20260718",
    source_sha: sourceSha,
    source_tree: sourceTree,
    started_at: startedAt,
    finished_at: finishedAt,
    source_worktree_clean_before: true,
    source_worktree_clean_after: true,
    required_path_count: REQUIRED_PATHS.length,
    verification_results: results,
    claims: Object.freeze({
      source_completion_verified: true,
      postgres_v2_full_api_authority: true,
      repository_port_v2: true,
      transactions: true,
      tenant_rls: true,
      optimistic_version: true,
      idempotency: true,
      audit: true,
      outbox: true,
      json_fallback_count: 0,
      json_dual_write_count: 0,
      offline_capability: "rejected",
      production_ready: false,
      release_executed: false,
      deployment_executed: false,
      cutover_executed: false,
      go_live: false,
    }),
  });
  if (outputPath) writeReceipt(outputPath, receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    verdict: "FAIL",
    code: error.code ?? "RUNTIME_SAFETY_SOURCE_COMPLETION",
    message: error.message,
    details: error.details ?? {},
  })}\n`);
  process.exit(1);
}
