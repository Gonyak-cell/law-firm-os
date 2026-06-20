#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
const output = 'docs/reorganization/client-matter-os/matter-vault-r4/migration-inventory.json';
mkdirSync('docs/reorganization/client-matter-os/matter-vault-r4', { recursive: true });
const inventory = { generated_at: new Date().toISOString(), synthetic_inventory_only: true, matter_vault_link_candidates: [], duplicate_workspace_candidates: [] };
writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
console.log('Matter-Vault inventory written: ' + output);
