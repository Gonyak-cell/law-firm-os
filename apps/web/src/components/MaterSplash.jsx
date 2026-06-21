import React from "react";
import { BRAND_BYLINE, PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

const bylineOrganization = UI_BRAND.replace(`${PRODUCT_BRAND} ${BRAND_BYLINE} `, "");

export function MaterSplash({ compact = false, className = "" }) {
  const classes = ["mater-splash", compact ? "compact" : "", className].filter(Boolean).join(" ");
  const letters = PRODUCT_BRAND.split("");

  return (
    <div className={classes} aria-label={UI_BRAND}>
      <span className="mater-splash-brand" aria-hidden="true">
        <span className="mater-splash-mark">
          <span className="mater-splash-pill red" />
          <span className="mater-splash-pill yellow" />
          <span className="mater-splash-dot" />
        </span>
        <span className="mater-splash-word">
          {letters.map((letter, index) => (
            <span key={`${letter}-${index}`}>{letter}</span>
          ))}
        </span>
        {!compact && (
          <span className="mater-splash-byline">
            <span>{BRAND_BYLINE}</span>
            <strong>{bylineOrganization}</strong>
          </span>
        )}
      </span>
    </div>
  );
}
