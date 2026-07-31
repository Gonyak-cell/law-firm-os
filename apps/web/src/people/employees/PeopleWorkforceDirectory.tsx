import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDollarSign,
  CircleUserRound,
  FileText,
  Filter,
  GitBranch,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Scale,
  Search,
  SlidersHorizontal,
  UserPlus,
  UsersRound
} from "lucide-react";
import { fetchHrxEmployees, fetchHrxLifecycleBoard, fetchHrxOrgChart, updateHrxReportingLine } from "../hrxApiClient.ts";
import { memberPhotoFor } from "../memberPhotos.js";
import {
  safeEmployeeLabel,
  safePeopleLabel,
  UNRESOLVED_EMPLOYEE_LABEL,
} from "../peoplePresentation.ts";
import { EmployeeEditorDrawer } from "./EmployeeEditorDrawer.tsx";

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
  | { kind: "data"; org_units: HrxRecord[]; employees: HrxRecord[]; reporting_lines: HrxRecord[]; change_events: HrxRecord[]; scheduled_changes?: HrxRecord[]; as_of?: string | null; claim_boundary?: HrxRecord | null }
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
  contact: string;
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
type EmployeeEditorState = {
  mode: "create" | "edit";
  employee: HrxRecord | null;
};

const UNRESOLVED_ORG_UNIT_LABEL = "조직 이름 확인 필요";
const UNRESOLVED_DEPARTMENT_LABEL = "부서 확인 필요";

function safeProjectedLabel(value: unknown, relatedIdentifier: unknown = "") {
  return safePeopleLabel(value, { identifiers: [relatedIdentifier] });
}

function lifecycleEmployeeLabel(employee: HrxRecord | null, lifecycleRecord: HrxRecord, fallback: string) {
  const employeeId = stringField(lifecycleRecord, "employee_id") || stringField(employee ?? {}, "employee_id");
  const userId = stringField(lifecycleRecord, "user_id") || stringField(employee ?? {}, "user_id");
  const displayName = stringField(employee ?? {}, "display_name")
    || stringField(lifecycleRecord, "employee_display_name")
    || stringField(lifecycleRecord, "display_name");
  if (!displayName) return fallback;
  if (employee) {
    return safeEmployeeLabel({
      ...employee,
      employee_id: employeeId || stringField(employee, "employee_id"),
      user_id: userId || stringField(employee, "user_id"),
      display_name: displayName,
    });
  }
  return safePeopleLabel(displayName, {
    identifiers: [employeeId, userId],
    fallback: UNRESOLVED_EMPLOYEE_LABEL,
  });
}

function resolvedEmployeeLabel(employeeById: Map<string, OrgEmployee>, ...identifiers: unknown[]) {
  for (const identifier of identifiers) {
    const key = String(identifier ?? "").trim();
    if (!key) continue;
    const employee = employeeById.get(key);
    const name = safeProjectedLabel(employee?.name, key);
    if (name) return name;
  }
  return UNRESOLVED_EMPLOYEE_LABEL;
}

function resolvedManagerLabel(employeeById: Map<string, OrgEmployee>, identifier: unknown) {
  const key = String(identifier ?? "").trim();
  if (!key) return "없음";
  return safeProjectedLabel(employeeById.get(key)?.name, key) || "없음";
}

function resolvedOrgUnitLabel(orgUnitLabelById: Map<string, string>, identifier: unknown) {
  const key = String(identifier ?? "").trim();
  if (!key) return UNRESOLVED_ORG_UNIT_LABEL;
  return safeProjectedLabel(orgUnitLabelById.get(key), key) || UNRESOLVED_ORG_UNIT_LABEL;
}

function currentDateValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function recordField(value: unknown): HrxRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as HrxRecord : null;
}

function recordList(value: unknown): HrxRecord[] {
  return Array.isArray(value) ? value.filter((item): item is HrxRecord => Boolean(recordField(item))) : [];
}

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

export function rowsForTab(activeTab: string, employeeResult: EmployeeResult, lifecycleResult: LifecycleResult): WorkforceRow[] {
  const employees = employeeResult?.kind === "data" ? employeeResult.employees : [];
  const employeesById = new Map<string, HrxRecord>();
  employees.forEach((employee) => {
    for (const identifier of [stringField(employee, "employee_id"), stringField(employee, "user_id")]) {
      if (identifier) employeesById.set(identifier, employee);
    }
  });
  if (activeTab === "onboarding") {
    const plans = lifecycleResult?.kind === "data" ? lifecycleResult.onboarding : [];
    return plans.map((plan, index) => {
      const employeeId = stringField(plan, "employee_id");
      const userId = stringField(plan, "user_id");
      const employee = employeesById.get(employeeId) ?? employeesById.get(userId);
      return {
        key: `onboarding-${stringField(plan, "onboarding_id") || index}`,
        name: lifecycleEmployeeLabel(employee ?? null, plan, onboardingLabel(index)),
        department: "인사",
        jobTitle: "입사 준비",
        workerType: "입사 예정",
        country: "확인 필요",
        affiliation: "AMIC Law",
        organizationGroup: "인사",
        contact: "확인 필요",
        email: "확인 필요",
        employeeId: employee ? stringField(employee, "employee_id") || employeeId : undefined,
        muted: true
      };
    });
  }
  if (activeTab === "offboarding") {
    const cases = lifecycleResult?.kind === "data" ? lifecycleResult.offboarding : [];
    return cases.map((caseItem, index) => {
      const employeeId = stringField(caseItem, "employee_id");
      const userId = stringField(caseItem, "user_id");
      const employee = employeesById.get(employeeId) ?? employeesById.get(userId);
      return {
        key: `offboarding-${stringField(caseItem, "offboarding_id") || index}`,
        name: lifecycleEmployeeLabel(employee ?? null, caseItem, offboardingLabel(index)),
        department: "인사",
        jobTitle: "퇴사 정리",
        workerType: stringField(caseItem, "state") === "closed" ? "종료" : "퇴사 예정",
        country: "확인 필요",
        affiliation: "AMIC Law",
        organizationGroup: "인사",
        contact: "확인 필요",
        email: "확인 필요",
        employeeId: employee ? stringField(employee, "employee_id") || employeeId : undefined,
        muted: true
      };
    });
  }
  return employees
    .filter((employee) => employeeStatus(employee) === activeTab)
    .map((employee, index) => {
      const name = safeEmployeeLabel(employee);
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
        contact: stringField(employee, "mobile_phone") || "미등록",
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
      message: "구성원 정보를 확인할 수 없습니다."
    };
  }
  if (["onboarding", "offboarding"].includes(activeTab) && lifecycleResult?.kind === "error") {
    return {
      kind: "error",
      message: "입퇴사 정보를 확인할 수 없습니다."
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
  const [orgEditEffectiveFrom, setOrgEditEffectiveFrom] = useState(currentDateValue);
  const [orgSaving, setOrgSaving] = useState(false);
  const [employeeEditor, setEmployeeEditor] = useState<EmployeeEditorState | null>(null);

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
      [row.name, row.department, row.jobTitle, row.workerType, row.country, row.affiliation, row.organizationGroup, row.contact, row.email].some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedQuery)
      )
    );
  }, [allRows, query]);
  const status = statusForTab(activeTab, employeeResult, lifecycleResult);
  const orgStatus =
    orgChartResult === null
      ? { kind: "loading", message: "조직 정보를 불러오는 중입니다" }
      : orgChartResult.kind === "error"
        ? { kind: "error", message: "조직 정보를 확인할 수 없습니다." }
        : null;
  const orgUnits = useMemo<OrgUnit[]>(() => {
    const units = orgChartResult?.kind === "data" ? orgChartResult.org_units : [];
    return units.map((unit) => {
      const id = stringField(unit, "org_unit_id");
      const rawLabel = stringField(unit, "label");
      const rawDepartment = stringField(unit, "department");
      return {
        id,
        label: rawLabel ? safeProjectedLabel(rawLabel, id) || UNRESOLVED_ORG_UNIT_LABEL : "미등록",
        department: rawDepartment ? safeProjectedLabel(rawDepartment, id) || UNRESOLVED_DEPARTMENT_LABEL : "미등록",
        parentOrgUnitId: stringField(unit, "parent_org_unit_id"),
        memberCount: numberField(unit, "member_count")
      };
    });
  }, [orgChartResult]);
  const orgUnitLabelById = useMemo(() => new Map(orgUnits.map((unit) => [unit.id, unit.label])), [orgUnits]);
  const orgEmployees = useMemo<OrgEmployee[]>(() => {
    const employees = orgChartResult?.kind === "data" ? orgChartResult.employees : [];
    return employees.map((employee, index) => {
      const employeeId = stringField(employee, "employee_id");
      const orgUnitId = stringField(employee, "org_unit_id") || "unassigned";
      const managerEmployeeId = stringField(employee, "manager_employee_id");
      const rawName = stringField(employee, "display_name");
      const rawTitle = stringField(employee, "title");
      const rawOrgUnitLabel = stringField(employee, "org_unit_label");
      const rawDepartment = stringField(employee, "department");
      const rawManagerName = stringField(employee, "manager_display_name");
      return {
        key: employeeId || `org-employee-${index}`,
        employeeId,
        name: rawName ? safeProjectedLabel(rawName, employeeId) || UNRESOLVED_EMPLOYEE_LABEL : `구성원 ${index + 1}`,
        title: roleLabel(safeProjectedLabel(rawTitle, employeeId)),
        orgUnitId,
        orgUnitLabel: orgUnitLabelById.get(orgUnitId) || (rawOrgUnitLabel ? safeProjectedLabel(rawOrgUnitLabel, orgUnitId) || UNRESOLVED_ORG_UNIT_LABEL : "미등록"),
        department: rawDepartment ? safeProjectedLabel(rawDepartment, orgUnitId) || UNRESOLVED_DEPARTMENT_LABEL : "미등록",
        managerEmployeeId,
        managerName: rawManagerName ? safeProjectedLabel(rawManagerName, managerEmployeeId) || "없음" : "",
        directReportCount: numberField(employee, "direct_report_count")
      };
    });
  }, [orgChartResult, orgUnitLabelById]);
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
  const orgEmployeeById = useMemo(() => new Map(orgEmployees.map((employee) => [employee.employeeId, employee])), [orgEmployees]);
  const orgVisibleEmployeeById = useMemo(() => new Map(orgVisibleEmployees.map((employee) => [employee.employeeId, employee])), [orgVisibleEmployees]);
  const orgChildrenByManager = useMemo(() => {
    return orgVisibleEmployees.reduce((groups, employee) => {
      if (!employee.managerEmployeeId || !orgVisibleEmployeeById.has(employee.managerEmployeeId)) return groups;
      groups.set(employee.managerEmployeeId, [...(groups.get(employee.managerEmployeeId) ?? []), employee]);
      return groups;
    }, new Map<string, OrgEmployee[]>());
  }, [orgVisibleEmployeeById, orgVisibleEmployees]);
  const orgChangeEvents = orgChartResult?.kind === "data" ? orgChartResult.change_events : [];
  const orgScheduledChanges = orgChartResult?.kind === "data" ? orgChartResult.scheduled_changes ?? [] : [];
  const selectedOrgEmployee = orgEmployees.find((employee) => employee.employeeId === orgEditEmployeeId) ?? null;
  const showLocalAction = (title: string, body: string) => setLocalAction({ title, body });
  const openEmployeeEditor = (editor: EmployeeEditorState) => {
    setLocalAction(null);
    setEmployeeEditor(editor);
  };
  const closeEmployeeEditor = () => {
    setEmployeeEditor(null);
    setLocalAction(null);
  };
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
      manager_employee_id: orgEditManagerId || null,
      effective_from: orgEditEffectiveFrom
    });
    setOrgSaving(false);
    const orgChart = result.kind === "data" ? recordField(result.org_chart) : null;
    if (orgChart) {
      setOrgChartResult({
        kind: "data",
        org_units: recordList(orgChart.org_units),
        employees: recordList(orgChart.employees),
        reporting_lines: recordList(orgChart.reporting_lines),
        change_events: recordList(orgChart.change_events),
        scheduled_changes: recordList(orgChart.scheduled_changes),
        as_of: stringField(orgChart, "as_of") || null,
        claim_boundary: recordField(orgChart.claim_boundary)
      });
      showLocalAction(
        "조직 변경",
        orgEditEffectiveFrom > currentDateValue()
          ? `${orgEditEffectiveFrom}부터 적용될 변경으로 기록했습니다.`
          : "오늘부터 적용되는 변경으로 기록했습니다."
      );
      return;
    }
    const reason = "reason" in result ? result.reason : null;
    showLocalAction(
      "조직 변경 실패",
      reason === "HRX_ORG_REPORTING_LINE_CYCLE"
        ? "보고 관계가 순환하지 않도록 상급자를 다시 선택해 주세요."
        : reason === "HRX_EMPLOYMENT_PERIOD_OVERLAP"
          ? "같은 적용일에 이미 예정된 변경이 있습니다."
          : "저장 권한, 적용일과 보고 관계를 확인해 주세요."
    );
  };

  const handleEmployeeSaved = async (employee: HrxRecord) => {
    const refreshed = await fetchHrxEmployees();
    if (refreshed.kind === "data") {
      setEmployeeResult({ kind: "data", employees: refreshed.employees as HrxRecord[] });
      const employeeId = stringField(employee, "employee_id");
      if (employeeId) onSelectEmployee?.(employeeId);
      setEmployeeEditor(null);
      showLocalAction(
        employeeEditor?.mode === "create" ? "구성원 등록 완료" : "구성원 수정 완료",
        "서버에 저장된 최신 정보를 다시 확인했습니다."
      );
      return true;
    }
    return false;
  };

  const renderOrgEmployee = (employee: OrgEmployee, depth = 0): unknown => {
    const childRows = (orgChildrenByManager.get(employee.employeeId) ?? []).filter((child) => child.orgUnitId === employee.orgUnitId);
    const photo = memberPhotoFor(employee.name);
    const managerName = employee.managerEmployeeId
      ? safeProjectedLabel(orgEmployeeById.get(employee.managerEmployeeId)?.name, employee.managerEmployeeId)
      : safeProjectedLabel(employee.managerName);
    return [
        <div key={`${employee.key}-self`} className="hr-org-person" data-compact-record="true" style={{ paddingLeft: `${8 + depth * 16}px` }}>
          <span className="hr-roster-avatar">{photo ? <img src={photo} alt="" /> : initials(employee.name)}</span>
          <div>
            <strong>{employee.name}</strong>
            <small>
              {employee.title}
              {managerName ? ` / 상사 ${managerName}` : ""}
              {employee.directReportCount > 0 ? ` / 직속 ${employee.directReportCount}명` : ""}
            </small>
          </div>
        </div>,
      ...childRows.map((child) => renderOrgEmployee(child, depth + 1))
    ];
  };

  return (
    <section className="hr-roster-surface" data-hr-workforce-table="true" data-hr-workforce-density={compact ? "compact" : "standard"}>
      {compact && (
        <header className="hr-roster-header">
          <div>
            <h2>입퇴사 대상</h2>
          </div>
        </header>
      )}

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
              className="secondary-button hr-roster-add-button"
              data-people-employee-create="true"
              onClick={() => openEmployeeEditor({ mode: "create", employee: null })}
            >
              <UserPlus size={15} />
              구성원 등록
            </button>
          )}
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
              onClick={() => showLocalAction("속성 조정", "구성원, 직위, 부서, 연락처, 이메일 열을 기준으로 목록 속성을 확인했습니다.")}
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
                <col className="hr-roster-col-department" />
                <col className="hr-roster-col-contact" />
                <col className="hr-roster-col-email" />
              </colgroup>
              <thead>
                <tr>
                  <th><HeaderCell icon={FileText}>구성원</HeaderCell></th>
                  <th><HeaderCell icon={CircleUserRound}>직위</HeaderCell></th>
                  <th><HeaderCell icon={Building2}>부서</HeaderCell></th>
                  <th><HeaderCell icon={Phone}>연락처</HeaderCell></th>
                  <th><HeaderCell icon={Mail}>이메일</HeaderCell></th>
                </tr>
              </thead>
              <tbody>
                {status && (
                  <tr className={`hr-roster-state ${status.kind}`}>
                    <td colSpan={5}>
                      <strong>{status.message}</strong>
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
                          <div className="hr-roster-member-cell">
                            <button type="button" className="hr-roster-person" data-compact-record="true" aria-pressed={isSelected ? "true" : "false"} onClick={() => handleRowSelect(row)}>
                              <FileText className="hr-roster-page-icon" size={17} />
                              <span>
                                <strong>{row.name}</strong>
                                {compact && <small>{row.workerType} / {row.affiliation}</small>}
                              </span>
                            </button>
                            {!compact && row.employeeId && (
                              <button
                                type="button"
                                className="icon-button hr-roster-edit-button"
                                aria-label={`${safePeopleLabel(row.name, { identifiers: [row.employeeId], fallback: UNRESOLVED_EMPLOYEE_LABEL })} 수정`}
                                onClick={() => {
                                  const employee = employeeResult?.kind === "data"
                                    ? employeeResult.employees.find((candidate) => stringField(candidate, "employee_id") === row.employeeId) ?? null
                                    : null;
                                  openEmployeeEditor({ mode: "edit", employee });
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{row.jobTitle}</td>
                        <td>
                          <span className="hr-roster-source">
                            {sourceIcon(row.department)}
                            {row.department}
                          </span>
                        </td>
                        <td>{row.contact}</td>
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
          {orgStatus ? (
            <div className={`live-data-state ${orgStatus.kind === "loading" ? "live-data-loading" : "live-data-error"}`}>
              <strong>{orgStatus.message}</strong>
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
                    <span>직속 상급자</span>
                    <select value={orgEditManagerId} onChange={(event: SelectChangeEvent) => setOrgEditManagerId(event.target.value)}>
                      <option value="">없음</option>
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
                  <label>
                    <span>적용일</span>
                    <input
                      type="date"
                      value={orgEditEffectiveFrom}
                      onChange={(event: SelectChangeEvent) => setOrgEditEffectiveFrom(event.target.value)}
                      required
                    />
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
                        <header data-compact-record="true">
                          <span>
                            <strong>{unit.label}</strong>
                            <small>{unit.department}</small>
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
                      <th>직속 상급자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgChangeEvents.slice(0, 5).map((event) => {
                      const metadata = (event.metadata && typeof event.metadata === "object" ? event.metadata : {}) as HrxRecord;
                      return (
                        <tr key={stringField(event, "event_id")}>
                          <td>{resolvedEmployeeLabel(orgEmployeeById, stringField(metadata, "employee_id"), stringField(event, "object_id"))}</td>
                          <td>{resolvedOrgUnitLabel(orgUnitLabelById, stringField(metadata, "to_org_unit_id"))}</td>
                          <td>{resolvedManagerLabel(orgEmployeeById, stringField(metadata, "to_manager_employee_id"))}</td>
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
              <div className="hr-org-history" data-hr-org-scheduled-changes="true">
                <header>
                  <strong>예정된 조직 변경</strong>
                  <span>{orgScheduledChanges.length}건</span>
                </header>
                <table>
                  <thead>
                    <tr>
                      <th>적용일</th>
                      <th>대상</th>
                      <th>조직 · 직속 상급자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgScheduledChanges.map((change) => {
                      const employeeId = stringField(change, "employee_id");
                      const orgUnitId = stringField(change, "org_unit_id");
                      const managerEmployeeId = stringField(change, "manager_employee_id");
                      return (
                        <tr key={stringField(change, "profile_id")}>
                          <td>{stringField(change, "effective_from")}</td>
                          <td>{resolvedEmployeeLabel(orgEmployeeById, employeeId)}</td>
                          <td>
                            {resolvedOrgUnitLabel(orgUnitLabelById, orgUnitId)}
                            {" · "}
                            {resolvedManagerLabel(orgEmployeeById, managerEmployeeId)}
                          </td>
                        </tr>
                      );
                    })}
                    {orgScheduledChanges.length === 0 && (
                      <tr>
                        <td colSpan={3}>예정된 변경 없음</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      {employeeEditor && (
        <EmployeeEditorDrawer
          mode={employeeEditor.mode}
          employee={employeeEditor.employee}
          onClose={closeEmployeeEditor}
          onSaved={handleEmployeeSaved}
        />
      )}
    </section>
  );
}
