import { createHash } from 'node:crypto';

export function computeSha256(bytes = '') {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  return createHash('sha256').update(buffer).digest('hex');
}

export function assertHashLineage({ version, file_object } = {}) {
  if (!version?.sha256 || !file_object?.sha256) throw new Error('sha256 lineage is required');
  if (version.sha256 !== file_object.sha256) throw new Error('hash lineage mismatch');
  return Object.freeze({ hash_lineage_verified: true, sha256: version.sha256 });
}
