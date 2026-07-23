import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  readApprovedSourceBytes,
  sha256ProgramBytes,
} from "../lib/json-postgres-program-files.mjs";

test("approved source reads preserve ordinary source permissions while enforcing root, size, digest, and symlink boundaries", (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-approved-source-"));
  const outside = mkdtempSync(join(tmpdir(), "lawos-unapproved-source-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });
  const bytes = Buffer.from("approved source bytes");
  const path = join(root, "document.bin");
  writeFileSync(path, bytes, { mode: 0o644 });
  assert.deepEqual(readApprovedSourceBytes(path, {
    approvedRoots: [root],
    expectedByteSize: bytes.length,
    expectedSha256: sha256ProgramBytes(bytes),
  }), bytes);

  assert.throws(() => readApprovedSourceBytes(path, {
    approvedRoots: [outside],
    expectedByteSize: bytes.length,
    expectedSha256: sha256ProgramBytes(bytes),
  }), /outside every approved root/u);
  assert.throws(() => readApprovedSourceBytes(path, {
    approvedRoots: [root],
    expectedByteSize: bytes.length + 1,
    expectedSha256: sha256ProgramBytes(bytes),
  }), /metadata drifted/u);
  assert.throws(() => readApprovedSourceBytes(path, {
    approvedRoots: [root],
    expectedByteSize: bytes.length,
    expectedSha256: "0".repeat(64),
  }), /digest drifted/u);

  const nested = join(root, "nested");
  mkdirSync(nested);
  const link = join(nested, "linked.bin");
  symlinkSync(path, link);
  assert.throws(() => readApprovedSourceBytes(link, {
    approvedRoots: [root],
    expectedByteSize: bytes.length,
    expectedSha256: sha256ProgramBytes(bytes),
  }), /must not be a symlink/u);
});
