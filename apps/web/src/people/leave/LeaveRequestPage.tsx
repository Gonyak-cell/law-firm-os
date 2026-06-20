import React from "react";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { fetchHrxLeaveState, submitHrxLeaveRequest } from "../hrxApiClient.ts";

export function LeaveRequestPage({ employeeId, refreshKey, onSubmitted }) {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ amount: "8", start_date: "2026-07-01", end_date: "2026-07-01" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxLeaveState(employeeId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    const submitted = await submitHrxLeaveRequest(employeeId, form);
    setSubmitting(false);
    if (submitted.kind === "data") onSubmitted?.();
    else setResult({ kind: "error" });
  }

  let stateBody;
  if (!employeeId) {
    stateBody = <div className="live-data-state live-data-empty">Select an employee to load leave balance.</div>;
  } else if (result === null) {
    stateBody = <div className="live-data-state live-data-loading">Loading leave balance</div>;
  } else if (result.kind === "error") {
    stateBody = <div className="live-data-state live-data-error">Leave API failed. Request was not staged locally.</div>;
  } else {
    stateBody = (
      <>
        <div className="leave-balance-strip">
          <strong>{result.balance?.available_balance ?? "Scoped"}</strong>
          <span>Available PTO balance</span>
        </div>
        <DataTable
          columns={["Request", "Type", "Amount", "State"]}
          rows={result.requests.map((request) => [request.request_id, request.leave_type, request.amount, request.state])}
        />
      </>
    );
  }

  return (
    <Panel className="people-panel span-2" title="Leave Request" meta="/api/hrx/leave">
      <div className="people-panel-kicker">
        <CalendarCheck size={15} />
        Submit through API, refresh from balance ledger
      </div>
      <form className="leave-request-form" onSubmit={handleSubmit}>
        <label>
          <span>Hours</span>
          <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
        <label>
          <span>Start</span>
          <input value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        </label>
        <label>
          <span>End</span>
          <input value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
        </label>
        <button className="primary-button" disabled={!employeeId || submitting}>
          {submitting ? "Submitting" : "Submit PTO"}
        </button>
      </form>
      {stateBody}
    </Panel>
  );
}
