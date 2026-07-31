import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DRILL_RECEIPTS,
  validateClientOperationsRunbook,
} from "../validate-client-operations-runbook.mjs";

function receiptEntries() {
  return DRILL_RECEIPTS.map((descriptor) => ({
    descriptor,
    value: JSON.parse(readFileSync(descriptor.path, "utf8")),
  }));
}

test("CL-P6-W02-T02 runbook contract covers all four synthetic drills", () => {
  const result = validateClientOperationsRunbook();
  assert.equal(result.verdict, "BLOCKED_EXTERNAL", result.errors.join("\n"));
  assert.equal(result.contract_verdict, "PASS", result.errors.join("\n"));
  assert.equal(result.gate_status, "BLOCKED_EXTERNAL");
  assert.equal(result.complete, false);
  assert.deepEqual(result.external_evidence, {
    required: ["CL-P6-W02-T02-GRAPH-OUTAGE"],
    missing: ["CL-P6-W02-T02-GRAPH-OUTAGE"],
  });
  assert.equal(result.verification_level, "runbook-contract");
  assert.equal(result.drill_count, 4);
  assert.deepEqual(result.drill_ids, [
    "CL-P6-W02-T02-BANK-IMPORT",
    "CL-P6-W02-T02-GRAPH-OUTAGE",
    "CL-P6-W02-T02-ENGAGEMENT-REPAIR",
    "CL-P6-W02-T02-DASHBOARD-PARTIAL",
  ]);
  assert.equal(result.local_command_count, 8);
  assert.equal(result.external_command_snippet_count, 3);
});

test("CL-P6-W02-T02 validator fails closed when a required drill section is removed", () => {
  const document = readFileSync("docs/runbooks/client-operations-runbook.md", "utf8");
  const invalid = document.replace("### Do not retry\n\n- `403` tenant/permission failures", "### Retry guidance\n\n- `403` tenant/permission failures");
  const result = validateClientOperationsRunbook({ markdown: invalid });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("bank-import: missing ### Do not retry")));
});

test("CL-P6-W02-T02 validator fails closed if Graph external execution is marked complete", () => {
  const entries = receiptEntries();
  entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-GRAPH-OUTAGE").value.external_execution_blocked = false;
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("graph-email-calendar-outage.json: external execution boundary mismatch")));
  assert.ok(result.errors.some((error) => error.includes("Graph receipt must remain externally blocked")));
});

test("CL-P6-W02-T02 validator rejects not-executed and self-claimed evidence", () => {
  for (const command of ["not executed", "self-claimed pass"]) {
    const entries = receiptEntries();
    const bank = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT").value;
    bank.execution_records[0].command = command;
    const result = validateClientOperationsRunbook({ receipts: entries });
    assert.equal(result.verdict, "FAIL", `${command}: ${result.errors.join("\n")}`);
    assert.ok(result.errors.some((error) => error.includes("self-attestation text")));
  }
});

test("CL-P6-W02-T02 validator rejects missing execution fields and failed rollback verification", () => {
  const entries = receiptEntries();
  const bank = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT").value;
  bank.execution_records[0].command = "";
  bank.execution_records[0].exit_code = 1;
  delete bank.execution_records[0].observation;
  bank.execution_records[0].started_at = null;
  bank.rollback_verification.exit_code = 7;
  bank.rollback_verification.verified = false;
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("execution_records[0].command is required")));
  assert.ok(result.errors.some((error) => error.includes("execution_records[0].exit_code must be 0")));
  assert.ok(result.errors.some((error) => error.includes("execution_records[0].started_at must be an ISO timestamp")));
  assert.ok(result.errors.some((error) => error.includes("execution_records[0].observation is required")));
  assert.ok(result.errors.some((error) => error.includes("rollback_verification.exit_code must be 0")));
  assert.ok(result.errors.some((error) => error.includes("rollback_verification.verified must be true")));
});

test("CL-P6-W02-T02 validator rejects self-references and tampered output hashes", () => {
  const entries = receiptEntries();
  const bankEntry = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT");
  const bank = bankEntry.value;
  bank.execution_records[0].stdout_artifact = bankEntry.descriptor.path;
  bank.execution_records[0].stdout_sha256 = "0".repeat(64);
  bank.execution_records[0].source_sha256 = "f".repeat(64);
  bank.evidence[0].artifact = bankEntry.descriptor.path;
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("stdout_artifact self-references receipt")));
  assert.ok(result.errors.some((error) => error.includes("execution_records[0].source_sha256 mismatch")));
  assert.ok(result.errors.some((error) => error.includes("evidence[0] self-references receipt")));
});

test("CL-P6-W02-T02 validator rejects a zero-test or empty-output claim", () => {
  const entries = receiptEntries();
  const bank = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT").value;
  bank.execution_records[0].observation = {
    exit_code: 0,
    stdout_bytes: 0,
    stdout_nonempty: false,
    tap_summary: { tests: 0, pass: 0, fail: 0 },
  };
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("observation.stdout_nonempty must be true")));
  assert.ok(result.errors.some((error) => error.includes("observation.tap_summary.tests must be positive")));
});

test("CL-P6-W02-T02 validator binds observations to captured output bytes and hashes", () => {
  const entries = receiptEntries();
  const bank = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT").value;
  bank.execution_records[0].observation.stdout_bytes += 1;
  bank.execution_records[0].observation.stdout_sha256 = "0".repeat(64);
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("observation.stdout_sha256 mismatch")));
  assert.ok(result.errors.some((error) => error.includes("observation.stdout_bytes mismatch")));
});

test("CL-P6-W02-T02 validator recursively rejects PII, secret keys, and absolute paths", () => {
  const entries = receiptEntries();
  const bank = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-BANK-IMPORT").value;
  bank.safe_user_state.nested = {
    senderEmail: "redacted@example.test",
    nestedPath: "/Users/jws/.ssh/id_ed25519",
  };
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("nested.senderEmail: denied sensitive key")));
  assert.ok(result.errors.some((error) => error.includes("nested.nestedPath: denied absolute/secret path value")));
});

test("CL-P6-W02-T02 validator does not accept a self-claimed external pass", () => {
  const entries = receiptEntries();
  const graph = entries.find(({ descriptor }) => descriptor.id === "CL-P6-W02-T02-GRAPH-OUTAGE").value;
  graph.external_receipt = {
    status: "PASS",
    kind: "SELF_CLAIMED",
    command: "not executed",
    exit_code: 0,
    captured_at: "not-a-timestamp",
    verified_by: "self-claimed pass",
    artifact: graph.execution_records[0].stdout_artifact,
    sha256: "0".repeat(64),
  };
  const result = validateClientOperationsRunbook({ receipts: entries });
  assert.equal(result.verdict, "FAIL");
  assert.ok(result.errors.some((error) => error.includes("external_receipt.kind must be EXTERNAL_EXECUTION")));
  assert.ok(result.errors.some((error) => error.includes("external_receipt contains self-attestation text")));
  assert.ok(result.errors.some((error) => error.includes("external_receipt.artifact must be independent")));
});
