import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDmsRepository } from "../../dms/src/repository.js";
import { createFileStorageAdapter } from "../../dms/src/storage/file-storage-adapter.js";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { inspectEngagementLegacyIdempotencyEntries } from "../src/engagement-legacy-idempotency-readiness.js";
import { prepareEngagementApproval } from "../src/engagement-approval-command.js";
import { engagementApprovalReplay } from "../src/engagement-approval-persistence.js";
import { approveEngagement } from "../src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant-engagement-legacy-manual-review";
const OTHER_TENANT = "tenant-engagement-legacy-independent";
const ACTOR = "actor-engagement-legacy-manual-review";
const KEY = "engagement-legacy-manual-review-key";
const BYTES = Buffer.from("%PDF-1.4\nlegacy engagement authority\n%%EOF\n");

function engagement(tenantId = TENANT, suffix = "legacy") {
  return {
    engagement_id: `engagement-${suffix}`,
    tenant_id: tenantId,
    intake_request_id: `intake-${suffix}`,
    signed_document_id: `document-${suffix}`,
    signature_ref: `signature:document-${suffix}`,
    signed_document_upload: {
      signed_document_upload_id: `signed-upload-${suffix}`,
      document_id: `document-${suffix}`,
      bytes_base64: BYTES.toString("base64"),
      byte_size: BYTES.byteLength,
      mime_type: "application/pdf",
    },
  };
}

function errorCode(result) {
  return result.reason?.safe_error_code ?? null;
}

test("file restart blocks parent-era engagement authority for manual review before DMS work", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-engagement-legacy-review-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const intakePath = join(root, "intake.json");
  const dmsPath = join(root, "dms.json");
  const storageRoot = join(root, "objects");
  const quarantineRoot = join(root, "quarantine");
  let providerWrites = 0;
  const openStorage = () => {
    const storage = createFileStorageAdapter({
      adapter_id: "engagement-legacy-review-storage",
      rootPath: storageRoot,
      quarantineRootPath: quarantineRoot,
    });
    return Object.freeze({
      ...storage,
      putObject(input) {
        providerWrites += 1;
        return storage.putObject(input);
      },
    });
  };

  const seededIntake = createIntakeRuntimeRepository({ filePath: intakePath });
  const seededDms = createDmsRepository({ filePath: dmsPath });
  const first = await approveEngagement({
    repository: seededIntake,
    engagement: engagement(),
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: seededDms,
    dms_storage: openStorage(),
  });
  seededIntake.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: KEY,
    operation: "engagement_approve",
    response: {
      ...first,
      engagement: { ...first.engagement, parent_private_field: "ambiguous-parent-state" },
    },
    created_at: "2026-08-08T00:00:00.000Z",
  });
  seededIntake.close();
  seededDms.close();
  assert.equal(providerWrites, 1);

  const intake = createIntakeRuntimeRepository({ filePath: intakePath });
  const dms = createDmsRepository({ filePath: dmsPath });
  const beforeIntake = intake.snapshot();
  const beforeDms = dms.snapshot();
  const exact = () => approveEngagement({
    repository: intake,
    engagement: engagement(),
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: dms,
    dms_storage: openStorage(),
  });
  const concurrent = await Promise.allSettled([exact(), exact()]);
  assert.deepEqual(concurrent.map(({ status }) => status), ["rejected", "rejected"]);
  assert.deepEqual(concurrent.map(errorCode), [
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
    "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  ]);
  assert.deepEqual(concurrent.map(({ reason }) => [reason.status, reason.retryable]), [
    [409, false], [409, false],
  ]);
  await assert.rejects(approveEngagement({
    repository: intake,
    engagement: { ...engagement(), signature_ref: "signature:drifted" },
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: dms,
    dms_storage: openStorage(),
  }), ({ safe_error_code }) => (
    safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
  ));
  assert.equal(providerWrites, 1);
  assert.deepEqual(intake.snapshot(), beforeIntake);
  assert.deepEqual(dms.snapshot(), beforeDms);

  const independent = await approveEngagement({
    repository: intake,
    engagement: engagement(OTHER_TENANT, "other-tenant"),
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: dms,
    dms_storage: openStorage(),
  });
  assert.equal(independent.idempotent_replay, false);
  assert.equal(providerWrites, 2);
  await assert.rejects(approveEngagement({
    repository: intake,
    engagement: { ...engagement(OTHER_TENANT, "other-tenant"), signature_ref: "signature:drifted" },
    actor_id: ACTOR,
    idempotency_key: KEY,
    dms_repository: dms,
    dms_storage: openStorage(),
  }), ({ safe_error_code }) => safe_error_code === "IDEMPOTENCY_KEY_REUSED");
  assert.equal(providerWrites, 2);
  const independentPrepared = prepareEngagementApproval({
    engagement: engagement(OTHER_TENANT, "other-tenant"),
    actor_id: ACTOR,
    idempotency_key: KEY,
  });
  const complete = intake.getIdempotency({ tenant_id: OTHER_TENANT, idempotency_key: KEY });
  for (const patch of [
    { operation: "different_complete_operation" },
    { actor_id: "different-complete-actor" },
    { object_type: "DifferentCompleteObject" },
    { object_id: "different-complete-object-id" },
  ]) {
    assert.throws(() => engagementApprovalReplay({
      getIdempotency() { return { ...complete, ...patch }; },
    }, independentPrepared), ({ safe_error_code }) => safe_error_code === "IDEMPOTENCY_KEY_REUSED");
  }
  assert.throws(() => engagementApprovalReplay({
    getIdempotency() { return { ...complete, request_fingerprint: "b".repeat(64) }; },
  }, independentPrepared), ({ safe_error_code }) => (
    safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
  ));

  intake.recordIdempotency({
    ...complete,
    response: {
      ...complete.response,
      engagement: {
        ...complete.response.engagement,
        storage_pointer_ref: "s3://bound-replay-must-not-return",
      },
      signed_document_upload: {
        ...complete.response.signed_document_upload,
        raw_path: "/bound/replay/must-not-return",
        provider_authority_alias: "bound-replay-provider-alias",
      },
    },
  });
  const beforeSafeReplay = intake.snapshot();
  assert.throws(
    () => engagementApprovalReplay(intake, independentPrepared),
    ({ safe_error_code, message }) => (
      safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
      && !message.includes("bound-replay")
    ),
  );
  assert.deepEqual(intake.snapshot(), beforeSafeReplay);
  assert.equal(providerWrites, 2);

  intake.recordIdempotency({
    ...complete,
    response: {
      ...complete.response,
      engagement: {
        ...complete.response.engagement,
        matter_id: { raw_path: "/nested/known-field" },
      },
    },
  });
  const beforeInvalidReplay = intake.snapshot();
  assert.throws(
    () => engagementApprovalReplay(intake, independentPrepared),
    ({ safe_error_code }) => safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW",
  );
  assert.deepEqual(intake.snapshot(), beforeInvalidReplay);
  assert.equal(providerWrites, 2);
  intake.close();
  dms.close();
});

test("legacy inventory decode failures produce only a redacted fail-closed receipt", () => {
  const response = {};
  Object.defineProperty(response, "unsafe", {
    enumerable: true,
    get() { throw new Error("raw-legacy-response-secret"); },
  });
  const readiness = inspectEngagementLegacyIdempotencyEntries([{
    key: "raw-legacy-idempotency-key",
    request_hash: "a".repeat(64),
    response,
  }]);
  assert.deepEqual({
    ready: readiness.ready,
    unresolved: readiness.legacy_unresolved_count,
    malformed: readiness.malformed_authority_count,
  }, { ready: false, unresolved: 1, malformed: 1 });
  const serialized = JSON.stringify(readiness);
  assert.equal(serialized.includes("raw-legacy-response-secret"), false);
  assert.equal(serialized.includes("raw-legacy-idempotency-key"), false);
});

test("parent request-hash hint blocks a damaged engagement response before provider work", () => {
  const prepared = prepareEngagementApproval({
    engagement: engagement(), actor_id: ACTOR, idempotency_key: KEY,
  });
  assert.throws(() => engagementApprovalReplay({
    getIdempotency() {
      return {
        tenant_id: TENANT,
        idempotency_key: KEY,
        operation: `request-hash:${hashDomainValue({ operation: "engagement_approve", key: KEY })}`,
        response: null,
      };
    },
  }, prepared), ({ safe_error_code }) => (
    safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
  ));
});
