import React from "react";
import { BookOpen, ChevronDown, Filter, Plus } from "lucide-react";
import { CompactTable, DataTable, PageHeader, Panel } from "./primitives.jsx";

export function ContentSurface({ labels }) {
  return (
    <section className="surface stack">
      <PageHeader
        title={labels.allContent}
        subtitle="문서, 업무 보드, 설정 항목을 한곳에서 관리합니다."
        actions={
          <>
            <button className="secondary-button">
              <Filter size={15} />
              필터
            </button>
            <button className="primary-button">
              <Plus size={15} />
              새 항목
            </button>
          </>
        }
      />
      <div className="content-layout">
        <Panel className="span-2" title={labels.allContent} meta="업무 목록">
          <div className="live-data-state live-data-empty">
            <strong>표시할 콘텐츠가 없습니다</strong>
            연결된 콘텐츠가 있으면 이곳에 표시됩니다.
          </div>
        </Panel>
        <Panel title={labels.resources} meta="업무 안내">
          <div className="resource-list">
            {["Matter 보고서 안내", "문서 등록 안내", "청구 처리 안내", "권한 설정 안내"].map((item) => (
              <button key={item} className="resource-row">
                <BookOpen size={15} />
                <span>{item}</span>
                <ChevronDown size={13} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={labels.flags} meta="설정 목록">
          <CompactTable
            columns={["설정", "상태", "대상"]}
            rows={[]}
          />
        </Panel>
      </div>
    </section>
  );
}
