#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { highestPrivilegeRegisteredAccount, MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";
import {
  AMIC_CURRENT_CLIENT_CANDIDATES,
  createAmicCurrentClientCandidateRecords,
  createMasterDataRepository,
} from "../packages/master-data/src/index.js";

const ROOT = process.cwd();
const JSON_PATH = "artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json";
const MD_PATH = "artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.md";
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const SOURCE_REF = "amic_current_onedrive_folder_inventory_2026_07_01";
const RESIDUE_PATTERN = /synthetic|mock|placeholder|dummy|fixture|^Pjt\.|^Project\b|선생님|원장님|회장님|교수님|작가|강제집행면탈|조세범/i;
const REMOVED_PROJECT_SELLER_NAMES = Object.freeze([
  "코오롱글로텍",
  "Katelynn Yun-Yu Owyang",
  "SMEJ Holdings, INC.",
  "에스엠스튜디오스",
  "고구려푸드",
  "고기깡패",
  "부산광역시",
  "아론",
  "ATU",
  "K-PLUS",
  "TAKE Foundation",
  "Titan",
  "오윤록 외 1명",
  "에이치엘엘중앙",
  "SMEJ Holdings, INC. 외 1명",
  "한흥수 외 6명",
  "강상도 외 16명",
]);

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await apiSessionHeaders(baseUrl, ACCOUNT)),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  return { status: response.status, body: await response.json() };
}

async function readAllClientGroups(baseUrl) {
  const items = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({
      tenant_id: TENANT,
      actor_user_id: ACTOR,
      permission_ref: "upl_a05_real_tenant_read",
      audit_hint_ref: "upl_a05_synthetic_residue_zero",
      model_type: "ClientGroup",
      limit: "50",
    });
    if (cursor) query.set("cursor", cursor);
    const response = await apiJson(baseUrl, `/master-data/records?${query.toString()}`);
    if (response.status !== 200) throw new Error(`master-data read failed: ${response.status}`);
    items.push(...(response.body.items ?? []));
    cursor = response.body.page_info?.next_cursor ?? null;
  } while (cursor);
  return items;
}

function displayResidue(row) {
  const fields = [row.display_name, row.canonical_display_name, row.client_short_name, ...(row.source_lanes ?? [])];
  return fields.filter((field) => typeof field === "string" && RESIDUE_PATTERN.test(field));
}

function check(id, passed, evidence) {
  return Object.freeze({ id, passed: Boolean(passed), evidence });
}

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: createAmicCurrentClientCandidateRecords({ tenant_id: TENANT, owner_user_id: ACTOR }),
});
const started = await startApiServer({
  port: 0,
  masterDataRepository: crmMasterDataRepository,
  crmMasterDataRepository,
});
let artifact;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const forgedQuery = new URLSearchParams({
    tenant_id: TENANT,
    actor_user_id: ACTOR,
    permission_ref: "upl_a05_real_tenant_read",
    audit_hint_ref: "upl_a05_synthetic_residue_zero",
    model_type: "ClientGroup",
    limit: "1",
  });
  const forgedRead = await apiJson(baseUrl, `/master-data/records?${forgedQuery.toString()}`, {
    noAuth: true,
    headers: { "x-lawos-permission-context": JSON.stringify({ rules: [{ effect: "allow", action: "*" }] }) },
  });
  const allClientGroups = await readAllClientGroups(baseUrl);
  const currentClientGroups = allClientGroups.filter((item) => item.client_source_ref === SOURCE_REF);
  const names = currentClientGroups.map((item) => item.display_name);
  const residueRows = currentClientGroups
    .map((row) => ({ client_group_id: row.client_group_id, display_name: row.display_name, residue: displayResidue(row) }))
    .filter((row) => row.residue.length > 0);
  const wrongTenantRows = currentClientGroups.filter((item) => item.tenant_id !== TENANT);
  const syntheticRows = currentClientGroups.filter((item) => item.synthetic_only !== false);
  const removedNameHits = REMOVED_PROJECT_SELLER_NAMES.filter((name) => names.includes(name));
  const checks = [
    check("a05-forged-permission-context-blocked", forgedRead.status === 401, { status: forgedRead.status }),
    check("a05-api-readback-uses-registered-tenant", currentClientGroups.length > 0 && wrongTenantRows.length === 0, {
      tenant_id: TENANT,
      current_client_group_count: currentClientGroups.length,
      wrong_tenant_count: wrongTenantRows.length,
    }),
    check("a05-current-client-count-99", currentClientGroups.length === AMIC_CURRENT_CLIENT_CANDIDATES.length && currentClientGroups.length === 99, {
      candidate_count: AMIC_CURRENT_CLIENT_CANDIDATES.length,
      readback_count: currentClientGroups.length,
    }),
    check("a05-synthetic-only-zero", syntheticRows.length === 0, {
      synthetic_only_true_count: syntheticRows.length,
    }),
    check("a05-display-residue-zero", residueRows.length === 0, {
      residue_count: residueRows.length,
      residue_rows: residueRows.slice(0, 10),
    }),
    check("a05-current-client-known-names-present", ["귀한사람들", "ATU Partners", "하이로닉", "롯데에너지머티리얼즈", "바이포엠스튜디오"].every((name) => names.includes(name)), {
      sample_names: names.slice(0, 12),
    }),
    check("a05-removed-project-seller-names-absent", removedNameHits.length === 0, {
      removed_name_hits: removedNameHits,
    }),
    check("a05-crosswalk-real-tenant-links-present", currentClientGroups.every((item) => item.rp05_client_ref === item.client_group_id && item.canonical_client_crosswalk_ref), {
      linked_count: currentClientGroups.filter((item) => item.rp05_client_ref === item.client_group_id && item.canonical_client_crosswalk_ref).length,
    }),
  ];

  artifact = {
    schema_version: "lawos.upl_a05.real_tenant_synthetic_residue_proof.v1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-A-05"],
    pass: checks.every((item) => item.passed),
    production_ready_claim: false,
    go_live_claim: false,
    api_base_url: baseUrl,
    tenant_id: TENANT,
    source_ref: SOURCE_REF,
    readback: {
      current_client_group_count: currentClientGroups.length,
      all_client_group_count: allClientGroups.length,
      wrong_tenant_count: wrongTenantRows.length,
      synthetic_only_true_count: syntheticRows.length,
      display_residue_count: residueRows.length,
      removed_name_hit_count: removedNameHits.length,
      known_names_present: ["귀한사람들", "ATU Partners", "하이로닉", "롯데에너지머티리얼즈", "바이포엠스튜디오"].filter((name) => names.includes(name)),
      sample_current_client_groups: currentClientGroups.slice(0, 10).map((item) => ({
        client_group_id: item.client_group_id,
        display_name: item.display_name,
        canonical_display_name: item.canonical_display_name,
        tenant_id: item.tenant_id,
        synthetic_only: item.synthetic_only,
        rp05_client_ref: item.rp05_client_ref,
      })),
    },
    residue_scan: {
      pattern: RESIDUE_PATTERN.source,
      residue_rows: residueRows,
      removed_name_hits: removedNameHits,
    },
    boundary: {
      signed_session_used: true,
      permission_context_header_used: false,
      forged_permission_context_status: forgedRead.status,
      session_token_written_to_artifact: false,
    },
    checks,
  };
} finally {
  await new Promise((resolveClose) => started.server.close(resolveClose));
}

mkdirSync(resolve(ROOT, dirname(JSON_PATH)), { recursive: true });
writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  resolve(ROOT, MD_PATH),
  `# UPL-A-05 Real-Tenant Synthetic Residue Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

Tenant: \`${artifact.tenant_id}\`

## Evidence

| Check | Result | Evidence |
|---|---|---|
${artifact.checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- Production ready claim: false
- Go-live claim: false
- Residue scan fields: display_name, canonical_display_name, client_short_name, source_lanes
`,
);

console.log(JSON.stringify({
  pass: artifact.pass,
  artifact: JSON_PATH,
  tenant_id: artifact.tenant_id,
  readback: artifact.readback,
}, null, 2));

if (!artifact.pass) process.exitCode = 1;
