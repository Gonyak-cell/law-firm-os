import React from "react";
import { useEffect, useState } from "react";
import { ClipboardCheck, Power, RefreshCw } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { closeHrxOffboardingCase, fetchHrxLifecycleBoard, updateHrxOnboardingTask } from "../hrxApiClient.ts";

function readinessLabel(caseItem) {
  const accessReady = caseItem.access_revocations?.every((item) => item.revoked === true) ?? false;
  const documentsReady = caseItem.document_returns?.every((item) => item.returned === true) ?? false;
  const holdsReady = caseItem.legal_hold_checks?.every((item) => item.clear === true) ?? false;
  return accessReady && documentsReady && holdsReady ? "종료 가능" : "확인 필요";
}

function taskStatusLabel(value) {
  if (value === "completed") return "완료";
  if (value === "closed") return "종료";
  if (value === "in_progress") return "진행 중";
  return "대기";
}

function ownerRoleLabel(value) {
  if (value === "manager") return "관리자";
  if (value === "hr") return "인사 담당";
  if (value === "people_ops") return "인사 담당";
  if (value === "it") return "IT 담당";
  if (value === "it_ops") return "IT 담당";
  if (value === "finance") return "청구 담당";
  return "담당자";
}

function taskTitleLabel(task) {
  if (task.task_id === "policy-ack") return "정책 확인";
  if (task.task_id === "access-provision") return "기본 접근 권한 설정";
  if (task.task_id === "task-001") return "입사 서류 확인";
  return /[가-힣]/.test(task.title ?? "") ? task.title : "업무 확인";
}

function onboardingLabel(index) {
  return index === 0 ? "입사 준비" : `입사 준비 ${index + 1}`;
}

function offboardingLabel(index) {
  return index === 0 ? "퇴사 정리" : `퇴사 정리 ${index + 1}`;
}

function documentSummary(refs = []) {
  if (refs.length === 0) return "없음";
  if (refs.length === 1) return "정책 문서";
  return `문서 ${refs.length}건`;
}

export function LifecycleBoard() {
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  async function completeTask(plan, task) {
    const updated = await updateHrxOnboardingTask(plan.onboarding_id, task.task_id, "completed");
    if (updated.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  async function closeCase(caseItem) {
    const closed = await closeHrxOffboardingCase(caseItem.offboarding_id);
    if (closed.kind === "data") setRefreshKey((key) => key + 1);
    else setResult({ kind: "error" });
  }

  let body;
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
    <Panel id="people-lifecycle" className="people-panel span-2" title="입퇴사 관리" meta="입사 준비 / 퇴사 정리">
      <div className="people-panel-kicker">
        <RefreshCw size={13} />
        입퇴사 관리 업무를 확인합니다
      </div>
      {body}
    </Panel>
  );
}
