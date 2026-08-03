#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_EVIDENCE_DIR,
  Rf13BaselineError,
  validateRf13DebtRemediationBaseline,
} from "./lib/rf13-debt-remediation-baseline.mjs";
import { writeFile } from "node:fs/promises";

export {
  BASELINE_SCHEMA_VERSION,
  CAPTURE_SCHEMA_VERSION,
  CHECKPOINT_ID,
  Rf13BaselineError,
  validateNoPrivateMaterial,
  validateRf13DebtRemediationBaseline,
} from "./lib/rf13-debt-remediation-baseline.mjs";

function parseArgs(argv) {
  const options = { manifest: `${DEFAULT_EVIDENCE_DIR}/baseline-manifest.json`, strictCurrent: false, receipt: undefined };
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
    if (flag === "--manifest" || flag === "--baseline" || flag === "--file") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--manifest requires a path");
      options.manifest = value;
      continue;
    }
    if (flag === "--historical" || flag === "--historical-dir") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--historical requires a path");
      options.historical = value;
      continue;
    }
    if (flag === "--receipt") {
      const value = next();
      if (!value || value.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "--receipt requires a path");
      options.receipt = value;
      continue;
    }
    if (flag === "--strict-current") {
      if (inline !== undefined) throw new Rf13BaselineError("INVALID_ARGUMENT", "--strict-current does not take a value");
      options.strictCurrent = true;
      continue;
    }
    if (argument.startsWith("--")) throw new Rf13BaselineError("INVALID_ARGUMENT", "unknown validator option");
    throw new Rf13BaselineError("INVALID_ARGUMENT", "validator options must be named flags");
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-rf13-debt-remediation-baseline.mjs [--manifest PATH] [--historical DIR] [--receipt PATH]",
    "       [--strict-current]",
    "Stored capture authenticity is validated independently; later source changes are reported as current drift.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const result = validateRf13DebtRemediationBaseline({
      manifestPath: options.manifest,
      cwd: process.cwd(),
      historicalDir: options.historical,
      strictCurrent: options.strictCurrent,
    });
    if (options.receipt) {
      await writeFile(resolve(options.receipt), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    const isBaseline = error instanceof Rf13BaselineError;
    process.stderr.write(`${JSON.stringify({
      validator: "rf13-debt-remediation-baseline",
      verdict: "FAIL",
      code: isBaseline ? error.code : "BASELINE_VALIDATION_FAILED",
      message: isBaseline ? error.message : "baseline validation failed",
      details: isBaseline ? error.details : {},
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = await main();
