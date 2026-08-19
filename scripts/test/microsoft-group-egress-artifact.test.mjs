import assert from "node:assert/strict";
import test from "node:test";

import {
  MICROSOFT_GROUP_EGRESS_ARTIFACT_SCHEMA,
  MICROSOFT_GROUP_EGRESS_SOURCE_PATHS,
  createMicrosoftGroupEgressArtifactManifest,
  validateMicrosoftGroupEgressArtifactEntries,
  validateMicrosoftGroupEgressArtifactManifest,
} from "../lib/microsoft-group-egress-artifact.mjs";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);

function sourceEntries() {
  return MICROSOFT_GROUP_EGRESS_SOURCE_PATHS.map((source_path, index) => ({
    source_path,
    archive_path: source_path.split("/").at(-1),
    sha256: String(index + 1).padStart(64, "0"),
    byte_size: index + 1,
  }));
}

test("artifact contains only the runtime modules, package metadata, and manifest", () => {
  const entries = [
    ...MICROSOFT_GROUP_EGRESS_SOURCE_PATHS.map((value) => value.split("/").at(-1)),
    "package.json",
    "deployment-manifest.json",
  ];
  assert.equal(validateMicrosoftGroupEgressArtifactEntries(entries).entry_count, 10);
  for (const unsafe of [
    "client-secret.json",
    ".env",
    "node_modules/example/index.js",
    "test-fixtures.mjs",
    "../lambda.mjs",
    "/lambda.mjs",
  ]) {
    assert.throws(
      () => validateMicrosoftGroupEgressArtifactEntries([...entries, unsafe]),
      /artifact entries/u,
    );
  }
});

test("manifest binds exact runtime source descriptors and deployment boundary", () => {
  const manifest = createMicrosoftGroupEgressArtifactManifest({
    sourceSha: SHA,
    sourceTree: TREE,
    sources: sourceEntries(),
  });
  assert.equal(manifest.schema_version, MICROSOFT_GROUP_EGRESS_ARTIFACT_SCHEMA);
  assert.equal(validateMicrosoftGroupEgressArtifactManifest(manifest).verdict, "PASS");
  assert.equal(manifest.function_name, "lawos-microsoft-group-egress-prod");
  assert.equal(manifest.region, "ap-northeast-2");
  assert.equal(manifest.account_id, "770880870480");
  assert.equal(manifest.provider_mutation_default, false);
  assert.equal(manifest.raw_secrets_in_artifact, false);
  assert.deepEqual(manifest.external_runtime_dependencies, [
    "@aws-sdk/client-secrets-manager",
  ]);
  assert.throws(
    () => validateMicrosoftGroupEgressArtifactManifest({
      ...manifest,
      provider_mutation_default: true,
    }),
    /manifest/u,
  );
});
