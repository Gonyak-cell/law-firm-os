import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
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
  assert.match(source, /Read 9 baseline or 18 successor exact S3 versions with isolated authority/u);
  assert.match(source, /scripts\/readback-amic-os-internal-unsigned\.mjs --execute/u);
  assert.match(source, /expectedCount = process\.env\.PUBLICATION_MODE === "baseline" \? 9 : 18/u);
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

function protectedEnvironment(name) {
  return {
    name,
    can_admins_bypass: false,
    protection_rules: [{
      type: "required_reviewers",
      prevent_self_review: true,
      reviewers: [{ type: "User", reviewer: { login: "private-reviewer" } }],
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
  assert.equal(result.required_reviewer_count, 1);
  assert.equal(result.github_api_read_count, 1);
  assert.equal(result.raw_reviewer_identity_returned, false);
  assert.equal(result.raw_token_returned, false);
  assert.doesNotMatch(JSON.stringify(result), /private-reviewer|test-token/u);
});

test("internal-unsigned environment guard rejects every missing protection", () => {
  const name = "amic-os-internal-unsigned-readback";
  const mutations = [
    (value) => { value.protection_rules[0].reviewers = []; },
    (value) => { value.protection_rules[0].prevent_self_review = false; },
    (value) => { value.can_admins_bypass = true; },
    (value) => { value.deployment_branch_policy.protected_branches = false; },
    (value) => { value.deployment_branch_policy.custom_branch_policies = true; },
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
