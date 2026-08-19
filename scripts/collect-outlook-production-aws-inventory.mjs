#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_FUNCTIONS,
  EXPECTED_CLOUDFORMATION_STACKS,
  EXPECTED_ACCOUNT_ID,
  EXPECTED_REGION,
  EXPECTED_READONLY_ROLE,
  READ_ONLY_AWS_OPERATIONS,
  SCHEMA_VERSION,
  canonicalJson,
  configurationFingerprints,
  requiredString,
  sha256,
} from "./lib/outlook-production-aws-inventory-contract.mjs";
import { createAwsCliExecutor, isAwsAuthFailure, readOnlyCall } from "./lib/outlook-production-aws-inventory-aws.mjs";
import { emptyFunctionRecord, projectAlarms } from "./lib/outlook-production-aws-inventory-projection.mjs";
import { projectCloudFormationTemplate, projectTopology } from "./lib/outlook-production-aws-inventory-topology.mjs";
import { collectFunctionRecords } from "./lib/outlook-production-aws-inventory-functions.mjs";
import { collectRdsInventory } from "./lib/outlook-production-aws-inventory-rds.mjs";
import { collectTopologyInventory } from "./lib/outlook-production-aws-inventory-topology-read.mjs";
import { captureAuditorRollbackCode, readVerifiedPrivateFile, readVerifiedPrivateZip, verifyHeldZip } from "./lib/outlook-production-aws-inventory-secure-store.mjs";
import { buildInventoryEvidence, readInventoryEvidence, validateInventoryEvidence, writeInventoryEvidence } from "./lib/outlook-production-aws-inventory-evidence.mjs";
import { parseCliArguments } from "./lib/outlook-production-aws-inventory-cli.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const AUTHORITATIVE_REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const ASSUMED_ROLE_PATTERN = new RegExp(`^arn:aws:sts::${EXPECTED_ACCOUNT_ID}:assumed-role/${EXPECTED_READONLY_ROLE}/([A-Za-z0-9+=,.@_-]{1,64})$`, "u");

function emptyCloudFormation(code = "AWS_NOT_READ") {
  return { status: "INCOMPLETE", error_code: code, complete: false, function_keys: {}, missing_functions: [...ALLOWED_FUNCTIONS].sort(), rds_identifiers: [], resource_count: 0 };
}

function emptyTopology(code = "AWS_NOT_READ") {
  return projectTopology({
    cloudfront: { status: "ERROR", error_code: code, complete: false, api_path_behaviors: [], logging_enabled: null, separate_from_http_api: false },
    httpApi: { status: "ERROR", error_code: code, complete: false, api_id: null, protocol_type: null, api_endpoint_host_sha256: null, api_endpoint_port: null, routes: [], integrations: [], stages: [], targets_expected_api: false, separate_from_cloudfront_legacy_origin: false },
    eventBridge: { status: "ERROR", error_code: code, complete: false, schedule_expression: null, state: null, targets: [], targets_expected_api: false, retry_policy: null },
    asyncInvoke: { status: "ERROR", error_code: code, complete: false, maximum_event_age_seconds: null, maximum_retry_attempts: null, destination_config_present: false },
    metrics: [],
  });
}

function emptyAlarms(code = "AWS_NOT_READ") {
  return { status: "ERROR", error_code: code, complete: false, alarm_count: 0, states: {}, alarms: [] };
}

function emptyRds(code = "AWS_NOT_READ") {
  return { status: "ERROR", error_code: code, complete: false, identifiers: [], instances: [], clusters: [] };
}

function firstFailure(current, code) {
  return current ?? code ?? null;
}

function safeErrorCode(error, fallback) {
  const candidate = typeof error?.code === "string" ? error.code : typeof error?.message === "string" ? error.message : "";
  return /^(?:AWS|ROLLBACK)_[A-Z0-9_]+$|^E[A-Z0-9_]+$/u.test(candidate) ? candidate : fallback;
}

function fixedFunctionNames(value) {
  const requested = [...(value ?? ALLOWED_FUNCTIONS)];
  const sorted = [...requested].sort();
  const approved = [...ALLOWED_FUNCTIONS].sort();
  if (requested.length !== approved.length || new Set(requested).size !== approved.length || sorted.join("\n") !== approved.join("\n")) throw new Error(`functions must exactly match the approved allowlist: ${approved.join(", ")}`);
  return approved;
}

function fixedRdsIdentifiers(value) {
  if (!Array.isArray(value)) throw new TypeError("rdsIdentifiers must be an array of exact non-secret identifiers");
  const identifiers = value.map((identifier) => requiredString(identifier, "rds identifier"));
  if (new Set(identifiers).size !== identifiers.length) throw new Error("rdsIdentifiers may not contain duplicate identifiers");
  identifiers.sort();
  if (identifiers.some((identifier) => !/^[A-Za-z][A-Za-z0-9-]{0,62}$/u.test(identifier))) throw new Error("rdsIdentifiers must contain exact AWS RDS identifiers only");
  return identifiers;
}

function mandatoryAbsolute(value, label) {
  const result = requiredString(value, label);
  if (!path.isAbsolute(result)) throw new Error(`${label} must be absolute`);
  return result;
}

function projectIdentity(response) {
  const account = typeof response?.Account === "string" ? response.Account : null;
  const arn = typeof response?.Arn === "string" ? response.Arn : null;
  const accountMatches = account === EXPECTED_ACCOUNT_ID;
  const roleMatches = Boolean(arn && ASSUMED_ROLE_PATTERN.test(arn));
  return {
    account_id: account,
    account_matches: accountMatches,
    readonly_role_matches: roleMatches,
    arn_sha256: arn ? sha256(arn) : null,
    user_id_sha256: typeof response?.UserId === "string" && response.UserId ? sha256(response.UserId) : null,
  };
}

function blockedEvidence({ reason, outcome = "BLOCKED_INCOMPLETE_READBACK", observedAt, profile, region, identity, selected, calls }) {
  return buildInventoryEvidence({ outcome, blockedReason: reason, observedAt, profile, region, identity, selected, cloudformation: emptyCloudFormation(reason), functions: selected.map(emptyFunctionRecord), topology: emptyTopology(reason), alarms: emptyAlarms(reason), rds: emptyRds(reason), calls });
}

export async function collectOutlookProductionAwsInventory({
  profile,
  region,
  functions = ALLOWED_FUNCTIONS,
  execute = createAwsCliExecutor(),
  observedAt = new Date().toISOString(),
  lookbackMinutes = 60,
  maxLogEvents = 50,
  cloudformationStacks = ["lawos-production"],
  httpApiId,
  cloudfrontDistributionId,
  eventbridgeRuleName,
  rdsIdentifiers = [],
  readOnly = true,
  rollbackDir,
  download = async (url, { signal } = {}) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("ROLLBACK_DOWNLOAD_FAILED");
    return Buffer.from(await response.arrayBuffer());
  },
} = {}) {
  const explicitProfile = requiredString(profile, "profile");
  const explicitRegion = requiredString(region, "region");
  if (explicitRegion !== EXPECTED_REGION) throw new Error("region must be exactly ap-northeast-2");
  if (readOnly !== true) throw new Error("AWS inventory requires readOnly=true");
  const selected = fixedFunctionNames(functions);
  const explicitRollbackDir = mandatoryAbsolute(rollbackDir, "rollbackDir");
  const explicitHttpApiId = requiredString(httpApiId, "httpApiId");
  const explicitCloudfrontId = requiredString(cloudfrontDistributionId, "cloudfrontDistributionId");
  const explicitEventRule = requiredString(eventbridgeRuleName, "eventbridgeRuleName");
  const explicitRdsIdentifiers = fixedRdsIdentifiers(rdsIdentifiers);
  if (!Array.isArray(cloudformationStacks) || cloudformationStacks.length !== EXPECTED_CLOUDFORMATION_STACKS.length || cloudformationStacks.join("\n") !== EXPECTED_CLOUDFORMATION_STACKS.join("\n")) throw new Error("cloudformationStacks must be exactly lawos-production");
  if (!Number.isInteger(lookbackMinutes) || lookbackMinutes < 1 || lookbackMinutes > 1440) throw new RangeError("lookbackMinutes must be between 1 and 1440");
  if (!Number.isInteger(maxLogEvents) || maxLogEvents < 1 || maxLogEvents > 1000) throw new RangeError("maxLogEvents must be between 1 and 1000");
  const calls = [];
  let blockedReason = null;
  const note = (code) => { blockedReason = firstFailure(blockedReason, code); };
  const run = async (request) => readOnlyCall(execute, { ...request, profile: explicitProfile, region: explicitRegion }, calls);
  let identityResponse;
  try {
    const identityResult = await run({ service: "sts", operation: "get-caller-identity", args: [] });
    if (!identityResult.ok) {
      const reason = identityResult.error_code;
      return blockedEvidence({ reason, outcome: isAwsAuthFailure({ code: reason }) ? "BLOCKED_PENDING_AWS_AUTH" : "BLOCKED_INCOMPLETE_READBACK", observedAt, profile: explicitProfile, region: explicitRegion, identity: null, selected, calls });
    }
    identityResponse = identityResult.value;
    const identity = projectIdentity(identityResponse);
    if (!identity.account_matches) return blockedEvidence({ reason: "AWS_ACCOUNT_MISMATCH", observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, calls });
    if (!identity.readonly_role_matches) return blockedEvidence({ reason: "AWS_READONLY_ROLE_MISMATCH", observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, calls });
  } catch (error) {
    const reason = error?.code ?? "AWS_SSO_SESSION_EXPIRED";
    return blockedEvidence({ reason, outcome: isAwsAuthFailure(error) ? "BLOCKED_PENDING_AWS_AUTH" : "BLOCKED_INCOMPLETE_READBACK", observedAt, profile: explicitProfile, region: explicitRegion, identity: null, selected, calls });
  }
  const identity = projectIdentity(identityResponse);
  let cloudformation = emptyCloudFormation();
  try {
    const templateResults = [];
    let templateFailure = null;
    for (const stackName of [...new Set(cloudformationStacks)].sort()) {
      const result = await run({ service: "cloudformation", operation: "get-template", args: ["--stack-name", stackName, "--template-stage", "Processed"], target: stackName });
      if (!result.ok) templateFailure = firstFailure(templateFailure, result.error_code);
      else templateResults.push(result);
    }
    cloudformation = templateFailure ? emptyCloudFormation(templateFailure) : projectCloudFormationTemplate(templateResults, selected);
    if (!cloudformation.complete) note(cloudformation.error_code);
  } catch (error) {
    if (isAwsAuthFailure(error)) return blockedEvidence({ reason: error.code, outcome: "BLOCKED_PENDING_AWS_AUTH", observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, calls });
    const reason = safeErrorCode(error, "AWS_CLOUDFORMATION_TEMPLATE_INVALID");
    note(reason);
    cloudformation = emptyCloudFormation(reason);
  }
  const expectedKeys = Object.fromEntries(selected.map((name) => [name, cloudformation.function_keys?.[name] ? { ...cloudformation.function_keys[name], complete: cloudformation.complete } : { expected_keys: [], logical_id: null, complete: false }]));
  const functionRecords = [];
  try {
    functionRecords.push(...await collectFunctionRecords({ selected, run, expectedKeys, observedAt, lookbackMinutes, maxLogEvents, rollbackDir: explicitRollbackDir, download, note, repoRoot: AUTHORITATIVE_REPO_ROOT }));
  } catch (error) {
    if (isAwsAuthFailure(error)) return buildInventoryEvidence({ outcome: "BLOCKED_PENDING_AWS_AUTH", blockedReason: error.code, observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, cloudformation, functions: functionRecords.concat(selected.slice(functionRecords.length).map(emptyFunctionRecord)), topology: emptyTopology(error.code), alarms: emptyAlarms(error.code), rds: emptyRds(error.code), calls });
    note(safeErrorCode(error, "AWS_FUNCTION_READ_FAILED"));
  }
  const observedFunctionNames = new Set(functionRecords.map((row) => row.name));
  for (const name of selected) if (!observedFunctionNames.has(name)) functionRecords.push(emptyFunctionRecord(name));
  let alarms = emptyAlarms();
  try {
    const alarmResult = await run({ service: "cloudwatch", operation: "describe-alarms", args: ["--max-records", "100"] });
    alarms = projectAlarms(alarmResult.ok ? alarmResult.value : null, alarmResult.ok ? null : alarmResult.error_code, 100);
    if (!alarms.complete) note(alarms.error_code);
  } catch (error) {
    if (isAwsAuthFailure(error)) return buildInventoryEvidence({ outcome: "BLOCKED_PENDING_AWS_AUTH", blockedReason: error.code, observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, cloudformation, functions: functionRecords, topology: emptyTopology(error.code), alarms: emptyAlarms(error.code), rds: emptyRds(error.code), calls });
    note(safeErrorCode(error, "AWS_ALARMS_READ_FAILED"));
  }
  const identifiers = [...new Set([...explicitRdsIdentifiers, ...(cloudformation.rds_identifiers ?? [])])].sort();
  let rds = emptyRds("AWS_RDS_IDENTIFIER_UNRESOLVED");
  if (identifiers.length) {
    try {
      rds = await collectRdsInventory({ identifiers, run, note });
    } catch (error) {
      if (isAwsAuthFailure(error)) return buildInventoryEvidence({ outcome: "BLOCKED_PENDING_AWS_AUTH", blockedReason: error.code, observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, cloudformation, functions: functionRecords, topology: emptyTopology(error.code), alarms, rds: emptyRds(error.code), calls });
      const reason = safeErrorCode(error, "AWS_RDS_READ_FAILED");
      note(reason);
      rds = { status: "ERROR", error_code: reason, complete: false, identifiers, instances: [], clusters: [] };
    }
  } else note("AWS_RDS_IDENTIFIER_UNRESOLVED");
  let topology = emptyTopology("AWS_TOPOLOGY_IDS_UNRESOLVED");
  try {
    topology = await collectTopologyInventory({ httpApiId: explicitHttpApiId, cloudfrontDistributionId: explicitCloudfrontId, eventbridgeRuleName: explicitEventRule, identifiers, region: explicitRegion, observedAt, lookbackMinutes, run, note });
  } catch (error) {
    if (isAwsAuthFailure(error)) return buildInventoryEvidence({ outcome: "BLOCKED_PENDING_AWS_AUTH", blockedReason: error.code, observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, cloudformation, functions: functionRecords, topology: emptyTopology(error.code), alarms, rds, calls });
    note(safeErrorCode(error, "AWS_TOPOLOGY_READ_FAILED"));
  }
  const outcome = blockedReason ? "BLOCKED_INCOMPLETE_READBACK" : "PASS";
  return buildInventoryEvidence({ outcome, blockedReason, observedAt, profile: explicitProfile, region: explicitRegion, identity, selected, cloudformation, functions: functionRecords, topology, alarms, rds, calls });
}

async function main() {
  const options = parseCliArguments();
  const evidence = await collectOutlookProductionAwsInventory(options);
  if (options.evidence) await writeInventoryEvidence(path.resolve(options.evidence), evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.outcome !== "PASS") process.exitCode = 2;
}

export {
  ALLOWED_FUNCTIONS,
  READ_ONLY_AWS_OPERATIONS,
  SCHEMA_VERSION,
  canonicalJson,
  configurationFingerprints,
  captureAuditorRollbackCode,
  createAwsCliExecutor,
  parseCliArguments,
  readInventoryEvidence,
  readVerifiedPrivateFile,
  readVerifiedPrivateZip,
  sha256,
  validateInventoryEvidence,
  verifyHeldZip,
  writeInventoryEvidence,
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH)) main().catch((error) => { process.stderr.write(`${error?.message ?? "AWS inventory collection failed"}\n`); process.exitCode = 1; });
