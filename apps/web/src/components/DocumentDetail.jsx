import React from "react";
import { FileText } from "lucide-react";
import { Panel } from "./primitives.jsx";

function detailLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

function privilegeLabel(value, labels) {
  if (!value) return detailLabel(labels, "documentDefaultPermission", "기본 권한");
  if (value.includes("confidential")) return detailLabel(labels, "documentConfidential", "기밀");
  if (value.includes("privileged")) return detailLabel(labels, "documentPrivileged", "특권");
  return detailLabel(labels, "documentDefaultPermission", "기본 권한");
}

function holdLabel(value, labels) {
  if (!value || value === "없음") return detailLabel(labels, "documentNone", "없음");
  if (value.includes("hold")) return detailLabel(labels, "documentHoldApplied", "보존 적용");
  return detailLabel(labels, "documentReviewRequired", "확인 필요");
}

function accountLabel(item, labels) {
  if (item.registered_account?.display_name) return item.registered_account.display_name;
  if (item.registered_account?.email || item.registered_account_email) return detailLabel(labels, "documentRegistered", "등록 계정");
  return detailLabel(labels, "documentUnlinked", "미연동");
}

export function DocumentDetail({ document, labels = {} }) {
  const item = document ?? {
    document_id: "",
    title: detailLabel(labels, "documentNoneSelected", "선택된 문서가 없습니다"),
    current_version_id: "",
    privilege_label_id: "기본 권한",
    legal_hold_id: "없음",
    storage_pointer_ref_included: false,
    document_bytes_included: false
  };

  return (
    <Panel id="vault-detail" className="vault-panel" title={detailLabel(labels, "documentDetailTitle", "문서 상세")} meta="">
      <div className="document-detail" data-cmp-g5-document-detail="true">
        <div className="document-detail-icon">
          <FileText size={18} />
        </div>
        <div>
          <strong>{item.title}</strong>
          <span>{document ? detailLabel(labels, "documentVersionAvailable", "버전 정보 있음") : detailLabel(labels, "documentSelectPrompt", "문서를 선택하세요")}</span>
        </div>
        <div className="vault-property-grid">
          <span>{detailLabel(labels, "documentPermission", "권한")}</span>
          <strong>{privilegeLabel(item.privilege_label_id, labels)}</strong>
          <span>{detailLabel(labels, "documentRetention", "보존")}</span>
          <strong>{holdLabel(item.legal_hold_id, labels)}</strong>
          <span>{detailLabel(labels, "documentRegisteredAccount", "등록 계정")}</span>
          <strong>{accountLabel(item, labels)}</strong>
          <span>{detailLabel(labels, "documentOwner", "담당자")}</span>
          <strong>{item.registered_account?.display_name ?? (item.owner_user_id ? detailLabel(labels, "documentOwnerAssigned", "담당자 지정") : detailLabel(labels, "documentUnlinked", "미연동"))}</strong>
          <span>{detailLabel(labels, "documentStorageLocation", "저장 위치")}</span>
          <strong>{item.storage_pointer_ref_included ? detailLabel(labels, "documentRestricted", "표시 제한") : detailLabel(labels, "documentHidden", "숨김")}</strong>
          <span>{detailLabel(labels, "documentContent", "문서 내용")}</span>
          <strong>{item.document_bytes_included ? detailLabel(labels, "documentRestricted", "표시 제한") : detailLabel(labels, "documentHidden", "숨김")}</strong>
        </div>
      </div>
    </Panel>
  );
}
