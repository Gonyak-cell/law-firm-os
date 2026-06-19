import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  FileCheck2,
  KeyRound,
  Loader2,
  MonitorCheck,
  Route,
  ShieldCheck,
} from "lucide-react";
import {
  CMP_CONSOLE_API_CONTEXT,
  CMP_CONSOLE_BACKEND_EVIDENCE,
  CMP_CONSOLE_RUNTIME_READINESS,
  CMP_CONSOLE_UI_STATES,
  cmpConsoleCatalog,
  cmpConsoleGroups,
  cmpConsoleRoutes,
} from "../data/cmpConsoleCatalog.js";
import { cmpConsoleApiClient } from "../data/cmpApiClient.js";
import { PageHeader, Panel } from "./primitives.jsx";

const STATE_CONFIG = Object.freeze({
  loading: { label: "Loading", icon: Loader2, text: "Waiting for backend evidence and permission receipts." },
  empty: { label: "Empty", icon: MonitorCheck, text: "No domain rows are exposed until the API client returns scoped data." },
  denied: { label: "Denied", icon: CircleSlash, text: "PermissionDeniedState blocks the screen without leaking payload details." },
  "review-required": { label: "Review", icon: ShieldCheck, text: "ReviewRequiredState holds risky work for human approval." },
  error: { label: "Error", icon: AlertTriangle, text: "Safe error copy replaces stack traces and raw identifiers." },
});

export function PermissionDeniedState({ surface }) {
  return (
    <div className="cmp-state-card denied" role="status" aria-label="Permission denied state">
      <CircleSlash size={18} />
      <strong>PermissionDeniedState</strong>
      <span>{surface} is hidden until a scoped permission receipt is present.</span>
    </div>
  );
}

export function ReviewRequiredState({ surface }) {
  return (
    <div className="cmp-state-card review" role="status" aria-label="Review required state">
      <ShieldCheck size={18} />
      <strong>ReviewRequiredState</strong>
      <span>{surface} requires human review before export, AI use, or external sharing.</span>
    </div>
  );
}

export function VaultSecurityBadges() {
  return (
    <div className="cmp-security-badges" aria-label="Vault security badges">
      {["LegalHold", "Privilege", "HRSensitive"].map((badge) => (
        <span key={badge}>
          <KeyRound size={12} />
          {badge}
        </span>
      ))}
    </div>
  );
}

function CmpStatePreview({ state, activeEntry }) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  if (state === "denied") return <PermissionDeniedState surface={activeEntry.surface} />;
  if (state === "review-required") return <ReviewRequiredState surface={activeEntry.surface} />;

  return (
    <div className={`cmp-state-card ${state}`} role="status" aria-label={`${config.label} state`}>
      <Icon size={18} className={state === "loading" ? "spin" : ""} />
      <strong>{config.label}State</strong>
      <span>{config.text}</span>
    </div>
  );
}

function CmpConsoleRow({ entry, active, onSelect }) {
  return (
    <button className={active ? "cmp-console-row active" : "cmp-console-row"} onClick={onSelect}>
      <span>{entry.tuw_id}</span>
      <strong>{entry.title}</strong>
      <em>{entry.route || entry.model}</em>
    </button>
  );
}

export function CmpConsoleSurface({ labels }) {
  const [activeId, setActiveId] = useState("CMP-G11-W11-T004");
  const [activeState, setActiveState] = useState("review-required");
  const activeEntry = cmpConsoleCatalog.find((entry) => entry.tuw_id === activeId) ?? cmpConsoleCatalog[0];
  const apiClients = useMemo(() => cmpConsoleApiClient.domain_clients, []);
  const evidenceRequest = apiClients.clientCollaboration();

  return (
    <section
      className="surface stack cmp-console-surface"
      data-cmp-g11-api-backed="true"
      data-cmp-g11-tuw-count={cmpConsoleCatalog.length}
      data-runtime-readiness={CMP_CONSOLE_RUNTIME_READINESS}
    >
      <PageHeader
        title={labels.cmpConsoleTitle}
        subtitle="A UI console over G1-G10 backend evidence with explicit state handling, permission context, audit context, and no premature R4 claim."
        actions={
          <>
            <button className="secondary-button">
              <Route size={15} />
              {cmpConsoleRoutes.length} routes
            </button>
            <button className="primary-button">
              <FileCheck2 size={15} />
              Evidence linked
            </button>
          </>
        }
      />

      <div className="cmp-console-metrics">
        <div>
          <span>G11 TUWs</span>
          <strong>{cmpConsoleCatalog.length}</strong>
          <small>Navigation, screens, common states, client, a11y, E2E</small>
        </div>
        <div>
          <span>Backend gates</span>
          <strong>{CMP_CONSOLE_BACKEND_EVIDENCE.length}</strong>
          <small>G1-G10 evidence required before UI claims runtime behavior</small>
        </div>
        <div>
          <span>Required states</span>
          <strong>{CMP_CONSOLE_UI_STATES.length}</strong>
          <small>loading, empty, denied, review-required, error</small>
        </div>
        <div>
          <span>Readiness</span>
          <strong>No R4</strong>
          <small>{CMP_CONSOLE_RUNTIME_READINESS}</small>
        </div>
      </div>

      <div className="cmp-console-grid">
        <Panel title="Client-Matter-People IA" meta="CMP-G11-W11-T001..T048">
          <div className="cmp-console-list" role="listbox" aria-label="CMP console screen catalog">
            {[...cmpConsoleGroups.entries()].map(([group, entries]) => (
              <div key={group} className="cmp-console-group">
                <span>{group}</span>
                {entries.map((entry) => (
                  <CmpConsoleRow key={entry.tuw_id} entry={entry} active={entry.tuw_id === activeId} onSelect={() => setActiveId(entry.tuw_id)} />
                ))}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={activeEntry.surface} meta={`${activeEntry.tuw_id} / ${activeEntry.model}`}>
          <div className="cmp-detail-stack">
            <div className="cmp-detail-card">
              <div>
                <span>{activeEntry.capability} / {activeEntry.feature}</span>
                <h2>{activeEntry.title}</h2>
                <p>{activeEntry.route || "Reusable console primitive"} is backed by a domain API request carrying tenant, actor, permission, audit, and idempotency context.</p>
              </div>
              <VaultSecurityBadges />
            </div>
            <div className="cmp-route-contract">
              <span>Route</span>
              <code>{activeEntry.route || "shared-component"}</code>
              <span>Sample backend request</span>
              <code>{evidenceRequest.route}</code>
              <span>Actor context</span>
              <code>{CMP_CONSOLE_API_CONTEXT.actor_id}</code>
            </div>
            <div className="cmp-state-switcher" aria-label="CMP UI state switcher">
              {CMP_CONSOLE_UI_STATES.map((state) => (
                <button key={state} className={state === activeState ? "active" : ""} onClick={() => setActiveState(state)}>
                  {STATE_CONFIG[state].label}
                </button>
              ))}
            </div>
            <CmpStatePreview state={activeState} activeEntry={activeEntry} />
          </div>
        </Panel>

        <Panel className="span-2" title="Evidence dependency contract" meta="UI claims depend on backend runtime evidence">
          <div className="cmp-evidence-strip">
            {CMP_CONSOLE_BACKEND_EVIDENCE.map((gate) => (
              <span key={gate}>
                <CheckCircle2 size={14} />
                {gate}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
