import assert from "node:assert/strict";
import test from "node:test";
import { createPersistenceConfig, createPersistenceConfigFromEnv } from "../src/index.js";

test("Runtime Spine persistence config accepts synthetic-only URL", () => {
  const config = createPersistenceConfig({ url: "lawos-synthetic://runtime-spine?root=/tmp/lawos-rs1a" });
  assert.equal(config.adapter, "synthetic-file");
  assert.equal(config.synthetic_only, true);
  assert.equal(config.no_production_credentials, true);
  assert.equal(config.production_ready_claim, false);
});

test("Runtime Spine persistence config rejects production URL and inline credentials", () => {
  assert.throws(() => createPersistenceConfig({ url: "postgres://example.test/lawos" }), /Only lawos-synthetic/);
  assert.throws(() => createPersistenceConfig({ url: "lawos-synthetic://runtime-spine", token: "secret" }), /inline credentials/);
  assert.throws(
    () => createPersistenceConfig({ url: "lawos-synthetic://runtime-spine", environment: "production" }),
    /does not allow production/,
  );
});

test("Runtime Spine persistence config can be derived from local env without secrets", () => {
  const config = createPersistenceConfigFromEnv({
    LAWOS_PERSISTENCE_URL: "lawos-synthetic://runtime-spine?root=",
    LAWOS_PERSISTENCE_ENV: "test"
  });
  assert.equal(config.schema_version, "law-firm-os.persistence-config.v0.1");
});
