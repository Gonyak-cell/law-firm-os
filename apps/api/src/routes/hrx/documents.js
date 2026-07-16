import { randomUUID } from "node:crypto";
import { createInMemoryHrxDocumentStore } from "../../../../../packages/hrx/src/documents.js";
import {
  createInMemoryHrxDocumentSourceAdapter,
  mergeHrxDocumentSourceVerification,
} from "../../../../../packages/hrx/src/documents/source-adapter.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

export function createHrxDocumentsRoute({ store = createInMemoryHrxDocumentStore(), sourceAdapter = createInMemoryHrxDocumentSourceAdapter(), audit } = {}) {
  async function appendAudit(request, { action, document, reason }) {
    await audit?.append?.({
      event_id: `hrx_doc_evt_${randomUUID()}`,
      tenant_id: request.context.tenant_id,
      actor_id: request.context.actor_id,
      action,
      object_type: "HRDocument",
      object_id: document.document_id,
      decision: "allow",
      reason,
      metadata: {
        employee_id: document.employee_id,
        source_ref: document.source_ref,
        source_provider: document.source_provider,
        source_status: document.source_status,
        source_version_ref: document.source_version_ref,
        contract_state: document.contract_state ?? null,
        signature_ref: document.signature_ref ?? null,
        expires_on: document.expires_on ?? null,
      },
    });
  }

  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method === "GET" && request.params?.expiring === true) {
          const documents = store.listExpiring({
            tenant_id: request.context?.tenant_id,
            employee_id: request.query?.employee_id,
            as_of: request.query?.as_of,
            days: request.query?.days ?? 30,
          });
          return response(200, { outcome: "ok", documents, within_days: Number(request.query?.days ?? 30) });
        }
        if (request.method === "POST" && request.params?.document_id && request.params?.lifecycle_action === "sign") {
          const document = store.transitionContract(
            { tenant_id: request.context?.tenant_id, document_id: request.params.document_id },
            { state: "signed", signature_ref: request.body?.signature_ref, signed_at: request.body?.signed_at ?? new Date().toISOString() },
          );
          if (!document) return response(404, { outcome: "not_found" });
          await appendAudit(request, { action: "hrx.document.contract.sign", document, reason: "hrx_contract_document_signed" });
          return response(200, { outcome: "signed", document });
        }
        if (request.method === "POST" && request.params?.document_id && ["expire", "renew", "terminate"].includes(request.params?.lifecycle_action)) {
          const action = request.params.lifecycle_action;
          const change = action === "expire"
            ? { state: "expired", expired_at: request.body?.expired_at ?? new Date().toISOString() }
            : action === "renew"
              ? { state: "renewed", expires_on: request.body?.expires_on, renewal_of_contract_id: request.body?.renewal_of_contract_id ?? request.params.document_id }
              : { state: "terminated" };
          const document = store.transitionContract(
            { tenant_id: request.context?.tenant_id, document_id: request.params.document_id },
            change,
          );
          if (!document) return response(404, { outcome: "not_found" });
          const outcome = action === "expire" ? "expired" : action === "renew" ? "renewed" : "terminated";
          await appendAudit(request, { action: `hrx.document.contract.${action}`, document, reason: `hrx_contract_document_${outcome}` });
          return response(200, { outcome: action === "expire" ? "expired" : action === "renew" ? "renewed" : "terminated", document });
        }
        if (request.method === "POST") {
          const candidate = { ...request.body, tenant_id: request.context?.tenant_id };
          const verification = await sourceAdapter.verify({ tenant_id: candidate.tenant_id, source_ref: candidate.source_ref });
          const document = store.create(mergeHrxDocumentSourceVerification(candidate, verification));
          await appendAudit(request, { action: "hrx.document.metadata.create", document, reason: "hrx_document_metadata_created" });
          return response(201, { outcome: "created", document });
        }
        if (request.method === "GET") {
          const document = store.get({ tenant_id: request.context?.tenant_id, document_id: request.params?.document_id });
          if (!document) return response(404, { outcome: "not_found" });
          return response(200, { outcome: "ok", document });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: error.safe_error_code ?? "HRX_DOCUMENT_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
