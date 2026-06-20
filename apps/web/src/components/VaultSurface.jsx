import React from "react";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchVaultDocuments } from "../data/apiClient.js";
import { DataTable, MetricCard, PageHeader, Panel } from "./primitives.jsx";
import { DocumentDetail } from "./DocumentDetail.jsx";
import { EmailFilingView } from "./EmailFilingView.jsx";
import { VaultBreadcrumb } from "./VaultBreadcrumb.jsx";
import { VaultDocumentDetail } from "./VaultDocumentDetail.jsx";
import { VaultDocumentTable } from "./VaultDocumentTable.jsx";
import { VaultSecurityBadges } from "./VaultSecurityBadges.jsx";

const VAULT_PERMISSION_REF = "ui_cmp_g5_vault_live";
const VAULT_AUDIT_HINT_REF = "ui_cmp_g5_vault_probe";

function vaultRows(items) {
  return items.map((item) => [
    item.document_id,
    item.title,
    item.status,
    item.current_version_id,
    item.privilege_label_id ?? "standard",
    item.legal_hold_id ?? "none"
  ]);
}

export function VaultSurface({ labels, liveCtx = "allow" }) {
  const [result, setResult] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

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
  const metrics = useMemo(
    () => ({
      documents: documents.length,
      held: documents.filter((item) => item.legal_hold_id).length,
      safe: documents.filter((item) => item.storage_pointer_ref_included === false).length
    }),
    [documents]
  );

  let body;
  if (result === null) {
    body = (
      <div className="live-data-state live-data-loading">
        <strong>Loading vault</strong>
        Reading Vault/DMS documents from the API.
      </div>
    );
  } else if (result.kind === "error") {
    body = (
      <div className="live-data-state live-data-error">
        <strong>Vault API unavailable</strong>
        Start the Law Firm OS API and reload this live surface.
      </div>
    );
  } else if (result.uiState === "denied") {
    body = (
      <div className="live-data-state live-data-denied">
        <strong>Access denied</strong>
        The permission gate blocked this Vault request.
      </div>
    );
  } else if (result.uiState === "review_required" || result.outcome === "review_required") {
    body = (
      <div className="live-data-state live-data-review">
        <strong>Review required</strong>
        This Vault request requires review before rows can be displayed.
      </div>
    );
  } else if (documents.length === 0) {
    body = (
      <div className="live-data-state live-data-empty">
        <strong>No documents</strong>
        The live query returned no Vault documents.
      </div>
    );
  } else {
    body = (
      <div className="vault-live-stack">
        <div className="vault-safe-strip">
          <ShieldCheck size={15} />
          <span>Legal hold and privilege metadata are visible; raw storage remains hidden.</span>
        </div>
        <VaultBreadcrumb matterId={selected?.matter_id} workspaceId={selected?.workspace_id} />
        <VaultSecurityBadges document={selected} />
        <VaultDocumentTable documents={documents} />
        <DataTable columns={["Document", "Title", "Status", "Version", "Privilege", "Hold"]} rows={vaultRows(documents)} />
      </div>
    );
  }

  return (
    <section className="surface stack vault-surface" data-cmp-g5-vault-surface="true">
      <PageHeader
        eyebrow="CMP-G5"
        title={labels.vaultTitle}
        subtitle="Vault-backed DMS runtime with permission-gated metadata and safe document projection."
        actions={
          <button className="secondary-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <div className="clients-metric-grid">
        <MetricCard label="Documents" value={metrics.documents} delta="metadata rows" tone="blue" />
        <MetricCard label="Legal hold" value={metrics.held} delta="guarded rows" tone="purple" />
        <MetricCard label="Safe detail" value={metrics.safe} delta="raw path hidden" tone="green" />
      </div>
      <div className="vault-runtime-grid">
        <Panel className="span-2 vault-panel" title="Matter Vault" meta="/api/vault/documents">
          {body}
        </Panel>
        <DocumentDetail document={selected} />
        <VaultDocumentDetail document={selected} />
        <EmailFilingView />
        <Panel className="vault-panel" title="Runtime Boundary" meta="R4 write-ready">
          <div className="matter-boundary-card">
            <FolderOpen size={20} />
            <strong>Storage adapter active</strong>
            <span>Owner approval and release gates remain outside this UI claim.</span>
          </div>
        </Panel>
      </div>
    </section>
  );
}
