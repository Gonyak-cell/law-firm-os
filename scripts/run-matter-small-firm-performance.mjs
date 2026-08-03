import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { handleMatterSmallFirmApiRequest } from "../apps/api/src/matter-small-firm-api.js";
import { createMatterSmallFirmRuntimeContext } from "../apps/api/src/matter-small-firm-runtime-context.js";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { createMatterRepository } from "../packages/matter/src/repository.js";

export const SMALL_FIRM_PERFORMANCE_CONTRACT = Object.freeze({
  tenant_id: "tenant-small-firm-performance",
  as_of: "2026-07-30T09:00:00.000Z",
  timezone: "Asia/Seoul",
  query_routes: Object.freeze({
    today: "GET /api/matter/ops/today",
    task_queue: "GET /api/matter/ops/tasks?view=my",
  }),
  fixture_counts: Object.freeze({
    people: 10,
    matters: 20,
    active_tasks: 200,
    deadlines: 40,
    followups: 20,
  }),
  warmup_reads_per_query: 10,
  measured_reads_per_query: 100,
  concurrency: 4,
  thresholds_ms: Object.freeze({ p95: 250, p99: 500 }),
});

function padded(value, width = 3) {
  return String(value).padStart(width, "0");
}

function frozenRows(count, build) {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze(build(index))));
}

export function createSmallFirmPerformanceFixture(contract = SMALL_FIRM_PERFORMANCE_CONTRACT) {
  const { tenant_id: tenantId, fixture_counts: counts } = contract;
  const createdAt = "2026-07-01T00:00:00.000Z";
  const people = frozenRows(counts.people, (index) => ({
    person_id: `person-${padded(index + 1, 2)}`,
    user_id: `user-${padded(index + 1, 2)}`,
    display_name: `[QA] 구성원 ${padded(index + 1, 2)}`,
  }));
  const matters = frozenRows(counts.matters, (index) => ({
    model_type: "Matter",
    tenant_id: tenantId,
    matter_id: `matter-${padded(index + 1)}`,
    matter_code: `QA-2026-${padded(index + 1)}`,
    client_id: `client-${padded((index % 5) + 1, 2)}`,
    title: `[QA] 성능 사건 ${padded(index + 1)}`,
    status: "open",
    created_by: "user-01",
    created_at: createdAt,
    permission_envelope_id: `permission-${padded(index + 1)}`,
    audit_trace_id: `audit-${padded(index + 1)}`,
  }));
  const tasks = frozenRows(counts.active_tasks, (index) => {
    const ordinal = index + 1;
    // Keep one assigned, undated row so the API's priority-based `my_work`
    // saved view has a deterministic non-empty result.
    const dueAt = index === 1 ? null : [
      "2026-07-29T03:00:00.000Z",
      "2026-07-30T03:00:00.000Z",
      "2026-07-31T03:00:00.000Z",
      "2026-08-01T03:00:00.000Z",
    ][index % 4];
    const status = index % 10 === 0 ? "blocked" : index % 3 === 0 ? "in_progress" : "todo";
    return {
      model_type: "MatterTask",
      tenant_id: tenantId,
      task_id: `task-${padded(ordinal)}`,
      matter_id: matters[index % matters.length].matter_id,
      title: `[QA] 활성 업무 ${padded(ordinal)}`,
      status,
      created_by: "user-01",
      assigned_to: index === 1 ? people[0].user_id : index % 20 === 0 ? null : people[index % people.length].user_id,
      backup_user_id: people[(index + 1) % people.length].user_id,
      wait_state: index % 5 === 0 ? "client_reply" : null,
      blocked_reason: status === "blocked" ? "선행 자료 대기" : null,
      due_at: dueAt,
      created_at: createdAt,
      updated_at: createdAt,
      source_ref: `performance:task-${padded(ordinal)}`,
    };
  });
  const calendar_events = frozenRows(counts.deadlines, (index) => ({
    model_type: "MatterCalendarEvent",
    tenant_id: tenantId,
    event_id: `deadline-${padded(index + 1)}`,
    matter_id: matters[index % matters.length].matter_id,
    title: `[QA] 기한 ${padded(index + 1)}`,
    status: "scheduled",
    starts_at: index % 2 === 0 ? "2026-07-30T06:00:00.000Z" : "2026-08-01T06:00:00.000Z",
    responsible_user_id: people[index % people.length].user_id,
    created_at: createdAt,
    updated_at: createdAt,
    source_ref: `performance:deadline-${padded(index + 1)}`,
  }));
  const followups = frozenRows(counts.followups, (index) => ({
    model_type: "MatterFollowUp",
    resource_id: `followup-${padded(index + 1)}`,
    followup_id: `followup-${padded(index + 1)}`,
    tenant_id: tenantId,
    matter_id: matters[index % matters.length].matter_id,
    title: `[QA] 후속 ${padded(index + 1)}`,
    channel: index % 2 === 0 ? "email" : "call",
    status: index % 2 === 0 ? "waiting_firm" : "waiting_client",
    owner_id: people[index % people.length].user_id,
    backup_owner_id: people[(index + 1) % people.length].user_id,
    next_action_at: index % 2 === 0 ? "2026-07-30T07:00:00.000Z" : "2026-08-01T07:00:00.000Z",
    created_by: "user-01",
    created_at: createdAt,
    updated_by: "user-01",
    updated_at: createdAt,
    source_ref: `performance:followup-${padded(index + 1)}`,
  }));
  return Object.freeze({ people, matters, tasks, calendar_events, followups });
}

export function duplicateMatterTaskCount(tasks = []) {
  return tasks.length - new Set(tasks.map((task) => `${task.tenant_id}:${task.task_id}`)).size;
}

const GIT_MAX_BUFFER = 256 * 1024 * 1024;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBuffer(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    maxBuffer: GIT_MAX_BUFFER,
  });
}

function gitText(cwd, args) {
  return gitBuffer(cwd, args).toString("utf8").trim();
}

function splitNull(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function dirtyFileFingerprint(cwd, relativePath) {
  const absolutePath = resolve(cwd, relativePath);
  if (!existsSync(absolutePath)) {
    return { mode: "deleted", size: 0, sha256: null };
  }

  const stat = lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(absolutePath);
    const content = Buffer.from(target, "utf8");
    return {
      mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
      size: content.length,
      sha256: sha256(content),
    };
  }

  if (!stat.isFile()) {
    return {
      mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
      size: stat.size,
      sha256: null,
    };
  }

  const content = readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: content.length,
    sha256: sha256(content),
  };
}

function sourceManifest(cwd) {
  const tracked = splitNull(gitBuffer(cwd, ["diff", "--name-only", "-z", "HEAD", "--"]));
  const untracked = splitNull(gitBuffer(cwd, ["ls-files", "--others", "--exclude-standard", "-z"]));
  const rows = [
    ...tracked.map((path) => ({ category: "tracked", path })),
    ...untracked.map((path) => ({ category: "untracked", path })),
  ]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map((row) => ({ ...row, ...dirtyFileFingerprint(cwd, row.path) }));
  const payload = rows.map((row) => [
    row.category,
    row.mode,
    row.size,
    row.sha256 ?? "deleted",
    row.path,
  ].join("\t")).join("\n");
  return { rows, payload };
}

/**
 * Capture the source identity that a JSON performance receipt is allowed to
 * claim. `source_sha` remains the base HEAD for backward compatibility; the
 * additional fingerprints bind the receipt to the dirty working tree, staged
 * and unstaged diff, and untracked source contents.
 */
export function readMatterPerformanceSourceState({ cwd = process.cwd() } = {}) {
  const repositoryRoot = resolve(cwd);
  const sourceSha = gitText(repositoryRoot, ["rev-parse", "HEAD"]);
  const diff = gitBuffer(repositoryRoot, ["diff", "--binary", "--full-index", "--no-ext-diff", "HEAD", "--"]);
  const status = gitBuffer(repositoryRoot, ["status", "--porcelain=v2", "--untracked-files=all", "-z"]);
  const manifest = sourceManifest(repositoryRoot);
  const diffSha256 = sha256(diff);
  const statusSha256 = sha256(status);
  const manifestSha256 = sha256(manifest.payload);
  return Object.freeze({
    source_sha: sourceSha,
    source_dirty: status.length > 0,
    diff_sha256: diffSha256,
    status_sha256: statusSha256,
    manifest_sha256: manifestSha256,
    working_tree_sha256: sha256([
      sourceSha,
      diffSha256,
      statusSha256,
      manifestSha256,
    ].join("\n")),
  });
}

export function createSmallFirmPerformanceHarness({
  fixture = createSmallFirmPerformanceFixture(),
  contract = SMALL_FIRM_PERFORMANCE_CONTRACT,
} = {}) {
  const repository = createMatterRepository({
    seedRecords: [
      ...fixture.matters,
      ...fixture.tasks,
      ...fixture.calendar_events,
      ...fixture.followups,
    ],
  });
  const runtime = createMatterSmallFirmRuntimeContext({
    matterRepository: repository,
    financeRepository: createFinanceRepository(),
    now: () => new Date(contract.as_of),
  });
  const context = Object.freeze({
    principal: Object.freeze({
      tenant_id: contract.tenant_id,
      user_id: "user-01",
      role_ids: Object.freeze(["administrator"]),
    }),
    rules: Object.freeze([{ id: "allow_performance_read", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
  const commonQuery = Object.freeze({
    tenant_id: contract.tenant_id,
    permission_ref: "performance_matter_small_firm_ops",
    audit_hint_ref: "performance_matter_small_firm_ops",
    as_of: contract.as_of,
    time_zone: contract.timezone,
  });
  let requestSequence = 0;
  const apiRead = (pathname, query) => handleMatterSmallFirmApiRequest({
    pathname,
    method: "GET",
    query: { ...commonQuery, ...query },
    body: {},
    context,
    requestId: `performance-${requestSequence += 1}`,
    runtime,
  });
  return Object.freeze({
    fixture,
    repository,
    reads: Object.freeze({
      today: Object.freeze({
        execute: () => apiRead("/api/matter/ops/today"),
        validate: (result) => {
          if (
            result?.status !== 200
            || result?.body?.item?.tenant_id !== contract.tenant_id
            || result?.body?.item?.lanes?.length !== 8
          ) {
            throw new Error("today operations response contract failed");
          }
        },
      }),
      task_queue: Object.freeze({
        execute: () => apiRead("/api/matter/ops/tasks", { view: "my" }),
        validate: (result) => {
          if (
            result?.status !== 200
            || result?.body?.view !== "my"
            || !Array.isArray(result?.body?.items)
            || result.body.items.length === 0
          ) {
            throw new Error("task queue response contract failed");
          }
        },
      }),
    }),
  });
}

function percentile(samples, fraction) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function rounded(value) {
  return value === null ? null : Number(value.toFixed(3));
}

function summarize(samples, errors) {
  return Object.freeze({
    sample_count: samples.length,
    error_count: errors.length,
    p50_ms: rounded(percentile(samples, 0.5)),
    p95_ms: rounded(percentile(samples, 0.95)),
    p99_ms: rounded(percentile(samples, 0.99)),
    max_ms: rounded(samples.length ? Math.max(...samples) : null),
  });
}

function normalizeRead(name, read) {
  const execute = typeof read === "function" ? read : read?.execute;
  if (typeof execute !== "function") throw new TypeError(`${name}.execute is required`);
  return Object.freeze({ execute, validate: typeof read?.validate === "function" ? read.validate : null });
}

export async function runSmallFirmOpsPerformance({
  reads,
  fixture = createSmallFirmPerformanceFixture(),
  contract = SMALL_FIRM_PERFORMANCE_CONTRACT,
  source_sha = null,
  source_state = null,
} = {}) {
  const normalizedReads = Object.freeze(Object.fromEntries(
    Object.entries(reads ?? {}).map(([name, read]) => [name, normalizeRead(name, read)]),
  ));
  const readNames = Object.keys(normalizedReads);
  if (readNames.length !== 2) throw new TypeError("exactly two performance reads are required");

  const warmupErrors = [];
  for (let round = 0; round < contract.warmup_reads_per_query; round += 1) {
    await Promise.all(readNames.map(async (name) => {
      try {
        const value = await normalizedReads[name].execute();
        normalizedReads[name].validate?.(value);
      } catch (error) {
        warmupErrors.push({
          query: name,
          request_index: round,
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
        });
      }
    }));
  }

  const jobs = Array.from(
    { length: contract.measured_reads_per_query },
    (_, index) => readNames.map((name) => ({ name, index })),
  ).flat();
  const samples = Object.fromEntries(readNames.map((name) => [name, []]));
  const errors = Object.fromEntries(readNames.map((name) => [name, []]));
  let nextJob = 0;

  async function worker() {
    while (nextJob < jobs.length) {
      const job = jobs[nextJob];
      nextJob += 1;
      const startedAt = performance.now();
      try {
        const value = await normalizedReads[job.name].execute();
        normalizedReads[job.name].validate?.(value);
        samples[job.name].push(performance.now() - startedAt);
      } catch (error) {
        errors[job.name].push({
          request_index: job.index,
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: contract.concurrency }, worker));
  const byQuery = Object.freeze(Object.fromEntries(readNames.map((name) => [
    name,
    summarize(samples[name], errors[name]),
  ])));
  const allSamples = readNames.flatMap((name) => samples[name]);
  const allErrors = readNames.flatMap((name) => errors[name].map((error) => ({ query: name, ...error })));
  const aggregate = summarize(allSamples, allErrors);
  const duplicateCount = duplicateMatterTaskCount(fixture.tasks);
  const queriesWithinThreshold = Object.values(byQuery).every((query) =>
    query.p95_ms <= contract.thresholds_ms.p95
      && query.p99_ms <= contract.thresholds_ms.p99);
  const passed = warmupErrors.length === 0
    && aggregate.error_count === 0
    && duplicateCount === 0
    && queriesWithinThreshold
    && aggregate.p95_ms <= contract.thresholds_ms.p95
    && aggregate.p99_ms <= contract.thresholds_ms.p99;

  return Object.freeze({
    schema_version: "law-firm-os.matter-small-firm-performance.v1",
    source_sha: source_state?.source_sha ?? source_sha,
    source_dirty: source_state?.source_dirty ?? null,
    diff_sha256: source_state?.diff_sha256 ?? null,
    status_sha256: source_state?.status_sha256 ?? null,
    manifest_sha256: source_state?.manifest_sha256 ?? null,
    working_tree_sha256: source_state?.working_tree_sha256 ?? null,
    runtime: Object.freeze({
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    }),
    tenant_id: contract.tenant_id,
    as_of: contract.as_of,
    timezone: contract.timezone,
    query_routes: contract.query_routes,
    fixture_counts: Object.freeze({
      people: fixture.people.length,
      matters: fixture.matters.length,
      active_tasks: fixture.tasks.length,
      deadlines: fixture.calendar_events.length,
      followups: fixture.followups.length,
    }),
    warmup_reads_per_query: contract.warmup_reads_per_query,
    measured_reads_per_query: contract.measured_reads_per_query,
    concurrency: contract.concurrency,
    thresholds_ms: contract.thresholds_ms,
    duplicate_matter_task_count: duplicateCount,
    warmup_error_count: warmupErrors.length,
    by_query: byQuery,
    aggregate,
    errors: Object.freeze([...warmupErrors, ...allErrors]),
    passed,
  });
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const outputArgument = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  if (!outputArgument) {
    throw new TypeError("explicit --output <performance.json> is required");
  }
  const outputPath = resolve(outputArgument);
  if (!outputPath.endsWith(".json")) throw new TypeError("--output must be a JSON path");
  const harness = createSmallFirmPerformanceHarness();
  const sourceState = readMatterPerformanceSourceState({ cwd: process.cwd() });
  const result = await runSmallFirmOpsPerformance({
    reads: harness.reads,
    fixture: harness.fixture,
    source_sha: sourceState.source_sha,
    source_state: sourceState,
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${outputPath}\n`);
  if (!result.passed) process.exitCode = 1;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
