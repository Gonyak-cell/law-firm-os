import React, { useEffect, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Panel } from "../../components/primitives.jsx";
import {
  createHrxLeaveGroup,
  createHrxLeavePolicy,
  createHrxLeaveType,
  createNextHrxLeavePolicyVersion,
  fetchHrxLeaveConfiguration,
  publishHrxLeavePolicy,
  updateHrxLeaveGroup,
  updateHrxLeaveType
} from "../hrxApiClient.ts";

type Row = Record<string, unknown>;
type Tab = "groups" | "types" | "policies";
type Configuration = { groups: Row[]; types: Row[]; policies: Row[] };

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

export function LeaveTypeSettingsPage() {
  const [tab, setTab] = useState<Tab>("groups");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [typeForm, setTypeForm] = useState(emptyType);
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [nextVersionSource, setNextVersionSource] = useState("");
  const [nextEffectiveFrom, setNextEffectiveFrom] = useState("");
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

  const groups = configuration?.groups ?? [];
  const types = configuration?.types ?? [];
  const policies = configuration?.policies ?? [];

  return (
    <Panel id="people-leave-types" className="people-panel span-2 leave-settings-panel" title="휴가 그룹/유형" meta="회사 설정">
      <div className="people-panel-kicker">
        <Settings2 size={15} />
        휴가를 함께 차감할 그룹, 신청 유형, 시행일별 정책을 관리합니다
      </div>
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
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>유형</th><th>그룹</th><th>단위</th><th>입력 조건</th><th>상태</th><th>관리</th></tr></thead><tbody>
            {types.map((type) => {
              const id = text(type, "leave_type_id");
              const group = groups.find((row) => text(row, "group_id") === text(type, "group_id"));
              const active = text(type, "status") === "active";
              return <tr key={id}><td><strong>{text(type, "display_name")}</strong><small className="leave-settings-code">{text(type, "code")}</small></td><td>{group ? text(group, "display_name") : "그룹 확인 필요"}</td><td>{text(type, "request_unit")}</td><td>{evidenceLabel(type)}</td><td>{statusLabel(text(type, "status"))}</td><td><button className="secondary-button" type="button" disabled={busy === `type:${id}`} onClick={() => void run(`type:${id}`, () => updateHrxLeaveType(id, { status: active ? "inactive" : "active" }))}>{active ? "사용 중지" : "다시 사용"}</button></td></tr>;
            })}
          </tbody></table></div>
          {types.length === 0 && <div className="live-data-state live-data-empty">등록된 휴가 유형이 없습니다.</div>}
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
