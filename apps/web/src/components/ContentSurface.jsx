import React from "react";
import { BookOpen, ChevronDown, Filter, Plus } from "lucide-react";
import { contentRows } from "../data/mockData.js";
import { CompactTable, DataTable, PageHeader, Panel } from "./primitives.jsx";

export function ContentSurface({ labels }) {
  return (
    <section className="surface stack">
      <PageHeader
        title={labels.allContent}
        subtitle="Search, organize, and manage charts, dashboards, flags, and matter resources."
        actions={
          <>
            <button className="secondary-button">
              <Filter size={15} />
              Filter
            </button>
            <button className="primary-button">
              <Plus size={15} />
              New
            </button>
          </>
        }
      />
      <div className="content-layout">
        <Panel className="span-2" title={labels.allContent} meta="Table-first operational surface">
          <DataTable
            columns={["Name", "Type", "Editor", "Modified", "Views", "Status"]}
            rows={contentRows.map((row) => [row.name, row.type, row.editor, row.modified, row.views, row.status])}
          />
        </Panel>
        <Panel title={labels.resources} meta="Side resource drawer">
          <div className="resource-list">
            {["Matter analytics guide", "DMS connector docs", "Billing event schema", "Permission kernel setup"].map((item) => (
              <button key={item} className="resource-row">
                <BookOpen size={15} />
                <span>{item}</span>
                <ChevronDown size={13} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={labels.flags} meta="Feature flag table states">
          <CompactTable
            columns={["Flag", "State", "Target"]}
            rows={[
              ["audit.raw.panel", "Live", "100%"],
              ["billing.approval.guard", "Running", "41%"],
              ["matter.ask.answer", "Draft", "0%"]
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}
