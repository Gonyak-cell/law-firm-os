import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Matter-Vault UI hardening exposes breadcrumb, badges, table, detail, and accessible nav labels', async () => {
  const files = await Promise.all([
    readFile(resolve(webRoot, 'src/components/VaultBreadcrumb.jsx'), 'utf8'),
    readFile(resolve(webRoot, 'src/components/VaultSecurityBadges.jsx'), 'utf8'),
    readFile(resolve(webRoot, 'src/components/VaultDocumentTable.jsx'), 'utf8'),
    readFile(resolve(webRoot, 'src/components/VaultDocumentDetail.jsx'), 'utf8'),
  ]);
  const source = files.join("\n");
  assert.match(source, /aria-label="Matter Vault breadcrumb"/);
  assert.match(source, /data-mv-vault-security-badges="true"/);
  assert.match(source, /DataTable/);
  assert.match(source, /Version History/);
});
