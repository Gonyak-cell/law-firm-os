import React from "react";

export function DesktopDeniedState({ resource = "workspace" }) {
  return (
    <div className="live-data-state live-data-denied desktop-denied-state" data-desktop-denied-state="true">
      <strong>Access denied</strong>
      <span>
        Permission recheck denied this {resource}. No row counts, snippets, citations, or document metadata are shown.
      </span>
    </div>
  );
}
