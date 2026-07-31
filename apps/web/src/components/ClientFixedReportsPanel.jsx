import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildClientFixedReportsModel,
  selectClientFixedReport,
} from "./ClientFixedReportsModel.js";
import { Panel } from "./primitives.jsx";

const REPORT_HINTS = Object.freeze({
  monthly_deposit_revenue: "최근 12개월",
  inquiry_status: "상태 6개",
  revenue_ranking: "최대 10개",
  receivables_ranking: "최대 10개",
});

const REPORT_TABLE_MIN_WIDTHS = Object.freeze({
  revenue_ranking: 840,
  receivables_ranking: 1020,
});

const KRW_AMOUNT_COLUMNS = new Set([
  "amount",
  "net_deposit_revenue",
  "matched_inflow_amount",
  "linked_refund_amount",
  "agreed_amount",
  "active_allocated_amount",
  "receivable_amount",
]);

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR");

const STATE_COPY = Object.freeze({
  loading: Object.freeze({
    title: "리포트를 불러오는 중입니다.",
    detail: "잠시만 기다려 주세요.",
  }),
  empty: Object.freeze({
    title: "표시할 자료가 없습니다.",
    detail: "현재 조회 기준에 해당하는 행이 없습니다.",
  }),
  denied: Object.freeze({
    title: "리포트 조회 권한이 없습니다.",
    detail: "권한 밖 건수와 금액은 표시하지 않습니다.",
  }),
  review_required: Object.freeze({
    title: "리포트 확인이 필요합니다.",
    detail: "담당자 확인 후 다시 불러와 주세요.",
  }),
  partial: Object.freeze({
    title: "확인된 자료만 표시합니다.",
    detail: "누락된 값을 0으로 바꾸지 않았습니다.",
  }),
  error: Object.freeze({
    title: "리포트를 불러오지 못했습니다.",
    detail: "잠시 후 다시 시도해 주세요.",
  }),
});

const STALE_EXPORT_CODES = new Set([
  "CLIENT_FIXED_REPORT_SNAPSHOT_EXPIRED",
  "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID",
  "CLIENT_FIXED_REPORT_SNAPSHOT_REQUIRED",
]);

const DENIED_EXPORT_CODES = new Set([
  "CLIENT_FIXED_REPORT_EXPORT_DENIED",
  "CLIENT_FIXED_REPORT_SOURCE_DENIED",
]);

function resultField(value, camel, snake) {
  if (value && Object.prototype.hasOwnProperty.call(value, camel)) {
    return value[camel];
  }
  return value?.[snake];
}

function safeErrorCodes(result) {
  const value = resultField(result, "safeErrorCodes", "safe_error_codes");
  return Array.isArray(value)
    ? value.filter((code) => typeof code === "string")
    : [];
}

function hasAuditReceipt(result) {
  const audit = resultField(result, "auditEvent", "audit_event");
  return Boolean(
    audit
    && typeof audit === "object"
    && typeof resultField(audit, "eventId", "event_id") === "string",
  ) || resultField(result, "auditRecorded", "audit_recorded") === true;
}

function exportFeedback(result) {
  const codes = safeErrorCodes(result);
  const uiState = resultField(result, "uiState", "ui_state");
  const outcome = result?.outcome;
  const partial = uiState === "partial" || outcome === "partial";
  const audited = hasAuditReceipt(result);
  const auditCopy = audited ? " 서버 감사 기록도 확인했습니다." : "";

  if (codes.some((code) => STALE_EXPORT_CODES.has(code))) {
    return {
      state: "stale",
      message: "화면 기준이 바뀌었거나 유효 시간이 지났습니다. 리포트를 다시 불러와 주세요.",
    };
  }
  if (
    uiState === "denied"
    || outcome === "denied"
    || codes.some((code) => DENIED_EXPORT_CODES.has(code))
  ) {
    return {
      state: "denied",
      message: `CSV 내보내기 권한이 없습니다. 화면 조회 권한은 바뀌지 않았습니다.${auditCopy}`,
    };
  }
  if (
    outcome === "idempotent_replay"
    || resultField(result, "idempotentReplay", "idempotent_replay") === true
  ) {
    return {
      state: "replay",
      message: `${partial ? "이전에 만든 같은 부분 자료 CSV를" : "이전에 만든 같은 CSV를"} 다시 확인했습니다.${auditCopy}`,
    };
  }
  if (
    result?.kind === "data"
    || ["created", "passed", "partial"].includes(outcome)
  ) {
    return {
      state: "success",
      message: `${partial ? "부분 자료 CSV가 준비되었습니다." : "CSV가 준비되었습니다."}${auditCopy}`,
    };
  }
  return {
    state: "error",
    message: "CSV를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  };
}

function ReportNotice({ state, onRetry }) {
  const copy = STATE_COPY[state] ?? STATE_COPY.error;
  const retryable = ["review_required", "error"].includes(state)
    && typeof onRetry === "function";
  return (
    <div
      className={`live-data-state live-data-${state === "error" ? "error" : state}`}
      data-client-fixed-report-notice={state}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <strong>{copy.title}</strong>
      {copy.detail ? <span>{copy.detail}</span> : null}
      {retryable ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          다시 불러오기
        </button>
      ) : null}
    </div>
  );
}

function ReportTable({ report }) {
  return (
    <div
      className="data-table-wrap"
      data-client-fixed-report-table={report.id}
      style={{ overflowX: "auto" }}
    >
      <table
        className="data-table"
        style={{ minWidth: REPORT_TABLE_MIN_WIDTHS[report.id] }}
      >
        <caption className="sr-only">{report.title} 현재 화면 자료</caption>
        <thead>
          <tr>
            {report.columns.map(({ key, label }) => (
              <th key={key} scope="col">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.screenRows.map((row, rowIndex) => (
            <tr key={`${report.id}-${rowIndex}`}>
              {report.columns.map(({ key }, columnIndex) => {
                const value = row[key];
                const rawContent = value === null || value === undefined
                  ? ""
                  : String(value);
                const content = KRW_AMOUNT_COLUMNS.has(key)
                  && typeof value === "number"
                  ? `${KRW_FORMATTER.format(value)}원`
                  : rawContent;
                return (
                  <td
                    key={key}
                    aria-label={content || "값 없음"}
                    data-client-fixed-report-cell={key}
                    data-raw-value={rawContent}
                  >
                    {columnIndex === 0 ? <strong>{content}</strong> : content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportNotice({ feedback }) {
  if (!feedback) return null;
  const failure = ["denied", "stale", "error"].includes(feedback.state);
  return (
    <div
      className={`client-command-state${failure ? " error" : " success"}`}
      data-client-fixed-report-export-state={feedback.state}
      role={failure ? "alert" : "status"}
      aria-live="polite"
    >
      {feedback.message}
    </div>
  );
}

export function ClientFixedReportsPanel({
  result,
  selectedReportId: controlledReportId,
  actions = {},
}) {
  const model = useMemo(
    () => buildClientFixedReportsModel(result),
    [result],
  );
  const [localReportId, setLocalReportId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const tabs = useRef([]);
  const exportRun = useRef(0);
  const controlled = controlledReportId !== undefined;
  const selectedReportId = controlled ? controlledReportId : localReportId;
  const report = selectClientFixedReport(model, selectedReportId);
  const selectedReportIdRef = useRef(selectedReportId);
  const exportRequestRef = useRef(report?.exportRequest ?? null);
  selectedReportIdRef.current = selectedReportId;
  exportRequestRef.current = report?.exportRequest ?? null;

  useEffect(() => {
    exportRun.current += 1;
    setFeedback(null);
  }, [selectedReportId, report?.exportRequest]);

  function selectReport(reportId) {
    exportRun.current += 1;
    setFeedback(null);
    if (!controlled) setLocalReportId(reportId);
    actions.onSelectReport?.(reportId);
  }

  function moveTabFocus(event, index) {
    let nextIndex = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % model.reports.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + model.reports.length) % model.reports.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = model.reports.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    tabs.current[nextIndex]?.focus();
  }

  async function exportCsv() {
    const request = report?.exportRequest;
    if (
      !request
      || !["data", "partial"].includes(report.state)
      || typeof actions.onExportCsv !== "function"
    ) return;
    const run = ++exportRun.current;
    setFeedback({
      state: "pending",
      message: "CSV를 만드는 중입니다.",
    });
    try {
      const next = await actions.onExportCsv(request);
      if (
        run !== exportRun.current
        || selectedReportIdRef.current !== report.id
        || exportRequestRef.current !== request
      ) return;
      setFeedback(exportFeedback(next));
    } catch {
      if (run === exportRun.current) {
        setFeedback({
          state: "error",
          message: "CSV를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      }
    }
  }

  function printReport() {
    if (!report || !["data", "partial"].includes(report.state)) return;
    if (typeof actions.onPrint === "function") {
      actions.onPrint(report);
      return;
    }
    globalThis.window?.print?.();
  }

  const selectedIndex = model.reports.findIndex(
    ({ id }) => id === selectedReportId,
  );
  const exportPending = feedback?.state === "pending";
  const canExport = Boolean(
    report
    && ["data", "partial"].includes(report.state)
    && report.exportRequest
    && typeof actions.onExportCsv === "function",
  );
  const canPrint = Boolean(
    report && ["data", "partial"].includes(report.state),
  );

  return (
    <Panel
      title="고정 리포트"
      meta="4종"
      className="client-fixed-reports-panel"
      data-client-fixed-reports-panel="true"
      data-client-fixed-reports-selection={selectedReportId ?? "none"}
    >
      <div className="workspace-mini-grid">
        <p className="subtle-text">
          리포트를 선택하면 화면에 보이는 내용과 같은 자료로 CSV를 만듭니다.
        </p>
        <div
          className="client-consultation-tabs"
          role="tablist"
          aria-label="고정 리포트 선택"
          aria-orientation="horizontal"
        >
          {model.reports.map((item, index) => {
            const selected = item.id === selectedReportId;
            return (
              <button
                key={item.id}
                ref={(node) => { tabs.current[index] = node; }}
                id={`client-fixed-report-tab-${item.id}`}
                type="button"
                role="tab"
                className={selected ? "active" : ""}
                aria-selected={selected}
                aria-controls="client-fixed-report-panel"
                tabIndex={selectedIndex >= 0 ? (selected ? 0 : -1) : (index === 0 ? 0 : -1)}
                onClick={() => selectReport(item.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        {!report ? (
          <div
            className="live-data-state"
            data-client-fixed-report-selection-empty="true"
            role="status"
          >
            <strong>확인할 리포트를 선택하세요.</strong>
            <span>위 목록에서 리포트 하나를 선택할 수 있습니다.</span>
          </div>
        ) : (
          <section
            id="client-fixed-report-panel"
            role="tabpanel"
            aria-labelledby={`client-fixed-report-tab-${report.id}`}
            tabIndex={0}
            data-client-fixed-report={report.id}
            data-client-fixed-report-state={report.state}
          >
            <div className="workspace-mini-grid">
              <div className="record-action-strip">
                <div>
                  <strong>{report.title}</strong>
                  <span>{REPORT_HINTS[report.id]} · 현재 화면 기준</span>
                </div>
                <div className="record-action-button-group">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!canPrint}
                    onClick={printReport}
                  >
                    인쇄
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!canExport || exportPending}
                    onClick={exportCsv}
                  >
                    {exportPending ? "만드는 중" : "CSV 내보내기"}
                  </button>
                </div>
              </div>

              <ExportNotice feedback={feedback} />

              {report.state === "partial" ? (
                <>
                  <ReportNotice state="partial" />
                  <ReportTable key={report.id} report={report} />
                </>
              ) : report.state === "data" ? (
                <ReportTable key={report.id} report={report} />
              ) : (
                <ReportNotice
                  state={report.state}
                  onRetry={typeof actions.onRetry === "function"
                    ? () => actions.onRetry(report.id)
                    : null}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </Panel>
  );
}
