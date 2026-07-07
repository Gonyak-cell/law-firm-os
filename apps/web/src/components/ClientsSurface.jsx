import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Link2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import {
  createCrmAccount,
  createCrmActivity,
  createCrmContact,
  createCrmMergeProposal,
  createCrmOpportunity,
  createCrmProposal,
  createIntakeConflictCheck,
  approveIntakeConflictWaiver,
  approveIntakeEngagement,
  executeCrmMergeProposal,
  fetchCrmActivities,
  fetchCrmAccountContacts,
  fetchCrmAccounts,
  fetchCrmClientSettings,
  fetchCrmContacts,
  fetchCrmLeads,
  fetchCrmMergeProposals,
  fetchCrmOpportunities,
  fetchCrmProposals,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchIntakeAudit,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  fetchMatterRecords,
  fetchRecordActionAudit,
  fetchRecordActionFields,
  handoffCrmOpportunityToIntake,
  issueIntakeClearanceToken,
  openMatterFromIntakeClearance,
  bulkUpdateRecordActions,
  patchCrmActivity,
  patchCrmAccount,
  patchCrmClientSetting,
  patchCrmContact,
  patchCrmProposal,
  recordIntakeConflictDecision,
  updateRecordActionField
} from "../data/apiClient.js";
import { ForestHero } from "./ForestHero.jsx";
import { DataTable, PageHeader, Panel, Property } from "./primitives.jsx";
import { ImportDataMappingPanel } from "./ImportDataMappingPanel.jsx";
import { DataCloudEnrichmentPanel } from "./DataCloudEnrichmentPanel.jsx";
import { ReportBuilderPanel } from "./ReportBuilderPanel.jsx";
import { fetchLegalPeopleSearch } from "../people/hrxApiClient.ts";
import { useSkin } from "../context/SkinContext.jsx";

const CLIENTS_PERMISSION_REF = "ui_cmp_g2_party_clients_live";
const CLIENTS_AUDIT_HINT_REF = "ui_cmp_g2_clients_live_probe";
const CLIENTS_MATTER_LINK_PERMISSION_REF = "ui_cmp_g2_client_matter_code_links";
const CLIENTS_MATTER_LINK_AUDIT_HINT_REF = "ui_cmp_g2_clients_matter_code_links_probe";
const CLIENT_SECTIONS = new Set([
  "clients-home",
  "clients-list",
  "client-leads",
  "client-opportunities",
  "client-intake",
  "client-accounts",
  "client-contacts",
  "client-activities",
  "client-contracts",
  "client-relationships",
  "client-conflict",
  "client-billing",
  "client-data",
  "client-reports",
  "client-import",
  "client-settings"
]);

function clientDisplayName(item, index) {
  return businessLabel(
    item.display_name ?? item.client_display_name ?? item.canonical_display_name ?? item.client_name ?? item.name,
    `Client ${index + 1}`
  );
}

function clientRecordId(item) {
  return item?.client_group_id ?? item?.client_id ?? item?.legal_client_party_id ?? item?.billing_client_party_id ?? null;
}

function clientMembers(item) {
  return Array.isArray(item.member_entity_ids) ? item.member_entity_ids.length : "없음";
}

function clientStatus(value) {
  if (value === "review_required") return "검토 필요";
  if (value === "inactive") return "비활성";
  return "사용 중";
}

function clientLegalForm(value) {
  return businessLabel(value, "해당 없음");
}

function pipelineStatus(value) {
  if (value === "qualified") return "상담 진행";
  if (value === "active") return "제안 준비";
  if (value === "open") return "신규 문의";
  if (value === "intake_requested") return "수임 검토";
  if (value === "review_required") return "계약 검토";
  if (value === "closed") return "실권·종료";
  return value ?? "진행 중";
}

function activityTypeLabel(value) {
  if (value === "call") return "통화";
  if (value === "email") return "이메일";
  if (value === "meeting") return "미팅";
  if (value === "task") return "할 일";
  return "메모";
}

function proposalStatusLabel(value) {
  if (value === "sent") return "발송됨";
  if (value === "accepted") return "수락됨";
  if (value === "declined") return "거절됨";
  if (value === "expired") return "만료";
  return "초안";
}

function approvalStateLabel(value) {
  if (value === "approved") return "승인됨";
  if (value === "blocked") return "차단";
  if (value === "draft") return "초안";
  return "검토 필요";
}

function conflictSeverityLabel(value) {
  if (value === "critical") return "긴급";
  if (value === "high") return "높음";
  if (value === "medium") return "중간";
  if (value === "low") return "낮음";
  return "확인 필요";
}

function conflictSourceLabel(value) {
  if (value === "former_matter") return "과거 Matter";
  if (value === "party_master") return "당사자 정본";
  if (value === "relationship_graph") return "관계 이력";
  if (value === "manual_entry") return "수기 입력";
  return "외부 출처";
}

function conflictReviewLabel({ decision, waiver, conflict, decisionReady }) {
  if (waiver?.status === "approved") return "동의서 승인";
  if (decisionReady) return "검토 통과";
  if (decision?.decision === "clear") return "검토 통과";
  if (decision?.decision === "block") return "수임 차단";
  if (decision?.decision === "waiver_required") return "동의서 필요";
  if (conflict) return "결정 필요";
  return "검색 전";
}

function conflictHitStatusLabel(value) {
  if (value === "cleared") return "해소";
  if (value === "waived") return "동의서";
  if (value === "blocked") return "차단";
  if (value === "review_required") return "미결";
  return value ? pipelineStatus(value) : "확인 필요";
}

function conflictHitStatusTone(value) {
  if (value === "cleared" || value === "waived") return "live";
  if (value === "blocked") return "error";
  if (value === "review_required") return "review";
  return "guarded";
}

function RecordStateBadge({ tone = "guarded", children }) {
  return <span className="record-state-badge" data-state={tone}>{children}</span>;
}

function policyDisplayName(value) {
  if (value === "Client classification policy") return "Client 분류 정책";
  return businessLabel(value, "Client 정책");
}

function policyFieldLabel(value) {
  if (value === "client_classification") return "Client 분류";
  return businessLabel(value, "정책 필드");
}

function policyValueLabel(value) {
  if (value === "individual") return "개인";
  if (value === "organization") return "법인";
  if (value === "key_client") return "주요 Client";
  return businessLabel(value, "값");
}

function amountLabel(value, currency = "KRW") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "확인 필요";
  return `${currency} ${amount.toLocaleString("ko-KR")}`;
}

function businessLabel(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  if (/synthetic|cmp_g|rp0|_[a-z0-9]/i.test(text)) return fallback;
  return text;
}

function contactValueLabel(item) {
  const text = String(item?.contact_point_value ?? item?.contactPointValue ?? item?.email ?? item?.phone ?? "").trim();
  return text || "보호됨";
}

function linkedLabel(value) {
  return value ? "연결됨" : "미연결";
}

function lookupKey(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleLowerCase("ko-KR") : "";
}

function uniqueLookupKeys(values) {
  return [...new Set(values.map(lookupKey).filter(Boolean))];
}

function clientLookupKeys(item) {
  return uniqueLookupKeys([
    item?.client_id,
    item?.client_group_id,
    item?.legal_client_party_id,
    item?.billing_client_party_id,
    item?.primary_party_id,
    item?.primary_entity_id,
    item?.client_display_name,
    item?.canonical_display_name,
    item?.display_name,
    item?.client_name,
    item?.name
  ]);
}

function matterClientLookupKeys(item) {
  return uniqueLookupKeys([
    item?.client_id,
    item?.legal_client_party_id,
    item?.billing_client_party_id,
    item?.client_display_name
  ]);
}

function matterLinkLabel(item) {
  return businessLabel(item?.matter_code ?? item?.matter_name ?? item?.title, "Matter");
}

function matterLinkFor(item) {
  return {
    matter_id: item?.matter_id ?? null,
    matter_code: item?.matter_code ?? null,
    label: matterLinkLabel(item),
    status: item?.status ?? null
  };
}

function mergeMatterLinks(...groups) {
  const byLabel = new Map();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const link of group) {
      const key = lookupKey(link?.matter_code ?? link?.matter_id ?? link?.label);
      if (key && !byLabel.has(key)) byLabel.set(key, link);
    }
  }
  return [...byLabel.values()];
}

function buildMatterLinksByClient(matters) {
  const linksByClient = new Map();
  for (const matter of matters) {
    const link = matterLinkFor(matter);
    for (const key of matterClientLookupKeys(matter)) {
      const existing = linksByClient.get(key) ?? [];
      linksByClient.set(key, mergeMatterLinks(existing, [link]));
    }
  }
  return linksByClient;
}

function derivedClientsFromMatters(matters) {
  const byClient = new Map();
  for (const matter of matters) {
    const keys = matterClientLookupKeys(matter);
    const key = keys[0];
    if (!key || byClient.has(key)) continue;
    byClient.set(key, {
      model_type: "MatterLinkedClient",
      client_id: matter.client_id ?? matter.legal_client_party_id ?? matter.billing_client_party_id ?? null,
      client_display_name: matter.client_display_name ?? matter.client_name ?? null,
      display_name: matter.client_display_name ?? matter.client_name ?? null,
      status: "active",
      matter_link_source: "matter_code_inventory"
    });
  }
  return [...byClient.values()];
}

function withMatterLinks(item, linksByClient) {
  const links = mergeMatterLinks(...clientLookupKeys(item).map((key) => linksByClient.get(key)));
  if (links.length === 0) return item;
  return {
    ...item,
    matter_code_links: links,
    matter_count: links.length,
    matter_core_enrichment: {
      ...(item.matter_core_enrichment ?? {}),
      matter_title: links[0].label,
      matter_code: links[0].matter_code,
      matter_count: links.length
    }
  };
}

function linkedMatterSummary(item) {
  const links = Array.isArray(item?.matter_code_links) ? item.matter_code_links : [];
  if (links.length > 0) {
    const labels = links.slice(0, 2).map((link) => businessLabel(link.label ?? link.matter_code, "Matter"));
    const suffix = links.length > 2 ? ` 외 ${links.length - 2}건` : "";
    return `${labels.join(", ")}${suffix}`;
  }
  return businessLabel(item?.matter_core_enrichment?.matter_title, "미지정");
}

function mergeClientMatterResults(clientGroupsResult, matterClientsResult, mattersResult) {
  const clientGroupItems = resultItems(clientGroupsResult).filter((item) => item.synthetic_only !== true);
  const matterItems = resultItems(mattersResult);
  const matterClientItems = resultItems(matterClientsResult).filter((item) => item.synthetic_only !== true);
  const linksByClient = buildMatterLinksByClient(matterItems);
  const byClient = new Map();

  for (const item of [...clientGroupItems, ...matterClientItems, ...derivedClientsFromMatters(matterItems)]) {
    const keys = clientLookupKeys(item);
    const key = keys.find((candidate) => byClient.has(candidate)) ?? keys[0];
    if (!key) continue;
    const existing = byClient.get(key);
    const next = existing
      ? { ...item, ...existing, ...Object.fromEntries(Object.entries(item).filter(([, value]) => value != null && value !== "")) }
      : item;
    const linked = withMatterLinks(next, linksByClient);
    byClient.set(key, linked);
    for (const alias of clientLookupKeys(linked)) byClient.set(alias, linked);
  }

  const items = [...new Set(byClient.values())];
  const baseResult = clientGroupsResult?.kind === "data" ? clientGroupsResult : matterClientsResult?.kind === "data" ? matterClientsResult : mattersResult;
  if (!items.length && clientGroupsResult?.kind !== "data" && matterClientsResult?.kind !== "data" && mattersResult?.kind !== "data") {
    return clientGroupsResult ?? matterClientsResult ?? mattersResult ?? { kind: "error" };
  }
  return {
    ...(baseResult?.kind === "data" ? baseResult : {}),
    kind: "data",
    outcome: baseResult?.outcome ?? "passed",
    uiState: items.length ? (baseResult?.uiState === "empty" ? "passed" : baseResult?.uiState ?? "passed") : "empty",
    items,
    safeErrorCodes: [
      ...(clientGroupsResult?.safeErrorCodes ?? []),
      ...(matterClientsResult?.safeErrorCodes ?? []),
      ...(mattersResult?.safeErrorCodes ?? [])
    ],
    productionReadyClaim: false
  };
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
  if (text === "Client name") return "Client 이름";
  if (text === "Client display name") return "Client 표시 이름";
  if (text === "Account status") return "Client 상태";
  if (text === "Contact status") return "담당자 상태";
  if (text === "Owner") return "담당자";
  if (text === "Status") return "상태";
  return text || "필드";
}

function actionMessage(result, successText) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "blocked" || result.uiState === "denied" || result.statusOutcome === "blocked" || result.outcome === "blocked") {
    return "처리가 막혔습니다.";
  }
  return successText;
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

async function fetchAllMasterDataRecords(params) {
  const collected = [];
  let cursor = null;
  let pageResult = null;
  for (let page = 0; page < 20; page += 1) {
    pageResult = await fetchMasterDataRecords({ ...params, cursor });
    if (pageResult.kind !== "data") return pageResult;
    collected.push(...resultItems(pageResult));
    cursor = pageResult.pageInfo?.next_cursor ?? null;
    if (!cursor) break;
  }
  return {
    ...pageResult,
    items: collected,
    pageInfo: {
      ...(pageResult?.pageInfo ?? {}),
      returned_count: collected.length,
      next_cursor: null
    }
  };
}

function guardedResultForContext(ctx) {
  if (ctx === "denied") {
    return {
      kind: "data",
      uiState: "denied",
      outcome: "denied",
      items: [],
      safeErrorCodes: ["UI_CONTEXT_DENIED"],
      productionReadyClaim: false
    };
  }
  if (ctx === "review") {
    return {
      kind: "data",
      uiState: "review_required",
      outcome: "review_required",
      items: [],
      safeErrorCodes: ["UI_CONTEXT_REVIEW_REQUIRED"],
      productionReadyClaim: false
    };
  }
  return null;
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
        <strong>{noun} 목록을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-unavailable live-data-error">
        <strong>{noun} 목록을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  if (result.uiState === "denied") {
    return (
      <div className="live-data-state live-data-denied">
        <strong>접근 권한이 없습니다</strong>
        권한이 있는 {noun}만 표시합니다.
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

function ClientsOverviewPanel({ customerCount, leadCount, opportunityCount, intakeCount, accountCount, contactCount }) {
  return (
    <div className="clients-live-stack" data-client-overview-panel="true">
      <div className="record-action-strip">
        <div>
          <strong>Client 운영 현황</strong>
          <span>개인·법인 Client, 담당자, Opportunity, 상담·문의를 한 화면에서 확인합니다.</span>
        </div>
      </div>
      <DataTable
        columns={["구분", "건수", "확인할 메뉴", "상태"]}
        rows={[
          ["Client", String(customerCount), "Client 목록", "권한 기준 적용"],
          ["잠재 Client", String(leadCount), "상담·문의", "수임 전"],
          ["Opportunity", String(opportunityCount), "Opportunity", "수임 전 기회"],
          ["상담·문의", String(intakeCount), "상담·문의", "검토 흐름"],
          ["법인·개인 Client", String(accountCount), "법인·개인 Client", "CRM 연결"],
          ["담당자", String(contactCount), "담당자", "Client 연락 창구"]
        ]}
      />
    </div>
  );
}

function ClientActivitiesPanel({ result, createResult, patchResult, createPending, patchPending, onCreate, onPatch }) {
  const state = renderLiveState(result, "접촉 이력");
  if (state) return state;
  const activities = resultItems(result);
  const editableActivity = activities[0] ?? null;
  return (
    <div className="clients-live-stack" data-client-activities-connected="true">
      <div className="record-action-strip" data-client-activity-create-action="true">
        <div>
          <strong>접촉 이력 추가</strong>
          <span>Client와 Opportunity 기준으로 후속 조치를 남깁니다.</span>
          <ActionNotice pending={createPending} result={createResult} pendingText="이력을 추가 중입니다." successText="접촉 이력이 추가되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreate}>
          <Plus size={15} />
          추가
        </button>
      </div>
      <div className="record-action-strip" data-client-activity-patch-action="true">
        <div>
          <strong>이력 검토 표시</strong>
          <span>{editableActivity ? businessLabel(editableActivity.subject, "접촉 이력") : "검토할 이력 없음"}</span>
          <ActionNotice pending={patchPending} result={patchResult} pendingText="상태를 업데이트 중입니다." successText="접촉 이력 상태가 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!editableActivity || patchPending} onClick={() => onPatch(editableActivity)}>
          <ShieldCheck size={15} />
          검토 표시
        </button>
      </div>
      <DataTable
        columns={["접촉", "유형", "상태", "보호"]}
        rows={activities.map((item, index) => [
          businessLabel(item.subject, `접촉 이력 ${index + 1}`),
          activityTypeLabel(item.activity_type),
          clientStatus(item.status),
          item.confidential ? "보호됨" : "표시 가능"
        ])}
      />
    </div>
  );
}

function ClientContractsPanel({ result, createResult, patchResult, createPending, patchPending, onCreate, onProviderCheck }) {
  const state =
    result === null ||
    result?.kind === "error" ||
    result?.uiState === "denied" ||
    result?.uiState === "review_required" ||
    result?.outcome === "review_required"
      ? renderLiveState(result, "제안·계약")
      : null;
  if (state) return state;
  const proposals = resultItems(result);
  const selectedProposal = proposals[0] ?? null;
  return (
    <div className="clients-live-stack" data-client-contracts-connected="true">
      <div className="record-action-strip" data-client-contract-create-action="true">
        <div>
          <strong>계약 초안 생성</strong>
          <span>Opportunity와 Vault 문서 참조를 묶어 제안 초안을 만듭니다.</span>
          <ActionNotice pending={createPending} result={createResult} pendingText="초안을 생성 중입니다." successText="계약 초안이 생성되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreate}>
          <Plus size={15} />
          초안 생성
        </button>
      </div>
      <div className="record-action-strip" data-client-contract-esign-provider-blocked="true">
        <div>
          <strong>전자서명 발송</strong>
          <span>{patchResult?.uiState === "provider_blocked" ? "제공자 receipt 필요" : "제공자 연결 확인"}</span>
          <ActionNotice pending={patchPending} result={patchResult} pendingText="제공자 상태를 확인 중입니다." successText="전자서명 제공자 상태가 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!selectedProposal || patchPending} onClick={() => onProviderCheck(selectedProposal)}>
          <ShieldCheck size={15} />
          발송 확인
        </button>
      </div>
      <DataTable
        columns={["제안·계약", "상태", "승인", "Vault", "전자서명"]}
        rows={proposals.map((item, index) => [
          businessLabel(item.display_name, `제안·계약 ${index + 1}`),
          proposalStatusLabel(item.proposal_status),
          approvalStateLabel(item.approval_state),
          item.vault_document_ref_present ? "문서 참조 있음" : "문서 참조 필요",
          item.e_sign_send_enabled ? "발송 가능" : "제공자 차단"
        ])}
      />
    </div>
  );
}

function ClientRelationshipsPanel({
  relationshipResult,
  mergeResult,
  mergeCreateResult,
  mergeExecuteResult,
  mergeCreatePending,
  mergeExecutePending,
  onCreateMergeProposal,
  onExecuteMergeProposal
}) {
  const relationshipState = renderLiveState(relationshipResult, "Client 관계");
  return (
    <div className="clients-live-stack" data-client-relationships-connected="true">
      <div className="record-action-strip" data-client-relationship-list="true">
        <div>
          <strong>관계 목록</strong>
          <span>법인·개인 Client와 담당자 관계를 기준 데이터와 함께 표시합니다.</span>
        </div>
      </div>
      {relationshipState ?? (
        <DataTable
          columns={["관계", "담당자", "상태", "연락값"]}
          rows={resultItems(relationshipResult).map((item, index) => [
            item.relationship_type ?? `관계 ${index + 1}`,
            businessLabel(item.contact_display_name, `담당자 ${index + 1}`),
            clientStatus(item.status),
            item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
          ])}
        />
      )}
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

function ClientConflictPanel({
  result,
  auditResult,
  activeIntake,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const state = renderLiveState(result, "이해상충 확인");
  if (state) return state;
  const intakes = resultItems(result);
  const selectedIntake = activeIntake ?? intakes[0] ?? null;
  const auditCount = resultItems(auditResult).length;
  return (
    <div className="clients-live-stack" data-client-conflict-connected="true">
      <IntakeActionPanel
        intakeRequest={selectedIntake}
        auditCount={auditCount}
        conflictResult={conflictResult}
        decisionResult={decisionResult}
        waiverResult={waiverResult}
        engagementResult={engagementResult}
        clearanceResult={clearanceResult}
        matterOpeningResult={matterOpeningResult}
        conflictPending={conflictPending}
        decisionPending={decisionPending}
        waiverPending={waiverPending}
        engagementPending={engagementPending}
        clearancePending={clearancePending}
        matterOpeningPending={matterOpeningPending}
        onConflictCheck={onConflictCheck}
        onConflictDecision={onConflictDecision}
        onWaiverApprove={onWaiverApprove}
        onEngagementApprove={onEngagementApprove}
        onClearance={onClearance}
        onMatterOpening={onMatterOpening}
      />
      <DataTable
        columns={["확인 대상", "상태", "스냅샷", "감사"]}
        rows={intakes.map((item, index) => [
          `상담·문의 ${index + 1}`,
          pipelineStatus(item.status),
          conflictResult?.kind === "data" ? "기록됨" : "대기",
          `${auditCount}건`
        ])}
      />
    </div>
  );
}

function ClientChargePanel({ invoicesResult, arAgingResult }) {
  const invoiceState = renderLiveState(invoicesResult, "청구 내역");
  const arState = renderLiveState(arAgingResult, "미수금");
  return (
    <div className="clients-live-stack" data-client-billing-connected="true">
      <div className="record-action-strip" data-client-billing-provider-blocked="true">
        <div>
          <strong>결제·송장 발송</strong>
          <span>외부 결제와 송장 발송은 제공자 receipt 확인 전까지 차단됩니다.</span>
        </div>
        <button className="secondary-button" type="button" disabled>
          <ShieldCheck size={15} />
          제공자 차단
        </button>
      </div>
      {invoiceState ?? (
        <DataTable
          columns={["송장", "상태", "청구액", "수납"]}
          rows={resultItems(invoicesResult).map((item, index) => [
            item.invoice_id ? `송장 ${index + 1}` : "송장",
            item.status ?? "확인 필요",
            amountLabel(item.amount_due, item.currency),
            amountLabel(item.amount_paid, item.currency)
          ])}
        />
      )}
      {arState ?? (
        <DataTable
          columns={["미수금", "상태", "잔액", "Client"]}
          rows={resultItems(arAgingResult).map((item, index) => [
            item.invoice_id ? `미수 ${index + 1}` : "미수",
            item.status ?? "확인 필요",
            amountLabel(item.balance, "KRW"),
            linkedLabel(item.billing_client_party_id)
          ])}
        />
      )}
    </div>
  );
}

function ClientSettingsPanel({ result, patchResult, patchPending, onPatch }) {
  const state = renderLiveState(result, "Client 설정");
  if (state) return state;
  const policies = resultItems(result);
  const selectedPolicy = policies[0] ?? null;
  return (
    <div className="clients-live-stack" data-client-settings-connected="true">
      <div className="record-action-strip" data-client-settings-policy-patch-action="true">
        <div>
          <strong>정책 레지스트리</strong>
          <span>{selectedPolicy ? policyDisplayName(selectedPolicy.display_name) : "정책 없음"}</span>
          <ActionNotice pending={patchPending} result={patchResult} pendingText="정책을 업데이트 중입니다." successText="정책 변경이 감사 기록에 남았습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!selectedPolicy || patchPending} onClick={() => onPatch(selectedPolicy)}>
          <ShieldCheck size={15} />
          정책 확인
        </button>
      </div>
      <DataTable
        columns={["정책", "필드", "값", "쓰기 조건"]}
        rows={policies.map((item, index) => [
          policyDisplayName(item.display_name) || `정책 ${index + 1}`,
          policyFieldLabel(item.field_name),
          Array.isArray(item.allowed_values) ? item.allowed_values.map(policyValueLabel).join(" / ") : "확인 필요",
          item.policy_write_permissioned ? "권한 필요" : "읽기 전용"
        ])}
      />
    </div>
  );
}

function ClientRecordPanel({ client, leadCount, opportunityCount, intakeCount, accountCount, contactCount, mergeProposalCount, executableMergeCount }) {
  return (
    <aside className="record-side-panel" data-client-record-workspace="right-panel">
      <div className="record-side-header">
        <span className="eyebrow">Client 정보</span>
        <strong>{client ? clientDisplayName(client, 0) : "Client"}</strong>
      </div>
      <div className="property-grid tight">
        <Property label="상태" value={client ? clientStatus(client.status) : "대기"} />
        <Property label="법인 형태" value={client ? clientLegalForm(client.legal_form) : "해당 없음"} />
        <Property label="대표 당사자" value={client?.primary_entity_id ?? client?.primary_party_id ?? "미지정"} />
        <Property label="구성원" value={client ? String(clientMembers(client)) : "0"} />
        <Property label="연결 Matter" value={linkedMatterSummary(client)} />
      </div>
      <div className="record-meter-grid">
        <div>
          <span>잠재 Client</span>
          <strong>{leadCount}</strong>
        </div>
        <div>
          <span>Opportunity</span>
          <strong>{opportunityCount}</strong>
        </div>
        <div>
          <span>상담·문의</span>
          <strong>{intakeCount}</strong>
        </div>
        <div>
          <span>Client</span>
          <strong>{accountCount}</strong>
        </div>
        <div>
          <span>담당자</span>
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
        <span>데이터 보강 상태는 Client 데이터에서 확인합니다.</span>
      </div>
      <div className="record-boundary-note" data-sf-b-w08-right-panel-report-summary="route-backed">
        <ShieldCheck size={15} />
        <span>보고서와 손익은 Client 리포트에서 확인합니다.</span>
      </div>
    </aside>
  );
}

function RecordActionSummary({
  fieldsResult,
  auditResult,
  updateResult,
  ownerResult,
  pending,
  ownerPending,
  editValue,
  onEditValueChange,
  onFieldUpdate,
  onOwnerBlocked
}) {
  const fields = fieldsResult?.kind === "data" && Array.isArray(fieldsResult.item?.fields) ? fieldsResult.item.fields : [];
  const audits = resultItems(auditResult);
  return (
    <div className="clients-live-stack" data-sf-b-w02-record-actions-panel="true">
      <div className="record-action-strip record-action-edit-strip" data-sf-b-w02-field-registry="true">
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
        <form className="record-action-edit-form" onSubmit={onFieldUpdate}>
          <label>
            <span>Client 이름</span>
            <input value={editValue} onChange={(event) => onEditValueChange(event.target.value)} />
          </label>
          <button className="secondary-button" type="submit" disabled={pending || !editValue.trim()}>
            <ShieldCheck size={15} />
            저장
          </button>
        </form>
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
          linkedMatterSummary(item)
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
  const state = renderLiveState(result, "법인·개인 Client");
  if (state) return state;
  const accounts = resultItems(result);
  const editableAccount = accounts.find((item) => item.account_source === "crm-runtime.Account");
  const relationshipState = renderLiveState(relationshipResult, "관련 담당자");
  return (
    <div className="clients-live-stack" data-crm-accounts-read="true">
      <div className="record-action-strip" data-crm-account-create-action="true">
        <div>
          <strong>Client 정보 생성</strong>
          <span>새 법인·개인 Client 정보를 추가합니다.</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="Client 정보를 생성 중입니다."
            successText="Client 정보가 생성되었습니다."
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
          <span>Client 정보 생성과 기준 데이터 동기화가 기록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-account-patch-action="true">
        <div>
          <strong>Client 검토 표시</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 Client") : "편집 가능한 Client 정보 없음"}</span>
          <ActionNotice
            pending={patchPending}
            result={patchResult}
            pendingText="Client 정보를 업데이트 중입니다."
            successText="Client 정보가 업데이트되었습니다."
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
          <span>Client 상태가 반영되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-account-record-action="true">
        <div>
          <strong>Client 필드 작업</strong>
          <span>{editableAccount ? businessLabel(editableAccount.display_name, "생성된 Client") : "편집 가능한 Client 정보 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="Client 필드를 업데이트 중입니다."
            successText="Client 필드 작업이 기록되었습니다."
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
          <span>Client 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["Client", "상태", "기준 데이터", "Client 그룹", "식별자"]}
        rows={accounts.map((item, index) => [
          businessLabel(item.display_name, `Client ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
          linkedLabel(item.client_group_id),
          item.registration_number_included === false ? "보호됨" : "검토 필요"
        ])}
      />
      <div className="record-action-strip" data-crm-account-contacts-read="true">
        <div>
          <strong>관련 담당자</strong>
          <span>권한이 허용한 관계만 표시됩니다.</span>
        </div>
      </div>
      {relationshipState ?? (
        <DataTable
          columns={["담당자", "관계", "상태", "연락값"]}
          rows={resultItems(relationshipResult).map((item, index) => [
            businessLabel(item.contact_display_name, `담당자 ${index + 1}`),
            item.relationship_type ?? "관계",
            clientStatus(item.status),
            item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
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
  const state = renderLiveState(result, "담당자");
  if (state) return state;
  const contacts = resultItems(result);
  const legalPeople = legalPeopleItems(legalPeopleResult);
  const editableContact = contacts.find((item) => item.contact_source === "crm-runtime.Contact");
  return (
    <div className="clients-live-stack" data-crm-contacts-read="true">
      <div className="record-action-strip" data-crm-contact-create-action="true" data-upl-c07-contact-raw-value-flow="true">
        <div>
          <strong>담당자 생성</strong>
          <span>새 담당자를 Client 정보에 추가합니다.</span>
          <ActionNotice
            result={createResult}
            pending={createPending}
            pendingText="담당자를 생성 중입니다."
            successText="담당자가 생성되었습니다."
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
          <span>담당자와 기준 데이터 담당자 정보가 등록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-crm-contact-patch-action="true">
        <div>
          <strong>담당자 검토 표시</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 담당자") : "편집 가능한 담당자 없음"}</span>
          <ActionNotice
            result={patchResult}
            pending={patchPending}
            pendingText="담당자를 업데이트 중입니다."
            successText="담당자가 업데이트되었습니다."
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
          <span>담당자 상태가 반영되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-contact-record-action="true">
        <div>
          <strong>담당자 필드 작업</strong>
          <span>{editableContact ? businessLabel(editableContact.display_name, "생성된 담당자") : "편집 가능한 담당자 없음"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionResult}
            pendingText="담당자 필드를 업데이트 중입니다."
            successText="담당자 필드 작업이 기록되었습니다."
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
          <span>담당자 필드 작업이 완료되었습니다.</span>
        </div>
      )}
      <DataTable
        columns={["담당자", "상태", "기준 데이터", "기본 연락 수단", "연락값"]}
        rows={contacts.map((item, index) => [
          businessLabel(item.display_name, `담당자 ${index + 1}`),
          clientStatus(item.status),
          canonicalSyncLabel(item.canonical_sync_state),
          item.primary_contact_type ?? "미지정",
          item.contact_point_value_included === true ? contactValueLabel(item) : "보호됨"
        ])}
      />
      <div className="record-action-strip legal-people-backlink-strip" data-lcx-ppl-client-backlink="true">
        <div>
          <strong>관련 인물 연결</strong>
          <span>Client 담당자와 연결된 인물 기록을 함께 확인합니다.</span>
          {legalPeopleResult === null && <em>인물 기록 조회 중</em>}
          {legalPeopleResult?.kind === "error" && <em>인물 기록 조회 실패</em>}
        </div>
        <div className="legal-people-backlink-list" aria-label="Client 연결 인물">
          {legalPeople.slice(0, 4).map((person) => (
            <span key={person.person_id} className="legal-people-backlink-row">
              <Link2 size={13} />
              <strong>{businessLabel(person.display_name, "인물")}</strong>
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
          <strong>{refreshedOpportunity ? businessLabel(refreshedOpportunity.display_name, "Opportunity 1") : "Opportunity"}</strong>
        <span>{linked ? "상담·문의 연결됨" : "상담·문의 전환 대기"}</span>
        <ActionNotice
          pending={pending}
          result={result}
          pendingText="상담·문의로 전환 중입니다."
          successText="상담·문의로 전환되었습니다."
        />
      </div>
      <button className="secondary-button" type="button" disabled={!opportunity || linked || pending} onClick={onHandoff}>
        <ArrowRight size={15} />
        상담·문의 전환
      </button>
    </div>
  );
}

function IntakeActionPanel({
  intakeRequest,
  auditCount,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const conflict = conflictResult?.kind === "data" ? conflictResult.item : null;
  const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
  const decision = decisionResult?.kind === "data" ? decisionResult.conflictDecision ?? decisionResult.item : null;
  const waiver = waiverResult?.kind === "data" ? waiverResult.waiver ?? waiverResult.item : null;
  const engagement = engagementResult?.kind === "data" ? engagementResult.engagement ?? engagementResult.item : null;
  const templateReady = Boolean(
    engagementResult?.templateDocumentId ||
    engagementResult?.templateDocument?.template_document_id ||
    engagement?.template_document_id ||
    engagement?.template_document_generated === true
  );
  const signedReady = Boolean(
    engagementResult?.signedDocumentUploadId ||
    engagementResult?.signedDocumentUpload?.signed_document_upload_id ||
    engagement?.signed_document_upload_id ||
    engagementResult?.signedUploadVerified === true ||
    engagement?.signed_upload_verified === true
  );
  const decisionReady =
    decisionResult?.clearanceLinkReady === true ||
    (decisionResult?.kind === "data" && decisionResult.uiState !== "blocked" && decision?.decision !== "block");
  const reviewReady = decisionReady || waiverResult?.clearanceLinkReady === true || decision?.decision === "clear" || waiver?.status === "approved";
  const engagementReady = engagementResult?.engagementReady === true || (engagement?.status === "approved" && templateReady && signedReady);
  const clearance = clearanceResult?.kind === "data" ? clearanceResult.validation : null;
  const openedMatter = matterOpeningResult?.kind === "data" ? matterOpeningResult.item : null;
  const hitRows = conflictHits.map((hit, index) => [
    businessLabel(hit.matched_display_name, `Hit ${index + 1}`),
    hit.hit_source ? conflictSourceLabel(hit.hit_source) : "출처 확인",
    hit.severity ? conflictSeverityLabel(hit.severity) : "해당 없음",
    <RecordStateBadge tone={conflictHitStatusTone(hit.status)}>{conflictHitStatusLabel(hit.status)}</RecordStateBadge>
  ]);
  const gateTone = clearance?.valid || (reviewReady && engagementReady) ? "live" : reviewReady ? "review" : "guarded";
  const gateLabel = clearance?.valid ? "클리어런스 완료" : reviewReady && engagementReady ? "클리어런스 가능" : reviewReady ? "수임 승인 필요" : "충돌 결정 필요";
  return (
    <div
      className="record-action-grid"
      data-intake-clearance-action="true"
      data-intake-conflict-review-flow="true"
      data-intake-engagement-approval-flow="true"
      data-intake-matter-opening-flow="true"
    >
      <div className="record-action-strip">
        <div>
          <strong>{intakeRequest ? "상담·문의 1" : "상담·문의"}</strong>
          <span>{conflictResult?.hitCount !== null && conflictResult?.hitCount !== undefined ? `Hit ${conflictResult.hitCount}건` : auditCount > 0 ? "감사 기록 있음" : "검토 대기"}</span>
          <ActionNotice
            pending={conflictPending}
            result={conflictResult}
            pendingText="이해상충 검토 중입니다."
            successText="이해상충 검색 결과가 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!intakeRequest || conflictPending} onClick={onConflictCheck}>
          이해상충 검토
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{conflictReviewLabel({ decision, waiver, conflict, decisionReady })}</strong>
          <span>{conflictHits.length > 0 ? `${conflictHits.length}건 결정 상태 확인` : conflict ? "히트 없음" : "검색 결과 필요"}</span>
          <ActionNotice
            pending={decisionPending}
            result={decisionResult}
            pendingText="검토 결정을 기록 중입니다."
            successText="검토 결정이 기록되었습니다."
          />
          <ActionNotice
            pending={waiverPending}
            result={waiverResult}
            pendingText="동의서를 승인 중입니다."
            successText="동의서 승인 기록이 남았습니다."
          />
        </div>
        <div className="record-action-button-group">
          <button className="secondary-button" type="button" disabled={!conflict || decisionPending} onClick={onConflictDecision}>
            검토 결정
          </button>
          <button className="secondary-button" type="button" disabled={!conflict || waiverPending} onClick={onWaiverApprove}>
            동의서 승인
          </button>
        </div>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{gateLabel}</strong>
          <span>{reviewReady && engagementReady ? "결정·수임 원장 확인됨" : reviewReady ? "수임 승인 전 잠금" : "충돌 결정 필요"}</span>
          <div className="record-approval-state" data-intake-engagement-approval-state="true">
            <RecordStateBadge tone={templateReady ? "live" : "guarded"}>{templateReady ? "템플릿 생성" : "템플릿 대기"}</RecordStateBadge>
            <RecordStateBadge tone={signedReady ? "live" : "guarded"}>{signedReady ? "서명 문서 연결" : "서명 문서 대기"}</RecordStateBadge>
            <RecordStateBadge tone={gateTone}>{gateLabel}</RecordStateBadge>
          </div>
          <ActionNotice
            pending={engagementPending}
            result={engagementResult}
            pendingText="수임 승인 기록 중입니다."
            successText="수임 승인 완료."
          />
          <ActionNotice
            pending={clearancePending}
            result={clearanceResult}
            pendingText="통과 처리 중입니다."
            successText="통과 처리되었습니다."
          />
        </div>
        <div className="record-action-button-group">
          <button className="secondary-button" type="button" disabled={!intakeRequest || !reviewReady || engagementPending} onClick={onEngagementApprove}>
            수임 승인
          </button>
          <button className="secondary-button" type="button" disabled={!intakeRequest || !conflict || !reviewReady || !engagementReady || clearancePending} onClick={onClearance}>
            통과 처리
          </button>
        </div>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{openedMatter ? "Matter 개설됨" : "Matter 개설"}</strong>
          <span>{openedMatter ? "Matter 목록에 반영됨" : clearance?.valid ? "통과 기록으로 개설 가능" : "통과 처리 필요"}</span>
          <ActionNotice
            pending={matterOpeningPending}
            result={matterOpeningResult}
            pendingText="Matter 개설 중입니다."
            successText="Matter가 개설되었습니다."
          />
        </div>
        <button className="primary-button" type="button" disabled={!clearance?.valid || matterOpeningPending || Boolean(openedMatter)} onClick={onMatterOpening}>
          <Plus size={15} />
          Matter 개설
        </button>
      </div>
      <div className="record-action-table" data-intake-conflict-hit-list="true">
        <DataTable
          columns={["Hit", "출처", "심각도", "상태"]}
          rows={hitRows}
        />
        {hitRows.length === 0 && (
          <div className="live-data-state live-data-empty">
            {conflict ? "기록된 충돌 히트가 없습니다." : "이해상충 검토 후 결과가 표시됩니다."}
          </div>
        )}
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
            Opportunity 상태가 {pipelineStatus(handoffResult.opportunity.stage)} 단계로 갱신되고 상담·문의 레코드와 연결되었습니다.
          </span>
        </div>
      )}
      <DataTable
        columns={["Opportunity", "단계", "상태", "상담·문의"]}
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

export function ClientIntakePipelineSurface({
  result,
  auditResult,
  activeIntake,
  createResult,
  conflictResult,
  decisionResult,
  waiverResult,
  engagementResult,
  clearanceResult,
  matterOpeningResult,
  conflictPending,
  createPending,
  decisionPending,
  waiverPending,
  engagementPending,
  clearancePending,
  matterOpeningPending,
  onCreateIntake,
  onConflictCheck,
  onConflictDecision,
  onWaiverApprove,
  onEngagementApprove,
  onClearance,
  onMatterOpening
}) {
  const state =
    result === null ||
    result?.kind === "error" ||
    result?.uiState === "denied" ||
    result?.uiState === "review_required" ||
    result?.outcome === "review_required"
      ? renderLiveState(result, "인테이크")
      : null;
  if (state) return state;
  const intakes = resultItems(result);
  const selectedIntake = activeIntake ?? intakes[0] ?? null;
  const intakeRows = selectedIntake
    ? [selectedIntake, ...intakes.filter((item) => item.intake_request_id !== selectedIntake.intake_request_id)]
    : intakes;
  const auditCount = resultItems(auditResult).length;
  return (
    <div className="clients-live-stack intake-completion-surface" data-upl-c08-intake-completion-surface="true">
      <div
        className="record-action-strip"
        data-upl-c08-new-inquiry-intake="true"
        data-upl-c08-intake-pipeline="consultation-conflict-opening"
      >
        <div>
          <strong>신규 의뢰 접수</strong>
          <span>상담에서 인테이크로 넘긴 뒤 이해상충 검토와 Matter 개설까지 같은 흐름에서 처리합니다.</span>
          <ActionNotice
            pending={createPending}
            result={createResult}
            pendingText="신규 의뢰를 인테이크로 접수 중입니다."
            successText="신규 의뢰가 인테이크로 접수되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateIntake}>
          <Plus size={15} />
          의뢰 접수
        </button>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-upl-c08-intake-handoff-result="true">
          <ShieldCheck size={15} />
          <span>신규 의뢰가 인테이크 요청으로 연결되었습니다.</span>
        </div>
      )}
      <IntakeActionPanel
        intakeRequest={selectedIntake}
        auditCount={auditCount}
        conflictResult={conflictResult}
        decisionResult={decisionResult}
        waiverResult={waiverResult}
        engagementResult={engagementResult}
        clearanceResult={clearanceResult}
        matterOpeningResult={matterOpeningResult}
        conflictPending={conflictPending}
        decisionPending={decisionPending}
        waiverPending={waiverPending}
        engagementPending={engagementPending}
        clearancePending={clearancePending}
        matterOpeningPending={matterOpeningPending}
        onConflictCheck={onConflictCheck}
        onConflictDecision={onConflictDecision}
        onWaiverApprove={onWaiverApprove}
        onEngagementApprove={onEngagementApprove}
        onClearance={onClearance}
        onMatterOpening={onMatterOpening}
      />
      <DataTable
        columns={["인테이크", "상태", "Opportunity", "범위"]}
        rows={intakeRows.map((item, index) => [
          `인테이크 ${index + 1}`,
          pipelineStatus(item.status),
          linkedLabel(item.opportunity_id),
          businessLabel(item.requested_scope_summary, "범위 미지정")
        ])}
      />
    </div>
  );
}

export function ClientsSurface({ labels, liveCtx = "allow", activeSection = "" }) {
  const skin = useSkin();
  const [clientsResult, setClientsResult] = useState(null);
  const [accountsResult, setAccountsResult] = useState(null);
  const [contactsResult, setContactsResult] = useState(null);
  const [accountContactsResult, setAccountContactsResult] = useState(null);
  const [mergeProposalsResult, setMergeProposalsResult] = useState(null);
  const [activitiesResult, setActivitiesResult] = useState(null);
  const [proposalsResult, setProposalsResult] = useState(null);
  const [clientSettingsResult, setClientSettingsResult] = useState(null);
  const [financeInvoicesResult, setFinanceInvoicesResult] = useState(null);
  const [financeArAgingResult, setFinanceArAgingResult] = useState(null);
  const [leadsResult, setLeadsResult] = useState(null);
  const [opportunitiesResult, setOpportunitiesResult] = useState(null);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeAuditResult, setIntakeAuditResult] = useState(null);
  const [intakeCreateResult, setIntakeCreateResult] = useState(null);
  const [handoffResult, setHandoffResult] = useState(null);
  const [conflictResult, setConflictResult] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null);
  const [waiverResult, setWaiverResult] = useState(null);
  const [engagementResult, setEngagementResult] = useState(null);
  const [clearanceResult, setClearanceResult] = useState(null);
  const [matterOpeningResult, setMatterOpeningResult] = useState(null);
  const [accountCreateResult, setAccountCreateResult] = useState(null);
  const [contactCreateResult, setContactCreateResult] = useState(null);
  const [mergeCreateResult, setMergeCreateResult] = useState(null);
  const [mergeExecuteResult, setMergeExecuteResult] = useState(null);
  const [activityCreateResult, setActivityCreateResult] = useState(null);
  const [activityPatchResult, setActivityPatchResult] = useState(null);
  const [proposalCreateResult, setProposalCreateResult] = useState(null);
  const [proposalPatchResult, setProposalPatchResult] = useState(null);
  const [clientSettingPatchResult, setClientSettingPatchResult] = useState(null);
  const [accountPatchResult, setAccountPatchResult] = useState(null);
  const [contactPatchResult, setContactPatchResult] = useState(null);
  const [clientRecordActionFieldsResult, setClientRecordActionFieldsResult] = useState(null);
  const [clientRecordActionAuditResult, setClientRecordActionAuditResult] = useState(null);
  const [clientRecordActionUpdateResult, setClientRecordActionUpdateResult] = useState(null);
  const [clientRecordActionOwnerResult, setClientRecordActionOwnerResult] = useState(null);
  const [accountRecordActionResult, setAccountRecordActionResult] = useState(null);
  const [contactRecordActionResult, setContactRecordActionResult] = useState(null);
  const [legalPeopleClientResult, setLegalPeopleClientResult] = useState(null);
  const [clientRecordEditValue, setClientRecordEditValue] = useState("");
  const [intakeCreatePending, setIntakeCreatePending] = useState(false);
  const [handoffPending, setHandoffPending] = useState(false);
  const [conflictPending, setConflictPending] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);
  const [waiverPending, setWaiverPending] = useState(false);
  const [engagementPending, setEngagementPending] = useState(false);
  const [clearancePending, setClearancePending] = useState(false);
  const [matterOpeningPending, setMatterOpeningPending] = useState(false);
  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [contactCreatePending, setContactCreatePending] = useState(false);
  const [mergeCreatePending, setMergeCreatePending] = useState(false);
  const [mergeExecutePending, setMergeExecutePending] = useState(false);
  const [activityCreatePending, setActivityCreatePending] = useState(false);
  const [activityPatchPending, setActivityPatchPending] = useState(false);
  const [proposalCreatePending, setProposalCreatePending] = useState(false);
  const [proposalPatchPending, setProposalPatchPending] = useState(false);
  const [clientSettingPatchPending, setClientSettingPatchPending] = useState(false);
  const [accountPatchPending, setAccountPatchPending] = useState(false);
  const [contactPatchPending, setContactPatchPending] = useState(false);
  const [clientRecordActionPending, setClientRecordActionPending] = useState(false);
  const [clientRecordActionOwnerPending, setClientRecordActionOwnerPending] = useState(false);
  const [accountRecordActionPending, setAccountRecordActionPending] = useState(false);
  const [contactRecordActionPending, setContactRecordActionPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const currentSection = CLIENT_SECTIONS.has(activeSection) ? activeSection : "clients-home";

  useEffect(() => {
    let cancelled = false;
    setClientsResult(null);
    const guardedResult = guardedResultForContext(liveCtx);
    if (guardedResult) {
      setClientsResult(guardedResult);
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      fetchAllMasterDataRecords({
        ctx: liveCtx,
        modelType: "ClientGroup",
        limit: 100,
        permissionRef: CLIENTS_PERMISSION_REF,
        auditHintRef: CLIENTS_AUDIT_HINT_REF
      }),
      fetchAllMasterDataRecords({
        ctx: liveCtx,
        modelType: "MatterClient",
        limit: 100,
        permissionRef: CLIENTS_MATTER_LINK_PERMISSION_REF,
        auditHintRef: CLIENTS_MATTER_LINK_AUDIT_HINT_REF
      }),
      fetchMatterRecords({
        ctx: liveCtx,
        limit: 100,
        permissionRef: CLIENTS_MATTER_LINK_PERMISSION_REF,
        auditHintRef: CLIENTS_MATTER_LINK_AUDIT_HINT_REF
      })
    ]).then(([clientGroups, matterClients, matters]) => {
      if (!cancelled) setClientsResult(mergeClientMatterResults(clientGroups, matterClients, matters));
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setLegalPeopleClientResult(null);
    fetchLegalPeopleSearch({ client_id: "client_lcx_001", ctx: liveCtx }).then((next) => {
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
    setActivitiesResult(null);
    setProposalsResult(null);
    setClientSettingsResult(null);
    setFinanceInvoicesResult(null);
    setFinanceArAgingResult(null);
    setAccountCreateResult(null);
    setContactCreateResult(null);
    setMergeCreateResult(null);
    setMergeExecuteResult(null);
    setActivityCreateResult(null);
    setActivityPatchResult(null);
    setProposalCreateResult(null);
    setProposalPatchResult(null);
    setClientSettingPatchResult(null);
    setAccountPatchResult(null);
    setContactPatchResult(null);
    setIntakeCreateResult(null);
    setAccountRecordActionResult(null);
    setContactRecordActionResult(null);
    const guardedResult = guardedResultForContext(liveCtx);
    if (guardedResult) {
      setLeadsResult(guardedResult);
      setOpportunitiesResult(guardedResult);
      setIntakeResult(guardedResult);
      setIntakeAuditResult(guardedResult);
      setAccountsResult(guardedResult);
      setContactsResult(guardedResult);
      setAccountContactsResult(guardedResult);
      setMergeProposalsResult(guardedResult);
      setActivitiesResult(guardedResult);
      setProposalsResult(guardedResult);
      setClientSettingsResult(guardedResult);
      setFinanceInvoicesResult(guardedResult);
      setFinanceArAgingResult(guardedResult);
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      fetchCrmLeads({ ctx: liveCtx }),
      fetchCrmOpportunities({ ctx: liveCtx }),
      fetchIntakeRequests({ ctx: liveCtx }),
      fetchIntakeAudit({ ctx: liveCtx }),
      fetchCrmAccounts({ ctx: liveCtx }),
      fetchCrmContacts({ ctx: liveCtx }),
      fetchCrmMergeProposals({ ctx: liveCtx }),
      fetchCrmActivities({ ctx: liveCtx }),
      fetchCrmProposals({ ctx: liveCtx }),
      fetchCrmClientSettings({ ctx: liveCtx }),
      fetchFinanceInvoices({ ctx: liveCtx }),
      fetchFinanceArAging({ ctx: liveCtx })
    ]).then(async ([
      leads,
      opportunities,
      intake,
      audit,
      accounts,
      contacts,
      mergeProposals,
      activities,
      proposals,
      clientSettings,
      financeInvoices,
      financeArAging
    ]) => {
      if (cancelled) return;
      setLeadsResult(leads);
      setOpportunitiesResult(opportunities);
      setIntakeResult(intake);
      setIntakeAuditResult(audit);
      setAccountsResult(accounts);
      setContactsResult(contacts);
      setMergeProposalsResult(mergeProposals);
      setActivitiesResult(activities);
      setProposalsResult(proposals);
      setClientSettingsResult(clientSettings);
      setFinanceInvoicesResult(financeInvoices);
      setFinanceArAgingResult(financeArAging);
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
  const selectedClientId = clientRecordId(selectedClient);
  const accountCount = resultItems(accountsResult).length;
  const contactCount = resultItems(contactsResult).length;
  const mergeProposals = resultItems(mergeProposalsResult);
  const mergeProposalCount = mergeProposals.length;
  const executableMergeCount = mergeProposals.filter((proposal) => proposal.executable).length;
  const opportunities = resultItems(opportunitiesResult);
  const intakes = resultItems(intakeResult);
  const selectedOpportunity = opportunities[0] ?? null;
  const selectedIntake = intakes[0] ?? null;
  const selectedAccount = resultItems(accountsResult)[0] ?? null;
  const activeOpportunity =
    (handoffResult?.kind === "data" && handoffResult.opportunity?.opportunity_id ? handoffResult.opportunity : null) ??
    (intakeCreateResult?.kind === "data" && intakeCreateResult.opportunity?.opportunity_id ? intakeCreateResult.opportunity : null) ??
    selectedOpportunity;
  const activeIntake =
    (handoffResult?.kind === "data" && handoffResult.item?.intake_request_id ? handoffResult.item : null) ??
    selectedIntake;
  const selectedClientPartyId = selectedClient?.primary_party_id ?? selectedClient?.primary_entity_id ?? selectedAccount?.party_id ?? activeOpportunity?.party_id ?? "party_cmp_g6_client_001";
  const leadCount = resultItems(leadsResult).length;
  const opportunityCount = opportunities.length;
  const intakeCount = intakes.length;
  const clientGuardedState =
    liveCtx === "denied" ||
    liveCtx === "review" ||
    clientsResult?.uiState === "denied" ||
    clientsResult?.uiState === "review_required" ||
    clientsResult?.outcome === "review_required";

  useEffect(() => {
    setClientRecordEditValue(selectedClient?.display_name ?? "");
  }, [selectedClientId, selectedClient?.display_name]);

  useEffect(() => {
    let cancelled = false;
    setClientRecordActionFieldsResult(null);
    setClientRecordActionAuditResult(null);
    setClientRecordActionUpdateResult(null);
    setClientRecordActionOwnerResult(null);
    if (clientGuardedState || !selectedClientId) {
      return () => {
        cancelled = true;
      };
    }
    Promise.all([
      fetchRecordActionFields({ objectName: "client", ctx: liveCtx }),
      fetchRecordActionAudit({ objectName: "client", recordId: selectedClientId, ctx: liveCtx })
    ]).then(([fields, audit]) => {
      if (cancelled) return;
      setClientRecordActionFieldsResult(fields);
      setClientRecordActionAuditResult(audit);
    });
    return () => {
      cancelled = true;
    };
  }, [clientGuardedState, liveCtx, refreshToken, selectedClientId]);

  function resetIntakePipelineResults() {
    setConflictResult(null);
    setDecisionResult(null);
    setWaiverResult(null);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
  }

  async function handleCreateIntakePipeline() {
    const requestedScopeSummary = "신규 의뢰 수임 검토";
    setIntakeCreatePending(true);
    setIntakeCreateResult(null);
    setHandoffResult(null);
    resetIntakePipelineResults();
    const createdOpportunity = await createCrmOpportunity({
      partyId: selectedClientPartyId,
      displayName: "신규 의뢰",
      requestedScopeSummary,
      ctx: liveCtx
    });
    if (createdOpportunity.kind !== "data" || !createdOpportunity.item?.opportunity_id) {
      setIntakeCreateResult(createdOpportunity);
      setIntakeCreatePending(false);
      return;
    }
    setOpportunitiesResult((current) => upsertResultItem(current, createdOpportunity.item, "opportunity_id"));
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: createdOpportunity.item.opportunity_id,
      requestedScopeSummary,
      ctx: liveCtx
    });
    setHandoffResult(next);
    setIntakeCreateResult(
      next.kind === "data"
        ? { ...next, opportunity: next.opportunity ?? createdOpportunity.item }
        : next
    );
    setIntakeCreatePending(false);
    if (next.kind === "data") {
      setOpportunitiesResult((current) => upsertResultItem(current, next.opportunity ?? createdOpportunity.item, "opportunity_id"));
      setIntakeResult((current) => upsertResultItem(current, next.item, "intake_request_id"));
    }
  }

  async function handleOpportunityHandoff() {
    if (!selectedOpportunity?.opportunity_id) return;
    setHandoffPending(true);
    const next = await handoffCrmOpportunityToIntake({
      opportunityId: selectedOpportunity.opportunity_id,
      requestedScopeSummary: businessLabel(selectedOpportunity.display_name, "Client 상담·문의 요청"),
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
    if (!activeIntake?.intake_request_id) return;
    setDecisionResult(null);
    setWaiverResult(null);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setConflictPending(true);
    const next = await createIntakeConflictCheck({ intakeRequest: activeIntake, ctx: liveCtx });
    setConflictResult(next);
    setConflictPending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleConflictDecision() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
    if (!conflictCheck?.conflict_check_id) return;
    setDecisionPending(true);
    const next = await recordIntakeConflictDecision({ conflictCheck, conflictHits, decision: "clear", ctx: liveCtx });
    setDecisionResult(next);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setDecisionPending(false);
    if (next.kind === "data") setConflictResult((current) => current?.kind === "data" ? { ...current, item: next.conflictCheck ?? current.item, conflictHits: next.conflictHits ?? current.conflictHits } : current);
  }

  async function handleWaiverApprove() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const conflictHits = conflictResult?.kind === "data" ? conflictResult.conflictHits : [];
    if (!activeIntake?.intake_request_id || !conflictCheck?.conflict_check_id) return;
    setWaiverPending(true);
    const next = await approveIntakeConflictWaiver({ intakeRequest: activeIntake, conflictCheck, conflictHits, ctx: liveCtx });
    setWaiverResult(next);
    setEngagementResult(null);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setWaiverPending(false);
    if (next.kind === "data") setConflictResult((current) => current?.kind === "data" ? { ...current, item: next.conflictCheck ?? current.item } : current);
  }

  async function handleEngagementApprove() {
    if (!activeIntake?.intake_request_id) return;
    setEngagementPending(true);
    const next = await approveIntakeEngagement({ intakeRequest: activeIntake, ctx: liveCtx });
    setEngagementResult(next);
    setClearanceResult(null);
    setMatterOpeningResult(null);
    setEngagementPending(false);
  }

  async function handleClearance() {
    const conflictCheck = conflictResult?.kind === "data" ? conflictResult.item : null;
    const engagement = engagementResult?.kind === "data" ? engagementResult.engagement ?? engagementResult.item : null;
    if (!activeIntake?.intake_request_id || !conflictCheck?.snapshot_hash) return;
    setClearancePending(true);
    const next = await issueIntakeClearanceToken({ intakeRequest: activeIntake, conflictCheck, engagement, ctx: liveCtx });
    setClearanceResult(next);
    setMatterOpeningResult(null);
    setClearancePending(false);
    if (next.kind === "data") setRefreshToken((value) => value + 1);
  }

  async function handleMatterOpening() {
    const clearanceToken = clearanceResult?.kind === "data" && clearanceResult.validation?.valid ? clearanceResult.item : null;
    if (!activeIntake?.intake_request_id || !clearanceToken?.clearance_token_id) return;
    setMatterOpeningPending(true);
    const next = await openMatterFromIntakeClearance({
      intakeRequest: activeIntake,
      clearanceToken,
      clientPartyId: selectedClientPartyId,
      title: businessLabel(activeIntake.requested_scope_summary, "인테이크 Matter"),
      ctx: liveCtx
    });
    setMatterOpeningResult(next);
    setMatterOpeningPending(false);
  }

  async function handleCreateAccount() {
    setAccountCreatePending(true);
    const next = await createCrmAccount({ displayName: "신규 Client", ctx: liveCtx });
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
    const next = await createCrmContact({ displayName: "신규 담당자", accountId, ctx: liveCtx });
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
                primary_contact_type: next.item.primary_contact_type ?? null,
                contact_point_value: next.item.contact_point_value ?? null,
                contact_point_value_included: next.item.contact_point_value_included === true,
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

  async function handleCreateActivity() {
    setActivityCreatePending(true);
    const next = await createCrmActivity({
      partyId: selectedClientPartyId,
      opportunityId: selectedOpportunity?.opportunity_id ?? "opp_cmp_g6_synthetic_001",
      subject: "Client 후속 조치",
      ctx: liveCtx
    });
    setActivityCreateResult(next);
    setActivityCreatePending(false);
    if (next.kind === "data" && next.item) {
      setActivitiesResult((current) => upsertResultItem(current, next.item, "crm_activity_id"));
    }
  }

  async function handlePatchActivity(activity) {
    if (!activity?.crm_activity_id) return;
    setActivityPatchPending(true);
    const next = await patchCrmActivity({
      activityId: activity.crm_activity_id,
      fieldUpdates: { status: "review_required" },
      ctx: liveCtx
    });
    setActivityPatchResult(next);
    setActivityPatchPending(false);
    if (next.kind === "data" && next.item) {
      setActivitiesResult((current) => upsertResultItem(current, next.item, "crm_activity_id"));
    }
  }

  async function handleCreateProposal() {
    setProposalCreatePending(true);
    const next = await createCrmProposal({
      opportunityId: selectedOpportunity?.opportunity_id ?? "opp_cmp_g6_synthetic_001",
      partyId: selectedClientPartyId,
      displayName: "Client 제안 초안",
      ctx: liveCtx
    });
    setProposalCreateResult(next);
    setProposalCreatePending(false);
    if (next.kind === "data" && next.item) {
      setProposalsResult((current) => upsertResultItem(current, next.item, "proposal_id"));
    }
  }

  async function handleProposalProviderCheck(proposal) {
    if (!proposal?.proposal_id) return;
    setProposalPatchPending(true);
    const next = await patchCrmProposal({
      proposalId: proposal.proposal_id,
      fieldUpdates: { e_sign_send_requested: true },
      ctx: liveCtx
    });
    setProposalPatchResult(next);
    setProposalPatchPending(false);
    if (next.kind === "data" && next.item) {
      setProposalsResult((current) => upsertResultItem(current, next.item, "proposal_id"));
    }
  }

  async function handlePatchClientSetting(policy) {
    if (!policy?.policy_id) return;
    setClientSettingPatchPending(true);
    const next = await patchCrmClientSetting({
      policyId: policy.policy_id,
      fieldUpdates: { duplicate_review_required: true },
      ctx: liveCtx
    });
    setClientSettingPatchResult(next);
    setClientSettingPatchPending(false);
    if (next.kind === "data" && next.item) {
      setClientSettingsResult((current) => upsertResultItem(current, next.item, "policy_id"));
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
              ? {
                  ...item,
                  status: next.item.status,
                  contact_display_name: next.item.display_name,
                  primary_contact_type: next.item.primary_contact_type ?? item.primary_contact_type,
                  contact_point_value: next.item.contact_point_value ?? item.contact_point_value,
                  contact_point_value_included: next.item.contact_point_value_included === true
                }
              : item,
          ),
          safeErrorCodes: current?.safeErrorCodes ?? [],
          productionReadyClaim: false
        }));
      }
    }
  }

  async function handleClientRecordActionFieldUpdate(event) {
    event?.preventDefault?.();
    if (!selectedClientId) return;
    const displayName = clientRecordEditValue.trim();
    if (!displayName) return;
    setClientRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "client",
      recordId: selectedClientId,
      fieldUpdates: { display_name: displayName },
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
      fieldUpdates: { display_name: "Client 작업 검토" },
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
      fieldUpdates: { display_name: "담당자 작업 검토" },
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
      <ForestHero title={labels.clientsTitle} subtitle="Client, 담당자, Opportunity, 상담 이력을 한 화면에서 확인합니다." imageOpacity={0.18} />
      <PageHeader
        title={labels.clientsTitle}
        subtitle="Client, 담당자, Opportunity, 상담 이력을 한 화면에서 확인합니다."
        heroTakeover={skin === "forest"}
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="clients-runtime-grid record-workspace" data-salesforce-client-workspace="list-detail-right-panel">
        {currentSection === "clients-home" && (
          <Panel id="clients-home-panel" className="record-list-panel" title="Client 홈" meta="요약">
            <ClientsOverviewPanel
              customerCount={clients.length}
              leadCount={leadCount}
              opportunityCount={opportunityCount}
              intakeCount={intakeCount}
              accountCount={accountCount}
              contactCount={contactCount}
            />
          </Panel>
        )}
        {currentSection === "clients-list" && (
          <Panel id="clients-list" className="record-list-panel" title="Client 목록" meta="권한 기준 적용">
            <ClientsTable result={clientsResult} />
          </Panel>
        )}
        {currentSection === "client-leads" && (
          <Panel id="client-leads" className="record-list-panel" title="잠재 Client" meta="수임 전">
            <LeadsTable result={leadsResult} />
          </Panel>
        )}
        {currentSection === "client-opportunities" && (
          <Panel id="client-opportunities" className="record-list-panel" title="Opportunity" meta="수임 전 기회">
            <OpportunitiesTable
              result={opportunitiesResult}
              pending={handoffPending}
              handoffResult={handoffResult}
              onHandoff={handleOpportunityHandoff}
            />
          </Panel>
        )}
        {currentSection === "client-intake" && (
          <Panel id="client-intake" className="record-list-panel" title="인테이크" meta="수임 전 검토">
            <ClientIntakePipelineSurface
              result={intakeResult}
              auditResult={intakeAuditResult}
              activeIntake={activeIntake}
              createResult={intakeCreateResult}
              conflictResult={conflictResult}
              decisionResult={decisionResult}
              waiverResult={waiverResult}
              engagementResult={engagementResult}
              clearanceResult={clearanceResult}
              matterOpeningResult={matterOpeningResult}
              createPending={intakeCreatePending}
              conflictPending={conflictPending}
              decisionPending={decisionPending}
              waiverPending={waiverPending}
              engagementPending={engagementPending}
              clearancePending={clearancePending}
              matterOpeningPending={matterOpeningPending}
              onCreateIntake={handleCreateIntakePipeline}
              onConflictCheck={handleConflictCheck}
              onConflictDecision={handleConflictDecision}
              onWaiverApprove={handleWaiverApprove}
              onEngagementApprove={handleEngagementApprove}
              onClearance={handleClearance}
              onMatterOpening={handleMatterOpening}
            />
          </Panel>
        )}
        {currentSection === "client-accounts" && (
          <Panel id="client-accounts" className="record-list-panel" title="법인·개인 Client" meta="Client 관리">
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
          <Panel id="client-contacts" className="record-list-panel" title="담당자" meta="Client 연락 창구">
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
        {currentSection === "client-activities" && (
          <Panel id="client-activities" className="record-list-panel" title="접촉 이력" meta="CRM 활동">
            <ClientActivitiesPanel
              result={activitiesResult}
              createResult={activityCreateResult}
              patchResult={activityPatchResult}
              createPending={activityCreatePending}
              patchPending={activityPatchPending}
              onCreate={handleCreateActivity}
              onPatch={handlePatchActivity}
            />
          </Panel>
        )}
        {currentSection === "client-contracts" && (
          <Panel id="client-contracts" className="record-list-panel" title="제안·계약" meta="Vault/e-sign 경계">
            <ClientContractsPanel
              result={proposalsResult}
              createResult={proposalCreateResult}
              patchResult={proposalPatchResult}
              createPending={proposalCreatePending}
              patchPending={proposalPatchPending}
              onCreate={handleCreateProposal}
              onProviderCheck={handleProposalProviderCheck}
            />
          </Panel>
        )}
        {currentSection === "client-relationships" && (
          <Panel id="client-relationships" className="record-list-panel" title="Client 관계" meta="관계·병합 검토">
            <ClientRelationshipsPanel
              relationshipResult={accountContactsResult}
              mergeResult={mergeProposalsResult}
              mergeCreateResult={mergeCreateResult}
              mergeExecuteResult={mergeExecuteResult}
              mergeCreatePending={mergeCreatePending}
              mergeExecutePending={mergeExecutePending}
              onCreateMergeProposal={handleCreateMergeProposal}
              onExecuteMergeProposal={handleExecuteMergeProposal}
            />
          </Panel>
        )}
        {currentSection === "client-conflict" && (
          <Panel id="client-conflict" className="record-list-panel" title="이해상충 확인" meta="검토 큐">
            <ClientConflictPanel
              result={intakeResult}
              auditResult={intakeAuditResult}
              activeIntake={activeIntake}
              conflictResult={conflictResult}
              decisionResult={decisionResult}
              waiverResult={waiverResult}
              engagementResult={engagementResult}
              clearanceResult={clearanceResult}
              matterOpeningResult={matterOpeningResult}
              conflictPending={conflictPending}
              decisionPending={decisionPending}
              waiverPending={waiverPending}
              engagementPending={engagementPending}
              clearancePending={clearancePending}
              matterOpeningPending={matterOpeningPending}
              onConflictCheck={handleConflictCheck}
              onConflictDecision={handleConflictDecision}
              onWaiverApprove={handleWaiverApprove}
              onEngagementApprove={handleEngagementApprove}
              onClearance={handleClearance}
              onMatterOpening={handleMatterOpening}
            />
          </Panel>
        )}
        {currentSection === "client-billing" && (
          <Panel id="client-billing" className="record-list-panel" title="청구·수금" meta="Finance 연결">
            <ClientChargePanel
              invoicesResult={financeInvoicesResult}
              arAgingResult={financeArAgingResult}
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
        {currentSection === "client-settings" && (
          <Panel id="client-settings" className="record-list-panel" title="Client 설정" meta="정책 레지스트리">
            <ClientSettingsPanel
              result={clientSettingsResult}
              patchResult={clientSettingPatchResult}
              patchPending={clientSettingPatchPending}
              onPatch={handlePatchClientSetting}
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
          mergeProposalCount={mergeProposalCount}
          executableMergeCount={executableMergeCount}
        />
        {!clientGuardedState && selectedClientId && (
          <RecordActionSummary
            fieldsResult={clientRecordActionFieldsResult}
            auditResult={clientRecordActionAuditResult}
            updateResult={clientRecordActionUpdateResult}
            ownerResult={clientRecordActionOwnerResult}
            pending={clientRecordActionPending}
            ownerPending={clientRecordActionOwnerPending}
            editValue={clientRecordEditValue}
            onEditValueChange={setClientRecordEditValue}
            onFieldUpdate={handleClientRecordActionFieldUpdate}
            onOwnerBlocked={handleClientOwnerBlockedAction}
          />
        )}
      </div>
    </section>
  );
}
