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
        subtitle="작업공간에 적용할 화면 테마를 선택합니다."
        actions={
          <>
            <button className={theme === "light" ? "primary-button" : "secondary-button"} onClick={() => setTheme("light")}>
              라이트
            </button>
            <button className={theme === "dark" ? "primary-button" : "secondary-button"} onClick={() => setTheme("dark")}>
              다크
            </button>
          </>
        }
      />
      <div className="theme-grid">
        {["라이트 테마", "다크 테마", "시스템 설정"].map((item, index) => (
          <button key={item} className={`theme-card ${index === 1 ? "dark-preview" : ""}`}>
            <div className="theme-preview">
              <span />
              <span />
              <span />
            </div>
            <strong>{item}</strong>
            <small>{index === 1 ? "어두운 화면" : "작업공간 설정"}</small>
          </button>
        ))}
      </div>
      <div className="theme-preview-surface">
        <HomeSurface labels={labels} setView={() => {}} onSave={() => {}} />
      </div>
    </section>
  );
}

export function DarkTemplatesSurface() {
  const templateCards = [
    { name: "접수 현황", tone: "blue", chart: "bars" },
    { name: "Matter 진행", tone: "pink", chart: "bars" },
    { name: "문서 처리", tone: "plain", chart: "rows" },
    { name: "청구 업무", tone: "blue", chart: "bars" },
    { name: "People 업무", tone: "pink", chart: "line" },
    { name: "공유 포털", tone: "plain", chart: "rows" },
    { name: "권한 관리", tone: "purple", chart: "donut" }
  ];

  return (
    <section className="surface dark-templates-surface">
      <h1>업무 보드 템플릿</h1>
      <div className="dark-templates-layout">
        <aside className="dark-templates-nav">
          <button className="active" type="button">전체 템플릿</button>
          <button type="button">최근 본 항목</button>
          <small>{`${PRODUCT_BRAND} 제공`}</small>
          <button type="button">업무 유형</button>
          <button type="button">담당자</button>
          <button type="button">분야</button>
        </aside>
        <div className="dark-templates-main">
          <div className="dark-templates-banner">
            <strong>Matter 업무에 맞는 보드 구조를 빠르게 시작하세요</strong>
            <p>
              템플릿은 저장 후 팀의 업무 방식에 맞게 수정할 수 있습니다.
            </p>
          </div>
          <h2>업무 유형</h2>
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
