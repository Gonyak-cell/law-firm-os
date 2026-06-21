import React from 'react';
import { DataTable } from './primitives.jsx';

export function VaultDocumentTable({ documents = [] }) {
  return (
    <div data-mv-vault-document-table="true">
      <DataTable columns={['Document', 'Title', 'Status', 'Version']} rows={documents.map((doc) => [doc.document_id, doc.title, doc.status, doc.current_version_id])} />
    </div>
  );
}
