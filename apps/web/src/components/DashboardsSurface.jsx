import React from "react";
import { FolderOpen, Plus } from "lucide-react";
import { MetricCard, MiniLineChart, PageHeader, Panel } from "./primitives.jsx";

export function DashboardsSurface({ labels, setView, variant, onCreateDashboard }) {
  if (variant === "template") {
    return <DashboardTemplatesSurface labels={labels} onCreateDashboard={onCreateDashboard} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.dashboards}
        subtitle="Create dashboards, notebooks, reports, and reusable matter templates."
        actions={
          <>
            <button className="secondary-button">
              <FolderOpen size={15} />
              Template
            </button>
            <button className="primary-button" onClick={() => setView("analytics")}>
              <Plus size={15} />
              Add chart
            </button>
          </>
        }
      />
      <div className="dashboard-grid">
        {["Matter command center", "Billing approval report", "DMS change notebook", "Risk funnel board", "Client growth dashboard", "Partner settlement"].map((title, index) => (
          <Panel key={title} title={title} meta={`Dashboard · ${index + 4} charts`}>
            {title === "Client growth dashboard" ? (
              <div className="notebook-cover" aria-hidden="true" />
            ) : index % 2 ? (
              <div className="bar-chart light" aria-hidden="true">
                {[32, 64, 48, 76, 54, 92, 68].map((height, barIndex) => (
                  <span key={barIndex} style={{ height: `${height}%` }} />
                ))}
              </div>
            ) : (
              <MiniLineChart variant="small" />
            )}
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function DashboardTemplatesSurface({ labels, onCreateDashboard }) {
  const templates = ["Product Analytics", "Lifecycle", "Engagement", "Retention", "Growth", "Custom Template"];

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.templates}
        subtitle="Start from a dashboard template, then adapt charts and sections for matter operations."
        actions={
          <>
            <button className="secondary-button">
              <FolderOpen size={15} />
              Browse
            </button>
            <button className="primary-button" onClick={onCreateDashboard}>
              <Plus size={15} />
              New Dashboard
            </button>
          </>
        }
      />
      <div className="template-gallery">
        {templates.map((template, index) => (
          <button key={template} className="dashboard-template-card">
            <span className={`template-preview-color tone-${(index % 4) + 1}`} />
            <strong>{template}</strong>
            <small>{index + 4} charts · {index % 2 ? "Team" : "Recommended"}</small>
          </button>
        ))}
      </div>
      <Panel title="Template Preview" meta="Matter activity dashboard">
        <div className="dashboard-template-preview">
          <MiniLineChart variant="large" />
          <div className="metric-grid compact">
            <MetricCard label="Active matters" value="1.49k" delta="+6.2%" tone="blue" />
            <MetricCard label="Reviewed docs" value="8.1k" delta="+12%" tone="green" />
            <MetricCard label="Denied events" value="24" delta="-4" tone="red" />
          </div>
        </div>
      </Panel>
    </section>
  );
}
