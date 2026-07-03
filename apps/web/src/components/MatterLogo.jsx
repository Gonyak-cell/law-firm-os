import React from "react";
import amicMain from "../assets/logos/AMIC_n_PETRA_Main_Simple.svg";
import amicMainWhite from "../assets/logos/AMIC_n_PETRA_Main_Simple_White.svg";
import matterMark from "../assets/matter-mark.svg";
import { PRODUCT_BRAND, UI_BRAND } from "../brand/brand";

export function MatterLogo({ compact = false }) {
  return (
    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label={UI_BRAND}>
      <span className="matter-mark" aria-hidden="true">
        <img className="mark-matter" src={matterMark} alt={UI_BRAND} />
        <img className="mark-amic" src={amicMain} alt="AMIC" />
        <img className="mark-amic-inverse" src={amicMainWhite} alt="AMIC" />
      </span>
      <span className="matter-word">{PRODUCT_BRAND}</span>
    </div>
  );
}
