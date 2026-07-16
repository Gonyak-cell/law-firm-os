import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { buildMatterWorktreeTree, createLatestWorktreeRequestSequence, flattenMatterWorktree, matterWorktreeExpandableIds, nextMatterWorktreeSortOrder } from "../src/components/matterWorktreeTree.js";

function projection(nodeCount = 300) {
  const nodes = [];
  const branches = 10;
  for (let branch = 0; branch < branches; branch += 1) {
    const branchId = `branch-${branch}`;
    nodes.push({ node_id: branchId, node_type: "branch", parent_node_id: null, title: `단계 ${branch + 1}`, sort_order: branch });
    for (let index = 0; index < nodeCount / branches - 1; index += 1) {
      const taskId = `task-${branch}-${index}`;
      nodes.push({ node_id: `node-${taskId}`, node_type: "task", parent_node_id: branchId, title: `업무 ${branch + 1}-${index + 1}`, sort_order: index, task_id: taskId, task: { task_id: taskId, status: index % 4 === 0 ? "done" : "todo" } });
    }
  }
  return { root: { node_id: "root-300", node_type: "root", title: "300개 노드 QA" }, nodes, unclassified: { tasks: [] } };
}

test("WT-04-05 prepares and traverses 300 Worktree nodes within the 1.5 second render budget", (t) => {
  const samples = [];
  const item = projection();
  for (let index = 0; index < 50; index += 1) {
    const started = performance.now();
    const tree = buildMatterWorktreeTree(item);
    const flat = flattenMatterWorktree(tree, new Set(matterWorktreeExpandableIds(tree)));
    JSON.stringify(tree);
    samples.push(performance.now() - started);
    assert.equal(flat.length, 301);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p95 = samples[Math.floor(samples.length * 0.95)];
  t.diagnostic(`300 nodes: p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${samples.at(-1).toFixed(2)}ms`);
  assert.ok(p50 < 1500, `p50 ${p50.toFixed(2)}ms`);
  assert.ok(p95 < 1500, `p95 ${p95.toFixed(2)}ms`);
});

test("only the latest Matter selection may commit after out-of-order responses", async () => {
  const sequence = createLatestWorktreeRequestSequence();
  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  };
  const slowMatter = deferred();
  const fastMatter = deferred();
  let renderedMatter = "";
  const load = async (matterId, response) => {
    const requestId = sequence.begin();
    await response;
    if (sequence.isCurrent(requestId)) renderedMatter = matterId;
  };

  const slowLoad = load("matter-a", slowMatter.promise);
  const fastLoad = load("matter-b", fastMatter.promise);
  fastMatter.resolve();
  await fastLoad;
  slowMatter.resolve();
  await slowLoad;

  assert.equal(renderedMatter, "matter-b");
});

test("a mutation response cannot commit after the user selects another Matter", async () => {
  const mutationSequence = createLatestWorktreeRequestSequence();
  let resolveMutation;
  const response = new Promise((resolve) => { resolveMutation = resolve; });
  let selectedMatter = "matter-a";
  let renderedMatter = selectedMatter;
  const operation = { matterId: selectedMatter, requestId: mutationSequence.begin() };
  const mutation = response.then(() => {
    if (selectedMatter === operation.matterId && mutationSequence.isCurrent(operation.requestId)) renderedMatter = operation.matterId;
  });

  selectedMatter = "matter-b";
  renderedMatter = selectedMatter;
  mutationSequence.begin();
  resolveMutation();
  await mutation;

  assert.equal(renderedMatter, "matter-b");
});

test("new Worktree siblings append after the highest active sort order when gaps exist", () => {
  const siblingsAfterArchive = [{ node_id: "remaining", sort_order: 1 }];

  const nextSortOrder = nextMatterWorktreeSortOrder(siblingsAfterArchive);

  assert.equal(nextSortOrder, 2);
  assert.equal(nextMatterWorktreeSortOrder([]), 0);
});
