import React from 'react';
import { DocumentDetail } from './DocumentDetail.jsx';
import { DataTable, Panel } from './primitives.jsx';

export function VaultDocumentDetail({ document }) {
  const versions = document?.versions ?? (document?.current_version_id ? [{ version_id: document.current_version_id, status: 'current' }] : []);
  return (
    <div data-mv-vault-document-detail="true">
      <DocumentDetail document={document} />
      <Panel className="vault-panel" title="Version History" meta="immutable">
        <DataTable columns={['Version', 'Status']} rows={versions.map((version) => [version.version_id, version.status ?? 'current'])} />
      </Panel>
    </div>
  );
}
