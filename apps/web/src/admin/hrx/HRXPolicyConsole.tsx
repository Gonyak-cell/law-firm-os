import React from "react";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import { createHrxPolicyVersion, fetchHrxPolicies } from "../../people/hrxApiClient.ts";

function policyTypeLabel(policy) {
  const value = policy.policy_type ?? policy.leave_type;
  if (value === "pto") return "휴가 규칙";
  if (value === "retention") return "보존 규칙";
  if (value === "approval") return "승인 규칙";
  return "규칙";
}

export function HRXPolicyConsole() {
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    policy_id: "",
    policy_type: "",
    policy_version: "",
    effective_from: ""
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
    body = <div className="live-data-state live-data-loading">규칙 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">규칙 정보를 불러오지 못했습니다.</div>;
  } else {
    body = (
      <DataTable
        columns={["규칙", "유형", "버전", "시작일"]}
        rows={result.policies.map((policy, index) => [
          `규칙 ${index + 1}`,
          policyTypeLabel(policy),
          policy.policy_version,
          policy.effective_from
        ])}
      />
    );
  }

  return (
    <Panel id="people-policy" className="people-panel span-2" title="승인 규칙" meta="회사 설정 - 요청">
      <div className="people-panel-kicker">
        <SlidersHorizontal size={15} />
        요청에 대한 승인 설정을 관리합니다
      </div>
      <form className="leave-request-form" onSubmit={submit}>
        <label>
          <span>규칙 이름</span>
          <input value={form.policy_id} onChange={(event) => setForm({ ...form, policy_id: event.target.value })} />
        </label>
        <label>
          <span>유형</span>
          <input value={form.policy_type} onChange={(event) => setForm({ ...form, policy_type: event.target.value })} />
        </label>
        <label>
          <span>버전</span>
          <input value={form.policy_version} onChange={(event) => setForm({ ...form, policy_version: event.target.value })} />
        </label>
        <label>
          <span>시작일</span>
          <input value={form.effective_from} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} />
        </label>
        <button className="primary-button">규칙 버전 생성</button>
      </form>
      {body}
    </Panel>
  );
}
