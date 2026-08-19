import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_DATABASE_TARGET_INSTANCE,
  JSON_POSTGRES_DATABASE_TARGET_READ_PROFILE,
  JSON_POSTGRES_DATABASE_TARGET_REGION,
  createJsonPostgresExecutionPacketWithDatabaseTarget,
  produceJsonPostgresDatabaseTargetReceipt,
} from "../lib/json-postgres-database-target-receipt-producer.mjs";
const ACCOUNT = "770880870480";
const SECRET =
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:rds!db-8ef074eb-f9ec-4d3b-b191-994b4e161d3c-iq9bAl";
const KMS =
  "arn:aws:kms:ap-northeast-2:770880870480:key/75868150-c892-47fc-8bea-17caa1808127";
const START = Date.parse("2026-08-17T00:00:00.000Z");

function responses() {
  return [{
    Account: ACCOUNT,
    Arn: `arn:aws:sts::${ACCOUNT}:assumed-role/matter-readonly-auditor/readback`,
    UserId: "AROAFIXTURE:readback",
  }, {
    DBInstances: [{
      DBInstanceIdentifier: JSON_POSTGRES_DATABASE_TARGET_INSTANCE,
      DBInstanceArn:
        `arn:aws:rds:${JSON_POSTGRES_DATABASE_TARGET_REGION}:${ACCOUNT}:db:${JSON_POSTGRES_DATABASE_TARGET_INSTANCE}`,
      Endpoint: {
        Address:
          "lawos-production-postgres.ctawsgoy2p9y.ap-northeast-2.rds.amazonaws.com",
        Port: 5432,
        HostedZoneId: "not-receipt-authority",
      },
      DBName: "lawos",
      Engine: "postgres",
      EngineVersion: "16.13",
      DBInstanceStatus: "available",
      MasterUsername: "lawos_admin",
      MasterUserSecret: {
        SecretArn: SECRET,
        SecretStatus: "active",
        KmsKeyId: KMS,
      },
    }],
  }, {
    ARN: SECRET,
    Name: "rds!db-fixture",
    KmsKeyId: KMS,
    Description: "metadata only",
    ResponseMetadata: { RequestId: "not-receipt-authority" },
  }];
}

function harness(values = responses(), failureIndex = null) {
  const calls = [];
  const spawnSync = (binary, args, options) => {
    const index = calls.length;
    calls.push({ binary, args, options });
    if (index === failureIndex) {
      return { status: null, signal: "SIGKILL", stdout: "", stderr: "lost" };
    }
    return {
      status: 0,
      signal: null,
      stdout: JSON.stringify(values[index]),
      stderr: "",
    };
  };
  return { calls, spawnSync };
}

function clock(values = [START, START + 1_000]) {
  let index = 0;
  return () => values[index++];
}

test("producer performs only exact STS, RDS, and Secrets metadata reads", () => {
  const { calls, spawnSync } = harness();
  const produced = produceJsonPostgresDatabaseTargetReceipt({
    spawnSync,
    env: {
      PATH: "/fixed-test-path",
      AWS_PROFILE: "forbidden-override",
      AWS_ENDPOINT_URL: "https://forbidden.invalid",
    },
    clock: clock(),
  });
  const suffix = [
    "--profile", JSON_POSTGRES_DATABASE_TARGET_READ_PROFILE,
    "--region", JSON_POSTGRES_DATABASE_TARGET_REGION,
    "--no-cli-pager", "--no-paginate", "--output", "json",
  ];
  assert.deepEqual(calls.map(({ binary, args }) => [binary, args]), [
    ["aws", ["sts", "get-caller-identity", ...suffix]],
    ["aws", [
      "rds", "describe-db-instances", "--db-instance-identifier",
      JSON_POSTGRES_DATABASE_TARGET_INSTANCE, ...suffix,
    ]],
    ["aws", [
      "secretsmanager", "describe-secret", "--secret-id", SECRET, ...suffix,
    ]],
  ]);
  for (const call of calls) {
    assert.equal(call.options.env.AWS_PROFILE, undefined);
    assert.equal(call.options.env.AWS_ENDPOINT_URL, undefined);
    assert.equal(call.options.env.AWS_CLI_AUTO_PROMPT, "off");
    assert.equal(call.options.env.AWS_PAGER, "");
  }
  assert.deepEqual(Object.keys(produced).sort(), [
    "database_target_receipt", "database_target_receipt_sha256",
  ]);
  const receipt = produced.database_target_receipt;
  assert.equal(Object.keys(receipt).length, 18);
  assert.equal(receipt.account_id, ACCOUNT);
  assert.equal(receipt.endpoint_port, 5432);
  assert.equal(receipt.master_secret_arn, SECRET);
  assert.equal(receipt.master_secret_kms_key_arn, KMS);
  assert.equal(receipt.observed_at, "2026-08-17T00:00:01.000Z");
  assert.equal(receipt.expires_at, "2026-08-17T00:15:00.000Z");
  assert.deepEqual(receipt.readback_source.operations, [
    "sts:GetCallerIdentity",
    "rds:DescribeDBInstances",
    "secretsmanager:DescribeSecret",
  ]);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.readback_source.operations), true);
  assert.match(produced.database_target_receipt_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(JSON.stringify(produced).includes("HostedZoneId"), false);
  assert.equal(JSON.stringify(produced).includes("RequestId"), false);
  assert.equal(JSON.stringify(produced).includes("SecretString"), false);
});
test("producer rejects response loss at each exact read without a receipt", () => {
  for (let failureIndex = 0; failureIndex < 3; failureIndex += 1) {
    const { calls, spawnSync } = harness(responses(), failureIndex);
    assert.throws(
      () => produceJsonPostgresDatabaseTargetReceipt({
        spawnSync,
        env: { PATH: "/fixed-test-path" },
        clock: clock(),
      }),
      (error) => error?.code === "LAWOS_DATABASE_TARGET_READBACK",
    );
    assert.equal(calls.length, failureIndex + 1);
  }
});
test("producer rejects incomplete, privileged, and secret-value responses", () => {
  const cases = [
    ["wrong role", (value) => { value[0].Arn = `arn:aws:sts::${ACCOUNT}:assumed-role/matter-prod-deploy-admin/readback`; }, 1],
    ["missing caller", (value) => { delete value[0].UserId; }, 1],
    ["missing RDS", (value) => { value[1].DBInstances = []; }, 2],
    ["RDS pagination", (value) => { value[1].Marker = "next"; }, 2],
    ["missing endpoint", (value) => { delete value[1].DBInstances[0].Endpoint; }, 2],
    ["secret bytes", (value) => { value[2].SecretString = "forbidden"; }, 3],
    ["secret mismatch", (value) => { value[2].ARN += "-other"; }, 3],
    ["scheduled deletion", (value) => { value[2].DeletedDate = "2026-08-18T00:00:00Z"; }, 3],
    ["KMS mismatch", (value) => { value[2].KmsKeyId = KMS.replace("75868150", "11111111"); }, 3],
  ];
  for (const [label, mutate, expectedCalls] of cases) {
    const values = responses();
    mutate(values);
    const { calls, spawnSync } = harness(values);
    assert.throws(
      () => produceJsonPostgresDatabaseTargetReceipt({
        spawnSync,
        env: { PATH: "/fixed-test-path" },
        clock: clock(),
      }),
      (error) => error?.code === "LAWOS_DATABASE_TARGET_READBACK",
      label,
    );
    assert.equal(calls.length, expectedCalls, label);
  }
});
test("producer rejects readbacks that consume the signed validity window", () => {
  const { spawnSync } = harness();
  assert.throws(
    () => produceJsonPostgresDatabaseTargetReceipt({
      spawnSync,
      env: { PATH: "/fixed-test-path" },
      clock: clock([START, START + 15 * 60 * 1_000]),
    }),
    (error) => error?.code === "LAWOS_DATABASE_TARGET_READBACK",
  );
});
test("W13 packet creation rejects forged input and response loss before create", () => {
  const successful = harness();
  const produced = produceJsonPostgresDatabaseTargetReceipt({
    spawnSync: successful.spawnSync,
    env: { PATH: "/fixed-test-path" },
    clock: clock(),
  });
  let createCount = 0;
  const createPacket = (options) => {
    createCount += 1;
    return options;
  };
  assert.throws(
    () => createJsonPostgresExecutionPacketWithDatabaseTarget({
      createPacket,
      packetOptions: {
        phase: "w13-production-cutover",
        target: {
          database_target_receipt: { forged: true },
          database_target_receipt_sha256: "0".repeat(64),
        },
      },
      produceTarget: () => produced,
    }),
    (error) => error?.code === "LAWOS_DATABASE_TARGET_READBACK",
  );
  assert.equal(createCount, 0);
  const lost = harness(responses(), 1);
  assert.throws(
    () => createJsonPostgresExecutionPacketWithDatabaseTarget({
      createPacket,
      packetOptions: { phase: "w13-production-cutover", target: {} },
      produceTarget: () => produceJsonPostgresDatabaseTargetReceipt({
        spawnSync: lost.spawnSync,
        env: { PATH: "/fixed-test-path" },
        clock: clock(),
      }),
    }),
    (error) => error?.code === "LAWOS_DATABASE_TARGET_READBACK",
  );
  assert.equal(createCount, 0);
  const created = createJsonPostgresExecutionPacketWithDatabaseTarget({
    createPacket,
    packetOptions: { phase: "w13-production-cutover", target: {} },
    produceTarget: () => produced,
  });
  assert.equal(createCount, 1);
  assert.equal(created.target.database_target_receipt_sha256,
    produced.database_target_receipt_sha256);
});

test("W12 and W15 packet creation do not call the production producer", () => {
  for (const phase of [
    "w12-real-data-rehearsal",
    "w15-relational-projection",
  ]) {
    const target = { target_ref: phase };
    const created = createJsonPostgresExecutionPacketWithDatabaseTarget({
      createPacket: (options) => options,
      packetOptions: { phase, target },
      produceTarget: () => { throw new Error("must not run"); },
    });
    assert.equal(created.target, target);
  }
});
