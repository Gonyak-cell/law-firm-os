import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp05_synthetic";
const MATTER_ID = "matter_rp05_synthetic_opening";
const ACTOR_ID = "user_rp05_owner";
const CONFIRMER_ID = "user_rp05_associate";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["matter_activity_user"] },
    rules: [{ id: `rule_sf_b_w03_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...headers,
  };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function query(permission = "read") {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: `perm_ref_sf_b_w03_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w03_${permission}`,
  }).toString();
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w03_write",
    audit_hint_ref: "audit_hint_sf_b_w03_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

test("SF-B-W03R health exposes Matter activity calendar channel route descriptors", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const matter = health.body.bounded_contexts.find((item) => item.bounded_context === "matter-core");
    assert.equal(health.status, 200);
    assert.ok(matter);
    assert.equal(matter.production_ready_claim, false);
    assert.equal(matter.runtime_write_ready, true);
    assert.ok(matter.endpoints.includes("GET /api/matters/:matter_id/activities"));
    assert.ok(matter.endpoints.includes("POST /api/matters/:matter_id/calendar-events"));
    assert.ok(matter.endpoints.includes("POST /api/matters/:matter_id/channel/provider-sync"));
  });
});

test("SF-B-W03R activity workspace creates, patches, replays, and feeds safe timeline", async () => {
  await withServer(async (baseUrl) => {
    const activity = await json(baseUrl, `/api/matters/${MATTER_ID}/activities`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w03-activity-create",
        activity: {
          activity_id: "activity_sf_b_w03_task",
          activity_type: "task",
          title: "Prepare witness outline",
          status: "todo",
          due_at: "2026-07-01T02:00:00.000Z",
        },
      }),
    });
    assert.equal(activity.status, 201);
    assert.equal(activity.body.outcome, "created");
    assert.equal(activity.body.item.activity_id, "activity_sf_b_w03_task");
    assert.equal(activity.body.item.raw_body_included, false);
    assert.equal(activity.body.timeline_event.raw_body_included, false);
    assert.equal(activity.body.production_ready_claim, false);

    const replay = await json(baseUrl, `/api/matters/${MATTER_ID}/activities`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w03-activity-create",
        activity: {
          activity_id: "activity_sf_b_w03_task",
          activity_type: "task",
          title: "Prepare witness outline",
          status: "todo",
        },
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.idempotent_replay, true);

    const patched = await json(baseUrl, `/api/matters/${MATTER_ID}/activities/activity_sf_b_w03_task`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w03-activity-patch",
        patch: { status: "in_progress" },
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.outcome, "updated");
    assert.equal(patched.body.item.status, "in_progress");
    assert.equal(patched.body.audit_event.metadata.raw_body_included, false);

    const list = await json(baseUrl, `/api/matters/${MATTER_ID}/activities?${query("activity_read")}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.items.some((item) => item.activity_id === "activity_sf_b_w03_task"), true);
    assert.equal(list.body.count_leak_prevented, true);

    const timeline = await json(baseUrl, `/api/matters/${MATTER_ID}/timeline?${query("timeline")}`);
    assert.equal(timeline.status, 200);
    assert.equal(timeline.body.item.visible_entries.some((entry) => entry.source_ref === "activity_sf_b_w03_task"), true);
    assert.equal(JSON.stringify(timeline.body).includes("Prepare witness outline"), true);
  });
});

test("SF-B-W03R critical calendar changes are approval state first and confirm with dual control", async () => {
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, `/api/matters/${MATTER_ID}/calendar-events`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w03-calendar-create",
        event: {
          event_id: "calendar_sf_b_w03_deadline",
          title: "Expert report deadline",
          status: "scheduled",
          starts_at: "2026-07-10T01:00:00.000Z",
          ends_at: "2026-07-10T02:00:00.000Z",
          legal_consequence: "court_deadline",
          criticality: "critical",
          reminder_rule: "two_business_days",
        },
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.criticality, "critical");
    assert.equal(created.body.item.provider_sync_state, "provider_blocked");
    assert.equal(created.body.item.raw_provider_payload_included, false);

    const requested = await json(baseUrl, `/api/matters/${MATTER_ID}/calendar-events/calendar_sf_b_w03_deadline`, {
      method: "PATCH",
      body: body({
        idempotency_key: "sf-b-w03-calendar-critical-patch",
        patch: {
          starts_at: "2026-07-11T01:00:00.000Z",
          ends_at: "2026-07-11T02:00:00.000Z",
        },
      }),
    });
    assert.equal(requested.status, 200);
    assert.equal(requested.body.outcome, "approval_required");
    assert.equal(requested.body.ui_state, "approval_required");
    assert.equal(requested.body.deadline_change_request.dual_control_required, true);
    assert.equal(requested.body.deadline_change_request.requester_user_ref_included, false);

    const confirm = await json(baseUrl, `/api/matters/${MATTER_ID}/deadlines/calendar_sf_b_w03_deadline/confirm-change`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w03-deadline-confirm",
        confirmer_user_id: CONFIRMER_ID,
      }),
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.outcome, "confirmed");
    assert.equal(confirm.body.confirmation.dual_control_satisfied, true);
    assert.equal(confirm.body.confirmation.requester_user_ref_included, false);
    assert.equal(confirm.body.item.due_at, "2026-07-11T01:00:00.000Z");

    const deadlines = await json(baseUrl, `/api/matters/${MATTER_ID}/deadlines?${query("deadline_read")}`);
    assert.equal(deadlines.status, 200);
    assert.equal(deadlines.body.items.some((item) => item.deadline_id === "calendar_sf_b_w03_deadline"), true);
  });
});

test("SF-B-W03R channel messages are internal-only and external sync stays provider-blocked", async () => {
  await withServer(async (baseUrl) => {
    const message = await json(baseUrl, `/api/matters/${MATTER_ID}/channel/messages`, {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w03-channel-message",
        message: {
          message_id: "channel_message_sf_b_w03",
          body: "Send internal prep note without external provider payload",
        },
      }),
    });
    assert.equal(message.status, 201);
    assert.equal(message.body.item.message_id, "channel_message_sf_b_w03");
    assert.equal(message.body.item.external_send_state, "internal_only");
    assert.equal(message.body.item.raw_provider_payload_included, false);
    assert.equal(message.body.item.direct_personal_contact_identifier_included, false);

    const channel = await json(baseUrl, `/api/matters/${MATTER_ID}/channel?${query("channel_read")}`);
    assert.equal(channel.status, 200);
    assert.equal(channel.body.item.provider_state.external_send_state, "provider_blocked");
    assert.equal(channel.body.item.provider_state.provider_credentials_included, false);
    assert.equal(channel.body.item.messages.some((item) => item.message_id === "channel_message_sf_b_w03"), true);

    const sync = await json(baseUrl, `/api/matters/${MATTER_ID}/channel/provider-sync`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w03-channel-provider-sync" }),
    });
    assert.equal(sync.status, 200);
    assert.equal(sync.body.outcome, "provider_blocked");
    assert.equal(sync.body.ui_state, "provider_blocked");
    assert.equal(sync.body.provider_state.provider_configured, false);
    assert.equal(sync.body.provider_state.raw_provider_payload_included, false);
    assert.equal(sync.body.production_ready_claim, false);

    const denied = await json(baseUrl, `/api/matters/${MATTER_ID}/channel?${query("channel_denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});
