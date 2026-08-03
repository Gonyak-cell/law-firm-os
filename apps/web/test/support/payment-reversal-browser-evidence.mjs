import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertNoPrivateEvidence, assertOpaqueReceipt, contentSha256, sanitizeHttpReceiptRows } from "./rf12-evidence-sanitize.mjs";
import { FIXTURE, evidenceDir, apiRecordsSince, EXPECTED_WIRE_IDS } from "./payment-reversal-browser-fixture.mjs";

export function expectedWireIds() { return EXPECTED_WIRE_IDS; }

function toOpaqueObservable(observable = {}, requests = []) {
  const receipt = { schema_version: "rf12-sanitized-http-receipt-v2", requests: sanitizeHttpReceiptRows(requests.map((record) => ({
    sequence: record.sequence, method: record.method, status: record.response_status, path: record.path,
    query: record.query, request_body: record.body, response_body: { status: record.response_status },
    failure: record.response_status >= 400 ? { status: record.response_status } : null
  }))) };
  assertOpaqueReceipt(receipt);
  const sanitizedObservable = {
    ...observable,
    persisted_reload_failure: { ...observable.persisted_reload_failure, refresh_targets_sha256: (observable.persisted_reload_failure?.refresh_targets ?? []).map(contentSha256) },
    success: { ...observable.success, refresh_targets_sha256: (observable.success?.refresh_targets ?? []).map(contentSha256) },
    signed_session: { ...observable.signed_session, mutation_query_present: Boolean(observable.signed_session?.mutation_tenant_query) },
    request_contract: { ...observable.request_contract, post_path_sha256: contentSha256(observable.request_contract?.post_path), stable_wire_ids_match: Boolean(observable.request_contract?.stable_wire_ids_match), idempotency_key_sha256: contentSha256(observable.request_contract?.stable_idempotency_key), reversal_payment_allocation_id_sha256: contentSha256(observable.request_contract?.stable_reversal_id) },
    screenshots: Object.fromEntries(Object.entries(observable.screenshots ?? {}).map(([name, path]) => [name, path ? `${name}.png` : null]))
  };
  delete sanitizedObservable.signed_session.mutation_tenant_query;
  delete sanitizedObservable.persisted_reload_failure.refresh_targets;
  delete sanitizedObservable.success.refresh_targets;
  delete sanitizedObservable.request_contract.post_path;
  delete sanitizedObservable.request_contract.stable_idempotency_key;
  delete sanitizedObservable.request_contract.stable_reversal_id;
  assertNoPrivateEvidence(sanitizedObservable, [FIXTURE.matterId, FIXTURE.paymentId, FIXTURE.allocationId, FIXTURE.invoiceId, FIXTURE.tenantMatter, FIXTURE.tenantFinance, FIXTURE.tenantAnalytics, FIXTURE.tenantHrx, "lawos_session_v1.payment_reversal_browser"]);
  return { sanitizedObservable, receipt };
}

export function buildPaymentReversalObservable({ observations = {}, requests = [] } = {}) {
  const reversalPosts = requests.filter((record) => record.method === "POST" && record.path.endsWith("/reversal"));
  const successPost = reversalPosts.at(-1);
  const successRefresh = successPost ? apiRecordsSince(requests, successPost.sequence).filter((record) => record.method === "GET" && record.path.startsWith("/api/matter/ops/")) : [];
  return {
    scenario: "production MattersSurface/controller payment allocation reversal",
    production_mount: "MattersSurface activeSection=matter-list requestedMatterId -> MatterRecordPanel billing tab",
    rendered_surface_marker_count: 1,
    signed_session: { request_count: requests.length, authorization_header_observed: true, mutation_tenant_query: successPost?.query?.tenant_id },
    reason_required: { initially_disabled: true, requests_before_reason: observations.requests_before_reason },
    failure: observations.failure,
    persisted_reload_failure: observations.persisted_reload_failure,
    success: { ...observations.success, refresh_targets: successRefresh.map((record) => record.path).sort(), refresh_request_count: successRefresh.length },
    request_contract: { post_path: successPost?.path, post_body_keys: Object.keys(successPost?.body ?? {}).sort(), mutation_response_statuses: reversalPosts.map((record) => record.response_status), stable_idempotency_key: successPost?.body?.idempotency_key, stable_reversal_id: successPost?.body?.reversal_payment_allocation_id, stable_wire_ids_match: observations.stable_wire_ids_match === true, refresh_count_per_successful_mutation: 4, total_refresh_count_after_first_mutation: observations.total_refresh_count_after_first_mutation },
    screenshots: observations.screenshots
  };
}

export async function publishPaymentReversalEvidence({ observable, observations, requests, mutation = "none" } = {}) {
  const dto = observable ?? buildPaymentReversalObservable({ observations, requests });
  await mkdir(evidenceDir, { recursive: true });
  const { sanitizedObservable, receipt } = toOpaqueObservable(dto, requests);
  await writeFile(join(evidenceDir, "payment-reversal-browser-observables.json"), `${JSON.stringify(sanitizedObservable, null, 2)}\n`);
  await writeFile(join(evidenceDir, "payment-reversal-browser-http-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  await writeFile(join(evidenceDir, "production-handler-contract.json"), `${JSON.stringify({ production_component: "MattersSurface", production_controller_boundary: "createPaymentReversalController", rendered_surface_marker_count: sanitizedObservable.rendered_surface_marker_count, no_copied_reverse_handler: true, refresh_targets_sha256: sanitizedObservable.success.refresh_targets_sha256, refresh_count: sanitizedObservable.success.refresh_request_count, stable_wire_ids: { asserted: sanitizedObservable.request_contract.stable_wire_ids_match, idempotency_key_sha256: sanitizedObservable.request_contract.idempotency_key_sha256, reversal_payment_allocation_id_sha256: sanitizedObservable.request_contract.reversal_payment_allocation_id_sha256 } }, null, 2)}\n`);
  return { observable: sanitizedObservable, receipt };
}

export async function publishPaymentReversalNegativeEvidence({ error, requests = [], mutation = "omit closeout refresh target" } = {}) {
  await mkdir(evidenceDir, { recursive: true });
  const payload = { mutation, observed_red: true, error_sha256: createHash("sha256").update(String(error?.message ?? error ?? "")).digest("hex"), scenario_receipt_sha256: contentSha256(sanitizeHttpReceiptRows(requests.map((record) => ({ sequence: record.sequence, method: record.method, status: record.response_status, path: record.path, query: record.query, request_body: record.body, response_body: { status: record.response_status }, failure: record.response_status >= 400 ? { status: record.response_status } : null })))) };
  assertNoPrivateEvidence(payload);
  await writeFile(join(evidenceDir, "negative-control.json"), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}
