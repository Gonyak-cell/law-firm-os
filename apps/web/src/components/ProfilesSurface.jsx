import React from "react";
import { useEffect, useState } from "react";
import { Archive, Filter, Save, Share2 } from "lucide-react";
import { fetchMasterDataRecords } from "../data/apiClient.js";
import { DataTable, PageHeader, Panel, Property, QueryBlock } from "./primitives.jsx";

export function ProfilesSurface({
  labels,
  activeMatter,
  activeEvent,
  activeEventIndex,
  filteredMatters,
  setActiveMatterId,
  setActiveEventIndex,
  variant,
  dataMode,
  liveCtx
}) {
  if (variant === "userList") {
    return <UserProfilesListSurface labels={labels} liveCtx={liveCtx} />;
  }

  if (!activeMatter || !activeEvent || !Array.isArray(filteredMatters)) {
    return (
      <section className="surface stack">
        <PageHeader title={labels.profileTitle} subtitle="Matter 또는 People 화면에서 관련 기록을 확인합니다." />
        <Panel title="프로필 정보" meta="선택 전">
          <div className="live-data-state live-data-empty">
            <strong>선택된 프로필이 없습니다</strong>
            Matter 또는 People 화면에서 확인할 대상을 선택하세요.
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.profileTitle}
        subtitle="주요 정보, 활동 내역, Matter 연결 정보를 확인합니다."
        actions={
          <>
            <button className="secondary-button">
              <Archive size={15} />
              그룹
            </button>
            <button className="primary-button">
              <Share2 size={15} />
              {labels.share}
            </button>
          </>
        }
      />
      <div className="profile-layout">
        <Panel className="profile-card" title={activeMatter.name} meta={activeMatter.client}>
          <div className="avatar-large">{activeMatter.name.slice(0, 1)}</div>
          <div className="property-grid">
            <Property label="Matter 번호" value={activeMatter.id} />
            <Property label="담당자" value={activeMatter.owner} />
            <Property label="단계" value={activeMatter.phase} />
            <Property label="위험" value={activeMatter.risk} />
            <Property label="문서" value={activeMatter.docs} />
            <Property label="청구" value={activeMatter.value} />
          </div>
          <div className="matter-list">
            {filteredMatters.map((matter) => (
              <button key={matter.id} className={matter.id === activeMatter.id ? "matter-row active" : "matter-row"} onClick={() => setActiveMatterId(matter.id)}>
                <span>Matter</span>
                <strong>{matter.name}</strong>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="event-stream-panel" title={labels.eventStream} meta="최근 활동">
          <div className="event-list">
            {filteredMatters.slice(0, 0).map((event, index) => (
              <button key={`${event.time}-${event.name}`} className={activeEventIndex === index ? "event-row active" : "event-row"} onClick={() => setActiveEventIndex(index)}>
                <span>{event.time}</span>
                <span className="event-dot" />
                <strong>{event.name}</strong>
                <small>{event.module}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="raw-panel" title={labels.rawEvent} meta="최근 활동">
          <div className="property-grid">
            <Property label="시간" value={activeEvent.time} />
            <Property label="활동" value={activeEvent.name} />
            <Property label="영역" value={activeEvent.module} />
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function UserProfilesListSurface({ labels, liveCtx = "allow" }) {
  return <UserProfilesListLiveSurface labels={labels} liveCtx={liveCtx} />;
}

function UserProfilesListLiveSurface({ labels, liveCtx }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMasterDataRecords({ ctx: liveCtx }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx]);

  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>프로필 불러오는 중</strong>
        표시할 기록을 확인하고 있습니다.
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>프로필을 불러올 수 없습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>접근할 수 없습니다</strong>
        현재 권한으로는 이 프로필을 볼 수 없습니다.
      </div>
    );
  } else if (result.uiState === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        담당자 확인 후 프로필을 볼 수 있습니다.
      </div>
    );
  } else if (result.uiState === "empty") {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>표시할 기록이 없습니다</strong>
        조건에 맞는 프로필 기록이 없습니다.
      </div>
    );
  } else {
    body = (
      <DataTable
        columns={["이름", "구분", "상태", "담당자", "Matter"]}
        rows={result.items.map((item) => [
          item.display_name ?? item.value ?? "—",
          item.model_type === "Entity" && item.entity_kind ? "조직" : "프로필",
          item.status === "active" ? "사용 중" : item.status === "inactive" ? "비활성" : "확인 필요",
          item.owner_user_id ? "담당자 지정" : "미지정",
          item.matter_core_enrichment?.matter_title ?? "—"
        ])}
      />
    );
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.profileTitle}
        subtitle="작업공간에서 확인 가능한 프로필 기록입니다."
        actions={
          <>
            <button className="secondary-button">
              <Filter size={15} />
              필터
            </button>
            <button className="primary-button">
              <Save size={15} />
              그룹 저장
            </button>
          </>
        }
      />
      <div className="profiles-list-layout">
        <Panel className="span-2" title="프로필 목록" meta="작업공간">
          {body}
        </Panel>
      </div>
    </section>
  );
}
