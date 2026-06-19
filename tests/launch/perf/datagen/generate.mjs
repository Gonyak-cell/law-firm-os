#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSyntheticManifest,
  buildSampleRows,
  buildSyntheticManifest,
  loadSyntheticProfile
} from "../lib/synthetic-perf.mjs";

const args = process.argv.slice(2);
const hasManifestFlag = args.includes("--manifest");
const outIndex = args.indexOf("--out");
const outputDir = outIndex >= 0 ? resolve(args[outIndex + 1]) : null;
const profileIndex = args.indexOf("--profile");
const profilePath = profileIndex >= 0 ? resolve(args[profileIndex + 1]) : undefined;

const profile = loadSyntheticProfile(profilePath);
const manifest = buildSyntheticManifest(profile);
const assertion = assertSyntheticManifest(manifest);

if (!assertion.ok) {
  console.error(JSON.stringify({ ok: false, failures: assertion.failures }, null, 2));
  process.exit(1);
}

if (outputDir) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(outputDir, "samples.json"), `${JSON.stringify(buildSampleRows(profile), null, 2)}\n`);
}

if (hasManifestFlag || !outputDir) {
  console.log(JSON.stringify(manifest, null, 2));
}
