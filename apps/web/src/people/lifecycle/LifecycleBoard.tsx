/// <reference path="../../react-jsx.d.ts" />
import React from "react";
import { useEffect, useState } from "react";
import { ClipboardCheck, Power } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { closeHrxOffboardingCase, fetchHrxLifecycleBoard, updateHrxOnboardingTask } from "../hrxApiClient.ts";

type LifecycleTask = {
  task_id: string;
  title?: string;
  owner_role?: string;
  status?: string;
};
type OnboardingPlan = {
  onboarding_id: string;
  start_date?: string;
  document_refs?: string[];
  tasks: LifecycleTask[];
};
type OffboardingCase = {
  offboarding_id: string;
  separation_date?: string;
  state?: string;
  access_revocations?: { revoked?: boolean; confirmation_ref?: string | null }[];
  document_returns?: { returned?: boolean }[];
  legal_hold_checks?: { clear?: boolean }[];
  matter_reassignments?: { reassigned?: boolean; reassigned_to_employee_id?: string | null }[];
  handover_items?: { completed?: boolean }[];
};
type LifecycleResult = { kind: "data"; onboarding: OnboardingPlan[]; offboarding: OffboardingCase[] } | { kind: "error" } | null;

function readinessLabel(caseItem: OffboardingCase) {
  const accessReady = caseItem.access_revocations?.every((item) => item.revoked === true && Boolean(item.confirmation_ref)) ?? false;
  const documentsReady = caseItem.document_returns?.every((item) => item.returned === true) ?? false;
  const holdsReady = caseItem.legal_hold_checks?.every((item) => item.clear === true) ?? false;
  const reassignmentReady = caseItem.matter_reassignments?.every((item) => item.reassigned === true && Boolean(item.reassigned_to_employee_id)) ?? true;
  const handoverReady = caseItem.handover_items?.every((item) => item.completed === true) ?? true;
  return accessReady && documentsReady && holdsReady && reassignmentReady && handoverReady ? "종료 가능" : "확인 필요";
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

function documentSummary(refs: string[] = []) {
  if (refs.length === 0) return "없음";
  if (refs.length === 1) return "정책 문서";
  return `문서 ${refs.length}건`;
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
    const updated = await updateHrxOnboardingTask(plan.onboarding_id, task.task_id, "completed");
    if (updated.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  async function closeCase(caseItem: OffboardingCase) {
    setActionStatus(null);
    const closed = await closeHrxOffboardingCase(caseItem.offboarding_id);
    if (closed.kind === "data") setRefreshKey((key) => key + 1);
    else setActionStatus(closed.reason === "HRX_OFFBOARDING_CLOSE_BLOCKED" ? "퇴사 정리 항목을 완료한 뒤 종료할 수 있습니다" : "퇴사 정리 종료를 처리하지 못했습니다");
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
            "신규 구성원",
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
                    <span>{onboardingLabel(planIndex)} / {ownerRoleLabel(task.owner_role)}</span>
                  </div>
                  <em>{taskStatusLabel(task.status)}</em>
                  <button className="secondary-button" disabled={task.status === "completed"} onClick={() => completeTask(plan, task)}>
                    <ClipboardCheck size={14} />
                    완료
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
            {result.offboarding.map((caseItem, index) => (
              <div className="approval-row lifecycle-task-row" key={caseItem.offboarding_id}>
                <div>
                  <strong>{offboardingLabel(index)}</strong>
                  <span>퇴사 예정 구성원 / {caseItem.separation_date}</span>
                  <small>{offboardingChecklistSummary(caseItem)}</small>
                </div>
                <em>{taskStatusLabel(caseItem.state)} / {readinessLabel(caseItem)}</em>
                <button className="secondary-button" disabled={caseItem.state === "closed"} onClick={() => closeCase(caseItem)}>
                  <Power size={14} />
                  종료
                </button>
              </div>
            ))}
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
