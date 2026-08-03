import assert from "node:assert/strict";
import {
  chmodSync,
  constants,
  linkSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  readApprovedProgramBytes,
  readApprovedSourceBytes,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
} from "../lib/json-postgres-program-files.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-program-pinned-read-"));
  const worktree = join(root, "worktree");
  const external = join(root, "external");
  const approved = join(root, "approved");
  const unapproved = join(root, "unapproved");
  for (const path of [worktree, external, approved, unapproved]) mkdirSync(path);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, worktree, external, approved, unapproved };
}

function writeBytes(path, bytes, mode = 0o600) {
  writeFileSync(path, bytes, { mode });
  chmodSync(path, mode);
  return path;
}

function replaceFile(path, replacement, backup) {
  renameSync(path, backup);
  renameSync(replacement, path);
}

function approvedOptions(root, bytes, overrides = {}) {
  return {
    approvedRoots: [root],
    expectedByteSize: bytes.length,
    expectedSha256: sha256ProgramBytes(bytes),
    ...overrides,
  };
}

test("generic approved program read returns exact bytes without a pre-known digest or size", (t) => {
  const { approved, external } = fixture(t);
  const bytes = Buffer.from([0, 1, 2, 3, 255]);
  const path = writeBytes(join(approved, "unknown.bin"), bytes, 0o644);

  assert.deepEqual(readApprovedProgramBytes(path, {
    approvedRoots: [approved],
    maxBytes: 32,
  }), bytes);
  assert.throws(
    () => readApprovedProgramBytes(path, { approvedRoots: [approved] }),
    /metadata drifted/u,
  );
  assert.throws(() => readApprovedProgramBytes(path, {
    approvedRoots: [approved],
    maxBytes: bytes.length - 1,
  }), /metadata drifted/u);

  const alias = join(external, "approved-alias");
  symlinkSync(approved, alias, "dir");
  assert.throws(() => readApprovedProgramBytes(join(alias, "unknown.bin"), {
    approvedRoots: [approved],
    maxBytes: 32,
  }), /outside every approved root/u);
});

test("generic approved program read rejects file and root replacement around descriptor reads", (t) => {
  const { approved, root } = fixture(t);
  const bytes = Buffer.from("generic-approved");

  const beforePath = writeBytes(join(approved, "before.bin"), bytes, 0o644);
  const beforeReplacement = writeBytes(
    join(approved, "before-replacement.bin"),
    Buffer.from("before-attacker"),
    0o644,
  );
  assert.throws(() => readApprovedProgramBytes(beforePath, {
    approvedRoots: [approved],
    maxBytes: 64,
    __testHooks: {
      afterPreflight() {
        replaceFile(beforePath, beforeReplacement, join(approved, "before-original.bin"));
      },
    },
  }), /metadata drifted/u);

  const openPath = writeBytes(join(approved, "open.bin"), bytes, 0o644);
  const openReplacement = writeBytes(
    join(approved, "open-replacement.bin"),
    Buffer.from("open-attacker"),
    0o644,
  );
  assert.throws(() => readApprovedProgramBytes(openPath, {
    approvedRoots: [approved],
    maxBytes: 64,
    __testHooks: {
      afterOpen() {
        replaceFile(openPath, openReplacement, join(approved, "open-original.bin"));
      },
    },
  }), /metadata drifted/u);

  const readPath = writeBytes(join(approved, "read.bin"), bytes, 0o644);
  const readReplacement = writeBytes(
    join(approved, "read-replacement.bin"),
    Buffer.from("read-attacker"),
    0o644,
  );
  assert.throws(() => readApprovedProgramBytes(readPath, {
    approvedRoots: [approved],
    maxBytes: 64,
    __testHooks: {
      afterRead() {
        replaceFile(readPath, readReplacement, join(approved, "read-original.bin"));
      },
    },
  }), /metadata drifted/u);

  const rootPath = writeBytes(join(approved, "root.bin"), bytes, 0o644);
  const rootCandidate = join(root, "generic-root-candidate");
  mkdirSync(rootCandidate);
  linkSync(rootPath, join(rootCandidate, "root.bin"));
  assert.throws(() => readApprovedProgramBytes(rootPath, {
    approvedRoots: [approved],
    maxBytes: 64,
    __testHooks: {
      afterOpen() {
        renameSync(approved, join(root, "generic-root-original"));
        renameSync(rootCandidate, approved);
      },
    },
  }), /metadata drifted/u);
});

test("private program reads pin ordinary bytes and JSON outside the worktree", (t) => {
  const { external, worktree } = fixture(t);
  const bytes = Buffer.from('{"status":"READY"}\n');
  const path = writeBytes(join(external, "input.json"), bytes);

  assert.deepEqual(readPrivateProgramBytes(path, "private input", { worktree }), bytes);
  assert.deepEqual(readPrivateProgramJson(path, "private input", { worktree }), {
    status: "READY",
  });
});

test("private program reads reject lexical, resolved, and final-component worktree redirection", (t) => {
  const { external, worktree } = fixture(t);
  const worktreeFile = writeBytes(join(worktree, "secret.json"), Buffer.from("{}"));
  assert.throws(
    () => readPrivateProgramBytes(worktreeFile, "private input", { worktree }),
    /must remain outside the worktree/u,
  );

  const parentLink = join(external, "worktree-link");
  symlinkSync(worktree, parentLink, "dir");
  assert.throws(
    () => readPrivateProgramBytes(join(parentLink, "secret.json"), "private input", { worktree }),
    /must remain outside the worktree/u,
  );

  const safe = writeBytes(join(external, "safe.json"), Buffer.from("{}"));
  const finalLink = join(external, "final-link.json");
  symlinkSync(safe, finalLink);
  assert.throws(
    () => readPrivateProgramBytes(finalLink, "private input", { worktree }),
    /must not be a symlink/u,
  );
});

test("private program reads reject pre-open file and whole-directory swaps", (t) => {
  const { external, worktree } = fixture(t);
  const original = Buffer.from("approved-private");

  const path = writeBytes(join(external, "file.bin"), original);
  const replacement = writeBytes(join(external, "replacement.bin"), Buffer.from("attacker-private"));
  assert.throws(() => readPrivateProgramBytes(path, "private input", {
    worktree,
    __testHooks: {
      afterPreflight() {
        replaceFile(path, replacement, join(external, "original.bin"));
      },
    },
  }), /changed while it was read/u);

  const symlinkPath = writeBytes(join(external, "symlink-swap.bin"), original);
  const symlinkTarget = writeBytes(
    join(external, "symlink-target.bin"),
    Buffer.from("symlink-target"),
  );
  let reachedAfterOpen = false;
  assert.throws(() => readPrivateProgramBytes(
    symlinkPath,
    "private input",
    {
      worktree,
      __testHooks: {
        afterPreflight() {
          renameSync(symlinkPath, join(external, "symlink-original.bin"));
          symlinkSync(symlinkTarget, symlinkPath);
        },
        afterOpen() {
          reachedAfterOpen = true;
        },
      },
    },
  ), (error) => {
    assert.match(error.message, /changed while it was read/u);
    if (Number.isInteger(constants.O_NOFOLLOW)) {
      assert.equal(["ELOOP", "EMLINK"].includes(error.cause?.code), true);
    }
    return true;
  });
  assert.equal(reachedAfterOpen, false);

  const live = join(external, "live");
  const candidate = join(external, "candidate");
  mkdirSync(live);
  mkdirSync(candidate);
  const livePath = writeBytes(join(live, "input.bin"), original);
  writeBytes(join(candidate, "input.bin"), Buffer.from("directory-swap"));
  assert.throws(() => readPrivateProgramBytes(livePath, "private input", {
    worktree,
    __testHooks: {
      afterPreflight() {
        renameSync(live, join(external, "old-live"));
        renameSync(candidate, live);
      },
    },
  }), /changed while it was read/u);
});

test("private program reads reject during-read path, mode, type, and size drift", (t) => {
  const { external, worktree } = fixture(t);

  const swappedPath = writeBytes(join(external, "swapped.bin"), Buffer.from("stable"));
  const swappedReplacement = writeBytes(
    join(external, "swapped-replacement.bin"),
    Buffer.from("changed"),
  );
  assert.throws(() => readPrivateProgramBytes(swappedPath, "private input", {
    worktree,
    __testHooks: {
      afterOpen() {
        replaceFile(swappedPath, swappedReplacement, join(external, "swapped-original.bin"));
      },
    },
  }), /changed while it was read/u);

  const modePath = writeBytes(join(external, "mode.bin"), Buffer.from("stable"));
  assert.throws(() => readPrivateProgramBytes(modePath, "private input", {
    worktree,
    __testHooks: { afterOpen: () => chmodSync(modePath, 0o644) },
  }), /changed while it was read/u);

  const typePath = writeBytes(join(external, "type.bin"), Buffer.from("stable"));
  assert.throws(() => readPrivateProgramBytes(typePath, "private input", {
    worktree,
    __testHooks: {
      afterRead() {
        renameSync(typePath, join(external, "type-original.bin"));
        mkdirSync(typePath);
      },
    },
  }), /changed while it was read/u);

  const sizePath = writeBytes(join(external, "size.bin"), Buffer.from("stable"));
  assert.throws(() => readPrivateProgramBytes(sizePath, "private input", {
    worktree,
    __testHooks: { afterOpen: () => writeFileSync(sizePath, "size-drift") },
  }), /changed while it was read/u);

  const redirectDirectory = join(external, "redirect-live");
  mkdirSync(redirectDirectory);
  const redirectPath = writeBytes(join(redirectDirectory, "input.bin"), Buffer.from("stable"));
  writeBytes(join(worktree, "input.bin"), Buffer.from("worktree-secret"));
  assert.throws(() => readPrivateProgramBytes(redirectPath, "private input", {
    worktree,
    __testHooks: {
      afterOpen() {
        renameSync(redirectDirectory, join(external, "redirect-old"));
        symlinkSync(worktree, redirectDirectory, "dir");
      },
    },
  }), /must remain outside the worktree/u);
});

test("private program reads enforce the byte limit before allocating", (t) => {
  const { external, worktree } = fixture(t);
  const path = writeBytes(join(external, "oversize.bin"), Buffer.alloc(17, 1));
  assert.throws(
    () => readPrivateProgramBytes(path, "private input", { worktree, maxBytes: 16 }),
    /private 0600 regular file/u,
  );
  assert.throws(
    () => readPrivateProgramBytes(path, "private input", {
      worktree,
      maxBytes: (512 * 1024 * 1024) + 1,
    }),
    /size boundary is invalid/u,
  );
});

test("approved source reads reject final and ancestor symlink escapes", (t) => {
  const { approved, unapproved } = fixture(t);
  const approvedBytes = Buffer.from("approved");
  const approvedPath = writeBytes(join(approved, "source.bin"), approvedBytes, 0o644);
  assert.deepEqual(
    readApprovedSourceBytes(approvedPath, approvedOptions(approved, approvedBytes)),
    approvedBytes,
  );

  const finalLink = join(approved, "source-link.bin");
  symlinkSync(approvedPath, finalLink);
  assert.throws(
    () => readApprovedSourceBytes(finalLink, approvedOptions(approved, approvedBytes)),
    /must not be a symlink/u,
  );

  const outsideBytes = Buffer.from("outside");
  writeBytes(join(unapproved, "outside.bin"), outsideBytes, 0o644);
  const parentLink = join(approved, "outside-link");
  symlinkSync(unapproved, parentLink, "dir");
  assert.throws(
    () => readApprovedSourceBytes(
      join(parentLink, "outside.bin"),
      approvedOptions(approved, outsideBytes),
    ),
    /outside every approved root/u,
  );
});

test("approved source reads reject pre-open file and whole-directory swaps", (t) => {
  const { approved, root } = fixture(t);
  const expected = Buffer.from("expected-source");
  const path = writeBytes(join(approved, "source.bin"), expected, 0o644);
  const replacement = writeBytes(
    join(approved, "replacement.bin"),
    Buffer.from("attacker-source"),
    0o644,
  );
  assert.throws(() => readApprovedSourceBytes(path, approvedOptions(approved, expected, {
    __testHooks: {
      afterPreflight() {
        replaceFile(path, replacement, join(approved, "source-original.bin"));
      },
    },
  })), /metadata drifted/u);

  const live = join(approved, "live");
  const candidate = join(approved, "candidate");
  mkdirSync(live);
  mkdirSync(candidate);
  const livePath = writeBytes(join(live, "input.bin"), expected, 0o644);
  writeBytes(join(candidate, "input.bin"), Buffer.from("directory-swap"), 0o644);
  assert.throws(() => readApprovedSourceBytes(livePath, approvedOptions(approved, expected, {
    __testHooks: {
      afterPreflight() {
        renameSync(live, join(approved, "old-live"));
        renameSync(candidate, live);
      },
    },
  })), /metadata drifted/u);

  const rootCandidate = join(root, "approved-candidate");
  mkdirSync(rootCandidate);
  const rootPath = writeBytes(join(approved, "root-source.bin"), expected, 0o644);
  linkSync(rootPath, join(rootCandidate, "root-source.bin"));
  assert.throws(() => readApprovedSourceBytes(rootPath, approvedOptions(approved, expected, {
    __testHooks: {
      afterOpen() {
        renameSync(approved, join(root, "approved-original"));
        renameSync(rootCandidate, approved);
      },
    },
  })), /metadata drifted/u);
});

test("approved source reads reject during-read containment, mode, type, and content drift", (t) => {
  const { approved, unapproved } = fixture(t);
  const expected = Buffer.from("expected-source");

  const live = join(approved, "live");
  mkdirSync(live);
  const redirectPath = writeBytes(join(live, "input.bin"), expected, 0o644);
  writeBytes(join(unapproved, "input.bin"), expected, 0o644);
  assert.throws(() => readApprovedSourceBytes(
    redirectPath,
    approvedOptions(approved, expected, {
      __testHooks: {
        afterOpen() {
          renameSync(live, join(approved, "old-live"));
          symlinkSync(unapproved, live, "dir");
        },
      },
    }),
  ), /outside every approved root/u);

  const modePath = writeBytes(join(approved, "mode.bin"), expected, 0o644);
  assert.throws(() => readApprovedSourceBytes(modePath, approvedOptions(approved, expected, {
    __testHooks: { afterOpen: () => chmodSync(modePath, 0o600) },
  })), /metadata drifted/u);

  const typePath = writeBytes(join(approved, "type.bin"), expected, 0o644);
  assert.throws(() => readApprovedSourceBytes(typePath, approvedOptions(approved, expected, {
    __testHooks: {
      afterRead() {
        renameSync(typePath, join(approved, "type-original.bin"));
        mkdirSync(typePath);
      },
    },
  })), /metadata drifted/u);

  const contentPath = writeBytes(join(approved, "content.bin"), expected, 0o644);
  assert.throws(() => readApprovedSourceBytes(contentPath, approvedOptions(approved, expected, {
    __testHooks: { afterOpen: () => writeFileSync(contentPath, "mutated-content") },
  })), /metadata drifted/u);
});

test("approved source reads reject oversize, declared size drift, and digest drift", (t) => {
  const { approved, root } = fixture(t);
  const bytes = Buffer.from("approved-source");
  const path = writeBytes(join(approved, "source.bin"), bytes, 0o644);

  assert.throws(() => readApprovedSourceBytes(path, approvedOptions(approved, bytes, {
    maxBytes: bytes.length - 1,
  })), /metadata drifted/u);
  assert.throws(() => readApprovedSourceBytes(path, approvedOptions(approved, bytes, {
    expectedByteSize: bytes.length + 1,
  })), /metadata drifted/u);
  assert.throws(() => readApprovedSourceBytes(path, approvedOptions(approved, bytes, {
    expectedSha256: "0".repeat(64),
  })), /digest drifted/u);

  assert.deepEqual(readApprovedSourceBytes(path, approvedOptions(approved, bytes, {
    approvedRoots: [approved, join(root, "irrelevant-missing-root")],
  })), bytes);
});
