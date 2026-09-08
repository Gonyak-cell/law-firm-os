import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  publicProfessionalProfileCatalog,
  readPinnedHrxRosterBytes,
} from "../lib/hrx-public-professional-profile.mjs";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-private-profile-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const worktree = join(root, "worktree");
  mkdirSync(worktree);
  const path = join(root, "roster.json");
  const bytes = Buffer.from(JSON.stringify({ members: [{
    employee_id: "employee_synthetic",
    work_email: "synthetic@example.invalid",
    professional_profile: {
      profile_kind: "attorney",
      practice_areas: ["Synthetic practice"],
      private_note: "must not be packaged",
    },
  }] }));
  writeFileSync(path, bytes, { mode: 0o600 });
  return { path, bytes, worktree, root };
}

test("private profile source requires exact bytes and retains only public fields", (t) => {
  const f = fixture(t);
  const bytes = readPinnedHrxRosterBytes(f.path, digest(f.bytes), f);
  assert.deepEqual(bytes, f.bytes);
  const catalog = publicProfessionalProfileCatalog(JSON.parse(bytes), { opaqueEmployeeRefs: true });
  assert.deepEqual(catalog.profiles, [{
    employee_ref: digest("employee_synthetic"),
    professional_profile: { profile_kind: "attorney", practice_areas: ["Synthetic practice"] },
  }]);
  assert(!JSON.stringify(catalog).includes("synthetic@example.invalid"));
});

test("private profile source rejects missing or mismatched approval hash and oversized input", (t) => {
  const f = fixture(t);
  assert.throws(() => readPinnedHrxRosterBytes(f.path, undefined, f), /exact SHA-256/u);
  assert.throws(() => readPinnedHrxRosterBytes(f.path, "0".repeat(64), f), /digest drifted/u);
  writeFileSync(f.path, Buffer.alloc(512 * 1024 + 1));
  assert.throws(() => readPinnedHrxRosterBytes(f.path, digest(f.bytes), f), /bounded input size/u);
  writeFileSync(f.path, Buffer.alloc(0));
  assert.throws(() => readPinnedHrxRosterBytes(f.path, digest(Buffer.alloc(0)), f), /bounded input size/u);
});

test("private profile source rejects repository paths, symlinks, and public permissions", (t) => {
  const f = fixture(t);
  const internal = join(f.worktree, "roster.json");
  writeFileSync(internal, f.bytes, { mode: 0o600 });
  assert.throws(() => readPinnedHrxRosterBytes(internal, digest(f.bytes), f), /outside the worktree/u);
  const link = join(f.root, "linked.json");
  symlinkSync(f.path, link);
  assert.throws(() => readPinnedHrxRosterBytes(link, digest(f.bytes), f), /symlink/u);
  const parentLink = join(f.root, "linked-worktree");
  symlinkSync(f.worktree, parentLink);
  assert.throws(() => readPinnedHrxRosterBytes(join(parentLink, "roster.json"), digest(f.bytes), f), /outside the worktree/u);
  chmodSync(f.path, 0o644);
  assert.throws(() => readPinnedHrxRosterBytes(f.path, digest(f.bytes), f), /private 0600/u);
});

test("matching private bytes do not permit malformed or empty professional catalogs", (t) => {
  const f = fixture(t);
  for (const bytes of [Buffer.from("{invalid"), Buffer.from('{"members":[]}')]) {
    writeFileSync(f.path, bytes);
    const exact = readPinnedHrxRosterBytes(f.path, digest(bytes), f);
    assert.throws(() => publicProfessionalProfileCatalog(JSON.parse(exact), { opaqueEmployeeRefs: true }));
  }
});
