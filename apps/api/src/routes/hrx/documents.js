import { randomUUID } from "node:crypto";
import { createInMemoryHrxDocumentStore } from "../../../../../packages/hrx/src/documents.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

export function createHrxDocumentsRoute({ store = createInMemoryHrxDocumentStore(), audit } = {}) {
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method === "POST") {
          const document = store.create({ ...request.body, tenant_id: request.context?.tenant_id });
          await audit?.append?.({
            event_id: `hrx_doc_evt_${randomUUID()}`,
            tenant_id: request.context.tenant_id,
            actor_id: request.context.actor_id,
            action: "hrx.document.metadata.create",
            object_type: "HRDocument",
            object_id: document.document_id,
            decision: "allow",
            reason: "hrx_document_metadata_created",
          });
          return response(201, { outcome: "created", document });
        }
        if (request.method === "GET") {
          const document = store.get({ tenant_id: request.context?.tenant_id, document_id: request.params?.document_id });
          if (!document) return response(404, { outcome: "not_found" });
          return response(200, { outcome: "ok", document });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_DOCUMENT_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
