import React from "react";
import { useMemo, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { addMatterTeamMember } from "../data/apiClient.js";
import { DataTable, Panel } from "./primitives.jsx";

const TEAM_PERMISSION_REF = "ui_cmp_g4_matter_team";
const TEAM_AUDIT_HINT_REF = "ui_cmp_g4_matter_team_probe";

function memberPayload({ matterId, memberId, employeeId, userId, role }) {
  return {
    permission_ref: TEAM_PERMISSION_REF,
    audit_hint_ref: TEAM_AUDIT_HINT_REF,
    member: {
      member_id: memberId,
      matter_id: matterId,
      employee_id: employeeId,
      user_id: userId,
      role,
      status: "active"
    }
  };
}

function roleLabel(value) {
  if (value === "responsible_attorney") return "책임 변호사";
  if (value === "paralegal") return "패러리걸";
  if (value === "billing_reviewer") return "청구 검토자";
  return "담당 변호사";
}

function statusLabel(value) {
  if (value === "inactive") return "비활성";
  if (value === "review_required") return "검토 필요";
  return "사용 중";
}

function ownerAssignmentLabel(value) {
  const text = String(value ?? "").trim();
  if (!text || /synthetic|rp0|_[a-z0-9]/i.test(text)) return "책임자";
  return text;
}

export function MatterTeamRoster({ matters = [], liveCtx = "allow", onMatterUpdated }) {
  const activeMatter = matters[0] ?? null;
  const [form, setForm] = useState({
    memberId: "",
    employeeId: "",
    userId: "",
    role: "associate"
  });
  const [members, setMembers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(
    () =>
      members.map((member, index) => [
        `팀원 ${index + 1}`,
        member.employee_id ? "연결됨" : "미연결",
        member.user_id ? "연결됨" : "미연결",
        roleLabel(member.role),
        statusLabel(member.status)
      ]),
    [members]
  );

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!activeMatter) return;
    setSubmitting(true);
    const next = await addMatterTeamMember({
      ctx: liveCtx,
      matterId: activeMatter.matter_id,
      payload: memberPayload({ matterId: activeMatter.matter_id, ...form })
    });
    setResult(next);
    setSubmitting(false);
    if (next.kind === "data" && next.item) {
      setMembers((current) => [...current.filter((member) => member.member_id !== next.item.member_id), next.item]);
      if (next.matter) onMatterUpdated?.(next.matter);
      setForm({ memberId: "", employeeId: "", userId: "", role: "associate" });
    }
  }

  const stateText =
    result?.kind === "data"
      ? result.safeErrorCodes?.length
        ? "검토 필요"
        : result.ownerAssignment
          ? "책임자가 지정되었습니다"
          : "팀원이 추가되었습니다"
      : result?.kind === "error"
        ? "다시 확인해주세요"
        : activeMatter
          ? "팀원과 책임자를 지정할 수 있습니다"
          : "Matter를 먼저 선택해주세요";
  const canSubmit = Boolean(activeMatter && form.memberId.trim() && form.role.trim() && (form.employeeId.trim() || form.userId.trim()));

  return (
    <Panel id="matter-team" className="matter-runtime-panel" title="Matter 팀" meta="권한 적용">
      <div
        className="matter-team-roster"
        data-cmp-g4-team-roster="true"
        data-matter-owner-assignment-action="true"
      >
        <form className="matter-team-form" onSubmit={submit}>
          <label>
            <span>팀원 ID</span>
            <input value={form.memberId} onChange={update("memberId")} />
          </label>
          <label>
            <span>구성원 계정</span>
            <input value={form.employeeId} onChange={update("employeeId")} />
          </label>
          <label>
            <span>로그인 계정</span>
            <input value={form.userId} onChange={update("userId")} />
          </label>
          <label>
            <span>역할</span>
            <select value={form.role} onChange={update("role")}>
              <option value="associate">담당 변호사</option>
              <option value="responsible_attorney">책임 변호사</option>
              <option value="paralegal">패러리걸</option>
              <option value="billing_reviewer">청구 검토자</option>
            </select>
          </label>
          <div className="matter-form-footer">
            <div>
              <ShieldCheck size={15} />
              <span>{stateText}</span>
            </div>
            <button className="primary-button" disabled={!canSubmit || submitting}>
              <UserPlus size={15} />
              {submitting ? "저장 중" : form.role === "responsible_attorney" ? "책임자 지정" : "추가"}
            </button>
          </div>
        </form>
        {result?.kind === "data" && result.ownerAssignment && (
          <div className="matter-owner-assignment-result" data-matter-owner-assignment-result="true">
            <ShieldCheck size={15} />
            <span>{ownerAssignmentLabel(result.ownerAssignment.owner_display_name)} 지정 완료</span>
          </div>
        )}
        <DataTable columns={["팀원", "구성원", "사용자", "역할", "상태"]} rows={rows} />
      </div>
    </Panel>
  );
}
