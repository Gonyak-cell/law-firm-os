import {
  configurationFingerprints,
  environmentStableProjection,
  hashOpaqueString,
  hashSortedIdentifiers,
  optionalHashableIdentifier,
  sha256,
  sortedUnique,
} from "./outlook-production-aws-inventory-contract.mjs";

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

const LAYER_KEYS = ["Arn", "CodeSize", "SigningJobArn", "SigningProfileVersionArn", "UncompressedCodeSize"];
const IMAGE_CONFIG_KEYS = ["EntryPoint", "Command", "WorkingDirectory"];
const IMAGE_CONFIG_RESPONSE_KEYS = ["Error", "ImageConfig"];

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function closedKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validLayer(value) {
  if (!plainObject(value) || !closedKeys(value, LAYER_KEYS) || typeof value.Arn !== "string" || value.Arn.trim() === "") return false;
  if (Object.prototype.hasOwnProperty.call(value, "CodeSize") && (!Number.isInteger(value.CodeSize) || value.CodeSize < 0)) return false;
  if (Object.prototype.hasOwnProperty.call(value, "UncompressedCodeSize") && (!Number.isInteger(value.UncompressedCodeSize) || value.UncompressedCodeSize < 0)) return false;
  for (const key of ["SigningJobArn", "SigningProfileVersionArn"]) if (Object.prototype.hasOwnProperty.call(value, key) && (typeof value[key] !== "string" || value[key].trim() === "")) return false;
  return true;
}

function validImageConfig(value) {
  if (!plainObject(value) || !closedKeys(value, IMAGE_CONFIG_KEYS)) return false;
  for (const key of ["EntryPoint", "Command"]) {
    if (Object.prototype.hasOwnProperty.call(value, key) && (!Array.isArray(value[key]) || value[key].some((entry) => typeof entry !== "string" || entry.length === 0))) return false;
  }
  if (Object.prototype.hasOwnProperty.call(value, "WorkingDirectory") && (typeof value.WorkingDirectory !== "string" || value.WorkingDirectory.length === 0)) return false;
  return true;
}

export function validateLambdaConfigurationShape(configuration) {
  if (!plainObject(configuration)) return "AWS_CONFIGURATION_SHAPE_INVALID";
  if (Object.prototype.hasOwnProperty.call(configuration, "Description") && typeof configuration.Description !== "string") return "AWS_CONFIGURATION_SHAPE_INVALID";
  if (Object.prototype.hasOwnProperty.call(configuration, "Layers") && (!Array.isArray(configuration.Layers) || configuration.Layers.some((layer) => !validLayer(layer)))) return "AWS_CONFIGURATION_SHAPE_INVALID";
  if (Object.prototype.hasOwnProperty.call(configuration, "ImageConfig") && !validImageConfig(configuration.ImageConfig)) return "AWS_CONFIGURATION_SHAPE_INVALID";
  if (Object.prototype.hasOwnProperty.call(configuration, "ImageConfigResponse")) {
    const response = configuration.ImageConfigResponse;
    if (!plainObject(response) || !closedKeys(response, IMAGE_CONFIG_RESPONSE_KEYS)) return "AWS_CONFIGURATION_SHAPE_INVALID";
    if (Object.prototype.hasOwnProperty.call(response, "Error") && response.Error !== null && (typeof response.Error !== "string" || response.Error.length === 0)) return "AWS_CONFIGURATION_SHAPE_INVALID";
    if (Object.prototype.hasOwnProperty.call(response, "ImageConfig") && !validImageConfig(response.ImageConfig)) return "AWS_CONFIGURATION_SHAPE_INVALID";
  }
  return null;
}

export const CONFIGURATION_FIELDS = new Set([
  "FunctionArn", "FunctionName", "Runtime", "Role", "Handler", "CodeSha256", "CodeSize", "RevisionId", "LastModified", "State", "LastUpdateStatus", "Version", "MasterArn", "SigningProfileVersionArn", "SigningJobArn",
  "Timeout", "MemorySize", "Architectures", "EphemeralStorage", "VpcConfig", "Environment", "PackageType", "DeadLetterConfig", "KMSKeyArn",
  "TracingConfig", "Layers", "FileSystemConfigs", "ImageConfig", "ImageConfigResponse", "SnapStart", "LoggingConfig", "Description", "StateReason", "StateReasonCode",
  "LastUpdateStatusReason", "LastUpdateStatusReasonCode", "RuntimeVersionConfig", "CodeSigningConfigArn", "FunctionUrlAuthType",
]);

export function normalizedProvisionedConcurrency(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    qualifier: typeof entry?.Qualifier === "string" ? entry.Qualifier : entry?.qualifier ?? null,
    requested: finite(entry?.RequestedProvisionedConcurrentExecutions ?? entry?.requested),
  })).sort((left, right) => String(left.qualifier).localeCompare(String(right.qualifier)));
}

export function networkProjection(configuration) {
  const vpc = configuration?.VpcConfig ?? {};
  const vpcId = typeof vpc.VpcId === "string" && vpc.VpcId ? vpc.VpcId : null;
  const subnetIds = sortedUnique(Array.isArray(vpc.SubnetIds) ? vpc.SubnetIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()) : []);
  const securityGroupIds = sortedUnique(Array.isArray(vpc.SecurityGroupIds) ? vpc.SecurityGroupIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()) : []);
  return {
    vpc_id_sha256: optionalHashableIdentifier(vpcId),
    subnet_id_sha256: hashSortedIdentifiers(subnetIds),
    security_group_id_sha256: hashSortedIdentifiers(securityGroupIds),
    ipv6_allowed_for_dual_stack: vpc.Ipv6AllowedForDualStack === true,
    vpc_present: Boolean(vpcId || subnetIds.length || securityGroupIds.length),
    subnet_count: subnetIds.length,
    security_group_count: securityGroupIds.length,
  };
}

function hashOrderedStrings(value) {
  if (!Array.isArray(value)) return [];
  const strings = value.map((entry) => {
    if (typeof entry === "string") return entry;
    return null;
  });
  return strings.some((entry) => entry === null) ? null : strings.map((entry) => sha256(entry));
}

export function additionalConfigurationProjection(configuration) {
  const deadLetterTarget = configuration.DeadLetterConfig?.TargetArn;
  const layers = Array.isArray(configuration.Layers) ? configuration.Layers.map((layer) => typeof layer === "string" ? layer : layer?.Arn) : [];
  const fileSystems = Array.isArray(configuration.FileSystemConfigs) ? configuration.FileSystemConfigs.map((entry) => ({ arn_sha256: optionalHashableIdentifier(entry?.Arn), local_mount_path: typeof entry?.LocalMountPath === "string" ? entry.LocalMountPath : null })).sort((left, right) => `${left.arn_sha256}:${left.local_mount_path}`.localeCompare(`${right.arn_sha256}:${right.local_mount_path}`)) : [];
  const image = configuration.ImageConfigResponse?.ImageConfig ?? configuration.ImageConfig ?? {};
  const logging = configuration.LoggingConfig ?? {};
  const snapStart = configuration.SnapStart ?? {};
  const runtimeVersion = configuration.RuntimeVersionConfig ?? {};
  return {
    package_type: typeof configuration.PackageType === "string" ? configuration.PackageType : null,
    code_size: finite(configuration.CodeSize),
    version: typeof configuration.Version === "string" ? configuration.Version : null,
    description_sha256: hashOpaqueString(configuration.Description),
    dead_letter_target_sha256: optionalHashableIdentifier(deadLetterTarget),
    kms_key_sha256: optionalHashableIdentifier(configuration.KMSKeyArn),
    tracing_mode: typeof configuration.TracingConfig?.Mode === "string" ? configuration.TracingConfig.Mode : null,
    layers_sha256: hashOrderedStrings(layers),
    file_system_configs: fileSystems,
    image_config: {
      entry_point_sha256: hashOrderedStrings(image.EntryPoint),
      command_sha256: hashOrderedStrings(image.Command),
      working_directory: typeof image.WorkingDirectory === "string" ? image.WorkingDirectory : null,
    },
    snap_start: {
      apply_on: typeof snapStart.ApplyOn === "string" ? snapStart.ApplyOn : null,
      optimization_status: typeof snapStart.OptimizationStatus === "string" ? snapStart.OptimizationStatus : null,
    },
    logging_config: {
      log_format: typeof logging.LogFormat === "string" ? logging.LogFormat : null,
      application_log_level: typeof logging.ApplicationLogLevel === "string" ? logging.ApplicationLogLevel : null,
      system_log_level: typeof logging.SystemLogLevel === "string" ? logging.SystemLogLevel : null,
      log_group_name_sha256: optionalHashableIdentifier(logging.LogGroup),
    },
    runtime_version_arn_sha256: optionalHashableIdentifier(runtimeVersion.RuntimeVersionArn),
    code_signing_config_arn_sha256: optionalHashableIdentifier(configuration.CodeSigningConfigArn),
    function_url_auth_type_config: typeof configuration.FunctionUrlAuthType === "string" ? configuration.FunctionUrlAuthType : null,
    master_arn_sha256: optionalHashableIdentifier(configuration.MasterArn),
    signing_profile_version_arn_sha256: optionalHashableIdentifier(configuration.SigningProfileVersionArn),
    signing_job_arn_sha256: optionalHashableIdentifier(configuration.SigningJobArn),
  };
}

export function configurationProjection({ name, functionData, configuration, environment, directInvoke, reservedConcurrency, provisionedConcurrency, codeSha256 }) {
  const network = networkProjection(configuration);
  const additional = additionalConfigurationProjection(configuration);
  const stable = {
    function_name: name,
    function_arn_sha256: optionalHashableIdentifier(configuration.FunctionArn ?? functionData.FunctionArn),
    role_sha256: optionalHashableIdentifier(configuration.Role ?? functionData.Role),
    runtime: configuration.Runtime ?? functionData.Runtime ?? null,
    handler: configuration.Handler ?? functionData.Handler ?? null,
    code_sha256_base64: codeSha256,
    timeout: finite(configuration.Timeout),
    memory_size: finite(configuration.MemorySize),
    ephemeral_storage_size: finite(configuration.EphemeralStorage?.Size),
    architectures: Array.isArray(configuration.Architectures) ? sortedUnique(configuration.Architectures) : [],
    vpc_id_sha256: network.vpc_id_sha256,
    subnet_id_sha256: network.subnet_id_sha256,
    security_group_id_sha256: network.security_group_id_sha256,
    ipv6_allowed_for_dual_stack: network.ipv6_allowed_for_dual_stack,
    reserved_concurrent_executions: reservedConcurrency,
    provisioned_concurrency: normalizedProvisionedConcurrency(provisionedConcurrency),
    environment_key_inventory: environmentStableProjection(environment.expected_keys, environment.expected_key_inventory_sha256),
    function_url_present: directInvoke?.function_url_present ?? false,
    function_url_auth_type: directInvoke?.auth_type ?? null,
    additional_configuration: additional,
  };
  const fingerprints = configurationFingerprints(stable);
  return {
    stable,
    fingerprint_sha256: fingerprints.configuration_fingerprint_sha256,
    nonCodeFingerprintSha256: fingerprints.non_code_configuration_fingerprint_sha256,
  };
}

export { finite };
