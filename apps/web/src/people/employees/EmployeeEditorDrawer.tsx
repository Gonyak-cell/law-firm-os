/// <reference path="../../react-jsx.d.ts" />
import React, { useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import { createHrxEmployee, updateHrxEmployee } from "../hrxApiClient.ts";

type EmployeeRecord = Record<string, unknown>;
type EditorMode = "create" | "edit";
type EmployeeEditorDrawerProps = {
  mode: EditorMode;
  employee?: EmployeeRecord | null;
  defaultStatus?: string;
  onClose: () => void;
  onSaved: (employee: EmployeeRecord) => boolean | Promise<boolean>;
};
type FormState = {
  employee_id: string;
  display_name: string;
  legal_name: string;
  work_email: string;
  status: string;
};

const STATUS_OPTIONS = [
  ["onboarding", "입사 준비"],
  ["probation", "수습"],
  ["active", "재직"],
  ["on_leave", "휴직"],
  ["notice", "퇴사 예정"],
  ["terminated", "퇴사"]
];

function text(record: EmployeeRecord | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function initialForm(
  mode: EditorMode,
  employee: EmployeeRecord | null | undefined,
  defaultStatus: string
): FormState {
  return {
    employee_id: mode === "edit" ? text(employee, "employee_id") : "",
    display_name: text(employee, "display_name"),
    legal_name: text(employee, "legal_name"),
    work_email: text(employee, "work_email"),
    status: text(employee, "status") || defaultStatus
  };
}

export function employeeEditorErrorMessage(reason: unknown) {
  if (reason === "HRX_EMPLOYEE_ID_ALREADY_EXISTS") return "이미 사용 중인 구성원 번호입니다.";
  if (reason === "HRX_PERMISSION_DENIED") return "구성원을 저장할 권한이 없습니다.";
  if (reason === "HRX_EMPLOYEE_READBACK_FAILED") {
    return "저장 결과를 다시 확인하지 못했습니다. 목록을 새로고침한 뒤 확인해 주세요.";
  }
  return "입력한 구성원 정보를 확인해 주세요.";
}

export function EmployeeEditorDrawer({
  mode,
  employee = null,
  defaultStatus = "active",
  onClose,
  onSaved
}: EmployeeEditorDrawerProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(mode, employee, defaultStatus));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  function updateField(event: { currentTarget: { name: string; value: string } }) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      display_name: form.display_name.trim(),
      legal_name: form.legal_name.trim() || null,
      work_email: form.work_email.trim() || null,
      status: form.status
    };
    const result = mode === "create"
      ? await createHrxEmployee({ ...payload, employee_id: form.employee_id.trim() })
      : await updateHrxEmployee(form.employee_id, payload);
    if (result.kind !== "data") {
      setError(employeeEditorErrorMessage("reason" in result ? result.reason : null));
      setSaving(false);
      return;
    }
    const readbackConfirmed = await onSaved(result.employee as EmployeeRecord);
    if (!readbackConfirmed) {
      setError(employeeEditorErrorMessage("HRX_EMPLOYEE_READBACK_FAILED"));
    }
    setSaving(false);
  }

  return (
    <div className="hr-employee-editor-layer" data-people-employee-editor={mode}>
      <button
        type="button"
        className="hr-employee-editor-backdrop"
        aria-label="구성원 편집 닫기"
        onClick={() => !saving && onClose()}
      />
      <aside
        className="hr-employee-editor-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-employee-editor-title"
      >
        <header>
          <div>
            <span>{mode === "create" ? "새 구성원" : "구성원 정보"}</span>
            <h2 id="hr-employee-editor-title">
              {mode === "create" ? "구성원 등록" : "구성원 수정"}
            </h2>
          </div>
          <button type="button" className="icon-button" aria-label="닫기" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit} data-people-employee-editor-form="true">
          <label>
            <span>구성원 번호</span>
            <input
              ref={firstInputRef}
              name="employee_id"
              value={form.employee_id}
              onChange={updateField}
              required
              disabled={mode === "edit" || saving}
              autoComplete="off"
              placeholder="예: emp-010"
            />
            <small>저장 후에는 변경할 수 없습니다.</small>
          </label>
          <label>
            <span>표시 이름</span>
            <input
              name="display_name"
              value={form.display_name}
              onChange={updateField}
              required
              disabled={saving}
              autoComplete="name"
            />
          </label>
          <label>
            <span>법적 이름</span>
            <input
              name="legal_name"
              value={form.legal_name}
              onChange={updateField}
              disabled={saving}
              autoComplete="name"
            />
          </label>
          <label>
            <span>업무용 이메일</span>
            <input
              name="work_email"
              type="email"
              value={form.work_email}
              onChange={updateField}
              disabled={saving}
              autoComplete="email"
            />
          </label>
          <label>
            <span>상태</span>
            <select name="status" value={form.status} onChange={updateField} disabled={saving}>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {error && (
            <div className="live-data-state live-data-error" role="alert" data-people-employee-editor-error="true">
              <strong>저장하지 못했습니다.</strong>
              {error}
            </div>
          )}
          <footer>
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              <Save size={15} />
              {saving ? "저장 중" : "저장"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
