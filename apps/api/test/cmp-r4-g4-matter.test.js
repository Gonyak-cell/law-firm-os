import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp05_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_rp05_read&audit_hint_ref=audit_hint_rp05_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: "user_rp05_owner", tenant_id: TENANT, role_ids: ["matter_runtime_user"] },
    rules: [{ id: `rule_matter_${effect}`, effect, action: "*" }],
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

function openingPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_write",
    audit_hint_ref: "audit_hint_rp05_write",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-open-001",
    matter_number_seed: "API-OPEN-001",
    require_canonical_matter_code: true,
    client: {
      client_id: "client_rp04_amic",
      client_display_name: "(주)AMIC API 주식회사",
    },
    matter: {
      matter_id: "matter_api_open_001",
      tenant_id: TENANT,
      client_id: "client_rp04_amic",
      legal_client_party_id: "party_rp04_amic",
      billing_client_party_id: "party_rp04_amic",
      matter_type_english: "LIT",
      matter_litigation_axis: "CIV",
      matter_detail_type_korean: "계약분쟁",
      client_case_role: "원고",
      client_case_role_confidence: "api_opening_test",
      source_revision: "api-opening-test-revision",
      title: "API opened matter",
      status: "opening",
      matter_number: "M-TENANT-RP05-API-OPEN-001",
      created_by: "user_rp05_owner",
      created_at: "2026-06-20T00:00:00.000Z",
      permission_envelope_id: "perm_matter_api_open_001",
      audit_trace_id: "audit_matter_api_open_001",
    },
    clearance_token: {
      clearance_token_id: "clearance_api_open_001",
      tenant_id: TENANT,
      intake_request_id: "intake_api_open_001",
      conflict_check_id: "conflict_api_open_001",
      engagement_id: "engagement_api_open_001",
      snapshot_hash: "sha256:clearance-api-open-001",
      token_state: "valid",
      outcome: "passed",
    },
    ...overrides,
  };
}

function statusTransitionPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_status",
    audit_hint_ref: "audit_hint_rp05_status",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-status-001",
    target_status: "closed",
    reason: "status_complete",
    occurred_at: "2026-06-20T12:00:00.000Z",
    ...overrides,
  };
}

function recentlyViewedPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_recent",
    audit_hint_ref: "audit_hint_rp05_recent",
    actor_id: "user_rp05_owner",
    viewed_at: "2026-06-20T13:00:00.000Z",
    ...overrides,
  };
}

function listViewPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_list_view",
    audit_hint_ref: "audit_hint_rp05_list_view",
    actor_id: "user_rp05_owner",
    list_view_id: "matter_view_api_opening",
    label: "Opening matters",
    filter: { status: "opening" },
    sort: "updated_desc",
    updated_at: "2026-06-20T14:00:00.000Z",
    ...overrides,
  };
}

function bulkStatusPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_bulk_status",
    audit_hint_ref: "audit_hint_rp05_bulk_status",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-bulk-status-001",
    matter_ids: ["matter_rp05_synthetic_opening", "matter_api_bulk_open_001"],
    target_status: "closed",
    reason: "bulk_status_complete",
    occurred_at: "2026-06-20T14:30:00.000Z",
    ...overrides,
  };
}

function ownerChangePayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_owner_change",
    audit_hint_ref: "audit_hint_rp05_owner_change",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-owner-change-001",
    owner: {
      employee_id: "emp-001",
    },
    reason: "record_owner_changed",
    assigned_at: "2026-06-20T14:45:00.000Z",
    ...overrides,
  };
}

function inlinePatchPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_inline_patch",
    audit_hint_ref: "audit_hint_rp05_inline_patch",
    actor_id: "user_rp05_owner",
    idempotency_key: "matter-api-inline-patch-001",
    field_updates: {
      wip_status: "review_required",
    },
    reason: "inline_field_edit",
    edited_at: "2026-06-20T15:00:00.000Z",
    ...overrides,
  };
}

test("G4 Matter API health descriptor exposes matter-core runtime without production-ready claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const matter = body.bounded_contexts.find((context) => context.bounded_context === "matter-core");
    assert.equal(status, 200);
    assert.equal(matter.runtime_write_ready, true);
    assert.equal(matter.r5_r6_owner_decision_ready, true);
    assert.equal(matter.production_ready_claim, false);
  });
});

test("G4 Matter list is repository-backed, permission-trimmed, and count-leak safe", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, `/api/matters?${BASE_QUERY}`);
    assert.equal(status, 200);
    assert.equal(body.outcome, "passed");
    assert.equal(body.items.length, 25);
    assert.equal(body.items[0].matter_id, "matter_rp05_synthetic_opening");
    assert.ok(body.items.some((item) => item.matter_code === "귀한사람들/Advisory/retainer"));
    assert.equal(body.page_info.next_cursor, "25");
    assert.equal(body.page_info.omitted_matter_count, null);
    assert.equal(body.count_leak_prevented, true);
    assert.equal(body.production_ready_claim, false);
    assert.equal(JSON.stringify(body).includes("descriptor-only"), false);
  });
});

test("G4 Matter permission gate fails closed and routes review-required without leaking rows", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/api/matters?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: undefined },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.items.length, 0);
    assert.equal(denied.body.count_leak_prevented, true);

    const review = await json(baseUrl, `/api/matters?${BASE_QUERY}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("review_required") },
    });
    assert.equal(review.status, 200);
    assert.equal(review.body.outcome, "review_required");
    assert.equal(review.body.items.length, 0);
  });
});

test("G4 Matter opening write persists, audits, and replays idempotently across restarts", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-api-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.matter_id, "matter_api_open_001");
    assert.equal(created.body.item.matter_code, "AMIC API/LIT/CIV/계약분쟁");
    assert.equal(created.body.item.matter_number, "M-TENANT-RP05-API-OPEN-001");
    assert.equal(created.body.item.client_id, "client_rp04_amic");
    assert.equal(created.body.item.client_case_role, "원고");
    assert.equal(created.body.item.client_case_role_confidence, "api_opening_test");
    assert.equal(created.body.state_idempotent, true);
    assert.equal(created.body.audit_event.action, "matter.open");

    const replay = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_api_open_001?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.matter_code, "AMIC API/LIT/CIV/계약분쟁");
    assert.equal(detail.body.item.matter_id, "matter_api_open_001");
    assert.equal(detail.body.item.client_case_role, "원고");
    assert.equal(detail.body.item.client_case_role_confidence, "api_opening_test");
    assert.equal(detail.body.client_report.unauthorized_count_leaked, false);
  }, { matterStorePath: storePath });
});

test("G4 Matter team write requires employee-backed staffing and records audit", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/team-members", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_rp05_team",
        audit_hint_ref: "audit_hint_rp05_team",
        actor_id: "user_rp05_owner",
        member: {
          member_id: "member_api_associate",
          tenant_id: TENANT,
          employee_id: "emp-002",
          user_id: "user_rp05_associate",
          role: "associate",
          status: "active",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.employee_id, "emp-002");
    assert.equal(created.body.owner_assignment, null);

    const ownerAssigned = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/team-members", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_rp05_team",
        audit_hint_ref: "audit_hint_rp05_team",
        actor_id: "user_rp05_owner",
        member: {
          member_id: "member_api_responsible",
          tenant_id: TENANT,
          employee_id: "emp-001",
          user_id: "user_rp05_owner",
          role: "responsible_attorney",
          status: "active",
        },
      }),
    });
    assert.equal(ownerAssigned.status, 201);
    assert.equal(ownerAssigned.body.owner_assignment.owner_employee_id, "emp-001");
    assert.equal(ownerAssigned.body.owner_assignment.owner_user_id, "user_rp05_owner");
    assert.equal(ownerAssigned.body.matter.owner_employee_id, "emp-001");
    assert.equal(ownerAssigned.body.audit_event.action, "matter.owner.assignment");

    const blocked = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/team-members", {
      method: "POST",
      body: JSON.stringify({
        tenant_id: TENANT,
        permission_ref: "perm_ref_rp05_team",
        audit_hint_ref: "audit_hint_rp05_team",
        actor_id: "user_rp05_owner",
        member: {
          member_id: "member_api_user_only",
          tenant_id: TENANT,
          user_id: "user_rp05_user_only",
          role: "associate",
          status: "active",
        },
      }),
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.team.member.add"));
    assert.ok(audit.body.items.some((event) => event.action === "matter.owner.assignment"));

    const detail = await json(baseUrl, `/api/matters/matter_rp05_synthetic_opening?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.owner_employee_id, "emp-001");
    assert.equal(detail.body.item.owner_user_id, "user_rp05_owner");
  });
});

test("G4 Matter generic owner change is employee backed, audited, idempotent, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-owner-change-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const changed = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/owner-change", {
      method: "POST",
      body: JSON.stringify(ownerChangePayload()),
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.outcome, "updated");
    assert.equal(changed.body.item.owner_employee_id, "emp-001");
    assert.equal(changed.body.owner_assignment.owner_employee_id, "emp-001");
    assert.equal(changed.body.audit_event.action, "matter.owner.change");
    assert.equal(changed.body.state_idempotent, true);
    assert.equal(changed.body.production_ready_claim, false);

    const replay = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/owner-change", {
      method: "POST",
      body: JSON.stringify(ownerChangePayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const blocked = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/owner-change", {
      method: "POST",
      body: JSON.stringify(ownerChangePayload({
        idempotency_key: "matter-api-owner-change-blocked-001",
        owner: { employee_id: "emp-offboarded" },
      })),
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.owner.change"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_rp05_synthetic_opening?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.owner_employee_id, "emp-001");
  }, { matterStorePath: storePath });
});

test("G4 Matter inline field patch is allowlisted, audited, idempotent, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-inline-patch-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const patched = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening", {
      method: "PATCH",
      body: JSON.stringify(inlinePatchPayload()),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.outcome, "updated");
    assert.equal(patched.body.item.wip_status, "review_required");
    assert.deepEqual(patched.body.field_patch.changed_fields, ["wip_status"]);
    assert.equal(patched.body.field_patch.field_level_allowlist, true);
    assert.equal(patched.body.audit_event.action, "matter.inline.patch");
    assert.equal(patched.body.state_idempotent, true);
    assert.equal(patched.body.production_ready_claim, false);

    const replay = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening", {
      method: "PATCH",
      body: JSON.stringify(inlinePatchPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const blocked = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening", {
      method: "PATCH",
      body: JSON.stringify(inlinePatchPayload({
        idempotency_key: "matter-api-inline-patch-blocked-001",
        field_updates: { owner_user_id: "user_direct_write" },
      })),
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.inline.patch"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_rp05_synthetic_opening?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.wip_status, "review_required");
  }, { matterStorePath: storePath });
});

test("G4 Matter recently viewed is viewer scoped, audited, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-recent-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const marked = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/recently-viewed", {
      method: "POST",
      body: JSON.stringify(recentlyViewedPayload()),
    });
    assert.equal(marked.status, 200);
    assert.equal(marked.body.outcome, "updated");
    assert.equal(marked.body.item.matter_id, "matter_rp05_synthetic_opening");
    assert.equal(marked.body.item.viewer_scoped, true);
    assert.equal(marked.body.item.production_ready_claim, false);
    assert.equal(marked.body.audit_event.action, "matter.recently_viewed.mark");
    assert.equal(JSON.stringify(marked.body.item).includes("viewer_user_id"), false);
    assert.equal(JSON.stringify(marked.body.item).includes("user_rp05_owner"), false);

    const recent = await json(baseUrl, `/api/matters/recently-viewed?${BASE_QUERY}`);
    assert.equal(recent.status, 200);
    assert.equal(recent.body.items.length, 1);
    assert.equal(recent.body.items[0].matter_id, "matter_rp05_synthetic_opening");
    assert.equal(recent.body.items[0].viewer_scoped, true);
    assert.equal(JSON.stringify(recent.body.items[0]).includes("viewer_user_id"), false);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.recently_viewed.mark"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const recent = await json(baseUrl, `/api/matters/recently-viewed?${BASE_QUERY}`);
    assert.equal(recent.status, 200);
    assert.equal(recent.body.items.length, 1);
    assert.equal(recent.body.items[0].viewed_at, "2026-06-20T13:00:00.000Z");
  }, { matterStorePath: storePath });
});

test("G4 Matter saved list views are owner scoped, audited, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-list-view-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const systemViews = await json(baseUrl, `/api/matters/list-views?${BASE_QUERY}`);
    assert.equal(systemViews.status, 200);
    assert.ok(systemViews.body.items.some((item) => item.list_view_id === "matter_view_all"));
    assert.equal(systemViews.body.count_leak_prevented, true);
    assert.equal(systemViews.body.production_ready_claim, false);
    assert.equal(JSON.stringify(systemViews.body.items).includes("owner_user_id"), false);

    const saved = await json(baseUrl, "/api/matters/list-views", {
      method: "POST",
      body: JSON.stringify(listViewPayload()),
    });
    assert.equal(saved.status, 201);
    assert.equal(saved.body.outcome, "created");
    assert.equal(saved.body.item.list_view_id, "matter_view_api_opening");
    assert.deepEqual(saved.body.item.filter, { status: "opening" });
    assert.equal(saved.body.item.owner_scoped, true);
    assert.equal(saved.body.item.production_ready_claim, false);
    assert.equal(saved.body.audit_event.action, "matter.list_view.saved");
    assert.equal(JSON.stringify(saved.body.item).includes("owner_user_id"), false);
    assert.equal(JSON.stringify(saved.body.item).includes("user_rp05_owner"), false);

    const listed = await json(baseUrl, `/api/matters/list-views?${BASE_QUERY}`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.items.some((item) => item.list_view_id === "matter_view_api_opening"));

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.list_view.saved"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const listed = await json(baseUrl, `/api/matters/list-views?${BASE_QUERY}`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.items.some((item) => item.list_view_id === "matter_view_api_opening"));
  }, { matterStorePath: storePath });
});

test("G4 Matter bulk status transition is permission gated, audited, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-bulk-status-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/matters/openings", {
      method: "POST",
      body: JSON.stringify(openingPayload({
        idempotency_key: "matter-api-bulk-open-001",
        matter_number_seed: "API-BULK-001",
        matter: {
          ...openingPayload().matter,
          matter_id: "matter_api_bulk_open_001",
          title: "API bulk opened matter",
          matter_number: "M-TENANT-RP05-API-BULK-001",
          permission_envelope_id: "perm_matter_api_bulk_open_001",
          audit_trace_id: "audit_matter_api_bulk_open_001",
        },
        clearance_token: {
          ...openingPayload().clearance_token,
          clearance_token_id: "clearance_api_bulk_open_001",
          intake_request_id: "intake_api_bulk_open_001",
          conflict_check_id: "conflict_api_bulk_open_001",
          engagement_id: "engagement_api_bulk_open_001",
          snapshot_hash: "sha256:clearance-api-bulk-open-001",
        },
      })),
    });
    assert.equal(created.status, 201);

    const bulk = await json(baseUrl, "/api/matters/bulk/status-transitions", {
      method: "POST",
      body: JSON.stringify(bulkStatusPayload()),
    });
    assert.equal(bulk.status, 200);
    assert.equal(bulk.body.outcome, "updated");
    assert.equal(bulk.body.items.length, 2);
    assert.equal(bulk.body.bulk_action.updated_count, 2);
    assert.equal(bulk.body.bulk_action.partial_update, false);
    assert.equal(bulk.body.bulk_action.automatic_matter_creation, false);
    assert.equal(bulk.body.audit_event.action, "matter.bulk.status_transition");
    assert.equal(bulk.body.audit_events.length, 2);
    assert.ok(bulk.body.items.every((item) => item.status === "closed"));
    assert.equal(JSON.stringify(bulk.body.bulk_action).includes("user_rp05_owner"), false);

    const replay = await json(baseUrl, "/api/matters/bulk/status-transitions", {
      method: "POST",
      body: JSON.stringify(bulkStatusPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.bulk.status_transition"));
    assert.ok(audit.body.items.some((event) => event.action === "matter.status.bulk_transitioned"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_api_bulk_open_001?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.status, "closed");
    assert.equal(detail.body.item.closed_at, "2026-06-20T14:30:00.000Z");
  }, { matterStorePath: storePath });
});

test("G4 Matter status transition is idempotent, audited, and persisted", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-matter-status-g4-")), "matter-store.json");
  await withServer(async (baseUrl) => {
    const updated = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/status-transitions", {
      method: "POST",
      body: JSON.stringify(statusTransitionPayload()),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.outcome, "updated");
    assert.equal(updated.body.item.status, "closed");
    assert.equal(updated.body.item.wip_status, "completed");
    assert.equal(updated.body.transition.previous_status, "opening");
    assert.equal(updated.body.transition.target_status, "closed");
    assert.equal(updated.body.transition.automatic_matter_creation, false);
    assert.equal(updated.body.state_idempotent, true);
    assert.equal(updated.body.production_ready_claim, false);
    assert.equal(updated.body.audit_event.action, "matter.status.transitioned");
    assert.equal(updated.body.timeline_event.document_bytes_included, false);

    const replay = await json(baseUrl, "/api/matters/matter_rp05_synthetic_opening/status-transitions", {
      method: "POST",
      body: JSON.stringify(statusTransitionPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const audit = await json(baseUrl, `/api/matters/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "matter.status.transitioned"));
  }, { matterStorePath: storePath });

  await withServer(async (baseUrl) => {
    const detail = await json(baseUrl, `/api/matters/matter_rp05_synthetic_opening?${BASE_QUERY}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.status, "closed");
    assert.equal(detail.body.item.closed_at, "2026-06-20T12:00:00.000Z");
  }, { matterStorePath: storePath });
});
