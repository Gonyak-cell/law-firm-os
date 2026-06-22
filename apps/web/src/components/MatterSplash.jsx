import React from "react";
import matterLogo from "../assets/matter-logo.svg";
import { UI_BRAND } from "../brand/brand";

export function MatterSplash({ compact = false, className = "" }) {
  const classes = ["matter-splash", compact ? "compact" : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-label={UI_BRAND}>
      <img className="matter-splash-image" src={matterLogo} alt={UI_BRAND} />
    </div>
  );
}
