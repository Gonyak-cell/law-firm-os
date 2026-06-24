import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Link2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import {
  createCrmAccount,
  createCrmContact,
  createCrmMergeProposal,
  createIntakeConflictCheck,
  executeCrmMergeProposal,
  fetchCrmAccountContacts,
  fetchCrmAccounts,
  fetchCrmContacts,
  fetchCrmLeads,
  fetchCrmMergeProposals,
  fetchCrmOpportunities,
  fetchIntakeAudit,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  fetchRecordActionAudit,
  fetchRecordActionFields,
  handoffCrmOpportunityToIntake,
  issueIntakeClearanceToken,
  bulkUpdateRecordActions,
  patchCrmAccount,
  patchCrmContact,
  updateRecordActionField
} from "../data/apiClient.js";
import { DataTable, PageHeader, Panel, Property } from "./primitives.jsx";
import { ImportDataMappingPanel } from "./ImportDataMappingPanel.jsx";
import { DataCloudEnrichmentPanel } from "./DataCloudEnrichmentPanel.jsx";
import { ReportBuilderPanel } from "./ReportBuilderPanel.jsx";
import { fetchLegalPeopleSearch } from "../people/hrxApiClient.ts";

const CLIENTS_PERMISSION_REF = "ui_cmp_g2_party_clients_live";
const CLIENTS_AUDIT_HINT_REF = "ui_cmp_g2_clients_live_probe";
const CLIENT_SECTIONS = new Set([
  "clients-list",
  "client-leads",
  "client-opportunities",
  "client-intake",
  "client-accounts",
  "client-contacts",
  "client-data",
  "client-reports",
  "client-import"
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

function canonicalSyncLabel(value) {
  if (value === "synced" || value === "canonical_source") return "동기화됨";
  if (value === "facade_only") return "동기화 전";
  return "확인 필요";
}

function proposalStateLabel(value) {
  if (value === "executed") return "실행됨";
  if (value === "approved") return "승인됨";
  if (value === "owner_decision_required") return "승인 필요";
  return "검토 필요";
}

function recordFieldLabel(value) {
  const text = String(value ?? "").trim();
  if (text === "Client display name") return "Client 표시 이름";
  if (text === "Account status") return "계정 상태";
  if (text === "Contact status") return "연락처 상태";
  if (text === "Owner") return "담당자";
  if (text === "Status") return "상태";
  return text || "필드";
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

function legalPeopleItems(result) {
  return result?.kind === "data" && Array.isArray(result.people) ? result.people : [];
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

function ClientRecordPanel({ client, leadCount, opportunityCount, intakeCount, accountCount, contactCount, mergeProposalCount, executableMergeCount }) {
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
          <span>잠재 Client</span>
          <strong>{leadCount}</strong>
        </div>
        <div>
          <span>기회</span>
          <strong>{opportunityCount}</strong>
        </div>
        <div>
          <span>접수</span>
          <strong>{intakeCount}</strong>
        </div>
        <div>
          <span>계정</span>
          <strong>{accountCount}</strong>
        </div>
        <div>
          <span>연락처</span>
          <strong>{contactCount}</strong>
        </div>
      </div>
      <div className="record-boundary-note">
        <ShieldCheck size={15} />
        <span>권한 기준에 맞춰 표시됩니다.</span>
      </div>
      <div className="record-boundary-note" data-sf-b-w01r-right-panel-merge-review="true">
        <ShieldCheck size={15} />
        <span>병합 검토 {mergeProposalCount}건 / 실행 가능 {executableMergeCount}건</span>
      </div>
      <div className="record-boundary-note" data-sf-b-w07-right-panel-enrichment-summary="route-backed">
        <ShieldCheck size={15} />
        <span>데이터 보강 상태는 Client 데이터 관리에서 확인합니다.</span>
      </div>
      <div className="record-boundary-note" data-sf-b-w08-right-panel-report-summary="route-backed">
        <ShieldCheck size={15} />
        <span>보고서와 손익은 Client 보고서에서 확인합니다.</span>
      </div>
    </aside>
  );
}

function RecordActionSummary({ fieldsResult, auditResult, updateResult, ownerResult, pending, ownerPending, onFieldUpdate, onOwnerBlocked }) {
  const fields = fieldsResult?.kind === "data" && Array.isArray(fieldsResult.item?.fields) ? fieldsResult.item.fields : [];
  const audits = resultItems(auditResult);
  return (
    <div className="clients-live-stack" data-sf-b-w02-record-actions-panel="true">
      <div className="record-action-strip" data-sf-b-w02-field-registry="true">
        <div>
          <strong>레코드 작업</strong>
          <span>{fields.length > 0 ? fields.map((field) => recordFieldLabel(field.label)).join(" / ") : "허용 필드 확인 중"}</span>
          <ActionNotice
            pending={pending}
            result={updateResult}
            pendingText="필드를 업데이트 중입니다."
            successText="허용된 필드가 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={pending} onClick={onFieldUpdate}>
          <ShieldCheck size={15} />
          필드 업데이트
        </button>
      </div>
      {updateResult?.kind === "data" && updateResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-field-update-result="true">
          <ShieldCheck size={15} />
          <span>변경 필드 {updateResult.fieldPatch.changed_fields?.join(", ")}</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-owner-blocked-action="true">
        <div>
          <strong>담당자 일괄 변경</strong>
          <span>{ownerResult?.uiState === "owner_blocked" ? "승인 필요 상태" : "승인 조건 확인"}</span>
          <ActionNotice
            pending={ownerPending}
            result={ownerResult}
            pendingText="승인 조건을 확인 중입니다."
            successText="승인 필요 상태가 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={ownerPending} onClick={onOwnerBlocked}>
          <ShieldCheck size={15} />
          승인 확인
        </button>
      </div>
      {ownerResult?.uiState === "owner_blocked" && (
        <div className="record-boundary-note" data-sf-b-w02-owner-blocked-result="true">
          <ShieldCheck size={15} />
          <span>승인 후 처리할 수 있습니다.</span>
        </div>
      )}
      <div className="record-boundary-note" data-sf-b-w02-action-audit-feed="true">
        <ShieldCheck size={15} />
        <span>최근 작업 {audits.length}건</span>
      </div>
    </div>
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

function AccountsTable({
  result,
  relationshipResult,
  createResult,
  createPending,
  patchResult,
  patchPending,
  recordActionResult,
  recordActionPending,
  onCreateAccount,
  onPatchAccount,
  onRecordActionFieldUpdate
}) {
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
        <div className="record-boundary-note" data-crm-account-create-result="true" data-sf-b-w01r-account-canonical-sync="true">
          <ShieldCheck size={15} />
          <span>계정 생성과 기준 데이터 동기화가 기록되었습니다.</span>
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
      <div className="record-action-strip" data-sf-b-w02-account-record-action="true">
        <div>
          <strong>계정 필드 작업</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 계정") : "편집 가능한 계정 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="계정 필드를 업데이트 중입니다."
            successText="계정 필드 작업이 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableAccount || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <ShieldCheck size={15} />
          레코드 작업
        </button>
      </div>
      {recordActionResult?.kind === "data" && recordActionResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-account-record-action-result="true">
          <ShieldCheck size={15} />
          <span>계정 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["계정", "상태", "기준 데이터", "Client 그룹", "식별자"]}
        rows={accounts.map((item, index) => [
          businessLabel(item.display_name, `계정 ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
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

function ContactsTable({
  result,
  legalPeopleResult,
  mergeResult,
  createResult,
  createPending,
  patchResult,
  patchPending,
  recordActionResult,
  recordActionPending,
  mergeCreateResult,
  mergeExecuteResult,
  mergeCreatePending,
  mergeExecutePending,
  onCreateContact,
  onPatchContact,
  onRecordActionFieldUpdate,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const state = renderLiveState(result, "연락처");
  if (state) return state;
  const contacts = resultItems(result);
  const legalPeople = legalPeopleItems(legalPeopleResult);
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
        <div className="record-boundary-note" data-crm-contact-create-result="true" data-sf-b-w01r-contact-canonical-sync="true">
          <ShieldCheck size={15} />
          <span>연락처와 기준 데이터 담당자 정보가 등록되었습니다.</span>
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
      <div className="record-action-strip" data-sf-b-w02-contact-record-action="true">
        <div>
          <strong>연락처 필드 작업</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 연락처") : "편집 가능한 연락처 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="연락처 필드를 업데이트 중입니다."
            successText="연락처 필드 작업이 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!editableContact || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <ShieldCheck size={15} />
          레코드 작업
        </button>
      </div>
      {recordActionResult?.kind === "data" && recordActionResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-contact-record-action-result="true">
          <ShieldCheck size={15} />
          <span>연락처 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["연락처", "상태", "기준 데이터", "기본 연락처", "연락값"]}
        rows={contacts.map((item, index) => [
          businessLabel(item.display_name, `연락처 ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
          item.primary_contact_type ?? "미지정",
          item.contact_point_value_included === false || item.email_value_included === false ? "보호됨" : "검토 필요"
        ])}
      />
      <div className="record-action-strip legal-people-backlink-strip" data-lcx-ppl-client-backlink="true">
        <div>
          <strong>법률 People 연결</strong>
          <span>Client 연락처를 Client-Matter-People 런타임 People 레코드와 함께 확인합니다.</span>
          {legalPeopleResult === null && <em>법률 People 조회 중</em>}
          {legalPeopleResult?.kind === "error" && <em>법률 People 조회 실패</em>}
        </div>
        <div className="legal-people-backlink-list" aria-label="Client 연결 People">
          {legalPeople.slice(0, 4).map((person) => (
            <span key={person.person_id} className="legal-people-backlink-row">
              <Link2 size={13} />
              <strong>{businessLabel(person.display_name, "People")}</strong>
              <small>{person.korean_label ?? person.type_id}</small>
            </span>
          ))}
          {legalPeople.length === 0 && legalPeopleResult?.kind === "data" && (
            <span className="legal-people-backlink-row muted">
              <Link2 size={13} />
              <strong>연결 없음</strong>
              <small>로컬 fixture 기준</small>
            </span>
          )}
        </div>
      </div>
      <MergeReviewPanel
        result={mergeResult}
        createResult={mergeCreateResult}
        executeResult={mergeExecuteResult}
        createPending={mergeCreatePending}
        executePending={mergeExecutePending}
        onCreateMergeProposal={onCreateMergeProposal}
        onExecuteMergeProposal={onExecuteMergeProposal}
      />
    </div>
  );
}

function MergeReviewPanel({
  result,
  createResult,
  executeResult,
  createPending,
  executePending,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const proposals = resultItems(result);
  const executableProposal = proposals.find((proposal) => proposal.executable);
  const selectedProposal = executableProposal ?? proposals[0] ?? null;
  return (
    <div className="clients-live-stack" data-sf-b-w01r-merge-review="true">
      <div className="record-action-strip">
        <div>
          <strong>병합 검토</strong>
          <span>{selectedProposal ? proposalStateLabel(selectedProposal.proposal_state) : "검토 제안 없음"}</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="병합 검토를 생성 중입니다."
            successText="병합 검토가 생성되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateMergeProposal}>
          <Plus size={15} />
          검토 생성
        </button>
      </div>
      <div className="record-action-strip" data-sf-b-w01r-merge-execute-guarded="true">
        <div>
          <strong>병합 실행</strong>
          <span>{executableProposal ? "승인된 제안" : "담당자 승인 필요"}</span>
          <ActionNotice
            pending={executePending}
            result={executeResult}
            pendingText="병합 실행을 확인 중입니다."
            successText="병합 실행 상태가 기록되었습니다."
          />
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={!executableProposal || executePending}
          onClick={() => onExecuteMergeProposal(executableProposal)}
        >
          <ShieldCheck size={15} />
          병합 실행
        </button>
      </div>
      {result === null ? (
        <div className="live-data-state live-data-loading">병합 검토를 불러오는 중입니다.</div>
      ) : result?.kind === "error" ? (
        <div className="live-data-state live-data-error">병합 검토를 불러오지 못했습니다.</div>
      ) : proposals.length === 0 ? (
        <div className="live-data-state live-data-empty">검토 제안이 없습니다.</div>
      ) : (
        <DataTable
          columns={["제안", "상태", "후보", "승인", "실행"]}
          rows={proposals.map((proposal, index) => [
            `제안 ${index + 1}`,
            proposalStateLabel(proposal.proposal_state),
            `${proposal.candidate_count ?? 0}건`,
            proposal.approval_ref_present ? "있음" : "필요",
            proposal.executable ? "가능" : "보류"
          ])}
        />
      )}
    </div>
  );
}

function LeadsTable({ result }) {
  const state = renderLiveState(result, "잠재 Client");
  if (state) return state;
  return (
    <DataTable
      columns={["잠재 Client", "상태", "당사자", "담당"]}
      rows={resultItems(result).map((item, index) => [
        businessLabel(item.display_name, `잠재 Client ${index + 1}`),
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
          <strong>{refreshedOpportunity ? businessLabel(refreshedOpportunity.display_name, "기회 1") : "기회"}</strong>
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
          <strong>{intakeRequest ? "접수 1" : "접수"}</strong>
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
          <strong>{clearance?.valid ? "통과" : "통과 검토"}</strong>
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
  const state = renderLiveState(result, "기회");
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
        columns={["기회", "단계", "상태", "접수"]}
        rows={opportunities.map((item, index) => [
          businessLabel(item.display_name, `기회 ${index + 1}`),
          pipelineStatus(item.stage),
          pipelineStatus(item.status),
          linkedLabel(item.intake_request_id)
        ])}
      />
    </div>
  );
}

function IntakeTable({ result, auditResult, conflictResult, clearanceResult, conflictPending, clearancePending, onConflictCheck, onClearance }) {
  const state = renderLiveState(result, "접수");
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
        columns={["접수", "상태", "기회", "범위"]}
        rows={intakes.map((item, index) => [
          `접수 ${index + 1}`,
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
  const [mergeProposalsResult, setMergeProposalsResult] = useState(null);
  const [leadsResult, setLeadsResult] = useState(null);
  const [opportunitiesResult, setOpportunitiesResult] = useState(null);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeAuditResult, setIntakeAuditResult] = useState(null);
  const [handoffResult, setHandoffResult] = useState(null);
  const [conflictResult, setConflictResult] = useState(null);
  const [clearanceResult, setClearanceResult] = useState(null);
  const [accountCreateResult, setAccountCreateResult] = useState(null);
  const [contactCreateResult, setContactCreateResult] = useState(null);
  const [mergeCreateResult, setMergeCreateResult] = useState(null);
  const [mergeExecuteResult, setMergeExecuteResult] = useState(null);
  const [accountPatchResult, setAccountPatchResult] = useState(null);
  const [contactPatchResult, setContactPatchResult] = useState(null);
  const [clientRecordActionFieldsResult, setClientRecordActionFieldsResult] = useState(null);
  const [clientRecordActionAuditResult, setClientRecordActionAuditResult] = useState(null);
  const [clientRecordActionUpdateResult, setClientRecordActionUpdateResult] = useState(null);
  const [clientRecordActionOwnerResult, setClientRecordActionOwnerResult] = useState(null);
  const [accountRecordActionResult, setAccountRecordActionResult] = useState(null);
  const [contactRecordActionResult, setContactRecordActionResult] = useState(null);
  const [legalPeopleClientResult, setLegalPeopleClientResult] = useState(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const [clearancePending, setClearancePending] = useState(false);
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [contactCreatePending, setContactCreatePending] = useState(false);
  const [mergeCreatePending, setMergeCreatePending] = useState(false);
  const [mergeExecutePending, setMergeExecutePending] = useState(false);
  const [accountPatchPending, setAccountPatchPending] = useState(false);
  const [contactPatchPending, setContactPatchPending] = useState(false);
  const [clientRecordActionPending, setClientRecordActionPending] = useState(false);
  const [clientRecordActionOwnerPending, setClientRecordActionOwnerPending] = useState(false);
  const [accountRecordActionPending, setAccountRecordActionPending] = useState(false);
  const [contactRecordActionPending, setContactRecordActionPending] = useState(false);
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
    setLegalPeopleClientResult(null);
    fetchLegalPeopleSearch({ client_id: "client_lcx_001" }).then((next) => {
      if (!cancelled) setLegalPeopleClientResult(next);
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
    setMergeProposalsResult(null);
    setAccountCreateResult(null);
    setContactCreateResult(null);
    setMergeCreateResult(null);
    setMergeExecuteResult(null);
    setAccountPatchResult(null);
    setContactPatchResult(null);
    setAccountRecordActionResult(null);
    setContactRecordActionResult(null);
    Promise.all([
      fetchCrmLeads({ ctx: liveCtx }),
      fetchCrmOpportunities({ ctx: liveCtx }),
      fetchIntakeRequests({ ctx: liveCtx }),
      fetchIntakeAudit({ ctx: liveCtx }),
      fetchCrmAccounts({ ctx: liveCtx }),
      fetchCrmContacts({ ctx: liveCtx }),
      fetchCrmMergeProposals({ ctx: liveCtx })
    ]).then(async ([leads, opportunities, intake, audit, accounts, contacts, mergeProposals]) => {
      if (cancelled) return;
      setLeadsResult(leads);
      setOpportunitiesResult(opportunities);
      setIntakeResult(intake);
      setIntakeAuditResult(audit);
      setAccountsResult(accounts);
      setContactsResult(contacts);
      setMergeProposalsResult(mergeProposals);
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
  const selectedClientId = selectedClient?.client_group_id ?? null;
  const accountCount = resultItems(accountsResult).length;
  const contactCount = resultItems(contactsResult).length;
  const mergeProposals = resultItems(mergeProposalsResult);
  const mergeProposalCount = mergeProposals.length;
  const executableMergeCount = mergeProposals.filter((proposal) => proposal.executable).length;
  const opportunities = resultItems(opportunitiesResult);
  const intakes = resultItems(intakeResult);
  const selectedOpportunity = opportunities[0] ?? null;
  const selectedIntake = intakes[0] ?? null;
  const leadCount = resultItems(leadsResult).length;
  const opportunityCount = opportunities.length;
  const intakeCount = intakes.length;

  useEffect(() => {
    let cancelled = false;
    setClientRecordActionFieldsResult(null);
    setClientRecordActionAuditResult(null);
    Promise.all([
      fetchRecordActionFields({ objectName: "client", ctx: liveCtx }),
      selectedClientId ? fetchRecordActionAudit({ objectName: "client", recordId: selectedClientId, ctx: liveCtx }) : Promise.resolve({ kind: "data", items: [] })
    ]).then(([fields, audit]) => {
      if (cancelled) return;
      setClientRecordActionFieldsResult(fields);
      setClientRecordActionAuditResult(audit);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, selectedClientId]);

  async function handleOpportunityHandoff() {
    if (!selectedOpportunity?.opportunity_id) return;
    setHandoffPending(true);
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: selectedOpportunity.opportunity_id,
      requestedScopeSummary: businessLabel(selectedOpportunity.display_name, "Client 접수 요청"),
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

  async function handleCreateMergeProposal() {
    setMergeCreatePending(true);
    const next = await createCrmMergeProposal({ ctx: liveCtx });
    setMergeCreateResult(next);
    setMergeCreatePending(false);
    if (next.kind === "data" && next.item) {
      setMergeProposalsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.proposal_id !== next.item.proposal_id);
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

  async function handleExecuteMergeProposal(proposal) {
    if (!proposal?.proposal_id || !proposal.executable) return;
    setMergeExecutePending(true);
    const next = await executeCrmMergeProposal({ proposalId: proposal.proposal_id, ctx: liveCtx });
    setMergeExecuteResult(next);
    setMergeExecutePending(false);
    if (next.kind === "data" && next.item) {
      setMergeProposalsResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.proposal_id !== next.item.proposal_id);
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

  async function handleClientRecordActionFieldUpdate() {
    if (!selectedClientId) return;
    setClientRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "client",
      recordId: selectedClientId,
      fieldUpdates: { display_name: "Client 작업 검토" },
      ctx: liveCtx
    });
    setClientRecordActionUpdateResult(next);
    setClientRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setClientsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.client_group_id === selectedClientId
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
      const audit = await fetchRecordActionAudit({ objectName: "client", recordId: selectedClientId, ctx: liveCtx });
      setClientRecordActionAuditResult(audit);
    }
  }

  async function handleClientOwnerBlockedAction() {
    if (!selectedClientId) return;
    setClientRecordActionOwnerPending(true);
    const next = await bulkUpdateRecordActions({
      objectName: "client",
      recordIds: [selectedClientId],
      actionType: "owner_change",
      ctx: liveCtx
    });
    setClientRecordActionOwnerResult(next);
    setClientRecordActionOwnerPending(false);
  }

  async function handleAccountRecordActionFieldUpdate() {
    const account = resultItems(accountsResult).find((item) => item.account_source === "crm-runtime.Account");
    if (!account?.account_id) return;
    setAccountRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "account",
      recordId: account.account_id,
      fieldUpdates: { display_name: "계정 작업 검토" },
      ctx: liveCtx
    });
    setAccountRecordActionResult(next);
    setAccountRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setAccountsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.account_id === account.account_id
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
    }
  }

  async function handleContactRecordActionFieldUpdate() {
    const contact = resultItems(contactsResult).find((item) => item.contact_source === "crm-runtime.Contact");
    if (!contact?.contact_id) return;
    setContactRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "contact",
      recordId: contact.contact_id,
      fieldUpdates: { display_name: "연락처 작업 검토" },
      ctx: liveCtx
    });
    setContactRecordActionResult(next);
    setContactRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      setContactsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        outcome: current?.outcome ?? "passed",
        items: resultItems(current).map((item) =>
          item.contact_id === contact.contact_id
            ? { ...item, display_name: next.item.display_label ?? item.display_name, status: next.item.status ?? item.status }
            : item,
        ),
        safeErrorCodes: current?.safeErrorCodes ?? [],
        productionReadyClaim: false
      }));
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
        subtitle="Client, 잠재 Client, 기회, 접수를 한 화면에서 확인합니다."
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
          <Panel id="client-leads" className="record-list-panel" title="잠재 Client" meta="고객관리">
            <LeadsTable result={leadsResult} />
          </Panel>
        )}
        {currentSection === "client-opportunities" && (
          <Panel id="client-opportunities" className="record-list-panel" title="기회" meta="고객관리">
            <OpportunitiesTable
              result={opportunitiesResult}
              pending={handoffPending}
              handoffResult={handoffResult}
              onHandoff={handleOpportunityHandoff}
            />
          </Panel>
        )}
        {currentSection === "client-intake" && (
          <Panel id="client-intake" className="record-list-panel" title="접수" meta="상담 접수">
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
          <Panel id="client-accounts" className="record-list-panel" title="계정" meta="고객관리">
            <AccountsTable
              result={accountsResult}
              relationshipResult={accountContactsResult}
              createResult={accountCreateResult}
              createPending={accountCreatePending}
              patchResult={accountPatchResult}
              patchPending={accountPatchPending}
              recordActionResult={accountRecordActionResult}
              recordActionPending={accountRecordActionPending}
              onCreateAccount={handleCreateAccount}
              onPatchAccount={handlePatchAccount}
              onRecordActionFieldUpdate={handleAccountRecordActionFieldUpdate}
            />
          </Panel>
        )}
        {currentSection === "client-contacts" && (
          <Panel id="client-contacts" className="record-list-panel" title="연락처" meta="고객관리">
            <ContactsTable
              result={contactsResult}
              legalPeopleResult={legalPeopleClientResult}
              mergeResult={mergeProposalsResult}
              createResult={contactCreateResult}
              createPending={contactCreatePending}
              patchResult={contactPatchResult}
              patchPending={contactPatchPending}
              recordActionResult={contactRecordActionResult}
              recordActionPending={contactRecordActionPending}
              mergeCreateResult={mergeCreateResult}
              mergeExecuteResult={mergeExecuteResult}
              mergeCreatePending={mergeCreatePending}
              mergeExecutePending={mergeExecutePending}
              onCreateContact={handleCreateContact}
              onPatchContact={handlePatchContact}
              onRecordActionFieldUpdate={handleContactRecordActionFieldUpdate}
              onCreateMergeProposal={handleCreateMergeProposal}
              onExecuteMergeProposal={handleExecuteMergeProposal}
            />
          </Panel>
        )}
        {currentSection === "client-data" && (
          <DataCloudEnrichmentPanel ctx={liveCtx} />
        )}
        {currentSection === "client-reports" && (
          <ReportBuilderPanel ctx={liveCtx} selectedClient={selectedClient} />
        )}
        {currentSection === "client-import" && (
          <ImportDataMappingPanel ctx={liveCtx} surface="client" />
        )}
        <ClientRecordPanel
          client={selectedClient}
          leadCount={leadCount}
          opportunityCount={opportunityCount}
          intakeCount={intakeCount}
          accountCount={accountCount}
          contactCount={contactCount}
          mergeProposalCount={mergeProposalCount}
          executableMergeCount={executableMergeCount}
        />
        <RecordActionSummary
          fieldsResult={clientRecordActionFieldsResult}
          auditResult={clientRecordActionAuditResult}
          updateResult={clientRecordActionUpdateResult}
          ownerResult={clientRecordActionOwnerResult}
          pending={clientRecordActionPending}
          ownerPending={clientRecordActionOwnerPending}
          onFieldUpdate={handleClientRecordActionFieldUpdate}
          onOwnerBlocked={handleClientOwnerBlockedAction}
        />
      </div>
    </section>
  );
}
