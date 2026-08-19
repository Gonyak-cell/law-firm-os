import {
  PROJECTION_AUDITOR_EXECUTION_ROLE_ARN,
  PROJECTION_AUDITOR_REQUIRED_ENV_KEYS,
  nonCodeStableProjection,
} from "../lib/outlook-production-aws-inventory-contract.mjs";
import {
  projectFunction,
} from "../lib/outlook-production-aws-inventory-projection.mjs";
import {
  validateInventoryEvidence,
} from "../lib/outlook-production-aws-inventory-evidence.mjs";
import {
  authorityWithObservedSecretKey,
  CODE_BYTES,
  CODE_SHA,
  collectFixture,
  requestTarget,
  responseFor,
} from "./collect-outlook-production-aws-inventory-fixtures.mjs";

let inventoryPromise;

function task3CloudFormation(request) {
  const response = authorityWithObservedSecretKey(request);
  const template = JSON.parse(response.TemplateBody);
  const entry = Object.entries(template.Resources).find(
    ([, resource]) => resource?.Properties?.FunctionName
      === "lawos-production-projection-auditor",
  );
  if (!entry) throw new Error("projection-auditor fixture is missing");
  delete template.Resources[entry[0]];
  template.Resources.ProjectionAuditorFunction = entry[1];
  return { TemplateBody: JSON.stringify(template) };
}

function task3Configuration(request) {
  const response = responseFor(request);
  if (requestTarget(request)
      !== "lawos-production-projection-auditor") return response;
  return {
    ...response,
    CodeSize: CODE_BYTES.byteLength,
    RevisionId: "R0",
    Timeout: 900,
    MemorySize: 2048,
    EphemeralStorage: { Size: 512 },
    VpcConfig: {
      VpcId: "vpc-task3",
      SubnetIds: ["subnet-a", "subnet-b"],
      SecurityGroupIds: ["sg-task3"],
      Ipv6AllowedForDualStack: false,
    },
  };
}

function task3GetFunction(request) {
  const response = responseFor(request);
  if (requestTarget(request)
      !== "lawos-production-projection-auditor") return response;
  return {
    ...response,
    Configuration: {
      ...response.Configuration,
      CodeSize: CODE_BYTES.byteLength,
      RevisionId: "R0",
    },
  };
}

export function task2CatalogReadbackInventory() {
  inventoryPromise ??= collectFixture({
    overrides: {
      "cloudformation:get-template": task3CloudFormation,
      "lambda:get-function": task3GetFunction,
      "lambda:get-function-configuration": task3Configuration,
      "lambda:get-function-concurrency": (request) => ({
        ReservedConcurrentExecutions: requestTarget(request)
          === "lawos-production-projection-auditor" ? 1 : 10,
      }),
    },
  }).then((evidence) => validateInventoryEvidence(evidence));
  return inventoryPromise;
}

function projectedState(configuration) {
  const projected = projectFunction({
    name: "lawos-production-projection-auditor",
    getFunctionResponse: {
      Configuration: configuration,
      Code: { Location: "https://example.test/task3-code" },
    },
    configurationResponse: configuration,
    expectedKeys: [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS],
    expectedKeyInfo: {
      logical_id: "ProjectionAuditorFunction",
      complete: true,
      expected_keys: [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS],
    },
    directInvoke: {
      status: "NOT_CONFIGURED",
      error_code: null,
      function_url_present: false,
      auth_type: null,
      url_stripped: true,
    },
    reservedConcurrency: 1,
    provisionedConcurrency: [],
  });
  if (projected.status !== "PASS") {
    throw new Error(`Task 2 fixture is not PASS: ${projected.error_code}`);
  }
  return {
    revision_id: projected.revision_id,
    code_sha256_base64: projected.code.code_sha256_base64,
    configuration_fingerprint_sha256:
      projected.configuration_fingerprint_sha256,
    non_code_configuration_fingerprint_sha256:
      projected.non_code_configuration_fingerprint_sha256,
    config_stable_projection: projected.config_stable_projection,
    non_code_configuration: nonCodeStableProjection(
      projected.config_stable_projection,
    ),
    state: projected.state,
    last_update_status: projected.last_update_status,
  };
}

export function task2ProjectedCodeState({
  revisionId,
  codeSha256Base64,
  codeSize,
} = {}) {
  const configuration = task3Configuration({
    service: "lambda",
    operation: "get-function-configuration",
    args: ["--function-name", "lawos-production-projection-auditor"],
  });
  return projectedState({
    ...configuration,
    CodeSha256: codeSha256Base64,
    CodeSize: codeSize,
    RevisionId: revisionId,
  });
}

export function task2StateFromInventory(evidence) {
  const row = evidence.functions.find(
    ({ name }) => name === "lawos-production-projection-auditor",
  );
  const stable = structuredClone(row.config_stable_projection);
  return {
    revision_id: row.revision_id,
    code_sha256_base64: row.code.code_sha256_base64,
    configuration_fingerprint_sha256:
      row.configuration_fingerprint_sha256,
    non_code_configuration_fingerprint_sha256:
      row.non_code_configuration_fingerprint_sha256,
    config_stable_projection: stable,
    non_code_configuration: nonCodeStableProjection(
      stable,
    ),
    state: row.state,
    last_update_status: row.last_update_status,
  };
}

export function task2CatalogReadbackState({
  description = "  Task 3 diagnostic  ",
  layers = ["arn:layer-a", "arn:layer-a", "arn:layer-b"],
  entryPoint = ["/bin/sh", "-c", "-c"],
  command = ["first", "first", "second"],
} = {}) {
  const configuration = {
    FunctionArn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-projection-auditor",
    FunctionName: "lawos-production-projection-auditor",
    Role: PROJECTION_AUDITOR_EXECUTION_ROLE_ARN,
    Runtime: "nodejs22.x",
    Handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
    CodeSha256: CODE_SHA,
    CodeSize: 32,
    RevisionId: "R0",
    LastModified: "2026-08-16T00:00:00.000Z",
    State: "Active",
    LastUpdateStatus: "Successful",
    Timeout: 900,
    MemorySize: 2048,
    EphemeralStorage: { Size: 512 },
    Architectures: ["arm64"],
    VpcConfig: {
      VpcId: "vpc-task3",
      SubnetIds: ["subnet-b", "subnet-a"],
      SecurityGroupIds: ["sg-task3"],
      Ipv6AllowedForDualStack: false,
    },
    Environment: {
      Error: { ErrorCode: "AccessDeniedException" },
    },
    PackageType: "Zip",
    Description: description,
    Layers: layers.map((Arn) => ({ Arn })),
    ImageConfig: {
      EntryPoint: entryPoint,
      Command: command,
      WorkingDirectory: "/var/task",
    },
    Version: "$LATEST",
    SigningProfileVersionArn: "arn:aws:signer:ap-northeast-2:770880870480:/signing-profiles/task3",
    SigningJobArn: "arn:aws:signer:ap-northeast-2:770880870480:/signing-jobs/task3",
  };
  return projectedState(configuration);
}
