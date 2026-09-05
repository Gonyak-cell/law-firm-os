import assert from "node:assert/strict";
import test from "node:test";
import {
  assertJsonPostgresOutlookAuthorityBootstrapEvent,
  createJsonPostgresOutlookAuthorityOperationBinding,
} from "../src/json-postgres-program-inputs.js";
import {
  authorization,
  databaseTargetReceipt,
  databaseTargetReceiptSha256,
  environment,
  legacyAuthorization,
  operationEvent,
  refreshAuthorizationPacketSha256,
} from "./json-postgres-outlook-authority-fixtures.js";

test("Outlook CUT-009 binding preserves signed packet identity and canonical tenants", () => {
  const event = operationEvent();
  const firstAuthorization = authorization();
  const first = createJsonPostgresOutlookAuthorityOperationBinding({
    event,
    authorization: firstAuthorization,
    env: environment(),
  });
  const reorderedAuthorization = authorization(["tenant_a", "tenant_z"]);
  const reorderedEvent = operationEvent({
    packet_sha256: reorderedAuthorization.packet.packet_sha256,
  });
  const reordered = createJsonPostgresOutlookAuthorityOperationBinding({
    event: reorderedEvent,
    authorization: reorderedAuthorization,
    env: environment(),
  });
  assert.deepEqual(first.approved_tenant_ids, ["tenant_a", "tenant_z"]);
  assert.deepEqual(reordered.approved_tenant_ids, first.approved_tenant_ids);
  assert.notEqual(
    reorderedAuthorization.packet.packet_sha256,
    firstAuthorization.packet.packet_sha256,
  );
  assert.notEqual(reordered.operation_binding_sha256, first.operation_binding_sha256);
  assert.equal(
    first.operation_binding_sha256,
    "2d64591eab0cce22f6e8fe97c3f2c6ef163aff09d78ef6bb20e544411a611238",
  );
  assert.throws(
    () => createJsonPostgresOutlookAuthorityOperationBinding({
      event,
      authorization: reorderedAuthorization,
      env: environment(),
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
  );
});

test("Outlook CUT-009 binding includes the owner-signed program-input KMS ref", () => {
  const event = operationEvent();
  const binding = createJsonPostgresOutlookAuthorityOperationBinding({
    event,
    authorization: authorization(),
    env: environment(),
  });
  assert.equal(binding.program_input_kms_key_ref, environment().LAWOS_PROGRAM_INPUT_KMS_KEY_ARN);
  assert.deepEqual(binding.program_input_kms_key, {
    partition: "aws",
    region: "ap-northeast-2",
    account: "770880870480",
    key_id: "00000000-0000-0000-0000-000000000000",
  });
  assert.match(binding.operation_binding_sha256, /^[0-9a-f]{64}$/u);
});

test("Outlook CUT-009 binding includes the closed signed database target", () => {
  const approved = authorization();
  const binding = createJsonPostgresOutlookAuthorityOperationBinding({
    event: operationEvent(),
    authorization: approved,
    env: environment(),
  });

  assert.equal(
    binding.database_target_receipt_sha256,
    databaseTargetReceiptSha256(approved.packet.target.database_target_receipt),
  );
  assert.deepEqual(
    binding.database_target_receipt,
    approved.packet.target.database_target_receipt,
  );
  assert.equal(
    binding.database_target_receipt.endpoint_host,
    "lawos-production-postgres.fixture123.ap-northeast-2.rds.amazonaws.com",
  );
});

test("Outlook CUT-009 target receipt changes the signed operation digest", () => {
  const firstAuthorization = authorization();
  const first = createJsonPostgresOutlookAuthorityOperationBinding({
    event: operationEvent(),
    authorization: firstAuthorization,
    env: environment(),
  });
  const changedAuthorization = authorization();
  const receipt = databaseTargetReceipt({
    endpoint_host:
      "lawos-production-postgres.changed123.ap-northeast-2.rds.amazonaws.com",
  });
  changedAuthorization.packet.target.database_target_receipt = receipt;
  changedAuthorization.packet.target.database_target_receipt_sha256 =
    databaseTargetReceiptSha256(receipt);
  refreshAuthorizationPacketSha256(changedAuthorization);
  const changed = createJsonPostgresOutlookAuthorityOperationBinding({
    event: operationEvent({
      packet_sha256: changedAuthorization.packet.packet_sha256,
    }),
    authorization: changedAuthorization,
    env: environment(),
  });

  assert.notEqual(changed.operation_binding_sha256, first.operation_binding_sha256);
  assert.equal(changed.database_target_receipt.endpoint_host, receipt.endpoint_host);
});

test("Outlook CUT-009 rejects target receipt closure, digest and signing-time drift", () => {
  const cases = [
    (approved) => {
      approved.packet.target.database_target_receipt.extra = true;
      approved.packet.target.database_target_receipt_sha256 =
        databaseTargetReceiptSha256(
          approved.packet.target.database_target_receipt,
        );
      refreshAuthorizationPacketSha256(approved);
    },
    (approved) => {
      approved.packet.target.database_target_receipt_sha256 = "0".repeat(64);
      refreshAuthorizationPacketSha256(approved);
    },
    (approved) => {
      approved.approval.signed_at = "2026-08-17T00:15:00.001Z";
    },
    (approved) => {
      approved.approval.signed_at = "2026-08-17T00:15:00.000Z";
    },
  ];
  for (const mutate of cases) {
    const approved = authorization();
    mutate(approved);
    assert.throws(
      () => createJsonPostgresOutlookAuthorityOperationBinding({
        event: operationEvent({
          packet_sha256: approved.packet.packet_sha256,
        }),
        authorization: approved,
        env: environment(),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
    );
  }
});

test("Outlook V6 operation digest remains stable for historical replay", () => {
  const approved = legacyAuthorization();
  const binding = createJsonPostgresOutlookAuthorityOperationBinding({
    event: operationEvent({ packet_sha256: approved.packet.packet_sha256 }),
    authorization: approved,
    env: environment(),
  });

  assert.equal(
    binding.schema_version,
    "law-firm-os.json-postgres-outlook-authority-operation-binding.v2",
  );
  assert.equal(
    binding.operation_binding_sha256,
    "c23d4ca53887ba0529abe2e66aecf1590205b0e054342860477fc546b0987e53",
  );
});

test("reviewed continuation binds the historical bootstrap separately from the fresh target and preserves expiry checks", () => {
  const bind = (approved) => createJsonPostgresOutlookAuthorityOperationBinding({
    event: operationEvent({ packet_sha256: approved.packet.packet_sha256 }),
    authorization: approved, env: environment(),
  });
  const approved = authorization();
  approved.packet.bindings.migration_catalog_sha256 =
    "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
  approved.packet.target.historical_outlook_bootstrap_sha256 = "b".repeat(64);
  refreshAuthorizationPacketSha256(approved);
  const first = bind(approved);
  assert.equal(first.schema_version, "law-firm-os.json-postgres-outlook-authority-operation-binding.v4");
  assert.equal(first.historical_outlook_bootstrap_sha256, "b".repeat(64));
  assert.equal(first.database_target_receipt_sha256, approved.packet.target.database_target_receipt_sha256);
  for (const mutate of [
    (value) => { value.packet.target.historical_outlook_bootstrap_sha256 = "c".repeat(64); },
    (value) => {
      value.packet.target.database_target_receipt.observed_at = "2026-08-17T00:01:00.000Z";
      value.packet.target.database_target_receipt_sha256 = databaseTargetReceiptSha256(value.packet.target.database_target_receipt);
    },
  ]) {
    const changed = structuredClone(approved);
    mutate(changed);
    refreshAuthorizationPacketSha256(changed);
    assert.notEqual(bind(changed).operation_binding_sha256, first.operation_binding_sha256);
  }
  for (const mutate of [
    (value) => { value.packet.target.historical_outlook_bootstrap_sha256 = null; },
    (value) => { value.packet.bindings.migration_catalog_sha256 = "e".repeat(64); },
    (value) => {
      delete value.packet.target.database_target_receipt;
      delete value.packet.target.database_target_receipt_sha256;
    },
    (value) => { value.approval.signed_at = "2026-08-17T00:15:00.000Z"; },
  ]) {
    const changed = structuredClone(approved);
    mutate(changed);
    refreshAuthorizationPacketSha256(changed);
    assert.throws(() => bind(changed), { code: "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING" });
  }
});

for (const [label, kmsRef] of [
  ["opaque ref", "alias/lawos-prod-program-input"],
  ["alias ARN", "arn:aws:kms:ap-northeast-2:770880870480:alias/lawos"],
  ["cross-region ARN", "arn:aws:kms:us-east-1:770880870480:key/00000000-0000-0000-0000-000000000000"],
  ["cross-account ARN", "arn:aws:kms:ap-northeast-2:111111111111:key/00000000-0000-0000-0000-000000000000"],
  ["cross-partition ARN", "arn:aws-cn:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000"],
]) {
  test(`Outlook CUT-009 binding rejects ${label} as its KMS identity`, () => {
    const approved = authorization();
    approved.packet.target.program_input_kms_key_ref = kmsRef;
    assert.throws(
      () => createJsonPostgresOutlookAuthorityOperationBinding({
        event: operationEvent(),
        authorization: approved,
        env: environment(),
      }),
      (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
    );
  });
}

test("Outlook CUT-009 event boundary rejects every incomplete or extra tuple", () => {
  const event = operationEvent();
  assert.equal(assertJsonPostgresOutlookAuthorityBootstrapEvent(event), true);
  for (const changed of [
    { ...event, stage: undefined },
    { ...event, operation: "outlook-authority-bootstrap-001-006" },
    { ...event, mode: "preflight" },
    { ...event, unsupported: true },
  ]) {
    assert.throws(
      () => assertJsonPostgresOutlookAuthorityBootstrapEvent(changed),
      (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_OPERATION_BINDING",
    );
  }
});
