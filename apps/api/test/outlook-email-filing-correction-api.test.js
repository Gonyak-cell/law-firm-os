import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createOriginalEmailFilingPlacement } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import {
  CORRECTION_ACTOR_ID,
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  RECEIPT_ID,
  TENANT_ID,
  THREAD_ID,
  originalFiling,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";
import {
  correctionApiRequest,
  correctionBody,
  currentCorrectionPath,
  startCorrectionApiFixture,
} from "./helpers/outlook-email-filing-correction-api-fixture.js";

test("OUTM-21 correction API commits one append-only correction and both Matter projections", async () => {
  const root = mkdtempSync(join(tmpdir(), "outm21-api-"));
  const matterFilePath = join(root, "matter.json");
  const fixture = await startCorrectionApiFixture({ matterFilePath });
  let created;
  try {
    const beforeDms = fixture.dmsRepository.snapshot();
    const initial = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(initial.response.status, 200);
    assert.deepEqual(initial.body.item, {
      placement_id: createOriginalEmailFilingPlacement(originalFiling()).placement_id,
      correction_id: createOriginalEmailFilingPlacement(originalFiling()).correction_id,
      event_kind: "original",
      email_thread_id: THREAD_ID,
      original_receipt_id: RECEIPT_ID,
      matter_id: MATTER_A,
      document_id: DOCUMENT_ID,
      mime_sha256: MIME_SHA256,
      occurred_at: originalFiling().occurred_at,
      status: "original",
      copied_mime: false,
    });

    created = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, {
        tenant_id: undefined,
        actor_id: "forged-body-actor",
      }),
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.matter_id, MATTER_B);
    assert.equal(created.body.item.document_id, DOCUMENT_ID);
    assert.equal(created.body.item.mime_sha256, MIME_SHA256);
    assert.equal(created.body.item.copied_mime, false);
    assert.equal(created.body.timeline_events.length, 2);

    const replay = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item),
    });
    assert.equal(replay.response.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.item.placement_id, created.body.item.placement_id);

    const changedFingerprint = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, { reason: "다른 이유" }),
    });
    assert.equal(changedFingerprint.response.status, 409);
    assert.deepEqual(changedFingerprint.body.safe_error_codes, [
      "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
    ]);

    const stale = await correctionApiRequest(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, { idempotency_key: "outm21-stale" }),
    });
    assert.equal(stale.response.status, 409);
    assert.deepEqual(stale.body.safe_error_codes, [
      "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
    ]);

    const current = await correctionApiRequest(fixture, currentCorrectionPath());
    assert.equal(current.response.status, 200);
    assert.equal(current.body.item.placement_id, created.body.item.placement_id);
    assert.equal(current.body.item.matter_id, MATTER_B);

    const placements = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    });
    assert.equal(placements.filter((entry) => entry.event_kind === "original").length, 1);
    assert.equal(placements.filter((entry) => entry.event_kind === "correction").length, 1);
    const references = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementReference",
    });
    assert.equal(references.length, 1);
    assert.equal(references[0].matter_id, MATTER_B);
    assert.equal(references[0].document_id, DOCUMENT_ID);
    assert.equal(references[0].mime_sha256, MIME_SHA256);
    assert.equal(references[0].copied_mime, false);
    const timeline = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "MatterTimelineEvent",
    }).filter((entry) => entry.correction_id === created.body.item.correction_id);
    assert.deepEqual(timeline.map((entry) => entry.matter_id).sort(), [MATTER_A, MATTER_B].sort());
    assert.ok(timeline.every((entry) => entry.document_id === DOCUMENT_ID));
    assert.ok(timeline.every((entry) => entry.mime_sha256 === MIME_SHA256));
    const audits = fixture.matterRepository.listAudit({
      tenant_id: TENANT_ID,
      object_id: created.body.item.correction_id,
    });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].actor_id, CORRECTION_ACTOR_ID);
    const receipt = fixture.matterRepository.getIdempotency({
      tenant_id: TENANT_ID,
      idempotency_key: "outlook-email-correction:outm21-a-to-b",
    });
    assert.equal(receipt.response.placement_id, created.body.item.placement_id);
    assert.equal(receipt.response.timeline_event_ids.length, 2);
    assert.deepEqual(fixture.dmsRepository.snapshot(), beforeDms);
  } finally {
    await fixture.close();
  }

  const restarted = await startCorrectionApiFixture({
    matterFilePath,
    objectAcl: [{
      id: "outm21-deny-former-source-read",
      effect: "deny",
      principal_id: CORRECTION_ACTOR_ID,
      resource_id: MATTER_A,
      action: "outlook:matter:read",
    }],
  });
  try {
    const current = await correctionApiRequest(restarted, currentCorrectionPath());
    assert.equal(current.response.status, 200);
    assert.equal(current.body.item.placement_id, created.body.item.placement_id);
    assert.equal(current.body.item.matter_id, MATTER_B);
    assert.equal(JSON.stringify(current.body).includes(MATTER_A), false);
  } finally {
    await restarted.close();
  }
});
