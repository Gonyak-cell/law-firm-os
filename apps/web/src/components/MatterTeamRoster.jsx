import React from "react";
import { useMemo, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { addMatterTeamMember } from "../data/apiClient.js";
import { DataTable, Panel } from "./primitives.jsx";

const TENANT_ID = "tenant_rp05_synthetic";
const TEAM_PERMISSION_REF = "ui_cmp_g4_matter_team";
const TEAM_AUDIT_HINT_REF = "ui_cmp_g4_matter_team_probe";

function memberPayload({ matterId, memberId, employeeId, userId, role }) {
  return {
    tenant_id: TENANT_ID,
    permission_ref: TEAM_PERMISSION_REF,
    audit_hint_ref: TEAM_AUDIT_HINT_REF,
    actor_id: "user_rp05_owner",
    member: {
      member_id: memberId,
      tenant_id: TENANT_ID,
      matter_id: matterId,
      employee_id: employeeId,
      user_id: userId,
      role,
      status: "active"
    }
  };
}

export function MatterTeamRoster({ matters = [], liveCtx = "allow" }) {
  const activeMatter = matters[0] ?? null;
  const [form, setForm] = useState({
    memberId: "member_ui_associate_001",
    employeeId: "emp-002",
    userId: "user_rp05_associate",
    role: "associate"
  });
  const [members, setMembers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(
    () =>
      members.map((member) => [
        member.member_id,
        member.employee_id ?? "blocked",
        member.user_id ?? "none",
        member.role,
        member.status ?? "active"
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
    }
  }

  const stateText =
    result?.kind === "data"
      ? `${result.statusOutcome}${result.safeErrorCodes?.length ? " / blocked" : " / audited"}`
      : result?.kind === "error"
        ? "error"
        : activeMatter
          ? activeMatter.matter_number ?? activeMatter.matter_id
          : "empty";

  return (
    <Panel className="matter-runtime-panel" title="Matter Team" meta={TEAM_AUDIT_HINT_REF}>
      <div className="matter-team-roster" data-cmp-g4-team-roster="true">
        <form className="matter-team-form" onSubmit={submit}>
          <label>
            <span>Member ID</span>
            <input value={form.memberId} onChange={update("memberId")} />
          </label>
          <label>
            <span>Employee ID</span>
            <input value={form.employeeId} onChange={update("employeeId")} />
          </label>
          <label>
            <span>User ID</span>
            <input value={form.userId} onChange={update("userId")} />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={update("role")}>
              <option value="associate">associate</option>
              <option value="responsible_attorney">responsible_attorney</option>
              <option value="paralegal">paralegal</option>
              <option value="billing_reviewer">billing_reviewer</option>
            </select>
          </label>
          <div className="matter-form-footer">
            <div>
              <ShieldCheck size={15} />
              <span>{stateText}</span>
            </div>
            <button className="primary-button" disabled={!activeMatter || submitting}>
              <UserPlus size={15} />
              {submitting ? "Adding" : "Add"}
            </button>
          </div>
        </form>
        <DataTable columns={["Member", "Employee", "User", "Role", "Status"]} rows={rows} />
      </div>
    </Panel>
  );
}
