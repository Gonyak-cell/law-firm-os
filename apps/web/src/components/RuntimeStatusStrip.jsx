import React from "react";

export function RuntimeStatusStrip({ items }) {
  return (
    <section className="forest-status-strip" aria-label="런타임 연결 상태" data-forest-status-strip="true">
      {items.map(({ id, label, status, statusLabel, Icon }) => (
        <div key={id} className={`forest-status-item ${status}`}>
          <Icon size={16} />
          <span>{label}</span>
          <em>{statusLabel}</em>
        </div>
      ))}
    </section>
  );
}
