import React from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { Panel } from "./primitives.jsx";

function privilegeLabel(value) {
  if (!value) return "기본 권한";
  if (value.includes("confidential")) return "기밀";
  if (value.includes("privileged")) return "특권";
  return "기본 권한";
}

function holdLabel(value) {
  if (!value || value === "없음") return "없음";
  if (value.includes("hold")) return "보존 적용";
  return "확인 필요";
}

function accountLabel(item) {
  if (item.registered_account?.display_name) return item.registered_account.display_name;
  if (item.registered_account?.email || item.registered_account_email) return "등록 계정";
  return "미연동";
}

export function DocumentDetail({ document }) {
  const item = document ?? {
    document_id: "",
    title: "선택된 문서가 없습니다",
    current_version_id: "",
    privilege_label_id: "기본 권한",
    legal_hold_id: "없음",
    storage_pointer_ref_included: false,
    document_bytes_included: false
  };

  return (
    <Panel id="vault-detail" className="vault-panel" title="문서 상세" meta="권한 기준 적용">
      <div className="document-detail" data-cmp-g5-document-detail="true">
        <div className="document-detail-icon">
          <FileText size={18} />
        </div>
        <div>
          <strong>{item.title}</strong>
          <span>{document ? "버전 정보 있음" : "문서를 선택하세요"}</span>
        </div>
        <div className="vault-property-grid">
          <span>권한</span>
          <strong>{privilegeLabel(item.privilege_label_id)}</strong>
          <span>보존</span>
          <strong>{holdLabel(item.legal_hold_id)}</strong>
          <span>등록 계정</span>
          <strong>{accountLabel(item)}</strong>
          <span>담당자</span>
          <strong>{item.registered_account?.display_name ?? (item.owner_user_id ? "담당자 지정" : "미연동")}</strong>
          <span>저장 위치</span>
          <strong>{item.storage_pointer_ref_included ? "표시 제한" : "숨김"}</strong>
          <span>문서 내용</span>
          <strong>{item.document_bytes_included ? "표시 제한" : "숨김"}</strong>
        </div>
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>문서 내용은 권한이 있을 때만 표시됩니다.</span>
        </div>
      </div>
    </Panel>
  );
}
