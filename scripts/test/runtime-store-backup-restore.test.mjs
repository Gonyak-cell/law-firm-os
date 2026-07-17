import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { runBackup } from "../backup-runtime-stores-to-s3.mjs";
import {
  MATTER_VAULT_RUNTIME_STORE_FILES,
  createMatterVaultRuntimeBackup,
  restoreMatterVaultRuntimeBackup,
} from "../drill-matter-vault-backup-restore.mjs";
import { runQueueProcessor } from "../process-runtime-store-backup-queue.mjs";
import { runPermissionRemediation } from "../remediate-runtime-backup-permissions.mjs";
import { runRestore } from "../restore-from-s3.mjs";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-runtime-backup-restore-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function seedAllStores(storeDir) {
  for (const definition of MATTER_VAULT_RUNTIME_STORE_FILES) {
    const filePath = join(storeDir, definition.file_name);
    mkdirSync(dirname(filePath), { recursive: true });
    const body = definition.file_name.endsWith(".ndjson")
      ? `${JSON.stringify({ event_id: `event-${definition.key}`, synthetic_only: true })}\n`
      : `${JSON.stringify({ records: [{ record_id: `record-${definition.key}`, synthetic_only: true }] }, null, 2)}\n`;
    writeFileSync(filePath, body, "utf8");
  }
  const objectRoot = join(storeDir, "dms-store.json.objects", "synthetic");
  mkdirSync(objectRoot, { recursive: true });
  writeFileSync(join(objectRoot, "object.bin"), Buffer.from("synthetic-object-bytes"));
  writeFileSync(join(objectRoot, "object.json"), `${JSON.stringify({ object_id: "synthetic-object" })}\n`, "utf8");
}

function mode(filePath) {
  return statSync(filePath).mode & 0o777;
}

test("snapshot covers all 16 stores and DMS objects, then restores only into an isolated directory", async (t) => {
  const root = fixtureRoot(t);
  const storeDir = join(root, "stores");
  const backupRoot = join(root, "backups");
  const restoreDir = join(root, "isolated-restore");
  seedAllStores(storeDir);

  const backup = await createMatterVaultRuntimeBackup({
    storeDir,
    backupRoot,
    now: "2026-07-16T10:40:00.000Z",
  });
  assert.equal(backup.store_inventory.length, 16);
  assert.equal(backup.store_inventory_present_count, 16);
  assert.equal(backup.store_inventory.every((entry) => entry.present && entry.sha256?.length === 64), true);
  assert.equal(backup.dms_object_inventory.file_count, 2);
  assert.equal(backup.backup_file_count, 18);
  assert.equal(backup.snapshot_sha256.length, 64);
  const persistedManifest = readFileSync(backup.manifest_path, "utf8");
  assert.equal(persistedManifest.includes(root), false);
  assert.equal(JSON.parse(persistedManifest).store_dir_ref.startsWith("path-"), true);
  assert.equal(mode(backup.backup_dir), 0o700);
  assert.equal(mode(backup.manifest_path), 0o600);

  const restore = await restoreMatterVaultRuntimeBackup({
    backupDir: backup.backup_dir,
    restoreDir,
    currentStoreDir: storeDir,
  });
  assert.equal(restore.outcome, "passed");
  assert.equal(restore.restored_file_count, 18);
  assert.equal(restore.parse_error_count, 0);
  assert.equal(restore.record_count_mismatch_count, 0);
  assert.equal(restore.current_authority_overwritten, false);
  assert.equal(mode(restoreDir), 0o700);
  assert.equal(mode(join(restoreDir, "matter-store.json")), 0o600);
  await assert.rejects(
    restoreMatterVaultRuntimeBackup({ backupDir: backup.backup_dir, restoreDir: storeDir, currentStoreDir: storeDir }),
    /refuses to overwrite/u,
  );
});

test("restore validates checksum and parse state before materializing any files", async (t) => {
  const root = fixtureRoot(t);
  const storeDir = join(root, "stores");
  seedAllStores(storeDir);
  const backup = await createMatterVaultRuntimeBackup({
    storeDir,
    backupRoot: join(root, "backups"),
    now: "2026-07-16T10:41:00.000Z",
  });
  writeFileSync(join(backup.backup_dir, "stores", "matter-store.json"), "{corrupt", "utf8");
  const restoreDir = join(root, "must-remain-absent");
  await assert.rejects(
    restoreMatterVaultRuntimeBackup({ backupDir: backup.backup_dir, restoreDir, currentStoreDir: storeDir }),
    (error) => error?.code === "LAWOS_BACKUP_RESTORE_VALIDATION_FAILED" && error.checksum_mismatch_count === 1,
  );
  assert.equal(existsSync(restoreDir), false);
});

test("restore accepts an earlier v0.1 manifest without additive inventory fields", async (t) => {
  const root = fixtureRoot(t);
  const storeDir = join(root, "stores");
  seedAllStores(storeDir);
  const backup = await createMatterVaultRuntimeBackup({
    storeDir,
    backupRoot: join(root, "backups"),
    now: "2026-07-16T10:42:00.000Z",
  });
  const manifest = JSON.parse(readFileSync(backup.manifest_path, "utf8"));
  delete manifest.store_inventory;
  delete manifest.store_inventory_present_count;
  for (const file of manifest.files) delete file.record_count;
  writeFileSync(backup.manifest_path, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  const restore = await restoreMatterVaultRuntimeBackup({
    backupDir: backup.backup_dir,
    restoreDir: join(root, "legacy-isolated-restore"),
    currentStoreDir: storeDir,
  });
  assert.equal(restore.outcome, "passed");
  assert.equal(restore.restored_file_count, 18);
});

test("backup, queue processor and restore commands default to local no-AWS dry runs", async (t) => {
  const root = fixtureRoot(t);
  const storeDir = join(root, "stores");
  seedAllStores(storeDir);
  const backupReceipt = await runBackup({
    "store-dir": storeDir,
    "backup-root": join(root, "backups"),
    "receipt-path": join(root, "receipts", "backup.json"),
    bucket: "must-not-be-contacted",
    profile: "must-not-be-used",
  });
  assert.equal(backupReceipt.outcome, "dry_run");
  assert.equal(backupReceipt.mode, "dry_run_no_aws");
  assert.equal(backupReceipt.aws_read_executed, false);
  assert.equal(backupReceipt.aws_mutation_executed, false);

  const queueReceipt = await runQueueProcessor({ "queue-root": join(root, "queue") });
  assert.equal(queueReceipt.outcome, "dry_run");
  assert.equal(queueReceipt.aws_read_executed, false);
  assert.equal(queueReceipt.aws_mutation_executed, false);

  const restoreReceipt = await runRestore({
    "restore-dir": join(root, "restore-plan"),
    "receipt-path": join(root, "receipts", "restore.json"),
  });
  assert.equal(restoreReceipt.outcome, "dry_run");
  assert.equal(restoreReceipt.isolated_restore, true);
  assert.equal(restoreReceipt.aws_read_executed, false);
  assert.equal(restoreReceipt.aws_mutation_executed, false);
  await assert.rejects(runRestore({ "restore-current": true }), /not supported/u);
});

test("permission remediation is dry-run by default and gated when applied", (t) => {
  const root = fixtureRoot(t);
  const backupRoot = join(root, "legacy-backups");
  const backupFile = join(backupRoot, "snapshot.json");
  mkdirSync(backupRoot, { recursive: true, mode: 0o755 });
  writeFileSync(backupFile, "{}\n", { mode: 0o644 });
  chmodSync(backupRoot, 0o755);
  chmodSync(backupFile, 0o644);

  const dryRun = runPermissionRemediation({ target: backupRoot });
  assert.equal(dryRun.outcome, "dry_run");
  assert.equal(dryRun.candidate_count, 2);
  assert.equal(dryRun.changed_count, 0);
  assert.equal(mode(backupRoot), 0o755);
  assert.equal(mode(backupFile), 0o644);
  assert.throws(() => runPermissionRemediation({ target: backupRoot, apply: true }), /requires/u);

  const applied = runPermissionRemediation({
    target: backupRoot,
    apply: true,
    "approval-ref": "synthetic-local-permission-test",
    "retention-decision-ref": "synthetic-retention-review",
    "legal-hold-review-ref": "synthetic-legal-hold-review",
  });
  assert.equal(applied.outcome, "applied");
  assert.equal(applied.changed_count, 2);
  assert.equal(applied.remaining_non_private_count, 0);
  assert.equal(applied.delete_executed, false);
  assert.equal(mode(backupRoot), 0o700);
  assert.equal(mode(backupFile), 0o600);
  assert.equal(JSON.stringify(applied).includes(root), false);
});
