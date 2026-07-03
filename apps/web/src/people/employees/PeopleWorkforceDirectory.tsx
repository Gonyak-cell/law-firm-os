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
import { useSkin } from "../../context/SkinContext.jsx";
import { fetchHrxEmployees, fetchHrxLifecycleBoard, fetchHrxOrgChart, updateHrxReportingLine } from "../hrxApiClient.ts";
import { memberPhotoFor } from "../memberPhotos.js";

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
type OrgChartResult =
  | { kind: "data"; org_units: HrxRecord[]; employees: HrxRecord[]; reporting_lines: HrxRecord[]; change_events: HrxRecord[]; claim_boundary?: HrxRecord | null }
  | { kind: "error" }
  | null;
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
type IconComponent = (props: { size?: number }) => unknown;
type FormSubmitEvent = { preventDefault(): void };
type SelectChangeEvent = { target: { value: string } };
type OrgUnit = {
  id: string;
  label: string;
  department: string;
  parentOrgUnitId: string;
  memberCount: number;
};
type OrgEmployee = {
  key: string;
  employeeId: string;
  name: string;
  title: string;
  orgUnitId: string;
  orgUnitLabel: string;
  department: string;
  managerEmployeeId: string;
  managerName: string;
  directReportCount: number;
};

function stringField(record: HrxRecord, key: string) {
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function numberField(record: HrxRecord, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

function HeaderCell({ icon: Icon, children }: { icon: IconComponent; children: unknown }) {
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

function organizationGroupLabel(department: string) {
  if (department === "Legal") return "AMIC Law";
  if (department === "Finance") return "PETRA BRIDGE PARTNERS";
  return department;
}

export function PeopleWorkforceDirectory({ initialTab = "active", initialView = "table", refreshKey = 0, selectedEmployeeId = null, onSelectEmployee, compact = false }: WorkforceDirectoryProps) {
  const skin = useSkin();
  const [employeeResult, setEmployeeResult] = useState<EmployeeResult>(null);
  const [lifecycleResult, setLifecycleResult] = useState<LifecycleResult>(null);
  const [orgChartResult, setOrgChartResult] = useState<OrgChartResult>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [query, setQuery] = useState("");
  const [localAction, setLocalAction] = useState<LocalAction | null>(null);
  const [orgEditEmployeeId, setOrgEditEmployeeId] = useState("");
  const [orgEditManagerId, setOrgEditManagerId] = useState("");
  const [orgEditOrgUnitId, setOrgEditOrgUnitId] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setOrgChartResult(null);
    fetchHrxOrgChart().then((next) => {
      if (!cancelled) setOrgChartResult(next as OrgChartResult);
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
  const rowsByOrganization = useMemo(() => {
    return visibleRows.reduce((groups, row) => {
      const key = row.organizationGroup || row.department || "미등록";
      groups.set(key, [...(groups.get(key) ?? []), row]);
      return groups;
    }, new Map<string, WorkforceRow[]>());
  }, [visibleRows]);
  const status = statusForTab(activeTab, employeeResult, lifecycleResult);
  const orgStatus =
    orgChartResult === null
      ? { kind: "loading", message: "조직 정보를 불러오는 중입니다" }
      : orgChartResult.kind === "error"
        ? { kind: "error", message: "조직 정보를 불러오지 못했습니다.", detail: "로컬 런타임 또는 권한 컨텍스트를 확인하세요." }
        : null;
  const orgUnits = useMemo<OrgUnit[]>(() => {
    const units = orgChartResult?.kind === "data" ? orgChartResult.org_units : [];
    return units.map((unit) => ({
      id: stringField(unit, "org_unit_id"),
      label: stringField(unit, "label") || "미등록",
      department: stringField(unit, "department") || "미등록",
      parentOrgUnitId: stringField(unit, "parent_org_unit_id"),
      memberCount: numberField(unit, "member_count")
    }));
  }, [orgChartResult]);
  const orgEmployees = useMemo<OrgEmployee[]>(() => {
    const employees = orgChartResult?.kind === "data" ? orgChartResult.employees : [];
    return employees.map((employee, index) => ({
      key: stringField(employee, "employee_id") || `org-employee-${index}`,
      employeeId: stringField(employee, "employee_id"),
      name: stringField(employee, "display_name") || `구성원 ${index + 1}`,
      title: roleLabel(stringField(employee, "title")),
      orgUnitId: stringField(employee, "org_unit_id") || "unassigned",
      orgUnitLabel: stringField(employee, "org_unit_label") || "미등록",
      department: stringField(employee, "department") || "미등록",
      managerEmployeeId: stringField(employee, "manager_employee_id"),
      managerName: stringField(employee, "manager_display_name"),
      directReportCount: numberField(employee, "direct_report_count")
    }));
  }, [orgChartResult]);
  const orgVisibleEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orgEmployees;
    return orgEmployees.filter((employee) =>
      [employee.name, employee.title, employee.orgUnitLabel, employee.department, employee.managerName].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [orgEmployees, query]);
  const orgEmployeesByUnit = useMemo(() => {
    return orgVisibleEmployees.reduce((groups, employee) => {
      const key = employee.orgUnitId || "unassigned";
      groups.set(key, [...(groups.get(key) ?? []), employee]);
      return groups;
    }, new Map<string, OrgEmployee[]>());
  }, [orgVisibleEmployees]);
  const orgUnitLabelById = useMemo(() => new Map(orgUnits.map((unit) => [unit.id, unit.label])), [orgUnits]);
  const orgEmployeeById = useMemo(() => new Map(orgVisibleEmployees.map((employee) => [employee.employeeId, employee])), [orgVisibleEmployees]);
  const orgChildrenByManager = useMemo(() => {
    return orgVisibleEmployees.reduce((groups, employee) => {
      if (!employee.managerEmployeeId || !orgEmployeeById.has(employee.managerEmployeeId)) return groups;
      groups.set(employee.managerEmployeeId, [...(groups.get(employee.managerEmployeeId) ?? []), employee]);
      return groups;
    }, new Map<string, OrgEmployee[]>());
  }, [orgEmployeeById, orgVisibleEmployees]);
  const orgChangeEvents = orgChartResult?.kind === "data" ? orgChartResult.change_events : [];
  const selectedOrgEmployee = orgEmployees.find((employee) => employee.employeeId === orgEditEmployeeId) ?? null;
  const showLocalAction = (title: string, body: string) => setLocalAction({ title, body });
  const handleRowSelect = (row: WorkforceRow) => {
    if (row.employeeId) {
      onSelectEmployee?.(row.employeeId);
      setLocalAction(null);
      return;
    }
    showLocalAction(`${row.name} 선택됨`, `${row.jobTitle} 항목은 아래 입퇴사 관리 보드에서 확인합니다.`);
  };
  useEffect(() => {
    if (orgEmployees.length === 0) {
      setOrgEditEmployeeId("");
      return;
    }
    if (!orgEmployees.some((employee) => employee.employeeId === orgEditEmployeeId)) {
      setOrgEditEmployeeId(orgEmployees[0].employeeId);
    }
  }, [orgEditEmployeeId, orgEmployees]);

  useEffect(() => {
    if (!selectedOrgEmployee) {
      setOrgEditManagerId("");
      setOrgEditOrgUnitId("");
      return;
    }
    setOrgEditManagerId(selectedOrgEmployee.managerEmployeeId);
    setOrgEditOrgUnitId(selectedOrgEmployee.orgUnitId === "unassigned" ? "" : selectedOrgEmployee.orgUnitId);
  }, [selectedOrgEmployee]);

  const handleOrgAssignmentSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    if (!orgEditEmployeeId) return;
    setOrgSaving(true);
    const result = await updateHrxReportingLine(orgEditEmployeeId, {
      org_unit_id: orgEditOrgUnitId || null,
      manager_employee_id: orgEditManagerId || null
    });
    setOrgSaving(false);
    if (result.kind === "data" && result.org_chart) {
      setOrgChartResult({ kind: "data", ...result.org_chart } as OrgChartResult);
      showLocalAction("조직 변경", "변경 이력이 기록되었습니다.");
      return;
    }
    showLocalAction("조직 변경 실패", "저장 권한과 리포팅 라인을 확인하세요.");
  };

  const renderOrgEmployee = (employee: OrgEmployee, depth = 0): unknown => {
    const childRows = (orgChildrenByManager.get(employee.employeeId) ?? []).filter((child) => child.orgUnitId === employee.orgUnitId);
    const photo = skin === "forest" ? memberPhotoFor(employee.name) : undefined;
    return [
        <div key={`${employee.key}-self`} className="hr-org-person" style={{ paddingLeft: `${8 + depth * 16}px` }}>
          <span className="hr-roster-avatar">{photo ? <img src={photo} alt="" /> : initials(employee.name)}</span>
          <div>
            <strong>{employee.name}</strong>
            <small>
              {employee.title}
              {employee.managerName ? ` / 상위 ${employee.managerName}` : " / 최상위"}
              {employee.directReportCount > 0 ? ` / 직속 ${employee.directReportCount}명` : ""}
            </small>
          </div>
        </div>,
      ...childRows.map((child) => renderOrgEmployee(child, depth + 1))
    ];
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
            <input value={query} onChange={(event: SelectChangeEvent) => setQuery(event.target.value)} placeholder="검색" aria-label="구성원 검색" />
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
                {!status && Array.from(rowsByOrganization.entries()).flatMap(([organization, rows]) => [
                  <tr key={`${organization}-group`} className="hr-roster-organization-row">
                    <td colSpan={5}>
                      <strong>{organization}</strong>
                      <span>{rows.length}명</span>
                    </td>
                  </tr>,
                  ...rows.map((row) => {
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
                  })
                ])}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="hr-org-chart" data-hr-org-chart="true">
          <div className="hr-org-root">
            <GitBranch size={18} />
            <strong>조직</strong>
            <span>근로정보 기준 리포팅 라인</span>
          </div>
          {orgStatus ? (
            <div className={`live-data-state ${orgStatus.kind === "error" ? "live-data-error" : "live-data-loading"}`}>
              <strong>{orgStatus.message}</strong>
              {orgStatus.detail && <span>{orgStatus.detail}</span>}
            </div>
          ) : (
            <>
              {!compact && orgEmployees.length > 0 && (
                <form className="hr-org-editor" data-hr-org-editor="true" onSubmit={handleOrgAssignmentSubmit}>
                  <label>
                    <span>구성원</span>
                    <select value={orgEditEmployeeId} onChange={(event: SelectChangeEvent) => setOrgEditEmployeeId(event.target.value)}>
                      {orgEmployees.map((employee) => (
                        <option key={employee.employeeId} value={employee.employeeId}>{employee.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>상위자</span>
                    <select value={orgEditManagerId} onChange={(event: SelectChangeEvent) => setOrgEditManagerId(event.target.value)}>
                      <option value="">최상위</option>
                      {orgEmployees
                        .filter((employee) => employee.employeeId !== orgEditEmployeeId)
                        .map((employee) => (
                          <option key={employee.employeeId} value={employee.employeeId}>{employee.name}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span>조직</span>
                    <select value={orgEditOrgUnitId} onChange={(event: SelectChangeEvent) => setOrgEditOrgUnitId(event.target.value)}>
                      {orgUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="primary-button" disabled={orgSaving || !orgEditEmployeeId || !orgEditOrgUnitId}>
                    <GitBranch size={15} />
                    {orgSaving ? "저장 중" : "저장"}
                  </button>
                </form>
              )}
              <div className="hr-org-grid">
                {orgUnits
                  .filter((unit) => (orgEmployeesByUnit.get(unit.id) ?? []).length > 0)
                  .map((unit) => {
                    const rows = orgEmployeesByUnit.get(unit.id) ?? [];
                    const roots = rows.filter((row) => !row.managerEmployeeId || !rows.some((candidate) => candidate.employeeId === row.managerEmployeeId));
                    return (
                      <article key={unit.id} className="hr-org-group">
                        <header>
                          <span>
                            <strong>{unit.label}</strong>
                            <small>{unit.department}{unit.parentOrgUnitId ? ` / 상위 ${orgUnitLabelById.get(unit.parentOrgUnitId) ?? unit.parentOrgUnitId}` : ""}</small>
                          </span>
                          <span>{rows.length}명</span>
                        </header>
                        {roots.map((employee) => renderOrgEmployee(employee))}
                      </article>
                    );
                  })}
                {orgVisibleEmployees.length === 0 && (
                  <div className="live-data-state live-data-empty">
                    <strong>조직에 표시할 구성원이 없습니다.</strong>
                  </div>
                )}
              </div>
              <div className="hr-org-history" data-hr-org-change-history="true">
                <header>
                  <strong>조직 변경 이력</strong>
                  <span>{orgChangeEvents.length}건</span>
                </header>
                <table>
                  <thead>
                    <tr>
                      <th>대상</th>
                      <th>조직</th>
                      <th>상위자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgChangeEvents.slice(0, 5).map((event) => {
                      const metadata = (event.metadata && typeof event.metadata === "object" ? event.metadata : {}) as HrxRecord;
                      return (
                        <tr key={stringField(event, "event_id")}>
                          <td>{orgEmployeeById.get(stringField(metadata, "employee_id"))?.name ?? stringField(metadata, "employee_id") ?? stringField(event, "object_id")}</td>
                          <td>{orgUnitLabelById.get(stringField(metadata, "to_org_unit_id")) ?? stringField(metadata, "to_org_unit_id") ?? "미등록"}</td>
                          <td>{orgEmployeeById.get(stringField(metadata, "to_manager_employee_id"))?.name ?? "최상위"}</td>
                        </tr>
                      );
                    })}
                    {orgChangeEvents.length === 0 && (
                      <tr>
                        <td colSpan={3}>기록 없음</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
