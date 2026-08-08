import { randomUUID } from "node:crypto";
import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import { completeDocusignArtifacts, createDocusignWebhookReceiptStore } from "./docusign-completion-artifacts.js";
import {
  DOCUSIGN_CONNECT_SIGNATURE_HEADER,
  DOCUSIGN_MIN_POLL_INTERVAL_MS,
  docusignHeader,
  docusignRawBytes,
  docusignSha256,
  parseDocusignConnectEvent,
  projectDocusignProviderEvent,
  verifyDocusignConnectHmac,
} from "./docusign-event-model.js";
import {
  docusignAccountBindingRef,
  docusignFailure,
  docusignInfrastructureFailure,
  docusignNow,
  docusignRequiredText,
  docusignTimestamp,
  projectDocusignRequestSafe,
} from "./docusign-envelope-model.js";
import { requireDocusignRepository } from "./docusign-envelope-repository.js";

export { DOCUSIGN_CONNECT_SIGNATURE_HEADER, DOCUSIGN_MIN_POLL_INTERVAL_MS, verifyDocusignConnectHmac } from "./docusign-event-model.js";
export { createDocusignWebhookReceiptStore } from "./docusign-completion-artifacts.js";

const POLL_LEASE_MS = 2 * 60 * 1000;
const STABLE_POLL_STATES = new Set(["completed", "declined", "voided", "provider_blocked"]);

function indexOf(state, tenantId, requestId) {
  return state.requests.findIndex((request) => request.tenant_id === tenantId && request.request_id === requestId);
}

function dependencyFailure(error, code) {
  if ([400, 401, 403, 404, 409, 503].includes(error?.status)) return error;
  return docusignInfrastructureFailure(code);
}

function webhookRejected() {
  return docusignFailure("DOCUSIGN_WEBHOOK_REJECTED", "DocuSign webhook was rejected", 401);
}

function assertWebhookBinding(event, located, current = located) {
  const expected = [
    [located?.tenant_id, current?.tenant_id],
    [located?.request_id, current?.request_id],
    [located?.envelope_id, event?.envelope_id],
    [current?.envelope_id, event?.envelope_id],
    [located?.connection_id, current?.connection_id],
    [located?.account_binding_ref, current?.account_binding_ref],
  ];
  if (expected.some(([left, right]) => typeof left !== "string" || left === "" || left !== right)) throw webhookRejected();
  for (const field of ["provider_envelope_id", "account_id"]) {
    if (located?.[field] != null && located[field] !== (field === "account_id" ? event.account_id : event.envelope_id)) throw webhookRejected();
  }
}

async function readWebhookRequest(repository, located) {
  if (typeof repository.readState !== "function" && typeof repository.loadState !== "function") return undefined;
  try {
    const state = typeof repository.readState === "function"
      ? await repository.readState({ tenant_id: located.tenant_id })
      : typeof repository.loadState === "function" ? repository.loadState() : null;
    return state?.requests?.find((request) => request.tenant_id === located.tenant_id && request.request_id === located.request_id) ?? null;
  } catch (error) {
    throw dependencyFailure(error, "DOCUSIGN_REPOSITORY_UNAVAILABLE");
  }
}

async function boundConnection(request, connectionResolver, webhook = false) {
  let connection;
  try { connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: request.tenant_id, connection_id: request.connection_id })); }
  catch (error) { throw dependencyFailure(error, "DOCUSIGN_CONNECTION_UNAVAILABLE"); }
  if (connection.tenant_id !== request.tenant_id || connection.connection_id !== request.connection_id || docusignAccountBindingRef(connection) !== request.account_binding_ref) {
    throw docusignFailure(webhook ? "DOCUSIGN_WEBHOOK_REJECTED" : "DOCUSIGN_ACCOUNT_BINDING_CHANGED", "DocuSign account binding changed", webhook ? 401 : 403);
  }
  return connection;
}

async function locateWebhookRequest(repository, resolver, event) {
  if (typeof resolver === "function") return resolver({ account_id: event.account_id, envelope_id: event.envelope_id });
  if (typeof repository.loadState === "function") return repository.loadState().requests.find((request) => request.envelope_id === event.envelope_id) ?? null;
  throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_LOCATOR_UNAVAILABLE");
}

async function updateRequest(repository, tenantId, requestId, mutate) {
  return repository.transact({ tenant_id: tenantId }, (state) => {
    const index = indexOf(state, tenantId, requestId);
    if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
    state.requests[index] = mutate(state.requests[index]);
    return state.requests[index];
  });
}

export function createDocusignEnvelopeEventService({
  repository, connectionResolver, webhookRequestResolver, resolveSecret, adapter, approvedDocumentResolver,
  receiptStore, artifactStore, clock = () => new Date(),
} = {}) {
  requireDocusignRepository(repository);
  if (typeof connectionResolver !== "function") throw new TypeError("connectionResolver is required");
  if (typeof approvedDocumentResolver !== "function") throw new TypeError("approvedDocumentResolver is required");
  if (typeof resolveSecret !== "function") throw new TypeError("resolveSecret is required");
  if (!adapter || typeof adapter.getStatus !== "function" || typeof adapter.downloadDocument !== "function") throw new TypeError("DocuSign status adapter is required");
  if (!receiptStore || typeof receiptStore.put !== "function") throw new TypeError("protected receiptStore is required");
  if (!artifactStore || typeof artifactStore.ingest !== "function") throw new TypeError("immutable artifactStore is required");

  return Object.freeze({
    async processWebhook({ headers = {}, raw_body } = {}) {
      const bytes = docusignRawBytes(raw_body);
      const event = parseDocusignConnectEvent(bytes);
      let located;
      try { located = await locateWebhookRequest(repository, webhookRequestResolver, event); }
      catch (error) { throw dependencyFailure(error, "DOCUSIGN_REPOSITORY_UNAVAILABLE"); }
      if (!located) throw webhookRejected();
      const stored = await readWebhookRequest(repository, located);
      if (stored !== undefined) {
        if (!stored) throw webhookRejected();
        assertWebhookBinding(event, located, stored);
      }
      const connection = await boundConnection(located, connectionResolver, true);
      if (connection.account_id !== event.account_id || (located.account_id != null && located.account_id !== connection.account_id) || !connection.hmac_secret_ref) throw webhookRejected();
      let secret;
      try { secret = await resolveSecret({ tenant_id: located.tenant_id, ref: connection.hmac_secret_ref, purpose: "docusign_connect_hmac" }); }
      catch { throw docusignInfrastructureFailure("DOCUSIGN_SECRET_UNAVAILABLE"); }
      try {
        verifyDocusignConnectHmac({ raw_body: bytes, signature: docusignHeader(headers, DOCUSIGN_CONNECT_SIGNATURE_HEADER), secret });
      } catch (error) {
        if (error?.status === 401) throw error;
        throw docusignInfrastructureFailure("DOCUSIGN_SECRET_UNAVAILABLE");
      }
      const receiptHash = docusignSha256(bytes);
      let receipt;
      try { receipt = await receiptStore.put({ tenant_id: located.tenant_id, request_id: located.request_id, envelope_id: located.envelope_id, bytes, sha256: receiptHash }); }
      catch (error) { throw dependencyFailure(error, "DOCUSIGN_WEBHOOK_RECEIPT_STORAGE_UNAVAILABLE"); }
      if (receipt?.immutable !== true || receipt?.sha256 !== receiptHash) throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_RECEIPT_NOT_IMMUTABLE");
      const projected = await repository.transact({ tenant_id: located.tenant_id }, (state) => {
        const index = indexOf(state, located.tenant_id, located.request_id);
        if (index < 0) throw webhookRejected();
        const current = state.requests[index];
        assertWebhookBinding(event, located, current);
        const duplicate = current.event_hashes.includes(event.event_hash);
        const transition = duplicate ? { request: current, changed: false, accepted: false } : projectDocusignProviderEvent(current, event, docusignNow(clock));
        state.requests[index] = { ...transition.request, event_hashes: duplicate ? current.event_hashes : [...current.event_hashes, event.event_hash] };
        if (!state.webhook_receipts.some((item) => item.receipt_hash === receiptHash)) state.webhook_receipts.push({ receipt_hash: receiptHash, receipt_ref: docusignRequiredText(receipt.receipt_ref, "receipt_ref"), event_hash: event.event_hash, request_id: current.request_id, tenant_id: current.tenant_id, provider_status: event.status, occurred_at: event.occurred_at });
        return { duplicate, transition, request: state.requests[index] };
      });
      if (event.status === "completed" && projected.request.state === "completed_artifacts_pending") return completeDocusignArtifacts({ repository, request: projected.request, connection, adapter, artifactStore, approvedDocumentResolver, clock });
      return Object.freeze({ outcome: projected.duplicate ? "replayed" : projected.transition.changed ? "processed" : "ignored", request: projectDocusignRequestSafe(projected.request) });
    },

    async pollRequest({ principal = {}, request_id } = {}) {
      const tenantId = docusignRequiredText(principal.tenant_id, "principal.tenant_id");
      docusignRequiredText(principal.actor_id ?? principal.user_id, "principal.actor_id");
      const requestId = docusignRequiredText(request_id, "request_id");
      const now = docusignNow(clock);
      const token = randomUUID();
      const claim = await repository.transact({ tenant_id: tenantId }, (state) => {
        const index = indexOf(state, tenantId, requestId);
        if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
        const request = state.requests[index];
        if (!request.envelope_id) throw docusignFailure("DOCUSIGN_ENVELOPE_NOT_ASSIGNED", "DocuSign envelope is not assigned", 409);
        if (STABLE_POLL_STATES.has(request.state)) return { outcome: "stable", request };
        if (request.state === "completed_artifacts_pending") return { outcome: "artifacts", request };
        const nextPoll = request.last_poll_at ? Date.parse(request.last_poll_at) + DOCUSIGN_MIN_POLL_INTERVAL_MS : 0;
        if (Date.parse(now) < nextPoll || (request.operation_lease && Date.parse(request.operation_lease.expires_at) > Date.parse(now))) return { outcome: "deferred", next_poll_at: new Date(Math.max(nextPoll, Date.parse(request.operation_lease?.expires_at ?? 0))).toISOString(), request };
        state.requests[index] = { ...request, last_poll_at: now, operation_lease: { kind: "poll", token, acquired_at: now, expires_at: new Date(Date.parse(now) + POLL_LEASE_MS).toISOString() }, updated_at: now };
        return { outcome: "claimed", token, request: state.requests[index] };
      });
      if (claim.outcome === "stable" || claim.outcome === "deferred") return Object.freeze({ outcome: claim.outcome, ...(claim.next_poll_at ? { next_poll_at: claim.next_poll_at } : {}), request: projectDocusignRequestSafe(claim.request) });
      const connection = await boundConnection(claim.request, connectionResolver);
      if (claim.outcome === "artifacts") return completeDocusignArtifacts({ repository, request: claim.request, connection, adapter, artifactStore, approvedDocumentResolver, clock });
      let provider;
      try { provider = await adapter.getStatus({ connection, envelope_id: claim.request.envelope_id }); }
      catch {
        await updateRequest(repository, tenantId, requestId, (fresh) => fresh.operation_lease?.token === token ? { ...fresh, operation_lease: null, last_safe_error_code: "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE", updated_at: docusignNow(clock) } : fresh);
        throw docusignInfrastructureFailure("DOCUSIGN_POLL_PROVIDER_UNAVAILABLE");
      }
      let event;
      try {
        const sequence = provider?.sequence == null ? null : Number(provider.sequence);
        if (sequence != null && (!Number.isSafeInteger(sequence) || sequence < 0)) throw new TypeError("provider sequence is invalid");
        event = { status: docusignRequiredText(provider?.status, "provider status").toLowerCase(), occurred_at: provider?.occurred_at ? docusignTimestamp(provider.occurred_at, "provider occurred_at") : now, sequence };
      } catch {
        await updateRequest(repository, tenantId, requestId, (fresh) => fresh.operation_lease?.token === token ? { ...fresh, operation_lease: null, last_safe_error_code: "DOCUSIGN_POLL_PROVIDER_UNAVAILABLE", updated_at: docusignNow(clock) } : fresh);
        throw docusignInfrastructureFailure("DOCUSIGN_POLL_PROVIDER_UNAVAILABLE");
      }
      const request = await updateRequest(repository, tenantId, requestId, (fresh) => {
        if (fresh.operation_lease?.token !== token) return fresh;
        const transition = projectDocusignProviderEvent(fresh, event, docusignNow(clock));
        return { ...transition.request, operation_lease: null };
      });
      if (request.state === "completed_artifacts_pending") return completeDocusignArtifacts({ repository, request, connection, adapter, artifactStore, approvedDocumentResolver, clock });
      return Object.freeze({ outcome: "processed", request: projectDocusignRequestSafe(request) });
    },
  });
}
