#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";
import { findRegisteredAccountByUserId, highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";

const ROOT = process.cwd();
const JSON_PATH = "artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json";
const MD_PATH = "artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.md";
const PRIVILEGED_ACCOUNT = highestPrivilegeRegisteredAccount();
const RESTRICTED_ACCOUNT = findRegisteredAccountByUserId("user_amic_bj_park");

function nowIso() {
  return new Date().toISOString();
}

function nodeCountByType(nodes) {
  return nodes.reduce((acc, node) => {
    acc[node.node_type] = (acc[node.node_type] ?? 0) + 1;
    return acc;
  }, {});
}

function relationshipTypes(rows) {
  return [...new Set(rows.map((row) => row.relationship_type))].sort();
}

async function readJson(baseUrl, path, headers) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

function check(id, passed, evidence) {
  return Object.freeze({ id, passed: Boolean(passed), evidence });
}

let server;
try {
  assert.ok(RESTRICTED_ACCOUNT, "restricted account fixture is required");
  const started = await startApiServer({ port: 0 });
  server = started.server;
  const baseUrl = `http://${started.host}:${started.port}`;
  const runtimeRoute = "/api/hrx/legal-people/matter-graph/traverse?matter_id=matter-001&depth=2";
  const fixtureRoute = "/api/hrx/legal-people/matter-graph/traverse?matter_id=matter_lcx_001&depth=2";

  const forged = await readJson(baseUrl, runtimeRoute, {
    "x-lawos-tenant-id": "tenant_amic_matter_vault",
    "x-lawos-actor-id": "upl-e07-proof-user",
    "x-lawos-actor-role": "security_admin,legal_ops,conflicts_reviewer",
    "x-lawos-hrx-scopes": "hrx.legal_people.read,hrx.audit.read",
  });
  const privileged = await readJson(baseUrl, runtimeRoute, await apiSessionHeaders(baseUrl, PRIVILEGED_ACCOUNT));
  const restrictedFixture = await readJson(baseUrl, fixtureRoute, await apiSessionHeaders(baseUrl, RESTRICTED_ACCOUNT));

  assert.equal(privileged.status, 200);
  assert.equal(restrictedFixture.status, 200);

  const privilegedBody = privileged.body;
  const restrictedBody = restrictedFixture.body;
  const privilegedNodeCounts = nodeCountByType(privilegedBody.nodes);
  const privilegedRelationshipTypes = relationshipTypes(privilegedBody.relationships);
  const hasRuntimeRelationship = privilegedBody.relationships.some((row) =>
    row.relationship_id?.startsWith("mpd_rt_") && row.source_refs?.some((source) => source.startsWith("Hrx"))
  );
  const hasRuntimeMatterPersonDocumentPath = privilegedBody.traversal_paths.some((path) =>
    path.from.node_id === "matter-001" && path.to.node_type === "document"
  );
  const hasRestrictedRedaction = restrictedBody.relationships.some((row) => row.access_state === "restricted" && row.to_id === null);
  const restrictedSerialized = JSON.stringify(restrictedBody);
  const privilegedSerialized = JSON.stringify(privilegedBody);

  const checks = [
    check("e07-unsigned-forged-hrx-headers-blocked", forged.status === 401 && forged.body.safe_error_codes?.includes("AUTH_SESSION_REQUIRED"), {
      status: forged.status,
      safe_error_codes: forged.body.safe_error_codes,
    }),
    check("e07-api-route-200", privileged.status === 200 && restrictedFixture.status === 200, { runtimeRoute, fixtureRoute }),
    check("e07-relationship-table-kind", privilegedBody.table_kind === "matter_people_document_relationship_table", privilegedBody.table_kind),
    check("e07-runtime-repository-source", privilegedBody.table_source === "runtime_repository_plus_fixture", privilegedBody.table_source),
    check("e07-matter-people-document-nodes", privilegedNodeCounts.matter >= 1 && privilegedNodeCounts.person >= 1 && privilegedNodeCounts.document >= 1, privilegedNodeCounts),
    check("e07-required-relationship-types", ["matter_document", "matter_person", "person_document"].every((type) => privilegedRelationshipTypes.includes(type)), privilegedRelationshipTypes),
    check("e07-runtime-relationship-source-refs", hasRuntimeRelationship, privilegedBody.relationships),
    check("e07-runtime-matter-person-document-path", hasRuntimeMatterPersonDocumentPath, privilegedBody.traversal_paths),
    check("e07-restricted-redaction", hasRestrictedRedaction && !restrictedSerialized.includes("document_lcx_expert_report_001"), {
      restricted_edge_count: restrictedBody.relationships.filter((row) => row.access_state === "restricted").length,
    }),
    check("e07-no-raw-document-body", privilegedBody.audit_summary.raw_document_text_included === false && !privilegedSerialized.includes("must not be stored"), privilegedBody.audit_summary),
    check("e07-no-production-claim", privilegedBody.claim_boundary.production_ready === false, privilegedBody.claim_boundary),
  ];

  const artifact = {
    schema_version: "lawos.upl_e07.matter_people_document_graph_proof.v2",
    generated_at: nowIso(),
    tuw_ids: ["UPL-E-07"],
    pass: checks.every((item) => item.passed),
    production_ready_claim: false,
    go_live_claim: false,
    route: runtimeRoute,
    redaction_route: fixtureRoute,
    server_base_url: baseUrl,
    privileged_readback: {
      status: privileged.status,
      table_source: privilegedBody.table_source,
      node_counts: privilegedNodeCounts,
      relationship_types: privilegedRelationshipTypes,
      runtime_relationship_count: privilegedBody.relationships.filter((row) => row.relationship_id?.startsWith("mpd_rt_")).length,
      path_count: privilegedBody.traversal_paths.length,
      audit_summary: privilegedBody.audit_summary,
      claim_boundary: privilegedBody.claim_boundary,
    },
    restricted_readback: {
      status: restrictedFixture.status,
      restricted_relationship_count: restrictedBody.relationships.filter((row) => row.access_state === "restricted").length,
      serialized_contains_expert_document_id: restrictedSerialized.includes("document_lcx_expert_report_001"),
      serialized_contains_raw_document_body: restrictedSerialized.includes("must not be stored"),
    },
    checks,
  };

  mkdirSync(resolve(ROOT, dirname(JSON_PATH)), { recursive: true });
  writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    resolve(ROOT, MD_PATH),
    `# UPL-E-07 Matter-People-Document Graph Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

Route: \`${runtimeRoute}\`

## Readback

| Check | Result | Evidence |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- Production ready claim: false
- Go-live claim: false
- Relationship table source: runtime_repository_plus_fixture
- Raw document text included: false
- Provider payload included: false
`,
  );

  console.log(JSON.stringify({
    pass: artifact.pass,
    artifact: JSON_PATH,
    route: runtimeRoute,
    table_source: privilegedBody.table_source,
    node_counts: privilegedNodeCounts,
    relationship_types: privilegedRelationshipTypes,
  }, null, 2));

  if (!artifact.pass) process.exitCode = 1;
} finally {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}
