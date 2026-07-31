import React from "react";
import { useEffect, useState } from "react";
import { Panel } from "../../components/primitives.jsx";
import { fetchHrxEmployees } from "../hrxApiClient.ts";
import { memberPhotoFor } from "../memberPhotos.js";
import { safeEmployeeLabel } from "../peoplePresentation.ts";

type HrxEmployee = {
  employee_id?: string;
  user_id?: string;
  display_name?: string;
  status?: string;
  work_email?: string;
  [key: string]: unknown;
};
type EmployeeResult = { kind: "data"; employees: HrxEmployee[] } | { kind: "error" | "guarded" | "step_up_required" | "empty" };

function accountLabel(employee) {
  return employee.work_email ? "등록 계정" : "계정 미등록";
}

export function EmployeeList({ selectedEmployeeId, onSelectEmployee, refreshKey }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxEmployees().then((next: EmployeeResult) => {
      if (cancelled) return;
      setResult(next);
      const firstEmployeeId = next.kind === "data" ? next.employees[0]?.employee_id : "";
      if (firstEmployeeId && !selectedEmployeeId) {
        onSelectEmployee(firstEmployeeId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 목록을 불러오는 중입니다</div>;
  } else if (result.kind !== "data") {
    body = <div className="live-data-state live-data-error">구성원 정보를 확인할 수 없습니다.</div>;
  } else if (result.employees.length === 0) {
    body = <div className="live-data-state live-data-empty">표시할 구성원이 없습니다.</div>;
  } else {
    body = (
      <div className="people-row-list">
        {result.employees.map((employee, index) => {
          const employeeLabel = safeEmployeeLabel(employee);
          const photo = memberPhotoFor(employee);
          return (
            <button
              key={employee.employee_id ?? employee.user_id ?? `employee-${index}`}
              className={selectedEmployeeId === employee.employee_id ? "people-row active" : "people-row"}
              data-compact-record="true"
              aria-label={employeeLabel}
              onClick={() => employee.employee_id && onSelectEmployee(employee.employee_id)}
            >
              <span className="people-row-avatar">{photo ? <img src={photo} alt="" /> : employeeLabel.slice(0, 1) || "E"}</span>
              <span>
                <strong>{employeeLabel}</strong>
                <small>{accountLabel(employee)}</small>
              </span>
              <em>{employee.status === "active" ? "재직" : employee.status === "on_leave" ? "휴가" : "확인 필요"}</em>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Panel id="people-members" className="people-panel people-list-panel" title="구성원 목록" meta="">
      {body}
    </Panel>
  );
}
