import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const MATTER_TENANT = "tenant_rp05_synthetic";
const CLIENT_TENANT = "tenant_rp04_synthetic";
const CRM_TENANT = "tenant_cmp_g6_synthetic";

function permissionContext(tenantId, effect = "allow") {
  return JSON.stringify({
    principal: { user_id: `user_${tenantId}_record_actions`, tenant_id: tenantId, role_ids: ["record_actions_user"] },
    rules: [{ id: `rule_record_actions_${tenantId}_${effect}`, effect, action: "*" }],
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

async function json(baseUrl, path, { tenantId = MATTER_TENANT, ...options } = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(tenantId),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function recordActionBody(tenantId, overrides = {}) {
  return {
    tenant_id: tenantId,
    permission_ref: "perm_ref_sf_b_w02_record_actions",
    audit_hint_ref: "audit_hint_sf_b_w02_record_actions",
    actor_id: `user_${tenantId}_record_actions`,
    ...overrides,
  };
}

function accountPayload(overrides = {}) {
  return {
    tenant_id: CRM_TENANT,
    permission_ref: "perm_ref_sf_b_w02_account_write",
    audit_hint_ref: "audit_hint_sf_b_w02_account_write",
    actor_id: "user_tenant_cmp_g6_synthetic_record_actions",
    idempotency_key: "sf-b-w02-account-create",
    account: {
      account_id: "account_sf_b_w02_record_actions",
      tenant_id: CRM_TENANT,
      display_name: "SF B W02 Account",
      status: "active",
    },
    ...overrides,
  };
}

function contactPayload(overrides = {}) {
  return {
    tenant_id: CRM_TENANT,
    permission_ref: "perm_ref_sf_b_w02_contact_write",
    audit_hint_ref: "audit_hint_sf_b_w02_contact_write",
    actor_id: "user_tenant_cmp_g6_synthetic_record_actions",
    idempotency_key: "sf-b-w02-contact-create",
    contact: {
      contact_id: "contact_sf_b_w02_record_actions",
      tenant_id: CRM_TENANT,
      account_id: "account_sf_b_w02_record_actions",
      display_name: "SF B W02 Contact",
      status: "active",
      primary_contact_fingerprint: "sf-b-w02-contact-fingerprint",
    },
    ...overrides,
  };
}

test("SF-B-W02R health and field registries expose safe record action metadata", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health", { tenantId: MATTER_TENANT });
    const boundedContext = health.body.bounded_contexts.find((item) => item.bounded_context === "record-actions");
    assert.equal(health.status, 200);
    assert.ok(boundedContext);
    assert.equal(boundedContext.runtime_write_ready, true);
    assert.equal(boundedContext.production_ready_claim, false);
    assert.ok(boundedContext.endpoints.includes("GET /api/record-actions/:object_name/fields"));

    const matterFields = await json(
      baseUrl,
      `/api/record-actions/matter/fields?tenant_id=${MATTER_TENANT}&permission_ref=perm_ref_sf_b_w02&audit_hint_ref=audit_hint_sf_b_w02`,
      { tenantId: MATTER_TENANT },
    );
    assert.equal(matterFields.status, 200);
    assert.equal(matterFields.body.item.object_name, "matter");
    assert.deepEqual(
      matterFields.body.item.fields.map((field) => field.field),
      ["title", "matter_code", "wip_status", "risk_level"],
    );
    assert.equal(JSON.stringify(matterFields.body).includes("owner_user_id"), true);
    assert.equal(JSON.stringify(matterFields.body.fields ?? {}).includes("owner_user_id"), false);

    const accountBulk = await json(
      baseUrl,
      `/api/record-actions/account/bulk-actions?tenant_id=${CRM_TENANT}&permission_ref=perm_ref_sf_b_w02&audit_hint_ref=audit_hint_sf_b_w02`,
      { tenantId: CRM_TENANT },
    );
    assert.equal(accountBulk.status, 200);
    assert.equal(accountBulk.body.item.actions.some((action) => action.action_type === "owner_change" && action.owner_approval_required), true);
    assert.equal(accountBulk.body.item.safe_counts_only, true);
  });
});

test("SF-B-W02R field update patches Matter safely and exposes record action audit", async () => {
  await withServer(async (baseUrl) => {
    const update = await json(baseUrl, "/api/record-actions/matter/matter_rp05_synthetic_opening/field-update", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-matter-field-update",
        field_updates: { risk_level: "high" },
        reason: "record_field_update",
      })),
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.outcome, "updated");
    assert.equal(update.body.item.risk_level, "high");
    assert.deepEqual(update.body.field_patch.changed_fields, ["risk_level"]);
    assert.equal(update.body.audit_event.action, "record_action.field_updated");
    assert.equal(update.body.item.raw_user_id_included, false);
    assert.equal("owner_user_id" in update.body.item, false);

    const codeUpdate = await json(baseUrl, "/api/record-actions/matter/matter_rp05_synthetic_opening/field-update", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-matter-code-field-update",
        field_updates: { matter_code: "AMIC/LIT/수정사건" },
        reason: "record_field_update",
      })),
    });
    assert.equal(codeUpdate.status, 200);
    assert.equal(codeUpdate.body.item.matter_code, "AMIC/LIT/수정사건");
    assert.deepEqual(codeUpdate.body.field_patch.changed_fields, ["matter_code"]);

    const replay = await json(baseUrl, "/api/record-actions/matter/matter_rp05_synthetic_opening/field-update", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-matter-field-update",
        field_updates: { risk_level: "high" },
      })),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const audit = await json(
      baseUrl,
      `/api/record-actions/matter/matter_rp05_synthetic_opening/audit?tenant_id=${MATTER_TENANT}&permission_ref=perm_ref_sf_b_w02&audit_hint_ref=audit_hint_sf_b_w02`,
      { tenantId: MATTER_TENANT },
    );
    assert.equal(audit.status, 200);
    assert.equal(audit.body.items.length, 2);
    assert.equal(audit.body.items[0].actor_ref_included, false);
    assert.equal(audit.body.items[0].raw_values_included, false);

    const invalid = await json(baseUrl, "/api/record-actions/matter/matter_rp05_synthetic_opening/field-update", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-invalid-field-update",
        field_updates: { owner_user_id: "raw-user-id" },
      })),
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.ui_state, "blocked");

    const invalidCode = await json(baseUrl, "/api/record-actions/matter/matter_rp05_synthetic_opening/field-update", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-invalid-matter-code-field-update",
        field_updates: { matter_code: "AMIC/General/잘못된축" },
      })),
    });
    assert.equal(invalidCode.status, 400);
    assert.equal(invalidCode.body.ui_state, "blocked");

    const denied = await json(
      baseUrl,
      `/api/record-actions/matter/fields?tenant_id=${MATTER_TENANT}&permission_ref=perm_ref_sf_b_w02&audit_hint_ref=audit_hint_sf_b_w02`,
      { tenantId: MATTER_TENANT, headers: { [PERMISSION_CONTEXT_HEADER]: undefined } },
    );
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("SF-B-W02R Client Account and Contact record actions are route backed", async () => {
  await withServer(async (baseUrl) => {
    const account = await json(baseUrl, "/api/crm/accounts", {
      tenantId: CRM_TENANT,
      method: "POST",
      body: JSON.stringify(accountPayload()),
    });
    assert.equal(account.status, 201);

    const contact = await json(baseUrl, "/api/crm/contacts", {
      tenantId: CRM_TENANT,
      method: "POST",
      body: JSON.stringify(contactPayload()),
    });
    assert.equal(contact.status, 201);

    const clientUpdate = await json(baseUrl, "/api/record-actions/client/client_group_rp04_amic/field-update", {
      tenantId: CLIENT_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(CLIENT_TENANT, {
        idempotency_key: "sf-b-w02-client-field-update",
        field_updates: { display_name: "Updated Client Group" },
      })),
    });
    assert.equal(clientUpdate.status, 200);
    assert.equal(clientUpdate.body.item.display_label, "Updated Client Group");
    assert.equal(clientUpdate.body.item.member_count >= 0, true);

    const accountUpdate = await json(baseUrl, "/api/record-actions/account/account_sf_b_w02_record_actions/field-update", {
      tenantId: CRM_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(CRM_TENANT, {
        idempotency_key: "sf-b-w02-account-field-update",
        field_updates: { status: "review_required" },
      })),
    });
    assert.equal(accountUpdate.status, 200);
    assert.equal(accountUpdate.body.item.status, "review_required");
    assert.equal(accountUpdate.body.item.direct_matter_reference_included, false);
    assert.equal(JSON.stringify(accountUpdate.body).includes("registration_number"), false);

    const contactUpdate = await json(baseUrl, "/api/record-actions/contact/contact_sf_b_w02_record_actions/field-update", {
      tenantId: CRM_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(CRM_TENANT, {
        idempotency_key: "sf-b-w02-contact-field-update",
        field_updates: { display_name: "Updated Safe Contact" },
      })),
    });
    assert.equal(contactUpdate.status, 200);
    assert.equal(contactUpdate.body.item.display_label, "Updated Safe Contact");
    assert.equal(contactUpdate.body.item.raw_contact_value_included, false);
    assert.equal(JSON.stringify(contactUpdate.body).includes("sf-b-w02-contact-fingerprint"), false);
  });
});

test("SF-B-W02R bulk updates are all-or-blocked and owner actions are route-backed blocked states", async () => {
  await withServer(async (baseUrl) => {
    const bulkStatus = await json(baseUrl, "/api/record-actions/matter/bulk-updates", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-matter-bulk-status",
        record_ids: ["matter_rp05_synthetic_opening"],
        action_type: "status_update",
        target_status: "closed",
        bulk_action_ref: "bulk_sf_b_w02_status",
      })),
    });
    assert.equal(bulkStatus.status, 200);
    assert.equal(bulkStatus.body.outcome, "updated");
    assert.equal(bulkStatus.body.bulk_action.applied_count, 1);
    assert.equal(bulkStatus.body.bulk_action.all_or_blocked, true);
    assert.equal(bulkStatus.body.items[0].status, "closed");

    const ownerBlocked = await json(baseUrl, "/api/record-actions/matter/bulk-updates", {
      tenantId: MATTER_TENANT,
      method: "POST",
      body: JSON.stringify(recordActionBody(MATTER_TENANT, {
        idempotency_key: "sf-b-w02-matter-bulk-owner-blocked",
        record_ids: ["matter_rp05_synthetic_opening"],
        action_type: "owner_change",
        bulk_action_ref: "bulk_sf_b_w02_owner",
      })),
    });
    assert.equal(ownerBlocked.status, 200);
    assert.equal(ownerBlocked.body.outcome, "owner_approval_required");
    assert.equal(ownerBlocked.body.ui_state, "owner_blocked");
    assert.equal(ownerBlocked.body.bulk_action.applied_count, 0);
    assert.equal(ownerBlocked.body.bulk_action.owner_approval_required, true);
    assert.deepEqual(ownerBlocked.body.items, []);
    assert.equal(ownerBlocked.body.production_ready_claim, false);
  });
});
