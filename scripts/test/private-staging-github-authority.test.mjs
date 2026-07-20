import assert from "node:assert/strict";
import test from "node:test";
import { validatePrivateStagingGithubChecks } from "../lib/private-staging-github-authority.mjs";

const headSha = "a".repeat(40);
const repository = "Gonyak-cell/law-firm-os";
const workflowSha256 = "b".repeat(64);

function fixtures() {
  return {
    checkRuns: [{
      name: "Private staging security",
      status: "completed",
      conclusion: "success",
      head_sha: headSha,
      app: { id: 15368, slug: "github-actions" },
      check_suite: { id: 101 },
    }],
    workflowRuns: [{
      name: "Private Staging Security",
      path: ".github/workflows/private-staging-security.yml",
      event: "pull_request",
      status: "completed",
      conclusion: "success",
      head_sha: headSha,
      check_suite_id: 101,
      repository: { full_name: repository },
      head_repository: { full_name: repository },
    }],
    repository,
    headSha,
    workflowSha256,
  };
}

test("GitHub security evidence binds app, workflow, repository, and exact head", () => {
  assert.equal(validatePrivateStagingGithubChecks(fixtures()).security_check_count, 1);
  for (const mutate of [
    (input) => { input.checkRuns[0].app.id = 999; },
    (input) => { input.workflowRuns[0].path = ".github/workflows/spoof.yml"; },
    (input) => { input.workflowRuns[0].repository.full_name = "attacker/fork"; },
    (input) => { input.checkRuns[0].head_sha = "c".repeat(40); },
  ]) {
    const input = fixtures();
    mutate(input);
    assert.throws(() => validatePrivateStagingGithubChecks(input), /trusted|exact-head/u);
  }
});

test("GitHub security evidence rejects duplicate trusted contexts", () => {
  const input = fixtures();
  input.checkRuns.push({ ...structuredClone(input.checkRuns[0]), check_suite: { id: 102 } });
  input.workflowRuns.push({ ...structuredClone(input.workflowRuns[0]), check_suite_id: 102 });
  assert.throws(() => validatePrivateStagingGithubChecks(input), /exactly one/u);
});
