import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  assertNoPrivateEvidence,
  assertOpaqueReceipt,
  collectPrivateValues,
  sanitizeHttpReceiptRows,
} from "./rf12-evidence-sanitize.mjs";

const RECEIPT_NAME = "rf12-sanitized-http-receipt.json";
const STATE_NAME = "rf12-observed-state.json";
const MANIFEST_NAME = "rf12-evidence-manifest.json";

export const RF12_PRE_SPLIT_BINDING = Object.freeze({
  exact_edit_boundary_content_preserved: false,
  directly_observed_pre_split_loc: 1642,
  direct_loc_capture_artifact_preserved: false,
  selected_historical_binding: {
    bytes: 72247,
    sha256: "6af4af529bae605bd4d6c7da5e00e0a4f7e4745145a919cba274fa2f3847f498",
    relation: "latest stable same-path binding found in both raw manifests before the split; not claimed as an exact edit-boundary capture",
    provenance: [
      ".omo/evidence/root-final-current-regression-20260731/root-test-pre-manifest.tsv",
      ".omo/evidence/root-final-current-regression-20260731/root-test-post-manifest.pre-untracked-fix.tsv"
    ]
  },
  earlier_historical_bindings: [
    { bytes: 72189, sha256: "2548ded11381616c43e81adc76a8fe9c8f034f807783b5596c3eb6523ac9524d" },
    { bytes: 72339, sha256: "2ed9e9bfca65c3cdb61d9ac9783d3074ebf9833498984ffc53a8ea5a65f2ec04" }
  ],
  limitation: "Historical manifests preserve hashes and sizes, but no pre-split source bytes or reconstructible patch was retained. Equivalence is behavioral, not byte-for-byte."
});

const acceptanceMapping = Object.freeze([
  { criterion: "people10", field: "people_count", expected: 10, authority: "scenario assertion plus restarted repository" },
  { criterion: "duplicate0", field: "duplicate_matter_task_count", expected: 0, authority: "scenario assertion plus restarted repository" },
  { criterion: "AR0", field: "final_ar_balance", expected: 0, authority: "scenario assertion plus post-restart DOM" },
  { criterion: "closed", field: "final_matter_status", expected: "closed", authority: "scenario assertion plus restarted repository" },
  { criterion: "unexpected0", field: "unexpected_error_count", expected: 0, authority: "scenario receipt and browser error assertions" }
]);

function duplicateTaskCount(records) {
  const tasks = records.filter((record) => record.model_type === "MatterTask");
  return tasks.length - new Set(tasks.map((task) => task.task_id)).size;
}

function observedState(observations, rawRows) {
  const matterRecords = observations.matterRecords;
  const matter = matterRecords.find((record) =>
    record.model_type === "Matter" && record.matter_id === observations.targetMatterId);
  assert.ok(matter, "RF12 evidence requires the observed target Matter");
  assert.ok(Number.isFinite(observations.finalArBalance), "RF12 evidence requires a measured AR balance");
  assert.deepEqual(observations.cleanup, {
    api_server_stopped: true,
    vite_server_stopped: true,
    browser_disconnected: true,
    state_dir_removed: true,
  });
  const primaryRows = observations.primaryHttpRows;
  const handlerRows = rawRows.filter((row) => row.browser_delivery !== "failed");
  const unexpectedErrorCount = observations.unexpectedTransportErrors.length
    + observations.unexpectedConsoleErrors.length
    + observations.pageErrors.length
    + observations.externalBrowserRequests.length
    + handlerRows.filter((row) => Number.isInteger(row.status) && (row.status < 200 || row.status >= 300)).length;
  return {
    schema_version: "rf12-observed-state-v2",
    observables: {
      visible_login_post_count: rawRows.filter((row) => row.method === "POST" && row.path === "/api/auth/login").length,
      primary_login_post_count: primaryRows.filter((row) => row.method === "POST" && row.path === "/api/auth/login").length,
      expected_transport_error_count: observations.expectedTransportErrors.length,
      unexpected_transport_error_count: observations.unexpectedTransportErrors.length,
      expected_console_error_count: observations.expectedConsoleErrors.length,
      unexpected_console_error_count: observations.unexpectedConsoleErrors.length,
      external_browser_request_count: observations.externalBrowserRequests.length,
      page_error_count: observations.pageErrors.length,
      owner_option_count_before_restart: observations.ownerOptionIdsBefore.length,
      owner_option_count_after_restart: observations.ownerOptionIdsAfter.length,
      task_http_attempt_count: observations.taskCreateAttempts.length,
      payment_mutation_with_canonical_reread_count: observations.paymentMutationRows.length,
      wip_generate_http_count: observations.wipGenerateRows.length,
      prebill_reject_validation_http_count: handlerRows.filter((row) =>
        row.method === "POST" && row.path === "/api/finance/prebills/reject").length,
      final_ar_balance: observations.finalArBalance,
      people_count: matterRecords.filter((record) => record.model_type === "Person").length,
      matter_count: matterRecords.filter((record) => record.model_type === "Matter").length,
      task_count: matterRecords.filter((record) => record.model_type === "MatterTask").length,
      duplicate_matter_task_count: duplicateTaskCount(matterRecords),
      final_matter_status: matter.status,
      unexpected_error_count: unexpectedErrorCount,
      cleanup: observations.cleanup,
    },
  };
}

async function metadata(path, name, { source = false } = {}) {
  const bytes = await readFile(path);
  const result = {
    name,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  if (source) result.loc = bytes.toString("utf8").split("\n").length - (bytes.at(-1) === 10 ? 1 : 0);
  return result;
}

function manifestFor({ receipt, state, sources, artifacts }) {
  const browserRows = receipt.requests.filter((row) => row.observation_kind === "browser");
  const handlerRows = receipt.requests.filter((row) =>
    row.browser_delivery === "received" || row.observation_kind === "handler_dropped");
  const transportFailureCount = browserRows.filter((row) => row.browser_delivery === "failed").length;
  const binary = {
    browser_request_count: browserRows.length,
    handler_response_count: handlerRows.length,
    browser_transport_failure_count: transportFailureCount,
    http_mutation_count: handlerRows.filter((row) => row.method !== "GET").length,
    handler_response_dropped_before_browser_delivery_count: receipt.requests.filter((row) =>
      row.observation_kind === "handler_dropped").length,
    handler_non_2xx_count: handlerRows.filter((row) =>
      Number.isInteger(row.status) && (row.status < 200 || row.status >= 300)).length,
    ...state.observables,
  };
  assert.equal(
    binary.expected_transport_error_count + binary.unexpected_transport_error_count,
    transportFailureCount,
    "transport classification must account for every failed browser request",
  );
  for (const { criterion, field, expected } of acceptanceMapping) {
    assert.deepEqual(binary[field], expected, `RF12 acceptance ${criterion} requires ${field}`);
  }
  return {
    schema_version: "rf12-evidence-manifest-v2",
    scenario: "product UI to loopback API to durable repository restart",
    pre_split_binding: RF12_PRE_SPLIT_BINDING,
    acceptance_mapping: acceptanceMapping,
    sources,
    artifacts,
    binary_observables: binary,
  };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  assert.ok((await stat(path)).size > 0, `${path} must not be empty`);
}

export async function validateRf12Evidence({ evidenceDir, sourceFiles, privateValues = [] }) {
  const receipt = JSON.parse(await readFile(join(evidenceDir, RECEIPT_NAME), "utf8"));
  const state = JSON.parse(await readFile(join(evidenceDir, STATE_NAME), "utf8"));
  const manifest = JSON.parse(await readFile(join(evidenceDir, MANIFEST_NAME), "utf8"));
  assertOpaqueReceipt(receipt);
  assertNoPrivateEvidence({ receipt, state, manifest }, privateValues);
  const sources = await Promise.all(sourceFiles.map(({ path, name }) => metadata(path, name, { source: true })));
  const artifacts = await Promise.all([
    metadata(join(evidenceDir, RECEIPT_NAME), RECEIPT_NAME),
    metadata(join(evidenceDir, STATE_NAME), STATE_NAME),
  ]);
  assert.deepEqual(manifest, manifestFor({ receipt, state, sources, artifacts }));
  return { result: "PASS", binary_observables: manifest.binary_observables };
}

export async function publishRf12Evidence({ evidenceDir, sourceFiles, observations, privateValues = [] }) {
  await mkdir(evidenceDir, { recursive: true });
  const rawRows = [
    ...observations.primaryHttpRows.map((row) => ({ ...row, observation_kind: "browser" })),
    ...observations.secondaryHttpRows.map((row) => ({ ...row, observation_kind: "browser" })),
    ...observations.handlerBackedDroppedResponses.map((row) => ({ ...row, observation_kind: "handler_dropped" })),
  ];
  const receipt = {
    schema_version: "rf12-sanitized-http-receipt-v2",
    requests: sanitizeHttpReceiptRows(rawRows),
  };
  const state = observedState(observations, rawRows);
  const forbidden = [...new Set([...privateValues, ...collectPrivateValues(rawRows, observations.matterRecords)])];
  assertOpaqueReceipt(receipt);
  assertNoPrivateEvidence({ receipt, state }, forbidden);
  await writeJson(join(evidenceDir, RECEIPT_NAME), receipt);
  await writeJson(join(evidenceDir, STATE_NAME), state);
  const sources = await Promise.all(sourceFiles.map(({ path, name }) => metadata(path, name, { source: true })));
  const artifacts = await Promise.all([
    metadata(join(evidenceDir, RECEIPT_NAME), RECEIPT_NAME),
    metadata(join(evidenceDir, STATE_NAME), STATE_NAME),
  ]);
  await writeJson(join(evidenceDir, MANIFEST_NAME), manifestFor({ receipt, state, sources, artifacts }));
  await validateRf12Evidence({ evidenceDir, sourceFiles, privateValues: forbidden });
  return join(evidenceDir, MANIFEST_NAME);
}
