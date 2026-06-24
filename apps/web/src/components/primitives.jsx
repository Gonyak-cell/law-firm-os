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

export function Panel({ id, title, meta, children, className = "" }) {
  return (
    <section id={id} className={`panel ${className}`}>
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
