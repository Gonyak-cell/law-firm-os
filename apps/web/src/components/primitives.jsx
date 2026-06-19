import React from "react";
import { MoreHorizontal } from "lucide-react";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}

export function Panel({ title, meta, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {meta && <span>{meta}</span>}
        </div>
        <button className="icon-button">
          <MoreHorizontal size={16} />
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, delta, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

export function CompactTable({ columns, rows }) {
  return (
    <table className="compact-table">
      <thead>
        <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${cell}-${cellIndex}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>
                  {cellIndex === 0 ? <strong>{cell}</strong> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MiniLineChart({ variant = "small" }) {
  if (variant === "bars") {
    return (
      <div className="bar-chart" aria-hidden="true">
        {[32, 64, 48, 76, 54, 92, 68].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    );
  }

  const height = variant === "large" ? 240 : 168;
  return (
    <svg className="line-chart" viewBox={`0 0 640 ${height}`} role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={`chartFill-${variant}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--am-blue-soft)" />
          <stop offset="100%" stopColor="rgba(11, 101, 229, 0)" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((line) => (
        <line key={line} x1="32" x2="610" y1={32 + line * 34} y2={32 + line * 34} />
      ))}
      <path d={`M32 ${height - 42} L110 ${height - 70} L190 ${height - 92} L278 ${height - 64} L366 ${height - 118} L482 ${height - 82} L610 ${height - 150}`} />
      <path
        className="chart-fill"
        d={`M32 ${height - 42} L110 ${height - 70} L190 ${height - 92} L278 ${height - 64} L366 ${height - 118} L482 ${height - 82} L610 ${height - 150} L610 ${height - 16} L32 ${height - 16} Z`}
        fill={`url(#chartFill-${variant})`}
      />
    </svg>
  );
}

export function GaugeChart({ value }) {
  const angle = -120 + value * 2.4;
  return (
    <div className="gauge">
      <svg viewBox="0 0 180 120" aria-label={`Gauge ${value}`}>
        <path d="M28 96 A62 62 0 0 1 152 96" />
        <path className="active" d="M28 96 A62 62 0 0 1 152 96" strokeDasharray={`${value * 1.56} 160`} />
        <line x1="90" y1="96" x2="90" y2="42" transform={`rotate(${angle} 90 96)`} />
      </svg>
      <strong>{value}</strong>
      <span>0s</span>
    </div>
  );
}

export function QueryBlock({ title, value, meta }) {
  return (
    <div className="query-block">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

export function Property({ label, value }) {
  return (
    <div className="property">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Field({ label, value }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input defaultValue={value} />
    </label>
  );
}
