import React from "react";
import matterMark from "../assets/matter-mark.svg";
import { PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label={UI_BRAND}>
      <span className="matter-mark" aria-hidden="true">
        <img src={matterMark} alt={UI_BRAND} />
      </span>
      <span className="matter-word">{PRODUCT_BRAND}</span>
    </div>
  );
}
