import React from "react";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { fetchVaultDocuments } from "../data/apiClient.js";
import { DataTable, PageHeader, Panel } from "./primitives.jsx";
import { DesktopDeniedState } from "./DesktopDeniedState.jsx";
import { EmailFilingView } from "./EmailFilingView.jsx";
import { VaultBreadcrumb } from "./VaultBreadcrumb.jsx";
import { VaultDocumentDetail } from "./VaultDocumentDetail.jsx";
import { VaultSecurityBadges } from "./VaultSecurityBadges.jsx";

const VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";

function vaultRows(items) {
  return items.map((item, index) => [
    `문서 ${index + 1}`,
    item.title,
    registeredAccountLabel(item),
    vaultStatus(item.status),
    item.current_version_id ? "현재 버전" : "확인 필요",
    privilegeLabel(item.privilege_label_id),
    holdLabel(item.legal_hold_id)
  ]);
}

function registeredAccountLabel(item) {
  const account = item.registered_account;
  if (!account) return "미연동";
  return account.display_name ?? "등록 계정";
}

function vaultStatus(value) {
  if (value === "review_required") return "검토 필요";
  if (value === "archived") return "보관됨";
  if (value === "current") return "현재 버전";
  return "사용 중";
}

function privilegeLabel(value) {
  if (!value) return "기본";
  if (value.includes("confidential")) return "기밀";
  if (value.includes("privileged")) return "특권";
  return "기본";
}

function holdLabel(value) {
  if (!value) return "없음";
  return value.includes("hold") ? "보존 설정" : "확인 필요";
}

const VAULT_SECTIONS = new Set(["vault-documents", "vault-detail", "vault-email"]);

export function VaultSurface({ labels, liveCtx = "allow", activeSection = "" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const currentSection = VAULT_SECTIONS.has(activeSection) ? activeSection : "vault-documents";

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchVaultDocuments({
      ctx: liveCtx,
      permissionRef: VAULT_PERMISSION_REF,
      auditHintRef: VAULT_AUDIT_HINT_REF
    }).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

  const documents = result?.kind === "data" ? result.items : [];
  const selected = documents[0] ?? null;
  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Vault 문서 목록을 불러오는 중입니다</strong>
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Vault 문서 목록을 불러오지 못했습니다</strong>
        새로고침하거나 연결 상태를 확인하세요.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = <DesktopDeniedState />;
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>검토가 필요합니다</strong>
        검토가 끝나면 Vault 문서를 확인할 수 있습니다.
      </div>
    );
  } else if (documents.length === 0) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>표시할 문서가 없습니다</strong>
      </div>
    );
  } else {
    body = (
      <div className="vault-live-stack">
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>문서 본문은 권한이 있을 때만 표시합니다.</span>
        </div>
        <VaultBreadcrumb matterId={selected?.matter_id} workspaceId={selected?.workspace_id} />
        <VaultSecurityBadges document={selected} />
        <DataTable columns={["문서", "제목", "등록 계정", "상태", "버전", "권한", "보존"]} rows={vaultRows(documents)} />
      </div>
    );
  }

  return (
    <section id="vault-home" className="surface stack vault-surface" data-cmp-g5-vault-surface="true">
      <PageHeader
        title={labels.vaultTitle}
        subtitle="Vault 문서와 권한 상태를 확인합니다. 권한이 없는 본문은 숨깁니다."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />
      <div className="vault-runtime-grid">
        {currentSection === "vault-documents" && (
          <Panel id="vault-documents" className="span-2 vault-panel" title="Vault 문서함" meta="권한 기준 적용">
            {body}
          </Panel>
        )}
        {currentSection === "vault-detail" && <VaultDocumentDetail document={selected} />}
        {currentSection === "vault-email" && <EmailFilingView />}
      </div>
    </section>
  );
}
