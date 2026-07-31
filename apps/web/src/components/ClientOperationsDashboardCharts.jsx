import React, { useId } from "react";

const INTEGER = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});
const DECIMAL = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

function won(value) {
  return `${INTEGER.format(value)}원`;
}

function compactWon(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "0";
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  if (absolute >= 100_000_000) {
    return `${sign}${DECIMAL.format(absolute / 100_000_000)}억`;
  }
  if (absolute >= 10_000) {
    return `${sign}${DECIMAL.format(absolute / 10_000)}만`;
  }
  return `${sign}${INTEGER.format(absolute)}`;
}

function monthLabel(value) {
  const [year, month] = String(value ?? "").split("-");
  return year && month
    ? `${Number(year)}년 ${Number(month)}월`
    : String(value ?? "");
}

function activateRoute(event, route, onNavigate) {
  if (
    event.type === "keydown"
    && event.key !== "Enter"
    && event.key !== " "
  ) {
    return;
  }
  if (event.type === "keydown") event.preventDefault();
  if (route) onNavigate(route);
}

export function ClientDepositRevenueChart({
  points,
  onNavigate = () => {},
}) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 760;
  const height = 248;
  const padding = { top: 20, right: 16, bottom: 38, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(
    0,
    ...points.map(({ amount }) => amount),
  );
  const minimum = Math.min(
    0,
    ...points.map(({ amount }) => amount),
  );
  const range = maximum - minimum || 1;
  const yFor = (amount) => (
    padding.top + (maximum - amount) / range * plotHeight
  );
  const zeroY = yFor(0);
  const slotWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(34, Math.max(12, slotWidth * 0.56));
  const ticks = [...new Set([maximum, 0, minimum])];

  return (
    <div
      className="client-deposit-revenue-chart"
      data-client-revenue-chart="true"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>최근 12개월 입금 매출</title>
        <desc id={descriptionId}>
          고객과 연결된 은행 입금에서 환불을 뺀 월별 금액입니다.
          각 막대를 선택하면 해당 월의 입금 매출 내역으로 이동합니다.
        </desc>
        {ticks.map((value) => {
          const y = yFor(value);
          return (
            <g
              key={value}
              className={value === 0
                ? "client-chart-gridline zero"
                : "client-chart-gridline"}
              aria-hidden="true"
            >
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <text
                x={padding.left - 9}
                y={y + 4}
                textAnchor="end"
              >
                {compactWon(value)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const valueY = yFor(point.amount);
          const barHeight = Math.max(
            2,
            Math.abs(valueY - zeroY),
          );
          const x = padding.left
            + index * slotWidth
            + (slotWidth - barWidth) / 2;
          const y = point.amount > 0
            ? valueY
            : point.amount < 0
              ? zeroY
              : zeroY - 1;
          return (
            <g
              key={point.month}
              className="client-revenue-bar-group"
              role="button"
              tabIndex="0"
              aria-label={`${monthLabel(point.month)} 입금 매출 ${won(point.amount)}`}
              data-client-revenue-month={point.month}
              data-client-revenue-amount={point.amount}
              onClick={(event) => activateRoute(
                event,
                point.route,
                onNavigate,
              )}
              onKeyDown={(event) => activateRoute(
                event,
                point.route,
                onNavigate,
              )}
            >
              <rect
                className={[
                  "client-revenue-bar",
                  point.amount < 0
                    ? "negative"
                    : point.amount === 0
                      ? "zero"
                      : "positive",
                ].join(" ")}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="2"
              />
              <text
                className="client-chart-axis-label"
                x={padding.left + (index + 0.5) * slotWidth}
                y={height - 12}
                textAnchor="middle"
              >
                {`${Number(point.month.slice(5))}월`}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>최근 12개월 입금 매출 데이터</caption>
        <thead>
          <tr><th>월</th><th>입금 매출</th></tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th>{point.month}</th>
              <td>{won(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientInquiryStatusBreakdown({
  items,
  total,
  onNavigate = () => {},
}) {
  return (
    <div
      className="client-inquiry-status-list"
      data-client-inquiry-status="true"
      aria-label={`문의 진행 현황 전체 ${total}건`}
    >
      {items.map((item) => {
        const share = total > 0
          ? item.count / total * 100
          : 0;
        return (
          <button
            key={item.code}
            type="button"
            className="client-inquiry-status-row"
            data-client-inquiry-status-code={item.code}
            style={{ "--client-inquiry-share": `${share}%` }}
            aria-label={`${item.label} ${item.count}건`}
            onClick={() => item.route && onNavigate(item.route)}
          >
            <span>
              <strong>{item.label}</strong>
              <em>{item.count}건</em>
            </span>
            <span
              className="client-inquiry-status-track"
              aria-hidden="true"
            >
              <i />
            </span>
          </button>
        );
      })}
    </div>
  );
}
