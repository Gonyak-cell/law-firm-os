import React from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Panel } from "./primitives.jsx";

export function EmailFilingView() {
  return (
    <Panel id="vault-email" className="vault-panel" title="메일 보관" meta="연동 필요">
      <div className="email-filing-view" data-cmp-g5-email-filing="true">
        <div className="document-detail-icon">
          <Mail size={18} />
        </div>
        <div>
          <strong>Matter 메일 보관</strong>
          <span>메일 연동 후 사용할 수 있습니다</span>
        </div>
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>연동 정보가 연결되지 않았습니다</span>
        </div>
      </div>
    </Panel>
  );
}
