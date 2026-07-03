#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-c02-conflict-search-proof.json");
const TENANT = "tenant_upl_c02_conflict_search";
const ACTOR = "user_upl_c02_conflict_reviewer";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_c02_conflict_read&audit_hint_ref=upl_c02_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: `rule_upl_c02_${effect}`, effect, action: "*" }],
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

const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: "intake_upl_c02_new_client",
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c02_new_client",
      requesting_party_id: "party_upl_c02_new_client",
      party_ids: ["party_upl_c02_new_client"],
      requested_scope_summary: "과거 사건 상대방의 신규 수임 검토",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c02_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "(주) 상대방테크",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "Matter",
      matter_id: "matter_upl_c02_former",
      tenant_id: TENANT,
      client_id: "client_upl_c02_existing",
      legal_client_party_id: "party_upl_c02_existing_client",
      title: "기존 의뢰인의 과거 분쟁",
      status: "closed",
      created_by: ACTOR,
      created_at: "2026-07-03T00:00:00.000Z",
      permission_envelope_id: "perm_upl_c02_former",
      audit_trace_id: "audit_upl_c02_former",
    },
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c02_adverse",
      matter_party_id: "matter_party_upl_c02_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c02_former",
      party_id: "party_upl_c02_adverse",
      display_name: "상대방 테크 주식회사",
      party_role: "adverse_party",
      role_scope: "matter_conflict_subject",
      conflict_subject: true,
      retroactive_entry: true,
      status: "active",
      raw_contact_values_included: false,
      production_ready_claim: false,
    },
  ],
});

const started = await startApiServer({ port: 0, intakeRepository, crmMasterDataRepository, matterRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const check = await apiJson(baseUrl, "/api/intake/conflict-checks", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_c02_conflict_write",
      audit_hint_ref: "upl_c02_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-c02-conflict-check",
      conflict_check: {
        conflict_check_id: "conflict_upl_c02_normalized",
        tenant_id: TENANT,
        intake_request_id: "intake_upl_c02_new_client",
        party_snapshot: { party_ids: ["party_upl_c02_new_client"] },
        snapshot_hash: "snapshot_upl_c02_new_client",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
      conflict_search: {
        conflict_search_id: "search_upl_c02_normalized",
        hit_count: 0,
      },
    }),
  });
  const replay = await apiJson(baseUrl, "/api/intake/conflict-checks", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: TENANT,
      permission_ref: "upl_c02_conflict_write",
      audit_hint_ref: "upl_c02_api_proof",
      actor_id: ACTOR,
      idempotency_key: "upl-c02-conflict-check",
      conflict_check: {
        conflict_check_id: "conflict_upl_c02_normalized",
        tenant_id: TENANT,
        intake_request_id: "intake_upl_c02_new_client",
        party_snapshot: { party_ids: ["party_upl_c02_new_client"] },
        snapshot_hash: "snapshot_upl_c02_new_client",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
      conflict_search: {
        conflict_search_id: "search_upl_c02_normalized",
        hit_count: 0,
      },
    }),
  });
  const audit = await apiJson(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
  const hit = check.body.conflict_hits?.[0];
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const checks = [
    {
      id: "normalized-adverse-party-generates-former-matter-hit",
      passed:
        check.status === 201 &&
        check.body.hit_count === 1 &&
        hit?.matched_display_name === "상대방 테크 주식회사" &&
        hit?.hit_source === "former_matter" &&
        hit?.severity === "high" &&
        hit?.matched_party_role === "adverse_party" &&
        ["exact_normalized", "partial_normalized", "fuzzy_normalized"].includes(hit?.match_kind),
    },
    {
      id: "caller-hit-count-is-ignored",
      passed:
        check.body.conflict_search?.hit_count === 1 &&
        check.body.conflict_search?.caller_supplied_hit_count_ignored === true &&
        check.body.conflict_search?.generated_hit_ids?.length === 1,
    },
    {
      id: "idempotent-replay-does-not-duplicate-hits",
      passed:
        replay.status === 200 &&
        replay.body.outcome === "idempotent_replay" &&
        replay.body.conflict_search?.hit_count === 1 &&
        replay.body.conflict_hits?.length === 1,
    },
    {
      id: "audit-and-safe-output-boundary",
      passed:
        audit.status === 200 &&
        auditActions.has("conflict.search.executed") &&
        auditActions.has("conflict.hit.create") &&
        check.body.production_ready_claim === false &&
        !JSON.stringify({ check: check.body, audit: audit.body }).match(/password|credential|token_material|secret/i),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-c02.conflict-search-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-02",
    route_surface: [
      "POST /api/intake/conflict-checks",
      "GET /api/intake/audit",
    ],
    checks,
    observed: {
      conflict_check: { status: check.status, item: check.body.item },
      conflict_search: check.body.conflict_search,
      conflict_hits: check.body.conflict_hits,
      replay: { status: replay.status, outcome: replay.body.outcome, hit_count: replay.body.hit_count },
      audit: { status: audit.status, actions: [...auditActions].sort() },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
