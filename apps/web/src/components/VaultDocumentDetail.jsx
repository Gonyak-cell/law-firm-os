import React from 'react';
import { DocumentDetail } from './DocumentDetail.jsx';
import { DataTable, Panel } from './primitives.jsx';

function detailLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

export function VaultDocumentDetail({ document, labels = {} }) {
  const versions = document?.versions ?? (document?.current_version_id ? [{ version_id: document.current_version_id, status: 'current' }] : []);
  return (
    <div data-mv-vault-document-detail="true">
      <DocumentDetail document={document} labels={labels} />
      <Panel className="vault-panel" title={detailLabel(labels, 'documentVersionHistory', '버전 기록')} meta={detailLabel(labels, 'documentChangeHistory', '변경 이력')}>
        <DataTable
          columns={[detailLabel(labels, 'documentVersionColumn', '버전'), detailLabel(labels, 'documentStatusColumn', '상태')]}
          rows={versions.map((version, index) => [
            `${detailLabel(labels, 'documentVersionPrefix', '버전')} ${index + 1}`,
            version.status === 'current' ? detailLabel(labels, 'documentCurrentVersion', '현재 버전') : detailLabel(labels, 'documentChangeHistory', '변경 이력')
          ])}
        />
      </Panel>
    </div>
  );
}
