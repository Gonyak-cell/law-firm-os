import React from "react";
import { PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

function MatterSymbol() {
  return (
    <svg
      className="matter-mark"
      viewBox="0 0 222 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        className="matter-symbol-piece matter-symbol-red"
        x="41"
        y="7"
        width="48"
        height="118"
        rx="24"
        transform="rotate(31 65 66)"
        fill="#FF3158"
      />
      <rect
        className="matter-symbol-piece matter-symbol-yellow"
        x="104"
        y="7"
        width="48"
        height="118"
        rx="24"
        transform="rotate(31 128 66)"
        fill="#FFD43D"
      />
      <circle className="matter-symbol-piece matter-symbol-green" cx="194" cy="94" r="25" fill="#5CC878" />
    </svg>
  );
}

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label={UI_BRAND}>
      <MatterSymbol />
      <span className="matter-word">{PRODUCT_BRAND}</span>
    </div>
  );
}
