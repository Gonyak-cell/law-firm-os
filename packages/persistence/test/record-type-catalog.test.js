import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresRecordTypeCatalog,
  validateJsonPostgresRecordTypeCatalog,
  validateMigrationCorpusAgainstRecordTypeCatalog,
} from "../src/postgres/record-type-catalog.js";

function corpus() {
  return {
    accounts: [{
      user_id: "user-never-return",
      email: "person@example.test",
      status: "active",
      profile: { display_name: "Never Return" },
    }],
    domains: [
      {
        domain_id: "master-data",
        records: [{
          record_type: "Client",
          record_id: "client-never-return",
          unique_key: "client:never-return",
          payload: { client_id: "client-never-return", status: "active" },
          references: [],
        }],
      },
      {
        domain_id: "matter",
        records: [{
          record_type: "Matter",
          record_id: "matter-never-return",
          unique_key: "matter:never-return",
          payload: { matter_id: "matter-never-return", matter_code: "NEVER-RETURN" },
          references: [{
            reference_name: "client",
            target_domain_id: "master-data",
            target_record_type: "Client",
            target_record_id: "client-never-return",
          }],
        }],
      },
    ],
  };
}

test("record-type catalog emits shape only and validates logical references", () => {
  const source = corpus();
  const catalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const validated = validateJsonPostgresRecordTypeCatalog(catalog);
  const result = validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: source, catalog });
  assert.equal(validated.entry_count, 3);
  assert.equal(result.valid, true);
  assert.equal(result.missing_reference_count, 0);
  assert.equal(catalog.entries.find((entry) => entry.domain_id === "identity").destination, "identity-ledger");
  const matter = catalog.entries.find((entry) => entry.domain_id === "matter");
  assert.equal(matter.destination, "generic-ledger");
  assert.equal(matter.tenant_required, true);
  assert.equal(matter.additional_fields, "deny-unapproved-shape");
  assert.deepEqual(matter.write_expectations, { idempotency: true, audit: true, outbox: true });
  assert.equal(matter.lookup_index_policy, "measure-in-w12-before-index");
  assert.deepEqual(matter.references, [{
    reference_name: "client",
    target_domain_id: "master-data",
    target_record_type: "Client",
    required_per_record: true,
  }]);
  const serialized = JSON.stringify(catalog);
  for (const forbidden of ["user-never-return", "person@example.test", "Never Return", "client-never-return", "matter-never-return", "NEVER-RETURN"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("record-type catalog classifies only canonical matters as matter entities", () => {
  const source = corpus();
  source.domains[1].records.push({
    record_type: "MatterClient",
    record_id: "matter-client-never-return",
    payload: { client_id: "client-never-return" },
  }, {
    record_type: "MatterProfile",
    record_id: "matter-profile-never-return",
    payload: { matter_id: "matter-never-return" },
  });
  source.domains.push({
    domain_id: "hrx",
    records: [{
      record_type: "hrx_employment_profiles",
      record_id: "profile-never-return",
      payload: {
        tenant_id: "tenant-never-return",
        profile_id: "profile-never-return",
        employee_id: "employee-never-return",
      },
    }],
  });
  const catalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const kind = (domainId, recordType) => catalog.entries.find((entry) =>
    entry.domain_id === domainId
    && entry.record_type === recordType).entity_kind;
  assert.equal(kind("matter", "Matter"), "matter");
  assert.equal(kind("matter", "MatterClient"), "client");
  assert.equal(kind("matter", "MatterProfile"), "other");
  assert.equal(
    kind("hrx", "hrx_employment_profiles"),
    "professional-profile",
  );
});

test("record-type catalog blocks unapproved types, field drift, and missing targets", () => {
  const source = corpus();
  const catalog = createJsonPostgresRecordTypeCatalog({ corpus: source });

  const extraType = corpus();
  extraType.domains[1].records.push({
    record_type: "UnapprovedMatterType",
    record_id: "extra",
    payload: { status: "new" },
  });
  assert.equal(
    validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: extraType, catalog }).unapproved_record_type_count,
    1,
  );

  const fieldDrift = corpus();
  fieldDrift.domains[1].records[0].payload.matter_code = 123;
  assert.equal(
    validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: fieldDrift, catalog }).field_type_drift_count,
    1,
  );

  const missingTarget = corpus();
  missingTarget.domains[0].records = [];
  const missing = validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: missingTarget, catalog });
  assert.equal(missing.valid, false);
  assert.equal(missing.missing_reference_count, 1);
  assert.equal(JSON.stringify(missing).includes("client-never-return"), false);

  const missingUniqueKey = corpus();
  delete missingUniqueKey.domains[1].records[0].unique_key;
  assert.equal(
    validateMigrationCorpusAgainstRecordTypeCatalog({ corpus: missingUniqueKey, catalog }).unique_key_drift_count,
    1,
  );
});

test("record-type catalog rejects secrets and raw bytes", () => {
  const secret = corpus();
  secret.domains[1].records[0].payload.authorization = "never-return";
  assert.throws(
    () => createJsonPostgresRecordTypeCatalog({ corpus: secret }),
    /forbidden secret/u,
  );

  const bytes = corpus();
  bytes.domains[1].records[0].payload.file = Buffer.from("never-return");
  assert.throws(
    () => createJsonPostgresRecordTypeCatalog({ corpus: bytes }),
    /raw bytes/u,
  );
});

test("record-type catalog accepts only bounded credential metadata", () => {
  const safe = corpus();
  safe.accounts[0].credential_provider = "lawos-internal-password-provider-v1";
  safe.accounts[0].credential_status = "reset_required";
  safe.accounts[0].credential_rev = 2;
  assert.doesNotThrow(() => createJsonPostgresRecordTypeCatalog({ corpus: safe }));

  const unsafe = corpus();
  unsafe.accounts[0].credential_blob = "never-return";
  assert.throws(
    () => createJsonPostgresRecordTypeCatalog({ corpus: unsafe }),
    /forbidden secret/u,
  );
});
