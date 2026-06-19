// Deterministic in-process tests for the CMP-G2 Party Master runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";

const TENANT = "tenant_cmp_g2_party";
const OTHER_TENANT = "tenant_cmp_g2_other";
const ACTOR = "user_cmp_g2_party_owner";

let server;
let baseUrl;

function principal(overrides = {}) {
  return {
    user_id: ACTOR,
    tenant_id: TENANT,
    role_ids: ["party_admin"],
    ...overrides,
  };
}

function allowRules() {
  return [{ id: "rule_cmp_g2_party_admin", effect: "allow", action: "*", role_id: "party_admin" }];
}

function allowHeader(overrides = {}) {
  return {
    [PERMISSION_CONTEXT_HEADER]: JSON.stringify({
      principal: principal(overrides.principal),
      rules: overrides.rules ?? allowRules(),
    }),
  };
}

function authBody(requestId, overrides = {}) {
  return {
    request: { request_id: requestId, idempotency_key: `idem_${requestId}` },
    principal: principal(overrides.principal),
    rules: overrides.rules ?? allowRules(),
  };
}

async function get(path, headers = allowHeader()) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G2 health descriptor exposes Party Master after CMP-G1 dependency", async () => {
  const { status, body } = await get("/api/health");
  assert.equal(status, 200);
  const partyMaster = body.bounded_contexts.find((context) => context.bounded_context === "party-master");
  assert.ok(partyMaster);
  assert.equal(partyMaster.cmp_gate, "CMP-G2");
  assert.equal(partyMaster.depends_on, "CMP-G1-W01");
  assert.equal(partyMaster.tuw_ids.length, 19);
  assert.equal(partyMaster.tuw_ids[0], "CMP-G2-W02-T001");
  assert.equal(partyMaster.tuw_ids.at(-1), "CMP-G2-W02-T019");
  assert.equal(partyMaster.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G2 Party create fails closed without a G1 permission allow", async () => {
  const { status, body } = await post("/party-master/parties", {
    tenant_id: TENANT,
    party_id: "party_cmp_g2_denied",
    party_type: "organization",
    display_name: "Denied CMP G2 Party",
    status: "active",
    owner_user_id: ACTOR,
  });
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.deepEqual(body.safe_error_codes, ["CMP_G2_PERMISSION_DENIED"]);
});

test("CMP-G2 creates, lists, reads, and updates Party records with audit evidence", async () => {
  const legalClient = await post("/party-master/parties", {
    ...authBody("req_cmp_g2_party_legal"),
    tenant_id: TENANT,
    party_id: "party_cmp_g2_legal_client",
    party_type: "organization",
    display_name: "AMIC Client Korea",
    status: "active",
    owner_user_id: ACTOR,
    canonical_entity_id: "entity_cmp_g2_legal_client",
  });
  assert.equal(legalClient.status, 201);
  assert.equal(legalClient.body.outcome, "passed");
  assert.equal(legalClient.body.item.writes_product_state, true);
  assert.equal(legalClient.body.item.evaluates_runtime_permission, true);
  assert.ok(legalClient.body.audit_event_id);
  assert.ok(legalClient.body.tuw_ids.includes("CMP-G2-W02-T001"));

  const list = await get(`/party-master/parties?tenant_id=${TENANT}`);
  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((item) => item.party_id === "party_cmp_g2_legal_client"));

  const read = await get(`/party-master/parties/party_cmp_g2_legal_client?tenant_id=${TENANT}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.item.display_name, "AMIC Client Korea");

  const updated = await patch("/party-master/parties/party_cmp_g2_legal_client", {
    ...authBody("req_cmp_g2_party_patch"),
    tenant_id: TENANT,
    status: "review_required",
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.status, "review_required");
  assert.ok(updated.body.audit_event_id);
});

test("CMP-G2 creates Party aliases and identifiers without crossing tenant scope", async () => {
  const alias = await post("/party-master/aliases", {
    ...authBody("req_cmp_g2_alias"),
    tenant_id: TENANT,
    party_alias_id: "alias_cmp_g2_amic_kr",
    party_id: "party_cmp_g2_legal_client",
    alias_value: "AMIC Korea",
    alias_type: "localized_name",
    status: "active",
    owner_user_id: ACTOR,
    locale: "ko-KR",
  });
  assert.equal(alias.status, 201);
  assert.equal(alias.body.item.party_id, "party_cmp_g2_legal_client");

  const identifier = await post("/party-master/identifiers", {
    ...authBody("req_cmp_g2_identifier"),
    tenant_id: TENANT,
    party_identifier_id: "identifier_cmp_g2_amic_business",
    party_id: "party_cmp_g2_legal_client",
    identifier_type: "business_number",
    identifier_value: "KR-000-CMP-G2",
    jurisdiction: "KR",
    verified: true,
    status: "active",
    owner_user_id: ACTOR,
  });
  assert.equal(identifier.status, 201);
  assert.equal(identifier.body.item.verified, true);

  const otherTenant = await post("/party-master/parties", {
    ...authBody("req_cmp_g2_other_tenant_party", {
      principal: { user_id: "user_other_party", tenant_id: OTHER_TENANT, role_ids: ["party_admin"] },
    }),
    tenant_id: OTHER_TENANT,
    party_id: "party_cmp_g2_other_tenant",
    party_type: "organization",
    display_name: "AMIC Client Korea",
    status: "active",
    owner_user_id: "user_other_party",
    canonical_entity_id: "entity_cmp_g2_other_tenant",
  });
  assert.equal(otherTenant.status, 201);

  const tenantList = await get(`/party-master/parties?tenant_id=${TENANT}`);
  assert.ok(!tenantList.body.items.some((item) => item.party_id === "party_cmp_g2_other_tenant"));
});

test("CMP-G2 creates client groups, relationships, contacts, and billing profile", async () => {
  const contact = await post("/party-master/parties", {
    ...authBody("req_cmp_g2_party_contact"),
    tenant_id: TENANT,
    party_id: "party_cmp_g2_primary_contact",
    party_type: "person",
    display_name: "Lee CMP G2 Contact",
    status: "active",
    owner_user_id: ACTOR,
    canonical_entity_id: "entity_cmp_g2_primary_contact",
  });
  assert.equal(contact.status, 201);

  const billingClient = await post("/party-master/parties", {
    ...authBody("req_cmp_g2_party_billing"),
    tenant_id: TENANT,
    party_id: "party_cmp_g2_billing_client",
    party_type: "organization",
    display_name: "AMIC Billing Korea",
    status: "active",
    owner_user_id: ACTOR,
    canonical_entity_id: "entity_cmp_g2_billing_client",
  });
  assert.equal(billingClient.status, 201);

  const group = await post("/party-master/client-groups", {
    ...authBody("req_cmp_g2_client_group"),
    tenant_id: TENANT,
    client_group_id: "client_group_cmp_g2_amic",
    display_name: "AMIC CMP G2 Group",
    status: "active",
    owner_user_id: ACTOR,
    member_party_ids: ["party_cmp_g2_legal_client", "party_cmp_g2_billing_client"],
    primary_party_id: "party_cmp_g2_legal_client",
  });
  assert.equal(group.status, 201);
  assert.deepEqual(group.body.validation.blocked_claims, []);

  const relationship = await post("/party-master/relationships", {
    ...authBody("req_cmp_g2_relationship"),
    tenant_id: TENANT,
    relationship_id: "relationship_cmp_g2_primary_contact",
    from_entity_id: "entity_cmp_g2_primary_contact",
    to_entity_id: "entity_cmp_g2_legal_client",
    from_party_id: "party_cmp_g2_primary_contact",
    to_party_id: "party_cmp_g2_legal_client",
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id: ACTOR,
  });
  assert.equal(relationship.status, 201);

  const related = await get(`/party-master/relationships?tenant_id=${TENANT}&query_party_id=party_cmp_g2_legal_client`);
  assert.equal(related.status, 200);
  assert.equal(related.body.descriptor.g2_descriptor, "master_data_g2_related_party_search_descriptor");
  assert.equal(related.body.items[0].related_party_id, "party_cmp_g2_primary_contact");

  const contactPoint = await post("/party-master/contact-points", {
    ...authBody("req_cmp_g2_contact_point"),
    tenant_id: TENANT,
    contact_point_id: "contact_cmp_g2_primary_email",
    owner_entity_id: "entity_cmp_g2_primary_contact",
    owner_party_id: "party_cmp_g2_primary_contact",
    contact_type: "email",
    value: "lee.cmp-g2@example.invalid",
    status: "active",
    owner_user_id: ACTOR,
    is_primary: true,
    verified: true,
  });
  assert.equal(contactPoint.status, 201);
  assert.equal(contactPoint.body.item.verification_status, "verified");

  const billingProfile = await post("/party-master/billing-profiles", {
    ...authBody("req_cmp_g2_billing_profile"),
    tenant_id: TENANT,
    billing_profile_id: "billing_profile_cmp_g2_amic",
    billing_entity_id: "entity_cmp_g2_billing_client",
    display_name: "AMIC CMP G2 Billing",
    status: "active",
    owner_user_id: ACTOR,
    client_group_id: "client_group_cmp_g2_amic",
    legal_client_party_id: "party_cmp_g2_legal_client",
    billing_client_party_id: "party_cmp_g2_billing_client",
    billing_contact_point_id: "contact_cmp_g2_primary_email",
  });
  assert.equal(billingProfile.status, 201);
  assert.deepEqual(billingProfile.body.validation.blocked_claims, []);
});

test("CMP-G2 duplicate search and merge-split create review/audit workflow evidence", async () => {
  const duplicate = await post("/party-master/parties", {
    ...authBody("req_cmp_g2_party_duplicate"),
    tenant_id: TENANT,
    party_id: "party_cmp_g2_duplicate_candidate",
    party_type: "organization",
    display_name: "AMIC Client Korea Ltd",
    status: "review_required",
    owner_user_id: ACTOR,
    canonical_entity_id: "entity_cmp_g2_duplicate_candidate",
  });
  assert.equal(duplicate.status, 201);

  const duplicateSearch = await post("/party-master/duplicates/search", {
    ...authBody("req_cmp_g2_duplicate_search"),
    tenant_id: TENANT,
    source_party_id: "party_cmp_g2_legal_client",
    source_display_name: "AMIC Client Korea",
    review_threshold: 0.5,
  });
  assert.equal(duplicateSearch.status, 200);
  assert.equal(duplicateSearch.body.outcome, "review_required");
  assert.ok(duplicateSearch.body.duplicate_candidates.some((item) => item.party_id === "party_cmp_g2_duplicate_candidate"));
  assert.ok(!duplicateSearch.body.duplicate_candidates.some((item) => item.party_id === "party_cmp_g2_other_tenant"));
  assert.ok(duplicateSearch.body.audit_event_id);

  const merge = await post("/party-master/merge-split", {
    ...authBody("req_cmp_g2_merge"),
    tenant_id: TENANT,
    workflow_type: "merge",
    source_party_ids: ["party_cmp_g2_legal_client", "party_cmp_g2_duplicate_candidate"],
    target_party_id: "party_cmp_g2_legal_client",
    audit_hint_ref: "audit_hint_cmp_g2_merge",
    rollback_ref: "rollback_ref_cmp_g2_merge",
  });
  assert.equal(merge.status, 202);
  assert.equal(merge.body.outcome, "review_required");
  assert.equal(merge.body.workflow.descriptor.rollback_plan.rollback_available, true);

  const blockedMerge = await post("/party-master/merge-split", {
    ...authBody("req_cmp_g2_merge_blocked"),
    tenant_id: TENANT,
    workflow_type: "merge",
    source_party_ids: ["party_cmp_g2_legal_client", "party_cmp_g2_duplicate_candidate"],
    target_party_id: "party_cmp_g2_legal_client",
  });
  assert.equal(blockedMerge.status, 400);
  assert.equal(blockedMerge.body.outcome, "blocked");
  assert.ok(blockedMerge.body.workflow.descriptor.blocked_claims.includes("merge_split_audit_rollback_required"));
});

test("CMP-G2 audit export and verify remain tenant scoped and permission gated", async () => {
  const deniedAudit = await get(`/party-master/audit/events?tenant_id=${TENANT}`, {});
  assert.equal(deniedAudit.status, 403);
  assert.deepEqual(deniedAudit.body.safe_error_codes, ["CMP_G2_PERMISSION_DENIED"]);

  const events = await get(`/party-master/audit/events?tenant_id=${TENANT}`);
  assert.equal(events.status, 200);
  assert.ok(events.body.items.length >= 10);
  assert.ok(events.body.items.every((event) => event.tenant_id === TENANT));

  const verify = await get(`/party-master/audit/verify?tenant_id=${TENANT}`);
  assert.equal(verify.status, 200);
  assert.equal(verify.body.verification.ok, true);
  assert.ok(verify.body.verification.checked >= 10);
});
