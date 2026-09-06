import React from 'react';
import { Download, Eye, Paperclip } from 'lucide-react';
import { DocumentDetail } from './DocumentDetail.jsx';
import { Panel } from './primitives.jsx';

function detailLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

export function VaultDocumentDetail({
  document,
  labels = {},
  saveAsAvailable = false,
  saveAsState = 'idle',
  onSaveAs = () => {},
  previewAvailable = false,
  previewState = 'idle',
  onPreview = () => {},
  classicOutlookAttachAvailable = false,
  classicOutlookAttachState = 'idle',
  onClassicOutlookAttach = () => {},
}) {
  const versionId = document?.current_version_id ?? document?.version_id ?? '';
  const sha256 = document?.latest_sha256 ?? document?.content_sha256 ?? '';
  const corporate = document?.matter_id === null && Boolean(document?.workspace_id);
  return (
    <div data-mv-vault-document-detail="true">
      <DocumentDetail document={document} labels={labels} />
      <Panel className="vault-panel" title={detailLabel(labels, 'vaultExactVersionLabel', '버전 기준')} meta={detailLabel(labels, 'vaultAuthorityValue', 'Vault 서버')}>
        <dl className="vault-exact-version-facts" data-vault-exact-version-facts="true">
          <div><dt>{detailLabel(labels, 'documentIdLabel', '문서 ID')}</dt><dd><code>{document?.document_id ?? detailLabel(labels, 'documentExactIdentityMissing', '확인 필요')}</code></dd></div>
          <div><dt>{corporate ? detailLabel(labels, 'documentWorkspaceLabel', '문서 공간') : detailLabel(labels, 'documentMatterLabel', 'Matter')}</dt><dd><code>{(corporate ? document.workspace_id : document?.matter_id) ?? detailLabel(labels, 'documentExactIdentityMissing', '확인 필요')}</code></dd></div>
          <div><dt>{detailLabel(labels, 'documentVersionIdLabel', '버전 ID')}</dt><dd><code>{versionId || detailLabel(labels, 'documentExactIdentityMissing', '확인 필요')}</code></dd></div>
          <div><dt>{detailLabel(labels, 'documentHashLabel', 'SHA-256')}</dt><dd><code>{sha256 || detailLabel(labels, 'documentExactIdentityMissing', '확인 필요')}</code></dd></div>
        </dl>
        <div className="vault-document-save-actions" data-vault-document-save-actions="true">
          <button
            type="button"
            className="secondary-button"
            disabled={!previewAvailable || previewState === 'opening'}
            onClick={onPreview}
          >
            <Eye size={16} aria-hidden="true" />
            {previewState === 'opening'
              ? detailLabel(labels, 'vaultPreviewOpening', '정확한 버전 확인 중')
              : detailLabel(labels, 'vaultPreviewAction', '미리보기')}
          </button>
          {classicOutlookAttachAvailable && (
            <button
              type="button"
              className="primary-button"
              disabled={classicOutlookAttachState === 'attaching' || classicOutlookAttachState === 'attached'}
              onClick={onClassicOutlookAttach}
            >
              <Paperclip size={16} aria-hidden="true" />
              {classicOutlookAttachState === 'attaching'
                ? detailLabel(labels, 'vaultOutlookAttaching', 'Outlook에 첨부 중')
                : classicOutlookAttachState === 'attached'
                  ? detailLabel(labels, 'vaultOutlookAttachedAction', 'Outlook에 첨부됨')
                  : detailLabel(labels, 'vaultOutlookAttachAction', '현재 Outlook 초안에 첨부')}
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={!saveAsAvailable || saveAsState === 'saving'}
            onClick={onSaveAs}
          >
            <Download size={16} aria-hidden="true" />
            {saveAsState === 'saving'
              ? detailLabel(labels, 'vaultSaveAsSaving', '정확한 버전 확인 중')
              : detailLabel(labels, 'vaultSaveAsAction', '내 컴퓨터에 저장')}
          </button>
          {!saveAsAvailable && <span>{detailLabel(labels, 'vaultSaveAsUnavailable', 'AMIC OS 데스크톱에서 정확한 버전 정보를 확인한 문서만 저장할 수 있습니다.')}</span>}
          {!previewAvailable && <span>{detailLabel(labels, 'vaultPreviewUnavailable', 'AMIC OS 데스크톱에서 지원하는 문서 형식만 미리 볼 수 있습니다.')}</span>}
          {previewState === 'opened' && <span role="status">{detailLabel(labels, 'vaultPreviewOpened', '정확한 버전을 기본 문서 앱에서 열었습니다. 임시 파일은 자동으로 삭제됩니다.')}</span>}
          {previewState === 'failed' && <span role="alert">{detailLabel(labels, 'vaultPreviewFailed', '미리보기를 열지 못했습니다. Vault 권한과 문서 버전을 다시 확인하세요.')}</span>}
          {saveAsState === 'saved' && <span role="status">{detailLabel(labels, 'vaultSaveAsComplete', '선택한 위치에 저장했고 Vault 전달 기록을 확인했습니다.')}</span>}
          {saveAsState === 'failed' && <span role="alert">{detailLabel(labels, 'vaultSaveAsFailed', '저장을 완료하지 못했습니다. 파일을 다시 받기 전에 Vault 기록을 확인하세요.')}</span>}
          {classicOutlookAttachState === 'attached' && <span role="status">{detailLabel(labels, 'vaultOutlookAttachComplete', '정확한 버전을 현재 Outlook 초안에 첨부했고 Vault 기록을 확인했습니다.')}</span>}
          {classicOutlookAttachState === 'expired' && <span role="alert">{detailLabel(labels, 'vaultOutlookAttachExpired', '첨부 요청 시간이 지났습니다. Outlook에서 ‘Vault에서 첨부’를 다시 누르세요.')}</span>}
          {['failed', 'unavailable'].includes(classicOutlookAttachState) && <span role="alert">{detailLabel(labels, 'vaultOutlookAttachFailed', '첨부를 확인하지 못했습니다. Outlook 초안을 확인한 뒤 새 첨부는 리본 버튼에서 다시 시작하세요.')}</span>}
        </div>
      </Panel>
      <Panel className="vault-panel" title={detailLabel(labels, 'documentVersionHistory', '버전 기록')} meta={detailLabel(labels, 'documentChangeHistory', '변경 이력')}>
        <div className="live-data-state" data-vault-version-history="unavailable" role="status">
          <strong>{detailLabel(labels, 'documentVersionHistoryUnavailableTitle', '버전 기록은 아직 제공되지 않습니다.')}</strong>
          {detailLabel(labels, 'documentVersionHistoryUnavailableBody', 'Vault 서버가 전체 기록을 제공하기 전까지 위의 현재 버전 정보만 표시합니다.')}
        </div>
      </Panel>
    </div>
  );
}
