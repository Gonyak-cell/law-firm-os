import assert from "node:assert/strict";
import test from "node:test";
import { findRegisteredAccountByUserId, highestPrivilegeRegisteredAccount } from "../../src/matter-vault-account-registry.js";
import { startApiServer } from "../../src/server.js";
import { apiSessionHeaders } from "../helpers/session.js";

let server;
let baseUrl;

const RESTRICTED_ACCOUNT = findRegisteredAccountByUserId("user_amic_bj_park");
const NO_LEGAL_PEOPLE_SCOPE_ACCOUNT = findRegisteredAccountByUserId("user_amic_sypark");
const PRIVILEGED_ACCOUNT = highestPrivilegeRegisteredAccount();
const sessionHeaderCache = new Map();

const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";

function permissionContext(ctx) {
  const principal = {
    tenant_id: "tenant-a",
    user_id: "legal-people-api-user",
    actor_id: "legal-people-api-user",
    role_ids: ["people_ops"],
  };
  if (ctx === "review") {
    return JSON.stringify({
      principal,
      rules: [{ id: "rule_hrx_legal_people_review", effect: "review_required", action: "*" }],
      object_acl: [],
    });
  }
  if (ctx === "denied") {
    return JSON.stringify({ principal, rules: [], object_acl: [] });
  }
  return JSON.stringify({
    principal,
    rules: [{ id: "rule_hrx_legal_people_allow", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function signedHeaders(account = RESTRICTED_ACCOUNT) {
  assert.ok(account, "registered account is required");
  const key = account.user_id;
  if (!sessionHeaderCache.has(key)) sessionHeaderCache.set(key, await apiSessionHeaders(baseUrl, account));
  return sessionHeaderCache.get(key);
}

async function json(path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await signedHeaders(options.account ?? RESTRICTED_ACCOUNT)),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("GET /api/hrx/legal-people/search returns unified legal People directory rows", async () => {
  const { status, body } = await json("/api/hrx/legal-people/search?type_id=client_contact");
  assert.equal(status, 200);
  assert.equal(body.outcome, "ok");
  assert.equal(body.people.length, 1);
  assert.equal(body.people[0].person_id, "person_client_contact_001");
  assert.equal(body.people[0].permission_summary.sensitive_fields_visible, false);
  assert.equal(Object.hasOwn(body.people[0], "sensitive_refs"), false);
});

test("GET /api/hrx/legal-people/search fails closed for UI denied context", async () => {
  const { status, body } = await json("/api/hrx/legal-people/search", {
    noAuth: true,
    headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("denied") },
  });
  assert.equal(status, 401);
  assert.ok(body.safe_error_codes.includes("AUTH_SESSION_REQUIRED"));
  assert.equal(JSON.stringify(body).includes("Ari Kim"), false);
  assert.equal(JSON.stringify(body).includes("person_client_contact_001"), false);
});

test("GET /api/hrx/legal-people/search ignores forged review context under signed session", async () => {
  const { status, body } = await json("/api/hrx/legal-people/search", {
    headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("review") },
  });
  assert.equal(status, 200);
  assert.equal(body.outcome, "ok");
  assert.ok(body.people.length > 1);
  assert.ok(body.people.some((person) => person.person_id === "person_client_contact_001"));
  assert.notEqual(body.ui_state, "review_required");
});

test("GET /api/hrx/legal-people/:person_id fails closed without detail payload for UI denied context", async () => {
  const { status, body } = await json("/api/hrx/legal-people/person_client_contact_001", { account: NO_LEGAL_PEOPLE_SCOPE_ACCOUNT });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.legal_people.read");
});

test("GET /api/hrx/legal-people/:person_id returns permission-aware detail payload", async () => {
  const restricted = await json("/api/hrx/legal-people/person_client_contact_001");
  assert.equal(restricted.status, 200);
  const restrictedRelationship = restricted.body.relationships.find(
    (relationship) => relationship.relationship_type === "person_to_client_contact",
  );
  assert.equal(restrictedRelationship.target_id, null);
  assert.equal(restrictedRelationship.access_state, "restricted");
  assert.equal(restricted.body.claim_boundary.production_ready, false);

  const privileged = await json("/api/hrx/legal-people/person_client_contact_001", { account: PRIVILEGED_ACCOUNT });
  const privilegedRelationship = privileged.body.relationships.find(
    (relationship) => relationship.relationship_type === "person_to_client_contact",
  );
  assert.equal(privileged.status, 200);
  assert.equal(privilegedRelationship.target_id, "client_lcx_001");
  assert.equal(privileged.body.permission_summary.can_view_sensitive_relationship_details, true);
});

test("GET /api/hrx/legal-people/relationships supports Matter pivot with redaction", async () => {
  const { status, body } = await json(
    "/api/hrx/legal-people/relationships?target_type=matter&target_id=matter_lcx_001",
  );
  assert.equal(status, 200);
  assert.equal(body.outcome, "ok");
  assert.ok(body.relationships.length >= 2);
  assert.ok(body.relationships.every((relationship) => relationship.target_type === "matter"));
  assert.ok(body.relationships.some((relationship) => relationship.access_state === "restricted"));
});

test("GET /api/hrx/legal-people/matter-graph/traverse returns matter-people-document graph traversal", async () => {
  const privileged = await json(
    "/api/hrx/legal-people/matter-graph/traverse?matter_id=matter_lcx_001&depth=2",
    { account: PRIVILEGED_ACCOUNT },
  );
  assert.equal(privileged.status, 200);
  assert.equal(privileged.body.table_kind, "matter_people_document_relationship_table");
  assert.ok(privileged.body.nodes.some((node) => node.node_type === "matter" && node.node_id === "matter_lcx_001"));
  assert.ok(privileged.body.nodes.some((node) => node.node_type === "person" && node.node_id === "person_internal_lawyer_001"));
  assert.ok(privileged.body.nodes.some((node) => node.node_type === "document" && node.node_id === "document_lcx_expert_report_001"));
  assert.ok(privileged.body.relationships.some((row) => row.relationship_type === "matter_person"));
  assert.ok(privileged.body.relationships.some((row) => row.relationship_type === "matter_document"));
  assert.ok(privileged.body.relationships.some((row) => row.relationship_type === "person_document"));
  assert.ok(
    privileged.body.traversal_paths.some((path) =>
      path.to.node_id === "document_lcx_expert_report_001" &&
      path.relationship_ids.includes("mpd_rel_expert_report"),
    ),
  );
  assert.equal(privileged.body.audit_summary.raw_document_text_included, false);
  assert.equal(privileged.body.claim_boundary.traversal_api_complete, true);

  const restricted = await json("/api/hrx/legal-people/matter-graph/traverse?matter_id=matter_lcx_001&depth=2");
  assert.equal(restricted.status, 200);
  assert.ok(restricted.body.relationships.some((row) => row.access_state === "restricted" && row.to_id === null));
  assert.equal(JSON.stringify(restricted.body).includes("document_lcx_expert_report_001"), false);

  const runtime = await json(
    "/api/hrx/legal-people/matter-graph/traverse?matter_id=matter-001&depth=2",
    { account: PRIVILEGED_ACCOUNT },
  );
  assert.equal(runtime.status, 200);
  assert.equal(runtime.body.table_source, "runtime_repository_plus_fixture");
  assert.ok(runtime.body.relationships.some((row) => row.relationship_id.startsWith("mpd_rt_")));
  assert.ok(runtime.body.nodes.some((node) => node.node_type === "document" && node.node_id.startsWith("doc-")));
});

test("GET /api/hrx/legal-people/ethics returns review queue, wall evidence, and reviewer receipt boundary", async () => {
  const restricted = await json("/api/hrx/legal-people/ethics");
  assert.equal(restricted.status, 200);
  assert.equal(restricted.body.outcome, "ok");
  assert.equal(restricted.body.review_queue.length, 4);
  assert.equal(restricted.body.ethical_walls.length, 2);
  assert.equal(restricted.body.reviewer_receipts[0].access_state, "restricted");
  assert.equal(JSON.stringify(restricted.body).includes("reviewer-legal-001"), false);
  assert.equal(restricted.body.claim_boundary.ai_final_decision_allowed, false);

  const privileged = await json("/api/hrx/legal-people/ethics?matter_id=matter_lcx_001", { account: PRIVILEGED_ACCOUNT });
  assert.equal(privileged.status, 200);
  assert.equal(privileged.body.permission_summary.can_view_reviewer_details, true);
  assert.ok(privileged.body.reviewer_receipts.some((receipt) => receipt.rollback_ref));
  assert.ok(privileged.body.permission_links.some((link) => link.admin_surface_ref === "People:permission-admin"));
});

test("legal People route authz fails before runtime when legal People scope is absent", async () => {
  const { status, body } = await json("/api/hrx/legal-people/search", { account: NO_LEGAL_PEOPLE_SCOPE_ACCOUNT });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.legal_people.read");
});
