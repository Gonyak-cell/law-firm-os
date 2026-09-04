import React, { useState } from "react";
import { ArrowRight, Link2, ShieldCheck } from "lucide-react";
import { conditionalGlobalItems, getGlobalUtilityByView, globalUtilityItems } from "../data/globalUtilities.js";
import { GuardedStateNotice } from "./GuardedState.js";
import { ForestHero } from "./ForestHero.jsx";
import { PageHeader, Panel } from "./primitives.jsx";
import { EmployeeList } from "../people/employees/EmployeeList.tsx";
import { HRDocumentWorkspace } from "../people/documents/HRDocumentWorkspace.tsx";
import { PermissionAdminPanel } from "../people/admin/PermissionAdminPanel.jsx";
import { ExternalReadProviderPanel } from "./ExternalReadProviderPanel.jsx";
import { InternalUnsignedUpdatePanel } from "./InternalUnsignedUpdatePanel.jsx";

function sectionStateLabel(section, utility) {
  if (section.state === "audit_required") return "감사 필요";
  if (utility.status === "decision-required") return "결정 필요";
  return "전역";
}

function sectionDescription(section, utility) {
  if (section.description) return section.description;
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
        <GuardedStateNotice state="audit_required" title="감사 대상 작업입니다." dataAttrs={{ "data-global-audit-required": "true" }}>
          강제 승인/거절 또는 고급 옵션은 권한과 사유 기록이 필요합니다.
        </GuardedStateNotice>
      )}
      {utility.status === "decision-required" && (
        <GuardedStateNotice state="owner_blocked" title="확인이 필요한 항목입니다." dataAttrs={{ "data-global-decision-required": "true" }}>
          {utility.decision}
        </GuardedStateNotice>
      )}
      {utility.id === "notifications" && section.id === "notifications-center" && (
        <div className="live-data-state live-data-empty" data-global-notifications-center="true">
          <strong>알림과 메시지를 한곳에서 확인합니다.</strong>
          읽음 처리와 알림 설정을 여기에서 관리합니다.
        </div>
      )}
    </Panel>
  );
}

export function GlobalUtilitySurface({ view, activeSection = "", setView }) {
  const utility = getGlobalUtilityByView(view) ?? globalUtilityItems[0];
  const activeId = utility.sections.some((section) => section.id === activeSection) ? activeSection : utility.defaultSection;
  const active = utility.sections.find((section) => section.id === activeId) ?? utility.sections[0];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const liveEmploymentContracts = utility.id === "policies" && active.id === "policies-employment-contracts";
  const livePermissionAdmin = utility.id === "settings" && active.id === "settings-permissions";
  const liveExternalReadProviders = utility.id === "settings" && active.id === "settings-integrations";

  function openSection(sectionId) {
    setView(utility.id, sectionId);
  }

  return (
    <section
      className="surface stack global-utility-surface"
      data-global-utility-surface={utility.id}
      data-global-conditional={utility.status === "decision-required" ? "true" : "false"}
    >
      <ForestHero title={utility.label} imageOpacity={0.18} />
      <div className="global-utility-layer">
        <PageHeader
          title={utility.label}
          heroTakeover
          actions={
            <span className="global-utility-status">
              <ShieldCheck size={15} />
              {utility.status === "decision-required" ? "결정 게이트" : "전역 메뉴"}
            </span>
          }
        />
        <div className="global-utility-layout">
          <div className="global-utility-card-list">
            {utility.sections.map((section) => (
              <UtilitySectionCard key={section.id} section={section} utility={utility} active={section.id === activeId} onOpen={openSection} />
            ))}
          </div>
          {liveEmploymentContracts ? (
            <div className="global-utility-live-detail" data-global-live-hr-documents="employment-contracts">
              <EmployeeList selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} refreshKey={activeId} />
              <HRDocumentWorkspace employeeId={selectedEmployeeId} refreshKey={activeId} mode="contracts" />
            </div>
          ) : livePermissionAdmin ? (
            <div className="global-utility-live-detail settings-admin-live-detail" data-global-live-admin-permissions="settings-permissions">
              <PermissionAdminPanel key={activeId} />
            </div>
          ) : liveExternalReadProviders ? (
            <div className="global-utility-live-detail settings-admin-live-detail" data-global-live-external-read="settings-integrations">
              <ExternalReadProviderPanel key={activeId} />
              <InternalUnsignedUpdatePanel />
            </div>
          ) : (
            <UtilityDetail section={active} utility={utility} />
          )}
        </div>
        {utility.id === "settings" && (
          <div className="global-utility-related" data-global-conditional-preview="true">
            {conditionalGlobalItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="global-utility-related-item"
                  data-global-preview-marker="true"
                  onClick={() => setView(item.id, item.defaultSection)}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  <small>미리보기</small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
