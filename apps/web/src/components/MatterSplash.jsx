import React from "react";
import { BRAND_BYLINE, PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

const bylineOrganization = UI_BRAND.replace(`${PRODUCT_BRAND} ${BRAND_BYLINE} `, "");

export function MatterSplash({ compact = false, className = "" }) {
  const classes = ["matter-splash", compact ? "compact" : "", className].filter(Boolean).join(" ");
  const letters = PRODUCT_BRAND.split("");

  return (
    <div className={classes} aria-label={UI_BRAND}>
      <span className="matter-splash-brand" aria-hidden="true">
        <span className="matter-splash-mark">
          <span className="matter-splash-pill red" />
          <span className="matter-splash-pill yellow" />
          <span className="matter-splash-dot" />
        </span>
        <span className="matter-splash-word">
          {letters.map((letter, index) => (
            <span key={`${letter}-${index}`}>{letter}</span>
          ))}
        </span>
        {!compact && (
          <span className="matter-splash-byline">
            <span>{BRAND_BYLINE}</span>
            <strong>{bylineOrganization}</strong>
          </span>
        )}
      </span>
    </div>
  );
}
