import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g6_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g6_read&audit_hint_ref=audit_hint_cmp_g6_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g6_owner", tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer"] },
    rules: [{ id: `rule_crm_intake_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function accountPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_cmp_g6_account_write",
    audit_hint_ref: "audit_hint_cmp_g6_account_write",
    actor_id: "user_cmp_g6_owner",
    idempotency_key: "api-account-create-1",
    reason: "account_created",
    account: {
      account_id: "account_cmp_g6_api_001",
      tenant_id: TENANT,
      display_name: "API created account",
      status: "active",
    },
    ...overrides,
  };
}

function contactPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_cmp_g6_contact_write",
    audit_hint_ref: "audit_hint_cmp_g6_contact_write",
    actor_id: "user_cmp_g6_owner",
    idempotency_key: "api-contact-create-1",
    reason: "contact_created",
    contact: {
      contact_id: "contact_cmp_g6_api_001",
      tenant_id: TENANT,
      account_id: "org_cmp_g6_account_001",
      display_name: "API created contact",
      status: "active",
      primary_contact_fingerprint: "api-contact-fingerprint-001",
    },
    ...overrides,
  };
}

function accountPatchPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_cmp_g6_account_patch",
    audit_hint_ref: "audit_hint_cmp_g6_account_patch",
    actor_id: "user_cmp_g6_owner",
    idempotency_key: "api-account-patch-1",
    reason: "account_patch",
    field_updates: { status: "review_required" },
    ...overrides,
  };
}

function contactPatchPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_cmp_g6_contact_patch",
    audit_hint_ref: "audit_hint_cmp_g6_contact_patch",
    actor_id: "user_cmp_g6_owner",
    idempotency_key: "api-contact-patch-1",
    reason: "contact_patch",
    field_updates: { status: "review_required" },
    ...overrides,
  };
}

test("G6 CRM/Intake API health descriptor exposes runtime write-ready without production claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const context = body.bounded_contexts.find((item) => item.bounded_context === "crm-intake");
    assert.equal(status, 200);
    assert.equal(context.runtime_write_ready, true);
    assert.equal(context.r5_r6_owner_decision_ready, true);
    assert.equal(context.production_ready_claim, false);
  });
});

test("G6 CRM list is permission gated and omits Matter shortcut fields", async () => {
  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/crm/opportunities?${BASE_QUERY}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.outcome, "passed");
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].direct_matter_reference_included, false);
    assert.equal("matter_id" in list.body.items[0], false);
    assert.equal(list.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/crm/opportunities?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G6 CRM Account and Contact read facades are permission gated and safe-source", async () => {
  await withServer(async (baseUrl) => {
    const accounts = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`);
    assert.equal(accounts.status, 200);
    assert.equal(accounts.body.outcome, "passed");
    assert.equal(accounts.body.items.length, 1);
    assert.equal(accounts.body.items[0].account_id, "org_cmp_g6_account_001");
    assert.equal(accounts.body.items[0].client_group_id, "client_group_cmp_g6_account_001");
    assert.equal(accounts.body.items[0].registration_number_included, false);
    assert.equal("registration_number" in accounts.body.items[0], false);
    assert.equal(accounts.body.items[0].direct_matter_reference_included, false);
    assert.equal(accounts.body.production_ready_claim, false);

    const contacts = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.equal(contacts.status, 200);
    assert.equal(contacts.body.outcome, "passed");
    assert.equal(contacts.body.items.length, 1);
    assert.equal(contacts.body.items[0].contact_id, "person_cmp_g6_contact_001");
    assert.equal(contacts.body.items[0].primary_contact_type, "email");
    assert.equal(contacts.body.items[0].email_value_included, false);
    assert.equal(contacts.body.items[0].contact_point_value_included, false);
    assert.equal("email" in contacts.body.items[0], false);

    const relationships = await json(baseUrl, `/api/crm/accounts/org_cmp_g6_account_001/contacts?${BASE_QUERY}`);
    assert.equal(relationships.status, 200);
    assert.equal(relationships.body.outcome, "passed");
    assert.equal(relationships.body.items.length, 1);
    assert.equal(relationships.body.items[0].relationship_type, "primary_contact");
    assert.equal(relationships.body.items[0].contact_id, "person_cmp_g6_contact_001");
    assert.equal(relationships.body.items[0].contact_point_value_included, false);

    const review = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("review_required") },
    });
    assert.equal(review.status, 200);
    assert.equal(review.body.outcome, "review_required");
    assert.equal(review.body.items.length, 0);
    assert.equal(review.body.count_leak_prevented, true);

    const denied = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("G6 CRM duplicate review uses Master Data candidates without automatic merge", async () => {
  await withServer(async (baseUrl) => {
    const review = await json(baseUrl, "/api/crm/duplicate-reviews", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        display_name: "CMP G6 synthetic",
        identifier_type: "business_number",
        identifier_value: "cmp-g6-001",
      }),
    });
    assert.equal(review.status, 200);
    assert.equal(review.body.outcome, "review_required");
    assert.equal(review.body.item.review_required, true);
    assert.equal(review.body.item.automatic_merge_executed, false);
    assert.ok(review.body.item.name_candidates.some((candidate) => candidate.model_type === "Organization"));
    assert.ok(review.body.item.identifier_candidates.some((candidate) => candidate.model_type === "PartyIdentifier"));
    assert.equal(review.body.item.identifier_candidates[0].identifier_value_included, false);
    assert.equal(review.body.audit_event.action, "crm.duplicate_review.requested");
    assert.equal(review.body.production_ready_claim, false);
  });
});

test("G6 CRM Account create is route-backed, audited, idempotent, and safe-source", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-account-api-g6-")), "crm.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/crm/accounts", {
      method: "POST",
      body: JSON.stringify(accountPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.account_id, "account_cmp_g6_api_001");
    assert.equal(created.body.item.display_name, "API created account");
    assert.equal(created.body.item.registration_number_included, false);
    assert.equal(created.body.item.direct_matter_reference_included, false);
    assert.equal("registration_number" in created.body.item, false);
    assert.equal("matter_id" in created.body.item, false);
    assert.equal(created.body.audit_event.action, "crm.account.created");
    assert.equal(created.body.state_idempotent, true);
    assert.equal(created.body.production_ready_claim, false);

    const replay = await json(baseUrl, "/api/crm/accounts", {
      method: "POST",
      body: JSON.stringify(accountPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const blocked = await json(baseUrl, "/api/crm/accounts", {
      method: "POST",
      body: JSON.stringify(accountPayload({
        idempotency_key: "api-account-create-blocked-1",
        account: {
          account_id: "account_cmp_g6_api_blocked",
          tenant_id: TENANT,
          display_name: "Blocked account",
          matter_id: "matter_forbidden",
        },
      })),
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["CRM_INTAKE_API_VALIDATION_ERROR"]);

    const listed = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.items.some((item) => item.account_id === "account_cmp_g6_api_001"));

    const patched = await json(baseUrl, "/api/crm/accounts/account_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(accountPatchPayload()),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.outcome, "updated");
    assert.equal(patched.body.item.account_id, "account_cmp_g6_api_001");
    assert.equal(patched.body.item.status, "review_required");
    assert.equal(patched.body.item.registration_number_included, false);
    assert.equal("registration_number" in patched.body.item, false);
    assert.equal("matter_id" in patched.body.item, false);
    assert.equal(patched.body.audit_event.action, "crm.account.patched");
    assert.equal(patched.body.state_idempotent, true);

    const patchReplay = await json(baseUrl, "/api/crm/accounts/account_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(accountPatchPayload()),
    });
    assert.equal(patchReplay.status, 200);
    assert.equal(patchReplay.body.outcome, "idempotent_replay");

    const canonicalBlocked = await json(baseUrl, "/api/crm/accounts/org_cmp_g6_account_001", {
      method: "PATCH",
      body: JSON.stringify(accountPatchPayload({ idempotency_key: "api-account-patch-master-blocked" })),
    });
    assert.equal(canonicalBlocked.status, 404);

    const unsafeBlocked = await json(baseUrl, "/api/crm/accounts/account_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(accountPatchPayload({
        idempotency_key: "api-account-patch-unsafe-blocked",
        field_updates: { registration_number: "unsafe", status: "active" },
      })),
    });
    assert.equal(unsafeBlocked.status, 400);
  }, { crmStorePath });

  await withServer(async (baseUrl) => {
    const listed = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`);
    assert.ok(listed.body.items.some((item) => item.account_id === "account_cmp_g6_api_001"));
  }, { crmStorePath });
});

test("G6 CRM Contact create is route-backed, duplicate-reviewed, audited, idempotent, and safe-source", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-contact-api-g6-")), "crm.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.contact_id, "contact_cmp_g6_api_001");
    assert.equal(created.body.item.account_id, "org_cmp_g6_account_001");
    assert.equal(created.body.item.display_name, "API created contact");
    assert.equal(created.body.item.email_value_included, false);
    assert.equal(created.body.item.contact_point_value_included, false);
    assert.equal("email" in created.body.item, false);
    assert.equal("contact_point_value" in created.body.item, false);
    assert.equal("matter_id" in created.body.item, false);
    assert.equal(created.body.audit_event.action, "crm.contact.created");
    assert.equal(created.body.state_idempotent, true);
    assert.equal(created.body.production_ready_claim, false);

    const replay = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const duplicate = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        idempotency_key: "api-contact-create-duplicate-1",
        contact: {
          contact_id: "contact_cmp_g6_api_duplicate",
          tenant_id: TENANT,
          account_id: "org_cmp_g6_account_001",
          display_name: "Duplicate contact",
          primary_contact_fingerprint: "api-contact-fingerprint-001",
        },
      })),
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.outcome, "review_required");
    assert.equal(duplicate.body.item.automatic_merge_executed, false);
    assert.equal(duplicate.body.item.primary_contact_uniqueness_enforced, true);
    assert.equal(duplicate.body.item.email_value_included, false);
    assert.equal(duplicate.body.audit_event.action, "crm.contact.duplicate_review_required");

    const rawEmailBlocked = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        idempotency_key: "api-contact-create-raw-email-blocked-1",
        contact: {
          contact_id: "contact_cmp_g6_api_raw_email",
          tenant_id: TENANT,
          display_name: "Raw email blocked",
          email: "raw@example.invalid",
        },
      })),
    });
    assert.equal(rawEmailBlocked.status, 400);
    assert.deepEqual(rawEmailBlocked.body.safe_error_codes, ["CRM_INTAKE_API_VALIDATION_ERROR"]);

    const matterShortcutBlocked = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        idempotency_key: "api-contact-create-matter-blocked-1",
        contact: {
          contact_id: "contact_cmp_g6_api_matter_blocked",
          tenant_id: TENANT,
          display_name: "Matter shortcut blocked",
          matter_id: "matter_forbidden",
        },
      })),
    });
    assert.equal(matterShortcutBlocked.status, 400);

    const listed = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.items.some((item) => item.contact_id === "contact_cmp_g6_api_001"));

    const relationships = await json(baseUrl, `/api/crm/accounts/org_cmp_g6_account_001/contacts?${BASE_QUERY}`);
    assert.equal(relationships.status, 200);
    assert.ok(relationships.body.items.some((item) => item.contact_id === "contact_cmp_g6_api_001"));

    const patched = await json(baseUrl, "/api/crm/contacts/contact_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(contactPatchPayload()),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.outcome, "updated");
    assert.equal(patched.body.item.contact_id, "contact_cmp_g6_api_001");
    assert.equal(patched.body.item.status, "review_required");
    assert.equal(patched.body.item.email_value_included, false);
    assert.equal(patched.body.item.contact_point_value_included, false);
    assert.equal("email" in patched.body.item, false);
    assert.equal("contact_point_value" in patched.body.item, false);
    assert.equal(patched.body.audit_event.action, "crm.contact.patched");
    assert.equal(patched.body.state_idempotent, true);

    const patchReplay = await json(baseUrl, "/api/crm/contacts/contact_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(contactPatchPayload()),
    });
    assert.equal(patchReplay.status, 200);
    assert.equal(patchReplay.body.outcome, "idempotent_replay");

    const canonicalBlocked = await json(baseUrl, "/api/crm/contacts/person_cmp_g6_contact_001", {
      method: "PATCH",
      body: JSON.stringify(contactPatchPayload({ idempotency_key: "api-contact-patch-master-blocked" })),
    });
    assert.equal(canonicalBlocked.status, 404);

    const unsafeBlocked = await json(baseUrl, "/api/crm/contacts/contact_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify(contactPatchPayload({
        idempotency_key: "api-contact-patch-unsafe-blocked",
        field_updates: { email: "unsafe@example.invalid", status: "active" },
      })),
    });
    assert.equal(unsafeBlocked.status, 400);
  }, { crmStorePath });

  await withServer(async (baseUrl) => {
    const listed = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.ok(listed.body.items.some((item) => item.contact_id === "contact_cmp_g6_api_001"));
  }, { crmStorePath });
});

test("G6 opportunity create blocks direct Matter and handoff persists Intake across restart", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-api-g6-")), "crm.json");
  const intakeStorePath = join(mkdtempSync(join(tmpdir(), "intake-api-g6-")), "intake.json");
  await withServer(async (baseUrl) => {
    const blocked = await json(baseUrl, "/api/crm/opportunities", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-opp-shortcut",
        opportunity: {
          opportunity_id: "opp_cmp_g6_direct_matter",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Direct Matter shortcut",
          stage: "qualified",
          status: "active",
          owner_user_id: "user_cmp_g6_owner",
          matter_id: "matter_forbidden",
        },
      }),
    });
    assert.equal(blocked.status, 400);

    const handoff = await json(baseUrl, "/api/crm/opportunities/opp_cmp_g6_synthetic_001/handoff", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-handoff-1",
        intake_request_id: "intake_cmp_g6_api_handoff_001",
      }),
    });
    assert.equal(handoff.status, 201);
    assert.equal(handoff.body.item.intake_request_id, "intake_cmp_g6_api_handoff_001");
    assert.equal(handoff.body.item.creates_matter, false);
    assert.equal(handoff.body.opportunity.stage, "intake_requested");
    assert.equal(handoff.body.opportunity.intake_request_id, "intake_cmp_g6_api_handoff_001");
    assert.equal(handoff.body.opportunity.direct_matter_reference_included, false);

    const replay = await json(baseUrl, "/api/crm/opportunities/opp_cmp_g6_synthetic_001/handoff", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-handoff-1",
        intake_request_id: "intake_cmp_g6_api_handoff_001",
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
  }, { crmStorePath, intakeStorePath });

  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/intake/requests?${BASE_QUERY}`);
    assert.ok(list.body.items.some((item) => item.intake_request_id === "intake_cmp_g6_api_handoff_001"));
  }, { crmStorePath, intakeStorePath });
});

test("G6 conflict check, clearance token, and audit routes stay safe and tenant scoped", async () => {
  await withServer(async (baseUrl) => {
    const check = await json(baseUrl, "/api/intake/conflict-checks", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-conflict-check-1",
        conflict_check: {
          conflict_check_id: "conflict_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          party_snapshot: { party_ids: ["party_cmp_g6_client_001"] },
          status: "snapshot_recorded",
          owner_user_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(check.status, 201);
    assert.equal(check.body.item.raw_conflict_memo_included, false);
    assert.ok(check.body.item.snapshot_hash);

    const token = await json(baseUrl, "/api/intake/clearance-tokens", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-clearance-token-1",
        now: "2026-06-20T00:00:00.000Z",
        token: {
          clearance_token_id: "clearance_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          conflict_check_id: "conflict_cmp_g6_api_001",
          engagement_id: "engagement_cmp_g6_api_001",
          snapshot_hash: check.body.item.snapshot_hash,
          expires_at: "2026-06-27T00:00:00.000Z",
        },
      }),
    });
    assert.equal(token.status, 201);
    assert.equal(token.body.validation.valid, true);
    assert.equal(token.body.production_ready_claim, false);

    const audit = await json(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "clearance.token.issue"));
  });
});
