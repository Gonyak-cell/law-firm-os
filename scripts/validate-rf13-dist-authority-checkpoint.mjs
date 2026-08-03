#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AuthorityCheckpointValidationError,
  authorizeAuthorityAction,
  buildAllBlockedTemplate,
  validateAuthorityCheckpoint,
} from "./lib/rf13-dist-authority-contract.mjs";

export {
  AuthorityCheckpointValidationError,
  authorizeAuthorityAction,
  buildAllBlockedTemplate,
  validateAuthorityCheckpoint,
} from "./lib/rf13-dist-authority-contract.mjs";
export {
  CANONICAL_OWNER_ROLES,
  CHECKPOINT_ID,
  REASON_CODES_BY_STATUS,
  SCHEMA_VERSION,
  STATUS_KEYS,
  STATUS_VALUES,
} from "./lib/rf13-dist-authority-contract.mjs";

function fail(code, message, details = {}) {
  throw new AuthorityCheckpointValidationError(code, message, details);
}

function parseArgs(argv) {
  const options = { checkpoint: undefined, action: undefined, expectedSourceSha: undefined, template: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (flag === "--template" || flag === "--print-template") {
      if (inlineValue !== undefined) fail("INVALID_ARGUMENT", "template option does not take a value");
      options.template = true;
      continue;
    }
    if (flag === "--checkpoint" || flag === "--file" || flag === "--path") {
      const value = inlineValue ?? argv[++index];
      if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", "an explicit checkpoint path is required");
      options.checkpoint = resolve(value);
      continue;
    }
    if (flag === "--source-sha" || flag === "--expected-source-sha") {
      const value = inlineValue ?? argv[++index];
      if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", "an explicit source SHA is required");
      options.expectedSourceSha = value;
      continue;
    }
    if (flag === "--action") {
      const value = inlineValue ?? argv[++index];
      if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", "--action requires an authority status key");
      options.action = value;
      continue;
    }
    if (argument.startsWith("--")) fail("INVALID_ARGUMENT", "unknown validator option");
    fail("INVALID_ARGUMENT", "an explicit --checkpoint path is required");
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/validate-rf13-dist-authority-checkpoint.mjs --checkpoint PATH --source-sha SHA [--action STATUS]",
    "       node scripts/validate-rf13-dist-authority-checkpoint.mjs --template --source-sha SHA",
    "The checkpoint is a status inventory only. Any --action requires a separate authoritative approval validator and never executes a mutation.",
  ].join("\n");
}

export function runValidation({ checkpointPath, action, expectedSourceSha } = {}) {
  if (typeof checkpointPath !== "string" || checkpointPath.length === 0) {
    fail("INVALID_ARGUMENT", "an explicit checkpoint path is required");
  }
  if (typeof expectedSourceSha !== "string" || expectedSourceSha.length === 0) {
    fail("INVALID_ARGUMENT", "an explicit source SHA is required");
  }
  let raw;
  try {
    raw = readFileSync(checkpointPath, "utf8");
  } catch {
    fail("CHECKPOINT_READ_FAILED", "checkpoint could not be read");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("CHECKPOINT_JSON_INVALID", "checkpoint JSON is invalid");
  }
  const validated = validateAuthorityCheckpoint(parsed, { expectedSourceSha });
  const authorization = authorizeAuthorityAction(validated, action);
  return Object.freeze({
    validator: "rf13-dist-authority-checkpoint",
    verdict: "PASS",
    ...validated,
    ...authorization,
  });
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    if (typeof options.expectedSourceSha !== "string" || options.expectedSourceSha.length === 0) {
      fail("INVALID_ARGUMENT", "an explicit --source-sha is required");
    }
    if (options.template) {
      if (options.action !== undefined) fail("INVALID_ARGUMENT", "--template cannot be combined with --action");
      if (options.checkpoint) fail("INVALID_ARGUMENT", "--template does not accept --checkpoint");
      process.stdout.write(`${JSON.stringify(buildAllBlockedTemplate(options.expectedSourceSha), null, 2)}\n`);
      return 0;
    }
    if (!options.checkpoint) fail("INVALID_ARGUMENT", "an explicit --checkpoint is required");
    process.stdout.write(`${JSON.stringify(runValidation({
      checkpointPath: options.checkpoint,
      action: options.action,
      expectedSourceSha: options.expectedSourceSha,
    }), null, 2)}\n`);
    return 0;
  } catch (error) {
    const details = error instanceof AuthorityCheckpointValidationError ? error.details : {};
    process.stderr.write(`${JSON.stringify({
      validator: "rf13-dist-authority-checkpoint",
      verdict: "FAIL",
      code: error.code ?? "CHECKPOINT_VALIDATION_FAILED",
      message: error instanceof AuthorityCheckpointValidationError ? error.message : "checkpoint validation failed",
      details,
    })}\n`);
    return 1;
  }
}

function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

const executablePath = process.argv[1];
if (executablePath === undefined) {
  process.stderr.write(`${JSON.stringify({
    validator: "rf13-dist-authority-checkpoint",
    verdict: "FAIL",
    code: "ENTRYPOINT_PATH_MISSING",
    message: "validator executable path is unavailable",
    details: {},
  })}\n`);
  process.exitCode = 1;
} else {
  const isMain = canonicalPath(executablePath) === canonicalPath(fileURLToPath(import.meta.url));
  if (isMain) process.exitCode = main();
}
