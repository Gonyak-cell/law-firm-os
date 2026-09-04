import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AMIC_PRIVATE_BOOTSTRAP_INVENTORY_VERSION,
  AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_RECEIPT_VERSION,
  createAmicPrivateBootstrapLegalEntityMappingTemplate,
  inventoryAmicPrivateBootstrap,
  validateAmicPrivateBootstrapLegalEntityMapping,
} from "../lib/amic-private-bootstrap-inventory.mjs";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fixture({ rosterTenant = "tenant-synthetic", photo = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), "amic-bootstrap-inventory-"));
  const source = join(root, "source");
  const photos = join(root, "photos");
  await mkdir(source, { recursive: true });
  await mkdir(photos, { recursive: true });
  const registration = {
    schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
    tenant_id: "tenant-synthetic",
    users: [
      { user_id: "user-one", email: "one@example.test" },
      { user_id: "user-account-only", email: "two@example.test" },
    ],
  };
  const roster = {
    schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
    tenant_id: rosterTenant,
    members: [{
      user_id: "user-one",
      employee_id: "employee-one",
      work_email: "one@example.test",
    }],
  };
  await writeFile(join(source, "registration.json"), JSON.stringify(registration));
  await writeFile(join(source, "roster.json"), JSON.stringify(roster));
  if (photo) await writeFile(join(photos, `${hash("employee-one")}.png`), PNG);
  return { root };
}

test("inventory returns only safe counts and digests for registration, roster, and photos", async () => {
  const { root } = await fixture();
  const result = await inventoryAmicPrivateBootstrap({
    root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  });
  assert.equal(result.schema_version, AMIC_PRIVATE_BOOTSTRAP_INVENTORY_VERSION);
  assert.equal(result.sources.registration.account_count, 2);
  assert.equal(result.sources.roster.member_count, 1);
  assert.equal(result.sources.photos.file_count, 1);
  assert.equal(result.reconciliation.account_roster_match_count, 1);
  assert.equal(result.reconciliation.account_only_count, 1);
  assert.equal(result.reconciliation.roster_only_count, 0);
  assert.equal(result.reconciliation.roster_photo_match_count, 1);
  assert.equal(result.legal_entity.explicit_mapping_required_before_import, true);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /one@example\.test|user-one|employee-one/u);
  assert.equal(result.raw_identity_included, false);
  assert.equal(result.source_mutated, false);
});

test("inventory fails closed on tenant drift and missing roster photos", async () => {
  const drifted = await fixture({ rosterTenant: "tenant-other" });
  await assert.rejects(
    inventoryAmicPrivateBootstrap({
      root: drifted.root,
      registrationPath: "source/registration.json",
      rosterPath: "source/roster.json",
      photoDirectory: "photos",
    }),
    /tenant scope must match/u,
  );

  const missing = await fixture({ photo: false });
  const result = await inventoryAmicPrivateBootstrap({
    root: missing.root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  });
  assert.equal(result.reconciliation.roster_photo_missing_count, 1);
  assert.equal(result.production_ready_claim, false);
});

test("inventory applies the shared PNG structure and dimension boundary", async () => {
  const { root } = await fixture();
  const oversized = Buffer.from(PNG);
  oversized.writeUInt32BE(100_000, 16);
  await writeFile(
    join(root, "photos", `${hash("employee-one")}.png`),
    oversized,
  );
  await assert.rejects(
    inventoryAmicPrivateBootstrap({
      root,
      registrationPath: "source/registration.json",
      rosterPath: "source/roster.json",
      photoDirectory: "photos",
    }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_INVALID",
  );
});

test("legal entity mapping binds every opaque subject to the exact inventory", async () => {
  const { root } = await fixture();
  const sourceOptions = {
    root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  };
  const template = await createAmicPrivateBootstrapLegalEntityMappingTemplate(
    sourceOptions,
  );
  assert.equal(template.assignments.length, 2);
  assert.equal(template.assignments.every((row) =>
    row.disposition === "pending"), true);
  assert.equal(template.assignments.filter((row) =>
    row.source_presence.photo).length, 1);
  assert.doesNotMatch(JSON.stringify(template), /user-one|employee-one|example\.test/u);

  const mapping = structuredClone(template);
  mapping.approval_ref = "approval.synthetic.001";
  mapping.assignments[0].disposition = "assign";
  mapping.assignments[0].legal_entity_id = "company-synthetic";
  mapping.assignments[1].disposition = "quarantine";
  mapping.assignments[1].quarantine_reason_code = "ACCOUNT_ONLY_REVIEW";
  const receipt = await validateAmicPrivateBootstrapLegalEntityMapping({
    ...sourceOptions,
    mapping,
  });
  assert.equal(
    receipt.schema_version,
    AMIC_PRIVATE_BOOTSTRAP_LEGAL_ENTITY_MAPPING_RECEIPT_VERSION,
  );
  assert.equal(receipt.outcome, "PASS");
  assert.equal(receipt.subject_count, 2);
  assert.equal(receipt.assigned_subject_count, 1);
  assert.equal(receipt.quarantined_subject_count, 1);
  assert.equal(receipt.legal_entity_count, 1);
  assert.equal(receipt.ready_for_dry_run, true);
  assert.equal(receipt.import_authorized, false);
  assert.doesNotMatch(JSON.stringify(receipt), /user-one|employee-one|example\.test/u);
});

test("legal entity mapping rejects pending, drifted, and unapproved rows", async () => {
  const { root } = await fixture();
  const sourceOptions = {
    root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  };
  const template = await createAmicPrivateBootstrapLegalEntityMappingTemplate(
    sourceOptions,
  );
  await assert.rejects(
    validateAmicPrivateBootstrapLegalEntityMapping({
      ...sourceOptions,
      mapping: template,
    }),
    /approval_ref is required/u,
  );

  const pending = structuredClone(template);
  pending.approval_ref = "approval.synthetic.002";
  await assert.rejects(
    validateAmicPrivateBootstrapLegalEntityMapping({
      ...sourceOptions,
      mapping: pending,
    }),
    /disposition must be assign or quarantine/u,
  );

  const drifted = structuredClone(pending);
  drifted.assignments[0].source_coordinates.registration_row = 99;
  await assert.rejects(
    validateAmicPrivateBootstrapLegalEntityMapping({
      ...sourceOptions,
      mapping: drifted,
    }),
    /source binding drifted/u,
  );
});

test("inventory CLI returns a safe mapping block without a stack or source values", async () => {
  const { root } = await fixture();
  const mapping = await createAmicPrivateBootstrapLegalEntityMappingTemplate({
    root,
    registrationPath: "source/registration.json",
    rosterPath: "source/roster.json",
    photoDirectory: "photos",
  });
  const mappingPath = join(root, "source", "mapping.json");
  await writeFile(mappingPath, JSON.stringify(mapping));
  const result = spawnSync(process.execPath, [
    join(repoRoot, "scripts", "inventory-amic-private-bootstrap.mjs"),
    "--root", root,
    "--registration-source", "source/registration.json",
    "--roster-source", "source/roster.json",
    "--photo-directory", "photos",
    "--validate-mapping", "source/mapping.json",
  ], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  const receipt = JSON.parse(result.stderr);
  assert.deepEqual(receipt, {
    verdict: "BLOCKED",
    operation: "mapping-validation",
    failure_code: "AMIC_PRIVATE_BOOTSTRAP_MAPPING_APPROVAL_REQUIRED",
    raw_identity_returned: false,
    raw_photo_returned: false,
    stack_returned: false,
    import_authorized: false,
    production_ready_claim: false,
  });
  assert.doesNotMatch(result.stderr, /one@example\.test|user-one|employee-one|at file:/u);
});
