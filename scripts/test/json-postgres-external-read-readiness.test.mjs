import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  buildJsonPostgresProductionTemplate,
} from "../lib/json-postgres-production-infrastructure.mjs";
import {
  inspectExternalReadReadiness,
} from "../inspect-json-postgres-external-read-readiness.mjs";

const candidate = buildJsonPostgresProductionTemplate(JSON.parse(
  readFileSync("infra/lawos-private-staging/template.json", "utf8"),
));
const source = {
  sourceSha: "a".repeat(40),
  sourceTree: "b".repeat(40),
  awsReadCount: 3,
};

function stack(overrides = {}) {
  return {
    StackName: "lawos-production",
    StackStatus: "UPDATE_COMPLETE",
    Parameters: [
      { ParameterKey: "EnableExternalReadProviders", ParameterValue: "false" },
      {
        ParameterKey: "ExternalReadProviderPackSecretName",
        ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
      },
      {
        ParameterKey: "ExternalReadProviderPackSha256",
        ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
      },
    ],
    Outputs: [{
      OutputKey: "ExternalReadProvidersEnabled",
      OutputValue: "false",
    }],
    ...overrides,
  };
}

test("readiness inspection passes only the exact deployed disabled candidate", () => {
  const result = inspectExternalReadReadiness({
    liveTemplate: structuredClone(candidate),
    candidateTemplate: candidate,
    stack: stack(),
    ...source,
  });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.state, "READY_DISABLED");
  assert.equal(result.template_change_count, 0);
  assert.equal(result.provider_enabled, false);
  assert.equal(result.aws_write_count, 0);
  assert.equal(result.secret_value_read_count, 0);
  assert.equal(result.production_ready_claim, false);
});

test("readiness inspection reports exact structural drift without approving it", () => {
  const live = structuredClone(candidate);
  delete live.Resources.ExternalReadSecretsPolicy;
  delete live.Parameters.EnableExternalReadProviders;
  delete live.Outputs.ExternalReadProvidersEnabled;
  live.Resources.ApiFunction.Properties.Timeout += 1;
  const result = inspectExternalReadReadiness({
    liveTemplate: live,
    candidateTemplate: candidate,
    stack: stack({ Parameters: [], Outputs: [] }),
    ...source,
  });
  assert.equal(result.verdict, "BLOCKED");
  assert.equal(result.state, "UPGRADE_REVIEW_REQUIRED");
  assert.deepEqual(result.sections.resources.added, [
    "ExternalReadSecretsPolicy",
  ]);
  assert.deepEqual(result.sections.resources.changed, ["ApiFunction"]);
  assert.deepEqual(result.sections.parameters.added, [
    "EnableExternalReadProviders",
  ]);
  assert.deepEqual(result.sections.outputs.added, [
    "ExternalReadProvidersEnabled",
  ]);
  assert.equal(result.change_set_created, false);
  assert.equal(result.deployment_performed, false);

  const descriptionOnly = structuredClone(candidate);
  descriptionOnly.Description = `${descriptionOnly.Description} drift`;
  const topLevel = inspectExternalReadReadiness({
    liveTemplate: descriptionOnly,
    candidateTemplate: candidate,
    stack: stack(),
    ...source,
  });
  assert.equal(topLevel.exact_candidate_template, false);
  assert.equal(topLevel.other_top_level_changed, true);
  assert.equal(topLevel.template_change_count, 1);
});

test("readiness inspection rejects enabled or ambiguously disabled providers", () => {
  assert.throws(
    () => inspectExternalReadReadiness({
      liveTemplate: candidate,
      candidateTemplate: candidate,
      stack: stack({
        Outputs: [{
          OutputKey: "ExternalReadProvidersEnabled",
          OutputValue: "true",
        }],
      }),
      ...source,
    }),
    (error) => error.code === "EXTERNAL_READ_PROVIDER_ENABLED",
  );
  const ambiguous = stack();
  ambiguous.Parameters.find((row) =>
    row.ParameterKey === "ExternalReadProviderPackSha256").ParameterValue =
      "c".repeat(64);
  assert.throws(
    () => inspectExternalReadReadiness({
      liveTemplate: candidate,
      candidateTemplate: candidate,
      stack: ambiguous,
      ...source,
    }),
    (error) => error.code === "EXTERNAL_READ_DISABLED_BINDING_DRIFT",
  );
  const duplicate = stack();
  duplicate.Outputs.push(duplicate.Outputs[0]);
  assert.throws(
    () => inspectExternalReadReadiness({
      liveTemplate: candidate,
      candidateTemplate: candidate,
      stack: duplicate,
      ...source,
    }),
    (error) => error.code === "EXTERNAL_READ_READINESS_STACK_ROWS",
  );
});

test("readiness CLI source contains only the three fixed AWS reads", () => {
  const cli = readFileSync(
    "scripts/inspect-json-postgres-external-read-readiness.mjs",
    "utf8",
  );
  for (const command of [
    '["sts", "get-caller-identity"]',
    '"cloudformation", "describe-stacks"',
    '"cloudformation", "get-template"',
  ]) assert.match(cli, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(
    cli,
    /create-change-set|execute-change-set|get-secret-value|put-object|update-stack/iu,
  );
});
