import assert from "node:assert/strict";
import test from "node:test";
import { createEmailFilingCorrectionRepository } from "../src/email-filing-correction-repository.js";
import { createEmailFilingOriginalResolver } from "../src/email-filing-original-resolver.js";
import { createEmailFilingCorrectionService } from "../src/email-filing-correction-service.js";
import {
  DOCUMENT_ID,
  FILE_OBJECT_ID,
  MATTER_C,
  MIME_SHA256,
  RECEIPT_ID,
  SESSION,
  TENANT_ID,
  THREAD_ID,
  VERSION_ID,
  correctionInput,
  createOriginalFilingRepository,
  originalFiling,
  serviceDependencies,
} from "./helpers/email-filing-correction-fixture.js";

test("OUTM-20 resolves immutable original identity only from persisted DMS records", async () => {
  // Given: a filed DMS thread linked to one MIME document, version, file object, and audit receipt.
  const dmsRepository = createOriginalFilingRepository();
  const resolver = createEmailFilingOriginalResolver({ repository: dmsRepository });

  // When: the original filing is resolved by canonical tenant and thread identity.
  const resolved = await resolver.resolve({ tenant_id: TENANT_ID, email_thread_id: THREAD_ID });

  // Then: every immutable field is derived from persisted records.
  assert.deepEqual(resolved, originalFiling());
});

test("OUTM-21 binds original MIME metadata only through specialized DMS authority", async () => {
  const canonical = createOriginalFilingRepository();
  const threadRepository = {
    get(ref) {
      assert.equal(ref.model_type, "DmsEmailThread");
      return canonical.get(ref);
    },
    getIdempotency: canonical.getIdempotency,
    listAudit: canonical.listAudit,
  };
  let specializedReads = 0;
  const documentStateReader = {
    async getDocumentState({ tenant_id, document_id }) {
      specializedReads += 1;
      assert.deepEqual([tenant_id, document_id], [TENANT_ID, DOCUMENT_ID]);
      return {
        document: {
          tenant_id: TENANT_ID,
          matter_id: originalFiling().matter_id,
          document_id: DOCUMENT_ID,
          status: "active",
          current_version_id: VERSION_ID,
        },
        versions: [{
          tenant_id: TENANT_ID,
          version_id: VERSION_ID,
          document_id: DOCUMENT_ID,
          version_number: 1,
          file_object_id: FILE_OBJECT_ID,
          sha256: MIME_SHA256,
          created_by: originalFiling().actor_id,
          created_at: originalFiling().occurred_at,
        }],
        file_objects: [{
          tenant_id: TENANT_ID,
          file_object_id: FILE_OBJECT_ID,
          sha256: MIME_SHA256,
          content_type: "message/rfc822",
          status: "committed",
        }],
      };
    },
  };
  const resolver = createEmailFilingOriginalResolver({
    repository: threadRepository,
    document_state_reader: documentStateReader,
  });

  const resolved = await resolver.resolve({
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
  });

  assert.deepEqual(resolved, originalFiling());
  assert.equal(specializedReads, 1);
  assert.deepEqual(resolver.getDocumentBinding({
    ...resolved,
    source_matter_id: resolved.matter_id,
  }), {
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
    original_receipt_id: RECEIPT_ID,
    original_matter_id: originalFiling().matter_id,
    document_id: DOCUMENT_ID,
    document_version_id: VERSION_ID,
    file_object_id: FILE_OBJECT_ID,
    mime_sha256: MIME_SHA256,
  });
});

test("OUTM-21 rejects a filing receipt that no longer binds the canonical document", async () => {
  const repository = createOriginalFilingRepository();
  const idempotencyKey = `outlook-email-file:${THREAD_ID}:${MIME_SHA256}:dms`;
  const receipt = repository.getIdempotency({
    tenant_id: TENANT_ID,
    idempotency_key: idempotencyKey,
  });
  repository.recordIdempotency({
    ...receipt,
    response: { ...receipt.response, filed_document_ids: ["document:wrong"] },
  });

  await assert.rejects(
    createEmailFilingOriginalResolver({ repository }).resolve({
      tenant_id: TENANT_ID,
      email_thread_id: THREAD_ID,
    }),
    (error) => error?.code === "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
  );
});

test("OUTM-20 rejects mutually consistent forged original claims with zero correction writes", async () => {
  // Given: a real persisted filing and a request whose nested and top-level forged claims agree.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  const service = createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: createEmailFilingOriginalResolver({ repository: dmsRepository }),
    ...serviceDependencies(),
  });
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  const forged = {
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
    document_id: "doc:forged-original-mime",
    mime_sha256: "b".repeat(64),
    original_receipt_id: "receipt-forged",
    matter_id: MATTER_C,
    actor_id: "user-forged-original-filer",
    occurred_at: "2026-08-08T00:00:00.000Z",
  };

  // When: the attacker submits the same forged values in both request representations.
  const command = correctionInput({
    original_filing: forged,
    document_id: forged.document_id,
    mime_sha256: forged.mime_sha256,
    original_receipt_id: forged.original_receipt_id,
    original_actor_id: forged.actor_id,
    prior_placement_id: prior.placement_id,
  });

  // Then: persisted authority wins and no origin, correction, or audit is appended.
  await assert.rejects(
    service.correct(command),
    (error) => error?.code === "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
  );
  assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
});
