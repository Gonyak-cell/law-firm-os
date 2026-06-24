import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const BASE_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "legal-people-api-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.legal_people.read,hrx.audit.read",
});

const PRIVILEGED_HEADERS = Object.freeze({
  ...BASE_HEADERS,
  "x-lawos-actor-role": "security_admin,legal_ops,conflicts_reviewer",
});

async function json(path, headers = BASE_HEADERS) {
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

test("GET /api/hrx/legal-people/:person_id returns permission-aware detail payload", async () => {
  const restricted = await json("/api/hrx/legal-people/person_client_contact_001");
  assert.equal(restricted.status, 200);
  const restrictedRelationship = restricted.body.relationships.find(
    (relationship) => relationship.relationship_type === "person_to_client_contact",
  );
  assert.equal(restrictedRelationship.target_id, null);
  assert.equal(restrictedRelationship.access_state, "restricted");
  assert.equal(restricted.body.claim_boundary.production_ready, false);

  const privileged = await json("/api/hrx/legal-people/person_client_contact_001", PRIVILEGED_HEADERS);
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

test("GET /api/hrx/legal-people/ethics returns review queue, wall evidence, and reviewer receipt boundary", async () => {
  const restricted = await json("/api/hrx/legal-people/ethics");
  assert.equal(restricted.status, 200);
  assert.equal(restricted.body.outcome, "ok");
  assert.equal(restricted.body.review_queue.length, 4);
  assert.equal(restricted.body.ethical_walls.length, 2);
  assert.equal(restricted.body.reviewer_receipts[0].access_state, "restricted");
  assert.equal(JSON.stringify(restricted.body).includes("reviewer-legal-001"), false);
  assert.equal(restricted.body.claim_boundary.ai_final_decision_allowed, false);

  const privileged = await json("/api/hrx/legal-people/ethics?matter_id=matter_lcx_001", PRIVILEGED_HEADERS);
  assert.equal(privileged.status, 200);
  assert.equal(privileged.body.permission_summary.can_view_reviewer_details, true);
  assert.ok(privileged.body.reviewer_receipts.some((receipt) => receipt.rollback_ref));
  assert.ok(privileged.body.permission_links.some((link) => link.admin_surface_ref === "People:permission-admin"));
});

test("legal People route authz fails before runtime when legal People scope is absent", async () => {
  const { status, body } = await json("/api/hrx/legal-people/search", {
    ...BASE_HEADERS,
    "x-lawos-hrx-scopes": "hrx.employee.read",
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.legal_people.read");
});
