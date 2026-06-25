import React, { useEffect, useMemo, useState } from "react";
import { Database, PlugZap, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { DataTable, Panel, Property } from "../../components/primitives.jsx";
import {
  assignPermissionSet,
  createConnectedApp,
  createPermissionSet,
  disableConnectedApp,
  fetchAdminPermissionAudit,
  fetchConnectedApps,
  fetchObjectManagerFields,
  fetchObjectManagerObjects,
  fetchPermissionAssignments,
  fetchPermissionSets,
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
  if (action === "admin.object_field_policy.patched") return "필드 정책 변경";
  if (action === "admin.connected_app.created") return "연결 앱 등록";
  if (action === "admin.connected_app.disabled") return "연결 앱 중지";
  return "관리 기록";
}

function statusClass(result) {
  const outcome = result?.statusOutcome ?? result?.outcome;
  if (outcome === "owner_blocked" || outcome === "provider_blocked" || outcome === "review_required") return "live-data-review";
  if (outcome === "denied" || result?.kind === "error") return "live-data-denied";
  return "live-data-state";
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
  const [ethicsResult, setEthicsResult] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPermissionSets(),
      fetchPermissionAssignments(),
      fetchObjectManagerObjects(),
      fetchConnectedApps(),
      fetchAdminPermissionAudit(),
      fetchLegalPeopleEthics()
    ]).then(async ([sets, assignmentResult, objectResult, appResult, auditResult, ethics]) => {
      if (cancelled) return;
      const objectName = objectResult.kind === "data" ? objectResult.items.find((item) => item.object_name === activeObject)?.object_name ?? objectResult.items[0]?.object_name ?? "Client" : activeObject;
      const fieldResult = await fetchObjectManagerFields({ objectName });
      if (cancelled) return;
      setPermissionSets(sets.kind === "data" ? sets.items : []);
      setAssignments(assignmentResult.kind === "data" ? assignmentResult.items : []);
      setObjects(objectResult.kind === "data" ? objectResult.items : []);
      setConnectedApps(appResult.kind === "data" ? appResult.items : []);
      setAuditRows(auditResult.kind === "data" ? auditResult.items : []);
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

  async function runAction(key, action) {
    const result = await action();
    setResults((current) => ({ ...current, [key]: result }));
    setRefreshKey((keyValue) => keyValue + 1);
  }

  return (
    <section className="people-admin-grid span-2" data-sf-b-w06-admin-setup="true">
      <Panel title="권한 세트" meta={loading ? "불러오는 중" : `${permissionSets.length}개`} className="people-admin-panel">
        <div className="people-panel-kicker">
          <ShieldCheck size={14} />
          People 안에서 Client/Matter 접근 권한을 검토합니다.
        </div>
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

      <Panel title="권한 배정" meta={`${assignments.length}개`} className="people-admin-panel">
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

      <Panel title="People 민감도 연결" meta={`${ethicsPermissionLinks.length}개`} className="people-admin-panel">
        <div className="people-panel-kicker" data-lcx-ppl-06-permission-linkage="true">
          <ShieldCheck size={14} />
          충돌/윤리벽 민감 필드와 권한 세트 연결을 확인합니다.
        </div>
        <DataTable
          columns={["필드", "필요 역할", "권한 세트", "표시"]}
          rows={ethicsPermissionLinks.map((item) => [
            item.sensitive_field,
            item.required_role,
            item.permission_set_id,
            stateLabel(item.field_visibility)
          ])}
        />
        <div className="live-data-state" data-lcx-ppl-06-permission-receipt-link="true">
          <strong>Reviewer receipt</strong>
          {ethicsReceiptCount}건 연결됨
        </div>
      </Panel>

      <Panel title="객체 관리" meta={activeObject} className="people-admin-panel">
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
          columns={["필드", "표시", "상태", "구조 변경"]}
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
            정책 변경
          </button>
        </div>
        <div className={statusClass(results.fieldPolicy)} data-sf-b-w06-field-policy-owner-blocked-result="true">
          <strong>필드 정책</strong>
          {resultText(results.fieldPolicy)}
        </div>
      </Panel>

      <Panel title="연결 앱" meta={`${connectedApps.length}개`} className="people-admin-panel">
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

      <Panel title="감사 기록" meta={`${auditRows.length}건`} className="people-admin-panel span-2">
        <DataTable
          columns={["작업", "대상", "보안"]}
          rows={auditRows.slice(0, 6).map((item) => [
            auditLabel(item.action),
            "관리 대상",
            item.production_ready_claim ? "확인 필요" : "제한됨"
          ])}
        />
        <div className="live-data-state" data-sf-b-w06-admin-audit="true">
          <strong>감사 경계</strong>
          직접 식별자, 토큰, 원문 정책은 숨깁니다.
        </div>
      </Panel>
    </section>
  );
}
