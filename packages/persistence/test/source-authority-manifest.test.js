import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJsonPostgresRecordTypeCatalog } from "../src/postgres/record-type-catalog.js";
import {
  createJsonPostgresFieldCrosswalk,
  createJsonPostgresInventoryDelta,
  createJsonPostgresSourceAuthorityManifest,
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
  validateJsonPostgresFieldCrosswalk,
  validateJsonPostgresSourceAuthorityManifest,
} from "../src/postgres/source-authority-manifest.js";
import { inventoryJsonPostgresSources } from "../src/postgres/source-inventory.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function catalog() {
  return createJsonPostgresRecordTypeCatalog({
    corpus: {
      accounts: [],
      domains: [{
        domain_id: "matter",
        records: [{
          record_type: "Matter",
          record_id: "matter-never-return",
          unique_key: "matter:never-return",
          payload: { matter_id: "matter-never-return", matter_code: "NEVER-RETURN" },
          references: [],
        }],
      }],
    },
  });
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "lawos-authority-manifest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const firstBytes = `${JSON.stringify({
    tenant_id: "tenant-never-return",
    records: [{
      record_type: "Matter",
      record_id: "matter-never-return",
      matter_code: "CODE-NEVER-RETURN",
      credential_provider: "lawos-internal-password-provider-v1",
      password_hash: "secret-never-return",
    }],
  })}\n`;
  const secondBytes = `${JSON.stringify({ data_scope: "synthetic-only", record_id: "synthetic-never-return" })}\n`;
  const firstPath = join(root, "matter-store.json");
  const secondPath = join(root, "synthetic-store.json");
  await writeFile(firstPath, firstBytes);
  await writeFile(secondPath, secondBytes);
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  return { root, firstPath, secondPath, firstBytes, secondBytes, inventory };
}

test("crosswalk and authority manifest bind every source without exposing source values", async (t) => {
  const source = await fixture(t);
  const recordTypeCatalog = catalog();
  const secretField = source.inventory.field_contract.fields.find((field) => field.field_name === "password_hash");
  const providerField = source.inventory.field_contract.fields.find((field) => field.field_name === "credential_provider");
  const fieldCrosswalk = createJsonPostgresFieldCrosswalk({
    inventory: source.inventory,
    recordTypeCatalog,
    overrides: [{
      field_name: providerField.field_name,
      path_ref: providerField.path_ref,
      disposition: "postgres-specialized-identity",
      reason_code: "IDENTITY_METADATA",
    }],
  });
  assert.equal(validateJsonPostgresFieldCrosswalk(fieldCrosswalk, {
    inventory: source.inventory,
    recordTypeCatalog,
  }).valid, true);
  assert.equal(fieldCrosswalk.fields.find((field) => field.field_name === "password_hash").disposition, "secret-excluded");
  assert.equal(fieldCrosswalk.claims.silent_drop_count, 0);

  const decisions = source.inventory.sources.map((item) => ({
    source_ref: item.source_ref,
    sha256: item.sha256,
    classification: item.sha256 === sha256(source.firstBytes) ? "authoritative" : "synthetic",
    reason_code: item.sha256 === sha256(source.firstBytes) ? "OWNER_SELECTED" : "SYNTHETIC_EXCLUDED",
    decision_ref: item.sha256 === sha256(source.firstBytes) ? "owner-decision-001" : "inventory-rule-001",
  }));
  const manifest = createJsonPostgresSourceAuthorityManifest({
    inventory: source.inventory,
    decisions,
    approvedRootRefs: ["runtime-primary"],
    recordTypeCatalog,
    fieldCrosswalk,
  });
  const validated = validateJsonPostgresSourceAuthorityManifest(manifest, {
    inventory: source.inventory,
    recordTypeCatalog,
    fieldCrosswalk,
  });
  assert.equal(validated.valid, true);
  assert.equal(validated.source_count, 2);
  assert.equal(manifest.counts.authoritative_count, 1);
  assert.equal(manifest.counts.unresolved_count, 0);
  assert.equal(manifest.authorization_state, "PENDING_OWNER_SIGNATURE");
  const serialized = JSON.stringify({ fieldCrosswalk, manifest });
  for (const forbidden of [
    "tenant-never-return",
    "matter-never-return",
    "CODE-NEVER-RETURN",
    "secret-never-return",
  ]) assert.equal(serialized.includes(forbidden), false);

  assert.throws(() => createJsonPostgresFieldCrosswalk({
    inventory: source.inventory,
    recordTypeCatalog,
    overrides: [{
      field_name: secretField.field_name,
      path_ref: secretField.path_ref,
      disposition: "postgres-json-payload",
      reason_code: "UNSAFE_OVERRIDE",
    }],
  }), /secret field cannot be reclassified/u);
});

test("authority manifest rejects incomplete decisions, digest drift, and unapproved roots", async (t) => {
  const source = await fixture(t);
  const recordTypeCatalog = catalog();
  const fieldCrosswalk = createJsonPostgresFieldCrosswalk({ inventory: source.inventory, recordTypeCatalog });
  const first = source.inventory.sources[0];
  assert.throws(() => createJsonPostgresSourceAuthorityManifest({
    inventory: source.inventory,
    decisions: [{
      source_ref: first.source_ref,
      sha256: first.sha256,
      classification: "authoritative",
      reason_code: "OWNER_SELECTED",
      decision_ref: "owner-decision-001",
    }],
    approvedRootRefs: ["runtime-primary"],
    recordTypeCatalog,
    fieldCrosswalk,
  }), /unresolved source decisions/u);

  assert.throws(() => createJsonPostgresSourceAuthorityManifest({
    inventory: source.inventory,
    decisions: source.inventory.sources.map((item) => ({
      source_ref: item.source_ref,
      sha256: "0".repeat(64),
      classification: "authoritative",
      reason_code: "OWNER_SELECTED",
      decision_ref: "owner-decision-001",
    })),
    approvedRootRefs: ["runtime-primary"],
    recordTypeCatalog,
    fieldCrosswalk,
  }), /source digest drifted/u);

  assert.throws(() => createJsonPostgresSourceAuthorityManifest({
    inventory: source.inventory,
    decisions: source.inventory.sources.map((item) => ({
      source_ref: item.source_ref,
      sha256: item.sha256,
      classification: "authoritative",
      reason_code: "OWNER_SELECTED",
      decision_ref: "owner-decision-001",
    })),
    approvedRootRefs: ["different-root"],
    recordTypeCatalog,
    fieldCrosswalk,
  }), /root is not approved/u);
});

test("inventory delta is content-bound and never auto-authorizes changes", async (t) => {
  const source = await fixture(t);
  const recordTypeCatalog = catalog();
  const fieldCrosswalk = createJsonPostgresFieldCrosswalk({ inventory: source.inventory, recordTypeCatalog });
  const baseManifest = createJsonPostgresSourceAuthorityManifest({
    inventory: source.inventory,
    decisions: source.inventory.sources.map((item, index) => ({
      source_ref: item.source_ref,
      sha256: item.sha256,
      classification: index === 0 ? "authoritative" : "synthetic",
      reason_code: index === 0 ? "OWNER_SELECTED" : "SYNTHETIC_EXCLUDED",
      decision_ref: `decision-${index}`,
    })),
    approvedRootRefs: ["runtime-primary"],
    recordTypeCatalog,
    fieldCrosswalk,
  });
  await writeFile(source.firstPath, `${source.firstBytes.trim()}\n `);
  await writeFile(join(source.root, "client-store.json"), JSON.stringify({ record_type: "Client", record_id: "client-never-return" }));
  const currentInventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: source.root }],
    clock: () => new Date("2026-07-23T01:00:00.000Z"),
  });
  const delta = createJsonPostgresInventoryDelta({ baseManifest, currentInventory });
  assert.equal(delta.counts.changed_count, 1);
  assert.equal(delta.counts.added_count, 1);
  assert.equal(delta.counts.requires_review_count, 2);
  assert.equal(delta.counts.unapproved_root_count, 0);
  assert.equal(delta.claims.auto_authorized, false);
  assert.equal(delta.claims.delta_policy_sha256, JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256);
  assert.equal(JSON.stringify(delta).includes("client-never-return"), false);
});
