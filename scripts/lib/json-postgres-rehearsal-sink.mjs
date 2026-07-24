import { createHash } from "node:crypto";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_FUNCTION,
  JSON_POSTGRES_REHEARSAL_ROLE,
} from "./json-postgres-rehearsal-execution.mjs";

export const JSON_POSTGRES_REHEARSAL_SINK_RESULT_VERSION =
  "law-firm-os.json-postgres-rehearsal-sink-result.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const CHECK_KEYS = Object.freeze([
  "non_delivery_sink_verified",
  "external_recipient_denied",
  "individual_reset_delivery_disabled",
  "sink_audit_verified",
]);
const COUNT_KEYS = Object.freeze([
  "external_email_send_count",
  "real_recipient_count",
  "inspected_policy_count",
  "denied_action_count",
]);
const CLAIM_KEYS = Object.freeze([
  "live_send_attempted",
  "production_contacted",
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
]);
const KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "lambda_configuration_sha256",
  "role_policy_set_sha256",
  "simulation_result_sha256",
  "checks",
  "safe_counts",
  "claims",
  "result_sha256",
]);

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} schema is invalid`);
  }
}

function resultMaterial(value) {
  const { result_sha256: ignored, ...material } = value;
  return material;
}

export function createJsonPostgresRehearsalSinkResult({
  packet,
  lambdaConfiguration,
  rolePolicySet,
  simulationResults,
} = {}) {
  const environment =
    lambdaConfiguration?.Environment?.Variables ?? {};
  const statements = (rolePolicySet ?? []).flatMap((policy) =>
    policy?.Statement ?? []);
  const sesAllows = statements.filter((statement) => {
    const actions = Array.isArray(statement?.Action)
      ? statement.Action
      : [statement?.Action];
    return statement?.Effect === "Allow"
      && actions.some((action) =>
        /^ses:(?:\*|Send)/iu.test(String(action ?? "")));
  });
  const deliveryEnvironmentKeys = Object.keys(environment).filter((key) =>
    /(?:SES|SMTP|MAIL|EMAIL_(?:FROM|SENDER|RECIPIENT))/iu.test(key));
  if (lambdaConfiguration?.FunctionName
      !== JSON_POSTGRES_REHEARSAL_FUNCTION
    || lambdaConfiguration?.Role
      !== `arn:aws:iam::${JSON_POSTGRES_REHEARSAL_ACCOUNT}:role/${JSON_POSTGRES_REHEARSAL_ROLE}`
    || lambdaConfiguration?.State !== "Active"
    || lambdaConfiguration?.LastUpdateStatus !== "Successful"
    || sesAllows.length !== 0
    || deliveryEnvironmentKeys.length !== 0
    || !Array.isArray(simulationResults)
    || simulationResults.length < 2
    || simulationResults.some((result) => (
      !["ses:SendEmail", "ses:SendRawEmail"].includes(
        result?.EvalActionName,
      )
      || result.EvalDecision === "allowed"
    ))) {
    fail("W12 non-delivery sink inspection failed");
  }
  const material = Object.freeze({
    schema_version: JSON_POSTGRES_REHEARSAL_SINK_RESULT_VERSION,
    outcome: "PASS",
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    packet_sha256: packet?.packet_sha256,
    lambda_configuration_sha256: digest({
      function_name: lambdaConfiguration.FunctionName,
      role: lambdaConfiguration.Role,
      state: lambdaConfiguration.State,
      last_update_status: lambdaConfiguration.LastUpdateStatus,
      environment_key_names: Object.keys(environment).sort(),
    }),
    role_policy_set_sha256: digest(rolePolicySet),
    simulation_result_sha256: digest(simulationResults.map((result) => ({
      action: result.EvalActionName,
      decision: result.EvalDecision,
    }))),
    checks: Object.freeze(Object.fromEntries(
      CHECK_KEYS.map((key) => [key, true]),
    )),
    safe_counts: Object.freeze({
      external_email_send_count: 0,
      real_recipient_count: 0,
      inspected_policy_count: rolePolicySet.length,
      denied_action_count: simulationResults.length,
    }),
    claims: Object.freeze({
      live_send_attempted: false,
      production_contacted: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  const result = Object.freeze({
    ...material,
    result_sha256: digest(material),
  });
  validateJsonPostgresRehearsalSinkResult(result, { packet });
  return result;
}

export function validateJsonPostgresRehearsalSinkResult(value = {}, {
  packet,
} = {}) {
  closed(value, KEYS, "W12 sink result");
  closed(value.checks, CHECK_KEYS, "W12 sink checks");
  closed(value.safe_counts, COUNT_KEYS, "W12 sink safe counts");
  closed(value.claims, CLAIM_KEYS, "W12 sink claims");
  if (value.schema_version
      !== JSON_POSTGRES_REHEARSAL_SINK_RESULT_VERSION
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || !SHA256.test(value.lambda_configuration_sha256 ?? "")
    || !SHA256.test(value.role_policy_set_sha256 ?? "")
    || !SHA256.test(value.simulation_result_sha256 ?? "")
    || Object.values(value.checks).some((item) => item !== true)
    || value.safe_counts.external_email_send_count !== 0
    || value.safe_counts.real_recipient_count !== 0
    || value.safe_counts.inspected_policy_count < 1
    || value.safe_counts.denied_action_count < 2
    || value.claims.live_send_attempted !== false
    || value.claims.production_contacted !== false
    || value.claims.raw_value_returned !== false
    || value.claims.pii_returned !== false
    || value.claims.secret_material_returned !== false
    || !SHA256.test(value.result_sha256 ?? "")
    || digest(resultMaterial(value)) !== value.result_sha256) {
    fail("W12 sink result failed or drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
  });
}
