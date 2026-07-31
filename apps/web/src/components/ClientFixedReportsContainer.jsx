import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildClientFixedReportsModel,
  selectClientFixedReport,
} from "./ClientFixedReportsModel.js";
import { ClientFixedReportsPanel } from "./ClientFixedReportsPanel.jsx";

const REPORT_IDS = Object.freeze([
  "monthly_deposit_revenue",
  "inquiry_status",
  "revenue_ranking",
  "receivables_ranking",
]);
const MAX_CSV_BYTES = 16 * 1024;

function unavailableRead() {
  return Promise.resolve({ kind: "error", uiState: "error" });
}

function unavailableExport() {
  return Promise.resolve({ kind: "error", uiState: "error" });
}

function field(value, camel, snake) {
  if (value && Object.prototype.hasOwnProperty.call(value, camel)) {
    return value[camel];
  }
  return value?.[snake];
}

function selectedReportId(value) {
  return REPORT_IDS.includes(value) ? value : REPORT_IDS[0];
}

function stableExportKey(cache, request, ctx) {
  const fingerprint = JSON.stringify({ ctx, ...request });
  if (cache.has(fingerprint)) return cache.get(fingerprint);
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    ?? `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const key = `client_fixed_report_export:${suffix}`.slice(0, 128);
  cache.set(fingerprint, key);
  if (cache.size > 32) cache.delete(cache.keys().next().value);
  return key;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exportRoute(ctx, reportId, request) {
  return JSON.stringify({ ctx, reportId, request });
}

async function sha256(value) {
  const digest = await globalThis.crypto?.subtle?.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  if (!digest) return null;
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function safeCsv(result, request, report) {
  const item = result?.item;
  const csvText = field(item, "csvText", "csv_text");
  const csvBytes = field(item, "csvByteSize", "csv_byte_size");
  const csvSha256 = field(item, "csvSha256", "csv_sha256");
  const mimeType = field(item, "mimeType", "mime_type");
  const replay = field(result, "idempotentReplay", "idempotent_replay") === true;
  const partial = result?.outcome === "partial"
    || field(result, "uiState", "ui_state") === "partial"
    || field(item, "sourceStatus", "source_status") === "partial";
  const status = result?.status;
  const audit = field(result, "auditEvent", "audit_event");
  const safeErrorCodes = field(
    result,
    "safeErrorCodes",
    "safe_error_codes",
  );

  if (
    result?.kind !== "data"
    || !["created", "idempotent_replay", "partial"].includes(result.outcome)
    || (!replay && !["created", "partial"].includes(result.outcome))
    || (replay && !["idempotent_replay", "partial"].includes(result.outcome))
    || !Array.isArray(safeErrorCodes)
    || safeErrorCodes.length !== 0
    || (status !== undefined && status !== (replay ? 200 : 201))
    || field(result, "idempotentReplay", "idempotent_replay") !== replay
    || (partial && field(result, "uiState", "ui_state") !== "partial")
    || (!partial && field(result, "uiState", "ui_state") !== undefined
      && field(result, "uiState", "ui_state") !== null)
    || field(item, "sourceStatus", "source_status") !== (partial ? "partial" : "available")
    || !item
    || field(item, "reportId", "report_id") !== request.reportId
    || field(item, "snapshotVersion", "snapshot_version")
      !== request.snapshotVersion
    || !jsonEqual(item.columns, report.columns)
    || !jsonEqual(item.rows, report.screenRows)
    || field(item, "rowCount", "row_count") !== report.screenRows.length
    || typeof csvText !== "string"
    || csvText.length === 0
    || !Number.isSafeInteger(csvBytes)
    || csvBytes < 1
    || csvBytes > MAX_CSV_BYTES
    || new TextEncoder().encode(csvText).byteLength !== csvBytes
    || typeof csvSha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(csvSha256)
    || mimeType !== "text/csv; charset=utf-8"
    || field(result, "countLeakPrevented", "count_leak_prevented") !== true
    || field(result, "rawSqlIncluded", "raw_sql_included") !== false
    || field(result, "rawQueryPayloadIncluded", "raw_query_payload_included") !== false
    || field(result, "sourcePayloadIncluded", "source_payload_included") !== false
    || field(result, "productionReadyClaim", "production_ready_claim") !== false
    || field(item, "permissionPrefilterApplied", "permission_prefilter_applied") !== true
    || field(item, "countLeakPrevented", "count_leak_prevented") !== true
    || field(item, "formulaInjectionEscaped", "formula_injection_escaped") !== true
    || field(item, "rawBankSourceIncluded", "raw_bank_source_included") !== false
    || field(item, "rawSourcePayloadIncluded", "raw_source_payload_included") !== false
    || field(item, "contactPiiIncluded", "contact_pii_included") !== false
    || field(item, "internalIdsIncluded", "internal_ids_included") !== false
    || field(item, "productionReadyClaim", "production_ready_claim") !== false
    || typeof field(audit, "eventId", "event_id") !== "string"
    || field(audit, "eventId", "event_id").length === 0
    || field(audit, "decision", "decision") !== (replay ? "replay" : "allow")
    || field(audit, "tenantAuthority", "tenant_authority") !== "signed_session"
    || field(audit, "actorIdIncluded", "actor_id_included") !== false
    || field(audit, "tenantIdIncluded", "tenant_id_included") !== false
    || field(audit, "rawRowsIncluded", "raw_rows_included") !== false
    || field(audit, "sourceValuesIncluded", "source_values_included") !== false
    || field(audit, "productionReadyClaim", "production_ready_claim") !== false
  ) return null;

  return await sha256(csvText) === csvSha256
    ? { csvText, mimeType }
    : null;
}

function downloadCsv({ csvText, mimeType }, reportId) {
  if (
    typeof document === "undefined"
    || typeof globalThis.URL?.createObjectURL !== "function"
  ) throw new Error("CSV download is unavailable");
  const url = globalThis.URL.createObjectURL(
    new Blob([csvText], { type: mimeType }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `client-${reportId}.csv`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 0);
}

export function ClientFixedReportsContainer({
  ctx = "allow",
  initialReportId = REPORT_IDS[0],
  readReport = unavailableRead,
  exportReport = unavailableExport,
  printReport,
}) {
  const [reportId, setReportId] = useState(() => (
    selectedReportId(initialReportId)
  ));
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const readGeneration = useRef(0);
  const exportKeys = useRef(new Map());
  const exportGeneration = useRef(0);
  const activeExportRoute = useRef(null);

  useEffect(() => {
    const generation = ++readGeneration.current;
    let active = true;
    setResult(null);
    Promise.resolve()
      .then(() => readReport({ reportId, ctx }))
      .then((next) => {
        if (active && generation === readGeneration.current) {
          setResult(next);
        }
      })
      .catch(() => {
        if (active && generation === readGeneration.current) {
          setResult({ kind: "error", uiState: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [ctx, readReport, refreshToken, reportId]);

  const report = useMemo(() => selectClientFixedReport(
    buildClientFixedReportsModel(result),
    reportId,
  ), [reportId, result]);
  const currentExportRoute = exportRoute(
    ctx,
    reportId,
    report?.exportRequest ?? null,
  );
  useLayoutEffect(() => {
    if (activeExportRoute.current !== currentExportRoute) {
      activeExportRoute.current = currentExportRoute;
      exportGeneration.current += 1;
    }
  }, [currentExportRoute]);

  async function exportCsv(request) {
    if (
      !report?.exportRequest
      || !jsonEqual(request, report.exportRequest)
    ) return { kind: "error", uiState: "error" };
    const route = activeExportRoute.current;
    const generation = ++exportGeneration.current;
    const stillCurrent = () => (
      generation === exportGeneration.current
      && route === activeExportRoute.current
    );
    const idempotencyKey = stableExportKey(
      exportKeys.current,
      request,
      ctx,
    );
    const next = await exportReport({
      ...request,
      ctx,
      idempotencyKey,
    });
    if (!stillCurrent()) return next;
    const csv = await safeCsv(next, request, report);
    if (!csv) {
      return ["created", "idempotent_replay"].includes(next?.outcome)
        ? {
            kind: "error",
            uiState: "error",
            safeErrorCodes: ["CLIENT_FIXED_REPORT_RESPONSE_INVALID"],
          }
        : next;
    }
    if (!stillCurrent()) return next;
    downloadCsv(csv, request.reportId);
    return next;
  }

  return (
    <div
      data-client-fixed-reports-container="true"
      data-client-fixed-reports-active={reportId}
    >
      <ClientFixedReportsPanel
        result={result}
        selectedReportId={reportId}
        actions={{
          onSelectReport(nextReportId) {
            if (
              REPORT_IDS.includes(nextReportId)
              && nextReportId !== reportId
            ) {
              exportGeneration.current += 1;
              setReportId(nextReportId);
            }
          },
          onRetry(nextReportId) {
            if (nextReportId === reportId) {
              exportGeneration.current += 1;
              setRefreshToken((value) => value + 1);
            }
          },
          onExportCsv: exportCsv,
          ...(typeof printReport === "function"
            ? { onPrint: printReport }
            : {}),
        }}
      />
    </div>
  );
}

export default ClientFixedReportsContainer;
