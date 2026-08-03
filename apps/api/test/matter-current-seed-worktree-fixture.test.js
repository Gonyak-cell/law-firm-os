import assert from "node:assert/strict";
import test from "node:test";
import { handleMatterApiRequest } from "../src/matter-runtime-context.js";
import {
  MATTER,
  MATTER_RUNTIME_CANONICAL_TENANT_ID,
  QUERY,
  TASK_ID,
  canonicalTask,
  context,
  currentSeed,
  createRepository,
  durableMember,
  durableStorePath,
  durableWorktree,
  createRuntime,
  freshRuntime,
  seedRecordsWithoutSelectedWorktree,
  selectedRecords,
  withIsolatedBackupRoot,
} from "./support/matter-current-seed-worktree.js";

const ACTOR_ID = "user_amic_jwsuh";
const SEEDED_WORKTREE_ID = `worktree_small_firm_${MATTER.matter_id}`;
const SEEDED_MEMBER_ID = `member_small_firm_${MATTER.matter_id}_${ACTOR_ID}`;
const EXPECTED_SEED_SOURCE_REVISION = "runtime-seed-small-firm-worktree-v1";

function testWithIsolatedBackupRoot(name, callback) {
  test(name, () => withIsolatedBackupRoot(({ backupRoot }) => callback({ backupRoot })));
}

function fixtureRuntime(repository) {
  return createRuntime(repository, { seedCurrentMatterWorktreeFixture: true });
}

function freshFixtureRuntime(backupRoot) {
  return freshRuntime({
    backupRoot,
    seedCurrentMatterWorktreeFixture: true,
    taskOptions: { actorId: ACTOR_ID },
  });
}

testWithIsolatedBackupRoot("fresh current-Matter seed projects one canonical MatterTask through the active worktree", async ({ backupRoot }) => {
  const runtime = freshFixtureRuntime(backupRoot);
  const seededMatter = runtime.repository.get({
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    model_type: "Matter",
    id: MATTER.matter_id,
  });
  const activeMembers = runtime.repository.list({
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    model_type: "MatterMember",
    matter_id: MATTER.matter_id,
  }).filter(({ user_id, status }) => user_id === ACTOR_ID && status === "active");

  const response = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER.matter_id}/worktree`,
    method: "GET",
    query: QUERY,
    context: context(ACTOR_ID),
    requestId: "current-seed-worktree-read",
    runtime,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "passed");
  assert.equal(response.body.item.root.persisted, false);
  assert.equal(activeMembers.length, 1);
  assert.equal(activeMembers[0].permission_envelope_id, seededMatter.permission_envelope_id);
  assert.deepEqual(
    response.body.item.unclassified.tasks.map(({ task_id }) => task_id),
    [TASK_ID],
  );
  assert.equal(
    runtime.repository.list({
      tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
      model_type: "MatterTask",
      matter_id: MATTER.matter_id,
    }).length,
    1,
  );
  assert.equal(
    runtime.repository.list({
      tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
      model_type: "MatterWorktree",
      matter_id: MATTER.matter_id,
    }).filter(({ status }) => status === "active").length,
    1,
  );
});

testWithIsolatedBackupRoot("fresh current-Matter seed keeps its worktree count-safe for a non-member", async ({ backupRoot }) => {
  const runtime = freshFixtureRuntime(backupRoot);

  const response = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER.matter_id}/worktree`,
    method: "GET",
    query: QUERY,
    context: context("user_not_a_matter_member"),
    requestId: "current-seed-worktree-denied",
    runtime,
  });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.item, undefined);
  assert.equal(response.body.count_leak_prevented, true);
  assert.equal(
    runtime.repository.list({
      tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
      model_type: "MatterTask",
      matter_id: MATTER.matter_id,
    }).length,
    1,
  );
});

for (const worktreeId of ["worktree_durable_selected", SEEDED_WORKTREE_ID]) {
  testWithIsolatedBackupRoot(`durable restart reuses active current-Matter worktree ${worktreeId} without changing user data`, async ({ backupRoot }) => {
    const seed = currentSeed();
    const filePath = durableStorePath("matter-current-active-restart-");
    let repository = createRepository({
      backupRoot,
      filePath,
      seedRecords: seedRecordsWithoutSelectedWorktree(seed),
    });
    const beforeWorktree = repository.create(durableWorktree({ worktreeId }));
    const beforeMember = repository.create(durableMember({ userId: ACTOR_ID }));
    repository.create(canonicalTask({ actorId: ACTOR_ID }));
    repository.close();

    repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
    const runtime = fixtureRuntime(repository);
    const response = await handleMatterApiRequest({
      pathname: `/api/matters/${MATTER.matter_id}/worktree`,
      method: "GET",
      query: QUERY,
      context: context(ACTOR_ID),
      requestId: `current-seed-durable-restart-${worktreeId}`,
      runtime,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.item.root.node_id, `worktree-root:${worktreeId}`);
    assert.deepEqual(response.body.item.unclassified.tasks.map(({ task_id }) => task_id), [TASK_ID]);
    assert.deepEqual(selectedRecords(repository, "MatterWorktree"), [beforeWorktree]);
    assert.deepEqual(selectedRecords(repository, "MatterMember"), [beforeMember]);
    repository.close();
  });
}

testWithIsolatedBackupRoot("durable restart adds only the missing selected actor membership beside an existing active worktree", ({ backupRoot }) => {
  const seed = currentSeed();
  const filePath = durableStorePath("matter-current-member-restart-");
  let repository = createRepository({
    backupRoot,
    filePath,
    seedRecords: seed.records,
  });
  const beforeWorktree = repository.create(durableWorktree({
    worktreeId: "worktree_durable_other_member",
  }));
  const otherMember = repository.create(durableMember({
    memberId: "member_durable_other_user",
    userId: "user_durable_other",
  }));
  repository.close();

  repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
  fixtureRuntime(repository);

  assert.deepEqual(selectedRecords(repository, "MatterWorktree"), [beforeWorktree]);
  assert.deepEqual(
    selectedRecords(repository, "MatterMember")
      .filter(({ user_id: userId }) => userId === "user_durable_other"),
    [otherMember],
  );
  const selectedActorMembers = selectedRecords(repository, "MatterMember")
    .filter(({ user_id: userId }) => userId === ACTOR_ID);
  assert.equal(selectedActorMembers.length, 1);
  assert.equal(selectedActorMembers[0].member_id, SEEDED_MEMBER_ID);
  assert.equal(selectedActorMembers[0].status, "active");
  repository.close();
});

testWithIsolatedBackupRoot("durable restart preserves archived seed-ID worktree and removed member without reactivation", ({ backupRoot }) => {
  const seed = currentSeed();
  const filePath = durableStorePath("matter-current-archived-restart-");
  let repository = createRepository({
    backupRoot,
    filePath,
    seedRecords: seedRecordsWithoutSelectedWorktree(seed),
  });
  const beforeWorktree = repository.create(durableWorktree({
    worktreeId: SEEDED_WORKTREE_ID,
    status: "archived",
  }));
  const beforeMember = repository.create(durableMember({
    memberId: SEEDED_MEMBER_ID,
    status: "removed",
    userId: ACTOR_ID,
  }));
  repository.close();

  repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
  fixtureRuntime(repository);

  assert.deepEqual(selectedRecords(repository, "MatterWorktree"), [beforeWorktree]);
  assert.deepEqual(selectedRecords(repository, "MatterMember"), [beforeMember]);
  assert.equal(selectedRecords(repository, "MatterWorktree").some(({ status }) => status === "active"), false);
  assert.equal(selectedRecords(repository, "MatterMember").some(({ status }) => status === "active"), false);
  repository.close();
});

testWithIsolatedBackupRoot("durable restart does not add an active member beside an archived worktree", ({ backupRoot }) => {
  const seed = currentSeed();
  const filePath = durableStorePath("matter-current-archived-no-member-restart-");
  let repository = createRepository({
    backupRoot,
    filePath,
    seedRecords: seedRecordsWithoutSelectedWorktree(seed),
  });
  const beforeWorktree = repository.create(durableWorktree({
    worktreeId: SEEDED_WORKTREE_ID,
    status: "archived",
  }));
  repository.close();

  repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
  fixtureRuntime(repository);

  assert.deepEqual(selectedRecords(repository, "MatterWorktree"), [beforeWorktree]);
  assert.deepEqual(selectedRecords(repository, "MatterMember"), []);
  repository.close();
});

testWithIsolatedBackupRoot("durable restart creates the current-Matter worktree only when no worktree record exists", async ({ backupRoot }) => {
  const seed = currentSeed();
  const filePath = durableStorePath("matter-current-missing-restart-");
  let repository = createRepository({
    backupRoot,
    filePath,
    seedRecords: seedRecordsWithoutSelectedWorktree(seed),
  });
  repository.create(canonicalTask({ actorId: ACTOR_ID }));
  repository.close();

  repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
  let runtime = fixtureRuntime(repository);
  const firstWorktree = selectedRecords(repository, "MatterWorktree");
  const firstMember = selectedRecords(repository, "MatterMember");
  assert.equal(firstWorktree.length, 1);
  assert.equal(firstWorktree[0].worktree_id, SEEDED_WORKTREE_ID);
  assert.equal(firstWorktree[0].source_revision, EXPECTED_SEED_SOURCE_REVISION);
  assert.equal(firstMember.length, 1);
  assert.equal(firstMember[0].member_id, SEEDED_MEMBER_ID);
  assert.equal(firstMember[0].permission_envelope_id, firstWorktree[0].permission_envelope_id);
  repository.close();

  repository = createRepository({ backupRoot, filePath, seedRecords: seed.records });
  runtime = fixtureRuntime(repository);
  const response = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER.matter_id}/worktree`,
    method: "GET",
    query: QUERY,
    context: context(ACTOR_ID),
    requestId: "current-seed-durable-missing-restart",
    runtime,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.item.unclassified.tasks.map(({ task_id }) => task_id), [TASK_ID]);
  assert.equal(selectedRecords(repository, "MatterWorktree").length, 1);
  assert.equal(selectedRecords(repository, "MatterMember").length, 1);
  repository.close();
});
