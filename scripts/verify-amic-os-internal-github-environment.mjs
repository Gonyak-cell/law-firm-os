import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://api.github.com";
const REPOSITORY = "Gonyak-cell/law-firm-os";

export const AMIC_INTERNAL_PROTECTED_ENVIRONMENTS = Object.freeze([
  "amic-os-internal-unsigned-publish",
  "amic-os-internal-unsigned-readback",
]);

function fail(message) {
  throw new Error(message);
}

export function validateAmicInternalGitHubEnvironment(value, {
  environmentName,
} = {}) {
  const reviewerRules = (value?.protection_rules ?? []).filter(
    (rule) => rule?.type === "required_reviewers",
  );
  const reviewers = reviewerRules[0]?.reviewers;
  if (!AMIC_INTERNAL_PROTECTED_ENVIRONMENTS.includes(environmentName)
    || value?.name !== environmentName
    || reviewerRules.length !== 1
    || !Array.isArray(reviewers)
    || reviewers.length < 1
    || reviewerRules[0].prevent_self_review !== true
    || value?.can_admins_bypass !== false
    || value?.deployment_branch_policy?.protected_branches !== true
    || value?.deployment_branch_policy?.custom_branch_policies !== false) {
    fail("internal unsigned GitHub environment protection is incomplete");
  }
  return Object.freeze({
    schema_version: "law-firm-os.amic-internal-github-environment.v1",
    verdict: "PASS",
    environment_name: environmentName,
    required_reviewer_count: reviewers.length,
    prevent_self_review: true,
    admins_can_bypass: false,
    protected_branches_only: true,
    github_api_read_count: 1,
    raw_reviewer_identity_returned: false,
    raw_token_returned: false,
  });
}

export async function inspectAmicInternalGitHubEnvironment({
  apiUrl = API_URL,
  repository = REPOSITORY,
  environmentName,
  token,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (apiUrl !== API_URL
    || repository !== REPOSITORY
    || !AMIC_INTERNAL_PROTECTED_ENVIRONMENTS.includes(environmentName)
    || typeof token !== "string"
    || token.length < 1
    || typeof fetchImpl !== "function") {
    fail("internal unsigned GitHub environment request binding is invalid");
  }
  let response;
  try {
    response = await fetchImpl(
      `${API_URL}/repos/${REPOSITORY}/environments/${encodeURIComponent(environmentName)}`,
      {
        method: "GET",
        redirect: "error",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "lawos-amic-internal-environment-guard",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
  } catch {
    fail("internal unsigned GitHub environment read failed");
  }
  if (response?.ok !== true || response.status !== 200) {
    fail("internal unsigned GitHub environment read failed");
  }
  let value;
  try {
    value = await response.json();
  } catch {
    fail("internal unsigned GitHub environment response is invalid");
  }
  return validateAmicInternalGitHubEnvironment(value, { environmentName });
}

function parseEnvironmentName(args) {
  if (args.length !== 2 || args[0] !== "--environment") {
    fail("usage: verify-amic-os-internal-github-environment.mjs --environment <name>");
  }
  return args[1];
}

async function main() {
  const result = await inspectAmicInternalGitHubEnvironment({
    apiUrl: process.env.GITHUB_API_URL,
    repository: process.env.GITHUB_REPOSITORY,
    environmentName: parseEnvironmentName(process.argv.slice(2)),
    token: process.env.GITHUB_TOKEN,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      verdict: "BLOCKED",
      error: error.message,
      raw_reviewer_identity_returned: false,
      raw_token_returned: false,
    })}\n`);
    process.exitCode = 2;
  });
}
