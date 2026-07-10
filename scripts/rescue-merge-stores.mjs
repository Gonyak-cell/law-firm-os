#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ensureLawosDurableStoreHome, lawosDurableStorePathOptions } from "../apps/api/src/local-durable-store-paths.js";
import { MASTER_DATA_RUNTIME_SEED } from "../apps/api/src/master-data-context.js";
import { MATTER_RUNTIME_SEED } from "../apps/api/src/matter-runtime-context.js";
import { CRM_RUNTIME_SEED, INTAKE_RUNTIME_SEED } from "../apps/api/src/crm-intake-runtime-context.js";
import { writeJsonFileDurably } from "../packages/persistence/src/durable-file.js";

const DEFAULT_RESCUE_ROOT = join(process.env.HOME, "lawos-backups", "data-rescue-2026-07-09");
const DEFAULT_ARTIFACT_PATH = resolve("artifacts", "manual-qa", "durable-data-rescue-merge-2026-07-09.json");
const PROBE_TERMS = Object.freeze(["그래비티랩스", "오윤록 외 2명", "새빗켐", "DEAL", "Project Tempus"]);

const STORE_DEFINITIONS = Object.freeze([
  Object.freeze({
    name: "master-data",
    fileName: "master-data-store.json",
    targetKey: "masterDataStorePath",
    seedRecords: MASTER_DATA_RUNTIME_SEED.records,
    emptyState: () => ({ schema_version: "law-firm-os.master-data-repository.v0.1", records: [] }),
  }),
  Object.freeze({
    name: "matter",
    fileName: "matter-store.json",
    targetKey: "matterStorePath",
    seedRecords: MATTER_RUNTIME_SEED.records,
    emptyState: () => ({ migrations: ["matter-core-001-file-store"], records: [], idempotency: [], audit_events: [] }),
  }),
  Object.freeze({
    name: "crm",
    fileName: "crm-store.json",
    targetKey: "crmStorePath",
    seedRecords: CRM_RUNTIME_SEED,
    emptyState: () => ({ migrations: ["crm-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] }),
  }),
  Object.freeze({
    name: "intake",
    fileName: "intake-store.json",
    targetKey: "intakeStorePath",
    seedRecords: INTAKE_RUNTIME_SEED,
    emptyState: () => ({ migrations: ["intake-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] }),
  }),
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function primaryId(record = {}) {
  for (const field of [
    "resource_id",
    "client_id",
    "matter_id",
    "member_id",
    "task_id",
    "event_id",
    "lead_id",
    "opportunity_id",
    "crm_activity_id",
    "proposal_id",
    "referral_id",
    "campaign_id",
    "intake_request_id",
    "conflict_check_id",
    "conflict_hit_id",
    "conflict_search_id",
    "conflict_decision_id",
    "waiver_id",
    "engagement_id",
    "template_document_id",
    "signed_document_upload_id",
    "fee_terms_id",
    "risk_approval_id",
    "clearance_token_id",
    "conflict_memo_id",
    "party_id",
    "entity_id",
    "person_id",
    "organization_id",
    "party_alias_id",
    "party_identifier_id",
    "client_group_id",
    "relationship_id",
    "contact_point_id",
    "billing_profile_id",
  ]) {
    if (typeof record[field] === "string" && record[field].trim()) return record[field];
  }
  return record.id;
}

function recordKey(record = {}) {
  return `${record.tenant_id ?? ""}:${record.model_type ?? record.object_type ?? ""}:${primaryId(record) ?? ""}`;
}

function idempotencyKey(entry = {}) {
  return `${entry.tenant_id ?? ""}:${entry.idempotency_key ?? entry.key ?? ""}`;
}

function auditKey(entry = {}) {
  return `${entry.tenant_id ?? ""}:${entry.event_id ?? entry.audit_event_id ?? entry.id ?? ""}`;
}

function timestampMs(record = {}, fallbackMs = 0) {
  for (const field of ["updated_at", "created_at", "source_mtime"]) {
    const parsed = Date.parse(record[field]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallbackMs;
}

async function walkFiles(root) {
  const results = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".json")) results.push(fullPath);
    }
  }
  await walk(root);
  return results.sort();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function mergeList({ map, incoming = [], keyFn, filePath, fileMtimeMs, conflicts }) {
  let added = 0;
  for (const entry of incoming) {
    const key = keyFn(entry);
    if (!key || key.endsWith(":")) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { value: entry, source_path: filePath, source_mtime_ms: fileMtimeMs });
      added += 1;
      continue;
    }
    if (stableJson(existing.value) === stableJson(entry)) continue;
    const existingMs = timestampMs(existing.value, existing.source_mtime_ms);
    const incomingMs = timestampMs(entry, fileMtimeMs);
    const choseIncoming = incomingMs >= existingMs;
    conflicts.push({
      key,
      previous_source: existing.source_path,
      incoming_source: filePath,
      selected_source: choseIncoming ? filePath : existing.source_path,
      rule: "latest_wins_updated_at_created_at_file_mtime",
    });
    if (choseIncoming) map.set(key, { value: entry, source_path: filePath, source_mtime_ms: fileMtimeMs });
  }
  return added;
}

function includesProbeTerm(record = {}) {
  const text = stableJson(record);
  return PROBE_TERMS.filter((term) => text.includes(term));
}

async function mergeStore({ definition, rescueFiles, targetPath }) {
  const targetExists = existsSync(targetPath);
  const targetState = targetExists ? await readJson(targetPath) : definition.emptyState();
  const seedMap = new Map(definition.seedRecords.map((record) => [recordKey(record), stableJson(record)]));
  const records = new Map((targetState.records ?? []).map((record) => [recordKey(record), {
    value: record,
    source_path: targetPath,
    source_mtime_ms: targetExists ? statSync(targetPath).mtimeMs : 0,
  }]));
  const idempotency = new Map((targetState.idempotency ?? []).map((entry) => [idempotencyKey(entry), {
    value: entry,
    source_path: targetPath,
    source_mtime_ms: targetExists ? statSync(targetPath).mtimeMs : 0,
  }]));
  const auditEvents = new Map((targetState.audit_events ?? []).map((entry) => [auditKey(entry), {
    value: entry,
    source_path: targetPath,
    source_mtime_ms: targetExists ? statSync(targetPath).mtimeMs : 0,
  }]));
  for (const record of definition.seedRecords) {
    if (!records.has(recordKey(record))) records.set(recordKey(record), { value: record, source_path: "code_seed", source_mtime_ms: 0 });
  }

  const summary = {
    store: definition.name,
    target_path: targetPath,
    rescue_files_scanned: 0,
    seed_identical_records_excluded: 0,
    rescue_records_considered: 0,
    rescue_records_added_or_modified: 0,
    idempotency_entries_added: 0,
    audit_events_added: 0,
    conflicts_auto_resolved: [],
  };

  for (const filePath of rescueFiles.filter((file) => basename(file) === definition.fileName)) {
    const fileMtimeMs = statSync(filePath).mtimeMs;
    const state = await readJson(filePath);
    summary.rescue_files_scanned += 1;
    for (const record of state.records ?? []) {
      const key = recordKey(record);
      const seedJson = seedMap.get(key);
      summary.rescue_records_considered += 1;
      if (seedJson && seedJson === stableJson(record)) {
        summary.seed_identical_records_excluded += 1;
        continue;
      }
      const before = records.get(key);
      mergeList({
        map: records,
        incoming: [record],
        keyFn: recordKey,
        filePath,
        fileMtimeMs,
        conflicts: summary.conflicts_auto_resolved,
      });
      const after = records.get(key);
      if (!before || stableJson(before.value) !== stableJson(after?.value)) summary.rescue_records_added_or_modified += 1;
    }
    summary.idempotency_entries_added += mergeList({
      map: idempotency,
      incoming: state.idempotency ?? [],
      keyFn: idempotencyKey,
      filePath,
      fileMtimeMs,
      conflicts: summary.conflicts_auto_resolved,
    });
    summary.audit_events_added += mergeList({
      map: auditEvents,
      incoming: state.audit_events ?? [],
      keyFn: auditKey,
      filePath,
      fileMtimeMs,
      conflicts: summary.conflicts_auto_resolved,
    });
  }

  const nextState = {
    ...targetState,
    ...(targetState.schema_version ? { schema_version: targetState.schema_version } : {}),
    migrations: targetState.migrations ?? definition.emptyState().migrations,
    records: [...records.values()].map((entry) => entry.value),
  };
  if ("idempotency" in definition.emptyState() || idempotency.size > 0) nextState.idempotency = [...idempotency.values()].map((entry) => entry.value);
  if ("audit_events" in definition.emptyState() || auditEvents.size > 0) nextState.audit_events = [...auditEvents.values()].map((entry) => entry.value);

  writeJsonFileDurably({
    filePath: targetPath,
    value: nextState,
    previousState: targetExists ? targetState : undefined,
    createBackup: targetExists,
  });

  summary.final_record_count = nextState.records.length;
  summary.probe_terms_found = Object.fromEntries(PROBE_TERMS.map((term) => [term, nextState.records.some((record) => includesProbeTerm(record).includes(term))]));
  summary.sample_sources = rescueFiles
    .filter((file) => basename(file) === definition.fileName)
    .slice(0, 6)
    .map((file) => relative(resolve(DEFAULT_RESCUE_ROOT), file));
  return summary;
}

async function main() {
  const args = new Map(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key.replace(/^--/, ""), rest.join("=") || "1"];
  }));
  const rescueRoot = resolve(args.get("rescue-root") ?? DEFAULT_RESCUE_ROOT);
  const artifactPath = resolve(args.get("artifact") ?? DEFAULT_ARTIFACT_PATH);
  const durableRoot = ensureLawosDurableStoreHome();
  const paths = lawosDurableStorePathOptions({ root: durableRoot });
  const rescueFiles = await walkFiles(rescueRoot);
  const stores = [];
  for (const definition of STORE_DEFINITIONS) {
    stores.push(await mergeStore({ definition, rescueFiles, targetPath: paths[definition.targetKey] }));
  }
  const receipt = {
    schema_version: "lawos.durable_data_rescue_merge.v0.1",
    generated_at: new Date().toISOString(),
    rescue_root: rescueRoot,
    durable_runtime_home: durableRoot,
    production_ready_claim: false,
    public_release_claim: false,
    merge_rule: "latest_wins_updated_at_created_at_file_mtime",
    probe_terms: PROBE_TERMS,
    probe_terms_found_any_store: Object.fromEntries(PROBE_TERMS.map((term) => [
      term,
      stores.some((store) => store.probe_terms_found[term] === true),
    ])),
    stores,
  };
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    outcome: "passed",
    artifact: artifactPath,
    durable_runtime_home: durableRoot,
    probe_terms_found_any_store: receipt.probe_terms_found_any_store,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exit(1);
  });
}
