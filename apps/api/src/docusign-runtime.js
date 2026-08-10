import {
  createApprovedMatterBuilderSourceResolver,
  createDocusignEnvelopeEventService,
  createDocusignEnvelopeRepository,
  createDocusignEnvelopeService,
} from "../../../packages/integrations-core/src/index.js";

function unavailable(code) {
  return async () => { throw Object.assign(new Error("DocuSign runtime dependency is unavailable"), { safe_error_code: code, status: 503, retryable: true }); };
}

export function createDocusignRuntime({
  repository = createDocusignEnvelopeRepository(),
  approvedDocumentResolver = createApprovedMatterBuilderSourceResolver(),
  connectionResolver = unavailable("DOCUSIGN_CONNECTION_UNAVAILABLE"),
  artifactReader = unavailable("DOCUSIGN_ARTIFACT_STORAGE_UNAVAILABLE"),
  recipientResolver = unavailable("DOCUSIGN_RECIPIENT_DIRECTORY_UNAVAILABLE"),
  webhookRequestResolver,
  resolveSecret = unavailable("DOCUSIGN_SECRET_UNAVAILABLE"),
  adapter,
  receiptStore,
  artifactStore,
  authorizeMatter = async () => false,
  clock,
  authorityState = "blocked",
} = {}) {
  const provider = adapter ?? Object.freeze({
    createDraft: unavailable("DOCUSIGN_PROVIDER_UNAVAILABLE"),
    send: unavailable("DOCUSIGN_PROVIDER_UNAVAILABLE"),
    getStatus: unavailable("DOCUSIGN_PROVIDER_UNAVAILABLE"),
    downloadDocument: unavailable("DOCUSIGN_PROVIDER_UNAVAILABLE"),
  });
  const protectedReceipts = receiptStore ?? Object.freeze({ put: unavailable("DOCUSIGN_WEBHOOK_RECEIPT_STORAGE_UNAVAILABLE") });
  const immutableArtifacts = artifactStore ?? Object.freeze({ ingest: unavailable("DOCUSIGN_ARTIFACT_STORAGE_UNAVAILABLE") });
  const envelopeService = createDocusignEnvelopeService({ repository, approvedDocumentResolver, connectionResolver, artifactReader, recipientResolver, adapter: provider, clock });
  const eventService = createDocusignEnvelopeEventService({ repository, connectionResolver, webhookRequestResolver, approvedDocumentResolver, resolveSecret, adapter: provider, receiptStore: protectedReceipts, artifactStore: immutableArtifacts, clock });
  const readiness = () => Object.freeze({
    status: authorityState === "ready" ? "ready" : "blocked",
    authority_state: authorityState,
    repository_authority: repository.authority ?? (repository.durable ? "durable-file" : "memory"),
    worker_injected: true,
    production_ready_claim: false,
  });
  return Object.freeze({
    repository,
    envelope_service: envelopeService,
    event_service: eventService,
    authorizeMatter,
    readiness,
    worker: Object.freeze({
      pollRequest(input) { return eventService.pollRequest(input); },
      readiness,
    }),
  });
}

export function createDocusignFailClosedRuntime(options = {}) {
  return createDocusignRuntime({ ...options, authorityState: "blocked" });
}
