import assert from "node:assert/strict";
import test from "node:test";
import { handleMatterApiRequest } from "../src/matter-runtime-context.js";
import {
  createOutm32ApiRuntime,
  OUTM32_MATTER as MATTER,
  outm32Body as body,
  outm32Context,
  outm32Draft,
} from "./helpers/outm32-api-fixture.js";

async function call(runtime, pathname, requestBody, requestId, actorId, method = "POST") {
  return handleMatterApiRequest({ pathname, method, body: requestBody, context: outm32Context(actorId), requestId, runtime });
}

async function createAndRequest(runtime, suffix = "authority") {
  const draftId = `builder_draft_${suffix}`;
  const requestKey = `approval-request-${suffix}`;
  const created = await call(runtime, `/api/matters/${MATTER}/builder-drafts`, body({
    idempotency_key: `builder-create-${suffix}`,
    draft: outm32Draft({ draft_id: draftId }),
  }), `create-${suffix}`);
  assert.equal(created.status, 201);
  const requested = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${draftId}/approval-requests`, body({
    idempotency_key: requestKey,
  }), `request-${suffix}`);
  assert.equal(requested.status, 200);
  return { draftId, requestKey, approvalId: requested.body.approval_request.approval_request_id };
}

test("OUTM-32 approval-request replay conflicts after approval state advances instead of returning stale pending state", async () => {
  const runtime = createOutm32ApiRuntime();
  const ids = await createAndRequest(runtime, "approved_state");
  const pendingSnapshot = runtime.repository.snapshot();
  const pendingReplay = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${ids.draftId}/approval-requests`, body({
    idempotency_key: ids.requestKey,
  }), "approval-request-pending-replay");
  assert.equal(pendingReplay.status, 200);
  assert.equal(pendingReplay.body.outcome, "idempotent_replay");
  assert.deepEqual(runtime.repository.snapshot(), pendingSnapshot);
  const approved = await call(runtime, `/api/matters/${MATTER}/builder-approval-requests/${ids.approvalId}/decision`, body({
    decision: "approved", idempotency_key: "approve-state-advance",
  }), "approve-state-advance");
  assert.equal(approved.status, 200);
  const before = runtime.repository.snapshot();
  const replay = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${ids.draftId}/approval-requests`, body({
    idempotency_key: ids.requestKey,
  }), "approval-request-after-decision");
  assert.equal(replay.status, 409);
  assert.deepEqual(replay.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"]);
  assert.equal(JSON.stringify(replay.body).includes("pending_owner_approval"), false);
  assert.equal(JSON.stringify(replay.body).includes("owner_blocked"), false);
  assert.deepEqual(runtime.repository.snapshot(), before);
});

test("OUTM-32 approval-request replay conflicts after canonical input or exact template identity changes", async () => {
  for (const change of ["input", "template"]) {
    const runtime = createOutm32ApiRuntime();
    const ids = await createAndRequest(runtime, `changed_${change}`);
    if (change === "input") {
      const patched = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${ids.draftId}`, body({
        idempotency_key: "patch-before-replay",
        patch: { merge_data: { client_name: "변경 의뢰인", matter_title: "변경 Matter" } },
      }), "patch-before-replay", undefined, "PATCH");
      assert.equal(patched.status, 200);
    } else {
      runtime.repository.update(
        { tenant_id: body().tenant_id, model_type: "MatterBuilderDraft", resource_id: ids.draftId },
        { template_version: "api-2.0.0" },
      );
    }
    const before = runtime.repository.snapshot();
    const replay = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${ids.draftId}/approval-requests`, body({
      idempotency_key: ids.requestKey,
    }), `replay-after-${change}`);
    assert.equal(replay.status, 409, change);
    assert.deepEqual(replay.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"], change);
    assert.deepEqual(runtime.repository.snapshot(), before, change);
  }
});

test("OUTM-32 owner-blocked publication is actor-bound and exact replay writes no second audit", async () => {
  const runtime = createOutm32ApiRuntime({ dmsRuntime: null });
  const draftId = "builder_draft_blocked_replay";
  assert.equal((await call(runtime, `/api/matters/${MATTER}/builder-drafts`, body({
    idempotency_key: "blocked-builder-create", draft: outm32Draft({ draft_id: draftId }),
  }), "blocked-builder-create")).status, 201);
  const publishBody = body({ idempotency_key: "blocked-publish-key" });
  const first = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${draftId}/publish-to-vault`, publishBody, "blocked-publish-first");
  assert.equal(first.status, 200);
  assert.equal(first.body.outcome, "owner_blocked");
  const afterFirst = runtime.repository.snapshot();
  const exact = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${draftId}/publish-to-vault`, publishBody, "blocked-publish-exact");
  assert.equal(exact.status, 200);
  assert.equal(exact.body.outcome, "idempotent_replay");
  assert.deepEqual(runtime.repository.snapshot(), afterFirst);
  const conflict = await call(runtime, `/api/matters/${MATTER}/builder-drafts/${draftId}/publish-to-vault`, publishBody, "blocked-publish-foreign", "other-owner");
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body.safe_error_codes, ["MATTER_IDEMPOTENCY_CONFLICT"]);
  assert.equal(JSON.stringify(conflict.body).includes("owner_outm32_api"), false);
  assert.deepEqual(runtime.repository.snapshot(), afterFirst);
});
