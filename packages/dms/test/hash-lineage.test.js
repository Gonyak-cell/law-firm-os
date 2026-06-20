import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHashLineage, computeSha256 } from '../src/hash-lineage-service.js';

test('hash lineage detects mismatch and accepts matching sha256', () => {
  const sha256 = computeSha256('matter-vault');
  assert.equal(assertHashLineage({ version: { sha256 }, file_object: { sha256 } }).hash_lineage_verified, true);
  assert.throws(() => assertHashLineage({ version: { sha256: 'a' }, file_object: { sha256: 'b' } }), /hash lineage mismatch/);
});
