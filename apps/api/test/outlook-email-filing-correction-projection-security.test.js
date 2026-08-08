import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCUMENT_ID,
  FILE_OBJECT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  TENANT_ID,
  VERSION_ID,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";
import {
  correctionApiRequest,
  correctionBody,
  currentCorrectionPath,
  startCorrectionApiFixture,
} from "./helpers/outlook-email-filing-correction-api-fixture.js";

function recordRef(record) {
  return {
    tenant_id: record.tenant_id,
    model_type: record.model_type,
    resource_id: record.resource_id,
  };
}

async function assertProjectionDenied(fixture, label) {
  const result = await correctionApiRequest(fixture, currentCorrectionPath());
  assert.equal(result.response.status, 409, `${label}: ${JSON.stringify(result.body)}`);
  assert.deepEqual(result.body.safe_error_codes, [
    "EMAIL_FILING_CORRECTION_PROJECTION_CONFLICT",
  ]);
  assert.equal(result.body.item, null);
  assert.equal(JSON.stringify(result.body).includes(MATTER_A), false);
  assert.equal(JSON.stringify(result.body).includes(MATTER_B), false);
}

test("OUTM-21 readback fails safe for corrupt target reference and timeline linkage", async () => {
  const fixture = await startCorrectionApiFixture();
  try {
    const initial = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(initial.response.status, 200);
    const created = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item),
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));

    const reference = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementReference",
    })[0];
    const timelines = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "MatterTimelineEvent",
    }).filter((entry) => entry.correction_id === created.body.item.correction_id);
    const source = timelines.find((entry) => entry.matter_id === MATTER_A);
    const target = timelines.find((entry) => entry.matter_id === MATTER_B);
    assert.ok(reference && source && target);

    for (const scenario of [
      { label: "wrong target Matter", record: reference, patch: { target_matter_id: MATTER_A } },
      { label: "wrong source Matter", record: reference, patch: { source_matter_id: MATTER_B } },
      { label: "wrong document", record: reference, patch: { document_id: `${DOCUMENT_ID}:wrong` } },
      { label: "wrong version", record: reference, patch: { document_version_id: `${VERSION_ID}:wrong` } },
      { label: "wrong file", record: reference, patch: { file_object_id: `${FILE_OBJECT_ID}:wrong` } },
      { label: "wrong SHA", record: reference, patch: { mime_sha256: `b${MIME_SHA256.slice(1)}` } },
      { label: "inactive reference", record: reference, patch: { status: "superseded" } },
      { label: "wrong source timeline Matter", record: source, patch: { matter_id: MATTER_B } },
      { label: "wrong target timeline type", record: target, patch: { type: "outlook.email.filing.corrected_from" } },
    ]) {
      fixture.matterRepository.update(recordRef(scenario.record), scenario.patch);
      await assertProjectionDenied(fixture, scenario.label);
      fixture.matterRepository.upsert(scenario.record);
      const restored = await correctionApiRequest(fixture, currentCorrectionPath());
      assert.equal(restored.response.status, 200, scenario.label);
      assert.equal(restored.body.item.placement_id, created.body.item.placement_id);
    }

    const receiptKey = "outlook-email-correction:outm21-a-to-b";
    const receipt = fixture.matterRepository.getIdempotency({
      tenant_id: TENANT_ID,
      idempotency_key: receiptKey,
    });
    fixture.matterRepository.recordIdempotency({
      ...receipt,
      response: { ...receipt.response, audit_event_id: "audit:wrong" },
    });
    await assertProjectionDenied(fixture, "wrong audit/idempotency linkage");
    fixture.matterRepository.recordIdempotency(receipt);
    assert.equal((await correctionApiRequest(fixture, currentCorrectionPath())).response.status, 200);

    assert.equal(fixture.matterRepository.delete(recordRef(reference)), true);
    await assertProjectionDenied(fixture, "missing reference");
  } finally {
    await fixture.close();
  }
});
