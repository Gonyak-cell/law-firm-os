import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { buildMatterWorktreeTree, flattenMatterWorktree, matterWorktreeExpandableIds } from "../src/components/matterWorktreeTree.js";

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
