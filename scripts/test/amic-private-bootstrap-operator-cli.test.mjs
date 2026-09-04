import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("private bootstrap operator rejects unsupported input before any external action", () => {
  const result = spawnSync(process.execPath, [
    resolve("scripts/run-amic-private-bootstrap-migration.mjs"),
    "--unsupported",
    "value",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  const receipt = JSON.parse(result.stderr);
  assert.deepEqual(receipt, {
    verdict: "BLOCKED",
    failed_phase: "options",
    failure_code: "AMIC_PRIVATE_BOOTSTRAP_OPERATOR_OPTION",
    failure_path: null,
    repair_required: false,
    raw_error_returned: false,
    production_ready_claim: false,
  });
});

test("production target discovery rejects unsupported input before AWS", () => {
  const result = spawnSync(process.execPath, [
    resolve("scripts/discover-amic-private-bootstrap-production-target.mjs"),
    "--unsupported",
    "value",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(JSON.parse(result.stderr), {
    verdict: "BLOCKED",
    failed_phase: "options",
    failure_code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_OPTION",
    failure_path: null,
    aws_write_count: 0,
    secret_value_read_count: 0,
    raw_error_returned: false,
    production_ready_claim: false,
  });
});

test("production target discovery performs only exact metadata reads and writes private output", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "amic-bootstrap-discovery-"));
  const bin = join(temporary, "bin");
  const awsPath = join(bin, "aws");
  const logPath = join(temporary, "aws-calls.ndjson");
  const outputDir = join(temporary, "output");
  const account = "770880870480";
  const region = "ap-northeast-2";
  const bucket = "lawos-private-member-photos-prod";
  const keyId = "11111111-2222-3333-4444-555555555555";
  const keyArn = `arn:aws:kms:${region}:${account}:key/${keyId}`;
  const databaseArn =
    `arn:aws:secretsmanager:${region}:${account}:secret:/lawos/production/postgres/application-AbCdEf`;
  const tenantArn =
    `arn:aws:secretsmanager:${region}:${account}:secret:/lawos/production/postgres/tenant-context-GhIjKl`;
  const stack = {
    StackName: "lawos-production",
    StackId:
      `arn:aws:cloudformation:${region}:${account}:stack/lawos-production/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`,
    StackStatus: "UPDATE_COMPLETE",
    Parameters: [
      { ParameterKey: "DmsBucketName", ParameterValue: bucket },
      { ParameterKey: "SourceSha", ParameterValue: "a".repeat(40) },
      { ParameterKey: "SourceTree", ParameterValue: "b".repeat(40) },
      { ParameterKey: "ExecutionPacketSha256", ParameterValue: "c".repeat(64) },
    ],
    Outputs: [
      { OutputKey: "DmsBucketName", OutputValue: bucket },
      { OutputKey: "ProgramInputKmsKeyArn", OutputValue: keyArn },
      { OutputKey: "ExternalReadProvidersEnabled", OutputValue: "false" },
    ],
  };
  const resources = [
    ["ApplicationDatabaseSecret", databaseArn, "AWS::SecretsManager::Secret"],
    ["TenantContextSecret", tenantArn, "AWS::SecretsManager::Secret"],
    ["DmsBucket", bucket, "AWS::S3::Bucket"],
    ["ProductionKey", keyId, "AWS::KMS::Key"],
  ].map(([LogicalResourceId, PhysicalResourceId, ResourceType]) => ({
    LogicalResourceId,
    PhysicalResourceId,
    ResourceType,
    ResourceStatus: "CREATE_COMPLETE",
  }));
  await mkdir(bin, { recursive: true });
  const fakeAws = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.AMIC_AWS_CALL_LOG, JSON.stringify(args) + "\\n");
const operation = args.slice(0, 2).join(":");
const stack = ${JSON.stringify(stack)};
const resources = ${JSON.stringify(resources)};
const databaseArn = ${JSON.stringify(databaseArn)};
const tenantArn = ${JSON.stringify(tenantArn)};
const keyArn = ${JSON.stringify(keyArn)};
const keyId = ${JSON.stringify(keyId)};
const account = ${JSON.stringify(account)};
let response;
if (operation === "sts:get-caller-identity") response = {
  Account: account,
  Arn: "arn:aws:sts::" + account + ":assumed-role/matter-cutover-operator/test",
};
else if (operation === "cloudformation:describe-stacks") response = { Stacks: [stack] };
else if (operation === "cloudformation:describe-stack-resources") response = { StackResources: resources };
else if (operation === "secretsmanager:describe-secret") {
  const secret = args[args.indexOf("--secret-id") + 1];
  response = secret === databaseArn
    ? { ARN: databaseArn, Name: "/lawos/production/postgres/application" }
    : { ARN: tenantArn, Name: "/lawos/production/postgres/tenant-context" };
} else if (operation === "kms:describe-key") response = {
  KeyMetadata: {
    AWSAccountId: account,
    Arn: keyArn,
    KeyId: keyId,
    Enabled: true,
    KeyState: "Enabled",
    KeyUsage: "ENCRYPT_DECRYPT",
    Origin: "AWS_KMS",
    KeyManager: "CUSTOMER",
  },
};
else if (operation === "s3api:get-bucket-location") response = { LocationConstraint: ${JSON.stringify(region)} };
else if (operation === "s3api:get-bucket-versioning") response = { Status: "Enabled" };
else if (operation === "s3api:get-public-access-block") response = {
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  },
};
else if (operation === "s3api:get-bucket-encryption") response = {
  ServerSideEncryptionConfiguration: { Rules: [{
    ApplyServerSideEncryptionByDefault: {
      SSEAlgorithm: "aws:kms",
      KMSMasterKeyID: keyArn,
    },
    BucketKeyEnabled: true,
  }] },
};
else if (operation === "s3api:get-bucket-ownership-controls") response = {
  OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
};
else process.exit(2);
process.stdout.write(JSON.stringify(response));
`;
  await writeFile(awsPath, fakeAws, { mode: 0o700 });
  await chmod(awsPath, 0o700);

  const result = spawnSync(process.execPath, [
    resolve("scripts/discover-amic-private-bootstrap-production-target.mjs"),
    "--packet-id", "amic-private-bootstrap-production-001",
    "--negative-tenant-id", "tenant-negative-control",
    "--output-dir", outputDir,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      AMIC_AWS_CALL_LOG: logPath,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.aws_read_attempt_count, 11);
  assert.equal(receipt.aws_write_count, 0);
  assert.equal(receipt.secret_value_read_count, 0);
  assert.doesNotMatch(
    result.stdout,
    /lawos-private-member-photos-prod|arn:aws:(?:kms|secretsmanager)|tenant-negative-control/u,
  );
  const packetInput = JSON.parse(await readFile(
    join(outputDir, "private-bootstrap-packet-input.json"),
    "utf8",
  ));
  assert.equal(packetInput.production_target.photo_bucket_name, bucket);
  assert.equal(packetInput.production_target.database_secret_ref, databaseArn);
  assert.equal(packetInput.production_target.tenant_context_secret_ref, tenantArn);
  assert.equal(
    (await stat(join(outputDir, "private-bootstrap-packet-input.json"))).mode
      & 0o777,
    0o600,
  );
  assert.equal((await stat(outputDir)).mode & 0o777, 0o700);
  const calls = (await readFile(logPath, "utf8")).trim().split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(calls.length, 11);
  const commands = calls.map((args) => args.slice(0, 2).join(":"));
  assert.equal(commands.filter((command) =>
    command === "secretsmanager:describe-secret").length, 2);
  assert.equal(commands.includes("secretsmanager:get-secret-value"), false);
  assert.equal(commands.some((command) =>
    /(?:put|create|update|delete|execute)/u.test(command)), false);
});
