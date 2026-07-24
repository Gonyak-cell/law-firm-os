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
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
} from "../../../packages/persistence/src/postgres/source-adjudication.js";
import {
  createMigratedPostgresFixture,
} from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { loadHrxCoreMigrations } from "../../../packages/hrx/src/migrations/index.js";

const TENANT_ID = "tenant_real_fixture";
const TEST_SOURCE_SHA = "a".repeat(40);
const TEST_SOURCE_TREE = "b".repeat(40);

function recordAuthority(inventory, rootPriority) {
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory,
      approvedInventoryContentSha256:
        inventory.inventory_content_sha256,
    });
  return createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    decisionSetRef: "fixture-record-authority",
    ownerDecisionRef: "fixture-owner-decision",
    sourceSha: TEST_SOURCE_SHA,
    sourceTree: TEST_SOURCE_TREE,
    rootPriority,
  });
}

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
      accessToken: "must-not-survive-either",
      tokens: ["must-not-survive-plural"],
      opaque_attachment: { type: "Buffer", data: [1, 2, 3] },
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
  const authority = recordAuthority(inventory, ["runtime-primary"]);
  const plan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "fixture-transform",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    recordAuthority: authority,
    decisions: authority.sources.map((source) => ({
      ...source,
      transform: source.classification === "authoritative"
        ? transformByFamily.get(source.source_family)
        : null,
    })),
  });
  return { root, inventory, locatorManifest, authority, plan };
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
  assert.equal(first.result.safe_counts.excluded_secret_field_count, 5);
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
  const {
    inventory,
    locatorManifest,
    authority,
    plan,
  } = await fixture(t);
  assert.throws(() => createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "incomplete",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    recordAuthority: authority,
    decisions: [],
  }), /every inventory source/u);
  const [source, ...rest] = inventory.sources;
  assert.throws(() => createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "invalid",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    recordAuthority: authority,
    decisions: [{
      ...authority.sources.find((row) =>
        row.source_ref === source.source_ref),
      classification: "superseded",
      reason_code: "SUPERSEDED",
      decision_ref: "decision-one",
      transform: { kind: "identity-registration", domain_id: null },
    }, ...rest.map((row) => plan.sources.find((decision) => decision.source_ref === row.source_ref))],
  }), /non-authoritative source/u);
});

test("record-aware transform keeps unique records and removes only the older overlapping copy", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-record-aware-transform-"));
  const primary = join(root, "primary");
  const backups = join(root, "backups");
  await Promise.all([
    (await import("node:fs/promises")).mkdir(primary),
    (await import("node:fs/promises")).mkdir(backups),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(primary, "registration-seed.json"), JSON.stringify({
    tenant_id: TENANT_ID,
    users: [{
      user_id: "user_001",
      email: "person@example.test",
      status: "active",
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
  }));
  await writeFile(join(primary, "member-roster.json"), JSON.stringify({
    tenant_id: TENANT_ID,
    members: [{
      user_id: "user_001",
      employee_id: "employee_001",
      display_name: "Fixture Person",
      work_email: "person@example.test",
      title: "Attorney",
      org_unit_id: "legal",
      status: "active",
    }],
  }));
  await writeFile(join(primary, "matter-store.json"), JSON.stringify({
    records: [{
      tenant_id: TENANT_ID,
      model_type: "Matter",
      matter_id: "matter_shared",
      client_id: "client_primary",
      matter_code: "MAT-SHARED",
      status: "open",
      updated_at: "2026-07-24T02:00:00.000Z",
    }, {
      tenant_id: TENANT_ID,
      model_type: "MatterClient",
      client_id: "client_primary",
      client_short_name: "PRIMARY",
      display_name: "Primary Client",
    }],
    idempotency: [],
    audit_events: [],
  }));
  await writeFile(join(backups, "matter-store.json.old"), JSON.stringify({
    records: [{
      tenant_id: TENANT_ID,
      model_type: "Matter",
      matter_id: "matter_shared",
      client_id: "client_primary",
      matter_code: "MAT-SHARED",
      status: "closed",
      updated_at: "2026-07-24T01:00:00.000Z",
    }, {
      tenant_id: TENANT_ID,
      model_type: "MatterClient",
      client_id: "client_backup",
      client_short_name: "BACKUP",
      display_name: "Backup-only Client",
    }],
    idempotency: [],
    audit_events: [],
  }));
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [
      { ref: "runtime-primary", path: primary },
      {
        ref: "local-backups",
        path: backups,
        parse_json: false,
        adjudication_json: true,
      },
    ],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-24T03:00:00.000Z"),
  });
  const locatorManifest = createJsonPostgresSourceLocatorManifest({
    inventory,
    locators,
  });
  const authority = recordAuthority(inventory, [
    "runtime-primary",
    "local-backups",
  ]);
  const transformByFamily = new Map([
    ["registration-seed", {
      kind: "identity-registration",
      domain_id: null,
    }],
    ["member-roster", {
      kind: "identity-roster",
      domain_id: null,
    }],
    ["matter-store", {
      kind: "runtime-domain-store",
      domain_id: "matter",
    }],
  ]);
  const plan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "record-aware-transform",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary", "local-backups"],
    recordAuthority: authority,
    decisions: authority.sources.map((source) => ({
      ...source,
      transform: source.classification === "authoritative"
        ? transformByFamily.get(source.source_family)
        : null,
    })),
  });
  const compiled = await compileJsonPostgresMigrationCorpus({
    inventory,
    locatorManifest,
    transformPlan: plan,
  });
  assert.equal(authority.safe_counts.record_decision_count, 1);
  assert.equal(authority.safe_counts.automatic_record_decision_count, 1);
  assert.equal(authority.safe_counts.owner_record_decision_count, 0);
  assert.equal(compiled.result.safe_counts.archive_only_record_copy_count, 1);
  const matter = compiled.corpus.domains.find((domain) =>
    domain.domain_id === "matter");
  assert.equal(matter.records.filter((record) =>
    record.record_type === "Matter").length, 1);
  assert.equal(matter.records.find((record) =>
    record.record_type === "Matter").payload.status, "open");
  assert.deepEqual(
    matter.records.filter((record) =>
      record.record_type === "MatterClient")
      .map((record) => record.record_id)
      .sort(),
    ["client_backup", "client_primary"],
  );
});

test("record-aware transform disables every approved account pending a roster link", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-account-only-transform-"));
  const accountsRoot = join(root, "accounts");
  const rosterRoot = join(root, "roster");
  const runtimeRoot = join(root, "runtime");
  await Promise.all([
    (await import("node:fs/promises")).mkdir(accountsRoot),
    (await import("node:fs/promises")).mkdir(rosterRoot),
    (await import("node:fs/promises")).mkdir(runtimeRoot),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));
  const membership = (userId) => ({
    tenant_id: TENANT_ID,
    status: "active",
    role_profile_id: "staff",
    role_ids: ["staff"],
    group_ids: ["all-staff"],
    scopes: ["matter.read"],
    hrx_scopes: ["hrx.self"],
    source_ref: `registration-${userId}`,
  });
  await writeFile(
    join(accountsRoot, "registration-seed.json"),
    JSON.stringify({
      tenant_id: TENANT_ID,
      users: [{
        tenant_id: TENANT_ID,
        user_id: "user_linked",
        email: "linked@example.test",
        status: "active",
        role_profile_id: "staff",
        role_ids: ["staff"],
        group_ids: ["all-staff"],
        scopes: ["matter.read"],
        hrx_scopes: ["hrx.self"],
        source_ref: "registration-user_linked",
      }, {
        tenant_id: TENANT_ID,
        user_id: "user_pending",
        email: "pending@example.test",
        status: "active",
        tenant_memberships: [
          membership("user_pending"),
          {
            ...membership("user_pending"),
            tenant_id: "tenant_auxiliary",
          },
        ],
      }],
    }),
  );
  await writeFile(
    join(rosterRoot, "member-roster.json"),
    JSON.stringify({
      members: [{
        tenant_id: TENANT_ID,
        user_id: "user_linked",
        employee_id: "employee_linked",
        display_name: "Linked Person",
        work_email: "linked@example.test",
        status: "active",
      }],
    }),
  );
  await writeFile(
    join(runtimeRoot, "matter-store.json"),
    JSON.stringify({
      records: [{
        tenant_id: TENANT_ID,
        model_type: "MatterClient",
        client_id: "client_001",
        client_short_name: "CLIENT",
        display_name: "Client",
      }],
      idempotency: [],
      audit_events: [],
    }),
  );
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [
      { ref: "registered-account-source", path: accountsRoot },
      { ref: "registered-roster-source", path: rosterRoot },
      { ref: "runtime-primary", path: runtimeRoot },
    ],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-24T03:00:00.000Z"),
  });
  const locatorManifest = createJsonPostgresSourceLocatorManifest({
    inventory,
    locators,
  });
  const authority = recordAuthority(inventory, ["runtime-primary"]);
  assert.equal(authority.identity_decisions.length, 1);
  const transformByFamily = new Map([
    ["registration-seed", {
      kind: "identity-registration",
      domain_id: null,
    }],
    ["member-roster", {
      kind: "identity-roster",
      domain_id: null,
    }],
    ["matter-store", {
      kind: "runtime-domain-store",
      domain_id: "matter",
    }],
  ]);
  const decisions = authority.sources.map((source) => ({
    ...source,
    transform: source.classification === "authoritative"
      ? transformByFamily.get(source.source_family)
      : null,
  }));
  assert.throws(() => createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "missing-account-only-decision",
    tenantId: TENANT_ID,
    approvedRootRefs: [
      "registered-account-source",
      "registered-roster-source",
      "runtime-primary",
    ],
    recordAuthority: authority,
    decisions,
  }), /account-only users drifted/u);
  const plan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "account-only-decision",
    tenantId: TENANT_ID,
    approvedRootRefs: [
      "registered-account-source",
      "registered-roster-source",
      "runtime-primary",
    ],
    accountOnlyUserIds: ["user_pending"],
    recordAuthority: authority,
    decisions,
  });
  const compiled = await compileJsonPostgresMigrationCorpus({
    inventory,
    locatorManifest,
    transformPlan: plan,
  });
  const pending = compiled.corpus.accounts.find((account) =>
    account.user_id === "user_pending");
  assert.equal(pending.status, "disabled");
  assert.equal(pending.account_status, "disabled");
  assert.equal(pending.credential_status, "disabled");
  assert.equal(pending.membership.status, "disabled");
  assert.equal(pending.membership.role_profile_id, null);
  assert.deepEqual(pending.membership.role_ids, []);
  assert.deepEqual(pending.membership.group_ids, []);
  assert.deepEqual(pending.membership.scopes, []);
  assert.deepEqual(pending.membership.hrx_scopes, []);
  assert.equal(pending.profile.roster_link_status, "pending-roster-link");
  assert.equal(pending.profile.login_allowed, false);
  assert.equal(pending.profile.identity_setup_allowed, false);
  assert.equal(pending.profile.access_grant_allowed, false);
  assert.equal(pending.tenant_id, TENANT_ID);
  assert.deepEqual(
    pending.tenant_memberships.map((membership) =>
      membership.tenant_id),
    [TENANT_ID],
  );
  const linked = compiled.corpus.accounts.find((account) =>
    account.user_id === "user_linked");
  assert.deepEqual(
    linked.tenant_memberships.map((membership) =>
      membership.tenant_id),
    [TENANT_ID],
  );
});

test("record-aware transform merges partial HRX stores before enforcing references", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-partial-hrx-transform-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "registration-seed.json"), JSON.stringify({
    tenant_id: TENANT_ID,
    users: [{
      user_id: "user_001",
      email: "person@example.test",
      status: "active",
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
  }));
  await writeFile(join(root, "member-roster.json"), JSON.stringify({
    tenant_id: TENANT_ID,
    members: [{
      user_id: "user_001",
      employee_id: "employee_001",
      display_name: "Fixture Person",
      work_email: "person@example.test",
      title: "Attorney",
      org_unit_id: "legal",
      status: "active",
    }],
  }));
  await writeFile(join(root, "hrx-store.json"), JSON.stringify({
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [{
      id: "legacy-source-migration",
      hash: "f".repeat(64),
      applied_at: "2020-01-01T00:00:00.000Z",
    }],
    tables: {
      hrx_employment_profiles: [{
        tenant_id: TENANT_ID,
        profile_id: "legacy_profile_001",
        employee_id: "employee_001",
        employment_type: "full_time",
        status: "active",
        title: "Attorney",
        org_unit_id: "legal",
        effective_from: "2020-01-01",
        source_ref: "legacy-hrx",
      }, {
        tenant_id: TENANT_ID,
        profile_id: "profile_employee_001",
        employee_id: "employee_001",
        employment_type: "contractor",
        status: "active",
        effective_from: "2019-01-01",
        source_ref: "legacy-hrx",
      }, {
        tenant_id: TENANT_ID,
        profile_id: "version_profile_001",
        employee_id: "employee_001",
        state_version: 1,
        employment_type: "full_time",
        status: "active",
        title: "Attorney",
        org_unit_id: "legal",
        effective_from: "2020-01-01",
        source_ref: "legacy-hrx",
      }],
      hrx_employee_user_links: [{
        tenant_id: TENANT_ID,
        link_id: "legacy_login_001",
        employee_id: "employee_001",
        user_id: "user_001",
        purpose: "login_mapping",
        source_ref: "legacy-hrx",
      }],
    },
  }));
  await writeFile(join(root, "hrx-store.json.old"), JSON.stringify({
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [],
    tables: {
      hrx_employment_profiles: [{
        tenant_id: TENANT_ID,
        profile_id: "legacy_profile_001",
        employee_id: "employee_001",
        manager_employee_id: "manager_legacy",
        employment_type: "full_time",
        status: "active",
        title: "Associate",
        org_unit_id: "legacy",
        effective_from: "2020-01-01",
        source_ref: "legacy-hrx-old",
      }, {
        tenant_id: TENANT_ID,
        profile_id: "version_profile_001",
        employee_id: "employee_001",
        state_version: 2,
        employment_type: "full_time",
        status: "active",
        title: "Associate",
        org_unit_id: "legacy",
        effective_from: "2020-01-01",
        source_ref: "legacy-hrx-old",
      }],
    },
  }));
  const locators = [];
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    onSourceLocator: async (locator) => locators.push(locator),
    clock: () => new Date("2026-07-24T03:00:00.000Z"),
  });
  const locatorManifest = createJsonPostgresSourceLocatorManifest({
    inventory,
    locators,
  });
  const authority = recordAuthority(inventory, ["runtime-primary"]);
  const transformByFamily = new Map([
    ["registration-seed", {
      kind: "identity-registration",
      domain_id: null,
    }],
    ["member-roster", {
      kind: "identity-roster",
      domain_id: null,
    }],
    ["hrx-store", {
      kind: "hrx-table-store",
      domain_id: "hrx",
    }],
  ]);
  const plan = createJsonPostgresSourceTransformPlan({
    inventory,
    locatorManifest,
    transformSetRef: "partial-hrx-transform",
    tenantId: TENANT_ID,
    approvedRootRefs: ["runtime-primary"],
    recordAuthority: authority,
    decisions: authority.sources.map((source) => ({
      ...source,
      transform: source.classification === "authoritative"
        ? transformByFamily.get(source.source_family)
        : null,
    })),
  });
  const compiled = await compileJsonPostgresMigrationCorpus({
    inventory,
    locatorManifest,
    transformPlan: plan,
  });
  const hrx = compiled.corpus.domains.find((domain) =>
    domain.domain_id === "hrx");
  assert.ok(hrx.records.some((record) =>
    record.record_type === "hrx_employees"));
  assert.ok(hrx.records.some((record) =>
    record.record_type === "hrx_employment_profiles"
    && record.payload.profile_id === "legacy_profile_001"
    && record.payload.title === "Attorney"));
  assert.ok(hrx.records.some((record) =>
    record.record_type === "hrx_employment_profiles"
    && record.payload.profile_id === "version_profile_001"
    && record.payload.state_version === 2
    && record.payload.title === "Associate"));
  assert.equal(
    hrx.records.filter((record) =>
      record.record_type === "hrx_employee_user_links").length,
    1,
  );
  assert.equal(
    hrx.records.filter((record) =>
      record.record_type === "__hrx_schema_migration").length,
    loadHrxCoreMigrations().length,
  );
  assert.equal(
    compiled.result.safe_counts.hrx_primary_key_resolution_count,
    3,
  );
  assert.equal(
    compiled.result.safe_counts.hrx_unique_resolution_count,
    1,
  );
  assert.equal(
    compiled.result.safe_counts.roster_authority_resolution_count,
    3,
  );
});
