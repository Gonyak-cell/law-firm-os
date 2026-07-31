/// <reference path="../../react-jsx.d.ts" />
import React from "react";
import { useEffect, useState } from "react";
import { ClipboardCheck, Power } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  closeHrxOffboardingCase,
  fetchHrxLifecycleBoard,
  updateHrxOffboardingTask,
  updateHrxOnboardingTask
} from "../hrxApiClient.ts";

type LifecycleTask = {
  task_id: string;
  title?: string;
  owner_role?: string;
  status?: string;
  due_on?: string | null;
  required?: boolean;
  depends_on_task_ids?: string[];
  attempt_count?: number;
  last_failure_reason?: string | null;
};
type LifecycleTemplateRef = { template_id?: string; version?: string; role_key?: string };
type OperationalCloseBlocker = {
  code?: string;
  category?: string;
  subject_ref?: string;
};
type OperationalClose = {
  source_state?: string;
  ready?: boolean;
  blockers?: OperationalCloseBlocker[];
  evidence_count?: number;
};
type OnboardingPlan = {
  onboarding_id: string;
  employee_id?: string;
  employee_display_name?: string | null;
  start_date?: string;
  document_refs?: string[];
  template_ref?: LifecycleTemplateRef | null;
  tasks: LifecycleTask[];
};
type OffboardingCase = {
  offboarding_id: string;
  employee_id?: string;
  employee_display_name?: string | null;
  separation_date?: string;
  state?: string;
  template_ref?: LifecycleTemplateRef | null;
  tasks?: LifecycleTask[];
  access_revocations?: { revoked?: boolean; confirmation_ref?: string | null }[];
  document_returns?: { returned?: boolean }[];
  legal_hold_checks?: { clear?: boolean }[];
  matter_reassignments?: { reassigned?: boolean; reassigned_to_employee_id?: string | null }[];
  handover_items?: { completed?: boolean }[];
  operational_close?: OperationalClose | null;
};
type LifecycleResult = { kind: "data"; onboarding: OnboardingPlan[]; offboarding: OffboardingCase[] } | { kind: "error" } | null;

function readinessLabel(caseItem: OffboardingCase) {
  if (caseItem.operational_close?.ready === true) return "종료 가능";
  if (caseItem.operational_close?.source_state === "blocked") return "연결 확인 필요";
  if (caseItem.operational_close?.ready === false) return "처리 필요";
  const accessReady = caseItem.access_revocations?.every((item) => item.revoked === true && Boolean(item.confirmation_ref)) ?? false;
  const documentsReady = caseItem.document_returns?.every((item) => item.returned === true) ?? false;
  const holdsReady = caseItem.legal_hold_checks?.every((item) => item.clear === true) ?? false;
  const reassignmentReady = caseItem.matter_reassignments?.every((item) => item.reassigned === true && Boolean(item.reassigned_to_employee_id)) ?? true;
  const handoverReady = caseItem.handover_items?.every((item) => item.completed === true) ?? true;
  return accessReady && documentsReady && holdsReady && reassignmentReady && handoverReady ? "종료 가능" : "확인 필요";
}

function operationalBlockerLabel(blocker: OperationalCloseBlocker) {
  if (blocker.code === "active_matter_assignment") return "담당 사건 재배정 필요";
  if (blocker.code === "evidence_source_stale" || blocker.code === "evidence_expired") return "최신 처리 확인 필요";
  if (blocker.code === "self_confirmation") return "다른 담당자의 확인 필요";
  if (blocker.code === "matter_source_unavailable") return "Matter 연결 확인 필요";
  if (blocker.code === "offboarding_readiness_incomplete") return "필수 퇴사 절차 완료 필요";
  if (blocker.code?.startsWith("evidence_")) return "처리 확인 자료 필요";
  return "퇴사 절차 확인 필요";
}

function operationalSummary(caseItem: OffboardingCase) {
  const operational = caseItem.operational_close;
  if (!operational) return offboardingChecklistSummary(caseItem);
  if (caseItem.state === "closed") {
    return `퇴사 정리 완료. 처리 확인 ${operational.evidence_count ?? 0}건`;
  }
  if (operational.ready) {
    return `종료 전 확인 완료. 처리 확인 ${operational.evidence_count ?? 0}건`;
  }
  const labels = [...new Set((operational.blockers ?? []).map(operationalBlockerLabel))];
  return labels.slice(0, 2).join(" / ") || "퇴사 절차 확인 필요";
}

function offboardingChecklistSummary(caseItem: OffboardingCase) {
  const accessReady = caseItem.access_revocations?.every((item) => item.revoked === true && Boolean(item.confirmation_ref)) ?? false;
  const reassignmentReady = caseItem.matter_reassignments?.every((item) => item.reassigned === true && Boolean(item.reassigned_to_employee_id)) ?? true;
  const handoverReady = caseItem.handover_items?.every((item) => item.completed === true) ?? true;
  return [
    accessReady ? "회수 확인 완료" : "회수 확인 필요",
    reassignmentReady ? "Matter 재배정 완료" : "Matter 재배정 필요",
    handoverReady ? "인수인계 완료" : "인수인계 필요"
  ].join(" / ");
}

function taskStatusLabel(value?: string) {
  if (value === "completed") return "완료";
  if (value === "closed") return "종료";
  if (value === "in_progress") return "진행 중";
  if (value === "failed") return "재시도 필요";
  if (value === "blocked") return "선행 업무 대기";
  return "대기";
}

function ownerRoleLabel(value?: string) {
  if (value === "manager") return "관리자";
  if (value === "hr") return "인사 담당";
  if (value === "people_ops") return "인사 담당";
  if (value === "it") return "IT 담당";
  if (value === "it_ops") return "IT 담당";
  if (value === "finance") return "청구 담당";
  return "담당자";
}

function taskTitleLabel(task: LifecycleTask) {
  if (task.task_id === "policy-ack") return "정책 확인";
  if (task.task_id === "access-provision") return "기본 접근 권한 설정";
  if (task.task_id === "task-001") return "입사 서류 확인";
  return /[가-힣]/.test(task.title ?? "") ? task.title : "업무 확인";
}

function onboardingLabel(index: number) {
  return index === 0 ? "입사 준비" : `입사 준비 ${index + 1}`;
}

function offboardingLabel(index: number) {
  return index === 0 ? "퇴사 정리" : `퇴사 정리 ${index + 1}`;
}

function employeeTargetLabel(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function documentSummary(refs: string[] = []) {
  if (refs.length === 0) return "없음";
  if (refs.length === 1) return "정책 문서";
  return `문서 ${refs.length}건`;
}

function templateLabel(ref?: LifecycleTemplateRef | null) {
  return ref?.version ? `기준 v${ref.version}` : "기준 확인 필요";
}

function dueLabel(value?: string | null) {
  if (!value) return "기한 미정";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "기한 확인";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function missingDependencies(planTasks: LifecycleTask[], task: LifecycleTask) {
  const completedIds = new Set(planTasks.filter((candidate) => candidate.status === "completed").map((candidate) => candidate.task_id));
  return (task.depends_on_task_ids ?? []).filter((taskId) => !completedIds.has(taskId));
}

export function LifecycleBoard() {
  const [result, setResult] = useState<LifecycleResult>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxLifecycleBoard().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function completeTask(plan: OnboardingPlan, task: LifecycleTask) {
    setActionStatus(null);
    const updated = await updateHrxOnboardingTask(
      plan.onboarding_id,
      task.task_id,
      task.status === "failed" ? { retry: true } : { status: "completed" }
    );
    if (updated.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  async function updateOffboardingExecution(caseItem: OffboardingCase, task: LifecycleTask) {
    setActionStatus(null);
    const updated = await updateHrxOffboardingTask(
      caseItem.offboarding_id,
      task.task_id,
      task.status === "failed" ? { retry: true } : { status: "completed" }
    );
    if (updated.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  async function closeCase(caseItem: OffboardingCase) {
    setActionStatus(null);
    const closed = await closeHrxOffboardingCase(caseItem.offboarding_id);
    if (closed.kind === "data") {
      const accountRevocation = closed.accountRevocation as { count?: unknown } | null;
      const revokedCount = Number(accountRevocation?.count ?? 0);
      setActionStatus(
        revokedCount > 0
          ? `퇴사 정리를 종료하고 연결 계정 ${revokedCount}개를 해제했습니다`
          : "퇴사 정리를 종료했습니다"
      );
      setRefreshKey((key) => key + 1);
    } else if (
      closed.reason === "HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED" ||
      closed.reason === "HRX_OFFBOARDING_CLOSE_BLOCKED"
    ) {
      const errorBody = closed.body as { decision?: { blockers?: unknown } };
      const blockers = Array.isArray(errorBody.decision?.blockers)
        ? errorBody.decision.blockers as OperationalCloseBlocker[]
        : [];
      setActionStatus(blockers.length > 0 ? operationalBlockerLabel(blockers[0]) : "필수 퇴사 절차를 완료한 뒤 종료할 수 있습니다");
    } else if (closed.reason === "HRX_OFFBOARDING_MATTER_SOURCE_UNAVAILABLE") {
      setActionStatus("Matter 담당자 정보를 확인할 수 없어 종료를 보류했습니다");
    } else if (closed.reason === "HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED") {
      setActionStatus("퇴사 당사자가 아닌 담당자가 확인해야 합니다");
    } else {
      setActionStatus("퇴사 정리 종료를 처리하지 못했습니다");
    }
  }

  let body: unknown;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">입퇴사 관리 업무를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">입퇴사 관리 업무를 불러오지 못했습니다.</div>;
  } else {
    body = (
      <>
        <DataTable
          columns={["업무", "대상", "시작일", "필요 문서"]}
          rows={result.onboarding.map((plan, index) => [
            onboardingLabel(index),
            employeeTargetLabel(plan.employee_display_name, "신규 구성원"),
            plan.start_date,
            documentSummary(plan.document_refs)
          ])}
        />
        <div className="lifecycle-board-grid">
          <div className="lifecycle-task-list">
            <div className="lifecycle-task-list-head">
              <strong>입사 준비 업무</strong>
              <span>{result.onboarding.reduce((count, plan) => count + plan.tasks.length, 0)}건</span>
            </div>
            {result.onboarding.flatMap((plan, planIndex) =>
              plan.tasks.map((task) => (
                <div className="approval-row lifecycle-task-row" key={`${plan.onboarding_id}-${task.task_id}`}>
                  <div>
                    <strong>{taskTitleLabel(task)}</strong>
                    <span>
                      {employeeTargetLabel(plan.employee_display_name, "신규 구성원")} / {onboardingLabel(planIndex)}
                      {" / "}
                      {ownerRoleLabel(task.owner_role)} / {dueLabel(task.due_on)}
                      {" / "}
                      {task.required === false ? "선택" : "필수"} / {templateLabel(plan.template_ref)}
                    </span>
                    {(task.depends_on_task_ids?.length ?? 0) > 0 && (
                      <small>선행 업무 {task.depends_on_task_ids?.length}건</small>
                    )}
                    {task.last_failure_reason && <small>{task.last_failure_reason}</small>}
                  </div>
                  <em>{taskStatusLabel(task.status)}</em>
                  <button
                    className="secondary-button"
                    disabled={task.status === "completed" || (task.status !== "failed" && missingDependencies(plan.tasks, task).length > 0)}
                    onClick={() => completeTask(plan, task)}
                  >
                    <ClipboardCheck size={14} />
                    {task.status === "failed" ? "다시 시도" : "완료"}
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="lifecycle-task-list">
            <div className="lifecycle-task-list-head">
              <strong>퇴사 정리 업무</strong>
              <span>{result.offboarding.length}건</span>
            </div>
            {result.offboarding.flatMap((caseItem, index) => [
              ...(caseItem.tasks ?? []).map((task) => (
                <div className="approval-row lifecycle-task-row" key={`${caseItem.offboarding_id}-${task.task_id}`}>
                  <div>
                    <strong>{taskTitleLabel(task)}</strong>
                    <span>
                      {employeeTargetLabel(caseItem.employee_display_name, "퇴사 예정 구성원")} / {offboardingLabel(index)}
                      {" / "}
                      {ownerRoleLabel(task.owner_role)} / {dueLabel(task.due_on)}
                      {" / "}
                      {task.required === false ? "선택" : "필수"} / {templateLabel(caseItem.template_ref)}
                    </span>
                    {(task.depends_on_task_ids?.length ?? 0) > 0 && <small>선행 업무 {task.depends_on_task_ids?.length}건</small>}
                    {task.last_failure_reason && <small>{task.last_failure_reason}</small>}
                  </div>
                  <em>{taskStatusLabel(task.status)}</em>
                  <button
                    className="secondary-button"
                    disabled={task.status === "completed" || (task.status !== "failed" && missingDependencies(caseItem.tasks ?? [], task).length > 0)}
                    onClick={() => updateOffboardingExecution(caseItem, task)}
                  >
                    <ClipboardCheck size={14} />
                    {task.status === "failed" ? "다시 시도" : "완료"}
                  </button>
                </div>
              )),
              <div className="approval-row lifecycle-task-row" key={caseItem.offboarding_id}>
                <div>
                  <strong>{offboardingLabel(index)}</strong>
                  <span>
                    {employeeTargetLabel(caseItem.employee_display_name, "퇴사 예정 구성원")}
                    {" / "}
                    {caseItem.separation_date} / {templateLabel(caseItem.template_ref)}
                  </span>
                  <small>{operationalSummary(caseItem)}</small>
                </div>
                <em>{taskStatusLabel(caseItem.state)} / {readinessLabel(caseItem)}</em>
                <button
                  className="secondary-button"
                  disabled={caseItem.state === "closed" || caseItem.operational_close?.ready === false}
                  title={caseItem.operational_close?.ready === false ? operationalSummary(caseItem) : undefined}
                  onClick={() => closeCase(caseItem)}
                >
                  <Power size={14} />
                  종료
                </button>
              </div>
            ])}
          </div>
        </div>
      </>
    );
  }

  return (
    <Panel id="people-lifecycle" className="people-panel span-2" title="입퇴사 관리" meta={actionStatus}>
      {body}
    </Panel>
  );
}
