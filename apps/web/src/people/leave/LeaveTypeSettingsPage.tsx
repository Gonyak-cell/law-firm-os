import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  createHrxLeaveGroup,
  createHrxLeavePolicy,
  createHrxLeaveType,
  createNextHrxLeavePolicyVersion,
  fetchHrxLeaveConfiguration,
  publishHrxLeavePolicy,
  updateHrxLeaveGroup,
  updateHrxLeavePolicy,
  updateHrxLeaveType
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;
type Tab = "groups" | "types" | "policies";
type Configuration = { groups: Row[]; types: Row[]; policies: Row[] };
type UsageMode = "full_day" | "half_day" | "quarter_day" | "hours";
type RuleDraft = {
  leave_type_id: string;
  usage_modes: UsageMode[];
  standard_day_minutes: number;
  paid_ratio_percent: number;
  deduction_ratio_percent: number;
  rounding_minutes: number;
  rounding_mode: "none" | "ceil" | "floor" | "nearest";
};

const usageModes: { value: UsageMode; label: string }[] = [
  { value: "full_day", label: "종일" },
  { value: "half_day", label: "반일" },
  { value: "quarter_day", label: "1/4일" },
  { value: "hours", label: "시간" }
];
const defaultTypeRule = {
  usage_modes: usageModes.map(({ value }) => value),
  standard_day_minutes: 480,
  paid_ratio_bps: 10_000,
  deduction_ratio_bps: 10_000,
  rounding_minutes: 1,
  rounding_mode: "none"
};

const emptyGroup = { code: "", display_name: "" };
const emptyType = {
  group_id: "",
  code: "",
  display_name: "",
  request_unit: "minutes",
  reason_required: false,
  attachment_required: false
};
const emptyPolicy = { group_id: "", policy_code: "", effective_from: "", carryover_minutes: "0" };

function text(row: Row, field: string) {
  const value = row[field];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function number(row: Row, field: string) {
  const value = Number(row[field]);
  return Number.isFinite(value) ? value : 0;
}

function compactId(prefix: string, code: string) {
  const safe = code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${safe || Date.now()}`;
}

function statusLabel(status: string) {
  if (status === "active") return "사용 중";
  if (status === "draft") return "초안";
  if (status === "retired") return "종료";
  return "사용 중지";
}

function evidenceRule(row: Row) {
  const direct = row.evidence_rule;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Row;
  try {
    return JSON.parse(text(row, "evidence_rule_json") || "{}") as Row;
  } catch {
    return {};
  }
}

function evidenceLabel(row: Row) {
  const rule = evidenceRule(row);
  const labels = [];
  if (rule.reason_required === true) labels.push("사유");
  if (rule.attachment_required === true) labels.push("증빙");
  return labels.length ? `${labels.join("·")} 필수` : "추가 입력 없음";
}

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function policyRules(row: Row | undefined): Row {
  const direct = record(row?.rules);
  if (Object.keys(direct).length) return direct;
  try {
    return record(JSON.parse(text(row ?? {}, "rules_json") || "{}"));
  } catch {
    return {};
  }
}

function typeRule(policy: Row | undefined, leaveTypeId: string): Row {
  return { ...defaultTypeRule, ...record(record(policyRules(policy).type_rules)[leaveTypeId]) };
}

function ruleDraft(policy: Row | undefined, leaveTypeId: string): RuleDraft {
  const rule = typeRule(policy, leaveTypeId);
  const configuredModes = Array.isArray(rule.usage_modes) ? rule.usage_modes : defaultTypeRule.usage_modes;
  return {
    leave_type_id: leaveTypeId,
    usage_modes: usageModes.map(({ value }) => value).filter((mode) => configuredModes.includes(mode)),
    standard_day_minutes: Number(rule.standard_day_minutes) || 480,
    paid_ratio_percent: (Number(rule.paid_ratio_bps) || 0) / 100,
    deduction_ratio_percent: (Number(rule.deduction_ratio_bps) || 0) / 100,
    rounding_minutes: Number(rule.rounding_minutes) || 1,
    rounding_mode: (["none", "ceil", "floor", "nearest"].includes(String(rule.rounding_mode)) ? rule.rounding_mode : "none") as RuleDraft["rounding_mode"]
  };
}

function usageModeSummary(rule: Row) {
  const configured = Array.isArray(rule.usage_modes) ? rule.usage_modes : defaultTypeRule.usage_modes;
  return usageModes.filter(({ value }) => configured.includes(value)).map(({ label }) => label).join("·");
}

function percentage(value: unknown) {
  const percent = Number(value) / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function roundingSummary(rule: Row) {
  if (rule.rounding_mode === "none") return "없음";
  const labels = { ceil: "올림", floor: "내림", nearest: "반올림" } as const;
  return `${Number(rule.rounding_minutes) || 1}분 ${labels[rule.rounding_mode as keyof typeof labels] ?? "반올림"}`;
}

export function LeaveTypeSettingsPage() {
  const [tab, setTab] = useState<Tab>("groups");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [typeForm, setTypeForm] = useState(emptyType);
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [nextVersionSource, setNextVersionSource] = useState("");
  const [nextEffectiveFrom, setNextEffectiveFrom] = useState("");
  const [selectedRulePolicyId, setSelectedRulePolicyId] = useState("");
  const [editingRule, setEditingRule] = useState<RuleDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const result = await fetchHrxLeaveConfiguration();
    if (result.kind !== "data") {
      setConfiguration({ groups: [], types: [], policies: [] });
      setError("휴가 설정을 불러오지 못했습니다.");
      return;
    }
    setConfiguration({ groups: result.groups, types: result.types, policies: result.policies });
    setError("");
    setTypeForm((current) => ({ ...current, group_id: current.group_id || text(result.groups[0] ?? {}, "group_id") }));
    setPolicyForm((current) => ({ ...current, group_id: current.group_id || text(result.groups[0] ?? {}, "group_id") }));
    setSelectedRulePolicyId((current) => {
      if (result.policies.some((policy) => text(policy, "policy_version_id") === current)) return current;
      const preferred = result.policies.find((policy) => text(policy, "status") === "draft") ?? result.policies[0];
      return text(preferred ?? {}, "policy_version_id");
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(key: string, action: () => Promise<{ kind: string; reason?: unknown }>) {
    setBusy(key);
    setError("");
    const result = await action();
    setBusy("");
    if (result.kind !== "data") {
      setError(typeof result.reason === "string" ? result.reason : "설정을 저장하지 못했습니다.");
      return false;
    }
    await load();
    return true;
  }

  async function submitGroup(event: { preventDefault(): void }) {
    event.preventDefault();
    const saved = await run("group:create", () => createHrxLeaveGroup({
      group_id: compactId("leave-group", groupForm.code),
      code: groupForm.code,
      display_name: groupForm.display_name
    }));
    if (saved) setGroupForm(emptyGroup);
  }

  async function submitType(event: { preventDefault(): void }) {
    event.preventDefault();
    const saved = await run("type:create", () => createHrxLeaveType({
      leave_type_id: compactId("leave-type", typeForm.code),
      group_id: typeForm.group_id,
      code: typeForm.code,
      display_name: typeForm.display_name,
      request_unit: typeForm.request_unit,
      evidence_rule: {
        reason_required: typeForm.code.trim().toUpperCase() === "ANNUAL" ? false : typeForm.reason_required,
        attachment_required: typeForm.attachment_required
      }
    }));
    if (saved) setTypeForm((current) => ({ ...emptyType, group_id: current.group_id }));
  }

  async function submitPolicy(event: { preventDefault(): void }) {
    event.preventDefault();
    const existingVersions = configuration?.policies.filter((row) => text(row, "policy_code") === policyForm.policy_code) ?? [];
    const version = existingVersions.reduce((highest, row) => Math.max(highest, number(row, "version")), 0) + 1;
    const saved = await run("policy:create", () => createHrxLeavePolicy({
      policy_version_id: compactId("leave-policy", `${policyForm.policy_code}-v${version}`),
      group_id: policyForm.group_id,
      policy_code: policyForm.policy_code,
      version,
      effective_from: policyForm.effective_from,
      rules: {
        calculation_unit: "minutes",
        reserve_on_submit: true,
        allocation_order: "earliest_expiry_then_earned_at",
        carryover_minutes: Number(policyForm.carryover_minutes) || 0
      }
    }));
    if (saved) setPolicyForm((current) => ({ ...emptyPolicy, group_id: current.group_id }));
  }

  async function createNextVersion(event: { preventDefault(): void }) {
    event.preventDefault();
    const source = configuration?.policies.find((row) => text(row, "policy_version_id") === nextVersionSource);
    if (!source) return;
    const nextVersion = number(source, "version") + 1;
    const saved = await run(`policy:version:${nextVersionSource}`, () => createNextHrxLeavePolicyVersion(nextVersionSource, {
      policy_version_id: compactId("leave-policy", `${text(source, "policy_code")}-v${nextVersion}`),
      effective_from: nextEffectiveFrom
    }));
    if (saved) {
      setNextVersionSource("");
      setNextEffectiveFrom("");
    }
  }

  async function saveTypeRule(event: { preventDefault(): void }) {
    event.preventDefault();
    const policy = configuration?.policies.find((row) => text(row, "policy_version_id") === selectedRulePolicyId);
    if (!policy || text(policy, "status") !== "draft" || !editingRule?.usage_modes.length) return;
    const currentRules = policyRules(policy);
    const currentTypeRules = record(currentRules.type_rules);
    const roundingMode = editingRule.rounding_mode;
    const saved = await run(`policy:rule:${editingRule.leave_type_id}`, () => updateHrxLeavePolicy(selectedRulePolicyId, {
      rules: {
        ...currentRules,
        type_rules: {
          ...currentTypeRules,
          [editingRule.leave_type_id]: {
            usage_modes: editingRule.usage_modes,
            standard_day_minutes: Math.round(editingRule.standard_day_minutes),
            paid_ratio_bps: Math.round(editingRule.paid_ratio_percent * 100),
            deduction_ratio_bps: Math.round(editingRule.deduction_ratio_percent * 100),
            rounding_minutes: roundingMode === "none" ? 1 : Math.round(editingRule.rounding_minutes),
            rounding_mode: roundingMode
          }
        }
      }
    }));
    if (saved) setEditingRule(null);
  }

  const groups = configuration?.groups ?? [];
  const types = configuration?.types ?? [];
  const policies = configuration?.policies ?? [];
  const selectedRulePolicy = policies.find((policy) => text(policy, "policy_version_id") === selectedRulePolicyId);
  const selectedRulePolicyIsDraft = text(selectedRulePolicy ?? {}, "status") === "draft";
  const visibleRuleTypes = selectedRulePolicy
    ? types.filter((type) => text(type, "group_id") === text(selectedRulePolicy, "group_id"))
    : types;

  return (
    <Panel id="people-leave-types" className="people-panel span-2 leave-settings-panel" title="휴가 그룹/유형">
      <div className="leave-settings-tabs" role="tablist" aria-label="휴가 설정 구분">
        {([
          ["groups", "휴가 그룹"],
          ["types", "휴가 유형"],
          ["policies", "정책 버전"]
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="live-data-state live-data-error" role="alert">{error}</div>}
      {configuration === null && <div className="live-data-state live-data-loading">휴가 설정을 불러오는 중입니다</div>}

      {configuration && tab === "groups" && (
        <div className="leave-settings-workspace" role="tabpanel">
          <form className="leave-settings-form" onSubmit={submitGroup}>
            <label><span>그룹 코드</span><input required value={groupForm.code} onChange={(event) => setGroupForm({ ...groupForm, code: event.target.value })} /></label>
            <label><span>표시 이름</span><input required value={groupForm.display_name} onChange={(event) => setGroupForm({ ...groupForm, display_name: event.target.value })} /></label>
            <button className="primary-button" disabled={busy === "group:create"}><Plus size={14} />그룹 추가</button>
          </form>
          <div className="data-table-wrap">
            <table className="data-table"><thead><tr><th>그룹</th><th>코드</th><th>상태</th><th>관리</th></tr></thead><tbody>
              {groups.map((group) => {
                const id = text(group, "group_id");
                const active = text(group, "status") === "active";
                return <tr key={id}><td><strong>{text(group, "display_name")}</strong></td><td>{text(group, "code")}</td><td>{statusLabel(text(group, "status"))}</td><td><button className="secondary-button" type="button" disabled={busy === `group:${id}`} onClick={() => void run(`group:${id}`, () => updateHrxLeaveGroup(id, { expected_version: number(group, "state_version"), status: active ? "inactive" : "active" }))}>{active ? "사용 중지" : "다시 사용"}</button></td></tr>;
              })}
            </tbody></table>
          </div>
          {groups.length === 0 && <div className="live-data-state live-data-empty">등록된 휴가 그룹이 없습니다.</div>}
        </div>
      )}

      {configuration && tab === "types" && (
        <div className="leave-settings-workspace" role="tabpanel">
          <form className="leave-settings-form leave-settings-type-form" onSubmit={submitType}>
            <label><span>휴가 그룹</span><select required value={typeForm.group_id} onChange={(event) => setTypeForm({ ...typeForm, group_id: event.target.value })}><option value="">그룹 선택</option>{groups.map((group) => <option key={text(group, "group_id")} value={text(group, "group_id")}>{text(group, "display_name")}</option>)}</select></label>
            <label><span>유형 코드</span><input required value={typeForm.code} onChange={(event) => setTypeForm({ ...typeForm, code: event.target.value })} /></label>
            <label><span>표시 이름</span><input required value={typeForm.display_name} onChange={(event) => setTypeForm({ ...typeForm, display_name: event.target.value })} /></label>
            <label><span>신청 단위</span><select value={typeForm.request_unit} onChange={(event) => setTypeForm({ ...typeForm, request_unit: event.target.value })}><option value="minutes">분</option><option value="half_day">반일</option><option value="day">일</option></select></label>
            <label className="leave-settings-check"><input type="checkbox" checked={typeForm.reason_required} disabled={typeForm.code.trim().toUpperCase() === "ANNUAL"} onChange={(event) => setTypeForm({ ...typeForm, reason_required: event.target.checked })} /><span>사유 필수</span></label>
            <label className="leave-settings-check"><input type="checkbox" checked={typeForm.attachment_required} onChange={(event) => setTypeForm({ ...typeForm, attachment_required: event.target.checked })} /><span>증빙 필수</span></label>
            <button className="primary-button" disabled={!groups.length || busy === "type:create"}><Plus size={14} />유형 추가</button>
          </form>
          <div className="leave-type-rule-toolbar">
            <label><span>규칙 정책</span><select value={selectedRulePolicyId} onChange={(event) => { setSelectedRulePolicyId(event.target.value); setEditingRule(null); }}>{policies.map((policy) => <option key={text(policy, "policy_version_id")} value={text(policy, "policy_version_id")}>{text(policy, "policy_code")} v{number(policy, "version")} · {statusLabel(text(policy, "status"))}</option>)}</select></label>
            {selectedRulePolicy && <span className="record-state-badge" data-state={selectedRulePolicyIsDraft ? "review" : "live"}>{selectedRulePolicyIsDraft ? "편집 가능" : "읽기 전용"}</span>}
            {selectedRulePolicy && !selectedRulePolicyIsDraft && <button className="secondary-button" type="button" onClick={() => { setNextVersionSource(selectedRulePolicyId); setTab("policies"); }}>새 버전</button>}
          </div>
          <div className="data-table-wrap leave-type-rule-table"><table className="data-table"><thead><tr><th>유형</th><th>신청 방식</th><th>유급</th><th>차감</th><th>반올림</th><th>입력 조건</th><th>상태</th><th>관리</th></tr></thead><tbody>
            {visibleRuleTypes.map((type) => {
              const id = text(type, "leave_type_id");
              const active = text(type, "status") === "active";
              const rule = typeRule(selectedRulePolicy, id);
              const isEditing = editingRule?.leave_type_id === id;
              return [<tr key={`${id}:row`}><td><strong>{text(type, "display_name")}</strong><small className="leave-settings-code">{text(type, "code")}</small></td><td>{usageModeSummary(rule)}</td><td>{percentage(rule.paid_ratio_bps)}</td><td>{percentage(rule.deduction_ratio_bps)}</td><td>{roundingSummary(rule)}</td><td>{evidenceLabel(type)}</td><td>{statusLabel(text(type, "status"))}</td><td><div className="approval-actions">{selectedRulePolicyIsDraft && <button className="secondary-button" type="button" onClick={() => setEditingRule(ruleDraft(selectedRulePolicy, id))}>규칙 편집</button>}<button className="secondary-button" type="button" disabled={busy === `type:${id}`} onClick={() => void run(`type:${id}`, () => updateHrxLeaveType(id, { status: active ? "inactive" : "active" }))}>{active ? "사용 중지" : "다시 사용"}</button></div></td></tr>, isEditing && <tr key={`${id}:edit`} className="leave-type-rule-edit-row"><td colSpan={8}><form onSubmit={saveTypeRule}>
                <fieldset><legend>신청 방식</legend><div className="leave-type-rule-modes">{usageModes.map(({ value, label }) => <label key={value}><input type="checkbox" checked={editingRule.usage_modes.includes(value)} onChange={(event) => setEditingRule({ ...editingRule, usage_modes: event.target.checked ? [...editingRule.usage_modes, value] : editingRule.usage_modes.filter((mode) => mode !== value) })} />{label}</label>)}</div></fieldset>
                <label><span>1일(분)</span><input className="leave-type-rule-input" type="number" min="1" max="1440" step="1" required value={editingRule.standard_day_minutes} onChange={(event) => setEditingRule({ ...editingRule, standard_day_minutes: Number(event.target.value) })} /></label>
                <label><span>유급(%)</span><input className="leave-type-rule-input" type="number" min="0" max="100" step="0.01" required value={editingRule.paid_ratio_percent} onChange={(event) => setEditingRule({ ...editingRule, paid_ratio_percent: Number(event.target.value) })} /></label>
                <label><span>차감(%)</span><input className="leave-type-rule-input" type="number" min="0" max="100" step="0.01" required value={editingRule.deduction_ratio_percent} onChange={(event) => setEditingRule({ ...editingRule, deduction_ratio_percent: Number(event.target.value) })} /></label>
                <label><span>시간 반올림</span><span className="leave-type-rule-rounding"><select value={editingRule.rounding_mode} onChange={(event) => setEditingRule({ ...editingRule, rounding_mode: event.target.value as RuleDraft["rounding_mode"] })}><option value="none">없음</option><option value="ceil">올림</option><option value="floor">내림</option><option value="nearest">반올림</option></select>{editingRule.rounding_mode !== "none" && <input aria-label="반올림 분" type="number" min="1" max={editingRule.standard_day_minutes} step="1" required value={editingRule.rounding_minutes} onChange={(event) => setEditingRule({ ...editingRule, rounding_minutes: Number(event.target.value) })} />}</span></label>
                <div className="approval-actions"><button className="secondary-button" type="button" onClick={() => setEditingRule(null)}>취소</button><button className="primary-button" disabled={!editingRule.usage_modes.length || busy === `policy:rule:${id}`}>저장</button></div>
              </form></td></tr>];
            })}
          </tbody></table></div>
          {visibleRuleTypes.length === 0 && <div className="live-data-state live-data-empty">등록된 휴가 유형이 없습니다.</div>}
        </div>
      )}

      {configuration && tab === "policies" && (
        <div className="leave-settings-workspace" role="tabpanel">
          <form className="leave-settings-form leave-settings-policy-form" onSubmit={submitPolicy}>
            <label><span>휴가 그룹</span><select required value={policyForm.group_id} onChange={(event) => setPolicyForm({ ...policyForm, group_id: event.target.value })}><option value="">그룹 선택</option>{groups.map((group) => <option key={text(group, "group_id")} value={text(group, "group_id")}>{text(group, "display_name")}</option>)}</select></label>
            <label><span>정책 코드</span><input required value={policyForm.policy_code} onChange={(event) => setPolicyForm({ ...policyForm, policy_code: event.target.value })} /></label>
            <label><span>시행일</span><input required type="date" value={policyForm.effective_from} onChange={(event) => setPolicyForm({ ...policyForm, effective_from: event.target.value })} /></label>
            <label><span>이월 한도(분)</span><input type="number" min="0" step="1" value={policyForm.carryover_minutes} onChange={(event) => setPolicyForm({ ...policyForm, carryover_minutes: event.target.value })} /></label>
            <button className="primary-button" disabled={!groups.length || busy === "policy:create"}><Plus size={14} />초안 만들기</button>
          </form>
          {nextVersionSource && (
            <form className="leave-settings-next-version" onSubmit={createNextVersion}>
              <strong>새 정책 버전</strong>
              <label><span>새 시행일</span><input required type="date" value={nextEffectiveFrom} onChange={(event) => setNextEffectiveFrom(event.target.value)} /></label>
              <button className="primary-button" disabled={busy === `policy:version:${nextVersionSource}`}>초안 생성</button>
              <button className="secondary-button" type="button" onClick={() => setNextVersionSource("")}>취소</button>
            </form>
          )}
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>정책</th><th>버전</th><th>시행 기간</th><th>상태</th><th>관리</th></tr></thead><tbody>
            {policies.map((policy) => {
              const id = text(policy, "policy_version_id");
              const status = text(policy, "status");
              return <tr key={id}><td><strong>{text(policy, "policy_code")}</strong></td><td>v{number(policy, "version")}</td><td>{text(policy, "effective_from")} ~ {text(policy, "effective_to") || "계속"}</td><td>{statusLabel(status)}</td><td><div className="approval-actions">{status === "draft" && <button className="primary-button" type="button" disabled={busy === `policy:publish:${id}`} onClick={() => void run(`policy:publish:${id}`, () => publishHrxLeavePolicy(id))}>시행</button>}{status === "active" && <button className="secondary-button" type="button" onClick={() => setNextVersionSource(id)}>새 버전</button>}</div></td></tr>;
            })}
          </tbody></table></div>
          {policies.length === 0 && <div className="live-data-state live-data-empty">등록된 휴가 정책이 없습니다.</div>}
        </div>
      )}
    </Panel>
  );
}
