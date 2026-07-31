import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { HrxStepUpChallenge } from "../security/HrxStepUpChallenge.tsx";
import {
  assignHrxPayrollItem,
  createHrxPayrollItem,
  createHrxPayrollProfile,
  retireHrxPayrollItemAssignment,
  fetchHrxEmployees,
  fetchHrxCompensationRecords,
  fetchHrxPayrollItems,
  fetchHrxPayrollProfile,
  updateHrxPayrollProfile,
  updateHrxPayrollItem,
  type HrxPayrollItem,
  type HrxPayrollItemAssignment,
  type HrxPayrollProfile,
  type HrxCompensationRecord,
} from "../hrxApiClient.ts";
import {
  safeEmployeeLabel,
  UNRESOLVED_EMPLOYEE_LABEL,
} from "../peoplePresentation.ts";

type Employee = {
  employee_id?: string;
  display_name?: string;
  status?: string;
};
const UNKNOWN_EMPLOYEE_LABEL = UNRESOLVED_EMPLOYEE_LABEL;

function employeeLabel(employee: Employee | null | undefined) {
  return safeEmployeeLabel(employee, UNKNOWN_EMPLOYEE_LABEL);
}

type SubmitEvent = { preventDefault(): void };
type LoadState = "loading" | "ready" | "empty" | "denied" | "error" | "step_up";
type ItemForm = {
  item_id: string;
  code: string;
  display_name: string;
  kind: HrxPayrollItem["kind"];
  tax_treatment: HrxPayrollItem["tax_treatment"];
  value_mode: HrxPayrollItem["value_mode"];
  calculation_order: string;
  effective_from: string;
  effective_to: string;
  status: HrxPayrollItem["status"];
  expected_version: number;
};

const EMPTY_ITEM_FORM: ItemForm = {
  item_id: "",
  code: "",
  display_name: "",
  kind: "earning",
  tax_treatment: "taxable",
  value_mode: "fixed",
  calculation_order: "100",
  effective_from: "",
  effective_to: "",
  status: "active",
  expected_version: 0,
};

const EMPTY_PROFILE_FORM = {
  employment_type: "monthly" as HrxPayrollProfile["employment_type"],
  effective_from: "",
  effective_to: "",
  dependent_count: "",
  income_tax_exempt: "" as "" | "yes" | "no",
  pension_enrolled: "" as "" | "yes" | "no",
  health_enrolled: "" as "" | "yes" | "no",
  employment_insurance_enrolled: "" as "" | "yes" | "no",
};

const EMPTY_ASSIGNMENT_FORM = {
  item_id: "",
  amount_krw: "",
  effective_from: "",
  effective_to: "",
};

function rows<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((row): row is T => Boolean(row) && typeof row === "object")
    : [];
}

function safeRefPart(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 80);
}

function generatedId(prefix: string, ...parts: string[]) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  return [prefix, ...parts.map(safeRefPart), suffix].filter(Boolean).join("-");
}

function errorState(result: { kind?: string; reason?: unknown } | null | undefined): LoadState {
  if (result?.kind === "step_up_required") return "step_up";
  if (result?.kind === "guarded" || String(result?.reason ?? "") === "HRX_AUTHZ_DENIED") return "denied";
  return "error";
}

function itemKindLabel(value: string) {
  return value === "earning" ? "지급" : value === "deduction" ? "공제" : value;
}

function taxLabel(value: string) {
  return value === "taxable" ? "과세" : value === "non_taxable" ? "비과세" : value;
}

function valueModeLabel(value: string) {
  return value === "fixed" ? "고정 금액" : value === "variable" ? "매번 입력" : value;
}

function employmentTypeLabel(value: string) {
  return ({
    monthly: "월급",
    hourly: "시급",
    daily: "일급",
    freelancer: "용역",
  } as Record<string, string>)[value] ?? value;
}

function payGroupCode(value: HrxPayrollProfile["employment_type"]) {
  return ({
    monthly: "KR-MONTHLY",
    hourly: "KR-HOURLY",
    daily: "KR-DAILY",
    freelancer: "KR-CONTRACT",
  } as const)[value];
}

function compensationUnit(value: HrxPayrollProfile["employment_type"]) {
  return ({
    monthly: "period",
    hourly: "hour",
    daily: "day",
    freelancer: "contract",
  } as const)[value];
}

function withObjectParticle(value: string) {
  const lastCodePoint = value.charCodeAt(value.length - 1);
  const hasFinalConsonant = lastCodePoint >= 0xac00
    && lastCodePoint <= 0xd7a3
    && (lastCodePoint - 0xac00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "을" : "를"}`;
}

function LoadingOrError({ state, noun }: { state: LoadState; noun: string }) {
  const object = withObjectParticle(noun);
  if (state === "loading") return <div className="live-data-state live-data-loading">{object} 불러오는 중입니다</div>;
  if (state === "denied") return <div className="live-data-state live-data-error" role="alert">{object} 볼 권한이 없습니다.</div>;
  if (state === "error") return <div className="live-data-state live-data-error" role="alert">{object} 불러오지 못했습니다.</div>;
  return null;
}

function PayrollItemsSection() {
  const [items, setItems] = useState<HrxPayrollItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [form, setForm] = useState<ItemForm>({ ...EMPTY_ITEM_FORM });
  const [formVisible, setFormVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function loadItems() {
    setState("loading");
    setSaveError("");
    const result = await fetchHrxPayrollItems(true);
    if (result.kind !== "data") {
      setItems([]);
      setState(errorState(result));
      return;
    }
    const nextItems = rows<HrxPayrollItem>(result.items);
    setItems(nextItems);
    setState(nextItems.length ? "ready" : "empty");
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function startCreate() {
    setForm({ ...EMPTY_ITEM_FORM });
    setSaveError("");
    setFormVisible(true);
  }

  function startEdit(item: HrxPayrollItem) {
    setForm({
      item_id: item.item_id,
      code: item.code,
      display_name: item.display_name,
      kind: item.kind,
      tax_treatment: item.tax_treatment,
      value_mode: item.value_mode,
      calculation_order: String(item.calculation_order),
      effective_from: item.effective_from,
      effective_to: item.effective_to ?? "",
      status: item.status,
      expected_version: item.state_version,
    });
    setSaveError("");
    setFormVisible(true);
  }

  async function saveItem(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setSaveError("");
    const body = {
      display_name: form.display_name.trim(),
      kind: form.kind,
      tax_treatment: form.tax_treatment,
      value_mode: form.value_mode,
      calculation_order: Number(form.calculation_order),
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      status: form.status,
    };
    const result = form.item_id
      ? await updateHrxPayrollItem(form.item_id, { ...body, expected_version: form.expected_version })
      : await createHrxPayrollItem({
        ...body,
        item_id: generatedId("payroll-item", form.code.toLowerCase()),
        code: form.code.trim().toUpperCase(),
      });
    setBusy(false);
    if (result.kind !== "data") {
      if (result.kind === "step_up_required") setState("step_up");
      else setSaveError(result.kind === "guarded" ? "급여 항목을 수정할 권한이 없습니다." : "급여 항목을 저장하지 못했습니다.");
      return;
    }
    setForm({ ...EMPTY_ITEM_FORM });
    setFormVisible(false);
    await loadItems();
  }

  return (
    <section className="pay-rules-section" aria-labelledby="payroll-items-heading" data-payroll-catalog-section="items">
      <div className="pay-rules-section-head">
        <div>
          <h3 id="payroll-items-heading">급여 항목</h3>
          <span>기본급·수당·공제 항목과 적용 기간을 관리합니다. 사용한 항목은 삭제하지 않고 중지합니다.</span>
        </div>
        <button className="secondary-button" type="button" disabled={state !== "ready" && state !== "empty"} onClick={startCreate}>
          <Plus size={14} />새 항목
        </button>
      </div>

      {state === "step_up" && (
        <HrxStepUpChallenge purpose="payroll_export_review" onVerified={() => void loadItems()} />
      )}
      <LoadingOrError state={state} noun="급여 항목" />
      {saveError && <div className="live-data-state live-data-error" role="alert">{saveError}</div>}

      {formVisible && (
        <form className="pay-rules-form" data-payroll-item-form="true" onSubmit={saveItem}>
          <label>
            <span>항목 코드</span>
            <input
              required
              disabled={Boolean(form.item_id)}
              pattern="[A-Za-z0-9_.-]+"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </label>
          <label>
            <span>항목 이름</span>
            <input required value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
          </label>
          <label>
            <span>구분</span>
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ItemForm["kind"] })}>
              <option value="earning">지급</option>
              <option value="deduction">공제</option>
            </select>
          </label>
          <label>
            <span>세금 처리</span>
            <select value={form.tax_treatment} onChange={(event) => setForm({ ...form, tax_treatment: event.target.value as ItemForm["tax_treatment"] })}>
              <option value="taxable">과세</option>
              <option value="non_taxable">비과세</option>
            </select>
          </label>
          <label>
            <span>금액 방식</span>
            <select value={form.value_mode} onChange={(event) => setForm({ ...form, value_mode: event.target.value as ItemForm["value_mode"] })}>
              <option value="fixed">고정 금액</option>
              <option value="variable">매번 입력</option>
            </select>
          </label>
          <label>
            <span>계산 순서</span>
            <input required type="number" min="0" step="1" value={form.calculation_order} onChange={(event) => setForm({ ...form, calculation_order: event.target.value })} />
          </label>
          <label>
            <span>시행일</span>
            <input required type="date" value={form.effective_from} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} />
          </label>
          <label>
            <span>종료일</span>
            <input type="date" min={form.effective_from || undefined} value={form.effective_to} onChange={(event) => setForm({ ...form, effective_to: event.target.value })} />
          </label>
          {form.item_id && (
            <label>
              <span>사용 상태</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ItemForm["status"] })}>
                <option value="active">사용 중</option>
                <option value="inactive">사용 중지</option>
              </select>
            </label>
          )}
          <div className="pay-rules-form-actions">
            <button className="primary-button" disabled={busy}>{form.item_id ? "변경 저장" : "항목 저장"}</button>
            <button className="secondary-button" type="button" onClick={() => setFormVisible(false)}>취소</button>
          </div>
        </form>
      )}

      {state === "empty" && <div className="live-data-state live-data-empty">등록된 급여 항목이 없습니다.</div>}
      {state === "ready" && (
        <div className="data-table-wrap">
          <table className="data-table pay-rules-table" data-payroll-items-table="true">
            <thead>
              <tr><th>항목</th><th>구분</th><th>세금</th><th>금액 방식</th><th>적용 기간</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id} data-payroll-item-id={item.item_id}>
                  <td><strong>{item.display_name}</strong><small> · {item.code}</small></td>
                  <td>{itemKindLabel(item.kind)}</td>
                  <td>{taxLabel(item.tax_treatment)}</td>
                  <td>{valueModeLabel(item.value_mode)}</td>
                  <td>{item.effective_from} ~ {item.effective_to || "계속"}</td>
                  <td><span className="record-state-badge" data-state={item.status === "active" ? "live" : ""}>{item.status === "active" ? "사용 중" : "사용 중지"}</span></td>
                  <td>
                    <button className="table-inline-action" type="button" onClick={() => startEdit(item)}><Pencil size={13} />수정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function assignmentVersion(profile: HrxPayrollProfile, itemId: string) {
  return Math.max(0, ...rows<HrxPayrollItemAssignment>(profile.assignments)
    .filter((row) => row.item_id === itemId)
    .map((row) => Number(row.version) || 0)) + 1;
}

function currentLocalDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function assignmentInForceOn(assignment: HrxPayrollItemAssignment, onDate: string) {
  return assignment.effective_from <= onDate && (!assignment.effective_to || assignment.effective_to >= onDate);
}

function assignmentCanBeRetired(assignments: HrxPayrollItemAssignment[], target: HrxPayrollItemAssignment, onDate = currentLocalDateKey()) {
  if (target.status !== "active" || !assignmentInForceOn(target, onDate)) return false;
  const rowsForItem = assignments.filter((assignment) => assignment.item_id === target.item_id);
  const retiredLineages = new Set(
    rowsForItem
      .filter((assignment) => assignment.status === "inactive" && assignmentInForceOn(assignment, onDate))
      .map((assignment) => assignment.masked_compensation_ref)
      .filter(Boolean),
  );
  const current = rowsForItem
    .filter((assignment) => assignment.status === "active" && assignmentInForceOn(assignment, onDate))
    .filter((assignment) => !retiredLineages.has(assignment.masked_compensation_ref))
    .sort((left, right) => Number(right.version) - Number(left.version))[0];
  return current?.assignment_id === target.assignment_id;
}

function assignmentRange(profile: HrxPayrollProfile, item: HrxPayrollItem) {
  const effectiveFrom = profile.effective_from > item.effective_from ? profile.effective_from : item.effective_from;
  const possibleEnds = [profile.effective_to, item.effective_to].filter((value): value is string => Boolean(value));
  const effectiveTo = possibleEnds.length ? possibleEnds.sort()[0] : null;
  if (effectiveTo && effectiveFrom > effectiveTo) return null;
  return { effective_from: effectiveFrom, effective_to: effectiveTo };
}

function PayrollProfilesSection() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<HrxPayrollItem[]>([]);
  const [profiles, setProfiles] = useState<HrxPayrollProfile[]>([]);
  const [compensationRecords, setCompensationRecords] = useState<HrxCompensationRecord[]>([]);
  const [compensationState, setCompensationState] = useState<LoadState>("loading");
  const [selectedCompensationId, setSelectedCompensationId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [profileForm, setProfileForm] = useState({ ...EMPTY_PROFILE_FORM });
  const [assignmentForm, setAssignmentForm] = useState({ ...EMPTY_ASSIGNMENT_FORM });
  const [profileFormVisible, setProfileFormVisible] = useState(false);
  const [assignmentProfileId, setAssignmentProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  const activeItems = useMemo(() => items.filter((item) => item.status === "active"), [items]);
  const selectedEmployee = employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null;

  async function loadProfiles(employeeId: string) {
    setState("loading");
    setSaveError("");
    const result = await fetchHrxPayrollProfile(employeeId, undefined, true);
    if (result.kind !== "data") {
      setProfiles([]);
      setState(errorState(result));
      return;
    }
    const nextProfiles = rows<HrxPayrollProfile>(result.profiles);
    setProfiles(nextProfiles);
    setState(nextProfiles.length ? "ready" : "empty");
  }

  async function loadCompensationRecords(employeeId: string) {
    setCompensationState("loading");
    setCompensationRecords([]);
    setSelectedCompensationId("");
    const result = await fetchHrxCompensationRecords(employeeId);
    if (result.kind !== "data") {
      setCompensationState(errorState(result));
      return;
    }
    const nextRecords = rows<HrxCompensationRecord>(result.compensation_records)
      .filter((record) => record.employee_id === employeeId && Boolean(record.compensation_id));
    setCompensationRecords(nextRecords);
    setSelectedCompensationId(nextRecords[0]?.compensation_id ?? "");
    setCompensationState(nextRecords.length ? "ready" : "empty");
  }

  async function load() {
    setState("loading");
    setSaveError("");
    const [employeeResult, itemResult] = await Promise.all([
      fetchHrxEmployees(),
      fetchHrxPayrollItems(true),
    ]);
    if (employeeResult.kind !== "data") {
      setState(errorState(employeeResult));
      return;
    }
    if (itemResult.kind !== "data") {
      setItems([]);
      setState(errorState(itemResult));
      return;
    }
    const nextEmployees = rows<Employee>(employeeResult.employees).filter(
      (employee) => employee.status === "active" && typeof employee.employee_id === "string" && employee.employee_id.trim().length > 0,
    );
    setEmployees(nextEmployees);
    setItems(rows<HrxPayrollItem>(itemResult.items));
    const employeeId = nextEmployees.some((employee) => employee.employee_id === selectedEmployeeId)
      ? selectedEmployeeId
      : nextEmployees[0]?.employee_id ?? "";
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      setProfiles([]);
      setCompensationRecords([]);
      setCompensationState("empty");
      setState("empty");
      return;
    }
    await Promise.all([loadProfiles(employeeId), loadCompensationRecords(employeeId)]);
  }

  useEffect(() => {
    void load();
  }, []);

  function selectEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setProfileFormVisible(false);
    setAssignmentProfileId("");
    void Promise.all([loadProfiles(employeeId), loadCompensationRecords(employeeId)]);
  }

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();
    if (!selectedEmployeeId) return;
    const compensation = compensationRecords.find((record) => record.compensation_id === selectedCompensationId);
    const deductionInput = {
      dependent_count: Number(profileForm.dependent_count),
      income_tax_exempt: profileForm.income_tax_exempt === "yes",
      withholding_category: null,
      pension: { enrolled: profileForm.pension_enrolled === "yes" },
      health: { enrolled: profileForm.health_enrolled === "yes" },
      employment_insurance: { enrolled: profileForm.employment_insurance_enrolled === "yes" },
    };
    if (
      !compensation
      || compensation.employee_id !== selectedEmployeeId
      || compensationState !== "ready"
      || !Number.isSafeInteger(deductionInput.dependent_count)
      || deductionInput.dependent_count < 0
      || profileForm.income_tax_exempt === ""
      || profileForm.pension_enrolled === ""
      || profileForm.health_enrolled === ""
      || profileForm.employment_insurance_enrolled === ""
    ) {
      setSaveError("연결할 급여 기록과 공제 정보를 모두 선택한 뒤 저장해 주세요.");
      return;
    }
    setBusy(true);
    setSaveError("");
    const profileId = generatedId("payroll-profile", selectedEmployeeId, profileForm.effective_from);
    const result = await createHrxPayrollProfile({
      payroll_profile_id: profileId,
      employee_id: selectedEmployeeId,
      employment_type: profileForm.employment_type,
      pay_group_code: payGroupCode(profileForm.employment_type),
      compensation_ref: `compensation:${encodeURIComponent(compensation.compensation_id)}`,
      compensation_unit: compensationUnit(profileForm.employment_type),
      compensation_quantity: 1,
      deduction_input: deductionInput,
      effective_from: profileForm.effective_from,
      effective_to: profileForm.effective_to || null,
      status: "active",
    });
    setBusy(false);
    if (result.kind !== "data") {
      if (result.kind === "step_up_required") setState("step_up");
      else if (result.reason === "HRX_PAYROLL_COMPENSATION_RECORD_MISSING" || result.reason === "HRX_PAYROLL_COMPENSATION_EMPLOYEE_MISMATCH") setSaveError("선택한 급여 기록을 확인할 수 없습니다. 구성원과 급여 기록을 다시 선택해 주세요.");
      else if (result.reason === "HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED") setSaveError("공제 정보를 입력한 뒤 급여 방식을 저장해 주세요.");
      else if (result.reason === "HRX_PAYROLL_DEDUCTION_INPUT_INVALID") setSaveError("공제 정보 형식을 확인해 주세요.");
      else setSaveError(result.kind === "guarded" ? "구성원 급여정보를 등록할 권한이 없습니다." : "구성원 급여정보를 저장하지 못했습니다.");
      return;
    }
    setProfileForm({ ...EMPTY_PROFILE_FORM });
    setProfileFormVisible(false);
    await loadProfiles(selectedEmployeeId);
  }

  async function saveAssignment(event: SubmitEvent) {
    event.preventDefault();
    const profile = profiles.find((row) => row.payroll_profile_id === assignmentProfileId);
    if (!profile) return;
    const version = assignmentVersion(profile, assignmentForm.item_id);
    setBusy(true);
    setSaveError("");
    const result = await assignHrxPayrollItem(profile.payroll_profile_id, {
      assignment_id: generatedId("payroll-assignment", profile.employee_id, assignmentForm.item_id),
      item_id: assignmentForm.item_id,
      version,
      amount_minor: Number(assignmentForm.amount_krw),
      effective_from: assignmentForm.effective_from,
      effective_to: assignmentForm.effective_to || null,
      source_ref: `HRX:payroll-assignment:${safeRefPart(profile.payroll_profile_id)}:${safeRefPart(assignmentForm.item_id)}:v${version}`,
      status: "active",
    });
    setBusy(false);
    if (result.kind !== "data") {
      if (result.kind === "step_up_required") setState("step_up");
      else setSaveError(result.kind === "guarded" ? "급여 항목을 배정할 권한이 없습니다." : "급여 항목을 배정하지 못했습니다. 적용 기간이 겹치지 않는지 확인하세요.");
      return;
    }
    setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM });
    setAssignmentProfileId("");
    await loadProfiles(selectedEmployeeId);
  }

  async function retireAssignment(profile: HrxPayrollProfile, assignment: HrxPayrollItemAssignment) {
    setBusy(true);
    setSaveError("");
    const result = await retireHrxPayrollItemAssignment(profile.payroll_profile_id, assignment.assignment_id, assignment.version);
    setBusy(false);
    if (result.kind !== "data") {
      if (result.kind === "step_up_required") setState("step_up");
      else if (result.kind === "guarded" && result.reason === "HRX_PAYROLL_ASSIGNMENT_NOT_CURRENT") setSaveError("현재 적용 중인 급여 항목만 종료할 수 있습니다.");
      else setSaveError(result.kind === "guarded" ? "급여 항목을 종료할 권한이 없습니다." : "급여 항목 적용을 종료하지 못했습니다.");
      return;
    }
    await loadProfiles(selectedEmployeeId);
  }

  async function deactivateProfile(profile: HrxPayrollProfile) {
    setBusy(true);
    setSaveError("");
    const result = await updateHrxPayrollProfile(profile.payroll_profile_id, {
      expected_version: profile.state_version,
      status: "inactive",
    });
    setBusy(false);
    if (result.kind !== "data") {
      if (result.kind === "step_up_required") setState("step_up");
      else setSaveError(result.kind === "guarded" ? "급여 방식을 중지할 권한이 없습니다." : "급여 방식을 중지하지 못했습니다.");
      return;
    }
    await loadProfiles(selectedEmployeeId);
  }

  return (
    <section className="pay-rules-section" aria-labelledby="payroll-profiles-heading" data-payroll-catalog-section="profiles">
      <div className="pay-rules-section-head">
        <div>
          <h3 id="payroll-profiles-heading">구성원 급여</h3>
          <span>구성원별 급여 방식과 적용 항목을 시행일 기준으로 관리합니다. 저장된 금액은 다시 표시하지 않습니다.</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load()}>
          <RefreshCw size={14} />새로고침
        </button>
      </div>

      {state === "step_up" && (
        <HrxStepUpChallenge purpose="payroll_export_review" onVerified={() => void load()} />
      )}
      {employees.length > 0 && (
        <div className="pay-rules-form" data-payroll-profile-member-filter="true">
          <label className="pay-rules-wide-field">
            <span>구성원</span>
            <select value={selectedEmployeeId} onChange={(event) => selectEmployee(event.target.value)}>
              {employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>{employeeLabel(employee)}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <LoadingOrError state={state} noun="구성원 급여정보" />
      {saveError && <div className="live-data-state live-data-error" role="alert">{saveError}</div>}
      {state === "empty" && employees.length === 0 && (
        <div className="live-data-state live-data-empty">등록된 구성원이 없습니다.</div>
      )}

      {selectedEmployeeId && state !== "denied" && state !== "error" && state !== "step_up" && (
        <>
          <div className="pay-rules-section-head">
            <div>
              <h3>{employeeLabel(selectedEmployee)}</h3>
              <span>{profiles.length ? `${profiles.length}개 적용 이력` : "등록된 급여 방식이 없습니다."}</span>
            </div>
            <button className="secondary-button" type="button" onClick={() => setProfileFormVisible((value) => !value)}>
              <Plus size={14} />급여 방식 추가
            </button>
          </div>

          {profileFormVisible && (
            <form className="pay-rules-form" data-payroll-profile-form="true" onSubmit={saveProfile}>
              <label>
                <span>급여 방식</span>
                <select value={profileForm.employment_type} onChange={(event) => setProfileForm({ ...profileForm, employment_type: event.target.value as HrxPayrollProfile["employment_type"] })}>
                  <option value="monthly">월급</option>
                  <option value="hourly">시급</option>
                  <option value="daily">일급</option>
                  <option value="freelancer">용역</option>
                </select>
              </label>
              <label className="pay-rules-wide-field">
                <span>연결할 급여 기록</span>
                <select required value={selectedCompensationId} disabled={compensationState !== "ready"} onChange={(event) => setSelectedCompensationId(event.target.value)}>
                  <option value="">급여 기록을 선택하세요</option>
                  {compensationRecords.map((record) => (
                    <option key={record.compensation_id} value={record.compensation_id}>
                      {record.effective_from} ~ {record.effective_to || "계속"} · 기록 {record.masked_compensation_ref || "확인됨"}
                    </option>
                  ))}
                </select>
              </label>
              {compensationState === "loading" && <LoadingOrError state={compensationState} noun="급여 기록" />}
              {compensationState === "step_up" && (
                <HrxStepUpChallenge purpose="compensation_access" onVerified={() => void loadCompensationRecords(selectedEmployeeId)} />
              )}
              {compensationState === "denied" && <LoadingOrError state={compensationState} noun="급여 기록" />}
              {compensationState === "error" && <LoadingOrError state={compensationState} noun="급여 기록" />}
              {compensationState === "empty" && (
                <div className="live-data-state live-data-empty">연결할 급여 기록이 없습니다. 먼저 구성원의 급여 기록을 등록해 주세요.</div>
              )}
              <label>
                <span>시행일</span>
                <input required type="date" value={profileForm.effective_from} onChange={(event) => setProfileForm({ ...profileForm, effective_from: event.target.value })} />
              </label>
              <label>
                <span>종료일</span>
                <input type="date" min={profileForm.effective_from || undefined} value={profileForm.effective_to} onChange={(event) => setProfileForm({ ...profileForm, effective_to: event.target.value })} />
              </label>
              <label>
                <span>부양가족 수</span>
                <input required type="number" min="0" step="1" value={profileForm.dependent_count} onChange={(event) => setProfileForm({ ...profileForm, dependent_count: event.target.value })} />
              </label>
              <label>
                <span>소득세 비과세</span>
                <select required value={profileForm.income_tax_exempt} onChange={(event) => setProfileForm({ ...profileForm, income_tax_exempt: event.target.value as typeof profileForm.income_tax_exempt })}>
                  <option value="">선택하세요</option>
                  <option value="yes">적용</option>
                  <option value="no">미적용</option>
                </select>
              </label>
              <label>
                <span>국민연금 가입</span>
                <select required value={profileForm.pension_enrolled} onChange={(event) => setProfileForm({ ...profileForm, pension_enrolled: event.target.value as typeof profileForm.pension_enrolled })}>
                  <option value="">선택하세요</option>
                  <option value="yes">가입</option>
                  <option value="no">미가입</option>
                </select>
              </label>
              <label>
                <span>건강보험 가입</span>
                <select required value={profileForm.health_enrolled} onChange={(event) => setProfileForm({ ...profileForm, health_enrolled: event.target.value as typeof profileForm.health_enrolled })}>
                  <option value="">선택하세요</option>
                  <option value="yes">가입</option>
                  <option value="no">미가입</option>
                </select>
              </label>
              <label>
                <span>고용보험 가입</span>
                <select required value={profileForm.employment_insurance_enrolled} onChange={(event) => setProfileForm({ ...profileForm, employment_insurance_enrolled: event.target.value as typeof profileForm.employment_insurance_enrolled })}>
                  <option value="">선택하세요</option>
                  <option value="yes">가입</option>
                  <option value="no">미가입</option>
                </select>
              </label>
              <div className="pay-rules-form-actions">
                <button className="primary-button" disabled={busy || compensationState !== "ready"}>급여 방식 저장</button>
                <button className="secondary-button" type="button" onClick={() => setProfileFormVisible(false)}>취소</button>
              </div>
            </form>
          )}

          {state === "empty" && !profileFormVisible && (
            <div className="live-data-state live-data-empty">급여 방식을 추가한 뒤 지급·공제 항목을 연결하세요.</div>
          )}
          {state === "ready" && profiles.map((profile) => {
            const assignments = rows<HrxPayrollItemAssignment>(profile.assignments);
            const assignableItems = activeItems.filter((item) => Boolean(assignmentRange(profile, item)));
            const selectedItem = assignableItems.find((item) => item.item_id === assignmentForm.item_id) ?? null;
            const selectedRange = selectedItem ? assignmentRange(profile, selectedItem) : null;
            return (
              <article className="pay-rules-section pay-rules-impact" key={profile.payroll_profile_id} data-payroll-profile-id={profile.payroll_profile_id}>
                <div className="pay-rules-section-head">
                  <div>
                    <h3>{employmentTypeLabel(profile.employment_type)}</h3>
                    <span>{profile.effective_from} ~ {profile.effective_to || "계속"} · {profile.status === "active" ? "사용 중" : "사용 중지"}</span>
                  </div>
                  <div className="pay-rules-form-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={profile.status !== "active" || assignableItems.length === 0 || busy}
                      onClick={() => {
                        const firstItem = assignableItems[0];
                        const range = firstItem ? assignmentRange(profile, firstItem) : null;
                        setAssignmentProfileId(profile.payroll_profile_id);
                        setAssignmentForm({
                          ...EMPTY_ASSIGNMENT_FORM,
                          item_id: firstItem?.item_id ?? "",
                          effective_from: range?.effective_from ?? "",
                          effective_to: range?.effective_to ?? "",
                        });
                      }}
                    >
                      <Plus size={14} />항목 배정
                    </button>
                    {profile.status === "active" && (
                      <button className="secondary-button" type="button" disabled={busy} onClick={() => void deactivateProfile(profile)}>급여 방식 중지</button>
                    )}
                  </div>
                </div>

                {assignmentProfileId === profile.payroll_profile_id && (
                  <form className="pay-rules-form" data-payroll-assignment-form="true" onSubmit={saveAssignment}>
                    <label>
                      <span>급여 항목</span>
                      <select
                        required
                        value={assignmentForm.item_id}
                        onChange={(event) => {
                          const item = assignableItems.find((candidate) => candidate.item_id === event.target.value);
                          const range = item ? assignmentRange(profile, item) : null;
                          setAssignmentForm({
                            ...assignmentForm,
                            item_id: event.target.value,
                            effective_from: range?.effective_from ?? "",
                            effective_to: range?.effective_to ?? "",
                          });
                        }}
                      >
                        {assignableItems.map((item) => <option key={item.item_id} value={item.item_id}>{item.display_name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>금액(원)</span>
                      <input required type="number" min="0" step="1" inputMode="numeric" value={assignmentForm.amount_krw} onChange={(event) => setAssignmentForm({ ...assignmentForm, amount_krw: event.target.value })} />
                    </label>
                    <label>
                      <span>시행일</span>
                      <input required type="date" min={selectedRange?.effective_from} max={selectedRange?.effective_to || undefined} value={assignmentForm.effective_from} onChange={(event) => setAssignmentForm({ ...assignmentForm, effective_from: event.target.value })} />
                    </label>
                    <label>
                      <span>종료일</span>
                      <input type="date" min={assignmentForm.effective_from || selectedRange?.effective_from} max={selectedRange?.effective_to || undefined} value={assignmentForm.effective_to} onChange={(event) => setAssignmentForm({ ...assignmentForm, effective_to: event.target.value })} />
                    </label>
                    <div className="pay-rules-form-actions">
                      <button className="primary-button" disabled={busy}>항목 배정</button>
                      <button className="secondary-button" type="button" onClick={() => setAssignmentProfileId("")}>취소</button>
                    </div>
                  </form>
                )}

                {assignments.length ? (
                  <div className="data-table-wrap">
                    <table className="data-table pay-rules-table" data-payroll-assignments-table="true">
                      <thead><tr><th>항목</th><th>적용 기간</th><th>금액</th><th>상태</th><th>관리</th></tr></thead>
                      <tbody>
                        {assignments.map((assignment) => {
                          const item = items.find((candidate) => candidate.item_id === assignment.item_id);
                          const canRetire = assignmentCanBeRetired(assignments, assignment);
                          const safelyMasked = Boolean(assignment.masked_compensation_ref)
                            && assignment.raw_amount_included === false
                            && assignment.encrypted_amount_ref_included === false;
                          return (
                            <tr key={assignment.assignment_id} data-payroll-assignment-id={assignment.assignment_id}>
                              <td><strong>{item?.display_name || "급여 항목"}</strong></td>
                              <td>{assignment.effective_from} ~ {assignment.effective_to || "계속"}</td>
                              <td
                                data-payroll-amount-readback={safelyMasked ? "masked" : "blocked"}
                                data-masked-compensation-ref={safelyMasked ? assignment.masked_compensation_ref : undefined}
                              >
                                {safelyMasked ? "금액 저장됨" : "금액 확인 제한"}
                              </td>
                              <td>{assignment.status === "active" ? "적용 중" : "적용 종료"}</td>
                              <td>
                                {canRetire && (
                                  <button className="table-inline-action" type="button" disabled={busy} onClick={() => void retireAssignment(profile, assignment)}>적용 종료</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="live-data-state live-data-empty">
                    {assignableItems.length ? "배정된 급여 항목이 없습니다." : activeItems.length ? "프로필 적용 기간에 사용할 수 있는 급여 항목이 없습니다." : "먼저 급여 항목을 등록하세요."}
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}

export function PayrollCatalogWorkspace({ mode }: { mode: "items" | "profiles" }) {
  return mode === "items" ? <PayrollItemsSection /> : <PayrollProfilesSection />;
}
