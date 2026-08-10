import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../../../packages/dms/src/postgres-consumer-storage.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";

const TENANT = "tenant_postgres_dms_consumer_preflight";

function apiAuthorityInput(dmsStorage) {
  return {
    ledger: Object.freeze({
      transaction: async () => { throw new Error("unused"); },
      transactionMany: async () => { throw new Error("unused"); },
    }),
    dmsStorage,
    dmsUploadRuntime: Object.freeze({
      source_only: false,
      finalizeUpload: async () => { throw new Error("unused"); },
    }),
    payrollArtifactSecret: "postgres-dms-consumer-preflight-secret-material",
    bankImportPreviewTokens: Object.freeze({
      issue: () => { throw new Error("unused"); },
      verify: () => { throw new Error("unused"); },
    }),
    requireDmsConsumerReadAuthority: true,
  };
}

test("PostgreSQL API rejects raw S3 consumer reads until the durable authority probe succeeds", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const rawS3Storage = Object.freeze({
    ...createLocalStorageAdapter({ adapter_id: "postgres-dms-preflight-s3-shape" }),
    provider: "s3",
  });

  assert.throws(
    () => createPostgresApiRuntimeAuthority(apiAuthorityInput(rawS3Storage)),
    /requires guarded DMS consumer reads/u,
  );

  const consumerReadAuthority = createPostgresDmsConsumerReadAuthority({
    pool: fixture.appPool,
  });
  const guardedStorage = createPostgresDmsConsumerStorage({
    storage: rawS3Storage,
    authority: consumerReadAuthority,
  });
  assert.throws(
    () => createPostgresApiRuntimeAuthority(apiAuthorityInput(guardedStorage)),
    /requires guarded DMS consumer reads/u,
  );

  const probe = await consumerReadAuthority.probe({
    tenant_id: TENANT,
    adapter_id: rawS3Storage.adapter_id,
  });
  assert.equal(probe.probe_completed, true);
  const apiAuthority = createPostgresApiRuntimeAuthority(
    apiAuthorityInput(guardedStorage),
  );
  assert.equal(apiAuthority.capabilities.authority, "postgres-v2");

  await fixture.adminPool.query(
    "ALTER TABLE lawos_dms.upload_sessions NO FORCE ROW LEVEL SECURITY",
  );
  const driftedAuthority = createPostgresDmsConsumerReadAuthority({
    pool: fixture.appPool,
  });
  await assert.rejects(
    driftedAuthority.probe({
      tenant_id: TENANT,
      adapter_id: rawS3Storage.adapter_id,
    }),
    (error) => error?.safe_error_code
      === "DMS_CONSUMER_READ_AUTHORITY_UNAVAILABLE",
  );
  assert.equal(driftedAuthority.validate().probe_completed, false);
});
