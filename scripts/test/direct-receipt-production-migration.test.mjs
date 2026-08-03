import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  canonicalFinanceRequestFingerprint,
  createFinanceRepository,
} from "../../packages/billing/src/finance-repository.js";
import { confirmBankReceipt } from "../../packages/payments/src/payment-service.js";
import {
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
} from "../../packages/payments/src/payment-allocation-migration.js";
import { runDirectReceiptProductionMigration } from "../run-direct-receipt-production-migration.mjs";

const TENANT = "tenant-rfd-tuw-021-synthetic";
const ACTOR = "actor-rfd-tuw-021-synthetic";
const MATCHED_PAYMENT = "payment-rfd-tuw-021-matched";
const UNMATCHED_PAYMENT = "payment-rfd-tuw-021-unmatched";
const INVOICE = "invoice-rfd-tuw-021";
const CONFIRMATION = "MIGRATE_PAYMENT_MATCHES_TO_ALLOCATIONS";
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);

function syntheticRepository() {
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "BankTransaction",
      bank_transaction_id: "bank-rfd-tuw-021-unmatched",
      tenant_id: TENANT,
      direction: "inflow",
      amount: 75,
      currency: "KRW",
      date: "2026-07-31",
      occurred_at: "2026-07-31T10:00:00+09:00",
    }],
  });
  confirmBankReceipt({
    repository,
    bank_transaction_id: "bank-rfd-tuw-021-unmatched",
    payment: {
      payment_id: UNMATCHED_PAYMENT,
      tenant_id: TENANT,
      matter_id: "matter-rfd-tuw-021-unmatched",
    },
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-021-bank-import",
  });
  repository.create({
    model_type: "Payment",
    payment_id: MATCHED_PAYMENT,
    tenant_id: TENANT,
    amount: 100,
    currency: "KRW",
    matter_id: "matter-rfd-tuw-021-matched",
    client_group_id: "client-rfd-tuw-021",
    status: "matched",
  });
  repository.create({
    model_type: "Invoice",
    invoice_id: INVOICE,
    tenant_id: TENANT,
    amount_due: 100,
    amount_paid: 0,
    currency: "KRW",
    matter_id: "matter-rfd-tuw-021-matched",
    client_group_id: "client-rfd-tuw-021",
    status: "issued",
  });
  repository.create({
    model_type: "PaymentMatch",
    payment_match_id: "match-rfd-tuw-021",
    tenant_id: TENANT,
    payment_id: MATCHED_PAYMENT,
    invoice_id: INVOICE,
    amount: 60,
    currency: "KRW",
    matter_id: "matter-rfd-tuw-021-matched",
    matched_at: "2026-07-31",
    status: "matched",
  });
  return repository;
}

function stripEnvelope(receipt) {
  return Object.fromEntries(
    Object.entries(receipt).filter(([key]) => !["plan_hash", "current_plan_hash", "write_observation"].includes(key)),
  );
}

function observedWrites(repository) {
  const snapshot = repository.snapshot();
  return {
    payment_allocations: snapshot.records.filter((row) => row.model_type === "PaymentAllocation").length,
    audit_events: snapshot.audit_events.length,
    idempotency_entries: snapshot.idempotency.length,
  };
}

test("RFD-TUW-021 local synthetic migration is dry-run first, writes once, and replays aggregate receipt", async () => {
  const { runLocalDirectReceiptMigration } = await import(
    `../lib/direct-receipt-migration-local.mjs?local=${Date.now()}`,
  );
  const repository = syntheticRepository();
  const result = runLocalDirectReceiptMigration({
    repository,
    tenantId: TENANT,
    actorId: ACTOR,
    idempotencyKey: "rfd-tuw-021-migration",
  });

  assert.equal(result.scenario, "local_synthetic");
  assert.equal(result.dry_run.dry_run, true);
  assert.deepEqual(result.dry_run.write_observation, {
    observed: true,
    payment_allocations: 0,
    audit_events: 0,
    idempotency_entries: 0,
    total: 0,
  });
  assert.equal(result.execute.created_count, 1);
  assert.equal(result.execute.idempotent_replay, false);
  assert.deepEqual(result.execute.write_observation, {
    observed: true,
    payment_allocations: 1,
    audit_events: 1,
    idempotency_entries: 1,
    total: 3,
  });
  assert.equal(result.replay.idempotent_replay, true);
  assert.equal(result.replay.created_count, result.execute.created_count);
  assert.equal(result.replay_receipt_equal, true);
  assert.deepEqual(result.replay.write_observation, {
    observed: true,
    payment_allocations: 0,
    audit_events: 0,
    idempotency_entries: 0,
    total: 0,
  });
  assert.deepEqual(stripEnvelope(result.replay), {
    ...stripEnvelope(result.execute),
    idempotent_replay: true,
  });

  assert.equal(result.plan_hashes.dry_run, result.plan_hashes.execute);
  assert.equal(result.plan_hashes.execute, result.plan_hashes.replay_receipt);
  assert.notEqual(result.plan_hashes.execute, result.plan_hashes.replay_current_state);
  assert.equal(result.before.payment_allocation_count, 0);
  assert.equal(result.after.payment_allocation_count, 1);
  assert.equal(result.dry_run.raw_values_returned, false);
  assert.equal(result.execute.raw_values_returned, false);
  assert.equal(result.replay.raw_values_returned, false);
  for (const rawValue of [
    TENANT,
    ACTOR,
    MATCHED_PAYMENT,
    UNMATCHED_PAYMENT,
    INVOICE,
    "bank-rfd-tuw-021-unmatched",
    "client-rfd-tuw-021",
  ]) {
    assert.equal(JSON.stringify(result).includes(rawValue), false, `receipt leaked ${rawValue}`);
  }

  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 1);
  const unmatched = repository.get({ tenant_id: TENANT, model_type: "Payment", payment_id: UNMATCHED_PAYMENT });
  assert.equal(unmatched.status, "imported");
  assert.equal(unmatched.revenue_effect, "none_until_allocated");
  assert.equal(result.unmatched_bank_inflow.unallocated_payment_count, 1);
  assert.equal(result.unmatched_bank_inflow.auto_promoted_revenue_count, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankTransactionClassification" }).length, 0);
});

test("RFD-TUW-021 local migration recomputes and binds both dry-run and execute plans", () => {
  const dryRunRepository = syntheticRepository();
  const dryRunPlan = buildPaymentAllocationMigrationPlan({ repository: dryRunRepository, tenant_id: TENANT });
  const dryRunPlanHash = canonicalFinanceRequestFingerprint(dryRunPlan);
  dryRunRepository.create({
    model_type: "Payment",
    payment_id: "payment-rfd-tuw-021-plan-change",
    tenant_id: TENANT,
    amount: 5,
    currency: "KRW",
    status: "imported",
  });
  const dryRunBefore = dryRunRepository.snapshot();
  assert.throws(
    () => backfillPaymentMatchesAsAllocations({
      repository: dryRunRepository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "rfd-tuw-021-plan-change",
      plan_hash: dryRunPlanHash,
      dry_run: true,
    }),
    /plan hash mismatch/u,
  );
  assert.deepEqual(dryRunRepository.snapshot(), dryRunBefore);

  const executeRepository = syntheticRepository();
  const executePlan = buildPaymentAllocationMigrationPlan({ repository: executeRepository, tenant_id: TENANT });
  const executePlanHash = canonicalFinanceRequestFingerprint(executePlan);
  const dryReceipt = backfillPaymentMatchesAsAllocations({
    repository: executeRepository,
    tenant_id: TENANT,
    plan_hash: executePlanHash,
    dry_run: true,
  });
  assert.equal(dryReceipt.plan_hash, executePlanHash);
  const executeBeforeMutation = observedWrites(executeRepository);
  executeRepository.create({
    model_type: "Payment",
    payment_id: "payment-rfd-tuw-021-execute-plan-change",
    tenant_id: TENANT,
    amount: 5,
    currency: "KRW",
    status: "imported",
  });
  assert.throws(
    () => backfillPaymentMatchesAsAllocations({
      repository: executeRepository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "rfd-tuw-021-execute-plan-change",
      plan_hash: executePlanHash,
      dry_run: false,
    }),
    /plan hash mismatch/u,
  );
  assert.deepEqual(observedWrites(executeRepository), executeBeforeMutation);
});

test("RFD-TUW-021 local runner import and execution do not touch environment, network, or child processes", async () => {
  const repository = syntheticRepository();
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;
  const childProcess = createRequire(import.meta.url)("node:child_process");
  const originalExecFileSync = childProcess.execFileSync;
  let childProcessCalls = 0;
  const loaderEnvironmentKeys = new Set(["WATCH_REPORT_DEPENDENCIES", "FORCE_COLOR"]);
  try {
    process.env = new Proxy(originalEnv, {
      get(target, key) {
        if (!loaderEnvironmentKeys.has(key)) throw new Error("environment access denied");
        return target[key];
      },
      has() { throw new Error("environment access denied"); },
      ownKeys() { throw new Error("environment access denied"); },
      getOwnPropertyDescriptor() { throw new Error("environment access denied"); },
    });
    globalThis.fetch = () => { throw new Error("network access denied"); };
    childProcess.execFileSync = () => {
      childProcessCalls += 1;
      throw new Error("child process access denied");
    };
    const { runLocalDirectReceiptMigration } = await import(
      `../lib/direct-receipt-migration-local.mjs?isolation=${Date.now()}`,
    );
    const result = runLocalDirectReceiptMigration({ repository, tenantId: TENANT, actorId: ACTOR });
    assert.equal(result.scenario, "local_synthetic");
    assert.equal(childProcessCalls, 0);
  } finally {
    childProcess.execFileSync = originalExecFileSync;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test("RFD-TUW-021 local runner fails closed on a replay-stage plan mutation", async () => {
  const { runLocalDirectReceiptMigration } = await import(
    `../lib/direct-receipt-migration-local.mjs?replay-boundary=${Date.now()}`,
  );
  const rawRepository = syntheticRepository();
  let paymentListCalls = 0;
  let replayBaseline = null;
  const repository = {
    ...rawRepository,
    list(query = {}) {
      if (query.model_type === "Payment") {
        paymentListCalls += 1;
        if (paymentListCalls === 6) {
          replayBaseline = observedWrites(rawRepository);
          rawRepository.create({
            model_type: "Payment",
            payment_id: "payment-rfd-tuw-021-replay-boundary",
            tenant_id: TENANT,
            amount: 7,
            currency: "KRW",
            status: "imported",
          });
        }
      }
      return rawRepository.list(query);
    },
  };

  assert.throws(
    () => runLocalDirectReceiptMigration({
      repository,
      tenantId: TENANT,
      actorId: ACTOR,
      idempotencyKey: "rfd-tuw-021-replay-boundary",
    }),
    /plan hash mismatch/u,
  );
  assert.equal(paymentListCalls, 6);
  assert.ok(replayBaseline);
  assert.equal(replayBaseline.payment_allocations, 1);
  assert.deepEqual(observedWrites(rawRepository), replayBaseline);
  assert.equal(observedWrites(rawRepository).payment_allocations, 1);
});

test("RFD-TUW-021 local runner passes from a fresh process with a cold module cache", () => {
  const childScript = `
    import { createFinanceRepository } from "./packages/billing/src/finance-repository.js";
    import { runLocalDirectReceiptMigration } from "./scripts/lib/direct-receipt-migration-local.mjs";
    const tenant = "tenant-rfd-tuw-021-fresh-synthetic";
    const repository = createFinanceRepository();
    repository.create({ model_type: "Payment", payment_id: "payment-rfd-tuw-021-fresh", tenant_id: tenant, amount: 10, currency: "KRW", status: "matched" });
    repository.create({ model_type: "Invoice", invoice_id: "invoice-rfd-tuw-021-fresh", tenant_id: tenant, amount_due: 10, amount_paid: 0, currency: "KRW", status: "issued" });
    repository.create({ model_type: "PaymentMatch", payment_match_id: "match-rfd-tuw-021-fresh", tenant_id: tenant, payment_id: "payment-rfd-tuw-021-fresh", invoice_id: "invoice-rfd-tuw-021-fresh", amount: 10, currency: "KRW", status: "matched" });
    const result = runLocalDirectReceiptMigration({ repository, tenantId: tenant, actorId: "actor-rfd-tuw-021-fresh-synthetic", idempotencyKey: "rfd-tuw-021-fresh" });
    process.stdout.write(JSON.stringify({ scenario: result.scenario, replay_writes: result.replay.write_observation.total, raw_values_returned: result.execute.raw_values_returned }) + "\\n");
  `;
  const outputs = [1, 2].map(() => JSON.parse(execFileSync(
    process.execPath,
    ["--input-type=module", "-e", childScript],
    { cwd: process.cwd(), encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
  )));
  assert.deepEqual(outputs, [
    { scenario: "local_synthetic", replay_writes: 0, raw_values_returned: false },
    { scenario: "local_synthetic", replay_writes: 0, raw_values_returned: false },
  ]);
});

function productionCommandHarness({ dirtyStatus = "", originSha = SOURCE_SHA } = {}) {
  const calls = [];
  const events = [];
  let invokeCount = 0;
  const runCommand = (command, args) => {
    calls.push({ command, args: [...args] });
    if (command === "git") {
      if (args[0] === "status") return dirtyStatus;
      if (args[0] === "rev-parse" && args[1] === "HEAD") return SOURCE_SHA;
      if (args[0] === "rev-parse" && args[1] === "HEAD^{tree}") return SOURCE_TREE;
      if (args[0] === "rev-parse" && args[1] === "origin/main") return originSha;
    }
    if (command === "aws" && args.includes("get-function-configuration")) {
      return JSON.stringify({
        State: "Active",
        LastUpdateStatus: "Successful",
        CodeSha256: "function-code-sha",
        DeploymentCommit: SOURCE_SHA,
        DeploymentTree: SOURCE_TREE,
      });
    }
    if (command === "aws" && args.includes("invoke")) {
      invokeCount += 1;
      const payloadIndex = args.indexOf("--payload");
      const eventPath = args[payloadIndex + 1].replace(/^fileb:\/\//u, "");
      const responsePath = args[payloadIndex + 2];
      const event = JSON.parse(readFileSync(eventPath, "utf8"));
      events.push(event);
      const postCheck = !event.execute && invokeCount > 1;
      writeFileSync(responsePath, `${JSON.stringify({
        ok: true,
        status: event.execute ? "PASS" : "PASS_DRY_RUN",
        production_write_executed: event.execute === true,
        auto_promoted_revenue_count: 0,
        before: { pending_backfill_count: postCheck ? 0 : 1, payment_allocation_count: postCheck ? 1 : 0 },
        after: { pending_backfill_count: event.execute ? 0 : 1, payment_allocation_count: event.execute ? 1 : 0 },
        created_count: event.execute ? 1 : 0,
        idempotent_replay: false,
      })}\n`);
      return JSON.stringify({});
    }
    throw new Error(`unexpected ${command} ${args.join(" ")}`);
  };
  return { calls, events, runCommand };
}

test("RFD-TUW-021 production caller proves dry-run-first ordering and execute replay gates", async () => {
  const harness = productionCommandHarness();
  const outputDir = mkdtempSync(join(tmpdir(), "rfd-tuw-021-production-test-"));
  const outputPath = join(outputDir, "receipt.json");
  try {
    const report = await runDirectReceiptProductionMigration(
      ["node", "run-direct-receipt-production-migration.mjs", "--output", outputPath],
      { runCommand: harness.runCommand },
    );
    assert.equal(report.verdict, "PASS");
    assert.deepEqual(harness.calls.slice(0, 4).map(({ command, args }) => `${command}:${args[0]}`), [
      "git:status",
      "git:rev-parse",
      "git:rev-parse",
      "git:rev-parse",
    ]);
    assert.equal(harness.calls[4].command, "aws");
    assert.equal(harness.calls[4].args.includes("get-function-configuration"), true);
    assert.equal(harness.calls[5].args.includes("invoke"), true);
    assert.equal(harness.events.length, 1);
    assert.equal(harness.events[0].execute, false);
    assert.equal(report.production_write_executed, false);
    const storedReport = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(storedReport.production_write_executed, false);
    assert.match(storedReport.receipt_ref, /^[a-f0-9]{16}$/u);
    assert.equal(Object.hasOwn(storedReport, "receipt_path"), false);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }

  const executeHarness = productionCommandHarness();
  const executeOutputDir = mkdtempSync(join(tmpdir(), "rfd-tuw-021-production-execute-test-"));
  try {
    const report = await runDirectReceiptProductionMigration(
      [
        "node",
        "run-direct-receipt-production-migration.mjs",
        "--execute",
        "--confirm",
        CONFIRMATION,
        "--idempotency-key",
        "rfd-tuw-021-production-execute",
        "--output",
        join(executeOutputDir, "receipt.json"),
      ],
      { runCommand: executeHarness.runCommand },
    );
    assert.equal(report.production_write_executed, true);
    assert.deepEqual(executeHarness.events.map((event) => event.execute), [false, true, false]);
    assert.equal(executeHarness.calls.filter(({ command }) => command === "aws").length, 4);
  } finally {
    rmSync(executeOutputDir, { recursive: true, force: true });
  }
});

test("RFD-TUW-021 production caller denies dirty, non-main, and unapproved execution before AWS", async () => {
  const dirty = productionCommandHarness({ dirtyStatus: " M secret-production-path" });
  await assert.rejects(
    runDirectReceiptProductionMigration(["node", "script"], { runCommand: dirty.runCommand }),
    (error) => error.code === "DIRECT_RECEIPT_CLEAN_TREE_REQUIRED"
      && error.message.includes("changed_entry_count=1")
      && error.message.includes("status_digest=")
      && error.changed_entry_count === 1
      && /^[a-f0-9]{64}$/u.test(error.status_digest)
      && !error.message.includes("secret-production-path"),
  );
  assert.equal(dirty.calls.length, 1);

  const nonMain = productionCommandHarness({ originSha: "c".repeat(40) });
  await assert.rejects(
    runDirectReceiptProductionMigration(["node", "script"], { runCommand: nonMain.runCommand }),
    /exact origin\/main/u,
  );
  assert.equal(nonMain.calls.length, 4);

  const unapproved = productionCommandHarness();
  await assert.rejects(
    runDirectReceiptProductionMigration(
      ["node", "script", "--execute", "--idempotency-key", "rfd-tuw-021-unapproved"],
      { runCommand: unapproved.runCommand },
    ),
    /--confirm must equal/u,
  );
  assert.equal(unapproved.calls.length, 4);

  const freshCli = spawnSync(
    process.execPath,
    ["scripts/run-direct-receipt-production-migration.mjs"],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(freshCli.status, 1);
  assert.equal(freshCli.stdout, "");
  assert.match(freshCli.stderr, /DIRECT_RECEIPT_CLEAN_TREE_REQUIRED/u);
  assert.match(freshCli.stderr, /"changed_entry_count":\d+/u);
  assert.match(freshCli.stderr, /"status_digest":"[a-f0-9]{64}"/u);
  assert.doesNotMatch(freshCli.stderr, /\/Users\/|\/var\/folders\/|file:/u);
});
