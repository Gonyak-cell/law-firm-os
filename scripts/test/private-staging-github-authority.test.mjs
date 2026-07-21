import assert from "node:assert/strict";
import test from "node:test";
import { validatePrivateStagingGithubChecks } from "../lib/private-staging-github-authority.mjs";

const headSha = "a".repeat(40);
const repository = "Gonyak-cell/law-firm-os";
const workflowSha256 = "b".repeat(64);

function fixtures() {
  return {
    checkRuns: [
      {
        id: 1001,
        name: "Private staging security",
        status: "completed",
        conclusion: "success",
        started_at: "2026-07-20T00:00:00Z",
        completed_at: "2026-07-20T00:01:00Z",
        head_sha: headSha,
        app: { id: 15368, slug: "github-actions" },
        check_suite: { id: 101 },
      },
      {
        id: 1101,
        name: "Analyze (javascript-typescript)",
        status: "completed",
        conclusion: "success",
        started_at: "2026-07-20T00:00:00Z",
        completed_at: "2026-07-20T00:02:00Z",
        head_sha: headSha,
        app: { id: 15368, slug: "github-actions" },
        check_suite: { id: 111 },
      },
      {
        id: 1201,
        name: "CodeQL",
        status: "completed",
        conclusion: "neutral",
        started_at: "2026-07-20T00:02:00Z",
        completed_at: "2026-07-20T00:02:01Z",
        head_sha: headSha,
        app: { id: 57789, slug: "github-advanced-security" },
        check_suite: { id: 121 },
      },
    ],
    workflowRuns: [
      {
        id: 2001,
        name: "Private Staging Security",
        path: ".github/workflows/private-staging-security.yml",
        event: "pull_request",
        status: "completed",
        conclusion: "success",
        created_at: "2026-07-20T00:00:00Z",
        head_sha: headSha,
        check_suite_id: 101,
        repository: { full_name: repository },
        head_repository: { full_name: repository },
      },
      {
        id: 2101,
        name: "CodeQL Setup",
        path: "dynamic/github-code-scanning/codeql",
        event: "dynamic",
        status: "completed",
        conclusion: "success",
        created_at: "2026-07-20T00:00:00Z",
        head_sha: headSha,
        check_suite_id: 111,
        repository: { full_name: repository },
        head_repository: { full_name: repository },
      },
    ],
    repository,
    headSha,
    workflowSha256,
  };
}

test("GitHub security evidence binds app, workflow, repository, and exact head", () => {
  const result = validatePrivateStagingGithubChecks(fixtures());
  assert.equal(result.security_check_count, 1);
  assert.equal(result.codeql_check_count, 1);
  assert.equal(result.platform_check_count, 1);
  assert.equal(result.platform_checks[0].conclusion, "NEUTRAL");
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

test("GitHub security evidence rejects failed or untrusted standalone checks", () => {
  const failed = fixtures();
  failed.checkRuns[2].conclusion = "failure";
  assert.throws(() => validatePrivateStagingGithubChecks(failed), /platform check/u);

  const untrusted = fixtures();
  untrusted.checkRuns.push({
    ...structuredClone(untrusted.checkRuns[2]),
    id: 1301,
    name: "Security review",
    app: { id: 999, slug: "untrusted" },
  });
  assert.throws(() => validatePrivateStagingGithubChecks(untrusted), /untrusted publisher/u);
});

test("GitHub security evidence selects the latest duplicate trusted context", () => {
  const input = fixtures();
  input.checkRuns.push({
    ...structuredClone(input.checkRuns[0]),
    id: 1002,
    started_at: "2026-07-21T00:00:00Z",
    completed_at: "2026-07-21T00:01:00Z",
    check_suite: { id: 102 },
  });
  input.workflowRuns.push({
    ...structuredClone(input.workflowRuns[0]),
    id: 2002,
    created_at: "2026-07-21T00:00:00Z",
    check_suite_id: 102,
  });
  const result = validatePrivateStagingGithubChecks(input);
  assert.equal(result.security_check_count, 1);
  assert.equal(result.security_checks[0].check_run_id, 1002);
  assert.equal(result.check_count, 2);
});

test("GitHub security evidence rejects a newer failed duplicate context", () => {
  const input = fixtures();
  input.checkRuns.push({
    ...structuredClone(input.checkRuns[0]),
    id: 1002,
    status: "completed",
    conclusion: "failure",
    started_at: "2026-07-21T00:00:00Z",
    completed_at: "2026-07-21T00:01:00Z",
    check_suite: { id: 102 },
  });
  input.workflowRuns.push({
    ...structuredClone(input.workflowRuns[0]),
    id: 2002,
    status: "completed",
    conclusion: "failure",
    created_at: "2026-07-21T00:00:00Z",
    check_suite_id: 102,
  });
  assert.throws(() => validatePrivateStagingGithubChecks(input), /latest exact-head CI/u);
});
