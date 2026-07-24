import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
  inspectJsonPostgresAdjudicationSource,
  validateJsonPostgresAdjudicationRecommendations,
  validateJsonPostgresRecordAuthority,
  validateJsonPostgresSourceAdjudicationContract,
} from "../src/postgres/source-adjudication.js";
import {
  deriveJsonPostgresInventoryContentSha256,
  inventoryJsonPostgresSources,
} from "../src/postgres/source-inventory.js";

function domainState(records) {
  return {
    records,
    idempotency: [],
    audit_events: [],
  };
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-adjudication-"));
  const primary = join(root, "primary");
  const backups = join(root, "backups");
  await Promise.all([
    (await import("node:fs/promises")).mkdir(primary),
    (await import("node:fs/promises")).mkdir(backups),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));
  const current = domainState([{
    tenant_id: "tenant-never-return",
    model_type: "Matter",
    resource_id: "matter-a-never-return",
    state_version: 2,
    matter_code: "A-NEVER-RETURN",
    api_key: "secret-never-return",
  }]);
  const historical = domainState([
    {
      tenant_id: "tenant-never-return",
      model_type: "Matter",
      resource_id: "matter-a-never-return",
      state_version: 1,
      matter_code: "A-OLD-NEVER-RETURN",
    },
    {
      tenant_id: "tenant-never-return",
      model_type: "Matter",
      resource_id: "matter-b-never-return",
      state_version: 1,
      matter_code: "B-NEVER-RETURN",
    },
  ]);
  const currentPath = join(primary, "matter-store.json");
  const historicalPath = join(backups, "matter-store.json.old");
  const duplicatePath = join(backups, "matter-store.json.copy");
  await writeFile(currentPath, `${JSON.stringify(current)}\n`);
  await writeFile(historicalPath, `${JSON.stringify(historical)}\n`);
  await writeFile(duplicatePath, `${JSON.stringify(historical)}\n`);
  return {
    primary,
    backups,
    currentPath,
  };
}

async function inventory(source, clock = "2026-07-24T00:00:00.000Z") {
  return inventoryJsonPostgresSources({
    roots: [
      { ref: "runtime-primary", path: source.primary },
      {
        ref: "local-backups",
        path: source.backups,
        parse_json: false,
        adjudication_json: true,
      },
    ],
    clock: () => new Date(clock),
  });
}

test("adjudication contract emits only pseudonymous record lineage and deterministic recommendations", async (t) => {
  const source = await fixture(t);
  const report = await inventory(source);
  assert.equal(validateJsonPostgresSourceAdjudicationContract(
    report.adjudication_contract,
    { inventoryContentSha256: report.inventory_content_sha256 },
  ).valid, true);
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256: report.inventory_content_sha256,
    });
  assert.equal(validateJsonPostgresAdjudicationRecommendations(
    recommendations,
    {
      inventory: report,
      approvedInventoryContentSha256:
        report.inventory_content_sha256,
    },
  ).valid, true);
  assert.equal(recommendations.safe_counts.source_count, 3);
  assert.equal(recommendations.safe_counts.duplicate_source_count, 1);
  assert.equal(
    recommendations.safe_counts.authoritative_candidate_count,
    2,
  );
  assert.equal(recommendations.safe_counts.record_conflict_count, 0);
  assert.equal(
    recommendations.sources.filter((row) =>
      row.recommended_classification === "authoritative").length,
    2,
  );
  assert.ok(
    report.adjudication_contract.safe_counts.excluded_secret_field_count > 0,
  );
  assert.equal(
    deriveJsonPostgresInventoryContentSha256(report),
    report.inventory_content_sha256,
  );
  const serialized = JSON.stringify({
    contract: report.adjudication_contract,
    recommendations,
  });
  for (const forbidden of [
    "tenant-never-return",
    "matter-a-never-return",
    "matter-b-never-return",
    "A-NEVER-RETURN",
    "B-NEVER-RETURN",
    "secret-never-return",
  ]) assert.equal(serialized.includes(forbidden), false);
});

test("adjudication contract is mtime-independent and changes on source bytes", async (t) => {
  const source = await fixture(t);
  const first = await inventory(source);
  await utimes(
    source.currentPath,
    new Date("2026-07-24T01:00:00.000Z"),
    new Date("2026-07-24T01:00:00.000Z"),
  );
  const metadataOnly = await inventory(
    source,
    "2026-07-24T02:00:00.000Z",
  );
  assert.equal(
    metadataOnly.inventory_content_sha256,
    first.inventory_content_sha256,
  );
  assert.equal(
    metadataOnly.adjudication_contract.adjudication_contract_sha256,
    first.adjudication_contract.adjudication_contract_sha256,
  );
  await writeFile(source.currentPath, `${JSON.stringify(domainState([{
    tenant_id: "tenant-never-return",
    model_type: "Matter",
    resource_id: "matter-a-never-return",
    state_version: 3,
    matter_code: "A-CHANGED-NEVER-RETURN",
  }]))}\n`);
  const changed = await inventory(source);
  assert.notEqual(
    changed.inventory_content_sha256,
    first.inventory_content_sha256,
  );
  assert.notEqual(
    changed.adjudication_contract.adjudication_contract_sha256,
    first.adjudication_contract.adjudication_contract_sha256,
  );
});

test("same-version divergent records remain unresolved without last-write-wins", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-conflict-"));
  const primary = join(root, "primary");
  const backups = join(root, "backups");
  await Promise.all([
    (await import("node:fs/promises")).mkdir(primary),
    (await import("node:fs/promises")).mkdir(backups),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = {
    tenant_id: "tenant-never-return",
    model_type: "Matter",
    resource_id: "matter-conflict-never-return",
    state_version: 1,
  };
  await writeFile(
    join(primary, "matter-store.json"),
    JSON.stringify(domainState([{ ...base, status: "open" }])),
  );
  await writeFile(
    join(backups, "matter-store.json.old"),
    JSON.stringify(domainState([{ ...base, status: "closed" }])),
  );
  const report = await inventoryJsonPostgresSources({
    roots: [
      { ref: "runtime-primary", path: primary },
      {
        ref: "local-backups",
        path: backups,
        parse_json: false,
        adjudication_json: true,
      },
    ],
    clock: () => new Date("2026-07-24T00:00:00.000Z"),
  });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256: report.inventory_content_sha256,
    });
  assert.equal(recommendations.safe_counts.record_conflict_count, 1);
  assert.equal(recommendations.safe_counts.unresolved_source_count, 2);
  assert.equal(
    recommendations.sources.every((row) =>
      row.recommended_classification === null),
    true,
  );
  assert.equal(recommendations.claims.authority_selected_by_mtime, false);
  assert.equal(recommendations.claims.authority_decision_final, false);
  const authority = createJsonPostgresRecordAuthority({
    inventory: report,
    recommendations,
    decisionSetRef: "root-priority-decision",
    ownerDecisionRef: "owner-root-priority",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    rootPriority: ["runtime-primary", "local-backups"],
  });
  assert.equal(validateJsonPostgresRecordAuthority(authority, {
    inventory: report,
    recommendations,
  }).valid, true);
  assert.equal(authority.safe_counts.record_decision_count, 1);
  assert.equal(authority.safe_counts.residual_record_count, 0);
  assert.equal(authority.safe_counts.authoritative_source_count, 1);
  assert.equal(authority.safe_counts.superseded_source_count, 1);
  assert.equal(
    authority.record_decisions[0].canonical_source_ref,
    report.sources.find((source) =>
      source.root_ref === "runtime-primary").source_ref,
  );
});

test("record authority refuses a same-root tie without an owner-bound comparison", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-record-authority-tie-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = {
    tenant_id: "tenant-never-return",
    model_type: "Matter",
    resource_id: "matter-conflict-never-return",
  };
  await writeFile(
    join(root, "matter-store-a.json"),
    JSON.stringify(domainState([{ ...base, status: "open" }])),
  );
  await writeFile(
    join(root, "matter-store-b.json"),
    JSON.stringify(domainState([{ ...base, status: "closed" }])),
  );
  const report = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-24T00:00:00.000Z"),
  });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256:
        report.inventory_content_sha256,
    });
  assert.throws(() => createJsonPostgresRecordAuthority({
    inventory: report,
    recommendations,
    decisionSetRef: "same-root-tie",
    ownerDecisionRef: "owner-same-root-tie",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    rootPriority: ["runtime-primary"],
  }), /remains unresolved/u);
});

test("adjudication excludes normalized secret names and serialized bytes", () => {
  const first = inspectJsonPostgresAdjudicationSource(domainState([{
    tenant_id: "tenant-never-return",
    record_type: "Identity",
    record_id: "identity-never-return",
    state_version: 1,
    accessToken: "first-secret-never-return",
    apiKey: "first-key-never-return",
    credential_status: "pending",
    payload: { type: "Buffer", data: [1, 2, 3] },
  }]));
  const second = inspectJsonPostgresAdjudicationSource(domainState([{
    tenant_id: "tenant-never-return",
    record_type: "Identity",
    record_id: "identity-never-return",
    state_version: 1,
    accessToken: "second-secret-never-return",
    apiKey: "second-key-never-return",
    credential_status: "pending",
    payload: { type: "Buffer", data: [9, 8, 7] },
  }]));
  assert.equal(first.excluded_secret_field_count, 3);
  assert.equal(
    first.records[0].content_sha256,
    second.records[0].content_sha256,
  );
});

test("recommendations require the exact approved inventory binding", async (t) => {
  const source = await fixture(t);
  const report = await inventory(source);
  assert.throws(
    () => createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256: "0".repeat(64),
    }),
    /approved adjudication inventory binding is invalid/u,
  );
  const drifted = {
    ...report,
    adjudication_contract: {
      ...report.adjudication_contract,
      sources: report.adjudication_contract.sources.slice(1),
    },
  };
  assert.throws(
    () => createJsonPostgresAdjudicationRecommendations({
      inventory: drifted,
      approvedInventoryContentSha256: report.inventory_content_sha256,
    }),
    /contract digest drifted|source binding is incomplete/u,
  );
});

test("identity diagnostics read nested values and remain tenant scoped", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lawos-source-identity-scope-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const rows = [
    {
      tenant_id: "tenant-a-never-return",
      record_type: "IdentityUser",
      resource_id: "user-a-never-return",
      data: {
        user_id: "user-a-never-return",
        email: "shared-never-return@example.test",
      },
    },
    {
      tenant_id: "tenant-b-never-return",
      record_type: "IdentityUser",
      resource_id: "user-b-never-return",
      data: {
        user_id: "user-b-never-return",
        email: "shared-never-return@example.test",
      },
    },
    {
      tenant_id: "tenant-a-never-return",
      record_type: "IdentityUser",
      resource_id: "user-c-never-return",
      data: {
        user_id: "user-c-never-return",
        email: "shared-never-return@example.test",
      },
    },
  ];
  await Promise.all(rows.map((row, index) =>
    writeFile(
      join(root, `identity-store-${index}.json`),
      JSON.stringify(domainState([row])),
    )));
  const report = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-24T00:00:00.000Z"),
  });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256:
        report.inventory_content_sha256,
    });
  assert.equal(
    recommendations.identity_conflicts.duplicate_email_refs.length,
    1,
  );
  assert.equal(recommendations.safe_counts.identity_conflict_count, 1);
  const serialized = JSON.stringify(recommendations);
  for (const forbidden of [
    "tenant-a-never-return",
    "tenant-b-never-return",
    "user-a-never-return",
    "shared-never-return@example.test",
  ]) assert.equal(serialized.includes(forbidden), false);
});
