import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createInMemoryHrxAiSourceChunkIndex,
  createSqlHrxAiSourceChunkIndex,
  ingestHrxAiSourceChunks,
} from "../src/ai/source-ingestion.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("HRX AI source ingestion indexes source_ref chunk_id and hash without storing text", () => {
  const chunks = ingestHrxAiSourceChunks({
    tenant_id: "tenant-a",
    source_ref: "Policy:leave:2026",
    chunks: [
      { chunk_id: "chunk-001", text: "Leave policy text for hashing only" },
      { chunk_id: "chunk-002", text: "Second chunk" },
    ],
  });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].source_ref, "Policy:leave:2026");
  assert.equal(chunks[0].chunk_id, "chunk-001");
  assert.equal(chunks[0].chunk_hash.length, 64);
  assert.deepEqual(chunks[0].indexed_by, ["source_ref", "chunk_id", "chunk_hash"]);
  assert.equal(JSON.stringify(chunks).includes("Leave policy text"), false);

  const index = createInMemoryHrxAiSourceChunkIndex(chunks);
  assert.equal(index.get({ tenant_id: "tenant-a", source_ref: "Policy:leave:2026", chunk_id: "chunk-001" }).chunk_hash, chunks[0].chunk_hash);
});

test("SQL HRX AI source chunk index persists metadata-only chunks", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-ai-source-")), "store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const index = createSqlHrxAiSourceChunkIndex({ store });
  const [chunk] = ingestHrxAiSourceChunks({
    tenant_id: "tenant-a",
    source_ref: "Policy:leave:2026",
    chunks: [{ chunk_id: "chunk-001", text: "Durable hash input" }],
  });
  index.index(chunk);
  store.close();

  const reopenedStore = createFileHrxStore({ filePath });
  const reopenedIndex = createSqlHrxAiSourceChunkIndex({ store: reopenedStore });
  assert.equal(
    reopenedIndex.get({ tenant_id: "tenant-a", source_ref: "Policy:leave:2026", chunk_id: "chunk-001" }).chunk_hash,
    chunk.chunk_hash,
  );
  reopenedStore.close();
});
