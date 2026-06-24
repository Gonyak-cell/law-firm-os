import React from 'react';
import { FolderOpen } from 'lucide-react';

export function VaultBreadcrumb({ matterId, workspaceId }) {
  const matterLabel = matterId ? 'Matter 선택됨' : 'Matter 미선택';
  const workspaceLabel = workspaceId ? '작업공간 준비됨' : '작업공간 대기';
  return (
    <nav className="vault-safe-strip" data-mv-vault-breadcrumb="true" aria-label="Matter Vault 위치">
      <FolderOpen size={15} />
      <span>{matterLabel} / Vault / {workspaceLabel}</span>
    </nav>
  );
}
