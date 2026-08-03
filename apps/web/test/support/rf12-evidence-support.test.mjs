import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertNoPrivateEvidence,
  assertOpaqueReceipt,
  collectPrivateValues,
  sanitizeHttpReceiptRows,
} from "./rf12-evidence-sanitize.mjs";
import { publishRf12Evidence, validateRf12Evidence } from "./rf12-evidence-support.mjs";
import { RF12_CLOCK } from "./rf12-fixture-support.mjs";

const cleanup = {
  api_server_stopped: true,
  vite_server_stopped: true,
  browser_disconnected: true,
  state_dir_removed: true,
};

function rawReceiptRows() {
  return [{
    sequence: 1,
    method: "POST",
    path: "/api/matter/ops/matters/matter-private-001/handoffs",
    query: { tenant_id: "tenant_private_001", user_id: "user-private-001" },
    status: 200,
    request_body: {
      email: "private@example.test",
      password: "private-password",
      idempotency_key: "private-idempotency-key",
      employee_id: "employee-private-001",
      display_name: "Private Person",
    },
    response_body: {
      session_id: "session-private-001",
      profile_ref: "profile-private-001",
      legal_name: "Private Legal Name",
      local_path: "/Users/private/secret.json",
    },
    browser_delivery: "received",
    observation_kind: "browser",
  }];
}

function observations(overrides = {}) {
  const people = Array.from({ length: 10 }, (_, index) => ({
    model_type: "Person",
    person_id: `person-private-${index}`,
    display_name: `Private Person ${index}`,
  }));
  return {
    primaryHttpRows: rawReceiptRows(),
    secondaryHttpRows: [],
    handlerBackedDroppedResponses: [],
    expectedTransportErrors: [],
    unexpectedTransportErrors: [],
    expectedConsoleErrors: [],
    unexpectedConsoleErrors: [],
    pageErrors: [],
    externalBrowserRequests: [],
    matterRecords: [
      ...people,
      { model_type: "Matter", matter_id: "matter-private-001", status: "closed" },
      { model_type: "MatterTask", task_id: "task-private-001" },
      { model_type: "MatterTask", task_id: "task-private-002" },
    ],
    targetMatterId: "matter-private-001",
    ownerOptionIdsBefore: people.map((person) => person.person_id),
    ownerOptionIdsAfter: people.map((person) => person.person_id),
    taskCreateAttempts: [{}],
    paymentMutationRows: Array.from({ length: 6 }, () => ({})),
    wipGenerateRows: Array.from({ length: 3 }, () => ({})),
    finalArBalance: 0,
    cleanup,
    ...overrides,
  };
}

test("RF12 receipt sanitizer emits hashes without identity, stable IDs, names, or local paths", () => {
  const rows = rawReceiptRows();
  const receipt = {
    schema_version: "rf12-sanitized-http-receipt-v2",
    requests: sanitizeHttpReceiptRows(rows),
  };
  const privateValues = collectPrivateValues(rows);
  assertOpaqueReceipt(receipt);
  assertNoPrivateEvidence(receipt, privateValues);
  const serialized = JSON.stringify(receipt);
  for (const forbidden of [
    "matter-private-001",
    "tenant_private_001",
    "user-private-001",
    "employee-private-001",
    "Private Person",
    "Private Legal Name",
    "/Users/private",
  ]) assert.equal(serialized.includes(forbidden), false);
  assert.throws(() => assertNoPrivateEvidence(rows, privateValues));
});

test("RF12 manifest validator rejects coherent acceptance tampering, failed cleanup, and source drift", async () => {
  const testDir = await mkdtemp(join(tmpdir(), "rf12-evidence-support-"));
  const evidenceDir = join(testDir, "evidence");
  const sourcePath = join(testDir, "scenario.mjs");
  const sourceFiles = [{ name: "test/scenario.mjs", path: sourcePath }];
  await writeFile(sourcePath, "export const scenario = true;\n", "utf8");
  try {
    await publishRf12Evidence({ evidenceDir, sourceFiles, observations: observations() });
    await validateRf12Evidence({ evidenceDir, sourceFiles });

    const manifestPath = join(evidenceDir, "rf12-evidence-manifest.json");
    const manifestText = await readFile(manifestPath, "utf8");
    const fabricated = JSON.parse(manifestText);
    fabricated.binary_observables.people_count = 999;
    await writeFile(manifestPath, `${JSON.stringify(fabricated, null, 2)}\n`, "utf8");
    await assert.rejects(validateRf12Evidence({ evidenceDir, sourceFiles }));

    await writeFile(manifestPath, manifestText, "utf8");
    const statePath = join(evidenceDir, "rf12-observed-state.json");
    const stateText = await readFile(statePath, "utf8");
    const fabricatedState = JSON.parse(stateText);
    fabricatedState.observables.final_ar_balance = 1;
    const fabricatedStateText = `${JSON.stringify(fabricatedState, null, 2)}\n`;
    await writeFile(statePath, fabricatedStateText, "utf8");
    const coherentManifest = JSON.parse(manifestText);
    coherentManifest.binary_observables.final_ar_balance = 1;
    const stateArtifact = coherentManifest.artifacts.find((artifact) =>
      artifact.name === "rf12-observed-state.json");
    assert.ok(stateArtifact);
    stateArtifact.bytes = Buffer.byteLength(fabricatedStateText);
    stateArtifact.sha256 = createHash("sha256").update(fabricatedStateText).digest("hex");
    await writeFile(manifestPath, `${JSON.stringify(coherentManifest, null, 2)}\n`, "utf8");
    await assert.rejects(
      validateRf12Evidence({ evidenceDir, sourceFiles }),
      /RF12 acceptance AR0 requires final_ar_balance/,
    );

    await writeFile(statePath, stateText, "utf8");
    await writeFile(manifestPath, manifestText, "utf8");
    const receiptPath = join(evidenceDir, "rf12-sanitized-http-receipt.json");
    const receiptText = await readFile(receiptPath, "utf8");
    const fabricatedReceipt = JSON.parse(receiptText);
    fabricatedReceipt.requests[0].status = 201;
    await writeFile(receiptPath, `${JSON.stringify(fabricatedReceipt, null, 2)}\n`, "utf8");
    await assert.rejects(validateRf12Evidence({ evidenceDir, sourceFiles }));

    await writeFile(receiptPath, receiptText, "utf8");
    await writeFile(sourcePath, "export const scenario = false;\n", "utf8");
    await assert.rejects(validateRf12Evidence({ evidenceDir, sourceFiles }));

    await assert.rejects(publishRf12Evidence({
      evidenceDir: join(testDir, "failed-cleanup"),
      sourceFiles,
      observations: observations({ cleanup: { ...cleanup, api_server_stopped: false } }),
    }));
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});

test("RF12 browser and session share one deterministic valid-until clock contract", () => {
  assert.equal(RF12_CLOCK.nowIso, "2026-07-31T03:00:00.000Z");
  assert.equal(RF12_CLOCK.expiresAtIso, "2026-07-31T11:00:00.000Z");
  assert.equal(RF12_CLOCK.nowMs + RF12_CLOCK.sessionTtlMs, Date.parse(RF12_CLOCK.expiresAtIso));
});
