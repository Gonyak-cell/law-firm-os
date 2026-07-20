#!/usr/bin/env node
import { chmod, lstat, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { inventoryJsonPostgresSources } from "../packages/persistence/src/postgres/source-inventory.js";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

async function outsideWorktreeFile(path) {
  const root = await realpath(process.cwd());
  const target = resolve(path);
  let parent = dirname(target);
  while (true) {
    try {
      parent = await realpath(parent);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      parent = dirname(parent);
    }
  }
  const rel = relative(root, target);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("inventory output must remain outside the worktree");
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error("inventory output must not be a symlink");
    throw new Error("inventory output already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await chmod(dirname(target), 0o700);
  return target;
}

async function privateManifest(path) {
  if (!path) return null;
  const target = await realpath(resolve(path));
  const metadata = await stat(target);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) throw new Error("authority manifest must be a private 0600 regular file");
  return JSON.parse(await readFile(target, "utf8"));
}

const home = homedir();
const output = await outsideWorktreeFile(option("--output"));
const authorityManifest = await privateManifest(process.argv.includes("--authority-manifest") ? option("--authority-manifest") : null);
const report = await inventoryJsonPostgresSources({
  roots: [
    { ref: "runtime-primary", path: `${home}/Library/Application Support/LawFirmOS/runtime-stores` },
    { ref: "runtime-desktop", path: `${home}/Library/Application Support/@law-firm-os/desktop/runtime-stores` },
    { ref: "runtime-electron", path: `${home}/Library/Application Support/Electron/runtime-stores` },
    { ref: "local-backups", path: `${home}/lawos-backups`, parse_json: false, candidate_mode: "backup" },
    { ref: "packaged-lawos-user-data", path: `${home}/Library/Application Support/matter/runtime-stores` },
  ],
  files: [
    {
      ref: "registered-account-source",
      path: resolve("docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"),
    },
    {
      ref: "registered-roster-source",
      path: resolve("docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json"),
    },
  ],
  authorityManifest,
});
const bytes = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(output, bytes, { flag: "wx", mode: 0o600 });
await chmod(output, 0o600);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS_SAFE_INVENTORY",
  output,
  inventory_sha256: report.inventory_sha256,
  source_count: report.sources.length,
  classification_counts: report.classification_counts,
  field_count: report.field_contract.field_count,
  disposition_counts: report.field_contract.disposition_counts,
  reconciliation: report.reconciliation,
  raw_value_returned: false,
  real_data_mutated: false,
}, null, 2)}\n`);
