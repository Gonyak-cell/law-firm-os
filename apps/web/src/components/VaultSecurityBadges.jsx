import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function VaultSecurityBadges({ document = {} }) {
  return (
    <div className="vault-safe-strip" data-mv-vault-security-badges="true">
      <ShieldCheck size={15} />
      <span>{document.legal_hold_id ? '보존 설정 있음' : '보존 설정 없음'} / {document.privilege_label_id ? '권한 기준 적용' : '기본 권한'}</span>
    </div>
  );
}
