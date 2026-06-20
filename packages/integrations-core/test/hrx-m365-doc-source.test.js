import assert from "node:assert/strict";
import test from "node:test";
import { createHrxM365DocumentSourceAdapter } from "../src/hrx-m365-doc-source.js";

test("HRX M365/DMS source adapter verifies metadata without returning body or secrets", async () => {
  const adapter = createHrxM365DocumentSourceAdapter({
    sources: [
      {
        tenant_id: "tenant-a",
        source_ref: "m365://drive/items/doc-001",
        provider_document_id: "doc-001",
        source_version_ref: "m365-version-001",
        source_verified_at: "2026-06-20T00:00:00.000Z",
        etag_present: true,
        web_url_present: true,
      },
    ],
  });

  const verification = await adapter.verify({ tenant_id: "tenant-a", source_ref: "m365://drive/items/doc-001" });
  assert.equal(verification.source_status, "verified");
  assert.equal(verification.source_provider, "m365");
  assert.equal(verification.source_version_ref, "m365-version-001");
  assert.equal(verification.source_metadata.provider_document_id, "doc-001");
  assert.equal(JSON.stringify(verification).includes("secret"), false);
  assert.equal(Object.hasOwn(verification, "body"), false);
});

test("HRX M365/DMS source adapter rejects source seeds with body or token material", () => {
  assert.throws(
    () =>
      createHrxM365DocumentSourceAdapter({
        sources: [{ tenant_id: "tenant-a", source_ref: "dms://doc-001", body: "raw" }],
      }),
    /must not include source.body/,
  );
  assert.throws(
    () =>
      createHrxM365DocumentSourceAdapter({
        sources: [{ tenant_id: "tenant-a", source_ref: "m365://drive/items/doc-001", access_token: "token" }],
      }),
    /must not include source.access_token/,
  );
});

test("HRX M365/DMS source adapter returns blocked for unsupported providers", async () => {
  const adapter = createHrxM365DocumentSourceAdapter();
  const verification = await adapter.verify({ tenant_id: "tenant-a", source_ref: "unknown://doc-001" });
  assert.equal(verification.source_status, "blocked");
  assert.equal(verification.source_provider, "unknown");
});
