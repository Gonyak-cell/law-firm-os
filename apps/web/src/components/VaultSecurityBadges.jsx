import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function VaultSecurityBadges({ document = {} }) {
  return (
    <div className="vault-safe-strip" data-mv-vault-security-badges="true">
      <ShieldCheck size={15} />
      <span>{document.legal_hold_id ? 'Legal hold' : 'No hold'} / {document.privilege_label_id ?? 'standard privilege'}</span>
    </div>
  );
}
