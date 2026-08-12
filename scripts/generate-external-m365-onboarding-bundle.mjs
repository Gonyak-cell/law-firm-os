#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateExternalM365OnboardingBundle,
  writeExternalM365OnboardingBundle,
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
  const inputPath = option("--input");
  const manifestPath = option("--manifest", "apps/addin/manifest.production.xml");
  const outputPath = option("--output");
  const markdownPath = option("--markdown", null);
  if (!inputPath || !outputPath) throw new TypeError("--input and --output are required");

  const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
  const manifestBytes = await readFile(path.resolve(manifestPath));
  const bundle = await generateExternalM365OnboardingBundle({
    input,
    manifestBytes,
    repoRoot,
  });
  const written = await writeExternalM365OnboardingBundle(
    bundle,
    path.resolve(outputPath),
    markdownPath ? path.resolve(markdownPath) : null,
  );
  process.stdout.write(`${JSON.stringify({
    schema_version: bundle.schema_version,
    output_path: written.outputPath,
    markdown_path: written.markdownPath,
    bundle_sha256: written.sha256,
    manifest_sha256: bundle.manifest.sha256,
    provider_calls: bundle.no_provider_calls ? 0 : null,
    external_mutations: bundle.external_mutations,
    appsource_claim: bundle.appsource_claim,
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
