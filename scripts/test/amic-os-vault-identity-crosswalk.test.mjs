import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateAmicOsVaultIdentityCrosswalk } from "../validate-amic-os-vault-identity-crosswalk.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(await readFile(
  path.join(repoRoot, "contracts/amic-os-vault-identity-crosswalk.json"),
  "utf8",
));

function changedContract(mutate) {
  const value = structuredClone(contract);
  mutate(value);
  return value;
}

test("AMIC OS and Vault identity crosswalk proves migration zero without claiming runtime readiness", async () => {
  const result = await validateAmicOsVaultIdentityCrosswalk({ repoRoot });
  assert.deepEqual(result, {
    schema_version: "law-firm-os.amic-os-vault-identity-crosswalk-validation.v1",
    verdict: "PASS",
    database_migration_required: false,
    lawos_database_migration_count: 0,
    vault_database_migration_count: 0,
    mapping_keys: [
      "tenant",
      "user",
      "matter",
      "workspace",
      "folder",
      "document",
      "version",
      "file_object",
      "permission_decision",
      "audit_trace",
    ],
    runtime_data_binding_required: true,
    production_writes_default: "deny",
    production_ready_claim: false,
    lawos_source_verified: true,
    vault_source_verified: false,
    provider_runtime_readback_performed: false,
  });
});

test("crosswalk rejects migration, production, and client-trust drift", async (t) => {
  const cases = [
    {
      name: "new Vault migration",
      mutate: (value) => { value.decision.vault_database_migration_count = 1; },
      expected: /Vault migration count must remain zero/u,
    },
    {
      name: "premature production claim",
      mutate: (value) => { value.decision.production_ready_claim = true; },
      expected: /cannot claim production readiness/u,
    },
    {
      name: "client tenant trust",
      mutate: (value) => { value.trust_boundary.client_supplied_tenant_or_actor_trusted = true; },
      expected: /trust boundary drifted/u,
    },
    {
      name: "client document id trust",
      mutate: (value) => {
        value.mappings.find((mapping) => mapping.key === "document").client_input_trusted = true;
      },
      expected: /document must reject client trust/u,
    },
    {
      name: "automatic latest version",
      mutate: (value) => {
        const version = value.mappings.find((mapping) => mapping.key === "version");
        version.required_checks = version.required_checks.filter((check) => check !== "automatic_latest_substitution_is_zero");
      },
      expected: /exact-version mapping must forbid automatic latest substitution/u,
    },
    {
      name: "storage URI exposure",
      mutate: (value) => {
        value.mappings.find((mapping) => mapping.key === "file_object").client_visible_fields.push("storage_uri");
      },
      expected: /exposes a storage locator/u,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      await assert.rejects(
        validateAmicOsVaultIdentityCrosswalk({ repoRoot, contractOverride: changedContract(item.mutate) }),
        item.expected,
      );
    });
  }
});

const vaultSourceRoot = process.env.AMIC_VAULT_SOURCE_ROOT;

test("crosswalk can verify the pinned AMIC Vault source checkout", { skip: !vaultSourceRoot }, async () => {
  const result = await validateAmicOsVaultIdentityCrosswalk({ repoRoot, vaultSourceRoot });
  assert.equal(result.vault_source_verified, true);
  assert.equal(result.provider_runtime_readback_performed, false);
});
