#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  createLegalPeopleApiSeed,
  createLegalPeoplePermissionContext,
  createLegalPeopleReadModel
} from "../packages/hrx/src/legal-people-api.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const contractPath = "docs/lazycodex/people-reflection/legal-people-ui-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/legal-people-ui-contract.md";
const evidencePath = "docs/lazycodex/people-reflection/lcx-ppl-05-evidence.json";
const peopleHomePath = "apps/web/src/people/PeopleHome.tsx";
const legalPeopleWorkspacePath = "apps/web/src/people/legal/LegalPeopleWorkspace.tsx";
const hrxApiClientPath = "apps/web/src/people/hrxApiClient.ts";
const shellPath = "apps/web/src/components/Shell.jsx";
const clientsSurfacePath = "apps/web/src/components/ClientsSurface.jsx";
const mattersSurfacePath = "apps/web/src/components/MattersSurface.jsx";
const stylesPath = "apps/web/src/styles.css";

for (const path of [
  contractPath,
  summaryPath,
  evidencePath,
  peopleHomePath,
  legalPeopleWorkspacePath,
  hrxApiClientPath,
  shellPath,
  clientsSurfacePath,
  mattersSurfacePath,
  stylesPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:ppl:ui:validate"], "node scripts/validate-lcx-ppl-ui.mjs");

const contract = readJson(contractPath);
const evidence = readJson(evidencePath);

assert.equal(contract.schema_version, "lawos.lcx_ppl.legal_people_ui_contract.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(contract.scope, [
  "LCX-PPL-05.01",
  "LCX-PPL-05.02",
  "LCX-PPL-05.03",
  "LCX-PPL-05.04",
  "LCX-PPL-05.05"
]);
assert.equal(contract.status, "local_ui_reflection_ready");
assert.equal(contract.claim_boundary.people_navigation_ia_complete, true);
assert.equal(contract.claim_boundary.legal_people_directory_ui_complete, true);
assert.equal(contract.claim_boundary.people_detail_workspace_complete, true);
assert.equal(contract.claim_boundary.relationship_panel_complete, true);
assert.equal(contract.claim_boundary.client_matter_backlinks_complete, true);
assert.equal(contract.claim_boundary.browser_qa_complete, false);
assert.equal(contract.claim_boundary.runtime_ready_candidate_complete, false);
assert.equal(contract.claim_boundary.production_ready, false);
assert.equal(contract.claim_boundary.go_live_approved, false);
assert.equal(contract.claim_boundary.enterprise_trust_approved, false);
assert.equal(contract.claim_boundary.ai_final_decision_allowed, false);

for (const label of ["관리", "회사 설정", "구성원", "휴가관리", "요청 관리", "입퇴사 관리", "회사방침", "증명서 발급 요청", "승인 규칙", "인사기록", "권한", "리포트"]) {
  requireText(shellPath, label);
}

for (const hiddenLabel of ["관계자 관리", "사건 관련 인물", "인물 목록", "인물 검색", "연결 관계", "Client/Matter 연결", "구성원 운영", "설정·정산", "인사규정", "인력 현황", "인사정보 접근 권한"]) {
  assert.equal(read(shellPath).includes(hiddenLabel), false, `People sidebar must not expose removed legal-person menu label: ${hiddenLabel}`);
}

for (const hiddenSection of ["people-directory", "people-relationships", "people-conflicts"]) {
  assert.equal(read(shellPath).includes(`section: "${hiddenSection}"`), false, `People sidebar must not expose removed legal-person route: ${hiddenSection}`);
}

for (const marker of [
  "people-directory",
  "people-relationships",
  "people-conflicts",
  "LegalPeopleWorkspace",
  "구성원, 조직, 휴가관리",
  "회사방침, 급여정산"
]) {
  requireText(peopleHomePath, marker);
}

for (const marker of [
  "data-lcx-ppl-05-ui",
  "fetchLegalPeopleSearch",
  "fetchLegalPersonDetail",
  "fetchLegalPeopleRelationships",
  "Matter 참여자 확인",
  "참여자 상세",
  "Client·Matter 관련 기록",
  "이해상충 검토",
  "권한에 따라 축약"
]) {
  requireText(legalPeopleWorkspacePath, marker);
}

for (const marker of [
  "hrx.legal_people.read",
  "/api/hrx/legal-people/search",
  "/api/hrx/legal-people/relationships",
  "fetchLegalPeopleSearch",
  "fetchLegalPersonDetail",
  "fetchLegalPeopleRelationships"
]) {
  requireText(hrxApiClientPath, marker);
}

for (const marker of [
  "fetchLegalPeopleSearch",
  "client_id: \"client_lcx_001\"",
  "data-lcx-ppl-client-backlink",
  "관련 인물 연결"
]) {
  requireText(clientsSurfacePath, marker);
}

for (const marker of [
  "fetchLegalPeopleSearch",
  "matter_id: \"matter_lcx_001\"",
  "data-lcx-ppl-matter-backlink",
  "Matter 참여자와 관련 인물"
]) {
  requireText(mattersSurfacePath, marker);
}

for (const marker of [
  ".legal-people-runtime-grid",
  ".legal-people-search",
  ".legal-relationship-row",
  ".legal-people-backlink-row"
]) {
  requireText(stylesPath, marker);
}

const seed = createLegalPeopleApiSeed("tenant-validator");
const readModel = createLegalPeopleReadModel({ seed });
const privileged = createLegalPeoplePermissionContext({
  actor_id: "ui-validator",
  actor_role: "legal_ops,conflicts_reviewer,matter_admin"
});
const clientPeople = readModel.searchPeople({ tenant_id: "tenant-validator", client_id: "client_lcx_001" }, privileged);
const matterPeople = readModel.searchPeople({ tenant_id: "tenant-validator", matter_id: "matter_lcx_001" }, privileged);
assert.ok(clientPeople.people.length >= 3, "Client backlink pivot must return People records");
assert.ok(matterPeople.people.length >= 5, "Matter backlink pivot must return People records");

assert.deepEqual(evidence.scope, contract.scope);
assert.equal(evidence.claim_boundary.legal_people_ui_reflection_complete, true);
assert.equal(evidence.claim_boundary.client_matter_backlinks_complete, true);
assert.equal(evidence.claim_boundary.browser_qa_complete, false);
assert.equal(evidence.claim_boundary.people_legal_relationship_runtime_ready_candidate_complete, false);
assert.equal(evidence.claim_boundary.production_ready, false);
assert.equal(evidence.claim_boundary.go_live_approved, false);
assert.equal(evidence.claim_boundary.enterprise_trust_approved, false);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  scope: contract.scope,
  ui_surfaces: contract.ui_surfaces.length,
  client_backlink_people_count: clientPeople.people.length,
  matter_backlink_people_count: matterPeople.people.length,
  legal_people_ui_reflection_complete: contract.claim_boundary.legal_people_directory_ui_complete,
  client_matter_backlinks_complete: contract.claim_boundary.client_matter_backlinks_complete,
  browser_qa_complete: contract.claim_boundary.browser_qa_complete,
  runtime_ready_candidate_complete: contract.claim_boundary.runtime_ready_candidate_complete,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));
