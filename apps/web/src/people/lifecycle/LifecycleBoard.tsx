import React from "react";
import { useEffect, useState } from "react";
import { ClipboardCheck, Power, RefreshCw } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { closeHrxOffboardingCase, fetchHrxLifecycleBoard, updateHrxOnboardingTask } from "../hrxApiClient.ts";

function readinessLabel(caseItem) {
  const accessReady = caseItem.access_revocations?.every((item) => item.revoked === true) ?? false;
  const documentsReady = caseItem.document_returns?.every((item) => item.returned === true) ?? false;
  const holdsReady = caseItem.legal_hold_checks?.every((item) => item.clear === true) ?? false;
  return accessReady && documentsReady && holdsReady ? "Ready" : "Blocked";
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
    body = <div className="live-data-state live-data-loading">Loading lifecycle board</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Lifecycle API failed. No local lifecycle fallback is rendered.</div>;
  } else {
    body = (
      <>
        <DataTable
          columns={["Plan", "Employee", "Start", "Documents"]}
          rows={result.onboarding.map((plan) => [
            plan.onboarding_id,
            plan.employee_id,
            plan.start_date,
            plan.document_refs?.join(", ") || "None"
          ])}
        />
        <div className="lifecycle-board-grid">
          <div className="lifecycle-task-list">
            {result.onboarding.flatMap((plan) =>
              plan.tasks.map((task) => (
                <div className="approval-row lifecycle-task-row" key={`${plan.onboarding_id}-${task.task_id}`}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{plan.onboarding_id} / {task.owner_role}</span>
                  </div>
                  <em>{task.status}</em>
                  <button className="secondary-button" disabled={task.status === "completed"} onClick={() => completeTask(plan, task)}>
                    <ClipboardCheck size={14} />
                    Complete
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="lifecycle-task-list">
            {result.offboarding.map((caseItem) => (
              <div className="approval-row lifecycle-task-row" key={caseItem.offboarding_id}>
                <div>
                  <strong>{caseItem.offboarding_id}</strong>
                  <span>{caseItem.employee_id} / {caseItem.separation_date}</span>
                </div>
                <em>{caseItem.state} / {readinessLabel(caseItem)}</em>
                <button className="secondary-button" disabled={caseItem.state === "closed"} onClick={() => closeCase(caseItem)}>
                  <Power size={14} />
                  Close
                </button>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="Lifecycle Board" meta="/api/hrx/lifecycle">
      <div className="people-panel-kicker">
        <RefreshCw size={13} />
        API-backed onboarding and offboarding actions
      </div>
      {body}
    </Panel>
  );
}
