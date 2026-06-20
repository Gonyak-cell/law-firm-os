import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatterRepository } from '../../../packages/matter/src/repository.js';
import { createDmsRepository } from '../../../packages/dms/src/repository.js';
import { createLocalStorageAdapter } from '../../../packages/dms/src/storage/local-storage-adapter.js';
import { openMatterWithVault } from '../../../packages/matter/src/matter-opening-orchestrator.js';
import { createSafeVaultProjection } from '../../../packages/dms/src/vault-projection.js';
import { assertLegalHoldAllowsAction } from '../../../packages/dms/src/legal-hold-guard.js';
import { searchMatterVault } from '../../../packages/dms/src/search/search-service.js';
import { filterMatterVaultSourcesForAi } from '../../../packages/ai-governance/src/source-policy.js';
import { createMatterVaultPortalProjection } from '../../../packages/client-portal/src/matter-vault-projection-service.js';

const TENANT = 'tenant_mv_hardening';
function payload() {
  return {
    matterRepository: createMatterRepository(),
    dmsRepository: createDmsRepository(),
    matter: { tenant_id: TENANT, matter_id: 'matter_mv_hardening', matter_number: 'MV-HARDEN-1', title: 'Hardening', status: 'opening', legal_client_party_id: 'party', billing_client_party_id: 'party', permission_envelope_id: 'perm_mv', audit_trace_id: 'audit_mv', created_by: 'actor', created_at: '2026-06-20T00:00:00.000Z' },
    clearance_token: { clearance_token_id: 'clearance', tenant_id: TENANT, intake_request_id: 'intake', conflict_check_id: 'conflict', engagement_id: 'engagement', snapshot_hash: 'sha256:clearance', token_state: 'valid', outcome: 'passed' },
    matter_number_seed: 'MV-HARDEN',
    idempotency_key: 'idem-mv-hardening',
    actor_id: 'actor',
  };
}

test('Matter-Vault hardening keeps opening idempotent and projection safe', () => {
  const input = payload();
  const first = openMatterWithVault(input);
  const second = openMatterWithVault(input);
  assert.equal(first.matter_vault_link.document_bytes_included, false);
  assert.equal(second.idempotent_replay, true);
  const projection = createSafeVaultProjection({ documents: [{ document_id: 'doc1', matter_id: first.matter.matter_id, title: 'Doc', status: 'active', raw_path: '/tmp/nope' }] });
  assert.equal(projection.items[0].raw_storage_path_included, false);
  assert.equal(projection.omitted_denied_count, null);
});

test('Matter-Vault hardening blocks held exports and permissionless search/AI', () => {
  assert.throws(() => assertLegalHoldAllowsAction({ document: { legal_hold_id: 'hold' }, action: 'export' }), /legal hold/);
  assert.throws(() => searchMatterVault({ query: 'doc', index_rows: [] }), /permission decision/);
  assert.throws(() => filterMatterVaultSourcesForAi({ sources: [] }), /permission decision/);
});

test('Matter-Vault portal projection remains projection-only', () => {
  const projection = createMatterVaultPortalProjection({ tenant_id: TENANT, matter_id: 'matter', source_document_ids: ['doc1'], permission_decision_id: 'decision' });
  assert.equal(projection.projection_only, true);
  assert.equal(projection.document_bytes_included, false);
  assert.equal(projection.internal_memo_excluded, true);
});
