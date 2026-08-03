#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_EVIDENCE_DIR,
  DEFAULT_GOAL_PATHS,
  DEFAULT_HISTORICAL_DIR,
  Rf13BaselineError,
  generateRf13DebtRemediationBaseline,
} from "./lib/rf13-debt-remediation-baseline.mjs";

export {
  BASELINE_SCHEMA_VERSION,
  CAPTURE_SCHEMA_VERSION,
  CHECKPOINT_ID,
  DEFAULT_EVIDENCE_DIR,
  DEFAULT_GOAL_PATHS,
  DEFAULT_HISTORICAL_DIR,
  GENERATOR_VERSION,
  Rf13BaselineError,
  captureStableRf13Source,
  generateRf13DebtRemediationBaseline,
  readRf13SourceSnapshot,
} from "./lib/rf13-debt-remediation-baseline.mjs";

function parseArgs(argv) {
  const options = {
    output: DEFAULT_EVIDENCE_DIR,
    historical: DEFAULT_HISTORICAL_DIR,
    goals: [],
    goalExplicit: false,
    maxAttempts: 3,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const equals = argument.indexOf("=");
    const flag = equals === -1 ? argument : argument.slice(0, equals);
    const inline = equals === -1 ? undefined : argument.slice(equals + 1);
    const next = () => inline ?? argv[++index];
    if (flag === "--output" || flag === "--output-dir") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--output requires a path");
      options.output = value;
      continue;
    }
    if (flag === "--historical" || flag === "--historical-dir") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--historical requires a path");
      options.historical = value;
      continue;
    }
    if (flag === "--goal") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--goal requires a repository-relative path");
      if (!options.goalExplicit) options.goals = [];
      options.goalExplicit = true;
      options.goals.push(value);
      continue;
    }
    if (flag === "--max-attempts") {
      const value = next();
      if (!value || value.startsWith("--") || !/^\d+$/u.test(value)) throw new Rf13BaselineError("INVALID_ARGUMENT", "--max-attempts requires an integer");
      options.maxAttempts = Number(value);
      continue;
    }
    if (argument.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "unknown capture option");
    throw new Rf13BaselineError("INVALID_ARGUMENT", "capture options must be named flags");
  }
  if (options.goals.length === 0) options.goals = [...DEFAULT_GOAL_PATHS];
  return options;
}

function usage() {
  return [
    "Usage: node scripts/capture-rf13-debt-remediation-baseline.mjs [--output DIR] [--historical DIR] [--max-attempts N]",
    "       [--goal REPOSITORY_RELATIVE_PATH]",
    "The generator reads git status/diff/source-manifest twice and writes only the explicit ignored evidence directory.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const result = await generateRf13DebtRemediationBaseline({
      cwd: process.cwd(),
      outputDir: options.output,
      historicalDir: options.historical,
      goalPaths: options.goals,
      maxAttempts: options.maxAttempts,
    });
    process.stdout.write(`${JSON.stringify({
      generator: "rf13-debt-remediation-baseline",
      checkpoint_id: result.baseline.checkpoint_id,
      verdict: result.baseline.verdict,
      manifest: resolve(result.manifestPath),
      attempts: result.baseline.capture.attempts,
      byte_equivalent: result.baseline.capture.byte_equivalent,
      historical_conflicts: result.baseline.historical_rf13.conflicts.length,
      formal_release_allowed: result.baseline.historical_rf13.formal_release_allowed,
    }, null, 2)}\n`);
    return 0;
  } catch (error) {
    const isBaseline = error instanceof Rf13BaselineError;
    process.stderr.write(`${JSON.stringify({
      generator: "rf13-debt-remediation-baseline",
      verdict: "FAIL",
      code: isBaseline ? error.code : "BASELINE_CAPTURE_FAILED",
      message: isBaseline ? error.message : "baseline capture failed",
      details: isBaseline ? error.details : {},
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
