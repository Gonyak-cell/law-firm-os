import React from "react";
import { ArrowRight, Link2, ShieldCheck } from "lucide-react";
import { conditionalGlobalItems, getGlobalUtilityByView, globalUtilityItems } from "../data/globalUtilities.js";
import { PageHeader, Panel } from "./primitives.jsx";

function sectionStateLabel(section, utility) {
  if (section.state === "audit_required") return "감사 필요";
  if (utility.status === "decision-required") return "결정 필요";
  return "전역";
}

function sectionDescription(section, utility) {
  if (utility.status === "decision-required") return utility.decision;
  if (section.legacyRoutes?.length > 0) {
    const domains = Array.from(new Set(section.legacyRoutes.map((route) => route.view))).join(", ");
    return `${domains} 메뉴에서 이 전역 항목으로 연결합니다.`;
  }
  return "전역 메뉴에서 직접 여는 항목입니다.";
}

function UtilitySectionCard({ section, utility, active, onOpen }) {
  const Icon = section.icon ?? utility.icon;
  return (
    <button
      type="button"
      className={active ? "global-utility-card active" : "global-utility-card"}
      data-global-utility-card={section.id}
      aria-current={active ? "location" : undefined}
      onClick={() => onOpen(section.id)}
    >
      <span className="global-utility-card-icon">
        <Icon size={18} />
      </span>
      <span className="global-utility-card-copy">
        <strong>{section.label}</strong>
        <small>{sectionDescription(section, utility)}</small>
      </span>
      <span className="global-utility-source">{section.source}</span>
      <ArrowRight size={15} />
    </button>
  );
}

function UtilityTab({ section, utility, active, onOpen }) {
  const Icon = section.icon ?? utility.icon;
  return (
    <button type="button" className={active ? "active" : ""} onClick={() => onOpen(section.id)}>
      <Icon size={14} />
      <span>{section.label}</span>
    </button>
  );
}

function UtilityDetail({ section, utility }) {
  const Icon = section.icon ?? utility.icon;
  return (
    <Panel id={`global-${utility.id}-detail`} className="global-utility-detail" title={section.label} meta={sectionStateLabel(section, utility)}>
      <div className="global-utility-detail-header">
        <span className="global-utility-detail-icon">
          <Icon size={20} />
        </span>
        <div>
          <strong>{utility.label}</strong>
          <p>{sectionDescription(section, utility)}</p>
        </div>
      </div>
      <div className="global-utility-proof-grid">
        <div>
          <span>소스</span>
          <strong>{section.source}</strong>
        </div>
        <div>
          <span>상태</span>
          <strong>{sectionStateLabel(section, utility)}</strong>
        </div>
        <div>
          <span>연결</span>
          <strong>{section.legacyRoutes?.length ? `${section.legacyRoutes.length}개` : "직접"}</strong>
        </div>
      </div>
      {section.legacyRoutes?.length > 0 && (
        <div className="global-utility-route-list" data-global-legacy-routes="true">
          {section.legacyRoutes.map((route) => (
            <span key={`${route.view}:${route.section}`}>
              <Link2 size={13} />
              {route.view}#{route.section}
            </span>
          ))}
        </div>
      )}
      {section.state === "audit_required" && (
        <div className="live-data-state live-data-review" data-global-audit-required="true">
          <strong>감사 대상 작업입니다.</strong>
          강제 승인/거절 또는 고급 옵션은 권한과 사유 기록이 필요합니다.
        </div>
      )}
      {utility.status === "decision-required" && (
        <div className="live-data-state live-data-review" data-global-decision-required="true">
          <strong>조건부 전역화 항목입니다.</strong>
          {utility.decision}
        </div>
      )}
      {utility.id === "notifications" && section.id === "notifications-center" && (
        <div className="live-data-state live-data-empty" data-global-notifications-center="true">
          <strong>상단 알림 드로어와 같은 알림 원장을 사용합니다.</strong>
          드로어의 읽음 처리와 알림 설정은 이 전역 알림 센터의 항목으로 연결됩니다.
        </div>
      )}
    </Panel>
  );
}

export function GlobalUtilitySurface({ view, activeSection = "", setView }) {
  const utility = getGlobalUtilityByView(view) ?? globalUtilityItems[0];
  const activeId = utility.sections.some((section) => section.id === activeSection) ? activeSection : utility.defaultSection;
  const active = utility.sections.find((section) => section.id === activeId) ?? utility.sections[0];

  function openSection(sectionId) {
    setView(utility.id, sectionId);
  }

  return (
    <section
      className="surface stack global-utility-surface"
      data-global-utility-surface={utility.id}
      data-global-conditional={utility.status === "decision-required" ? "true" : "false"}
    >
      <div className="global-utility-layer">
        <PageHeader
          title={utility.label}
          subtitle={utility.description ?? utility.decision}
          actions={
            <span className="global-utility-status">
              <ShieldCheck size={15} />
              {utility.status === "decision-required" ? "결정 게이트" : "전역 메뉴"}
            </span>
          }
        />
        <div className="global-utility-tabs" role="tablist" aria-label={`${utility.label} 항목`}>
          {utility.sections.map((section) => (
            <UtilityTab key={section.id} section={section} utility={utility} active={section.id === activeId} onOpen={openSection} />
          ))}
        </div>
        <div className="global-utility-layout">
          <div className="global-utility-card-list">
            {utility.sections.map((section) => (
              <UtilitySectionCard key={section.id} section={section} utility={utility} active={section.id === activeId} onOpen={openSection} />
            ))}
          </div>
          <UtilityDetail section={active} utility={utility} />
        </div>
        {utility.id === "settings" && (
          <div className="global-utility-related" data-global-conditional-preview="true">
            {conditionalGlobalItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className="global-utility-related-item" onClick={() => setView(item.id, item.defaultSection)}>
                  <Icon size={15} />
                  <span>{item.label}</span>
                  <small>조건부</small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
