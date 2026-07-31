import React, { useEffect, useState, type ReactNode } from "react";
import { Link2, Save, Unlink } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import {
  createHrxEmployeeUserLink,
  createHrxEmploymentProfile,
  fetchHrxCompensationRecords,
  fetchHrxEmployeeProfile,
  fetchHrxEmployeeUserLinks,
  fetchHrxEmploymentProfiles,
  revokeHrxEmployeeUserLink
} from "../hrxApiClient.ts";
import { safeEmployeeLabel, safePeopleLabel } from "../peoplePresentation.ts";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";

type UnknownRecord = Record<string, unknown>;
type ProfileResult = Awaited<ReturnType<typeof fetchHrxEmployeeProfile>>;
type CompensationResult = Awaited<ReturnType<typeof fetchHrxCompensationRecords>>;
type EmploymentHistoryResult = Awaited<ReturnType<typeof fetchHrxEmploymentProfiles>>;
type EmployeeUserLinksResult = Awaited<ReturnType<typeof fetchHrxEmployeeUserLinks>>;

function objectValue(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function recordList(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(objectValue).filter((item) => Object.keys(item).length > 0) : [];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
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

function employeeDisplayLabel(employee: UnknownRecord) {
  return safeEmployeeLabel({
    employee_id: employee.employee_id,
    user_id: employee.user_id,
    display_name: employee.display_name,
  });
}

function managerDisplayLabel(employee: UnknownRecord) {
  const manager = objectValue(employee.manager);
  const managerName = employee.manager_display_name ?? manager.display_name;
  return safePeopleLabel(managerName, {
    identifiers: [
      employee.manager_employee_id,
      employee.manager_user_id,
      employee.manager_id,
      manager.employee_id,
      manager.user_id,
    ],
    fallback: "없음",
  });
}

function currentDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function profileStatusLabel(value: unknown) {
  if (value === "active") return "재직";
  if (value === "future") return "입사 예정";
  if (value === "on_leave") return "휴직";
  if (value === "terminated") return "종료";
  return displayValue(value);
}

function historyErrorMessage(reason: unknown) {
  if (reason === "HRX_EMPLOYMENT_PERIOD_OVERLAP") return "같은 적용일에 이미 등록된 근로정보가 있습니다.";
  if (reason === "HRX_EMPLOYMENT_TERMINATED_REACTIVATION") return "종료된 근로정보를 재직 상태로 되돌릴 수 없습니다.";
  if (reason === "HRX_PERMISSION_DENIED") return "근로정보를 변경할 권한이 없습니다.";
  return "적용일과 입력값을 확인해 주세요.";
}

function userLinkErrorMessage(reason: unknown) {
  if (reason === "HRX_EMPLOYEE_USER_LINK_DUPLICATE") return "이미 다른 구성원에게 연결된 로그인 계정입니다.";
  if (reason === "HRX_PERMISSION_DENIED") return "로그인 계정을 연결할 권한이 없습니다.";
  if (reason === "HRX_EMPLOYEE_USER_LINK_INVALID") return "구성원 식별자와 다른 로그인 계정을 입력해 주세요.";
  return "로그인 계정 정보를 확인해 주세요.";
}

function compensationStatus(result: CompensationResult | null): string {
  if (result === null) return "확인 중";
  if (result.kind === "step_up_required") return "권한 필요";
  if (result.kind === "data") return "급여 금액 비공개";
  if (result.kind === "empty") return "확인 필요";
  return "확인 실패";
}

function professionalKindLabel(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (normalized === "attorney") return "변호사";
  if (normalized === "cpa") return "공인회계사 / Deal Advisory";
  if (normalized === "deal_advisor") return "Deal Advisory";
  return displayValue(normalized);
}

function ProfessionalList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="people-professional-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => <li key={`${title}-${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function ProfessionalProfileSection({ profile }: { profile: unknown }) {
  const record = objectValue(profile);
  const profileKind = String(record.profile_kind ?? "").trim();
  if (!profileKind) {
    return (
      <div className="live-data-state live-data-empty" data-people-professional-profile="empty">
        공개 전문 프로필 없음
      </div>
    );
  }

  return (
    <section
      className="people-professional-profile"
      data-people-professional-profile="true"
      data-people-professional-profile-kind={profileKind}
    >
      <header className="people-compensation-head">
        <strong>전문 프로필</strong>
        <span>{professionalKindLabel(profileKind)}</span>
      </header>
      <div className="property-grid people-profile-grid">
        <Property label="공개 역할" value={stringList(record.public_role_labels).join(", ") || professionalKindLabel(profileKind)} />
        <Property label="전문 분야" value={stringList(record.practice_areas).join(", ") || "확인 필요"} />
      </div>
      <ProfessionalList title="주요 경력" items={stringList(record.experience)} />
      <ProfessionalList title="학력" items={stringList(record.education)} />
      <ProfessionalList title="자격" items={stringList(record.qualifications)} />
    </section>
  );
}

function EmploymentHistorySection({
  employeeId,
  result,
  currentProfile,
  onSaved
}: {
  employeeId: string;
  result: EmploymentHistoryResult | null;
  currentProfile: UnknownRecord;
  onSaved: (next: EmploymentHistoryResult) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    effective_from: currentDateValue(),
    title: String(currentProfile.title ?? ""),
    employment_type: String(currentProfile.employment_type ?? "full_time"),
    status: String(currentProfile.status ?? "active")
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof typeof form, event: { currentTarget: { value: string } }) {
    const value = event.currentTarget.value;
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  useEffect(() => {
    setForm({
      effective_from: currentDateValue(),
      title: String(currentProfile.title ?? ""),
      employment_type: String(currentProfile.employment_type ?? "full_time"),
      status: String(currentProfile.status ?? "active")
    });
    setError("");
  }, [employeeId, currentProfile.profile_id]);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const next = await createHrxEmploymentProfile(employeeId, {
      effective_from: form.effective_from,
      title: form.title.trim() || null,
      employment_type: form.employment_type,
      status: form.status
    });
    if (next.kind !== "data") {
      setError(historyErrorMessage("reason" in next ? next.reason : null));
      setSaving(false);
      return;
    }
    await onSaved(next);
    setSaving(false);
  }

  if (result === null) {
    return <div className="live-data-state live-data-loading">근로정보 이력을 확인하는 중입니다</div>;
  }
  if (result.kind !== "data") {
    return <div className="live-data-state live-data-error">근로정보 이력을 불러오지 못했습니다.</div>;
  }

  const current = objectValue(result.current);
  const scheduled = recordList(result.scheduled);
  const past = recordList(result.past).reverse();
  return (
    <section className="people-employment-history" data-people-employment-history="true">
      <header className="people-compensation-head">
        <strong>근로정보</strong>
        <span>{displayValue(result.as_of)} 기준</span>
      </header>
      <div className="people-employment-current" data-people-employment-current="true">
        <span>현재 적용</span>
        <strong>{roleLabel(current.title)} / {employmentTypeLabel(current.employment_type)}</strong>
        <small>
          {profileStatusLabel(current.status)} / {displayValue(current.effective_from)}
          {current.effective_to ? ` ~ ${displayValue(current.effective_to)}` : "부터"}
        </small>
      </div>
      <form className="people-employment-change-form" onSubmit={submit}>
        <label>
          <span>적용일</span>
          <input
            type="date"
            value={form.effective_from}
            onChange={(event) => updateField("effective_from", event)}
            required
            disabled={saving}
          />
        </label>
        <label>
          <span>직위</span>
          <input
            value={form.title}
            onChange={(event) => updateField("title", event)}
            disabled={saving}
          />
        </label>
        <label>
          <span>고용 형태</span>
          <select
            value={form.employment_type}
            onChange={(event) => updateField("employment_type", event)}
            disabled={saving}
          >
            <option value="full_time">정규직</option>
            <option value="part_time">파트타임</option>
            <option value="contractor">계약직</option>
            <option value="intern">인턴</option>
          </select>
        </label>
        <label>
          <span>상태</span>
          <select
            value={form.status}
            onChange={(event) => updateField("status", event)}
            disabled={saving}
          >
            <option value="active">재직</option>
            <option value="future">입사 예정</option>
            <option value="on_leave">휴직</option>
            <option value="terminated">종료</option>
          </select>
        </label>
        <button type="submit" className="secondary-button" disabled={saving}>
          <Save size={14} />
          {saving ? "저장 중" : "변경 예약"}
        </button>
      </form>
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      <div className="people-employment-history-groups">
        <div>
          <strong>예정된 변경</strong>
          {scheduled.length === 0 && <span>예정된 변경 없음</span>}
          {scheduled.map((profile) => (
            <span key={displayValue(profile.profile_id)}>
              {displayValue(profile.effective_from)} / {roleLabel(profile.title)} / {profileStatusLabel(profile.status)}
            </span>
          ))}
        </div>
        <div>
          <strong>과거 이력</strong>
          {past.length === 0 && <span>과거 이력 없음</span>}
          {past.slice(0, 6).map((profile) => (
            <span key={displayValue(profile.profile_id)}>
              {displayValue(profile.effective_from)} ~ {displayValue(profile.effective_to)} / {roleLabel(profile.title)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmployeeUserLinksSection({
  employeeId,
  result,
  onChanged
}: {
  employeeId: string;
  result: EmployeeUserLinksResult | null;
  onChanged: (next: EmployeeUserLinksResult) => void;
}) {
  const [candidateKey, setCandidateKey] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const candidates = result?.kind === "data" ? recordList(result.candidates) : [];

  async function link(event: { preventDefault(): void }) {
    event.preventDefault();
    const candidate = candidates.find((_, index) => candidateKey === `candidate-${index}`);
    const userId = String(candidate?.user_id ?? "").trim();
    if (!userId) {
      setError("연결할 로그인 계정을 선택해 주세요.");
      return;
    }
    setPending("link");
    setError("");
    const next = await createHrxEmployeeUserLink(employeeId, userId);
    setCandidateKey("");
    if (next.kind !== "data") {
      setError(userLinkErrorMessage("reason" in next ? next.reason : null));
    } else {
      onChanged(next);
    }
    setPending("");
  }

  async function revoke(linkId: string) {
    setPending(linkId);
    setError("");
    const next = await revokeHrxEmployeeUserLink(employeeId, linkId);
    if (next.kind !== "data") {
      setError(userLinkErrorMessage("reason" in next ? next.reason : null));
    } else {
      onChanged(next);
    }
    setPending("");
  }

  return (
    <section className="people-user-links" data-people-user-links="true">
      <header className="people-compensation-head">
        <strong>로그인 계정</strong>
        <span>구성원과 계정은 별도로 관리됩니다</span>
      </header>
      {result === null && <div className="live-data-state live-data-loading">연결된 계정을 확인하는 중입니다</div>}
      {result && result.kind !== "data" && <div className="live-data-state live-data-error">연결된 계정을 불러오지 못했습니다.</div>}
      {result?.kind === "data" && (
        <div className="people-user-link-list">
          {result.links.length === 0 && <span>연결된 로그인 계정 없음</span>}
          {recordList(result.links).map((link) => (
            <div
              key={displayValue(link.link_id)}
              data-people-user-link-row="true"
              data-people-user-link-state="connected"
            >
              <span>
                <strong>로그인 계정 연결됨</strong>
                <small>계정 식별자는 화면에 표시하지 않습니다</small>
              </span>
              {result.can_manage && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => revoke(String(link.link_id))}
                  disabled={pending === String(link.link_id)}
                >
                  <Unlink size={14} />
                  {pending === String(link.link_id) ? "해제 중" : "연결 해제"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {result?.kind === "data" && result.can_manage && result.links.length === 0 && (
        <form className="people-user-link-form" onSubmit={link}>
          <label>
            <span>연결할 로그인 계정</span>
            <select
              value={candidateKey}
              onChange={(event) => {
                setCandidateKey(event.currentTarget.value);
                setError("");
              }}
              required
              disabled={pending === "link" || candidates.length === 0}
            >
              <option value="">
                {candidates.length === 0 ? "연결 가능한 계정 없음" : "계정을 선택하세요"}
              </option>
              {candidates.map((candidate, index) => (
                <option key={`candidate-${index}`} value={`candidate-${index}`}>
                  {displayValue(candidate.account_label)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={pending === "link" || candidates.length === 0}
          >
            <Link2 size={14} />
            {pending === "link" ? "연결 중" : "계정 연결"}
          </button>
        </form>
      )}
      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
    </section>
  );
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
        {records.map((record, index) => (
          <div
            className="people-compensation-row"
            key={`${String(record.compensation_id ?? record.masked_compensation_ref ?? record.effective_from ?? "record")}-${index}`}
          >
            <span className="people-compensation-ref-label">급여 금액 비공개</span>
            <strong>급여 금액 비공개</strong>
            <span>{record.employment_contract_id ? "계약 정보 등록됨" : "계약 정보 미등록"}</span>
            <span>{record.contract_document_ref ? "보상 문서 보관됨" : "보상 문서 미등록"}</span>
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
  const [employmentHistoryResult, setEmploymentHistoryResult] = useState<EmploymentHistoryResult | null>(null);
  const [employeeUserLinksResult, setEmployeeUserLinksResult] = useState<EmployeeUserLinksResult | null>(null);
  const [compensationRefreshKey, setCompensationRefreshKey] = useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchHrxEmployeeProfile(employeeId).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey, profileRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    setEmploymentHistoryResult(null);
    fetchHrxEmploymentProfiles(employeeId).then((next) => {
      if (!cancelled) setEmploymentHistoryResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setEmployeeUserLinksResult(null);
    fetchHrxEmployeeUserLinks(employeeId).then((next) => {
      if (!cancelled) setEmployeeUserLinksResult(next);
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
    const professionalProfile = result.professional_profile ?? employee.professional_profile ?? null;
    const memberLabel = employeeDisplayLabel(employee);
    const managerLabel = managerDisplayLabel(employee);
    body = (
      <>
        <div className="property-grid people-profile-grid">
          <Property label="구성원" value={memberLabel} />
          <Property label="상태" value={employee.status === "active" ? "재직" : employee.status === "on_leave" ? "휴가" : "확인 필요"} />
          <Property label="역할" value={roleLabel(profile.title ?? employee.title ?? employee.role)} />
          <Property label="고용 형태" value={employmentTypeLabel(profile.employment_type)} />
          <Property label="소속" value={displayValue(employee.affiliation)} />
          <Property label="부서" value={displayValue(employee.department)} />
          <Property label="조직" value={displayValue(employee.organization_group)} />
          <Property label="상사" value={managerLabel} />
          <Property label="보상 정보" value={compensationStatus(compensationResult)} />
        </div>
        <ProfessionalProfileSection profile={professionalProfile} />
        <EmploymentHistorySection
          employeeId={String(employee.employee_id)}
          result={employmentHistoryResult}
          currentProfile={profile}
          onSaved={async (next) => {
            setEmploymentHistoryResult(next);
            setProfileRefreshKey((current) => current + 1);
          }}
        />
        <EmployeeUserLinksSection
          employeeId={String(employee.employee_id)}
          result={employeeUserLinksResult}
          onChanged={setEmployeeUserLinksResult}
        />
        <CompensationRecordList
          result={compensationResult}
          onRetry={() => setCompensationRefreshKey((current) => current + 1)}
        />
      </>
    );
  }

  return (
    <Panel id="people-profile" className="people-panel" title="구성원 상세" meta={employeeId ? "선택됨" : "미선택"}>
      {body}
    </Panel>
  );
}
