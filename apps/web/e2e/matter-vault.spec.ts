import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readWebFile(path: string) {
  return readFile(resolve(root, path), "utf8");
}

test("Search workspace preserves Vault API hardening and exposes the proven document/OCR scope", async () => {
  const vaultSurface = await readWebFile("src/components/VaultSurface.jsx");
  const vaultApiClient = await readWebFile("src/data/vaultApiClient.ts");
  const breadcrumb = await readWebFile("src/components/VaultBreadcrumb.jsx");
  const table = await readWebFile("src/components/VaultDocumentTable.jsx");
  const detail = await readWebFile("src/components/VaultDocumentDetail.jsx");
  const badges = await readWebFile("src/components/VaultSecurityBadges.jsx");
  const runner = await readFile(resolve(root, "../../scripts/run-web-e2e.mjs"), "utf8");

  assert.match(vaultSurface, /data-search-scope="documents-ocr"/);
  assert.match(vaultSurface, /fetchVaultDocuments/);
  assert.match(vaultSurface, /fetchVaultSearch/);
  assert.match(vaultSurface, /VAULT_PERMISSION_REF/);
  assert.match(vaultSurface, /VAULT_AUDIT_HINT_REF/);
  assert.match(vaultSurface, /aria-label="Search"/);
  assert.match(vaultSurface, /문서\/OCR/);
  assert.match(vaultSurface, /return \["OCR"\]/);
  assert.match(vaultApiClient, /fetchMatterVaultSummary/);
  assert.match(vaultApiClient, /fetchVaultSearch/);
  assert.match(vaultApiClient, /fetchMatterTimeline/);
  assert.match(breadcrumb, /aria-label="Matter Vault 위치"/);
  assert.match(table, /data-mv-vault-document-table="true"/);
  assert.match(detail, /data-mv-vault-document-detail="true"/);
  assert.match(detail, /버전 기록/);
  assert.match(badges, /data-mv-vault-security-badges="true"/);
  assert.match(runner, /matter-vault/);
  assert.doesNotMatch(vaultSurface, /storage_pointer_ref\s*:|raw_path|mockData/);
});
