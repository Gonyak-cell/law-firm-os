#!/usr/bin/env node
import {
  dryRunAmicPrivateBootstrapMigration,
} from "./lib/amic-private-bootstrap-migration.mjs";

function required(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function optional(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

const receipt = await dryRunAmicPrivateBootstrapMigration({
  root: optional("--root") ?? process.cwd(),
  mappingPath: required("--mapping"),
  registrationPath: optional("--registration-source") ?? undefined,
  rosterPath: optional("--roster-source") ?? undefined,
  contactPath: optional("--contact-source"),
  photoDirectory: optional("--photo-directory") ?? undefined,
});

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
