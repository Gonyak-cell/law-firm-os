import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("explicit backup-root helper preserves the caller-owned root after each test", async () => {
  const callerRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-caller-backups-"));
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = callerRoot;
  try {
    const { withIsolatedBackupRoot } = await import("./support/matter-current-seed-worktree.js");
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
    let isolatedRoot;
    await withIsolatedBackupRoot(async ({ backupRoot }) => {
      isolatedRoot = backupRoot;
      assert.notEqual(backupRoot, callerRoot);
      assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
    });
    assert.ok(isolatedRoot);
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

test("overlapping backup-root scopes keep distinct roots through non-LIFO completion", async () => {
  const callerRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-overlap-caller-"));
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = callerRoot;
  try {
    const { withIsolatedBackupRoot } = await import("./support/matter-current-seed-worktree.js");
    const entered = {
      a: deferred(),
      b: deferred(),
    };
    const finishA = deferred();
    const finishB = deferred();
    const finishedA = deferred();
    const events = [];
    const seen = { a: [], b: [] };
    const scopeA = withIsolatedBackupRoot(async ({ backupRoot }) => {
      seen.a.push(["enter", backupRoot]);
      events.push(["a-enter", backupRoot]);
      entered.a.resolve();
      await entered.b.promise;
      await finishA.promise;
      seen.a.push(["finish", backupRoot]);
      events.push(["a-finish", backupRoot]);
      finishedA.resolve();
    });
    const scopeB = withIsolatedBackupRoot(async ({ backupRoot }) => {
      seen.b.push(["enter", backupRoot]);
      events.push(["b-enter", backupRoot]);
      entered.b.resolve();
      await entered.a.promise;
      await finishB.promise;
      seen.b.push(["finish", backupRoot]);
      events.push(["b-finish", backupRoot]);
    });

    await Promise.all([entered.a.promise, entered.b.promise]);
    finishA.resolve();
    await finishedA.promise;
    assert.deepEqual(events.map(([event]) => event), ["a-enter", "b-enter", "a-finish"]);
    finishB.resolve();
    await Promise.all([scopeA, scopeB]);

    assert.deepEqual(events.map(([event]) => event), ["a-enter", "b-enter", "a-finish", "b-finish"]);
    assert.notEqual(seen.a[0][1], seen.b[0][1]);
    assert.equal(seen.a[1][1], seen.a[0][1]);
    assert.equal(seen.b[1][1], seen.b[0][1]);
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

test("backup-root helper leaves caller env unchanged when callback rejects", async () => {
  const callerRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-reject-caller-"));
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = callerRoot;
  try {
    const { withIsolatedBackupRoot } = await import("./support/matter-current-seed-worktree.js");
    await assert.rejects(
      withIsolatedBackupRoot(async ({ backupRoot }) => {
        assert.ok(backupRoot);
        assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
        throw new Error("expected async helper failure");
      }),
      /expected async helper failure/u,
    );
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

test("backup-root helper leaves an originally absent env key absent after sync throw", async () => {
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
  try {
    const { withIsolatedBackupRoot } = await import("./support/matter-current-seed-worktree.js");
    await assert.rejects(
      withIsolatedBackupRoot(({ backupRoot }) => {
        assert.ok(backupRoot);
        assert.equal(Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT"), false);
        throw new Error("expected sync helper failure");
      }),
      /expected sync helper failure/u,
    );
    assert.equal(Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT"), false);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

test("production repository writes backups under its explicit callback root", async () => {
  const callerRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-real-backup-caller-"));
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = callerRoot;
  try {
    const {
      canonicalTask,
      createRepository,
      currentSeed,
      durableStorePath,
      seedRecordsWithoutSelectedWorktree,
      withIsolatedBackupRoot,
    } = await import("./support/matter-current-seed-worktree.js");
    const result = await withIsolatedBackupRoot(async ({ backupRoot }) => {
      const filePath = durableStorePath("matter-current-real-backup-");
      const repository = createRepository({
        backupRoot,
        filePath,
        seedRecords: seedRecordsWithoutSelectedWorktree(currentSeed()),
      });
      repository.create({ ...canonicalTask(), task_id: "task_current_seed_real_backup" });
      repository.close();
      return { backupRoot, filePath };
    });

    const backupFiles = filesUnder(result.backupRoot);
    assert.ok(backupFiles.some((filePath) => filePath.endsWith(".json")));
    assert.deepEqual(filesUnder(callerRoot), []);
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

test("overlapping production repository writes stay in their callback roots", async () => {
  const callerRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-real-overlap-caller-"));
  const hadCallerRoot = Object.hasOwn(process.env, "LAWOS_LOCAL_BACKUP_ROOT");
  const previousRoot = process.env.LAWOS_LOCAL_BACKUP_ROOT;
  process.env.LAWOS_LOCAL_BACKUP_ROOT = callerRoot;
  try {
    const {
      canonicalTask,
      createRepository,
      currentSeed,
      durableStorePath,
      seedRecordsWithoutSelectedWorktree,
      withIsolatedBackupRoot,
    } = await import("./support/matter-current-seed-worktree.js");
    const entered = { a: deferred(), b: deferred() };
    const finishA = deferred();
    const finishB = deferred();
    const finishedA = deferred();
    const finishedB = deferred();
    const events = [];
    const results = {};

    const runScope = (label, otherLabel, finish, finished) => withIsolatedBackupRoot(async ({ backupRoot }) => {
      const filePath = durableStorePath(`matter-current-real-overlap-${label}-`);
      const repository = createRepository({
        backupRoot,
        filePath,
        seedRecords: seedRecordsWithoutSelectedWorktree(currentSeed()),
      });
      const write = (phase) => repository.create({
        ...canonicalTask({ actorId: `real_backup_scope_${label}` }),
        task_id: `task_current_seed_real_overlap_${label}_${phase}`,
      });

      write("enter");
      events.push([`${label}-enter`, backupRoot]);
      entered[label].resolve();
      await entered[otherLabel].promise;
      await finish.promise;
      write("finish");
      events.push([`${label}-finish`, backupRoot]);
      repository.close();
      results[label] = { backupRoot, filePath };
      finished.resolve();
    });

    const scopeA = runScope("a", "b", finishA, finishedA);
    const scopeB = runScope("b", "a", finishB, finishedB);

    await Promise.all([entered.a.promise, entered.b.promise]);
    finishA.resolve();
    await finishedA.promise;
    assert.deepEqual(events.map(([event]) => event), ["a-enter", "b-enter", "a-finish"]);
    finishB.resolve();
    await Promise.all([scopeA, scopeB, finishedB.promise]);

    assert.deepEqual(events.map(([event]) => event), ["a-enter", "b-enter", "a-finish", "b-finish"]);
    assert.notEqual(results.a.backupRoot, results.b.backupRoot);
    assert.ok(filesUnder(results.a.backupRoot).length >= 2);
    assert.ok(filesUnder(results.b.backupRoot).length >= 2);
    assert.deepEqual(filesUnder(callerRoot), []);
    assert.equal(process.env.LAWOS_LOCAL_BACKUP_ROOT, callerRoot);
  } finally {
    if (hadCallerRoot) {
      process.env.LAWOS_LOCAL_BACKUP_ROOT = previousRoot;
    } else {
      delete process.env.LAWOS_LOCAL_BACKUP_ROOT;
    }
  }
});

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}
