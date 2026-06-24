#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { handleHrxApiRequest } from "../apps/api/src/hrx-runtime-context.js";
import { resolveHrxRoutePolicy } from "../apps/api/src/routes/hrx/route-policy-map.js";
import {
  createLegalPeopleApiSeed,
  createLegalPeoplePermissionContext,
  createLegalPeopleReadModel,
  LCX_PPL_API_BOUNDARY,
} from "../packages/hrx/src/legal-people-api.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const contractPath = "docs/lazycodex/people-reflection/legal-people-api-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/legal-people-api-contract.md";
const evidencePath = "docs/lazycodex/people-reflection/lcx-ppl-04-evidence.json";
const sourcePath = "packages/hrx/src/legal-people-api.js";
const runtimePath = "apps/api/src/hrx-runtime-context.js";
const policyPath = "apps/api/src/routes/hrx/route-policy-map.js";
const packageTestPath = "packages/hrx/test/legal-people-api.test.js";
const apiTestPath = "apps/api/test/hrx/legal-people-api.test.js";
const routeAuthzTestPath = "apps/api/test/hrx/route-authz.test.js";

for (const path of [
  contractPath,
  summaryPath,
  evidencePath,
  sourcePath,
  runtimePath,
  policyPath,
  packageTestPath,
  apiTestPath,
  routeAuthzTestPath,
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:ppl:api:validate"], "node scripts/validate-lcx-ppl-api.mjs");

const contract = readJson(contractPath);
const evidence = readJson(evidencePath);
const source = read(sourcePath);
const runtimeSource = read(runtimePath);
const policySource = read(policyPath);
const packageTestSource = read(packageTestPath);
const apiTestSource = read(apiTestPath);
const routeAuthzTestSource = read(routeAuthzTestPath);

assert.equal(contract.schema_version, "lawos.lcx_ppl.legal_people_api_contract.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(contract.scope, ["LCX-PPL-04.01", "LCX-PPL-04.02", "LCX-PPL-04.03", "LCX-PPL-04.04"]);
assert.equal(contract.status, "local_runtime_api_ready");
assert.equal(contract.claim_boundary.people_search_api_complete, true);
assert.equal(contract.claim_boundary.people_detail_api_complete, true);
assert.equal(contract.claim_boundary.relationship_api_complete, true);
assert.equal(contract.claim_boundary.permission_aware_api_response_complete, true);
assert.equal(contract.claim_boundary.ui_reflection_complete, false);
assert.equal(contract.claim_boundary.browser_qa_complete, false);
assert.equal(contract.claim_boundary.runtime_ready_candidate_complete, false);
assert.equal(contract.claim_boundary.production_ready, false);
assert.equal(contract.claim_boundary.go_live_approved, false);
assert.equal(contract.claim_boundary.enterprise_trust_approved, false);
assert.equal(contract.claim_boundary.ai_final_decision_allowed, false);

for (const endpoint of [
  "GET /api/hrx/legal-people/search",
  "GET /api/hrx/legal-people/:person_id",
  "GET /api/hrx/legal-people/relationships",
]) {
  assert.ok(contract.endpoints.includes(endpoint), `contract missing endpoint ${endpoint}`);
}

for (const exportName of [
  "createLegalPeopleApiSeed",
  "createLegalPeoplePermissionContext",
  "createLegalPeopleReadModel",
  "LCX_PPL_API_BOUNDARY",
]) {
  assert.match(source, new RegExp(`export (function|const) ${exportName}`), `source missing export ${exportName}`);
}

for (const marker of [
  "/api/hrx/legal-people/search",
  "/api/hrx/legal-people/relationships",
  "HRX_LEGAL_PERSON_NOT_FOUND",
  "createLegalPeoplePermissionContext",
]) {
  assert.match(runtimeSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `runtime missing ${marker}`);
}

for (const marker of [
  "hrx.legal_people.search",
  "hrx.legal_people.relationships",
  "hrx.legal_people.detail",
  "hrx.legal_people.read",
]) {
  assert.match(policySource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `policy missing ${marker}`);
}

for (const route of [
  ["GET", "/api/hrx/legal-people/search"],
  ["GET", "/api/hrx/legal-people/person_client_contact_001"],
  ["GET", "/api/hrx/legal-people/relationships"],
]) {
  const policy = resolveHrxRoutePolicy({ method: route[0], pathname: route[1] });
  assert.equal(policy?.required_scope, "hrx.legal_people.read", `missing legal People policy for ${route.join(" ")}`);
}

for (const marker of [
  "searches legal People by type, organization, Client, Matter, and status filters",
  "redacts restricted relationship and sensitive person details",
  "relationship API pivots by person, Client, Matter, and Organization",
]) {
  assert.match(packageTestSource, new RegExp(marker), `package test missing marker ${marker}`);
}

for (const marker of [
  "GET /api/hrx/legal-people/search",
  "GET /api/hrx/legal-people/:person_id",
  "GET /api/hrx/legal-people/relationships",
  "legal People route authz fails before runtime",
]) {
  assert.match(apiTestSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `api test missing marker ${marker}`);
}
assert.match(routeAuthzTestSource, /hrx\.legal_people\.read/, "route authz tests must include legal People read scope");

const seed = createLegalPeopleApiSeed("tenant-validator");
const readModel = createLegalPeopleReadModel({ seed });
const restricted = createLegalPeoplePermissionContext({ actor_id: "people-ops", actor_role: "people_ops" });
const privileged = createLegalPeoplePermissionContext({ actor_id: "legal-ops", actor_role: "legal_ops,conflicts_reviewer" });

const search = readModel.searchPeople({ tenant_id: "tenant-validator", type_id: "client_contact" }, restricted);
assert.equal(search.people.length, 1);
assert.equal(Object.hasOwn(search.people[0], "sensitive_refs"), false);

const restrictedDetail = readModel.getPersonDetail({ tenant_id: "tenant-validator", person_id: "person_client_contact_001" }, restricted);
const restrictedClientRelationship = restrictedDetail.relationships.find(
  (relationship) => relationship.relationship_type === "person_to_client_contact",
);
assert.equal(restrictedClientRelationship.target_id, null);
assert.equal(restrictedClientRelationship.access_state, "restricted");
assert.equal(JSON.stringify(restrictedDetail).includes("PortalAccess:client_lcx_001"), false);

const privilegedDetail = readModel.getPersonDetail({ tenant_id: "tenant-validator", person_id: "person_client_contact_001" }, privileged);
const privilegedClientRelationship = privilegedDetail.relationships.find(
  (relationship) => relationship.relationship_type === "person_to_client_contact",
);
assert.equal(privilegedClientRelationship.target_id, "client_lcx_001");

const matterRelationships = readModel.listRelationships(
  { tenant_id: "tenant-validator", target_type: "matter", target_id: "matter_lcx_001" },
  privileged,
);
assert.ok(matterRelationships.relationships.length >= 2);

const runtime = {
  legalPeopleReadModel: createLegalPeopleReadModel({ seed: createLegalPeopleApiSeed("tenant-a") }),
  audit: {
    append(event) {
      return event;
    },
  },
};
const runtimeSearch = handleHrxApiRequest({
  pathname: "/api/hrx/legal-people/search",
  method: "GET",
  query: { type_id: "client_contact" },
  context: runtime,
  requestContext: { tenant_id: "tenant-a", actor_id: "validator-user", actor_role: "people_ops" },
});
assert.equal(runtimeSearch.status, 200);
assert.equal(runtimeSearch.body.people.length, 1);

const runtimeDetail = handleHrxApiRequest({
  pathname: "/api/hrx/legal-people/person_client_contact_001",
  method: "GET",
  context: runtime,
  requestContext: { tenant_id: "tenant-a", actor_id: "validator-user", actor_role: "people_ops" },
});
assert.equal(runtimeDetail.status, 200);
assert.equal(runtimeDetail.body.relationships[0].target_id, null);

assert.deepEqual(evidence.scope, contract.scope);
assert.equal(evidence.claim_boundary.people_search_api_complete, true);
assert.equal(evidence.claim_boundary.permission_aware_api_response_complete, true);
assert.equal(evidence.claim_boundary.production_ready, false);
assert.equal(evidence.claim_boundary.enterprise_trust_approved, false);

assert.equal(LCX_PPL_API_BOUNDARY.runtime_ready_candidate_complete, false);
assert.equal(LCX_PPL_API_BOUNDARY.production_ready, false);
assert.equal(LCX_PPL_API_BOUNDARY.go_live_approved, false);
assert.equal(LCX_PPL_API_BOUNDARY.enterprise_trust_approved, false);
assert.equal(LCX_PPL_API_BOUNDARY.ai_final_decision_allowed, false);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  scope: contract.scope,
  endpoints: contract.endpoints.length,
  legal_people_seed_count: seed.people.length,
  relationship_count: seed.relationshipSeed.relationships.length,
  search_api_complete: LCX_PPL_API_BOUNDARY.people_search_api_complete,
  detail_api_complete: LCX_PPL_API_BOUNDARY.people_detail_api_complete,
  relationship_api_complete: LCX_PPL_API_BOUNDARY.relationship_api_complete,
  permission_aware_api_response_complete: LCX_PPL_API_BOUNDARY.permission_aware_api_response_complete,
  runtime_ready_candidate_complete: LCX_PPL_API_BOUNDARY.runtime_ready_candidate_complete,
  production_ready: LCX_PPL_API_BOUNDARY.production_ready,
  enterprise_trust_approved: LCX_PPL_API_BOUNDARY.enterprise_trust_approved
}, null, 2));
