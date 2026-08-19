import assert from "node:assert/strict";
import test from "node:test";

import {
  executeProductionMigrationCatalogReadback,
} from "../src/production-migration-catalog-readback.js";
import { handler } from "../src/json-postgres-program-admin-lambda.js";
import {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_OPERATION,
  NOW,
  signedEvent,
} from "./production-migration-catalog-readback-fixtures.mjs";

function testExecutor() {
  return (input) => executeProductionMigrationCatalogReadback(input);
}

test("wrong action or operation rejects before any secret or database access", async () => {
  for (const mutate of [
    (event) => { event.action = "lawos-json-postgres-production-bootstrap"; },
    (event) => { event.operation = "catalog.query"; },
  ]) {
    const fixture = signedEvent();
    mutate(fixture.event);
    let secretReads = 0;
    let poolCreates = 0;
    await assert.rejects(
      testExecutor()({
        ...fixture,
        now: NOW,
        resolveSecret: async () => { secretReads += 1; },
        createPool: () => { poolCreates += 1; },
      }),
      (error) => error?.code === "LAWOS_CATALOG_READBACK_EVENT",
    );
    assert.equal(secretReads, 0);
    assert.equal(poolCreates, 0);
  }
});

test("wrong role, target, source, secret username, signature, and expiry fail closed", async (t) => {
  const scenarios = [
    ["execution role", (fixture) => { fixture.env.LAWOS_PROGRAM_EXECUTION_ROLE = "projection-writer"; }],
    ["account", (fixture) => { fixture.env.LAWOS_AWS_ACCOUNT_ID = "000000000000"; }],
    ["region", (fixture) => { fixture.env.AWS_REGION = "us-east-1"; }],
    ["function", (fixture) => { fixture.env.AWS_LAMBDA_FUNCTION_NAME = "lawos-production-admin"; }],
    ["source", (fixture) => {
      fixture.event.packet = {
        ...fixture.event.packet,
        source_sha: "f".repeat(40),
      };
    }],
    ["embedded deployment manifest", (fixture) => {
      fixture.deploymentManifest = {
        ...fixture.deploymentManifest,
        source_tree: "f".repeat(40),
      };
    }],
    ["signature", (fixture) => { fixture.event.authorization.approval_signature_base64 = Buffer.alloc(64).toString("base64"); }],
    ["expiry", (fixture) => { fixture.now = Date.parse("2026-08-16T06:00:00.000Z"); }],
  ];
  for (const [name, mutate] of scenarios) {
    await t.test(name, async () => {
      const fixture = signedEvent();
      fixture.now = NOW;
      mutate(fixture);
      let secretReads = 0;
      await assert.rejects(
        testExecutor()({
          ...fixture,
          now: fixture.now,
          resolveSecret: async () => { secretReads += 1; },
          createPool: () => { throw new Error("must not create pool"); },
        }),
      );
      assert.equal(secretReads, 0);
    });
  }
  await t.test("secret username", async () => {
    const fixture = signedEvent();
    let poolCreated = 0;
    await assert.rejects(
      testExecutor()({
        ...fixture,
        now: NOW,
        resolveSecret: async () => ({ username: "lawos_hrx_projection_writer", password: "private-password" }),
        createPool: () => { poolCreated += 1; },
      }),
      (error) => error?.code === "LAWOS_CATALOG_READBACK_SECRET_ROLE",
    );
    assert.equal(poolCreated, 0);
  });
});

test("the pool closes on read failure and raw database material is never serialized", async () => {
  const fixture = signedEvent();
  let ended = 0;
  await assert.rejects(
    testExecutor()({
      ...fixture,
      now: NOW,
      resolveSecret: async () => ({ username: "lawos_hrx_projection_auditor", password: "private-password" }),
      createPool: () => ({ end: async () => { ended += 1; } }),
      readCatalog: async () => {
        throw Object.assign(new Error("postgres://auditor:private-password@private-host/lawos jwsuh@amic.kr"), {
          code: "08006",
        });
      },
    }),
    (error) => {
      const serialized = JSON.stringify(error);
      assert.equal(error.message.includes("private-password"), false);
      assert.equal(error.message.includes("private-host"), false);
      assert.equal(error.message.includes("jwsuh@amic.kr"), false);
      assert.equal(serialized.includes("private-password"), false);
      assert.equal(serialized.includes("private-host"), false);
      assert.equal(serialized.includes("jwsuh@amic.kr"), false);
      return true;
    },
  );
  assert.equal(ended, 1);

  await assert.rejects(
    testExecutor()({
      ...fixture,
      now: NOW,
      resolveSecret: async () => ({
        username: "lawos_hrx_projection_auditor",
        password: "private-password",
      }),
      createPool: () => ({ end: async () => {} }),
      readCatalog: async () => {
        throw Object.assign(new Error("private-host jwsuh@amic.kr"), {
          code: "LAWOS_CATALOG_READBACK_FORGED_RAW_DETAIL",
        });
      },
    }),
    (error) => error?.code === "LAWOS_CATALOG_READBACK_DATABASE"
      && error.message
        === "production migration catalog readback failed at a protected boundary",
  );
});

test("main handler recognizes the closed action and returns a non-oracular block", async () => {
  const previous = process.env.LAWOS_PROGRAM_EXECUTION_ROLE;
  process.env.LAWOS_PROGRAM_EXECUTION_ROLE = "projection-auditor";
  try {
    const result = await handler({
      schema_version: "law-firm-os.production-migration-catalog-readback-event.v1",
      action: CATALOG_READBACK_ACTION,
      operation: CATALOG_READBACK_OPERATION,
      packet: {},
      authorization: {},
    });
    assert.deepEqual(Object.keys(result).sort(), [
      "action",
      "outcome",
      "pii_returned",
      "raw_value_returned",
      "safe_error_code",
      "secret_material_returned",
    ]);
    assert.equal(result.outcome, "BLOCKED");
    assert.equal(result.action, CATALOG_READBACK_ACTION);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["password", "secretId", "private-host", "@amic.kr", "SELECT ", "DELETE "]) {
      assert.equal(serialized.includes(forbidden), false);
    }
  } finally {
    if (previous === undefined) delete process.env.LAWOS_PROGRAM_EXECUTION_ROLE;
    else process.env.LAWOS_PROGRAM_EXECUTION_ROLE = previous;
  }
});
