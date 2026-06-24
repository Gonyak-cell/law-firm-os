import React from 'react';
import { DocumentDetail } from './DocumentDetail.jsx';
import { DataTable, Panel } from './primitives.jsx';

export function VaultDocumentDetail({ document }) {
  const versions = document?.versions ?? (document?.current_version_id ? [{ version_id: document.current_version_id, status: 'current' }] : []);
  return (
    <div data-mv-vault-document-detail="true">
      <DocumentDetail document={document} />
      <Panel className="vault-panel" title="버전 기록" meta="변경 이력">
        <DataTable columns={['버전', '상태']} rows={versions.map((version, index) => [`버전 ${index + 1}`, version.status === 'current' ? '현재 버전' : '변경 이력'])} />
      </Panel>
    </div>
  );
}
