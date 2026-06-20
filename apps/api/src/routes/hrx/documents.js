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
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method === "POST") {
          const candidate = { ...request.body, tenant_id: request.context?.tenant_id };
          const verification = await sourceAdapter.verify({ tenant_id: candidate.tenant_id, source_ref: candidate.source_ref });
          const document = store.create(mergeHrxDocumentSourceVerification(candidate, verification));
          await audit?.append?.({
            event_id: `hrx_doc_evt_${randomUUID()}`,
            tenant_id: request.context.tenant_id,
            actor_id: request.context.actor_id,
            action: "hrx.document.metadata.create",
            object_type: "HRDocument",
            object_id: document.document_id,
            decision: "allow",
            reason: "hrx_document_metadata_created",
            metadata: {
              source_ref: document.source_ref,
              source_provider: document.source_provider,
              source_status: document.source_status,
              source_version_ref: document.source_version_ref,
            },
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
        return response(400, { outcome: "blocked", safe_error_code: error.safe_error_code ?? "HRX_DOCUMENT_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
