import React from "react";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import { fetchHrxEmployeeProfile } from "../hrxApiClient.ts";

function roleLabel(value) {
  const text = String(value ?? "").trim();
  if (!text) return "미등록";
  if (/[가-힣]/.test(text)) return text;
  const normalized = text.toLowerCase();
  if (normalized.includes("partner")) return "파트너";
  if (normalized.includes("associate")) return "어소시에이트";
  if (normalized.includes("paralegal")) return "실무 지원";
  if (normalized.includes("admin")) return "관리";
  if (normalized.includes("hr")) return "인사 담당";
  return "담당자";
}

function employmentTypeLabel(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("full")) return "정규직";
  if (normalized.includes("part")) return "파트타임";
  if (normalized.includes("contract")) return "계약직";
  if (normalized.includes("intern")) return "인턴";
  return value ? "등록됨" : "권한 필요";
}

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text || "확인 필요";
}

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
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 상세 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "empty") {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 상세 정보를 불러오지 못했습니다.</div>;
  } else {
    const employee = result.employee;
    const profile = result.employment_profile ?? {};
    body = (
      <div className="property-grid people-profile-grid">
        <Property label="구성원" value={employee.display_name} />
        <Property label="상태" value={employee.status === "active" ? "재직" : employee.status === "on_leave" ? "휴가" : "확인 필요"} />
        <Property label="역할" value={roleLabel(profile.title ?? employee.title ?? employee.role)} />
        <Property label="고용 형태" value={employmentTypeLabel(profile.employment_type)} />
        <Property label="소속" value={displayValue(employee.affiliation)} />
        <Property label="부서" value={displayValue(employee.department)} />
        <Property label="조직" value={displayValue(employee.organization_group)} />
        <Property label="보상 정보" value="권한 필요" />
      </div>
    );
  }

  return (
    <Panel id="people-profile" className="people-panel" title="구성원 상세" meta={employeeId ? "선택됨" : "미선택"}>
      <div className="people-panel-kicker">
        <ShieldCheck size={15} />
        권한이 없는 정보는 숨깁니다.
      </div>
      {body}
    </Panel>
  );
}
