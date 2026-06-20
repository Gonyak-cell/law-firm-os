import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMatterRepository } from '../../../packages/matter/src/repository.js';
import { createDmsRepository } from '../../../packages/dms/src/repository.js';

test('Matter-Vault persistence smoke uses durable file-backed repositories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mv-persistence-'));
  const matter = createMatterRepository({ filePath: join(dir, 'matter.json') });
  const dms = createDmsRepository({ filePath: join(dir, 'dms.json') });
  assert.equal(matter.durable, true);
  assert.equal(dms.durable, true);
});
