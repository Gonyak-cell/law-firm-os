import assert from "node:assert/strict";
import test from "node:test";

import { hashDomainValue } from "../../packages/persistence/src/domain-ledger.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
} from "../../apps/api/src/client-operations-schema.js";
import {
  executeProductionCatalogReadbackBracket,
  validateProductionCatalogReadbackPreflight,
} from "../lib/production-catalog-readback-operator.mjs";
import {
  C0,
  C1,
  F0,
  F1,
  FCFG,
  H,
  SOURCE_MIGRATION_CATALOG,
  approval,
  executionInput,
  liveCatalog,
  operatorPorts,
  packet,
  preflightInput,
  privateBytes,
  readTask2InventoryEvidence,
  sourceEnvelopeVerification,
  state,
  successfulAws,
} from "./production-catalog-readback-fixtures.mjs";

test("preflight binds the validated Task 2 inventory locator before any provider action", async () => {
  const created = packet();
  const result = await validateProductionCatalogReadbackPreflight(
    preflightInput(created),
    {
      readPrivateArtifact: async (descriptor) => privateBytes(descriptor),
      readInventoryEvidence: async () => readTask2InventoryEvidence(),
      now: () => Date.parse("2026-08-16T04:00:00.000Z"),
      verifyApproval: async () => approval(created),
      verifySourceEnvelope: async () => sourceEnvelopeVerification(created),
      verifyRollbackManifest: async () => ({ valid: true }),
    },
  );

  assert.equal(result.provider_action_count, 0);
  assert.equal(result.validate_locator.path, preflightInput(created).task2Inventory.path);
  assert.equal(result.validate_locator.bytes > 0, true);
  assert.match(result.validate_locator.sha256, /^[a-f0-9]{64}$/u);
});

test("operator authorization binds the full catalog and rejects self-consistent subset or metadata drift before AWS", async () => {
  const complete = packet();
  assert.equal(
    complete.packet.source_catalog.migration_count,
    SOURCE_MIGRATION_CATALOG.migration_catalog_count,
  );
  assert.equal(
    complete.packet.source_catalog.catalog_sha256,
    SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
  );
  assert.notEqual(
    SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
    SOURCE_MIGRATION_CATALOG.ledger_sha256,
  );
  const ledgerSubset = SOURCE_MIGRATION_CATALOG.ledger_entries.slice(0, -1);
  const driftedCatalog = structuredClone(
    CLIENT_OPERATIONS_MIGRATION_CATALOG,
  );
  driftedCatalog.migrations.at(-1).source_migration_id =
    "007_outlook_desktop_assignment_drifted";
  for (const sourceCatalog of [
    {
      migration_count: ledgerSubset.length,
      catalog_sha256: hashDomainValue(ledgerSubset),
    },
    {
      migration_count: driftedCatalog.migration_count,
      catalog_sha256: hashDomainValue(driftedCatalog),
    },
  ]) {
    const created = packet({ sourceCatalog });
    const aws = successfulAws();
    await assert.rejects(
      executeProductionCatalogReadbackBracket(
        executionInput(created),
        operatorPorts(aws, created),
      ),
      (error) => error?.code
        === "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
    );
    assert.deepEqual(aws.calls, []);
  }
});

test("execution authorization and invoke event are reverified before AWS", async () => {
  const created = packet();
  const aws = successfulAws();
  const invalidEventInput = executionInput(created);
  invalidEventInput.event = {
    ...invalidEventInput.event,
    sql: "DELETE FROM lawos_meta.schema_migrations",
  };
  await assert.rejects(
    executeProductionCatalogReadbackBracket(
      invalidEventInput,
      operatorPorts(aws, created),
    ),
    (error) => error?.code === "TASK3_INVOKE_EVENT_INVALID",
  );
  assert.deepEqual(aws.calls, []);
  await assert.rejects(
    executeProductionCatalogReadbackBracket(
      executionInput(created),
      { aws, verifyExecutionAuthorization: () => ({ valid: false }) },
    ),
    (error) => String(error?.code ?? "").startsWith(
      "LAWOS_CATALOG_READBACK_LINEAGE_",
    ),
  );
  assert.deepEqual(aws.calls, []);
  await assert.rejects(
    executeProductionCatalogReadbackBracket(
      { ...executionInput(created), sql: "DELETE FROM lawos_meta.schema_migrations" },
      operatorPorts(aws),
    ),
    (error) => error?.code === "TASK3_EXECUTION_INPUT_INVALID",
  );
  assert.deepEqual(aws.calls, []);
});

test("the happy bracket performs exactly two code CAS updates and one invoke", async () => {
  const created = packet();
  const aws = successfulAws();
  const result = await executeProductionCatalogReadbackBracket(
    executionInput(created),
    operatorPorts(aws),
  );
  assert.equal(result.outcome, "PASS");
  assert.equal(result.rollback_verified, true);
  assert.deepEqual(result.operation_counts, {
    update_function_code: 2,
    invoke_function: 1,
    get_function_state: 3,
    diagnostic_recovery_reads: 0,
    rollback_recovery_reads: 0,
    wait_for_function_active: 2,
    update_function_configuration: 0,
    iam_writes: 0,
    secret_writes: 0,
    vpc_writes: 0,
    concurrency_writes: 0,
    database_writes: 0,
  });
  assert.deepEqual(result.transitions, {
    revisions: ["R0", "R1", "R2"],
    code_sha256_base64: [C0, C1, C0],
    configuration_fingerprint_sha256: [F0, F1, F0],
    non_code_configuration_fingerprint_sha256: [FCFG, FCFG, FCFG],
  });
  assert.deepEqual(aws.calls, [
    "identity", "read",
    `update:R0:${C1}`, "wait", "read", "invoke",
    `update:R1:${C0}`, "wait", "read",
  ]);
  assert.equal(aws.calls.includes("CONFIGURATION_WRITE_FORBIDDEN"), false);
});

test("preflight drift rejects before the first code update", async (t) => {
  const mutations = [
    ["confirmation", (input) => { input.confirmation = "wrong"; }],
    ["artifact bytes", (input) => { input.diagnosticZip = Buffer.alloc(15); }],
    ["rollback bytes", (input) => { input.rollbackZip = Buffer.alloc(31); }],
    ["packet hash", (input) => { input.authorization.packet_sha256 = H("wrong"); }],
    ["source catalog", (input) => {
      input.authorization.packet.source_catalog.catalog_sha256 = H("forged-source");
    }],
  ];
  for (const [name, mutate] of mutations) {
    await t.test(name, async () => {
      const created = packet();
      const aws = successfulAws();
      const input = {
        ...executionInput(created),
        authorization: {
          packet: structuredClone(created.packet),
          packet_sha256: created.packet_sha256,
        },
      };
      mutate(input);
      await assert.rejects(
        executeProductionCatalogReadbackBracket(input, operatorPorts(aws)),
      );
      assert.equal(aws.calls.some((call) => call.startsWith("update:")), false);
      assert.equal(aws.calls.includes("invoke"), false);
    });
  }
});

test("caller identity and every signed pre-state binding reject before code update", async (t) => {
  await t.test("caller identity", async () => {
    const created = packet();
    const aws = successfulAws();
    aws.getCallerIdentity = async () => {
      aws.calls.push("identity");
      return { account_id: "000000000000", role: "matter-prod-deploy-admin" };
    };
    await assert.rejects(
      executeProductionCatalogReadbackBracket(
        executionInput(created),
        operatorPorts(aws),
      ),
      (error) => error?.code === "TASK3_AWS_IDENTITY_DRIFT",
    );
    assert.equal(aws.calls.some((call) => call.startsWith("update:")), false);
  });
  for (const [name, mutate] of [
    ["RevisionId", (value) => ({ ...value, revision_id: "R9" })],
    ["CodeSha256", (value) => ({
      ...value,
      code_sha256_base64: C1,
      configuration_fingerprint_sha256: F1,
    })],
    ["full fingerprint", (value) => ({
      ...value,
      configuration_fingerprint_sha256: H("forged-full"),
    })],
    ["non-code fingerprint", (value) => ({
      ...value,
      non_code_configuration_fingerprint_sha256: H("forged-non-code"),
    })],
    ["runtime surface", (value) => ({
      ...value,
      non_code_configuration: {
        ...value.non_code_configuration,
        runtime: "nodejs20.x",
      },
    })],
    ["Lambda state", (value) => ({ ...value, state: "Pending" })],
    ["update status", (value) => ({
      ...value,
      last_update_status: "Failed",
    })],
  ]) {
    await t.test(name, async () => {
      const created = packet();
      const aws = successfulAws();
      const original = aws.getFunctionState.bind(aws);
      let first = true;
      aws.getFunctionState = async () => {
        const observed = await original();
        if (!first) return observed;
        first = false;
        return mutate(observed);
      };
      await assert.rejects(
        executeProductionCatalogReadbackBracket(
          executionInput(created),
          operatorPorts(aws),
        ),
      );
      assert.equal(
        aws.calls.some((call) => call.startsWith("update:")),
        false,
      );
      assert.equal(aws.calls.includes("invoke"), false);
    });
  }
});
