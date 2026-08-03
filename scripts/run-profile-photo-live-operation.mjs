#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createProfileHttpAdapter } from "./lib/profile-media-api-smoke.mjs";
import {
  runLiveProfilePhotoPromotion,
  runLiveProfilePhotoRollback,
} from "./lib/profile-photo-live-operation.mjs";
import { runValidation } from "./validate-profile-media-operability-decision.mjs";

function parseArgs(argv) {
  const mode = argv[0];
  if (!["promote", "rollback"].includes(mode)) throw new Error("live operation mode is invalid");
  const options = { mode, execute: false, test_only: false };
  const seen = new Set();
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--execute" || flag === "--test-only") {
      if (seen.has(flag)) throw new Error("duplicate execute flag");
      if (flag === "--execute") options.execute = true;
      else options.test_only = true;
      seen.add(flag);
      continue;
    }
    if (!["--root", "--change-ref", "--base-url", "--desktop-install-marker", "--decision"].includes(flag) || seen.has(flag)) {
      throw new Error("live operation arguments are invalid");
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error("live operation argument value is missing");
    const key = flag.slice(2).replaceAll("-", "_");
    options[key] = ["root", "desktop_install_marker", "decision"].includes(key) ? resolve(value) : value;
    seen.add(flag);
  }
  if (!options.root || !options.change_ref) throw new Error("root and change ref are required");
  if (!options.test_only) throw Object.assign(new Error("production capability unavailable"), { code: "PRODUCTION_CAPABILITY_UNAVAILABLE" });
  if (options.execute && (!options.base_url || !options.desktop_install_marker || (mode === "promote" && !options.decision))) {
    throw new Error("execute requires API URL, desktop marker, and promotion decision");
  }
  return options;
}

function promotionAuthorization(decisionPath) {
  return () => {
    const result = runValidation({ decisionPath, repoRoot: process.cwd() });
    return result.verdict === "PASS" && result.choice === "defer_server_file";
  };
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const parsed = parseArgs(argv);
    const tokens = parsed.execute
      ? Array.from({ length: 10 }, (_, index) => process.env[`LAWOS_PROFILE_SESSION_${String(index + 1).padStart(2, "0")}`])
      : [];
    const common = {
      root: parsed.root,
      changeRef: parsed.change_ref,
      testOnly: parsed.test_only,
      execute: parsed.execute,
      readProfile: parsed.execute ? createProfileHttpAdapter({ baseUrl: parsed.base_url, sessionTokens: tokens }) : undefined,
      desktopMarkerPath: parsed.execute ? parsed.desktop_install_marker : undefined,
      authorize: parsed.mode === "promote" ? promotionAuthorization(parsed.decision) : () => true,
    };
    const result = parsed.mode === "promote"
      ? await runLiveProfilePhotoPromotion(common)
      : await runLiveProfilePhotoRollback(common);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      runner: "profile-photo-live-operation",
      verdict: "FAIL",
      code: typeof error?.code === "string" && /^[A-Z0-9_]+$/u.test(error.code) ? error.code : "PROFILE_PHOTO_LIVE_OPERATION_FAILED",
      success_claimed: false,
      private_values_emitted: false,
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
