import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeJson } from "../lib/runtime-safety-approval-contract.mjs";
import {
  JSON_POSTGRES_PROGRAM_RECEIPT_ACTION,
  JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
  JSON_POSTGRES_W12_RECEIPTS,
  JSON_POSTGRES_W13_RECEIPTS,
  jsonPostgresProgramReceiptMetadata,
  sha256JsonPostgresProgramReceipt,
  validateJsonPostgresProgramReceipt,
  validateJsonPostgresProgramReceiptSet,
  verifyJsonPostgresProgramReceipt,
} from "../lib/json-postgres-program-receipt.mjs";

const SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET = "c".repeat(64);
const BINDINGS = "d".repeat(64);

function receipt(kind, predecessors = [], claims = {}, binding = {}) {
  const metadata = jsonPostgresProgramReceiptMetadata(kind);
  return {
    schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
    receipt_id: `receipt-${kind}`,
    receipt_kind: kind,
    phase: metadata.phase,
    environment: metadata.environment,
    profile: metadata.profile,
    signer_key_id: "owner-key-1",
    execution_state: "PASS",
    source_sha: binding.sourceSha ?? SHA,
    source_tree: binding.sourceTree ?? TREE,
    packet_sha256: binding.packetSha256 ?? PACKET,
    bindings_sha256: binding.bindingsSha256 ?? BINDINGS,
    started_at: "2026-07-23T01:00:00.000Z",
    finished_at: "2026-07-23T01:01:00.000Z",
    command: `node scripts/run-json-postgres-program.mjs --phase ${metadata.phase} --mode preflight`,
    exit_code: 0,
    predecessor_receipt_sha256: predecessors,
    result_sha256: "e".repeat(64),
    safe_counts: { reviewed_item_count: 1 },
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      production_contacted: false,
      production_write: false,
      first_production_write_started: false,
      json_authority_disabled: false,
      external_email_sent: false,
      dms_bytes_in_evidence: false,
      release: false,
      go_live: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      ...claims,
    },
  };
}

test("program receipt requires complete safe evidence fields and rejects sensitive count names", () => {
  const value = receipt("source-inventory-adjudication");
  assert.equal(validateJsonPostgresProgramReceipt(value).valid, true);
  const unsafe = structuredClone(value);
  unsafe.safe_counts.password_reset_count = 1;
  assert.throws(() => validateJsonPostgresProgramReceipt(unsafe), /safe_counts key is unsafe/u);
  const missing = structuredClone(value);
  delete missing.started_at;
  assert.throws(() => validateJsonPostgresProgramReceipt(missing), /started_at/u);
  const wrongProfile = structuredClone(value);
  wrongProfile.profile = "production-postgres-v2";
  assert.throws(() => validateJsonPostgresProgramReceipt(wrongProfile), /profile/u);
  const secretCommand = structuredClone(value);
  secretCommand.command = "node migrate.mjs --password never-return";
  assert.throws(() => validateJsonPostgresProgramReceipt(secretCommand), /sensitive material/u);
  for (const command of [
    "node migrate.mjs --database postgresql://operator:never-return@db.internal/lawos",
    "node migrate.mjs --authorization Bearer\tnever-return",
  ]) {
    const unsafeCommand = structuredClone(value);
    unsafeCommand.command = command;
    assert.throws(() => validateJsonPostgresProgramReceipt(unsafeCommand), /sensitive material/u);
  }
  const benignCommand = structuredClone(value);
  benignCommand.command = `node migrate.mjs --policy bearer-check --passwordless true ${"x".repeat(100_000)}`;
  assert.equal(validateJsonPostgresProgramReceipt(benignCommand).valid, true);
});

test("post-go-live relational projection preserves the verified JSON-disabled state", () => {
  const value = receipt("w15-relational-projection", [], {
    production_contacted: true,
    first_production_write_started: true,
    json_authority_disabled: true,
  });
  value.phase = "w15-relational-projection";
  value.environment = "lawos-production-projection";
  assert.equal(
    validateJsonPostgresProgramReceipt(value).claims.json_authority_disabled,
    true,
  );
});

test("W13 receipt set consumes the exact signed W12 terminal across packet and source bindings", () => {
  const prior = {
    sourceSha: "1".repeat(40),
    sourceTree: "2".repeat(40),
    packetSha256: "3".repeat(64),
    bindingsSha256: "4".repeat(64),
  };
  const w12Terminal = receipt("w12-terminal", Array.from(
    { length: JSON_POSTGRES_W12_RECEIPTS.length - 1 },
    (_, index) => index.toString(16).padStart(64, "0"),
  ), {}, prior);
  const w12TerminalSha256 = sha256JsonPostgresProgramReceipt(w12Terminal);
  const receipts = [];
  const cut008 = receipt("cut-008", [w12TerminalSha256]);
  receipts.push(cut008);
  const sourceFreeze = receipt("source-freeze", [
    w12TerminalSha256,
    sha256JsonPostgresProgramReceipt(cut008),
  ]);
  receipts.push(sourceFreeze);
  const firstWrite = receipt("first-write-boundary", [
    sha256JsonPostgresProgramReceipt(sourceFreeze),
  ]);
  receipts.push(firstWrite);
  const cut009 = receipt("cut-009", [
    w12TerminalSha256,
    sha256JsonPostgresProgramReceipt(cut008),
    sha256JsonPostgresProgramReceipt(sourceFreeze),
    sha256JsonPostgresProgramReceipt(firstWrite),
  ], {
    real_data_read: true,
    real_data_mutated: true,
    production_contacted: true,
    production_write: true,
    first_production_write_started: true,
  });
  receipts.push(cut009);
  const cut010 = receipt("cut-010", [
    sha256JsonPostgresProgramReceipt(cut009),
  ], {
    real_data_read: true,
    production_contacted: true,
    first_production_write_started: true,
  });
  receipts.push(cut010);
  const cut011 = receipt("cut-011", [
    sha256JsonPostgresProgramReceipt(cut010),
  ], {
    production_contacted: true,
    first_production_write_started: true,
    json_authority_disabled: true,
  });
  receipts.push(cut011);
  receipts.push(receipt("cut-012", [
    sha256JsonPostgresProgramReceipt(cut008),
    sha256JsonPostgresProgramReceipt(cut009),
    sha256JsonPostgresProgramReceipt(cut010),
    sha256JsonPostgresProgramReceipt(cut011),
  ], {
    real_data_read: true,
    production_contacted: true,
    first_production_write_started: true,
    json_authority_disabled: true,
  }));

  const result = validateJsonPostgresProgramReceiptSet(receipts, {
    requiredKinds: JSON_POSTGRES_W13_RECEIPTS,
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET,
    bindingsSha256: BINDINGS,
    externalReceipts: [w12Terminal],
    w12TerminalReceiptSha256: w12TerminalSha256,
  });
  assert.equal(result.valid, true);
  assert.equal(result.current_receipt_count, JSON_POSTGRES_W13_RECEIPTS.length);
  assert.equal(result.external_receipt_count, 1);

  assert.throws(() => validateJsonPostgresProgramReceiptSet(receipts, {
    requiredKinds: JSON_POSTGRES_W13_RECEIPTS,
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET,
    bindingsSha256: BINDINGS,
    externalReceipts: [w12Terminal],
    w12TerminalReceiptSha256: "9".repeat(64),
  }), /W12 terminal binding drifted/u);
});

test("program receipt verifies its Ed25519 signer scope", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const value = receipt("w12-migration");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [JSON_POSTGRES_PROGRAM_RECEIPT_ACTION],
      environments: ["lawos-private-rehearsal"],
      valid_from: "2026-07-23T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const signature = sign(null, Buffer.from(canonicalizeJson(value)), privateKey);
  assert.equal(verifyJsonPostgresProgramReceipt({
    receipt: value,
    signature,
    trustRegistry: registry,
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  }).signature_valid, true);
  const tampered = structuredClone(value);
  tampered.safe_counts.reviewed_item_count = 2;
  assert.throws(() => verifyJsonPostgresProgramReceipt({
    receipt: tampered,
    signature,
    trustRegistry: registry,
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  }), /signature/u);
});

test("program receipt sealer keeps the key and sealed artifacts private and self-verifies", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-json-postgres-program-seal-"));
  chmodSync(root, 0o700);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const value = receipt("source-inventory-adjudication");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [JSON_POSTGRES_PROGRAM_RECEIPT_ACTION],
      environments: ["source-local"],
      valid_from: "2020-01-01T00:00:00.000Z",
      valid_until: "2030-01-01T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const receiptPath = join(root, "unsigned.json");
  const registryPath = join(root, "registry.json");
  const keyPath = join(root, "owner.pem");
  for (const [path, bytes] of [
    [receiptPath, `${JSON.stringify(value)}\n`],
    [registryPath, `${JSON.stringify(registry)}\n`],
    [keyPath, privateKey.export({ type: "pkcs8", format: "pem" })],
  ]) {
    writeFileSync(path, bytes, { mode: 0o600 });
    chmodSync(path, 0o600);
  }
  const outputDir = join(root, "sealed");
  const result = JSON.parse(execFileSync(process.execPath, [
    "scripts/seal-json-postgres-program-receipt.mjs",
    "--receipt", receiptPath,
    "--registry", registryPath,
    "--registry-sha256", createHash("sha256").update(readFileSync(registryPath)).digest("hex"),
    "--private-key", keyPath,
    "--output-dir", outputDir,
  ], { cwd: process.cwd(), encoding: "utf8" }));
  assert.equal(result.verdict, "PASS");
  assert.equal(result.signature_valid, true);
  for (const path of [result.receipt_path, result.signature_path, result.checksum_path]) {
    assert.equal(statSync(path).mode & 0o077, 0);
  }
});

test("W12 terminal receipt must bind every independent predecessor", () => {
  const receipts = [];
  for (const kind of JSON_POSTGRES_W12_RECEIPTS.filter((item) => item !== "w12-terminal")) receipts.push(receipt(kind));
  const predecessorDigests = receipts.map(sha256JsonPostgresProgramReceipt);
  receipts.push(receipt("w12-terminal", predecessorDigests));
  assert.equal(validateJsonPostgresProgramReceiptSet(receipts, {
    requiredKinds: JSON_POSTGRES_W12_RECEIPTS,
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET,
    bindingsSha256: BINDINGS,
  }).valid, true);

  receipts.at(-1).predecessor_receipt_sha256.pop();
  assert.throws(() => validateJsonPostgresProgramReceiptSet(receipts, {
    requiredKinds: JSON_POSTGRES_W12_RECEIPTS,
    sourceSha: SHA,
    sourceTree: TREE,
    packetSha256: PACKET,
    bindingsSha256: BINDINGS,
  }), /lacks a required predecessor/u);
});
