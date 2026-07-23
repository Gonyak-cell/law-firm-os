import { createHash } from "node:crypto";
import {
  validateJsonPostgresRecordTypeCatalog,
  validateMigrationCorpusAgainstRecordTypeCatalog,
} from "./record-type-catalog.js";
import { prepareJsonPostgresMigrationCorpus } from "./json-postgres-migration.js";

export const JSON_POSTGRES_RECONCILIATION_VERSION = "law-firm-os.json-postgres-reconciliation.v1";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function safeRef(value) {
  return sha256(normalized(value)).slice(0, 32);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function entriesByKind(corpus, catalog) {
  const kinds = new Map(catalog.entries.map((entry) => [
    `${entry.domain_id}:${entry.record_type}`,
    entry.entity_kind,
  ]));
  return (corpus.domains ?? []).flatMap((domain) => (domain.records ?? []).map((record) => ({
    domain_id: domain.domain_id,
    record_type: record.record_type,
    record_id: record.record_id,
    payload: record.payload ?? {},
    references: record.references ?? [],
    entity_kind: kinds.get(`${domain.domain_id}:${record.record_type}`) ?? "other",
  })));
}

function duplicateRefs(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values.map(normalized).filter(Boolean)) {
    if (seen.has(value)) duplicates.add(safeRef(value));
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function reconcileJsonPostgresMigrationCorpus({
  corpus = {},
  recordTypeCatalog = {},
  expectedRejections = [],
} = {}) {
  validateJsonPostgresRecordTypeCatalog(recordTypeCatalog);
  const prepared = prepareJsonPostgresMigrationCorpus(corpus, {
    allowRealData: corpus.data_scope === "approved-real-manifest",
  });
  const acceptedCorpus = {
    tenant_id: prepared.tenant_id,
    accounts: prepared.accounts.map((account) => {
      const { password_hash: _discardedPasswordHash, ...user } = account.user;
      return { ...user, membership: account.membership };
    }),
    domains: prepared.domains.map((domain) => ({
      domain_id: domain.domain_id,
      records: domain.records,
    })),
  };
  const catalogValidation = validateMigrationCorpusAgainstRecordTypeCatalog({
    corpus: acceptedCorpus,
    catalog: recordTypeCatalog,
  });
  const records = entriesByKind(acceptedCorpus, recordTypeCatalog);
  const accounts = asArray(acceptedCorpus.accounts);
  const sourceAccounts = asArray(corpus.accounts);
  const accountUserIds = new Set(accounts.map((account) => normalized(account.user_id)).filter(Boolean));
  const accountEmails = sourceAccounts.map((account) => normalized(account.email)).filter(Boolean);
  const invalidEmailRefs = sourceAccounts
    .filter((account) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(normalized(account.email)))
    .map((account) => safeRef(account.user_id || account.email))
    .sort();

  const employeeRecords = records.filter((record) => record.entity_kind === "employee");
  const employeeIds = new Set(employeeRecords.map((record) => normalized(record.payload.employee_id ?? record.record_id)).filter(Boolean));
  const employeeLinks = records.filter((record) => record.entity_kind === "employee-user-link");
  const linkedEmployeeIds = new Set(employeeLinks.map((record) => normalized(record.payload.employee_id)).filter(Boolean));
  const linkedUserIds = new Set(employeeLinks.map((record) => normalized(record.payload.user_id)).filter(Boolean));
  const employeeWithoutLinkRefs = [...employeeIds]
    .filter((employeeId) => !linkedEmployeeIds.has(employeeId))
    .map(safeRef)
    .sort();
  const linkWithoutEmployeeRefs = [...linkedEmployeeIds]
    .filter((employeeId) => !employeeIds.has(employeeId))
    .map(safeRef)
    .sort();
  const linkWithoutAccountRefs = [...linkedUserIds]
    .filter((userId) => !accountUserIds.has(userId))
    .map(safeRef)
    .sort();

  const matters = records.filter((record) => record.entity_kind === "matter");
  const matterCodes = matters.map((record) => normalized(record.payload.matter_code));
  const blankMatterRefs = matters
    .filter((record) => !normalized(record.payload.matter_code))
    .map((record) => safeRef(record.record_id))
    .sort();
  const duplicateEmailRefs = duplicateRefs(accountEmails);
  const duplicateMatterCodeRefs = duplicateRefs(matterCodes);

  const missingTenantRefs = records
    .filter((record) => !normalized(acceptedCorpus.tenant_id))
    .map((record) => safeRef(`${record.domain_id}:${record.record_type}:${record.record_id}`))
    .sort();
  const professionalCounts = {
    professional_profile_count: records.filter((record) => record.entity_kind === "professional-profile").length,
    career_entry_count: records.filter((record) => record.entity_kind === "career-entry").length,
    education_entry_count: records.filter((record) => record.entity_kind === "education-entry").length,
    qualification_entry_count: records.filter((record) => record.entity_kind === "qualification-entry").length,
  };
  const blockingRefs = Object.freeze({
    duplicate_email_refs: Object.freeze(duplicateEmailRefs),
    invalid_email_refs: Object.freeze(invalidEmailRefs),
    employee_without_link_refs: Object.freeze(employeeWithoutLinkRefs),
    link_without_employee_refs: Object.freeze(linkWithoutEmployeeRefs),
    link_without_account_refs: Object.freeze(linkWithoutAccountRefs),
    blank_matter_code_refs: Object.freeze(blankMatterRefs),
    duplicate_matter_code_refs: Object.freeze(duplicateMatterCodeRefs),
    missing_tenant_refs: Object.freeze(missingTenantRefs),
    missing_logical_reference_refs: catalogValidation.missing_reference_refs,
  });
  const expectedRejectionKeys = new Set(expectedRejections.map((item) => `${item.record_ref}:${item.reason_code}`));
  if (expectedRejectionKeys.size !== expectedRejections.length) throw new TypeError("expected rejection decisions contain duplicates");
  const actualRejectionKeys = new Set(prepared.rejected.map((item) => `${item.record_ref}:${item.reason_code}`));
  const unexpectedRejectedRefs = prepared.rejected
    .filter((item) => !expectedRejectionKeys.has(`${item.record_ref}:${item.reason_code}`))
    .map((item) => item.record_ref)
    .sort();
  const missingExpectedRejectedRefs = expectedRejections
    .filter((item) => !actualRejectionKeys.has(`${item.record_ref}:${item.reason_code}`))
    .map((item) => item.record_ref)
    .sort();
  const rejectionRefs = Object.freeze({
    unexpected_rejected_refs: Object.freeze(unexpectedRejectedRefs),
    missing_expected_rejected_refs: Object.freeze(missingExpectedRejectedRefs),
  });
  const blockingCount = Object.values(blockingRefs).reduce((total, refs) => total + refs.length, 0)
    + catalogValidation.unapproved_record_type_count
    + catalogValidation.field_type_drift_count
    + catalogValidation.reference_rule_drift_count
    + catalogValidation.unique_key_drift_count
    + unexpectedRejectedRefs.length
    + missingExpectedRejectedRefs.length;
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_RECONCILIATION_VERSION,
    outcome: blockingCount === 0 ? "PASS" : "BLOCKED",
    catalog_sha256: recordTypeCatalog.catalog_sha256,
    safe_counts: Object.freeze({
      account_count: accounts.length,
      employee_count: employeeRecords.length,
      employee_user_link_count: employeeLinks.length,
      client_count: records.filter((record) => record.entity_kind === "client").length,
      matter_count: matters.length,
      dms_object_count: records.filter((record) => record.entity_kind === "dms-object").length,
      finance_record_count: records.filter((record) => record.entity_kind === "finance").length,
      portal_record_count: records.filter((record) => record.entity_kind === "portal").length,
      ...professionalCounts,
      duplicate_email_count: duplicateEmailRefs.length,
      invalid_email_count: invalidEmailRefs.length,
      employee_without_link_count: employeeWithoutLinkRefs.length,
      link_without_employee_count: linkWithoutEmployeeRefs.length,
      link_without_account_count: linkWithoutAccountRefs.length,
      blank_matter_code_count: blankMatterRefs.length,
      duplicate_matter_code_count: duplicateMatterCodeRefs.length,
      missing_tenant_count: missingTenantRefs.length,
      missing_logical_reference_count: catalogValidation.missing_reference_count,
      unapproved_record_type_count: catalogValidation.unapproved_record_type_count,
      field_type_drift_count: catalogValidation.field_type_drift_count,
      reference_rule_drift_count: catalogValidation.reference_rule_drift_count,
      unique_key_drift_count: catalogValidation.unique_key_drift_count,
      expected_rejected_count: expectedRejections.length,
      unexpected_rejected_count: unexpectedRejectedRefs.length,
      missing_expected_rejected_count: missingExpectedRejectedRefs.length,
      blocking_count: blockingCount,
    }),
    blocking_refs: blockingRefs,
    rejection_refs: rejectionRefs,
    claims: Object.freeze({
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({ ...value, reconciliation_sha256: sha256(value) });
}
