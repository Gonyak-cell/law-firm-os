#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LAWOS_LOCAL_BACKUP_ROOT } from "../packages/persistence/src/durable-file.js";

const USAGE = `Usage: node scripts/remediate-runtime-backup-permissions.mjs [options]

Default: dry-run scan for directory 0700 and file 0600 requirements.
  --target <dir>                       Backup root to inspect.
  --apply                              Apply mode corrections; never deletes files.
  --approval-ref <ref>                 Required with --apply.
  --retention-decision-ref <ref>       Required with --apply.
  --legal-hold-review-ref <ref>        Required with --apply.
  --help                               Show this help.`;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function boolOption(value) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function mode(entryPath) {
  return lstatSync(entryPath).mode & 0o777;
}

function inventory(root) {
  const entries = [];
  function visit(current) {
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Backup permission remediation refuses symlink: ${relative(root, current) || "."}`);
    const type = stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "unsupported";
    const expectedMode = type === "directory" ? 0o700 : type === "file" ? 0o600 : null;
    entries.push({
      relative_path: relative(root, current) || ".",
      type,
      current_mode: mode(current).toString(8).padStart(4, "0"),
      expected_mode: expectedMode === null ? null : expectedMode.toString(8).padStart(4, "0"),
      needs_change: expectedMode !== null && mode(current) !== expectedMode,
    });
    if (type === "directory") {
      for (const name of readdirSync(current).sort()) visit(join(current, name));
    }
  }
  visit(root);
  return entries;
}

function writeReceipt(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(filePath), 0o700);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(filePath, 0o600);
}

export function runPermissionRemediation(options = {}) {
  const root = resolve(options.target || LAWOS_LOCAL_BACKUP_ROOT);
  const apply = boolOption(options.apply);
  const approvalRef = String(options["approval-ref"] || "").trim();
  const retentionDecisionRef = String(options["retention-decision-ref"] || "").trim();
  const legalHoldReviewRef = String(options["legal-hold-review-ref"] || "").trim();
  if (!existsSync(root)) throw new Error("Backup permission remediation target does not exist");
  if (apply && (!approvalRef || !retentionDecisionRef || !legalHoldReviewRef)) {
    throw new Error("--apply requires --approval-ref, --retention-decision-ref and --legal-hold-review-ref");
  }
  const before = inventory(root);
  const candidates = before.filter((entry) => entry.needs_change);
  if (apply) {
    for (const entry of candidates.sort((left, right) => right.relative_path.split("/").length - left.relative_path.split("/").length)) {
      chmodSync(resolve(root, entry.relative_path), Number.parseInt(entry.expected_mode, 8));
    }
  }
  const after = inventory(root);
  const receipt = {
    schema_version: "law-firm-os.runtime-backup-permission-remediation.v0.1",
    outcome: apply ? "applied" : "dry_run",
    target_ref: `backup-root-${createHash("sha256").update(root).digest("hex").slice(0, 24)}`,
    scanned_entry_count: before.length,
    candidate_count: candidates.length,
    changed_count: apply ? candidates.length : 0,
    remaining_non_private_count: after.filter((entry) => entry.needs_change).length,
    changes: candidates,
    approval_ref: apply ? approvalRef : null,
    retention_decision_ref: apply ? retentionDecisionRef : null,
    legal_hold_review_ref: apply ? legalHoldReviewRef : null,
    delete_executed: false,
    external_action_executed: false,
    production_ready_claim: false,
    go_live_claim: false,
  };
  if (options["receipt-path"]) writeReceipt(resolve(options["receipt-path"]), receipt);
  return receipt;
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile && invokedFile === fileURLToPath(import.meta.url)) {
  try {
    console.log(process.argv.includes("--help") ? USAGE : JSON.stringify(runPermissionRemediation(parseArgs()), null, 2));
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  }
}
