#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ProfileMediaEvidenceError,
} from "./lib/profile-media-evidence-shared.mjs";
import { runProfileProductionApiSmoke } from "./lib/profile-production-api-smoke.mjs";

const REPO_ROOT = realpathSync(fileURLToPath(new URL("../", import.meta.url)));

function parseArgs(argv) {
  const options = { execute: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--execute") {
      if (seen.has(flag)) throw new Error("invalid profile smoke argument");
      options.execute = true;
      seen.add(flag);
      continue;
    }
    if (!["--base-url", "--profile-photo-manifest", "--artifact-manifest", "--receipt"].includes(flag)
      || seen.has(flag)) throw new Error("invalid profile smoke argument");
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error("missing profile smoke argument value");
    const key = flag.slice(2).replaceAll("-", "_");
    options[key] = key === "base_url" ? value : resolve(value);
    seen.add(flag);
  }
  if (!options.base_url || !options.profile_photo_manifest
    || !options.artifact_manifest || !options.receipt) {
    throw new Error("profile smoke inputs are required");
  }
  return options;
}

function exactGitSource(repoRoot) {
  const git = (...args) => execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  const status = () => git("status", "--porcelain=v1", "--untracked-files=all");
  if (status()) {
    throw new Error("profile production smoke requires a clean exact-source worktree");
  }
  const sha = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  if (status() || git("rev-parse", "HEAD") !== sha || git("rev-parse", "HEAD^{tree}") !== tree) {
    throw new Error("profile production smoke source changed during exact-source resolution");
  }
  return Object.freeze({ sha, tree });
}

export async function main(argv = process.argv.slice(2), testDependencies = {}) {
  const stdout = testDependencies.stdout ?? process.stdout;
  const stderr = testDependencies.stderr ?? process.stderr;
  try {
    const parsed = parseArgs(argv);
    if (testDependencies.nodeVersion === undefined && !/^22\./u.test(process.versions.node)) {
      throw new Error("profile production smoke requires Node.js 22");
    }
    const repoRoot = testDependencies.repoRoot ?? REPO_ROOT;
    const env = testDependencies.env ?? process.env;
    const result = await runProfileProductionApiSmoke({
      execute: parsed.execute,
      baseUrl: parsed.base_url,
      privateManifestPath: parsed.profile_photo_manifest,
      artifactManifestPath: parsed.artifact_manifest,
      receiptPath: parsed.receipt,
      repoRoot,
      source: testDependencies.source ?? exactGitSource(repoRoot),
      sessionTokens: parsed.execute
        ? Array.from({ length: 10 }, (_, index) =>
          env[`LAWOS_PROFILE_SESSION_${String(index + 1).padStart(2, "0")}`])
        : [],
      fetchImpl: testDependencies.fetchImpl,
      nodeVersion: testDependencies.nodeVersion,
      now: testDependencies.now,
    });
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify({
      runner: "profile-production-api-smoke",
      verdict: "FAIL",
      code: error instanceof ProfileMediaEvidenceError
        ? error.code
        : "PROFILE_PRODUCTION_SMOKE_FAILED",
      receipt_written: false,
      private_values_emitted: false,
      success_claimed: false,
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
