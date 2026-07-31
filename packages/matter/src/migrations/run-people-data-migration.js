import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { executePeopleDataMigration } from "../people-data-migration.js";
import { createMatterRepository } from "../repository.js";

function commandError(message) {
  const error = new Error(message);
  error.code = "MATTER_PEOPLE_MIGRATION_COMMAND_INVALID";
  return error;
}

function parseArguments(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw commandError(`unexpected argument: ${argument}`);
    const key = argument.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw commandError(`${argument} requires a value`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function readSnapshot(filePath) {
  if (!filePath) throw commandError("--snapshot is required");
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolve(filePath), "utf8"));
  } catch (error) {
    throw commandError(`unable to read source snapshot: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw commandError("source snapshot document must be an object");
  }
  return parsed;
}

export function runPeopleDataMigrationCommand(
  argv = process.argv.slice(2),
  { write = (value) => process.stdout.write(`${value}\n`) } = {},
) {
  const options = parseArguments(argv);
  const document = readSnapshot(options.snapshot);
  const mode = options.mode ?? "dry_run";
  const tenantId = options.tenant ?? document.tenant_id;
  const sourceSnapshot = document.source_snapshot ?? document;
  const sourceSnapshotId = options.source_snapshot_id ?? document.source_snapshot_id ?? null;
  const expectedSourceSnapshotHash = options.expected_hash
    ?? document.expected_source_snapshot_hash
    ?? document.source_snapshot_hash
    ?? null;

  if (mode === "dry_run") {
    const result = executePeopleDataMigration({
      tenant_id: tenantId,
      source_snapshot_id: sourceSnapshotId,
      source_snapshot: sourceSnapshot,
      expected_source_snapshot_hash: expectedSourceSnapshotHash,
      mode,
    });
    write(JSON.stringify(result, null, 2));
    return result;
  }
  if (mode !== "apply") throw commandError("--mode must be dry_run or apply");
  if (!options.store) throw commandError("--store is required for apply");

  const repository = createMatterRepository({ filePath: resolve(options.store) });
  try {
    const result = executePeopleDataMigration({
      repository,
      tenant_id: tenantId,
      source_snapshot_id: sourceSnapshotId,
      source_snapshot: sourceSnapshot,
      expected_source_snapshot_hash: expectedSourceSnapshotHash,
      mode,
      idempotency_key: options.idempotency_key ?? null,
      actor_id: options.actor,
    });
    write(JSON.stringify(result, null, 2));
    return result;
  } finally {
    repository.close();
  }
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedUrl === import.meta.url) {
  try {
    runPeopleDataMigrationCommand();
  } catch (error) {
    process.stderr.write(`${error.code ? `${error.code}: ` : ""}${error.message}\n`);
    process.exitCode = 1;
  }
}
