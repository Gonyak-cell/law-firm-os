import React, { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  deliverHrxPayrollStatements,
  exportHrxPayrollRegister,
  fetchHrxPayrollRun,
  fetchHrxPayrollStatements,
  fetchHrxPayrollStatementsSelf,
  fetchHrxPayrollWorkspace,
  generateHrxPayrollStatements,
  readHrxPayrollStatement,
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function records(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function saveArtifact(artifact: Row) {
  const bytes = Uint8Array.from(atob(text(artifact, "content_base64")), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: text(artifact, "mime_type") || "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = text(artifact, "filename") || "payroll-artifact";
  anchor.click();
  URL.revokeObjectURL(url);
}

function statementStatus(value: string) {
  return ({ generated: "생성", delivered: "전달", viewed: "열람", revoked: "철회" } as Record<string, string>)[value] ?? value;
}

export function PayrollStatementWorkspace() {
  const [periods, setPeriods] = useState<Row[]>([]);
  const [runId, setRunId] = useState("");
  const [statements, setStatements] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [selfOnly, setSelfOnly] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "message" | "self_service">("self_service");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState(false);

  const runs = useMemo(() => periods.flatMap((period) => records(period.runs).map((run) => ({ ...run, period_code: text(period, "period_code") }))).filter((run) => text(run, "status") === "closed"), [periods]);
  const currentRun = runs.find((run) => text(run, "run_id") === runId) ?? runs[0] ?? null;
  const names = useMemo(() => new Map(employees.map((employee) => [text(employee, "employee_id"), text(employee, "display_name")])), [employees]);

  async function load(preferredRunId = runId) {
    setError("");
    setStepUp(false);
    const workspaceResult = await fetchHrxPayrollWorkspace();
    if (workspaceResult.kind === "step_up_required") {
      setStepUp(true);
      return;
    }
    if (workspaceResult.kind !== "data") {
      const selfResult = await fetchHrxPayrollStatementsSelf();
      if (selfResult.kind === "step_up_required") {
        setStepUp(true);
        return;
      }
      if (selfResult.kind !== "data") {
        setError("급여명세서를 불러오지 못했습니다.");
        return;
      }
      setSelfOnly(true);
      setStatements(records(selfResult.statements));
      return;
    }
    const nextPeriods = records((workspaceResult.workspace as Row).periods);
    const closedRuns = nextPeriods.flatMap((period) => records(period.runs)).filter((run) => text(run, "status") === "closed");
    const nextRunId = closedRuns.some((run) => text(run, "run_id") === preferredRunId) ? preferredRunId : text(closedRuns[0], "run_id");
    setSelfOnly(false);
    setPeriods(nextPeriods);
    setRunId(nextRunId);
    if (!nextRunId) {
      setStatements([]);
      setEmployees([]);
      return;
    }
    const [statementResult, runResult] = await Promise.all([fetchHrxPayrollStatements(nextRunId), fetchHrxPayrollRun(nextRunId)]);
    if (statementResult.kind !== "data" || runResult.kind !== "data") {
      setError("급여명세서를 불러오지 못했습니다.");
      return;
    }
    setStatements(records(statementResult.statements));
    setEmployees(records((runResult.bundle as Row).employees));
  }

  useEffect(() => { void load(""); }, []);

  async function generate() {
    if (!runId) return;
    setBusy("generate");
    const result = await generateHrxPayrollStatements(runId);
    setBusy("");
    if (result.kind !== "data") setError("급여명세서를 생성하지 못했습니다.");
    else await load(runId);
  }

  async function deliver(channel: "email" | "message" | "self_service") {
    if (!runId) return;
    setBusy(channel);
    const result = await deliverHrxPayrollStatements(runId, channel);
    setBusy("");
    if (result.kind !== "data") setError("급여명세서를 전달하지 못했습니다.");
    else await load(runId);
  }

  async function exportRegister(format: "csv" | "xlsx") {
    if (!runId) return;
    setBusy(format);
    const result = await exportHrxPayrollRegister(runId, format);
    setBusy("");
    if (result.kind !== "data") setError("급여대장을 내보내지 못했습니다.");
    else saveArtifact(result.artifact as Row);
  }

  async function download(statement: Row) {
    setBusy(text(statement, "statement_id"));
    const result = await readHrxPayrollStatement(text(statement, "statement_id"));
    setBusy("");
    if (result.kind !== "data") setError("급여명세서를 열지 못했습니다.");
    else {
      saveArtifact(result.artifact as Row);
      await load(runId);
    }
  }

  return (
    <Panel id="people-pay-statement" className="people-panel span-2 payroll-statement-workspace" title="급여명세서" meta={`${statements.length}건`}>
      {stepUp && <HrxStepUpChallenge purpose="payroll_export_review" onVerified={() => void load(runId)} />}
      {!selfOnly && (
        <div className="payroll-toolbar payroll-statement-toolbar">
          <label><span>급여기간</span><select value={runId} onChange={(event) => void load(event.target.value)}>{runs.map((run) => <option key={text(run, "run_id")} value={text(run, "run_id")}>{text(run, "period_code")}</option>)}</select></label>
          <div className="payroll-toolbar-actions">
            <button className="secondary-button" type="button" onClick={() => void load(runId)}><RefreshCw size={14} />새로고침</button>
            <button className="secondary-button" type="button" onClick={() => void exportRegister("csv")} disabled={!runId || Boolean(busy)}>CSV</button>
            <button className="secondary-button" type="button" onClick={() => void exportRegister("xlsx")} disabled={!runId || Boolean(busy)}>XLSX</button>
            <label className="payroll-delivery-channel"><span>전달</span><select value={deliveryChannel} onChange={(event) => setDeliveryChannel(event.target.value as "email" | "message" | "self_service")}><option value="self_service">보관함</option><option value="email">이메일</option><option value="message">메시지</option></select></label>
            <button className="secondary-button" type="button" onClick={() => void deliver(deliveryChannel)} disabled={!statements.length || Boolean(busy)}>{busy === deliveryChannel ? "처리 중" : "전달"}</button>
            <button className="primary-button" type="button" onClick={() => void generate()} disabled={!runId || Boolean(busy)}>{busy === "generate" ? "처리 중" : "명세서 생성"}</button>
          </div>
        </div>
      )}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {statements.length ? (
        <div className="data-table-wrap payroll-table-wrap">
          <table className="data-table payroll-statement-table"><thead><tr><th>구성원</th><th>상태</th><th>생성일</th><th>전달일</th><th>열람일</th><th aria-label="작업" /></tr></thead>
            <tbody>{statements.map((statement) => <tr key={text(statement, "statement_id")}><td>{names.get(text(statement, "employee_id")) || (selfOnly ? "내 명세서" : text(statement, "employee_id"))}</td><td>{statementStatus(text(statement, "state"))}</td><td>{text(statement, "generated_at").slice(0, 10)}</td><td>{text(statement, "delivered_at").slice(0, 10) || "-"}</td><td>{text(statement, "viewed_at").slice(0, 10) || "-"}</td><td><button className="icon-button" type="button" aria-label="급여명세서 다운로드" onClick={() => void download(statement)} disabled={busy === text(statement, "statement_id")}><Download size={16} /></button></td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="live-data-state live-data-empty">{selfOnly ? "급여명세서가 없습니다." : currentRun ? "생성된 명세서가 없습니다." : "마감된 급여가 없습니다."}</div>}
    </Panel>
  );
}
