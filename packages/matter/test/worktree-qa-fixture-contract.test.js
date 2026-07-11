import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyMatterPracticeArea } from "../src/practice-area.js";
import { projectMatterWorktree } from "../src/worktree-projection.js";

const contractUrl = new URL("../../../contracts/matter-worktree-qa-fixture-contract.json", import.meta.url);
const fixtureUrl = new URL("../fixtures/matter-worktree-qa.fixture.json", import.meta.url);
const practiceAreaContractUrl = new URL("../../../contracts/matter-worktree-practice-area-contract.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US").replaceAll(/[_-]+/g, " ").replaceAll(/\s+/g, " ");
}

function classify(contract, matter) {
  for (const field of contract.source_fields) {
    const normalized = normalize(matter[field]);
    if (!normalized) continue;
    const area = contract.practice_areas.find((candidate) => candidate.aliases.some((alias) => normalize(alias) === normalized));
    if (area) return area.id;
  }
  return contract.unclassified.id;
}

test("WT-00-04 provides exactly two QA Matters for each of the four practice areas", async () => {
  // Given
  const [contract, fixture, practiceAreas] = await Promise.all([
    readJson(contractUrl),
    readJson(fixtureUrl),
    readJson(practiceAreaContractUrl),
  ]);

  // When
  const counts = Object.groupBy(fixture.matters, (matter) => classify(practiceAreas, matter));

  // Then
  assert.equal(fixture.matters.length, contract.matter_count);
  assert.equal(new Set(fixture.matters.map(({ matter_id }) => matter_id)).size, 8);
  assert.deepEqual(Object.fromEntries(contract.practice_area_ids.map((id) => [id, counts[id]?.length ?? 0])), {
    litigation: 2,
    "corporate-advisory": 2,
    dispute: 2,
    transaction: 2,
  });
});

test("WT-00-04 gives every Matter existing MatterTask records without projection omissions", async () => {
  // Given
  const fixture = await readJson(fixtureUrl);

  // When
  const taskIds = fixture.tasks.map(({ task_id }) => task_id);
  const projectedTaskIds = fixture.expected_projection.flatMap(({ task_ids }) => task_ids);

  // Then
  assert.equal(new Set(taskIds).size, taskIds.length);
  assert.equal(fixture.matters.every(({ matter_id }) => fixture.tasks.some((task) => task.matter_id === matter_id)), true);
  assert.deepEqual(projectedTaskIds.toSorted(), taskIds.toSorted());
});

test("WT-00-04 covers blocked and overdue behavior in every practice area", async () => {
  // Given
  const [fixture, practiceAreas] = await Promise.all([readJson(fixtureUrl), readJson(practiceAreaContractUrl)]);
  const matterById = new Map(fixture.matters.map((matter) => [matter.matter_id, matter]));
  const asOf = Date.parse(fixture.as_of);

  // When
  const coverage = Object.groupBy(fixture.tasks, (task) => classify(practiceAreas, matterById.get(task.matter_id)));

  // Then
  for (const tasks of Object.values(coverage)) {
    assert.equal(tasks.some(({ status }) => status === "blocked"), true);
    assert.equal(tasks.some(({ status, due_at }) => !["done", "cancelled"].includes(status) && Date.parse(due_at) < asOf), true);
  }
});

test("WT-00-04 uses only supported task states and keeps completion solely on MatterTask.status", async () => {
  // Given
  const [contract, fixture] = await Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);

  // When
  const unsupported = fixture.tasks.filter(({ status }) => !contract.supported_task_statuses.includes(status));
  const duplicateCompletionFields = fixture.tasks.flatMap((task) => Object.keys(task).filter((field) => contract.forbidden_completion_fields.includes(field)));

  // Then
  assert.deepEqual(unsupported, []);
  assert.deepEqual(duplicateCompletionFields, []);
  assert.equal(contract.completion_source, "MatterTask.status");
});

test("WT-00-04 fixture remains synthetic, tenant-scoped, and deterministic", async () => {
  // Given
  const [contract, fixture] = await Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);

  // When
  const tenantIds = new Set([
    ...fixture.matters.map(({ tenant_id }) => tenant_id),
    ...fixture.tasks.map(({ tenant_id }) => tenant_id),
  ]);

  // Then
  assert.equal(fixture.synthetic_only, true);
  assert.deepEqual([...tenantIds], [contract.tenant_id]);
  assert.match(fixture.as_of, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(fixture.matters.every(({ title }) => title.startsWith("[QA] ")), true);
});

test("WT-04-01 runs all eight Matters through the production classifier and Worktree projection", async () => {
  const fixture = await readJson(fixtureUrl);
  const expectedByMatter = new Map(fixture.expected_projection.map((item) => [item.matter_id, item.task_ids]));
  const expectedAreaByMatter = new Map([
    ["matter_wt_qa_lit_01", "litigation"], ["matter_wt_qa_lit_02", "litigation"],
    ["matter_wt_qa_adv_01", "corporate-advisory"], ["matter_wt_qa_adv_02", "corporate-advisory"],
    ["matter_wt_qa_dispute_01", "dispute"], ["matter_wt_qa_dispute_02", "dispute"],
    ["matter_wt_qa_deal_01", "transaction"], ["matter_wt_qa_deal_02", "transaction"],
  ]);

  for (const matter of fixture.matters) {
    const tasks = fixture.tasks.filter((task) => task.matter_id === matter.matter_id);
    const projection = projectMatterWorktree({
      worktree: { tenant_id: matter.tenant_id, matter_id: matter.matter_id, worktree_id: `worktree:${matter.matter_id}` },
      matter,
      nodes: [],
      tasks,
      as_of: fixture.as_of,
    });
    const projectedTaskIds = projection.unclassified.tasks.map(({ task_id }) => task_id).toSorted();
    assert.equal(classifyMatterPracticeArea(matter), expectedAreaByMatter.get(matter.matter_id));
    assert.deepEqual(projectedTaskIds, expectedByMatter.get(matter.matter_id).toSorted());
  }
});
