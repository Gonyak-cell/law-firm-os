import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Building2, Link2, LockKeyhole, Network, Scale, Search, ShieldAlert, UsersRound } from "lucide-react";
import { Panel, Property } from "../../components/primitives.jsx";
import { fetchLegalPeopleEthics, fetchLegalPeopleRelationships, fetchLegalPeopleSearch, fetchLegalPersonDetail } from "../hrxApiClient.ts";

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
    title: "법률 People 디렉터리",
    meta: "Client-Matter-People",
    kicker: "Client, Matter, 조직, 충돌 관계를 함께 탐색합니다."
  },
  relationships: {
    title: "People 관계망",
    meta: "관계 피벗",
    kicker: "선택한 사람의 Client, Matter, 조직 연결을 권한 경계와 함께 봅니다."
  },
  conflicts: {
    title: "충돌/윤리벽",
    meta: "검토 필요",
    kicker: "충돌과 윤리벽은 최종 판단이 아니라 검토 상태로만 표시됩니다."
  }
};

function statusLabel(value) {
  if (value === "active") return "활성";
  if (value === "review_required") return "검토 필요";
  if (value === "blocked") return "차단";
  if (value === "historical") return "이력";
  return value ?? "확인 필요";
}

function relationshipLabel(value) {
  const labels = {
    person_to_organization_affiliation: "조직 소속",
    person_to_client_contact: "Client 연락처",
    person_to_matter_participation: "Matter 참여",
    person_to_person_relationship: "사람 관계",
    person_to_document_reference: "문서 참조",
    person_to_conflict_subject: "충돌 대상",
    person_to_ethical_wall_membership: "윤리벽"
  };
  return labels[value] ?? value ?? "관계";
}

function reviewStateLabel(value) {
  if (value === "pending_review") return "검토 대기";
  if (value === "reviewed") return "검토됨";
  if (value === "escalated") return "상향 검토";
  if (value === "blocked") return "차단";
  return value ?? "확인 필요";
}

function reviewTypeLabel(value) {
  if (value === "conflict_check") return "충돌";
  if (value === "ethical_wall") return "윤리벽";
  return value ?? "검토";
}

function priorityLabel(value) {
  if (value === "urgent") return "긴급";
  if (value === "high") return "높음";
  if (value === "normal") return "보통";
  return value ?? "보통";
}

function targetLabel(relationship) {
  if (relationship.access_state === "restricted") return "권한 제한";
  if (!relationship.target_id) return "미표시";
  return `${relationship.target_type}:${relationship.target_id}`;
}

function firstValue(items, field, fallback = "없음") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items.map((item) => item[field]).filter(Boolean).join(", ") || fallback;
}

function modeFilters(mode) {
  if (mode === "conflicts") return ["counterparty", "opposing_counsel", "internal_lawyer"];
  return null;
}

export function LegalPeopleWorkspace({ mode = "directory", refreshKey = 0 }) {
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
    fetchLegalPeopleSearch(filters).then((next) => {
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
  }, [filters, mode, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setDetailResult(null);
    fetchLegalPersonDetail(selectedPersonId).then((next) => {
      if (!cancelled) setDetailResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setRelationshipResult(null);
    fetchLegalPeopleRelationships(selectedPersonId ? { person_id: selectedPersonId } : {}).then((next) => {
      if (!cancelled) setRelationshipResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setEthicsResult(null);
    fetchLegalPeopleEthics(selectedPersonId ? { person_id: selectedPersonId } : {}).then((next) => {
      if (!cancelled) setEthicsResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPersonId, refreshKey]);

  const people = searchResult?.kind === "data" ? searchResult.people : [];
  const detail = detailResult?.kind === "data" ? detailResult : null;
  const relationships = detail?.relationships ?? (relationshipResult?.kind === "data" ? relationshipResult.relationships : []);
  const ethics = ethicsResult?.kind === "data" ? ethicsResult : null;
  const reviewQueue = ethics?.review_queue ?? [];
  const ethicalWalls = ethics?.ethical_walls ?? [];
  const reviewerReceipts = ethics?.reviewer_receipts ?? [];
  const restrictedCount = relationships.filter((relationship) => relationship.access_state === "restricted").length;

  return (
    <div className="legal-people-runtime-grid span-2" data-lcx-ppl-05-ui="true">
      <Panel id="people-directory" className="people-panel legal-people-directory" title={config.title} meta={config.meta}>
        <div className="people-panel-kicker">
          <Network size={15} />
          {config.kicker}
        </div>
        <label className="legal-people-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 역할, 조직 검색" />
        </label>
        <div className="segmented wrap legal-people-type-tabs" aria-label="People 유형 필터">
          {TYPE_FILTERS.map(({ id, label, icon: Icon }) => (
            <button key={id || "all"} className={typeId === id ? "active" : ""} onClick={() => setTypeId(id)} type="button">
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {searchResult === null && <div className="live-data-state live-data-loading">법률 People 디렉터리를 불러오는 중입니다</div>}
        {searchResult?.kind === "error" && <div className="live-data-state live-data-error">법률 People 디렉터리를 불러오지 못했습니다.</div>}
        {searchResult?.kind === "data" && people.length === 0 && <div className="live-data-state live-data-empty">조건에 맞는 People 기록이 없습니다.</div>}
        {people.length > 0 && (
          <div className="people-row-list legal-people-row-list">
            {people.map((person) => (
              <button
                key={person.person_id}
                type="button"
                className={selectedPersonId === person.person_id ? "people-row legal-people-row active" : "people-row legal-people-row"}
                onClick={() => setSelectedPersonId(person.person_id)}
              >
                <span className="people-row-avatar">{person.display_name?.slice(0, 1) ?? "P"}</span>
                <span>
                  <strong>{person.display_name}</strong>
                  <small>{person.korean_label} · {person.organization_label ?? "조직 미등록"}</small>
                </span>
                <em>{statusLabel(person.status)}</em>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel id="people-detail-workspace" className="people-panel legal-people-detail" title="People 상세" meta={selectedPersonId ? "선택됨" : "미선택"}>
        <div className="people-panel-kicker">
          <LockKeyhole size={15} />
          민감한 관계 정보는 권한에 따라 축약됩니다.
        </div>
        {!selectedPersonId && <div className="live-data-state live-data-empty">People 기록을 선택해주세요.</div>}
        {selectedPersonId && detailResult === null && <div className="live-data-state live-data-loading">People 상세를 불러오는 중입니다</div>}
        {detailResult?.kind === "error" && <div className="live-data-state live-data-error">People 상세를 불러오지 못했습니다.</div>}
        {detail && (
          <div className="legal-people-detail-stack">
            <div className="legal-people-identity">
              <span className="people-row-avatar">{detail.person.display_name?.slice(0, 1) ?? "P"}</span>
              <div>
                <strong>{detail.person.display_name}</strong>
                <small>{detail.person.korean_label} · {detail.person.primary_role ?? "역할 미등록"}</small>
              </div>
              <em>{detail.person.permission_summary?.sensitive_fields_visible ? "상세 권한" : "제한 보기"}</em>
            </div>
            <div className="property-grid people-profile-grid">
              <Property label="조직" value={detail.person.organization_label ?? "미등록"} />
              <Property label="상태" value={statusLabel(detail.person.status)} />
              <Property label="Client" value={firstValue(detail.clients, "display_label")} />
              <Property label="Matter" value={firstValue(detail.matters, "display_label")} />
              <Property label="감사 요약" value={`${detail.audit_summary?.event_count ?? 0}건`} />
              <Property label="제한 관계" value={`${restrictedCount}건`} />
            </div>
            {(detail.conflict_references.length > 0 || detail.ethical_wall_references.length > 0) && (
              <div className="legal-people-review-strip">
                {detail.conflict_references.map((item) => (
                  <span key={item.conflict_ref_id}>
                    <ShieldAlert size={13} />
                    충돌 {statusLabel(item.status)}
                  </span>
                ))}
                {detail.ethical_wall_references.map((item) => (
                  <span key={item.wall_ref_id}>
                    <LockKeyhole size={13} />
                    윤리벽 {statusLabel(item.wall_status)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel id="people-relationship-panel" className="people-panel legal-people-relationships" title="관계 패널" meta={`${relationships.length}개`}>
        <div className="people-panel-kicker">
          <Link2 size={15} />
          Client, Matter, 조직 연결과 권한 상태를 함께 표시합니다.
        </div>
        {relationshipResult === null && <div className="live-data-state live-data-loading">관계 정보를 불러오는 중입니다</div>}
        {relationshipResult?.kind === "error" && <div className="live-data-state live-data-error">관계 정보를 불러오지 못했습니다.</div>}
        {relationships.length === 0 && relationshipResult?.kind === "data" && <div className="live-data-state live-data-empty">표시할 관계가 없습니다.</div>}
        {relationships.length > 0 && (
          <div className="legal-relationship-list">
            {relationships.map((relationship) => (
              <div key={relationship.relationship_id} className={relationship.access_state === "restricted" ? "legal-relationship-row restricted" : "legal-relationship-row"}>
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
        <Panel id="people-conflict-review-queue" className="people-panel legal-people-conflicts" title="충돌 검토 큐" meta={`${reviewQueue.length}건`}>
          <div className="people-panel-kicker" data-lcx-ppl-06-conflict-review-queue="true">
            <ShieldAlert size={15} />
            자동 신호는 참고 상태로만 보관됩니다.
          </div>
          {ethicsResult === null && <div className="live-data-state live-data-loading">충돌 검토 큐를 불러오는 중입니다</div>}
          {ethicsResult?.kind === "error" && <div className="live-data-state live-data-error">충돌 검토 큐를 불러오지 못했습니다.</div>}
          {reviewQueue.length > 0 && (
            <div className="legal-relationship-list">
              {reviewQueue.map((item) => (
                <div key={item.review_item_id} className={`legal-ethics-row ${item.state}`}>
                  <div>
                    <strong>{reviewTypeLabel(item.review_type)} · {reviewStateLabel(item.state)}</strong>
                    <small>{item.related_ref} · {item.reviewer_role_required}</small>
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
        <Panel id="people-ethical-wall-surface" className="people-panel legal-people-walls" title="윤리벽" meta={`${ethicalWalls.length}건`}>
          <div className="people-panel-kicker" data-lcx-ppl-06-ethical-wall-ui="true">
            <LockKeyhole size={15} />
            벽 상태는 이유와 receipt 참조로 표시합니다.
          </div>
          {ethicalWalls.length === 0 && ethicsResult?.kind === "data" && <div className="live-data-state live-data-empty">표시할 윤리벽이 없습니다.</div>}
          {ethicalWalls.length > 0 && (
            <div className="legal-relationship-list">
              {ethicalWalls.map((wall) => (
                <div key={wall.wall_ref_id} className={`legal-ethics-row ${wall.wall_status}`}>
                  <div>
                    <strong>{reviewStateLabel(wall.wall_status)}</strong>
                    <small>{wall.matter_id} · {wall.reason_code}</small>
                  </div>
                  <span>{wall.access_effect}</span>
                  <em>{wall.reviewer_receipt_id ? "receipt" : "대기"}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {mode === "conflicts" && (
        <Panel id="people-reviewer-receipts" className="people-panel legal-people-receipts" title="Reviewer Receipts" meta={`${reviewerReceipts.length}건`}>
          <div className="people-panel-kicker" data-lcx-ppl-06-reviewer-receipts="true">
            <Scale size={15} />
            결정, notes, rollback 포인터는 권한 경계에 따라 표시됩니다.
          </div>
          {reviewerReceipts.length === 0 && ethicsResult?.kind === "data" && <div className="live-data-state live-data-empty">표시할 receipt가 없습니다.</div>}
          {reviewerReceipts.length > 0 && (
            <div className="legal-relationship-list">
              {reviewerReceipts.map((receipt) => (
                <div key={receipt.receipt_id} className={receipt.access_state === "restricted" ? "legal-ethics-row restricted" : "legal-ethics-row"}>
                  <div>
                    <strong>{receipt.decision}</strong>
                    <small>{receipt.reviewer_role} · {receipt.review_item_id}</small>
                  </div>
                  <span>{receipt.rollback_ref ? "rollback" : "제한"}</span>
                  <em>{receipt.ai_final_decision_allowed ? "확인 필요" : "AI false"}</em>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
