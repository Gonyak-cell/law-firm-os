import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  SMALL_FIRM_PERFORMANCE_CONTRACT,
  createSmallFirmPerformanceHarness,
  duplicateMatterTaskCount,
  readMatterPerformanceSourceState,
  runSmallFirmOpsPerformance,
} from "../../../scripts/run-matter-small-firm-performance.mjs";

function redCaseContract() {
  return {
    ...SMALL_FIRM_PERFORMANCE_CONTRACT,
    warmup_reads_per_query: 1,
    measured_reads_per_query: 1,
    concurrency: 1,
  };
}

test("[TUW-42] ordinary test invocation never emits JSON without explicit --output", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "lawos-small-firm-performance-no-output-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const execution = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../../../scripts/run-matter-small-firm-performance.mjs", import.meta.url))],
    { cwd, encoding: "utf8" },
  );

  assert.notEqual(execution.status, 0);
  assert.match(execution.stderr, /explicit --output <performance\.json> is required/);
  assert.deepEqual(await readdir(cwd), []);
});

test("[TUW-42] JSON evidence binds the base HEAD and dirty working-tree fingerprints", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "lawos-small-firm-performance-source-state-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  const outputPath = join(outputDir, "performance.json");
  const expectedSourceState = readMatterPerformanceSourceState({ cwd: process.cwd() });
  const execution = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../../../scripts/run-matter-small-firm-performance.mjs", import.meta.url)),
      "--output",
      outputPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(execution.status, 0, execution.stderr);
  const result = JSON.parse(await readFile(outputPath, "utf8"));
  assert.deepEqual({
    source_sha: result.source_sha,
    source_dirty: result.source_dirty,
    diff_sha256: result.diff_sha256,
    status_sha256: result.status_sha256,
    manifest_sha256: result.manifest_sha256,
    working_tree_sha256: result.working_tree_sha256,
  }, expectedSourceState);
  assert.equal(result.source_sha, expectedSourceState.source_sha);
  assert.equal(typeof result.source_dirty, "boolean");
  assert.match(result.working_tree_sha256, /^[0-9a-f]{64}$/);
});

test("[TUW-42] 10-person operations reads meet the deterministic performance and duplicate-ledger gate", async (t) => {
  const harness = createSmallFirmPerformanceHarness();
  const { fixture_counts: expected } = SMALL_FIRM_PERFORMANCE_CONTRACT;

  assert.deepEqual({
    people: harness.fixture.people.length,
    matters: harness.fixture.matters.length,
    active_tasks: harness.fixture.tasks.length,
    deadlines: harness.fixture.calendar_events.length,
    followups: harness.fixture.followups.length,
  }, expected);
  assert.equal(duplicateMatterTaskCount(harness.fixture.tasks), 0);

  const result = await runSmallFirmOpsPerformance({
    reads: harness.reads,
    fixture: harness.fixture,
  });

  assert.equal(result.warmup_reads_per_query, 10);
  assert.equal(result.measured_reads_per_query, 100);
  assert.equal(result.concurrency, 4);
  assert.match(result.runtime.node, /^v\d+\./);
  assert.equal(result.warmup_error_count, 0);
  assert.equal(result.duplicate_matter_task_count, 0);
  assert.deepEqual(Object.keys(result.by_query), ["today", "task_queue"]);
  assert.deepEqual(result.query_routes, {
    today: "GET /api/matter/ops/today",
    task_queue: "GET /api/matter/ops/tasks?view=my",
  });
  for (const [name, query] of Object.entries(result.by_query)) {
    assert.equal(query.sample_count, 100, `${name} sample count`);
    assert.equal(query.error_count, 0, `${name} error count`);
    assert.ok(
      query.p95_ms <= SMALL_FIRM_PERFORMANCE_CONTRACT.thresholds_ms.p95,
      `${name} p95 ${query.p95_ms}ms`,
    );
    assert.ok(
      query.p99_ms <= SMALL_FIRM_PERFORMANCE_CONTRACT.thresholds_ms.p99,
      `${name} p99 ${query.p99_ms}ms`,
    );
  }
  assert.equal(result.aggregate.sample_count, 200);
  assert.equal(result.aggregate.error_count, 0);
  assert.ok(
    result.aggregate.p95_ms <= SMALL_FIRM_PERFORMANCE_CONTRACT.thresholds_ms.p95,
    `p95 ${result.aggregate.p95_ms}ms`,
  );
  assert.ok(
    result.aggregate.p99_ms <= SMALL_FIRM_PERFORMANCE_CONTRACT.thresholds_ms.p99,
    `p99 ${result.aggregate.p99_ms}ms`,
  );
  assert.equal(result.passed, true);
  t.diagnostic(JSON.stringify({
    samples: result.aggregate.sample_count,
    concurrency: result.concurrency,
    p95_ms: result.aggregate.p95_ms,
    p99_ms: result.aggregate.p99_ms,
    errors: result.aggregate.error_count,
    duplicate_matter_tasks: result.duplicate_matter_task_count,
  }));
});

test("[TUW-42 red] duplicate MatterTask rows fail the performance gate", async () => {
  const harness = createSmallFirmPerformanceHarness();
  const duplicateFixture = Object.freeze({
    ...harness.fixture,
    tasks: Object.freeze([
      ...harness.fixture.tasks,
      Object.freeze({ ...harness.fixture.tasks[0] }),
    ]),
  });

  const result = await runSmallFirmOpsPerformance({
    reads: harness.reads,
    fixture: duplicateFixture,
    contract: redCaseContract(),
  });

  assert.equal(duplicateMatterTaskCount(duplicateFixture.tasks), 1);
  assert.equal(result.duplicate_matter_task_count, 1);
  assert.equal(result.aggregate.error_count, 0);
  assert.equal(result.passed, false);
});

test("[TUW-42 red] a failing API read fails the performance gate and records the error", async () => {
  const harness = createSmallFirmPerformanceHarness();
  const failure = new Error("synthetic read failure");
  const result = await runSmallFirmOpsPerformance({
    reads: {
      today: {
        execute: () => {
          throw failure;
        },
        validate: harness.reads.today.validate,
      },
      task_queue: harness.reads.task_queue,
    },
    fixture: harness.fixture,
    contract: redCaseContract(),
  });

  assert.equal(result.by_query.today.sample_count, 0);
  assert.equal(result.by_query.today.error_count, 1);
  assert.equal(result.warmup_error_count, 1);
  assert.equal(result.aggregate.error_count, 1);
  assert.equal(result.errors.filter((error) => error.query === "today").length, 2);
  assert.match(result.errors.at(-1).message, /synthetic read failure/);
  assert.equal(result.passed, false);
});
