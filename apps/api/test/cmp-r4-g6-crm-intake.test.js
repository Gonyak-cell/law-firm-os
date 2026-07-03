import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g6_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g6_read&audit_hint_ref=audit_hint_cmp_g6_read`;
const CONTACT_VALUE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_cmp_g6_contact_value_read&audit_hint_ref=audit_hint_cmp_g6_contact_value_read`;

function permissionContext(effect = "allow", roleIds = ["crm_intake_user", "conflict_reviewer"]) {
  return JSON.stringify({
    principal: { user_id: "user_cmp_g6_owner", tenant_id: TENANT, role_ids: roleIds },
    rules: [{ id: `rule_crm_intake_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

function contactValuePermissionContext() {
  return permissionContext("allow", ["crm_intake_user", "conflict_reviewer", "crm_contact_value_reader"]);
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

test("G6 Client planned sections expose activity proposal and settings routes with guarded writes", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-client-sections-g6-")), "crm.json");
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const context = health.body.bounded_contexts.find((item) => item.bounded_context === "crm-intake");
    for (const endpoint of [
      "GET /api/crm/activities",
      "POST /api/crm/activities",
      "PATCH /api/crm/activities/:id",
      "GET /api/crm/proposals",
      "POST /api/crm/proposals",
      "PATCH /api/crm/proposals/:id",
      "GET /api/crm/client-settings",
      "PATCH /api/crm/client-settings/:id",
      "POST /api/intake/engagements",
    ]) {
      assert.ok(context.endpoints.includes(endpoint), `${endpoint} missing from CRM descriptor`);
    }

    const activities = await json(baseUrl, `/api/crm/activities?${BASE_QUERY}`);
    assert.equal(activities.status, 200);
    assert.equal(activities.body.items[0].direct_matter_reference_included, false);
    assert.equal("matter_id" in activities.body.items[0], false);

    const createdActivity = await json(baseUrl, "/api/crm/activities", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_activity_write",
        audit_hint_ref: "audit_hint_cmp_g6_activity_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-client-activity-create-1",
        activity: {
          crm_activity_id: "activity_cmp_g6_api_001",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          opportunity_id: "opp_cmp_g6_synthetic_001",
          activity_type: "note",
          subject: "Client follow up",
          confidential: false,
          status: "active",
        },
      }),
    });
    assert.equal(createdActivity.status, 201);
    assert.equal(createdActivity.body.audit_event.action, "crm.activity.created");

    const patchedActivity = await json(baseUrl, "/api/crm/activities/activity_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_activity_patch",
        audit_hint_ref: "audit_hint_cmp_g6_activity_patch",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-client-activity-patch-1",
        field_updates: { status: "review_required" },
      }),
    });
    assert.equal(patchedActivity.status, 200);
    assert.equal(patchedActivity.body.item.status, "review_required");

    const proposals = await json(baseUrl, `/api/crm/proposals?${BASE_QUERY}`);
    assert.equal(proposals.status, 200);
    assert.equal(proposals.body.items[0].e_sign_send_enabled, false);
    assert.equal(proposals.body.items[0].vault_document_ref_present, true);

    const createdProposal = await json(baseUrl, "/api/crm/proposals", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_proposal_write",
        audit_hint_ref: "audit_hint_cmp_g6_proposal_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-client-proposal-create-1",
        proposal: {
          proposal_id: "proposal_cmp_g6_api_001",
          tenant_id: TENANT,
          opportunity_id: "opp_cmp_g6_synthetic_001",
          party_id: "party_cmp_g6_client_001",
          fee_estimate_ref: "fee_estimate_cmp_g6_api_001",
          display_name: "API proposal draft",
          status: "draft",
          proposal_status: "draft",
          approval_state: "review_required",
          vault_document_ref: "vault_doc_cmp_g6_api_001",
        },
      }),
    });
    assert.equal(createdProposal.status, 201);
    assert.equal(createdProposal.body.item.e_sign_send_enabled, false);

    const providerBlocked = await json(baseUrl, "/api/crm/proposals/proposal_cmp_g6_api_001", {
      method: "PATCH",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_proposal_patch",
        audit_hint_ref: "audit_hint_cmp_g6_proposal_patch",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-client-proposal-provider-blocked-1",
        field_updates: { e_sign_send_requested: true },
      }),
    });
    assert.equal(providerBlocked.status, 200);
    assert.equal(providerBlocked.body.outcome, "provider_blocked");
    assert.equal(providerBlocked.body.audit_event.action, "crm.proposal.esign_send_blocked");

    const settings = await json(baseUrl, `/api/crm/client-settings?${BASE_QUERY}`);
    assert.equal(settings.status, 200);
    assert.equal(settings.body.items[0].policy_write_permissioned, true);

    const roleBlocked = await json(baseUrl, "/api/crm/client-settings/client_policy_cmp_g6_classification", {
      method: "PATCH",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_client_settings_patch",
        audit_hint_ref: "audit_hint_cmp_g6_client_settings_patch",
        actor_id: "user_cmp_g6_owner",
        field_updates: { duplicate_review_required: true },
      }),
    });
    assert.equal(roleBlocked.status, 200);
    assert.equal(roleBlocked.body.outcome, "approval_required");
    assert.equal(roleBlocked.body.audit_event.action, "crm.client_policy.patch_blocked");

    const adminContext = JSON.stringify({
      principal: { user_id: "user_cmp_g6_owner", tenant_id: TENANT, role_ids: ["crm_intake_user", "matter_vault_admin"] },
      rules: [{ id: "rule_crm_intake_admin_allow", effect: "allow", action: "*" }],
      object_acl: [],
    });
    const patchedSetting = await json(baseUrl, "/api/crm/client-settings/client_policy_cmp_g6_classification", {
      method: "PATCH",
      headers: { [PERMISSION_CONTEXT_HEADER]: adminContext },
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_client_settings_patch",
        audit_hint_ref: "audit_hint_cmp_g6_client_settings_patch",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-client-settings-patch-1",
        field_updates: { duplicate_review_required: false },
      }),
    });
    assert.equal(patchedSetting.status, 200);
    assert.equal(patchedSetting.body.outcome, "updated");
    assert.equal(patchedSetting.body.item.duplicate_review_required, false);
    assert.equal(patchedSetting.body.audit_event.action, "crm.client_policy.patched");
    assert.equal(patchedSetting.body.production_ready_claim, false);
  }, { crmStorePath });
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
    assert.equal("contact_point_value" in contacts.body.items[0], false);

    const contactValues = await json(baseUrl, `/api/crm/contacts?${CONTACT_VALUE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: contactValuePermissionContext() },
    });
    assert.equal(contactValues.status, 200);
    assert.equal(contactValues.body.items[0].email_value_included, true);
    assert.equal(contactValues.body.items[0].contact_point_value_included, true);
    assert.equal(contactValues.body.items[0].email, "contact.cmp-g6@example.com");
    assert.equal(contactValues.body.items[0].contact_point_value, "contact.cmp-g6@example.com");

    const relationships = await json(baseUrl, `/api/crm/accounts/org_cmp_g6_account_001/contacts?${BASE_QUERY}`);
    assert.equal(relationships.status, 200);
    assert.equal(relationships.body.outcome, "passed");
    assert.equal(relationships.body.items.length, 1);
    assert.equal(relationships.body.items[0].relationship_type, "primary_contact");
    assert.equal(relationships.body.items[0].contact_id, "person_cmp_g6_contact_001");
    assert.equal(relationships.body.items[0].contact_point_value_included, false);

    const relationshipValues = await json(baseUrl, `/api/crm/accounts/org_cmp_g6_account_001/contacts?${CONTACT_VALUE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: contactValuePermissionContext() },
    });
    assert.equal(relationshipValues.status, 200);
    assert.equal(relationshipValues.body.items[0].contact_point_value_included, true);
    assert.equal(relationshipValues.body.items[0].contact_point_value, "contact.cmp-g6@example.com");

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

test("G6 W01R Account and Contact canonical writes plus duplicate merge proposal gates execution", async () => {
  const crmStorePath = join(mkdtempSync(join(tmpdir(), "crm-w01r-api-")), "crm.json");
  const crmMasterDataStorePath = join(mkdtempSync(join(tmpdir(), "crm-w01r-master-data-")), "master-data.json");
  const accountId = "account_cmp_g6_w01r_001";
  const contactId = "contact_cmp_g6_w01r_001";
  const sourcePartyId = `party_${contactId}`;
  const targetPartyId = `party_${accountId}`;

  await withServer(async (baseUrl) => {
    const account = await json(baseUrl, "/api/crm/accounts", {
      method: "POST",
      body: JSON.stringify(accountPayload({
        idempotency_key: "api-w01r-account-create-1",
        account: {
          account_id: accountId,
          tenant_id: TENANT,
          display_name: "W01R canonical account",
          status: "active",
        },
      })),
    });
    assert.equal(account.status, 201);
    assert.equal(account.body.canonical_write_status, "created");
    assert.equal(account.body.item.account_id, accountId);
    assert.equal(account.body.item.organization_id, accountId);
    assert.equal(account.body.item.client_group_id, `client_group_${accountId}`);
    assert.equal(account.body.item.canonical_sync_state, "synced");
    assert.equal(account.body.item.registration_number_included, false);
    assert.equal("registration_number" in account.body.item, false);
    assert.equal(account.body.audit_event.metadata.canonical_write_status, "created");

    const contact = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        idempotency_key: "api-w01r-contact-create-1",
        contact: {
          contact_id: contactId,
          tenant_id: TENANT,
          account_id: accountId,
          display_name: "W01R canonical contact",
          status: "active",
          primary_contact_fingerprint: "w01r-contact-fingerprint-001",
        },
      })),
    });
    assert.equal(contact.status, 201);
    assert.equal(contact.body.canonical_write_status, "created");
    assert.equal(contact.body.item.contact_id, contactId);
    assert.equal(contact.body.item.person_id, contactId);
    assert.equal(contact.body.item.primary_contact_point_id, `contact_point_${contactId}`);
    assert.equal(contact.body.item.canonical_sync_state, "synced");
    assert.equal(contact.body.item.contact_point_value_included, false);
    assert.equal("email" in contact.body.item, false);

    const listedAccounts = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`);
    assert.equal(listedAccounts.body.items.filter((item) => item.account_id === accountId).length, 1);
    assert.equal(listedAccounts.body.items.find((item) => item.account_id === accountId).canonical_sync_state, "synced");

    const listedContacts = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.equal(listedContacts.body.items.filter((item) => item.contact_id === contactId).length, 1);
    assert.equal(listedContacts.body.items.find((item) => item.contact_id === contactId).canonical_sync_state, "synced");

    const relationships = await json(baseUrl, `/api/crm/accounts/${accountId}/contacts?${BASE_QUERY}`);
    assert.equal(relationships.body.items.filter((item) => item.contact_id === contactId).length, 1);

    const blockedProposal = await json(baseUrl, "/api/crm/duplicate-merge-proposals", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_merge_write",
        audit_hint_ref: "audit_hint_cmp_g6_merge_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-w01r-merge-proposal-blocked",
        proposal: {
          proposal_id: "dup_merge_w01r_blocked",
          tenant_id: TENANT,
          display_name: "W01R canonical",
          source_party_id: sourcePartyId,
          target_party_id: targetPartyId,
        },
      }),
    });
    assert.equal(blockedProposal.status, 201);
    assert.equal(blockedProposal.body.item.proposal_state, "owner_decision_required");
    assert.equal(blockedProposal.body.item.executable, false);
    assert.equal(blockedProposal.body.item.candidate_values_included, false);
    assert.equal(blockedProposal.body.merge_candidates.every((candidate) => candidate.identifier_value_included === false), true);

    const blockedExecute = await json(baseUrl, "/api/crm/duplicate-merge-proposals/dup_merge_w01r_blocked/execute", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_merge_execute",
        audit_hint_ref: "audit_hint_cmp_g6_merge_execute",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-w01r-merge-execute-blocked",
      }),
    });
    assert.equal(blockedExecute.status, 200);
    assert.equal(blockedExecute.body.outcome, "approval_required");
    assert.deepEqual(blockedExecute.body.safe_error_codes, ["CRM_INTAKE_APPROVAL_REQUIRED"]);
    assert.equal(blockedExecute.body.item.automatic_merge_executed, false);

    const approvedProposal = await json(baseUrl, "/api/crm/duplicate-merge-proposals", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_merge_write",
        audit_hint_ref: "audit_hint_cmp_g6_merge_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-w01r-merge-proposal-approved",
        proposal: {
          proposal_id: "dup_merge_w01r_approved",
          tenant_id: TENANT,
          display_name: "W01R canonical",
          source_party_id: sourcePartyId,
          target_party_id: targetPartyId,
          owner_decision: "approved",
          owner_approval_ref: "owner-approval-w01r-001",
          dual_control_approver_id: "user_cmp_g6_second_approver",
        },
      }),
    });
    assert.equal(approvedProposal.status, 201);
    assert.equal(approvedProposal.body.item.proposal_state, "approved");
    assert.equal(approvedProposal.body.item.executable, true);

    const executed = await json(baseUrl, "/api/crm/duplicate-merge-proposals/dup_merge_w01r_approved/execute", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_merge_execute",
        audit_hint_ref: "audit_hint_cmp_g6_merge_execute",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-w01r-merge-execute-approved",
      }),
    });
    assert.equal(executed.status, 200);
    assert.equal(executed.body.outcome, "executed");
    assert.equal(executed.body.item.automatic_merge_executed, true);
    assert.equal(executed.body.item.rollback_metadata_present, true);
    assert.match(executed.body.rollback_metadata_ref, /^rollback:dup_merge_w01r_approved:/);

    const proposals = await json(baseUrl, `/api/crm/duplicate-merge-proposals?${BASE_QUERY}`);
    assert.equal(proposals.status, 200);
    assert.ok(proposals.body.items.some((item) => item.proposal_id === "dup_merge_w01r_blocked"));
    assert.ok(proposals.body.items.some((item) => item.proposal_id === "dup_merge_w01r_approved"));
  }, { crmStorePath, crmMasterDataStorePath });

  await withServer(async (baseUrl) => {
    const accounts = await json(baseUrl, `/api/crm/accounts?${BASE_QUERY}`);
    const contacts = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.ok(accounts.body.items.some((item) => item.account_id === accountId && item.canonical_sync_state === "synced"));
    assert.ok(contacts.body.items.some((item) => item.contact_id === contactId && item.canonical_sync_state === "synced"));
  }, { crmStorePath, crmMasterDataStorePath });
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

    const rawEmailCreated = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        permission_ref: "perm_ref_cmp_g6_contact_value_write",
        audit_hint_ref: "audit_hint_cmp_g6_contact_value_write",
        idempotency_key: "api-contact-create-raw-email-stored-1",
        contact: {
          contact_id: "contact_cmp_g6_api_raw_email",
          tenant_id: TENANT,
          account_id: "org_cmp_g6_account_001",
          display_name: "Raw email stored",
          email: "raw@example.invalid",
        },
      })),
    });
    assert.equal(rawEmailCreated.status, 201);
    assert.equal(rawEmailCreated.body.item.contact_id, "contact_cmp_g6_api_raw_email");
    assert.equal(rawEmailCreated.body.item.contact_point_value_included, false);
    assert.equal("contact_point_value" in rawEmailCreated.body.item, false);
    assert.equal(rawEmailCreated.body.audit_event.metadata.raw_contact_value_stored, true);

    const rawEmailMasked = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    const maskedRawContact = rawEmailMasked.body.items.find((item) => item.contact_id === "contact_cmp_g6_api_raw_email");
    assert.equal(maskedRawContact.contact_point_value_included, false);
    assert.equal("contact_point_value" in maskedRawContact, false);

    const rawEmailVisible = await json(baseUrl, `/api/crm/contacts?${CONTACT_VALUE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: contactValuePermissionContext() },
    });
    const visibleRawContact = rawEmailVisible.body.items.find((item) => item.contact_id === "contact_cmp_g6_api_raw_email");
    assert.equal(visibleRawContact.contact_point_value_included, true);
    assert.equal(visibleRawContact.email_value_included, true);
    assert.equal(visibleRawContact.email, "raw@example.invalid");
    assert.equal(visibleRawContact.contact_point_value, "raw@example.invalid");

    const invalidEmailBlocked = await json(baseUrl, "/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(contactPayload({
        idempotency_key: "api-contact-create-invalid-email-blocked-1",
        contact: {
          contact_id: "contact_cmp_g6_api_invalid_email",
          tenant_id: TENANT,
          display_name: "Invalid email blocked",
          email: "invalid-email",
        },
      })),
    });
    assert.equal(invalidEmailBlocked.status, 400);
    assert.deepEqual(invalidEmailBlocked.body.safe_error_codes, ["CRM_INTAKE_API_VALIDATION_ERROR"]);

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

    const rawPatched = await json(baseUrl, "/api/crm/contacts/contact_cmp_g6_api_001", {
      method: "PATCH",
      headers: { [PERMISSION_CONTEXT_HEADER]: contactValuePermissionContext() },
      body: JSON.stringify(contactPatchPayload({
        permission_ref: "perm_ref_cmp_g6_contact_value_patch",
        audit_hint_ref: "audit_hint_cmp_g6_contact_value_patch",
        idempotency_key: "api-contact-patch-raw-email-allowed",
        field_updates: { email: "patched@example.invalid", status: "active" },
      })),
    });
    assert.equal(rawPatched.status, 200);
    assert.equal(rawPatched.body.item.status, "active");
    assert.equal(rawPatched.body.item.contact_point_value_included, true);
    assert.equal(rawPatched.body.item.email, "patched@example.invalid");
    assert.equal(rawPatched.body.item.contact_point_value, "patched@example.invalid");
    assert.equal(rawPatched.body.audit_event.metadata.raw_contact_value_stored, true);

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
        field_updates: { email: "invalid-email", status: "active" },
      })),
    });
    assert.equal(unsafeBlocked.status, 400);
  }, { crmStorePath });

  await withServer(async (baseUrl) => {
    const listed = await json(baseUrl, `/api/crm/contacts?${BASE_QUERY}`);
    assert.ok(listed.body.items.some((item) => item.contact_id === "contact_cmp_g6_api_001"));
    const visible = await json(baseUrl, `/api/crm/contacts?${CONTACT_VALUE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: contactValuePermissionContext() },
    });
    const restartedContact = visible.body.items.find((item) => item.contact_id === "contact_cmp_g6_api_001");
    assert.equal(restartedContact.contact_point_value, "patched@example.invalid");
    assert.equal(restartedContact.contact_point_value_included, true);
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
  const matterRepository = createMatterRepository({
    seedRecords: [
      {
        model_type: "MatterParty",
        resource_id: "matter_party_cmp_g6_former_adverse",
        tenant_id: TENANT,
        matter_id: "matter_cmp_g6_former_001",
        matter_party_id: "matter_party_cmp_g6_former_adverse",
        party_id: "party_cmp_g6_former_adverse",
        display_name: "(주) 상대방",
        party_role: "adverse_party",
        status: "active",
      },
    ],
  });
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
          party_snapshot: { party_ids: ["party_cmp_g6_client_001"], aliases: ["상대방 주식회사"] },
          status: "snapshot_recorded",
          owner_user_id: "user_cmp_g6_owner",
        },
        conflict_search: {
          conflict_search_id: "search_cmp_g6_api_001",
          aliases: ["상대방 주식회사"],
          hit_count: 0,
        },
      }),
    });
    assert.equal(check.status, 201);
    assert.equal(check.body.item.raw_conflict_memo_included, false);
    assert.ok(check.body.item.snapshot_hash);
    assert.equal(check.body.item.status, "review_required");
    assert.equal(check.body.conflict_search.hit_count, 1);
    assert.equal(check.body.conflict_search.caller_supplied_hit_count_ignored, true);
    assert.equal(check.body.conflict_hits.length, 1);
    assert.equal(check.body.conflict_hits[0].hit_source, "former_matter");
    assert.equal(check.body.conflict_hits[0].matched_display_name, "(주) 상대방");
    assert.equal(check.body.conflict_hits[0].direct_matter_reference_included, false);
    assert.equal(check.body.conflict_hits[0].raw_hit_payload_visible, false);

    const prematureToken = await json(baseUrl, "/api/intake/clearance-tokens", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-clearance-token-premature",
        now: "2026-06-20T00:00:00.000Z",
        token: {
          clearance_token_id: "clearance_cmp_g6_api_premature",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          conflict_check_id: "conflict_cmp_g6_api_001",
          snapshot_hash: check.body.item.snapshot_hash,
          expires_at: "2026-06-27T00:00:00.000Z",
        },
      }),
    });
    assert.equal(prematureToken.status, 400);
    assert.equal(prematureToken.body.ui_state, "blocked");

    const decision = await json(baseUrl, "/api/intake/conflict-decisions", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-conflict-decision-1",
        conflict_decision: {
          conflict_decision_id: "decision_cmp_g6_api_001",
          tenant_id: TENANT,
          conflict_check_id: "conflict_cmp_g6_api_001",
          conflict_hit_ids: [check.body.conflict_hits[0].conflict_hit_id],
          reviewer_id: "user_cmp_g6_owner",
          decision: "clear",
          rationale: "api_conflict_review",
        },
      }),
    });
    assert.equal(decision.status, 201);
    assert.equal(decision.body.item.reviewer_id, "user_cmp_g6_owner");
    assert.equal(decision.body.conflict_check.status, "cleared");
    assert.equal(decision.body.conflict_hits[0].status, "cleared");
    assert.equal(decision.body.clearance_link_ready, true);

    const waiver = await json(baseUrl, "/api/intake/waivers", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-waiver-1",
        waiver: {
          waiver_id: "waiver_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          conflict_check_id: "conflict_cmp_g6_api_001",
          conflict_hit_ids: [check.body.conflict_hits[0].conflict_hit_id],
          consent_document_id: "consent_cmp_g6_api_001",
          approver_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(waiver.status, 201);
    assert.equal(waiver.body.clearance_link_ready, true);

    const unsignedEngagement = await json(baseUrl, "/api/intake/engagements", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-engagement-unsigned",
        engagement: {
          engagement_id: "engagement_cmp_g6_api_unsigned",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          template_id: "matter_engagement_letter",
          signature_ref: "signature:missing-document",
          approver_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(unsignedEngagement.status, 400);
    assert.equal(unsignedEngagement.body.ui_state, "blocked");

    const noUploadEngagement = await json(baseUrl, "/api/intake/engagements", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-engagement-no-upload",
        engagement: {
          engagement_id: "engagement_cmp_g6_api_no_upload",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          template_id: "matter_engagement_letter",
          signed_document_id: "signed_doc_cmp_g6_api_no_upload",
          signature_ref: "signature:signed_doc_cmp_g6_api_no_upload",
          approver_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(noUploadEngagement.status, 400);
    assert.equal(noUploadEngagement.body.ui_state, "blocked");

    const noEngagementToken = await json(baseUrl, "/api/intake/clearance-tokens", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-clearance-token-no-engagement",
        now: "2026-06-20T00:00:00.000Z",
        token: {
          clearance_token_id: "clearance_cmp_g6_api_no_engagement",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          conflict_check_id: "conflict_cmp_g6_api_001",
          engagement_id: "engagement_cmp_g6_api_001",
          snapshot_hash: check.body.item.snapshot_hash,
          expires_at: "2026-06-27T00:00:00.000Z",
        },
      }),
    });
    assert.equal(noEngagementToken.status, 400);
    assert.equal(noEngagementToken.body.ui_state, "blocked");

    const engagement = await json(baseUrl, "/api/intake/engagements", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_cmp_g6_write",
        audit_hint_ref: "audit_hint_cmp_g6_write",
        actor_id: "user_cmp_g6_owner",
        idempotency_key: "api-engagement-1",
        engagement: {
          engagement_id: "engagement_cmp_g6_api_001",
          tenant_id: TENANT,
          intake_request_id: "intake_cmp_g6_synthetic_001",
          template_id: "matter_engagement_letter",
          signed_document_id: "signed_doc_cmp_g6_api_001",
          signature_ref: "signature:signed_doc_cmp_g6_api_001",
          template_document: {
            template_document_id: "template_doc_cmp_g6_api_001",
            template_id: "matter_engagement_letter",
            document_title: "위임계약서",
            generation_state: "generated",
            merge_field_count: 3,
          },
          signed_document_upload: {
            signed_document_upload_id: "signed_upload_cmp_g6_api_001",
            document_id: "signed_doc_cmp_g6_api_001",
            signed_document_id: "signed_doc_cmp_g6_api_001",
            template_document_id: "template_doc_cmp_g6_api_001",
            signature_ref: "signature:signed_doc_cmp_g6_api_001",
            content_sha256: "sha256:signed_doc_cmp_g6_api_001",
            byte_size: 2048,
            mime_type: "application/pdf",
            upload_state: "uploaded",
            lx_registry_ref: "LX-06",
          },
          approver_id: "user_cmp_g6_owner",
        },
      }),
    });
    assert.equal(engagement.status, 201);
    assert.equal(engagement.body.engagement_ready, true);
    assert.equal(engagement.body.item.signed_document_id, "signed_doc_cmp_g6_api_001");
    assert.equal(engagement.body.template_document_id, "template_doc_cmp_g6_api_001");
    assert.equal(engagement.body.signed_document_upload_id, "signed_upload_cmp_g6_api_001");
    assert.equal(engagement.body.signed_upload_verified, true);

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
          engagement_id: engagement.body.item.engagement_id,
          snapshot_hash: check.body.item.snapshot_hash,
          expires_at: "2026-06-27T00:00:00.000Z",
        },
      }),
    });
    assert.equal(token.status, 201);
    assert.equal(token.body.validation.valid, true);
    assert.equal(token.body.conflict_review.review_satisfied, true);
    assert.equal(token.body.engagement_review.engagement_satisfied, true);
    assert.equal(token.body.item.conflict_review_satisfied, true);
    assert.equal(token.body.item.engagement_review_satisfied, true);
    assert.equal(token.body.item.engagement_id, "engagement_cmp_g6_api_001");
    assert.equal(token.body.item.engagement_signed_document_upload_id, "signed_upload_cmp_g6_api_001");
    assert.equal(token.body.item.engagement_signed_document_sha256, "sha256:signed_doc_cmp_g6_api_001");
    assert.equal(token.body.production_ready_claim, false);

    const matterOpening = {
      tenant_id: TENANT,
      permission_ref: "perm_ref_cmp_g6_write",
      audit_hint_ref: "audit_hint_cmp_g6_write",
      actor_id: "user_cmp_g6_owner",
      idempotency_key: "api-matter-open-c04-1",
      matter_number_seed: "CMP-G6-C04",
      matter: {
        matter_id: "matter_cmp_g6_c04_001",
        tenant_id: TENANT,
        legal_client_party_id: "party_cmp_g6_client_001",
        billing_client_party_id: "party_cmp_g6_client_001",
        title: "C04 ledger-gated matter opening",
        status: "opening",
        matter_number: "M-CMP-G6-C04-001",
        created_by: "user_cmp_g6_owner",
        created_at: "2026-06-20T00:00:00.000Z",
        permission_envelope_id: "perm_cmp_g6_c04_001",
        audit_trace_id: "audit_cmp_g6_c04_001",
      },
      clearance_token: token.body.item,
    };
    const missingLedgerToken = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify({
        ...matterOpening,
        idempotency_key: "api-matter-open-c04-missing",
        clearance_token: { ...token.body.item, clearance_token_id: "clearance_cmp_g6_missing_ledger" },
      }),
    });
    assert.equal(missingLedgerToken.status, 400);
    assert.equal(missingLedgerToken.body.ui_state, "blocked");

    const forgedEngagement = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify({
        ...matterOpening,
        idempotency_key: "api-matter-open-c04-forged",
        clearance_token: { ...token.body.item, engagement_id: "engagement:forged-by-client" },
      }),
    });
    assert.equal(forgedEngagement.status, 400);
    assert.equal(forgedEngagement.body.ui_state, "blocked");

    const opened = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(matterOpening),
    });
    assert.equal(opened.status, 201);
    assert.equal(opened.body.item.matter_id, "matter_cmp_g6_c04_001");
    const openedMatterRecord = matterRepository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: "matter_cmp_g6_c04_001",
    });
    assert.equal(openedMatterRecord.clearance_token_id, "clearance_cmp_g6_api_001");
    assert.equal(openedMatterRecord.engagement_id, "engagement_cmp_g6_api_001");

    const audit = await json(baseUrl, `/api/intake/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "conflict.search.executed" && event.metadata.hit_count === 1));
    assert.ok(audit.body.items.some((event) => event.action === "conflict.hit.create"));
    assert.ok(audit.body.items.some((event) => event.action === "conflict.decision.record"));
    assert.ok(audit.body.items.some((event) => event.action === "waiver.approved"));
    assert.ok(audit.body.items.some((event) => event.action === "engagement.approved"));
    assert.ok(audit.body.items.some((event) => event.action === "clearance.token.issue"));
  }, { matterRepository });
});
