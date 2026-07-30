import React, { useId } from "react";
import {
  buildMonthlyRevenueAxis,
  formatMonthlyRevenueAxisTick,
} from "./HomeDashboardModel.js";

const moneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const PAYROLL_DONUT_COLORS = Object.freeze({
  partner: "#0f4f42",
  staff: "#86bf92",
  advisor: "#2f8d67",
  unclassified: "#9aa3a0",
});
const NON_PAYROLL_DONUT_COLORS = Object.freeze({
  tax: "#123f67",
  card_settlement: "#1f5f8b",
  social_insurance: "#2f77a8",
  professional_services: "#5796bd",
  rent_office: "#80b2cf",
  other: "#afcfdf",
  unclassified: "#60758a",
});

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
  const axis = buildMonthlyRevenueAxis(series);
  const slotWidth = plotWidth / Math.max(series.length, 1);
  const barWidth = Math.min(34, Math.max(12, slotWidth * 0.58));
  const bars = series.map((item, index) => {
    const amount = Math.max(0, Number(item.amount) || 0);
    const barHeight = amount > 0 ? Math.max(2, amount / axis.maximum * plotHeight) : 0;
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
        <title id={titleId}>최근 6개월 월별 매출</title>
        <desc id={descriptionId}>Asia/Seoul 월 기준 최근 6개월 등록 고객 연결 입금을 월별 막대로 비교합니다. 아래 표에서 정확한 금액을 확인할 수 있습니다.</desc>
        {axis.ticks.map((value) => {
          const y = padding.top + plotHeight * (1 - value / axis.maximum);
          return (
            <g key={value} className="home-chart-gridline">
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={padding.left - 10} y={y + 4} textAnchor="end">{formatMonthlyRevenueAxisTick(value)}</text>
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
            <text className="home-chart-axis-label" x={bar.labelX} y={height - 12} textAnchor="middle">{monthLabel(bar.month)}</text>
          </g>
        ))}
      </svg>
      <table className="sr-only home-chart-data-table">
        <caption>최근 6개월 월별 매출 데이터</caption>
        <thead><tr><th>월</th><th>등록 고객 입금 매출</th></tr></thead>
        <tbody>
          {series.map((item) => <tr key={item.month}><th>{item.month}</th><td>{money(item.amount)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function HomeDonutChart({
  variant,
  title,
  description,
  total,
  categories,
  legendLabel,
  tableCaption,
  detailHeader,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const categoryTotal = categories.reduce((sum, category) => sum + (Number(category.amount) || 0), 0);
  const donutTotal = categoryTotal > 0 ? categoryTotal : total;
  let offset = 0;
  const segments = categories.map((category, index) => {
    const rawPercent = donutTotal > 0 ? Number(category.amount || 0) / donutTotal * 100 : 0;
    const percent = index === categories.length - 1
      ? Math.max(0, 100 - offset)
      : Math.min(rawPercent, Math.max(0, 100 - offset));
    const closesDonut = categories.length > 1 && index === categories.length - 1;
    const renderPercent = Math.min(100, percent + (closesDonut ? 0.15 : 0));
    const segment = { ...category, percent, renderPercent, offset };
    offset += percent;
    return segment;
  });

  return (
    <div
      className={`home-donut-chart ${variant}`}
      data-home-payroll-donut-chart={variant === "payroll" ? "true" : undefined}
      data-home-nonpayroll-donut-chart={variant === "nonpayroll" ? "true" : undefined}
    >
      <svg viewBox="0 0 220 220" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <circle className="home-donut-track" cx="110" cy="110" r="72" pathLength="100" />
        {segments.map((segment) => (
          <circle
            key={segment.category}
            className="home-donut-segment"
            cx="110"
            cy="110"
            r="72"
            pathLength="100"
            strokeDasharray={`${segment.renderPercent} ${100 - segment.renderPercent}`}
            strokeDashoffset={-segment.offset}
            data-home-donut-percent={segment.percent}
            strokeLinecap="butt"
            shapeRendering="geometricPrecision"
            style={{ stroke: segment.color }}
          >
            <title>{`${segment.label} ${money(segment.amount)}, ${segment.percent.toFixed(1)}%`}</title>
          </circle>
        ))}
        <text className="home-donut-caption" x="110" y="101" textAnchor="middle">이번달 총액</text>
        <text className="home-donut-total" x="110" y="126" textAnchor="middle">{moneyFormatter.format(total)}</text>
        <text className="home-donut-unit" x="110" y="144" textAnchor="middle">원</text>
      </svg>
      <ul className={`home-donut-legend ${variant}`} aria-label={legendLabel} data-home-donut-legend={variant}>
        {segments.map((segment) => (
          <li key={segment.category} tabIndex="0" style={{ "--home-donut-color": segment.color }}>
            <span className="home-donut-swatch" aria-hidden="true" />
            <div className="home-donut-legend-name">
              <strong>{segment.label}</strong>
              <span className="home-donut-legend-detail">{segment.detail}</span>
            </div>
            <small>{money(segment.amount)}</small>
            <em>{total > 0 ? `${segment.percent.toFixed(1)}%` : "0%"}</em>
          </li>
        ))}
      </ul>
      <table className="sr-only home-chart-data-table">
        <caption>{tableCaption}</caption>
        <thead><tr><th>구분</th><th>금액</th><th>{detailHeader}</th><th>비율</th></tr></thead>
        <tbody>
          {segments.map((segment) => (
            <tr key={segment.category}>
              <th>{segment.label}</th>
              <td>{money(segment.amount)}</td>
              <td>{segment.detail}</td>
              <td>{`${segment.percent.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HomePayrollDonutChart({ summary }) {
  const order = { partner: 0, staff: 1, advisor: 2, unclassified: 3 };
  const categories = (Array.isArray(summary?.categories) ? summary.categories : [])
    .filter((category) => category.category !== "unclassified" || Number(category.gross_krw) > 0)
    .sort((left, right) => (order[left.category] ?? 99) - (order[right.category] ?? 99))
    .map((category) => ({
      ...category,
      amount: Number(category.gross_krw) || 0,
      detail: `${Number(category.employee_count) || 0}명`,
      color: PAYROLL_DONUT_COLORS[category.category] ?? PAYROLL_DONUT_COLORS.unclassified,
    }));
  const total = Number(summary?.gross_krw) || categories.reduce((sum, category) => sum + category.amount, 0);
  return (
    <HomeDonutChart
      variant="payroll"
      title="이번달 급여 구성 도넛 차트"
      description="파트너, 직원, 고문별 이번달 총지급액 비율과 지급 인원입니다. 개인별 급여는 포함하지 않습니다."
      total={total}
      categories={categories}
      legendLabel="급여 구분별 금액 및 인원"
      tableCaption="급여 구분 데이터"
      detailHeader="인원"
    />
  );
}

export function HomeNonPayrollOutflowDonutChart({ summary }) {
  const categories = (Array.isArray(summary?.categories) ? summary.categories : [])
    .filter((category) => Number(category.amount) > 0)
    .map((category) => ({
      ...category,
      amount: Number(category.amount) || 0,
      detail: `${Number(category.transaction_count) || 0}건`,
      color: NON_PAYROLL_DONUT_COLORS[category.category] ?? NON_PAYROLL_DONUT_COLORS.other,
    }));
  const total = Number(summary?.total_krw) || categories.reduce((sum, category) => sum + category.amount, 0);
  return (
    <HomeDonutChart
      variant="nonpayroll"
      title="이번달 비급여 출금 구성 도넛 차트"
      description="급여 지급을 제외한 이번달 은행 출금을 분류별 금액 비율로 표시합니다. 개인 거래 내역은 포함하지 않습니다."
      total={total}
      categories={categories}
      legendLabel="비급여 출금 구분별 금액 및 건수"
      tableCaption="비급여 출금 구분 데이터"
      detailHeader="건수"
    />
  );
}
