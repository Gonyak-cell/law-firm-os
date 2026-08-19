import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import {
  createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256,
  createOutlookDesktopActivationIssuePublicResponseBytes,
} from "../src/outlook-desktop-assignment-contract.js";
import {
  createPostgresOutlookDesktopActivationControlAuthority,
} from "../src/postgres-outlook-desktop-activation-control-authority.js";
import {
  createPostgresOutlookDesktopActivationIssueAuthorityPublisher,
} from "../src/postgres-outlook-desktop-activation-issue-authority-publisher.js";
import {
  createPostgresOutlookDesktopLifecycleAuthority,
} from "../src/postgres-outlook-desktop-lifecycle-authority.js";
import {
  authorityBinding,
  authorityDigest,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

test("protected adapters execute activation and lifecycle through exact LOGIN roles", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-protected-adapters-pg",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "81" });
  const prepared = await prepareRegistration(authority, "protected-adapters", {
    mintLifecycle: false,
  });
  const verifiedPackets = new WeakSet([prepared.operatorPacketEvidence]);
  const activation = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: authority.appPool,
    assert_operator_packet_evidence(value) {
      if (!verifiedPackets.has(value)) {
        throw new TypeError("verified operator packet evidence is required");
      }
      return value;
    },
    control_pool: authority.controlPool,
    tenant_id: authority.tenantId,
  });
  const lifecycle = createPostgresOutlookDesktopLifecycleAuthority({
    app_pool: authority.appPool,
    tenant_id: authority.tenantId,
    verifier_pool: authority.verifierPool,
  });
  const principal = Object.freeze({
    ...authority.principal,
    tenant_id: authority.tenantId,
  });

  assert.deepEqual(
    await activation.issueActivationChallenge(prepared.issueRequest),
    prepared.issued,
  );
  const attached = await activation.attachActivationEvidence({
      core_request: prepared.evidenceRequest,
      operator_packet_evidence: prepared.operatorPacketEvidence,
    });
  assert.deepEqual(attached, prepared.attachment);
  const beforePacketMismatch = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence)
         AS evidence_count,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
          AS row_value) AS evidence_bytes,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges
          AS row_value) AS reservation_bytes,
       (SELECT count(*)::int
          FROM lawos_email_dms.outlook_desktop_activation_authorizations)
         AS authorization_count`,
  )).rows[0];
  const changedPacket = Object.freeze({
    ...prepared.operatorPacketEvidence,
    owner_operator_packet_sha256: authorityDigest("changed-owner-packet"),
  });
  verifiedPackets.add(changedPacket);
  await assert.rejects(
    activation.attachActivationEvidence({
      core_request: prepared.evidenceRequest,
      operator_packet_evidence: changedPacket,
    }),
    (error) => error?.safe_error_code ===
      "OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT",
  );
  const afterPacketMismatch = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence)
         AS evidence_count,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
          AS row_value) AS evidence_bytes,
       (SELECT jsonb_agg(to_jsonb(row_value)
          ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges
          AS row_value) AS reservation_bytes,
       (SELECT count(*)::int
          FROM lawos_email_dms.outlook_desktop_activation_authorizations)
         AS authorization_count`,
  )).rows[0];
  assert.deepEqual(afterPacketMismatch, beforePacketMismatch);
  assert.deepEqual(
    await activation.authorizeActivation(prepared.activationAuthorization),
    prepared.activation,
  );
  const reservation = await activation.loadActivationReservation({
    activation_reference: prepared.issued.activation_reference,
  });
  assert.equal(reservation.state, "authorized");
  assert.equal(reservation.activation_receipt_sha256,
    prepared.attachment.core_result.activation_receipt_sha256);
  assert.equal(reservation.owner_operator_packet_sha256,
    prepared.attachment.owner_operator_packet_sha256);
  assert.equal(reservation.evidence_receipt_sha256,
    prepared.attachment.evidence_receipt_sha256);
  assert.notEqual(reservation.activation_authorization_receipt_sha256,
    reservation.activation_receipt_sha256);
  const proofSeed = await activation.readActivationProofSeed({
    activation_reference: prepared.issued.activation_reference,
    authenticated_principal: principal,
  });
  assert.equal(proofSeed.status, "ready");
  assert.equal(proofSeed.event_id, prepared.issued.registration_event_id);

  const beforeEventTamper = (await authority.observerPool.query(
    "SELECT count(*)::int AS count FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations",
  )).rows[0].count;
  await assert.rejects(lifecycle.verifyLifecycleTransition({
    authorization: {
      ...prepared.verifierAuthorization,
      event_id: `oae_${"f".repeat(32)}`,
    },
  }));
  assert.equal((await authority.observerPool.query(
    "SELECT count(*)::int AS count FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations",
  )).rows[0].count, beforeEventTamper);

  assert.equal((await lifecycle.verifyLifecycleTransition({
    authorization: prepared.verifierAuthorization,
  })).outcome, "authorized");
  const registered = await lifecycle.consumeLifecycleTransition({
    authorization: prepared.registration,
    operation: "register",
    principal,
  });
  assert.equal(registered.response_status, 201);
  assert.equal(registered.body.outcome, "registered");

  const request = {
    device_key_fingerprint: prepared.registration.device_key_fingerprint,
    entra_subject_id: authority.principal.entra_subject_id,
    event_id: "event-adapter-heartbeat",
    expected_state_version: 1,
    idempotency_key: "idempotency-adapter-heartbeat",
    installation_id: prepared.registration.installation_id,
    operation: "heartbeat",
    request_id: "request-adapter-heartbeat",
    user_id: authority.principal.user_id,
  };
  const challenge = await lifecycle.issueLifecycleChallenge({
    principal,
    request,
  });
  assert.equal(challenge.operation, "heartbeat");
  const verifierAuthorization = {
    activation_authorization_id: null,
    device_key_fingerprint: request.device_key_fingerprint,
    device_public_key_spki_sha256: request.device_key_fingerprint,
    device_signature_sha256: authorityDigest("adapter-heartbeat-signature"),
    entra_subject_id: request.entra_subject_id,
    event_id: request.event_id,
    expected_state_version: request.expected_state_version,
    idempotency_key: request.idempotency_key,
    installation_id: request.installation_id,
    issued_challenge_sha256: challenge.issued_challenge_sha256,
    lifecycle_authorization_id: "lifecycle-adapter-heartbeat",
    lifecycle_challenge_id: challenge.lifecycle_challenge_id,
    nonce_hash: challenge.challenge_nonce_sha256,
    operation: "heartbeat",
    proof_expires_at: challenge.valid_until,
    proof_issued_at: challenge.issued_at,
    proof_receipt_sha256: authorityDigest("adapter-heartbeat-receipt"),
    proof_transcript_sha256: authorityDigest("adapter-heartbeat-transcript"),
    release_authority_sha256: null,
    request_fingerprint: authorityDigest("adapter-heartbeat-request"),
    request_id: request.request_id,
    retire_intent_id: null,
    user_id: request.user_id,
  };
  assert.equal((await lifecycle.verifyLifecycleTransition({
    authorization: verifierAuthorization,
  })).outcome, "authorized");
  const heartbeat = await lifecycle.consumeLifecycleTransition({
    authorization: {
      device_key_fingerprint: request.device_key_fingerprint,
      device_signature_sha256: verifierAuthorization.device_signature_sha256,
      entra_subject_id: request.entra_subject_id,
      event_id: request.event_id,
      expected_state_version: request.expected_state_version,
      expires_at: challenge.valid_until,
      idempotency_key: request.idempotency_key,
      installation_id: request.installation_id,
      issued_at: challenge.issued_at,
      issued_challenge_sha256: challenge.issued_challenge_sha256,
      lifecycle_authorization_id:
        verifierAuthorization.lifecycle_authorization_id,
      lifecycle_challenge_id: challenge.lifecycle_challenge_id,
      nonce_hash: challenge.challenge_nonce_sha256,
      proof_transcript_sha256:
        verifierAuthorization.proof_transcript_sha256,
      request_fingerprint: verifierAuthorization.request_fingerprint,
      request_id: request.request_id,
      user_id: request.user_id,
    },
    operation: "heartbeat",
    principal,
  });
  assert.equal(heartbeat.response_status, 200);
  assert.equal(heartbeat.body.outcome, "heartbeat");

  const counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_challenges) AS reservations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_challenges) AS challenges,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations) AS authorizations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installations) AS installations`,
  )).rows[0];
  assert.deepEqual(counts, {
    authorizations: 2,
    challenges: 1,
    installations: 1,
    reservations: 1,
  });
});

test("activation issue authority and exact OAR replay survive expiry without writes", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-activation-oar-replay-pg",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "82" });
  let prepared;
  const activation = createPostgresOutlookDesktopActivationControlAuthority({
    app_pool: authority.appPool,
    assert_operator_packet_evidence(value) {
      if (value !== prepared.operatorPacketEvidence) {
        throw new TypeError("verified operator packet evidence is required");
      }
      return value;
    },
    control_pool: authority.controlPool,
    tenant_id: authority.tenantId,
  });
  const publisher = createPostgresOutlookDesktopActivationIssueAuthorityPublisher({
    control_pool: authority.controlPool,
    tenant_id: authority.tenantId,
  });
  let loadRequest;
  let ready;
  prepared = await prepareRegistration(authority, "oar-replay", {
    authorizeActivation: false,
    beforeIssue: async ({ issueAuthority, issueAuthorityRequest, issueRequest }) => {
      assert.deepEqual(await publisher.publish(issueAuthorityRequest), issueAuthority);
      const challenge = issueRequest.issued_challenge;
      loadRequest = {
        authenticated_principal: challenge.authenticated_principal,
        candidate_device: challenge.candidate_device,
        issue_request_id: issueRequest.issue_request_id,
      };
      loadRequest.request_fingerprint_sha256 =
        createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256({
          ...loadRequest,
          tenant_id: authority.tenantId,
        });
      ready = await activation.loadCurrentIssueAuthority(loadRequest);
      assert.equal(ready.outcome, "ready");
      assert.deepEqual(ready.release_ticket_bytes,
        Buffer.from(issueRequest.release_ticket_base64, "base64"));
      assert.deepEqual(ready.release_ticket_signature_bytes,
        Buffer.from(issueRequest.release_ticket_signature_base64, "base64"));
      assert.deepEqual(Object.keys(ready.release_authority).sort(), [
        "authority_binding_sha256",
        "release_artifact_id",
        "release_authority_sha256",
        "release_ticket_bytes_sha256",
        "release_ticket_owner_signature_sha256",
        "valid_until",
      ]);
    },
    lifetimeMilliseconds: 1_500,
    mintLifecycle: false,
  });
  assert.deepEqual(await publisher.publish(prepared.issueAuthorityRequest),
    prepared.issueAuthority);

  const policyBinding = (await authority.observerPool.query(
    `SELECT
       published.pilot_policy->>'policy_revision' AS signed_policy_revision,
       policy.policy_revision::text AS database_policy_revision,
       published.authority_binding_sha256,
       published.release_artifact_id,published.release_authority_sha256,
       published.release_ticket_bytes_sha256,
       published.release_ticket_owner_signature_sha256,
       published.macos_code_directory_sha256,
       published.macos_designated_requirement_sha256,
       published.pilot_policy->>'owner_principal_id' AS owner_principal_id,
       policy.roster_binding_sha256,published.policy_binding_sha256,
       published.approval_audit_event_binding_sha256,
       ((extract(epoch FROM published.published_at)*1000)::bigint)::text
         AS published_at_ms,
       ((extract(epoch FROM published.valid_until)*1000)::bigint)::text
         AS valid_until_ms
      FROM lawos_email_dms.outlook_desktop_activation_issue_authorities
        AS published
      JOIN lawos_email_dms.outlook_desktop_assignment_policies AS policy
        ON policy.tenant_id=published.tenant_id
       AND policy.user_id=published.pilot_policy->>'owner_principal_id'
       AND policy.policy_binding_sha256=published.policy_binding_sha256`,
  )).rows[0];
  assert.equal(
    policyBinding.signed_policy_revision,
    "jwsuh_canary_2026-08-17.r82",
  );
  assert.equal(policyBinding.database_policy_revision, "82");
  assert.notEqual(
    policyBinding.signed_policy_revision,
    policyBinding.database_policy_revision,
  );
  assert.equal(policyBinding.authority_binding_sha256, authorityBinding(
    "lawos.outlook-desktop-activation-issue-authority.v1",
    [
      authority.tenantId,
      policyBinding.release_artifact_id,
      policyBinding.release_authority_sha256,
      policyBinding.release_ticket_bytes_sha256,
      policyBinding.release_ticket_owner_signature_sha256,
      policyBinding.macos_code_directory_sha256,
      policyBinding.macos_designated_requirement_sha256,
      policyBinding.owner_principal_id,
      "jwsuh_canary",
      policyBinding.signed_policy_revision,
      policyBinding.roster_binding_sha256,
      policyBinding.policy_binding_sha256,
      policyBinding.approval_audit_event_binding_sha256,
      policyBinding.published_at_ms,
      policyBinding.valid_until_ms,
    ],
  ));

  const challenge = prepared.issueRequest.issued_challenge;
  assert.equal(
    challenge.pilot_policy.policy_revision,
    policyBinding.signed_policy_revision,
  );
  assert.equal(
    Buffer.from(prepared.issueRequest.issued_challenge_base64, "base64")
      .toString("utf8"),
    `${JSON.stringify(challenge)}\n`,
  );
  const expectedBytes = createOutlookDesktopActivationIssuePublicResponseBytes({
    activation_reference: prepared.issued.activation_reference,
    installation_id: prepared.issued.installation_id,
    issue_request_id: prepared.issueRequest.issue_request_id,
    issued_challenge: challenge,
    issued_challenge_sha256: prepared.issued.issued_challenge_sha256,
    registration_event_id: prepared.issued.registration_event_id,
    release_authority: {
      authority_binding_sha256: prepared.issueAuthority.authority_binding_sha256,
      release_artifact_id: authority.release.release_artifact_id,
      release_authority_sha256: prepared.issued.release_authority_sha256,
      release_ticket_bytes_sha256:
        authority.release.embedded_release_ticket_sha256,
      release_ticket_owner_signature_sha256:
        authority.release.embedded_release_ticket_signature_sha256,
      valid_until: prepared.issueAuthority.valid_until,
    },
    schema_version: "lawos.outlook-desktop-activation-authority-result.v1",
  });
  assert.deepEqual(
    (await activation.loadCurrentIssueAuthority(loadRequest)).response_bytes,
    expectedBytes,
  );
  const before = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_issue_authorities) AS authorities,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_challenges) AS reservations,
       (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.release_artifact_id)::text
          FROM lawos_email_dms.outlook_desktop_activation_issue_authorities AS row_value) AS authority_bytes,
       (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges AS row_value) AS reservation_bytes`,
  )).rows[0];
  const deadline = Date.now() + 5_000;
  let expired = false;
  while (Date.now() < deadline) {
    const databaseNow = Date.parse((await authority.observerPool.query(
      "SELECT clock_timestamp() AS now_at",
    )).rows[0].now_at);
    if (databaseNow > Date.parse(prepared.issued.valid_until)) {
      expired = true;
      break;
    }
    await delay(25);
  }
  assert.equal(expired, true, "database expiry boundary must be observed");
  assert.deepEqual(
    (await activation.loadCurrentIssueAuthority(loadRequest)).response_bytes,
    expectedBytes,
  );

  const changed = {
    ...loadRequest,
    authenticated_principal: {
      ...loadRequest.authenticated_principal,
      entra_tenant_id: "entra-tampered-oar-replay",
    },
  };
  changed.request_fingerprint_sha256 =
    createOutlookDesktopActivationIssueAuthorityLoadRequestFingerprintSha256({
      authenticated_principal: changed.authenticated_principal,
      candidate_device: changed.candidate_device,
      issue_request_id: changed.issue_request_id,
      tenant_id: authority.tenantId,
    });
  await assert.rejects(
    activation.loadCurrentIssueAuthority(changed),
    (error) => error?.safe_error_code ===
      "OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT",
  );
  await assert.rejects(
    publisher.publish({
      ...prepared.issueAuthorityRequest,
      macos_code_directory_sha256: authorityDigest("tampered-code-directory"),
    }),
  );
  await assert.rejects(roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "publish_outlook_desktop_activation_issue_authority",
    {
      ...prepared.issueAuthorityRequest,
      pilot_policy: {
        ...prepared.issueAuthorityRequest.pilot_policy,
        policy_revision: 82,
      },
    },
  ));
  await assert.rejects(publisher.publish({
    ...prepared.issueAuthorityRequest,
    pilot_policy: {
      ...prepared.issueAuthorityRequest.pilot_policy,
      policy_revision: "jwsuh_canary_2026-08-17.r83",
    },
  }));
  const after = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_issue_authorities) AS authorities,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_challenges) AS reservations,
       (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.release_artifact_id)::text
          FROM lawos_email_dms.outlook_desktop_activation_issue_authorities AS row_value) AS authority_bytes,
       (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.activation_reference)::text
          FROM lawos_email_dms.outlook_desktop_activation_challenges AS row_value) AS reservation_bytes`,
  )).rows[0];
  assert.deepEqual(after, before);
});
