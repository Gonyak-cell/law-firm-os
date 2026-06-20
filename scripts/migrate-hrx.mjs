#!/usr/bin/env node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";

const dryRun = process.argv.includes("--dry-run");
const storeFileIndex = process.argv.indexOf("--store-file");
const storeFile =
  storeFileIndex === -1
    ? undefined
    : process.argv[storeFileIndex + 1] && resolve(process.argv[storeFileIndex + 1]);

if (!dryRun && !storeFile) {
  console.error("HRX migration requires --store-file unless --dry-run is set.");
  process.exit(1);
}

const filePath = storeFile ?? join(mkdtempSync(join(tmpdir(), "hrx-migrate-")), "hrx-store.json");
const store = createFileHrxStore({ filePath });
const results = runHrxMigrations(store);
store.close();

console.log("HRX migration runner completed.");
console.log(`dry_run: ${dryRun}`);
console.log(`store_file: ${filePath}`);
console.log(`migrations: ${results.map((result) => `${result.id}:${result.applied ? "applied" : "already_applied"}`).join(", ")}`);
