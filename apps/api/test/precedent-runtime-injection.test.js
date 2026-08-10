import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresPrecedentSearchRuntime } from "../src/postgres-api-runtime-authority.js";

const pool = { connect() {}, query() {} };

test("precedent runtime injection requires server-held authority and exposes only PostgreSQL authority", () => {
  assert.throws(() => createPostgresPrecedentSearchRuntime({ pool }), /server-held authority/u);
  const runtime = createPostgresPrecedentSearchRuntime({
    pool,
    authoritySecret: "runtime-injection-authority-secret-20260808",
  });
  assert.equal(runtime.authority, "postgres-v2");
  assert.equal(runtime.production_ready_claim, false);
  assert.equal(typeof runtime.repository.registerSource, "function");
  assert.equal(typeof runtime.repository.classifyDocumentPrivilege, "function");
  assert.equal(typeof runtime.repository.indexSource, "function");
  assert.equal(typeof runtime.repository.readiness, "function");
  assert.equal(typeof runtime.repository.search, "function");
  assert.equal(runtime.repository.issueExtractionReceipt, undefined);
});
