import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";
import { createDefaultMatterRuntime } from "../src/server.js";
import {
  MATTER,
  QUERY,
  canonicalTask,
  context,
  currentSeed,
  createRepository,
  durableStorePath,
  seedRecordsWithoutSelectedWorktree,
  selectedRecords,
  withIsolatedBackupRoot,
} from "./support/matter-current-seed-worktree.js";

function testWithIsolatedBackupRoot(name, callback) {
  test(name, () => withIsolatedBackupRoot(({ backupRoot }) => callback({ backupRoot })));
}

testWithIsolatedBackupRoot("operational default startup leaves a canonical store without member or worktree byte-equivalent across restarts", async ({ backupRoot }) => {
  const seed = currentSeed();
  const filePath = durableStorePath("matter-current-operational-default-");
  let repository = createRepository({
    filePath,
    backupRoot,
    seedRecords: seedRecordsWithoutSelectedWorktree(seed),
  });
  repository.create(canonicalTask());
  repository.close();
  const before = readFileSync(filePath);

  for (const restart of [1, 2]) {
    repository = createRepository({ backupRoot, filePath });
    const runtime = createDefaultMatterRuntime({ repository });

    assert.deepEqual(selectedRecords(repository, "MatterWorktree"), []);
    assert.deepEqual(selectedRecords(repository, "MatterMember"), []);
    assert.deepEqual(readFileSync(filePath), before);

    const response = await handleMatterApiRequest({
      pathname: `/api/matters/${MATTER.matter_id}/worktree`,
      method: "GET",
      query: QUERY,
      context: context(),
      requestId: `current-seed-operational-default-restart-${restart}`,
      runtime,
    });
    assert.equal(response.status, 404);
    assert.deepEqual(response.body.items, []);
    assert.equal(response.body.count_leak_prevented, true);
    assert.deepEqual(readFileSync(filePath), before);
    repository.close();
  }
});

testWithIsolatedBackupRoot("PostgreSQL-style materialized runtime leaves a canonical snapshot without member or worktree byte-equivalent", ({ backupRoot }) => {
  const seed = currentSeed();
  const repository = createRepository({
    backupRoot,
    seedRecords: seedRecordsWithoutSelectedWorktree(seed),
    preserveSeedRecords: true,
  });
  const before = Buffer.from(JSON.stringify(repository.snapshot()));

  for (const restart of [1, 2]) {
    createMatterRuntimeContext({ repository });
    assert.deepEqual(selectedRecords(repository, "MatterWorktree"), []);
    assert.deepEqual(selectedRecords(repository, "MatterMember"), []);
    assert.deepEqual(
      Buffer.from(JSON.stringify(repository.snapshot())),
      before,
      `PostgreSQL materialization ${restart} changed canonical bytes`,
    );
  }
  repository.close();
});
