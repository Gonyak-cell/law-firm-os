import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE,
  MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION_V0_2,
  MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2,
  MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION_V0_2,
  MATTER_VAULT_RUNTIME_STORE_FILES,
  createMatterVaultRuntimeBackup,
  restoreMatterVaultRuntimeBackup,
  runMatterVaultBackupRestoreDrill
} from "../drill-matter-vault-backup-restore.mjs";

async function tempRoot() {
  return mkdtemp(join(tmpdir(), "lawos-a09-runtime-backup-"));
}

test("Matter-Vault runtime backup copies store bytes and restores by checksum", async () => {
  const root = await tempRoot();
  const storeDir = join(root, "runtime-stores");
  const backupRoot = join(root, "backups");
  const restoreDir = join(root, "restored-runtime-stores");
  const matterStore = `${JSON.stringify(
    { tenant_id: "tenant-a09", records: [{ record_id: "matter-a09", title: "Synthetic A09 matter" }] },
    null,
    2
  )}\n`;
  const financeStore = `${JSON.stringify(
    { tenant_id: "tenant-a09", records: [{ record_id: "invoice-a09", amount: 1200 }] },
    null,
    2
  )}\n`;

  await mkdir(storeDir, { recursive: true });
  await writeFile(join(storeDir, "matter-store.json"), matterStore, "utf8");
  await writeFile(join(storeDir, "finance-store.json"), financeStore, "utf8");

  const backup = await createMatterVaultRuntimeBackup({ storeDir, backupRoot });
  assert.equal(backup.contract_ref, "UPL-A-09");
  assert.equal(backup.synthetic_only, true);
  assert.equal(backup.production_ready_claim, false);
  assert.equal(backup.go_live_claim, false);
  assert.equal(backup.backup_created, true);
  assert.equal(backup.backup_file_count, 2);
  assert.equal(backup.missing_store_files.length, MATTER_VAULT_RUNTIME_STORE_FILES.length - 2);
  assert.equal(backup.files.every((file) => file.sha256.length === 64), true);
  assert.equal(backup.daily_backup_job_contract_ref.endsWith("#UPL-A-09"), true);
  assert.equal(typeof backup.rpo_seconds_measured, "number");
  assert.ok(await readFile(join(backup.backup_dir, MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE), "utf8"));

  await writeFile(join(storeDir, "matter-store.json"), "corrupted after backup\n", "utf8");
  const restore = await restoreMatterVaultRuntimeBackup({ backupDir: backup.backup_dir, restoreDir });
  assert.equal(restore.outcome, "passed");
  assert.equal(restore.synthetic_only, true);
  assert.equal(restore.production_ready_claim, false);
  assert.equal(restore.restored_file_count, 2);
  assert.equal(restore.checksum_mismatch_count, 0);
  assert.equal(typeof restore.rto_seconds_measured, "number");
  assert.equal(await readFile(join(restoreDir, "matter-store.json"), "utf8"), matterStore);
  assert.equal(await readFile(join(restoreDir, "finance-store.json"), "utf8"), financeStore);
});

test("Matter-Vault runtime backup includes DMS object bytes and sidecars", async () => {
  const root = await tempRoot();
  const storeDir = join(root, "runtime-stores");
  const backupRoot = join(root, "backups");
  const restoreDir = join(root, "restored-runtime-stores");
  const objectDir = join(storeDir, "dms-store.json.objects", "tenant-a09");
  const objectBytes = Buffer.from("synthetic object bytes for UPL-A-09\n", "utf8");
  const sidecar = `${JSON.stringify({ object_id: "object-a09", synthetic_only: true }, null, 2)}\n`;

  await mkdir(objectDir, { recursive: true });
  await writeFile(join(storeDir, "dms-store.json"), "{\"records\":[]}\n", "utf8");
  await writeFile(join(objectDir, "object-a09.bin"), objectBytes);
  await writeFile(join(objectDir, "object-a09.json"), sidecar, "utf8");

  const backup = await createMatterVaultRuntimeBackup({ storeDir, backupRoot });
  assert.equal(backup.backup_includes_dms_object_store, true);
  assert.equal(backup.files.filter((file) => file.type === "dms_object_store_file").length, 2);

  const restore = await restoreMatterVaultRuntimeBackup({ backupDir: backup.backup_dir, restoreDir });
  assert.equal(restore.outcome, "passed");
  assert.equal(restore.checksum_mismatch_count, 0);
  assert.deepEqual(
    await readFile(join(restoreDir, "dms-store.json.objects", "tenant-a09", "object-a09.bin")),
    objectBytes,
  );
  assert.equal(
    await readFile(join(restoreDir, "dms-store.json.objects", "tenant-a09", "object-a09.json"), "utf8"),
    sidecar,
  );
});

test("Matter-Vault backup/restore drill writes a synthetic-only receipt", async () => {
  const root = await tempRoot();
  const receiptPath = join(root, "a09-runtime-backup-restore-receipt.json");
  const receipt = await runMatterVaultBackupRestoreDrill({
    backupRoot: join(root, "backups"),
    restoreDir: join(root, "restored"),
    receiptPath
  });

  assert.equal(receipt.outcome, "passed");
  assert.equal(receipt.contract_ref, "UPL-A-09");
  assert.equal(receipt.seeded_synthetic_runtime_store, true);
  assert.equal(receipt.synthetic_only, true);
  assert.equal(receipt.production_ready_claim, false);
  assert.equal(receipt.go_live_claim, false);
  assert.equal(receipt.backup.backup_file_count, 6);
  assert.equal(receipt.backup.backup_includes_dms_object_store, true);
  assert.equal(receipt.restore.restored_file_count, 6);
  assert.equal(receipt.restore.checksum_mismatch_count, 0);

  const persisted = JSON.parse(await readFile(receiptPath, "utf8"));
  assert.equal(persisted.receipt_type, "matter_vault_runtime_backup_restore_drill");
  assert.equal(persisted.restore.rto_seconds_measured >= 0, true);
});

test("Matter-Vault backup/restore drill v0.2 records real_client_data_used for isolated runtime-store rehearsal", async () => {
  const root = await tempRoot();
  const storeDir = join(root, "runtime-stores");
  const backupRoot = join(root, "backups");
  const restoreDir = join(root, "restore-rehearsals", "s1");
  const receiptPath = join(root, "s1-runtime-backup-restore-receipt.json");

  await mkdir(storeDir, { recursive: true });
  await writeFile(join(storeDir, "matter-store.json"), "{\"records\":[{\"matter_id\":\"matter_hash_only\"}]}\n", "utf8");
  await writeFile(join(storeDir, "security-audit-events.ndjson"), "{\"audit_event_id\":\"security_audit_hash_only\",\"action\":\"s1.rehearsal\"}\n", "utf8");

  const receipt = await runMatterVaultBackupRestoreDrill({
    storeDir,
    backupRoot,
    restoreDir,
    receiptPath,
    realClientDataUsed: true,
  });

  assert.equal(receipt.schema_version, MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION_V0_2);
  assert.equal(receipt.outcome, "passed");
  assert.equal(receipt.synthetic_only, false);
  assert.equal(receipt.real_client_data_used, true);
  assert.equal(receipt.production_ready_claim, false);
  assert.equal(receipt.go_live_claim, false);
  assert.equal(receipt.production_restore_executed, false);
  assert.equal(receipt.backup.schema_version, MATTER_VAULT_RUNTIME_BACKUP_SCHEMA_VERSION_V0_2);
  assert.equal(receipt.backup.real_client_data_used, true);
  assert.equal(receipt.restore.schema_version, MATTER_VAULT_RUNTIME_RESTORE_SCHEMA_VERSION_V0_2);
  assert.equal(receipt.restore.real_client_data_used, true);
  assert.equal(receipt.restore.restore_dir, restoreDir);
  assert.equal(receipt.restore.checksum_mismatch_count, 0);

  const persisted = JSON.parse(await readFile(receiptPath, "utf8"));
  assert.equal(persisted.schema_version, MATTER_VAULT_RUNTIME_BACKUP_RESTORE_DRILL_SCHEMA_VERSION_V0_2);
});
