import React from "react";
import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { fetchHrxEmployees } from "../hrxApiClient.ts";

function accountLabel(employee) {
  return employee.work_email ? "등록 계정" : "계정 미등록";
}

export function EmployeeList({ selectedEmployeeId, onSelectEmployee, refreshKey }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxEmployees().then((next) => {
      if (cancelled) return;
      setResult(next);
      if (next.kind === "data" && next.employees.length > 0 && !selectedEmployeeId) {
        onSelectEmployee(next.employees[0].employee_id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 정보를 불러오지 못했습니다.</div>;
  } else if (result.employees.length === 0) {
    body = <div className="live-data-state live-data-empty">표시할 구성원이 없습니다.</div>;
  } else {
    body = (
      <div className="people-row-list">
        {result.employees.map((employee) => (
          <button
            key={employee.employee_id}
            className={selectedEmployeeId === employee.employee_id ? "people-row active" : "people-row"}
            onClick={() => onSelectEmployee(employee.employee_id)}
          >
            <span className="people-row-avatar">{employee.display_name?.slice(0, 1) ?? "E"}</span>
            <span>
              <strong>{employee.display_name}</strong>
              <small>{accountLabel(employee)}</small>
            </span>
            <em>{employee.status === "active" ? "재직" : employee.status === "on_leave" ? "휴가" : "확인 필요"}</em>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Panel id="people-members" className="people-panel people-list-panel" title="구성원 목록" meta="권한 적용">
      <div className="people-panel-kicker">
        <UsersRound size={15} />
        권한이 있는 구성원 정보만 표시됩니다
      </div>
      {body}
    </Panel>
  );
}
