#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  buildJsonPostgresProductionTemplate,
  validateJsonPostgresProductionTemplate,
} from "./lib/json-postgres-production-infrastructure.mjs";
import {
  assertJsonPostgresProductionCaller,
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  JSON_POSTGRES_PRODUCTION_STACK,
} from "./lib/json-postgres-production-execution.mjs";
import {
  createPrivateProgramOutputDirectory,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const SCHEMA =
  "law-firm-os.json-postgres-external-read-readiness-inspection.v1";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : stableJson(value),
  ).digest("hex");
}

function mapDiff(before = {}, after = {}) {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  return Object.freeze({
    added: [...afterKeys].filter((key) => !beforeKeys.has(key)).sort(),
    removed: [...beforeKeys].filter((key) => !afterKeys.has(key)).sort(),
    changed: [...beforeKeys].filter((key) =>
      afterKeys.has(key) && stableJson(before[key]) !== stableJson(after[key]))
      .sort(),
  });
}

function stackMap(rows = [], keyName, valueName) {
  const result = {};
  for (const row of rows) {
    const key = row?.[keyName];
    if (typeof key !== "string" || !key || Object.hasOwn(result, key)) {
      fail("EXTERNAL_READ_READINESS_STACK_ROWS", "stack rows are ambiguous");
    }
    result[key] = row[valueName];
  }
  return result;
}

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function inspectExternalReadReadiness({
  liveTemplate,
  candidateTemplate,
  stack,
  sourceSha,
  sourceTree,
  awsReadCount,
} = {}) {
  if (!liveTemplate || typeof liveTemplate !== "object"
      || Array.isArray(liveTemplate)
      || !candidateTemplate || typeof candidateTemplate !== "object"
      || Array.isArray(candidateTemplate)
      || stack?.StackName !== JSON_POSTGRES_PRODUCTION_STACK
      || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")
      || !/^[a-f0-9]{40}$/u.test(sourceSha ?? "")
      || !/^[a-f0-9]{40}$/u.test(sourceTree ?? "")
      || !Number.isSafeInteger(awsReadCount)
      || awsReadCount !== 3) {
    fail("EXTERNAL_READ_READINESS_INPUT", "readiness input is invalid");
  }
  const parameters = stackMap(
    stack.Parameters,
    "ParameterKey",
    "ParameterValue",
  );
  const outputs = stackMap(stack.Outputs, "OutputKey", "OutputValue");
  const providerParameter = parameters.EnableExternalReadProviders;
  const providerOutput = outputs.ExternalReadProvidersEnabled;
  if (providerParameter === "true" || providerOutput === "true") {
    fail(
      "EXTERNAL_READ_PROVIDER_ENABLED",
      "external read providers must remain disabled",
    );
  }
  const providerParameterPresent = providerParameter != null;
  const providerOutputPresent = providerOutput != null;
  const providerPackNamePresent =
    parameters.ExternalReadProviderPackSecretName != null;
  const providerPackShaPresent =
    parameters.ExternalReadProviderPackSha256 != null;
  const anyProviderParameterPresent = providerParameterPresent
    || providerPackNamePresent || providerPackShaPresent;
  const allProviderParametersPresent = providerParameterPresent
    && providerPackNamePresent && providerPackShaPresent;
  if ((anyProviderParameterPresent && !allProviderParametersPresent)
      || (providerParameterPresent && providerParameter !== "false")
      || (providerOutputPresent && providerOutput !== "false")
      || (providerParameterPresent && (
        parameters.ExternalReadProviderPackSecretName
          !== JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME
        || parameters.ExternalReadProviderPackSha256
          !== JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256
      ))) {
    fail(
      "EXTERNAL_READ_DISABLED_BINDING_DRIFT",
      "disabled provider parameters or output drifted",
    );
  }
  const sections = Object.fromEntries([
    "Resources",
    "Parameters",
    "Conditions",
    "Rules",
    "Outputs",
  ].map((key) => [key.toLowerCase(), mapDiff(
    liveTemplate[key],
    candidateTemplate[key],
  )]));
  const changeCount = Object.values(sections).reduce(
    (total, section) => total
      + section.added.length + section.removed.length + section.changed.length,
    0,
  );
  const metadataChanged = stableJson(liveTemplate.Metadata)
    !== stableJson(candidateTemplate.Metadata);
  const liveTemplateSha256 = sha256(liveTemplate);
  const candidateTemplateSha256 = sha256(candidateTemplate);
  const exactCandidate = liveTemplateSha256 === candidateTemplateSha256;
  const otherTopLevelChanged = !exactCandidate
    && changeCount === 0 && !metadataChanged;
  const readyDisabled = exactCandidate
    && providerParameter === "false"
    && providerOutput === "false";
  return Object.freeze({
    schema_version: SCHEMA,
    verdict: readyDisabled ? "PASS" : "BLOCKED",
    state: readyDisabled
      ? "READY_DISABLED"
      : "UPGRADE_REVIEW_REQUIRED",
    source_sha: sourceSha,
    source_tree: sourceTree,
    aws_account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    aws_region: JSON_POSTGRES_PRODUCTION_REGION,
    stack_name: JSON_POSTGRES_PRODUCTION_STACK,
    stack_status: stack.StackStatus,
    live_template_sha256: liveTemplateSha256,
    candidate_template_sha256: candidateTemplateSha256,
    template_change_count: changeCount + Number(metadataChanged)
      + Number(otherTopLevelChanged),
    metadata_changed: metadataChanged,
    other_top_level_changed: otherTopLevelChanged,
    sections,
    provider_parameter_present: providerParameterPresent,
    provider_output_present: providerOutputPresent,
    provider_enabled: false,
    exact_candidate_template: exactCandidate,
    aws_read_count: awsReadCount,
    aws_write_count: 0,
    secret_value_read_count: 0,
    change_set_created: false,
    deployment_performed: false,
    production_ready_claim: false,
  });
}

function parseOptions(argv) {
  if (argv.length !== 2 || argv[0] !== "--output-dir" || !argv[1]) {
    fail(
      "EXTERNAL_READ_READINESS_OPTION",
      "exactly one --output-dir is required",
    );
  }
  return { outputDir: argv[1] };
}

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

export function runExternalReadReadinessInspection(argv = process.argv.slice(2)) {
  const { outputDir } = parseOptions(argv);
  const root = realpathSync(process.cwd());
  if (realpathSync(git(root, "rev-parse", "--show-toplevel")) !== root
      || git(root, "status", "--porcelain=v1", "--untracked-files=all")) {
    fail(
      "EXTERNAL_READ_READINESS_GIT_STATE",
      "inspection requires a clean exact repository root",
    );
  }
  const privateDir = createPrivateProgramOutputDirectory(outputDir, {
    worktree: root,
  });
  let awsReadCount = 0;
  const awsJson = (args) => {
    awsReadCount += 1;
    const output = execFileSync("aws", [
      ...args,
      "--profile", JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE,
      "--region", JSON_POSTGRES_PRODUCTION_REGION,
      "--no-cli-pager",
      "--output", "json",
    ], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return JSON.parse(output);
  };
  const caller = assertJsonPostgresProductionCaller(
    awsJson(["sts", "get-caller-identity"]),
    { role: JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE },
  );
  const stack = awsJson([
    "cloudformation", "describe-stacks",
    "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
  ]).Stacks?.[0];
  const liveTemplateResponse = awsJson([
    "cloudformation", "get-template",
    "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
    "--template-stage", "Original",
  ]);
  let liveTemplate = liveTemplateResponse.TemplateBody;
  if (typeof liveTemplate === "string") {
    try {
      liveTemplate = JSON.parse(liveTemplate);
    } catch {
      fail(
        "EXTERNAL_READ_READINESS_TEMPLATE_FORMAT",
        "live template must be an exact JSON object",
      );
    }
  }
  const staging = JSON.parse(readFileSync(
    join(root, "infra/lawos-private-staging/template.json"),
    "utf8",
  ));
  const candidateTemplate = buildJsonPostgresProductionTemplate(staging);
  validateJsonPostgresProductionTemplate(candidateTemplate);
  const receipt = inspectExternalReadReadiness({
    liveTemplate,
    candidateTemplate,
    stack,
    sourceSha: git(root, "rev-parse", "HEAD"),
    sourceTree: git(root, "rev-parse", "HEAD^{tree}"),
    awsReadCount,
  });
  const file = writePrivateProgramJson(
    join(privateDir, "external-read-readiness.json"),
    { ...receipt, caller },
  );
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    state: receipt.state,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    live_template_sha256: receipt.live_template_sha256,
    candidate_template_sha256: receipt.candidate_template_sha256,
    template_change_count: receipt.template_change_count,
    sections: receipt.sections,
    provider_enabled: false,
    aws_read_count: receipt.aws_read_count,
    aws_write_count: 0,
    secret_value_read_count: 0,
    receipt_sha256: file.sha256,
    change_set_created: false,
    deployment_performed: false,
    production_ready_claim: false,
  }, null, 2)}\n`);
  if (receipt.verdict !== "PASS") process.exitCode = 2;
}

if (process.argv[1]
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runExternalReadReadinessInspection();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verdict: "BLOCKED",
      failure_code: String(
        error?.code ?? "EXTERNAL_READ_READINESS_FAILED",
      ).replace(/[^A-Za-z0-9_.:-]/gu, "_").slice(0, 96),
      aws_write_count: 0,
      secret_value_read_count: 0,
      change_set_created: false,
      deployment_performed: false,
      raw_error_returned: false,
      production_ready_claim: false,
    })}\n`);
    process.exitCode = 1;
  }
}
