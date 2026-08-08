import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const TENANT = "tenant_rp05_synthetic";
const MATTER = "matter_rp05_synthetic_opening";
const ACTOR_A = "outm32_actor_a";
const ACTOR_B = "outm32_actor_b";

function context(actorId) {
  return Object.freeze({
    principal: Object.freeze({ user_id: actorId, tenant_id: TENANT, role_ids: Object.freeze(["tenant_owner"]) }),
    rules: Object.freeze([{ id: `allow-${actorId}`, effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

function body(idempotencyKey, payload) {
  return {
    tenant_id: TENANT,
    permission_ref: "permission_outm32_actor_replay",
    audit_hint_ref: "audit_outm32_actor_replay",
    actor_id: ACTOR_A,
    idempotency_key: idempotencyKey,
    occurred_at: "2026-08-08T03:00:00.000Z",
    ...payload,
  };
}

const cases = [
  {
    name: "activity",
    path: `/api/matters/${MATTER}/activities`,
    payload: { activity: { activity_id: "outm32_actor_activity", activity_type: "task", title: "Actor-bound activity", status: "todo" } },
  },
  {
    name: "calendar",
    path: `/api/matters/${MATTER}/calendar-events`,
    payload: { event: { event_id: "outm32_actor_calendar", title: "Actor-bound calendar", event_kind: "meeting", starts_at: "2026-08-09T01:00:00.000Z" } },
  },
  {
    name: "channel",
    path: `/api/matters/${MATTER}/channel/messages`,
    payload: { message: { message_id: "outm32_actor_message", body: "Actor-bound internal message" } },
  },
  {
    name: "email draft",
    path: `/api/matters/${MATTER}/email-drafts`,
    payload: { draft: { draft_id: "outm32_actor_email", template_id: "matter_status_update_email", subject: "Actor-bound email", body: "Internal draft" } },
  },
  {
    name: "party",
    path: `/api/matters/${MATTER}/parties`,
    payload: { matter_party: { tenant_id: TENANT, matter_id: MATTER, matter_party_id: "outm32_actor_party", party_id: "party_outm32_actor", display_name: "Actor Party", party_kind: "organization", party_role: "adverse_party", retroactive_entry: true } },
  },
  {
    name: "builder draft",
    path: `/api/matters/${MATTER}/builder-drafts`,
    payload: { draft: { draft_id: "outm32_actor_builder", template_id: "matter_engagement_letter", template_version: "synthetic-1.0.0", title: "Actor-bound builder" } },
  },
];

test("OUTM-32 generic mutation replay rejects a different signed actor without leaking the first audit", async () => {
  for (const scenario of cases) {
    const runtime = createMatterRuntimeContext();
    const requestBody = body(`outm32-actor-${scenario.name}`, scenario.payload);
    const first = await handleMatterApiRequest({
      pathname: scenario.path, method: "POST", body: requestBody,
      context: context(ACTOR_A), requestId: `${scenario.name}-actor-a`, runtime,
    });
    assert.equal(first.status, 201, scenario.name);
    const before = runtime.repository.snapshot();
    const conflict = await handleMatterApiRequest({
      pathname: scenario.path, method: "POST", body: requestBody,
      context: context(ACTOR_B), requestId: `${scenario.name}-actor-b`, runtime,
    });
    assert.equal(conflict.status, 409, scenario.name);
    assert.deepEqual(conflict.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"], scenario.name);
    assert.equal(JSON.stringify(conflict.body).includes(ACTOR_A), false, scenario.name);
    assert.equal(Object.hasOwn(conflict.body, "audit_event"), false, scenario.name);
    assert.deepEqual(runtime.repository.snapshot(), before, scenario.name);
  }
});
