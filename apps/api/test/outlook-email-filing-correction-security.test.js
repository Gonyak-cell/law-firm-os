import assert from "node:assert/strict";
import test from "node:test";
import { createOriginalEmailFilingPlacement } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  CORRECTION_ACTOR_ID,
  MATTER_A,
  MATTER_B,
  TENANT_ID,
  originalFiling,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";
import {
  correctionApiRequest,
  correctionBody,
  currentCorrectionPath,
  matterSeed,
  startCorrectionApiFixture,
} from "./helpers/outlook-email-filing-correction-api-fixture.js";

test("OUTM-21 denies before Matter disclosure and rejects unsigned authority claims", async () => {
  const fixture = await startCorrectionApiFixture({ denyCorrection: true });
  try {
    const initial = createOriginalEmailFilingPlacement(originalFiling());
    const readable = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(readable.response.status, 200);
    assert.equal(readable.body.item.placement_id, initial.placement_id);
    const deniedReal = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      requestId: "req-outm21-denied-real",
      body: correctionBody(initial),
    });
    const deniedUnknown = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      requestId: "req-outm21-denied-unknown",
      body: correctionBody(initial, { target_matter_id: "matter-not-disclosed" }),
    });
    assert.equal(deniedReal.response.status, 403);
    assert.equal(deniedUnknown.response.status, 403);
    for (const denial of [deniedReal, deniedUnknown]) {
      assert.deepEqual(denial.body.safe_error_codes, [
        "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED",
      ]);
      assert.equal(denial.body.item, null);
      assert.equal(denial.body.count_leak_prevented, true);
      assert.equal(JSON.stringify(denial.body).includes(MATTER_B), false);
      assert.equal(JSON.stringify(denial.body).includes("matter-not-disclosed"), false);
    }

    const forged = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial, {
        tenant_id: "forged-tenant",
        actor_id: "forged-actor",
      }),
    });
    assert.equal(forged.response.status, 400);
    assert.deepEqual(forged.body.safe_error_codes, ["OUTLOOK_EMAIL_CORRECTION_INVALID"]);
    assert.equal(fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    }).length, 0);
  } finally {
    await fixture.close();
  }

  const targetOnly = await startCorrectionApiFixture({
    objectAcl: [{
      id: "outm21-deny-source-correction",
      effect: "deny",
      principal_id: CORRECTION_ACTOR_ID,
      resource_id: MATTER_A,
      action: "outlook:email:correct",
    }],
  });
  try {
    const denied = await correctionApiRequest(targetOnly, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(createOriginalEmailFilingPlacement(originalFiling())),
    });
    assert.equal(denied.response.status, 403);
    assert.deepEqual(denied.body.safe_error_codes, [
      "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED",
    ]);
    assert.equal(targetOnly.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    }).length, 0);
  } finally {
    await targetOnly.close();
  }
});

test("OUTM-21 identity conflicts and target-link failures leave no partial projection", async () => {
  const baseMatterRepository = createMatterRepository({ seedRecords: matterSeed() });
  let failTargetLink = true;
  let matterRepository;
  matterRepository = Object.freeze({
    ...baseMatterRepository,
    transaction(fn) {
      return baseMatterRepository.transaction(() => fn(matterRepository));
    },
    create(record) {
      if (failTargetLink && record.model_type === "EmailFilingPlacementReference") {
        failTargetLink = false;
        throw new Error("synthetic target-link failure");
      }
      return baseMatterRepository.create(record);
    },
  });
  const fixture = await startCorrectionApiFixture({ matterRepository });
  try {
    const initial = createOriginalEmailFilingPlacement(originalFiling());
    for (const overrides of [
      { email_thread_id: "thread-not-canonical" },
      { original_receipt_id: "receipt-not-canonical" },
      { document_id: "document-not-canonical" },
      { mime_sha256: "b".repeat(64) },
    ]) {
      const conflict = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
        method: "POST",
        body: correctionBody(initial, overrides),
      });
      assert.equal(conflict.response.status, 409);
      assert.deepEqual(conflict.body.safe_error_codes, [
        "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
      ]);
      assert.equal(conflict.body.item, null);
    }

    const failed = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial),
    });
    assert.equal(failed.response.status, 500);
    assert.deepEqual(failed.body.safe_error_codes, ["OUTLOOK_EMAIL_CORRECTION_FAILED"]);
    for (const modelType of [
      "EmailFilingPlacementEvent",
      "EmailFilingPlacementReference",
      "MatterTimelineEvent",
    ]) {
      assert.equal(baseMatterRepository.list({
        tenant_id: TENANT_ID,
        model_type: modelType,
      }).length, 0);
    }
    assert.equal(baseMatterRepository.listAudit({ tenant_id: TENANT_ID }).length, 0);
    assert.equal(baseMatterRepository.getIdempotency({
      tenant_id: TENANT_ID,
      idempotency_key: "outlook-email-correction:outm21-a-to-b",
    }), undefined);
  } finally {
    await fixture.close({ closeMatter: false });
    baseMatterRepository.close();
  }
});
