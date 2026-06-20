import React from "react";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { createHrxPolicyVersion, fetchHrxPolicies } from "../../people/hrxApiClient.ts";

export function HRXPolicyConsole() {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    policy_id: "policy-console-draft",
    policy_type: "leave",
    policy_version: "2026.2",
    effective_from: "2026-08-01"
  });

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxPolicies().then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const created = await createHrxPolicyVersion(form);
    if (created.kind === "data") {
      const policies = await fetchHrxPolicies();
      setResult(policies);
    } else {
      setResult({ kind: "error" });
    }
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">Loading HRX policies</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">Policy API failed. No policy fallback is rendered.</div>;
  } else {
    body = (
      <DataTable
        columns={["Policy", "Type", "Version", "Effective"]}
        rows={result.policies.map((policy) => [
          policy.policy_id,
          policy.policy_type ?? policy.leave_type ?? "approval",
          policy.policy_version,
          policy.effective_from
        ])}
      />
    );
  }

  return (
    <Panel className="people-panel span-2" title="HRX Policy Console" meta="/api/hrx/policies">
      <div className="people-panel-kicker">
        <SlidersHorizontal size={15} />
        Leave, approval, and retention policy versions
      </div>
      <form className="leave-request-form" onSubmit={submit}>
        <label>
          <span>Policy ID</span>
          <input value={form.policy_id} onChange={(event) => setForm({ ...form, policy_id: event.target.value })} />
        </label>
        <label>
          <span>Type</span>
          <input value={form.policy_type} onChange={(event) => setForm({ ...form, policy_type: event.target.value })} />
        </label>
        <label>
          <span>Version</span>
          <input value={form.policy_version} onChange={(event) => setForm({ ...form, policy_version: event.target.value })} />
        </label>
        <button className="primary-button">Create Version</button>
      </form>
      {body}
    </Panel>
  );
}
