import React from "react";
import amicLawLogo from "../assets/amic-law.svg";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label="AMIC Law">
      <img className="amic-law-logo" src={amicLawLogo} alt="AMIC Law" width="175" height="28" />
    </div>
  );
}
