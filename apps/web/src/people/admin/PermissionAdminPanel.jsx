import React, { useEffect, useMemo, useRef, useState } from "react";
import { Database, KeyRound, Lock, PlugZap, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { DataTable, Panel, Property } from "../../components/primitives.jsx";
import {
  assignPermissionSet,
  adminUserProfile,
  approveAdminBreakGlass,
  createPersonInvitation,
  createConnectedApp,
  createPermissionSet,
  disableAdminSecurityUser,
  disableConnectedApp,
  fetchAdminBreakGlassRequests,
  fetchAdminPermissionAudit,
  fetchAdminSecurityAudit,
  fetchAdminSecurityUsers,
  fetchPersonInvitationOptions,
  fetchConnectedApps,
  fetchObjectManagerFields,
  fetchObjectManagerObjects,
  fetchPermissionAssignments,
  fetchPermissionSets,
  reactivateAdminSecurityUser,
  readLawosApiSession,
  requestAdminBreakGlass,
  revokeAdminBreakGlass,
  patchObjectFieldPolicy,
  patchPermissionSet,
  revokePermissionSetAssignment
} from "../../data/apiClient.js";
import { fetchLegalPeopleEthics } from "../hrxApiClient.ts";

function outcomeLabel(outcome) {
  if (outcome === "owner_blocked") return "승인 대기";
  if (outcome === "provider_blocked") return "외부 확인 대기";
  if (outcome === "idempotent_replay") return "중복 요청 확인";
  if (outcome === "passed") return "준비됨";
  if (outcome === "review_required") return "검토 대기";
  if (outcome === "denied") return "제한됨";
  if (outcome === "disabled") return "비활성화됨";
  if (outcome === "reactivated") return "재활성화됨";
  if (outcome === "pending") return "대기";
  if (outcome === "approved") return "승인";
  if (outcome === "revoked") return "철회";
  if (outcome === "error") return "오류";
  return "대기";
}

function stateLabel(value) {
  if (value === true) return "예";
  if (value === false) return "아니오";
  if (value === "owner_review_required" || value === "owner_blocked") return "승인 대기";
  if (value === "provider_blocked") return "외부 확인 대기";
  if (value === "active") return "활성";
  if (value === "disabled") return "비활성";
  if (value === "pending") return "대기";
  if (value === "approved") return "승인";
  if (value === "revoked") return "철회";
  return value ?? "대기";
}

function resultText(result) {
  if (!result) return "아직 실행 전";
  if (result.kind === "error") return "요청 실패";
  return outcomeLabel(result.statusOutcome ?? result.outcome);
}

function auditLabel(action) {
  if (action === "admin.permission_set.created") return "권한 세트 등록";
  if (action === "admin.permission_set.patched") return "권한 세트 변경";
  if (action === "admin.permission_assignment.created") return "권한 배정 요청";
  if (action === "admin.permission_assignment.revoked") return "권한 회수 요청";
  if (action === "admin.object_field_policy.patched") return "항목 표시 방식 수정";
  if (action === "admin.connected_app.created") return "연결 앱 등록";
  if (action === "admin.connected_app.disabled") return "연결 앱 중지";
  if (action === "admin.security.user.disabled") return "사용자 비활성화";
  if (action === "admin.security.user.reactivated") return "사용자 재활성화";
  if (action === "admin.security.break_glass.requested") return "긴급 접근 요청";
  if (action === "admin.security.break_glass.approved") return "긴급 접근 승인";
  if (action === "admin.security.break_glass.revoked") return "긴급 접근 철회";
  return "관리 기록";
}

function statusClass(result) {
  const outcome = result?.statusOutcome ?? result?.outcome;
  if (outcome === "owner_blocked" || outcome === "provider_blocked" || outcome === "review_required") return "live-data-review";
  if (outcome === "denied" || result?.kind === "error") return "live-data-denied";
  return "live-data-state";
}

function UserProfileEditor({ users }) {
  const [userId, setUserId] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const attempt = useRef(null);
  const fields = [["display_name", "표시 이름"], ["legal_name", "법적 이름"], ["english_name", "영문 이름"], ["mobile_phone", "연락처"], ["contact_email", "연락용 이메일"]];
  function fromItem(item) {
    return { ...Object.fromEntries(fields.map(([key]) => [key, item[key] ?? ""])), bio: item.professional_profile?.bio ?? "" };
  }
  useEffect(() => {
    let cancelled = false;
    setDraft(null);
    setMessage("");
    attempt.current = null;
    if (userId) {
      setBusy(true);
      adminUserProfile({ userId }).then(result => {
        if (cancelled) return;
        setBusy(false);
        if (result.kind === "data") setDraft(fromItem(result.item));
        else setMessage("프로필을 불러오지 못했습니다.");
      });
    }
    return () => { cancelled = true; };
  }, [userId]);
  async function save() {
    const fingerprint = JSON.stringify(draft);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    const { bio, ...profile } = draft;
    const result = await adminUserProfile({ userId, patch: { ...profile, professional_profile: { bio } }, idempotencyKey: attempt.current.key });
    setBusy(false);
    if (result.kind === "data") { setDraft(fromItem(result.item)); attempt.current = null; setMessage("저장됨"); }
    else setMessage("저장을 확인하지 못했습니다. 다시 시도해 주세요.");
  }
  return <div className="person-profile-admin-editor matter-profile-field-list" data-admin-person-profile="true">
    <label>프로필 수정 대상
      <select value={userId} disabled={busy} onChange={event => setUserId(event.target.value)}>
        <option value="">사용자 선택</option>
        {users.map(user => <option key={user.user_id} value={user.user_id}>{user.display_name}</option>)}
      </select>
    </label>
    {draft && <fieldset disabled={busy}>
      <legend>프로필</legend>
      {fields.map(([key, label]) => <label key={key} className="matter-profile-field-row matter-profile-field-row-edit">
        <span>{label}</span><input value={draft[key]} maxLength={key === "mobile_phone" ? 80 : 254} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
      </label>)}
      <label className="matter-profile-field-row matter-profile-field-row-edit"><span>소개</span>
        <textarea value={draft.bio} maxLength={4000} onChange={event => setDraft(current => ({ ...current, bio: event.target.value }))} />
      </label>
      <button type="button" className="secondary-button" disabled={!draft.display_name.trim()} onClick={save}>프로필 저장</button>
    </fieldset>}
    <span role="status">{busy ? "처리 중" : message}</span>
  </div>;
}

function PersonOnboardingForm({ clientGroups, onCreated }) {
  const empty = { type: "internal", email: "", display_name: "", legal_name: "", mobile_phone: "", contact_email: "", professional_profile: { bio: "" },
    employment_type: "full_time", title: "", org_unit_id: "", effective_from: new Date().toISOString().slice(0, 10), client_group_id: "" };
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const attempt = useRef(null);
  function change(key, value) { setDraft(current => ({ ...current, [key]: value })); setReceipt(null); }
  async function submit(event) {
    event.preventDefault();
    const fingerprint = JSON.stringify(draft);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    const result = await createPersonInvitation({ input: draft, idempotencyKey: attempt.current.key });
    setBusy(false);
    if (result.kind === "data") {
      setReceipt(result);
      attempt.current = null;
      onCreated?.();
    } else setReceipt({ kind: "error", safeErrorCodes: result.safeErrorCodes });
  }
  return <form className="person-onboarding-form matter-profile-field-list" data-person-onboarding="true" onSubmit={submit}>
    <label>사용자 유형
      <select value={draft.type} disabled={busy} onChange={event => change("type", event.target.value)}>
        <option value="internal">내부 구성원</option>
        <option value="external">외부 사용자</option>
      </select>
    </label>
    <label>로그인 이메일<input type="email" required value={draft.email} onChange={event => change("email", event.target.value)} /></label>
    <label>표시 이름<input required value={draft.display_name} onChange={event => change("display_name", event.target.value)} /></label>
    <label>법적 이름<input value={draft.legal_name} onChange={event => change("legal_name", event.target.value)} /></label>
    <label>연락처<input value={draft.mobile_phone} onChange={event => change("mobile_phone", event.target.value)} /></label>
    <label>연락용 이메일<input type="email" value={draft.contact_email} onChange={event => change("contact_email", event.target.value)} /></label>
    <label>소개<textarea maxLength={4000} value={draft.professional_profile.bio}
      onChange={event => change("professional_profile", { bio: event.target.value })} /></label>
    {draft.type === "internal" ? <>
      <label>고용 형태<select value={draft.employment_type} onChange={event => change("employment_type", event.target.value)}>
        <option value="full_time">정규직</option><option value="part_time">시간제</option><option value="contractor">계약직</option><option value="intern">인턴</option>
      </select></label>
      <label>직함<input value={draft.title} onChange={event => change("title", event.target.value)} /></label>
      <label>조직 ID<input value={draft.org_unit_id} onChange={event => change("org_unit_id", event.target.value)} /></label>
      <label>시작일<input type="date" required value={draft.effective_from} onChange={event => change("effective_from", event.target.value)} /></label>
    </> : <>
      <label>고객 그룹<select required value={draft.client_group_id} onChange={event => change("client_group_id", event.target.value)}>
        <option value="">고객 그룹 선택</option>
        {clientGroups.map(group => <option key={group.client_group_id} value={group.client_group_id}>{group.display_name}</option>)}
      </select></label>
      <p>사건 접근 권한은 별도 지정 전까지 차단됩니다. 초대 후 해당 사건에서 명시적으로 권한을 부여하세요.</p>
    </>}
    <button type="submit" className="secondary-button" disabled={busy}>{busy ? "초대 생성 중" : "사용자 초대"}</button>
    <div role="status" data-person-onboarding-result="true">
      {receipt?.kind === "error" && "초대를 만들지 못했습니다."}
      {receipt?.kind === "data" && <>{receipt.idempotent_replay ? "기존 초대를 확인했습니다." : "초대를 만들었습니다."}
        {receipt.invitation?.setup_url && <><br /><a href={receipt.invitation.setup_url}>로컬 테스트 계정 설정 링크</a></>}
        {receipt.access?.matter_access === "denied_until_explicit_acl" && <><br />사건 접근: 별도 권한 지정 전까지 차단</>}</>}
    </div>
  </form>;
}

export function PermissionAdminPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeObject, setActiveObject] = useState("Client");
  const [loading, setLoading] = useState(true);
  const [permissionSets, setPermissionSets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [objects, setObjects] = useState([]);
  const [fields, setFields] = useState([]);
  const [connectedApps, setConnectedApps] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [securityUsers, setSecurityUsers] = useState([]);
  const [breakGlassRequests, setBreakGlassRequests] = useState([]);
  const [securityAuditRows, setSecurityAuditRows] = useState([]);
  const [clientGroups, setClientGroups] = useState([]);
  const [ethicsResult, setEthicsResult] = useState(null);
  const [results, setResults] = useState({});
  const [activeSecurityResultKey, setActiveSecurityResultKey] = useState(null);
  const [activeBreakGlassResultKey, setActiveBreakGlassResultKey] = useState(null);
  const [disableConfirmUserId, setDisableConfirmUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPermissionSets(),
      fetchPermissionAssignments(),
      fetchObjectManagerObjects(),
      fetchConnectedApps(),
      fetchAdminPermissionAudit(),
      fetchAdminSecurityUsers(),
      fetchAdminBreakGlassRequests(),
      fetchAdminSecurityAudit(),
      fetchPersonInvitationOptions(),
      fetchLegalPeopleEthics()
    ]).then(async ([
      sets,
      assignmentResult,
      objectResult,
      appResult,
      auditResult,
      securityUserResult,
      breakGlassResult,
      securityAuditResult,
      invitationOptions,
      ethics
    ]) => {
      if (cancelled) return;
      const objectName = objectResult.kind === "data" ? objectResult.items.find((item) => item.object_name === activeObject)?.object_name ?? objectResult.items[0]?.object_name ?? "Client" : activeObject;
      const fieldResult = await fetchObjectManagerFields({ objectName });
      if (cancelled) return;
      setPermissionSets(sets.kind === "data" ? sets.items : []);
      setAssignments(assignmentResult.kind === "data" ? assignmentResult.items : []);
      setObjects(objectResult.kind === "data" ? objectResult.items : []);
      setConnectedApps(appResult.kind === "data" ? appResult.items : []);
      setAuditRows(auditResult.kind === "data" ? auditResult.items : []);
      setSecurityUsers(securityUserResult.kind === "data" ? securityUserResult.items : []);
      setBreakGlassRequests(breakGlassResult.kind === "data" ? breakGlassResult.items : []);
      setSecurityAuditRows(securityAuditResult.kind === "data" ? securityAuditResult.items : []);
      setClientGroups(invitationOptions.kind === "data" ? invitationOptions.items : []);
      setEthicsResult(ethics);
      setFields(fieldResult.kind === "data" ? fieldResult.items : []);
      setActiveObject(objectName);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, activeObject]);

  const activePermissionSetId = permissionSets[0]?.permission_set_id ?? "permission_set_client_matter_reviewer";
  const activeAssignmentId = assignments[0]?.assignment_id ?? "permission_assignment_reviewer_seed";
  const activeField = useMemo(() => fields.find((field) => field.field_name === "status") ?? fields[0], [fields]);
  const activeConnectedAppId = connectedApps[0]?.app_id ?? "connected_app_microsoft_graph";
  const ethicsPermissionLinks = ethicsResult?.kind === "data" ? ethicsResult.permission_links : [];
  const ethicsReceiptCount = ethicsResult?.kind === "data" ? ethicsResult.reviewer_receipts.length : 0;
  const currentUserId = readLawosApiSession()?.session?.user_id ?? null;
  const activeSecurityUser = useMemo(
    () => securityUsers.find((user) => user.user_id !== currentUserId && user.highest_privilege !== true) ?? securityUsers.find((user) => user.user_id !== currentUserId) ?? securityUsers[0],
    [currentUserId, securityUsers]
  );
  const activeBreakGlassRequest = breakGlassRequests.find((item) => item.state === "pending") ?? breakGlassRequests[0];
  const latestSecurityAudit = securityAuditRows[0];
  const activeSecurityResult = activeSecurityResultKey ? results[activeSecurityResultKey] : null;
  const activeBreakGlassResult = activeBreakGlassResultKey ? results[activeBreakGlassResultKey] : null;

  async function runAction(key, action) {
    const result = await action();
    setResults((current) => ({ ...current, [key]: result }));
    setRefreshKey((keyValue) => keyValue + 1);
  }

  async function runDisableSecurityUser() {
    if (!activeSecurityUser?.user_id) return;
    if (disableConfirmUserId !== activeSecurityUser.user_id) {
      setDisableConfirmUserId(activeSecurityUser.user_id);
      return;
    }
    await runAction("disableSecurityUser", () => disableAdminSecurityUser({
      userId: activeSecurityUser.user_id,
      reason: "관리자 보안 운영 패널 확인"
    }));
    setActiveSecurityResultKey("disableSecurityUser");
    setDisableConfirmUserId(null);
  }

  async function runReactivateSecurityUser() {
    if (!activeSecurityUser?.user_id) return;
    setDisableConfirmUserId(null);
    await runAction("reactivateSecurityUser", () => reactivateAdminSecurityUser({
      userId: activeSecurityUser.user_id,
      reason: "관리자 보안 운영 패널 복구"
    }));
    setActiveSecurityResultKey("reactivateSecurityUser");
  }

  async function runRequestBreakGlass() {
    const requesterUserId = activeSecurityUser?.user_id ?? securityUsers.find((user) => user.user_id !== currentUserId)?.user_id;
    if (!requesterUserId) return;
    await runAction("requestBreakGlass", () => requestAdminBreakGlass({
      requesterUserId,
      reason: "운영 접근 요청"
    }));
    setActiveBreakGlassResultKey("requestBreakGlass");
  }

  async function runApproveBreakGlass() {
    if (!activeBreakGlassRequest?.break_glass_request_id) return;
    await runAction("approveBreakGlass", () => approveAdminBreakGlass({
      requestId: activeBreakGlassRequest.break_glass_request_id,
      reason: "관리자 승인"
    }));
    setActiveBreakGlassResultKey("approveBreakGlass");
  }

  async function runRevokeBreakGlass() {
    if (!activeBreakGlassRequest?.break_glass_request_id) return;
    await runAction("revokeBreakGlass", () => revokeAdminBreakGlass({
      requestId: activeBreakGlassRequest.break_glass_request_id,
      reason: "관리자 철회"
    }));
    setActiveBreakGlassResultKey("revokeBreakGlass");
  }

  return (
    <section className="people-admin-grid span-2" data-sf-b-w06-admin-setup="true">
      <Panel title="권한" meta={loading ? "불러오는 중" : `${permissionSets.length}개`} className="people-admin-panel">
        <DataTable
          columns={["이름", "규칙", "범위", "상태"]}
          rows={permissionSets.map((item) => [
            item.label,
            `${item.rule_count}`,
            `${item.object_acl_count}`,
            stateLabel(item.status)
          ])}
        />
        <div className="admin-action-row" data-permission-set-admin="route-backed" data-sf-b-w06-permission-set-list="true">
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-permission-set-create-action="true"
            onClick={() => runAction("createSet", () => createPermissionSet())}
          >
            <UserPlus size={15} />
            세트 요청
          </button>
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-permission-set-patch-action="true"
            onClick={() => runAction("patchSet", () => patchPermissionSet({ permissionSetId: activePermissionSetId }))}
          >
            <RefreshCw size={15} />
            변경 요청
          </button>
        </div>
        <div className={statusClass(results.createSet)} data-sf-b-w06-permission-set-create-result="true">
          <strong>세트 요청</strong>
          {resultText(results.createSet)}
        </div>
        <div className={statusClass(results.patchSet)} data-sf-b-w06-permission-set-patch-result="true">
          <strong>변경 요청</strong>
          {resultText(results.patchSet)}
        </div>
      </Panel>

      <Panel title="액세스 권한" meta={`${assignments.length}개`} className="people-admin-panel">
        <DataTable
          columns={["대상", "세트", "상태", "적용"]}
          rows={assignments.map((item) => [
            item.target_label,
            stateLabel(item.permission_set_id === activePermissionSetId ? "선택됨" : "대기"),
            stateLabel(item.status),
            stateLabel(item.grant_applied)
          ])}
        />
        <div className="admin-action-row" data-permission-assignment-admin="route-backed" data-sf-b-w06-assignment-list="true">
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-assignment-owner-blocked-action="true"
            onClick={() => runAction("assign", () => assignPermissionSet({ permissionSetId: activePermissionSetId }))}
          >
            <UserPlus size={15} />
            배정 요청
          </button>
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-revoke-owner-blocked-action="true"
            onClick={() => runAction("revoke", () => revokePermissionSetAssignment({ assignmentId: activeAssignmentId }))}
          >
            <RefreshCw size={15} />
            회수 요청
          </button>
        </div>
        <div className={statusClass(results.assign)} data-sf-b-w06-assignment-owner-blocked-result="true">
          <strong>배정 요청</strong>
          {resultText(results.assign)}
        </div>
        <div className={statusClass(results.revoke)} data-sf-b-w06-revoke-owner-blocked-result="true">
          <strong>회수 요청</strong>
          {resultText(results.revoke)}
        </div>
      </Panel>

      <Panel title="권한 범위" meta={`${ethicsPermissionLinks.length}개`} className="people-admin-panel" data-lcx-ppl-06-permission-linkage="true">
        <DataTable
          columns={["항목", "필요 역할", "권한 세트", "표시"]}
          rows={ethicsPermissionLinks.map((item) => [
            item.sensitive_field,
            item.required_role,
            item.permission_set_id,
            stateLabel(item.field_visibility)
          ])}
        />
        <div className="live-data-state" data-lcx-ppl-06-permission-receipt-link="true">
          <strong>검토 기록</strong>
          {ethicsReceiptCount}건 연결됨
        </div>
      </Panel>

      <Panel title="사용자 운영" meta={`${securityUsers.length}명`} className="people-admin-panel">
        <PersonOnboardingForm clientGroups={clientGroups} onCreated={() => setRefreshKey(keyValue => keyValue + 1)} />
        <UserProfileEditor users={securityUsers} />
        <DataTable
          columns={["사용자", "역할", "상태", "로그인"]}
          rows={securityUsers.map((item) => [
            item.display_name,
            item.source_title ?? item.role_profile_id ?? "구성원",
            stateLabel(item.status),
            stateLabel(item.login_allowed)
          ])}
        />
        <div className="admin-action-row" data-admin-security-users="route-backed">
          <button
            type="button"
            className="secondary-button"
            data-admin-security-disable-action="true"
            onClick={runDisableSecurityUser}
          >
            <Lock size={15} />
            {disableConfirmUserId === activeSecurityUser?.user_id ? "비활성화 실행" : "비활성화 확인"}
          </button>
          <button
            type="button"
            className="secondary-button"
            data-admin-security-reactivate-action="true"
            onClick={runReactivateSecurityUser}
          >
            <RefreshCw size={15} />
            재활성화
          </button>
        </div>
        <div className={statusClass(activeSecurityResult)} data-admin-security-disable-result="true">
          <strong>{activeSecurityUser?.display_name ?? "대상 사용자"}</strong>
          {resultText(activeSecurityResult)}
        </div>
      </Panel>

      <Panel title="긴급 접근" meta={`${breakGlassRequests.length}건`} className="people-admin-panel">
        <DataTable
          columns={["요청자", "사유", "상태", "결정"]}
          rows={breakGlassRequests.slice(0, 6).map((item) => [
            item.requester_label,
            item.reason,
            stateLabel(item.state),
            item.decided_by ? stateLabel(item.state) : "대기"
          ])}
        />
        <div className="admin-action-row" data-admin-break-glass-queue="route-backed">
          <button
            type="button"
            className="secondary-button"
            data-admin-break-glass-request-action="true"
            onClick={runRequestBreakGlass}
          >
            <KeyRound size={15} />
            접근 요청
          </button>
          <button
            type="button"
            className="secondary-button"
            data-admin-break-glass-approve-action="true"
            onClick={runApproveBreakGlass}
            disabled={!activeBreakGlassRequest?.break_glass_request_id}
          >
            <ShieldCheck size={15} />
            승인
          </button>
          <button
            type="button"
            className="secondary-button"
            data-admin-break-glass-revoke-action="true"
            onClick={runRevokeBreakGlass}
            disabled={!activeBreakGlassRequest?.break_glass_request_id}
          >
            <RefreshCw size={15} />
            철회
          </button>
        </div>
        <div className={statusClass(activeBreakGlassResult)} data-admin-break-glass-result="true">
          <strong>긴급 접근</strong>
          {resultText(activeBreakGlassResult)}
        </div>
        <div className="live-data-state" data-admin-security-audit="true">
          <strong>감사 이력</strong>
          {latestSecurityAudit ? auditLabel(latestSecurityAudit.action) : "기록 대기"}
        </div>
      </Panel>

      <Panel title="구성원 커스텀 필드" meta={activeObject} className="people-admin-panel">
        <div className="object-manager-tabs" data-object-manager-admin="route-backed" data-sf-b-w06-object-manager="true">
          {objects.map((item) => (
            <button
              key={item.object_name}
              type="button"
              className={activeObject === item.object_name ? "sidebar-item active" : "sidebar-item"}
              onClick={() => setActiveObject(item.object_name)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <DataTable
          columns={["항목", "표시", "상태", "구조 변경"]}
          rows={fields.map((item) => [
            item.label,
            stateLabel(item.visibility),
            stateLabel(item.ui_state),
            stateLabel(item.physical_schema_mutated)
          ])}
        />
        <div className="admin-action-row">
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-field-policy-owner-blocked-action="true"
            onClick={() => runAction("fieldPolicy", () => patchObjectFieldPolicy({
              objectName: activeField?.object_name ?? activeObject,
              fieldName: activeField?.field_name ?? "status"
            }))}
          >
            <Database size={15} />
            표시 방식 수정
          </button>
        </div>
        <div className={statusClass(results.fieldPolicy)} data-sf-b-w06-field-policy-owner-blocked-result="true">
          <strong>커스텀 항목</strong>
          {resultText(results.fieldPolicy)}
        </div>
      </Panel>

      <Panel title="연동" meta={`${connectedApps.length}개`} className="people-admin-panel">
        <div className="connected-app-list" data-connected-apps-admin="provider-blocked" data-sf-b-w06-connected-app-list="true">
          {connectedApps.map((item) => (
            <Property
              key={item.app_id}
              label={item.label}
              value={item.provider_configured ? "연결됨" : stateLabel(item.ui_state)}
            />
          ))}
        </div>
        <div className="admin-action-row">
          <button
            type="button"
            className="secondary-button"
            data-sf-b-w06-connected-app-provider-blocked-action="true"
            onClick={() => runAction("createApp", () => createConnectedApp())}
          >
            <PlugZap size={15} />
            연결 요청
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => runAction("disableApp", () => disableConnectedApp({ appId: activeConnectedAppId }))}
          >
            <RefreshCw size={15} />
            중지 요청
          </button>
        </div>
        <div className={statusClass(results.createApp ?? results.disableApp)} data-sf-b-w06-connected-app-provider-blocked-result="true">
          <strong>연결 상태</strong>
          {resultText(results.createApp ?? results.disableApp)}
        </div>
      </Panel>

      <Panel title="권한 변경 이력" meta={`${auditRows.length}건`} className="people-admin-panel span-2">
        <DataTable
          columns={["작업", "대상", "보안"]}
          rows={auditRows.slice(0, 6).map((item) => [
            auditLabel(item.action),
            "관리 대상",
            item.production_ready_claim ? "확인 필요" : "제한됨"
          ])}
        />
        <div className="live-data-state" data-sf-b-w06-admin-audit="true">
          <strong>기록 표시 범위</strong>
          직접 식별자, 토큰, 원문 정책은 숨깁니다.
        </div>
      </Panel>
    </section>
  );
}
