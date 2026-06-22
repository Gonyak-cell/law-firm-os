import React from "react";
import { PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label={UI_BRAND}>
      <span className="matter-mark" aria-hidden="true">
        <span className="mark-pill red" />
        <span className="mark-pill yellow" />
        <span className="mark-dot" />
      </span>
      <span className="matter-word">{PRODUCT_BRAND}</span>
    </div>
  );
}
