import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../../../contracts/matter-worktree-permission-transition-contract.json", import.meta.url);
const fixtureUrl = new URL("../fixtures/matter-worktree-permission-transition-contract.fixture.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadContractAndFixture() {
  return Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);
}

test("WT-00-03 fixes allow and deny outcomes for every Matter role and worktree action", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const actual = fixture.permission_cases.map(({ role, action }) => contract.role_permissions[role]?.[action] ?? "deny");

  // Then
  assert.deepEqual(actual, fixture.permission_cases.map(({ expected }) => expected));
  assert.deepEqual(Object.keys(contract.role_permissions).sort(), contract.roles.toSorted());
  assert.equal(contract.actions.every((action) => contract.roles.every((role) => contract.role_permissions[role][action])), true);
  assert.equal(contract.authorization_resolution.worktree_actions_require_explicit_grant, true);
  assert.deepEqual(contract.authorization_resolution.generic_matter_write_never_grants, ["template:manage", "template:approve"]);
});

test("WT-00-03 requires active same-tenant Matter membership before any worktree access", async () => {
  // Given
  const contract = await readJson(contractUrl);

  // When
  const boundary = contract.access_boundary;

  // Then
  assert.equal(boundary.default_outcome, "deny");
  assert.deepEqual(boundary.required_matches, ["tenant_id", "matter_id"]);
  assert.equal(boundary.active_matter_member_required, true);
  assert.equal(boundary.denied_resource_disclosure, "not_found");
  assert.equal(boundary.denied_counts_disclosed, false);
});

test("WT-00-03 limits completion and reopen to writable team roles and requires a reopen reason", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const completeCases = fixture.task_transition_cases.filter(({ command }) => command === "complete");
  const reopenCases = fixture.task_transition_cases.filter(({ command }) => command === "reopen");

  // Then
  assert.equal(contract.actor_requirements.task_complete.assignment, "assignee_or_active_matter_team_member");
  assert.equal(contract.actor_requirements.task_reopen.assignment, "assignee_or_active_matter_team_member");
  assert.equal(contract.actor_requirements.task_reopen.reason_required, true);
  assert.deepEqual(completeCases.map(({ expected }) => expected), ["allow", "allow", "deny", "deny"]);
  assert.deepEqual(reopenCases.map(({ expected }) => expected), ["allow", "deny", "deny"]);
});

test("WT-00-03 forbids blocked completion and permits done reopen only to in_progress", async () => {
  // Given
  const [contract, fixture] = await loadContractAndFixture();

  // When
  const taskTransitions = contract.task_transitions;
  const blockedComplete = fixture.task_transition_cases.find(({ id }) => id === "complete-blocked");
  const validReopen = fixture.task_transition_cases.find(({ id }) => id === "reopen-done-with-reason");

  // Then
  assert.deepEqual(taskTransitions.complete.from, ["todo", "in_progress"]);
  assert.equal(taskTransitions.complete.to, "done");
  assert.equal(taskTransitions.complete.blocked_source_allowed, false);
  assert.deepEqual(taskTransitions.reopen.from, ["done"]);
  assert.equal(taskTransitions.reopen.to, "in_progress");
  assert.equal(blockedComplete.expected, "deny");
  assert.equal(validReopen.expected, "allow");
});

test("WT-00-03 keeps template approval closed until a named approver is recorded", async () => {
  // Given
  const contract = await readJson(contractUrl);

  // When
  const gate = contract.template_approval_gate;
  const approvalGrants = contract.roles.map((role) => contract.role_permissions[role]["template:approve"]);

  // Then
  assert.equal(gate.status, "owner_assignment_required");
  assert.equal(gate.approver_id, null);
  assert.equal(gate.approval_ref_required, true);
  assert.deepEqual(approvalGrants, contract.roles.map(() => "deny"));
  assert.equal(contract.template_transitions.draft.approved, "owner_gate");
  assert.equal(contract.template_transitions.approved.draft, "deny_new_version_required");
});
