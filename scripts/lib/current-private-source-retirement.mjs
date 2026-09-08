import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const launch = "docs/reorganization/client-matter-os/matter-vault-r4/launch";
export const CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS = Object.freeze([
  `${launch}/matter-vault-user-registration-seed.json`,
  `${launch}/hrx-member-roster-source-of-truth.json`,
  ...[
    "167499af06d33e69afce9bf8047ec0233c4037aecda34e3056ba83f287af103f",
    "729b8639553bbcfd2b721efd1f8c06ab4c2e1d9c52679b64950322979548fb81",
    "b6ad38508be75403e379885a95ef91c3f77da7d19ac4f8635ba328f6a6da0725",
    "c1fd85d4f8d574a98a743afea034d702d3b4242a9c57ecf2c0ecad9e5cd31ad8",
    "e72b1c79fcf11f443a3d347924ffc6e8a339b004c824395d756f273f2422e9e7",
  ].map((ref) => `apps/api/src/hrx-member-photos/${ref}.png`),
]);
export const CURRENT_PRIVATE_SOURCE_RETIREMENT_RECEIPT_PATH =
  "docs/desktop/amic-os-current-private-source-retirement-2026-09-08.json";

// Historical ledgers retain their original paths. This accepts only the seven
// separately recorded retirements; an arbitrary missing evidence file still fails.
export function isRecordedCurrentPrivateSourceRetirement(path, { root = process.cwd() } = {}) {
  if (!CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS.includes(path)) return false;
  if (existsSync(resolve(root, path))) return false;
  const receiptPath = resolve(root, CURRENT_PRIVATE_SOURCE_RETIREMENT_RECEIPT_PATH);
  if (!existsSync(receiptPath)) return false;
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(receipt.schema_version, "law-firm-os.current-private-source-retirement.v1");
  assert.equal(receipt.status, "retired-from-current-source");
  assert.match(receipt.source_sha, /^[a-f0-9]{40}$/u);
  assert.deepEqual(receipt.files.map((file) => file.path).sort(), [...CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS].sort());
  for (const file of receipt.files) {
    assert.match(file.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
    assert.equal(existsSync(resolve(root, file.path)), false, "recorded private source has reappeared");
  }
  assert.match(receipt.private_backup.archive_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(receipt.private_backup.restored_file_count, 7);
  assert.equal(receipt.private_backup.digest_mismatch_count, 0);
  for (const key of ["corporate_readback", "photo_readback", "private_input_validation", "privacy_scan"]) {
    assert.match(receipt.verification_receipt_sha256[key], /^[a-f0-9]{64}$/u);
  }
  assert.equal(receipt.downloads_originals_removed, false);
  assert.equal(receipt.git_history_rewritten, false);
  assert.equal(receipt.other_worktrees_removed, false);
  return true;
}
