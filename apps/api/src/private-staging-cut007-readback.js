import { createHash } from "node:crypto";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";

const SYNTHETIC_TENANT = /^tenant_lawos_staging_cut007_[a-z0-9_-]+$/u;
const SYNTHETIC_USER = /^synthetic-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_EMPLOYEE = /^emp-lawos-staging-[a-z0-9-]+$/u;
const SYNTHETIC_RESOURCE = /^[a-z][a-z0-9:_-]{7,160}$/u;
const READBACK_DOMAINS = Object.freeze(["hrx", "master-data", "crm", "intake", "matter", "finance", "client-portal"]);

function requiredText(value, name, pattern = null) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  if (pattern && !pattern.test(text)) throw new TypeError(`${name} is outside the synthetic CUT-007 namespace`);
  return text;
}

function unique(values, name, pattern) {
  const normalized = [...new Set((values ?? []).map((value) => requiredText(value, name, pattern)))].sort();
  if (!normalized.length) throw new TypeError(`${name} must not be empty`);
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function payloadContainsAny(payload, values) {
  const text = JSON.stringify(payload ?? {});
  return values.some((value) => text.includes(value));
}

function professionalProfileComplete(record) {
  const profile = record?.payload?.professional_profile;
  return profile?.schema_version === "law-firm-os.people-professional-profile.v0.1"
    && ["experience", "education", "qualifications", "practice_areas"].every((field) => Array.isArray(profile[field]));
}

function normalizeExpected(input = {}) {
  return Object.freeze({
    user_ids: Object.freeze(unique(input.user_ids, "expected user id", SYNTHETIC_USER)),
    employee_ids: Object.freeze(unique(input.employee_ids, "expected employee id", SYNTHETIC_EMPLOYEE)),
    matter_id: requiredText(input.matter_id, "expected matter id", SYNTHETIC_RESOURCE),
    document_ids: Object.freeze(unique(input.document_ids, "expected document id", SYNTHETIC_RESOURCE)),
    finance_record_id: requiredText(input.finance_record_id, "expected finance record id", SYNTHETIC_RESOURCE),
    portal_record_id: requiredText(input.portal_record_id, "expected portal record id", SYNTHETIC_RESOURCE),
  });
}

async function dmsReadback(pool, tenantId, documentIds) {
  return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => {
    const result = await client.query(
      `SELECT
         (SELECT count(*)::int FROM lawos_dms.documents WHERE tenant_id = $1 AND document_id = ANY($2::text[])) AS document_count,
         (SELECT count(*)::int FROM lawos_dms.document_versions WHERE tenant_id = $1 AND document_id = ANY($2::text[])) AS version_count,
         (SELECT count(*)::int
            FROM lawos_dms.document_versions AS version
            JOIN lawos_dms.file_objects AS object
              ON object.tenant_id = version.tenant_id AND object.file_object_id = version.file_object_id
           WHERE version.tenant_id = $1 AND version.document_id = ANY($2::text[]) AND version.sha256 = object.sha256
                 AND object.status = 'committed') AS committed_digest_match_count,
         (SELECT count(*)::int FROM lawos_dms.legal_holds WHERE tenant_id = $1 AND document_id = ANY($2::text[]) AND status = 'active') AS active_legal_hold_count,
         (SELECT count(*)::int FROM lawos_dms.retention_policies WHERE tenant_id = $1 AND document_id = ANY($2::text[])) AS retention_policy_count,
         (SELECT count(*)::int FROM lawos_dms.audit_events WHERE tenant_id = $1 AND object_id = ANY($2::text[])) AS audit_count,
         (SELECT count(*)::int FROM lawos_dms.outbox_events WHERE tenant_id = $1 AND aggregate_id = ANY($2::text[])) AS outbox_count`,
      [tenantId, documentIds],
    );
    return Object.freeze(result.rows[0]);
  });
}

export async function runPrivateStagingCut007Readback({ pool, tenantIds, runId, expected } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const tenants = unique(tenantIds, "CUT-007 tenant id", SYNTHETIC_TENANT);
  if (tenants.length !== 2) throw new TypeError("CUT-007 readback requires exactly two synthetic tenants");
  const primaryTenantId = tenants[0];
  const negativeTenantId = tenants[1];
  const normalized = normalizeExpected(expected);
  const id = requiredText(runId, "runId", /^[a-z0-9-]{8,80}$/u);
  const identity = createPostgresIdentityLedger({ pool });
  const ledger = createPostgresDomainLedger({ pool });

  const [primaryUsers, primaryIdentityAudit, primaryIdentityOutbox, negativeUsers] = await Promise.all([
    identity.listDirectoryUsers({ tenant_id: primaryTenantId }),
    identity.listSecurityAudit({ tenant_id: primaryTenantId }),
    identity.listDirectoryOutbox({ tenant_id: primaryTenantId }),
    identity.listDirectoryUsers({ tenant_id: negativeTenantId }),
  ]);
  const expectedUsers = primaryUsers.filter((user) => normalized.user_ids.includes(user.user_id));
  const negativeExpectedUsers = negativeUsers.filter((user) => normalized.user_ids.includes(user.user_id));

  const domainRows = [];
  let domainAuditCount = 0;
  let domainOutboxCount = 0;
  let negativeExpectedDomainRecordCount = 0;
  for (const domainId of READBACK_DOMAINS) {
    const [records, audit, outbox, negativeRecords] = await Promise.all([
      ledger.list({ tenant_id: primaryTenantId, domain_id: domainId }),
      ledger.listAudit({ tenant_id: primaryTenantId, domain_id: domainId }),
      ledger.listOutbox({ tenant_id: primaryTenantId, domain_id: domainId }),
      ledger.list({ tenant_id: negativeTenantId, domain_id: domainId }),
    ]);
    domainRows.push(Object.freeze({ domain_id: domainId, record_count: records.length, audit_count: audit.length, outbox_count: outbox.length, records }));
    domainAuditCount += audit.length;
    domainOutboxCount += outbox.length;
    const expectedIdentifiers = [
      ...normalized.user_ids,
      ...normalized.employee_ids,
      normalized.matter_id,
      ...normalized.document_ids,
      normalized.finance_record_id,
      normalized.portal_record_id,
    ];
    negativeExpectedDomainRecordCount += negativeRecords.filter((record) => payloadContainsAny(record.payload, expectedIdentifiers)).length;
  }

  const byDomain = new Map(domainRows.map((entry) => [entry.domain_id, entry]));
  const hrxRecords = byDomain.get("hrx").records;
  const expectedProfiles = hrxRecords.filter((record) => record.record_type === "hrx_employment_profiles"
    && normalized.employee_ids.includes(record.payload?.employee_id));
  const expectedLinks = hrxRecords.filter((record) => record.record_type === "hrx_employee_user_links"
    && normalized.employee_ids.includes(record.payload?.employee_id)
    && normalized.user_ids.includes(record.payload?.user_id));
  const matterRecords = byDomain.get("matter").records.filter((record) => (
    record.record_type === "Matter" && record.payload?.matter_id === normalized.matter_id
  ));
  const financeRecords = byDomain.get("finance").records.filter((record) => payloadContainsAny(record.payload, [normalized.finance_record_id]));
  const portalRecords = byDomain.get("client-portal").records.filter((record) => payloadContainsAny(record.payload, [normalized.portal_record_id]));
  const [primaryDms, negativeDms] = await Promise.all([
    dmsReadback(pool, primaryTenantId, normalized.document_ids),
    dmsReadback(pool, negativeTenantId, normalized.document_ids),
  ]);

  const safeCounts = Object.freeze({
    expected_user_count: normalized.user_ids.length,
    directory_user_count: expectedUsers.length,
    identity_audit_count: primaryIdentityAudit.length,
    identity_outbox_count: primaryIdentityOutbox.length,
    employment_profile_count: expectedProfiles.length,
    professional_profile_count: expectedProfiles.filter(professionalProfileComplete).length,
    employee_user_link_count: expectedLinks.length,
    matter_record_count: matterRecords.length,
    finance_record_count: financeRecords.length,
    portal_record_count: portalRecords.length,
    dms_document_count: primaryDms.document_count,
    dms_version_count: primaryDms.version_count,
    dms_committed_digest_match_count: primaryDms.committed_digest_match_count,
    dms_active_legal_hold_count: primaryDms.active_legal_hold_count,
    dms_retention_policy_count: primaryDms.retention_policy_count,
    dms_audit_count: primaryDms.audit_count,
    dms_outbox_count: primaryDms.outbox_count,
    domain_audit_count: domainAuditCount,
    domain_outbox_count: domainOutboxCount,
    wrong_tenant_visible_count: negativeExpectedUsers.length + negativeExpectedDomainRecordCount + negativeDms.document_count,
    real_data_count: 0,
  });
  const pass = expectedUsers.length === normalized.user_ids.length
    && expectedProfiles.length === normalized.employee_ids.length
    && expectedProfiles.every(professionalProfileComplete)
    && expectedLinks.length === normalized.employee_ids.length
    && matterRecords.length === 1
    && matterRecords[0].payload?.matter_code
    && financeRecords.length >= 1
    && portalRecords.length >= 1
    && primaryDms.document_count === normalized.document_ids.length
    && primaryDms.version_count === normalized.document_ids.length
    && primaryDms.committed_digest_match_count === normalized.document_ids.length
    && primaryDms.active_legal_hold_count >= 1
    && primaryDms.retention_policy_count >= 1
    && primaryDms.audit_count >= normalized.document_ids.length
    && primaryDms.outbox_count >= normalized.document_ids.length
    && domainAuditCount > 0
    && domainOutboxCount > 0
    && safeCounts.wrong_tenant_visible_count === 0;
  if (!pass) throw Object.assign(new Error("CUT-007 PostgreSQL readback invariants failed"), {
    code: "LAWOS_PRIVATE_STAGING_CUT007_READBACK_FAILED",
    safe_error_code: "PRIVATE_STAGING_CUT007_READBACK_FAILED",
    safe_counts: safeCounts,
  });
  const domainCounts = Object.freeze(Object.fromEntries(domainRows.map(({ domain_id, record_count, audit_count, outbox_count }) => [domain_id, {
    record_count,
    audit_count,
    outbox_count,
  }])));
  return Object.freeze({
    outcome: "PASS",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    run_fingerprint: sha256(id),
    safe_counts: safeCounts,
    domain_counts: domainCounts,
    readback_fingerprint: sha256(JSON.stringify({ safeCounts, domainCounts })),
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    real_data_count: 0,
    raw_value_returned: false,
    secret_material_returned: false,
    production_contacted: false,
    production_ready_claim: false,
  });
}
