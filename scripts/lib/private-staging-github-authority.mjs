const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

export const PRIVATE_STAGING_TRUSTED_SECURITY_CHECK = Object.freeze({
  name: "Private staging security",
  app_id: 15368,
  app_slug: "github-actions",
  workflow_name: "Private Staging Security",
  workflow_path: ".github/workflows/private-staging-security.yml",
  event: "pull_request",
});

function fail(message) {
  const error = new Error(message);
  error.code = "PRIVATE_STAGING_GITHUB_AUTHORITY_INVALID";
  throw error;
}

function required(value, name, pattern) {
  const text = String(value ?? "").trim();
  if (!text || (pattern && !pattern.test(text))) fail(`${name} is invalid`);
  return text;
}

export function validatePrivateStagingGithubChecks({ checkRuns, workflowRuns, repository, headSha, workflowSha256 } = {}) {
  const repo = required(repository, "repository", REPOSITORY);
  const sha = required(headSha, "headSha", SHA1);
  const workflowDigest = required(workflowSha256, "workflowSha256", SHA256);
  if (!Array.isArray(checkRuns) || !checkRuns.length || !Array.isArray(workflowRuns)) fail("GitHub check and workflow inventories are required");
  if (checkRuns.length > 100 || workflowRuns.length > 100) fail("GitHub check inventory exceeds the closed first-page contract");

  const runsBySuite = new Map();
  for (const run of workflowRuns) {
    if (run?.head_sha !== sha || run?.repository?.full_name !== repo || run?.head_repository?.full_name !== repo) continue;
    const suiteId = Number(run.check_suite_id);
    if (!Number.isSafeInteger(suiteId) || suiteId < 1 || runsBySuite.has(suiteId)) fail("GitHub workflow suite identity is missing or duplicated");
    runsBySuite.set(suiteId, run);
  }

  const checks = checkRuns.map((check) => {
    const suiteId = Number(check?.check_suite?.id);
    const workflow = runsBySuite.get(suiteId);
    if (check?.head_sha !== sha || String(check?.status).toLowerCase() !== "completed" || String(check?.conclusion).toLowerCase() !== "success") {
      fail("exact-head CI contains a missing, pending, skipped, neutral, or failed check");
    }
    if (!workflow || String(workflow.status).toLowerCase() !== "completed" || String(workflow.conclusion).toLowerCase() !== "success") {
      fail("GitHub check is not bound to one successful exact-head workflow run");
    }
    return Object.freeze({
      name: required(check.name, "check name"),
      conclusion: "SUCCESS",
      publisher_app_id: Number(check.app?.id),
      publisher_app_slug: String(check.app?.slug ?? ""),
      check_suite_id: suiteId,
      workflow_name: String(workflow.name ?? ""),
      workflow_path: String(workflow.path ?? ""),
      workflow_event: String(workflow.event ?? ""),
      repository: repo,
      head_sha: sha,
    });
  });

  const expected = PRIVATE_STAGING_TRUSTED_SECURITY_CHECK;
  const trustedSecurity = checks.filter((check) => (
    check.name === expected.name
    && check.publisher_app_id === expected.app_id
    && check.publisher_app_slug === expected.app_slug
    && check.workflow_name === expected.workflow_name
    && check.workflow_path === expected.workflow_path
    && check.workflow_event === expected.event
    && check.repository === repo
    && check.head_sha === sha
  ));
  if (trustedSecurity.length !== 1) fail("exactly one trusted exact-head security check is required");
  return Object.freeze({
    checks: Object.freeze(checks),
    security_checks: Object.freeze(trustedSecurity.map((check) => Object.freeze({ ...check, workflow_sha256: workflowDigest }))),
    check_count: checks.length,
    security_check_count: 1,
  });
}
