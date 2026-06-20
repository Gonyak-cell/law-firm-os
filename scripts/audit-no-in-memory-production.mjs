#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const source = readFileSync('packages/platform/src/persistence/repository.js', 'utf8');
const findings = [];
if (!source.includes('assertProductionRepository')) findings.push('assertProductionRepository missing');
if (!source.includes('Map repository')) findings.push('Map repository blocker missing');
if (!source.includes('durable repository')) findings.push('durable repository wording missing');
if (findings.length) {
  console.error('In-memory production audit failed:');
  for (const finding of findings) console.error('- ' + finding);
  process.exit(1);
}
console.log('In-memory production audit passed.');
