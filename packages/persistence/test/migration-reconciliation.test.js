import assert from "node:assert/strict";
import test from "node:test";
import { createJsonPostgresRecordTypeCatalog } from "../src/postgres/record-type-catalog.js";
import { reconcileJsonPostgresMigrationCorpus } from "../src/postgres/migration-reconciliation.js";

function corpus() {
  return {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant-never-return",
    accounts: [{
      user_id: "user-never-return",
      email: "person@example.test",
      status: "active",
    }],
    domains: [
      {
        domain_id: "hrx",
        records: [
          {
            record_type: "Employee",
            record_id: "employee-never-return",
            unique_key: "employee:never-return",
            payload: { employee_id: "employee-never-return" },
            references: [],
          },
          {
            record_type: "EmployeeUserLink",
            record_id: "link-never-return",
            unique_key: "link:never-return",
            payload: { employee_id: "employee-never-return", user_id: "user-never-return" },
            references: [{
              reference_name: "employee",
              target_domain_id: "hrx",
              target_record_type: "Employee",
              target_record_id: "employee-never-return",
            }],
          },
        ],
      },
      {
        domain_id: "master-data",
        records: [{
          record_type: "Client",
          record_id: "client-never-return",
          unique_key: "client:never-return",
          payload: { client_id: "client-never-return" },
          references: [],
        }],
      },
      {
        domain_id: "matter",
        records: [{
          record_type: "Matter",
          record_id: "matter-never-return",
          unique_key: "matter:never-return",
          payload: { matter_id: "matter-never-return", matter_code: "CODE-NEVER-RETURN" },
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

test("migration reconciliation passes complete identity, employee, client, matter and reference mappings", () => {
  const source = corpus();
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const result = reconcileJsonPostgresMigrationCorpus({ corpus: source, recordTypeCatalog });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.blocking_count, 0);
  assert.equal(result.safe_counts.account_count, 1);
  assert.equal(result.safe_counts.employee_count, 1);
  assert.equal(result.safe_counts.employee_user_link_count, 1);
  assert.equal(result.safe_counts.client_count, 1);
  assert.equal(result.safe_counts.matter_count, 1);
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "tenant-never-return",
    "person@example.test",
    "employee-never-return",
    "CODE-NEVER-RETURN",
  ]) assert.equal(serialized.includes(forbidden), false);
});

test("migration reconciliation blocks duplicate emails, roster gaps and matter-code collisions with pseudonymous refs", () => {
  const source = corpus();
  source.accounts.push({ user_id: "user-two-never-return", email: "PERSON@example.test" });
  source.domains[0].records.pop();
  source.domains[2].records.push({
    record_type: "Matter",
    record_id: "matter-two-never-return",
    unique_key: "matter:two-never-return",
    payload: { matter_id: "matter-two-never-return", matter_code: "code-never-return" },
    references: [{
      reference_name: "client",
      target_domain_id: "master-data",
      target_record_type: "Client",
      target_record_id: "client-never-return",
    }],
  });
  const recordTypeCatalog = createJsonPostgresRecordTypeCatalog({ corpus: source });
  const result = reconcileJsonPostgresMigrationCorpus({ corpus: source, recordTypeCatalog });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.safe_counts.duplicate_email_count, 1);
  assert.equal(result.safe_counts.employee_without_link_count, 1);
  assert.equal(result.safe_counts.duplicate_matter_code_count, 1);
  assert.equal(result.safe_counts.unexpected_rejected_count, 1);
  assert.equal(result.safe_counts.blocking_count, 4);
  assert.equal(JSON.stringify(result).includes("person@example.test"), false);
});
