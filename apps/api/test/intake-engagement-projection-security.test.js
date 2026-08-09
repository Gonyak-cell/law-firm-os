import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant_cmp_g6_synthetic";
const ACTOR = "user_cmp_g6_owner";
const BYTES = Buffer.from("%PDF-1.4\nadversarial engagement\n%%EOF\n");
const SENTINELS = Object.freeze([
  "raw-top-level-secret",
  "s3://forbidden/top-level-pointer",
  "/forbidden/top-level/path",
  "raw-template-secret",
  "s3://forbidden/template-pointer",
  "raw-upload-secret",
  "s3://forbidden/upload-pointer",
  "/forbidden/upload/path",
  "caller-provider-authority",
  "nested-unknown-secret",
]);
const FORBIDDEN_KEYS = new Set([
  "document_bytes_base64",
  "storage_pointer_ref",
  "raw_path",
  "object_key",
  "provider_authority_alias",
  "unknown_nested",
]);

function projectionLeaks(value) {
  const keys = [];
  const visit = (entry) => {
    if (Array.isArray(entry)) return entry.forEach(visit);
    if (!entry || typeof entry !== "object") return;
    for (const [key, item] of Object.entries(entry)) {
      if (FORBIDDEN_KEYS.has(key)) keys.push(key);
      visit(item);
    }
  };
  visit(value);
  const serialized = JSON.stringify(value);
  return Object.freeze({
    keys: Object.freeze(keys),
    sentinels: Object.freeze(SENTINELS.filter((sentinel) => serialized.includes(sentinel))),
  });
}

test("engagement HTTP and durable projections reject caller raw bytes, pointers, paths, and unknown fields", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-engagement-projection-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const intakeStorePath = join(root, "intake.json");
  const started = await startApiServer({
    port: 0,
    intakeStorePath,
    dmsStorePath: join(root, "dms.json"),
    dmsObjectStorePath: join(root, "objects"),
  });
  let responseBody;
  let httpLeaks;
  try {
    const baseUrl = `http://${started.host}:${started.port}`;
    const headers = await apiSessionHeaders(baseUrl);
    const permissionContext = JSON.stringify({
      principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["crm_intake_user"] },
      rules: [{ id: "allow-engagement-projection", effect: "allow", action: "*" }],
      object_acl: [],
    });
    const body = {
      tenant_id: TENANT,
      permission_ref: "permission-engagement-projection",
      audit_hint_ref: "audit-engagement-projection",
      idempotency_key: "engagement-projection-security",
      engagement: {
        engagement_id: "engagement-projection-security",
        tenant_id: TENANT,
        intake_request_id: "intake-projection-security",
        template_id: "matter_engagement_letter",
        signed_document_id: "document-projection-security",
        signature_ref: "signature:document-projection-security",
        approver_id: "spoofed-approver-must-not-win",
        approved_at: "2020-01-01T00:00:00.000Z",
        legal_client_party_id: "party-projection-security",
        scope_summary: "Permitted engagement scope",
        fee_terms_id: "fee-terms-projection-security",
        approval_state: "draft",
        document_bytes_base64: Buffer.from("raw-top-level-secret").toString("base64"),
        storage_pointer_ref: "s3://forbidden/top-level-pointer",
        raw_path: "/forbidden/top-level/path",
        unknown_nested: { object_key: "nested-unknown-secret" },
        template_document: {
          template_document_id: "template-projection-security",
          template_id: "matter_engagement_letter",
          document_title: "위임계약서",
          generation_state: "generated",
          merge_field_count: 3,
          document_bytes_base64: Buffer.from("raw-template-secret").toString("base64"),
          storage_pointer_ref: "s3://forbidden/template-pointer",
        },
        signed_document_upload: {
          signed_document_upload_id: "signed-upload-projection-security",
          document_id: "document-projection-security",
          signature_ref: "signature:document-projection-security",
          bytes_base64: BYTES.toString("base64"),
          document_bytes_base64: Buffer.from("raw-upload-secret").toString("base64"),
          storage_pointer_ref: "s3://forbidden/upload-pointer",
          raw_path: "/forbidden/upload/path",
          provider_authority_alias: "caller-provider-authority",
          byte_size: BYTES.byteLength,
          mime_type: "application/pdf",
          matter_id: "matter-projection-security",
          workspace_id: "workspace-projection-security",
          lx_registry_ref: "LX-06",
        },
      },
    };
    const response = await fetch(`${baseUrl}/api/intake/engagements`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
        [PERMISSION_CONTEXT_HEADER]: permissionContext,
      },
      body: JSON.stringify(body),
    });
    responseBody = await response.json();
    assert.equal(response.status, 201);
    assert.notEqual(responseBody.item.approver_id, "spoofed-approver-must-not-win");
    assert.equal(responseBody.item.approver_id, responseBody.audit_event.actor_id);
    assert.equal(responseBody.item.approval_state, "approved");
    assert.notEqual(responseBody.item.approved_at, "2020-01-01T00:00:00.000Z");
    assert.equal(responseBody.item.template_id, "matter_engagement_letter");
    assert.equal(responseBody.item.legal_client_party_id, "party-projection-security");
    assert.equal(responseBody.item.scope_summary, "Permitted engagement scope");
    assert.equal(responseBody.item.fee_terms_id, "fee-terms-projection-security");
    assert.equal(responseBody.template_document.document_title, "위임계약서");
    assert.equal(responseBody.signed_document_upload.mime_type, "application/pdf");
    assert.equal(responseBody.signed_document_upload.lx_registry_ref, "LX-06");
    assert.equal(JSON.stringify(responseBody).includes("__lawos_engagement_approval_binding_v1"), false);
    httpLeaks = projectionLeaks(responseBody);

    const drift = await fetch(`${baseUrl}/api/intake/engagements`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json", [PERMISSION_CONTEXT_HEADER]: permissionContext },
      body: JSON.stringify({ ...body, engagement: { ...body.engagement, scope_summary: "Drifted scope" } }),
    });
    assert.equal(drift.status, 409);
    assert.deepEqual((await drift.json()).safe_error_codes, ["IDEMPOTENCY_KEY_REUSED"]);

    const nested = await fetch(`${baseUrl}/api/intake/engagements`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json", [PERMISSION_CONTEXT_HEADER]: permissionContext },
      body: JSON.stringify({
        ...body,
        idempotency_key: "engagement-projection-nested-known-field",
        engagement: {
          ...body.engagement,
          engagement_id: "engagement-projection-nested-known-field",
          matter_id: {
            __lawos_idempotency_authority_v1: { raw_path: "/nested/reserved" },
            document_bytes_base64: "nested-known-field-bytes",
            provider_authority_alias: "nested-known-field-provider",
          },
          signed_document_upload: {
            ...body.engagement.signed_document_upload,
            mime_type: { storage_pointer_ref: "s3://nested-known-field" },
          },
        },
      }),
    });
    assert.equal(nested.status, 400);
    assert.equal(JSON.stringify(await nested.json()).includes("nested-known-field"), false);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }

  const repository = createIntakeRuntimeRepository({ filePath: intakeStorePath });
  try {
    const snapshot = repository.snapshot();
    const approval = {
      records: snapshot.records.filter(({ engagement_id }) => (
        engagement_id === "engagement-projection-security"
      )),
      audit_events: snapshot.audit_events.filter(({ idempotency_key }) => (
        idempotency_key === "engagement-projection-security"
      )),
      idempotency: snapshot.idempotency.filter(({ idempotency_key }) => (
        idempotency_key === "engagement-projection-security"
      )),
    };
    assert.equal(approval.records.length, 3);
    assert.equal(approval.audit_events.length, 3);
    assert.equal(approval.idempotency.length, 1);
    assert.equal(Object.hasOwn(
      approval.idempotency[0].response,
      "__lawos_engagement_approval_binding_v1",
    ), true);
    const signedUpload = approval.records.find(({ model_type }) => (
      model_type === "EngagementSignedDocumentUpload"
    ));
    assert.equal(signedUpload.matter_id, "matter-projection-security");
    assert.equal(signedUpload.workspace_id, "workspace-projection-security");
    assert.deepEqual({
      http: httpLeaks,
      durable: projectionLeaks(approval),
      idempotency_response: projectionLeaks(approval.idempotency[0].response),
    }, {
      http: { keys: [], sentinels: [] },
      durable: { keys: [], sentinels: [] },
      idempotency_response: { keys: [], sentinels: [] },
    });
  } finally {
    repository.close();
  }
});
