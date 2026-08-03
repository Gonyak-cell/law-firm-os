#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createProfileHttpAdapter } from "./lib/profile-media-api-smoke.mjs";
import { ProfileMediaEvidenceError } from "./lib/profile-media-evidence-shared.mjs";
import { runProfileMediaOperabilityMeasurement } from "./lib/profile-media-measurement.mjs";

function parseArgs(argv) {
  const options = { execute: false, test_only: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--execute" || flag === "--test-only") {
      if (seen.has(flag)) throw new Error("duplicate execute flag");
      if (flag === "--execute") options.execute = true;
      else options.test_only = true;
      seen.add(flag);
      continue;
    }
    if (!["--root", "--change-ref", "--base-url", "--desktop-install-marker", "--receipt"].includes(flag) || seen.has(flag)) {
      throw new Error("invalid measurement argument");
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error("missing measurement argument value");
    const key = flag.slice(2).replaceAll("-", "_");
    options[key] = ["root", "desktop_install_marker", "receipt"].includes(key) ? resolve(value) : value;
    seen.add(flag);
  }
  if (!options.root || !options.change_ref || !options.receipt) throw new Error("root, change ref, and receipt are required");
  if (!options.test_only) throw Object.assign(new Error("production capability unavailable"), { code: "PRODUCTION_CAPABILITY_UNAVAILABLE" });
  if (options.execute && (!options.base_url || !options.desktop_install_marker)) throw new Error("execute requires base URL and desktop install marker");
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const parsed = parseArgs(argv);
    const sessionTokens = parsed.execute
      ? Array.from({ length: 10 }, (_, index) => process.env[`LAWOS_PROFILE_SESSION_${String(index + 1).padStart(2, "0")}`])
      : [];
    const result = await runProfileMediaOperabilityMeasurement({
      root: parsed.root,
      changeRef: parsed.change_ref,
      testOnly: parsed.test_only,
      receiptPath: parsed.receipt,
      repoRoot: process.cwd(),
      execute: parsed.execute,
      readProfile: parsed.execute ? createProfileHttpAdapter({ baseUrl: parsed.base_url, sessionTokens }) : undefined,
      desktopMarkerPath: parsed.execute ? parsed.desktop_install_marker : undefined,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      runner: "profile-media-operability-measurement",
      verdict: "FAIL",
      code: error instanceof ProfileMediaEvidenceError || /^[A-Z0-9_]+$/u.test(error?.code ?? "")
        ? error.code
        : "PROFILE_MEDIA_MEASUREMENT_FAILED",
      receipt_written: false,
      private_values_emitted: false,
      success_claimed: false,
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
