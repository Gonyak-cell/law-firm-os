import assert from "node:assert/strict";
import test from "node:test";

import {
  createJsonPostgresArtifactReproducibilityEvidence,
} from "../lib/json-postgres-artifact-reproducibility.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES,
  JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES_SHA256,
  JSON_POSTGRES_PRODUCTION_PROGRAM_ADMIN_ENTRYPOINT,
  JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
  JSON_POSTGRES_PRODUCTION_REQUIRED_PROFILE_PHOTO_ENTRIES,
} from "../lib/json-postgres-production-artifact.mjs";
import * as releaseGates from "../lib/outlook-release-gates.mjs";
import { sha256 } from "../lib/outlook-release-gates.mjs";
import { EXPECTED_FUNCTION_IDENTITIES } from "../lib/outlook-production-aws-inventory-contract.mjs";
import { validateApiArtifactReleaseFromProducerBuilds } from "../lib/outlook-release/api-artifact.mjs";
import { canonical } from "../lib/outlook-release/primitives.mjs";
import { clone, contract, hex, oid } from "./helpers/outlook-release-fixtures.mjs";

const archiveEntries = [...new Set([
  "apps/api/src/lambda.js",
  JSON_POSTGRES_PRODUCTION_PROGRAM_ADMIN_ENTRYPOINT,
  ...JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES,
  "apps/api/src/immutable-program-input.js",
  "apps/api/src/matter-vault-user-registration-seed.json",
  "apps/api/src/hrx-member-roster-source-of-truth.json",
  JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
  "certs/global-bundle.pem",
  "deployment-manifest.json",
  "package.json",
  "packages/dms/src/json-postgres-dms-migration.js",
  "packages/persistence/src/postgres/execution-contract.js",
  "packages/persistence/src/postgres/program-receipt.js",
  ...JSON_POSTGRES_PRODUCTION_REQUIRED_PROFILE_PHOTO_ENTRIES,
])];
const rdsCaBundleBytes = Buffer.from(
  `${"-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----\n".repeat(5)}${"x".repeat(10_000)}\n`,
);

test("pure API producer-build validator is not a public release-gates authority", () => {
  assert.equal("validateApiArtifactRelease" in releaseGates, false);
  assert.equal("validateApiArtifactReleaseFromProducerBuilds" in releaseGates, false);
});

function productionManifest(sourceSha, sourceTree, packageLockBytes) {
  return {
    schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_timestamp: "2026-08-08T00:00:00.000Z",
    runtime: "nodejs22.x",
    node_version: "22.22.3",
    npm_version: "10.9.4",
    dependency_lock_sha256: sha256(packageLockBytes),
    rds_ca_bundle: {
      source: "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem",
      retrieval_mode: "validated-truststore-bytes",
      sha256: sha256(rdsCaBundleBytes),
      byte_size: rdsCaBundleBytes.byteLength,
      certificate_count: 5,
    },
    source_overrides: [],
    source_override_count: 0,
    source_redactions: [],
    source_redaction_count: 0,
    scanned_source_count: 1,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    packaged_account_seed_count: 0,
    packaged_roster_count: 0,
    packaged_public_professional_profile_count: 0,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    secrets_in_environment: false,
    production_ready_claim: false,
  };
}

function outerManifestFor(artifactBytes, embeddedManifest) {
  const artifactSha = sha256(artifactBytes);
  const outer = {
    ...clone(embeddedManifest),
    artifact_filename: `lawos-production-${embeddedManifest.source_sha}.zip`,
    artifact_sha256: artifactSha,
    artifact_byte_size: artifactBytes.byteLength,
    artifact_entry_count: archiveEntries.length,
    artifact_entries_sha256: sha256(Buffer.from(`${[...archiveEntries].sort().join("\n")}\n`)),
    artifact_runtime_store_entry_count: 0,
    artifact_real_json_store_count: 0,
    artifact_private_staging_entry_count: 0,
    artifact_symlink_count: 1,
    artifact_symlink_entries_sha256:
      sha256(Buffer.from("fixture-extracted-symlink-inventory")),
    artifact_symlink_escape_count: 0,
    outlook_runtime_entry_count:
      JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES.length,
    outlook_runtime_entries_sha256:
      JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES_SHA256,
    artifact_s3_key: `lawos-production/${embeddedManifest.source_sha}/${artifactSha}.zip`,
    manifest_canonical_sha256: "",
  };
  outer.manifest_canonical_sha256 = sha256(Buffer.from(JSON.stringify(canonical(outer))));
  return outer;
}

function fixture() {
  const artifactBytes = Buffer.from("deterministic-api-zip");
  const packageLockBytes = Buffer.from("package-lock");
  const sourceSha = oid("a");
  const sourceTree = oid("b");
  const embeddedManifest = productionManifest(sourceSha, sourceTree, packageLockBytes);
  const candidateOuterManifest = outerManifestFor(artifactBytes, embeddedManifest);
  const producerBuilds = [0, 1].map(() => ({
    artifactBytes: Buffer.from(artifactBytes), outerManifest: clone(candidateOuterManifest),
  }));
  const reproducibility = createJsonPostgresArtifactReproducibilityEvidence({
    sourceSha, sourceTree,
    firstArtifact: producerBuilds[0].artifactBytes,
    secondArtifact: producerBuilds[1].artifactBytes,
    firstManifest: producerBuilds[0].outerManifest,
    secondManifest: producerBuilds[1].outerManifest,
  });
  const lambdaTarget = {
    FunctionName: contract.api.function_name,
    FunctionArn: `arn:aws:lambda:${contract.api.region}:${contract.api.aws_account_id}:function:${contract.api.function_name}`,
    Handler: EXPECTED_FUNCTION_IDENTITIES[contract.api.function_name].handler,
    Runtime: EXPECTED_FUNCTION_IDENTITIES[contract.api.function_name].runtime,
    Architectures: [EXPECTED_FUNCTION_IDENTITIES[contract.api.function_name].architecture],
    PackageType: EXPECTED_FUNCTION_IDENTITIES[contract.api.function_name].package_type,
  };
  const beforeConfiguration = { ...lambdaTarget, Environment: { Variables: { A: "one", B: "two" } } };
  const environment = {
    key_count: 2,
    keys_sha256: sha256(JSON.stringify(["A", "B"])),
    values_sha256: sha256(JSON.stringify({ A: "one", B: "two" })),
  };
  const receipt = {
    schema_version: "amic-os.outlook-api-release.v1", authorization_ref: null, mode: "dry-run",
    status: "artifact_verified_awaiting_authorized_deployment", source_sha: sourceSha, source_tree: sourceTree,
    package_lock_sha256: sha256(packageLockBytes), artifact_sha256: sha256(artifactBytes),
    lambda_code_sha256: sha256(artifactBytes, "base64"), function_name: contract.api.function_name,
    aws_account_id: contract.api.aws_account_id, region: contract.api.region,
    environment: { before: environment, preservation_status: "planned" }, mutation_count: 0,
    deployed_code_sha256: null, producer_build_count: 2,
    reproducibility_result_sha256: reproducibility.result_sha256,
  };
  return {
    input: {
      receipt, artifactBytes, archiveEntries, embeddedManifest, candidateOuterManifest, producerBuilds,
      expectedSourceSha: sourceSha, expectedSourceTree: sourceTree, packageLockBytes, rdsCaBundleBytes,
      beforeConfiguration, contract,
    },
    artifactBytes, beforeConfiguration, embeddedManifest, environment, producerBuilds, receipt,
  };
}

test("API artifact provenance fails closed across producer, candidate, manifest, CA, and receipt drift", () => {
  const f = fixture();
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({ ...f.input, producerBuilds: [] }), /two independently/);
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, producerBuilds: [f.producerBuilds[0]],
  }), /two independently/);
  assert.equal(validateApiArtifactReleaseFromProducerBuilds(f.input).producer_build_count, 2);
  for (const candidateOuterManifest of [
    { ...f.input.candidateOuterManifest, outlook_runtime_entry_count: 0 },
    { ...f.input.candidateOuterManifest, outlook_runtime_entries_sha256: hex("0") },
    { ...f.input.candidateOuterManifest, artifact_symlink_count: 0 },
    { ...f.input.candidateOuterManifest, artifact_symlink_entries_sha256: "invalid" },
    { ...f.input.candidateOuterManifest, artifact_symlink_escape_count: 1 },
  ]) {
    assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
      ...f.input,
      candidateOuterManifest,
    }), /artifact binding failed/u);
  }
  for (const required of JSON_POSTGRES_PRODUCTION_OUTLOOK_RUNTIME_ENTRIES) {
    assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
      ...f.input,
      archiveEntries: f.input.archiveEntries.filter((entry) =>
        entry !== required),
    }), new RegExp(`missing ${required.replaceAll(".", "\\.")}`, "u"));
  }

  const differentBytes = Buffer.from("different producer build");
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input,
    producerBuilds: [f.producerBuilds[0], {
      artifactBytes: differentBytes,
      outerManifest: outerManifestFor(differentBytes, f.embeddedManifest),
    }],
  }), /not reproducible/);
  const candidateBytes = Buffer.from("candidate artifact drift");
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, artifactBytes: candidateBytes,
    candidateOuterManifest: outerManifestFor(candidateBytes, f.embeddedManifest),
  }), /not byte-identical/);
  const outerDriftEmbedded = { ...f.embeddedManifest, scanned_source_count: 2 };
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input,
    embeddedManifest: outerDriftEmbedded,
    candidateOuterManifest: outerManifestFor(f.artifactBytes, outerDriftEmbedded),
  }), /candidate\/producer-1 API outer manifest mismatch/);

  for (const embeddedManifest of [
    { ...f.embeddedManifest, source_tree: oid("c") },
    { ...f.embeddedManifest, dependency_lock_sha256: hex("d") },
    {
      ...f.embeddedManifest,
      rds_ca_bundle: { ...f.embeddedManifest.rds_ca_bundle, sha256: hex("e") },
    },
  ]) {
    assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
      ...f.input, embeddedManifest,
    }), /schema\/source\/tree\/dependency-lock\/CA binding failed/);
  }
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, embeddedManifest: { ...f.embeddedManifest, json_fallback: true },
  }), /authority boundary drifted/);
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, rdsCaBundleBytes: Buffer.from("-----BEGIN CERTIFICATE-----\nshort\n"),
  }), /RDS global CA bundle is incomplete/);
  for (const receipt of [
    { ...f.receipt, producer_build_count: 1 },
    { ...f.receipt, reproducibility_result_sha256: hex("f") },
  ]) {
    assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({ ...f.input, receipt }), /reproducibility binding failed/);
  }
});

test("API artifact provenance preserves dry-run and authorized Lambda readback boundaries", () => {
  const f = fixture();
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, afterConfiguration: f.beforeConfiguration,
  }), /overclaims/);
  const post = {
    ...clone(f.receipt),
    mode: "post-deploy-readback",
    authorization_ref: "approved-api-change-window-20260808",
    status: "deployed_readback_verified",
    environment: { before: f.environment, after: f.environment, preservation_status: "verified" },
    mutation_count: 1,
    deployed_code_sha256: f.receipt.lambda_code_sha256,
  };
  const after = { ...f.beforeConfiguration, CodeSha256: f.receipt.lambda_code_sha256 };
  assert.equal(validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, receipt: post, afterConfiguration: after,
  }).status, "deployed_readback_verified");
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input, receipt: { ...post, authorization_ref: null }, afterConfiguration: after,
  }), /authorization_ref/);
  assert.throws(() => validateApiArtifactReleaseFromProducerBuilds({
    ...f.input,
    receipt: post,
    afterConfiguration: { ...after, Environment: { Variables: { A: "changed", B: "two" } } },
  }), /environment preservation/);
});

test("API artifact provenance rejects execution identity drift before protected actions", () => {
  for (const drift of [
    { Handler: "apps/api/src/json-postgres-program-admin-lambda.handler" },
    { Runtime: "nodejs20.x" },
    { Architectures: ["arm64"] },
    { Architectures: ["arm64", "x86_64"] },
    { PackageType: "Image" },
  ]) {
    const f = fixture();
    assert.throws(
      () => validateApiArtifactReleaseFromProducerBuilds({
        ...f.input,
        beforeConfiguration: { ...f.beforeConfiguration, ...drift },
      }),
      /Lambda execution identity drifted/u,
    );
    const postReceipt = {
      ...clone(f.receipt),
      mode: "post-deploy-readback",
      authorization_ref: "approved-api-change-window-20260808",
      status: "deployed_readback_verified",
      environment: {
        before: f.environment,
        after: f.environment,
        preservation_status: "verified",
      },
      mutation_count: 1,
      deployed_code_sha256: f.receipt.lambda_code_sha256,
    };
    assert.throws(
      () => validateApiArtifactReleaseFromProducerBuilds({
        ...f.input,
        receipt: postReceipt,
        afterConfiguration: {
          ...f.beforeConfiguration,
          CodeSha256: f.receipt.lambda_code_sha256,
          ...drift,
        },
      }),
      /Lambda execution identity drifted/u,
    );
  }
});
