import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { calculateKoreanAnnualPaidLeaveEntitlement } from "../rules/leave-policy.js";
import { publicEmployeeDisplayName } from "../people-presentation.js";
import { planEarliestExpiryAllocations } from "./allocation.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";
import { createXlsxBuffer, parseXlsxBuffer } from "./xlsx-export.js";

const RULE_BASES = new Set(["korean_statutory_annual", "fixed_amount", "monthly_perfect_attendance", "tenure_table"]);
const RULE_SCHEDULES = new Set(["hire_anniversary", "fiscal_year", "monthly_perfect_attendance", "fixed_annual_date"]);
const MANUAL_DIRECTIONS = new Set(["credit", "debit"]);
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5_000;
export const LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION = "hrx-leave-occurrence-v1";
export const LEAVE_OCCURRENCE_UPLOAD_COLUMNS = Object.freeze([
  Object.freeze({ name: "employee_id", required: true, type: "string" }),
  Object.freeze({ name: "group_id", required: true, type: "string" }),
  Object.freeze({ name: "policy_version_id", required: true, type: "string" }),
  Object.freeze({ name: "direction", required: true, type: "enum", values: Object.freeze([...MANUAL_DIRECTIONS]) }),
  Object.freeze({ name: "amount_minutes", required: true, type: "integer", unit: "minute", minimum: 1 }),
  Object.freeze({ name: "valid_from", required: true, type: "date", format: "YYYY-MM-DD" }),
  Object.freeze({ name: "expires_on", required: false, type: "date", format: "YYYY-MM-DD" }),
  Object.freeze({ name: "memo", required: false, type: "string" }),
  Object.freeze({ name: "source_document_id", required: true, type: "string" }),
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim() || null;
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isoDate(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return normalized;
}

function monthsBetween(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

function addMonths(date, months) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function minuteOfDay(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function weeklyMinutes(profile) {
  try {
    const schedule = JSON.parse(profile.weekly_schedule_json ?? "{}");
    return Object.values(schedule).flat().reduce((total, period) => {
      const start = minuteOfDay(period?.start);
      const end = minuteOfDay(period?.end);
      return total + (start !== null && end !== null && end > start ? end - start : 0);
    }, 0);
  } catch {
    return 0;
  }
}

function currentRow(rows, occurredOn) {
  return rows
    .filter((row) => row.effective_from <= occurredOn && (!row.effective_to || row.effective_to >= occurredOn))
    .sort((left, right) => `${right.effective_from}:${right.profile_id ?? ""}`.localeCompare(`${left.effective_from}:${left.profile_id ?? ""}`))[0];
}

function attendanceMetrics(records, serviceMonths) {
  const latestByDate = new Map();
  for (const record of records.sort((left, right) => `${left.work_date}:${left.created_at ?? ""}`.localeCompare(`${right.work_date}:${right.created_at ?? ""}`))) {
    latestByDate.set(record.work_date, record);
  }
  const current = [...latestByDate.values()];
  const countable = current.filter((record) => !["holiday", "leave"].includes(record.status));
  const attended = countable.filter((record) => ["present", "remote"].includes(record.status)).length;
  const monthStatus = new Map();
  for (const record of current) {
    const month = record.work_date.slice(0, 7);
    const item = monthStatus.get(month) ?? { has_record: false, absent: false };
    item.has_record = true;
    item.absent ||= record.status === "absent";
    monthStatus.set(month, item);
  }
  const perfectMonths = [...monthStatus.entries()].filter(([, value]) => value.has_record && !value.absent).map(([month]) => month).sort();
  return Object.freeze({
    source_complete: countable.length > 0,
    yearly_attendance_rate: countable.length > 0 ? attended / countable.length : null,
    full_months_without_absence: Math.min(11, serviceMonths, perfectMonths.length),
    perfect_attendance_periods: Object.freeze(perfectMonths),
  });
}

export function createStoreLeaveAccrualSourceProvider({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave accrual source provider requires store.query");
  return Object.freeze({
    snapshot({ tenant_id, occurred_on }) {
      const tenantId = requiredString({ tenant_id }, "tenant_id");
      const occurredOn = isoDate(occurred_on, "occurred_on");
      const employees = store.query("select", { table: "hrx_employees", where: { tenant_id: tenantId } });
      const profiles = store.query("select", { table: "hrx_employment_profiles", where: { tenant_id: tenantId } });
      const attendance = store.query("select", { table: "hrx_attendance_records", where: { tenant_id: tenantId } });
      const assignments = store.query("select", { table: "hrx_work_schedule_assignments", where: { tenant_id: tenantId } });
      const schedules = store.query("select", { table: "hrx_work_schedule_profiles", where: { tenant_id: tenantId } });
      const rows = employees.map((employee) => {
        const employeeProfiles = profiles.filter((profile) => profile.employee_id === employee.employee_id);
        const profile = currentRow(employeeProfiles, occurredOn);
        const hireDate = employeeProfiles.map((item) => item.effective_from).sort()[0] ?? null;
        const serviceMonths = hireDate ? monthsBetween(hireDate, occurredOn) : 0;
        const assignment = assignments
          .filter((item) => item.employee_id === employee.employee_id && item.effective_from <= occurredOn && (!item.effective_to || item.effective_to >= occurredOn))
          .sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0))[0];
        const schedule = assignment && schedules.find((item) => item.schedule_profile_id === assignment.schedule_profile_id);
        const attendanceSource = attendanceMetrics(attendance.filter((item) => item.employee_id === employee.employee_id && item.work_date <= occurredOn), serviceMonths);
        const errors = [];
        if (!profile || !hireDate) errors.push("employment_profile_missing");
        if (!schedule) errors.push("work_schedule_missing");
        if (!attendanceSource.source_complete) errors.push("attendance_source_missing");
        return Object.freeze({
          employee_id: employee.employee_id,
          display_name: publicEmployeeDisplayName(employee),
          employee_status: employee.status,
          profile_status: profile?.status ?? null,
          employment_type: profile?.employment_type ?? null,
          hire_date: hireDate,
          service_months: serviceMonths,
          years_of_service: Math.floor(serviceMonths / 12),
          yearly_attendance_rate: attendanceSource.yearly_attendance_rate,
          full_months_without_absence: attendanceSource.full_months_without_absence,
          perfect_attendance_periods: attendanceSource.perfect_attendance_periods,
          weekly_work_ratio: schedule ? weeklyMinutes(schedule) / 2_400 : null,
          source_errors: Object.freeze(errors),
        });
      }).sort((left, right) => left.employee_id.localeCompare(right.employee_id));
      return Object.freeze({
        source_version: hash({ occurred_on: occurredOn, employees, profiles, attendance, assignments, schedules, rows }),
        rows: Object.freeze(rows),
      });
    },
  });
}

function parseRule(row) {
  let config;
  try {
    config = JSON.parse(row.rule_json ?? "{}");
  } catch {
    throw guardedError("Accrual rule JSON is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  if (!RULE_BASES.has(config.basis)) throw guardedError("Accrual rule basis is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  if (!RULE_SCHEDULES.has(config.schedule)) throw guardedError("Accrual rule schedule is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  const minutesPerDay = Number(config.minutes_per_day ?? 480);
  if (!Number.isInteger(minutesPerDay) || minutesPerDay <= 0) {
    throw guardedError("Accrual rule minutes_per_day is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  const validityMonths = Number(config.validity_months ?? config.expiration_months ?? 12);
  if (!Number.isInteger(validityMonths) || validityMonths <= 0 || validityMonths > 120) {
    throw guardedError("Accrual rule validity_months is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  for (const field of ["tenure_steps", "monthly_schedule", "annual_schedule"]) {
    if (config[field] !== undefined && !Array.isArray(config[field])) throw guardedError(`Accrual rule ${field} is invalid`, "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  let previousEnd = -1;
  for (const step of config.tenure_steps ?? []) {
    if (!Number.isInteger(step.from_month) || !Number.isInteger(step.to_month) || step.from_month < 0 || step.to_month < step.from_month || step.to_month > 120 || step.from_month <= previousEnd || !Number.isInteger(step.amount_minutes) || step.amount_minutes < 0) {
      throw guardedError("Accrual rule tenure_steps must be ordered, non-overlapping ranges through 120 months", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
    }
    previousEnd = step.to_month;
  }
  for (const item of config.monthly_schedule ?? []) {
    if (!Number.isInteger(item.service_month) || item.service_month < 1 || item.service_month > 120 || !Number.isInteger(item.amount_minutes) || item.amount_minutes < 0) throw guardedError("Accrual rule monthly_schedule is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  for (const item of config.annual_schedule ?? []) {
    if (!Number.isInteger(item.service_year) || item.service_year < 1 || item.service_year > 10 || !Number.isInteger(item.amount_minutes) || item.amount_minutes < 0) throw guardedError("Accrual rule annual_schedule is invalid", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  if (config.basis === "tenure_table" && !(config.tenure_steps?.length || config.monthly_schedule?.length || config.annual_schedule?.length)) {
    throw guardedError("Tenure table rule requires at least one schedule row", "HRX_LEAVE_ACCRUAL_RULE_INVALID");
  }
  return Object.freeze({ ...config, minutes_per_day: minutesPerDay, validity_months: validityMonths });
}

function tenureTableMinutes(config, serviceMonths) {
  const monthly = (config.monthly_schedule ?? []).find((item) => item.service_month === serviceMonths);
  if (monthly) return monthly.amount_minutes;
  const serviceYear = Math.floor(serviceMonths / 12);
  const annual = (config.annual_schedule ?? []).find((item) => item.service_year === serviceYear);
  if (annual) return annual.amount_minutes;
  return (config.tenure_steps ?? []).find((item) => serviceMonths >= item.from_month && serviceMonths <= item.to_month)?.amount_minutes ?? 0;
}

function scheduleMatches(config, employee, periodKey, occurredOn) {
  const monthDay = occurredOn.slice(5);
  if (config.schedule === "hire_anniversary") return Boolean(employee.hire_date && employee.hire_date.slice(5) === monthDay);
  if (config.schedule === "monthly_perfect_attendance") return /^\d{4}-\d{2}$/.test(periodKey);
  return monthDay === String(config.annual_date ?? config.fiscal_year_start ?? "01-01");
}

function previewEmployee({ employee, config, policy, periodKey, occurredOn }) {
  const base = { employee_id: employee.employee_id, display_name: publicEmployeeDisplayName(employee) };
  if (employee.employee_status === "terminated" || employee.employee_status === "inactive") {
    return Object.freeze({ ...base, status: "skipped", reason_code: "employee_inactive", amount_minutes: 0 });
  }
  if (employee.employee_status === "on_leave" || employee.profile_status === "on_leave") {
    return Object.freeze({ ...base, status: "skipped", reason_code: "leave_of_absence", amount_minutes: 0 });
  }
  const requiredErrors = (employee.source_errors ?? []).filter((error) => error !== "attendance_source_missing" || config.attendance_source_required !== false);
  if (requiredErrors.length > 0) {
    return Object.freeze({ ...base, status: "error", reason_code: requiredErrors[0], amount_minutes: 0 });
  }
  if (!scheduleMatches(config, employee, periodKey, occurredOn)) {
    return Object.freeze({ ...base, status: "skipped", reason_code: "outside_accrual_schedule", amount_minutes: 0 });
  }
  const ratio = config.prorate_reduced_schedule === false ? 1 : Number(employee.weekly_work_ratio);
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) {
    return Object.freeze({ ...base, status: "error", reason_code: "work_schedule_ratio_invalid", amount_minutes: 0 });
  }
  let amountMinutes = 0;
  if (config.basis === "korean_statutory_annual") {
    const days = calculateKoreanAnnualPaidLeaveEntitlement({
      service_months: employee.service_months,
      years_of_service: employee.years_of_service,
      yearly_attendance_rate: employee.yearly_attendance_rate,
      full_months_without_absence: employee.full_months_without_absence,
      statutory_max_days: config.statutory_max_days ?? 25,
    });
    amountMinutes = Math.round(days * config.minutes_per_day * ratio);
  } else if (config.basis === "monthly_perfect_attendance") {
    amountMinutes = employee.perfect_attendance_periods?.includes(periodKey) ? Math.round(Number(config.amount_minutes ?? config.minutes_per_day) * ratio) : 0;
  } else if (config.basis === "tenure_table") {
    amountMinutes = Math.round(tenureTableMinutes(config, employee.service_months) * ratio);
  } else {
    amountMinutes = Math.round(Number(config.amount_minutes ?? 0) * ratio);
  }
  if (!Number.isInteger(amountMinutes) || amountMinutes <= 0) {
    return Object.freeze({ ...base, status: "skipped", reason_code: "no_entitlement_for_period", amount_minutes: 0 });
  }
  return Object.freeze({
    ...base,
    status: "ready",
    reason_code: "eligible",
    amount_minutes: amountMinutes,
    group_id: policy.group_id,
    policy_version_id: policy.policy_version_id,
    valid_from: occurredOn,
    expires_on: addMonths(occurredOn, config.validity_months),
  });
}

function runResult({ rule, policy, source, periodKey, occurredOn }) {
  const config = parseRule(rule);
  const rows = source.rows.map((employee) => previewEmployee({ employee, config, policy, periodKey, occurredOn }));
  return Object.freeze({
    accrual_rule_id: rule.accrual_rule_id,
    rule_code: rule.rule_code,
    period_key: periodKey,
    occurred_on: occurredOn,
    source_version: source.source_version,
    rows: Object.freeze(rows),
    counts: Object.freeze({
      ready: rows.filter((row) => row.status === "ready").length,
      skipped: rows.filter((row) => row.status === "skipped").length,
      errors: rows.filter((row) => row.status === "error").length,
    }),
  });
}

function requireStepUp(context) {
  if (context?.step_up_verified !== true) {
    throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
  }
}

function runView(row) {
  return Object.freeze({ ...clone(row), result: Object.freeze(JSON.parse(row.result_json ?? "{}")) });
}

function rerunView(row) {
  const view = runView(row);
  const rows = (view.result.rows ?? []).map((item) => item.status === "created"
    ? Object.freeze({ ...item, status: "duplicate", reason_code: "already_accrued" })
    : item);
  return Object.freeze({
    ...view,
    replayed: true,
    result: Object.freeze({
      ...view.result,
      rows: Object.freeze(rows),
      counts: Object.freeze({
        ...view.result.counts,
        duplicates: Number(view.result.counts?.duplicates ?? 0) + Number(view.result.counts?.created ?? 0),
        created: 0,
        new_entries: 0,
      }),
    }),
  });
}

function csvCells(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new TypeError("CSV contains an unterminated quoted value");
  cells.push(cell.trim());
  return cells;
}

export function createLeaveOccurrenceUploadTemplate(format = "csv") {
  const normalizedFormat = String(format).toLowerCase();
  if (!new Set(["csv", "xlsx"]).has(normalizedFormat)) throw new TypeError("format must be csv or xlsx");
  const headers = LEAVE_OCCURRENCE_UPLOAD_COLUMNS.map((column) => column.name);
  const csvText = `\ufefftemplate_version,${LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION}\r\n${headers.join(",")}\r\n`;
  const buffer = normalizedFormat === "xlsx"
    ? createXlsxBuffer({ headers: ["template_version", LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION], rows: [headers], sheetName: "휴가 발생" })
    : Buffer.from(csvText, "utf8");
  return Object.freeze({
    template_version: LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION,
    format: normalizedFormat,
    file_name: `leave-occurrence-upload-${LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION}.${normalizedFormat}`,
    mime_type: normalizedFormat === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
    columns: LEAVE_OCCURRENCE_UPLOAD_COLUMNS,
    row_count: 0,
    content_base64: buffer.toString("base64"),
  });
}

function parseVersionedLeaveOccurrenceCsv(lines) {
  const metadata = csvCells(lines.shift());
  if (metadata.length !== 2 || metadata[0] !== "template_version") {
    throw new TypeError("CSV template_version metadata is required");
  }
  if (metadata[1] !== LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION) {
    throw guardedError("CSV template version is not supported", "HRX_LEAVE_OCCURRENCE_TEMPLATE_VERSION_UNSUPPORTED", 400);
  }
  if (lines.length === 0) throw new TypeError("CSV header row is required");
  const headers = csvCells(lines.shift()).map((header) => header.trim());
  const expected = LEAVE_OCCURRENCE_UPLOAD_COLUMNS.map((column) => column.name);
  if (new Set(headers).size !== headers.length) throw new TypeError("CSV headers must be unique");
  for (const header of expected) if (!headers.includes(header)) throw new TypeError(`CSV header is required: ${header}`);
  for (const header of headers) if (!expected.includes(header)) throw new TypeError(`CSV header is not supported: ${header}`);
  if (lines.length > MAX_IMPORT_ROWS) throw new TypeError(`CSV import exceeds ${MAX_IMPORT_ROWS} rows`);
  return Object.freeze(lines.map((line) => {
    const values = csvCells(line);
    if (values.length !== headers.length) throw new TypeError("CSV row column count does not match the template");
    return Object.freeze(Object.fromEntries(headers.map((header, index) => [header, header === "amount_minutes" ? Number(values[index]) : values[index] ?? ""])));
  }));
}

export function parseLeaveManualAdjustmentCsv(text) {
  if (typeof text !== "string" || text.trim() === "") throw new TypeError("CSV text is required");
  if (Buffer.byteLength(text, "utf8") > MAX_IMPORT_BYTES) throw new TypeError("CSV import size is invalid");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (csvCells(lines[0])[0] === "template_version") return parseVersionedLeaveOccurrenceCsv(lines);
  const headers = csvCells(lines.shift()).map((header) => header.trim());
  const required = ["employee_id", "group_id", "policy_version_id", "direction", "amount_minutes", "occurred_on", "reason", "source_document_id"];
  for (const header of required) if (!headers.includes(header)) throw new TypeError(`CSV header is required: ${header}`);
  if (lines.length > MAX_IMPORT_ROWS) throw new TypeError(`CSV import exceeds ${MAX_IMPORT_ROWS} rows`);
  return Object.freeze(lines.map((line) => {
    const values = csvCells(line);
    return Object.freeze(Object.fromEntries(headers.map((header, index) => [header, header === "amount_minutes" ? Number(values[index]) : values[index] ?? ""])));
  }));
}

function strictBase64Buffer(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("XLSX content_base64 is required");
  const normalized = value.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) throw new TypeError("XLSX content_base64 is invalid");
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMPORT_BYTES) throw new TypeError("XLSX import size is invalid");
  if (buffer.toString("base64").replace(/=+$/, "") !== normalized.replace(/=+$/, "")) throw new TypeError("XLSX content_base64 is invalid");
  return buffer;
}

function formulaBearing(value) {
  return typeof value === "string" && /^[=+@]/.test(value.trimStart());
}

export function parseLeaveManualAdjustmentXlsx(contentBase64) {
  const rows = parseXlsxBuffer(strictBase64Buffer(contentBase64));
  if (rows.length < 2) throw new TypeError("XLSX template_version and header rows are required");
  if (rows.length - 2 > MAX_IMPORT_ROWS) throw new TypeError(`XLSX import exceeds ${MAX_IMPORT_ROWS} rows`);
  const [metadata, headers, ...dataRows] = rows;
  if (metadata.length < 2 || metadata[0] !== "template_version" || metadata[1] !== LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION) {
    throw guardedError("XLSX template version is not supported", "HRX_LEAVE_OCCURRENCE_TEMPLATE_VERSION_UNSUPPORTED", 400);
  }
  const expected = LEAVE_OCCURRENCE_UPLOAD_COLUMNS.map((column) => column.name);
  if (new Set(headers).size !== headers.length) throw new TypeError("XLSX headers must be unique");
  for (const header of expected) if (!headers.includes(header)) throw new TypeError(`XLSX header is required: ${header}`);
  for (const header of headers) if (!expected.includes(header)) throw new TypeError(`XLSX header is not supported: ${header}`);
  return Object.freeze(dataRows.filter((row) => row.some((value) => String(value ?? "").trim())).map((values) => {
    if (values.some(formulaBearing)) throw new TypeError("XLSX formula-like values are not allowed");
    if (values.length > headers.length) throw new TypeError("XLSX row column count does not match the template");
    return Object.freeze(Object.fromEntries(headers.map((header, index) => [header, header === "amount_minutes" ? Number(values[index]) : String(values[index] ?? "").trim()])));
  }));
}

function validateManualRow(store, tenantId, row, index, { scheduleOnly = false, asOf } = {}) {
  const output = { row_number: index + 1, employee_id: row.employee_id ?? null, status: "ready" };
  try {
    const employeeId = requiredString(row, "employee_id");
    const groupId = requiredString(row, "group_id");
    const policyVersionId = requiredString(row, "policy_version_id");
    const direction = requiredString(row, "direction");
    const amountMinutes = Number(row.amount_minutes);
    const occurredOn = isoDate(row.valid_from ?? row.occurred_on, scheduleOnly ? "valid_from" : "occurred_on");
    const reason = requiredString({ reason: row.memo ?? row.reason }, "reason");
    const sourceDocumentId = requiredString(row, "source_document_id");
    if (!MANUAL_DIRECTIONS.has(direction)) throw new TypeError("direction must be credit or debit");
    if (scheduleOnly && direction !== "credit") throw new TypeError("scheduled occurrence direction must be credit");
    if (scheduleOnly && occurredOn <= asOf) throw new TypeError("scheduled occurrence valid_from must be in the future");
    if (!Number.isInteger(amountMinutes) || amountMinutes <= 0) throw new TypeError("amount_minutes must be a positive integer");
    const expiresOn = optionalString(row, "expires_on") ? isoDate(row.expires_on, "expires_on") : null;
    if (expiresOn && expiresOn < occurredOn) throw new TypeError("expires_on must be on or after valid_from");
    const employee = store.query("selectOne", { table: "hrx_employees", where: { tenant_id: tenantId, employee_id: employeeId } });
    const group = store.query("selectOne", { table: "hrx_leave_groups", where: { tenant_id: tenantId, group_id: groupId } });
    const policy = store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, policy_version_id: policyVersionId } });
    const document = store.query("selectOne", { table: "hrx_documents", where: { tenant_id: tenantId, document_id: sourceDocumentId } });
    if (!employee || employee.status === "terminated") throw new TypeError("employee is not eligible");
    if (!group || group.status !== "active") throw new TypeError("leave group is not active");
    if (!policy || policy.group_id !== groupId || policy.status !== "active") throw new TypeError("policy version is not active for the group");
    if (!document || document.employee_id !== employeeId || document.source_status !== "verified") throw new TypeError("verified employee source document is required");
    return Object.freeze({ ...output, employee_id: employeeId, group_id: groupId, policy_version_id: policyVersionId, policy_code: policy.policy_code, direction, amount_minutes: amountMinutes, occurred_on: occurredOn, expires_on: expiresOn, reason, source_document_id: sourceDocumentId });
  } catch (error) {
    return Object.freeze({ ...output, status: "error", error_code: "HRX_LEAVE_MANUAL_ROW_INVALID", error_message: error.message });
  }
}

function validateManualRows(store, tenantId, rows, options) {
  const seen = new Map();
  return Object.freeze(rows.map((row, index) => {
    const validated = validateManualRow(store, tenantId, row, index, options);
    if (validated.status !== "ready") return validated;
    const rowKey = hash({
      employee_id: validated.employee_id,
      group_id: validated.group_id,
      policy_version_id: validated.policy_version_id,
      direction: validated.direction,
      amount_minutes: validated.amount_minutes,
      occurred_on: validated.occurred_on,
      expires_on: validated.expires_on,
      reason: validated.reason,
      source_document_id: validated.source_document_id,
    });
    const duplicateOf = seen.get(rowKey);
    if (duplicateOf) {
      return Object.freeze({
        row_number: validated.row_number,
        employee_id: validated.employee_id,
        status: "error",
        error_code: "HRX_LEAVE_OCCURRENCE_DUPLICATE_ROW",
        error_message: `duplicate of row ${duplicateOf}`,
        duplicate_of_row_number: duplicateOf,
        row_key: rowKey,
      });
    }
    seen.set(rowKey, validated.row_number);
    return Object.freeze({ ...validated, row_key: rowKey });
  }));
}

function csvTemplateVersion(text) {
  if (typeof text !== "string") return null;
  const metadata = csvCells(text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]);
  return metadata[0] === "template_version" ? metadata[1] ?? null : null;
}

export function createLeaveAccrualService({ store, clock = () => new Date().toISOString(), idFactory = (prefix) => `${prefix}_${randomUUID()}`, sourceProvider, approverAuthorizer = () => false } = {}) {
  if (!store || typeof store.transaction !== "function" || typeof store.query !== "function") {
    throw new TypeError("leave accrual service requires a transactional store");
  }
  const sources = sourceProvider ?? createStoreLeaveAccrualSourceProvider({ store });

  function listRules(context) {
    const tenantId = requiredString(context, "tenant_id");
    return Object.freeze(store.query("select", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId } }).sort((left, right) => left.rule_code.localeCompare(right.rule_code)).map(clone));
  }

  function createRule(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const policyVersionId = requiredString(input, "policy_version_id");
    const policy = store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, policy_version_id: policyVersionId } });
    if (!policy || policy.status !== "active") throw guardedError("Active policy version not found", "HRX_LEAVE_POLICY_NOT_ACTIVE");
    const ruleCode = requiredString(input, "rule_code");
    const logicalRuleCode = input.logical_rule_code ? requiredString(input, "logical_rule_code") : ruleCode;
    const version = input.version ?? 1;
    if (!Number.isInteger(version) || version < 1) throw new TypeError("version must be a positive integer");
    const supersedesRuleId = input.supersedes_rule_id ? requiredString(input, "supersedes_rule_id") : null;
    if (supersedesRuleId) {
      const previous = store.query("selectOne", {
        table: "hrx_leave_accrual_rules",
        where: { tenant_id: tenantId, accrual_rule_id: supersedesRuleId },
      });
      if (!previous) throw guardedError("Superseded accrual rule not found", "HRX_LEAVE_ACCRUAL_SUPERSEDED_RULE_NOT_FOUND", 404);
      if ((previous.logical_rule_code ?? previous.rule_code) !== logicalRuleCode || (previous.version ?? 1) + 1 !== version) {
        throw guardedError("Accrual rule version lineage is invalid", "HRX_LEAVE_ACCRUAL_RULE_VERSION_INVALID");
      }
    } else if (version !== 1) {
      throw guardedError("Accrual rule version requires a predecessor", "HRX_LEAVE_ACCRUAL_RULE_VERSION_INVALID");
    }
    const duplicateVersion = store.query("select", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId } })
      .some((item) => (item.logical_rule_code ?? item.rule_code) === logicalRuleCode && Number(item.version ?? 1) === version);
    if (duplicateVersion) throw guardedError("Accrual rule version already exists", "HRX_LEAVE_ACCRUAL_RULE_VERSION_EXISTS");
    const row = {
      tenant_id: tenantId,
      accrual_rule_id: input.accrual_rule_id ?? idFactory("leave_accrual_rule"),
      rule_code: ruleCode,
      logical_rule_code: logicalRuleCode,
      version,
      supersedes_rule_id: supersedesRuleId,
      display_name: requiredString(input, "display_name"),
      policy_version_id: policyVersionId,
      rule_json: JSON.stringify(parseRule({ rule_json: JSON.stringify(input.rule ?? {}) })),
      status: input.status ?? "active",
      effective_from: isoDate(input.effective_from, "effective_from"),
      effective_to: input.effective_to ? isoDate(input.effective_to, "effective_to") : null,
      state_version: 1,
      created_at: clock(),
      updated_at: clock(),
    };
    return store.transaction((tx) => {
      const created = tx.query("insert", { table: "hrx_leave_accrual_rules", row });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_accrual_rule"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.accrual.rule.create", object_type: "LeaveAccrualRule", object_id: created.accrual_rule_id, decision: "allow", reason: "leave_accrual_rule_created", occurred_at: clock(), metadata: { policy_version_id: policyVersionId, logical_rule_code: logicalRuleCode, version, supersedes_rule_id: supersedesRuleId } });
      return Object.freeze(clone(created));
    });
  }

  function updateRule(context, accrualRuleId, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const current = store.query("selectOne", {
      table: "hrx_leave_accrual_rules",
      where: { tenant_id: tenantId, accrual_rule_id: requiredString({ accrual_rule_id: accrualRuleId }, "accrual_rule_id") },
    });
    if (!current) throw guardedError("Accrual rule not found", "HRX_LEAVE_ACCRUAL_RULE_NOT_FOUND", 404);
    return createRule(context, {
      accrual_rule_id: input.accrual_rule_id,
      rule_code: input.rule_code ?? `${current.logical_rule_code ?? current.rule_code}_V${Number(current.version ?? 1) + 1}`,
      logical_rule_code: current.logical_rule_code ?? current.rule_code,
      version: Number(current.version ?? 1) + 1,
      supersedes_rule_id: current.accrual_rule_id,
      display_name: input.display_name ?? current.display_name,
      policy_version_id: input.policy_version_id ?? current.policy_version_id,
      effective_from: input.effective_from,
      effective_to: input.effective_to ?? null,
      rule: input.rule ?? JSON.parse(current.rule_json),
      status: input.status ?? "active",
    });
  }

  function deactivateRule(context, accrualRuleId, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const current = store.query("selectOne", {
      table: "hrx_leave_accrual_rules",
      where: { tenant_id: tenantId, accrual_rule_id: requiredString({ accrual_rule_id: accrualRuleId }, "accrual_rule_id") },
    });
    if (!current) throw guardedError("Accrual rule not found", "HRX_LEAVE_ACCRUAL_RULE_NOT_FOUND", 404);
    if (current.status === "inactive") return Object.freeze(clone(current));
    const expectedVersion = input.expected_version ?? current.state_version;
    return store.transaction((tx) => {
      const deactivated = tx.query("updateOne", {
        table: "hrx_leave_accrual_rules",
        where: { tenant_id: tenantId, accrual_rule_id: current.accrual_rule_id },
        expected_version: expectedVersion,
        patch: {
          status: "inactive",
          effective_to: input.effective_to ? isoDate(input.effective_to, "effective_to") : current.effective_to,
          state_version: current.state_version + 1,
          updated_at: clock(),
        },
      });
      createSqlHrxAuditEventStore({ store: tx }).append({
        event_id: idFactory("leave_audit_accrual_rule"),
        tenant_id: tenantId,
        actor_id: actorId,
        action: "hrx.leave.accrual.rule.deactivate",
        object_type: "LeaveAccrualRule",
        object_id: current.accrual_rule_id,
        decision: "allow",
        reason: "leave_accrual_rule_deactivated",
        occurred_at: clock(),
        metadata: { logical_rule_code: current.logical_rule_code ?? current.rule_code, version: current.version ?? 1 },
      });
      return Object.freeze(clone(deactivated));
    });
  }

  function preview(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const ruleId = requiredString(input, "accrual_rule_id");
    const periodKey = requiredString(input, "period_key");
    const occurredOn = isoDate(input.occurred_on, "occurred_on");
    const asOfDate = input.as_of_date ? isoDate(input.as_of_date, "as_of_date") : occurredOn;
    const rule = store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId, accrual_rule_id: ruleId } });
    if (!rule || rule.status !== "active" || rule.effective_from > occurredOn || rule.effective_to && rule.effective_to < occurredOn) {
      throw guardedError("Active accrual rule not found for date", "HRX_LEAVE_ACCRUAL_RULE_NOT_ACTIVE", 404);
    }
    const policy = store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, policy_version_id: rule.policy_version_id } });
    if (!policy) throw guardedError("Accrual policy not found", "HRX_LEAVE_POLICY_NOT_FOUND", 404);
    const source = sources.snapshot({ tenant_id: tenantId, occurred_on: asOfDate, period_key: periodKey });
    const result = runResult({ rule, policy, source, periodKey, occurredOn });
    const snapshotHash = hash({ rule, policy, source_version: source.source_version, as_of_date: asOfDate, result });
    const inputHash = hash({ rule_id: ruleId, period_key: periodKey, occurred_on: occurredOn, as_of_date: asOfDate });
    const idempotencyKey = `accrual-preview:${ruleId}:${periodKey}:${asOfDate}:${source.source_version}`;
    const existing = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) return runView(existing);
    const now = clock();
    const row = {
      tenant_id: tenantId,
      accrual_run_id: idFactory("leave_accrual_preview"),
      accrual_rule_id: ruleId,
      mode: "preview",
      period_key: periodKey,
      occurred_on: occurredOn,
      as_of_date: asOfDate,
      source_version: source.source_version,
      input_hash: inputHash,
      snapshot_hash: snapshotHash,
      preview_run_id: null,
      idempotency_key: idempotencyKey,
      status: result.counts.errors > 0 ? "completed_with_errors" : "completed",
      result_json: JSON.stringify(result),
      executed_by: actorId,
      created_at: now,
      completed_at: now,
    };
    return runView(store.query("insert", { table: "hrx_leave_accrual_runs", row }));
  }

  function currentPreviewState(tenantId, previewRun) {
    const rule = store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: tenantId, accrual_rule_id: previewRun.accrual_rule_id } });
    const policy = rule && store.query("selectOne", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, policy_version_id: rule.policy_version_id } });
    if (!rule || !policy) throw guardedError("Accrual source rule no longer exists", "HRX_LEAVE_ACCRUAL_SOURCE_CHANGED");
    const asOfDate = previewRun.as_of_date ?? previewRun.occurred_on;
    const source = sources.snapshot({ tenant_id: tenantId, occurred_on: asOfDate, period_key: previewRun.period_key });
    const current = runResult({ rule, policy, source, periodKey: previewRun.period_key, occurredOn: previewRun.occurred_on });
    const currentHash = hash({ rule, policy, source_version: source.source_version, as_of_date: asOfDate, result: current });
    return Object.freeze({ rule, policy, source, current, current_hash: currentHash, is_current: source.source_version === previewRun.source_version && currentHash === previewRun.snapshot_hash });
  }

  function validatePreview(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const previewRunId = requiredString(input, "preview_run_id");
    const previewRun = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: tenantId, accrual_run_id: previewRunId } });
    if (!previewRun || previewRun.mode !== "preview") throw guardedError("Accrual preview not found", "HRX_LEAVE_ACCRUAL_PREVIEW_NOT_FOUND", 404);
    const state = currentPreviewState(tenantId, previewRun);
    return Object.freeze({
      preview_run_id: previewRunId,
      period_key: previewRun.period_key,
      is_current: state.is_current,
      preview_source_version: previewRun.source_version,
      current_source_version: state.source.source_version,
      preview_snapshot_hash: previewRun.snapshot_hash,
      current_snapshot_hash: state.current_hash,
    });
  }

  function execute(context, input) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const previewRunId = requiredString(input, "preview_run_id");
    const previewRun = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: tenantId, accrual_run_id: previewRunId } });
    if (!previewRun || previewRun.mode !== "preview") throw guardedError("Accrual preview not found", "HRX_LEAVE_ACCRUAL_PREVIEW_NOT_FOUND", 404);
    const replayKey = `accrual-execute:${previewRunId}`;
    const replay = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: tenantId, idempotency_key: replayKey } });
    if (replay) return rerunView(replay);
    const state = currentPreviewState(tenantId, previewRun);
    if (!state.is_current) {
      throw guardedError("Accrual source changed after preview", "HRX_LEAVE_ACCRUAL_PREVIEW_STALE");
    }
    const { rule, policy, source, current } = state;
    const now = clock();
    return store.transaction((tx) => {
      const rows = current.rows.map((row) => {
        if (row.status !== "ready") return row;
        const idempotencyKey = `accrual:${rule.accrual_rule_id}:${row.employee_id}:${previewRun.period_key}`;
        const existing = tx.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
        if (existing) return Object.freeze({ ...row, status: "duplicate", reason_code: "already_accrued", entitlement_id: existing.entitlement_id });
        const entitlementId = idFactory("leave_entitlement");
        tx.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: tenantId, entitlement_id: entitlementId, employee_id: row.employee_id, group_id: row.group_id, policy_version_id: row.policy_version_id, granted_minutes: row.amount_minutes, valid_from: row.valid_from, expires_on: row.expires_on, source_ref: `LeaveAccrualRun:${previewRunId}`, idempotency_key: idempotencyKey, state_version: 1, created_at: now } });
        createSqlLeaveBalanceLedger({ store: tx }).append({ tenant_id: tenantId, entry_id: idFactory("leave_ledger_earned"), employee_id: row.employee_id, policy_id: policy.policy_code, group_id: row.group_id, policy_version_id: row.policy_version_id, entitlement_id: entitlementId, idempotency_key: `${idempotencyKey}:earned`, entry_type: "earned", amount_minutes: row.amount_minutes, occurred_on: previewRun.occurred_on, source_ref: `LeaveAccrualRun:${previewRunId}`, metadata: { accrual_rule_id: rule.accrual_rule_id, period_key: previewRun.period_key } });
        return Object.freeze({ ...row, status: "created", reason_code: "accrued", entitlement_id: entitlementId });
      });
      const result = Object.freeze({ ...current, rows: Object.freeze(rows), counts: Object.freeze({ created: rows.filter((row) => row.status === "created").length, duplicates: rows.filter((row) => row.status === "duplicate").length, skipped: rows.filter((row) => row.status === "skipped").length, errors: rows.filter((row) => row.status === "error").length, new_entries: rows.filter((row) => row.status === "created").length }) });
      const run = tx.query("insert", { table: "hrx_leave_accrual_runs", row: { tenant_id: tenantId, accrual_run_id: idFactory("leave_accrual_execute"), accrual_rule_id: rule.accrual_rule_id, mode: "execute", period_key: previewRun.period_key, occurred_on: previewRun.occurred_on, as_of_date: previewRun.as_of_date ?? previewRun.occurred_on, source_version: source.source_version, input_hash: previewRun.input_hash, snapshot_hash: previewRun.snapshot_hash, preview_run_id: previewRunId, idempotency_key: replayKey, status: result.counts.errors > 0 ? "completed_with_errors" : "completed", result_json: JSON.stringify(result), executed_by: actorId, created_at: now, completed_at: now } });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_accrual_execute"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.accrual.execute", object_type: "LeaveAccrualRun", object_id: run.accrual_run_id, decision: "allow", reason: "leave_accrual_executed_from_matching_preview", occurred_at: now, metadata: { preview_run_id: previewRunId, created_count: result.counts.created, duplicate_count: result.counts.duplicates, error_count: result.counts.errors } });
      return runView(run);
    });
  }

  function prepareManualUpload(context, input) {
    const tenantId = requiredString(context, "tenant_id");
    const scheduleOnly = input.schedule_only === true;
    const asOf = input.as_of ? isoDate(input.as_of, "as_of") : clock().slice(0, 10);
    const csvText = input.csv_text ?? null;
    const xlsxContentBase64 = input.xlsx_content_base64 ?? (input.format === "xlsx" ? input.content_base64 : null);
    const xlsxBuffer = xlsxContentBase64 ? strictBase64Buffer(xlsxContentBase64) : null;
    const sourceRows = csvText ? parseLeaveManualAdjustmentCsv(csvText) : xlsxContentBase64 ? parseLeaveManualAdjustmentXlsx(xlsxContentBase64) : input.rows ?? [];
    const rows = validateManualRows(store, tenantId, sourceRows, { scheduleOnly, asOf });
    return Object.freeze({
      snapshot_hash: hash(rows),
      file_hash: csvText ? contentHash(csvText) : xlsxBuffer ? contentHash(xlsxBuffer) : null,
      template_version: csvText ? csvTemplateVersion(csvText) : xlsxBuffer ? LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION : null,
      schedule_only: scheduleOnly,
      as_of: asOf,
      rows,
      counts: Object.freeze({
        ready: rows.filter((row) => row.status === "ready").length,
        errors: rows.filter((row) => row.status === "error").length,
        duplicates: rows.filter((row) => row.error_code === "HRX_LEAVE_OCCURRENCE_DUPLICATE_ROW").length,
      }),
    });
  }

  function previewManual(context, input) {
    const prepared = prepareManualUpload(context, input);
    const approvalReceipt = store.query("selectOne", {
      table: "hrx_leave_command_receipts",
      where: { tenant_id: requiredString(context, "tenant_id"), idempotency_key: `leave-manual-approval:manual_adjustment:${prepared.snapshot_hash}` },
    });
    const approval = approvalReceipt?.command_type === "leave_manual_approval" ? JSON.parse(approvalReceipt.result_json) : null;
    return Object.freeze({
      ...prepared,
      approval_receipt_id: approval?.snapshot_hash === prepared.snapshot_hash ? approvalReceipt.command_receipt_id : null,
      approved_by_actor_id: approval?.snapshot_hash === prepared.snapshot_hash ? approval.approved_by_actor_id : null,
      rows: Object.freeze(prepared.rows.map(({ reason, source_document_id, ...row }) => Object.freeze(row))),
    });
  }

  function recordManualApproval(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const approvalKind = requiredString(input, "approval_kind");
    const objectId = requiredString(input, "object_id");
    const snapshotHash = requiredString(input, "snapshot_hash");
    const initiatedByActorId = typeof input.initiated_by_actor_id === "string" ? input.initiated_by_actor_id.trim() : "";
    if (initiatedByActorId && initiatedByActorId === actorId) throw guardedError("Manual adjustment requires a different approver", "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED", 403);
    if (!approverAuthorizer({ tenant_id: tenantId, actor_id: actorId, required_scope: "hrx.leave.ledger.adjust" })) {
      throw guardedError("Manual adjustment approver is not authorized", "HRX_LEAVE_MANUAL_APPROVER_DENIED", 403);
    }
    const idempotencyKey = `leave-manual-approval:${approvalKind}:${objectId}`;
    const inputHash = hash({ approval_kind: approvalKind, object_id: objectId, snapshot_hash: snapshotHash, initiated_by_actor_id: initiatedByActorId || null, approved_by_actor_id: actorId });
    const existing = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) {
      if (existing.command_type !== "leave_manual_approval" || existing.input_hash !== inputHash) {
        throw guardedError("Manual adjustment already has a different approval decision", "HRX_LEAVE_MANUAL_APPROVAL_CONFLICT");
      }
      return Object.freeze({ approval_receipt_id: existing.command_receipt_id, ...JSON.parse(existing.result_json) });
    }
    const now = clock();
    return store.transaction((tx) => {
      const result = Object.freeze({
        approval_kind: approvalKind,
        object_id: objectId,
        snapshot_hash: snapshotHash,
        initiated_by_actor_id: initiatedByActorId || null,
        approved_by_actor_id: actorId,
        approved_at: now,
      });
      const receipt = tx.query("insert", { table: "hrx_leave_command_receipts", row: {
        tenant_id: tenantId,
        command_receipt_id: idFactory("leave_manual_approval"),
        idempotency_key: idempotencyKey,
        command_type: "leave_manual_approval",
        request_id: null,
        input_hash: inputHash,
        result_json: JSON.stringify(result),
        created_at: now,
      } });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_manual_approval"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.ledger.adjust.approve", object_type: "LeaveAdjustmentApproval", object_id: objectId, decision: "allow", reason: "independent_manual_leave_adjustment_approved", occurred_at: now, metadata: { approval_receipt_id: receipt.command_receipt_id, approval_kind: approvalKind, snapshot_hash: snapshotHash } });
      return Object.freeze({ approval_receipt_id: receipt.command_receipt_id, ...result });
    });
  }

  function assertManualApprovalReceipt(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const approvalReceiptId = requiredString(input, "approval_receipt_id");
    const receipt = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: tenantId, command_receipt_id: approvalReceiptId } });
    if (!receipt || receipt.command_type !== "leave_manual_approval") throw guardedError("Manual adjustment approval receipt not found", "HRX_LEAVE_MANUAL_APPROVAL_REQUIRED", 403);
    const result = JSON.parse(receipt.result_json);
    const approverActorId = requiredString(result, "approved_by_actor_id");
    if (approverActorId === actorId) throw guardedError("Manual adjustment requires a different approver", "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED", 403);
    if (!approverAuthorizer({ tenant_id: tenantId, actor_id: approverActorId, required_scope: "hrx.leave.ledger.adjust" })) {
      throw guardedError("Manual adjustment approver is not authorized", "HRX_LEAVE_MANUAL_APPROVER_DENIED", 403);
    }
    if (result.approval_kind !== requiredString(input, "approval_kind")
      || result.object_id !== requiredString(input, "object_id")
      || result.snapshot_hash !== requiredString(input, "snapshot_hash")) {
      throw guardedError("Manual adjustment approval receipt does not match the approved snapshot", "HRX_LEAVE_MANUAL_APPROVAL_MISMATCH", 403);
    }
    return Object.freeze({ tenant_id: tenantId, actor_id: actorId, approved_by_actor_id: approverActorId, approval_receipt_id: approvalReceiptId, approval_kind: result.approval_kind, object_id: result.object_id, snapshot_hash: result.snapshot_hash });
  }

  function approveManual(context, input = {}) {
    const prepared = prepareManualUpload(context, input);
    return recordManualApproval(context, { approval_kind: "manual_adjustment", object_id: prepared.snapshot_hash, snapshot_hash: prepared.snapshot_hash });
  }

  function executeManual(context, input = {}) {
    const prepared = prepareManualUpload(context, input);
    const approval = assertManualApprovalReceipt(context, { approval_receipt_id: input.approval_receipt_id, approval_kind: "manual_adjustment", object_id: prepared.snapshot_hash, snapshot_hash: prepared.snapshot_hash });
    return executePreparedManual(context, input, prepared, approval);
  }

  function executeApprovedUploadRow(context, input = {}) {
    const prepared = prepareManualUpload(context, { rows: [input.row], schedule_only: input.schedule_only, as_of: input.as_of });
    const approval = assertManualApprovalReceipt(context, { approval_receipt_id: input.approval_receipt_id, approval_kind: "occurrence_upload", object_id: input.upload_batch_id, snapshot_hash: input.preview_hash });
    return executePreparedManual(context, input, prepared, approval);
  }

  function executePreparedManual(context, input, prepared, approval) {
    const tenantId = approval.tenant_id;
    const actorId = approval.actor_id;
    const approverActorId = approval.approved_by_actor_id;
    const idempotencyKey = requiredString(input, "idempotency_key");
    const scheduleOnly = prepared.schedule_only;
    const asOf = prepared.as_of;
    const validated = prepared.rows;
    const inputHash = hash({ approval_receipt_id: approval.approval_receipt_id, approval_kind: approval.approval_kind, approval_object_id: approval.object_id, rows: validated, ...(scheduleOnly ? { schedule_only: true } : {}) });
    const replay = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (replay) {
      if (replay.input_hash !== inputHash) throw guardedError("Idempotency key was reused with different input", "HRX_LEAVE_IDEMPOTENCY_KEY_REUSED");
      return Object.freeze(JSON.parse(replay.result_json));
    }
    const now = clock();
    return store.transaction((tx) => {
      const ledger = createSqlLeaveBalanceLedger({ store: tx });
      const rows = validated.map((row) => {
        if (row.status !== "ready") return row;
        try {
          if (row.direction === "credit") {
            const entitlementId = idFactory("leave_entitlement_adjustment");
            tx.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: tenantId, entitlement_id: entitlementId, employee_id: row.employee_id, group_id: row.group_id, policy_version_id: row.policy_version_id, granted_minutes: row.amount_minutes, valid_from: row.occurred_on, expires_on: row.expires_on, memo: row.reason, source_document_id: row.source_document_id, approved_by_actor_id: approverActorId, source_ref: `HRDocument:${row.source_document_id}`, idempotency_key: `${idempotencyKey}:${row.row_number}:entitlement`, state_version: 1, created_at: now } });
            ledger.append({ tenant_id: tenantId, entry_id: idFactory("leave_ledger_adjustment"), employee_id: row.employee_id, policy_id: row.policy_code, group_id: row.group_id, policy_version_id: row.policy_version_id, entitlement_id: entitlementId, idempotency_key: `${idempotencyKey}:${row.row_number}:credit`, entry_type: "adjustment", adjustment_direction: "credit", amount_minutes: row.amount_minutes, occurred_on: row.occurred_on, source_ref: `HRDocument:${row.source_document_id}`, metadata: { approved_by_actor_id: approverActorId, reason_code: "documented_manual_adjustment" } });
            return Object.freeze({ row_number: row.row_number, employee_id: row.employee_id, status: "created", direction: row.direction, amount_minutes: row.amount_minutes, entitlement_id: entitlementId, valid_from: row.occurred_on, expires_on: row.expires_on, lifecycle_state: row.occurred_on > asOf ? "scheduled" : "active" });
          } else {
            const entitlements = tx.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: row.employee_id, group_id: row.group_id } });
            const allocations = planEarliestExpiryAllocations({ entitlements, ledger_entries: ledger.list({ tenant_id: tenantId, employee_id: row.employee_id, group_id: row.group_id }), requested_minutes: row.amount_minutes, on_date: row.occurred_on });
            allocations.forEach((allocation, allocationIndex) => ledger.append({ tenant_id: tenantId, entry_id: idFactory("leave_ledger_adjustment"), employee_id: row.employee_id, policy_id: row.policy_code, group_id: row.group_id, policy_version_id: row.policy_version_id, entitlement_id: allocation.entitlement_id, idempotency_key: `${idempotencyKey}:${row.row_number}:debit:${allocationIndex + 1}`, entry_type: "adjustment", adjustment_direction: "debit", amount_minutes: allocation.amount_minutes, occurred_on: row.occurred_on, source_ref: `HRDocument:${row.source_document_id}`, metadata: { approved_by_actor_id: approverActorId, reason_code: "documented_manual_adjustment" } }));
          }
          return Object.freeze({ row_number: row.row_number, employee_id: row.employee_id, status: "created", direction: row.direction, amount_minutes: row.amount_minutes });
        } catch (error) {
          return Object.freeze({ row_number: row.row_number, employee_id: row.employee_id, status: "error", error_code: error.safe_error_code ?? "HRX_LEAVE_MANUAL_ROW_EXECUTION_FAILED", error_message: error.message });
        }
      });
      const result = Object.freeze({ rows: Object.freeze(rows), counts: Object.freeze({ created: rows.filter((row) => row.status === "created").length, errors: rows.filter((row) => row.status === "error").length }) });
      tx.query("insert", { table: "hrx_leave_command_receipts", row: { tenant_id: tenantId, command_receipt_id: idFactory("leave_receipt_manual_adjustment"), idempotency_key: idempotencyKey, command_type: "manual_leave_adjustment", request_id: null, input_hash: inputHash, result_json: JSON.stringify(result), created_at: now } });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_manual_adjustment"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.ledger.adjust", object_type: "LeaveAdjustmentBatch", object_id: idempotencyKey, decision: "allow", reason: "dual_control_manual_leave_adjustment", occurred_at: now, metadata: { approved_by_actor_id: approverActorId, approval_receipt_id: approval.approval_receipt_id, approval_kind: approval.approval_kind, created_count: result.counts.created, error_count: result.counts.errors } });
      return result;
    });
  }

  return Object.freeze({ listRules, createRule, updateRule, deactivateRule, preview, validatePreview, execute, manualTemplate: createLeaveOccurrenceUploadTemplate, prepareManualUpload, recordManualApproval, assertManualApprovalReceipt, approveManual, previewManual, executeManual, executeApprovedUploadRow });
}
