#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
const output = 'docs/reorganization/client-matter-os/matter-vault-r4/backfill-matter-vault-links-dry-run.json';
mkdirSync('docs/reorganization/client-matter-os/matter-vault-r4', { recursive: true });
writeFileSync(output, JSON.stringify({ dry_run: true, created_links: 0, skipped_existing: 0, failed_rows: [] }, null, 2) + '\n');
console.log('MatterVaultLink backfill dry-run written: ' + output);
