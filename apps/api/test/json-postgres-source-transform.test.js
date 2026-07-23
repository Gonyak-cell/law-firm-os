import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  compileJsonPostgresMigrationCorpus,
  createJsonPostgresSourceTransformPlan,
  validateJsonPostgresSourceTransformPlan,
  validateJsonPostgresSourceTransformResult,
} from "../src/json-postgres-source-transform.js";
import { inventoryJsonPostgresSources } from "../../../packages/persistence/src/postgres/source-inventory.js";
import {
  createJsonPostgresSourceLocatorManifest,
} from "../../../packages/persistence/src/postgres/source-locator-manifest.js";
import {
  runJsonPostgresMigration,
} from "../../../packages/persistence/src/postgres/json-postgres-migration.js";
import {
  createJsonPostgresRecordTypeCatalog,
} from "../../../packages/persistence/src/postgres/record-type-catalog.js";
import {
  createMigratedPostgresFixture,
} from "../../../packages/persistence/test/helpers/disposable-postgres.js";

const TENANT_ID = "tenant_real_fixture";

async function fixture(t, { rosterEmail = "person@example.test" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-transform-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const registration = {
    schema_version: "law-firm-os.registration-fixture.v1",
    tenant_id: TENANT_ID,
    users: [{
      user_id: "user_001",
      email: "person@example.test",
      status: "active",
      english_name: "Fixture Person EN",
      mfa_required: true,
      legacy_account_ref: "legacy-account-001",
      api_key: "must-not-survive",
      tenant_memberships: [{
        tenant_id: TENANT_ID,
        status: "active",
        role_profile_id: "staff",
        role_ids: ["staff"],
        group_ids: [],
        scopes: ["matter.read"],
        hrx_scopes: ["hrx.self"],
      }],
    }],
  };
  const roster = {
    schema_version: "law-firm-os.roster-fixture.v1",
    tenant_id: TENANT_ID,
    members: [{
      user_id: "user_001",
      employee_id: "employee_001",
      display_name: "Fixture Person",
      legal_name: "Fixture Person",
      work_email: rosterEmail,
      title: "Attorney",
      employment_type: "full_time",
      status: "active",
      profile_status: "active",
      org_unit_id: "legal",
      professional_profile: {
        experience: ["Prior Firm"],
        education: ["Law School"],
        qualifications: ["Bar"],
        practice_areas: ["Corporate"],
      },
      legacy_employee_code: "LEGACY-EMP-001",
    }],
  };
  const matter = {
    migrations: [],
    records: [{
      tenant_id: TENANT_ID,
      model_type: "MatterClient",
      client_id: "client_001",
      client_short_name: "CLIENT",
      display_name: "Client One",
    }, {
      tenant_id: TENANT_ID,
      model_type: "Matter",
      matter_id: "matter_001",
      client_id: "client_001",
      matter_code: "MAT-001",
      title: "Matter One",
      password_hash: "must-not-survive",
    }],
    idempotency: [],
    audit_events: [],
  };
  await writeFile(join(root, "registration-seed.json"), JSON.stringify(registration));
  await writeFile(join(root, "member-roster.json"), JSON.stringify(roster));
  await writeFile(join(root, "matter-store.json"), JSON.stringify(matter));
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const locatorManifest = createJsonPostgresSourceLocatorManifest({ inventory, locators });
  const transformByFamily = new Map([
    ["registration-seed", { kind: "identity-registration", domain_id: null }],
    ["member-roster", { kind: "identity-roster", domain_id: null }],
    ["matter-store", { kind: "runtime-domain-store", domain_id: "matter" }],
  ]);
  const plan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "fixture-transform",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    decisions: inventory.sources.map((source) => ({
      source_ref: source.source_ref,
      sha256: source.sha256,
      classification: "authoritative",
      reason_code: "OWNER_SELECTED",
      decision_ref: `decision-${source.source_ref}`,
      transform: transformByFamily.get(source.source_family),
    })),
  });
  return { root, inventory, locatorManifest, plan };
}

test("source transform preserves identity, HR history, client and matter data while excluding secrets", async (t) => {
  const { inventory, locatorManifest, plan } = await fixture(t);
  assert.equal(validateJsonPostgresSourceTransformPlan(plan, { inventory, locatorManifest }).valid, true);
  const first = await compileJsonPostgresMigrationCorpus({ inventory, locatorManifest, transformPlan: plan });
  const second = await compileJsonPostgresMigrationCorpus({ inventory, locatorManifest, transformPlan: plan });
  assert.deepEqual(second, first);
  assert.equal(validateJsonPostgresSourceTransformResult(first.result).valid, true);
  assert.equal(first.result.safe_counts.verified_source_count, 3);
  assert.equal(first.result.safe_counts.account_count, 1);
  assert.equal(first.result.safe_counts.roster_gap_count, 0);
  assert.equal(first.result.safe_counts.duplicate_matter_code_count, 0);
  assert.equal(first.result.safe_counts.rejected_item_count, 0);
  assert.equal(first.result.safe_counts.excluded_secret_field_count, 2);
  const account = first.corpus.accounts[0];
  assert.equal(account.email, "person@example.test");
  assert.equal(account.profile.english_name, "Fixture Person EN");
  assert.equal(account.profile.mfa_required, true);
  assert.equal(account.profile.employee_id, "employee_001");
  assert.equal(account.profile.source_attributes.registration.legacy_account_ref, "legacy-account-001");
  assert.equal(account.profile.source_attributes.roster.legacy_employee_code, "LEGACY-EMP-001");
  assert.deepEqual(account.profile.professional_profile.experience, ["Prior Firm"]);
  assert.deepEqual(account.profile.professional_profile.education, ["Law School"]);
  const hrx = first.corpus.domains.find((domain) => domain.domain_id === "hrx");
  const profile = hrx.records.find((record) => record.record_type === "hrx_employment_profiles");
  assert.deepEqual(JSON.parse(profile.payload.professional_profile).qualifications, ["Bar"]);
  const matter = first.corpus.domains.find((domain) => domain.domain_id === "matter");
  assert.equal(matter.records.find((record) => record.record_type === "Matter").payload.matter_code, "MAT-001");
  assert.equal(matter.records.find((record) => record.record_type === "MatterClient").payload.display_name, "Client One");
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes("must-not-survive"), false);
  assert.equal(serialized.includes(locatorManifest.sources[0].source_path), false);
  const postgres = await createMigratedPostgresFixture(t);
  if (postgres) {
    const migrated = await runJsonPostgresMigration({
      pool: postgres.appPool,
      corpus: first.corpus,
      mode: "import",
      allowRealData: true,
      recordTypeCatalog: createJsonPostgresRecordTypeCatalog({ corpus: first.corpus }),
      negativeTenantId: "tenant_real_fixture_negative",
    });
    const directory = await postgres.adminPool.query(
      "SELECT profile FROM lawos_identity.accounts WHERE tenant_id = $1 AND user_id = $2",
      [TENANT_ID, "user_001"],
    );
    assert.deepEqual(directory.rows[0].profile, first.corpus.accounts[0].profile);
    assert.equal(migrated.outcome, "PASS", JSON.stringify(migrated.directory));
  }
  assert.throws(() => validateJsonPostgresSourceTransformResult({
    ...first.result,
    safe_counts: { ...first.result.safe_counts, record_count: first.result.safe_counts.record_count + 1 },
  }), /digest drifted/u);
});

test("source transform fails closed on roster/email and source-byte drift", async (t) => {
  const mismatch = await fixture(t, { rosterEmail: "different@example.test" });
  await assert.rejects(
    compileJsonPostgresMigrationCorpus({
      inventory: mismatch.inventory,
      locatorManifest: mismatch.locatorManifest,
      transformPlan: mismatch.plan,
    }),
    /email conflict/u,
  );

  const clean = await fixture(t);
  const sourcePath = clean.locatorManifest.sources.find((source) =>
    source.source_path.endsWith("matter-store.json")).source_path;
  await writeFile(sourcePath, `${await readFile(sourcePath, "utf8")} `);
  await assert.rejects(
    compileJsonPostgresMigrationCorpus({
      inventory: clean.inventory,
      locatorManifest: clean.locatorManifest,
      transformPlan: clean.plan,
    }),
    /source bytes drifted/u,
  );
});

test("source transform requires one terminal decision and one transform for every source", async (t) => {
  const { inventory, locatorManifest, plan } = await fixture(t);
  assert.throws(() => createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "incomplete",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    decisions: [],
  }), /every inventory source/u);
  const [source, ...rest] = inventory.sources;
  assert.throws(() => createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "invalid",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    decisions: [{
      source_ref: source.source_ref,
      sha256: source.sha256,
      classification: "superseded",
      reason_code: "SUPERSEDED",
      decision_ref: "decision-one",
      transform: { kind: "identity-registration", domain_id: null },
    }, ...rest.map((row) => plan.sources.find((decision) => decision.source_ref === row.source_ref))],
  }), /non-authoritative source/u);
});
