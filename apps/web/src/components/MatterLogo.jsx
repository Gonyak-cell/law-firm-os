import React from "react";
import amicLawLogo from "../assets/amic-law.svg";
import { BRAND_BYLINE, BRAND_ORGANIZATION, PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label={UI_BRAND}>
      <span className="matter-mark" aria-hidden="true">
        <span className="mark-pill red" />
        <span className="mark-pill yellow" />
        <span className="mark-dot" />
      </span>
      <span className="matter-word">{PRODUCT_BRAND}</span>
      {!compact && (
        <span className="matter-byline">
          <span>{BRAND_BYLINE}</span>
          <img src={amicLawLogo} alt={BRAND_ORGANIZATION} />
        </span>
      )}
    </div>
  );
}
