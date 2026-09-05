import {
  JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
} from "./json-postgres-production-infrastructure.mjs";
import { CLOUDFORMATION_NO_ECHO_PLACEHOLDER } from "./cloudformation-template-transport.mjs";

export const AWS_LAMBDA_ENVIRONMENT_MAX_BYTES = 4096;
const OMIT = Symbol("AWS::NoValue");
const own = (value, key) => Object.hasOwn(value, key);
const record = (value) => value !== null && typeof value === "object"
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

export function assertLambdaEnvironmentBudget(resolvedEnvironment) {
  if (!record(resolvedEnvironment)) {
    throw new Error("Lambda environment must be a resolved variable map");
  }
  let keyValueBytes = 0;
  for (const [key, value] of Object.entries(resolvedEnvironment)) {
    if (!/^[A-Za-z][A-Za-z0-9_]+$/u.test(key)
      || typeof value !== "string" || value.includes("{{resolve:")
      || value === CLOUDFORMATION_NO_ECHO_PLACEHOLDER) {
      throw new Error("Lambda environment contains an invalid or unresolved variable");
    }
    keyValueBytes += Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
  }
  // The observed AWS rejection reports the compact JSON map size, including
  // escaped locator JSON. Key-plus-value bytes alone missed that rejection.
  const sizeBytes = Buffer.byteLength(JSON.stringify(resolvedEnvironment), "utf8");
  if (sizeBytes > AWS_LAMBDA_ENVIRONMENT_MAX_BYTES) {
    throw new Error(`Lambda environment exceeds ${AWS_LAMBDA_ENVIRONMENT_MAX_BYTES} bytes (${sizeBytes} bytes)`);
  }
  return Object.freeze({
    variable_count: Object.keys(resolvedEnvironment).length,
    size_bytes: sizeBytes,
    key_value_bytes: keyValueBytes,
    maximum_bytes: AWS_LAMBDA_ENVIRONMENT_MAX_BYTES,
    headroom_bytes: AWS_LAMBDA_ENVIRONMENT_MAX_BYTES - sizeBytes,
  });
}

// Bounded to the production W15 API template's existing Ref/If/Sub expressions.
// Never infer generated resource values from a name or an ARN length.
export function resolveW15ApiEnvironment({
  variables, deployedVariables, liveVariables, parameters, outputs, accountId, region,
}) {
  if (![variables, deployedVariables, liveVariables, parameters, outputs].every(record)
    || typeof accountId !== "string" || typeof region !== "string") {
    throw new Error("W15 API environment resolution input is unavailable");
  }
  const bindings = new Map();
  const referenceKey = (expression) => {
    if (!record(expression) || Object.keys(expression).length !== 1) return null;
    if (typeof expression.Ref === "string") return `Ref:${expression.Ref}`;
    if (Array.isArray(expression["Fn::GetAtt"])
      && expression["Fn::GetAtt"].length === 2
      && expression["Fn::GetAtt"].every((part) => typeof part === "string")) {
      return `GetAtt:${expression["Fn::GetAtt"].join(".")}`;
    }
    return null;
  };
  for (const [name, expression] of Object.entries(variables)) {
    const key = referenceKey(expression);
    if (!key || !own(liveVariables, name)) continue;
    if (expression.Ref && (expression.Ref.startsWith("AWS::")
      || (own(parameters, expression.Ref)
        && parameters[expression.Ref] !== CLOUDFORMATION_NO_ECHO_PLACEHOLDER))) continue;
    if (referenceKey(deployedVariables[name]) !== key) {
      throw new Error("W15 API environment resource reference changed");
    }
    const value = liveVariables[name];
    if (typeof value !== "string" || value.length === 0
      || value === CLOUDFORMATION_NO_ECHO_PLACEHOLDER
      || (bindings.has(key) && bindings.get(key) !== value)) {
      throw new Error("W15 API environment live reference is unresolved or ambiguous");
    }
    bindings.set(key, value);
  }
  const enabled = (name) => {
    if (!["true", "false"].includes(parameters[name])) {
      throw new Error("W15 API environment condition parameter is unresolved");
    }
    return parameters[name] === "true";
  };
  const outlookConfigured = parameters.ClientOutlookM365ConfigSecretName
      !== JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME
    && parameters.ClientOutlookCredentialSecretPrefix
      !== JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX;
  if (typeof parameters.ClientOutlookM365ConfigSecretName !== "string"
    || typeof parameters.ClientOutlookCredentialSecretPrefix !== "string") {
    throw new Error("W15 API environment Outlook binding is unresolved");
  }
  const conditions = {
    ProjectionWorkerEnabled: enabled("EnableProjectionWorker"),
    ExternalReadProvidersEnabled: enabled("EnableExternalReadProviders"),
    AmicInternalUnsignedUpdateBrokerEnabled: enabled("EnableAmicInternalUnsignedUpdateBroker"),
    OutlookConversationWorkerConfigured: outlookConfigured,
    OutlookConversationWorkerEnabled: enabled("EnableProductionTraffic")
      && enabled("EnableOutlookConversationWorker") && outlookConfigured,
  };
  function resolve(value) {
    if (typeof value === "string") return value;
    if (!record(value) || Object.keys(value).length !== 1) {
      throw new Error("W15 API environment expression is invalid or unsupported");
    }
    if (value.Ref === "AWS::NoValue") return OMIT;
    if (value.Ref === "AWS::AccountId") return accountId;
    if (value.Ref === "AWS::Region") return region;
    if (typeof value.Ref === "string" && own(parameters, value.Ref)
      && parameters[value.Ref] !== CLOUDFORMATION_NO_ECHO_PLACEHOLDER) return parameters[value.Ref];
    const key = referenceKey(value);
    if (key && bindings.has(key)) return bindings.get(key);
    if (Array.isArray(value["Fn::If"]) && value["Fn::If"].length === 3) {
      const [name, yes, no] = value["Fn::If"];
      if (!own(conditions, name)) throw new Error("W15 API environment condition is unsupported");
      return resolve(conditions[name] ? yes : no);
    }
    if (typeof value["Fn::Sub"] === "string"
      && typeof outputs.ApiEndpoint === "string"
      && outputs.ApiEndpoint.startsWith("https://")
      && value["Fn::Sub"].startsWith("${HttpApi.ApiEndpoint}/")
      && !value["Fn::Sub"].slice("${HttpApi.ApiEndpoint}".length).includes("${")) {
      return value["Fn::Sub"].replace("${HttpApi.ApiEndpoint}", outputs.ApiEndpoint);
    }
    throw new Error("W15 API environment expression is unresolved or unsupported");
  }
  const resolved = Object.fromEntries(Object.entries(variables)
    .map(([key, value]) => [key, resolve(value)])
    .filter(([, value]) => value !== OMIT));
  assertLambdaEnvironmentBudget(resolved);
  return resolved;
}
