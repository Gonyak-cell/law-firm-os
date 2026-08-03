#!/usr/bin/env node
import path from "node:path";

import {
  FormalDeployedApiQaError,
  readFormalDeployedApiPackageQaReceipt,
} from "./lib/formal-deployed-api-package-qa.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new FormalDeployedApiQaError("FORMAL_DEPLOYED_API_QA_ARGUMENT", `${name} is required`);
  return value;
}

try {
  const { validation } = readFormalDeployedApiPackageQaReceipt(option("--receipt"), { rootDir: ROOT });
  process.stdout.write(`${JSON.stringify({
    verdict: validation.verdict,
    code_readiness: validation.code_readiness,
    actual_deployment_pass: validation.actual_deployment_pass,
    execution_classification: validation.execution_classification,
    source_revision: validation.source_revision,
    source_tree: validation.source_tree,
    artifact_sha256: validation.artifact_sha256,
    manifest_sha256: validation.manifest_sha256,
    api_endpoint_sha256: validation.api_endpoint_sha256,
    receipt_sha256: validation.receipt_sha256,
  }, null, 2)}\n`);
  if (validation.actual_deployment_pass !== true) process.exitCode = 2;
} catch (error) {
  const authorityBlocked = error?.code === "FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY";
  process.stderr.write(`${JSON.stringify({
    verdict: authorityBlocked ? "BLOCKED_BY_AUTHORITY" : "FAIL",
    error_code: error?.code ?? "FORMAL_DEPLOYED_API_QA_RECEIPT_INVALID",
    message: error instanceof FormalDeployedApiQaError ? error.message : "formal deployed API QA receipt validation failed",
    actual_deployment_pass: false,
  })}\n`);
  process.exitCode = authorityBlocked ? 2 : 1;
}
