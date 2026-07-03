import React, { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import { fetchHrxEmployeeProfile, fetchHrxCompensationRecords } from "../hrxApiClient.ts";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";

type UnknownRecord = Record<string, unknown>;
type ProfileResult = Awaited<ReturnType<typeof fetchHrxEmployeeProfile>>;
type CompensationResult = Awaited<ReturnType<typeof fetchHrxCompensationRecords>>;

function objectValue(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function recordList(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(objectValue).filter((item) => Object.keys(item).length > 0) : [];
}

function roleLabel(value: unknown): string {
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

function employmentTypeLabel(value: unknown): string {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("full")) return "정규직";
  if (normalized.includes("part")) return "파트타임";
  if (normalized.includes("contract")) return "계약직";
  if (normalized.includes("intern")) return "인턴";
  return value ? "등록됨" : "권한 필요";
}

function displayValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "확인 필요";
}

function compensationStatus(result: CompensationResult | null): string {
  if (result === null) return "확인 중";
  if (result.kind === "step_up_required") return "권한 필요";
  if (result.kind === "data") return displayValue(result.masked_compensation_ref);
  if (result.kind === "empty") return "확인 필요";
  return "확인 실패";
}

function CompensationRecordList({ result, onRetry }: { result: CompensationResult | null; onRetry: () => void }) {
  if (result === null) {
    return <div className="live-data-state live-data-loading">보상 기록을 확인하는 중입니다</div>;
  }

  if (result.kind === "step_up_required") {
    return <HrxStepUpChallenge onRetry={onRetry} />;
  }

  if (result.kind !== "data") {
    return <div className="live-data-state live-data-error">보상 기록을 불러오지 못했습니다.</div>;
  }

  const records = recordList(result.compensation_records);
  if (records.length === 0) {
    return <div className="live-data-state live-data-empty">등록된 보상 기록이 없습니다.</div>;
  }

  return (
    <div className="people-compensation-section" data-hrx-compensation-records="true">
      <div className="people-compensation-head">
        <strong>보상 기록</strong>
        <span>{result.payroll_runtime_opened ? "정산 조회 가능" : "정산 실행 전용 경로 없음"}</span>
      </div>
      <div className="people-compensation-list">
        {records.map((record) => (
          <div className="people-compensation-row" key={displayValue(record.masked_compensation_ref)}>
            <strong>{displayValue(record.masked_compensation_ref)}</strong>
            <span>계약 {displayValue(record.employment_contract_id)}</span>
            <span>{displayValue(record.contract_document_ref)}</span>
            <small>
              {displayValue(record.effective_from)}
              {record.effective_to ? ` - ${displayValue(record.effective_to)}` : ""}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmployeeProfile({ employeeId, refreshKey }: { employeeId?: string | null; refreshKey?: unknown }) {
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [compensationResult, setCompensationResult] = useState<CompensationResult | null>(null);
  const [compensationRefreshKey, setCompensationRefreshKey] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    setCompensationResult(null);
    fetchHrxCompensationRecords(employeeId).then((next) => {
      if (!cancelled) setCompensationResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey, compensationRefreshKey]);

  let body: ReactNode;
  if (!employeeId) {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 상세 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "empty") {
    body = <div className="live-data-state live-data-empty">구성원을 선택하세요.</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 상세 정보를 불러오지 못했습니다.</div>;
  } else {
    const employee = objectValue(result.employee);
    const profile = objectValue(result.employment_profile);
    body = (
      <>
        <div className="property-grid people-profile-grid">
          <Property label="구성원" value={displayValue(employee.display_name)} />
          <Property label="상태" value={employee.status === "active" ? "재직" : employee.status === "on_leave" ? "휴가" : "확인 필요"} />
          <Property label="역할" value={roleLabel(profile.title ?? employee.title ?? employee.role)} />
          <Property label="고용 형태" value={employmentTypeLabel(profile.employment_type)} />
          <Property label="소속" value={displayValue(employee.affiliation)} />
          <Property label="부서" value={displayValue(employee.department)} />
          <Property label="조직" value={displayValue(employee.organization_group)} />
          <Property label="보상 정보" value={compensationStatus(compensationResult)} />
        </div>
        <CompensationRecordList
          result={compensationResult}
          onRetry={() => setCompensationRefreshKey((current) => current + 1)}
        />
      </>
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
