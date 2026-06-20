import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLegalHoldAllowsAction } from '../src/legal-hold-guard.js';

test('document state guard blocks destructive actions under legal hold', () => {
  assert.equal(assertLegalHoldAllowsAction({ document: { legal_hold_status: 'none' }, action: 'delete' }), true);
  assert.throws(() => assertLegalHoldAllowsAction({ document: { legal_hold_status: 'active' }, action: 'delete' }), /legal hold/);
});
