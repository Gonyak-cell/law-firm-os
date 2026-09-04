#!/usr/bin/env node
import { resolve } from "node:path";
import { prepareAmicInternalUnsignedPublication } from "./lib/amic-os-internal-distribution-preflight.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const publicationMode = option("--publication-mode");
if (!["baseline", "successor", "managed-bootstrap"].includes(publicationMode)) {
  throw new Error("--publication-mode must be baseline, successor, or managed-bootstrap");
}
if (publicationMode !== "successor"
    && (process.env.AMIC_INTERNAL_REVOCATIONS_DOCUMENT_B64
      || process.env.AMIC_INTERNAL_ROLLBACK_DOCUMENT_B64)) {
  throw new Error(`${publicationMode} preflight cannot include revocations or rollback authorization`);
}

const result = await prepareAmicInternalUnsignedPublication({
  repoRoot: process.cwd(),
  outputDir: resolve(option("--output-dir")),
  buildResultPath: resolve(option("--build-result")),
  rawSbomPath: resolve(option("--raw-sbom")),
  publicationMode,
  releaseBase64: requiredEnvironment("AMIC_INTERNAL_RELEASE_DOCUMENT_B64"),
  revocationsBase64: publicationMode === "successor"
    ? requiredEnvironment("AMIC_INTERNAL_REVOCATIONS_DOCUMENT_B64")
    : undefined,
  rollbackBase64: publicationMode === "successor"
    ? requiredEnvironment("AMIC_INTERNAL_ROLLBACK_DOCUMENT_B64")
    : undefined,
  bindings: {
    accountId: requiredEnvironment("AMIC_INTERNAL_AWS_ACCOUNT_ID"),
    region: requiredEnvironment("AMIC_INTERNAL_AWS_REGION"),
    bucket: requiredEnvironment("AMIC_INTERNAL_ARTIFACT_BUCKET"),
    accessLogBucket: requiredEnvironment("AMIC_INTERNAL_ACCESS_LOG_BUCKET"),
    kmsKeyArn: requiredEnvironment("AMIC_INTERNAL_ARTIFACT_KMS_KEY_ARN"),
    retainUntil: requiredEnvironment("AMIC_INTERNAL_RETAIN_UNTIL"),
  },
  runner: {
    repository: requiredEnvironment("GITHUB_REPOSITORY"),
    ref: requiredEnvironment("GITHUB_REF"),
    sha: requiredEnvironment("GITHUB_SHA"),
    workflowRef: requiredEnvironment("AMIC_INTERNAL_WORKFLOW_REF"),
    runId: requiredEnvironment("GITHUB_RUN_ID"),
    runAttempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
    environment: requiredEnvironment("RUNNER_ENVIRONMENT"),
  },
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
