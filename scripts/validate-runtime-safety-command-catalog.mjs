#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { buildRuntimeSafetyRerunManifest } from "./lib/runtime-safety-command-catalog.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  const catalogPath = value("--catalog") ?? ".omo/plans/lawos-runtime-safety-147-command-catalog-20260717.md";
  const expectedSha256 = value("--expected-sha256");
  const output = value("--output");
  const compareManifest = value("--manifest");
  const manifest = buildRuntimeSafetyRerunManifest(readFileSync(catalogPath, "utf8"), { expectedSha256 });
  if (value("--expected-tuws") && manifest.tuw_count !== Number(value("--expected-tuws"))) throw new Error("unexpected TUW count");
  if (value("--expected-legacy") && manifest.historical_tuw_count !== Number(value("--expected-legacy"))) throw new Error("unexpected historical TUW count");
  if (value("--expected-post-legacy") && manifest.post_legacy_tuw_count !== Number(value("--expected-post-legacy"))) throw new Error("unexpected post-legacy TUW count");
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  if (compareManifest && readFileSync(compareManifest, "utf8") !== bytes) throw new Error("materialized manifest drifted from the catalog");
  if (output) writeFileSync(output, bytes, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", catalog_sha256: manifest.catalog_sha256, tuw_count: manifest.tuw_count, historical_tuw_count: manifest.historical_tuw_count, post_legacy_tuw_count: manifest.post_legacy_tuw_count, selector_count: manifest.selectors.length }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "CATALOG", message: error.message })}\n`);
  process.exit(1);
}
