import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  CircleDollarSign,
  CircleUserRound,
  FileText,
  Filter,
  GitBranch,
  LockKeyhole,
  Mail,
  Scale,
  Search,
  SlidersHorizontal,
  UserPlus,
  UsersRound
} from "lucide-react";
import { fetchHrxEmployees, fetchHrxLifecycleBoard } from "../hrxApiClient.ts";

const STATUS_TABS = [
  { id: "active", label: "현재 재직" },
  { id: "onboarding", label: "입사예정" },
  { id: "offboarding", label: "퇴사예정" },
  { id: "dismissed", label: "퇴사" },
  { id: "collaborators", label: "계약직" }
];

type HrxRecord = Record<string, unknown>;
type EmployeeResult = { kind: "data"; employees: HrxRecord[] } | { kind: "error" } | null;
type LifecycleResult = { kind: "data"; onboarding: HrxRecord[]; offboarding: HrxRecord[] } | { kind: "error" } | null;
type ViewMode = "table" | "org";
type WorkforceRow = {
  key: string;
  name: string;
  department: string;
  jobTitle: string;
  workerType: string;
  country: string;
  affiliation: string;
  organizationGroup: string;
  email: string;
  employeeId?: string;
  muted?: boolean;
};
type WorkforceDirectoryProps = {
  initialTab?: string;
  initialView?: ViewMode;
  refreshKey?: number;
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string | null) => void;
  compact?: boolean;
};
type LocalAction = {
  title: string;
  body: string;
};

function stringField(record: HrxRecord, key: string) {
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function roleLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "미등록";
  if (/[가-힣]/.test(text)) return text;
  const normalized = text.toLowerCase();
  if (normalized.includes("partner")) return "파트너";
  if (normalized.includes("associate")) return "어소시에이트";
  if (normalized.includes("paralegal")) return "실무 지원";
  if (normalized.includes("intern")) return "인턴";
  if (normalized.includes("contractor")) return "계약직";
  if (normalized.includes("admin")) return "관리";
  if (normalized.includes("hr")) return "인사 담당";
  return "담당자";
}

function departmentLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "미등록";
  const normalized = text.toLowerCase();
  if (text === "법무" || normalized.includes("legal")) return "Legal";
  if (text === "재무" || normalized.includes("finance")) return "Finance";
  if (text === "경영지원실" || normalized.includes("staff")) return "Staff";
  if (/[가-힣]/.test(text)) return text;
  if (normalized.includes("product")) return "제품";
  if (normalized.includes("people") || normalized.includes("hr")) return "인사";
  return "운영";
}

function countryLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "미등록";
  if (/[가-힣]/.test(text)) return text;
  if (text.toLowerCase().includes("korea")) return "대한민국";
  if (text.toLowerCase().includes("singapore")) return "싱가포르";
  if (text.toLowerCase().includes("united states") || text.toLowerCase() === "us") return "미국";
  return text;
}

function workerTypeLabel(employee: HrxRecord) {
  const source = (stringField(employee, "worker_type") || stringField(employee, "employment_type") || stringField(employee, "role")).toLowerCase();
  if (source.includes("contract")) return "계약";
  if (source.includes("intern")) return "인턴";
  if (source.includes("part")) return "파트타임";
  return "정규";
}

function affiliationLabel(employee: HrxRecord) {
  return stringField(employee, "affiliation") || stringField(employee, "organization") || "AMIC Law";
}

function employeeStatus(employee: HrxRecord) {
  const status = stringField(employee, "status").toLowerCase();
  if (status.includes("terminated") || status.includes("dismissed") || status.includes("inactive")) return "dismissed";
  if (status.includes("contract") || status.includes("collaborator")) return "collaborators";
  return "active";
}

function onboardingLabel(index: number) {
  return index === 0 ? "입사 준비" : `입사 준비 ${index + 1}`;
}

function offboardingLabel(index: number) {
  return index === 0 ? "퇴사 정리" : `퇴사 정리 ${index + 1}`;
}

function initials(name: unknown) {
  const text = String(name ?? "").trim();
  return text.slice(0, 1) || "구";
}

function sourceIcon(source: string) {
  if (source === "Legal") return <Scale size={15} />;
  if (source === "Finance") return <CircleDollarSign size={15} />;
  if (source === "Staff") return <UsersRound size={15} />;
  return source === "미등록" || source === "확인 필요" ? <LockKeyhole size={15} /> : <Building2 size={15} />;
}

function HeaderCell({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <span className="hr-roster-header-cell">
      <Icon size={15} />
      {children}
    </span>
  );
}

function rowsForTab(activeTab: string, employeeResult: EmployeeResult, lifecycleResult: LifecycleResult): WorkforceRow[] {
  const employees = employeeResult?.kind === "data" ? employeeResult.employees : [];
  if (activeTab === "onboarding") {
    const plans = lifecycleResult?.kind === "data" ? lifecycleResult.onboarding : [];
    return plans.map((plan, index) => ({
      key: `onboarding-${stringField(plan, "onboarding_id") || index}`,
      name: onboardingLabel(index),
      department: "인사",
      jobTitle: "입사 준비",
      workerType: "입사 예정",
      country: "확인 필요",
      affiliation: "AMIC Law",
      organizationGroup: "인사",
      email: "확인 필요",
      muted: true
    }));
  }
  if (activeTab === "offboarding") {
    const cases = lifecycleResult?.kind === "data" ? lifecycleResult.offboarding : [];
    return cases.map((caseItem, index) => ({
      key: `offboarding-${stringField(caseItem, "offboarding_id") || index}`,
      name: offboardingLabel(index),
      department: "인사",
      jobTitle: "퇴사 정리",
      workerType: stringField(caseItem, "state") === "closed" ? "종료" : "퇴사 예정",
      country: "확인 필요",
      affiliation: "AMIC Law",
      organizationGroup: "인사",
      email: "확인 필요",
      muted: true
    }));
  }
  return employees
    .filter((employee) => employeeStatus(employee) === activeTab)
    .map((employee, index) => {
      const name = stringField(employee, "display_name") || `구성원 ${index + 1}`;
      const department = departmentLabel(stringField(employee, "department") || stringField(employee, "department_label") || stringField(employee, "organization_label"));
      return {
        key: stringField(employee, "employee_id") || `employee-${index}`,
        name,
        department,
        jobTitle: roleLabel(stringField(employee, "title") || stringField(employee, "role")),
        workerType: workerTypeLabel(employee),
        country: countryLabel(stringField(employee, "country") || stringField(employee, "country_label")),
        affiliation: affiliationLabel(employee),
        organizationGroup: stringField(employee, "organization_group") || organizationGroupLabel(department),
        email: stringField(employee, "work_email") || stringField(employee, "email") || "확인 필요",
        employeeId: stringField(employee, "employee_id") || undefined
      };
    });
}

function statusForTab(activeTab: string, employeeResult: EmployeeResult, lifecycleResult: LifecycleResult) {
  if (employeeResult === null || (["onboarding", "offboarding"].includes(activeTab) && lifecycleResult === null)) {
    return { kind: "loading", message: "구성원 목록을 불러오는 중입니다" };
  }
  if (employeeResult?.kind === "error") {
    return {
      kind: "error",
      message: "구성원 목록을 불러오지 못했습니다.",
      detail: "로컬 런타임 또는 권한 컨텍스트를 확인하세요."
    };
  }
  if (["onboarding", "offboarding"].includes(activeTab) && lifecycleResult?.kind === "error") {
    return {
      kind: "error",
      message: "입퇴사 관리 업무를 불러오지 못했습니다.",
      detail: "로컬 런타임 또는 권한 컨텍스트를 확인하세요."
    };
  }
  return null;
}

function groupByOrganization(rows: WorkforceRow[]) {
  return rows.reduce((groups, row) => {
    const key = row.organizationGroup || row.department || "미등록";
    groups.set(key, [...(groups.get(key) ?? []), row]);
    return groups;
  }, new Map<string, WorkforceRow[]>());
}

function organizationGroupLabel(department: string) {
  if (department === "Legal") return "AMIC";
  if (department === "Finance") return "PETRA BRIDGE";
  return department;
}

export function PeopleWorkforceDirectory({ initialTab = "active", initialView = "table", refreshKey = 0, selectedEmployeeId = null, onSelectEmployee, compact = false }: WorkforceDirectoryProps) {
  const [employeeResult, setEmployeeResult] = useState<EmployeeResult>(null);
  const [lifecycleResult, setLifecycleResult] = useState<LifecycleResult>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [query, setQuery] = useState("");
  const [localAction, setLocalAction] = useState<LocalAction | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  useEffect(() => {
    let cancelled = false;
    setEmployeeResult(null);
    fetchHrxEmployees().then((next) => {
      if (!cancelled) setEmployeeResult(next as EmployeeResult);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLifecycleResult(null);
    fetchHrxLifecycleBoard().then((next) => {
      if (!cancelled) setLifecycleResult(next as LifecycleResult);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const allRows = useMemo(() => rowsForTab(activeTab, employeeResult, lifecycleResult), [activeTab, employeeResult, lifecycleResult]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allRows;
    return allRows.filter((row) =>
      [row.name, row.department, row.jobTitle, row.workerType, row.country, row.affiliation, row.email].some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedQuery)
      )
    );
  }, [allRows, query]);
  const status = statusForTab(activeTab, employeeResult, lifecycleResult);
  const orgStatus = statusForTab("active", employeeResult, lifecycleResult);
  const orgGroups = groupByOrganization(rowsForTab("active", employeeResult, lifecycleResult));
  const showLocalAction = (title: string, body: string) => setLocalAction({ title, body });
  const handleRowSelect = (row: WorkforceRow) => {
    if (row.employeeId) {
      onSelectEmployee?.(row.employeeId);
      setLocalAction(null);
      return;
    }
    showLocalAction(`${row.name} 선택됨`, `${row.jobTitle} 항목은 아래 입퇴사 관리 보드에서 확인합니다.`);
  };

  return (
    <section className="hr-roster-surface" data-hr-workforce-table="true" data-hr-workforce-density={compact ? "compact" : "standard"}>
      <header className="hr-roster-header">
        <div>
          <h2>{compact ? "입퇴사 대상" : "구성원"}</h2>
        </div>
        <div className="hr-roster-actions">
          {!compact && (
            <button
              type="button"
              className="text-button"
              data-hr-workforce-more="true"
              onClick={() => showLocalAction("추가 작업", `현재 ${visibleRows.length}개 항목에 적용할 수 있는 목록 작업을 확인했습니다.`)}
            >
              더보기
              <ChevronDown size={14} />
            </button>
          )}
          <button type="button" className={viewMode === "org" ? "secondary-button active" : "secondary-button"} onClick={() => setViewMode(viewMode === "org" ? "table" : "org")}>
            <GitBranch size={15} />
            조직
          </button>
          {!compact && (
            <>
              <button
                type="button"
                className="primary-button"
                data-hr-workforce-add="true"
                onClick={() => showLocalAction("구성원 추가", "HRX 구성원 등록 준비 상태를 열었습니다. 저장은 권한 확인 후 등록 화면에서 처리합니다.")}
              >
                <UserPlus size={15} />
                구성원 추가
              </button>
              <button
                type="button"
                className="primary-button icon-only"
                aria-label="추가 메뉴"
                data-hr-workforce-add-menu="true"
                onClick={() => showLocalAction("추가 메뉴", "구성원 등록, 목록 내보내기, 보기 설정 작업을 확인했습니다.")}
              >
                <ChevronDown size={15} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="hr-roster-library-bar">
        <nav className="hr-roster-tabs" aria-label="구성원 상태">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => {
                setActiveTab(tab.id);
                setViewMode("table");
                setLocalAction(null);
                onSelectEmployee?.(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="hr-roster-view-tools" aria-label="테이블 도구">
          {!compact && (
            <button
              type="button"
              className="icon-button"
              aria-label="표 보기 옵션"
              data-hr-workforce-table-options="true"
              onClick={() => showLocalAction("표 보기 옵션", `${viewMode === "org" ? "조직" : "표"} 보기에서 ${visibleRows.length}개 항목을 표시합니다.`)}
            >
              <Filter size={16} />
            </button>
          )}
          <label className="hr-roster-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" aria-label="구성원 검색" />
          </label>
          {!compact && (
            <button
              type="button"
              className="icon-button"
              aria-label="속성 조정"
              data-hr-workforce-property-options="true"
              onClick={() => showLocalAction("속성 조정", "직위, 구성원, 소속, 부서, 이메일 열을 기준으로 목록 속성을 확인했습니다.")}
            >
              <SlidersHorizontal size={16} />
            </button>
          )}
        </div>
      </div>

      {localAction && (
        <div className="live-data-state live-data-review" data-hr-workforce-local-state="true" role="status">
          <strong>{localAction.title}</strong>
          {localAction.body}
        </div>
      )}

      {viewMode === "table" ? (
        <div className="hr-roster-library" data-hr-library-table="true">
          <div className="hr-roster-table-wrap">
            <table className="hr-roster-table">
              <colgroup>
                <col className="hr-roster-col-member" />
                <col className="hr-roster-col-title" />
                <col className="hr-roster-col-affiliation" />
                <col className="hr-roster-col-department" />
                <col className="hr-roster-col-email" />
              </colgroup>
              <thead>
                <tr>
                  <th><HeaderCell icon={FileText}>구성원</HeaderCell></th>
                  <th><HeaderCell icon={CircleUserRound}>직위</HeaderCell></th>
                  <th><HeaderCell icon={CircleUserRound}>소속</HeaderCell></th>
                  <th><HeaderCell icon={Building2}>부서</HeaderCell></th>
                  <th><HeaderCell icon={Mail}>이메일</HeaderCell></th>
                </tr>
              </thead>
              <tbody>
                {status && (
                  <tr className={`hr-roster-state ${status.kind}`}>
                    <td colSpan={5}>
                      <strong>{status.message}</strong>
                      {status.detail && <span>{status.detail}</span>}
                    </td>
                  </tr>
                )}
                {!status && visibleRows.length === 0 && (
                  <tr className="hr-roster-state empty">
                    <td colSpan={5}>
                      <strong>표시할 구성원이 없습니다.</strong>
                    </td>
                  </tr>
                )}
                {!status && visibleRows.map((row) => {
                  const isSelected = Boolean(row.employeeId && row.employeeId === selectedEmployeeId);
                  return (
                    <tr key={row.key} className={[row.muted ? "muted" : "", isSelected ? "selected" : ""].filter(Boolean).join(" ")}>
                      <td>
                        <button type="button" className="hr-roster-person" aria-pressed={isSelected ? "true" : "false"} onClick={() => handleRowSelect(row)}>
                          <FileText className="hr-roster-page-icon" size={17} />
                          <span>
                            <strong>{row.name}</strong>
                            {compact && <small>{row.workerType} / {row.affiliation}</small>}
                          </span>
                        </button>
                      </td>
                      <td>{row.jobTitle}</td>
                      <td>
                        <span className="hr-roster-owner">
                          <span className="hr-roster-avatar">{initials(row.affiliation)}</span>
                          {row.affiliation}
                        </span>
                      </td>
                      <td>
                        <span className="hr-roster-source">
                          {sourceIcon(row.department)}
                          {row.department}
                        </span>
                      </td>
                      <td>{row.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="hr-org-chart" data-hr-org-chart="true">
          <div className="hr-org-root">
            <GitBranch size={18} />
            <strong>조직</strong>
            <span>재직 구성원을 소속 기준으로 표시합니다.</span>
          </div>
          {orgStatus ? (
            <div className={`live-data-state ${orgStatus.kind === "error" ? "live-data-error" : "live-data-loading"}`}>
              <strong>{orgStatus.message}</strong>
              {orgStatus.detail && <span>{orgStatus.detail}</span>}
            </div>
          ) : (
            <div className="hr-org-grid">
              {[...orgGroups.entries()].map(([organization, rows]) => (
                <article key={organization} className="hr-org-group">
                  <header>
                    <strong>{organization}</strong>
                    <span>{rows.length}명</span>
                  </header>
                  {rows.map((row) => (
                    <div key={row.key} className="hr-org-person">
                      <span className="hr-roster-avatar">{initials(row.name)}</span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>{row.jobTitle}</small>
                      </div>
                    </div>
                  ))}
                </article>
              ))}
              {orgGroups.size === 0 && (
                <div className="live-data-state live-data-empty">
                  <strong>조직에 표시할 구성원이 없습니다.</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
