#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  cleanupRolledBackProfilePhotoChange,
  prepareProfilePhotoChange,
} from "./lib/profile-photo-server-operation.mjs";
import { ProfilePhotoOperationError } from "./lib/profile-photo-operation-root.mjs";

function parseArgs(argv) {
  const mode = argv[0];
  if (!["prepare", "cleanup-rolled-back"].includes(mode)) throw new ProfilePhotoOperationError("OPERATION_MODE_INVALID", "operation mode is invalid");
  const values = { mode, execute: false, testOnly: false };
  const seen = new Set();
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--execute" || flag === "--test-only") {
      if (seen.has(flag)) throw new ProfilePhotoOperationError("OPERATION_ARGUMENT_INVALID", "duplicate execute flag");
      if (flag === "--execute") values.execute = true;
      else values.testOnly = true;
      seen.add(flag);
      continue;
    }
    if (!["--root", "--change-ref"].includes(flag) || seen.has(flag)) {
      throw new ProfilePhotoOperationError("OPERATION_ARGUMENT_INVALID", "operation arguments are invalid");
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new ProfilePhotoOperationError("OPERATION_ARGUMENT_INVALID", "operation argument value is missing");
    values[flag === "--root" ? "root" : "changeRef"] = flag === "--root" ? resolve(value) : value;
    seen.add(flag);
  }
  if (!values.root || !values.changeRef) throw new ProfilePhotoOperationError("OPERATION_ARGUMENT_INVALID", "root and change ref are required");
  if (!values.testOnly) throw new ProfilePhotoOperationError("PRODUCTION_CAPABILITY_UNAVAILABLE", "source-tree operation runner is TEST_ONLY");
  return values;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    const result = options.mode === "prepare"
      ? prepareProfilePhotoChange(options)
      : cleanupRolledBackProfilePhotoChange(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      operation: "profile-photo-server-file-replacement",
      verdict: "FAIL",
      code: typeof error?.code === "string" && /^[A-Z0-9_]+$/u.test(error.code) ? error.code : "PROFILE_PHOTO_OPERATION_FAILED",
      mutation_state: "NO_SUCCESS_CLAIM",
      private_values_emitted: false,
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = main();
