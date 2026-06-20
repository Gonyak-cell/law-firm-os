import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryRepository } from '../src/persistence/repository.js';
import { runUnitOfWork } from '../src/persistence/unit-of-work.js';

test('unit of work restores repository snapshots on failure', () => {
  const repository = createMemoryRepository();
  assert.throws(() => runUnitOfWork({ repositories: [repository], work: () => { repository.create({ id: 'temp' }); throw new Error('boom'); } }), /boom/);
  assert.deepEqual(repository.list(), []);
});
