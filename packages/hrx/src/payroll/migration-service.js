import { createHash } from "node:crypto";

export const PAYROLL_PROFILE_MIGRATION_APPROVAL_SCHEMA_VERSION = "law-firm-os.hrx.payroll-profile-migration-approval.v0.1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, code) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = 409;
  return error;
}

function ledgerEffect(row) {
  if (["earned", "carryover", "released"].includes(row.entry_type)) return row.amount_minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -row.amount_minutes;
  if (row.entry_type === "adjustment") return row.adjustment_direction === "credit" ? row.amount_minutes : -row.amount_minutes;
  return 0;
}

function createInMemoryBackupPort() {
  const backups = new Map();
  return Object.freeze({
    save({ tenant_id: tenantId, preview_hash: previewHash, state }) {
      const backupRef = `vault:payroll-migration-backup/${hash({ tenantId, previewHash, state }).slice(7, 31)}`;
      backups.set(backupRef, structuredClone(state));
      return backupRef;
    },
    read(backupRef) {
      const state = backups.get(backupRef);
      return state ? structuredClone(state) : null;
    },
  });
}

export function createPayrollProfileMigrationService({ store, repository, backupPort = createInMemoryBackupPort(), clock = () => new Date().toISOString() } = {}) {
  if (!store?.query || !store?.snapshot || !store?.restoreSnapshot || !repository?.createProfile || !repository?.listProfiles) {
    throw new TypeError("payroll profile migration requires store snapshot support and payroll repository");
  }

  function normalizedRows(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    if (!Array.isArray(input.source_rows)) throw new TypeError("source_rows must be an array");
    return [...input.source_rows].map((row) => {
      const sourceKey = requiredString(row, "source_key");
      const employeeId = requiredString(row, "employee_id");
      const employmentType = requiredString(row, "employment_type");
      const effectiveFrom = requiredString(row, "effective_from");
      const compensationRef = requiredString(row, "compensation_ref");
      if (!/^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/.test(sourceKey) || !/^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/.test(compensationRef)) {
        throw new TypeError("migration source and compensation references must be tokenized");
      }
      if (!["monthly", "hourly", "daily", "freelancer"].includes(employmentType)) throw new TypeError("employment_type is invalid");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new TypeError("effective_from must be an ISO date");
      if (!Number.isInteger(row.unused_leave_minutes) || row.unused_leave_minutes < 0) throw new TypeError("unused_leave_minutes must be a non-negative integer");
      return Object.freeze({
        source_key: sourceKey,
        payroll_profile_id: `payroll_profile_mig_${hash(sourceKey).slice(7, 31)}`,
        employee_id: employeeId,
        employment_type: employmentType,
        pay_group_code: requiredString(row, "pay_group_code"),
        currency: "KRW",
        compensation_ref: compensationRef,
        compensation_unit: row.compensation_unit,
        compensation_quantity: row.compensation_quantity,
        withholding_category: row.withholding_category,
        deduction_input: row.deduction_input,
        custom_deductions: row.custom_deductions,
        notice_assessments: row.notice_assessments,
        effective_from: effectiveFrom,
        effective_to: row.effective_to,
        unused_leave_minutes: row.unused_leave_minutes,
        tenant_id: tenantId,
      });
    }).sort((left, right) => left.source_key.localeCompare(right.source_key));
  }

  function preview(context = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const rows = normalizedRows(context, input);
    const duplicateCount = rows.length - new Set(rows.map((row) => row.source_key)).size;
    const employees = new Set(store.query("select", { table: "hrx_employees", where: { tenant_id: tenantId } }).map((row) => row.employee_id));
    const existingProfiles = repository.listProfiles(context);
    const leaveBalances = new Map();
    for (const entry of store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })) {
      leaveBalances.set(entry.employee_id, (leaveBalances.get(entry.employee_id) ?? 0) + ledgerEffect(entry));
    }
    const errorCounts = { duplicate_source: duplicateCount, employee_missing: 0, profile_conflict: 0, leave_balance_variance: 0 };
    let createCount = 0;
    let preservedCount = 0;
    let absoluteVarianceMinutes = 0;
    for (const row of rows) {
      if (!employees.has(row.employee_id)) errorCounts.employee_missing += 1;
      const current = existingProfiles.find((profile) => profile.employee_id === row.employee_id && profile.effective_from === row.effective_from);
      if (!current) createCount += 1;
      else {
        const matches = ["employment_type", "pay_group_code", "currency", "compensation_ref", "effective_from"]
          .every((field) => current[field] === row[field]);
        if (matches) preservedCount += 1;
        else errorCounts.profile_conflict += 1;
      }
      const variance = (leaveBalances.get(row.employee_id) ?? 0) - row.unused_leave_minutes;
      if (variance !== 0) {
        errorCounts.leave_balance_variance += 1;
        absoluteVarianceMinutes += Math.abs(variance);
      }
    }
    const errorCount = Object.values(errorCounts).reduce((sum, value) => sum + value, 0);
    const receipt = Object.freeze({
      schema_version: "law-firm-os.hrx.payroll-profile-migration-preview.v0.1",
      tenant_id: tenantId,
      source_count: rows.length,
      create_count: createCount,
      preserved_count: preservedCount,
      error_count: errorCount,
      error_counts: Object.freeze(errorCounts),
      unexplained_leave_variance_minutes: absoluteVarianceMinutes,
      source_hash: hash(rows),
      target_hash: hash({ profiles: existingProfiles, leave_entries: store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } }) }),
      contains_private_rows: false,
    });
    return Object.freeze({ ...receipt, preview_hash: hash(receipt) });
  }

  function execute(context = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const current = preview(context, input);
    const approval = input.approval_manifest;
    if (
      current.error_count !== 0 ||
      approval?.schema_version !== PAYROLL_PROFILE_MIGRATION_APPROVAL_SCHEMA_VERSION ||
      approval.tenant_id !== tenantId ||
      approval.preview_hash !== current.preview_hash ||
      approval.decision !== "approved" ||
      typeof approval.approved_by_actor_id !== "string" || !approval.approved_by_actor_id.trim()
    ) throw guardedError("matching owner approval and a clean preview are required", "HRX_PAYROLL_MIGRATION_APPROVAL_REQUIRED");

    const before = store.snapshot();
    const beforeHash = hash(before);
    const backupRef = backupPort.save({ tenant_id: tenantId, preview_hash: current.preview_hash, state: before });
    try {
      const rows = normalizedRows(context, input);
      const existing = new Set(repository.listProfiles(context).map((row) => `${row.employee_id}:${row.effective_from}`));
      let createdCount = 0;
      for (const row of rows) {
        if (existing.has(`${row.employee_id}:${row.effective_from}`)) continue;
        repository.createProfile(context, row);
        createdCount += 1;
      }
      const afterHash = hash(store.snapshot());
      return Object.freeze({
        outcome: "migrated",
        preview_hash: current.preview_hash,
        created_count: createdCount,
        preserved_count: current.preserved_count,
        approved_by_actor_id: approval.approved_by_actor_id.trim(),
        completed_at: clock(),
        rollback_manifest: Object.freeze({ schema_version: "law-firm-os.hrx.payroll-profile-migration-rollback.v0.1", tenant_id: tenantId, preview_hash: current.preview_hash, backup_ref: backupRef, before_hash: beforeHash, after_hash: afterHash }),
        contains_private_rows: false,
      });
    } catch (error) {
      store.restoreSnapshot(before);
      throw error;
    }
  }

  function rollback(context = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const manifest = input.rollback_manifest;
    if (manifest?.tenant_id !== tenantId || manifest.schema_version !== "law-firm-os.hrx.payroll-profile-migration-rollback.v0.1" || hash(store.snapshot()) !== manifest.after_hash) {
      throw guardedError("matching rollback manifest is required", "HRX_PAYROLL_MIGRATION_ROLLBACK_STALE");
    }
    const backup = backupPort.read(manifest.backup_ref);
    if (!backup || hash(backup) !== manifest.before_hash) throw guardedError("payroll migration backup is unavailable", "HRX_PAYROLL_MIGRATION_BACKUP_UNAVAILABLE");
    store.restoreSnapshot(backup);
    return Object.freeze({ outcome: "rolled_back", preview_hash: manifest.preview_hash, restored_hash: hash(store.snapshot()), rolled_back_at: clock(), contains_private_rows: false });
  }

  return Object.freeze({ preview, execute, rollback });
}
