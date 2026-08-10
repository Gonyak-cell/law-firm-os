import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertOutlookOperationEvidenceSafe } from "../src/outlook-operation-response.js";
import {
  CORRECTION_ACTOR_ID,
  MATTER_A,
  MATTER_B,
  RECEIPT_ID,
  THREAD_ID,
  DOCUMENT_ID,
  MIME_SHA256,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";
import {
  correctionApiRequest,
  correctionBody,
  currentCorrectionPath,
  startCorrectionApiFixture,
} from "./helpers/outlook-email-filing-correction-api-fixture.js";

const CORRECTION_PATH = "/api/outlook/email/corrections";
const BINDING_FIELDS = [
  "email_thread_id",
  "original_receipt_id",
  "document_id",
  "mime_sha256",
  "source_matter_id",
  "target_matter_id",
  "expected_placement_id",
  "reason_sha256",
  "idempotency_key",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeBinding(response, expected) {
  assert.deepEqual(Object.keys(response.body.request_binding), BINDING_FIELDS);
  assert.deepEqual(response.body.request_binding, expected);
  assert.equal(Object.hasOwn(response.body.request_binding, "actor_id"), false);
  assert.equal(Object.hasOwn(response.body.request_binding, "tenant_id"), false);
  assert.equal(JSON.stringify(response.body.request_binding).includes(CORRECTION_ACTOR_ID), false);
  assert.equal(JSON.stringify(response.body.request_binding).includes("storage"), false);
  assert.equal(JSON.stringify(response.body.request_binding).includes("bytes"), false);
  assert.equal(JSON.stringify(response.body.request_binding).includes("첫 정정"), false);
  assertOutlookOperationEvidenceSafe({ status: response.response.status, body: response.body });
}

test("Outlook correction created/replay responses expose only the persisted safe request binding", async () => {
  const fixture = await startCorrectionApiFixture();
  try {
    const initial = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(initial.response.status, 200);
    assert.equal(Object.hasOwn(initial.body, "request_binding"), false);

    const firstReason = " 첫 정정 ";
    const first = await correctionApiRequest(fixture, CORRECTION_PATH, {
      method: "POST",
      body: correctionBody(initial.body.item, {
        actor_id: "forged-body-actor",
        reason: firstReason,
        idempotency_key: "outm22-a-to-b",
      }),
    });
    assert.equal(first.response.status, 201, JSON.stringify(first.body));
    assert.equal(JSON.stringify(first.body).includes("forged-body-actor"), false);
    const firstBinding = {
      email_thread_id: THREAD_ID,
      original_receipt_id: RECEIPT_ID,
      document_id: DOCUMENT_ID,
      mime_sha256: MIME_SHA256,
      source_matter_id: MATTER_A,
      target_matter_id: MATTER_B,
      expected_placement_id: initial.body.item.placement_id,
      reason_sha256: sha256(firstReason.trim()),
      idempotency_key: "outm22-a-to-b",
    };
    assertSafeBinding(first, firstBinding);

    const replay = await correctionApiRequest(fixture, CORRECTION_PATH, {
      method: "POST",
      body: correctionBody(initial.body.item, {
        reason: firstReason,
        idempotency_key: "outm22-a-to-b",
      }),
    });
    assert.equal(replay.response.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "idempotent_replay");
    assertSafeBinding(replay, firstBinding);
    assert.deepEqual(replay.body.request_binding, first.body.request_binding);

    const secondReason = "두 번째 정정";
    const second = await correctionApiRequest(fixture, CORRECTION_PATH, {
      method: "POST",
      body: correctionBody(first.body.item, {
        source_matter_id: MATTER_B,
        target_matter_id: MATTER_A,
        reason: secondReason,
        idempotency_key: "outm22-b-to-a",
      }),
    });
    assert.equal(second.response.status, 201, JSON.stringify(second.body));
    const secondBinding = second.body.request_binding;
    assert.notEqual(secondBinding.expected_placement_id, first.body.request_binding.expected_placement_id);
    assert.notEqual(secondBinding.reason_sha256, first.body.request_binding.reason_sha256);
    assert.notEqual(secondBinding.idempotency_key, first.body.request_binding.idempotency_key);
    assert.equal(secondBinding.expected_placement_id, first.body.item.placement_id);
    assert.equal(secondBinding.reason_sha256, sha256(secondReason));
    assertSafeBinding(second, {
      email_thread_id: THREAD_ID,
      original_receipt_id: RECEIPT_ID,
      document_id: DOCUMENT_ID,
      mime_sha256: MIME_SHA256,
      source_matter_id: MATTER_B,
      target_matter_id: MATTER_A,
      expected_placement_id: first.body.item.placement_id,
      reason_sha256: sha256(secondReason),
      idempotency_key: "outm22-b-to-a",
    });

    const changedReason = await correctionApiRequest(fixture, CORRECTION_PATH, {
      method: "POST",
      body: correctionBody(initial.body.item, {
        reason: "다른 정정 이유",
        idempotency_key: "outm22-a-to-b",
      }),
    });
    assert.equal(changedReason.response.status, 409);
    assert.equal(Object.hasOwn(changedReason.body, "request_binding"), false);
  } finally {
    await fixture.close();
  }
});
