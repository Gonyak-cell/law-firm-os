import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS,
  CURRENT_PRIVATE_SOURCE_RETIREMENT_RECEIPT_PATH,
  isRecordedCurrentPrivateSourceRetirement,
} from "../lib/current-private-source-retirement.mjs";

test("historical evidence accepts only an explicit complete retirement and still rejects missing unrelated proof", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-retirement-contract-"));
  const path = CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS[0];
  const receiptPath = join(root, CURRENT_PRIVATE_SOURCE_RETIREMENT_RECEIPT_PATH);
  const receipt = {
    schema_version: "law-firm-os.current-private-source-retirement.v1", status: "retired-from-current-source",
    source_sha: "1".repeat(40),
    files: CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS.map((path) => ({ path, sha256: "2".repeat(64), bytes: 1 })),
    private_backup: { archive_sha256: "3".repeat(64), restored_file_count: 7, digest_mismatch_count: 0 },
    verification_receipt_sha256: Object.fromEntries(["corporate_readback", "photo_readback", "private_input_validation", "privacy_scan"].map((key) => [key, "4".repeat(64)])),
    downloads_originals_removed: false, git_history_rewritten: false, other_worktrees_removed: false,
  };
  const save = (value) => writeFileSync(receiptPath, JSON.stringify(value));
  try {
    assert.equal(isRecordedCurrentPrivateSourceRetirement(path, { root }), false);
    mkdirSync(dirname(receiptPath), { recursive: true });
    save(receipt);
    assert.equal(isRecordedCurrentPrivateSourceRetirement(path, { root }), true);
    assert.equal(isRecordedCurrentPrivateSourceRetirement("docs/unrelated-proof.json", { root }), false);
    assert.equal(isRecordedCurrentPrivateSourceRetirement(`../${path}`, { root }), false);
    save({ ...receipt, status: "prepared" });
    assert.throws(() => isRecordedCurrentPrivateSourceRetirement(path, { root }));
    save({ ...receipt, files: [...receipt.files, { path: "docs/unrelated-proof.json", sha256: "2".repeat(64), bytes: 1 }] });
    assert.throws(() => isRecordedCurrentPrivateSourceRetirement(path, { root }));
    save({ ...receipt, private_backup: { ...receipt.private_backup, digest_mismatch_count: 1 } });
    assert.throws(() => isRecordedCurrentPrivateSourceRetirement(path, { root }));
    save(receipt);
    const restoredSource = join(root, CURRENT_PRIVATE_RUNTIME_SOURCE_PATHS[1]);
    mkdirSync(dirname(restoredSource), { recursive: true });
    writeFileSync(restoredSource, "synthetic-reintroduced-source");
    assert.throws(() => isRecordedCurrentPrivateSourceRetirement(path, { root }), /reappeared/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
