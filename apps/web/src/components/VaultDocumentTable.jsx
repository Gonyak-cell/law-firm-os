import React from 'react';
import { DataTable } from './primitives.jsx';

function documentStatus(value) {
  if (value === 'review_required') return '검토 필요';
  if (value === 'archived') return '보관됨';
  return '사용 중';
}

export function VaultDocumentTable({ documents = [] }) {
  return (
    <div data-mv-vault-document-table="true">
      <DataTable columns={['문서', '제목', '상태', '버전']} rows={documents.map((doc, index) => [`문서 ${index + 1}`, doc.title, documentStatus(doc.status), doc.current_version_id ? '현재 버전' : '확인 필요'])} />
    </div>
  );
}
