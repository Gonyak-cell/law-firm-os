import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createImmutablePrecedentExtractionAuthority } from "../src/search/precedent-immutable-extractor.js";
import { derivePrecedentAuthorityKeys } from "../src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { DMS_STORAGE_OBJECT_TOO_LARGE, sha256Hex } from "../src/storage/storage-adapter.js";
import {
  ACTOR,
  SECRET,
  TENANT,
  commitDocument,
  extractor,
  repository,
  source,
} from "./precedent-test-helpers.js";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

test("extractor rejects an oversized authoritative descriptor before any object read", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "precedent-descriptor-limit" });
  const entry = source({ source_id: "source-descriptor-large", matter_id: "matter-descriptor-large",
    document_id: "document-descriptor-large", version_id: "version-descriptor-large",
    title: "oversized descriptor", body: "small provider object" });
  await commitDocument(fixture.appPool, base, { ...entry,
    descriptor_byte_size: MAX_SOURCE_BYTES + 1 });
  await repository(fixture.appPool).registerSource(entry);
  const calls = { bounded: 0, get: 0, digest: 0 };
  const storage = Object.freeze({ ...base,
    async readObjectBounded(input) { calls.bounded += 1; return base.readObjectBounded(input); },
    getObject(input) { calls.get += 1; return base.getObject(input); },
    digestObject(input) { calls.digest += 1; return base.digestObject(input); } });
  await assert.rejects(extractor(fixture.appPool, storage).extractSource({
    tenant_id: TENANT, source_id: entry.source_id, actor_id: ACTOR,
  }), (error) => error.safe_error_code === "PRECEDENT_EXTRACTOR_SOURCE_TOO_LARGE"
    && error.status === 413);
  assert.deepEqual(calls, { bounded: 0, get: 0, digest: 0 });
});

test("extractor maps provider overflow and never performs a second digest read", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "precedent-provider-limit" });
  const entry = source({ source_id: "source-provider-large", matter_id: "matter-provider-large",
    document_id: "document-provider-large", version_id: "version-provider-large",
    title: "provider overflow", body: "descriptor claims this is small" });
  await commitDocument(fixture.appPool, base, entry);
  await repository(fixture.appPool).registerSource(entry);
  const calls = { bounded: 0, get: 0, digest: 0 };
  const storage = Object.freeze({ ...base,
    async readObjectBounded() {
      calls.bounded += 1;
      throw Object.assign(new Error("provider overflow"), { code: DMS_STORAGE_OBJECT_TOO_LARGE });
    },
    getObject(input) { calls.get += 1; return base.getObject(input); },
    digestObject(input) { calls.digest += 1; return base.digestObject(input); } });
  await assert.rejects(extractor(fixture.appPool, storage).extractSource({
    tenant_id: TENANT, source_id: entry.source_id, actor_id: ACTOR,
  }), (error) => error.safe_error_code === "PRECEDENT_EXTRACTOR_SOURCE_TOO_LARGE");
  assert.deepEqual(calls, { bounded: 1, get: 0, digest: 0 });
});

test("extractor accepts an immutable object at the exact 20 MiB boundary", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-exact-limit" });
  const bytes = Buffer.alloc(MAX_SOURCE_BYTES, 0x61);
  const entry = { ...source({ source_id: "source-exact-limit", matter_id: "matter-exact-limit",
    document_id: "document-exact-limit", version_id: "version-exact-limit",
    title: "exact extraction limit" }), fixture_bytes: bytes, content_sha256: sha256Hex(bytes) };
  await commitDocument(fixture.appPool, storage, entry);
  await repository(fixture.appPool).registerSource(entry);
  const authority = createImmutablePrecedentExtractionAuthority({
    pool: fixture.appPool,
    storage,
    receiptSecret: derivePrecedentAuthorityKeys(SECRET).extraction_receipt,
    textExtractor({ bytes: observed }) {
      assert.equal(observed.byteLength, MAX_SOURCE_BYTES);
      return "exact boundary accepted";
    },
  });
  const extracted = await authority.extractSource({
    tenant_id: TENANT, source_id: entry.source_id, actor_id: ACTOR,
  });
  assert.equal(extracted.body_text, "exact boundary accepted");
  assert.equal(extracted.extraction_receipt.content_sha256, entry.content_sha256);
});
