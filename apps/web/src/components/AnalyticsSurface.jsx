import React from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Filter,
  GitBranch,
  LineChart,
  ListFilter,
  MoreVertical,
  PanelRightOpen,
  PlayCircle,
  Plus,
  Save,
  Search,
  Table2,
  X,
  Zap
} from "lucide-react";
import { DataTable, MiniLineChart, Panel, QueryBlock } from "./primitives.jsx";

export function AnalyticsSurface({ labels, variant, onSave }) {
  if (variant === "dataTable" || variant === "dataTablePicker") {
    return <DataTableBuilderSurface showPicker={variant === "dataTablePicker"} />;
  }

  return (
    <section className="builder-surface">
      <div className="builder-sidebar">
        <button className="builder-tab active">
          <LineChart size={15} />
          Segmentation
        </button>
        <button className="builder-tab">
          <GitBranch size={15} />
          Funnel
        </button>
        <button className="builder-tab">
          <Table2 size={15} />
          Data Table
        </button>
        <button className="builder-tab">
          <Activity size={15} />
          Retention
        </button>
        <button className="builder-tab">
          <Zap size={15} />
          Journeys
        </button>
      </div>
      <div className="builder-main">
        <div className="builder-top">
          <div>
            <h1>{labels.builderTitle}</h1>
          </div>
          <div className="toolbar">
            <button className="secondary-button">
              <CalendarDays size={15} />
              Last 30 days
            </button>
            <button className="secondary-button">
              <ListFilter size={15} />
              Breakdown
            </button>
            <button className="secondary-button">
              <PanelRightOpen size={15} />
              Side panel
            </button>
            <button className="primary-button" onClick={onSave}>
              <Save size={15} />
              {labels.saveChart}
            </button>
          </div>
        </div>
        <div className="builder-body">
          <aside className="query-rail">
            <QueryBlock title="Event" value="[Matter] Element Changed" meta="where document_status is redline_v12" />
            <QueryBlock title="Measured as" value="Uniques" meta="group by owner and risk tier" />
            <QueryBlock title="Segment by" value="Client tier" meta="enterprise, strategic, standard" />
            <button className="secondary-button full">
              <Plus size={15} />
              Add event or property
            </button>
          </aside>
          <section className="chart-area">
            <Panel title="Page views" meta="Matter event segmentation">
              <MiniLineChart variant="large" />
            </Panel>
            <Panel title={labels.resultTable} meta="Breakdown · Top values">
              <DataTable
                columns={["Property", "Value", "Events", "Uniques", "Change"]}
                rows={[
                  ["Owner", "Kim Seoyun", "1,492", "318", "+6.2%"],
                  ["Owner", "Lee Dohyun", "884", "201", "+4.1%"],
                  ["Risk", "High", "248", "92", "-2.4%"],
                  ["Client tier", "Enterprise", "1,102", "226", "+8.7%"]
                ]}
              />
            </Panel>
          </section>
          <aside className="side-panel">
            <h3>Recommendations</h3>
            <p>Review event definitions, suggested chart changes, custom events, and export states.</p>
            <div className="heatmap">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} style={{ opacity: 0.25 + ((index % 6) * 0.13) }} />
              ))}
            </div>
          </aside>
        </div>
      </div>
      {variant === "shareToast" && (
        <div className="share-success-toast" role="status">
          <CheckCircle2 size={16} />
          <span><strong>Success.</strong> Shared "Page views" with Alex Smith.</span>
          <button className="icon-button" type="button" aria-label="Dismiss share success">
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

export function DataTableBuilderSurface({ showPicker }) {
  const eventOptions = ["Any Active Event", "Any Event", "New User", "Element Changed", "Element Clicked", "End Session", "Page Viewed", "Start Session"];

  return (
    <section className="data-builder-surface">
      <aside className="data-builder-rail">
        <div className="builder-mode-tabs">
          {[
            [LineChart, "Segmentation"],
            [Filter, "Funnel"],
            [Table2, "Data Table"],
            [Activity, "Retention"],
            [Zap, "Journeys"]
          ].map(([Icon, label]) => (
            <button key={label} className={label === "Data Table" ? "active" : ""}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="data-builder-section">
          <h3>Segment by</h3>
          <button className="segment-box">
            <strong>1</strong>
            <span>All Users</span>
            <MoreVertical size={15} />
          </button>
          <div className="segment-actions">
            <button>+ Filter by</button>
            <button>+ In Cohort</button>
            <button>+ Performed</button>
          </div>
          <button className="text-button">+ Add Segment</button>
        </div>
      </aside>
      <main className="data-builder-main">
        <div className="data-empty-illustration" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <h1>Start your data table</h1>
        <p>Data tables enable multi-metric, multi-dimensional analyses in a single view</p>
        <button className="primary-button">
          <Plus size={15} />
          Add Event or Metric
          <ChevronDown size={14} />
        </button>
        {showPicker && (
          <div className="metric-picker">
            <section>
              <label className="picker-search">
                <Search size={15} />
                <input placeholder="Search" />
              </label>
              <div className="picker-tabs">
                <button className="active">Events</button>
                <button>Metrics</button>
              </div>
              <h3>Amplitude</h3>
              {eventOptions.map((event) => (
                <button key={event} className="event-option">
                  <Activity size={14} />
                  {event}
                </button>
              ))}
            </section>
            <section className="metric-picker-preview">
              <MiniLineChart />
              <strong>Select or Define a Metric</strong>
            </section>
          </div>
        )}
        <button className="text-button learn-link">
          <PlayCircle size={15} />
          Learn Data Tables
        </button>
      </main>
    </section>
  );
}
