import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
export const TRACEABILITY_PATH = "docs/lazycodex/lcx-full-implementation-tuw-traceability-2026-06-30.md";
export const PLAN_PATH = "docs/lazycodex/lcx-full-implementation-tuw-plan-2026-06-30.md";
export const INVENTORY_PATH = `${ARTIFACT_DIR}/lcx-full-00-current-gap-inventory.json`;
export const INVENTORY_MD_PATH = `${ARTIFACT_DIR}/lcx-full-00-current-gap-inventory.md`;
export const BASELINE_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-00-baseline-browser-proof.json`;
export const BASELINE_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-00-baseline-browser-proof.md`;
export const STATE_MODEL_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-01-state-model-receipt.json`;
export const STATE_MODEL_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-01-state-model-receipt.md`;
export const REDACTION_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-01-redaction-receipt.json`;
export const REDACTION_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-01-redaction-receipt.md`;
export const GUARDED_UI_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-02-guarded-ui-browser-proof.json`;
export const GUARDED_UI_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-02-guarded-ui-browser-proof.md`;
export const GUARDED_UI_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-02-guarded-ui-receipt.json`;
export const GUARDED_UI_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-02-guarded-ui-receipt.md`;
export const APPROVAL_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-03-approval-receipt.json`;
export const APPROVAL_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-03-approval-receipt.md`;
export const APPROVAL_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-03-approval-browser-proof.json`;
export const APPROVAL_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-03-approval-browser-proof.md`;
export const PROVIDER_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-04-provider-receipt.json`;
export const PROVIDER_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-04-provider-receipt.md`;
export const PROVIDER_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-04-provider-browser-proof.json`;
export const PROVIDER_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-04-provider-browser-proof.md`;
export const RUN_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-05-run-receipt.json`;
export const RUN_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-05-run-receipt.md`;
export const MATTER_VAULT_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-browser-proof.json`;
export const MATTER_VAULT_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-browser-proof.md`;
export const MATTER_VAULT_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-receipt.json`;
export const MATTER_VAULT_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-receipt.md`;
export const MATTER_VAULT_EMAIL_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-email-receipt.json`;
export const MATTER_VAULT_EMAIL_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-06-matter-vault-email-receipt.md`;
export const VAULT_DOCS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-docs-browser-proof.json`;
export const VAULT_DOCS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-docs-browser-proof.md`;
export const VAULT_DOC_ACTION_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-doc-action-receipt.json`;
export const VAULT_DOC_ACTION_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-doc-action-receipt.md`;
export const VAULT_RECORDS_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-records-receipt.json`;
export const VAULT_RECORDS_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-07-vault-records-receipt.md`;
export const MATTER_IMPORT_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-08-matter-import-browser-proof.json`;
export const MATTER_IMPORT_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-08-matter-import-browser-proof.md`;
export const MATTER_IMPORT_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-08-matter-import-receipt.json`;
export const MATTER_IMPORT_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-08-matter-import-receipt.md`;
export const CLIENT_IMPORT_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-09-client-import-browser-proof.json`;
export const CLIENT_IMPORT_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-09-client-import-browser-proof.md`;
export const CLIENT_IMPORT_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-09-client-import-receipt.json`;
export const CLIENT_IMPORT_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-09-client-import-receipt.md`;
export const CLIENT_DATA_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-10-client-data-browser-proof.json`;
export const CLIENT_DATA_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-10-client-data-browser-proof.md`;
export const CLIENT_DATA_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-10-client-data-receipt.json`;
export const CLIENT_DATA_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-10-client-data-receipt.md`;
export const CONTRACTS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-11-contracts-browser-proof.json`;
export const CONTRACTS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-11-contracts-browser-proof.md`;
export const CONTRACTS_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-11-contracts-esign-receipt.json`;
export const CONTRACTS_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-11-contracts-esign-receipt.md`;
export const BILLING_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-12-billing-browser-proof.json`;
export const BILLING_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-12-billing-browser-proof.md`;
export const BILLING_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-12-billing-provider-receipt.json`;
export const BILLING_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-12-billing-provider-receipt.md`;
export const MATTER_COMMS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-13-matter-comms-browser-proof.json`;
export const MATTER_COMMS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-13-matter-comms-browser-proof.md`;
export const MATTER_COMMS_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-13-matter-comms-receipt.json`;
export const MATTER_COMMS_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-13-matter-comms-receipt.md`;
export const PEOPLE_SETUP_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-14-people-setup-browser-proof.json`;
export const PEOPLE_SETUP_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-14-people-setup-browser-proof.md`;
export const PEOPLE_SETUP_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-14-people-setup-receipt.json`;
export const PEOPLE_SETUP_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-14-people-setup-receipt.md`;
export const PEOPLE_GOVERNANCE_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-15-people-governance-browser-proof.json`;
export const PEOPLE_GOVERNANCE_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-15-people-governance-browser-proof.md`;
export const PEOPLE_GOVERNANCE_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-15-people-governance-receipt.json`;
export const PEOPLE_GOVERNANCE_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-15-people-governance-receipt.md`;
export const PEOPLE_INTEGRATIONS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-16-people-integrations-browser-proof.json`;
export const PEOPLE_INTEGRATIONS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-16-people-integrations-browser-proof.md`;
export const PEOPLE_INTEGRATIONS_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-16-people-integrations-receipt.json`;
export const PEOPLE_INTEGRATIONS_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-16-people-integrations-receipt.md`;
export const GLOBAL_DECISIONS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-17-global-decisions-browser-proof.json`;
export const GLOBAL_DECISIONS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-17-global-decisions-browser-proof.md`;
export const GLOBAL_DECISIONS_RECEIPT_PATH = `${ARTIFACT_DIR}/lcx-full-17-global-decisions-receipt.json`;
export const GLOBAL_DECISIONS_RECEIPT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-17-global-decisions-receipt.md`;
export const AUDIT_RECEIPTS_PROOF_PATH = `${ARTIFACT_DIR}/lcx-full-18-audit-browser-proof.json`;
export const AUDIT_RECEIPTS_PROOF_MD_PATH = `${ARTIFACT_DIR}/lcx-full-18-audit-browser-proof.md`;
export const AUDIT_RECEIPTS_PATH = `${ARTIFACT_DIR}/lcx-full-18-audit-receipts-reconciliation.json`;
export const AUDIT_RECEIPTS_MD_PATH = `${ARTIFACT_DIR}/lcx-full-18-audit-receipts-reconciliation.md`;
export const RELEASE_PREFLIGHT_PATH = `${ARTIFACT_DIR}/lcx-full-19-release-preflight-proof.json`;
export const RELEASE_PREFLIGHT_MD_PATH = `${ARTIFACT_DIR}/lcx-full-19-release-preflight-proof.md`;
export const OWNER_DECISION_PACKET_PATH = `${ARTIFACT_DIR}/lcx-full-20-owner-release-decision-packet.json`;
export const OWNER_DECISION_PACKET_MD_PATH = `${ARTIFACT_DIR}/lcx-full-20-owner-release-decision-packet.md`;
export const FINAL_RELEASE_PACKET_VALIDATION_PATH = `${ARTIFACT_DIR}/lcx-full-20-final-release-packet-validation.json`;
export const FINAL_RELEASE_PACKET_VALIDATION_MD_PATH = `${ARTIFACT_DIR}/lcx-full-20-final-release-packet-validation.md`;
export const OPENABLE_PLAN_PATH = "docs/lazycodex/lcx-openable-implementation-tuw-plan-2026-06-30.md";
export const OPENABLE_TRACEABILITY_PATH = "docs/lazycodex/lcx-openable-implementation-tuw-traceability-2026-06-30.md";
export const NO_UNIMPLEMENTED_PLAN_PATH = "docs/lazycodex/lcx-no-unimplemented-implementation-plan-2026-06-30.md";
export const KOREA_SAAS_RESEARCH_MATRIX_PATH = "docs/lazycodex/lcx-korea-saas-operating-fit-research-matrix-2026-06-30.md";
export const KOREA_SAAS_IMPLEMENTATION_PLAN_PATH = "docs/lazycodex/lcx-korea-saas-operating-fit-implementation-plan-2026-06-30.md";
export const CONCEPT_FIT_VALIDATION_PATH = `${ARTIFACT_DIR}/lcx-full-21-concept-fit-validation.json`;
export const CONCEPT_FIT_VALIDATION_MD_PATH = `${ARTIFACT_DIR}/lcx-full-21-concept-fit-validation.md`;
export const KOREA_SAAS_FIT_VALIDATION_PATH = `${ARTIFACT_DIR}/lcx-full-21-korea-saas-fit-validation.json`;
export const KOREA_SAAS_FIT_VALIDATION_MD_PATH = `${ARTIFACT_DIR}/lcx-full-21-korea-saas-fit-validation.md`;
export const OPERATING_FIT_FINAL_VALIDATION_PATH = `${ARTIFACT_DIR}/lcx-full-21-operating-fit-final-validation.json`;
export const OPERATING_FIT_FINAL_VALIDATION_MD_PATH = `${ARTIFACT_DIR}/lcx-full-21-operating-fit-final-validation.md`;

export function readText(path) {
  return readFileSync(path, "utf8");
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

export function fileExists(path) {
  return existsSync(path);
}

export function uniqueMatches(text, pattern) {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[0]))].sort();
}

export function extractTraceability() {
  const traceability = readText(TRACEABILITY_PATH);
  const parentIds = [...new Set([...traceability.matchAll(/### (LCX-FULL-\d{2}) /g)].map((match) => match[1]))];
  const childIds = uniqueMatches(traceability, /LCX-FULL-\d{2}\.\d{2}/g);
  const expectedParents = Array.from({ length: 21 }, (_, index) => `LCX-FULL-${String(index).padStart(2, "0")}`);
  const missingParents = expectedParents.filter((id) => !parentIds.includes(id));
  const childCounts = Object.fromEntries(
    expectedParents.map((id) => [id, childIds.filter((childId) => childId.startsWith(`${id}.`)).length])
  );

  return {
    path: TRACEABILITY_PATH,
    parentIds,
    childIds,
    parentCount: parentIds.length,
    childCount: childIds.length,
    missingParents,
    childCounts
  };
}

export function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function markdownTable(rows, columns) {
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

export function artifactPath(...parts) {
  return join(ARTIFACT_DIR, ...parts);
}
