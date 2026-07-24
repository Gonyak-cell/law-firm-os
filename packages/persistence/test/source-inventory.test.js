import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, realpath, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  deriveJsonPostgresInventoryContentSha256,
  JSON_POSTGRES_FIELD_DISPOSITIONS,
  JSON_POSTGRES_SOURCE_CLASSIFICATIONS,
  inventoryJsonPostgresSources,
} from "../src/postgres/source-inventory.js";
import {
  createJsonPostgresSourceLocatorManifest,
  validateJsonPostgresSourceLocatorManifest,
} from "../src/postgres/source-locator-manifest.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

test("source inventory emits only safe metadata and classifies every field", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-inventory-"));
  t.after(async () => (await import("node:fs/promises")).rm(root, { recursive: true, force: true }));
  const primary = {
    schema_version: "law-firm-os.test.v1",
    tenant_id: "tenant-real-never-return",
    users: [{
      user_id: "user-real-never-return",
      email: "person@example.test",
      api_key: "forbidden",
      accessToken: "forbidden-camel-case",
      tokens: ["forbidden-plural"],
    }],
    credential_provider: "lawos-internal-password-provider-v1",
    credential_status: "reset_required",
    credential_rev: 3,
    members: [{ user_id: "user-real-never-return", employee_id: "employee-real-never-return", work_email: "person@example.test" }],
    tables: {
      hrx_employees: [{ tenant_id: "tenant-real-never-return", employee_id: "employee-real-never-return" }],
      hrx_employee_user_links: [{ tenant_id: "tenant-real-never-return", employee_id: "employee-real-never-return", user_id: "user-real-never-return" }],
    },
    records: [{ tenant_id: "tenant-real-never-return", record_type: "Matter", record_id: "matter-real-never-return", matter_code: "CODE-NEVER-RETURN" }],
  };
  const bytes = `${JSON.stringify(primary)}\n`;
  await writeFile(join(root, "matter-store.json"), bytes);
  await writeFile(join(root, "matter-store-copy.json"), bytes);
  await writeFile(join(root, "broken-store.json"), "{broken");
  await writeFile(join(root, "synthetic-store.json"), JSON.stringify({ data_scope: "synthetic-only", records: [{ synthetic_only: true, record_id: "synthetic" }] }));
  await mkdir(join(root, "ui-screens"));
  await writeFile(join(root, "ui-screens", "ignored-manifest.json"), JSON.stringify({ password: "ignored" }));

  const report = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    authorityManifest: { sources: [{ sha256: sha256(bytes), classification: "authoritative" }] },
    clock: () => new Date("2026-07-20T00:00:00.000Z"),
  });
  assert.equal(report.sources.length, 4);
  assert.equal(report.classification_counts.authoritative, 1);
  assert.equal(report.classification_counts.duplicate, 1);
  assert.equal(report.classification_counts.corrupt, 1);
  assert.equal(report.classification_counts.synthetic, 1);
  assert.deepEqual(Object.keys(report.classification_counts), JSON_POSTGRES_SOURCE_CLASSIFICATIONS);
  assert.deepEqual(Object.keys(report.field_contract.disposition_counts), JSON_POSTGRES_FIELD_DISPOSITIONS);
  assert.equal(report.field_contract.silent_drop_count, 0);
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "api_key" && field.disposition === "secret-excluded"));
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "accessToken" && field.disposition === "secret-excluded"));
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "tokens" && field.disposition === "secret-excluded"));
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "credential_provider" && field.disposition === "postgres-live"));
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "credential_status" && field.disposition === "postgres-live"));
  assert.ok(report.field_contract.fields.some((field) => field.field_name === "credential_rev" && field.disposition === "postgres-live"));
  assert.equal(report.reconciliation.registered_account_count, 1);
  assert.equal(report.reconciliation.roster_member_count, 1);
  assert.equal(report.reconciliation.employee_without_user_link_count, 0);
  assert.equal(report.claims.raw_value_returned, false);
  const serialized = JSON.stringify(report);
  for (const forbidden of ["tenant-real-never-return", "user-real-never-return", "employee-real-never-return", "person@example.test", "CODE-NEVER-RETURN", "forbidden"]) {
    assert.equal(serialized.includes(forbidden), false);
  }

  const repeated = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    authorityManifest: { sources: [{ sha256: sha256(bytes), classification: "authoritative" }] },
    clock: () => new Date("2026-07-21T00:00:00.000Z"),
  });
  assert.notEqual(repeated.inventory_sha256, report.inventory_sha256);
  assert.equal(repeated.inventory_content_sha256, report.inventory_content_sha256);
  assert.equal(deriveJsonPostgresInventoryContentSha256(report), report.inventory_content_sha256);

  const generationRef = report.sources.find((source) => (
    source.sha256 === sha256(bytes) && source.classification === "authoritative"
  )).generation_ref;
  await Promise.all(["matter-store.json", "matter-store-copy.json"].map((filename) => (
    utimes(
      join(root, filename),
      new Date("2026-07-22T00:00:00.000Z"),
      new Date("2026-07-22T00:00:00.000Z"),
    )
  )));
  const metadataOnlyChange = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    authorityManifest: { sources: [{ sha256: sha256(bytes), classification: "authoritative" }] },
    clock: () => new Date("2026-07-21T00:00:00.000Z"),
  });
  assert.notEqual(
    metadataOnlyChange.sources.find((source) => source.source_ref === report.sources.find((entry) => (
      entry.sha256 === sha256(bytes) && entry.classification === "authoritative"
    )).source_ref).mtime,
    report.sources.find((source) => source.sha256 === sha256(bytes) && source.classification === "authoritative").mtime,
  );
  assert.equal(metadataOnlyChange.inventory_content_sha256, report.inventory_content_sha256);
  assert.equal(
    metadataOnlyChange.sources.find((source) => (
      source.sha256 === sha256(bytes) && source.classification === "authoritative"
    )).generation_ref,
    generationRef,
  );
  const {
    inventory_sha256: ignoredMetadataInventorySha256,
    inventory_content_sha256: ignoredMetadataContentSha256,
    adjudication_contract: ignoredMetadataAdjudicationContract,
    ...timestampSensitiveReport
  } = metadataOnlyChange;
  const timestampSensitiveInventory = {
    ...timestampSensitiveReport,
    inventory_sha256: sha256(stableJson(timestampSensitiveReport)),
    inventory_content_sha256: sha256(stableJson({
      ...timestampSensitiveReport,
      generated_at: null,
    })),
  };
  assert.equal(
    deriveJsonPostgresInventoryContentSha256(timestampSensitiveInventory),
    report.inventory_content_sha256,
  );
  await writeFile(join(root, "matter-store.json"), `${JSON.stringify({
    ...primary,
    records: [
      ...primary.records,
      {
        tenant_id: "tenant-real-never-return",
        record_type: "Matter",
        record_id: "matter-content-change-never-return",
        matter_code: "CODE-CONTENT-CHANGE-NEVER-RETURN",
      },
    ],
  })}\n`);
  const contentChange = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    authorityManifest: { sources: [{ sha256: sha256(bytes), classification: "authoritative" }] },
    clock: () => new Date("2026-07-21T00:00:00.000Z"),
  });
  assert.notEqual(contentChange.inventory_content_sha256, report.inventory_content_sha256);
  assert.ok(contentChange.sources.some((source) => (
    !report.sources.some((prior) => (
      prior.source_ref === source.source_ref
      && prior.generation_ref === source.generation_ref
    ))
  )));
  const driftBlocked = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    authorityManifest: {
      sources: [{
        sha256: sha256(bytes),
        classification: "authoritative",
      }],
    },
    approvedInventoryContentSha256: report.inventory_content_sha256,
    clock: () => new Date("2026-07-21T00:00:00.000Z"),
  });
  assert.notEqual(
    driftBlocked.inventory_content_sha256,
    report.inventory_content_sha256,
  );
  assert.equal(driftBlocked.adjudication_contract, null);

  const {
    inventory_sha256: ignoredInventorySha256,
    inventory_content_sha256: ignoredContentSha256,
    adjudication_contract: ignoredLegacyAdjudicationContract,
    ...legacyReport
  } = report;
  legacyReport.field_contract = {
    ...legacyReport.field_contract,
    disposition_counts: Object.fromEntries(
      Object.entries(legacyReport.field_contract.disposition_counts)
        .filter(([key]) => ![
          "postgres-specialized-identity",
          "s3-dms-byte-object",
          "rejected-with-reason",
        ].includes(key)),
    ),
    fields: legacyReport.field_contract.fields.map((field) => (
      ["credential_provider", "credential_status", "credential_rev"].includes(field.field_name)
        ? { ...field, disposition: "secret-excluded" }
        : field
    )),
  };
  legacyReport.field_contract.disposition_counts["postgres-live"] -= 3;
  legacyReport.field_contract.disposition_counts["secret-excluded"] += 3;
  legacyReport.sources = legacyReport.sources.map((source, index) => ({
    ...source,
    generation_ref: sha256(`legacy-mtime-generation:${index}`).slice(0, 24),
    mtime: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));
  const legacyInventory = {
    ...legacyReport,
    inventory_sha256: sha256(stableJson(legacyReport)),
  };
  assert.equal(
    deriveJsonPostgresInventoryContentSha256(legacyInventory),
    report.inventory_content_sha256,
  );
  assert.throws(
    () => deriveJsonPostgresInventoryContentSha256({
      ...legacyInventory,
      inventory_sha256: "0".repeat(64),
    }),
    /digest is invalid/u,
  );
});

test("source inventory does not choose authority from mtime and records missing roots", async () => {
  const report = await inventoryJsonPostgresSources({
    roots: [{ ref: "missing", path: join(tmpdir(), "lawos-source-inventory-definitely-missing") }],
    clock: () => new Date("2026-07-20T00:00:00.000Z"),
  });
  assert.deepEqual(report.roots, [{ root_ref: "missing", exists: false, candidate_file_count: 0 }]);
  assert.equal(report.classification_counts.authoritative, 0);
  assert.equal(report.claims.authority_selected_by_mtime, false);
  assert.equal(report.claims.production_contacted, false);
});

test("private locator manifest covers the exact safe inventory without entering it", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-locators-"));
  t.after(async () => (await import("node:fs/promises")).rm(root, { recursive: true, force: true }));
  const sourcePath = join(root, "matter-store.json");
  await writeFile(sourcePath, JSON.stringify({
    tenant_id: "tenant-never-return",
    records: [{ record_type: "Matter", record_id: "matter-never-return" }],
  }));
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const manifest = createJsonPostgresSourceLocatorManifest({ inventory, locators });
  assert.equal(validateJsonPostgresSourceLocatorManifest(manifest, { inventory }).valid, true);
  assert.equal(manifest.sources.length, 1);
  assert.equal(manifest.sources[0].source_path, await realpath(sourcePath));
  assert.equal(JSON.stringify(inventory).includes(sourcePath), false);
  assert.throws(
    () => validateJsonPostgresSourceLocatorManifest({
      ...manifest,
      sources: [{ ...manifest.sources[0], byte_size: manifest.sources[0].byte_size + 1 }],
    }, { inventory }),
    /drifted/u,
  );
});
