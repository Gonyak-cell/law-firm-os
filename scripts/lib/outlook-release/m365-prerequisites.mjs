import { SHA256 } from "./constants.mjs";
import {
  assertEqual, assertExactKeys, assertSha256, canonical, concreteText, profileMap, sha256, sorted,
} from "./primitives.mjs";
import { assertConcreteList, assertObservedAt, assertProofBase } from "./proof-common.mjs";
import { readProtectedJsonDocument, readProtectedJsonProof } from "./protected-evidence.mjs";
import { staticReleaseProjection, validateStaticDryRunPlan } from "./static-plan.mjs";

function assertArtifact(proof, prerequisite, name) {
  assertSha256(proof.artifact_sha256, `${name} artifact`);
  if (proof.artifact_sha256 !== prerequisite.artifact_sha256) throw new Error(`${name} artifact binding drifted`);
}

function validateApi(proof, prerequisite, context) {
  assertProofBase(proof, "amic-os.api-deployment-proof.v1", "api_release", context.identity, [
    "artifact_sha256", "authorization_evidence_sha256", "aws_account_id", "deployed_artifact_sha256",
    "environment_after", "environment_before", "environment_preserved", "function_name", "mutation_count",
    "observed_at_utc", "region", "status",
  ]);
  assertArtifact(proof, prerequisite, "api_release");
  for (const [name, projection] of [["before", proof.environment_before], ["after", proof.environment_after]]) {
    assertExactKeys(projection, ["key_count", "keys_sha256", "values_sha256"], `API environment ${name}`);
    if (!Number.isSafeInteger(projection.key_count) || projection.key_count < 1) throw new Error(`API environment ${name} is empty`);
    assertSha256(projection.keys_sha256, `API environment ${name} keys`);
    assertSha256(projection.values_sha256, `API environment ${name} values`);
  }
  if (proof.function_name !== context.contract.api.function_name
    || proof.aws_account_id !== context.contract.api.aws_account_id || proof.region !== context.contract.api.region
    || proof.authorization_evidence_sha256 !== context.authorizationHash
    || proof.deployed_artifact_sha256 !== proof.artifact_sha256
    || JSON.stringify(proof.environment_before) !== JSON.stringify(proof.environment_after)
    || proof.environment_preserved !== true || proof.mutation_count !== 1
    || proof.status !== "deployed_readback_verified") throw new Error("API deployment/environment proof is incomplete");
  assertObservedAt(proof.observed_at_utc, "API deployment observation");
}

function validateMigrations(proof, prerequisite, context) {
  assertProofBase(proof, "amic-os.migration-readback-proof.v1", "additive_migrations", context.identity, [
    "applied_migrations_sha256", "artifact_sha256", "destructive_migrations", "migration_ids",
    "observed_at_utc", "rollback_compatible", "status", "transaction_verified",
  ]);
  assertArtifact(proof, prerequisite, "additive_migrations");
  assertConcreteList(proof.migration_ids, "migration IDs");
  if (proof.applied_migrations_sha256 !== sha256(JSON.stringify(sorted(proof.migration_ids)))
    || proof.artifact_sha256 !== proof.applied_migrations_sha256 || proof.destructive_migrations !== false
    || proof.rollback_compatible !== true || proof.transaction_verified !== true
    || proof.status !== "applied_readback_verified") throw new Error("additive migration proof is incomplete");
  assertObservedAt(proof.observed_at_utc, "migration observation");
}

function validateGraph(proof, prerequisite, context) {
  assertProofBase(proof, "amic-os.graph-runtime-proof.v1", "graph_endpoint_and_secret_reference", context.identity, [
    "artifact_sha256", "delegated_scopes", "delegated_scopes_sha256", "endpoint_origin",
    "observed_at_utc", "provider_readback", "secret_reference", "status",
  ]);
  assertArtifact(proof, prerequisite, "graph_endpoint_and_secret_reference");
  const scopes = sorted(context.contract.client_outlook_graph_connection_scopes);
  assertEqual(sorted(proof.delegated_scopes ?? []), scopes, "Graph delegated scopes");
  const projection = { delegated_scopes: scopes, endpoint_origin: "https://graph.microsoft.com/v1.0", secret_reference: proof.secret_reference };
  if (proof.endpoint_origin !== projection.endpoint_origin || !concreteText(proof.secret_reference, "Graph secret reference").startsWith("secretsmanager://")
    || proof.delegated_scopes_sha256 !== sha256(JSON.stringify(scopes))
    || proof.artifact_sha256 !== sha256(JSON.stringify(canonical(projection)))
    || proof.provider_readback !== true || proof.status !== "verified") throw new Error("Graph runtime proof is incomplete");
  assertObservedAt(proof.observed_at_utc, "Graph runtime observation");
}

function validateDocuSign(proof, prerequisite, context) {
  assertProofBase(proof, "amic-os.docusign-runtime-proof.v1", "docusign_endpoint_and_secret_reference", context.identity, [
    "artifact_sha256", "endpoint_origin", "integration_key_fingerprint_sha256", "observed_at_utc",
    "provider_readback", "secret_reference", "status",
  ]);
  assertArtifact(proof, prerequisite, "docusign_endpoint_and_secret_reference");
  const endpoints = new Set(["https://demo.docusign.net/restapi", "https://www.docusign.net/restapi"]);
  const secretRef = concreteText(proof.secret_reference, "DocuSign secret reference");
  const projection = { endpoint_origin: proof.endpoint_origin, integration_key_fingerprint_sha256: proof.integration_key_fingerprint_sha256, secret_reference: secretRef };
  if (!endpoints.has(proof.endpoint_origin) || !secretRef.startsWith("secretsmanager://")
    || !SHA256.test(proof.integration_key_fingerprint_sha256 ?? "")
    || proof.artifact_sha256 !== sha256(JSON.stringify(canonical(projection)))
    || proof.provider_readback !== true || proof.status !== "verified") throw new Error("DocuSign runtime proof is incomplete");
  assertObservedAt(proof.observed_at_utc, "DocuSign runtime observation");
}

function validateRuntime(proof, prerequisite, context, kind) {
  const settings = kind === "approved_template_runtime"
    ? ["amic-os.template-runtime-proof.v1", "template_inventory_sha256", "runtime_readback_sha256"]
    : ["amic-os.precedent-runtime-proof.v1", "index_inventory_sha256", "runtime_readback_sha256"];
  assertProofBase(proof, settings[0], kind, context.identity, [
    "artifact_sha256", settings[1], settings[2], "observed_at_utc", "record_count", "status",
  ]);
  assertArtifact(proof, prerequisite, kind);
  if (!Number.isSafeInteger(proof.record_count) || proof.record_count < 1
    || proof.artifact_sha256 !== proof[settings[1]] || !SHA256.test(proof[settings[2]] ?? "")
    || proof.status !== "verified") throw new Error(`${kind} proof is incomplete`);
  assertObservedAt(proof.observed_at_utc, `${kind} observation`);
}

function validateStatic(proof, prerequisite, context) {
  assertProofBase(proof, "amic-os.static-deployment-proof.v1", "static_release", context.identity, [
    "artifact_sha256", "authorization_evidence_sha256", "mutation_count", "observed_at_utc",
    "plan_evidence", "profiles", "status",
  ]);
  assertArtifact(proof, prerequisite, "static_release");
  const loaded = readProtectedJsonDocument(context.store, proof.plan_evidence, "static release plan");
  const plan = loaded.document;
  validateStaticDryRunPlan(plan, {
    contract: context.contract, releaseReceipt: context.releaseCandidate,
    releaseContext: context.releaseContext, sourceLocations: context.sourceLocations,
  });
  const expectedProjection = staticReleaseProjection(plan, loaded.evidence_sha256);
  const profiles = profileMap(proof.profiles, "static deployment proof profiles");
  for (const expected of expectedProjection.profiles) {
    const current = profiles.get(expected.product_id);
    assertExactKeys(current, ["inventory_sha256", "product_id", "readback_inventory_sha256", "result", "target_prefix"], `${expected.profile} static deployment proof`);
    if (current.target_prefix !== expected.target_prefix || current.inventory_sha256 !== expected.inventory_sha256
      || current.readback_inventory_sha256 !== expected.inventory_sha256 || current.result !== "exact_readback") {
      throw new Error(`${expected.profile} static deployment proof is incomplete`);
    }
  }
  if (proof.artifact_sha256 !== context.releaseCandidate.inventory_sha256
    || proof.authorization_evidence_sha256 !== context.authorizationHash || proof.mutation_count !== 2
    || proof.status !== "deployed_readback_verified") throw new Error("static deployment proof is incomplete");
  assertObservedAt(proof.observed_at_utc, "static deployment observation");
  return { plan, planSha256: loaded.evidence_sha256, projection: expectedProjection };
}

export function validateVerifiedPrerequisite(name, prerequisite, context) {
  const loaded = readProtectedJsonProof(context.store, {
    evidence_ref: prerequisite.evidence_ref,
    evidence_sha256: prerequisite.evidence_sha256,
  }, name);
  const proof = loaded.proof;
  const handlers = {
    additive_migrations: validateMigrations,
    api_release: validateApi,
    approved_template_runtime: (value, item, options) => validateRuntime(value, item, options, name),
    docusign_endpoint_and_secret_reference: validateDocuSign,
    graph_endpoint_and_secret_reference: validateGraph,
    precedent_index_runtime: (value, item, options) => validateRuntime(value, item, options, name),
    static_release: validateStatic,
  };
  const result = handlers[name]?.(proof, prerequisite, context);
  if (!handlers[name]) throw new Error(`unsupported M365 prerequisite proof class: ${name}`);
  return { loaded, proof, result };
}
