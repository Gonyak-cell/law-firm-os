import React, { useId } from "react";

const moneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function money(value) {
  return `${moneyFormatter.format(Number(value) || 0)}원`;
}

function monthLabel(value) {
  const [, month] = String(value ?? "").split("-");
  return month ? `${Number(month)}월` : String(value ?? "");
}

export function HomeRevenueBarChart({ series = [] }) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 720;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 36, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...series.map((item) => Number(item.amount) || 0));
  const slotWidth = plotWidth / Math.max(series.length, 1);
  const barWidth = Math.min(34, Math.max(12, slotWidth * 0.58));
  const bars = series.map((item, index) => {
    const amount = Math.max(0, Number(item.amount) || 0);
    const barHeight = amount > 0 ? Math.max(2, amount / max * plotHeight) : 0;
    return {
      ...item,
      amount,
      x: padding.left + index * slotWidth + (slotWidth - barWidth) / 2,
      y: padding.top + plotHeight - barHeight,
      barHeight,
      labelX: padding.left + (index + 0.5) * slotWidth,
    };
  });

  return (
    <div className="home-revenue-chart" data-home-revenue-bar-chart="true">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>최근 12개월 월별 매출</title>
        <desc id={descriptionId}>Asia/Seoul 월 기준 등록 고객 연결 입금을 월별 막대로 비교합니다. 아래 표에서 정확한 금액을 확인할 수 있습니다.</desc>
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight * ratio;
          const value = max * (1 - ratio);
          return (
            <g key={ratio} className="home-chart-gridline">
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={padding.left - 10} y={y + 4} textAnchor="end">{moneyFormatter.format(value)}</text>
            </g>
          );
        })}
        {bars.map((bar, index) => (
          <g
            key={bar.month}
            className="home-revenue-bar-group"
            tabIndex="0"
            role="img"
            aria-label={`${bar.month} 등록 고객 입금 매출 ${money(bar.amount)}`}
          >
            <title>{`${bar.month} ${money(bar.amount)}`}</title>
            <rect
              className={bar.observed ? "home-revenue-bar observed" : "home-revenue-bar"}
              data-home-revenue-month={bar.month}
              data-home-revenue-amount={bar.amount}
              x={bar.x}
              y={bar.y}
              width={barWidth}
              height={bar.barHeight}
              rx="3"
            />
            {(index % 2 === 0 || index === bars.length - 1) && (
              <text className="home-chart-axis-label" x={bar.labelX} y={height - 12} textAnchor="middle">{monthLabel(bar.month)}</text>
            )}
          </g>
        ))}
      </svg>
      <table className="sr-only home-chart-data-table">
        <caption>최근 12개월 월별 매출 데이터</caption>
        <thead><tr><th>월</th><th>등록 고객 입금 매출</th></tr></thead>
        <tbody>
          {series.map((item) => <tr key={item.month}><th>{item.month}</th><td>{money(item.amount)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function HomePayrollDonutChart({ summary }) {
  const titleId = useId();
  const descriptionId = useId();
  const categories = Array.isArray(summary?.categories)
    ? summary.categories.filter((category) => category.category !== "unclassified" || Number(category.gross_krw) > 0)
    : [];
  const total = Number(summary?.gross_krw) || categories.reduce((sum, category) => sum + Number(category.gross_krw || 0), 0);
  let offset = 0;
  const segments = categories.map((category) => {
    const percent = total > 0 ? Number(category.gross_krw || 0) / total * 100 : 0;
    const segment = { ...category, percent, offset };
    offset += percent;
    return segment;
  });

  return (
    <div className="home-payroll-chart" data-home-payroll-donut-chart="true">
      <svg viewBox="0 0 220 220" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>이번달 급여 구성 도넛 차트</title>
        <desc id={descriptionId}>파트너, 고문, 직원별 이번달 총지급액 비율과 지급 인원입니다. 개인별 급여는 포함하지 않습니다.</desc>
        <circle className="home-payroll-donut-track" cx="110" cy="110" r="72" pathLength="100" />
        {segments.map((segment) => (
          <circle
            key={segment.category}
            className={`home-payroll-donut-segment ${segment.category}`}
            cx="110"
            cy="110"
            r="72"
            pathLength="100"
            strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
            strokeDashoffset={-segment.offset}
          />
        ))}
        <text className="home-payroll-donut-caption" x="110" y="101" textAnchor="middle">이번달 총액</text>
        <text className="home-payroll-donut-total" x="110" y="126" textAnchor="middle">{moneyFormatter.format(total)}</text>
        <text className="home-payroll-donut-unit" x="110" y="144" textAnchor="middle">원</text>
      </svg>
      <ul className="home-payroll-legend" aria-label="급여 구분별 금액 및 인원">
        {segments.map((segment) => (
          <li key={segment.category} className={segment.category} tabIndex="0">
            <span aria-hidden="true" />
            <div className="home-payroll-legend-name">
              <strong>{segment.label}</strong>
              <span className="home-payroll-legend-count">{Number(segment.employee_count) || 0}명</span>
            </div>
            <small>{money(segment.gross_krw)}</small>
            <em>{total > 0 ? `${segment.percent.toFixed(1)}%` : "0%"}</em>
          </li>
        ))}
      </ul>
      <table className="sr-only home-chart-data-table">
        <caption>급여 구분 데이터</caption>
        <thead><tr><th>구분</th><th>총지급액</th><th>인원</th></tr></thead>
        <tbody>
          {categories.map((category) => <tr key={category.category}><th>{category.label}</th><td>{money(category.gross_krw)}</td><td>{category.employee_count}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
