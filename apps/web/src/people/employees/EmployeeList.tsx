import React from "react";
import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import { fetchHrxEmployees } from "../hrxApiClient.ts";

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
    body = <div className="live-data-state live-data-loading">Loading employees from /api/hrx/employees</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Employee API failed. No mock employee list is rendered.</div>;
  } else if (result.employees.length === 0) {
    body = <div className="live-data-state live-data-empty">No employees returned for this tenant.</div>;
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
              <small>{employee.employee_id}</small>
            </span>
            <em>{employee.status}</em>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Panel className="people-panel people-list-panel" title="Employee List" meta="API-backed">
      <div className="people-panel-kicker">
        <UsersRound size={15} />
        /api/hrx/employees
      </div>
      {body}
    </Panel>
  );
}
