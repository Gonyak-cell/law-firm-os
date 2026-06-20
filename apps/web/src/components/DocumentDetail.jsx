import React from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { Panel } from "./primitives.jsx";

export function DocumentDetail({ document }) {
  const item = document ?? {
    document_id: "none",
    title: "No document selected",
    current_version_id: "none",
    privilege_label_id: "none",
    legal_hold_id: "none",
    storage_pointer_ref_included: false,
    document_bytes_included: false
  };

  return (
    <Panel className="vault-panel" title="Document Detail" meta={item.document_id}>
      <div className="document-detail" data-cmp-g5-document-detail="true">
        <div className="document-detail-icon">
          <FileText size={18} />
        </div>
        <div>
          <strong>{item.title}</strong>
          <span>{item.current_version_id}</span>
        </div>
        <div className="vault-property-grid">
          <span>Privilege</span>
          <strong>{item.privilege_label_id ?? "standard"}</strong>
          <span>Legal hold</span>
          <strong>{item.legal_hold_id ?? "none"}</strong>
          <span>Raw path</span>
          <strong>{item.storage_pointer_ref_included ? "blocked" : "hidden"}</strong>
          <span>Bytes</span>
          <strong>{item.document_bytes_included ? "blocked" : "hidden"}</strong>
        </div>
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>no raw path or document bytes returned</span>
        </div>
      </div>
    </Panel>
  );
}
