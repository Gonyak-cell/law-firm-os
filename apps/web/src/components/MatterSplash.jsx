import React from "react";
import amicLawLogo from "../assets/amic-law.svg";

export function MatterSplash({ compact = false, className = "" }) {
  const classes = ["matter-splash", compact ? "compact" : "", className].filter(Boolean).join(" ");
  return (
    <div className={classes} aria-label="AMIC Law">
      <img className="matter-splash-image" src={amicLawLogo} alt="" aria-hidden="true" width="175" height="28" />
    </div>
  );
}
