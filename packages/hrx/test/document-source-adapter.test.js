import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHrxDocumentSourceVerified,
  createHrxDocumentSourceVerification,
  createInMemoryHrxDocumentSourceAdapter,
  mergeHrxDocumentSourceVerification,
} from "../src/documents/source-adapter.js";

test("HRX document source verification requires metadata-only verified source", () => {
  const verification = createHrxDocumentSourceVerification({
    tenant_id: "tenant-a",
    source_ref: "dms://doc-001",
    source_provider: "dms",
    source_status: "verified",
    source_verified_at: "2026-06-20T00:00:00.000Z",
    source_version_ref: "dms-version-001",
    source_metadata: { provider_document_id: "doc-001", etag_present: true, web_url_present: true },
  });

  assert.equal(assertHrxDocumentSourceVerified(verification), true);
  const merged = mergeHrxDocumentSourceVerification(
    { tenant_id: "tenant-a", source_ref: "dms://doc-001", document_id: "doc-001" },
    verification,
  );
  assert.equal(merged.source_status, "verified");
  assert.equal(merged.source_metadata.web_url_present, true);
});

test("HRX document source verification blocks body and secret metadata", () => {
  assert.throws(
    () =>
      createHrxDocumentSourceVerification({
        tenant_id: "tenant-a",
        source_ref: "dms://doc-001",
        source_status: "verified",
        source_verified_at: "2026-06-20T00:00:00.000Z",
        source_metadata: { body: "secret document body" },
      }),
    /must not include source_metadata.body/,
  );
  assert.throws(
    () =>
      createHrxDocumentSourceVerification({
        tenant_id: "tenant-a",
        source_ref: "dms://doc-001",
        access_token: "secret-token",
      }),
    /must not include source.access_token/,
  );
});

test("in-memory HRX document source adapter returns missing for unknown source refs", async () => {
  const adapter = createInMemoryHrxDocumentSourceAdapter([
    {
      tenant_id: "tenant-a",
      source_ref: "dms://doc-001",
      source_status: "verified",
      source_verified_at: "2026-06-20T00:00:00.000Z",
    },
  ]);

  const verified = await adapter.verify({ tenant_id: "tenant-a", source_ref: "dms://doc-001" });
  assert.equal(verified.source_status, "verified");
  const missing = await adapter.verify({ tenant_id: "tenant-a", source_ref: "dms://missing" });
  assert.equal(missing.source_status, "missing");
  assert.throws(() => assertHrxDocumentSourceVerified(missing), /not verified/);
});
