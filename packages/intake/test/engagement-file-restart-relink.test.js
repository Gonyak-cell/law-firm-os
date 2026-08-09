import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDmsRepository } from "../../dms/src/repository.js";
import { createFileStorageAdapter } from "../../dms/src/storage/file-storage-adapter.js";
import { approveEngagement } from "../src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant-engagement-file-restart";
const BYTES = Buffer.from("%PDF-1.4\nfile restart engagement\n%%EOF\n");
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-file-restart",
  tenant_id: TENANT,
  intake_request_id: "intake-file-restart",
  signed_document_id: "document-file-restart",
  signature_ref: "signature:document-file-restart",
  signed_document_upload: Object.freeze({
    signed_document_upload_id: "signed-upload-file-restart",
    document_id: "document-file-restart",
    bytes_base64: BYTES.toString("base64"),
    byte_size: BYTES.byteLength,
    mime_type: "application/pdf",
  }),
});

test("file restart relinks an already durable DMS receipt without another provider write", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-engagement-file-restart-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dmsPath = join(root, "dms.json");
  const intakePath = join(root, "intake.json");
  let providerWrites = 0;
  const openStorage = () => {
    const storage = createFileStorageAdapter({
      adapter_id: "engagement-file-restart-storage",
      rootPath: join(root, "objects"),
      quarantineRootPath: join(root, "quarantine"),
    });
    return Object.freeze({
      ...storage,
      putObject(input) { providerWrites += 1; return storage.putObject(input); },
    });
  };
  const firstDms = createDmsRepository({ filePath: dmsPath });
  const firstIntake = createIntakeRuntimeRepository({ filePath: intakePath });
  const request = {
    repository: Object.freeze({
      ...firstIntake,
      transaction() { throw new Error("forced post-DMS Intake failure"); },
    }),
    engagement: ENGAGEMENT,
    actor_id: "actor-engagement-file-restart",
    idempotency_key: "engagement-file-restart-key",
    dms_repository: firstDms,
    dms_storage: openStorage(),
  };
  await assert.rejects(approveEngagement(request), /forced post-DMS Intake failure/u);
  assert.equal(providerWrites, 1);
  assert.equal(firstDms.snapshot().idempotency.length, 1);
  assert.equal(firstIntake.snapshot().idempotency.length, 0);
  firstDms.close();
  firstIntake.close();

  const restartedDms = createDmsRepository({ filePath: dmsPath });
  const restartedIntake = createIntakeRuntimeRepository({ filePath: intakePath });
  const recovered = await approveEngagement({
    ...request,
    repository: restartedIntake,
    dms_repository: restartedDms,
    dms_storage: openStorage(),
  });
  assert.equal(recovered.idempotent_replay, false);
  assert.equal(providerWrites, 1);
  assert.equal(restartedDms.snapshot().idempotency.length, 1);
  assert.equal(restartedIntake.snapshot().idempotency.length, 1);
  assert.equal((await approveEngagement({
    ...request,
    repository: restartedIntake,
    dms_repository: restartedDms,
    dms_storage: openStorage(),
  })).idempotent_replay, true);
  assert.equal(providerWrites, 1);
  restartedDms.close();
  restartedIntake.close();
});
