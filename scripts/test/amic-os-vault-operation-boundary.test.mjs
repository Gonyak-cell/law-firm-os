import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateAmicOsVaultOperationBoundary } from "../validate-amic-os-vault-operation-boundary.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(await readFile(
  path.join(repoRoot, "contracts/amic-os-vault-operation-boundary.json"),
  "utf8",
));

function changedContract(mutate) {
  const value = structuredClone(contract);
  mutate(value);
  return value;
}

test("single-install Vault boundary contract matches the executable receipt contract", async () => {
  const result = await validateAmicOsVaultOperationBoundary({ repoRoot });
  assert.deepEqual(result, {
    schema_version: "law-firm-os.amic-os-vault-operation-boundary-validation.v1",
    verdict: "PASS",
    surface_count: 8,
    crossing_count: 8,
    negative_case_count: 10,
    operation_kind_count: 6,
    receipt_stage_count: 14,
    database_migration_required: false,
    runtime_integration_pending: true,
    production_ready_claim: false,
  });
});

test("boundary contract rejects authority, raw-path, ItemChanged, exact-version, and replay drift", async (t) => {
  const cases = [
    {
      name: "client authority",
      mutate: (value) => { value.decision.client_authority_fields_trusted = true; },
      expected: /client authority must remain untrusted/iu,
    },
    {
      name: "renderer raw path",
      mutate: (value) => {
        value.surfaces.find((surface) => surface.id === "desktop_renderer").forbidden_inputs = ["document bytes"];
      },
      expected: /renderer raw-path prohibition/iu,
    },
    {
      name: "ItemChanged network work",
      mutate: (value) => {
        value.crossings.find((crossing) => crossing.id === "officejs_to_api_attach").invariants = ["server reauthorizes the exact version"];
      },
      expected: /ItemChanged zero-work rule/iu,
    },
    {
      name: "exact-version field",
      mutate: (value) => { value.receipt.exact_version_fields.splice(1, 1); },
      expected: /receipt exact-version fields drifted/iu,
    },
    {
      name: "replay execution",
      mutate: (value) => { value.receipt.replay_rule = "Retry may execute again."; },
      expected: /replay must explicitly suppress execution/iu,
    },
    {
      name: "premature production claim",
      mutate: (value) => { value.decision.production_ready_claim = true; },
      expected: /cannot claim runtime or production completion/iu,
    },
  ];
  for (const item of cases) {
    await t.test(item.name, async () => {
      await assert.rejects(
        validateAmicOsVaultOperationBoundary({ repoRoot, contractOverride: changedContract(item.mutate) }),
        item.expected,
      );
    });
  }
});
