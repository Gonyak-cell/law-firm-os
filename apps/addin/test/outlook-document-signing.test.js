import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  OUTLOOK_DOCUMENTS_PATH,
  OUTLOOK_ESIGN_REQUESTS_PATH,
  createOutlookDocumentApprovalIdempotencyKey,
  createOutlookDocumentApprovalListRequest,
  createOutlookDocumentApprovalRequest,
  createOutlookDocumentCatalogRequest,
  createOutlookDocumentPublishIdempotencyKey,
  createOutlookDocumentPublishRequest,
  createOutlookDocumentTemplatesRequest,
  createOutlookDocusignActionIdempotencyKey,
  createOutlookDocusignReconcileRequest,
  createOutlookDocusignRequestListRequest,
  createOutlookDocusignSendRequest,
  parseOutlookDocumentApprovalListResponse,
  parseOutlookDocumentApprovalResponse,
  parseOutlookDocumentCatalogResponse,
  parseOutlookDocumentPublishResponse,
  parseOutlookDocumentTemplatesResponse,
  parseOutlookDocusignActionResponse,
  parseOutlookDocusignReconcileResponse,
  parseOutlookDocusignRequestListResponse,
  parseOutlookDocusignSendResponse,
} from "../src/outlook-document-signing.js";
import { handleDocusignOutlookRequest } from "../../api/src/docusign-api.js";

const H = "a".repeat(64);
const B = "b".repeat(64);
const CANONICAL_GENERATOR_VERSION = "amic-matter-agreement-docx/1";
const template = (template_id = "template-a", template_version = "v1") => ({
  template_id,
  template_version,
  template_hash: H,
  label: "위임 계약서",
  category: "document",
  merge_field_count: 1,
  merge_fields: ["client_name"],
  signer_roles: [{ role_id: "client", required: true }],
  requires_approval: true,
  approval_receipt_present: true,
  raw_template_body_included: false,
  raw_contact_values_included: false,
  production_ready_claim: false,
});
const draft = (draft_id = "draft-a", matter_id = "matter-a") => ({
  draft_id,
  matter_id,
  template_id: "template-a",
  template_version: "v1",
  template_hash: H,
  input_fingerprint: H,
  title: "위임 계약",
  status: "ready_for_review",
  safe_excerpt: "입력 본문 12자",
  merge_field_count: 1,
  signer_role_count: 1,
  approval_state: "approval_required",
  publish_state: "owner_blocked",
  immutable: false,
  raw_body_included: false,
  raw_template_body_included: false,
  raw_contact_values_included: false,
  document_bytes_included: false,
  production_ready_claim: false,
});
const approval = (approval_request_id = "approval-a", draft_id = "draft-a", matter_id = "matter-a") => ({
  approval_request_id,
  draft_id,
  matter_id,
  status: "pending_owner_approval",
  decision: null,
  reviewer_role: "owner",
  input_fingerprint: H,
  template_id: "template-a",
  template_version: "v1",
  template_hash: H,
  approval_receipt: null,
  reviewer_user_ref_included: false,
  owner_approval_ref_included: false,
  raw_body_included: false,
  raw_contact_values_included: false,
  production_ready_claim: false,
});
const approvedApproval = (approval_request_id = "approval-a", draft_id = "draft-a", matter_id = "matter-a") => ({
  ...approval(approval_request_id, draft_id, matter_id),
  status: "approved",
  decision: "approved",
  approval_receipt: receipt(approval_request_id),
});
const rejectedApproval = (approval_request_id = "approval-a", draft_id = "draft-a", matter_id = "matter-a") => ({
  ...approval(approval_request_id, draft_id, matter_id),
  status: "rejected",
  decision: "rejected",
});
const esign = (request_id = "esign-a", matter_id = "matter-a") => ({
  request_id,
  matter_id,
  document: { document_id: "doc-a", version_id: "version-a", sha256: H },
  recipients: [{ recipient_ref: "party-a", role: "client", routing_order: 1 }],
  state: "sent",
  canonical_document_ref: `matter://${matter_id}/documents/doc-a/versions/version-a`,
  can_send: false,
  can_reconcile: true,
  completion_artifacts: null,
  production_ready_claim: false,
});
const completionArtifact = (kind = "signed") => ({
  document_id: `dms:${kind}`,
  version_id: `version:${kind}`,
  sha256: kind === "signed" ? H : B,
  immutable: true,
});
const receipt = (approval_request_id = "approval-a", template_hash = H) => ({
  receipt_id: "receipt-a",
  approval_request_id,
  approved_at: "2026-08-09T00:00:00.000Z",
  input_hash: H,
  input_fingerprint: H,
  template_hash,
  receipt_hash: H,
  approved_by_ref_included: false,
  raw_body_included: false,
  raw_contact_values_included: false,
});
const artifact = (draft_id = "draft-a", generator_version = "generator-1") => ({
  artifact_id: "artifact-a",
  draft_id,
  document_id: "document-a",
  version_id: "version-a",
  file_object_id: "file-a",
  filename: "위임계약서.docx",
  mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  byte_size: 12,
  sha256: H,
  generator_version,
  template_id: "template-a",
  template_version: "v1",
  template_hash: H,
  input_hash: H,
  approval_receipt_id: "receipt-a",
  status: "finalized",
  immutable: true,
  signer_snapshot_count: 1,
  document_bytes_included: false,
  raw_body_included: false,
  raw_contact_values_included: false,
  raw_storage_path_included: false,
});
const catalog = () => ({
  request_id: "request-a",
  outcome: "passed",
  matter_id: "matter-a",
  templates: [template()],
  approval_requests: [approval()],
  esign_requests: [esign()],
  readiness: { authoritative: true, builder_ready: true, esign_ready: true },
  safe_error_codes: [],
  count_leak_prevented: true,
  production_ready_claim: false,
});
const body = (value, status = 200) => ({ status, body: value });

test("facade builders use only signed-session routes and exact safe bodies", () => {
  assert.deepEqual(createOutlookDocumentCatalogRequest({ matter_id: "matter-a" }), { method: "GET", path: `${OUTLOOK_DOCUMENTS_PATH}?matter_id=matter-a` });
  assert.deepEqual(createOutlookDocumentTemplatesRequest({ matter_id: "matter-a" }), createOutlookDocumentCatalogRequest({ matter_id: "matter-a" }));
  assert.deepEqual(createOutlookDocumentApprovalListRequest({ matter_id: "matter-a" }), createOutlookDocumentCatalogRequest({ matter_id: "matter-a" }));
  assert.deepEqual(createOutlookDocusignRequestListRequest({ matter_id: "matter-a" }), createOutlookDocumentCatalogRequest({ matter_id: "matter-a" }));
  const approvalRequest = createOutlookDocumentApprovalRequest({
    matter_id: "matter-a",
    template_id: "template-a",
    template_version: "v1",
    title: "위임 계약",
    merge_data: { client_name: "김 의뢰인" },
    signer_role_refs: [{ role_id: "client", party_ref: "party-a" }],
    idempotency_key: "outlook-document-approval:test",
  });
  assert.deepEqual(approvalRequest, {
    method: "POST",
    path: `${OUTLOOK_DOCUMENTS_PATH}/approval-requests`,
    body: {
      matter_id: "matter-a",
      template_id: "template-a",
      template_version: "v1",
      title: "위임 계약",
      merge_data: { client_name: "김 의뢰인" },
      signer_role_refs: [{ role_id: "client", party_ref: "party-a" }],
      idempotency_key: "outlook-document-approval:test",
      explicit_human_action: true,
    },
  });
  assert.deepEqual(
    createOutlookDocumentPublishRequest({
      matter_id: "matter-a",
      draft_id: "draft-a",
      idempotency_key: "publish-a",
    }),
    {
      method: "POST",
      path: `${OUTLOOK_DOCUMENTS_PATH}/draft-a/publish`,
      body: {
        matter_id: "matter-a",
        idempotency_key: "publish-a",
        explicit_human_action: true,
      },
    },
  );
  assert.deepEqual(
    createOutlookDocusignSendRequest({
      matter_id: "matter-a",
      request_id: "esign-a",
      idempotency_key: "send-a",
    }),
    {
      method: "POST",
      path: `${OUTLOOK_ESIGN_REQUESTS_PATH}/esign-a/send`,
      body: {
        matter_id: "matter-a",
        idempotency_key: "send-a",
        explicit_human_action: true,
      },
    },
  );
  assert.deepEqual(
    createOutlookDocusignReconcileRequest({
      matter_id: "matter-a",
      request_id: "esign-a",
      idempotency_key: "reconcile-a",
    }),
    {
      method: "POST",
      path: `${OUTLOOK_ESIGN_REQUESTS_PATH}/esign-a/reconcile`,
      body: {
        matter_id: "matter-a",
        idempotency_key: "reconcile-a",
        explicit_human_action: true,
      },
    },
  );
  assert.throws(() =>
    createOutlookDocumentApprovalRequest({
      matter_id: "matter-a",
      template_id: "template-a",
      template_version: "v1",
      title: "x",
      merge_data: {},
      signer_role_refs: [],
      idempotency_key: "x",
      tenant_id: "must-not-be-client-input",
    }),
  );
  assert.deepEqual(
    createOutlookDocumentApprovalRequest({
      matter_id: "matter-a",
      template_id: "template-a",
      template_version: "v1",
      title: "x",
      merge_data: { contact_email: "server-bound" },
      signer_role_refs: [],
      idempotency_key: "x",
    }).body.merge_data,
    { contact_email: "server-bound" },
  );
});

test("canonical intent helpers are deterministic and operation-bound", async () => {
  const intent = {
    matter_id: "matter-a",
    template_id: "template-a",
    template_version: "v1",
    template_hash: H,
    title: "위임 계약",
    merge_data: { client_name: "김 의뢰인" },
    signer_role_refs: [{ role_id: "client", party_ref: "party-a" }],
  };
  const first = await createOutlookDocumentApprovalIdempotencyKey(intent, webcrypto);
  assert.equal(first, await createOutlookDocumentApprovalIdempotencyKey({ ...intent }, webcrypto));
  assert.match(first, /^outlook-document-approval:[a-f0-9]{64}$/u);
  assert.notEqual(first, await createOutlookDocumentApprovalIdempotencyKey({ ...intent, title: "다른 계약" }, webcrypto));
  assert.notEqual(first, await createOutlookDocumentApprovalIdempotencyKey({ ...intent, template_hash: B }, webcrypto));
  const publish = await createOutlookDocumentPublishIdempotencyKey({ matter_id: "matter-a", draft_id: "draft-a" }, webcrypto);
  assert.equal(publish, await createOutlookDocumentPublishIdempotencyKey({ matter_id: "matter-a", draft_id: "draft-a" }, webcrypto));
  assert.notEqual(publish, await createOutlookDocumentPublishIdempotencyKey({ matter_id: "matter-a", draft_id: "draft-b" }, webcrypto));
  const action = await createOutlookDocusignActionIdempotencyKey(
    {
      matter_id: "matter-a",
      request_id: "esign-a",
      action: "send",
      intent_id: "click-1",
    },
    webcrypto,
  );
  assert.match(action, /^outlook-docusign-send:[a-f0-9]{64}$/u);
  assert.equal(
    action,
    await createOutlookDocusignActionIdempotencyKey(
      {
        matter_id: "matter-a",
        request_id: "esign-a",
        action: "send",
        intent_id: "click-1",
      },
      webcrypto,
    ),
  );
  assert.notEqual(
    action,
    await createOutlookDocusignActionIdempotencyKey(
      {
        matter_id: "matter-a",
        request_id: "esign-a",
        action: "send",
        intent_id: "click-2",
      },
      webcrypto,
    ),
  );
  assert.notEqual(
    action,
    await createOutlookDocusignActionIdempotencyKey(
      {
        matter_id: "matter-a",
        request_id: "esign-a",
        action: "reconcile",
        intent_id: "click-1",
      },
      webcrypto,
    ),
  );
});

test("catalog parser accepts happy and partial eSign readiness projections", () => {
  const parsed = parseOutlookDocumentCatalogResponse(body(catalog()), "matter-a");
  assert.equal(parsed.templates[0].template_id, "template-a");
  assert.equal(parsed.approval_requests[0].matter_id, "matter-a");
  const decided = catalog();
  decided.approval_requests = [approvedApproval()];
  assert.equal(parseOutlookDocumentApprovalListResponse(decided, { matter_id: "matter-a" })[0].decision, "approved");
  const rejected = catalog();
  rejected.approval_requests = [rejectedApproval()];
  assert.equal(parseOutlookDocumentApprovalListResponse(rejected, { matter_id: "matter-a" })[0].decision, "rejected");
  for (const invalid of [
    { status: "approved", decision: null, approval_receipt: null },
    { status: "approved", decision: "approved", approval_receipt: null },
    { status: "pending_owner_approval", decision: null, approval_receipt: receipt() },
    { status: "rejected", decision: "rejected", approval_receipt: receipt() },
  ]) {
    const malformed = catalog();
    malformed.approval_requests = [{ ...approval(), ...invalid }];
    assert.throws(() => parseOutlookDocumentCatalogResponse(malformed, "matter-a"));
  }
  assert.equal(
    parseOutlookDocumentTemplatesResponse(body(catalog()), {
      matter_id: "matter-a",
    }).length,
    1,
  );
  assert.equal(
    parseOutlookDocumentApprovalListResponse(body(catalog()), {
      matter_id: "matter-a",
    }).length,
    1,
  );
  assert.equal(
    parseOutlookDocusignRequestListResponse(body(catalog()), {
      matter_id: "matter-a",
    }).length,
    1,
  );
  const partial = catalog();
  partial.readiness.esign_ready = false;
  partial.esign_requests = [];
  partial.safe_error_codes = ["DOCUSIGN_RUNTIME_UNAVAILABLE"];
  assert.equal(
    parseOutlookDocusignRequestListResponse(body(partial), {
      matter_id: "matter-a",
    }).length,
    0,
  );
  const observed = catalog();
  observed.esign_requests[0].state = "completed_artifacts_pending";
  observed.esign_requests[0].completion_artifacts = { signed_pdf: completionArtifact(), certificate: null };
  assert.deepEqual(
    parseOutlookDocusignRequestListResponse(observed, { matter_id: "matter-a" })[0].completion_artifacts,
    { signed_pdf: completionArtifact(), certificate: null },
  );
  const sentWithArtifacts = catalog();
  sentWithArtifacts.esign_requests[0].completion_artifacts = { signed_pdf: completionArtifact(), certificate: null };
  assert.throws(() => parseOutlookDocusignRequestListResponse(sentWithArtifacts, { matter_id: "matter-a" }));
  const completed = catalog();
  completed.esign_requests[0] = {
    ...completed.esign_requests[0],
    state: "completed",
    can_reconcile: false,
    completion_artifacts: { signed_pdf: completionArtifact(), certificate: completionArtifact("certificate") },
  };
  assert.deepEqual(parseOutlookDocusignRequestListResponse(completed, { matter_id: "matter-a" })[0].completion_artifacts, {
    signed_pdf: completionArtifact(),
    certificate: completionArtifact("certificate"),
  });
  const completedMissing = catalog();
  completedMissing.esign_requests[0] = { ...completed.esign_requests[0], completion_artifacts: { signed_pdf: completionArtifact(), certificate: null } };
  assert.throws(() => parseOutlookDocusignRequestListResponse(completedMissing, { matter_id: "matter-a" }));
  const completedNull = catalog();
  completedNull.esign_requests[0] = { ...completed.esign_requests[0], completion_artifacts: null };
  assert.throws(() => parseOutlookDocusignRequestListResponse(completedNull, { matter_id: "matter-a" }));
  const completedWrongBinding = catalog();
  completedWrongBinding.esign_requests[0] = {
    ...completed.esign_requests[0],
    completion_artifacts: { signed_pdf: completionArtifact("certificate"), certificate: completionArtifact("certificate") },
  };
  assert.throws(() => parseOutlookDocusignRequestListResponse(completedWrongBinding, { matter_id: "matter-a" }));
  const pendingWrongBinding = catalog();
  pendingWrongBinding.esign_requests[0] = {
    ...pendingWrongBinding.esign_requests[0],
    state: "completed_artifacts_pending",
    completion_artifacts: {
      signed_pdf: { ...completionArtifact(), document_id: "dms:shared", version_id: "version:signed" },
      certificate: { ...completionArtifact("certificate"), document_id: "dms:shared", version_id: "version:certificate" },
    },
  };
  assert.throws(() => parseOutlookDocusignRequestListResponse(pendingWrongBinding, { matter_id: "matter-a" }));
  const versions = catalog();
  versions.templates = [template("template-a", "v1"), template("template-a", "v2")];
  versions.approval_requests = [approval("approval-b", "draft-b"), approval("approval-a", "draft-a")];
  assert.equal(parseOutlookDocumentCatalogResponse(versions, "matter-a").templates.length, 2);
  assert.equal(
    parseOutlookDocumentApprovalListResponse(versions, {
      matter_id: "matter-a",
    })[0].approval_request_id,
    "approval-b",
  );
});

test("mutation parsers preserve replay and partial outcomes without raw data", () => {
  const approvalBody = {
    request_id: "request-a",
    outcome: "idempotent_replay",
    matter_id: "matter-a",
    draft: draft(),
    approval_request: approval(),
    partial: false,
    draft_replayed: true,
    approval_replayed: true,
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  const replay = parseOutlookDocumentApprovalResponse(body(approvalBody), {
    matter_id: "matter-a",
    draft_id: "draft-a",
    approval_request_id: "approval-a",
    template_id: "template-a",
    template_version: "v1",
    title: "위임 계약",
  });
  assert.equal(replay.draft_replayed, true);
  assert.equal(replay.approval_request.approval_receipt, null);
  assert.equal(parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "approval_required", draft: draft(), approval_request: approval(), draft_replayed: false, approval_replayed: false }, { matter_id: "matter-a" }).outcome, "approval_required");
  assert.equal(parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "approval_required", draft_replayed: true, approval_replayed: false }, { matter_id: "matter-a" }).draft_replayed, true);
  const mixedVersion = {
    ...approvalBody,
    draft: { ...draft(), template_version: "v1" },
    approval_request: { ...approvalBody.approval_request, template_version: "v2" },
  };
  assert.throws(() => parseOutlookDocumentApprovalResponse(mixedVersion, {
    matter_id: "matter-a",
    draft_id: "draft-a",
    template_id: "template-a",
    template_version: "v2",
    title: "위임 계약",
  }));
  const foreignDraft = { ...approvalBody, draft: { ...draft(), matter_id: "matter-b" } };
  assert.throws(() => parseOutlookDocumentApprovalResponse(foreignDraft, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse(approvalBody, { matter_id: "matter-a", title: "다른 계약" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse(approvalBody, { matter_id: "matter-a", approval_request_id: "approval-b" }));
  const receiptDrift = { ...approvalBody, approval_request: { ...approvalBody.approval_request, approval_receipt: receipt("approval-b") } };
  assert.throws(() => parseOutlookDocumentApprovalResponse(receiptDrift, { matter_id: "matter-a" }));
  const partial = {
    ...approvalBody,
    outcome: "partial",
    draft: { ...draft(), status: "draft" },
    approval_request: null,
    partial: true,
    draft_replayed: false,
    approval_replayed: false,
    safe_error_codes: ["DOCUSIGN_RUNTIME_UNAVAILABLE"],
  };
  assert.equal(
    parseOutlookDocumentApprovalResponse(body(partial, 400), {
      matter_id: "matter-a",
    }).partial,
    true,
  );
  assert.equal(
    parseOutlookDocumentApprovalResponse({ status: 400, payload: partial }, {
      matter_id: "matter-a",
    }).partial,
    true,
  );
  const error = Object.assign(new Error("HTTP 400"), { status: 400, payload: partial });
  assert.equal(parseOutlookDocumentApprovalResponse(error, { matter_id: "matter-a" }).partial, true);
  assert.throws(() => parseOutlookDocumentApprovalResponse(body(partial, 302), { matter_id: "matter-a" }));
  const approvedResponse = {
    ...approvalBody,
    outcome: "approval_required",
    draft: { ...draft(), status: "approved", approval_state: "approved", publish_state: "approved_unpublished", immutable: true },
    approval_request: approvedApproval(),
    draft_replayed: false,
    approval_replayed: false,
  };
  assert.throws(() => parseOutlookDocumentApprovalResponse(approvedResponse, { matter_id: "matter-a" }));
  const published = {
    request_id: "request-publish",
    outcome: "created",
    matter_id: "matter-a",
    draft: { ...draft("draft-a"), status: "finalized", approval_state: "approved", publish_state: "complete", immutable: true },
    artifact: artifact(),
    canonical_document_ref: "matter://matter-a/documents/document-a/versions/version-a",
    partial: false,
    idempotent_replay: false,
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  const publishedResult = parseOutlookDocumentPublishResponse(published, {
    matter_id: "matter-a",
    draft_id: "draft-a",
    artifact_id: "artifact-a",
    approval_receipt_id: "receipt-a",
    template_id: "template-a",
    template_version: "v1",
    template_hash: H,
    input_fingerprint: H,
    input_hash: H,
  });
  assert.equal(publishedResult.canonical_document_ref, "matter://matter-a/documents/document-a/versions/version-a");
  assert.equal(Object.hasOwn(publishedResult.artifact, "raw_storage_path_included"), false);
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, artifact: { ...artifact(), template_version: "v2" } }, { matter_id: "matter-a", draft_id: "draft-a" }));
  const publish = {
    request_id: "request-publish",
    outcome: "reconciliation_required",
    matter_id: "matter-a",
    draft: null,
    artifact: null,
    canonical_document_ref: null,
    partial: true,
    idempotent_replay: false,
    safe_error_codes: ["MATTER_PUBLICATION_RECONCILIATION_REQUIRED"],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  assert.equal(
    parseOutlookDocumentPublishResponse(body(publish, 503), {
      matter_id: "matter-a",
      draft_id: "draft-a",
    }).canonical_document_ref,
    null,
  );
  assert.throws(() => parseOutlookDocumentPublishResponse(body(publish, 302), { matter_id: "matter-a", draft_id: "draft-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "partial", partial: false, safe_error_codes: [] }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, draft: null, approval_request: null }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "reconciliation_required", partial: false }, { matter_id: "matter-a" }));
  const publishExpected = {
    matter_id: "matter-a",
    draft_id: "draft-a",
    template_id: "template-a",
    template_version: "v1",
    template_hash: H,
    input_fingerprint: H,
    input_hash: H,
    approval_receipt_id: "receipt-a",
  };
  for (const generator_version of [
    "amic-matter-agreement-docx/1/extra",
    "amic-matter-agreement-docx?1",
    "amic-matter-agreement-docx#1",
    "amic matter/1",
    "amic-matter-agreement-docx/1\u0000",
    "amic-matter-agreement-docx\\1",
    "amic-matter-agreement-docx/../1",
    "amic-matter-agreement-docx/./1",
    "provider_payload",
    "storage_path",
    "permission_envelope_id",
    "audit_trace_id",
    "raw_body",
    "document_bytes",
    "client_secret",
    "internal-build",
  ]) {
    assert.throws(() => parseOutlookDocumentPublishResponse({
      ...published,
      artifact: { ...artifact(), generator_version },
    }, publishExpected));
  }
  assert.throws(() => parseOutlookDocumentPublishResponse(published, { matter_id: "matter-a", draft_id: "draft-a" }));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, draft: null }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, artifact: null, canonical_document_ref: null }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, outcome: "reconciliation_required", partial: false }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, outcome: "created", partial: true, draft: null, artifact: null, canonical_document_ref: null, safe_error_codes: ["MATTER_PUBLICATION_RECONCILIATION_REQUIRED"] }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, artifact: { ...artifact(), template_id: "foreign-template" } }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, artifact: { ...artifact(), input_hash: B } }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, artifact: { ...artifact(), approval_receipt_id: "foreign-receipt" } }, publishExpected));
  const colludingForeignChain = {
    ...published,
    draft: { ...published.draft, template_id: "foreign-template", template_version: "v2", template_hash: B, input_fingerprint: B },
    artifact: { ...published.artifact, template_id: "foreign-template", template_version: "v2", template_hash: B, input_hash: B },
  };
  assert.throws(() => parseOutlookDocumentPublishResponse(colludingForeignChain, publishExpected));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "idempotent_replay", draft_replayed: false }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "created", draft_replayed: true, approval_replayed: false }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "approval_required", draft_replayed: false, approval_replayed: true }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentApprovalResponse({ ...approvalBody, outcome: "approval_required", draft: { ...draft(), status: "approved", approval_state: "approved", publish_state: "approved_unpublished", immutable: true }, approval_request: { ...approval(), status: "approved", decision: "approved" }, draft_replayed: false, approval_replayed: false }, { matter_id: "matter-a" }));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, idempotent_replay: true }, publishExpected));
  assert.throws(() => parseOutlookDocumentPublishResponse({ ...published, outcome: "idempotent_replay", idempotent_replay: false }, publishExpected));
  const action = parseOutlookDocusignActionResponse(
    body(
      {
        request_id: "action-a",
        outcome: "in_progress",
        item: { ...esign(), state: "provider_pending" },
        safe_error_codes: [],
        production_ready_claim: false,
      },
      202,
    ),
    { matter_id: "matter-a", request_id: "esign-a" },
  );
  assert.equal(action.item.request_id, "esign-a");
  assert.throws(() => parseOutlookDocusignSendResponse({
    status: 200,
    body: {
      request_id: "action-a",
      outcome: "in_progress",
      item: { ...esign(), state: "provider_pending" },
      safe_error_codes: [],
      production_ready_claim: false,
    },
  }, { matter_id: "matter-a", request_id: "esign-a" }));
  assert.throws(() => parseOutlookDocusignSendResponse({
    status: 200,
    body: {
      request_id: "action-a",
      outcome: "reconciled",
      item: esign(),
      safe_error_codes: [],
      production_ready_claim: false,
    },
  }, { matter_id: "matter-a", request_id: "esign-a" }));
  assert.throws(() => parseOutlookDocusignSendResponse({
    status: 200,
    body: {
      request_id: "action-a",
      outcome: "sent",
      item: esign(),
      safe_error_codes: ["DOCUSIGN_RUNTIME_UNAVAILABLE"],
      production_ready_claim: false,
    },
  }, { matter_id: "matter-a", request_id: "esign-a" }));
  assert.throws(() => parseOutlookDocusignReconcileResponse({
    status: 202,
    body: {
      request_id: "action-a",
      outcome: "already_converged",
      item: esign(),
      safe_error_codes: [],
      production_ready_claim: false,
    },
  }, { matter_id: "matter-a", request_id: "esign-a" }));
  assert.throws(() => parseOutlookDocusignReconcileResponse({
    status: 200,
    body: {
      request_id: "action-a",
      outcome: "in_progress",
      item: { ...esign(), state: "reconciliation_required" },
      safe_error_codes: [],
      production_ready_claim: false,
    },
  }, { matter_id: "matter-a", request_id: "esign-a" }));
  assert.equal(
    parseOutlookDocusignReconcileResponse(
      {
        request_id: "action-a",
        outcome: "already_converged",
        item: esign(),
        safe_error_codes: [],
        production_ready_claim: false,
      },
      { matter_id: "matter-a", request_id: "esign-a" },
    ).outcome,
    "already_converged",
  );
  assert.equal(Object.hasOwn(replay.draft, "raw_body"), false);
});

test("server route projections feed catalog, partial approval, publish, send, and reconcile parsers", async () => {
  const serverCatalog = catalog();
  assert.equal(parseOutlookDocumentCatalogResponse(serverCatalog, "matter-a").outcome, "passed");
  const serverPartialApproval = {
    request_id: "server-partial",
    outcome: "partial",
    matter_id: "matter-a",
    draft: { ...draft(), status: "draft" },
    approval_request: null,
    partial: true,
    draft_replayed: false,
    approval_replayed: false,
    safe_error_codes: ["OUTLOOK_DOCUMENT_APPROVAL_UNAVAILABLE"],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  assert.equal(parseOutlookDocumentApprovalResponse({ status: 503, body: serverPartialApproval }, { matter_id: "matter-a" }).partial, true);
  const serverPublish = {
    request_id: "server-publish",
    outcome: "created",
    matter_id: "matter-a",
    draft: { ...draft("draft-a"), status: "finalized", approval_state: "approved", publish_state: "complete", immutable: true },
    artifact: artifact("draft-a", CANONICAL_GENERATOR_VERSION),
    canonical_document_ref: "matter://matter-a/documents/document-a/versions/version-a",
    partial: false,
    idempotent_replay: false,
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  assert.equal(parseOutlookDocumentPublishResponse({ status: 200, body: serverPublish }, {
    matter_id: "matter-a",
    draft_id: "draft-a",
    template_id: "template-a",
    template_version: "v1",
    template_hash: H,
    input_fingerprint: H,
    input_hash: H,
    approval_receipt_id: "receipt-a",
  }).artifact.generator_version, CANONICAL_GENERATOR_VERSION);
  const runtime = Object.freeze({
    authorizeMatter: async ({ matter_id: matterId }) => matterId === "matter-a",
    envelope_service: Object.freeze({
      async listRequests() { return [esign()]; },
      async sendApprovedRequest({ request_id: requestId }) { return { outcome: "sent", request: esign(requestId) }; },
      async reconcileRequest({ request_id: requestId }) { return { outcome: "already_converged", request: esign(requestId) }; },
    }),
  });
  const principal = { tenant_id: "tenant-a", actor_id: "actor-a" };
  const sendServer = await handleDocusignOutlookRequest({
    method: "POST",
    pathname: `${OUTLOOK_ESIGN_REQUESTS_PATH}/esign-a/send`,
    body: { matter_id: "matter-a", idempotency_key: "send-server", explicit_human_action: true },
    principal,
    requestId: "server-send",
    runtime,
  });
  assert.equal(parseOutlookDocusignSendResponse(sendServer, { matter_id: "matter-a", request_id: "esign-a" }).outcome, "sent");
  const reconcileServer = await handleDocusignOutlookRequest({
    method: "POST",
    pathname: `${OUTLOOK_ESIGN_REQUESTS_PATH}/esign-a/reconcile`,
    body: { matter_id: "matter-a", idempotency_key: "reconcile-server", explicit_human_action: true },
    principal,
    requestId: "server-reconcile",
    runtime,
  });
  assert.equal(parseOutlookDocusignReconcileResponse(reconcileServer, { matter_id: "matter-a", request_id: "esign-a" }).outcome, "already_converged");
  const deniedSend = await handleDocusignOutlookRequest({
    method: "POST",
    pathname: `${OUTLOOK_ESIGN_REQUESTS_PATH}/esign-a/send`,
    body: { matter_id: "matter-a", idempotency_key: "send-denied", explicit_human_action: true },
    principal,
    requestId: "server-denied-send",
    runtime: { ...runtime, authorizeMatter: async () => false },
  });
  assert.equal(deniedSend.status, 403);
  assert.deepEqual(deniedSend.body, {
    request_id: "server-denied-send",
    outcome: "blocked",
    safe_error_codes: ["DOCUSIGN_MATTER_ACCESS_DENIED"],
    detail_exposed: false,
    production_ready_claim: false,
  });
  assert.throws(() => parseOutlookDocusignSendResponse(deniedSend, { matter_id: "matter-a", request_id: "esign-a" }));
});

test("parsers fail closed on status, extra/internal fields, drift, unsupported states, and malformed lists", () => {
  assert.throws(() => parseOutlookDocumentCatalogResponse(body(catalog(), 403), "matter-a"));
  const extra = catalog();
  extra.tenant_id = "tenant-secret";
  assert.throws(() => parseOutlookDocumentCatalogResponse(extra, "matter-a"));
  const internal = catalog();
  internal.approval_requests[0].raw_body = "secret";
  assert.throws(() => parseOutlookDocumentCatalogResponse(internal, "matter-a"));
  const foreign = catalog();
  foreign.approval_requests[0].matter_id = "matter-b";
  assert.throws(() => parseOutlookDocumentCatalogResponse(foreign, "matter-a"));
  const foreignEsign = catalog();
  foreignEsign.esign_requests[0].matter_id = "matter-b";
  assert.throws(() => parseOutlookDocumentCatalogResponse(foreignEsign, "matter-a"));
  const actionDrift = {
    request_id: "action-a",
    outcome: "in_progress",
    item: esign("esign-b"),
    safe_error_codes: [],
    production_ready_claim: false,
  };
  assert.throws(() =>
    parseOutlookDocusignActionResponse(actionDrift, {
      matter_id: "matter-a",
      request_id: "esign-a",
    }),
  );
  const drift = {
    request_id: "request-publish",
    outcome: "created",
    matter_id: "matter-a",
    draft: draft("draft-a"),
    artifact: null,
    canonical_document_ref: null,
    partial: false,
    idempotent_replay: false,
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
  assert.throws(() =>
    parseOutlookDocumentPublishResponse(drift, {
      matter_id: "matter-a",
      draft_id: "draft-a",
    }),
  );
  const unsupported = catalog();
  unsupported.esign_requests[0].state = "unknown";
  assert.throws(() => parseOutlookDocumentCatalogResponse(unsupported, "matter-a"));
  const malformed = catalog();
  malformed.approval_requests = [approval("approval-a", "draft-a"), approval("approval-b", "draft-b")];
  assert.throws(() => parseOutlookDocumentCatalogResponse(malformed, "matter-a"));
  const unavailableWithoutCode = catalog();
  unavailableWithoutCode.readiness.esign_ready = false;
  unavailableWithoutCode.esign_requests = [];
  assert.throws(() => parseOutlookDocumentCatalogResponse(unavailableWithoutCode, "matter-a"));
  const readyWithCode = catalog();
  readyWithCode.safe_error_codes = ["OUTLOOK_DOCUMENT_ESIGN_UNAVAILABLE"];
  assert.throws(() => parseOutlookDocumentCatalogResponse(readyWithCode, "matter-a"));
  const artifactLeak = catalog();
  artifactLeak.esign_requests[0].completion_artifacts = {
    signed_pdf: {
      document_id: "doc-a",
      version_id: "version-a",
      sha256: H,
      immutable: true,
      permission_envelope_id: "secret",
    },
    certificate: null,
  };
  assert.throws(() => parseOutlookDocumentCatalogResponse(artifactLeak, "matter-a"));
});
