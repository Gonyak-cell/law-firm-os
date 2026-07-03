#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const API = process.env.LAWOS_API_URL ?? "http://127.0.0.1:4180";
const TENANT = "tenant_amic_matter_vault";
const ACTOR_ID = "user_amic_jwsuh";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=ui_cmp_g5_vault_live&audit_hint_ref=ui_cmp_g5_vault_probe`;
const QUERY = "OCR키워드";
const DOC_ID = `doc_upl_e02_ocr_${Date.now()}`;
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const PROOF_PATH = join(ARTIFACT_DIR, "upl-e02-vault-ocr-search-browser-proof.json");
const SCREENSHOT_PATH = join(ARTIFACT_DIR, "upl-e02-vault-ocr-search-browser-proof.png");

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(objectAcl = []) {
  return JSON.stringify({
    principal: {
      user_id: ACTOR_ID,
      tenant_id: TENANT,
      role_ids: ["matter_vault_admin", "matter_vault_user", "dms_reader"],
    },
    rules: [{ id: "rule_vault_allow", effect: "allow", action: "*" }],
    object_acl: objectAcl,
  });
}

async function apiJson(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    "x-lawos-permission-context": permissionContext(),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

const upload = await apiJson("/api/vault/documents", {
  method: "POST",
  body: JSON.stringify({
    tenant_id: TENANT,
    permission_ref: "ui_cmp_g5_vault_live",
    audit_hint_ref: "ui_cmp_g5_vault_probe",
    actor_id: ACTOR_ID,
    idempotency_key: DOC_ID,
    content_text: "%PDF-1.4\n/Type /XObject /Subtype /Image\n%%EOF",
    ocr_text: `토지대장 ${QUERY} 검증`,
    document: {
      document_id: DOC_ID,
      tenant_id: TENANT,
      matter_id: "matter_rp05_synthetic_opening",
      workspace_id: "workspace_rp07_synthetic",
      title: "UPL E02 스캔 검색 검증 PDF",
      status: "active",
      current_version_id: `version_${DOC_ID}_1`,
      permission_envelope_id: "perm_rp07_vault",
      audit_trace_id: "audit_rp07_vault",
      mime_type: "application/pdf",
    },
  }),
});

const directSearch = await apiJson(`/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent(QUERY)}`);

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await page.goto(`${WEB}/?view=vault#vault-documents`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForSelector("[data-upl-e01-vault-search='true']", { timeout: 10000 });
  await page.fill("input[aria-label='Vault 본문 검색']", QUERY);
  await page.click("[data-upl-e01-vault-search='true'] button[type='submit']");
  await page.waitForFunction(
    () => Number(document.querySelector("[data-upl-e01-vault-search='true']")?.getAttribute("data-vault-search-result-count") ?? "0") > 0,
    { timeout: 10000 },
  );
  snapshot = await page.evaluate((query) => {
    const panel = document.querySelector("[data-upl-e01-vault-search='true']");
    const bodyText = document.body.innerText;
    return {
      marker_present: Boolean(panel),
      state: panel?.getAttribute("data-vault-search-state") ?? "",
      query: panel?.getAttribute("data-vault-search-query") ?? "",
      result_count: Number(panel?.getAttribute("data-vault-search-result-count") ?? "0"),
      raw_text_included: panel?.getAttribute("data-vault-search-raw-text-included") ?? "",
      ocr_match_label_visible: bodyText.includes("OCR"),
      hidden_ocr_term_visible: bodyText.includes(query),
      document_title_visible: bodyText.includes("UPL E02 스캔 검색 검증 PDF"),
    };
  }, QUERY);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  await page.close();
} finally {
  await browser.close();
}

const directHit = directSearch.body.items?.find((item) => item.document_id === DOC_ID);
const checks = [
  { id: "api-upload-created-ocr-index", passed: [200, 201].includes(upload.status) && upload.body.search_index?.ocr_text_indexed === true },
  { id: "api-ocr-keyword-hit", passed: Boolean(directHit && directHit.match_fields?.includes("ocr_text")) },
  { id: "api-does-not-return-ocr-term", passed: !JSON.stringify(directHit ?? {}).includes(QUERY) },
  { id: "ui-search-rendered-hit", passed: snapshot.result_count > 0 && snapshot.document_title_visible === true },
  { id: "ui-match-field-ocr-visible", passed: snapshot.ocr_match_label_visible === true },
  { id: "ui-does-not-render-ocr-term", passed: snapshot.hidden_ocr_term_visible === false },
  { id: "ui-raw-text-flag-false", passed: snapshot.raw_text_included === "false" },
];

const report = {
  schema_version: "law-firm-os.upl-e02.vault-ocr-search.browser-proof.v0.1",
  generated_at: new Date().toISOString(),
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  web_url: WEB,
  api_url: API,
  document_id: DOC_ID,
  query: QUERY,
  upload: { status: upload.status, outcome: upload.body.outcome, search_index: upload.body.search_index },
  direct_search: {
    status: directSearch.status,
    returned_count: directSearch.body.items?.length ?? 0,
    matching_document_returned: Boolean(directHit),
    matching_fields: directHit?.match_fields ?? [],
  },
  snapshot,
  checks,
  screenshot: SCREENSHOT_PATH,
};

writeFileSync(PROOF_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdict: report.verdict, proof: PROOF_PATH, screenshot: SCREENSHOT_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
