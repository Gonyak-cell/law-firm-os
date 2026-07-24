#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import {
  buildJsonPostgresRehearsalArtifactStoreTemplate,
  validateJsonPostgresRehearsalArtifactStoreTemplate,
} from "./lib/json-postgres-rehearsal-infrastructure.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function outsideWorktree(path) {
  const root = realpathSync(process.cwd());
  const target = resolve(path);
  const rel = relative(root, target);
  return rel === ".." || rel.startsWith(`..${sep}`);
}

const requestedOutput = option("--output");
const output = resolve(requestedOutput ?? "");
if (!requestedOutput || !outsideWorktree(output)) {
  throw new Error("--output must be outside the worktree");
}
if (existsSync(output)
  || (existsSync(dirname(output)) && lstatSync(dirname(output)).isSymbolicLink())) {
  throw new Error("rehearsal artifact-store output must be a new non-symlink path");
}

const template = buildJsonPostgresRehearsalArtifactStoreTemplate();
const validation =
  validateJsonPostgresRehearsalArtifactStoreTemplate(template);
mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
chmodSync(dirname(output), 0o700);
writeFileSync(output, `${JSON.stringify(template, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
chmodSync(output, 0o600);
process.stdout.write(`${JSON.stringify({ ...validation, output }, null, 2)}\n`);
