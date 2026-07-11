import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../../../contracts/matter-worktree-domain-contract.json", import.meta.url);
const fixtureUrl = new URL("../fixtures/matter-worktree-domain-contract.fixture.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadContractAndFixture() {
  return Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);
}

test("WT-00-01 validates the domain contract fixture schema", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const missingFields = contract.fixture_schema.required.filter((field) => fixture[field] === undefined);

  // Then
  assert.deepEqual(missingFields, []);
  assert.equal(fixture.schema_version, contract.schema_version);
  assert.deepEqual(Object.keys(fixture.models).sort(), contract.fixture_schema.required_models.toSorted());
});

test("WT-00-01 fixes worktree models and status vocabularies", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const worktree = fixture.models.MatterWorktree;
  const nodes = fixture.models.MatterWorktreeNode;

  // Then
  assert.deepEqual(contract.models.MatterWorktree.statuses, ["active", "archived"]);
  assert.deepEqual(contract.models.MatterWorktreeNode.node_types, ["branch", "task"]);
  assert.equal(worktree.status, "active");
  assert.equal(nodes.every((node) => contract.models.MatterWorktreeNode.node_types.includes(node.node_type)), true);
  assert.equal(nodes.find((node) => node.node_type === "task")?.task_id, "task_wt_contract_001");
});

test("WT-00-01 projects the root instead of persisting a root node", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const persistedRoot = fixture.models.MatterWorktreeNode.find((node) => node.node_type === "root");

  // Then
  assert.equal(contract.root_projection.persisted, false);
  assert.equal(contract.root_projection.source, "MatterWorktree+Matter");
  assert.equal(persistedRoot, undefined);
  assert.equal(fixture.expected_projection.root.node_type, "root");
  assert.equal(fixture.expected_projection.root.depth, 0);
});

test("WT-00-01 archives placement without deleting MatterTask", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const deletion = fixture.expected_deletion;

  // Then
  assert.equal(contract.deletion_semantics.node_action, "archive_placement");
  assert.equal(contract.deletion_semantics.matter_task_action, "retain");
  assert.equal(deletion.node_status, "archived");
  assert.equal(deletion.matter_task_deleted, false);
});

test("WT-00-01 fixes depth and one-active-worktree constraints", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const activeKey = contract.active_worktree_rule.uniqueness_key.map((field) => fixture.models.MatterWorktree[field]);

  // Then
  assert.equal(contract.structure.max_depth, 4);
  assert.equal(contract.structure.depth_persisted, false);
  assert.equal(contract.active_worktree_rule.max_active_per_matter, 1);
  assert.deepEqual(activeKey, ["tenant_wt_contract", "matter_wt_contract"]);
});
