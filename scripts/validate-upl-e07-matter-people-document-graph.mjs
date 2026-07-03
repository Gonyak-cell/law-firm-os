#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveHrxRoutePolicy } from "../apps/api/src/routes/hrx/route-policy-map.js";
import {
  createMatterPeopleDocumentGraphSeed,
  createMatterPeopleDocumentGraphTable,
  MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY,
} from "../packages/hrx/src/matter-people-document-graph.js";
import { createLegalPeoplePermissionContext } from "../packages/hrx/src/legal-people-api.js";

const ROOT = process.cwd();
const requiredFiles = [
  "packages/hrx/src/matter-people-document-graph.js",
  "packages/hrx/test/matter-people-document-graph.test.js",
  "packages/hrx/src/index.js",
  "apps/api/src/hrx-runtime-context.js",
  "apps/api/src/routes/hrx/route-policy-map.js",
  "apps/api/test/hrx/legal-people-api.test.js",
  "apps/api/test/hrx/route-authz.test.js",
  "scripts/run-upl-e07-matter-people-document-graph-proof.mjs",
  "artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json",
  "artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const source = read("packages/hrx/src/matter-people-document-graph.js");
const runtime = read("apps/api/src/hrx-runtime-context.js");
const policy = read("apps/api/src/routes/hrx/route-policy-map.js");
const apiTest = read("apps/api/test/hrx/legal-people-api.test.js");
const packageTest = read("packages/hrx/test/matter-people-document-graph.test.js");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json"));

for (const marker of [
  "createMatterPeopleDocumentGraphTable",
  "createMatterPeopleDocumentRelationship",
  "matter_people_document_relationship_table",
  "traversal_paths",
  "raw_document_text_included: false",
]) {
  assert.ok(source.includes(marker), `source missing marker: ${marker}`);
}

for (const marker of [
  "createMatterPeopleDocumentGraphTable",
  "matterPeopleDocumentGraphRuntimeSeed",
  "/api/hrx/legal-people/matter-graph/traverse",
  "hrx.legal_people.graph.read",
]) {
  assert.ok(runtime.includes(marker), `runtime missing marker: ${marker}`);
}

assert.ok(policy.includes("hrx.legal_people.matter_graph_traverse"));
const routePolicy = resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/legal-people/matter-graph/traverse" });
assert.equal(routePolicy.required_scope, "hrx.legal_people.read");

for (const marker of [
  "GET /api/hrx/legal-people/matter-graph/traverse returns matter-people-document graph traversal",
  "document_lcx_expert_report_001",
  "person_document",
]) {
  assert.ok(apiTest.includes(marker), `api test missing marker: ${marker}`);
}

for (const marker of [
  "UPL-E-07 graph table stores matter, people, and document relationships",
  "UPL-E-07 traversal reaches people and documents from a matter pivot",
  "UPL-E-07 restricted traversal redacts review-required endpoints",
]) {
  assert.ok(packageTest.includes(marker), `package test missing marker: ${marker}`);
}

const tenant_id = "tenant-e07-validator";
const table = createMatterPeopleDocumentGraphTable(createMatterPeopleDocumentGraphSeed(tenant_id));
const privileged = createLegalPeoplePermissionContext({ actor_id: "validator", actor_role: "legal_ops,conflicts_reviewer" });
const traversal = table.traverse({ tenant_id, start_type: "matter", start_id: "matter_lcx_001", depth: 2 }, privileged);
assert.equal(traversal.outcome, "ok");
assert.ok(traversal.nodes.some((node) => node.node_type === "document"));
assert.ok(traversal.relationships.some((row) => row.relationship_type === "person_document"));
assert.ok(traversal.traversal_paths.some((path) => path.to.node_id === "document_lcx_expert_report_001"));
assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.traversal_api_complete, true);
assert.equal(MATTER_PEOPLE_DOCUMENT_GRAPH_BOUNDARY.production_ready, false);

assert.equal(artifact.pass, true, "proof artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-E-07"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
for (const id of [
  "e07-api-route-200",
  "e07-relationship-table-kind",
  "e07-matter-people-document-nodes",
  "e07-required-relationship-types",
  "e07-matter-person-document-path",
  "e07-restricted-redaction",
  "e07-no-raw-document-body",
  "e07-no-production-claim",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-e07-matter-people-document-graph",
  artifact: "artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json",
  route: "/api/hrx/legal-people/matter-graph/traverse",
}, null, 2));
