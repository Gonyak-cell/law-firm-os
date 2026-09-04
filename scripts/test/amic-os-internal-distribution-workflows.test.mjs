import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

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
  assert.match(source, /workflow_call:/u);
  assert.doesNotMatch(source, /workflow_dispatch:/u);
  assert.match(
    source,
    /github\.workflow_ref == 'Gonyak-cell\/law-firm-os\/\.github\/workflows\/amic-os-internal-unsigned-publish\.yml@refs\/heads\/main'/u,
  );
  assert.match(source, /environment:\s+name: amic-os-internal-unsigned-readback/u);
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
});
