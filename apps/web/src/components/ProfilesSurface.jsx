import React from "react";
import { useEffect, useState } from "react";
import { Archive, Filter, Save, Share2 } from "lucide-react";
import { events, profileRows } from "../data/mockData.js";
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
    return <UserProfilesListSurface labels={labels} dataMode={dataMode} liveCtx={liveCtx} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.profileTitle}
        subtitle="Review pinned properties, live events, and raw activity detail."
        actions={
          <>
            <button className="secondary-button">
              <Archive size={15} />
              Cohort
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
            <Property label="Matter ID" value={activeMatter.id} />
            <Property label="Owner" value={activeMatter.owner} />
            <Property label="Phase" value={activeMatter.phase} />
            <Property label="Risk" value={activeMatter.risk} />
            <Property label="Documents" value={activeMatter.docs} />
            <Property label="Trust/WIP" value={activeMatter.value} />
          </div>
          <div className="matter-list">
            {filteredMatters.map((matter) => (
              <button key={matter.id} className={matter.id === activeMatter.id ? "matter-row active" : "matter-row"} onClick={() => setActiveMatterId(matter.id)}>
                <span>{matter.id}</span>
                <strong>{matter.name}</strong>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="event-stream-panel" title={labels.eventStream} meta="Live event updates">
          <div className="event-list">
            {events.map((event, index) => (
              <button key={`${event.time}-${event.name}`} className={activeEventIndex === index ? "event-row active" : "event-row"} onClick={() => setActiveEventIndex(index)}>
                <span>{event.time}</span>
                <span className="event-dot" />
                <strong>{event.name}</strong>
                <small>{event.module}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="raw-panel" title={labels.rawEvent} meta={activeEvent.path}>
          <pre>{JSON.stringify(activeEvent, null, 2)}</pre>
        </Panel>
      </div>
    </section>
  );
}

export function UserProfilesListSurface({ labels, dataMode = "mock", liveCtx = "allow" }) {
  if (dataMode === "live") {
    return <UserProfilesListLiveSurface labels={labels} liveCtx={liveCtx} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.profileTitle}
        subtitle="Build cohorts from profile attributes, activity filters, and saved query conditions."
        actions={
          <>
            <button className="secondary-button">
              <Filter size={15} />
              Filter
            </button>
            <button className="primary-button">
              <Save size={15} />
              Save Cohort
            </button>
          </>
        }
      />
      <div className="profiles-list-layout">
        <Panel className="span-2" title="User Profiles" meta="Profile query builder">
          <div className="query-builder-row">
            <QueryBlock title="Include users where" value="Matter is Project Atlas" meta="and risk tier is High" />
            <QueryBlock title="Performed" value="[DMS] Document Changed" meta="within the last 7 days" />
            <QueryBlock title="Group by" value="Owner" meta="Corporate and Litigation teams" />
          </div>
        </Panel>
        <Panel className="span-2" title="Matching Profiles" meta="Cohort preview">
          <DataTable
            columns={["User", "ID", "First Seen", "Location", "Country", "Sessions"]}
            rows={profileRows.map((row) => [row.user, row.id, row.firstSeen, row.location, row.country, row.sessions])}
          />
        </Panel>
      </div>
    </section>
  );
}

// Live-mode surface (?data=live). Renders real apps/api master-data records via
// the Vite dev proxy with a LIVE-specific column set. There is intentionally NO
// mock fallback: API failure renders an explicit error state.
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
        <strong>Loading live records</strong>
        Fetching master-data records from the Law Firm OS API.
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Live data unavailable</strong>
        The API request failed or returned an unexpected response. Live mode has no mock fallback — start the API
        and reload.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this request. No records are shown.
      </div>
    );
  } else if (result.uiState === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This request needs an approval review before records can be shown.
      </div>
    );
  } else if (result.uiState === "empty") {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>No records</strong>
        The query matched no master-data records for this tenant.
      </div>
    );
  } else {
    body = (
      <DataTable
        columns={["Name", "Type", "Status", "Owner", "Matter"]}
        rows={result.items.map((item) => [
          item.display_name ?? item.value ?? "—",
          item.model_type === "Entity" && item.entity_kind ? `Entity (${item.entity_kind})` : item.model_type,
          item.status,
          item.owner_user_id,
          item.matter_core_enrichment?.matter_title ?? "—"
        ])}
      />
    );
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.profileTitle}
        subtitle="Live master-data records from the Law Firm OS API (synthetic tenant)."
        actions={
          <>
            <button className="secondary-button">
              <Filter size={15} />
              Filter
            </button>
            <button className="primary-button">
              <Save size={15} />
              Save Cohort
            </button>
          </>
        }
      />
      <div className="profiles-list-layout">
        <Panel className="span-2" title="Matching Profiles" meta="Live API data">
          {body}
        </Panel>
      </div>
    </section>
  );
}
