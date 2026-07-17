#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DOMAIN_IDS, hashDomainValue } from "../packages/persistence/src/domain-ledger.js";
import { createPostgresDomainLedger } from "../packages/persistence/src/postgres/domain-ledger.js";
import { runPostgresMigrations } from "../packages/persistence/src/postgres/migration-runner.js";
import { createPostgresPool } from "../packages/persistence/src/postgres/pool.js";
import { validateRuntimeSafetyEvidence } from "./lib/runtime-safety-evidence-contract.mjs";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function timestampAfter(startedAt) {
  return new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
}

function syntheticSnapshot({ tenantId, domainId, runId }) {
  const recordId = `synthetic-${domainId}-${runId}`;
  return {
    tenant_id: tenantId,
    domain_id: domainId,
    records: [{
      tenant_id: tenantId,
      domain_id: domainId,
      record_type: "SyntheticCutoverProbe",
      record_id: recordId,
      unique_key: `synthetic:${runId}`,
      payload: {
        model_type: "SyntheticCutoverProbe",
        synthetic_only: true,
        environment: "staging",
        domain_id: domainId,
        run_ref: sha256(runId),
        phase: "final_delta",
      },
      append_only: false,
      references: [],
    }],
    idempotency_entries: [{
      tenant_id: tenantId,
      domain_id: domainId,
      key: `synthetic-import:${runId}`,
      request_hash: hashDomainValue({ domainId, runId, operation: "synthetic-staging-import" }),
      response: { accepted: true, synthetic_only: true },
    }],
    audit_events: [{
      tenant_id: tenantId,
      domain_id: domainId,
      event_id: `synthetic-import:${runId}`,
      event_type: "runtime_safety.synthetic_staging_import",
      actor_id: "runtime-safety-staging-rehearsal",
      object_type: "SyntheticCutoverProbe",
      object_id: recordId,
      payload: { synthetic_only: true, phase: "final_delta" },
    }],
  };
}

function evidenceBase({ targetSourceSha, targetTree, toolchainSha, startedAt, finishedAt, outputPath, outputSha }) {
  return {
    schema_version: "law-firm-os.runtime-safety.command-evidence.v0.2",
    target_source_sha: targetSourceSha,
    target_tree: targetTree,
    toolchain_sha: toolchainSha,
    profile: "external-authorized",
    started_at: startedAt,
    finished_at: finishedAt,
    skip_count: 0,
    output_path: outputPath,
    output_sha256: outputSha,
  };
}

const startedAt = new Date().toISOString();
const connectionString = required(process.env.DATABASE_URL, "DATABASE_URL");
const approvalRef = required(arg("--approval-ref"), "--approval-ref");
const userInstructionSha = required(arg("--user-instruction-sha256"), "--user-instruction-sha256");
if (!/^[0-9a-f]{64}$/u.test(userInstructionSha)) throw new Error("--user-instruction-sha256 must be lowercase SHA-256");
const outputDir = resolve(required(arg("--output-dir"), "--output-dir"));
const runId = randomUUID();
const tenantA = `tenant-synthetic-cutover-a-${runId}`;
const tenantB = `tenant-synthetic-cutover-b-${runId}`;
const pool = createPostgresPool({
  connectionString,
  sslMode: "verify-full",
  connectionTimeoutMillis: 10_000,
  statementTimeoutMillis: 30_000,
  max: 4,
  applicationName: "lawos-cut-staging-synthetic",
});

const domainResults = [];
let migrationResults;
let rlsCounts;
let outboxCount = 0;
try {
  migrationResults = await runPostgresMigrations(pool, { appliedBy: "runtime-safety-staging-synthetic" });
  const ledger = createPostgresDomainLedger({ pool });
  for (const domainId of DOMAIN_IDS) {
    const snapshot = syntheticSnapshot({ tenantId: tenantA, domainId, runId });
    const imported = await ledger.importSnapshot(snapshot);
    const replay = await ledger.importSnapshot(snapshot);
    const shadow = await ledger.compareSnapshot(snapshot);
    if (shadow.comparison.equal !== true || replay.replayed !== true) throw new Error(`staging import invariant failed: ${domainId}`);
    const rehearsal = await ledger.recordRehearsal({
      tenant_id: tenantA,
      domain_id: domainId,
      import_receipt_id: imported.receipt.receipt_id,
      shadow_receipt_id: shadow.receipt.receipt_id,
      smoke_result: { synthetic_only: true, environment: "staging", adapter: "postgres-v2" },
    });
    const record = snapshot.records[0];
    const dbOnlyWrite = await ledger.write({
      ...record,
      expected_version: 1,
      payload: { ...record.payload, phase: "db_only_write", json_dual_write: false },
    });
    await ledger.appendAudit({
      tenant_id: tenantA,
      domain_id: domainId,
      event_id: `synthetic-db-only:${runId}`,
      event_type: "runtime_safety.synthetic_db_only_write",
      actor_id: "runtime-safety-staging-rehearsal",
      object_type: record.record_type,
      object_id: record.record_id,
      payload: { synthetic_only: true, json_dual_write: false },
    });
    domainResults.push({
      domain_id: domainId,
      imported: imported.receipt.status === "source_imported",
      replayed: replay.replayed,
      shadow_equal: shadow.comparison.equal,
      difference_count: shadow.comparison.difference_count,
      rehearsal_status: rehearsal.status,
      db_only_state_version: dbOnlyWrite.state_version,
    });
  }

  const tenantBSnapshot = syntheticSnapshot({ tenantId: tenantB, domainId: "matter", runId: `other-${runId}` });
  await ledger.importSnapshot(tenantBSnapshot);

  const client = await pool.connect();
  try {
    const currentUser = (await client.query("SELECT current_user AS user_name")).rows[0].user_name;
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/u.test(currentUser)) throw new Error("staging database user name is invalid");
    await client.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lawos_staging_rehearsal') THEN
          CREATE ROLE lawos_staging_rehearsal NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        END IF;
      END
    $$`);
    await client.query(`GRANT lawos_staging_rehearsal TO "${currentUser}"`);
    await client.query("GRANT USAGE ON SCHEMA lawos_domain, lawos_runtime TO lawos_staging_rehearsal");
    await client.query("GRANT SELECT ON ALL TABLES IN SCHEMA lawos_domain TO lawos_staging_rehearsal");
    await client.query("GRANT SELECT, INSERT ON lawos_runtime.outbox_events TO lawos_staging_rehearsal");
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE lawos_staging_rehearsal");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantA]);
    const tenantAVisible = await client.query("SELECT count(*)::int AS count FROM lawos_domain.records");
    await client.query("ROLLBACK");
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE lawos_staging_rehearsal");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantB]);
    const tenantBVisible = await client.query("SELECT count(*)::int AS count FROM lawos_domain.records");
    await client.query("ROLLBACK");
    rlsCounts = { tenant_a_visible: tenantAVisible.rows[0].count, tenant_b_visible: tenantBVisible.rows[0].count };
    if (rlsCounts.tenant_a_visible !== DOMAIN_IDS.length || rlsCounts.tenant_b_visible !== 1) {
      throw new Error("staging tenant RLS visibility invariant failed");
    }

    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE lawos_staging_rehearsal");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantA]);
    await client.query(
      `INSERT INTO lawos_runtime.outbox_events
         (tenant_id, event_id, topic, payload, status, created_at)
       VALUES ($1, $2, 'runtime_safety.synthetic_staging_smoke', $3::jsonb, 'pending', clock_timestamp())`,
      [tenantA, `synthetic-outbox:${runId}`, JSON.stringify({ synthetic_only: true, domain_count: DOMAIN_IDS.length })],
    );
    const outbox = await client.query(
      "SELECT count(*)::int AS count FROM lawos_runtime.outbox_events WHERE event_id = $1",
      [`synthetic-outbox:${runId}`],
    );
    await client.query("COMMIT");
    outboxCount = outbox.rows[0].count;
    if (outboxCount !== 1) throw new Error("staging synthetic outbox smoke failed");
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

const safeOutput = {
  schema_version: "law-firm-os.runtime-safety.staging-rehearsal-output.v0.1",
  environment: "staging",
  synthetic_only: true,
  domain_count: DOMAIN_IDS.length,
  migration_count: migrationResults.length,
  migration_applied_count: migrationResults.filter((row) => row.applied).length,
  import_count: domainResults.filter((row) => row.imported).length,
  replay_count: domainResults.filter((row) => row.replayed).length,
  shadow_equal_count: domainResults.filter((row) => row.shadow_equal).length,
  shadow_difference_count: domainResults.reduce((total, row) => total + row.difference_count, 0),
  rehearsal_count: domainResults.filter((row) => row.rehearsal_status === "source_ready").length,
  db_only_write_count: domainResults.filter((row) => row.db_only_state_version === 2).length,
  json_dual_write_count: 0,
  rls_counts: rlsCounts,
  audit_event_count: DOMAIN_IDS.length * 2,
  outbox_event_count: outboxCount,
  forest_ui_smoke_executed: false,
  exact_head_staging_deployed: false,
  real_client_data_used: false,
  secret_material_recorded: false,
};
const outputPath = join(outputDir, "staging-rehearsal-output.json");
writeJson(outputPath, safeOutput);
const outputBytes = readFileSync(outputPath);
const outputSha = sha256(outputBytes);
const finishedAt = timestampAfter(startedAt);
const targetSourceSha = git("rev-parse", "HEAD");
const targetTree = git("rev-parse", "HEAD^{tree}");
const toolchainSha = git("hash-object", fileURLToPath(import.meta.url));
const base = evidenceBase({ targetSourceSha, targetTree, toolchainSha, startedAt, finishedAt, outputPath, outputSha });

function executionEvidence(tuwId, verified) {
  const resultSlice = `isolated:${tuwId}:staging-rehearsal`;
  return {
    commands: [{
      ordinal: 1,
      argv: [
        "node", "scripts/run-central-ledger-staging-rehearsal.mjs",
        "--approval-ref", approvalRef,
        "--user-instruction-sha256", userInstructionSha,
        "--output-dir", outputDir,
      ],
      cwd: process.cwd(),
      env_keys: ["DATABASE_URL"],
      parser: "json",
      timeout_ms: 3_600_000,
      result_slice: resultSlice,
    }],
    results: [{
      ordinal: 1,
      exit_code: 0,
      started_at: startedAt,
      finished_at: finishedAt,
      output_sha256: outputSha,
      result_slice: resultSlice,
      passed: true,
      skipped: 0,
    }],
    claims: {
      verified,
      source_merge_candidate: false,
      production_ready: false,
      release_executed: false,
      aws_mutation_executed: true,
      provider_contacted: false,
      idp_contacted: false,
      staging_contacted: true,
      production_contacted: false,
      real_data_contacted: false,
      windows_signing_executed: false,
      cutover_executed: false,
      json_authority_disabled: false,
      go_live: false,
    },
    external_actions: [{
      action: "central_ledger_staging_rehearsal",
      environment: "staging",
      executed: true,
      approval_id: approvalRef,
      user_instruction_sha256: userInstructionSha,
    }],
  };
}

const receipts = [
  {
    ...base,
    ...executionEvidence("RS-CUT-005", true),
    tuw_id: "RS-CUT-005",
    implementation_state: "VERIFIED",
    execution_state: "REHEARSED",
    safe_counts: {
      migration_count: safeOutput.migration_count,
      migration_applied_count: safeOutput.migration_applied_count,
      synthetic_domain_count: safeOutput.domain_count,
      import_count: safeOutput.import_count,
      replay_count: safeOutput.replay_count,
      shadow_equal_count: safeOutput.shadow_equal_count,
      shadow_difference_count: 0,
    },
  },
  {
    ...base,
    ...executionEvidence("RS-CUT-006", false),
    tuw_id: "RS-CUT-006",
    implementation_state: "READY",
    execution_state: "REHEARSED",
    safe_counts: {
      synthetic_db_only_write_count: safeOutput.db_only_write_count,
      json_dual_write_count: 0,
      exact_head_api_switch_count: 0,
    },
    blockers: ["EXACT_HEAD_STAGING_API_NOT_DEPLOYED", "POSTGRES_V2_FULL_API_AUTHORITY_INCOMPLETE"],
  },
  {
    ...base,
    ...executionEvidence("RS-CUT-007", false),
    tuw_id: "RS-CUT-007",
    implementation_state: "READY",
    execution_state: "REHEARSED",
    safe_counts: {
      tenant_visibility_scope_count: 2,
      synthetic_audit_event_count: safeOutput.audit_event_count,
      synthetic_outbox_event_count: safeOutput.outbox_event_count,
      forest_ui_smoke_count: 0,
    },
    blockers: ["EXACT_HEAD_STAGING_API_NOT_DEPLOYED", "FOREST_UI_POST_CUTOVER_SMOKE_NOT_RUN"],
  },
];

for (const receipt of receipts) {
  validateRuntimeSafetyEvidence(receipt, { outputBytes, allowedOutputRoots: [outputDir] });
  writeJson(join(outputDir, receipt.tuw_id, "command-evidence.v0.2.json"), receipt);
}
process.stdout.write(`${JSON.stringify({
  outcome: "PASS_WITH_DECLARED_BLOCKERS",
  execution_state: "REHEARSED",
  output_sha256: outputSha,
  safe_counts: {
    domain_count: safeOutput.domain_count,
    import_count: safeOutput.import_count,
    db_only_write_count: safeOutput.db_only_write_count,
    json_dual_write_count: 0,
    rls_scope_count: 2,
    outbox_event_count: safeOutput.outbox_event_count,
  },
  blockers: receipts.flatMap((receipt) => receipt.blockers ?? []),
})}\n`);
