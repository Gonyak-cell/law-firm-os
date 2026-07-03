#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { findRegisteredAccountByEmail } from "../apps/api/src/matter-vault-account-registry.js";
import { signedStepUpHeader } from "../apps/api/test/hrx-step-up-test-helper.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.md");
const TENANT_ID = "tenant_amic_matter_vault";
const ACTOR_ID = "user_amic_jwsuh";
const EMPLOYEE_ID = "emp_amic_ytkim";
const COMPENSATION_ID = "comp-001";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
}

async function writeArtifacts(receipt) {
  mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
  writeFileSync(ARTIFACT_JSON, `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(
    ARTIFACT_MD,
    [
      "# UPL-D-10 HRX Compensation Encryption Proof",
      "",
      `- Verdict: ${receipt.verdict}`,
      `- Generated at: ${receipt.generated_at}`,
      `- API base: ${receipt.api_base_url}`,
      `- Visible ref prefix: ${receipt.visible.masked_ref_prefix}`,
      `- Decrypted amount hash: ${receipt.decrypt.decrypted_amount_hash}`,
      `- Audit event id: ${receipt.audit.event_id}`,
      "",
      "The receipt intentionally excludes Authorization headers, step-up tokens, raw compensation amounts, and encryption envelopes.",
      "",
    ].join("\n"),
  );
}

async function main() {
  const started = await startApiServer({ port: 0 });
  const baseUrl = `http://${started.host}:${started.port}`;
  const authHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
  const stepUpHeaders = (purpose = "compensation_access") => ({
    ...authHeaders,
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      purpose,
    }),
  });
  const json = async (path, headers = authHeaders) => {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    return { status: response.status, body: await response.json() };
  };

  try {
    const readChallenge = await json(`/api/hrx/compensation?employee_id=${EMPLOYEE_ID}`);
    assert.equal(readChallenge.status, 403);
    assert.equal(readChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

    const visible = await json(`/api/hrx/compensation?employee_id=${EMPLOYEE_ID}`, stepUpHeaders());
    assert.equal(visible.status, 200);
    assert.equal(visible.body.outcome, "ok");
    assert.match(visible.body.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
    assert.equal(visible.body.compensation_records[0].encrypted_amount_ref_included, false);
    assert.equal(visible.body.compensation_records[0].raw_amount_included, false);

    const decryptChallenge = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`);
    assert.equal(decryptChallenge.status, 403);
    assert.equal(decryptChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

    const decrypted = await json(`/api/hrx/compensation/${COMPENSATION_ID}/decrypt`, stepUpHeaders());
    assert.equal(decrypted.status, 200);
    assert.equal(decrypted.body.outcome, "ok");
    assert.equal(decrypted.body.employee_id, EMPLOYEE_ID);
    assert.equal(decrypted.body.compensation_amount.currency_ref, "Currency:KRW");
    assert.equal(decrypted.body.encrypted_amount_ref_included, false);
    assert.equal(decrypted.body.raw_amount_included, true);
    const decryptedAmountHash = sha256(decrypted.body.compensation_amount.amount_minor);

    const audit = await json("/api/hrx/audit", stepUpHeaders("security_audit"));
    assert.equal(audit.status, 200);
    const decryptEvent = audit.body.events.find(
      (event) => event.action === "hrx.compensation.decrypt" && event.object_id === COMPENSATION_ID && event.decision === "allow",
    );
    assert.ok(decryptEvent);
    assert.equal(decryptEvent.metadata.amount_minor_included, false);
    assert.equal(decryptEvent.metadata.encrypted_amount_ref_included, false);

    const serializedVisible = JSON.stringify(visible.body);
    const serializedDecryptEvent = JSON.stringify(decryptEvent);
    const serializedReceiptProbe = JSON.stringify({
      readChallenge: readChallenge.body.safe_error_code,
      visible: {
        masked_compensation_ref: visible.body.masked_compensation_ref,
        compensation_id: visible.body.compensation_records[0].compensation_id,
      },
      decrypt: {
        compensation_id: decrypted.body.compensation_id,
        employee_id: decrypted.body.employee_id,
        currency_ref: decrypted.body.compensation_amount.currency_ref,
        amount_hash: decryptedAmountHash,
      },
      audit: decryptEvent,
    });
    for (const [label, text] of [
      ["visible response", serializedVisible],
      ["audit event", serializedDecryptEvent],
      ["receipt probe", serializedReceiptProbe],
    ]) {
      assert.equal(text.includes("lawos-comp-v1."), false, `${label} must not include encryption envelopes`);
      assert.equal(text.includes("local-kms://"), false, `${label} must not include legacy local-kms refs`);
      assert.equal(text.includes("authorization"), false, `${label} must not include authorization headers`);
      assert.equal(text.includes("lawos_session_v1."), false, `${label} must not include session tokens`);
    }

    const receipt = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      verdict: "PASS",
      objective: "UPL-D-10 compensation amount real encryption boundary, signed-session step-up decrypt, masked visible refs, and no secret/raw amount leakage in receipts.",
      api_base_url: baseUrl,
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      employee_id: EMPLOYEE_ID,
      compensation_id: COMPENSATION_ID,
      visible: {
        status: visible.status,
        masked_ref_prefix: "compensation_ref_hash",
        masked_ref_hash: sha256(visible.body.masked_compensation_ref),
        encrypted_amount_ref_included: visible.body.compensation_records[0].encrypted_amount_ref_included,
        raw_amount_included: visible.body.compensation_records[0].raw_amount_included,
        contract_document_ref: visible.body.compensation_records[0].contract_document_ref,
      },
      decrypt: {
        missing_step_up_status: decryptChallenge.status,
        missing_step_up_safe_error_code: decryptChallenge.body.safe_error_code,
        status: decrypted.status,
        decrypted_amount_hash: decryptedAmountHash,
        currency_ref: decrypted.body.compensation_amount.currency_ref,
        raw_amount_included_in_authorized_response: true,
        encrypted_amount_ref_included: false,
      },
      audit: {
        event_id: decryptEvent.event_id,
        event_hash: decryptEvent.event_hash ?? null,
        action: decryptEvent.action,
        object_id: decryptEvent.object_id,
        amount_minor_included: decryptEvent.metadata.amount_minor_included,
        encrypted_amount_ref_included: decryptEvent.metadata.encrypted_amount_ref_included,
        key_ref_hash: sha256(decryptEvent.metadata.key_ref),
      },
      leak_checks: {
        authorization_header_written: false,
        session_token_written: false,
        step_up_token_written: false,
        raw_compensation_amount_written: false,
        encryption_envelope_written: false,
        legacy_local_kms_ref_written: false,
      },
      commands: [
        "node --test packages/hrx/test/compensation.test.js",
        "node --test apps/api/test/hrx/compensation-encryption.test.js",
        "node scripts/run-upl-d10-hrx-compensation-encryption-proof.mjs",
      ],
    };

    await writeArtifacts(receipt);
    console.log(`UPL-D-10 HRX compensation encryption proof PASS: ${ARTIFACT_JSON}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
