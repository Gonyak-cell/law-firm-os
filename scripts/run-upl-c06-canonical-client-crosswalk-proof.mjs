#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import {
  AMIC_CURRENT_CLIENT_CANDIDATES,
  createAmicCurrentClientCandidateRecords,
  createMasterDataRepository,
} from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const JSON_PATH = join(ARTIFACT_DIR, "upl-c06-canonical-client-crosswalk-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c06-canonical-client-crosswalk-proof.md");
const TENANT = "tenant_upl_c06_single_real";
const ACTOR = "user_upl_c06_reviewer";
const SOURCE_REF = "amic_current_onedrive_folder_inventory_2026_07_01";
const TARGET_DISPLAY_NAME = "롯데에너지머티리얼즈";
const TARGET_QUERY_NAME = "롯데에너지머티리얼즈 주식회사";

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: `rule_upl_c06_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function currentClientRecords() {
  return createAmicCurrentClientCandidateRecords({ tenant_id: TENANT, owner_user_id: ACTOR });
}

function crosswalkRows(records) {
  const entities = records.filter((record) => record.model_type === "Entity" && record.client_source_ref === SOURCE_REF);
  const clientGroups = records.filter((record) => record.model_type === "ClientGroup" && record.client_source_ref === SOURCE_REF);
  return clientGroups.map((clientGroup) => {
    const entity = entities.find((candidate) => candidate.entity_id === clientGroup.rp04_entity_id);
    return {
      display_name: clientGroup.display_name,
      canonical_display_name: clientGroup.canonical_display_name,
      entity_id: entity?.entity_id ?? null,
      client_group_id: clientGroup.client_group_id,
      canonical_client_crosswalk_ref: clientGroup.canonical_client_crosswalk_ref,
      rp05_client_ref: clientGroup.rp05_client_ref,
      tenant_id: clientGroup.tenant_id,
      synthetic_only: clientGroup.synthetic_only,
      source_lanes: clientGroup.source_lanes,
      linked: Boolean(entity) && entity.canonical_client_group_id === clientGroup.client_group_id,
    };
  });
}

const records = currentClientRecords();
const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: "intake_upl_c06_new_client",
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c06_new_client",
      requesting_party_id: "party_upl_c06_new_client",
      party_ids: ["party_upl_c06_new_client"],
      requested_scope_summary: "실클라이언트 정본 대사 기반 충돌검사",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    ...records,
    {
      model_type: "Party",
      party_id: "party_upl_c06_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "신규 수임 검토 법인",
      status: "active",
      owner_user_id: ACTOR,
      synthetic_only: false,
    },
  ],
});

const matterRepository = createMatterRepository({ seedRecords: [] });
const started = await startApiServer({ port: 0, intakeRepository, crmMasterDataRepository, matterRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const check = await apiJson(baseUrl, "/api/intake/conflict-checks", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_c06_crosswalk_write",
      audit_hint_ref: "upl_c06_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-c06-conflict-check",
      conflict_check: {
        conflict_check_id: "conflict_upl_c06_real_client",
        tenant_id: TENANT,
        intake_request_id: "intake_upl_c06_new_client",
        party_snapshot: {
          party_ids: ["party_upl_c06_new_client"],
          aliases: [TARGET_QUERY_NAME],
        },
        snapshot_hash: "snapshot_upl_c06_real_client",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
      conflict_search: {
        conflict_search_id: "search_upl_c06_real_client",
        hit_count: 0,
      },
    }),
  });
  const audit = await apiJson(baseUrl, "/api/intake/audit?tenant_id=tenant_upl_c06_single_real&permission_ref=upl_c06_crosswalk_read&audit_hint_ref=upl_c06_api_proof");
  const rows = crosswalkRows(records);
  const linkedRows = rows.filter((row) => row.linked);
  const targetHits = check.body.conflict_hits?.filter((hit) => hit.matched_display_name === TARGET_DISPLAY_NAME) ?? [];
  const hitRefs = new Set(targetHits.map((hit) => hit.source_record_ref));
  const checks = [
    {
      id: "candidate-list-remains-99-current-clients",
      passed: AMIC_CURRENT_CLIENT_CANDIDATES.length === 99 && rows.length === 99,
    },
    {
      id: "rp04-entity-to-rp05-client-crosswalk-is-one-to-one",
      passed:
        linkedRows.length === 99 &&
        new Set(rows.map((row) => row.entity_id)).size === 99 &&
        new Set(rows.map((row) => row.client_group_id)).size === 99 &&
        new Set(rows.map((row) => row.canonical_client_crosswalk_ref)).size === 99,
    },
    {
      id: "single-tenant-current-client-readback-has-no-synthetic-client-groups",
      passed: rows.every((row) => row.tenant_id === TENANT && row.synthetic_only === false && row.rp05_client_ref === row.client_group_id),
    },
    {
      id: "crm-intake-conflict-search-uses-canonical-client-list",
      passed:
        check.status === 201 &&
        check.body.hit_count >= 1 &&
        targetHits.length >= 1 &&
        [...hitRefs].some((ref) => ref.startsWith("ClientGroup:") || ref.startsWith("Entity:") || ref.startsWith("Organization:")),
    },
    {
      id: "caller-hit-count-is-ignored-for-canonical-client-search",
      passed: check.body.conflict_search?.caller_supplied_hit_count_ignored === true && check.body.conflict_search?.hit_count === check.body.hit_count,
    },
    {
      id: "audit-and-safe-output-boundary",
      passed:
        audit.status === 200 &&
        (audit.body.items ?? []).some((event) => event.action === "conflict.search.executed") &&
        check.body.production_ready_claim === false &&
        !JSON.stringify({ check: check.body, audit: audit.body }).match(/password|credential|token_material|secret/i),
    },
  ];
  report = {
    schema_version: "law-firm-os.upl-c06.canonical-client-crosswalk-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-06",
    route_surface: ["POST /api/intake/conflict-checks", "GET /api/intake/audit"],
    source_ref: SOURCE_REF,
    target_display_name: TARGET_DISPLAY_NAME,
    target_query_name: TARGET_QUERY_NAME,
    counts: {
      candidate_count: AMIC_CURRENT_CLIENT_CANDIDATES.length,
      crosswalk_row_count: rows.length,
      linked_row_count: linkedRows.length,
      entity_record_count: records.filter((record) => record.model_type === "Entity").length,
      client_group_record_count: records.filter((record) => record.model_type === "ClientGroup").length,
    },
    checks,
    observed: {
      sample_crosswalk_rows: rows.slice(0, 10),
      target_hits: targetHits,
      conflict_search: check.body.conflict_search,
      audit_actions: (audit.body.items ?? []).map((event) => event.action).sort(),
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  MD_PATH,
  [
    "# UPL-C-06 Canonical Client Crosswalk Proof",
    "",
    `- verdict: ${report.verdict}`,
    `- contract_ref: ${report.contract_ref}`,
    `- source_ref: ${report.source_ref}`,
    `- candidate_count: ${report.counts.candidate_count}`,
    `- crosswalk_row_count: ${report.counts.crosswalk_row_count}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, report: MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
