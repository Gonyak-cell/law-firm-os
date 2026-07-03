#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { renderInvoicePdf } from "../packages/billing/src/invoice-pdf-service.js";

const ROOT = process.cwd();
const JSON_PATH = "artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json";
const MD_PATH = "artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.md";
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACTOR_ID = "user_amic_jwsuh";
const DOCUMENT_ID = "doc_upl_b16_invoice_pdf_hash_proof";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=upl_b16_vault_read&audit_hint_ref=upl_b16_invoice_pdf_download`;

function permissionContext() {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["matter_vault_admin", "matter_vault_user", "dms_reader"] },
    rules: [{ id: "rule_upl_b16_vault_allow", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolveClose) => started.server.close(resolveClose));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function check(id, passed, evidence) {
  return Object.freeze({ id, passed: Boolean(passed), evidence });
}

const storePath = join(mkdtempSync(join(tmpdir(), "lawos-upl-b16-dms-")), "dms-store.json");
const generatedAt = new Date().toISOString();
const invoicePdf = renderInvoicePdf({
  invoice: {
    invoice_id: "invoice_upl_b16_hash_proof",
    invoice_number: "INV-UPL-B16-HASH",
    tenant_id: TENANT,
    matter_id: "matter_rp05_synthetic_opening",
    issued_at: "2026-07-03T00:00:00.000Z",
    due_date: "2026-07-31",
    amount_due: 330000,
    currency: "KRW",
  },
  invoice_lines: [
    { line_type: "fees", amount: 300000, currency: "KRW" },
    { line_type: "withholding-model-local-only", amount: 30000, currency: "KRW" },
  ],
  generated_at: generatedAt,
});

const uploadPayload = {
  tenant_id: TENANT,
  permission_ref: "upl_b16_vault_write",
  audit_hint_ref: "upl_b16_invoice_pdf_upload",
  actor_id: ACTOR_ID,
  idempotency_key: "upl-b16-invoice-pdf-dms-hash-proof",
  content_base64: invoicePdf.bytes.toString("base64"),
  document: {
    document_id: DOCUMENT_ID,
    tenant_id: TENANT,
    matter_id: "matter_rp05_synthetic_opening",
    workspace_id: "workspace_rp07_synthetic",
    title: invoicePdf.filename,
    status: "active",
    current_version_id: "version_doc_upl_b16_invoice_pdf_hash_proof_1",
    permission_envelope_id: "perm_rp07_vault",
    audit_trace_id: "audit_upl_b16_invoice_pdf",
    mime_type: invoicePdf.mime_type,
  },
};

const created = await withServer({ dmsStorePath: storePath }, async (baseUrl) => {
  const response = await json(baseUrl, "/api/vault/documents", {
    method: "POST",
    body: JSON.stringify(uploadPayload),
  });
  assert.equal(response.status, 201);

  const downloaded = await json(baseUrl, `/api/vault/documents/${DOCUMENT_ID}/download?${BASE_QUERY}`);
  assert.equal(downloaded.status, 200);
  return { baseUrl, upload: response, download: downloaded };
});

const downloadedBytes = Buffer.from(created.download.body.download.content_base64, "base64");
const downloadedSha256 = sha256(downloadedBytes);

const restartReadback = await withServer({ dmsStorePath: storePath }, async (baseUrl) => {
  const downloaded = await json(baseUrl, `/api/vault/documents/${DOCUMENT_ID}/download?${BASE_QUERY}`);
  assert.equal(downloaded.status, 200);
  const bytes = Buffer.from(downloaded.body.download.content_base64, "base64");
  return {
    baseUrl,
    status: downloaded.status,
    content_sha256: downloaded.body.download.content_sha256,
    recomputed_sha256: sha256(bytes),
    byte_size: downloaded.body.download.byte_size,
    mime_type: downloaded.body.download.mime_type,
    raw_path_exposed: downloaded.body.raw_path_exposed,
    storage_pointer_ref_included: downloaded.body.storage_pointer_ref_included,
  };
});

const checks = [
  check("b16-pdf-renderer-emits-pdf-bytes", invoicePdf.bytes.subarray(0, 8).toString("utf8") === "%PDF-1.4" && invoicePdf.mime_type === "application/pdf", {
    invoice_id: invoicePdf.invoice_id,
    invoice_number: invoicePdf.invoice_number,
    byte_size: invoicePdf.byte_size,
    sha256: invoicePdf.sha256,
  }),
  check("b16-dms-upload-stores-rendered-sha256", created.upload.body.file_object.sha256 === invoicePdf.sha256 && created.upload.body.file_object.mime_type === "application/pdf", {
    upload_status: created.upload.status,
    file_object_id: created.upload.body.file_object.file_object_id,
    stored_sha256: created.upload.body.file_object.sha256,
    stored_byte_size: created.upload.body.file_object.byte_size,
  }),
  check("b16-download-hash-matches-rendered-pdf", created.download.body.download.content_sha256 === invoicePdf.sha256 && downloadedSha256 === invoicePdf.sha256, {
    download_status: created.download.status,
    content_sha256: created.download.body.download.content_sha256,
    recomputed_sha256: downloadedSha256,
    byte_size: created.download.body.download.byte_size,
  }),
  check("b16-dms-restart-readback-preserves-pdf-hash", restartReadback.content_sha256 === invoicePdf.sha256 && restartReadback.recomputed_sha256 === invoicePdf.sha256, restartReadback),
  check("b16-download-safe-boundary", created.download.body.raw_path_exposed === false && created.download.body.storage_pointer_ref_included === false && created.download.body.document_bytes_included === true, {
    raw_path_exposed: created.download.body.raw_path_exposed,
    storage_pointer_ref_included: created.download.body.storage_pointer_ref_included,
    document_bytes_included: created.download.body.document_bytes_included,
  }),
  check("b16-email-linkage-not-claimed", true, {
    email_linkage_claim: false,
    deferred_to_tuw: "UPL-E-06",
    external_email_receipt: false,
  }),
];

const artifact = {
  schema_version: "lawos.upl_b16.invoice_pdf_dms_hash_proof.v1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["UPL-B-16"],
  pass: checks.every((item) => item.passed),
  production_ready_claim: false,
  go_live_claim: false,
  email_linkage_claim: false,
  email_linkage_deferred_to: "UPL-E-06",
  external_email_receipt: false,
  store_path_kind: "temp_local_dms_store",
  routes: {
    upload: "POST /api/vault/documents",
    download: `GET /api/vault/documents/${DOCUMENT_ID}/download`,
  },
  source_trace: {
    pdf_renderer: "packages/billing/src/invoice-pdf-service.js#renderInvoicePdf",
    vault_upload: "apps/api/src/vault-dms-runtime-context.js#handleVaultDocumentUpload",
    vault_download: "apps/api/src/vault-dms-runtime-context.js#handleVaultDocumentDownload",
    dms_download_service: "packages/dms/src/storage/download-service.js#downloadFileObjectWithAudit",
  },
  invoice_pdf: {
    invoice_id: invoicePdf.invoice_id,
    invoice_number: invoicePdf.invoice_number,
    filename: invoicePdf.filename,
    mime_type: invoicePdf.mime_type,
    byte_size: invoicePdf.byte_size,
    sha256: invoicePdf.sha256,
  },
  upload_receipt: {
    status: created.upload.status,
    outcome: created.upload.body.outcome,
    document_id: created.upload.body.item.document_id,
    file_object_id: created.upload.body.file_object.file_object_id,
    mime_type: created.upload.body.file_object.mime_type,
    byte_size: created.upload.body.file_object.byte_size,
    sha256: created.upload.body.file_object.sha256,
    storage_pointer_ref_included: created.upload.body.file_object.storage_pointer_ref_included,
    audit_action: created.upload.body.audit_event.action,
  },
  download_receipt: {
    status: created.download.status,
    content_sha256: created.download.body.download.content_sha256,
    recomputed_sha256: downloadedSha256,
    byte_size: created.download.body.download.byte_size,
    mime_type: created.download.body.download.mime_type,
    pdf_header: downloadedBytes.subarray(0, 8).toString("utf8"),
    raw_path_exposed: created.download.body.raw_path_exposed,
    storage_pointer_ref_included: created.download.body.storage_pointer_ref_included,
    document_bytes_included: created.download.body.document_bytes_included,
    audit_action: created.download.body.audit_event.action,
  },
  restart_readback: restartReadback,
  checks,
};

mkdirSync(resolve(ROOT, dirname(JSON_PATH)), { recursive: true });
writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  resolve(ROOT, MD_PATH),
  `# UPL-B-16 Invoice PDF DMS Hash Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

## Evidence

| Check | Result | Evidence |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- PDF renderer: \`packages/billing/src/invoice-pdf-service.js#renderInvoicePdf\`
- DMS upload/download routes: \`POST /api/vault/documents\`, \`GET /api/vault/documents/${DOCUMENT_ID}/download\`
- Email linkage claim: false
- Email linkage deferred to: UPL-E-06
- Production ready claim: false
- Go-live claim: false
`,
);

console.log(JSON.stringify({
  pass: artifact.pass,
  artifact: JSON_PATH,
  invoice_sha256: artifact.invoice_pdf.sha256,
  upload_sha256: artifact.upload_receipt.sha256,
  download_sha256: artifact.download_receipt.content_sha256,
  restart_sha256: artifact.restart_readback.content_sha256,
}, null, 2));

if (!artifact.pass) process.exitCode = 1;
