import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../src/matter-vault-account-registry.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";
import { renderInvoicePdf } from "../../../packages/billing/src/invoice-pdf-service.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const ACTOR_ID = "user_amic_jwsuh";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_rp07_read&audit_hint_ref=audit_hint_rp07_read`;

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["matter_vault_admin", "matter_vault_user", "dms_reader"] },
    rules: [{ id: `rule_vault_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

function permissionContextWithAcl(objectAcl = [], effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["matter_vault_admin", "matter_vault_user", "dms_reader"] },
    rules: [{ id: `rule_vault_${effect}`, effect, action: "*" }],
    object_acl: objectAcl,
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

const sessionHeaderCache = new Map();

async function signedHeaders(baseUrl) {
  if (!sessionHeaderCache.has(baseUrl)) sessionHeaderCache.set(baseUrl, await apiSessionHeaders(baseUrl));
  return sessionHeaderCache.get(baseUrl);
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    ...(options.noAuth ? {} : await signedHeaders(baseUrl)),
    ...(options.headers ?? {}),
  };
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[key];
  }
  const isFormDataBody = options.body && typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormDataBody && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function uploadPayload(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp07_write",
    audit_hint_ref: "audit_hint_rp07_write",
    actor_id: ACTOR_ID,
    idempotency_key: "vault-api-upload-001",
    content_text: "Vault API upload",
    document: {
      document_id: "doc_api_upload_001",
      tenant_id: TENANT,
      matter_id: "matter_rp05_synthetic_opening",
      workspace_id: "workspace_rp07_synthetic",
      title: "API uploaded vault document",
      status: "active",
      current_version_id: "version_doc_api_upload_001_1",
      permission_envelope_id: "perm_rp07_vault",
      audit_trace_id: "audit_rp07_vault",
      mime_type: "text/plain",
    },
    ...overrides,
  };
}

test("G5 Vault API health descriptor exposes vault-dms runtime without production-ready claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    const vault = body.bounded_contexts.find((context) => context.bounded_context === "vault-dms");
    assert.equal(status, 200);
    assert.equal(vault.runtime_write_ready, true);
    assert.equal(vault.r5_r6_owner_decision_ready, true);
    assert.equal(vault.production_ready_claim, false);
  });
});

test("G5 Vault document list is permission gated and never leaks raw storage fields", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`);
    assert.equal(status, 200);
    assert.equal(body.outcome, "passed");
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].owner_user_id, ACTOR_ID);
    assert.equal(body.items[0].registered_account.email, "jwsuh@amic.kr");
    assert.equal(body.items[0].account_linkage.status, "linked");
    assert.equal(body.items[0].current_version_id, "version_doc_rp07_synthetic_001_1");
    assert.equal(body.items[0].current_file_object_id, "file_version_doc_rp07_synthetic_001_1");
    assert.equal(body.items[0].latest_sha256, "seed");
    assert.equal(body.items[0].current_byte_size, 0);
    assert.equal(body.items[0].current_mime_type, "application/pdf");
    assert.equal(body.items[0].storage_pointer_ref_included, false);
    assert.equal(body.items[0].document_bytes_included, false);
    assert.equal(body.page_info.omitted_document_count, null);

    const denied = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`, {
      noAuth: true,
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext() },
    });
    assert.equal(denied.status, 401);
    assert.ok(denied.body.safe_error_codes.includes("AUTH_SESSION_REQUIRED"));
  });
});

test("G5 Vault foreign tenant list reaches permission gate and appends deny audit", async () => {
  const repository = createDmsRepository();
  const foreignTenantId = "tenant_foreign_unregistered";
  const auditHintRef = "audit_hint_foreign_tenant_deny";
  await withServer(async (baseUrl) => {
    const denied = await json(
      baseUrl,
      `/api/vault/documents?tenant_id=${foreignTenantId}&permission_ref=perm_ref_foreign_tenant&audit_hint_ref=${auditHintRef}`,
    );
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.safe_error_codes, ["VAULT_DMS_UNAUTHORIZED_OMISSION"]);
    assert.equal(denied.body.audit_hint_ref, auditHintRef);
    assert.equal(denied.body.ui_state, "denied");
    assert.equal(denied.body.count_leak_prevented, true);
  }, { dmsRepository: repository });

  const deniedAudit = repository.listAudit({ tenant_id: foreignTenantId }).find((event) => (
    event.decision === "deny" &&
    event.action === "dms:document:read" &&
    event.metadata.audit_hint_ref === auditHintRef
  ));
  assert.ok(deniedAudit);
  assert.equal(deniedAudit.metadata.denied_route_audit, true);
  assert.equal(deniedAudit.metadata.raw_payload_included, false);
});

test("G5 Vault upload persists metadata, replays idempotently, and survives restart", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-vault-api-g5-")), "dms-store.json");
  let uploadedSha256;
  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload()),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.document_id, "doc_api_upload_001");
    assert.equal(created.body.item.owner_user_id, ACTOR_ID);
    assert.equal(created.body.item.registered_account.email, "jwsuh@amic.kr");
    assert.equal(created.body.item.account_linkage.status, "linked");
    assert.equal(created.body.file_object.storage_pointer_ref_included, false);
    uploadedSha256 = created.body.file_object.sha256;
    assert.equal(created.body.audit_event.action, "dms.document.upload");

    const downloaded = await json(baseUrl, `/api/vault/documents/doc_api_upload_001/download?${BASE_QUERY}`);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.body.download.content_sha256, uploadedSha256);
    assert.equal(Buffer.from(downloaded.body.download.content_base64, "base64").toString("utf8"), "Vault API upload");
    assert.equal(downloaded.body.download.storage_pointer_ref_included, false);
    assert.equal(downloaded.body.download.raw_path_exposed, false);
    assert.equal(downloaded.body.audit_event.action, "dms.document.download");

    const replay = await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload()),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");
  }, { dmsStorePath: storePath });

  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`);
    const listed = list.body.items.find((item) => item.document_id === "doc_api_upload_001");
    assert.equal(listed?.latest_sha256, uploadedSha256);
    const downloaded = await json(baseUrl, `/api/vault/documents/doc_api_upload_001/download?${BASE_QUERY}`);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.body.download.content_sha256, uploadedSha256);
    assert.equal(Buffer.from(downloaded.body.download.content_base64, "base64").toString("utf8"), "Vault API upload");
  }, { dmsStorePath: storePath });
});

test("UPL-A-11 Vault accepts multipart file upload and preserves download hash after restart", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-vault-api-a11-")), "dms-store.json");
  const documentId = "doc_upl_a11_multipart_upload";
  const bytes = Buffer.from("UPL-A-11 multipart vault upload\n");
  const expectedSha256 = createHash("sha256").update(bytes).digest("hex");

  function multipartPayload() {
    const form = new FormData();
    form.set("tenant_id", TENANT);
    form.set("permission_ref", "perm_ref_rp07_write");
    form.set("audit_hint_ref", "audit_hint_rp07_write");
    form.set("idempotency_key", "upl-a11-multipart-upload");
    form.set("document", JSON.stringify({
      document_id: documentId,
      tenant_id: TENANT,
      matter_id: "matter_rp05_synthetic_opening",
      workspace_id: "workspace_rp07_synthetic",
      title: "A11 multipart upload",
      status: "active",
      current_version_id: "version_doc_upl_a11_multipart_upload_1",
      permission_envelope_id: "perm_rp07_vault",
      audit_trace_id: "audit_upl_a11_vault",
      mime_type: "text/plain",
    }));
    form.set("file", new File([bytes], "a11-upload.txt", { type: "text/plain" }));
    return form;
  }

  await withServer(async (baseUrl) => {
    const created = await json(baseUrl, "/api/vault/documents/upload", {
      method: "POST",
      body: multipartPayload(),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.document_id, documentId);
    assert.equal(created.body.file_object.sha256, expectedSha256);
    assert.equal(created.body.file_object.byte_size, bytes.byteLength);
    assert.equal(created.body.file_object.storage_pointer_ref_included, false);
    assert.equal(created.body.upload_file.filename, "a11-upload.txt");

    const downloaded = await json(baseUrl, `/api/vault/documents/${documentId}/download?${BASE_QUERY}`);
    const downloadedBytes = Buffer.from(downloaded.body.download.content_base64, "base64");
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.body.download.content_sha256, expectedSha256);
    assert.equal(createHash("sha256").update(downloadedBytes).digest("hex"), expectedSha256);
    assert.equal(downloadedBytes.toString("utf8"), bytes.toString("utf8"));
  }, { dmsStorePath: storePath });

  await withServer(async (baseUrl) => {
    const downloaded = await json(baseUrl, `/api/vault/documents/${documentId}/download?${BASE_QUERY}`);
    const downloadedBytes = Buffer.from(downloaded.body.download.content_base64, "base64");
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.body.download.content_sha256, expectedSha256);
    assert.equal(createHash("sha256").update(downloadedBytes).digest("hex"), expectedSha256);
  }, { dmsStorePath: storePath });
});

test("UPL-B-16 Vault stores invoice PDF bytes and downloads hash-identical content", async () => {
  await withServer(async (baseUrl) => {
    const pdf = renderInvoicePdf({
      invoice: {
        invoice_id: "invoice_upl_b16_test",
        invoice_number: "INV-UPL-B16-TEST",
        tenant_id: TENANT,
        matter_id: "matter_rp05_synthetic_opening",
        issued_at: "2026-07-03T00:00:00.000Z",
        due_date: "2026-07-31",
        amount_due: 330000,
        currency: "KRW",
      },
      invoice_lines: [{ line_type: "fees", amount: 300000, currency: "KRW" }],
      generated_at: "2026-07-03T00:00:00.000Z",
    });
    const document = {
      ...uploadPayload().document,
      document_id: "doc_upl_b16_invoice_pdf_test",
      current_version_id: "version_doc_upl_b16_invoice_pdf_test_1",
      title: pdf.filename,
      mime_type: pdf.mime_type,
    };

    const created = await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload({
        idempotency_key: "vault-api-upload-upl-b16-invoice-pdf",
        content_base64: pdf.bytes.toString("base64"),
        document,
      })),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.file_object.mime_type, "application/pdf");
    assert.equal(created.body.file_object.sha256, pdf.sha256);
    assert.equal(created.body.file_object.storage_pointer_ref_included, false);

    const downloaded = await json(baseUrl, `/api/vault/documents/${document.document_id}/download?${BASE_QUERY}`);
    const downloadedBytes = Buffer.from(downloaded.body.download.content_base64, "base64");
    const downloadedSha256 = createHash("sha256").update(downloadedBytes).digest("hex");
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.body.download.mime_type, "application/pdf");
    assert.equal(downloaded.body.download.content_sha256, pdf.sha256);
    assert.equal(downloaded.body.download.byte_size, pdf.byte_size);
    assert.equal(downloadedSha256, pdf.sha256);
    assert.equal(downloadedBytes.subarray(0, 8).toString("utf8"), "%PDF-1.4");
    assert.equal(downloaded.body.document_bytes_included, true);
    assert.equal(downloaded.body.raw_path_exposed, false);
    assert.equal(downloaded.body.storage_pointer_ref_included, false);
  });
});

test("G5 Vault sensitive reads write durable allow audits without leaking payloads", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-vault-api-g5-audit-")), "dms-store.json");
  await withServer(async (baseUrl) => {
    const list = await json(baseUrl, `/api/vault/documents?${BASE_QUERY}`);
    assert.equal(list.status, 200);
    const search = await json(baseUrl, `/api/vault/search?${BASE_QUERY}`);
    assert.equal(search.status, 200);
  }, { dmsStorePath: storePath });

  await withServer(async (baseUrl) => {
    const audit = await json(baseUrl, `/api/vault/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    const documentRead = audit.body.items.find((event) => event.action === "dms:document:read" && event.decision === "allow");
    const searchRead = audit.body.items.find((event) => event.action === "dms:search" && event.decision === "allow");
    assert.equal(documentRead.metadata.sensitive_read_audit_required, true);
    assert.equal(documentRead.metadata.document_bytes_included, false);
    assert.equal(documentRead.metadata.storage_pointer_ref_included, false);
    assert.equal(searchRead.metadata.sensitive_read_audit_required, true);
    assert.equal(searchRead.metadata.raw_text_included, false);
    assert.equal(searchRead.metadata.raw_payload_included, false);
  }, { dmsStorePath: storePath });
});

test("G5 Vault search and audit stay safe-source and tenant scoped", async () => {
  await withServer(async (baseUrl) => {
    await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload({ idempotency_key: "vault-api-upload-search" })),
    });
    const search = await json(baseUrl, `/api/vault/search?${BASE_QUERY}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.items[0].raw_text_included, false);
    assert.equal(search.body.production_ready_claim, false);

    const audit = await json(baseUrl, `/api/vault/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "dms.document.upload"));
    assert.ok(audit.body.items.some((event) => event.action === "dms:search" && event.metadata.sensitive_read_audit_required === true));
  });
});

test("UPL-E-01 Vault search hits uploaded body text and ignores forged ACL headers", async () => {
  await withServer(async (baseUrl) => {
    await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload({
        idempotency_key: "vault-api-upload-e01-search",
        content_text: "%PDF-1.4\n(차임증액 본문키워드 검증)\n%%EOF",
        document: {
          ...uploadPayload().document,
          document_id: "doc_api_e01_search_pdf",
          current_version_id: "version_doc_api_e01_search_pdf_1",
          title: "E01 검색 검증 PDF",
          mime_type: "application/pdf",
        },
      })),
    });

    const search = await json(baseUrl, `/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent("차임증액")}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.outcome, "passed");
    assert.equal(search.body.page_info.search_backend, "json_substring_search");
    assert.ok(search.body.items.some((item) => item.document_id === "doc_api_e01_search_pdf"));
    const hit = search.body.items.find((item) => item.document_id === "doc_api_e01_search_pdf");
    assert.ok(hit.match_fields.includes("body_text"));
    assert.equal(hit.body_text_indexed, true);
    assert.equal(hit.search_backend, "json_substring_search");
    assert.equal(hit.raw_text_included, false);
    assert.equal(hit.storage_pointer_ref_included, false);
    assert.equal(JSON.stringify(hit).includes("차임증액"), false);

    const forgedDenied = await json(baseUrl, `/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent("차임증액")}`, {
      headers: {
        [PERMISSION_CONTEXT_HEADER]: permissionContextWithAcl([
          { principal_id: ACTOR_ID, resource_id: "doc_api_e01_search_pdf", effect: "deny", action: "dms:document:read" },
        ]),
      },
    });
    assert.equal(forgedDenied.status, 200);
    assert.ok(forgedDenied.body.items.some((item) => item.document_id === "doc_api_e01_search_pdf"));
    assert.equal(forgedDenied.body.count_leak_prevented, true);
  });
});

test("UPL-E-02 Vault OCR search indexes scanned PDF sidecar text without claiming OCR runtime execution", async () => {
  await withServer(async (baseUrl) => {
    await json(baseUrl, "/api/vault/documents", {
      method: "POST",
      body: JSON.stringify(uploadPayload({
        idempotency_key: "vault-api-upload-e02-ocr",
        content_text: "%PDF-1.4\n/Type /XObject /Subtype /Image\n%%EOF",
        ocr_text: "토지대장 OCR키워드 검증",
        document: {
          ...uploadPayload().document,
          document_id: "doc_api_e02_ocr_pdf",
          current_version_id: "version_doc_api_e02_ocr_pdf_1",
          title: "E02 OCR 검증 PDF",
          mime_type: "application/pdf",
        },
      })),
    });

    const search = await json(baseUrl, `/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent("OCR키워드")}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.page_info.search_backend, "json_substring_search");
    const hit = search.body.items.find((item) => item.document_id === "doc_api_e02_ocr_pdf");
    assert.ok(hit);
    assert.deepEqual(hit.match_fields, ["ocr_text"]);
    assert.equal(hit.ocr_text_indexed, true);
    assert.equal(hit.ocr_runtime_executed, false);
    assert.equal(hit.ocr_provider, "caller_supplied_ocr_sidecar");
    assert.equal(hit.search_backend, "json_substring_search");
    assert.equal(hit.raw_text_included, false);
    assert.equal(hit.storage_pointer_ref_included, false);
    assert.equal(JSON.stringify(hit).includes("OCR키워드"), false);

    const forgedDenied = await json(baseUrl, `/api/vault/search?${BASE_QUERY}&q=${encodeURIComponent("OCR키워드")}`, {
      headers: {
        [PERMISSION_CONTEXT_HEADER]: permissionContextWithAcl([
          { principal_id: ACTOR_ID, resource_id: "doc_api_e02_ocr_pdf", effect: "deny", action: "dms:document:read" },
        ]),
      },
    });
    assert.equal(forgedDenied.status, 200);
    assert.ok(forgedDenied.body.items.some((item) => item.document_id === "doc_api_e02_ocr_pdf"));
    assert.equal(forgedDenied.body.count_leak_prevented, true);
  });
});
