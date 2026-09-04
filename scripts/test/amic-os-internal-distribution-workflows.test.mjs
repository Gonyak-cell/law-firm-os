import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  AMIC_INTERNAL_PROTECTED_ENVIRONMENTS,
  inspectAmicInternalGitHubEnvironment,
  validateAmicInternalGitHubEnvironment,
} from "../verify-amic-os-internal-github-environment.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("internal-unsigned publisher builds on exact main, validates before AWS credential configuration, and never uploads the installer to GitHub", async () => {
  const dispatcher = await readFile(
    path.join(root, ".github/workflows/amic-os-internal-unsigned-publish.yml"),
    "utf8",
  );
  const source = await readFile(
    path.join(root, ".github/workflows/amic-os-internal-unsigned-publisher.yml"),
    "utf8",
  );
  assert.match(dispatcher, /^permissions: \{\}$/mu);
  assert.equal(dispatcher.match(/^\s+actions: read$/gmu)?.length, 2);
  assert.doesNotMatch(dispatcher, /^\s+runs-on:/mu);
  assert.doesNotMatch(dispatcher, /^\s+run:/mu);
  assert.match(dispatcher, /group: amic-os-internal-unsigned-publish/u);
  assert.match(dispatcher, /cancel-in-progress: false/u);
  assert.match(dispatcher, /publication_mode:/u);
  assert.match(dispatcher, /options:\s*\n\s*- successor\s*\n\s*- baseline/u);
  assert.match(
    dispatcher,
    /uses: \.\/\.github\/workflows\/amic-os-internal-unsigned-publisher\.yml/u,
  );
  assert.match(
    dispatcher,
    /uses: \.\/\.github\/workflows\/amic-os-internal-unsigned-readback\.yml/u,
  );
  assert.match(source, /^permissions: \{\}$/mu);
  assert.match(source, /^\s+actions: read$/mu);
  assert.match(source, /workflow_call:/u);
  assert.doesNotMatch(source, /workflow_dispatch:/u);
  assert.match(
    source,
    /github\.workflow_ref == 'Gonyak-cell\/law-firm-os\/\.github\/workflows\/amic-os-internal-unsigned-publish\.yml@refs\/heads\/main'/u,
  );
  assert.match(source, /environment:\s+name: amic-os-internal-unsigned-publish/u);
  assert.match(source, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/u);
  assert.match(source, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/u);
  assert.match(source, /aws-actions\/configure-aws-credentials@61815dcd50bd041e203e49132bacad1fd04d2708/u);
  assert.match(source, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
  assert.match(source, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.match(
    source,
    /verify-amic-os-internal-github-environment\.mjs --environment amic-os-internal-unsigned-publish/u,
  );
  assert.match(source, /CSC_IDENTITY_AUTO_DISCOVERY: "false"/u);
  assert.match(source, /MATTER_DESKTOP_DISTRIBUTION_PROFILE: internal-unsigned/u);
  assert.match(source, /publication_mode:/u);
  assert.match(
    source,
    /MATTER_INTERNAL_UPDATE_PUBLIC_KEY_SPKI_BASE64: \$\{\{ vars\.AMIC_INTERNAL_METADATA_PUBLIC_KEY_SPKI_B64 \}\}/u,
  );
  assert.match(source, /scripts\/prepare-amic-os-internal-unsigned-publication\.mjs/u);
  assert.match(source, /'scripts\/publish-amic-os-internal-unsigned\.mjs', '--execute'/u);
  assert.match(source, /--publication-mode/u);
  assert.match(source, /readback_locator_base64/u);
  assert.match(source, /Upload sanitized publication receipt only/u);
  assert.doesNotMatch(source, /path: .*AMIC-OS-internal-.*\.exe/u);
  assert.doesNotMatch(source, /gh release|softprops\/action-gh-release|ncipollo\/release-action/iu);
  assert.ok(
    source.indexOf("verify-amic-os-internal-github-environment.mjs")
      < source.indexOf("npm ci"),
    "protected environment must be verified before dependency installation",
  );
  assert.ok(
    source.indexOf("prepare-amic-os-internal-unsigned-publication.mjs")
      < source.indexOf("aws-actions/configure-aws-credentials@"),
    "local security preflight must run before AWS credential configuration",
  );
  assert.ok(
    source.indexOf("aws-actions/configure-aws-credentials@")
      < source.indexOf("'scripts/publish-amic-os-internal-unsigned.mjs', '--execute'"),
    "publication must run only after the publisher role is assumed",
  );
});

test("independent readback uses its own environment and read-only OIDC job", async () => {
  const source = await readFile(
    path.join(root, ".github/workflows/amic-os-internal-unsigned-readback.yml"),
    "utf8",
  );
  assert.match(source, /^permissions: \{\}$/mu);
  assert.match(source, /^\s+actions: read$/mu);
  assert.match(source, /workflow_call:/u);
  assert.doesNotMatch(source, /workflow_dispatch:/u);
  assert.match(
    source,
    /github\.workflow_ref == 'Gonyak-cell\/law-firm-os\/\.github\/workflows\/amic-os-internal-unsigned-publish\.yml@refs\/heads\/main'/u,
  );
  assert.match(source, /environment:\s+name: amic-os-internal-unsigned-readback/u);
  assert.match(source, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.match(
    source,
    /verify-amic-os-internal-github-environment\.mjs --environment amic-os-internal-unsigned-readback/u,
  );
  assert.match(source, /Read 7 bootstrap, 9 baseline, or 18 successor exact S3 versions with isolated authority/u);
  assert.match(source, /scripts\/readback-amic-os-internal-unsigned\.mjs --execute/u);
  assert.match(source, /expectedCount = \{ baseline: 9, successor: 18, "managed-bootstrap": 7 \}/u);
  assert.match(source, /--publication-mode "\$PUBLICATION_MODE"/u);
  assert.match(source, /--locator "\$AMIC_INTERNAL_READBACK_ROOT\/publication-locator\.json"/u);
  assert.match(source, /anonymous_s3_denied !== true/u);
  assert.match(source, /unsigned_cloudfront_denied !== true/u);
  assert.match(source, /Upload sanitized independent readback receipt only/u);
  assert.match(
    source,
    /path: \$\{\{ env\.AMIC_INTERNAL_READBACK_ROOT \}\}\/readback-receipt\.json/u,
  );
  assert.match(source, /rm -rf -- "\$AMIC_INTERNAL_READBACK_ROOT"/u);
  assert.doesNotMatch(source, /AMIC_INTERNAL_RUN_ROOT/u);
  assert.doesNotMatch(source, /secretsmanager:GetSecretValue|METADATA_SIGNING_SECRET|s3:PutObject/u);
  assert.doesNotMatch(source, /path: .*\.exe/u);
  assert.ok(
    source.indexOf("verify-amic-os-internal-github-environment.mjs")
      < source.indexOf("aws-actions/configure-aws-credentials@"),
    "protected environment must be verified before readback AWS credentials",
  );
});

test("managed bootstrap uses the same protected build and isolated reader without an installation shortcut", async () => {
  const readWorkflow = (name) => readFile(path.join(root, `.github/workflows/${name}.yml`), "utf8");
  const dispatcher = await readWorkflow("amic-os-internal-unsigned-publish");
  const publisher = await readWorkflow("amic-os-internal-unsigned-publisher");
  const reader = await readWorkflow("amic-os-internal-unsigned-readback");
  assert.match(dispatcher, /- managed-bootstrap/u);
  assert.match(publisher, /'baseline', 'successor', 'managed-bootstrap'/u);
  assert.match(publisher, /\$private\.managed_bootstrap_marker/u);
  assert.match(reader, /internal-unsigned\/baseline\/managed-bootstrap\//u);
  assert.match(reader, /validateAmicInternalDistributionRelease/u);
  assert.match(reader, /release\.sourceSha !== process\.env\.INPUT_SOURCE_SHA/u);
  assert.match(reader, /release_args=\(--release/u);
  assert.doesNotMatch(publisher, /installationId\s*=|installation_id\s*=/u);
});

function protectedEnvironment(name) {
  return {
    name,
    can_admins_bypass: false,
    protection_rules: [{
      type: "required_reviewers",
      prevent_self_review: false,
      reviewers: [{
        type: "User",
        reviewer: { id: 212459168, type: "User", login: "private-owner" },
      }],
    }],
    deployment_branch_policy: {
      protected_branches: true,
      custom_branch_policies: false,
    },
  };
}

test("internal-unsigned environment guard returns only sanitized protection facts", async () => {
  const environmentName = "amic-os-internal-unsigned-publish";
  const calls = [];
  const result = await inspectAmicInternalGitHubEnvironment({
    environmentName,
    token: "test-token",
    fetchImpl: async (...args) => {
      calls.push(args);
      return {
        ok: true,
        status: 200,
        json: async () => protectedEnvironment(environmentName),
      };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0][0],
    `https://api.github.com/repos/Gonyak-cell/law-firm-os/environments/${environmentName}`,
  );
  assert.equal(calls[0][1].method, "GET");
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-token");
  assert.equal(result.verdict, "PASS");
  assert.equal(result.schema_version, "law-firm-os.amic-internal-github-environment.v2");
  assert.equal(result.approval_mode, "single-owner");
  assert.equal(result.owner_reviewer_verified, true);
  assert.equal(result.required_reviewer_count, 1);
  assert.equal(result.prevent_self_review, false);
  assert.equal(result.github_api_read_count, 1);
  assert.equal(result.raw_reviewer_identity_returned, false);
  assert.equal(result.raw_token_returned, false);
  assert.doesNotMatch(JSON.stringify(result), /private-owner|212459168|test-token/u);
});

test("both internal environments accept only the pinned single owner with self-review enabled", () => {
  for (const environmentName of AMIC_INTERNAL_PROTECTED_ENVIRONMENTS) {
    const result = validateAmicInternalGitHubEnvironment(
      protectedEnvironment(environmentName), { environmentName },
    );
    assert.equal(result.verdict, "PASS");
    assert.equal(result.approval_mode, "single-owner");
    assert.equal(result.admins_can_bypass, false);
    assert.equal(result.protected_branches_only, true);
  }
});

test("internal-unsigned environment guard rejects owner-policy drift and every missing protection", () => {
  const name = "amic-os-internal-unsigned-readback";
  const mutations = [
    (value) => { value.protection_rules[0].reviewers = []; },
    (value) => { value.protection_rules[0].reviewers.push(value.protection_rules[0].reviewers[0]); },
    (value) => { value.protection_rules[0].reviewers[0].reviewer.id = 123; },
    (value) => { value.protection_rules[0].reviewers[0].reviewer.id = "212459168"; },
    (value) => { delete value.protection_rules[0].reviewers[0].reviewer.id; },
    (value) => { value.protection_rules[0].reviewers[0].type = "Team"; },
    (value) => { value.protection_rules[0].reviewers[0].reviewer.type = "Bot"; },
    (value) => { value.protection_rules[0].prevent_self_review = true; },
    (value) => { delete value.protection_rules[0].prevent_self_review; },
    (value) => { value.protection_rules = []; },
    (value) => { value.protection_rules.push(value.protection_rules[0]); },
    (value) => { value.can_admins_bypass = true; },
    (value) => { delete value.can_admins_bypass; },
    (value) => { value.deployment_branch_policy.protected_branches = false; },
    (value) => { value.deployment_branch_policy.custom_branch_policies = true; },
    (value) => { value.deployment_branch_policy = null; },
    (value) => { value.name = "unapproved-environment"; },
  ];
  for (const mutate of mutations) {
    const value = protectedEnvironment(name);
    mutate(value);
    assert.throws(
      () => validateAmicInternalGitHubEnvironment(value, {
        environmentName: name,
      }),
      /environment protection is incomplete/u,
    );
  }
});
