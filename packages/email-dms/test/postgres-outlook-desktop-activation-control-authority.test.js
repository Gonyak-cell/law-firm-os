import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { POSTGRES_TENANT_CONTEXT_SECRET } from "../../persistence/src/postgres/pool.js";
import {
  assertPostgresOutlookDesktopActivationControlAuthority,
  createPostgresOutlookDesktopActivationControlAuthority,
} from "../src/postgres-outlook-desktop-activation-control-authority.js";
import {
  createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256,
  normalizeOutlookDesktopActivationIssueAuthorityLoadResult,
  normalizeOutlookDesktopActivationOperatorPacketEvidence,
  normalizeOutlookDesktopActivationReservation,
} from "../src/outlook-desktop-assignment-contract.js";

const TENANT = "tenant-activation-adapter";
const USER = "user-activation-adapter";
const SUBJECT = "subject-activation-adapter";
const REFERENCE = "oda_abcdefghijklmnopqrstuvwx";
const INSTALLATION = "odi_activation_adapter_00001";
const ISSUE_REQUEST_ID = "oar_abcdefghijklmnopqrstuvwx";
const REGISTRATION_EVENT_ID = `oae_${"1".repeat(32)}`;
const ISSUED_AT = "2026-08-17T00:00:00.000Z";
const EXPIRES_AT = "2026-08-17T00:05:00.000Z";
const RELEASE_EXPIRES_AT = "2026-08-18T00:00:00.000Z";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const namedDigest = (value) => digest(Buffer.from(value, "utf8"));
const OWNER_OPERATOR_PACKET_SHA256 = namedDigest("owner-operator-packet");
const EVIDENCE_RECEIPT_SHA256 = namedDigest("operator-packet-evidence-receipt");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function issuePublicResponseBytes() {
  const material = activationMaterial();
  return Buffer.from(`${JSON.stringify(canonical({
    activation_reference: REFERENCE,
    installation_id: INSTALLATION,
    issue_request_id: ISSUE_REQUEST_ID,
    issued_challenge: material.challenge,
    issued_challenge_sha256: material.challengeSha,
    registration_event_id: REGISTRATION_EVENT_ID,
    release_authority: {
      authority_binding_sha256: namedDigest("authority-binding"),
      release_artifact_id: "release-activation-adapter",
      release_authority_sha256: namedDigest("release-authority"),
      release_ticket_bytes_sha256: digest(material.ticket),
      release_ticket_owner_signature_sha256: digest(material.ticketSignature),
      valid_until: RELEASE_EXPIRES_AT,
    },
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
  }))}\n`, "utf8");
}

function activationMaterial() {
  const spki = Buffer.alloc(44, 0x21);
  const nonce = Buffer.alloc(32, 0x22);
  const ticket = Buffer.from("release-ticket-activation-adapter", "utf8");
  const ticketSignature = Buffer.alloc(64, 0x23);
  const challenge = {
    activation_binding_sha256: namedDigest("activation-binding"),
    activation_id: REFERENCE,
    activation_mode: "operator_controlled_macos_v1",
    approved_release: {
      app_id: "com.amic.matter.desktop",
      app_version: "1.0.0",
      approval_sha256: namedDigest("approval"),
      arch: "arm64",
      channel: "formal",
      embedded_build_manifest_sha256: namedDigest("manifest"),
      macos_code_directory_sha256: namedDigest("code-directory"),
      macos_designated_requirement_sha256: namedDigest("requirement"),
      macos_team_id: "TEAMIDENT1",
      macos_technical_evidence_sha256: namedDigest("technical-evidence"),
      measured_inner_artifact_bytes: 100,
      measured_inner_artifact_sha256: namedDigest("inner-artifact"),
      platform: "darwin",
      registered_final_artifact_bytes: 200,
      registered_final_artifact_sha256: namedDigest("final-artifact"),
      release_artifact_id: "release-activation-adapter",
      release_ticket_id: "ticket-activation-adapter",
      release_ticket_sha256: digest(ticket),
      release_ticket_signature_sha256: digest(ticketSignature),
      source_sha: "1".repeat(40),
      source_tree: "2".repeat(40),
      tenant_id: TENANT,
      trust_registry_serial: 1,
      trust_registry_sha256: namedDigest("registry"),
      valid: true,
      valid_until: RELEASE_EXPIRES_AT,
    },
    authenticated_principal: {
      entra_subject: SUBJECT,
      entra_tenant_id: "entra-activation-adapter",
      lawos_tenant_id: TENANT,
      lawos_user_id: USER,
    },
    candidate_device: {
      continuity_key_fingerprint_sha256: digest(spki),
      continuity_public_key_spki: spki.toString("base64"),
    },
    challenge_nonce_base64url: nonce.toString("base64url"),
    challenge_nonce_sha256: digest(nonce),
    expires_at: EXPIRES_AT,
    hardware_key_attested: false,
    issued_at: ISSUED_AT,
    local_measurement_evidence_sha256: namedDigest("measurement"),
    mdm_attested: false,
    pilot_policy: {
      owner_principal_id: USER,
      pilot_id: "jwsuh_canary",
      policy_revision: "jwsuh_canary_2026-08-17.r1",
      roster_sha256: namedDigest("roster"),
    },
    remote_app_attested: false,
    schema_version: "lawos.outlook-desktop-activation-challenge.v1",
  };
  const challengeBytes = Buffer.from(`${JSON.stringify(challenge)}\n`, "utf8");
  const challengeSha = digest(challengeBytes);
  return {
    challenge,
    challengeBytes,
    challengeSha,
    nonce,
    spki,
    ticket,
    ticketSignature,
  };
}

function issueRequest() {
  const material = activationMaterial();
  return {
    issue_request_id: ISSUE_REQUEST_ID,
    issued_challenge: material.challenge,
    issued_challenge_base64: material.challengeBytes.toString("base64"),
    issued_challenge_sha256: material.challengeSha,
    release_ticket_base64: material.ticket.toString("base64"),
    release_ticket_signature_base64: material.ticketSignature.toString("base64"),
  };
}

function issueReceipt() {
  const material = activationMaterial();
  return {
    activation_reference: REFERENCE,
    challenge_nonce_sha256: digest(material.nonce),
    installation_id: INSTALLATION,
    issue_request_id: ISSUE_REQUEST_ID,
    issued_at: ISSUED_AT,
    issued_challenge: material.challenge,
    issued_challenge_base64: material.challengeBytes.toString("base64"),
    issued_challenge_sha256: material.challengeSha,
    outcome: "issued",
    registration_event_id: REGISTRATION_EVENT_ID,
    release_artifact_id: "release-activation-adapter",
    release_authority_sha256: namedDigest("release-authority"),
    tenant_id: TENANT,
    valid_until: EXPIRES_AT,
  };
}

function loadCurrentRequest() {
  const material = activationMaterial();
  const authenticatedPrincipal = material.challenge.authenticated_principal;
  const candidateDevice = material.challenge.candidate_device;
  return {
    authenticated_principal: authenticatedPrincipal,
    candidate_device: candidateDevice,
    issue_request_id: ISSUE_REQUEST_ID,
    request_fingerprint_sha256:
      createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256({
        authenticated_principal: authenticatedPrincipal,
        candidate_device: candidateDevice,
        issue_request_id: ISSUE_REQUEST_ID,
        tenant_id: TENANT,
      }),
  };
}

function evidenceRequest() {
  const material = activationMaterial();
  const receipt = Buffer.from("operator-receipt-activation-adapter", "utf8");
  const signature = Buffer.alloc(64, 0x24);
  return {
    activation_reference: REFERENCE,
    activation_replay_identity: {
      activation_binding_sha256: material.challenge.activation_binding_sha256,
      activation_id: REFERENCE,
      challenge_nonce_sha256: material.challenge.challenge_nonce_sha256,
      replay_identity_sha256: namedDigest("replay-identity"),
    },
    installation_id: INSTALLATION,
    issued_challenge_sha256: material.challengeSha,
    local_measurement_evidence_sha256:
      material.challenge.local_measurement_evidence_sha256,
    operator_receipt_base64: receipt.toString("base64"),
    operator_receipt_sha256: digest(receipt),
    operator_signature_base64: signature.toString("base64"),
    operator_signature_sha256: digest(signature),
    request_id: ISSUE_REQUEST_ID,
  };
}

function operatorPacketEvidence() {
  const material = activationMaterial();
  const receipt = Buffer.from("operator-receipt-activation-adapter", "utf8");
  return Object.freeze({
    activation_reference: REFERENCE,
    authenticated_principal: material.challenge.authenticated_principal,
    local_measurement_evidence_sha256:
      material.challenge.local_measurement_evidence_sha256,
    operator_receipt_bytes: receipt,
    operator_receipt_signature_bytes: Buffer.alloc(64, 0x24),
    owner_operator_packet_sha256: OWNER_OPERATOR_PACKET_SHA256,
    request_id: ISSUE_REQUEST_ID,
  });
}

function assertOperatorPacketEvidence(value) {
  if (value?.owner_operator_packet_sha256 !== OWNER_OPERATOR_PACKET_SHA256) {
    throw new TypeError("verified activation operator packet evidence is required");
  }
  return value;
}

async function captureOwnedEvidenceCopies(evidence, callback) {
  const originalFrom = Buffer.from;
  const sources = new Set([
    evidence.operator_receipt_bytes,
    evidence.operator_receipt_signature_bytes,
  ]);
  const copies = [];
  Buffer.from = function captureEvidenceCopy(value, ...args) {
    const copy = originalFrom.call(Buffer, value, ...args);
    if (sources.has(value)) copies.push(copy);
    return copy;
  };
  try {
    return { copies, result: await callback() };
  } catch (error) {
    return { copies, error };
  } finally {
    Buffer.from = originalFrom;
  }
}

function captureCoreBufferAllocations(callback) {
  const originalFrom = Buffer.from;
  const allocations = [];
  Buffer.from = function captureCoreAllocation(...args) {
    const buffer = originalFrom.apply(Buffer, args);
    allocations.push(buffer);
    return buffer;
  };
  try {
    return { allocations, result: callback() };
  } catch (error) {
    return { allocations, error };
  } finally {
    Buffer.from = originalFrom;
  }
}

async function captureCoreBufferAllocationsAsync(callback) {
  const originalFrom = Buffer.from;
  const allocations = [];
  Buffer.from = function captureCoreAllocation(...args) {
    const buffer = originalFrom.apply(Buffer, args);
    allocations.push(buffer);
    return buffer;
  };
  try {
    return { allocations, result: await callback() };
  } catch (error) {
    return { allocations, error };
  } finally {
    Buffer.from = originalFrom;
  }
}

function isZeroed(buffer) {
  return buffer.every((byte) => byte === 0);
}

function evidenceAttachmentInput() {
  return {
    core_request: evidenceRequest(),
    operator_packet_evidence: operatorPacketEvidence(),
  };
}

function authorizationRequest() {
  const material = activationMaterial();
  return {
    activation_reference: REFERENCE,
    challenge_nonce_sha256: material.challenge.challenge_nonce_sha256,
    device_command_sha256: namedDigest("device-command"),
    device_key_fingerprint: digest(material.spki),
    device_proof_transcript_sha256: namedDigest("proof-transcript"),
    device_public_key_spki_sha256: digest(material.spki),
    device_signature_sha256: namedDigest("device-signature"),
    entra_subject_id: SUBJECT,
    event_id: REGISTRATION_EVENT_ID,
    evidence_binding_sha256: namedDigest("evidence-binding"),
    idempotency_key: ISSUE_REQUEST_ID,
    installation_id: INSTALLATION,
    issued_challenge_sha256: material.challengeSha,
    proof_expires_at: EXPIRES_AT,
    proof_id: "proof-activation-adapter",
    proof_issued_at: ISSUED_AT,
    request_fingerprint: namedDigest("request-fingerprint"),
    request_id: ISSUE_REQUEST_ID,
    user_id: USER,
  };
}

function issuedReservation() {
  const material = activationMaterial();
  const issued = issueReceipt();
  return {
    activation_authorization_receipt_sha256: null,
    activation_receipt_sha256: null,
    activation_reference: REFERENCE,
    activation_replay_identity: null,
    attached_at: null,
    attachment_request_sha256: null,
    attachment_response_text: null,
    authorization_binding_sha256: null,
    authorization_request_sha256: null,
    authorization_response_text: null,
    authorized_at: null,
    challenge_nonce_base64url: material.challenge.challenge_nonce_base64url,
    challenge_nonce_sha256: material.challenge.challenge_nonce_sha256,
    consumed_at: null,
    device_command_sha256: null,
    device_key_fingerprint: digest(material.spki),
    device_proof_transcript_sha256: null,
    device_public_key_spki_sha256: digest(material.spki),
    device_signature_sha256: null,
    entra_subject_id: SUBJECT,
    event_id: null,
    evidence_binding_sha256: null,
    evidence_receipt_sha256: null,
    idempotency_key: null,
    installation_id: INSTALLATION,
    issue_public_response_base64: issuePublicResponseBytes().toString("base64"),
    issue_request_id: ISSUE_REQUEST_ID,
    issue_request_sha256: namedDigest("issue-request"),
    issue_response_text: JSON.stringify(issued),
    issued_at: ISSUED_AT,
    issued_challenge: material.challenge,
    issued_challenge_base64: material.challengeBytes.toString("base64"),
    issued_challenge_sha256: material.challengeSha,
    registration_event_id: REGISTRATION_EVENT_ID,
    lifecycle_registration_consumption: null,
    local_measurement_evidence_sha256:
      material.challenge.local_measurement_evidence_sha256,
    operator_receipt_base64: null,
    operator_receipt_sha256: null,
    operator_signature_base64: null,
    operator_signature_sha256: null,
    owner_operator_packet_sha256: null,
    proof_expires_at: null,
    proof_id: null,
    proof_issued_at: null,
    release_artifact_id: "release-activation-adapter",
    release_authority_sha256: namedDigest("release-authority"),
    release_ticket_base64: material.ticket.toString("base64"),
    release_ticket_bytes_sha256: digest(material.ticket),
    release_ticket_owner_signature_sha256: digest(material.ticketSignature),
    release_ticket_signature_base64: material.ticketSignature.toString("base64"),
    request_fingerprint: null,
    request_id: null,
    schema_version: "lawos.outlook-desktop-activation-reservation.v1",
    state: "issued",
    tenant_id: TENANT,
    user_id: USER,
    valid_until: EXPIRES_AT,
  };
}

function issueAuthorityReadyRow() {
  const material = activationMaterial();
  return {
    approved_release: material.challenge.approved_release,
    authority_binding_sha256: namedDigest("authority-binding"),
    outcome: "ready",
    pilot_policy: material.challenge.pilot_policy,
    release_artifact_id: material.challenge.approved_release.release_artifact_id,
    release_authority_sha256: namedDigest("release-authority"),
    release_ticket_base64: material.ticket.toString("base64"),
    release_ticket_bytes_sha256: digest(material.ticket),
    release_ticket_owner_signature_sha256: digest(material.ticketSignature),
    release_ticket_signature_base64: material.ticketSignature.toString("base64"),
    request_fingerprint_sha256:
      loadCurrentRequest().request_fingerprint_sha256,
    schema_version: "lawos.outlook-desktop-activation-issue-authority.v1",
    tenant_id: TENANT,
    valid_until: RELEASE_EXPIRES_AT,
  };
}

function issueAuthorityReplayRow() {
  return {
    outcome: "replay",
    request_fingerprint_sha256:
      loadCurrentRequest().request_fingerprint_sha256,
    response_base64: issuePublicResponseBytes().toString("base64"),
  };
}

function activationPool({ errorCode, kind, replay = false }) {
  const calls = [];
  const pool = {
    [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, kind === "app" ? 8 : 9),
    connectCount: 0,
    async connect() {
      pool.connectCount += 1;
      return {
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/gu, " ").trim();
          calls.push({ statement, values: [...values] });
          if (statement.includes("lawos_security.current_tenant_id")) {
            return { rows: [{ tenant_id: TENANT }] };
          }
          const name = statement.match(/lawos_email_dms[.]([a-z_]+)/u)?.[1];
          if (name && errorCode) {
            throw Object.assign(new Error("private activation row"), {
              code: errorCode,
              detail: "private detail",
            });
          }
          if (name === "issue_outlook_desktop_activation_challenge") {
            return { rows: [{ value: issueReceipt() }] };
          }
          if (name === "load_current_outlook_desktop_activation_issue_authority") {
            if (replay) {
              return { rows: [{ value: issueAuthorityReplayRow() }] };
            }
            return { rows: [{ value: issueAuthorityReadyRow() }] };
          }
          if (name === "attach_outlook_desktop_activation_evidence") {
            const request = evidenceRequest();
            return { rows: [{ value: {
              core_result: {
                activation_receipt_sha256: request.operator_receipt_sha256,
                activation_reference: REFERENCE,
                attached_at: ISSUED_AT,
                installation_id: INSTALLATION,
                issued_challenge_sha256: request.issued_challenge_sha256,
                local_measurement_evidence_sha256:
                  request.local_measurement_evidence_sha256,
                status: "evidence_attached",
                tenant_id: TENANT,
                valid_until: EXPIRES_AT,
              },
              evidence_receipt_sha256: EVIDENCE_RECEIPT_SHA256,
              owner_operator_packet_sha256: OWNER_OPERATOR_PACKET_SHA256,
            } }] };
          }
          if (name === "authorize_outlook_desktop_activation") {
            const evidence = evidenceRequest();
            return { rows: [{ value: {
              activation_authorization_receipt_sha256:
                namedDigest("activation-authorization-receipt"),
              activation_receipt_sha256: evidence.operator_receipt_sha256,
              activation_reference: REFERENCE,
              authorization_binding_sha256: namedDigest("authorization-binding"),
              authorized_at: ISSUED_AT,
              installation_id: INSTALLATION,
              outcome: "authorized",
              release_artifact_id: "release-activation-adapter",
              release_authority_sha256: namedDigest("release-authority"),
              tenant_id: TENANT,
              valid_until: EXPIRES_AT,
            } }] };
          }
          if (name === "load_outlook_desktop_activation_reservation") {
            return { rows: [{ value: issuedReservation() }] };
          }
          if (name === "read_outlook_desktop_activation_proof_seed") {
            return { rows: [{ value: {
              activation_reference: REFERENCE,
              installation_id: INSTALLATION,
              status: "pending",
              valid_until: EXPIRES_AT,
            } }] };
          }
          return { rows: [] };
        },
        release() {
          calls.push({ statement: "RELEASE", values: [] });
        },
      };
    },
  };
  return { calls, pool };
}

function activationTransactionPool(row, {
  commitErrorCode,
  commitFailures = 0,
  releaseFailure = false,
} = {}) {
  const calls = [];
  let commitCount = 0;
  const pool = {
    [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, 9),
    async connect() {
      return {
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/gu, " ").trim();
          calls.push({ statement, values: [...values] });
          if (statement.includes("lawos_security.current_tenant_id")) {
            return { rows: [{ tenant_id: TENANT }] };
          }
          if (statement.includes(
            "load_current_outlook_desktop_activation_issue_authority",
          )) {
            return { rows: [{ value: row }] };
          }
          if (statement === "COMMIT") {
            commitCount += 1;
            if (commitCount <= commitFailures) {
              throw Object.assign(
                new Error("forced activation authority COMMIT failure"),
                commitErrorCode ? { code: commitErrorCode } : {},
              );
            }
          }
          return { rows: [] };
        },
        release() {
          calls.push({ statement: "RELEASE", values: [] });
          if (releaseFailure) {
            throw new Error("forced activation authority release failure");
          }
        },
      };
    },
  };
  return { calls, pool };
}

test("activation control authority exposes exact protected role methods", async () => {
  const app = activationPool({ kind: "app" });
  const control = activationPool({ kind: "control" });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  assert.equal(assertPostgresOutlookDesktopActivationControlAuthority(authority),
    authority);
  assert.deepEqual(Object.keys(authority).sort(), [
    "attachActivationEvidence",
    "authority",
    "authorizeActivation",
    "issueActivationChallenge",
    "loadActivationReservation",
    "loadCurrentIssueAuthority",
    "readActivationProofSeed",
    "schema_version",
  ]);

  assert.equal((await authority.issueActivationChallenge(issueRequest())).outcome,
    "issued");
  const current = await authority.loadCurrentIssueAuthority(loadCurrentRequest());
  assert.equal(current.outcome, "ready");
  assert.deepEqual(Object.keys(current.release_authority).sort(), [
    "authority_binding_sha256",
    "release_artifact_id",
    "release_authority_sha256",
    "release_ticket_bytes_sha256",
    "release_ticket_owner_signature_sha256",
    "valid_until",
  ]);
  const attachmentInput = evidenceAttachmentInput();
  const receiptBefore = Buffer.from(
    attachmentInput.operator_packet_evidence.operator_receipt_bytes,
  );
  const signatureBefore = Buffer.from(
    attachmentInput.operator_packet_evidence.operator_receipt_signature_bytes,
  );
  const attached = await authority.attachActivationEvidence(attachmentInput);
  assert.equal(attached.core_result.status, "evidence_attached");
  assert.equal(attached.owner_operator_packet_sha256,
    OWNER_OPERATOR_PACKET_SHA256);
  assert.equal(attached.evidence_receipt_sha256, EVIDENCE_RECEIPT_SHA256);
  assert.deepEqual(
    attachmentInput.operator_packet_evidence.operator_receipt_bytes,
    receiptBefore,
  );
  assert.deepEqual(
    attachmentInput.operator_packet_evidence.operator_receipt_signature_bytes,
    signatureBefore,
  );
  const attachCall = control.calls.find(({ statement }) =>
    statement.includes("attach_outlook_desktop_activation_evidence"));
  const internalEnvelope = JSON.parse(attachCall.values[1]);
  assert.deepEqual(Object.keys(internalEnvelope).sort(), [
    "core_request", "operator_packet_evidence",
  ]);
  assert.equal(Object.hasOwn(internalEnvelope.core_request,
    "owner_operator_packet_sha256"), false);
  assert.deepEqual(Object.keys(internalEnvelope.operator_packet_evidence).sort(), [
    "activation_reference", "authenticated_principal",
    "local_measurement_evidence_sha256", "operator_receipt_base64",
    "operator_receipt_signature_base64", "owner_operator_packet_sha256",
    "request_id",
  ]);
  assert.equal((await authority.authorizeActivation(authorizationRequest())).outcome,
    "authorized");
  assert.equal((await authority.loadActivationReservation({
    activation_reference: REFERENCE,
  })).state, "issued");
  assert.equal((await authority.readActivationProofSeed({
    activation_reference: REFERENCE,
    authenticated_principal: {
      entra_subject_id: SUBJECT,
      tenant_id: TENANT,
      user_id: USER,
    },
  })).status, "pending");

  assert.equal(control.calls.filter(({ statement }) =>
    statement.includes("SELECT lawos_email_dms.")).length, 5);
  assert.equal(app.calls.filter(({ statement }) =>
    statement.includes("SELECT lawos_email_dms.")).length, 1);
  assert.deepEqual([...control.calls, ...app.calls]
    .filter(({ statement }) => statement.startsWith("BEGIN ISOLATION LEVEL"))
    .map(({ statement }) => statement).sort(), [
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE",
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
    "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY",
  ].sort());
});

test("activation control authority rejects signed tenant drift before PostgreSQL", () => {
  const app = activationPool({ kind: "app" });
  const control = activationPool({ kind: "control" });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  const request = issueRequest();
  request.issued_challenge = {
    ...request.issued_challenge,
    approved_release: {
      ...request.issued_challenge.approved_release,
      tenant_id: "tenant-foreign",
    },
    authenticated_principal: {
      ...request.issued_challenge.authenticated_principal,
      lawos_tenant_id: "tenant-foreign",
    },
  };
  const bytes = Buffer.from(`${JSON.stringify(request.issued_challenge)}\n`, "utf8");
  request.issued_challenge_base64 = bytes.toString("base64");
  request.issued_challenge_sha256 = digest(bytes);
  assert.throws(() => authority.issueActivationChallenge(request), (error) =>
    error?.safe_error_code === "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH");
  assert.equal(control.pool.connectCount, 0);
});

test("activation evidence requires private verified packet evidence before PostgreSQL", async () => {
  const app = activationPool({ kind: "app" });
  const control = activationPool({ kind: "control" });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence() {
      throw new TypeError("private packet evidence required");
    },
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(authority.attachActivationEvidence({
    core_request: evidenceRequest(),
    operator_packet_evidence: {
      ...operatorPacketEvidence(),
      owner_operator_packet_sha256: namedDigest("caller-forged-packet"),
    },
  }), /private packet evidence required/u);
  await assert.rejects(authority.attachActivationEvidence({
    ...evidenceAttachmentInput(),
    owner_operator_packet_sha256: OWNER_OPERATOR_PACKET_SHA256,
  }), /attachment input/u);
  assert.equal(control.pool.connectCount, 0);
});

test("activation evidence zeroizes every owned Buffer copy on success and rejection", async () => {
  for (const [name, change, expectedCopies] of [
    ["owner digest", {
      owner_operator_packet_sha256: "not-a-digest",
    }, 0],
    ["request id", { request_id: "not-an-oar" }, 0],
    ["receipt length", { operator_receipt_bytes: Buffer.alloc(0) }, 0],
    ["signature length", {
      operator_receipt_signature_bytes: Buffer.alloc(63, 0x24),
    }, 1],
  ]) {
    const evidence = { ...operatorPacketEvidence(), ...change };
    const receiptBefore = Buffer.from(evidence.operator_receipt_bytes);
    const signatureBefore = Buffer.from(
      evidence.operator_receipt_signature_bytes,
    );
    const observed = await captureOwnedEvidenceCopies(
      evidence,
      () => normalizeOutlookDesktopActivationOperatorPacketEvidence(evidence),
    );
    assert.ok(observed.error, `${name} must reject`);
    assert.equal(observed.copies.length, expectedCopies, name);
    assert.equal(observed.copies.every(isZeroed), true, name);
    assert.deepEqual(evidence.operator_receipt_bytes, receiptBefore, name);
    assert.deepEqual(
      evidence.operator_receipt_signature_bytes,
      signatureBefore,
      name,
    );
  }

  const app = activationPool({ kind: "app" });
  const control = activationPool({ kind: "control" });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  const successInput = evidenceAttachmentInput();
  const success = await captureOwnedEvidenceCopies(
    successInput.operator_packet_evidence,
    () => authority.attachActivationEvidence(successInput),
  );
  assert.equal(success.error, undefined);
  assert.equal(success.copies.length, 2);
  assert.equal(success.copies.every(isZeroed), true);

  const mismatchInput = evidenceAttachmentInput();
  mismatchInput.core_request = {
    ...mismatchInput.core_request,
    local_measurement_evidence_sha256: namedDigest("changed-measurement"),
  };
  const mismatch = await captureOwnedEvidenceCopies(
    mismatchInput.operator_packet_evidence,
    () => authority.attachActivationEvidence(mismatchInput),
  );
  assert.equal(
    mismatch.error?.safe_error_code,
    "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH",
  );
  assert.equal(mismatch.copies.length, 2);
  assert.equal(mismatch.copies.every(isZeroed), true);
});

test("activation normalizer zeroizes partial base64 decodes before rejection", () => {
  const partial = issuedReservation();
  partial.release_ticket_signature_base64 = Buffer.alloc(63, 0x23)
    .toString("base64");
  const partialObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationReservation(partial));
  assert.match(partialObserved.error?.message ?? "", /signature_base64/iu);
  assert.ok(partialObserved.allocations.length > 1);
  assert.equal(partialObserved.allocations.every(isZeroed), true);
});

test("activation normalizer zeroizes an issued challenge after late rejection", () => {
  const lateChallenge = issuedReservation();
  lateChallenge.issued_challenge_sha256 = namedDigest("changed-challenge");
  const lateChallengeObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationReservation(lateChallenge));
  assert.match(lateChallengeObserved.error?.message ?? "", /challenge_base64/iu);
  assert.ok(lateChallengeObserved.allocations.length > 1);
  assert.equal(lateChallengeObserved.allocations.every(isZeroed), true);
});

test("activation reservation normalizer zeroizes non-returned allocations", () => {
  const reservation = issuedReservation();
  const reservationObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationReservation(reservation));
  assert.equal(reservationObserved.error, undefined);
  assert.ok(reservationObserved.allocations.length > 1);
  assert.equal(reservationObserved.allocations.every(isZeroed), true);
});

test("activation normalizer preserves only READY result Buffers", () => {
  const material = activationMaterial();
  const readyRow = issueAuthorityReadyRow();
  const readyObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationIssueAuthorityLoadResult(readyRow));
  assert.equal(readyObserved.error, undefined);
  assert.deepEqual(readyObserved.result.release_ticket_bytes, material.ticket);
  assert.deepEqual(
    readyObserved.result.release_ticket_signature_bytes,
    material.ticketSignature,
  );
  const readyPublic = new Set([
    readyObserved.result.release_ticket_bytes,
    readyObserved.result.release_ticket_signature_bytes,
  ]);
  assert.equal(readyObserved.allocations.filter((buffer) =>
    !readyPublic.has(buffer)).every(isZeroed), true);
  assert.equal([...readyPublic].every((buffer) => !isZeroed(buffer)), true);
});

test("activation normalizer zeroizes prospective READY Buffers on rejection", () => {
  const readyRow = issueAuthorityReadyRow();
  readyRow.release_ticket_signature_base64 = Buffer.alloc(64, 0x7f)
    .toString("base64");
  const readyObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationIssueAuthorityLoadResult(readyRow));
  assert.match(readyObserved.error?.message ?? "", /ready row/iu);
  assert.ok(readyObserved.allocations.length > 1);
  assert.equal(readyObserved.allocations.every(isZeroed), true);
});

test("activation normalizer preserves only the REPLAY result Buffer", () => {
  const expectedReplay = issuePublicResponseBytes();
  const replayRow = issueAuthorityReplayRow();
  const replayObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationIssueAuthorityLoadResult(replayRow));
  assert.equal(replayObserved.error, undefined);
  assert.deepEqual(replayObserved.result.response_bytes, expectedReplay);
  assert.equal(replayObserved.allocations.filter((buffer) =>
    buffer !== replayObserved.result.response_bytes).every(isZeroed), true);
  assert.equal(isZeroed(replayObserved.result.response_bytes), false);
});

test("activation normalizer preserves REPLAY fingerprint error precedence", () => {
  const replayRow = issueAuthorityReplayRow();
  replayRow.request_fingerprint_sha256 = "not-a-digest";
  replayRow.response_base64 = Buffer.from("not canonical JSON\n", "utf8")
    .toString("base64");
  const replayObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationIssueAuthorityLoadResult(replayRow));
  assert.match(replayObserved.error?.message ?? "", /fingerprint_sha256/iu);
  assert.ok(replayObserved.allocations.length > 0);
  assert.equal(replayObserved.allocations.every(isZeroed), true);
});

test("activation normalizer zeroizes REPLAY bytes on canonical rejection", () => {
  const parsed = JSON.parse(issuePublicResponseBytes().toString("utf8"));
  const replayRow = issueAuthorityReplayRow();
  replayRow.response_base64 = Buffer.from(`${JSON.stringify({
    schema_version: parsed.schema_version,
    ...parsed,
  })}\n`, "utf8").toString("base64");
  const replayObserved = captureCoreBufferAllocations(() =>
    normalizeOutlookDesktopActivationIssueAuthorityLoadResult(replayRow));
  assert.match(replayObserved.error?.message ?? "", /public response bytes/iu);
  assert.ok(replayObserved.allocations.length > 1);
  assert.equal(replayObserved.allocations.every(isZeroed), true);
});

for (const [outcome, createRow] of [
  ["READY", issueAuthorityReadyRow],
  ["REPLAY", issueAuthorityReplayRow],
]) {
  test(`activation control authority does not expose ${outcome} Buffers when COMMIT fails`, async (t) => {
    const row = createRow();
    const rowBefore = structuredClone(row);
    const request = loadCurrentRequest();
    const requestBefore = structuredClone(request);
    const app = activationPool({ kind: "app" });
    const control = activationTransactionPool(row, { commitFailures: 1 });
    const authority = createPostgresOutlookDesktopActivationControlAuthority({
      app_pool: app.pool,
      assert_operator_packet_evidence: assertOperatorPacketEvidence,
      control_pool: control.pool,
      tenant_id: TENANT,
    });

    const observed = await captureCoreBufferAllocationsAsync(() =>
      authority.loadCurrentIssueAuthority(request));

    assert.match(
      observed.error?.message ?? "",
      /forced activation authority COMMIT failure/u,
    );
    assert.equal(observed.result, undefined);
    assert.ok(observed.allocations.length > 0);
    t.diagnostic(JSON.stringify({
      allocation_count: observed.allocations.length,
      nonzero_sizes: observed.allocations.filter((buffer) => !isZeroed(buffer))
        .map((buffer) => buffer.length),
      outcome,
    }));
    assert.equal(observed.allocations.every(isZeroed), true);
    assert.deepEqual(row, rowBefore);
    assert.deepEqual(request, requestBefore);
    assert.equal(control.calls.filter(({ statement }) =>
      statement.includes(
        "load_current_outlook_desktop_activation_issue_authority",
      )).length, 1);
    assert.equal(control.calls.some(({ statement }) =>
      statement === "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY"), true);
    assert.equal(control.calls.some(({ statement }) => statement === "COMMIT"), true);
    assert.equal(control.calls.some(({ statement }) => statement === "ROLLBACK"), true);
    assert.equal(control.calls.at(-1)?.statement, "RELEASE");
  });
}

for (const [outcome, createRow] of [
  ["READY", issueAuthorityReadyRow],
  ["REPLAY", issueAuthorityReplayRow],
]) {
  test(`activation control authority does not expose ${outcome} Buffers when release fails`, async (t) => {
    const row = createRow();
    const rowBefore = structuredClone(row);
    const request = loadCurrentRequest();
    const requestBefore = structuredClone(request);
    const app = activationPool({ kind: "app" });
    const control = activationTransactionPool(row, { releaseFailure: true });
    const authority = createPostgresOutlookDesktopActivationControlAuthority({
      app_pool: app.pool,
      assert_operator_packet_evidence: assertOperatorPacketEvidence,
      control_pool: control.pool,
      tenant_id: TENANT,
    });

    const observed = await captureCoreBufferAllocationsAsync(() =>
      authority.loadCurrentIssueAuthority(request));

    assert.match(
      observed.error?.message ?? "",
      /forced activation authority release failure/u,
    );
    assert.equal(observed.result, undefined);
    assert.ok(observed.allocations.length > 0);
    t.diagnostic(JSON.stringify({
      allocation_count: observed.allocations.length,
      nonzero_sizes: observed.allocations.filter((buffer) => !isZeroed(buffer))
        .map((buffer) => buffer.length),
      outcome,
    }));
    assert.equal(observed.allocations.every(isZeroed), true);
    assert.deepEqual(row, rowBefore);
    assert.deepEqual(request, requestBefore);
    assert.equal(control.calls.filter(({ statement }) => statement === "COMMIT")
      .length, 1);
    assert.equal(control.calls.some(({ statement }) => statement === "ROLLBACK"),
      false);
    assert.equal(control.calls.at(-1)?.statement, "RELEASE");
  });
}

for (const [outcome, createRow] of [
  ["READY", issueAuthorityReadyRow],
  ["REPLAY", issueAuthorityReplayRow],
]) {
  test(`activation control authority transfers only the final ${outcome} Buffers after a retry`, async (t) => {
    const row = createRow();
    const rowBefore = structuredClone(row);
    const request = loadCurrentRequest();
    const requestBefore = structuredClone(request);
    const app = activationPool({ kind: "app" });
    const control = activationTransactionPool(row, {
      commitErrorCode: "40001",
      commitFailures: 1,
    });
    const authority = createPostgresOutlookDesktopActivationControlAuthority({
      app_pool: app.pool,
      assert_operator_packet_evidence: assertOperatorPacketEvidence,
      control_pool: control.pool,
      tenant_id: TENANT,
    });

    const observed = await captureCoreBufferAllocationsAsync(() =>
      authority.loadCurrentIssueAuthority(request));
    assert.equal(observed.error, undefined);
    const publicBuffers = observed.result.outcome === "ready"
      ? new Set([
        observed.result.release_ticket_bytes,
        observed.result.release_ticket_signature_bytes,
      ])
      : new Set([observed.result.response_bytes]);
    t.diagnostic(JSON.stringify({
      allocation_count: observed.allocations.length,
      nonzero_sizes: observed.allocations.filter((buffer) => !isZeroed(buffer))
        .map((buffer) => buffer.length),
      outcome,
    }));
    assert.equal(observed.allocations.filter((buffer) =>
      !publicBuffers.has(buffer)).every(isZeroed), true);
    assert.equal([...publicBuffers].every((buffer) => !isZeroed(buffer)), true);
    assert.deepEqual(row, rowBefore);
    assert.deepEqual(request, requestBefore);
    assert.equal(control.calls.filter(({ statement }) =>
      statement.includes(
        "load_current_outlook_desktop_activation_issue_authority",
      )).length, 2);
    assert.equal(control.calls.filter(({ statement }) => statement === "COMMIT")
      .length, 2);
    assert.equal(control.calls.filter(({ statement }) => statement === "ROLLBACK")
      .length, 1);
    assert.equal(control.calls.filter(({ statement }) => statement === "RELEASE")
      .length, 2);
  });
}

test("activation control authority returns only the exact canonical stored issue package", async () => {
  const app = activationPool({ kind: "app" });
  const control = activationPool({ kind: "control", replay: true });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  const replay = await authority.loadCurrentIssueAuthority(loadCurrentRequest());
  assert.equal(replay.outcome, "replay");
  assert.deepEqual(replay.response_bytes, issuePublicResponseBytes());
  assert.equal(
    JSON.parse(replay.response_bytes.toString("utf8")).issue_request_id,
    ISSUE_REQUEST_ID,
  );

  const noncanonical = activationPool({ kind: "control", replay: true });
  noncanonical.pool.connect = async () => ({
    async query(sql) {
      const statement = String(sql).replace(/\s+/gu, " ").trim();
      if (statement.includes("lawos_security.current_tenant_id")) {
        return { rows: [{ tenant_id: TENANT }] };
      }
      if (statement.includes("load_current_outlook_desktop_activation_issue_authority")) {
        const parsed = JSON.parse(issuePublicResponseBytes().toString("utf8"));
        const noncanonicalValue = {
          schema_version: parsed.schema_version,
          ...parsed,
        };
        return { rows: [{ value: {
          outcome: "replay",
          request_fingerprint_sha256:
            loadCurrentRequest().request_fingerprint_sha256,
          response_base64: Buffer.from(
            `${JSON.stringify(noncanonicalValue)}\n`,
            "utf8",
          )
            .toString("base64"),
        } }] };
      }
      return { rows: [] };
    },
    release() {},
  });
  const rejecting = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: noncanonical.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(
    rejecting.loadCurrentIssueAuthority(loadCurrentRequest()),
    /public response bytes/u,
  );
});

test("activation control authority maps private reference mismatch without detail", async () => {
  const app = activationPool({ kind: "app" });
  const control = activationPool({ errorCode: "LAC02", kind: "control" });
  const authority = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: app.pool,
    assert_operator_packet_evidence: assertOperatorPacketEvidence,
    control_pool: control.pool,
    tenant_id: TENANT,
  });
  await assert.rejects(authority.loadActivationReservation({
    activation_reference: REFERENCE,
  }), (error) => {
    assert.equal(error.code,
      "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH");
    assert.equal(error.safe_error_code,
      "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH");
    assert.equal(error.status, 403);
    assert.doesNotMatch(JSON.stringify(error), /private|detail/iu);
    return true;
  });
});
