#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadExternalM365OnboardingContracts,
  validateExternalM365OnboardingBundle,
} from "./lib/external-m365-onboarding.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} requires a value`);
  return value;
}

async function main() {
  const bundlePath = option("--bundle");
  const manifestPath = option("--manifest", "apps/addin/manifest.production.xml");
  if (!bundlePath) throw new TypeError("--bundle is required");
  const bundle = JSON.parse(await readFile(path.resolve(bundlePath), "utf8"));
  const manifestBytes = await readFile(path.resolve(manifestPath));
  const contracts = await loadExternalM365OnboardingContracts(repoRoot);
  await validateExternalM365OnboardingBundle(bundle, { manifestBytes, repoRoot, contracts });
  process.stdout.write(`${JSON.stringify({
    schema_version: bundle.schema_version,
    local_validation_status: "VALID",
    handoff_status: "PENDING_EXTERNAL_VERIFICATION",
    external_success_claim: false,
    manifest_sha256: bundle.manifest.sha256,
    runtime_config_digest_sha256: bundle.target_runtime.config_digest_sha256,
    deployment_model: bundle.deployment_model,
    provider_calls: 0,
    external_mutations: 0,
    appsource_claim: false,
    checklist_status: bundle.checklist.every(({ status }) => status === "pending_external_verification")
      ? "PENDING_EXTERNAL_VERIFICATION"
      : "INVALID_LOCAL_BUNDLE",
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
