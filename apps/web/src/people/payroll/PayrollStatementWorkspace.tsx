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
  revokeHrxPayrollStatement,
  safeHrxStepUpPurpose,
} from "../hrxApiClient.ts";
import type { HrxStepUpPurpose } from "../hrxApiClient.ts";
import {
  safePeopleLabel,
  UNRESOLVED_EMPLOYEE_LABEL,
} from "../peoplePresentation.ts";

type Row = Record<string, unknown>;

type StatementRetryAction =
  | { kind: "load"; runId: string }
  | { kind: "generate"; runId: string }
  | { kind: "deliver"; runId: string; channel: "email" | "message" | "self_service" }
  | { kind: "export"; runId: string; format: "csv" | "xlsx" }
  | { kind: "download"; statement: Row }
  | { kind: "revoke"; statementId: string };

type StatementStepUp = {
  purpose: HrxStepUpPurpose;
  retry: StatementRetryAction;
};

function text(row: Row | null | undefined, field: string) {
  const value = row?.[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function records(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function number(row: Row | null | undefined, field: string) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
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
  return ({ generated: "생성 완료", delivered: "전달 완료", viewed: "열람", revoked: "철회" } as Record<string, string>)[value] ?? value;
}

function channelReceipt(statement: Row, channel: string) {
  return records(statement.delivery_receipts).find((receipt) => text(receipt, "channel") === channel) ?? null;
}

function deliveryStatus(statement: Row, channel: string) {
  if (text(statement, "state") === "revoked") return "철회";
  const receipt = channelReceipt(statement, channel);
  if (!receipt) return "생성 완료";
  return ({
    sent: "발송 접수",
    delivered: "도달",
    read: "열람",
    failed: "발송 실패",
    unknown: "결과 확인 중",
    queued: number(receipt, "attempt_count") > 0 ? "발송 요청" : "생성 완료",
  } as Record<string, string>)[text(receipt, "provider_result_state")] ?? statementStatus(text(statement, "state"));
}

function deliveryAttemptLabel(statement: Row, channel: string) {
  const attempts = number(channelReceipt(statement, channel), "attempt_count");
  return attempts > 0 ? `${attempts}회 시도` : "";
}

function authoritativeDisplayName(employee: Row) {
  const employeeId = text(employee, "employee_id").trim();
  return safePeopleLabel(employee.display_name, { identifiers: [employeeId] });
}

function employeeLabel(names: Map<string, string>, statement: Row, selfOnly: boolean) {
  const displayName = names.get(text(statement, "employee_id"))?.trim();
  return displayName || (selfOnly ? "내 명세서" : UNRESOLVED_EMPLOYEE_LABEL);
}

export function PayrollStatementWorkspace({
  providerDeliveryEnabled = false,
}: {
  providerDeliveryEnabled?: boolean;
}) {
  const [periods, setPeriods] = useState<Row[]>([]);
  const [runId, setRunId] = useState("");
  const [statements, setStatements] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [selfOnly, setSelfOnly] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "message" | "self_service">("self_service");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState<StatementStepUp | null>(null);
  const [revokeTargetId, setRevokeTargetId] = useState("");

  const runs = useMemo(() => periods.flatMap((period) => records(period.runs).map((run) => ({ ...run, period_code: text(period, "period_code") }))).filter((run) => text(run, "status") === "closed"), [periods]);
  const currentRun = runs.find((run) => text(run, "run_id") === runId) ?? runs[0] ?? null;
  const names = useMemo(() => new Map(employees.map((employee) => [text(employee, "employee_id"), authoritativeDisplayName(employee)])), [employees]);
  const failedDeliveryCount = statements.filter((statement) => text(channelReceipt(statement, deliveryChannel), "provider_result_state") === "failed").length;

  function queueStepUp(result: { kind: string; requiredPurpose?: unknown }, retry: StatementRetryAction) {
    if (result.kind !== "step_up_required") return false;
    const purpose = safeHrxStepUpPurpose(result.requiredPurpose);
    if (!purpose) {
      setError("추가 확인 목적을 확인하지 못했습니다. 새로고침한 뒤 다시 시도하세요.");
      return true;
    }
    setStepUp({ purpose, retry });
    return true;
  }

  async function load(preferredRunId = runId) {
    setError("");
    setStepUp(null);
    const workspaceResult = await fetchHrxPayrollWorkspace();
    if (queueStepUp(workspaceResult, { kind: "load", runId: preferredRunId })) return;
    if (workspaceResult.kind !== "data") {
      const selfResult = await fetchHrxPayrollStatementsSelf();
      if (queueStepUp(selfResult, { kind: "load", runId: preferredRunId })) return;
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
    if (queueStepUp(statementResult, { kind: "load", runId: nextRunId })) return;
    if (queueStepUp(runResult, { kind: "load", runId: nextRunId })) return;
    if (statementResult.kind !== "data" || runResult.kind !== "data") {
      setError("급여명세서를 불러오지 못했습니다.");
      return;
    }
    setStatements(records(statementResult.statements));
    setEmployees(records((runResult.bundle as Row).employees));
  }

  useEffect(() => { void load(""); }, []);

  async function generate(targetRunId = runId) {
    if (!targetRunId) return;
    setBusy("generate");
    const result = await generateHrxPayrollStatements(targetRunId);
    setBusy("");
    if (queueStepUp(result, { kind: "generate", runId: targetRunId })) return;
    if (result.kind !== "data") setError("급여명세서를 생성하지 못했습니다.");
    else await load(targetRunId);
  }

  async function deliver(channel: "email" | "message" | "self_service", targetRunId = runId) {
    if (!targetRunId) return;
    setBusy(channel);
    const result = await deliverHrxPayrollStatements(targetRunId, channel);
    setBusy("");
    if (queueStepUp(result, { kind: "deliver", runId: targetRunId, channel })) return;
    if (result.kind !== "data") setError("급여명세서를 전달하지 못했습니다.");
    else await load(targetRunId);
  }

  async function exportRegister(format: "csv" | "xlsx", targetRunId = runId) {
    if (!targetRunId) return;
    setBusy(format);
    const result = await exportHrxPayrollRegister(targetRunId, format);
    setBusy("");
    if (queueStepUp(result, { kind: "export", runId: targetRunId, format })) return;
    if (result.kind !== "data") setError("급여대장을 내보내지 못했습니다.");
    else saveArtifact(result.artifact as Row);
  }

  async function download(statement: Row) {
    setBusy(text(statement, "statement_id"));
    const result = await readHrxPayrollStatement(text(statement, "statement_id"));
    setBusy("");
    if (queueStepUp(result, { kind: "download", statement })) return;
    if (result.kind !== "data") setError("급여명세서를 열지 못했습니다.");
    else {
      saveArtifact(result.artifact as Row);
      await load(runId);
    }
  }

  async function revoke(statementId = revokeTargetId) {
    if (!statementId) return;
    setBusy(`revoke:${statementId}`);
    const result = await revokeHrxPayrollStatement(statementId);
    setBusy("");
    if (queueStepUp(result, { kind: "revoke", statementId })) return;
    if (result.kind !== "data") setError("급여명세서를 철회하지 못했습니다.");
    else {
      setRevokeTargetId("");
      await load(runId);
    }
  }

  async function retryAfterStepUp() {
    if (!stepUp) return;
    const retry = stepUp.retry;
    setStepUp(null);
    if (retry.kind === "load") return load(retry.runId);
    if (retry.kind === "generate") return generate(retry.runId);
    if (retry.kind === "deliver") return deliver(retry.channel, retry.runId);
    if (retry.kind === "export") return exportRegister(retry.format, retry.runId);
    if (retry.kind === "download") return download(retry.statement);
    setRevokeTargetId(retry.statementId);
    return revoke(retry.statementId);
  }

  return (
    <Panel id="people-pay-statement" className="people-panel span-2 payroll-statement-workspace" title="급여명세서" meta={`${statements.length}건`}>
      {stepUp && <HrxStepUpChallenge purpose={stepUp.purpose} onVerified={() => void retryAfterStepUp()} />}
      {!selfOnly && (
        <div className="payroll-toolbar payroll-statement-toolbar">
          <label><span>급여기간</span><select value={runId} onChange={(event) => void load(event.target.value)}>{runs.map((run) => <option key={text(run, "run_id")} value={text(run, "run_id")}>{text(run, "period_code")}</option>)}</select></label>
          <div className="payroll-toolbar-actions">
            <button className="secondary-button" type="button" onClick={() => void load(runId)}><RefreshCw size={14} />새로고침</button>
            <button className="secondary-button" type="button" onClick={() => void exportRegister("csv")} disabled={!runId || Boolean(busy)}>CSV</button>
            <button className="secondary-button" type="button" onClick={() => void exportRegister("xlsx")} disabled={!runId || Boolean(busy)}>XLSX</button>
            <label className="payroll-delivery-channel"><span>전달 방법</span><select value={deliveryChannel} onChange={(event) => setDeliveryChannel(event.target.value as "email" | "message" | "self_service")}><option value="self_service">내 명세서함</option><option value="email" disabled={!providerDeliveryEnabled}>이메일{providerDeliveryEnabled ? "" : " (연결 필요)"}</option><option value="message" disabled={!providerDeliveryEnabled}>메시지{providerDeliveryEnabled ? "" : " (연결 필요)"}</option></select></label>
            <button className="secondary-button" type="button" onClick={() => void deliver(deliveryChannel)} disabled={!statements.length || Boolean(busy)}>{busy === deliveryChannel ? "처리 중" : failedDeliveryCount ? "실패 건 재처리" : deliveryChannel === "self_service" ? "명세서함에 게시" : "발송 요청"}</button>
            <button className="primary-button" type="button" onClick={() => void generate()} disabled={!runId || Boolean(busy)}>{busy === "generate" ? "처리 중" : "명세서 생성"}</button>
          </div>
        </div>
      )}
      {!selfOnly && !providerDeliveryEnabled && <p className="payroll-provider-note">이메일·메시지 전달 서비스가 연결되지 않았습니다. 내 명세서함 게시는 계속 사용할 수 있습니다.</p>}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {revokeTargetId && (
        <div className="payroll-confirm-bar" role="alertdialog" aria-label="급여명세서 철회 확인">
          <strong>급여명세서 철회</strong>
          <span>철회하면 LawOS 명세서함에서 더 이상 열 수 없습니다. 이미 이메일·메시지로 전달된 파일은 회수되지 않습니다.</span>
          <div>
            <button className="secondary-button" type="button" onClick={() => setRevokeTargetId("")}>취소</button>
            <button className="primary-button" type="button" onClick={() => void revoke()} disabled={busy === `revoke:${revokeTargetId}`}>{busy === `revoke:${revokeTargetId}` ? "처리 중" : "철회 확인"}</button>
          </div>
        </div>
      )}
      {statements.length ? (
        <div className="data-table-wrap payroll-table-wrap">
          <table className={`data-table payroll-statement-table${selfOnly ? " payroll-statement-self-table" : ""}`}><thead><tr><th>구성원</th><th>명세서</th><th>{selfOnly ? "확인 상태" : "전달 상태"}</th><th>생성일</th><th>전달일</th><th>열람일</th><th aria-label="작업" /></tr></thead>
            <tbody>{statements.map((statement) => {
              const employeeName = employeeLabel(names, statement, selfOnly);
              const receipt = channelReceipt(statement, deliveryChannel);
              const attemptLabel = deliveryAttemptLabel(statement, deliveryChannel);
              const deliveredAt = text(receipt, "delivered_at") || (selfOnly ? text(statement, "delivered_at") : "");
              const viewedAt = text(receipt, "viewed_at") || (selfOnly ? text(statement, "viewed_at") : "");
              return (
                <tr key={text(statement, "statement_id")} data-payroll-statement={text(statement, "employee_id")}>
                  <td>{employeeName}</td>
                  <td>{statementStatus(text(statement, "state"))}</td>
                  <td>
                    <div className="payroll-delivery-state">
                      <span className={`payroll-provider-state ${text(receipt, "provider_result_state")}`}>{deliveryStatus(statement, deliveryChannel)}</span>
                      {!selfOnly && attemptLabel && <small>{attemptLabel}</small>}
                    </div>
                  </td>
                  <td>{text(statement, "generated_at").slice(0, 10)}</td>
                  <td>{deliveredAt.slice(0, 10) || "-"}</td>
                  <td>{viewedAt.slice(0, 10) || "-"}</td>
                  <td>
                    <div className="payroll-statement-actions">
                      {selfOnly && text(statement, "state") !== "revoked" && <button className="icon-button" type="button" aria-label="급여명세서 다운로드" onClick={() => void download(statement)} disabled={busy === text(statement, "statement_id")}><Download size={16} /></button>}
                      {!selfOnly && text(statement, "state") !== "revoked" && <button className="secondary-button" type="button" aria-label={`${employeeName} 급여명세서 철회`} onClick={() => setRevokeTargetId(text(statement, "statement_id"))}>철회</button>}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <div className="live-data-state live-data-empty">{selfOnly ? "급여명세서가 없습니다." : currentRun ? "생성된 명세서가 없습니다." : "마감된 급여가 없습니다."}</div>}
    </Panel>
  );
}
