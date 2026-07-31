import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Building2, LockKeyhole, Network, Scale, Search, ShieldAlert, UsersRound } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import { fetchLegalPeopleEthics, fetchLegalPeopleRelationships, fetchLegalPeopleSearch, fetchLegalPersonDetail } from "../hrxApiClient.ts";
import { memberPhotoFor } from "../memberPhotos.js";
import { safePeopleLabel, UNRESOLVED_EMPLOYEE_LABEL } from "../peoplePresentation.ts";

const TYPE_FILTERS = [
  { id: "", label: "전체", icon: UsersRound },
  { id: "internal_lawyer", label: "내부 변호사", icon: Scale },
  { id: "client_contact", label: "Client", icon: Building2 },
  { id: "opposing_counsel", label: "상대 대리인", icon: ShieldAlert },
  { id: "expert_witness", label: "전문가", icon: Network },
  { id: "regulator_contact", label: "규제기관", icon: LockKeyhole }
];

const MODE_META = {
  directory: {
    title: "Matter 참여자 확인",
    meta: "관련 기록"
  },
  relationships: {
    title: "관련 기록",
    meta: "관련 기록"
  },
  conflicts: {
    title: "이해상충 검토",
    meta: "검토 필요"
  }
};

function statusLabel(value) {
  if (value === "active") return "활성";
  if (value === "review_required") return "검토 필요";
  if (value === "blocked") return "차단";
  if (value === "historical") return "이력";
  if (value === "proposed") return "검토 전";
  if (value === "inactive") return "비활성";
  return "상태 확인 필요";
}

function relationshipLabel(value) {
  const labels = {
    person_to_organization_affiliation: "조직 소속",
    person_to_client_contact: "Client 연락처",
    person_to_matter_participation: "Matter 참여",
    person_to_person_relationship: "참여자 관련 기록",
    person_to_document_reference: "문서 참조",
    person_to_conflict_subject: "이해상충 대상",
    person_to_ethical_wall_membership: "접근 제한"
  };
  return labels[value] ?? "관련 기록";
}

function reviewStateLabel(value) {
  if (value === "pending_review") return "검토 대기";
  if (value === "reviewed") return "검토됨";
  if (value === "escalated") return "상향 검토";
  if (value === "blocked") return "차단";
  return "상태 확인 필요";
}

function reviewTypeLabel(value) {
  if (value === "conflict_check") return "이해상충";
  if (value === "ethical_wall") return "접근 제한";
  return "검토 기록";
}

function priorityLabel(value) {
  if (value === "urgent") return "긴급";
  if (value === "high") return "높음";
  if (value === "normal") return "보통";
  return "보통";
}

const TARGET_RECORD_LABELS = {
  person: "참여자 기록",
  organization: "조직 기록",
  client: "Client 기록",
  matter: "Matter 기록",
  document: "문서 기록",
  conflict: "이해상충 기록",
  ethical_wall: "접근 제한 기록",
};

const RELATED_RECORD_LABELS = {
  person: "참여자 관련 기록",
  organization: "조직 관련 기록",
  client: "Client 관련 기록",
  matter: "Matter 관련 기록",
  document: "문서 관련 기록",
  conflict: "이해상충 관련 기록",
  ethical_wall: "접근 제한 관련 기록",
};

const REVIEWER_ROLE_LABELS = {
  conflicts_reviewer: "이해상충 검토자",
  legal_ops: "법무 운영 담당자",
  security_admin: "보안 관리자",
  matter_admin: "Matter 관리자",
  responsible_attorney: "담당 변호사",
};

const REASON_LABELS = {
  relationship_sensitive: "관계 정보 보호",
  conflict_check: "이해상충 확인",
  ethical_wall: "접근 제한 확인",
  reviewer_required: "검토자 확인 필요",
};

const ACCESS_EFFECT_LABELS = {
  restrict: "접근 제한",
  allow_limited: "제한적 접근",
  review_required: "검토 후 결정",
  blocked: "접근 차단",
};

const DECISION_LABELS = {
  allow_limited_reference: "제한적 참조 허용",
  escalate: "상향 검토",
  block_access: "접근 차단",
  needs_human_review: "사람 검토 필요",
  restricted_reference: "제한된 기록",
};

function safeDisplayLabel(value, identifiers = [], fallback = "확인 필요") {
  return safePeopleLabel(value, { identifiers, fallback });
}

function personLabel(person) {
  return safeDisplayLabel(person?.display_name, [person?.person_id], UNRESOLVED_EMPLOYEE_LABEL);
}

function personTypeLabel(person) {
  return safeDisplayLabel(person?.korean_label, [person?.type_id], "참여자");
}

function personRoleLabel(person) {
  return safeDisplayLabel(person?.primary_role, [person?.person_id], "역할 미등록");
}

function organizationLabel(person) {
  return safeDisplayLabel(person?.organization_label, [person?.organization_id], "조직 미등록");
}

function firstSafeValue(items, field, identifierField, fallback = "없음") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items
    .map((item) => safeDisplayLabel(item?.[field], [item?.[identifierField]], ""))
    .filter(Boolean)
    .join(", ") || fallback;
}

function recordLabel(value, fallback = "관련 기록") {
  const prefix = typeof value === "string" ? value.trim().split(":", 1)[0].toLowerCase() : "";
  return RELATED_RECORD_LABELS[prefix] ?? fallback;
}

function reviewerRoleLabel(value) {
  return REVIEWER_ROLE_LABELS[value] ?? "검토 담당자";
}

function reasonLabel(value) {
  return REASON_LABELS[value] ?? "보호 사유 확인 필요";
}

function accessEffectLabel(value) {
  return ACCESS_EFFECT_LABELS[value] ?? "접근 상태 확인 필요";
}

function decisionLabel(value) {
  return DECISION_LABELS[value] ?? "사람 검토 필요";
}

function targetLabel(relationship) {
  if (relationship.access_state === "restricted") return "권한 제한";
  if (!relationship.target_id) return "관련 기록 없음";
  return TARGET_RECORD_LABELS[relationship.target_type] ?? "관련 기록";
}

function modeFilters(mode) {
  if (mode === "conflicts") return ["counterparty", "opposing_counsel", "internal_lawyer"];
  return null;
}

export function LegalPeopleWorkspace({ mode = "directory", refreshKey = 0, liveCtx = "allow" }) {
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [detailResult, setDetailResult] = useState(null);
  const [relationshipResult, setRelationshipResult] = useState(null);
  const [ethicsResult, setEthicsResult] = useState(null);
  const config = MODE_META[mode] ?? MODE_META.directory;

  const filters = useMemo(() => ({ query, type_id: typeId }), [query, typeId]);

  useEffect(() => {
    let cancelled = false;
    setSearchResult(null);
    fetchLegalPeopleSearch({ ...filters, ctx: liveCtx }).then((next) => {
      if (cancelled) return;
      const allowedTypes = modeFilters(mode);
      const people = next.kind === "data" && allowedTypes
        ? next.people.filter((person) => allowedTypes.includes(person.type_id))
        : next.kind === "data"
          ? next.people
          : [];
      setSearchResult(next.kind === "data" ? { ...next, people } : next);
      if (people.length > 0 && !people.some((person) => person.person_id === selectedPersonId)) {
        setSelectedPersonId(people[0].person_id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filters, liveCtx, mode, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setDetailResult(null);
    fetchLegalPersonDetail(selectedPersonId, { ctx: liveCtx }).then((next) => {
      if (!cancelled) setDetailResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, selectedPersonId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setRelationshipResult(null);
    fetchLegalPeopleRelationships({ ...(selectedPersonId ? { person_id: selectedPersonId } : {}), ctx: liveCtx }).then((next) => {
      if (!cancelled) setRelationshipResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, selectedPersonId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setEthicsResult(null);
    fetchLegalPeopleEthics({ ...(selectedPersonId ? { person_id: selectedPersonId } : {}), ctx: liveCtx }).then((next) => {
      if (!cancelled) setEthicsResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, selectedPersonId, refreshKey]);

  const people = searchResult?.kind === "data" ? searchResult.people : [];
  const detail = detailResult?.kind === "data" && detailResult.person ? detailResult : null;
  const relationships = detail?.relationships ?? (relationshipResult?.kind === "data" ? relationshipResult.relationships : []);
  const ethics = ethicsResult?.kind === "data" ? ethicsResult : null;
  const reviewQueue = ethics?.review_queue ?? [];
  const ethicalWalls = ethics?.ethical_walls ?? [];
  const reviewerReceipts = ethics?.reviewer_receipts ?? [];
  const restrictedCount = relationships.filter((relationship) => relationship.access_state === "restricted").length;
  const selectedPersonLabel = personLabel(detail?.person);
  const selectedPersonTypeLabel = personTypeLabel(detail?.person);
  const selectedPersonRoleLabel = personRoleLabel(detail?.person);
  const selectedOrganizationLabel = organizationLabel(detail?.person);

  return (
    <div className="legal-people-runtime-grid span-2" data-lcx-ppl-05-ui="true">
      <Panel id="people-directory" className="people-panel legal-people-directory" title={config.title} meta={config.meta}>
        <label className="legal-people-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 역할, 조직 검색" />
        </label>
        <div className="segmented wrap legal-people-type-tabs" aria-label="참여자 유형 필터">
          {TYPE_FILTERS.map(({ id, label, icon: Icon }) => (
            <button key={id || "all"} className={typeId === id ? "active" : ""} onClick={() => setTypeId(id)} type="button">
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {searchResult === null && <div className="live-data-state live-data-loading">참여자 정보를 불러오는 중입니다</div>}
        {searchResult?.kind === "error" && <div className="live-data-state live-data-error">참여자 정보를 불러오지 못했습니다.</div>}
        {searchResult?.kind === "data" && people.length === 0 && <div className="live-data-state live-data-empty">조건에 맞는 참여자 기록이 없습니다.</div>}
        {people.length > 0 && (
          <div className="people-row-list legal-people-row-list">
            {people.map((person) => {
              const displayName = personLabel(person);
              const typeLabel = personTypeLabel(person);
              const organization = organizationLabel(person);
              const photo = memberPhotoFor(person.display_name);
              return (
                <button
                  key={person.person_id}
                  type="button"
                  className={selectedPersonId === person.person_id ? "people-row legal-people-row active" : "people-row legal-people-row"}
                  data-compact-record="true"
                  onClick={() => setSelectedPersonId(person.person_id)}
                >
                  <span className="people-row-avatar">{photo ? <img src={photo} alt="" /> : displayName.slice(0, 1) || "P"}</span>
                  <span>
                    <strong>{displayName}</strong>
                    <small>{typeLabel}, {organization}</small>
                  </span>
                  <em>{statusLabel(person.status)}</em>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel id="people-detail-workspace" className="people-panel legal-people-detail" title="참여자 상세" meta={selectedPersonId ? "선택됨" : "미선택"}>
        {!selectedPersonId && <div className="live-data-state live-data-empty">참여자 기록을 선택하세요.</div>}
        {selectedPersonId && detailResult === null && <div className="live-data-state live-data-loading">참여자 상세를 불러오는 중입니다</div>}
        {detailResult?.kind === "error" && <div className="live-data-state live-data-error">참여자 상세를 불러오지 못했습니다.</div>}
        {detailResult?.kind === "data" && !detailResult.person && <div className="live-data-state live-data-empty">상세 정보는 권한 제한으로 표시할 수 없습니다.</div>}
        {detail && (
          <div className="legal-people-detail-stack">
            <div className="legal-people-identity">
              <span className="people-row-avatar">
                {memberPhotoFor(detail.person.display_name)
                  ? <img src={memberPhotoFor(detail.person.display_name)} alt="" />
                  : selectedPersonLabel.slice(0, 1) || "P"}
              </span>
              <div>
                <strong>{selectedPersonLabel}</strong>
                <small>{selectedPersonTypeLabel}, {selectedPersonRoleLabel}</small>
              </div>
              <em>{detail.person.permission_summary?.sensitive_fields_visible ? "상세 권한" : "제한 보기"}</em>
            </div>
            <div className="property-grid people-profile-grid">
              <Property label="조직" value={selectedOrganizationLabel} />
              <Property label="상태" value={statusLabel(detail.person.status)} />
              <Property label="Client" value={firstSafeValue(detail.clients, "display_label", "client_id")} />
              <Property label="Matter" value={firstSafeValue(detail.matters, "display_label", "matter_id")} />
              <Property label="감사 요약" value={`${detail.audit_summary?.event_count ?? 0}건`} />
              <Property label="제한 관계" value={`${restrictedCount}건`} />
            </div>
            {(detail.conflict_references.length > 0 || detail.ethical_wall_references.length > 0) && (
              <div className="legal-people-review-strip">
                {detail.conflict_references.map((item) => (
                  <span key={item.conflict_ref_id}>
                    <ShieldAlert size={13} />
                    이해상충 {statusLabel(item.status)}
                  </span>
                ))}
                {detail.ethical_wall_references.map((item) => (
                  <span key={item.wall_ref_id}>
                    <LockKeyhole size={13} />
                    접근 제한 {statusLabel(item.wall_status)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel id="people-relationship-panel" className="people-panel legal-people-relationships" title="관련 기록" meta={`${relationships.length}개`}>
        {relationshipResult === null && <div className="live-data-state live-data-loading">관련 기록을 불러오는 중입니다</div>}
        {relationshipResult?.kind === "error" && <div className="live-data-state live-data-error">관련 기록을 불러오지 못했습니다.</div>}
        {relationships.length > 0 && (
          <div className="legal-relationship-list">
            {relationships.map((relationship) => (
              <div key={relationship.relationship_id} className={relationship.access_state === "restricted" ? "legal-relationship-row restricted" : "legal-relationship-row"} data-compact-record="true">
                <div>
                  <strong>{relationshipLabel(relationship.relationship_type)}</strong>
                  <small>{targetLabel(relationship)}</small>
                </div>
                <span>{statusLabel(relationship.status)}</span>
                <em>{relationship.review_required ? "검토 필요" : relationship.access_state === "restricted" ? "제한" : "표시"}</em>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {mode === "conflicts" && (
        <Panel id="people-conflict-review-queue" className="people-panel legal-people-conflicts" title="이해상충 검토" meta={`${reviewQueue.length}건`}>
          {ethicsResult === null && <div className="live-data-state live-data-loading">이해상충 검토 목록을 불러오는 중입니다</div>}
          {ethicsResult?.kind === "error" && <div className="live-data-state live-data-error">이해상충 검토 목록을 불러오지 못했습니다.</div>}
          {reviewQueue.length > 0 && (
            <div className="legal-relationship-list" data-lcx-ppl-06-conflict-review-queue="true">
              {reviewQueue.map((item) => (
                <div key={item.review_item_id} className={`legal-ethics-row ${item.state}`} data-compact-record="true">
                  <div>
                    <strong>{reviewTypeLabel(item.review_type)}, {reviewStateLabel(item.state)}</strong>
                    <small>{recordLabel(item.related_ref)}, {reviewerRoleLabel(item.reviewer_role_required)}</small>
                  </div>
                  <span>{priorityLabel(item.priority)}</span>
                  <em>{item.ai_final_decision_allowed ? "확인 필요" : "사람 검토"}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {mode === "conflicts" && (
        <Panel id="people-ethical-wall-surface" className="people-panel legal-people-walls" title="접근 제한" meta={`${ethicalWalls.length}건`}>
          {ethicalWalls.length > 0 && (
            <div className="legal-relationship-list" data-lcx-ppl-06-ethical-wall-ui="true">
              {ethicalWalls.map((wall) => (
                <div key={wall.wall_ref_id} className={`legal-ethics-row ${wall.wall_status}`} data-compact-record="true">
                  <div>
                    <strong>{reviewStateLabel(wall.wall_status)}</strong>
                    <small>{recordLabel(wall.matter_id, "Matter 기록")}, {reasonLabel(wall.reason_code)}</small>
                  </div>
                  <span>{accessEffectLabel(wall.access_effect)}</span>
                  <em>{wall.reviewer_receipt_id ? "검토 기록" : "대기"}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {mode === "conflicts" && (
        <Panel id="people-reviewer-receipts" className="people-panel legal-people-receipts" title="검토 기록" meta={`${reviewerReceipts.length}건`}>
          {reviewerReceipts.length > 0 && (
            <div className="legal-relationship-list" data-lcx-ppl-06-reviewer-receipts="true">
              {reviewerReceipts.map((receipt) => (
                <div key={receipt.receipt_id} className={receipt.access_state === "restricted" ? "legal-ethics-row restricted" : "legal-ethics-row"} data-compact-record="true">
                  <div>
                    <strong>{decisionLabel(receipt.decision)}</strong>
                    <small>{reviewerRoleLabel(receipt.reviewer_role)}, 검토 항목</small>
                  </div>
                  <span>{receipt.rollback_ref ? "되돌림 기준" : "제한"}</span>
                  <em>{receipt.ai_final_decision_allowed ? "확인 필요" : "사람 검토"}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
