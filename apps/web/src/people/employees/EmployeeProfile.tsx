import React from "react";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import { fetchHrxEmployeeProfile } from "../hrxApiClient.ts";

export function EmployeeProfile({ employeeId, refreshKey }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxEmployeeProfile(employeeId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  let body;
  if (!employeeId) {
    body = <div className="live-data-state live-data-empty">Select an employee to load the scoped profile.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading employee profile</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Profile API failed. Sensitive fields remain hidden.</div>;
  } else {
    const employee = result.employee;
    const profile = result.employment_profile ?? {};
    body = (
      <div className="property-grid people-profile-grid">
        <Property label="Employee" value={employee.display_name} />
        <Property label="Status" value={employee.status} />
        <Property label="Profile" value={profile.profile_id ?? "Not returned"} />
        <Property label="Employment Type" value={profile.employment_type ?? "Scoped"} />
        <Property label="Compensation" value={result.masked_compensation_ref ?? "Masked by scope"} />
        <Property label="Tenant" value={employee.tenant_id} />
      </div>
    );
  }

  return (
    <Panel className="people-panel" title="Employee Profile" meta={employeeId ?? "No selection"}>
      <div className="people-panel-kicker">
        <ShieldCheck size={15} />
        Sensitive fields masked unless explicitly scoped
      </div>
      {body}
    </Panel>
  );
}
