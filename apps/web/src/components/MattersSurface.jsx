import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, FileText, Link2, ListChecks, MessageSquare, Pencil, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import {
  bulkCompleteMatterStatus,
  changeMatterOwner,
  completeMatterStatus,
  createAnalyticsExport,
  createFinanceTimeEntry,
  createMatterActivity,
  createMatterCalendarEvent,
  createMatterChannelMessage,
  fetchAnalyticsDashboards,
  fetchAnalyticsMatterProfitability,
  fetchFinanceAudit,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchMatterActivities,
  fetchMatterAudit,
  fetchMatterCalendarEvents,
  fetchMatterChannel,
  fetchMatterCommandCenter,
  fetchMatterDeadlines,
  fetchMatterListViews,
  fetchMatterRecentlyViewed,
  fetchMatterRecords,
  fetchMatterTimeline,
  fetchRecordActionAudit,
  fetchRecordActionFields,
  generateFinanceWip,
  importFinancePayment,
  markMatterRecentlyViewed,
  patchMatterActivity,
  patchMatterCalendarEvent,
  refreshAnalyticsDashboards,
  refreshMatterProfitability,
  saveMatterListView,
  syncMatterChannelProvider,
  confirmMatterDeadlineChange,
  bulkUpdateRecordActions,
  updateRecordActionField,
  updateMatterInlineFields
} from "../data/apiClient.js";
import { DataTable, PageHeader, Panel, Property } from "./primitives.jsx";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { MatterOpeningWizard } from "./MatterOpeningWizard.jsx";
import { MatterTeamRoster } from "./MatterTeamRoster.jsx";
import { MatterVaultPanel } from "./MatterVaultPanel.jsx";
import { ImportDataMappingPanel } from "./ImportDataMappingPanel.jsx";
import { fetchLegalPeopleSearch } from "../people/hrxApiClient.ts";

const MATTER_PERMISSION_REF = "ui_cmp_g4_matter_live";
const MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_probe";
const MATTER_SECTIONS = new Set([
  "matter-home",
  "matters-list",
  "matter-command",
  "matter-intake",
  "matter-closeout",
  "matter-archive",
  "matter-board",
  "matter-tasks",
  "matter-vault",
  "matter-evidence",
  "matter-templates",
  "matter-seal",
  "matter-timeline",
  "matter-calendar",
  "matter-external-schedule",
  "matter-notes",
  "matter-channel",
  "matter-meetings",
  "matter-announcements",
  "matter-opening",
  "matter-team",
  "matter-client-requests",
  "matter-approvals",
  "matter-time",
  "matter-expenses",
  "matter-billing",
  "matter-ar",
  "matter-analytics",
  "matter-search",
  "matter-risk",
  "matter-audit",
  "matter-integrations",
  "matter-settings",
  "matter-import"
]);
const MATTER_WORK_TABS = [
  { section: "matter-home", label: "홈" },
  { section: "matters-list", label: "사건 목록" },
  { section: "matter-board", label: "업무 보드" },
  { section: "matter-calendar", label: "일정" },
  { section: "matter-external-schedule", label: "외부 일정" },
  { section: "matter-vault", label: "사건 문서" }
];
const MATTER_PATH_STEPS = ["신규", "이해상충", "계약", "수행", "청구"];
const MATTER_EXTERNAL_SCHEDULE_ROWS = [
  ["법원 일정", "판결선고 청취, 변론기일, 조정기일", "법원명, 재판부, 사건번호, 출석자"],
  ["검찰 일정", "기록 열람·복사, 출석, 의견서 제출", "검찰청, 담당부, 사건번호, 준비물"],
  ["우체국 발송", "내용증명, 등기, 송달 추적", "발송처, 수신처, 등기번호, 마감"],
  ["관공서 방문", "인허가, 민원, 자료 제출", "기관명, 접수번호, 방문자, 제출물"],
  ["세무서 업무", "신고, 납부, 자료 제출, 사실조회 대응", "세무서명, 업무 유형, 기한"],
  ["기록 열람·복사", "법원·검찰 기록 복사와 수령", "기관, 예약일, 복사 범위"],
  ["제출·접수", "서면 제출, 전자 접수, 방문 접수", "제출처, 제출물, 접수번호"],
  ["송달 확인", "송달 상태와 수령 여부 확인", "송달 대상, 송달일, 확인자"],
  ["마감·기한", "항소·상고, 답변서, 보정명령 등 기한 관리", "기한일, 기준일, 담당자"]
];
const MATTER_CONNECTED_SECTIONS = {
  "matter-closeout": {
    title: "종결 처리",
    marker: "closeout",
    meta: "생애주기",
    rows: [
      ["종결 체크리스트", "종결 보고, 미수금, 문서 보관 확인", "Matter 상태 전환 연결"],
      ["Vault 변경", "종결 후 문서 쓰기와 보관 정책", "법적 보존 검토 전 차단"]
    ]
  },
  "matter-archive": {
    title: "보관 사건",
    marker: "archive",
    meta: "보관 정책",
    rows: [
      ["보관 기준", "종결일, 보관 위치, 접근 권한", "보존 정책 연결"],
      ["재개 처리", "보관 사건 재활성화", "담당자 승인 전 차단"]
    ]
  },
      "matter-tasks": {
        title: "할 일",
        marker: "tasks",
        meta: "활동 기록",
        rows: [
      ["개인 할 일", "담당자, 기한, 우선순위", "Matter 활동 기록 연결"],
      ["사건별 할 일", "업무 보드와 연결", "생성/상태 변경/감사 연결"]
    ]
  },
  "matter-notes": {
    title: "메모·검토 의견",
    marker: "notes",
    meta: "내부 기록",
    rows: [
      ["검토 의견", "쟁점, 리스크, 다음 액션", "Matter 활동 유형 연결"],
      ["내부 메모", "권한 기준 비공개 메모", "외부 공유 차단"]
    ]
  },
  "matter-evidence": {
    title: "증거·자료",
    marker: "evidence",
    meta: "Vault 단축 경로",
    rows: [
      ["증거 목록", "증거번호, 제출 여부, 관련 쟁점", "Matter Vault 문서 워크스페이스 연결"],
      ["자료 분류", "의뢰인 제공, 상대방 제출, 기관 회신", "사전검사 후 작업 가능"]
    ]
  },
  "matter-templates": {
    title: "양식·템플릿",
    marker: "templates",
    meta: "문서 초안",
    rows: [
      ["문서 양식", "소장, 답변서, 의견서, 내용증명", "Vault 템플릿 읽기 연결"],
      ["사건 유형별 템플릿", "송무, 자문, M&A 분류", "승인 요청 후 게시 차단"]
    ]
  },
  "matter-seal": {
    title: "인장·날인",
    marker: "seal",
    meta: "승인 경계",
    rows: [
      ["날인 요청", "문서, 승인권자, 사용 목적", "담당자 승인 필요"],
      ["사용 이력", "인장 종류, 처리자, 감사 이력", "감사 이력 연결"]
    ]
  },
  "matter-meetings": {
    title: "회의·통화 기록",
    marker: "meetings",
    meta: "일정·대화",
    rows: [
      ["회의록", "참석자, 안건, 결정사항", "Matter 일정/활동 연결"],
      ["통화 기록", "통화자, 요지, 후속 업무", "내부 기록 연결"]
    ]
  },
  "matter-announcements": {
    title: "공지·공유",
    marker: "announcements",
    meta: "내부 공유",
    rows: [
      ["사건 공지", "팀 공지와 변경사항 공유", "Matter 채널 연결"],
      ["공유 범위", "담당자·참여자 권한 기준", "외부 전송 provider 차단"]
    ]
  },
  "matter-client-requests": {
    title: "의뢰인 요청",
    marker: "client-requests",
    meta: "요청 관리",
    rows: [
      ["요청 접수", "자료 요청, 진행 문의, 일정 문의", "내부 메시지 연결"],
      ["응답 관리", "담당자, 상태, 회신 기한", "외부 회신 provider 차단"]
    ]
  },
  "matter-approvals": {
    title: "결재·승인",
    marker: "approvals",
    meta: "소유자 승인",
    rows: [
      ["내부 결재", "기안, 검토, 승인, 반려", "레코드 액션 승인 경계 연결"],
      ["외부 제출 승인", "제출 전 검토와 승인 이력", "담당자 승인 대기"]
    ]
  },
  "matter-expenses": {
    title: "비용 처리",
    marker: "expenses",
    meta: "청구 경계",
    rows: [
      ["비용 신청", "인지대, 송달료, 교통비, 복사비", "Finance 후보 기록 연결"],
      ["증빙 관리", "영수증, 청구 가능 여부, 정산 상태", "외부 지급/발송 차단"]
    ]
  },
  "matter-search": {
    title: "검색·통계",
    marker: "search",
    meta: "권한 검색",
    rows: [
      ["통합 검색", "사건, 문서, 일정, 대화", "권한 필터 적용"],
      ["통계", "유형, 상태, 담당자, 기간별 집계", "안전 집계 연결"]
    ]
  },
  "matter-risk": {
    title: "사건 위험",
    marker: "risk",
    meta: "위험 관리",
    rows: [
      ["위험 항목", "기한, 이해상충, 미수금, 자료 누락", "Matter/Finance/Audit 연결"],
      ["주의 알림", "담당자 확인과 감사 이력 연결", "필드 업데이트 감사 연결"]
    ]
  },
  "matter-integrations": {
    title: "연동·알림",
    marker: "integrations",
    meta: "공급자 상태",
    rows: [
      ["알림 규칙", "기한, 대화, 문서, 결재 알림", "내부 상태 확인"],
      ["외부 연동", "캘린더, 이메일, 문서 저장소", "외부 승인 기록 전 차단"]
    ]
  },
  "matter-settings": {
    title: "사건 설정",
    marker: "settings",
    meta: "정책 설정",
    rows: [
      ["사건 유형", "송무, 자문, M&A별 필드와 단계", "허용 필드 정책 연결"],
      ["권한 기준", "담당자·참여자 접근 범위", "권한/감사 경계 연결"]
    ]
  },
  "matter-import": {
    title: "자료 가져오기",
    marker: "import",
    meta: "가져오기 검증",
    rows: [
      ["가져오기", "사건 자료 매핑과 검증", "필드 매핑 패널 연결"],
      ["검증", "중복, 권한, 필수 필드 확인", "사전 검증 후 실행 승인 대기"]
    ]
  }
};
const TIMELINE_FILTERS = Object.freeze([
  Object.freeze({ id: "all", label: "전체", icon: ListChecks }),
  Object.freeze({ id: "matter", label: "Matter", icon: CheckCircle2 }),
  Object.freeze({ id: "document", label: "문서", icon: FileText }),
  Object.freeze({ id: "schedule", label: "일정", icon: CalendarClock }),
  Object.freeze({ id: "message", label: "메시지", icon: MessageSquare })
]);

function matterNumberLabel(value, index = 0) {
  const text = String(value ?? "").trim();
  if (!text || /synthetic|rp0|tenant|_[a-z0-9]/i.test(text)) return `Matter ${index + 1}`;
  return text;
}

function matterTitleLabel(value, index = 0) {
  const text = String(value ?? "").trim();
  if (!text || /synthetic|rp0|_[a-z0-9]/i.test(text)) return `Matter ${index + 1}`;
  return text;
}

function matterStatus(value) {
  if (value === "opening") return "개시 중";
  if (value === "review_required") return "검토 필요";
  if (value === "closed") return "종료";
  return "진행 중";
}

function billingStatus(value) {
  if (value === "not_started") return "시작 전";
  if (value === "review_required") return "검토 필요";
  if (value === "completed") return "완료";
  if (value === "ethical_wall") return "제한";
  if (value === "opening_wip_clear") return "청구 준비 가능";
  return "진행 중";
}

function activityStatusLabel(value) {
  if (value === "todo") return "예정";
  if (value === "in_progress") return "진행";
  if (value === "done") return "완료";
  if (value === "cancelled") return "취소";
  return "기록됨";
}

function providerStateLabel(value) {
  if (value === "provider_blocked") return "연동 승인 대기";
  if (value === "internal_only") return "내부 기록";
  return "내부 준비";
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

function legalPeopleItems(result) {
  return result?.kind === "data" && Array.isArray(result.people) ? result.people : [];
}

function LegalMatterPeopleBacklinkPanel({ result }) {
  const people = legalPeopleItems(result);
  return (
    <Panel id="matter-people-backlinks" className="record-list-panel" title="Matter 인물 연결" meta="참여자·연락처">
      <div className="legal-people-backlink-panel" data-lcx-ppl-matter-backlink="true">
        <div className="people-panel-kicker">
          <Link2 size={15} />
          Matter 참여자와 관련 인물 기록을 함께 확인합니다.
        </div>
        {result === null && <div className="live-data-state live-data-loading">Matter 연결 인물을 불러오는 중입니다</div>}
        {result?.kind === "error" && <div className="live-data-state live-data-error">Matter 연결 인물을 불러오지 못했습니다.</div>}
        {result?.kind === "data" && people.length === 0 && <div className="live-data-state live-data-empty">연결된 인물 기록이 없습니다.</div>}
        {people.length > 0 && (
          <div className="legal-people-backlink-list" aria-label="Matter 연결 인물">
            {people.slice(0, 6).map((person) => (
              <span key={person.person_id} className="legal-people-backlink-row">
                <Link2 size={13} />
                <strong>{matterTitleLabel(person.display_name, 0)}</strong>
                <small>{person.korean_label ?? person.type_id}</small>
              </span>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ConnectedMatterSection({ sectionId, config, children }) {
  return (
    <div
      className="matter-live-stack"
      data-lcx-vltui-06-connected-section={config.marker}
      data-lcx-vltui-06-section-id={sectionId}
      data-lcx-vltui-06-route-backed="true"
      data-lcx-vltui-06-claim-state="bounded"
    >
      <div className="matter-review-strip" data-lcx-vltui-06-boundary-state="connected-or-blocked">
        <ShieldCheck size={15} />
        <span>현재 Matter와 권한 컨텍스트를 기준으로 연결 상태만 표시합니다.</span>
      </div>
      <DataTable
        columns={["항목", "연결 기준", "상태"]}
        rows={config.rows}
      />
      {children}
    </div>
  );
}

function VaultShortcutPanel({ label, onOpenVault }) {
  return (
    <div className="record-action-strip" data-lcx-vltui-06-vault-shortcut="true">
      <div>
        <strong>{label}</strong>
        <span>Matter Vault 문서 워크스페이스 사전검사를 사용합니다.</span>
      </div>
      <button className="secondary-button" type="button" data-lcx-vltui-06-vault-shortcut-action="true" onClick={onOpenVault}>
        <FileText size={15} />
        사건 문서 열기
      </button>
    </div>
  );
}

function LifecycleBoundaryPanel({ commandResult, matter, statusResult, statusPending, onCompleteStatus, matterAuditResult }) {
  return (
    <div className="workspace-mini-grid" data-lcx-vltui-06-lifecycle-boundary="true">
      <CommandPanel
        result={commandResult}
        matter={matter}
        statusResult={statusResult}
        statusPending={statusPending}
        onCompleteStatus={onCompleteStatus}
      />
      <div
        className="record-boundary-note"
        data-lcx-vltui-06-vault-mutation-blocked="true"
        data-lcx-vltui-06-legal-hold-required="true"
      >
        <ShieldCheck size={15} />
        <span>종결/보관 상태에서는 legal hold와 보존 정책 확인 전 Vault 변경을 열지 않습니다.</span>
      </div>
      <AuditTrailPanel result={matterAuditResult} events={[statusResult?.auditEvent].filter(Boolean)} marker="lcx-vltui-06-lifecycle-audit" />
    </div>
  );
}

function ApprovalBoundaryPanel({
  marker,
  recordActionBulkResult,
  recordActionBulkPending,
  onRecordActionOwnerBlocked,
  channelProviderResult,
  channelProviderPending,
  onProviderSync
}) {
  return (
    <div className="record-action-grid" data-lcx-vltui-06-approval-boundary={marker}>
      <div className="record-action-strip" data-lcx-vltui-06-owner-blocked-action="true">
        <div>
          <strong>담당자 승인</strong>
          <span>{recordActionBulkResult?.uiState === "owner_blocked" ? "승인 대기" : "승인 경계 확인"}</span>
          <ActionNotice
            pending={recordActionBulkPending}
            result={recordActionBulkResult}
            pendingText="승인 경계를 확인 중입니다."
            successText="승인 필요 상태가 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={recordActionBulkPending} onClick={onRecordActionOwnerBlocked}>
          <ShieldCheck size={15} />
          승인 확인
        </button>
      </div>
      <div className="record-action-strip" data-lcx-vltui-06-provider-blocked-action="true">
        <div>
          <strong>외부 공급자</strong>
          <span>{channelProviderResult?.uiState === "provider_blocked" ? "공급자 차단" : "연동 상태 확인"}</span>
          <ActionNotice
            pending={channelProviderPending}
            result={channelProviderResult}
            pendingText="공급자 상태를 확인 중입니다."
            successText="공급자 연결 전이라 차단되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={channelProviderPending} onClick={onProviderSync}>
          <Link2 size={15} />
          상태 확인
        </button>
      </div>
    </div>
  );
}

function SearchRiskPanel({
  marker,
  matter,
  timelineResult,
  matterAuditResult,
  recordActionFieldsResult,
  recordActionUpdateResult,
  recordActionPending,
  onRecordActionFieldUpdate
}) {
  const timelineEntries = timelineResult?.kind === "data" ? timelineResult.item?.visible_entries ?? [] : [];
  const actionFields = recordActionFieldsResult?.kind === "data" && Array.isArray(recordActionFieldsResult.item?.fields)
    ? recordActionFieldsResult.item.fields
    : [];
  return (
    <div
      className="workspace-mini-grid"
      data-lcx-vltui-06-search-risk={marker}
      data-lcx-vltui-06-raw-snippet-visible="false"
      data-lcx-vltui-06-denied-count-visible="false"
    >
      <DataTable
        columns={["범위", "결과", "표시"]}
        rows={[
          ["Matter", matter ? matterStatus(matter.status) : "대기", "권한 기준"],
          ["활동", `${timelineEntries.length}건`, "요약만 표시"],
          ["감사", `${resultItems(matterAuditResult).length}건`, "결정 상태만 표시"]
        ]}
      />
      <div className="record-action-strip" data-lcx-vltui-06-risk-field-action="true">
        <div>
          <strong>위험 필드</strong>
          <span>{actionFields.length > 0 ? actionFields.map((field) => recordFieldLabel(field.label)).join(" / ") : "허용 필드 확인"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionUpdateResult}
            pendingText="위험 필드를 업데이트 중입니다."
            successText="위험 필드가 감사 이력과 함께 저장되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <ShieldCheck size={15} />
          위험 표시
        </button>
      </div>
      <AuditTrailPanel result={matterAuditResult} events={[recordActionUpdateResult?.auditEvent].filter(Boolean)} marker={`lcx-vltui-06-${marker}-audit`} />
    </div>
  );
}

function IntegrationsSettingsPanel({
  marker,
  channelResult,
  channelProviderResult,
  channelProviderPending,
  onProviderSync,
  recordActionFieldsResult,
  recordActionUpdateResult,
  recordActionPending,
  onRecordActionFieldUpdate
}) {
  const channel = channelResult?.kind === "data" ? channelResult.item : null;
  const actionFields = recordActionFieldsResult?.kind === "data" && Array.isArray(recordActionFieldsResult.item?.fields)
    ? recordActionFieldsResult.item.fields
    : [];
  return (
    <div
      className="workspace-mini-grid"
      data-lcx-vltui-06-integrations-settings={marker}
      data-lcx-vltui-06-provider-credentials-visible="false"
    >
      <div className="record-action-strip" data-lcx-vltui-06-provider-status-only="true">
        <div>
          <strong>연동 상태</strong>
          <span>{providerStateLabel(channelProviderResult?.providerState?.external_send_state ?? channel?.provider_state?.external_send_state)}</span>
          <ActionNotice
            pending={channelProviderPending}
            result={channelProviderResult}
            pendingText="연동 상태를 확인 중입니다."
            successText="공급자 승인 대기 상태입니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={channelProviderPending} onClick={onProviderSync}>
          <Link2 size={15} />
          상태 확인
        </button>
      </div>
      <div className="record-action-strip" data-lcx-vltui-06-settings-policy-action="true">
        <div>
          <strong>정책 필드</strong>
          <span>{actionFields.length > 0 ? actionFields.map((field) => recordFieldLabel(field.label)).join(" / ") : "권한 필드 확인"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionUpdateResult}
            pendingText="정책 필드를 업데이트 중입니다."
            successText="정책 필드가 감사 이력과 함께 저장되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={recordActionPending} onClick={onRecordActionFieldUpdate}>
          <Pencil size={15} />
          정책 확인
        </button>
      </div>
    </div>
  );
}

function applyMatterListView(matters, listView) {
  const status = listView?.filter?.status ?? "all";
  if (status === "all") return matters;
  return matters.filter((item) => item.status === status);
}

function viewedAtLabel(value) {
  if (!value) return "최근";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "최근";
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timelineTimeLabel(value) {
  if (!value) return "시각 미정";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "시각 미정";
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timelineCategory(entry) {
  const text = `${entry?.type ?? ""} ${entry?.source_ref ?? ""} ${entry?.title ?? ""}`.toLowerCase();
  if (/document|vault|doc_/.test(text)) return "document";
  if (/calendar|schedule|deadline|task|event/.test(text)) return "schedule";
  if (/email|mail|message|channel|comment|note/.test(text)) return "message";
  return "matter";
}

function timelineTypeLabel(entry) {
  const category = timelineCategory(entry);
  if (category === "document") return "문서";
  if (category === "schedule") return "일정";
  if (category === "message") return "메시지";
  if (entry?.type === "matter.status.transitioned") return "상태";
  if (entry?.type === "matter.document.facade") return "문서";
  return "Matter";
}

function timelineSourceLabel(entry) {
  const category = timelineCategory(entry);
  if (category === "document") return "Vault";
  if (category === "schedule") return "일정";
  if (category === "message") return "대화";
  if (entry?.type === "matter.status.transitioned") return "단계";
  return "기록";
}

function timelineTitleLabel(entry, index = 0) {
  const text = String(entry?.title ?? "").trim();
  if (text === "Channel message") return "대화 메시지";
  if (text === "Matter status updated") return "Matter 상태 업데이트";
  if (text === "Matter document linked") return "문서 연결";
  if (text === "Confirm matter opening checklist") return "Matter 개시 체크리스트 확인";
  if (!text || /synthetic|rp0|tenant|_[a-z0-9]/i.test(text)) return `활동 ${index + 1}`;
  return text;
}

function activityTitleLabel(value, index = 0) {
  return timelineTitleLabel({ title: value }, index);
}

function recordFieldLabel(value) {
  const text = String(value ?? "").trim();
  if (text === "Matter title") return "Matter 제목";
  if (text === "WIP status") return "청구 준비 상태";
  if (text === "Risk") return "위험도";
  if (text === "Risk level") return "위험도";
  if (text === "Status") return "상태";
  return text || "필드";
}

function riskLabel(value) {
  if (value === "standard") return "표준";
  if (value === "high") return "높음";
  if (value === "critical") return "중요";
  if (value === "low") return "낮음";
  return value ?? "미지정";
}

function clientReportSectionLabel(section, index = 0) {
  const text = String(section?.title ?? section?.section_id ?? "").trim();
  if (text === "Status" || text === "status") return "상태";
  if (text === "Internal" || text === "internal") return "내부";
  if (!text) return `구분 ${index + 1}`;
  return text;
}

function clientReportBodyLabel(section) {
  if (section?.section_id === "status") return matterStatus(section.body);
  return section?.body ?? "권한 기준 적용";
}

function moneyLabel(value, currency = "KRW") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "미지정";
  return `${currency} ${amount.toLocaleString("ko-KR")}`;
}

function dashboardTypeLabel(value) {
  if (value === "ar_aging") return "미수금 현황";
  if (value === "client_health") return "Client 상태";
  if (value === "practice_pnl") return "업무 손익";
  return "대시보드";
}

function dashboardStatusLabel(value) {
  if (value === "published") return "게시됨";
  if (value === "draft") return "초안";
  return "사용 중";
}

function dashboardMetricLabel(item) {
  if (item.dashboard_type === "ar_aging") return moneyLabel(item.metric_value, "KRW");
  if (item.dashboard_type === "client_health") return `${item.metric_value ?? 0}%`;
  return String(item.metric_value ?? "미지정");
}

function actionMessage(result, successText) {
  if (!result) return null;
  if (result.kind === "error") return "처리하지 못했습니다.";
  if (result.uiState === "approval_required") return "승인이 필요합니다.";
  if (result.uiState === "provider_blocked") return "설정과 승인이 필요합니다.";
  if (result.uiState === "blocked" || result.uiState === "review_required") return "검토가 필요합니다.";
  return successText;
}

function auditActionLabel(value) {
  if (value === "time.entry.create") return "시간 생성";
  if (value === "wip.generate") return "청구 준비 생성";
  if (value === "payment.import") return "수납 기록";
  if (value === "matter.open") return "Matter 개시";
  if (value === "matter.team.add") return "팀 추가";
  if (value === "matter.document.facade") return "문서 연결";
  if (value === "matter.status.transitioned") return "상태 완료";
  if (value === "matter.owner.assignment") return "책임자 지정";
  if (value === "matter.owner.change") return "책임자 변경";
  return value ? "기록됨" : "기록";
}

function auditTargetLabel(value) {
  if (value === "TimeEntry") return "시간";
  if (value === "Payment") return "수납";
  if (value === "Matter") return "Matter";
  if (value === "Document") return "문서";
  if (value === "MatterTeamMember") return "팀";
  return value ?? "레코드";
}

function ownerLabel(matter) {
  const display = String(matter?.owner_display_name ?? "").trim();
  if (display && !/synthetic|rp0|_[a-z0-9]/i.test(display)) return display;
  if (matter?.owner_employee_id || matter?.owner_user_id) return "지정됨";
  return "미지정";
}

function matterStageIndex(matter) {
  if (!matter) return 0;
  if (matter.status === "opening") return 1;
  if (matter.status === "closed") return 4;
  if (matter.wip_status === "opening_wip_clear" || matter.wip_status === "completed") return 4;
  return 3;
}

function renderCollectionState(result, noun) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>{noun} 목록을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>{noun} 목록을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  if (result.uiState === "denied") return <DesktopDeniedState />;
  if (result.uiState === "review_required" || result.outcome === "review_required") {
    return (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 {noun} 목록을 확인할 수 있습니다.
      </div>
    );
  }
  if (result.uiState === "empty" || resultItems(result).length === 0) {
    return (
      <div className="live-data-state live-data-empty">
        <strong>표시할 {noun}이 없습니다</strong>
      </div>
    );
  }
  return null;
}

function renderCommandState(result, matter) {
  if (!matter || result === null) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>Matter 현황을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error">
        <strong>Matter 현황을 불러오지 못했습니다</strong>
        새로고침하거나 Matter 연결 상태를 확인하세요.
      </div>
    );
  }
  if (result.uiState === "denied") return <DesktopDeniedState />;
  return null;
}

function MatterPath({ matter }) {
  const activeIndex = matterStageIndex(matter);
  return (
    <ol className="status-path" data-matter-status-path="true">
      {MATTER_PATH_STEPS.map((step, index) => (
        <li key={step} className={index <= activeIndex ? "complete" : ""}>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function MatterRecordPanel({
  matter,
  commandResult,
  timelineResult,
  deadlineResult,
  channelResult,
  billingCount,
  analyticsCount,
  inlineEditResult,
  inlineEditPending,
  onInlineEdit,
  ownerChangeResult,
  ownerChangePending,
  onOwnerChange,
  recordActionFieldsResult,
  recordActionAuditResult,
  recordActionUpdateResult,
  recordActionBulkResult,
  recordActionPending,
  recordActionBulkPending,
  onRecordActionFieldUpdate,
  onRecordActionOwnerBlocked
}) {
  const command = commandResult?.kind === "data" ? commandResult : null;
  const timelineEntries = timelineResult?.kind === "data" ? timelineResult.item?.visible_entries ?? [] : [];
  const deadlineCount = resultItems(deadlineResult).length;
  const channelCount = channelResult?.kind === "data" ? channelResult.item?.messages?.length ?? 0 : 0;
  const channelProviderState = channelResult?.kind === "data" ? channelResult.item?.provider_state?.external_send_state : null;
  const teamCount = command?.team?.length ?? matter?.team_member_count ?? 0;
  const vaultCount = command?.vaultSummary?.document_count ?? matter?.document_count ?? 0;
  const recordActionFields = recordActionFieldsResult?.kind === "data" && Array.isArray(recordActionFieldsResult.item?.fields) ? recordActionFieldsResult.item.fields : [];
  const recordActionAuditCount = resultItems(recordActionAuditResult).length;
  return (
    <aside className="record-side-panel" data-matter-record-workspace="right-panel">
      <div className="record-side-header">
        <span className="eyebrow">레코드</span>
        <strong>{matterNumberLabel(matter?.matter_number)}</strong>
      </div>
      <div className="property-grid tight">
        <Property label="상태" value={matter ? matterStatus(matter.status) : "대기"} />
        <Property label="청구" value={matter ? billingStatus(matter.wip_status) : "대기"} />
        <Property label="책임자" value={ownerLabel(matter)} />
        <Property label="팀" value={String(teamCount)} />
        <Property label="문서" value={String(vaultCount)} />
      </div>
      <div className="record-meter-grid">
        <div>
          <span>활동</span>
          <strong>{timelineEntries.length}</strong>
        </div>
        <div data-sf-b-w03-right-panel-deadline-highlight="true">
          <span>기한</span>
          <strong>{deadlineCount}</strong>
        </div>
        <div data-sf-b-w03-right-panel-channel-tab="true">
          <span>대화</span>
          <strong>{channelCount}</strong>
        </div>
        <div>
          <span>청구</span>
          <strong>{billingCount}</strong>
        </div>
        <div>
          <span>분석</span>
          <strong>{analyticsCount}</strong>
        </div>
      </div>
      <div className="record-action-strip" data-matter-record-inline-edit-action="true">
        <div>
          <strong>청구 상태</strong>
          <span>{matter ? billingStatus(matter.wip_status) : "대기"}</span>
          <ActionNotice
            pending={inlineEditPending}
            result={inlineEditResult}
            pendingText="필드를 저장 중입니다."
            successText="필드가 저장되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || inlineEditPending} onClick={onInlineEdit}>
          <Pencil size={15} />
          저장
        </button>
      </div>
      {inlineEditResult?.kind === "data" && inlineEditResult.fieldPatch && (
        <div className="record-boundary-note" data-matter-record-inline-edit-result="true">
          <ShieldCheck size={15} />
          <span>청구 상태 필드가 저장되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-matter-record-owner-change-action="true">
        <div>
          <strong>책임자</strong>
          <span>{ownerLabel(matter)}</span>
          <ActionNotice
            pending={ownerChangePending}
            result={ownerChangeResult}
            pendingText="책임자를 변경 중입니다."
            successText="책임자가 변경되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || ownerChangePending} onClick={onOwnerChange}>
          <UserCheck size={15} />
          변경
        </button>
      </div>
      {ownerChangeResult?.kind === "data" && ownerChangeResult.ownerAssignment && (
        <div className="record-boundary-note" data-matter-record-owner-change-result="true">
          <ShieldCheck size={15} />
          <span>책임자 변경이 기록되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-matter-record-actions="true">
        <div>
          <strong>레코드 필드</strong>
          <span>{recordActionFields.length > 0 ? recordActionFields.map((field) => recordFieldLabel(field.label)).join(" / ") : "허용 필드 확인 중"}</span>
          <ActionNotice
            pending={recordActionPending}
            result={recordActionUpdateResult}
            pendingText="레코드 필드를 업데이트 중입니다."
            successText="레코드 필드가 업데이트되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || recordActionPending} onClick={onRecordActionFieldUpdate}>
          <Pencil size={15} />
          필드 작업
        </button>
      </div>
      {recordActionUpdateResult?.kind === "data" && recordActionUpdateResult.fieldPatch && (
        <div className="record-boundary-note" data-sf-b-w02-matter-record-action-result="true">
          <ShieldCheck size={15} />
          <span>허용된 Matter 필드가 업데이트되었습니다.</span>
        </div>
      )}
      <div className="record-action-strip" data-sf-b-w02-matter-owner-blocked-action="true">
        <div>
          <strong>책임자 일괄 변경</strong>
          <span>{recordActionBulkResult?.uiState === "owner_blocked" ? "승인 필요" : "승인 조건 확인"}</span>
          <ActionNotice
            pending={recordActionBulkPending}
            result={recordActionBulkResult}
            pendingText="승인 조건을 확인 중입니다."
            successText="승인 필요 상태가 기록되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || recordActionBulkPending} onClick={onRecordActionOwnerBlocked}>
          <ShieldCheck size={15} />
          승인 확인
        </button>
      </div>
      {recordActionBulkResult?.uiState === "owner_blocked" && (
        <div className="record-boundary-note" data-sf-b-w02-matter-owner-blocked-result="true">
          <ShieldCheck size={15} />
          <span>승인 후 처리할 수 있습니다.</span>
        </div>
      )}
      <div className="record-boundary-note" data-sf-b-w02-matter-action-audit-feed="true">
        <ShieldCheck size={15} />
        <span>최근 작업 {recordActionAuditCount}건</span>
      </div>
      <div className="record-boundary-note" data-sf-b-w03-channel-provider-state="true">
        <ShieldCheck size={15} />
        <span>{channelProviderState === "provider_blocked" ? "외부 연동 승인 대기" : "내부 대화 준비"}</span>
      </div>
      <div className="record-boundary-note">
        <ShieldCheck size={15} />
        <span>권한 기준에 맞춰 표시됩니다.</span>
      </div>
    </aside>
  );
}

function RecentlyViewedPanel({ result }) {
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading" data-matter-recently-viewed="true">
        <strong>최근 본 Matter를 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-matter-recently-viewed="true">
        <strong>최근 본 Matter를 불러오지 못했습니다</strong>
      </div>
    );
  }
  const rows = resultItems(result);
  if (rows.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-matter-recently-viewed="true">
        <strong>최근 본 Matter가 없습니다</strong>
      </div>
    );
  }
  return (
    <div className="matter-live-stack" data-matter-recently-viewed="true">
      <div className="matter-review-strip">
        <ShieldCheck size={15} />
        <span>개인 작업 기록</span>
      </div>
      <DataTable
        columns={["최근 본 항목", "제목", "상태", "일시"]}
        rows={rows.map((item, index) => [
          matterNumberLabel(item.matter_number, index),
          matterTitleLabel(item.title, index),
          matterStatus(item.status),
          viewedAtLabel(item.viewed_at)
        ])}
      />
    </div>
  );
}

function MatterListViewPanel({
  result,
  activeListViewId,
  onSelectListView,
  onSaveListView,
  pending,
  actionResult
}) {
  const views = resultItems(result);
  return (
    <div className="matter-list-view-panel" data-matter-saved-list-views="true">
      <div className="matter-list-view-options" role="tablist" aria-label="Matter 저장 목록">
        {views.length === 0 && <span className="subtle-text">저장된 View 없음</span>}
        {views.map((view) => {
          const active = view.list_view_id === activeListViewId;
          return (
            <button
              key={view.list_view_id}
              type="button"
              className={active ? "matter-list-view-option active" : "matter-list-view-option"}
              role="tab"
              aria-selected={active}
              data-matter-list-view-option="true"
              data-active={active ? "true" : "false"}
              onClick={() => onSelectListView(view.list_view_id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      <div className="matter-list-view-actions">
        <ActionNotice
          pending={pending}
          result={actionResult}
          pendingText="View 저장 중입니다."
          successText="View가 저장되었습니다."
        />
        <button
          className="secondary-button"
          type="button"
          disabled={pending || result?.kind !== "data"}
          data-matter-save-list-view-action="true"
          onClick={onSaveListView}
        >
          <ListChecks size={15} />
          개시 저장
        </button>
      </div>
    </div>
  );
}

function MatterBulkActionBar({ selectedCount, pending, result, onComplete }) {
  return (
    <div className="matter-bulk-action-bar" data-matter-bulk-actions="true">
      <div>
        <strong>{selectedCount}개 선택</strong>
        <ActionNotice
          pending={pending}
          result={result}
          pendingText="일괄 완료 처리 중입니다."
          successText="선택 항목이 완료되었습니다."
        />
      </div>
      <button
        className="secondary-button"
        type="button"
        disabled={selectedCount === 0 || pending}
        data-matter-bulk-status-action="true"
        onClick={onComplete}
      >
        <CheckCircle2 size={15} />
        선택 완료
      </button>
    </div>
  );
}

function MatterSelectableList({
  matters,
  selectedMatterId,
  selectedMatterIds,
  onSelectMatter,
  onToggleMatter,
  onToggleAll
}) {
  const selectedSet = new Set(selectedMatterIds);
  const allVisibleSelected = matters.length > 0 && matters.every((item) => selectedSet.has(item.matter_id));
  return (
    <div className="matter-selectable-list" data-matter-selected-record-list="true" role="listbox" aria-label="Matter 레코드">
      <div className="matter-selectable-header">
        <span>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            disabled={matters.length === 0}
            aria-label="표시된 Matter 전체 선택"
            data-matter-bulk-select-all="true"
            onChange={(event) => onToggleAll(event.target.checked)}
          />
        </span>
        <span>Matter</span>
        <span>제목</span>
        <span>진행 상태</span>
        <span>청구 상태</span>
      </div>
      {matters.length === 0 && (
        <div className="live-data-state live-data-empty" data-matter-list-view-empty="true">
          <strong>조건에 맞는 Matter가 없습니다</strong>
        </div>
      )}
      {matters.map((item, index) => {
        const selected = item.matter_id === selectedMatterId;
        const checked = selectedSet.has(item.matter_id);
        return (
          <div
            key={item.matter_id ?? `${item.matter_number}-${index}`}
            className={selected ? "matter-selectable-row active" : "matter-selectable-row"}
            role="option"
            aria-selected={selected}
            data-matter-select-row="true"
            data-selected={selected ? "true" : "false"}
          >
            <label className="matter-bulk-check">
              <input
                type="checkbox"
                checked={checked}
                aria-label={`${matterNumberLabel(item.matter_number, index)} 선택`}
                data-matter-bulk-select-row="true"
                onChange={(event) => onToggleMatter(item.matter_id, event.target.checked)}
              />
            </label>
            <button
              type="button"
              className="matter-selectable-record-button"
              aria-pressed={selected}
              onClick={() => onSelectMatter(item.matter_id)}
            >
              <strong>{matterNumberLabel(item.matter_number, index)}</strong>
              <span>{matterTitleLabel(item.title, index)}</span>
              <span>{matterStatus(item.status)}</span>
              <span>{billingStatus(item.wip_status)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MattersTable({
  result,
  matters,
  selectedMatterId,
  onSelectMatter,
  recentResult,
  listViewResult,
  activeListViewId,
  onSelectListView,
  onSaveListView,
  listViewPending,
  listViewActionResult,
  selectedMatterIds,
  onToggleMatter,
  onToggleAll,
  bulkPending,
  bulkResult,
  onBulkComplete
}) {
  const state = renderCollectionState(result, "Matter");
  if (state) return state;
  return (
    <div className="matter-live-stack">
      <div className="matter-review-strip">
        <ShieldCheck size={15} />
        <span>새 Matter 개시는 승인 후 반영됩니다.</span>
      </div>
      <MatterListViewPanel
        result={listViewResult}
        activeListViewId={activeListViewId}
        onSelectListView={onSelectListView}
        onSaveListView={onSaveListView}
        pending={listViewPending}
        actionResult={listViewActionResult}
      />
      <MatterBulkActionBar
        selectedCount={selectedMatterIds.length}
        pending={bulkPending}
        result={bulkResult}
        onComplete={onBulkComplete}
      />
      <MatterSelectableList
        matters={matters}
        selectedMatterId={selectedMatterId}
        selectedMatterIds={selectedMatterIds}
        onSelectMatter={onSelectMatter}
        onToggleMatter={onToggleMatter}
        onToggleAll={onToggleAll}
      />
      <RecentlyViewedPanel result={recentResult} />
    </div>
  );
}

function CommandPanel({ result, matter, statusResult, statusPending, onCompleteStatus }) {
  const state = renderCommandState(result, matter);
  if (state) return state;
  const item = result.item ?? matter;
  const completed = item?.status === "closed";
  return (
    <div className="record-detail-stack">
      <MatterPath matter={item} />
      <div className="record-action-strip" data-matter-status-transition-action="true">
        <div>
          <strong>{completed ? "완료됨" : "상태"}</strong>
          <span>{completed ? "Matter가 완료 상태입니다" : "다음 단계로 완료 처리"}</span>
          <ActionNotice
            pending={statusPending}
            result={statusResult}
            pendingText="완료 처리 중입니다."
            successText="상태가 완료되었습니다."
          />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || completed || statusPending} onClick={onCompleteStatus}>
          <CheckCircle2 size={15} />
          완료
        </button>
      </div>
      <div className="record-summary-grid">
        <Property label="제목" value={matterTitleLabel(item.title)} />
        <Property label="Client" value={item.legal_client_party_id || item.client_id ? "연결됨" : "미지정"} />
        <Property label="위험도" value={riskLabel(item.risk_level)} />
        <Property label="Vault" value={result.vaultLink?.vault_workspace_id || item.vault_workspace_id ? "연결됨" : "미연결"} />
      </div>
      <DataTable
        columns={["구분", "값", "표시"]}
        rows={(result.clientReport?.sections ?? []).map((section, index) => [
          clientReportSectionLabel(section, index),
          clientReportBodyLabel(section),
          section.client_visible ? "Client" : "내부"
        ])}
      />
    </div>
  );
}

function TimelinePanel({ result }) {
  const [activeFilter, setActiveFilter] = useState("all");
  if (result === null) {
    return (
      <div className="live-data-state live-data-loading" data-matter-activity-timeline="true">
        <strong>활동을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-matter-activity-timeline="true">
        <strong>활동을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  const entries = result.item?.visible_entries ?? [];
  if (entries.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-matter-activity-timeline="true">
        <strong>표시할 활동이 없습니다</strong>
      </div>
    );
  }
  const counts = entries.reduce(
    (acc, entry) => {
      const category = timelineCategory(entry);
      acc.all += 1;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    { all: 0, matter: 0, document: 0, schedule: 0, message: 0 }
  );
  const safeFilter = TIMELINE_FILTERS.some((filter) => filter.id === activeFilter) ? activeFilter : "all";
  const visibleEntries = safeFilter === "all" ? entries : entries.filter((entry) => timelineCategory(entry) === safeFilter);
  return (
    <div className="activity-timeline-panel" data-matter-activity-timeline="true">
      <div className="matter-review-strip" data-matter-activity-read-boundary="true">
        <ShieldCheck size={15} />
        <span>권한 기준 활동 기록</span>
      </div>
      <div className="activity-filter-tabs" data-matter-activity-filters="true">
        {TIMELINE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const count = counts[filter.id] ?? 0;
          return (
            <button
              key={filter.id}
              type="button"
              className={safeFilter === filter.id ? "active" : ""}
              disabled={filter.id !== "all" && count === 0}
              onClick={() => setActiveFilter(filter.id)}
            >
              <Icon size={14} />
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <div className="activity-timeline-list">
        {visibleEntries.map((entry, index) => (
          <article key={entry.event_id ?? `${entry.occurred_at}-${index}`} className="activity-timeline-item">
            <span className={`activity-dot ${timelineCategory(entry)}`} />
            <div>
              <div className="activity-item-header">
                <strong>{timelineTitleLabel(entry, index)}</strong>
                <span>{timelineTimeLabel(entry.occurred_at)}</span>
              </div>
              <div className="activity-item-meta">
                <span>{timelineTypeLabel(entry)}</span>
                <span>{timelineSourceLabel(entry)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <DataTable
        columns={["일시", "유형", "제목", "범위"]}
        rows={visibleEntries.map((entry, index) => [
          timelineTimeLabel(entry.occurred_at),
          timelineTypeLabel(entry),
          timelineTitleLabel(entry, index),
          timelineSourceLabel(entry)
        ])}
      />
    </div>
  );
}

function ActivityWorkspacePanel({
  activityResult,
  timelineResult,
  createResult,
  patchResult,
  createPending,
  patchPending,
  onCreateActivity,
  onPatchActivity,
  activityType = "task",
  actionLabel = "작업",
  createButtonLabel = "작업 추가",
  createTitle = "증거 검토 작업",
  bodyText = null
}) {
  const activities = resultItems(activityResult);
  const targetActivity = activities.find((item) => item.activity_type === activityType) ?? createResult?.item ?? activities[0] ?? null;
  return (
    <div className="matter-live-stack" data-sf-b-w03-activity-workspace="true" data-lcx-vltui-06-activity-type={activityType}>
      <div className="record-action-grid" data-sf-b-w03-activity-composer="true">
        <div className="record-action-strip">
          <div>
            <strong>{actionLabel}</strong>
            <span>{targetActivity ? activityStatusLabel(targetActivity.status) : `새 ${actionLabel}`}</span>
            <ActionNotice
              pending={createPending}
              result={createResult}
              pendingText={`${actionLabel}을 기록 중입니다.`}
              successText={`${actionLabel}이 기록되었습니다.`}
            />
          </div>
          <button
            className="secondary-button"
            type="button"
            disabled={createPending}
            onClick={() => onCreateActivity({ activityType, title: createTitle, bodyText })}
          >
            <ListChecks size={15} />
            {createButtonLabel}
          </button>
        </div>
        <div className="record-action-strip">
          <div>
            <strong>상태</strong>
            <span>{targetActivity ? activityStatusLabel(targetActivity.status) : "작업 선택"}</span>
            <ActionNotice
              pending={patchPending}
              result={patchResult}
              pendingText="상태를 저장 중입니다."
              successText="상태가 저장되었습니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={!targetActivity || patchPending} onClick={() => onPatchActivity(targetActivity)}>
            <Pencil size={15} />
            상태 저장
          </button>
        </div>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-sf-b-w03-activity-create-result="true">
          <ShieldCheck size={15} />
          <span>활동이 감사 이력과 활동 이력에 기록되었습니다.</span>
        </div>
      )}
      {patchResult?.kind === "data" && patchResult.item && (
        <div className="record-boundary-note" data-sf-b-w03-activity-patch-result="true">
          <ShieldCheck size={15} />
          <span>활동 상태가 저장되었습니다.</span>
        </div>
      )}
      <TimelinePanel result={timelineResult} />
      <DataTable
        columns={["활동", "상태", "일시", "전송"]}
        rows={activities.map((item, index) => [
          activityTitleLabel(item.title, index),
          activityStatusLabel(item.status),
          timelineTimeLabel(item.due_at),
          providerStateLabel(item.external_send_state)
        ])}
      />
    </div>
  );
}

function CalendarWorkspacePanel({
  calendarResult,
  deadlineResult,
  createResult,
  approvalResult,
  confirmResult,
  createPending,
  approvalPending,
  confirmPending,
  onCreateCalendarEvent,
  onRequestDeadlineChange,
  onConfirmDeadlineChange
}) {
  const events = resultItems(calendarResult);
  const deadlines = resultItems(deadlineResult);
  const targetEvent = events.find((item) => item.criticality === "critical") ?? createResult?.item ?? events[0] ?? null;
  const pendingDeadlineId = approvalResult?.deadlineChangeRequest?.event_id ?? targetEvent?.event_id ?? deadlines[0]?.deadline_id;
  return (
    <div className="matter-live-stack" data-sf-b-w03-calendar-workspace="true">
      <div className="record-action-grid">
        <div className="record-action-strip" data-sf-b-w03-calendar-create-action="true">
          <div>
            <strong>일정</strong>
            <span>{targetEvent ? providerStateLabel(targetEvent.provider_sync_state) : "기한 추가"}</span>
            <ActionNotice
              pending={createPending}
              result={createResult}
              pendingText="일정을 기록 중입니다."
              successText="일정이 기록되었습니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={createPending} onClick={onCreateCalendarEvent}>
            <CalendarClock size={15} />
            일정 추가
          </button>
        </div>
        <div className="record-action-strip" data-sf-b-w03-deadline-approval-action="true">
          <div>
            <strong>기한 변경</strong>
            <span>{approvalResult?.uiState === "approval_required" ? "승인 필요" : "이중 확인"}</span>
            <ActionNotice
              pending={approvalPending}
              result={approvalResult}
              pendingText="기한 변경을 요청 중입니다."
              successText="승인 필요 상태가 기록되었습니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={!targetEvent || approvalPending} onClick={() => onRequestDeadlineChange(targetEvent)}>
            <ShieldCheck size={15} />
            변경 요청
          </button>
        </div>
        <div className="record-action-strip" data-sf-b-w03-deadline-confirm-action="true">
          <div>
            <strong>확인</strong>
            <span>{confirmResult?.confirmation?.dual_control_satisfied ? "확인됨" : "대기"}</span>
            <ActionNotice
              pending={confirmPending}
              result={confirmResult}
              pendingText="확인 중입니다."
              successText="기한 변경이 확인되었습니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={!pendingDeadlineId || confirmPending} onClick={() => onConfirmDeadlineChange(pendingDeadlineId)}>
            <CheckCircle2 size={15} />
            확인
          </button>
        </div>
      </div>
      {createResult?.kind === "data" && createResult.item && (
        <div className="record-boundary-note" data-sf-b-w03-calendar-create-result="true">
          <ShieldCheck size={15} />
          <span>일정이 Matter 기록에 연결되었습니다.</span>
        </div>
      )}
      {approvalResult?.uiState === "approval_required" && (
        <div className="record-boundary-note" data-sf-b-w03-deadline-approval-result="true">
          <ShieldCheck size={15} />
          <span>중요 기한 변경은 승인 후 확정됩니다.</span>
        </div>
      )}
      {confirmResult?.confirmation?.dual_control_satisfied && (
        <div className="record-boundary-note" data-sf-b-w03-deadline-confirm-result="true">
          <ShieldCheck size={15} />
          <span>다른 확인자 기준으로 기한 변경이 확정되었습니다.</span>
        </div>
      )}
      <div data-sf-b-w03-deadline-board="true">
        <DataTable
          columns={["일정", "기한", "중요도", "연동"]}
          rows={events.map((item, index) => [
            activityTitleLabel(item.title, index),
            timelineTimeLabel(item.starts_at),
            item.criticality === "critical" ? "중요" : "표준",
            providerStateLabel(item.provider_sync_state)
          ])}
        />
      </div>
      <DataTable
        columns={["기한", "일시", "확인", "상태"]}
        rows={deadlines.map((item, index) => [
          activityTitleLabel(item.title, index),
          timelineTimeLabel(item.due_at),
          item.dual_control_required ? "필요" : "불필요",
          activityStatusLabel(item.status)
        ])}
      />
    </div>
  );
}

function ChannelWorkspacePanel({
  channelResult,
  messageResult,
  providerResult,
  messagePending,
  providerPending,
  onCreateMessage,
  onProviderSync
}) {
  const channel = channelResult?.kind === "data" ? channelResult.item : null;
  const messages = channel?.messages ?? [];
  return (
    <div className="matter-live-stack" data-sf-b-w03-channel-workspace="true">
      <div className="record-action-grid" data-sf-b-w03-channel-composer="true">
        <div className="record-action-strip">
          <div>
            <strong>메시지</strong>
            <span>{messages.length > 0 ? `${messages.length}건` : "내부 기록"}</span>
            <ActionNotice
              pending={messagePending}
              result={messageResult}
              pendingText="메시지를 기록 중입니다."
              successText="메시지가 기록되었습니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={messagePending} onClick={onCreateMessage}>
            <MessageSquare size={15} />
            메시지 기록
          </button>
        </div>
        <div className="record-action-strip">
          <div>
            <strong>외부 연동</strong>
            <span>{providerStateLabel(providerResult?.providerState?.external_send_state ?? channel?.provider_state?.external_send_state)}</span>
            <ActionNotice
              pending={providerPending}
              result={providerResult}
              pendingText="연동 상태를 확인 중입니다."
              successText="연동 승인 대기 상태입니다."
            />
          </div>
          <button className="secondary-button" type="button" disabled={providerPending} onClick={onProviderSync}>
            <ShieldCheck size={15} />
            상태 확인
          </button>
        </div>
      </div>
      {messageResult?.kind === "data" && messageResult.item && (
        <div className="record-boundary-note" data-sf-b-w03-channel-message-result="true">
          <ShieldCheck size={15} />
          <span>메시지가 내부 대화에 기록되었습니다.</span>
        </div>
      )}
      {(providerResult?.uiState === "provider_blocked" || channel?.provider_state?.external_send_state === "provider_blocked") && (
        <div className="record-boundary-note" data-sf-b-w03-provider-blocked-result="true">
          <ShieldCheck size={15} />
          <span>외부 연동은 승인과 설정이 필요합니다.</span>
        </div>
      )}
      <DataTable
        columns={["메시지", "작성", "상태"]}
        rows={messages.map((item, index) => [
          item.safe_message_excerpt || `메시지 ${index + 1}`,
          timelineTimeLabel(item.created_at),
          providerStateLabel(item.external_send_state)
        ])}
      />
    </div>
  );
}

function AuditTrailPanel({ result, events = [], marker = "matter-audit-trail" }) {
  if (result === null && events.length === 0) {
    return (
      <div className="live-data-state live-data-loading" data-audit-trail={marker}>
        <strong>감사 이력을 불러오는 중입니다</strong>
      </div>
    );
  }
  if (result?.kind === "error") {
    return (
      <div className="live-data-state live-data-error" data-audit-trail={marker}>
        <strong>감사 이력을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  const seen = new Set();
  const rows = [...events, ...resultItems(result)]
    .filter(Boolean)
    .filter((event) => {
      const key = event.event_id ?? `${event.action}:${event.object_type}:${event.object_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
  if (rows.length === 0) {
    return (
      <div className="live-data-state live-data-empty" data-audit-trail={marker}>
        <strong>표시할 감사 이력이 없습니다</strong>
      </div>
    );
  }
  return (
    <div data-audit-trail={marker}>
      <DataTable
        columns={["이벤트", "대상", "상태"]}
        rows={rows.map((event) => [
          auditActionLabel(event.action),
          auditTargetLabel(event.object_type),
          event.production_ready_claim === true ? "검토 필요" : "기록됨"
        ])}
      />
    </div>
  );
}

function ActionNotice({ pending, result, pendingText, successText }) {
  if (pending) return <small>{pendingText}</small>;
  const message = actionMessage(result, successText);
  return message ? <small>{message}</small> : null;
}

function BillingActionPanel({
  matter,
  timeEntryResult,
  wipResult,
  paymentResult,
  timeEntryPending,
  wipPending,
  paymentPending,
  onCreateTimeEntry,
  onGenerateWip,
  onImportPayment
}) {
  const timeEntry = timeEntryResult?.kind === "data" ? timeEntryResult.item : null;
  const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
  const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
  return (
    <div className="record-action-grid" data-matter-billing-actions="true">
      <div className="record-action-strip" data-matter-time-entry-action="true">
        <div>
          <strong>{timeEntry ? `${timeEntry.duration_minutes ?? 0}분` : "시간"}</strong>
          <span>{timeEntry ? "시간 기록됨" : "Matter 작업"}</span>
          <ActionNotice pending={timeEntryPending} result={timeEntryResult} pendingText="시간 기록 중입니다." successText="시간이 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || timeEntryPending} onClick={onCreateTimeEntry}>
          시간 기록
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{wipItems.length > 0 ? moneyLabel(wipItems[0]?.amount, wipItems[0]?.currency ?? "KRW") : "청구 준비"}</strong>
          <span>{wipItems.length > 0 ? "청구 준비됨" : "승인 시간 기준"}</span>
          <ActionNotice pending={wipPending} result={wipResult} pendingText="청구 준비 중입니다." successText="청구 준비가 생성되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || wipPending} onClick={onGenerateWip}>
          청구 준비
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>{payment ? moneyLabel(payment.amount, payment.currency ?? "KRW") : "수납"}</strong>
          <span>{payment ? "수납 기록됨" : "청구 잔액 기준"}</span>
          <ActionNotice pending={paymentPending} result={paymentResult} pendingText="수납 기록 중입니다." successText="수납이 기록되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || paymentPending} onClick={onImportPayment}>
          수납 기록
        </button>
      </div>
    </div>
  );
}

function BillingPanel({
  timeResult,
  invoiceResult,
  agingResult,
  financeAuditResult,
  matter,
  matterId,
  timeEntryResult,
  wipResult,
  paymentResult,
  timeEntryPending,
  wipPending,
  paymentPending,
  onCreateTimeEntry,
  onGenerateWip,
  onImportPayment
}) {
  const loading = timeResult === null || invoiceResult === null || agingResult === null;
  if (loading) {
    return (
      <div className="live-data-state live-data-loading">
        <strong>청구 정보를 불러오는 중입니다</strong>
      </div>
    );
  }
  if ([timeResult, invoiceResult, agingResult].some((result) => result.kind === "error")) {
    return (
      <div className="live-data-state live-data-error">
        <strong>청구 정보를 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  }
  const timeRows = resultItems(timeResult).filter((item) => !matterId || item.matter_id === matterId);
  const invoiceRows = resultItems(invoiceResult).filter((item) => !matterId || item.matter_id === matterId);
  const agingRows = resultItems(agingResult).filter((item) => !matterId || item.matter_id === matterId);
  const actionPanel = (
      <BillingActionPanel
        matter={matter}
        timeEntryResult={timeEntryResult}
        wipResult={wipResult}
        paymentResult={paymentResult}
        timeEntryPending={timeEntryPending}
        wipPending={wipPending}
        paymentPending={paymentPending}
        onCreateTimeEntry={onCreateTimeEntry}
        onGenerateWip={onGenerateWip}
        onImportPayment={onImportPayment}
    />
  );
  if (timeRows.length + invoiceRows.length + agingRows.length === 0) {
    return (
      <div className="workspace-mini-grid">
        {actionPanel}
        <div className="live-data-state live-data-empty">
          <strong>표시할 청구 정보가 없습니다</strong>
        </div>
      </div>
    );
  }
  return (
    <div className="workspace-mini-grid">
      {actionPanel}
      <DataTable
        columns={["시간", "일자", "상태", "분"]}
        rows={timeRows.map((item, index) => [
          `시간 ${index + 1}`,
          item.work_date ?? "미지정",
          billingStatus(item.status),
          String(item.duration_minutes ?? 0)
        ])}
      />
      <DataTable
        columns={["청구서", "상태", "금액", "통화"]}
        rows={invoiceRows.map((item, index) => [
          `청구서 ${index + 1}`,
          billingStatus(item.status),
          moneyLabel(item.amount_due, item.currency ?? "KRW"),
          item.currency ?? "KRW"
        ])}
      />
      {agingRows.length > 0 && (
        <DataTable
          columns={["미수금", "상태", "잔액"]}
          rows={agingRows.map((item, index) => [
            `미수금 ${index + 1}`,
            billingStatus(item.status),
            moneyLabel(item.balance ?? item.balance_total, "KRW")
          ])}
        />
      )}
      <AuditTrailPanel
        result={financeAuditResult}
        events={[timeEntryResult?.auditEvent, wipResult?.auditEvent, paymentResult?.auditEvent].filter(Boolean)}
        marker="matter-finance-audit-trail"
      />
    </div>
  );
}

function AnalyticsActionPanel({
  matter,
  dashboardCount,
  invoiceRows,
  wipResult,
  paymentResult,
  refreshResult,
  exportResult,
  profitabilityActionResult,
  refreshPending,
  exportPending,
  profitabilityPending,
  onRefresh,
  onExport,
  onProfitability
}) {
  const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
  const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
  const canRefreshProfitability = Boolean(matter && wipItems.length > 0 && invoiceRows.length > 0 && payment);
  const canExport = Boolean(matter && dashboardCount > 0);
  const exportReady = exportResult?.kind === "data" && exportResult.item;
  return (
    <div className="record-action-grid" data-matter-analytics-actions="true">
      <div className="record-action-strip">
        <div>
          <strong>대시보드</strong>
          <span>{refreshResult?.kind === "data" ? "새로고침됨" : "게시 지표"}</span>
          <ActionNotice pending={refreshPending} result={refreshResult} pendingText="새로고침 중입니다." successText="대시보드가 갱신되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!matter || refreshPending} onClick={onRefresh}>
          새로고침
        </button>
      </div>
      <div className="record-action-strip" data-matter-analytics-export-action="true">
        <div>
          <strong>내보내기</strong>
          <span>{exportReady ? "검토 대기" : "안전 내보내기"}</span>
          <ActionNotice pending={exportPending} result={exportResult} pendingText="내보내기 요청 중입니다." successText="내보내기 검토가 생성되었습니다." />
          {exportReady && (
            <small data-matter-analytics-export-safe-state="true">
              세부 Matter와 인증 정보는 포함하지 않습니다.
            </small>
          )}
        </div>
        <button className="secondary-button" type="button" disabled={!canExport || exportPending} onClick={onExport}>
          내보내기
        </button>
      </div>
      <div className="record-action-strip">
        <div>
          <strong>손익</strong>
          <span>{canRefreshProfitability ? "증거 준비됨" : "청구 준비/수납 필요"}</span>
          <ActionNotice pending={profitabilityPending} result={profitabilityActionResult} pendingText="손익 갱신 중입니다." successText="손익이 갱신되었습니다." />
        </div>
        <button className="secondary-button" type="button" disabled={!canRefreshProfitability || profitabilityPending} onClick={onProfitability}>
          손익 갱신
        </button>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  result,
  profitabilityResult,
  matter,
  invoiceRows,
  wipResult,
  paymentResult,
  refreshResult,
  exportResult,
  profitabilityActionResult,
  refreshPending,
  exportPending,
  profitabilityPending,
  onRefresh,
  onExport,
  onProfitability
}) {
  const state = renderCollectionState(result, "분석");
  if (state) return state;
  const matterId = matter?.matter_id;
  const dashboards = resultItems(result);
  const profitabilityRows = resultItems(profitabilityResult).filter((item) => !matterId || item.matter_id === matterId);
  return (
    <div className="workspace-mini-grid">
      <AnalyticsActionPanel
        matter={matter}
        dashboardCount={dashboards.length}
        invoiceRows={invoiceRows}
        wipResult={wipResult}
        paymentResult={paymentResult}
        refreshResult={refreshResult}
        exportResult={exportResult}
        profitabilityActionResult={profitabilityActionResult}
        refreshPending={refreshPending}
        exportPending={exportPending}
        profitabilityPending={profitabilityPending}
        onRefresh={onRefresh}
        onExport={onExport}
        onProfitability={onProfitability}
      />
      <DataTable
        columns={["대시보드", "유형", "지표", "상태"]}
        rows={dashboards.map((item) => [
          item.title ?? item.dashboard_id,
          dashboardTypeLabel(item.dashboard_type),
          dashboardMetricLabel(item),
          dashboardStatusLabel(item.status)
        ])}
      />
      {profitabilityRows.length > 0 && (
        <DataTable
          columns={["Matter", "표준", "수금", "손익"]}
          rows={profitabilityRows.map((item, index) => [
            matter?.matter_number ?? `Matter ${index + 1}`,
            moneyLabel(item.standard_value, "KRW"),
            moneyLabel(item.collected_value, "KRW"),
            moneyLabel(item.profitability_amount, "KRW")
          ])}
        />
      )}
    </div>
  );
}

export function MattersSurface({ labels, liveCtx = "allow", activeSection = "", onNavigateSection = () => {} }) {
  const [result, setResult] = useState(null);
  const [commandResult, setCommandResult] = useState(null);
  const [timelineResult, setTimelineResult] = useState(null);
  const [timeResult, setTimeResult] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [agingResult, setAgingResult] = useState(null);
  const [matterAuditResult, setMatterAuditResult] = useState(null);
  const [financeAuditResult, setFinanceAuditResult] = useState(null);
  const [analyticsResult, setAnalyticsResult] = useState(null);
  const [profitabilityResult, setProfitabilityResult] = useState(null);
  const [timeEntryResult, setTimeEntryResult] = useState(null);
  const [wipResult, setWipResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [analyticsRefreshResult, setAnalyticsRefreshResult] = useState(null);
  const [analyticsExportResult, setAnalyticsExportResult] = useState(null);
  const [profitabilityActionResult, setProfitabilityActionResult] = useState(null);
  const [statusTransitionResult, setStatusTransitionResult] = useState(null);
  const [recentResult, setRecentResult] = useState(null);
  const [listViewResult, setListViewResult] = useState(null);
  const [listViewActionResult, setListViewActionResult] = useState(null);
  const [bulkTransitionResult, setBulkTransitionResult] = useState(null);
  const [inlineEditResult, setInlineEditResult] = useState(null);
  const [ownerChangeResult, setOwnerChangeResult] = useState(null);
  const [recordActionFieldsResult, setRecordActionFieldsResult] = useState(null);
  const [recordActionAuditResult, setRecordActionAuditResult] = useState(null);
  const [recordActionUpdateResult, setRecordActionUpdateResult] = useState(null);
  const [recordActionBulkResult, setRecordActionBulkResult] = useState(null);
  const [activityResult, setActivityResult] = useState(null);
  const [activityCreateResult, setActivityCreateResult] = useState(null);
  const [activityPatchResult, setActivityPatchResult] = useState(null);
  const [calendarResult, setCalendarResult] = useState(null);
  const [calendarCreateResult, setCalendarCreateResult] = useState(null);
  const [deadlineResult, setDeadlineResult] = useState(null);
  const [deadlineApprovalResult, setDeadlineApprovalResult] = useState(null);
  const [deadlineConfirmResult, setDeadlineConfirmResult] = useState(null);
  const [channelResult, setChannelResult] = useState(null);
  const [channelMessageResult, setChannelMessageResult] = useState(null);
  const [channelProviderResult, setChannelProviderResult] = useState(null);
  const [legalPeopleMatterResult, setLegalPeopleMatterResult] = useState(null);
  const [timeEntryPending, setTimeEntryPending] = useState(false);
  const [wipPending, setWipPending] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [analyticsRefreshPending, setAnalyticsRefreshPending] = useState(false);
  const [analyticsExportPending, setAnalyticsExportPending] = useState(false);
  const [profitabilityPending, setProfitabilityPending] = useState(false);
  const [statusTransitionPending, setStatusTransitionPending] = useState(false);
  const [listViewPending, setListViewPending] = useState(false);
  const [bulkTransitionPending, setBulkTransitionPending] = useState(false);
  const [inlineEditPending, setInlineEditPending] = useState(false);
  const [ownerChangePending, setOwnerChangePending] = useState(false);
  const [recordActionPending, setRecordActionPending] = useState(false);
  const [recordActionBulkPending, setRecordActionBulkPending] = useState(false);
  const [activityCreatePending, setActivityCreatePending] = useState(false);
  const [activityPatchPending, setActivityPatchPending] = useState(false);
  const [calendarCreatePending, setCalendarCreatePending] = useState(false);
  const [deadlineApprovalPending, setDeadlineApprovalPending] = useState(false);
  const [deadlineConfirmPending, setDeadlineConfirmPending] = useState(false);
  const [channelMessagePending, setChannelMessagePending] = useState(false);
  const [channelProviderPending, setChannelProviderPending] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createdItems, setCreatedItems] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState(null);
  const [selectedMatterIds, setSelectedMatterIds] = useState([]);
  const [activeListViewId, setActiveListViewId] = useState(null);
  const currentSection = MATTER_SECTIONS.has(activeSection) ? activeSection : "matter-home";

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchMatterRecords({
      ctx: liveCtx,
      permissionRef: MATTER_PERMISSION_REF,
      auditHintRef: MATTER_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setListViewResult(null);
    fetchMatterListViews({ ctx: liveCtx }).then((next) => {
      if (!cancelled) setListViewResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const matters = useMemo(() => {
    const fetched = result?.kind === "data" ? result.items : [];
    const byId = new Map();
    for (const item of createdItems) byId.set(item.matter_id, item);
    for (const item of fetched) {
      if (!byId.has(item.matter_id)) byId.set(item.matter_id, item);
    }
    return [...byId.values()];
  }, [createdItems, result]);
  const listViews = resultItems(listViewResult);
  const activeListView = listViews.find((item) => item.list_view_id === activeListViewId) ?? listViews[0] ?? null;
  const visibleMatters = useMemo(() => applyMatterListView(matters, activeListView), [matters, activeListView]);
  const selectedMatter = visibleMatters.find((item) => item.matter_id === selectedMatterId) ?? visibleMatters[0] ?? null;
  const activeMatterId = selectedMatter?.matter_id ?? null;

  useEffect(() => {
    let cancelled = false;
    setRecordActionFieldsResult(null);
    setRecordActionAuditResult(null);
    Promise.all([
      fetchRecordActionFields({ objectName: "matter", ctx: liveCtx }),
      activeMatterId ? fetchRecordActionAudit({ objectName: "matter", recordId: activeMatterId, ctx: liveCtx }) : Promise.resolve({ kind: "data", items: [] })
    ]).then(([fields, audit]) => {
      if (cancelled) return;
      setRecordActionFieldsResult(fields);
      setRecordActionAuditResult(audit);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, activeMatterId]);

  useEffect(() => {
    const visibleIds = new Set(visibleMatters.map((item) => item.matter_id));
    setSelectedMatterIds((current) => current.filter((matterId) => visibleIds.has(matterId)));
  }, [visibleMatters]);

  useEffect(() => {
    if (listViews.length === 0) {
      if (activeListViewId !== null) setActiveListViewId(null);
      return;
    }
    if (!listViews.some((item) => item.list_view_id === activeListViewId)) {
      setActiveListViewId(listViews[0].list_view_id);
    }
  }, [activeListViewId, listViews]);

  useEffect(() => {
    if (visibleMatters.length === 0) {
      if (selectedMatterId !== null) setSelectedMatterId(null);
      return;
    }
    if (!visibleMatters.some((item) => item.matter_id === selectedMatterId)) {
      setSelectedMatterId(visibleMatters[0].matter_id);
    }
  }, [visibleMatters, selectedMatterId]);

  useEffect(() => {
    let cancelled = false;
    setLegalPeopleMatterResult(null);
    fetchLegalPeopleSearch({ matter_id: "matter_lcx_001" }).then((next) => {
      if (!cancelled) setLegalPeopleMatterResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatterId, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setCommandResult(null);
    setTimelineResult(null);
    setTimeResult(null);
    setInvoiceResult(null);
    setAgingResult(null);
    setMatterAuditResult(null);
    setFinanceAuditResult(null);
    setAnalyticsResult(null);
    setProfitabilityResult(null);
    setStatusTransitionResult(null);
    setInlineEditResult(null);
    setOwnerChangeResult(null);
    setActivityResult(null);
    setActivityCreateResult(null);
    setActivityPatchResult(null);
    setCalendarResult(null);
    setCalendarCreateResult(null);
    setDeadlineResult(null);
    setDeadlineApprovalResult(null);
    setDeadlineConfirmResult(null);
    setChannelResult(null);
    setChannelMessageResult(null);
    setChannelProviderResult(null);
    if (!activeMatterId) return undefined;
    Promise.all([
      fetchMatterCommandCenter({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterTimeline({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterActivities({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterCalendarEvents({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterDeadlines({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterChannel({ matterId: activeMatterId, ctx: liveCtx }),
      fetchFinanceTimeEntries({ ctx: liveCtx }),
      fetchFinanceInvoices({ ctx: liveCtx }),
      fetchFinanceArAging({ ctx: liveCtx }),
      fetchMatterAudit({ ctx: liveCtx }),
      fetchFinanceAudit({ ctx: liveCtx }),
      fetchAnalyticsDashboards({ ctx: liveCtx }),
      fetchAnalyticsMatterProfitability({ ctx: liveCtx })
    ]).then(([command, timeline, activities, calendar, deadlines, channel, time, invoices, aging, matterAudit, financeAudit, analytics, profitability]) => {
      if (cancelled) return;
      setCommandResult(command);
      setTimelineResult(timeline);
      setActivityResult(activities);
      setCalendarResult(calendar);
      setDeadlineResult(deadlines);
      setChannelResult(channel);
      setTimeResult(time);
      setInvoiceResult(invoices);
      setAgingResult(aging);
      setMatterAuditResult(matterAudit);
      setFinanceAuditResult(financeAudit);
      setAnalyticsResult(analytics);
      setProfitabilityResult(profitability);
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatterId, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setRecentResult(null);
    if (!activeMatterId) return undefined;
    markMatterRecentlyViewed({ matterId: activeMatterId, ctx: liveCtx })
      .then(() => fetchMatterRecentlyViewed({ ctx: liveCtx }))
      .then((next) => {
        if (!cancelled) setRecentResult(next);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMatterId, liveCtx, refreshToken]);

  const billingCount =
    resultItems(timeResult).filter((item) => item.matter_id === activeMatterId).length +
    resultItems(invoiceResult).filter((item) => item.matter_id === activeMatterId).length +
    resultItems(agingResult).filter((item) => item.matter_id === activeMatterId).length;
  const analyticsCount = resultItems(analyticsResult).length;
  const selectedInvoices = resultItems(invoiceResult).filter((item) => item.matter_id === activeMatterId);

  async function handleCreateTimeEntry() {
    if (!activeMatterId) return;
    setTimeEntryPending(true);
    const next = await createFinanceTimeEntry({ matterId: activeMatterId, ctx: liveCtx });
    setTimeEntryResult(next);
    setTimeEntryPending(false);
    if (next.kind === "data" && next.item) {
      setTimeResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.time_entry_id !== next.item.time_entry_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  async function handleCompleteStatus() {
    if (!activeMatterId) return;
    setStatusTransitionPending(true);
    const next = await completeMatterStatus({ matterId: activeMatterId, ctx: liveCtx });
    setStatusTransitionResult(next);
    setStatusTransitionPending(false);
    if (next.kind === "data" && next.item) {
      setSelectedMatterId(next.item.matter_id);
      setCreatedItems((current) => [
        next.item,
        ...current.filter((item) => item.matter_id !== next.item.matter_id)
      ]);
      setResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.matter_id !== next.item.matter_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
      setCommandResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        item: next.item
      }));
    }
  }

  function applyMatterUpdate(nextMatter) {
    if (!nextMatter) return;
    setSelectedMatterId(nextMatter.matter_id);
    setCreatedItems((current) => [
      nextMatter,
      ...current.filter((item) => item.matter_id !== nextMatter.matter_id)
    ]);
    setResult((current) => {
      const currentItems = resultItems(current).filter((item) => item.matter_id !== nextMatter.matter_id);
      return {
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: [nextMatter, ...currentItems]
      };
    });
    setCommandResult((current) => (
      current?.kind === "data"
        ? { ...current, item: nextMatter }
        : current
    ));
  }

  function applyMatterUpdates(nextMatters = []) {
    if (nextMatters.length === 0) return;
    const byId = new Map(nextMatters.map((item) => [item.matter_id, item]));
    setCreatedItems((current) => [
      ...nextMatters,
      ...current.filter((item) => !byId.has(item.matter_id))
    ]);
    setResult((current) => {
      const currentItems = resultItems(current).filter((item) => !byId.has(item.matter_id));
      return {
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: [...nextMatters, ...currentItems]
      };
    });
    setCommandResult((current) => (
      current?.kind === "data" && byId.has(current.item?.matter_id)
        ? { ...current, item: byId.get(current.item.matter_id) }
        : current
    ));
  }

  function handleToggleMatter(matterId, checked) {
    setSelectedMatterIds((current) => {
      const next = new Set(current);
      if (checked) next.add(matterId);
      else next.delete(matterId);
      return [...next];
    });
  }

  function handleToggleAllVisible(checked) {
    if (!checked) {
      setSelectedMatterIds([]);
      return;
    }
    setSelectedMatterIds(visibleMatters.map((item) => item.matter_id));
  }

  async function handleBulkCompleteStatus() {
    if (selectedMatterIds.length === 0) return;
    setBulkTransitionPending(true);
    const next = await bulkCompleteMatterStatus({ matterIds: selectedMatterIds, ctx: liveCtx });
    setBulkTransitionResult(next);
    setBulkTransitionPending(false);
    if (next.kind === "data" && next.items.length > 0) {
      applyMatterUpdates(next.items);
      setSelectedMatterId(next.items[0].matter_id);
      setSelectedMatterIds([]);
    }
  }

  async function handleInlineEdit() {
    if (!activeMatterId) return;
    setInlineEditPending(true);
    const next = await updateMatterInlineFields({
      matterId: activeMatterId,
      fieldUpdates: { wip_status: "review_required" },
      ctx: liveCtx
    });
    setInlineEditResult(next);
    setInlineEditPending(false);
    if (next.kind === "data" && next.item) {
      applyMatterUpdate(next.item);
    }
  }

  async function handleOwnerChange() {
    if (!activeMatterId) return;
    setOwnerChangePending(true);
    const next = await changeMatterOwner({ matterId: activeMatterId, ctx: liveCtx });
    setOwnerChangeResult(next);
    setOwnerChangePending(false);
    if (next.kind === "data" && next.item) {
      applyMatterUpdate(next.item);
    }
  }

  async function handleRecordActionFieldUpdate() {
    if (!activeMatterId) return;
    setRecordActionPending(true);
    const next = await updateRecordActionField({
      objectName: "matter",
      recordId: activeMatterId,
      fieldUpdates: { risk_level: "elevated" },
      ctx: liveCtx
    });
    setRecordActionUpdateResult(next);
    setRecordActionPending(false);
    if (next.kind === "data" && next.item) {
      applyMatterUpdate({
        ...selectedMatter,
        matter_id: activeMatterId,
        risk_level: next.item.risk_level ?? selectedMatter?.risk_level,
        title: next.item.title ?? selectedMatter?.title,
        status: next.item.status ?? selectedMatter?.status,
      });
      const audit = await fetchRecordActionAudit({ objectName: "matter", recordId: activeMatterId, ctx: liveCtx });
      setRecordActionAuditResult(audit);
    }
  }

  async function handleRecordActionOwnerBlocked() {
    if (!activeMatterId) return;
    setRecordActionBulkPending(true);
    const next = await bulkUpdateRecordActions({
      objectName: "matter",
      recordIds: [activeMatterId],
      actionType: "owner_change",
      ctx: liveCtx
    });
    setRecordActionBulkResult(next);
    setRecordActionBulkPending(false);
  }

  async function refreshMatterActivitySurfaces() {
    if (!activeMatterId) return;
    const [timeline, activities, calendar, deadlines, channel] = await Promise.all([
      fetchMatterTimeline({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterActivities({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterCalendarEvents({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterDeadlines({ matterId: activeMatterId, ctx: liveCtx }),
      fetchMatterChannel({ matterId: activeMatterId, ctx: liveCtx })
    ]);
    setTimelineResult(timeline);
    setActivityResult(activities);
    setCalendarResult(calendar);
    setDeadlineResult(deadlines);
    setChannelResult(channel);
  }

  async function handleCreateActivity({ activityType = "task", title = "증거 검토 작업", status = "todo", bodyText = null } = {}) {
    if (!activeMatterId) return;
    setActivityCreatePending(true);
    const next = await createMatterActivity({
      matterId: activeMatterId,
      activityType,
      title,
      status,
      bodyText,
      ctx: liveCtx
    });
    setActivityCreateResult(next);
    setActivityCreatePending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handlePatchActivity(activity) {
    const activityId = activity?.activity_id;
    if (!activeMatterId || !activityId) return;
    setActivityPatchPending(true);
    const next = await patchMatterActivity({
      matterId: activeMatterId,
      activityId,
      patch: { status: activity.status === "todo" ? "in_progress" : activity.status },
      ctx: liveCtx
    });
    setActivityPatchResult(next);
    setActivityPatchPending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleCreateCalendarEvent() {
    if (!activeMatterId) return;
    setCalendarCreatePending(true);
    const next = await createMatterCalendarEvent({
      matterId: activeMatterId,
      title: "주요 제출 기한",
      criticality: "critical",
      legalConsequence: "court_deadline",
      ctx: liveCtx
    });
    setCalendarCreateResult(next);
    setCalendarCreatePending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleRequestDeadlineChange(event) {
    if (!activeMatterId || !event?.event_id) return;
    setDeadlineApprovalPending(true);
    const baseTime = Number.isNaN(Date.parse(event.starts_at)) ? Date.now() : new Date(event.starts_at).getTime();
    const startsAt = new Date(baseTime + 86400000).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + 3600000).toISOString();
    const next = await patchMatterCalendarEvent({
      matterId: activeMatterId,
      eventId: event.event_id,
      patch: { starts_at: startsAt, ends_at: endsAt },
      ctx: liveCtx
    });
    setDeadlineApprovalResult(next);
    setDeadlineApprovalPending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleConfirmDeadlineChange(deadlineId) {
    if (!activeMatterId || !deadlineId) return;
    setDeadlineConfirmPending(true);
    const next = await confirmMatterDeadlineChange({
      matterId: activeMatterId,
      deadlineId,
      ctx: liveCtx
    });
    setDeadlineConfirmResult(next);
    setDeadlineConfirmPending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleCreateChannelMessage() {
    if (!activeMatterId) return;
    setChannelMessagePending(true);
    const next = await createMatterChannelMessage({
      matterId: activeMatterId,
      message: "내부 준비 상황을 기록합니다.",
      ctx: liveCtx
    });
    setChannelMessageResult(next);
    setChannelMessagePending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleChannelProviderSync() {
    if (!activeMatterId) return;
    setChannelProviderPending(true);
    const next = await syncMatterChannelProvider({ matterId: activeMatterId, ctx: liveCtx });
    setChannelProviderResult(next);
    setChannelProviderPending(false);
    if (next.kind === "data") {
      await refreshMatterActivitySurfaces();
    }
  }

  async function handleSaveOpeningListView() {
    setListViewPending(true);
    const next = await saveMatterListView({
      label: "개시 Matter",
      status: "opening",
      listViewId: "matter_view_user_opening",
      ctx: liveCtx
    });
    setListViewActionResult(next);
    setListViewPending(false);
    if (next.kind === "data" && next.item) {
      setActiveListViewId(next.item.list_view_id);
      setListViewResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.list_view_id !== next.item.list_view_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  async function handleGenerateWip() {
    if (!activeMatterId) return;
    setWipPending(true);
    const next = await generateFinanceWip({ matterId: activeMatterId, ctx: liveCtx });
    setWipResult(next);
    setWipPending(false);
  }

  async function handleImportPayment() {
    if (!activeMatterId) return;
    setPaymentPending(true);
    const amount = Number(selectedInvoices[0]?.amount_due ?? selectedInvoices[0]?.invoice_total ?? 100000);
    const currency = selectedInvoices[0]?.currency ?? "KRW";
    const next = await importFinancePayment({ matterId: activeMatterId, amount, currency, ctx: liveCtx });
    setPaymentResult(next);
    setPaymentPending(false);
  }

  async function handleAnalyticsRefresh() {
    if (!activeMatterId) return;
    setAnalyticsRefreshPending(true);
    const next = await refreshAnalyticsDashboards({ ctx: liveCtx });
    setAnalyticsRefreshResult(next);
    setAnalyticsRefreshPending(false);
    if (next.kind === "data" && next.items.length > 0) {
      setAnalyticsResult((current) => ({
        ...(current?.kind === "data" ? current : {}),
        kind: "data",
        items: next.items
      }));
    }
  }

  async function handleAnalyticsExport() {
    if (!activeMatterId) return;
    const dashboards = resultItems(analyticsResult);
    if (dashboards.length === 0) return;
    setAnalyticsExportPending(true);
    const next = await createAnalyticsExport({
      dashboardId: dashboards[0].dashboard_id,
      ctx: liveCtx
    });
    setAnalyticsExportResult(next);
    setAnalyticsExportPending(false);
  }

  async function handleProfitabilityRefresh() {
    const wipItems = wipResult?.kind === "data" ? wipResult.items : [];
    const payment = paymentResult?.kind === "data" ? paymentResult.item : null;
    if (!activeMatterId || wipItems.length === 0 || selectedInvoices.length === 0 || !payment) return;
    setProfitabilityPending(true);
    const next = await refreshMatterProfitability({
      matterId: activeMatterId,
      wipItems,
      invoices: selectedInvoices,
      payments: [payment],
      ctx: liveCtx
    });
    setProfitabilityActionResult(next);
    setProfitabilityPending(false);
    if (next.kind === "data" && next.item) {
      setProfitabilityResult((current) => {
        const currentItems = resultItems(current).filter((item) => item.matter_id !== next.item.matter_id);
        return {
          ...(current?.kind === "data" ? current : {}),
          kind: "data",
          items: [next.item, ...currentItems]
        };
      });
    }
  }

  const connectedMatterSection = MATTER_CONNECTED_SECTIONS[currentSection];
  const matterAccessState =
    result?.uiState === "denied" || result?.uiState === "review_required" || result?.outcome === "review_required"
      ? renderCollectionState(result, "사건")
      : null;

  function renderConnectedMatterContent(config) {
    if (["matter-closeout", "matter-archive"].includes(currentSection)) {
      return (
        <LifecycleBoundaryPanel
          commandResult={commandResult}
          matter={selectedMatter}
          statusResult={statusTransitionResult}
          statusPending={statusTransitionPending}
          onCompleteStatus={handleCompleteStatus}
          matterAuditResult={matterAuditResult}
        />
      );
    }
    if (currentSection === "matter-tasks") {
      return (
        <ActivityWorkspacePanel
          activityResult={activityResult}
          timelineResult={timelineResult}
          createResult={activityCreateResult}
          patchResult={activityPatchResult}
          createPending={activityCreatePending}
          patchPending={activityPatchPending}
          onCreateActivity={handleCreateActivity}
          onPatchActivity={handlePatchActivity}
        />
      );
    }
    if (currentSection === "matter-notes") {
      return (
        <ActivityWorkspacePanel
          activityResult={activityResult}
          timelineResult={timelineResult}
          createResult={activityCreateResult}
          patchResult={activityPatchResult}
          createPending={activityCreatePending}
          patchPending={activityPatchPending}
          onCreateActivity={handleCreateActivity}
          onPatchActivity={handlePatchActivity}
          activityType="note"
          actionLabel="메모"
          createButtonLabel="메모 추가"
          createTitle="검토 의견"
          bodyText="내부 검토 의견"
        />
      );
    }
    if (["matter-evidence", "matter-templates"].includes(currentSection)) {
      return (
        <div className="workspace-mini-grid" data-lcx-vltui-06-vault-backed-shortcuts={config.marker}>
          <VaultShortcutPanel label={config.title} onOpenVault={() => onNavigateSection("matter-vault")} />
          <div
            className="record-boundary-note"
            data-lcx-vltui-06-vault-preflight-required="true"
            data-lcx-vltui-06-owner-blocked="true"
          >
            <ShieldCheck size={15} />
            <span>문서 바이트나 저장 경로를 표시하지 않고 LCX-VLTUI-03 문서 사전검사로 이동합니다.</span>
          </div>
        </div>
      );
    }
    if (["matter-seal", "matter-approvals"].includes(currentSection)) {
      return (
        <ApprovalBoundaryPanel
          marker={config.marker}
          recordActionBulkResult={recordActionBulkResult}
          recordActionBulkPending={recordActionBulkPending}
          onRecordActionOwnerBlocked={handleRecordActionOwnerBlocked}
          channelProviderResult={channelProviderResult}
          channelProviderPending={channelProviderPending}
          onProviderSync={handleChannelProviderSync}
        />
      );
    }
    if (currentSection === "matter-client-requests") {
      return (
        <div className="workspace-mini-grid" data-lcx-vltui-06-client-requests-connected="true">
          <ChannelWorkspacePanel
            channelResult={channelResult}
            messageResult={channelMessageResult}
            providerResult={channelProviderResult}
            messagePending={channelMessagePending}
            providerPending={channelProviderPending}
            onCreateMessage={handleCreateChannelMessage}
            onProviderSync={handleChannelProviderSync}
          />
          <ApprovalBoundaryPanel
            marker={config.marker}
            recordActionBulkResult={recordActionBulkResult}
            recordActionBulkPending={recordActionBulkPending}
            onRecordActionOwnerBlocked={handleRecordActionOwnerBlocked}
            channelProviderResult={channelProviderResult}
            channelProviderPending={channelProviderPending}
            onProviderSync={handleChannelProviderSync}
          />
        </div>
      );
    }
    if (currentSection === "matter-meetings") {
      return (
        <div className="workspace-mini-grid" data-lcx-vltui-06-meetings-connected="true">
          <CalendarWorkspacePanel
            calendarResult={calendarResult}
            deadlineResult={deadlineResult}
            createResult={calendarCreateResult}
            approvalResult={deadlineApprovalResult}
            confirmResult={deadlineConfirmResult}
            createPending={calendarCreatePending}
            approvalPending={deadlineApprovalPending}
            confirmPending={deadlineConfirmPending}
            onCreateCalendarEvent={handleCreateCalendarEvent}
            onRequestDeadlineChange={handleRequestDeadlineChange}
            onConfirmDeadlineChange={handleConfirmDeadlineChange}
          />
          <ChannelWorkspacePanel
            channelResult={channelResult}
            messageResult={channelMessageResult}
            providerResult={channelProviderResult}
            messagePending={channelMessagePending}
            providerPending={channelProviderPending}
            onCreateMessage={handleCreateChannelMessage}
            onProviderSync={handleChannelProviderSync}
          />
        </div>
      );
    }
    if (currentSection === "matter-announcements") {
      return (
        <ChannelWorkspacePanel
          channelResult={channelResult}
          messageResult={channelMessageResult}
          providerResult={channelProviderResult}
          messagePending={channelMessagePending}
          providerPending={channelProviderPending}
          onCreateMessage={handleCreateChannelMessage}
          onProviderSync={handleChannelProviderSync}
        />
      );
    }
    if (currentSection === "matter-expenses") {
      return (
        <div className="workspace-mini-grid" data-lcx-vltui-06-expenses-connected="true">
          <BillingPanel
            timeResult={timeResult}
            invoiceResult={invoiceResult}
            agingResult={agingResult}
            financeAuditResult={financeAuditResult}
            matter={selectedMatter}
            matterId={activeMatterId}
            timeEntryResult={timeEntryResult}
            wipResult={wipResult}
            paymentResult={paymentResult}
            timeEntryPending={timeEntryPending}
            wipPending={wipPending}
            paymentPending={paymentPending}
            onCreateTimeEntry={handleCreateTimeEntry}
            onGenerateWip={handleGenerateWip}
            onImportPayment={handleImportPayment}
          />
          <div className="record-boundary-note" data-lcx-vltui-06-expense-finance-boundary="true">
            <ShieldCheck size={15} />
            <span>외부 지급이나 청구서 발송은 공급자 승인 기록 없이는 실행하지 않습니다.</span>
          </div>
        </div>
      );
    }
    if (["matter-search", "matter-risk"].includes(currentSection)) {
      return (
        <SearchRiskPanel
          marker={config.marker}
          matter={selectedMatter}
          timelineResult={timelineResult}
          matterAuditResult={matterAuditResult}
          recordActionFieldsResult={recordActionFieldsResult}
          recordActionUpdateResult={recordActionUpdateResult}
          recordActionPending={recordActionPending}
          onRecordActionFieldUpdate={handleRecordActionFieldUpdate}
        />
      );
    }
    if (["matter-integrations", "matter-settings"].includes(currentSection)) {
      return (
        <IntegrationsSettingsPanel
          marker={config.marker}
          channelResult={channelResult}
          channelProviderResult={channelProviderResult}
          channelProviderPending={channelProviderPending}
          onProviderSync={handleChannelProviderSync}
          recordActionFieldsResult={recordActionFieldsResult}
          recordActionUpdateResult={recordActionUpdateResult}
          recordActionPending={recordActionPending}
          onRecordActionFieldUpdate={handleRecordActionFieldUpdate}
        />
      );
    }
    if (currentSection === "matter-import") {
      return (
        <div
          className="record-boundary-note"
          data-lcx-vltui-06-import-lifecycle="dry-run-guarded-execute"
          data-lcx-vltui-06-import-execute-blocked="true"
        >
          <ShieldCheck size={15} />
          <span>가져오기는 안전한 사전 검증과 오류 보고서까지 열고, 실제 실행은 승인 전 차단합니다.</span>
        </div>
      );
    }
    return null;
  }

  return (
    <section id="matters-home" className="surface stack matters-surface" data-cmp-g4-live-matters="true">
      <PageHeader
        title={labels.mattersTitle}
        subtitle="사건 상태, 담당자·참여자, 문서, 일정, 결재·청구 흐름을 확인합니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <nav className="matter-section-tabs" aria-label="Matter 업무 탭">
        {MATTER_WORK_TABS.map((tab) => (
          <button
            key={tab.section}
            type="button"
            className={currentSection === tab.section ? "active" : ""}
            onClick={() => onNavigateSection(tab.section)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="matter-runtime-grid record-workspace" data-salesforce-matter-workspace="list-detail-right-panel">
        {currentSection === "matter-home" && (
          <Panel id="matter-home" className="record-list-panel" title="홈" meta="사건 운영">
            {matterAccessState ?? (
              <CommandPanel
                result={commandResult}
                matter={selectedMatter}
                statusResult={statusTransitionResult}
                statusPending={statusTransitionPending}
                onCompleteStatus={handleCompleteStatus}
              />
            )}
          </Panel>
        )}
        {currentSection === "matters-list" && (
          <Panel id="matters-list" className="record-list-panel" title="사건 목록" meta="권한 기준 적용">
            <MattersTable
              result={result}
              matters={visibleMatters}
              selectedMatterId={activeMatterId}
              onSelectMatter={setSelectedMatterId}
              recentResult={recentResult}
              listViewResult={listViewResult}
              activeListViewId={activeListView?.list_view_id ?? null}
              onSelectListView={setActiveListViewId}
              onSaveListView={handleSaveOpeningListView}
              listViewPending={listViewPending}
              listViewActionResult={listViewActionResult}
              selectedMatterIds={selectedMatterIds}
              onToggleMatter={handleToggleMatter}
              onToggleAll={handleToggleAllVisible}
              bulkPending={bulkTransitionPending}
              bulkResult={bulkTransitionResult}
              onBulkComplete={handleBulkCompleteStatus}
            />
          </Panel>
        )}
        {["matter-intake", "matter-command"].includes(currentSection) && (
          <Panel id={currentSection} className="record-list-panel" title="수임 진행" meta="진행 관리">
            {matterAccessState ?? (
              <>
                <CommandPanel
                  result={commandResult}
                  matter={selectedMatter}
                  statusResult={statusTransitionResult}
                  statusPending={statusTransitionPending}
                  onCompleteStatus={handleCompleteStatus}
                />
                <AuditTrailPanel
                  result={matterAuditResult}
                  events={[statusTransitionResult?.auditEvent].filter(Boolean)}
                  marker="matter-command-audit-trail"
                />
              </>
            )}
          </Panel>
        )}
        {currentSection === "matter-vault" && <MatterVaultPanel matterId={activeMatterId} liveCtx={liveCtx} />}
        {["matter-board", "matter-timeline"].includes(currentSection) && (
          <Panel id={currentSection} className="record-list-panel" title="업무 보드" meta="업무·활동 이력">
            <ActivityWorkspacePanel
              activityResult={activityResult}
              timelineResult={timelineResult}
              createResult={activityCreateResult}
              patchResult={activityPatchResult}
              createPending={activityCreatePending}
              patchPending={activityPatchPending}
              onCreateActivity={handleCreateActivity}
              onPatchActivity={handlePatchActivity}
            />
          </Panel>
        )}
        {currentSection === "matter-calendar" && (
          <Panel id="matter-calendar" className="record-list-panel" title="일정" meta="일정 관리">
            <CalendarWorkspacePanel
              calendarResult={calendarResult}
              deadlineResult={deadlineResult}
              createResult={calendarCreateResult}
              approvalResult={deadlineApprovalResult}
              confirmResult={deadlineConfirmResult}
              createPending={calendarCreatePending}
              approvalPending={deadlineApprovalPending}
              confirmPending={deadlineConfirmPending}
              onCreateCalendarEvent={handleCreateCalendarEvent}
              onRequestDeadlineChange={handleRequestDeadlineChange}
              onConfirmDeadlineChange={handleConfirmDeadlineChange}
            />
          </Panel>
        )}
        {currentSection === "matter-external-schedule" && (
          <Panel id="matter-external-schedule" className="record-list-panel" title="외부 일정" meta="법원·검찰·우체국·관공서">
            <CalendarWorkspacePanel
              calendarResult={calendarResult}
              deadlineResult={deadlineResult}
              createResult={calendarCreateResult}
              approvalResult={deadlineApprovalResult}
              confirmResult={deadlineConfirmResult}
              createPending={calendarCreatePending}
              approvalPending={deadlineApprovalPending}
              confirmPending={deadlineConfirmPending}
              onCreateCalendarEvent={handleCreateCalendarEvent}
              onRequestDeadlineChange={handleRequestDeadlineChange}
              onConfirmDeadlineChange={handleConfirmDeadlineChange}
            />
            <DataTable
              columns={["유형", "업무", "관리 필드"]}
              rows={MATTER_EXTERNAL_SCHEDULE_ROWS}
            />
          </Panel>
        )}
        {currentSection === "matter-channel" && (
          <Panel id="matter-channel" className="record-list-panel" title="이메일·메시지" meta="소통">
            <ChannelWorkspacePanel
              channelResult={channelResult}
              messageResult={channelMessageResult}
              providerResult={channelProviderResult}
              messagePending={channelMessagePending}
              providerPending={channelProviderPending}
              onCreateMessage={handleCreateChannelMessage}
              onProviderSync={handleChannelProviderSync}
            />
          </Panel>
        )}
        {currentSection === "matter-opening" && (
          <MatterOpeningWizard
            liveCtx={liveCtx}
            onCreated={(item) => {
              setCreatedItems((current) => [...current, item]);
              setSelectedMatterId(item.matter_id);
            }}
          />
        )}
        {currentSection === "matter-team" && (
          <>
            <MatterTeamRoster matters={matters} liveCtx={liveCtx} onMatterUpdated={applyMatterUpdate} />
            <LegalMatterPeopleBacklinkPanel result={legalPeopleMatterResult} />
          </>
        )}
        {["matter-time", "matter-billing", "matter-ar"].includes(currentSection) && (
          <Panel
            id={currentSection}
            className="record-list-panel"
            title={currentSection === "matter-time" ? "시간 기록" : currentSection === "matter-ar" ? "미수금" : "청구 내역"}
            meta="결재·청구"
          >
            <BillingPanel
              timeResult={timeResult}
              invoiceResult={invoiceResult}
              agingResult={agingResult}
              financeAuditResult={financeAuditResult}
              matter={selectedMatter}
              matterId={activeMatterId}
              timeEntryResult={timeEntryResult}
              wipResult={wipResult}
              paymentResult={paymentResult}
              timeEntryPending={timeEntryPending}
              wipPending={wipPending}
              paymentPending={paymentPending}
              onCreateTimeEntry={handleCreateTimeEntry}
              onGenerateWip={handleGenerateWip}
              onImportPayment={handleImportPayment}
            />
          </Panel>
        )}
        {currentSection === "matter-analytics" && (
          <Panel id="matter-analytics" className="record-list-panel" title="사건 리포트" meta="리포트·관리">
            <AnalyticsPanel
              result={analyticsResult}
              profitabilityResult={profitabilityResult}
              matter={selectedMatter}
              invoiceRows={selectedInvoices}
              wipResult={wipResult}
              paymentResult={paymentResult}
              refreshResult={analyticsRefreshResult}
              exportResult={analyticsExportResult}
              profitabilityActionResult={profitabilityActionResult}
              refreshPending={analyticsRefreshPending}
              exportPending={analyticsExportPending}
              profitabilityPending={profitabilityPending}
              onRefresh={handleAnalyticsRefresh}
              onExport={handleAnalyticsExport}
              onProfitability={handleProfitabilityRefresh}
            />
          </Panel>
        )}
        {currentSection === "matter-import" && (
          <>
            <Panel id="matter-import-guard" className="record-list-panel" title={connectedMatterSection.title} meta={connectedMatterSection.meta}>
              <ConnectedMatterSection sectionId={currentSection} config={connectedMatterSection}>
                {renderConnectedMatterContent(connectedMatterSection)}
              </ConnectedMatterSection>
            </Panel>
            <ImportDataMappingPanel ctx={liveCtx} surface="matter" />
          </>
        )}
        {currentSection === "matter-audit" && (
          <AuditTrailPanel
            result={matterAuditResult}
            events={[statusTransitionResult?.auditEvent].filter(Boolean)}
            marker="matter-command-audit-trail"
          />
        )}
        {connectedMatterSection && currentSection !== "matter-import" && (
          <Panel id={currentSection} className="record-list-panel" title={connectedMatterSection.title} meta={connectedMatterSection.meta}>
            <ConnectedMatterSection sectionId={currentSection} config={connectedMatterSection}>
              {renderConnectedMatterContent(connectedMatterSection)}
            </ConnectedMatterSection>
          </Panel>
        )}
        {currentSection !== "matter-opening" && (
          <MatterRecordPanel
            matter={selectedMatter}
            commandResult={commandResult}
            timelineResult={timelineResult}
            deadlineResult={deadlineResult}
            channelResult={channelResult}
            billingCount={billingCount}
            analyticsCount={analyticsCount}
            inlineEditResult={inlineEditResult}
            inlineEditPending={inlineEditPending}
            onInlineEdit={handleInlineEdit}
            ownerChangeResult={ownerChangeResult}
            ownerChangePending={ownerChangePending}
            onOwnerChange={handleOwnerChange}
            recordActionFieldsResult={recordActionFieldsResult}
            recordActionAuditResult={recordActionAuditResult}
            recordActionUpdateResult={recordActionUpdateResult}
            recordActionBulkResult={recordActionBulkResult}
            recordActionPending={recordActionPending}
            recordActionBulkPending={recordActionBulkPending}
            onRecordActionFieldUpdate={handleRecordActionFieldUpdate}
            onRecordActionOwnerBlocked={handleRecordActionOwnerBlocked}
          />
        )}
      </div>
    </section>
  );
}
