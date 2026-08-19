import { Buffer } from "node:buffer";

import {
  CONTRACT_VERSION,
  OPERATION_NAMES,
  createMicrosoftGroupEgressController,
} from "./index.mjs";

export const AWS_ACCOUNT_ID = "770880870480";
export const AWS_REGION = "ap-northeast-2";
export const FUNCTION_NAME = "lawos-microsoft-group-egress-prod";
export const EXPECTED_FUNCTION_ARN =
  `arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const SECRET_ARN = new RegExp(
  `^arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:`
    + "lawos/production/microsoft-group-egress/app-credential-[A-Za-z0-9]{6}$",
  "u",
);
const ENV_PREFIX = "LAWOS_MICROSOFT_GROUP_EGRESS_";
const ENV_NAMES = Object.freeze({
  enabled: `${ENV_PREFIX}PROVIDER_ENABLED`,
  tenantId: `${ENV_PREFIX}TENANT_ID`,
  groupId: `${ENV_PREFIX}GROUP_ID`,
  principals: `${ENV_PREFIX}ALLOWED_PRINCIPAL_IDS_JSON`,
  credentialArn: `${ENV_PREFIX}CREDENTIAL_SECRET_ARN`,
});
const ALLOWED_ENV_NAMES = new Set(Object.values(ENV_NAMES));
const MUTATIONS = new Set(["group.member.add", "group.member.remove"]);
const MAX_SECRET_BYTES = 32 * 1024;

function invalidConfiguration() {
  throw new TypeError("Microsoft group egress Lambda configuration is invalid");
}

function lowerUuid(value) {
  if (typeof value !== "string" || !UUID.test(value)) invalidConfiguration();
  return value;
}

function authorityConfiguration(env) {
  if (!env || typeof env !== "object" || Array.isArray(env)) invalidConfiguration();
  for (const name of Object.keys(env)) {
    if (name.startsWith(ENV_PREFIX) && !ALLOWED_ENV_NAMES.has(name)) {
      invalidConfiguration();
    }
  }
  const enabled = env[ENV_NAMES.enabled];
  if (enabled !== "false" && enabled !== "true") invalidConfiguration();
  const tenantId = lowerUuid(env[ENV_NAMES.tenantId]);
  const groupId = lowerUuid(env[ENV_NAMES.groupId]);
  let principals;
  try {
    principals = JSON.parse(env[ENV_NAMES.principals]);
  } catch {
    invalidConfiguration();
  }
  if (
    !Array.isArray(principals)
    || principals.length < 1
    || principals.length > 10
    || principals.some((value) => !UUID.test(value))
    || new Set(principals).size !== principals.length
    || JSON.stringify(principals) !== env[ENV_NAMES.principals]
    || principals.includes(tenantId)
    || principals.includes(groupId)
    || tenantId === groupId
  ) {
    invalidConfiguration();
  }
  const credentialArn = env[ENV_NAMES.credentialArn];
  if (typeof credentialArn !== "string" || !SECRET_ARN.test(credentialArn)) {
    invalidConfiguration();
  }
  return Object.freeze({
    enabled: enabled === "true",
    tenantId,
    groupId,
    principals: Object.freeze([...principals]),
    credentialArn,
    region: env.AWS_REGION,
    functionName: env.AWS_LAMBDA_FUNCTION_NAME,
  });
}

function safeFailure(event, code) {
  return {
    contract_version: CONTRACT_VERSION,
    operation: OPERATION_NAMES.includes(event?.operation) ? event.operation : null,
    ok: false,
    status: 503,
    error: { code },
  };
}

function exactRuntimeIdentity(binding, context) {
  return binding.region === AWS_REGION
    && binding.functionName === FUNCTION_NAME
    && context?.functionName === FUNCTION_NAME
    && context?.functionVersion === "$LATEST"
    && context?.invokedFunctionArn === EXPECTED_FUNCTION_ARN
    && context?.memoryLimitInMB === "256";
}

function secretsPort({ secretClient, GetSecretValueCommand }) {
  if (secretClient || GetSecretValueCommand) {
    if (typeof secretClient?.send !== "function"
      || typeof GetSecretValueCommand !== "function") {
      invalidConfiguration();
    }
    return async () => ({ secretClient, GetSecretValueCommand });
  }
  let value;
  return async () => {
    value ??= import("@aws-sdk/client-secrets-manager").then((module) => ({
      secretClient: new module.SecretsManagerClient({ region: AWS_REGION }),
      GetSecretValueCommand: module.GetSecretValueCommand,
    }));
    return value;
  };
}

function credentialConsumer(binding, getSecretsPort) {
  return async (reference, consume) => {
    if (reference !== binding.credentialArn || typeof consume !== "function") {
      throw new TypeError("credential reference is invalid");
    }
    const { secretClient, GetSecretValueCommand } = await getSecretsPort();
    const response = await secretClient.send(new GetSecretValueCommand({
      SecretId: reference,
      VersionStage: "AWSCURRENT",
    }));
    if (
      !response
      || response.ARN !== reference
      || !Array.isArray(response.VersionStages)
      || !response.VersionStages.includes("AWSCURRENT")
      || typeof response.SecretString !== "string"
      || response.SecretString.length < 2
      || Buffer.byteLength(response.SecretString, "utf8") > MAX_SECRET_BYTES
      || response.SecretBinary !== undefined
    ) {
      throw new TypeError("credential reference is unavailable");
    }
    let value;
    try {
      value = JSON.parse(response.SecretString);
    } catch {
      throw new TypeError("credential reference is unavailable");
    }
    return consume(value);
  };
}

export function createMicrosoftGroupEgressLambda({
  env = process.env,
  fetch_impl = globalThis.fetch,
  secret_client = null,
  get_secret_value_command = null,
} = {}) {
  const binding = authorityConfiguration(env);
  if (typeof fetch_impl !== "function") invalidConfiguration();
  const getSecretsPort = secretsPort({
    secretClient: secret_client,
    GetSecretValueCommand: get_secret_value_command,
  });
  const controller = createMicrosoftGroupEgressController({
    tenant_id: binding.tenantId,
    group_id: binding.groupId,
    allowed_principal_ids: binding.principals,
    credential_ref: binding.credentialArn,
    with_credential: credentialConsumer(binding, getSecretsPort),
    fetch_impl,
  });

  return async function microsoftGroupEgressLambda(event, context) {
    if (!exactRuntimeIdentity(binding, context)) {
      return safeFailure(event, "CONTROLLER_UNAVAILABLE");
    }
    if (!binding.enabled && MUTATIONS.has(event?.operation)) {
      return safeFailure(event, "PROVIDER_DISABLED");
    }
    try {
      return await controller(event);
    } catch {
      return safeFailure(event, "CONTROLLER_UNAVAILABLE");
    }
  };
}

let defaultHandler;

export async function handler(event, context) {
  try {
    defaultHandler ??= createMicrosoftGroupEgressLambda();
    return await defaultHandler(event, context);
  } catch {
    return safeFailure(event, "CONTROLLER_UNAVAILABLE");
  }
}
