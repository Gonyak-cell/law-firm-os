import React from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Panel } from "./primitives.jsx";

export function EmailFilingView() {
  return (
    <Panel className="vault-panel" title="Email Filing" meta="M365 placeholder">
      <div className="email-filing-view" data-cmp-g5-email-filing="true">
        <div className="document-detail-icon">
          <Mail size={18} />
        </div>
        <div>
          <strong>matter-thread-import</strong>
          <span>credential_ref required</span>
        </div>
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>credential material absent</span>
        </div>
      </div>
    </Panel>
  );
}
