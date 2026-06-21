import React from "react";
import { PRODUCT_BRAND } from "../brand/brand";
import { PageHeader } from "./primitives.jsx";
import { HomeSurface } from "./HomeSurface.jsx";

export function ThemeSurface({ labels, theme, setTheme, variant }) {
  if (variant === "darkTemplates") {
    return <DarkTemplatesSurface />;
  }

  return (
    <section className="surface stack">
      <PageHeader
        title={labels.themeTitle}
        subtitle="Choose the theme for your workspace."
        actions={
          <>
            <button className={theme === "light" ? "primary-button" : "secondary-button"} onClick={() => setTheme("light")}>
              Light
            </button>
            <button className={theme === "dark" ? "primary-button" : "secondary-button"} onClick={() => setTheme("dark")}>
              Dark
            </button>
          </>
        }
      />
      <div className="theme-grid">
        {["Light theme", "Dark theme", "System preference"].map((item, index) => (
          <button key={item} className={`theme-card ${index === 1 ? "dark-preview" : ""}`}>
            <div className="theme-preview">
              <span />
              <span />
              <span />
            </div>
            <strong>{item}</strong>
            <small>{index === 1 ? "Dark workspace" : "Workspace preference"}</small>
          </button>
        ))}
      </div>
      <div className="theme-sample">
        <HomeSurface labels={labels} setView={() => {}} onSave={() => {}} />
      </div>
    </section>
  );
}

export function DarkTemplatesSurface() {
  const templateCards = [
    { name: "Funnel Analysis", tone: "blue", chart: "bars" },
    { name: "Feature Adoption", tone: "pink", chart: "bars" },
    { name: "Getting Started KPIs (Web)", tone: "plain", chart: "rows" },
    { name: "Product KPIs", tone: "blue", chart: "bars" },
    { name: "Session Engagement", tone: "pink", chart: "line" },
    { name: "Marketing Analytics", tone: "plain", chart: "rows" },
    { name: "User Activity", tone: "purple", chart: "donut" }
  ];

  return (
    <section className="surface dark-templates-surface">
      <h1>Dashboard Templates</h1>
      <div className="dark-templates-layout">
        <aside className="dark-templates-nav">
          <button className="active" type="button">All Templates</button>
          <button type="button">Recently Viewed</button>
          <small>{`Created By ${PRODUCT_BRAND}`}</small>
          <button type="button">Use Case</button>
          <button type="button">Expert</button>
          <button type="button">Industry</button>
        </aside>
        <div className="dark-templates-main">
          <div className="dark-templates-banner">
            <strong>Get up and running quickly with industry-standard KPIs and metrics</strong>
            <p>
              Dashboard templates can be saved and fully customized, plus those charts will not count against your
              Org&apos;s saved chart limit. For access to unlimited custom charts, <a>check out the Plus plan</a>.
            </p>
          </div>
          <h2>Use Case (7)</h2>
          <div className="dark-templates-grid">
            {templateCards.map((card) => (
              <button key={card.name} className="dark-template-card" type="button">
                <strong>{card.name}</strong>
                <span className={`dark-template-preview tone-${card.tone}`}>
                  <span className={`dark-template-chart chart-${card.chart}`} aria-hidden="true">
                    {card.chart === "bars" &&
                      [42, 68, 54, 84, 60].map((height, index) => (
                        <i key={index} style={{ height: `${height}%` }} />
                      ))}
                    {card.chart === "rows" && [0, 1, 2, 3].map((row) => <i key={row} />)}
                    {card.chart === "line" && (
                      <svg viewBox="0 0 100 44" preserveAspectRatio="none">
                        <polyline
                          points="0,34 14,28 28,32 42,18 56,24 70,12 84,18 100,6"
                          fill="none"
                          stroke="#3f6fd8"
                          strokeWidth="2.4"
                        />
                      </svg>
                    )}
                    {card.chart === "donut" && <i className="donut" />}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
