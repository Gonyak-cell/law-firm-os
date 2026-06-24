import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import {
  createCrmAccount,
  createCrmContact,
  createIntakeConflictCheck,
  fetchCrmAccountContacts,
  fetchCrmAccounts,
  fetchCrmContacts,
  fetchCrmLeads,
  fetchCrmOpportunities,
  fetchIntakeAudit,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  handoffCrmOpportunityToIntake,
  issueIntakeClearanceToken,
  patchCrmAccount,
  patchCrmContact
} from "../data/apiClient.js";
import { DataTable, PageHeader, Panel, Property } from "./primitives.jsx";

const CLIENTS_PERMISSION_REF = "ui_cmp_g2_party_clients_live";
const CLIENTS_AUDIT_HINT_REF = "ui_cmp_g2_clients_live_probe";
const CLIENT_SECTIONS = new Set([
  "clients-list",
  "client-leads",
  "client-opportunities",
  "client-intake",
  "client-accounts",
  "client-contacts"
]);

function clientDisplayName(item, index) {
  return businessLabel(item.display_name ?? item.client_name ?? item.name, `Client ${index + 1}`);
}

function clientMembers(item) {
  return Array.isArray(item.member_entity_ids) ? item.member_entity_ids.length : "없음";
}

function clientStatus(value) {
  if (value === "review_required") return "검토 필요";
  if (value === "inactive") return "비활성";
  return "사용 중";
}

function pipelineStatus(value) {
  if (value === "qualified") return "검증됨";
  if (value === "active") return "진행 중";
  if (value === "open") return "접수";
  if (value === "intake_requested") return "접수 요청됨";
  if (value === "review_required") return "검토 필요";
  if (value === "closed") return "종료";
  return value ?? "진행 중";
}

function businessLabel(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  if (/synthetic|cmp_g|rp0|_[a-z0-9]/i.test(text)) return fallback;
  return text;
}

function linkedLabel(value) {
  return value ? "연결됨" : "미연결";
}

function actionMessage(result, successText) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "blocked") return "검토가 필요합니다.";
  return successText;
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function upsertResultItem(current, nextItem, key) {
  if (!nextItem?.[key]) return current;
  const currentItems = resultItems(current).filter((item) => item?.[key] !== nextItem[key]);
  return {
    ...(current?.kind === "data" ? current : {}),
    kind: "data",
    outcome: current?.outcome ?? "passed",
    items: [nextItem, ...currentItems],
    safeErrorCodes: current?.safeErrorCodes ?? [],
    productionReadyClaim: false
  };
}

function renderLiveState(result, noun) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>{noun} 정보를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-unavailable live-data-error">
        <strong>{noun} 정보를 불러오지 못했습니다</strong>
        잠시 후 다시 시도해주세요.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>접근 권한이 없습니다</strong>
        권한이 있는 {noun} 정보만 표시됩니다.
      </div>
    );
  }
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 {noun} 정보를 확인할 수 있습니다.
      </div>
    );
  }
  if (result.uiState === "empty" || resultItems(result).length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>표시할 {noun} 정보가 없습니다</strong>
      </div>
    );
  }
  return null;
}

function ClientRecordPanel({ client, leadCount, opportunityCount, intakeCount, accountCount, contactCount }) {
  return (
    <aside className="record-side-panel" data-client-record-workspace="right-panel">
      <div className="record-side-header">
        <span className="eyebrow">레코드</span>
        <strong>{client ? clientDisplayName(client, 0) : "Client"}</strong>
      </div>
      <div className="property-grid tight">
        <Property label="상태" value={client ? clientStatus(client.status) : "대기"} />
        <Property label="대표 당사자" value={client?.primary_entity_id ?? client?.primary_party_id ?? "미지정"} />
        <Property label="구성원" value={client ? String(clientMembers(client)) : "0"} />
        <Property label="연결 Matter" value={businessLabel(client?.matter_core_enrichment?.matter_title, "미지정")} />
      </div>
      <div className="record-meter-grid">
        <div>
          <span>Lead</span>
          <strong>{leadCount}</strong>
        </div>
        <div>
          <span>Opportunity</span>
          <strong>{opportunityCount}</strong>
        </div>
        <div>
          <span>Intake</span>
          <strong>{intakeCount}</strong>
        </div>
        <div>
          <span>Account</span>
          <strong>{accountCount}</strong>
        </div>
        <div>
          <span>Contact</span>
          <strong>{contactCount}</strong>
        </div>
      </div>
      <div className="record-boundary-note">
        <ShieldCheck size={15} />
        <span>권한 기준에 맞춰 표시됩니다.</span>
      </div>
    </aside>
  );
}

function ClientsTable({ result }) {
  const state = renderLiveState(result, "Client");
  if (state) return state;
  const items = resultItems(result);
  const reviewCount = items.filter((item) => item.status === "review_required").length;
  return (
    <div className="clients-live-stack">
      {reviewCount > 0 && (
        <div className="client-review-strip">
          <ShieldCheck size={15} />
          <span>검토가 필요한 Client가 있습니다.</span>
        </div>
      )}
      <DataTable
        columns={["Client", "진행 상태", "대표 당사자", "구성원", "연결된 Matter"]}
        rows={items.map((item, index) => [
          clientDisplayName(item, index),
          clientStatus(item.status),
          item.primary_entity_id || item.primary_party_id ? "대표 당사자" : "미지정",
          String(clientMembers(item)),
          businessLabel(item.matter_core_enrichment?.matter_title, "미지정")
        ])}
      />
    </div>
  );
}

function AccountsTable({ result, relationshipResult, createResult, createPending, patchResult, patchPending, onCreateAccount, onPatchAccount }) {
  const state = renderLiveState(result, "계정");
  if (state) return state;
  const accounts = resultItems(result);
  const editableAccount = accounts.find((item) => item.account_source === "crm-runtime.Account");
  const relationshipState = renderLiveState(relationshipResult, "관련 연락처");
  return (
    <div className="clients-live-stack" data-crm-accounts-read="true">
      <div className="record-action-strip" data-crm-account-create-action="true">
        <div>
          <strong>계정 생성</strong>
          <span>새 Client 계정 레코드를 추가합니다.</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="계정을 생성 중입니다."
            successText="계정이 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateAccount}>
          <Plus size={15} />
          생성
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-crm-account-create-result="true">
          <ShieldCheck size={15} />
          <span>계정 생성이 기록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-account-patch-action="true">
        <div>
          <strong>계정 검토 표시</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 계정") : "편집 가능한 계정 없음"}</span>
          <ActionNotice
            pending={patchPending}
            result={patchResult}
            pendingText="계정을 업데이트 중입니다."
            successText="계정이 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableAccount || patchPending} onClick={onPatchAccount}>
          <ShieldCheck size={15} />
          검토 표시
        </button>
      </div>
      {patchResult?.kind === "data" && patchResult.item && (
        <div className="record-boundary-note" data-crm-account-patch-result="true">
          <ShieldCheck size={15} />
          <span>계정 상태가 반영되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["계정", "상태", "Client Group", "식별자"]}
        rows={accounts.map((item, index) => [
          businessLabel(item.display_name, `계정 ${index + 1}`),
          clientStatus(item.status),
          linkedLabel(item.client_group_id),
          item.registration_number_included === false ? "보호됨" : "검토 필요"
        ])}
      />
      <div className="record-action-strip" data-crm-account-contacts-read="true">
        <div>
          <strong>관련 연락처</strong>
          <span>권한이 허용한 관계만 표시됩니다.</span>
        </div>
      </div>
      {relationshipState ?? (
        <DataTable
          columns={["연락처", "관계", "상태", "연락값"]}
          rows={resultItems(relationshipResult).map((item, index) => [
            businessLabel(item.contact_display_name, `연락처 ${index + 1}`),
            item.relationship_type ?? "관계",
            clientStatus(item.status),
            item.contact_point_value_included === false ? "보호됨" : "검토 필요"
          ])}
        />
      )}
    </div>
  );
}

function ContactsTable({ result, createResult, createPending, patchResult, patchPending, onCreateContact, onPatchContact }) {
  const state = renderLiveState(result, "연락처");
  if (state) return state;
  const contacts = resultItems(result);
  const editableContact = contacts.find((item) => item.contact_source === "crm-runtime.Contact");
  return (
    <div className="clients-live-stack" data-crm-contacts-read="true">
      <div className="record-action-strip" data-crm-contact-create-action="true">
        <div>
          <strong>연락처 생성</strong>
          <span>새 담당자를 Client 레코드에 추가합니다.</span>
          <ActionNotice
            result={createResult}
            pending={createPending}
            pendingText="연락처를 생성 중입니다."
            successText="연락처가 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateContact}>
          <Plus size={15} />
          생성
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-crm-contact-create-result="true">
          <ShieldCheck size={15} />
          <span>연락처가 등록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-contact-patch-action="true">
        <div>
          <strong>연락처 검토 표시</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 연락처") : "편집 가능한 연락처 없음"}</span>
          <ActionNotice
            result={patchResult}
            pending={patchPending}
            pendingText="연락처를 업데이트 중입니다."
            successText="연락처가 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableContact || patchPending} onClick={onPatchContact}>
          <ShieldCheck size={15} />
          검토 표시
        </button>
      </div>
      {patchResult?.kind === "data" && patchResult.item && (
        <div className="record-boundary-note" data-crm-contact-patch-result="true">
          <ShieldCheck size={15} />
          <span>연락처 상태가 반영되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["연락처", "상태", "기본 연락", "연락값"]}
        rows={contacts.map((item, index) => [
          businessLabel(item.display_name, `연락처 ${index + 1}`),
          clientStatus(item.status),
          item.primary_contact_type ?? "미지정",
          item.contact_point_value_included === false || item.email_value_included === false ? "보호됨" : "검토 필요"
        ])}
      />
    </div>
  );
}

function LeadsTable({ result }) {
  const state = renderLiveState(result, "Lead");
  if (state) return state;
  return (
    <DataTable
      columns={["Lead", "상태", "당사자", "담당"]}
      rows={resultItems(result).map((item, index) => [
        businessLabel(item.display_name, `Lead ${index + 1}`),
        pipelineStatus(item.status),
        linkedLabel(item.party_id),
        item.owner_user_id ? "배정됨" : "미지정"
      ])}
    />
  );
}

function ActionNotice({ pending, result, pendingText, successText }) {
  if (pending) return <small>{pendingText}</small>;
  const message = actionMessage(result, successText);
  return message ? <small>{message}</small> : null;
}

function OpportunityActionPanel({ opportunity, pending, result, onHandoff }) {
  const refreshedOpportunity = result?.kind === "data" && result.opportunity?.opportunity_id === opportunity?.opportunity_id
    ? result.opportunity
    : opportunity;
  const linked = Boolean(refreshedOpportunity?.intake_request_id);
  return (
    <div className="record-action-strip" data-crm-handoff-action="true">
      <div>
        <strong>{refreshedOpportunity ? businessLabel(refreshedOpportunity.display_name, "Opportunity 1") : "Opportunity"}</strong>
        <span>{linked ? "접수 연결됨" : "접수 전환 대기"}</span>
        <ActionNotice
          pending={pending}
          result={result}
          pendingText="전환 중입니다."
          successText="접수로 전환되었습니다."
        />
      </div>
      <button className="secondary-button" type="button" disabled={!opportunity || linked || pending} onClick={onHandoff}>
        <ArrowRight size={15} />
        전환
      </button>
    </div>
  );
}

function IntakeActionPanel({ intakeRequest, auditCount, conflictResult, clearanceResult, conflictPending, clearancePending, onConflictCheck, onClearance }) {
  const conflict = conflictResult?.kind === "data" ? conflictResult.item : null;
  const clearance = clearanceResult?.kind === "data" ? clearanceResult.validation : null;
  return (
    <div className="record-action-grid" data-intake-clearance-action="true">
      <div className="record-action-strip">
        <div>
          <strong>{intakeRequest ? "Intake 1" : "Intake"}</strong>
          <span>{auditCount > 0 ? "감사 기록 있음" : "검토 대기"}</span>
          <ActionNotice
            pending={conflictPending}
            result={conflictResult}
            pendingText="충돌 검토 중입니다."
            successText="충돌 스냅샷이 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!intakeRequest || conflictPending} onClick={onConflictCheck}>
          충돌 검토
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{clearance?.valid ? "통과" : "Clearance"}</strong>
          <span>{conflict ? "스냅샷 확인됨" : "스냅샷 필요"}</span>
          <ActionNotice
            pending={clearancePending}
            result={clearanceResult}
            pendingText="통과 처리 중입니다."
            successText="통과 처리되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!intakeRequest || !conflict || clearancePending} onClick={onClearance}>
          통과 처리
        </button>
      </div>
    </div>
  );
}

function OpportunitiesTable({ result, pending, handoffResult, onHandoff }) {
  const state = renderLiveState(result, "Opportunity");
  if (state) return state;
  const opportunities = resultItems(result);
  return (
    <div className="clients-live-stack">
      <OpportunityActionPanel opportunity={opportunities[0]} pending={pending} result={handoffResult} onHandoff={onHandoff} />
      {handoffResult?.kind === "data" && handoffResult.opportunity && (
        <div className="record-boundary-note" data-crm-handoff-refresh-result="true">
          <ShieldCheck size={15} />
          <span>
            기회 상태가 {pipelineStatus(handoffResult.opportunity.stage)} 단계로 갱신되고 접수 레코드와 연결되었습니다.
          </span>
        </div>
      )}
      <DataTable
        columns={["Opportunity", "Stage", "상태", "Intake"]}
        rows={opportunities.map((item, index) => [
          businessLabel(item.display_name, `Opportunity ${index + 1}`),
          pipelineStatus(item.stage),
          pipelineStatus(item.status),
          linkedLabel(item.intake_request_id)
        ])}
      />
    </div>
  );
}

function IntakeTable({ result, auditResult, conflictResult, clearanceResult, conflictPending, clearancePending, onConflictCheck, onClearance }) {
  const state = renderLiveState(result, "Intake");
  if (state) return state;
  const intakes = resultItems(result);
  const auditCount = resultItems(auditResult).length;
  return (
    <div className="clients-live-stack">
      <IntakeActionPanel
        intakeRequest={intakes[0]}
        auditCount={auditCount}
        conflictResult={conflictResult}
        clearanceResult={clearanceResult}
        conflictPending={conflictPending}
        clearancePending={clearancePending}
        onConflictCheck={onConflictCheck}
        onClearance={onClearance}
      />
      <DataTable
        columns={["Intake", "상태", "Opportunity", "Scope"]}
        rows={intakes.map((item, index) => [
          `Intake ${index + 1}`,
          pipelineStatus(item.status),
          linkedLabel(item.opportunity_id),
          businessLabel(item.requested_scope_summary, "범위 미지정")
        ])}
      />
    </div>
  );
}

export function ClientsSurface({ labels, liveCtx = "allow", activeSection = "" }) {
  const [clientsResult, setClientsResult] = useState(null);
  const [accountsResult, setAccountsResult] = useState(null);
  const [contactsResult, setContactsResult] = useState(null);
  const [accountContactsResult, setAccountContactsResult] = useState(null);
  const [leadsResult, setLeadsResult] = useState(null);
  const [opportunitiesResult, setOpportunitiesResult] = useState(null);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeAuditResult, setIntakeAuditResult] = useState(null);
  const [handoffResult, setHandoffResult] = useState(null);
  const [conflictResult, setConflictResult] = useState(null);
  const [clearanceResult, setClearanceResult] = useState(null);
  const [accountCreateResult, setAccountCreateResult] = useState(null);
  const [contactCreateResult, setContactCreateResult] = useState(null);
  const [accountPatchResult, setAccountPatchResult] = useState(null);
  const [contactPatchResult, setContactPatchResult] = useState(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const [clearancePending, setClearancePending] = useState(false);
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [contactCreatePending, setContactCreatePending] = useState(false);
  const [accountPatchPending, setAccountPatchPending] = useState(false);
  const [contactPatchPending, setContactPatchPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const currentSection = CLIENT_SECTIONS.has(activeSection) ? activeSection : "clients-list";

  useEffect(() => {
    let cancelled = false;
    setClientsResult(null);
    fetchMasterDataRecords({
      ctx: liveCtx,
      modelType: "ClientGroup",
      permissionRef: CLIENTS_PERMISSION_REF,
      auditHintRef: CLIENTS_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setClientsResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setLeadsResult(null);
    setOpportunitiesResult(null);
    setIntakeResult(null);
    setIntakeAuditResult(null);
    setAccountsResult(null);
    setContactsResult(null);
    setAccountContactsResult(null);
    setAccountCreateResult(null);
    setContactCreateResult(null);
    setAccountPatchResult(null);
    setContactPatchResult(null);
    Promise.all([
      fetchCrmLeads({ ctx: liveCtx }),
      fetchCrmOpportunities({ ctx: liveCtx }),
      fetchIntakeRequests({ ctx: liveCtx }),
      fetchIntakeAudit({ ctx: liveCtx }),
      fetchCrmAccounts({ ctx: liveCtx }),
      fetchCrmContacts({ ctx: liveCtx })
    ]).then(async ([leads, opportunities, intake, audit, accounts, contacts]) => {
      if (cancelled) return;
      setLeadsResult(leads);
      setOpportunitiesResult(opportunities);
      setIntakeResult(intake);
      setIntakeAuditResult(audit);
      setAccountsResult(accounts);
      setContactsResult(contacts);
      const firstAccountId = resultItems(accounts)[0]?.account_id;
      const accountContacts = await fetchCrmAccountContacts({ accountId: firstAccountId, ctx: liveCtx });
      if (!cancelled) setAccountContactsResult(accountContacts);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const clients = useMemo(() => resultItems(clientsResult), [clientsResult]);
  const selectedClient = clients[0] ?? null;
  const accountCount = resultItems(accountsResult).length;
  const contactCount = resultItems(contactsResult).length;
  const opportunities = resultItems(opportunitiesResult);
  const intakes = resultItems(intakeResult);
  const selectedOpportunity = opportunities[0] ?? null;
  const selectedIntake = intakes[0] ?? null;
  const leadCount = resultItems(leadsResult).length;
  const opportunityCount = opportunities.length;
  const intakeCount = intakes.length;

  async function handleOpportunityHandoff() {
    if (!selectedOpportunity?.opportunity_id) return;
    setHandoffPending(true);
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: selectedOpportunity.opportunity_id,
      requestedScopeSummary: businessLabel(selectedOpportunity.display_name, "Client intake request"),
      ctx: liveCtx
    });
    setHandoffResult(next);
    setHandoffPending(false);
    if (next.kind === "data") {
      setOpportunitiesResult((current) => upsertResultItem(current, next.opportunity, "opportunity_id"));
      setIntakeResult((current) => upsertResultItem(current, next.item, "intake_request_id"));
    }
  }

  async function handleConflictCheck() {
    if (!selectedIntake?.intake_request_id) return;
    setConflictPending(true);
    const next = await createIntakeConflictCheck({ intakeRequest: selectedIntake, ctx: liveCtx });
    setConflictResult(next);
    setConflictPending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleClearance() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    if (!selectedIntake?.intake_request_id || !conflictCheck?.snapshot_hash) return;
    setClearancePending(true);
    const next = await issueIntakeClearanceToken({ intakeRequest: selectedIntake, conflictCheck, ctx: liveCtx });
    setClearanceResult(next);
    setClearancePending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleCreateAccount() {
    setAccountCreatePending(true);
    const next = await createCrmAccount({ displayName: "신규 계정", ctx: liveCtx });
    setAccountCreateResult(next);
    setAccountCreatePending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.account_id !== next.item.account_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handleCreateContact() {
    const accountId = resultItems(accountsResult)[0]?.account_id ?? null;
    setContactCreatePending(true);
    const next = await createCrmContact({ displayName: "신규 연락처", accountId, ctx: liveCtx });
    setContactCreateResult(next);
    setContactCreatePending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
      if (next.item.account_id) {
        setAccountContactsResult((current) => {
          const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
          return {
            ...(current?.kind === "data" ? current : {}),
            kind: "data",
            outcome: current?.outcome ?? "passed",
            items: [
              {
                relationship_id: `crm_runtime_relationship:${next.item.account_id}:${next.item.contact_id}`,
                account_id: next.item.account_id,
                contact_id: next.item.contact_id,
                relationship_type: "crm_runtime_contact",
                status: next.item.status,
                contact_display_name: next.item.display_name,
                contact_point_value_included: false,
                production_ready_claim: false
              },
              ...currentItems
            ],
            safeErrorCodes: current?.safeErrorCodes ?? [],
            productionReadyClaim: false
          };
        });
      }
    }
  }

  async function handlePatchAccount() {
    const account = resultItems(accountsResult).find((item) => item.account_source === "crm-runtime.Account");
    if (!account?.account_id) return;
    setAccountPatchPending(true);
    const next = await patchCrmAccount({
      accountId: account.account_id,
      fieldUpdates: { status: "review_required" },
      ctx: liveCtx
    });
    setAccountPatchResult(next);
    setAccountPatchPending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.account_id !== next.item.account_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
    }
  }

  async function handlePatchContact() {
    const contact = resultItems(contactsResult).find((item) => item.contact_source === "crm-runtime.Contact");
    if (!contact?.contact_id) return;
    setContactPatchPending(true);
    const next = await patchCrmContact({
      contactId: contact.contact_id,
      fieldUpdates: { status: "review_required" },
      ctx: liveCtx
    });
    setContactPatchResult(next);
    setContactPatchPending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.contact_id !== next.item.contact_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: [next.item, ...currentItems],
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        };
      });
      if (next.item.account_id) {
        setAccountContactsResult((current) => ({
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          outcome: current?.outcome ?? "passed",
          items: resultItems(current).map((item) =>
            item.contact_id === next.item.contact_id
              ? { ...item, status: next.item.status, contact_display_name: next.item.display_name }
              : item,
          ),
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        }));
      }
    }
  }

  return (
    <section
      id="clients-home"
      className="surface stack clients-surface"
      data-cmp-g2-live-clients="true"
    >
      <PageHeader
        title={labels.clientsTitle}
        subtitle="Client, 리드, 기회, 접수를 한 화면에서 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="clients-runtime-grid record-workspace" data-salesforce-client-workspace="list-detail-right-panel">
        {currentSection === "clients-list" && (
          <Panel id="clients-list" className="record-list-panel" title="Client 목록" meta="권한 적용">
            <ClientsTable result={clientsResult} />
          </Panel>
        )}
        {currentSection === "client-leads" && (
          <Panel id="client-leads" className="record-list-panel" title="리드" meta="CRM">
            <LeadsTable result={leadsResult} />
          </Panel>
        )}
        {currentSection === "client-opportunities" && (
          <Panel id="client-opportunities" className="record-list-panel" title="기회" meta="CRM">
            <OpportunitiesTable
              result={opportunitiesResult}
              pending={handoffPending}
              handoffResult={handoffResult}
              onHandoff={handleOpportunityHandoff}
            />
          </Panel>
        )}
        {currentSection === "client-intake" && (
          <Panel id="client-intake" className="record-list-panel" title="접수" meta="Intake">
            <IntakeTable
              result={intakeResult}
              auditResult={intakeAuditResult}
              conflictResult={conflictResult}
              clearanceResult={clearanceResult}
              conflictPending={conflictPending}
              clearancePending={clearancePending}
              onConflictCheck={handleConflictCheck}
              onClearance={handleClearance}
            />
          </Panel>
        )}
        {currentSection === "client-accounts" && (
          <Panel id="client-accounts" className="record-list-panel" title="계정" meta="CRM">
            <AccountsTable
              result={accountsResult}
              relationshipResult={accountContactsResult}
              createResult={accountCreateResult}
              createPending={accountCreatePending}
              patchResult={accountPatchResult}
              patchPending={accountPatchPending}
              onCreateAccount={handleCreateAccount}
              onPatchAccount={handlePatchAccount}
            />
          </Panel>
        )}
        {currentSection === "client-contacts" && (
          <Panel id="client-contacts" className="record-list-panel" title="연락처" meta="CRM">
            <ContactsTable
              result={contactsResult}
              createResult={contactCreateResult}
              createPending={contactCreatePending}
              patchResult={contactPatchResult}
              patchPending={contactPatchPending}
              onCreateContact={handleCreateContact}
              onPatchContact={handlePatchContact}
            />
          </Panel>
        )}
        <ClientRecordPanel
          client={selectedClient}
          leadCount={leadCount}
          opportunityCount={opportunityCount}
          intakeCount={intakeCount}
          accountCount={accountCount}
          contactCount={contactCount}
        />
      </div>
    </section>
  );
}
