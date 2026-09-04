#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertJsonPostgresProductionCaller,
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  JSON_POSTGRES_PRODUCTION_STACK,
} from "./lib/json-postgres-production-execution.mjs";
import {
  AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
  discoverAmicPrivateBootstrapProductionTarget,
  validateAmicPrivateBootstrapPacketInput,
  validateAmicPrivateBootstrapS3Controls,
  verifyAmicPrivateBootstrapAwsCaller,
} from "./lib/amic-private-bootstrap-production.mjs";
import {
  createPrivateProgramOutputDirectory,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const ALLOWED_OPTIONS = new Set([
  "root",
  "packet-id",
  "negative-tenant-id",
  "output-dir",
]);
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;

function parse(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw Object.assign(new TypeError("invalid discovery option"), {
        code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_OPTION",
      });
    }
    const key = flag.slice(2);
    if (!ALLOWED_OPTIONS.has(key) || options[key] != null) {
      throw Object.assign(
        new TypeError("unsupported or duplicate discovery option"),
        { code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_OPTION" },
      );
    }
    options[key] = value;
  }
  return options;
}

function required(value, label) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw Object.assign(new TypeError(`${label} is required`), {
      code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_OPTION",
    });
  }
  return text;
}

function safeRef(value, label) {
  const text = required(value, label);
  if (!SAFE_REF.test(text)) {
    throw Object.assign(new TypeError(`${label} is invalid`), {
      code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_OPTION",
    });
  }
  return text;
}

function sha256(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : JSON.stringify(value),
  ).digest("hex");
}

function safeCode(error, phase) {
  return String(
    error?.code
      ?? `AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_${phase.toUpperCase()
        .replace(/[^A-Z0-9]+/gu, "_")}_FAILED`,
  ).replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 96);
}

let outputDir = null;
let phase = "options";
let awsReadAttemptCount = 0;

try {
  const options = parse(process.argv.slice(2));
  const root = realpathSync(resolve(options.root ?? process.cwd()));
  const repositoryRoot = realpathSync(execFileSync(
    "git",
    ["rev-parse", "--show-toplevel"],
    { cwd: root, encoding: "utf8" },
  ).trim());
  if (repositoryRoot !== root) {
    throw Object.assign(new Error("discovery must run at the repository root"), {
      code: "AMIC_PRIVATE_BOOTSTRAP_DISCOVERY_ROOT",
    });
  }
  const packetId = safeRef(options["packet-id"], "packet-id");
  const negativeTenantId = safeRef(
    options["negative-tenant-id"],
    "negative-tenant-id",
  );
  outputDir = createPrivateProgramOutputDirectory(
    required(options["output-dir"], "output-dir"),
    { worktree: root },
  );
  writePrivateProgramJson(join(outputDir, "discovery-start.json"), {
    schema_version: "law-firm-os.amic-private-bootstrap-discovery-start.v1",
    operation: "production-target-readback",
    environment: "lawos-production",
    packet_id_sha256: sha256(packetId),
    negative_tenant_ref_sha256: sha256(negativeTenantId),
    aws_account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    aws_region: JSON_POSTGRES_PRODUCTION_REGION,
    aws_write_count: 0,
    secret_value_read_count: 0,
    production_ready_claim: false,
  });

  const awsJson = (args) => {
    awsReadAttemptCount += 1;
    try {
      const output = execFileSync("aws", [
        ...args,
        "--profile", JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
        "--region", JSON_POSTGRES_PRODUCTION_REGION,
        "--no-cli-pager",
        "--output", "json",
      ], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return JSON.parse(output);
    } catch {
      throw Object.assign(new Error("AWS read failed"), {
        code: "AMIC_PRIVATE_BOOTSTRAP_AWS_READ",
      });
    }
  };

  phase = "caller";
  const identity = awsJson(["sts", "get-caller-identity"]);
  assertJsonPostgresProductionCaller(identity, {
    role: JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  });

  phase = "stack";
  const stack = awsJson([
    "cloudformation", "describe-stacks",
    "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
  ]).Stacks?.[0];
  const resources = awsJson([
    "cloudformation", "describe-stack-resources",
    "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
  ]).StackResources;
  const physical = (logicalId) => {
    const matches = (resources ?? []).filter((row) =>
      row?.LogicalResourceId === logicalId);
    const value = matches.length === 1
      ? String(matches[0]?.PhysicalResourceId ?? "")
      : "";
    if (!value) {
      throw Object.assign(new Error("stack resource is absent"), {
        code: "AMIC_PRIVATE_BOOTSTRAP_AWS_STACK_RESOURCE",
      });
    }
    return value;
  };
  const databasePhysical = physical("ApplicationDatabaseSecret");
  const tenantContextPhysical = physical("TenantContextSecret");
  const bucket = physical("DmsBucket");
  const kmsPhysical = physical("ProductionKey");

  phase = "resource-descriptions";
  const databaseSecret = awsJson([
    "secretsmanager", "describe-secret",
    "--secret-id", databasePhysical,
  ]);
  const tenantContextSecret = awsJson([
    "secretsmanager", "describe-secret",
    "--secret-id", tenantContextPhysical,
  ]);
  const kms = awsJson(["kms", "describe-key", "--key-id", kmsPhysical]);
  const target = discoverAmicPrivateBootstrapProductionTarget({
    stack,
    resources,
    databaseSecret,
    tenantContextSecret,
    kms,
    expectedAccount: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    expectedRegion: JSON_POSTGRES_PRODUCTION_REGION,
    expectedStack: JSON_POSTGRES_PRODUCTION_STACK,
  });
  const caller = verifyAmicPrivateBootstrapAwsCaller({ identity, target });

  phase = "storage-controls";
  const controls = validateAmicPrivateBootstrapS3Controls({
    target,
    location: awsJson([
      "s3api", "get-bucket-location",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    ]),
    versioning: awsJson([
      "s3api", "get-bucket-versioning",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    ]),
    publicAccessBlock: awsJson([
      "s3api", "get-public-access-block",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    ]),
    encryption: awsJson([
      "s3api", "get-bucket-encryption",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    ]),
    ownership: awsJson([
      "s3api", "get-bucket-ownership-controls",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_PRODUCTION_ACCOUNT,
    ]),
    kms,
  });

  phase = "private-output";
  const packetInput = validateAmicPrivateBootstrapPacketInput({
    schema_version: AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
    packet_id: packetId,
    environment: "lawos-production",
    negative_tenant_id: negativeTenantId,
    production_target: target,
  });
  const packetInputFile = writePrivateProgramJson(
    join(outputDir, "private-bootstrap-packet-input.json"),
    packetInput,
  );
  const parameters = Object.fromEntries((stack.Parameters ?? []).map((row) =>
    [row.ParameterKey, row.ParameterValue]));
  const receiptFile = writePrivateProgramJson(
    join(outputDir, "production-target-readback.json"),
    {
      schema_version:
        "law-firm-os.amic-private-bootstrap-production-target-readback.v1",
      outcome: "PASS",
      environment: "lawos-production",
      packet_id_sha256: sha256(packetId),
      negative_tenant_ref_sha256: sha256(negativeTenantId),
      stack_name: JSON_POSTGRES_PRODUCTION_STACK,
      stack_id_sha256: sha256(stack.StackId),
      stack_status: stack.StackStatus,
      stack_source_sha: parameters.SourceSha,
      stack_source_tree: parameters.SourceTree,
      stack_execution_packet_sha256: parameters.ExecutionPacketSha256,
      target_sha256: sha256(target),
      database_secret_ref_sha256: sha256(target.database_secret_ref),
      tenant_context_secret_ref_sha256:
        sha256(target.tenant_context_secret_ref),
      caller,
      storage: controls,
      aws_read_attempt_count: awsReadAttemptCount,
      aws_write_count: 0,
      secret_description_read_count: 2,
      secret_value_read_count: 0,
      external_read_providers_enabled: false,
      raw_secret_reference_returned: false,
      raw_infrastructure_identifier_returned: false,
      production_ready_claim: false,
    },
  );
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    environment: "lawos-production",
    packet_input_path: packetInputFile.path,
    packet_input_sha256: packetInputFile.sha256,
    receipt_path: receiptFile.path,
    receipt_sha256: receiptFile.sha256,
    aws_read_attempt_count: awsReadAttemptCount,
    aws_write_count: 0,
    secret_value_read_count: 0,
    external_read_providers_enabled: false,
    raw_infrastructure_identifier_returned: false,
    production_ready_claim: false,
  }, null, 2)}\n`);
} catch (error) {
  const failure = {
    schema_version:
      "law-firm-os.amic-private-bootstrap-production-target-failure.v1",
    outcome: "BLOCKED",
    failed_phase: phase,
    failure_code: safeCode(error, phase),
    aws_read_attempt_count: awsReadAttemptCount,
    aws_write_count: 0,
    secret_value_read_count: 0,
    raw_error_returned: false,
    raw_secret_reference_returned: false,
    raw_infrastructure_identifier_returned: false,
    production_ready_claim: false,
  };
  let failurePath = null;
  if (outputDir) {
    try {
      failurePath = writePrivateProgramJson(
        join(outputDir, "production-target-failure.json"),
        failure,
      ).path;
    } catch {
      failurePath = null;
    }
  }
  process.stderr.write(`${JSON.stringify({
    verdict: "BLOCKED",
    failed_phase: phase,
    failure_code: failure.failure_code,
    failure_path: failurePath,
    aws_write_count: 0,
    secret_value_read_count: 0,
    raw_error_returned: false,
    production_ready_claim: false,
  }, null, 2)}\n`);
  process.exitCode = 1;
}
