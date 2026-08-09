import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { prepareEngagementApproval } from "../src/engagement-approval-command.js";
import { engagementApprovalReplay } from "../src/engagement-approval-persistence.js";
import {
  ENGAGEMENT_APPROVAL_BINDING_FIELD,
  ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA,
  engagementApprovalReplayAuthorityDigest,
} from "../src/engagement-approval-response.js";
import { approveEngagement } from "../src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../src/runtime-repository.js";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";

const TENANT = "tenant-engagement-bound-fingerprint";
const ACTOR = "actor-engagement-bound-fingerprint";
const KEY = "engagement-bound-fingerprint";
const SHA = "a".repeat(64);
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-bound-fingerprint",
  tenant_id: TENANT,
  intake_request_id: "intake-bound-fingerprint",
  template_id: "matter_engagement_letter",
  legal_client_party_id: "party-bound-fingerprint",
  scope_summary: "Original scope",
  fee_terms_id: "fee-terms-bound-fingerprint",
  signed_document_id: "document-bound-fingerprint",
  signature_ref: "signature:document-bound-fingerprint",
  template_document: Object.freeze({
    template_document_id: "template-bound-fingerprint",
    template_id: "matter_engagement_letter",
    document_title: "Original title",
    merge_field_count: 3,
  }),
  signed_document_upload: Object.freeze({
    signed_document_upload_id: "signed-upload-bound-fingerprint",
    document_id: "document-bound-fingerprint",
    signature_ref: "signature:document-bound-fingerprint",
    content_sha256: SHA,
    byte_size: 2048,
    mime_type: "application/pdf",
    matter_id: "matter-bound-fingerprint",
    workspace_id: "workspace-bound-fingerprint",
    version_id: "version-bound-fingerprint",
    permission_envelope_id: "permission-bound-fingerprint",
    audit_trace_id: "audit-bound-fingerprint",
  }),
});

test("bound replay rejects drift in every allowed engagement request projection", async () => {
  const repository = createIntakeRuntimeRepository();
  await approveEngagement({
    repository, engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
  });
  const complete = repository.getIdempotency({ tenant_id: TENANT, idempotency_key: KEY });
  const prepared = prepareEngagementApproval({
    engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
  });
  const privateAuthority = complete.response[ENGAGEMENT_APPROVAL_BINDING_FIELD];
  const publicResponse = { ...complete.response };
  delete publicResponse[ENGAGEMENT_APPROVAL_BINDING_FIELD];
  assert.deepEqual(Object.keys(privateAuthority).sort(), ["request_binding", "response_sha256", "schema"]);
  assert.equal(privateAuthority.schema, ENGAGEMENT_APPROVAL_REPLAY_AUTHORITY_SCHEMA);
  assert.equal(privateAuthority.response_sha256, hashDomainValue(publicResponse));
  assert.equal(complete.request_fingerprint, engagementApprovalReplayAuthorityDigest({
    request_fingerprint: prepared.request_fingerprint,
    response_sha256: privateAuthority.response_sha256,
  }));
  const preBindingResponse = { ...complete.response };
  delete preBindingResponse[ENGAGEMENT_APPROVAL_BINDING_FIELD];
  repository.recordIdempotency({ ...complete, response: preBindingResponse });
  const beforePreBindingReplay = repository.snapshot();
  let providerCalls = 0;
  await assert.rejects(approveEngagement({
    repository, engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
    dms_upload_runtime: { async uploadDocument() { providerCalls += 1; } },
  }), ({ safe_error_code }) => (
    safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
  ));
  assert.equal(providerCalls, 0);
  assert.deepEqual(repository.snapshot(), beforePreBindingReplay);
  repository.recordIdempotency(complete);
  const mutations = [
    (response) => ({ ...response, engagement: { ...response.engagement, scope_summary: "Drifted scope" } }),
    (response) => ({ ...response, engagement: { ...response.engagement, fee_terms_id: "fee-terms-drift" } }),
    (response) => ({ ...response, template_document: { ...response.template_document, document_title: "Drifted title" } }),
    (response) => ({ ...response, template_document: { ...response.template_document, merge_field_count: 7 } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, mime_type: "text/plain" } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, matter_id: "matter-drift" } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, workspace_id: "workspace-drift" } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, version_id: "version-drift" } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, permission_envelope_id: "permission-drift" } }),
    (response) => ({ ...response, signed_document_upload: { ...response.signed_document_upload, audit_trace_id: "audit-drift" } }),
  ];
  const before = repository.snapshot();
  for (const mutate of mutations) {
    assert.throws(() => engagementApprovalReplay({
      getIdempotency() { return { ...complete, response: mutate(complete.response) }; },
    }, prepared), ({ safe_error_code }) => (
      safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
    ));
  }
  assert.deepEqual(repository.snapshot(), before);
  repository.close();
});

test("dual SHA aliases are exact hex and cannot carry a pointer", async () => {
  const repository = createIntakeRuntimeRepository();
  const before = repository.snapshot();
  await assert.rejects(approveEngagement({
    repository,
    engagement: {
      ...ENGAGEMENT,
      engagement_id: "engagement-dual-sha-pointer",
      signed_document_upload: {
        ...ENGAGEMENT.signed_document_upload,
        sha256: "s3://not-a-sha256",
      },
    },
    actor_id: ACTOR,
    idempotency_key: "engagement-dual-sha-pointer",
  }), /sha256 must be a SHA-256 digest/u);
  assert.deepEqual(repository.snapshot(), before);
  repository.close();
});

test("derived response and DMS claims are exact before replay", async () => {
  const bytes = Buffer.from("derived response authority");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const engagement = {
    ...ENGAGEMENT,
    engagement_id: "engagement-derived-authority",
    signed_document_id: "document-derived-authority",
    signature_ref: "signature:document-derived-authority",
    signed_document_upload: {
      ...ENGAGEMENT.signed_document_upload,
      signed_document_upload_id: "signed-upload-derived-authority",
      document_id: "document-derived-authority",
      signature_ref: "signature:document-derived-authority",
      content_sha256: digest,
      byte_size: bytes.byteLength,
      bytes_base64: bytes.toString("base64"),
    },
  };
  let providerCalls = 0;
  const uploadRuntime = {
    async uploadDocument(input) {
      providerCalls += 1;
      const versionId = input.document.current_version_id;
      const fileObjectId = `file:${versionId}`;
      return {
        outcome: "created", tenant_id: TENANT, idempotent_replay: false,
        provider_finalize_before_metadata: true, independent_digest_readback: true,
        document: { tenant_id: TENANT, document_id: input.document.document_id, status: "active" },
        version: {
          tenant_id: TENANT, version_id: versionId, document_id: input.document.document_id,
          file_object_id: fileObjectId, sha256: digest, status: "current", persisted: true,
        },
        file_object: {
          tenant_id: TENANT, file_object_id: fileObjectId, sha256: digest,
          byte_size: bytes.byteLength, content_type: "application/pdf", status: "committed",
          raw_path_exposed: false, storage_pointer_ref_included: false, bytes_included: false,
        },
        storage_receipt: {
          tenant_id: TENANT, sha256: digest, byte_size: bytes.byteLength,
          mime_type: "application/pdf", raw_path_exposed: false,
          storage_pointer_ref_included: false, bytes_exposed: false,
        },
        audit_event: { event_id: "audit-derived-authority", raw_payload_included: false },
      };
    },
  };
  const repository = createIntakeRuntimeRepository();
  await approveEngagement({
    repository, engagement, actor_id: ACTOR,
    idempotency_key: "engagement-derived-authority", dms_upload_runtime: uploadRuntime,
  });
  const complete = repository.getIdempotency({
    tenant_id: TENANT, idempotency_key: "engagement-derived-authority",
  });
  const mutations = [
    (r) => ({ ...r, engagement: { ...r.engagement, owner_module: "attacker-module" } }),
    (r) => ({ ...r, engagement: { ...r.engagement, approver_id: "foreign-actor" } }),
    (r) => ({ ...r, engagement: { ...r.engagement, approval_state: "draft" } }),
    (r) => ({ ...r, engagement: { ...r.engagement, status: "draft" } }),
    (r) => ({ ...r, engagement: { ...r.engagement, approved_at: "2020-01-01T00:00:00.000Z" } }),
    (r) => ({ ...r, engagement: { ...r.engagement, production_ready_claim: true } }),
    (r) => ({ ...r, template_document: { ...r.template_document, production_ready_claim: true } }),
    (r) => ({ ...r, template_document: { ...r.template_document, generation_state: "draft" } }),
    (r) => ({ ...r, signed_document_upload: { ...r.signed_document_upload, server_hash_recomputed: false } }),
    (r) => ({ ...r, signed_document_upload: { ...r.signed_document_upload, bytes_included: true } }),
    (r) => ({ ...r, signed_document_upload: { ...r.signed_document_upload, storage_pointer_ref_included: true } }),
    (r) => ({ ...r, signed_document_upload: { ...r.signed_document_upload, production_ready_claim: true } }),
    (r) => ({ ...r, audit_event: { ...r.audit_event, actor_id: "foreign-actor" } }),
    (r) => ({ ...r, audit_event: { ...r.audit_event, action: "engagement.rejected" } }),
    (r) => ({ ...r, audit_event: { ...r.audit_event, decision: "deny" } }),
    (r) => ({ ...r, audit_event: { ...r.audit_event, production_ready_claim: true } }),
    (r) => ({ ...r, audit_event: { ...r.audit_event, metadata: { ...r.audit_event.metadata, document_bytes_included: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, outcome: "failed" } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, tenant_id: "foreign-tenant" } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, idempotent_replay: true } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, provider_finalize_before_metadata: false } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, independent_digest_readback: false } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, document: { ...r.dms_upload.document, tenant_id: "foreign-tenant" } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, document: { ...r.dms_upload.document, status: "deleted" } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, version: { ...r.dms_upload.version, sha256: "b".repeat(64) } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, version: { ...r.dms_upload.version, persisted: false } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, file_object: { ...r.dms_upload.file_object, sha256: "b".repeat(64) } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, file_object: { ...r.dms_upload.file_object, status: "deleted" } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, file_object: { ...r.dms_upload.file_object, raw_path_exposed: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, file_object: { ...r.dms_upload.file_object, storage_pointer_ref_included: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, file_object: { ...r.dms_upload.file_object, bytes_included: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, storage_receipt: { ...r.dms_upload.storage_receipt, sha256: "b".repeat(64) } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, storage_receipt: { ...r.dms_upload.storage_receipt, raw_path_exposed: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, storage_receipt: { ...r.dms_upload.storage_receipt, storage_pointer_ref_included: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, storage_receipt: { ...r.dms_upload.storage_receipt, bytes_exposed: true } } }),
    (r) => ({ ...r, dms_upload: { ...r.dms_upload, audit_event: { ...r.dms_upload.audit_event, raw_payload_included: true } } }),
    (r) => {
      const resealed = { ...r, engagement: { ...r.engagement, owner_module: "attacker-resealed" } };
      const authority = resealed[ENGAGEMENT_APPROVAL_BINDING_FIELD];
      delete resealed[ENGAGEMENT_APPROVAL_BINDING_FIELD];
      return {
        ...resealed,
        [ENGAGEMENT_APPROVAL_BINDING_FIELD]: {
          ...authority,
          response_sha256: hashDomainValue(resealed),
        },
      };
    },
  ];
  const before = repository.snapshot();
  for (const mutate of mutations) {
    await assert.rejects(approveEngagement({
      repository: { getIdempotency() { return { ...complete, response: mutate(complete.response) }; } },
      engagement, actor_id: ACTOR, idempotency_key: "engagement-derived-authority",
      dms_upload_runtime: uploadRuntime,
    }), ({ safe_error_code }) => (
      safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_MANUAL_REVIEW"
    ));
  }
  assert.equal(providerCalls, 1);
  assert.deepEqual(repository.snapshot(), before);
  repository.close();
});
