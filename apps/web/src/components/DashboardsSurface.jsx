import React from "react";
import { FolderOpen, Plus } from "lucide-react";
import { PageHeader, Panel } from "./primitives.jsx";

export function DashboardsSurface({ labels, setView, variant, onCreateDashboard }) {
  if (variant === "template") {
    return <DashboardTemplatesSurface labels={labels} onCreateDashboard={onCreateDashboard} />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.dashboards}
        subtitle="업무 보드와 보고서를 만들어 Matter 진행 상황을 정리합니다."
        actions={
          <>
            <button className="secondary-button">
              <FolderOpen size={15} />
              템플릿
            </button>
            <button className="primary-button" onClick={() => setView("analytics")}>
              <Plus size={15} />
              보고서 추가
            </button>
          </>
        }
      />
      <Panel title="업무 보드" meta="작업공간">
        <div className="live-data-state live-data-empty">
          <strong>표시할 업무 보드가 없습니다</strong>
          연결된 업무 자료가 있으면 이곳에 표시됩니다.
        </div>
      </Panel>
    </section>
  );
}

export function DashboardTemplatesSurface({ labels, onCreateDashboard }) {
  return (
    <section className="surface stack">
      <PageHeader
        title={labels.templates}
        subtitle="업무 템플릿을 선택해 Matter 보고서 구조를 빠르게 시작합니다."
        actions={
          <>
            <button className="secondary-button">
              <FolderOpen size={15} />
              찾아보기
            </button>
            <button className="primary-button" onClick={onCreateDashboard}>
              <Plus size={15} />
              새 업무 보드
            </button>
          </>
        }
      />
      <Panel title="템플릿" meta="작업공간">
        <div className="live-data-state live-data-empty">
          <strong>표시할 템플릿이 없습니다</strong>
          사용할 수 있는 템플릿이 있으면 이곳에 표시됩니다.
        </div>
      </Panel>
    </section>
  );
}
