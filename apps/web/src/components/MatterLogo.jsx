import React from "react";
import amicLawLogo from "../assets/amic-law.svg";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label="matter by AMIC">
      <span className="matter-mark" aria-hidden="true">
        <span className="mark-pill red" />
        <span className="mark-pill yellow" />
        <span className="mark-dot" />
      </span>
      <span className="matter-word">matter</span>
      {!compact && (
        <span className="matter-byline">
          <span>by</span>
          <img src={amicLawLogo} alt="AMIC Law" />
        </span>
      )}
    </div>
  );
}
