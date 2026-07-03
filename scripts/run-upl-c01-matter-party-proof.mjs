#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-c01-matter-party-proof.json");
const TENANT = "tenant_upl_c01_matter_party";
const MATTER_ID = "matter_upl_c01";
const ACTOR = "user_upl_c01_matter";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_c01_matter_party_read&audit_hint_ref=upl_c01_api_proof`;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["matter_runtime_user"] },
    rules: [{ id: `rule_upl_c01_${effect}`, effect, action: "*" }],
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

function matterRecord() {
  return {
    model_type: "Matter",
    matter_id: MATTER_ID,
    tenant_id: TENANT,
    client_id: "client_upl_c01",
    legal_client_party_id: "party_upl_c01_client",
    title: "UPL-C-01 adverse party matter",
    status: "opening",
    created_by: ACTOR,
    created_at: "2026-07-03T00:00:00.000Z",
    permission_envelope_id: "perm_upl_c01_matter",
    audit_trace_id: "audit_upl_c01_matter",
  };
}

function adversePartyPayload() {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c01_matter_party_write",
    audit_hint_ref: "upl_c01_api_proof",
    actor_id: ACTOR,
    idempotency_key: "upl-c01-adverse-party-register",
    matter_party: {
      matter_party_id: "matter_party_upl_c01_adverse",
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      party_id: "party_upl_c01_adverse",
      display_name: "상대방 주식회사",
      party_role: "adverse_party",
      retroactive_entry: true,
    },
  };
}

const matterRepository = createMatterRepository({ seedRecords: [matterRecord()] });
const started = await startApiServer({ port: 0, matterRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const created = await apiJson(baseUrl, `/api/matters/${MATTER_ID}/parties`, {
    method: "POST",
    body: JSON.stringify(adversePartyPayload()),
  });
  const replay = await apiJson(baseUrl, `/api/matters/${MATTER_ID}/parties`, {
    method: "POST",
    body: JSON.stringify(adversePartyPayload()),
  });
  const listed = await apiJson(baseUrl, `/api/matters/${MATTER_ID}/parties?${BASE_QUERY}&party_role=adverse_party`);
  const detail = await apiJson(baseUrl, `/api/matters/${MATTER_ID}?${BASE_QUERY}`);
  const command = await apiJson(baseUrl, `/api/matters/${MATTER_ID}/command-center?${BASE_QUERY}`);
  const audit = await apiJson(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
  const auditActions = new Set((audit.body.items ?? []).map((event) => event.action));
  const checks = [
    {
      id: "adverse-party-registers-retroactive-conflict-subject",
      passed:
        created.status === 201 &&
        created.body.item?.display_name === "상대방 주식회사" &&
        created.body.item?.party_role === "adverse_party" &&
        created.body.item?.conflict_subject === true &&
        created.body.item?.retroactive_entry === true &&
        created.body.item?.raw_contact_values_included === false,
    },
    {
      id: "idempotent-replay-does-not-duplicate-party",
      passed:
        replay.status === 200 &&
        replay.body.outcome === "idempotent_replay" &&
        listed.status === 200 &&
        listed.body.items?.length === 1,
    },
    {
      id: "matter-detail-command-center-show-adverse-party",
      passed:
        detail.status === 200 &&
        detail.body.item?.adverse_party_count === 1 &&
        detail.body.adverse_parties?.[0]?.display_name === "상대방 주식회사" &&
        command.status === 200 &&
        command.body.adverse_parties?.[0]?.display_name === "상대방 주식회사",
    },
    {
      id: "audit-and-safe-output-boundary",
      passed:
        audit.status === 200 &&
        auditActions.has("matter.party.registered") &&
        created.body.production_ready_claim === false &&
        command.body.production_ready_claim === false &&
        !JSON.stringify({ created: created.body, command: command.body }).match(/password|credential|token_material|secret/i),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-c01.matter-party-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-01",
    route_surface: [
      "POST /api/matters/:matterId/parties",
      "GET /api/matters/:matterId/parties",
      "GET /api/matters/:matterId",
      "GET /api/matters/:matterId/command-center",
      "GET /api/matters/audit",
    ],
    checks,
    observed: {
      created: { status: created.status, item: created.body.item, adverse_parties: created.body.adverse_parties },
      replay: { status: replay.status, outcome: replay.body.outcome },
      listed: { status: listed.status, count: listed.body.items?.length, items: listed.body.items },
      detail: { status: detail.status, adverse_party_count: detail.body.item?.adverse_party_count },
      command: { status: command.status, adverse_parties: command.body.adverse_parties },
      audit: { status: audit.status, actions: [...auditActions].sort() },
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
