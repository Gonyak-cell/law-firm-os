const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTHLY_REPORT_LIMIT = 12;
const RANKING_REPORT_LIMIT = 10;
const CLIENT_FIXED_REPORTS_CONTRACT_VERSION = "client-fixed-reports.v1";
const CLIENT_FIXED_REPORT_SNAPSHOT_VERSION = 1;
const CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES = 16 * 1024;
const FIXED_SCREEN_SOURCE_STATUSES = new Set([
  "available",
  "no_data",
  "partial",
]);

const INQUIRY_STATUS_ROWS = Object.freeze([
  Object.freeze({ code: "new", label: "새 문의" }),
  Object.freeze({ code: "reviewing", label: "확인 중" }),
  Object.freeze({ code: "consultation_scheduled", label: "상담 예정" }),
  Object.freeze({ code: "engagement_review", label: "수임 검토 중" }),
  Object.freeze({ code: "engaged", label: "수임 확정" }),
  Object.freeze({ code: "not_engaged", label: "수임하지 않음" }),
]);

const REPORT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "monthly_deposit_revenue",
    title: "월별 입금 매출",
    section: "monthly_deposit_revenue",
    kind: "monthly",
    columns: Object.freeze([
      Object.freeze({ key: "month", label: "월" }),
      Object.freeze({ key: "amount", label: "입금 매출" }),
    ]),
  }),
  Object.freeze({
    id: "inquiry_status",
    title: "문의 현황",
    section: "inquiry_status",
    kind: "inquiry",
    columns: Object.freeze([
      Object.freeze({ key: "label", label: "문의 상태" }),
      Object.freeze({ key: "count", label: "문의 건수" }),
    ]),
  }),
  Object.freeze({
    id: "revenue_ranking",
    title: "입금 매출 상위 고객",
    section: "revenue_ranking",
    kind: "ranking_revenue",
    columns: Object.freeze([
      Object.freeze({ key: "rank", label: "순위" }),
      Object.freeze({ key: "displayName", label: "고객명" }),
      Object.freeze({ key: "amount", label: "입금 매출" }),
      Object.freeze({ key: "latestDepositAt", label: "최근 입금일" }),
    ]),
  }),
  Object.freeze({
    id: "receivables_ranking",
    title: "미수금 상위 고객",
    section: "receivables_ranking",
    kind: "ranking_receivables",
    columns: Object.freeze([
      Object.freeze({ key: "rank", label: "순위" }),
      Object.freeze({ key: "displayName", label: "고객명" }),
      Object.freeze({ key: "amount", label: "미수금" }),
      Object.freeze({ key: "earliestDueDate", label: "납부기한" }),
    ]),
  }),
]);

const FIXED_SCREEN_COLUMNS = Object.freeze({
  monthly_deposit_revenue: Object.freeze([
    Object.freeze({ key: "month", label: "월" }),
    Object.freeze({ key: "net_deposit_revenue", label: "입금 매출" }),
  ]),
  inquiry_status: Object.freeze([
    Object.freeze({ key: "status", label: "상태" }),
    Object.freeze({ key: "count", label: "건수" }),
  ]),
  revenue_ranking: Object.freeze([
    Object.freeze({ key: "rank", label: "순위" }),
    Object.freeze({ key: "client_name", label: "고객" }),
    Object.freeze({ key: "matched_inflow_amount", label: "연결 입금" }),
    Object.freeze({ key: "linked_refund_amount", label: "환불" }),
    Object.freeze({ key: "net_deposit_revenue", label: "입금 매출" }),
    Object.freeze({ key: "latest_deposit_date", label: "최근 입금일" }),
  ]),
  receivables_ranking: Object.freeze([
    Object.freeze({ key: "rank", label: "순위" }),
    Object.freeze({ key: "client_name", label: "고객" }),
    Object.freeze({ key: "agreed_amount", label: "약정 수임료" }),
    Object.freeze({ key: "active_allocated_amount", label: "반영 입금" }),
    Object.freeze({ key: "receivable_amount", label: "미수금" }),
    Object.freeze({ key: "earliest_due_date", label: "가장 이른 지급기한" }),
  ]),
});

function hasOwn(value, key) {
  return value !== null
    && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, key);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeInteger(value) {
  return Number.isSafeInteger(value);
}

function field(value, camel, snake) {
  if (hasOwn(value, camel)) return value[camel];
  if (hasOwn(value, snake)) return value[snake];
  return undefined;
}

function firstPresent(value, keys) {
  for (const key of keys) {
    if (hasOwn(value, key)) return value[key];
  }
  return undefined;
}

function firstDefinedPresent(value, keys) {
  for (const key of keys) {
    if (hasOwn(value, key) && value[key] !== null && value[key] !== undefined) {
      return value[key];
    }
  }
  return undefined;
}

function resultUiState(result) {
  const uiState = field(result, "uiState", "ui_state");
  const outcome = field(result, "outcome", "outcome");
  if (["loading", "pending"].includes(uiState)
      || ["loading", "pending"].includes(outcome)) {
    return "loading";
  }
  if (["denied", "permission_denied"].includes(uiState)
      || ["denied", "permission_denied"].includes(outcome)) {
    return "denied";
  }
  if (["review", "review_required"].includes(uiState)
      || outcome === "review_required") {
    return "review_required";
  }
  if (["partial"].includes(uiState) || outcome === "partial") {
    return "partial";
  }
  if (["empty", "no_data"].includes(uiState)
      || ["empty", "no_data"].includes(outcome)) {
    return "empty";
  }
  if (["error", "failed"].includes(uiState)
      || ["error", "failed"].includes(outcome)) {
    return "error";
  }
  return null;
}

function rootState(result) {
  if (result === null || result === undefined || result.kind === "loading") {
    return "loading";
  }
  if (result.kind === "guarded") {
    return result.uiState === "review_required"
      ? "review_required"
      : "denied";
  }
  if (result.kind === "error") return "error";
  if (result.kind === "empty") return "empty";
  if (["denied", "permission_denied"].includes(result.kind)) return "denied";
  if (["review", "review_required"].includes(result.kind)) return "review_required";
  if (result.kind === "partial") return "partial";

  const uiState = resultUiState(result);
  if (uiState) return uiState;
  if (result.kind === "data") return "data";
  return "error";
}

function authorizationBoundary(result) {
  const permissionPrefilter = field(
    result,
    "permissionPrefilterApplied",
    "permission_prefilter_applied",
  );
  if (permissionPrefilter !== true) return "denied";

  const countLeakPrevented = field(
    result,
    "countLeakPrevented",
    "count_leak_prevented",
  );
  if (countLeakPrevented !== true) return "error";

  for (const [camel, snake] of [
    ["rawBankSourceIncluded", "raw_bank_source_included"],
    ["rawSourcePayloadIncluded", "raw_source_payload_included"],
    ["credentialMaterialIncluded", "credential_material_included"],
  ]) {
    if (field(result, camel, snake) === true) return "error";
  }
  return null;
}

function sectionState(section, globalState, result) {
  if (["loading", "denied", "review_required", "error", "empty"].includes(globalState)) {
    return globalState;
  }
  const boundaryState = authorizationBoundary(result);
  if (boundaryState) return boundaryState;
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return "error";
  }
  const sectionPermission = field(
    section,
    "permissionPrefilterApplied",
    "permission_prefilter_applied",
  );
  if (sectionPermission !== undefined && sectionPermission !== true) {
    return "denied";
  }
  const sectionCountLeak = field(section, "countLeakPrevented", "count_leak_prevented");
  if (sectionCountLeak !== undefined && sectionCountLeak !== true) {
    return "error";
  }
  const status = text(field(section, "status", "status"));
  if (status === "available") return "data";
  if (status === "partial") return "partial";
  if (["permission_denied", "denied"].includes(status)) return "denied";
  if (["no_data", "empty"].includes(status)) return "empty";
  if (status === "error") return "error";
  return "error";
}

function sectionData(section) {
  if (!section || typeof section !== "object" || Array.isArray(section)) return null;
  const data = section.data ?? section;
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
}

function sourceRows(data, preferredKey, fallbackKey) {
  if (hasOwn(data, preferredKey)) {
    return Array.isArray(data[preferredKey]) ? data[preferredKey] : null;
  }
  const rows = data?.[fallbackKey];
  return Array.isArray(rows) ? rows : null;
}

function rowAuthorization(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return "invalid";
  for (const key of ["authorized", "permission_allowed", "permissionAllowed"]) {
    if (hasOwn(item, key) && item[key] === false) return "filtered";
  }
  return "allowed";
}

function filterRows(rows, limit) {
  if (!Array.isArray(rows) || rows.length > limit) {
    return { rows: [], filtered: false, invalid: true };
  }
  const authorizedRows = [];
  let filtered = false;
  for (const item of rows) {
    const authorization = rowAuthorization(item);
    if (authorization === "filtered") {
      filtered = true;
      continue;
    }
    if (authorization === "invalid") return { rows: [], filtered, invalid: true };
    authorizedRows.push(item);
  }
  return { rows: authorizedRows, filtered, invalid: false };
}

function dateOnly(value, emptyLabel) {
  if (value === null || value === undefined || value === "") return emptyLabel;
  const raw = text(value);
  if (!raw) return emptyLabel;
  if (DATE_PATTERN.test(raw)) return raw;
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDate && DATE_PATTERN.test(isoDate[1])) return isoDate[1];
  return null;
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), "ko-KR", {
    numeric: true,
    sensitivity: "base",
  });
}

function freezeRows(rows) {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

function hasExactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => hasOwn(value, key));
}

function validationResult({ state, rows, filtered = false, valid = true }) {
  if (!valid) {
    return { state: "error", rows: Object.freeze([]) };
  }
  if (filtered && state === "data") return { state: "partial", rows: freezeRows(rows) };
  return { state, rows: freezeRows(rows) };
}

function buildMonthlyReport(section, state) {
  const data = sectionData(section);
  const source = sourceRows(data, "points", "items");
  if (!data || source === null) return validationResult({ state, rows: [], valid: false });
  const filteredRows = filterRows(source, MONTHLY_REPORT_LIMIT);
  if (filteredRows.invalid) return validationResult({ state, rows: [], valid: false });
  const rows = filteredRows.rows.map((item) => {
    const month = text(item.month);
    const amount = firstPresent(item, ["net_deposit_revenue", "netDepositRevenue"]);
    return { month, amount, valid: MONTH_PATTERN.test(month) && safeInteger(amount) };
  });
  if (rows.some((row) => !row.valid)) {
    return validationResult({ state, rows: [], valid: false });
  }
  const monthSet = new Set(rows.map((row) => row.month));
  if (
    monthSet.size !== rows.length
    || rows.length > MONTHLY_REPORT_LIMIT
    || (state === "data" && rows.length === 0)
  ) {
    return validationResult({ state, rows: [], valid: false });
  }
  rows.sort((left, right) => left.month.localeCompare(right.month));
  const normalizedRows = rows.map(({ month, amount }) => ({ month, amount }));
  const periodMonthCount = data.period?.month_count ?? data.period?.monthCount;
  if (state === "data" && (
    normalizedRows.length !== MONTHLY_REPORT_LIMIT
    || (periodMonthCount !== undefined && periodMonthCount !== MONTHLY_REPORT_LIMIT)
  )) {
    return validationResult({ state, rows: [], valid: false });
  }
  const total = data.total;
  const sum = normalizedRows.reduce((value, row) => value + row.amount, 0);
  if (state === "data" && total !== undefined && (!safeInteger(total) || total !== sum)) {
    return validationResult({ state, rows: [], valid: false });
  }
  return validationResult({
    state,
    rows: normalizedRows,
    filtered: filteredRows.filtered,
  });
}

function buildInquiryReport(section, state) {
  const data = sectionData(section);
  const source = sourceRows(data, "items", "rows");
  if (!data || source === null) return validationResult({ state, rows: [], valid: false });
  const filteredRows = filterRows(source, INQUIRY_STATUS_ROWS.length);
  if (filteredRows.invalid) return validationResult({ state, rows: [], valid: false });
  const expected = new Map(INQUIRY_STATUS_ROWS.map((item) => [item.code, item.label]));
  const seen = new Set();
  const rows = [];
  for (const item of filteredRows.rows) {
    const code = text(item.code);
    const count = item.count;
    if (!expected.has(code) || seen.has(code) || !safeInteger(count) || count < 0) {
      return validationResult({ state, rows: [], valid: false });
    }
    seen.add(code);
    rows.push({ label: expected.get(code), count });
  }
  rows.sort((left, right) => (
    INQUIRY_STATUS_ROWS.findIndex((item) => item.label === left.label)
    - INQUIRY_STATUS_ROWS.findIndex((item) => item.label === right.label)
  ));
  if (state === "data" && rows.length !== INQUIRY_STATUS_ROWS.length) {
    return validationResult({ state, rows: [], valid: false });
  }
  const total = data.total;
  const sum = rows.reduce((value, row) => value + row.count, 0);
  if (state === "data" && total !== undefined && (!safeInteger(total) || total !== sum)) {
    return validationResult({ state, rows: [], valid: false });
  }
  return validationResult({ state, rows, filtered: filteredRows.filtered });
}

function rankingDate(item, kind) {
  const value = kind === "ranking_revenue"
    ? firstPresent(item, ["latest_deposit_at", "latestDepositAt"])
    : firstPresent(item, ["earliest_due_date", "earliestDueDate"]);
  return dateOnly(value, null);
}

function validDateValue(value) {
  if (value === null || value === undefined || value === "") return true;
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function dateSortValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

function buildRankingReport(section, state, kind) {
  const data = sectionData(section);
  const source = sourceRows(data, "items", "rows");
  if (!data || source === null) return validationResult({ state, rows: [], valid: false });
  const filteredRows = filterRows(source, RANKING_REPORT_LIMIT);
  if (filteredRows.invalid) return validationResult({ state, rows: [], valid: false });
  const normalized = [];
  const ids = new Set();
  for (const item of filteredRows.rows) {
    const clientId = text(firstPresent(item, ["client_group_id", "clientGroupId"]));
    const clientName = text(firstPresent(item, ["display_name", "displayName"]));
    const amount = kind === "ranking_revenue"
      ? firstPresent(item, ["net_deposit_revenue", "netDepositRevenue"])
      : firstPresent(item, ["receivable_amount", "receivableAmount"]);
    const rawDate = kind === "ranking_revenue"
      ? firstPresent(item, ["latest_deposit_at", "latestDepositAt"])
      : firstPresent(item, ["earliest_due_date", "earliestDueDate"]);
    const date = rankingDate(item, kind);
    if (
      !clientId
      || ids.has(clientId)
      || !clientName
      || !safeInteger(amount)
      || (kind === "ranking_receivables" && amount < 0)
      || !validDateValue(rawDate)
    ) {
      return validationResult({ state, rows: [], valid: false });
    }
    ids.add(clientId);
    normalized.push({
      clientId,
      clientName,
      amount,
      date,
      sortDate: dateSortValue(rawDate),
    });
  }
  if (normalized.length === 0 && source.length > 0 && !filteredRows.filtered) {
    return validationResult({ state, rows: [], valid: false });
  }
  normalized.sort((left, right) => {
    if (left.amount !== right.amount) return right.amount - left.amount;
    if (kind === "ranking_revenue") {
      const leftDate = left.sortDate ?? -Infinity;
      const rightDate = right.sortDate ?? -Infinity;
      if (leftDate !== rightDate) return rightDate - leftDate;
    } else {
      const leftDate = left.sortDate ?? Infinity;
      const rightDate = right.sortDate ?? Infinity;
      if (leftDate !== rightDate) return leftDate - rightDate;
    }
    const nameComparison = compareText(left.clientName, right.clientName);
    if (nameComparison !== 0) return nameComparison;
    return compareText(left.clientId, right.clientId);
  });
  const rows = normalized.map((item, index) => ({
    rank: index + 1,
    displayName: item.clientName,
    amount: item.amount,
    ...(kind === "ranking_revenue"
      ? { latestDepositAt: item.date }
      : { earliestDueDate: item.date }),
  }));
  return validationResult({ state, rows, filtered: filteredRows.filtered });
}

function opaqueSnapshotToken(value, maximumBytes) {
  if (typeof value !== "string"
      || value.length === 0
      || new TextEncoder().encode(value).byteLength > maximumBytes) return null;
  return value;
}

function opaqueSnapshotVersion(value) {
  if (safeInteger(value) && value >= 1) return value;
  if (
    typeof value !== "string"
    || value.length === 0
    || new TextEncoder().encode(value).byteLength > 128
    || !/^[A-Za-z0-9][A-Za-z0-9._~:/+=-]*$/u.test(value)
  ) return null;
  return value;
}

function serverExportSnapshot(result) {
  const snapshot = firstDefinedPresent(result, ["exportSnapshot", "export_snapshot"]);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const token = opaqueSnapshotToken(
    firstDefinedPresent(snapshot, ["token", "snapshotToken", "snapshot_token", "opaqueRef", "opaque_ref"]),
    CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
  );
  const version = opaqueSnapshotVersion(
    firstDefinedPresent(snapshot, ["version", "snapshotVersion", "snapshot_version"]),
  );
  if (token === null || version === null) return null;
  return Object.freeze({ token, version });
}

function fixedScreenEnvelope(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  if (
    result.item
    && typeof result.item === "object"
    && !Array.isArray(result.item)
    && hasOwn(result.item, "report_id")
  ) {
    return { envelope: result, item: result.item };
  }
  if (hasOwn(result, "report_id")) return { envelope: result, item: result };
  return null;
}

function fixedScreenState(envelope, rows) {
  const explicit = resultUiState(envelope);
  if (explicit) return explicit;
  if (envelope?.kind === "guarded") {
    return envelope.uiState === "review_required"
      ? "review_required"
      : "denied";
  }
  if (envelope?.kind === "error") return "error";
  if (envelope?.kind === "empty") return "empty";
  if (envelope?.kind === "loading") return "loading";
  return Array.isArray(rows) && rows.length === 0 ? "empty" : "data";
}

function fixedScreenColumnsValid(item, definition) {
  const expected = FIXED_SCREEN_COLUMNS[definition.id];
  if (!Array.isArray(item.columns) || item.columns.length !== expected.length) {
    return false;
  }
  return item.columns.every((column, index) => (
    hasExactKeys(column, ["key", "label"])
    && column.key === expected[index].key
    && column.label === expected[index].label
  ));
}

function fixedScreenBoundary(item, envelope, state) {
  if (field(item, "permissionPrefilterApplied", "permission_prefilter_applied") !== true) {
    return "denied";
  }
  if (
    field(item, "countLeakPrevented", "count_leak_prevented") !== true
    || (
      hasOwn(envelope, "count_leak_prevented")
      && envelope.count_leak_prevented !== true
    )
  ) {
    return "error";
  }
  for (const [camel, snake] of [
    ["rawBankSourceIncluded", "raw_bank_source_included"],
    ["rawSourcePayloadIncluded", "raw_source_payload_included"],
    ["contactPiiIncluded", "contact_pii_included"],
    ["internalIdsIncluded", "internal_ids_included"],
  ]) {
    if (field(item, camel, snake) !== false) return "error";
  }
  const sourceStatus = text(field(item, "sourceStatus", "source_status"));
  if (!FIXED_SCREEN_SOURCE_STATUSES.has(sourceStatus)) return "error";
  const expectedSourceStatus = state === "partial"
    ? "partial"
    : state === "empty"
      ? "no_data"
      : state === "data"
        ? "available"
        : null;
  if (expectedSourceStatus && sourceStatus !== expectedSourceStatus) {
    return "error";
  }
  return null;
}

function fixedScreenDate(value) {
  return value === null || (
    typeof value === "string"
    && DATE_PATTERN.test(value)
    && validDateValue(value)
  );
}

function fixedScreenClientName(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 200
    && value === value.trim()
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
    && !/^[\t\r\n ]*[=+\-@]/u.test(value);
}

function fixedScreenRankingOrder(left, right, definition) {
  const amountKey = definition.id === "revenue_ranking"
    ? "net_deposit_revenue"
    : "receivable_amount";
  if (left[amountKey] !== right[amountKey]) {
    return right[amountKey] - left[amountKey];
  }
  const dateKey = definition.id === "revenue_ranking"
    ? "latest_deposit_date"
    : "earliest_due_date";
  const leftDate = left[dateKey] === null
    ? (definition.id === "revenue_ranking" ? -Infinity : Infinity)
    : Date.parse(left[dateKey]);
  const rightDate = right[dateKey] === null
    ? (definition.id === "revenue_ranking" ? -Infinity : Infinity)
    : Date.parse(right[dateKey]);
  if (leftDate !== rightDate) {
    return definition.id === "revenue_ranking"
      ? rightDate - leftDate
      : leftDate - rightDate;
  }
  return compareText(left.client_name, right.client_name);
}

function fixedScreenRows(item, definition, state) {
  const columns = FIXED_SCREEN_COLUMNS[definition.id];
  const keys = columns.map(({ key }) => key);
  const limit = definition.id === "monthly_deposit_revenue"
    ? MONTHLY_REPORT_LIMIT
    : definition.id === "inquiry_status"
      ? INQUIRY_STATUS_ROWS.length
      : RANKING_REPORT_LIMIT;
  if (!Array.isArray(item.rows) || item.rows.length > limit) return null;
  if (state === "empty" && item.rows.length !== 0) return null;
  if (state === "data" && (
    item.rows.length === 0
    || (definition.id === "monthly_deposit_revenue" && item.rows.length !== limit)
    || (definition.id === "inquiry_status" && item.rows.length !== limit)
  )) return null;

  const rows = [];
  for (const [index, source] of item.rows.entries()) {
    if (!hasExactKeys(source, keys)) return null;
    const row = Object.fromEntries(keys.map((key) => [key, source[key]]));
    if (definition.id === "monthly_deposit_revenue") {
      if (!MONTH_PATTERN.test(row.month) || !safeInteger(row.net_deposit_revenue)) {
        return null;
      }
    } else if (definition.id === "inquiry_status") {
      if (
        row.status !== INQUIRY_STATUS_ROWS[index]?.label
        || !safeInteger(row.count)
        || row.count < 0
      ) return null;
    } else {
      const amountKeys = definition.id === "revenue_ranking"
        ? ["matched_inflow_amount", "linked_refund_amount", "net_deposit_revenue"]
        : ["agreed_amount", "active_allocated_amount", "receivable_amount"];
      if (
        row.rank !== index + 1
        || !fixedScreenClientName(row.client_name)
        || amountKeys.some((key) => !safeInteger(row[key]))
        || (
          definition.id === "revenue_ranking"
          && (
            row.matched_inflow_amount < 0
            || row.linked_refund_amount < 0
          )
        )
        || (
          definition.id === "receivables_ranking"
          && amountKeys.some((key) => row[key] < 0)
        )
        || !fixedScreenDate(
          definition.id === "revenue_ranking"
            ? row.latest_deposit_date
            : row.earliest_due_date,
        )
      ) return null;
    }
    rows.push(row);
  }
  if (
    definition.id === "monthly_deposit_revenue"
    && (
      new Set(rows.map(({ month }) => month)).size !== rows.length
      || rows.some((row, index) => index > 0 && rows[index - 1].month >= row.month)
    )
  ) return null;
  if (
    ["revenue_ranking", "receivables_ranking"].includes(definition.id)
    && rows.some((row, index) => (
      index > 0
      && fixedScreenRankingOrder(rows[index - 1], row, definition) > 0
    ))
  ) return null;
  if (
    hasOwn(item, "row_count")
    && item.row_count !== rows.length
  ) return null;
  return freezeRows(rows);
}

function fixedScreenSnapshot(item, envelope) {
  const snapshot = item.snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const normalized = serverExportSnapshot({ exportSnapshot: snapshot });
  if (!normalized || normalized.version !== CLIENT_FIXED_REPORT_SNAPSHOT_VERSION) {
    return null;
  }
  const mapped = firstDefinedPresent(envelope, ["exportSnapshot", "export_snapshot"]);
  if (mapped !== undefined) {
    const normalizedMapped = serverExportSnapshot({ exportSnapshot: mapped });
    if (
      !normalizedMapped
      || normalizedMapped.token !== normalized.token
      || normalizedMapped.version !== normalized.version
    ) return null;
  }
  return normalized;
}

function fixedScreenReport(definition, item, envelope, state) {
  const columns = FIXED_SCREEN_COLUMNS[definition.id];
  const boundary = fixedScreenBoundary(item, envelope, state);
  const nextState = boundary ?? state;
  const rows = ["data", "partial", "empty"].includes(nextState)
    ? fixedScreenColumnsValid(item, definition)
      ? fixedScreenRows(item, definition, nextState)
      : null
    : Object.freeze([]);
  const valid = rows !== null;
  const reportState = valid ? nextState : "error";
  const screenRows = valid ? rows : Object.freeze([]);
  const snapshot = ["data", "partial"].includes(reportState)
    ? fixedScreenSnapshot(item, envelope)
    : null;
  return Object.freeze({
    id: definition.id,
    title: definition.title,
    state: reportState,
    headers: Object.freeze(columns.map(({ label }) => label)),
    columns,
    sourceStatus: text(field(item, "sourceStatus", "source_status")) || null,
    rows: screenRows,
    screenRows,
    exportRequest: snapshot
      ? Object.freeze({
        reportId: definition.id,
        contractVersion: CLIENT_FIXED_REPORTS_CONTRACT_VERSION,
        snapshotToken: snapshot.token,
        snapshotVersion: snapshot.version,
      })
      : null,
  });
}

function fixedScreenModel(result, fixedScreen) {
  const { envelope, item } = fixedScreen;
  const definition = REPORT_DEFINITIONS.find(({ id }) => id === item.report_id);
  const state = fixedScreenState(envelope, item.rows);
  const reports = REPORT_DEFINITIONS.map((candidate) => {
    if (!definition || candidate.id !== definition.id) {
      const columns = FIXED_SCREEN_COLUMNS[candidate.id];
      const emptyRows = Object.freeze([]);
      return Object.freeze({
        id: candidate.id,
        title: candidate.title,
        state: definition ? "loading" : "error",
        headers: Object.freeze(columns.map(({ label }) => label)),
        columns,
        rows: emptyRows,
        screenRows: emptyRows,
        exportRequest: null,
      });
    }
    return fixedScreenReport(candidate, item, envelope, state);
  });
  return Object.freeze({
    state: definition ? state : "error",
    reports: Object.freeze(reports),
    generatedAt: field(envelope, "generatedAt", "generated_at") ?? null,
    asOf: field(item, "asOf", "as_of")
      ?? field(envelope, "asOf", "as_of")
      ?? null,
    timezone: field(item, "timezone", "timezone")
      ?? field(envelope, "timezone", "timezone")
      ?? null,
  });
}

function exportRequest(definition, state, result) {
  if (!["data", "partial"].includes(state)) return null;
  const snapshot = serverExportSnapshot(result);
  if (!snapshot) return null;
  return Object.freeze({
    reportId: definition.id,
    contractVersion: CLIENT_FIXED_REPORTS_CONTRACT_VERSION,
    snapshotToken: snapshot.token,
    snapshotVersion: snapshot.version,
  });
}

function reportRows(definition, result) {
  const sections = result?.sections ?? {};
  const section = sections[definition.section];
  const state = sectionState(section, rootState(result), result);
  let normalized;
  if (state === "data" || state === "partial") {
    if (definition.kind === "monthly") normalized = buildMonthlyReport(section, state);
    else if (definition.kind === "inquiry") normalized = buildInquiryReport(section, state);
    else normalized = buildRankingReport(section, state, definition.kind);
  } else {
    normalized = { state, rows: Object.freeze([]) };
  }
  const rows = normalized.rows;
  const report = {
    id: definition.id,
    title: definition.title,
    state: normalized.state,
    headers: Object.freeze(definition.columns.map((column) => column.label)),
    columns: definition.columns,
    rows,
    screenRows: rows,
    exportRequest: exportRequest(definition, normalized.state, result),
  };
  return Object.freeze(report);
}

export function buildClientFixedReportsModel(result, _options = undefined) {
  const fixedScreen = fixedScreenEnvelope(result);
  if (fixedScreen) return fixedScreenModel(result, fixedScreen);
  const state = rootState(result);
  const reports = REPORT_DEFINITIONS.map((definition) => (
    reportRows(definition, result)
  ));
  return Object.freeze({
    state,
    reports: Object.freeze(reports),
    generatedAt: field(result, "generatedAt", "generated_at") ?? null,
    asOf: field(result, "asOf", "as_of") ?? null,
    timezone: field(result, "timezone", "timezone") ?? null,
  });
}

export function selectClientFixedReport(model, reportId) {
  const id = text(reportId);
  return Array.isArray(model?.reports)
    ? model.reports.find((report) => report.id === id) ?? null
    : null;
}
