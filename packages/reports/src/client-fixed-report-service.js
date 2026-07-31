import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const CLIENT_FIXED_REPORT_SNAPSHOT_VERSION = 1;
export const CLIENT_FIXED_REPORT_TOKEN_PREFIX =
  "lawos_client_fixed_report_v1";
export const CLIENT_FIXED_REPORT_TOKEN_TTL_MS = 10 * 60 * 1000;
export const CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES = 16 * 1024;
export const CLIENT_FIXED_REPORT_MAX_CSV_BYTES = 16 * 1024;

const SIGNING_CONTEXT =
  "lawos:client-fixed-report-snapshot:v1\u0000";
const TOKEN_IV_BYTES = 12;
const TOKEN_TAG_BYTES = 16;
const SHA256 = /^[a-f0-9]{64}$/u;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const REPORT_TIMEZONE = "Asia/Seoul";
const REVENUE_PERIODS = new Set(["month", "quarter", "year"]);
const SNAPSHOT_SOURCE_STATUSES = new Set([
  "available",
  "no_data",
  "partial",
]);

const INQUIRY_STATUSES = Object.freeze([
  Object.freeze({ code: "new", label: "새 문의" }),
  Object.freeze({ code: "reviewing", label: "확인 중" }),
  Object.freeze({
    code: "consultation_scheduled",
    label: "상담 예정",
  }),
  Object.freeze({
    code: "engagement_review",
    label: "수임 검토 중",
  }),
  Object.freeze({ code: "engaged", label: "수임 확정" }),
  Object.freeze({
    code: "not_engaged",
    label: "수임하지 않음",
  }),
]);

export const CLIENT_FIXED_REPORT_DEFINITIONS = Object.freeze([
  Object.freeze({
    report_id: "monthly_deposit_revenue",
    title: "월별 입금 매출",
    section: "monthly_deposit_revenue",
    row_limit: 12,
    columns: Object.freeze([
      Object.freeze({ key: "month", label: "월" }),
      Object.freeze({
        key: "net_deposit_revenue",
        label: "입금 매출",
      }),
    ]),
  }),
  Object.freeze({
    report_id: "inquiry_status",
    title: "문의 현황",
    section: "inquiry_status",
    row_limit: 6,
    columns: Object.freeze([
      Object.freeze({ key: "status", label: "상태" }),
      Object.freeze({ key: "count", label: "건수" }),
    ]),
  }),
  Object.freeze({
    report_id: "revenue_ranking",
    title: "입금 매출 상위 고객",
    section: "revenue_ranking",
    row_limit: 10,
    columns: Object.freeze([
      Object.freeze({ key: "rank", label: "순위" }),
      Object.freeze({ key: "client_name", label: "고객" }),
      Object.freeze({
        key: "matched_inflow_amount",
        label: "연결 입금",
      }),
      Object.freeze({
        key: "linked_refund_amount",
        label: "환불",
      }),
      Object.freeze({
        key: "net_deposit_revenue",
        label: "입금 매출",
      }),
      Object.freeze({
        key: "latest_deposit_date",
        label: "최근 입금일",
      }),
    ]),
  }),
  Object.freeze({
    report_id: "receivables_ranking",
    title: "미수금 상위 고객",
    section: "receivables_ranking",
    row_limit: 10,
    columns: Object.freeze([
      Object.freeze({ key: "rank", label: "순위" }),
      Object.freeze({ key: "client_name", label: "고객" }),
      Object.freeze({
        key: "agreed_amount",
        label: "약정 수임료",
      }),
      Object.freeze({
        key: "active_allocated_amount",
        label: "반영 입금",
      }),
      Object.freeze({
        key: "receivable_amount",
        label: "미수금",
      }),
      Object.freeze({
        key: "earliest_due_date",
        label: "가장 이른 지급기한",
      }),
    ]),
  }),
]);

export const CLIENT_FIXED_REPORT_IDS = Object.freeze(
  CLIENT_FIXED_REPORT_DEFINITIONS.map(({ report_id }) => report_id),
);

const DEFINITION_BY_ID = new Map(
  CLIENT_FIXED_REPORT_DEFINITIONS.map((definition) => [
    definition.report_id,
    definition,
  ]),
);

function clone(value) {
  return value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value));
}

function requiredText(value, field, maximum = 256) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_VALIDATION_ERROR",
      `${field} is invalid`,
    );
  }
  return text;
}

function fixedReportError(code, message) {
  return Object.assign(new Error(message), { safe_error_code: code });
}

function safeInteger(value, field, { nonNegative = false } = {}) {
  if (
    !Number.isSafeInteger(value)
    || (nonNegative && value < 0)
  ) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      `${field} must be a safe integer`,
    );
  }
  return value;
}

function safeSpreadsheetText(value, field) {
  const text = requiredText(value, field, 200)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "");
  return /^[\t\r\n ]*[=+\-@]/u.test(text) ? `'${text}` : text;
}

function canonicalInstant(value, field) {
  const text = requiredText(value, field);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds)) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_VALIDATION_ERROR",
      `${field} must be an instant`,
    );
  }
  return new Date(milliseconds).toISOString();
}

function dateOnly(value, field) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const text = requiredText(value, field);
  if (DATE.test(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})T/u);
  if (!match || !DATE.test(match[1])) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      `${field} must be a date`,
    );
  }
  return match[1];
}

function definitionFor(reportId) {
  const definition = DEFINITION_BY_ID.get(String(reportId ?? ""));
  if (!definition) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_NOT_FOUND",
      "fixed report not found",
    );
  }
  return definition;
}

function snapshotSourceStatus(value) {
  if (!SNAPSHOT_SOURCE_STATUSES.has(value)) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "fixed report source status is invalid",
    );
  }
  return value;
}

function monthlyRows(data, definition) {
  if (!Array.isArray(data?.points) || data.points.length > definition.row_limit) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "monthly report source is invalid",
    );
  }
  const rows = [...data.points]
    .map((point) => {
      const month = requiredText(point?.month, "month");
      if (!MONTH.test(month)) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_SOURCE_INVALID",
          "month is invalid",
        );
      }
      return Object.freeze({
        month,
        net_deposit_revenue: safeInteger(
          point?.net_deposit_revenue,
          "net_deposit_revenue",
        ),
      });
    })
    .sort((left, right) => left.month.localeCompare(right.month, "en"));
  if (new Set(rows.map(({ month }) => month)).size !== rows.length) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "monthly report contains duplicate months",
    );
  }
  return Object.freeze(rows);
}

function inquiryRows(data, definition) {
  if (!Array.isArray(data?.items) || data.items.length > definition.row_limit) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "inquiry report source is invalid",
    );
  }
  const counts = new Map();
  for (const item of data.items) {
    const code = requiredText(item?.code, "inquiry status");
    if (
      !INQUIRY_STATUSES.some((status) => status.code === code)
      || counts.has(code)
    ) {
      throw fixedReportError(
        "CLIENT_FIXED_REPORT_SOURCE_INVALID",
        "inquiry status is invalid",
      );
    }
    counts.set(
      code,
      safeInteger(item?.count, "inquiry count", {
        nonNegative: true,
      }),
    );
  }
  if (counts.size !== INQUIRY_STATUSES.length) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "inquiry status rows are incomplete",
    );
  }
  return Object.freeze(INQUIRY_STATUSES.map(({ code, label }) => (
    Object.freeze({ status: label, count: counts.get(code) })
  )));
}

function revenueRows(data, definition) {
  if (!Array.isArray(data?.items)) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "revenue ranking source is invalid",
    );
  }
  return Object.freeze(data.items
    .slice(0, definition.row_limit)
    .map((row, index) => Object.freeze({
      rank: index + 1,
      client_name: safeSpreadsheetText(
        row?.display_name,
        "revenue client name",
      ),
      matched_inflow_amount: safeInteger(
        row?.matched_inflow_amount,
        "matched_inflow_amount",
        { nonNegative: true },
      ),
      linked_refund_amount: safeInteger(
        row?.linked_refund_amount,
        "linked_refund_amount",
        { nonNegative: true },
      ),
      net_deposit_revenue: safeInteger(
        row?.net_deposit_revenue,
        "net_deposit_revenue",
      ),
      latest_deposit_date: dateOnly(
        row?.latest_deposit_at,
        "latest_deposit_at",
      ),
    })));
}

function receivablesRows(data, definition) {
  if (!Array.isArray(data?.items)) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "receivables ranking source is invalid",
    );
  }
  return Object.freeze(data.items
    .slice(0, definition.row_limit)
    .map((row, index) => Object.freeze({
      rank: index + 1,
      client_name: safeSpreadsheetText(
        row?.display_name,
        "receivables client name",
      ),
      agreed_amount: safeInteger(
        row?.agreed_amount,
        "agreed_amount",
        { nonNegative: true },
      ),
      active_allocated_amount: safeInteger(
        row?.active_allocated_amount,
        "active_allocated_amount",
        { nonNegative: true },
      ),
      receivable_amount: safeInteger(
        row?.receivable_amount,
        "receivable_amount",
        { nonNegative: true },
      ),
      earliest_due_date: dateOnly(
        row?.earliest_due_date,
        "earliest_due_date",
      ),
    })));
}

function reportSource(definition, dashboard) {
  const section = dashboard?.sections?.[definition.section];
  if (!section || typeof section !== "object") {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "fixed report section is missing",
    );
  }
  if (section.status === "permission_denied") {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_DENIED",
      "fixed report source is denied",
    );
  }
  if (section.status === "error") {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_UNAVAILABLE",
      "fixed report source is unavailable",
    );
  }
  if (
    !["available", "no_data", "partial"].includes(
      section.status,
    )
  ) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "fixed report source status is invalid",
    );
  }
  if (section.status === "no_data") {
    return Object.freeze({
      source_status: "no_data",
      rows: Object.freeze([]),
    });
  }
  if (section.data == null) {
    if (section.status === "partial") {
      return Object.freeze({
        source_status: section.status,
        rows: Object.freeze([]),
      });
    }
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SOURCE_INVALID",
      "fixed report section has no data",
    );
  }
  let rows;
  if (definition.report_id === "monthly_deposit_revenue") {
    rows = monthlyRows(section.data, definition);
  } else if (definition.report_id === "inquiry_status") {
    rows = inquiryRows(section.data, definition);
  } else if (definition.report_id === "revenue_ranking") {
    rows = revenueRows(section.data, definition);
  } else {
    rows = receivablesRows(section.data, definition);
  }
  return Object.freeze({
    source_status: section.status,
    rows,
  });
}

function canonicalRows(definition, rows) {
  if (!Array.isArray(rows) || rows.length > definition.row_limit) {
    throw fixedReportError(
      "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
      "snapshot rows are invalid",
    );
  }
  const expectedKeys = definition.columns.map(({ key }) => key);
  return Object.freeze(rows.map((row, index) => {
    if (
      !row
      || typeof row !== "object"
      || Array.isArray(row)
      || Object.keys(row).length !== expectedKeys.length
      || expectedKeys.some((key) => !Object.hasOwn(row, key))
    ) {
      throw fixedReportError(
        "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
        "snapshot row shape is invalid",
      );
    }
    if (definition.report_id === "monthly_deposit_revenue") {
      if (!MONTH.test(row.month)) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
          "snapshot month is invalid",
        );
      }
      return Object.freeze({
        month: row.month,
        net_deposit_revenue: safeInteger(
          row.net_deposit_revenue,
          "snapshot net_deposit_revenue",
        ),
      });
    }
    if (definition.report_id === "inquiry_status") {
      if (row.status !== INQUIRY_STATUSES[index]?.label) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
          "snapshot inquiry status is invalid",
        );
      }
      return Object.freeze({
        status: row.status,
        count: safeInteger(row.count, "snapshot inquiry count", {
          nonNegative: true,
        }),
      });
    }
    const base = {
      rank: safeInteger(row.rank, "snapshot rank", {
        nonNegative: true,
      }),
      client_name: safeSpreadsheetText(
        row.client_name,
        "snapshot client name",
      ),
    };
    if (base.rank !== index + 1) {
      throw fixedReportError(
        "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
        "snapshot rank is invalid",
      );
    }
    if (definition.report_id === "revenue_ranking") {
      return Object.freeze({
        ...base,
        matched_inflow_amount: safeInteger(
          row.matched_inflow_amount,
          "snapshot matched_inflow_amount",
          { nonNegative: true },
        ),
        linked_refund_amount: safeInteger(
          row.linked_refund_amount,
          "snapshot linked_refund_amount",
          { nonNegative: true },
        ),
        net_deposit_revenue: safeInteger(
          row.net_deposit_revenue,
          "snapshot net_deposit_revenue",
        ),
        latest_deposit_date: dateOnly(
          row.latest_deposit_date,
          "snapshot latest_deposit_date",
        ),
      });
    }
    return Object.freeze({
      ...base,
      agreed_amount: safeInteger(
        row.agreed_amount,
        "snapshot agreed_amount",
        { nonNegative: true },
      ),
      active_allocated_amount: safeInteger(
        row.active_allocated_amount,
        "snapshot active_allocated_amount",
        { nonNegative: true },
      ),
      receivable_amount: safeInteger(
        row.receivable_amount,
        "snapshot receivable_amount",
        { nonNegative: true },
      ),
      earliest_due_date: dateOnly(
        row.earliest_due_date,
        "snapshot earliest_due_date",
      ),
    });
  }));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceDigest({
  report_id,
  as_of,
  revenue_ranking_period,
  rows,
}) {
  return sha256(JSON.stringify({
    snapshot_version: CLIENT_FIXED_REPORT_SNAPSHOT_VERSION,
    report_id,
    as_of,
    revenue_ranking_period,
    rows,
  }));
}

function currentMs(now) {
  const value = typeof now === "function" ? now() : now;
  const milliseconds = value instanceof Date
    ? value.getTime()
    : Number(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("fixed report token clock is invalid");
  }
  return milliseconds;
}

function tokenKey(secret) {
  if (
    !(typeof secret === "string" || Buffer.isBuffer(secret))
    || Buffer.byteLength(secret) < 32
  ) {
    throw new TypeError(
      "fixed report token secret must contain at least 32 bytes",
    );
  }
  return createHash("sha256")
    .update(SIGNING_CONTEXT, "utf8")
    .update(secret)
    .digest();
}

function sameText(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }
  const leftDigest = Buffer.from(sha256(left), "hex");
  const rightDigest = Buffer.from(sha256(right), "hex");
  return timingSafeEqual(leftDigest, rightDigest);
}

export function createClientFixedReportSnapshotTokenAuthority({
  secret,
  ttlMs = CLIENT_FIXED_REPORT_TOKEN_TTL_MS,
  now = () => Date.now(),
} = {}) {
  const key = tokenKey(secret);
  if (
    !Number.isSafeInteger(ttlMs)
    || ttlMs < 60_000
    || ttlMs > 30 * 60_000
  ) {
    throw new TypeError(
      "fixed report token ttl must be between 1 and 30 minutes",
    );
  }

  function issue(input = {}) {
    const definition = definitionFor(input.report_id);
    const issuedAt = currentMs(now);
    const asOf = canonicalInstant(input.as_of, "as_of");
    const rows = canonicalRows(definition, input.rows);
    const sourceStatus = snapshotSourceStatus(
      input.source_status,
    );
    const digest = sourceDigest({
      report_id: definition.report_id,
      as_of: asOf,
      revenue_ranking_period: input.revenue_ranking_period,
      rows,
    });
    if (input.source_digest !== digest) {
      throw fixedReportError(
        "CLIENT_FIXED_REPORT_SOURCE_INVALID",
        "fixed report source digest is invalid",
      );
    }
    const payload = Object.freeze({
      typ: CLIENT_FIXED_REPORT_TOKEN_PREFIX,
      ver: CLIENT_FIXED_REPORT_SNAPSHOT_VERSION,
      tenant_id: requiredText(input.tenant_id, "tenant_id"),
      actor_id: requiredText(input.actor_id, "actor_id"),
      capability_binding: requiredText(
        input.capability_binding,
        "capability_binding",
      ),
      report_id: definition.report_id,
      as_of: asOf,
      revenue_ranking_period: input.revenue_ranking_period,
      source_digest: digest,
      source_status: sourceStatus,
      rows,
      iat: issuedAt,
      exp: issuedAt + ttlMs,
    });
    const iv = randomBytes(TOKEN_IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(CLIENT_FIXED_REPORT_TOKEN_PREFIX, "utf8"));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    const token = `${CLIENT_FIXED_REPORT_TOKEN_PREFIX}.${
      Buffer.concat([iv, cipher.getAuthTag(), encrypted])
        .toString("base64url")
    }`;
    if (
      Buffer.byteLength(token, "utf8")
        > CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES
    ) {
      throw fixedReportError(
        "CLIENT_FIXED_REPORT_SNAPSHOT_TOO_LARGE",
        "fixed report snapshot exceeds the byte budget",
      );
    }
    return Object.freeze({
      token,
      version: CLIENT_FIXED_REPORT_SNAPSHOT_VERSION,
      expires_at: new Date(payload.exp).toISOString(),
      source_digest: digest,
    });
  }

  function invalid(reason = "client_fixed_report_snapshot_invalid") {
    return Object.freeze({ ok: false, reason });
  }

  function verify(token, expected = {}) {
    const value = String(token ?? "");
    if (
      Buffer.byteLength(value, "utf8")
        > CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES
      || !value.startsWith(`${CLIENT_FIXED_REPORT_TOKEN_PREFIX}.`)
    ) {
      return invalid();
    }
    const parts = value.split(".");
    if (
      parts.length !== 2
      || !/^[A-Za-z0-9_-]+$/u.test(parts[1])
    ) {
      return invalid();
    }
    let payload;
    try {
      const encoded = Buffer.from(parts[1], "base64url");
      if (encoded.toString("base64url") !== parts[1]) {
        return invalid();
      }
      if (encoded.length <= TOKEN_IV_BYTES + TOKEN_TAG_BYTES) {
        return invalid();
      }
      const iv = encoded.subarray(0, TOKEN_IV_BYTES);
      const tag = encoded.subarray(
        TOKEN_IV_BYTES,
        TOKEN_IV_BYTES + TOKEN_TAG_BYTES,
      );
      const encrypted = encoded.subarray(
        TOKEN_IV_BYTES + TOKEN_TAG_BYTES,
      );
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(
        Buffer.from(CLIENT_FIXED_REPORT_TOKEN_PREFIX, "utf8"),
      );
      decipher.setAuthTag(tag);
      payload = JSON.parse(Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8"));
    } catch {
      return invalid();
    }
    let definition;
    let rows;
    try {
      definition = definitionFor(payload?.report_id);
      rows = canonicalRows(definition, payload?.rows);
    } catch {
      return invalid();
    }
    const nowMs = currentMs(now);
    if (
      payload?.typ !== CLIENT_FIXED_REPORT_TOKEN_PREFIX
      || payload?.ver !== CLIENT_FIXED_REPORT_SNAPSHOT_VERSION
      || !Number.isFinite(payload?.iat)
      || !Number.isFinite(payload?.exp)
      || payload.exp <= payload.iat
      || payload.exp - payload.iat > ttlMs
      || payload.iat > nowMs + 30_000
      || !SNAPSHOT_SOURCE_STATUSES.has(
        payload?.source_status ?? "available",
      )
      || !SHA256.test(String(payload?.source_digest ?? ""))
      || payload.source_digest !== sourceDigest({
        report_id: payload.report_id,
        as_of: payload.as_of,
        revenue_ranking_period: payload.revenue_ranking_period,
        rows,
      })
    ) {
      return invalid();
    }
    if (payload.exp <= nowMs) {
      return invalid("client_fixed_report_snapshot_expired");
    }
    for (const field of [
      "tenant_id",
      "actor_id",
      "capability_binding",
      "report_id",
    ]) {
      if (
        expected[field] !== undefined
        && !sameText(payload[field], expected[field])
      ) {
        return invalid(
          field === "capability_binding"
            ? "client_fixed_report_capability_changed"
            : "client_fixed_report_snapshot_invalid",
        );
      }
    }
    if (
      expected.version !== undefined
      && payload.ver !== expected.version
    ) {
      return invalid();
    }
    return Object.freeze({
      ok: true,
      payload: Object.freeze({
        ...payload,
        source_status: payload.source_status ?? "available",
        rows,
      }),
    });
  }

  return Object.freeze({
    issue,
    verify,
    token_prefix: CLIENT_FIXED_REPORT_TOKEN_PREFIX,
    version: CLIENT_FIXED_REPORT_SNAPSHOT_VERSION,
    ttl_ms: ttlMs,
    requires_injected_stable_secret: true,
  });
}

function csvCell(value) {
  const text = value === null || value === undefined
    ? ""
    : String(value);
  return /[",\r\n]/u.test(text)
    ? `"${text.replaceAll("\"", "\"\"")}"`
    : text;
}

function csvText(definition, rows) {
  return [
    definition.columns.map(({ label }) => csvCell(label)).join(","),
    ...rows.map((row) => (
      definition.columns
        .map(({ key }) => csvCell(row[key]))
        .join(",")
    )),
  ].join("\n");
}

function canonicalPermissionValue(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalPermissionValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [
          key,
          canonicalPermissionValue(value[key]),
        ]),
    );
  }
  return String(value);
}

export function clientFixedReportCapabilityBinding(context = {}) {
  const {
    request_id: _requestId,
    ...principalPermissionState
  } = context?.principal ?? {};
  return sha256(JSON.stringify({
    contract:
      "analytics:client:read+analytics:client:export:v2",
    principal: canonicalPermissionValue(principalPermissionState),
    rules: canonicalPermissionValue(
      Array.isArray(context?.rules) ? context.rules : [],
    ),
    object_acl: canonicalPermissionValue(
      Array.isArray(context?.object_acl)
        ? context.object_acl
        : [],
    ),
    object_acl_authority: canonicalPermissionValue(
      context?.object_acl_authority ?? null,
    ),
  }));
}

export function createClientFixedReportService({
  clientOperationsReadModel,
  tokenAuthority,
  now = () => new Date(),
} = {}) {
  if (
    typeof clientOperationsReadModel?.readDashboard !== "function"
  ) {
    throw new TypeError(
      "ClientOperationsReadModel.readDashboard is required",
    );
  }
  if (
    typeof tokenAuthority?.issue !== "function"
    || typeof tokenAuthority?.verify !== "function"
  ) {
    throw new TypeError(
      "fixed report snapshot token authority is required",
    );
  }

  return Object.freeze({
    definitions: CLIENT_FIXED_REPORT_DEFINITIONS,

    readScreen({
      tenant_id,
      actor_id,
      capability_binding,
      permission_context,
      report_access_authorized = false,
      report_id,
      as_of,
      timezone = REPORT_TIMEZONE,
      revenue_ranking_period = "year",
    } = {}) {
      const definition = definitionFor(report_id);
      const tenantId = requiredText(tenant_id, "tenant_id");
      const actorId = requiredText(actor_id, "actor_id");
      if (timezone !== REPORT_TIMEZONE) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_VALIDATION_ERROR",
          "timezone must be Asia/Seoul",
        );
      }
      if (!REVENUE_PERIODS.has(revenue_ranking_period)) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_VALIDATION_ERROR",
          "revenue ranking period is invalid",
        );
      }
      const asOf = canonicalInstant(
        as_of ?? now(),
        "as_of",
      );
      const result = clientOperationsReadModel.readDashboard({
        tenant_id: tenantId,
        permission_context,
        as_of: asOf,
        timezone,
        revenue_ranking_period,
      });
      const clientGroupScopeEmpty =
        result?.access_scope?.access_state === "no_access"
        && report_access_authorized === true;
      if (
        result?.access_scope?.access_state === "no_access"
        && !clientGroupScopeEmpty
      ) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_READ_DENIED",
          "fixed report read is denied",
        );
      }
      const source = clientGroupScopeEmpty
        ? Object.freeze({
            source_status: "no_data",
            rows: Object.freeze([]),
          })
        : reportSource(definition, result?.item);
      const rows = source.rows;
      const digest = sourceDigest({
        report_id: definition.report_id,
        as_of: asOf,
        revenue_ranking_period,
        rows,
      });
      const snapshot = tokenAuthority.issue({
        tenant_id: tenantId,
        actor_id: actorId,
        capability_binding,
        report_id: definition.report_id,
        as_of: asOf,
        revenue_ranking_period,
        source_digest: digest,
        source_status: source.source_status,
        rows,
      });
      return Object.freeze({
        report_id: definition.report_id,
        title: definition.title,
        columns: definition.columns,
        rows,
        row_count: rows.length,
        row_limit: definition.row_limit,
        as_of: asOf,
        timezone,
        source_status: source.source_status,
        snapshot: Object.freeze({
          token: snapshot.token,
          version: snapshot.version,
          expires_at: snapshot.expires_at,
        }),
        print_contract: Object.freeze({
          rows_source: "screen_snapshot",
          server_pdf_required: false,
        }),
        bounded_result: true,
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        raw_bank_source_included: false,
        raw_source_payload_included: false,
        contact_pii_included: false,
        internal_ids_included: false,
        source_digest_included: false,
        production_ready_claim: false,
      });
    },

    exportCsv({
      tenant_id,
      actor_id,
      capability_binding,
      report_id,
      snapshot_token,
      snapshot_version,
    } = {}) {
      const definition = definitionFor(report_id);
      const verified = tokenAuthority.verify(snapshot_token, {
        tenant_id: requiredText(tenant_id, "tenant_id"),
        actor_id: requiredText(actor_id, "actor_id"),
        capability_binding: requiredText(
          capability_binding,
          "capability_binding",
        ),
        report_id: definition.report_id,
        version: snapshot_version,
      });
      if (!verified.ok) {
        throw fixedReportError(
          verified.reason === "client_fixed_report_snapshot_expired"
            ? "CLIENT_FIXED_REPORT_SNAPSHOT_EXPIRED"
            : verified.reason
                === "client_fixed_report_capability_changed"
              ? "CLIENT_FIXED_REPORT_EXPORT_DENIED"
              : "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
          "fixed report snapshot is invalid",
        );
      }
      const rows = canonicalRows(
        definition,
        verified.payload.rows,
      );
      const text = csvText(definition, rows);
      const csvByteSize = Buffer.byteLength(text, "utf8");
      if (csvByteSize > CLIENT_FIXED_REPORT_MAX_CSV_BYTES) {
        throw fixedReportError(
          "CLIENT_FIXED_REPORT_CSV_TOO_LARGE",
          "fixed report CSV exceeds the byte budget",
        );
      }
      return Object.freeze({
        report_id: definition.report_id,
        title: definition.title,
        columns: definition.columns,
        rows,
        row_count: rows.length,
        source_status: verified.payload.source_status,
        snapshot_version: verified.payload.ver,
        as_of: verified.payload.as_of,
        csv_text: text,
        csv_sha256: sha256(text),
        csv_byte_size: csvByteSize,
        mime_type: "text/csv; charset=utf-8",
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        formula_injection_escaped: true,
        raw_bank_source_included: false,
        raw_source_payload_included: false,
        contact_pii_included: false,
        internal_ids_included: false,
        production_ready_claim: false,
      });
    },
  });
}
