import React from "react";
import matterMark from "../assets/matter-mark.svg";
import { PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

export function MatterSplash({ compact = false, className = "" }) {
  const classes = ["matter-splash", compact ? "compact" : "", className].filter(Boolean).join(" ");
  const letters = PRODUCT_BRAND.split("");

  return (
    <div className={classes} aria-label={UI_BRAND}>
      <span className="matter-splash-brand" aria-hidden="true">
        <span className="matter-splash-mark">
          <img src={matterMark} alt={UI_BRAND} />
        </span>
        <span className="matter-splash-word">
          {letters.map((letter, index) => (
            <span key={`${letter}-${index}`}>{letter}</span>
          ))}
        </span>
      </span>
    </div>
  );
}
