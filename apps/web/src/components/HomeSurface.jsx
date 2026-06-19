import React from "react";
import { BarChart3, CheckCircle2, LineChart, Save, Star, X } from "lucide-react";
import { matters } from "../data/mockData.js";
import { CompactTable, GaugeChart, MetricCard, MiniLineChart, PageHeader, Panel } from "./primitives.jsx";

export function HomeSurface({ labels, variant, setView, onSave, showFunnel = false }) {
  return (
    <section className="surface stack">
      <PageHeader
        title={labels.dashboardTitle}
        subtitle={labels.dashboardSubtitle}
        actions={
          <>
            <button className="secondary-button" onClick={() => setView("analytics")}>
              <LineChart size={15} />
              Analysis
            </button>
            <button className="primary-button" onClick={onSave}>
              <Save size={15} />
              {labels.save}
            </button>
          </>
        }
      />
      <div className="metric-grid">
        <MetricCard label="Active matters" value="1,492" delta="+6.2%" tone="blue" />
        <MetricCard label="Documents changed" value="8.1k" delta="+12%" tone="green" />
        <MetricCard label="Permission denials" value="24" delta="-4" tone="red" />
        <MetricCard label="WIP pending approval" value="KRW 2.4B" delta="+18%" tone="purple" />
      </div>
      <div className="home-grid">
        <Panel className="span-2 progression-panel" title="Matter progression" meta="Last 30 days">
          <MiniLineChart />
          {showFunnel && (
            <div className="funnel-overlay" aria-hidden="true">
              <span className="funnel-step light" />
              <span className="funnel-step strong" />
              <span className="funnel-step pale" />
            </div>
          )}
        </Panel>
        <Panel title={labels.liveGauge} meta="Updated live">
          <GaugeChart value={72} />
        </Panel>
        <Panel title={labels.topMatters} meta="By event volume">
          <CompactTable
            rows={matters.map((matter) => [matter.name, matter.client, matter.status, matter.value])}
            columns={["Matter", "Client", "Status", "Value"]}
          />
        </Panel>
        <Panel title="Guided setup" meta="Workspace setup">
          <div className="checklist">
            {["Connect DMS", "Import billing events", "Invite attorneys", "Verify audit stream"].map((item, index) => (
              <div key={item} className="check-row compact">
                <CheckCircle2 size={15} className={index < 3 ? "ok" : ""} />
                <span>{item}</span>
                <small>{index < 3 ? "Done" : "Open"}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={labels.templates} meta="Dashboard templates">
          <div className="template-row">
            {["Matter Activity", "Billing Analytics", "DMS Media", "Risk Funnel"].map((template, index) => (
              <button key={template} className={`template-card tone-${index + 1}`}>
                <BarChart3 size={18} />
                <strong>{template}</strong>
                <span>Dashboard · {6 + index} charts</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      {variant === "tour" && (
        <>
          <div className="whats-new-popover">
            <button className="icon-button">
              <X size={15} />
            </button>
            <h2>What's New:</h2>
            {["All Content", "Live Events", "Out of the box Analytics", "Users", "Session Replay"].map((item) => (
              <p key={item}>
                <strong>{item}:</strong> Explore your workspace with faster navigation and clearer analysis surfaces.
              </p>
            ))}
            <button className="secondary-button">Got it!</button>
          </div>
          <div className="settings-menu-preview">
            {["Organization settings", "Personal settings", "Theme: Light Mode", "Opt out of New Navigation", "Launch tour", "Report slowness", "Explore demo", "Log out"].map((item) => (
              <button key={item}>{item}</button>
            ))}
          </div>
        </>
      )}
      {["feedbackStars", "feedbackComment", "feedbackFilled", "feedbackThanks"].includes(variant) && (
        <SessionReplayFeedbackWidget variant={variant} />
      )}
    </section>
  );
}

export function SessionReplayFeedbackWidget({ variant }) {
  const isStars = variant === "feedbackStars";
  const isThanks = variant === "feedbackThanks";
  const isFilled = variant === "feedbackFilled";

  return (
    <div className="session-feedback-layer" aria-label="Session Replay feedback widget">
      <div className={`session-feedback-card ${isThanks ? "compact" : ""}`}>
        <button className="feedback-widget-close" aria-label="Close">
          <X size={16} />
        </button>
        {isStars && (
          <>
            <h2>How would you rate your experience using Session Replay?</h2>
            <div className="feedback-star-row">
              {[1, 2, 3, 4, 5].map((score) => (
                <button key={score} className="feedback-star-button">
                  <Star size={43} />
                  <span>{score}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {!isStars && !isThanks && (
          <>
            <h2>Anything else to add? How can Session Replay improve?</h2>
            <textarea
              className="session-feedback-textarea"
              placeholder="Type your answer here..."
              defaultValue={isFilled ? "Show me mouse clicks and make them more prominent" : ""}
            />
            <button className="primary-button session-feedback-submit">Submit</button>
          </>
        )}
        {isThanks && <h2>Thank you for your feedback! Happy replay watching</h2>}
      </div>
      <div className="session-feedback-tail" />
      <div className="session-feedback-plan">
        <div className="session-feedback-avatar" aria-hidden="true" />
        <div className="session-feedback-meter">
          <span>4 / 50k</span>
          <i />
          <button>Manage Plan</button>
        </div>
      </div>
    </div>
  );
}
