import React from 'react';
import { FolderOpen } from 'lucide-react';

export function VaultBreadcrumb({ matterId, workspaceId }) {
  return (
    <nav className="vault-safe-strip" data-mv-vault-breadcrumb="true" aria-label="Matter Vault breadcrumb">
      <FolderOpen size={15} />
      <span>Matters / {matterId ?? 'unlinked'} / Vault / {workspaceId ?? 'workspace pending'}</span>
    </nav>
  );
}
