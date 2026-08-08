import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { handleMatterApiRequest } from "../src/matter-runtime-context.js";
import {
  createOutm32ApiRuntime,
  OUTM32_MATTER as MATTER,
  OUTM32_TENANT as TENANT,
  outm32Body as body,
  outm32Context,
  outm32Draft,
} from "./helpers/outm32-api-fixture.js";

function failBuilderReplayReceiptOnce(repository) {
  let fail = true;
  return Object.freeze({
    ...repository,
    transaction(callback) {
      return repository.transaction((tx) => callback(Object.freeze({
        ...tx,
        recordIdempotency(entry) {
          if (fail && entry.operation === "matter_builder_draft_create") {
            fail = false;
            throw Object.assign(new Error("injected builder replay receipt failure"), { code: "OUTM32_REPLAY_RECEIPT_FAILED" });
          }
          return tx.recordIdempotency(entry);
        },
      })));
    },
  });
}

async function create(runtime, requestBody, requestId) {
  return handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/builder-drafts`, method: "POST",
    body: requestBody, context: outm32Context(), requestId, runtime,
  });
}

test("OUTM-32 builder draft and replay receipt roll back together and converge exactly once after restart", async () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "outm32-builder-atomic-")), "matter.json");
  const base = createMatterRepository({ filePath });
  const faulting = failBuilderReplayReceiptOnce(base);
  const requestBody = body({
    idempotency_key: "builder-atomic-create-key",
    draft: outm32Draft({ draft_id: "builder_draft_atomic_restart" }),
  });
  const failed = await create(createOutm32ApiRuntime({ repository: faulting }), requestBody, "builder-atomic-failed");
  assert.equal(failed.status, 400);
  assert.equal(base.list({ tenant_id: TENANT, model_type: "MatterBuilderDraft" }).length, 0);
  assert.equal(base.getIdempotency({ tenant_id: TENANT, idempotency_key: requestBody.idempotency_key }), undefined);
  assert.equal(base.listAudit({ tenant_id: TENANT, object_id: "builder_draft_atomic_restart" }).length, 0);
  base.close();

  const reopened = createMatterRepository({ filePath });
  const runtime = createOutm32ApiRuntime({ repository: reopened });
  const created = await create(runtime, requestBody, "builder-atomic-created");
  assert.equal(created.status, 201);
  const beforeReplay = reopened.snapshot();
  const replay = await create(runtime, requestBody, "builder-atomic-replay");
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(replay.body.item, created.body.item);
  assert.deepEqual(replay.body.audit_event, created.body.audit_event);
  assert.deepEqual(replay.body.timeline_event, created.body.timeline_event);
  assert.deepEqual(reopened.snapshot(), beforeReplay);
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "MatterBuilderDraft" }).length, 1);
  assert.equal(reopened.listAudit({ tenant_id: TENANT, object_id: "builder_draft_atomic_restart" }).length, 1);
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: requestBody.idempotency_key }).actor_id, outm32Context().principal.user_id);
});
