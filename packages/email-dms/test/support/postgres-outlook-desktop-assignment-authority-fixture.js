import { createHash, generateKeyPairSync } from "node:crypto";

import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { listEmailDmsPostgresMigrations } from "../../src/migrations/index.js";
import { readOutlookAssignmentBootstrapAuthority } from "../../src/outlook-desktop-assignment-bootstrap-authority.js";
import {
  insertReleaseArtifact,
  insertReleaseAudit,
  releaseArtifact,
  releaseAudit,
} from "../helpers/outlook-desktop-release-trust-migration-fixture.js";
import {
  createEmailDmsMigrationAdminPool,
  createEmailDmsMigrationFixture,
  createEmailDmsRolePool,
  provisionEmailDmsMigrationRoles,
  runEmailDmsMigrationAsAdmin,
  TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256,
  TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256,
  TEST_OUTLOOK_MIGRATION_CATALOG_SHA256,
} from "./postgres-email-dms-migration-fixture.js";

export function authorityDigest(label) {
  return createHash("sha256").update(String(label)).digest("hex");
}

export function authorityBinding(domain, values) {
  return createHash("sha256").update([domain, ...values].map((value) => {
    const text = String(value);
    return `${Buffer.byteLength(text, "utf8")}:${text}`;
  }).join("")).digest("hex");
}

export async function roleJsonCall(pool, tenantId, name, payload, {
  testLifecycleChallengeMilliseconds,
} = {}) {
  return withPostgresTransaction(
    pool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client) => {
      if (testLifecycleChallengeMilliseconds !== undefined) {
        await client.query(
          "SELECT set_config('lawos.test.outlook_lifecycle_challenge_milliseconds',$1,true)",
          [String(testLifecycleChallengeMilliseconds)],
        );
      }
      return (await client.query(
        `SELECT lawos_email_dms.${name}($1,$2::jsonb) AS value`,
        [tenantId, JSON.stringify(payload)],
      )).rows[0]?.value;
    },
  );
}

export async function roleDatabaseNow(pool, tenantId) {
  return withPostgresTransaction(
    pool,
    { tenant_id: tenantId, readOnly: true },
    async (client) => new Date((await client.query(
      "SELECT date_trunc('milliseconds',clock_timestamp()) AS now",
    )).rows[0].now).toISOString(),
  );
}

export async function createOutlookAssignmentAuthorityFixture(t, {
  tenantId = "tenant-assignment-authority-a",
  userId = "user-jwsuh-canary-a",
  entraSubjectId = "subject-jwsuh-canary-a",
  releaseLifetimeMilliseconds = 86_400_000,
} = {}) {
  const ownedPools = [];
  t.after(async () => {
    await Promise.all(ownedPools.map((pool) => pool.end().catch(() => {})));
  });
  const fixture = await createEmailDmsMigrationFixture(t, { appPoolMax: 16 });
  if (!fixture) return null;
  const roleBootstrap = await provisionEmailDmsMigrationRoles(fixture.adminPool);
  const migrationAdminPool = createEmailDmsMigrationAdminPool(t, fixture);
  ownedPools.push(migrationAdminPool);
  const at = Date.now();
  const releaseTicketBytes = Buffer.from(
    JSON.stringify({ domain: "lawos.test.outlook-release-ticket.v1", tenant_id: tenantId }),
    "utf8",
  );
  const releaseTicketSignature = Buffer.alloc(64, 0x52);
  const release = releaseArtifact("1", {
    tenant_id: tenantId,
    app_version: "0.1.27",
    source_sha: "1".repeat(40),
    macos_certificate_valid_from: new Date(at - 86_400_000).toISOString(),
    macos_certificate_valid_until: new Date(at + 2 * 86_400_000).toISOString(),
    macos_evidence_observed_at: new Date(at - 60_000).toISOString(),
    macos_evidence_expires_at: new Date(at + 86_400_000).toISOString(),
    ticket_issued_at: new Date(at - 86_400_000).toISOString(),
    ticket_expires_at: new Date(at + 86_400_000).toISOString(),
    approved_at: new Date(at - 1_000).toISOString(),
    valid_from: new Date(at - 1_000).toISOString(),
    valid_until: new Date(at + releaseLifetimeMilliseconds).toISOString(),
    embedded_release_ticket_sha256:
      createHash("sha256").update(releaseTicketBytes).digest("hex"),
    embedded_release_ticket_signature_sha256:
      createHash("sha256").update(releaseTicketSignature).digest("hex"),
  });
  const migrations = listEmailDmsPostgresMigrations();
  for (const migration of migrations.slice(0, -1)) {
    await runEmailDmsMigrationAsAdmin(migrationAdminPool, migration.sql);
  }
  await withPostgresTransaction(
    migrationAdminPool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client) => {
      await insertReleaseArtifact(client, release);
      await insertReleaseAudit(client, releaseAudit("approved", {
        tenant_id: tenantId,
        event_id: "release-audit-assignment-authority-1",
        release_artifact_id: release.release_artifact_id,
        release_ticket_sha256: release.embedded_release_ticket_sha256,
        final_artifact_sha256: release.final_artifact_sha256,
        approval_sha256: release.approval_sha256,
        occurred_at: release.approved_at,
      }));
    },
  );
  const expectedAuthority = await readOutlookAssignmentBootstrapAuthority(
    migrationAdminPool,
    {
      database_name: "postgres",
      bootstrap_grantor: roleBootstrap.bootstrap_grantor,
      lawos_app_membership_present:
        roleBootstrap.lawos_app_membership_present,
    },
  );
  await runEmailDmsMigrationAsAdmin(migrationAdminPool, migrations.at(-1).sql, {
    expectedRoleBootstrapSha256: expectedAuthority.role_bootstrap_sha256,
    expectedAuthorityManifestSha256: TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256,
    expectedDatabaseTargetReceiptSha256:
      TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256,
    expectedMigrationCatalogSha256: TEST_OUTLOOK_MIGRATION_CATALOG_SHA256,
  });
  await migrationAdminPool.end();
  ownedPools.splice(ownedPools.indexOf(migrationAdminPool), 1);
  const [appPool, controlPool, workerPool, verifierPool] = await Promise.all([
    createEmailDmsRolePool(t, fixture, "lawos_app", { max: 16 }),
    createEmailDmsRolePool(t, fixture, "lawos_outlook_control_operator"),
    createEmailDmsRolePool(t, fixture, "lawos_outlook_assignment_worker", { max: 16 }),
    createEmailDmsRolePool(t, fixture, "lawos_outlook_lifecycle_verifier", { max: 16 }),
  ]);
  ownedPools.push(appPool, controlPool, workerPool, verifierPool);
  return Object.freeze({
    ...fixture,
    observerPool: fixture.bootstrapPool,
    leasePrerequisitePool: fixture.bootstrapPool,
    tenantId,
    principal: Object.freeze({ user_id: userId, entra_subject_id: entraSubjectId }),
    activationIssueOwnerPrincipal: Object.freeze({
      user_id: userId,
      entra_subject_id: entraSubjectId,
    }),
    release: Object.freeze(release),
    releaseMaterial: Object.freeze({
      ticket_base64: releaseTicketBytes.toString("base64"),
      ticket_signature_base64: releaseTicketSignature.toString("base64"),
    }),
    appPool,
    controlPool,
    workerPool,
    verifierPool,
  });
}

export async function seedCanaryPolicy(authority, {
  suffix = "1",
  lifetimeMilliseconds = 3_600_000,
} = {}) {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const approvedAt = new Date(now - 1_000).toISOString();
  const validFrom = approvedAt;
  const validUntil = new Date(now + lifetimeMilliseconds).toISOString();
  const rosterVersion = `jwsuh-canary-roster-${suffix}`;
  const ownerApproval = authorityDigest(`owner-roster-${suffix}`);
  const memberBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-roster-member.v1",
    [authority.tenantId, rosterVersion, authority.principal.user_id,
      authority.principal.entra_subject_id],
  );
  const rosterBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-roster.v1",
    [authority.tenantId, rosterVersion, "jwsuh_canary", "none", ownerApproval,
      approvedAt, validFrom, validUntil, memberBinding],
  );
  const roster = {
    roster_version: rosterVersion,
    rollout_stage: "jwsuh_canary",
    roster_binding_sha256: rosterBinding,
    owner_approval_sha256: ownerApproval,
    expansion_authorization_id: null,
    approved_at: approvedAt,
    valid_from: validFrom,
    valid_until: validUntil,
    members: [{
      ...authority.principal,
      member_binding_sha256: memberBinding,
    }],
  };
  const rosterResult = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    roster,
  );
  const approvalId = `jwsuh-canary-policy-${suffix}`;
  const policyRevision = Number(suffix);
  const policyBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-policy-approval.v1",
    [authority.tenantId, approvalId, authority.principal.user_id,
      authority.principal.entra_subject_id, "jwsuh_canary", true, true, true,
      true, policyRevision, rosterVersion, rosterBinding, ownerApproval,
      String(Date.parse(approvedAt)), String(Date.parse(validFrom)),
      String(Date.parse(validUntil))],
  );
  const approval = {
    approval_id: approvalId,
    ...authority.principal,
    rollout_stage: "jwsuh_canary",
    maximum_entitled: true,
    rollout_authorized: true,
    account_active: true,
    release_allowed: true,
    policy_revision: policyRevision,
    roster_version: rosterVersion,
    roster_binding_sha256: rosterBinding,
    owner_approval_sha256: ownerApproval,
    policy_binding_sha256: policyBinding,
    approved_at: approvedAt,
    valid_from: validFrom,
    valid_until: validUntil,
  };
  const result = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    approval,
  );
  return Object.freeze({ roster, rosterResult, approval, result });
}

export async function prepareRegistration(authority, suffix = "1", {
  authorizeActivation = true,
  beforeIssue = null,
  lifetimeMilliseconds = 120_000,
  lifecycleAuthorizationId = `lifecycle-register-${suffix}`,
  mintLifecycle = true,
} = {}) {
  if (beforeIssue !== null && typeof beforeIssue !== "function") {
    throw new TypeError("beforeIssue must be a function");
  }
  const issueOwner = authority.activationIssueOwnerPrincipal ?? authority.principal;
  const policy = (await authority.observerPool.query(
    `SELECT policy_revision,roster_binding_sha256
       FROM lawos_email_dms.outlook_desktop_assignment_policies
      WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3`,
    [authority.tenantId, issueOwner.user_id, issueOwner.entra_subject_id],
  )).rows[0];
  if (!policy) throw new TypeError("current canary policy is required");
  const issueAuthorityRequest = Object.freeze({
    macos_code_directory_sha256: authorityDigest("activation-code-directory"),
    macos_designated_requirement_sha256:
      authorityDigest("activation-designated-requirement"),
    pilot_policy: {
      owner_principal_id: issueOwner.user_id,
      pilot_id: "jwsuh_canary",
      policy_revision:
        `jwsuh_canary_2026-08-17.r${Number(policy.policy_revision)}`,
      roster_sha256: policy.roster_binding_sha256,
    },
    release_artifact_id: authority.release.release_artifact_id,
    release_ticket_base64: authority.releaseMaterial.ticket_base64,
    release_ticket_signature_base64:
      authority.releaseMaterial.ticket_signature_base64,
    request_id: `publish-${authority.release.release_artifact_id}`,
  });
  const issueAuthority = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "publish_outlook_desktop_activation_issue_authority",
    issueAuthorityRequest,
  );
  const pair = generateKeyPairSync("ed25519");
  const devicePublicKey = pair.publicKey.export({ type: "spki", format: "der" });
  const deviceKeyFingerprint = createHash("sha256").update(devicePublicKey).digest("hex");
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const issuedAt = new Date(now - 1_000).toISOString();
  const expiresAt = new Date(Math.min(
    now + lifetimeMilliseconds,
    Date.parse(issueAuthority.valid_until),
  )).toISOString();
  const activationReference = `oda_${authorityDigest(`activation-${suffix}`).slice(0, 24)}`;
  const requestFingerprint = authorityDigest(`request-${suffix}`);
  const nonceBytes = createHash("sha256").update(`nonce-${suffix}`).digest();
  const nonceHash = createHash("sha256").update(nonceBytes).digest("hex");
  const signatureDigest = authorityDigest(`signature-${suffix}`);
  const deviceCommandSha256 = authorityDigest(`command-${suffix}`);
  const proofTranscript = authorityDigest(`transcript-${suffix}`);
  const localMeasurementEvidenceSha256 = authorityDigest(`measurement-${suffix}`);
  const challenge = {
    activation_binding_sha256: authorityDigest(`activation-binding-${suffix}`),
    activation_id: activationReference,
    activation_mode: "operator_controlled_macos_v1",
    approved_release: {
      app_id: authority.release.app_id,
      app_version: authority.release.app_version,
      approval_sha256: authority.release.approval_sha256,
      arch: authority.release.arch,
      channel: authority.release.channel,
      embedded_build_manifest_sha256:
        authority.release.embedded_build_manifest_sha256,
      macos_code_directory_sha256:
        issueAuthorityRequest.macos_code_directory_sha256,
      macos_designated_requirement_sha256:
        issueAuthorityRequest.macos_designated_requirement_sha256,
      macos_team_id: authority.release.macos_team_id,
      macos_technical_evidence_sha256:
        authority.release.macos_technical_evidence_sha256,
      measured_inner_artifact_bytes:
        authority.release.embedded_inner_artifact_bytes,
      measured_inner_artifact_sha256:
        authority.release.embedded_inner_artifact_sha256,
      platform: authority.release.platform,
      registered_final_artifact_bytes: authority.release.final_artifact_bytes,
      registered_final_artifact_sha256: authority.release.final_artifact_sha256,
      release_artifact_id: authority.release.release_artifact_id,
      release_ticket_id: authority.release.release_ticket_id,
      release_ticket_sha256: authority.release.embedded_release_ticket_sha256,
      release_ticket_signature_sha256:
        authority.release.embedded_release_ticket_signature_sha256,
      source_sha: authority.release.source_sha,
      source_tree: authority.release.source_tree,
      tenant_id: authority.tenantId,
      trust_registry_serial: authority.release.trust_registry_serial,
      trust_registry_sha256: authority.release.trust_registry_sha256,
      valid: true,
      valid_until: issueAuthority.valid_until,
    },
    authenticated_principal: {
      entra_subject: authority.principal.entra_subject_id,
      entra_tenant_id: "tenant-entra-assignment-authority",
      lawos_tenant_id: authority.tenantId,
      lawos_user_id: authority.principal.user_id,
    },
    candidate_device: {
      continuity_key_fingerprint_sha256: deviceKeyFingerprint,
      continuity_public_key_spki: devicePublicKey.toString("base64"),
    },
    challenge_nonce_base64url: nonceBytes.toString("base64url"),
    challenge_nonce_sha256: nonceHash,
    expires_at: expiresAt,
    hardware_key_attested: false,
    issued_at: issuedAt,
    local_measurement_evidence_sha256: localMeasurementEvidenceSha256,
    mdm_attested: false,
    pilot_policy: issueAuthorityRequest.pilot_policy,
    remote_app_attested: false,
    schema_version: "lawos.outlook-desktop-activation-challenge.v1",
  };
  const challengeBytes = Buffer.from(`${JSON.stringify(challenge)}\n`, "utf8");
  const issuedChallengeSha256 = createHash("sha256")
    .update(challengeBytes).digest("hex");
  const issueRequest = Object.freeze({
    issue_request_id:
      `oar_${authorityDigest(`issue-${suffix}`).slice(0, 24)}`,
    issued_challenge: challenge,
    issued_challenge_base64: challengeBytes.toString("base64"),
    issued_challenge_sha256: issuedChallengeSha256,
    release_ticket_base64: authority.releaseMaterial.ticket_base64,
    release_ticket_signature_base64:
      authority.releaseMaterial.ticket_signature_base64,
  });
  await beforeIssue?.(Object.freeze({
    issueAuthority,
    issueAuthorityRequest,
    issueRequest,
  }));
  const issued = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "issue_outlook_desktop_activation_challenge",
    issueRequest,
  );
  const operatorReceiptBytes = Buffer.from(
    JSON.stringify({ activation_id: activationReference, outcome: "approved" }),
    "utf8",
  );
  const operatorSignature = Buffer.alloc(64, 0x53);
  const operatorReceiptSha256 = createHash("sha256")
    .update(operatorReceiptBytes).digest("hex");
  const operatorSignatureSha256 = createHash("sha256")
    .update(operatorSignature).digest("hex");
  const ownerOperatorPacketBytes = Buffer.from(`${JSON.stringify({
    activation_reference: activationReference,
    domain: "lawos.test.outlook-owner-operator-packet.v1",
    request_id: issueRequest.issue_request_id,
  })}\n`, "utf8");
  const ownerOperatorPacketSha256 = createHash("sha256")
    .update(ownerOperatorPacketBytes).digest("hex");
  const evidenceRequest = Object.freeze({
    activation_reference: activationReference,
    activation_replay_identity: {
      activation_binding_sha256: challenge.activation_binding_sha256,
      activation_id: activationReference,
      challenge_nonce_sha256: nonceHash,
      replay_identity_sha256: authorityDigest(`replay-identity-${suffix}`),
    },
    installation_id: issued.installation_id,
    issued_challenge_sha256: issuedChallengeSha256,
    local_measurement_evidence_sha256: localMeasurementEvidenceSha256,
    operator_receipt_base64: operatorReceiptBytes.toString("base64"),
    operator_receipt_sha256: operatorReceiptSha256,
    operator_signature_base64: operatorSignature.toString("base64"),
    operator_signature_sha256: operatorSignatureSha256,
    request_id: issueRequest.issue_request_id,
  });
  const operatorPacketEvidence = Object.freeze({
    activation_reference: activationReference,
    authenticated_principal: challenge.authenticated_principal,
    local_measurement_evidence_sha256: localMeasurementEvidenceSha256,
    operator_receipt_bytes: Buffer.from(operatorReceiptBytes),
    operator_receipt_signature_bytes: Buffer.from(operatorSignature),
    owner_operator_packet_sha256: ownerOperatorPacketSha256,
    request_id: issueRequest.issue_request_id,
  });
  const attachment = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "attach_outlook_desktop_activation_evidence",
    {
      core_request: evidenceRequest,
      operator_packet_evidence: {
        activation_reference: operatorPacketEvidence.activation_reference,
        authenticated_principal:
          operatorPacketEvidence.authenticated_principal,
        local_measurement_evidence_sha256:
          operatorPacketEvidence.local_measurement_evidence_sha256,
        operator_receipt_base64:
          operatorPacketEvidence.operator_receipt_bytes.toString("base64"),
        operator_receipt_signature_base64:
          operatorPacketEvidence.operator_receipt_signature_bytes
            .toString("base64"),
        owner_operator_packet_sha256:
          operatorPacketEvidence.owner_operator_packet_sha256,
        request_id: operatorPacketEvidence.request_id,
      },
    },
  );
  const evidenceBindingSha256 = authorityBinding(
    "lawos.outlook-desktop-activation-evidence-binding.v1",
    [authority.tenantId, activationReference, issued.installation_id,
      issuedChallengeSha256, operatorReceiptSha256, operatorSignatureSha256,
      localMeasurementEvidenceSha256, deviceCommandSha256, proofTranscript,
      signatureDigest, issued.release_authority_sha256],
  );
  const activationAuthorization = Object.freeze({
    activation_reference: activationReference,
    ...authority.principal,
    installation_id: issued.installation_id,
    device_key_fingerprint: deviceKeyFingerprint,
    device_public_key_spki_sha256: deviceKeyFingerprint,
    device_command_sha256: deviceCommandSha256,
    device_proof_transcript_sha256: proofTranscript,
    challenge_nonce_sha256: nonceHash,
    device_signature_sha256: signatureDigest,
    issued_challenge_sha256: issuedChallengeSha256,
    evidence_binding_sha256: evidenceBindingSha256,
    proof_id: lifecycleAuthorizationId,
    request_id: issueRequest.issue_request_id,
    event_id: issued.registration_event_id,
    idempotency_key: issueRequest.issue_request_id,
    request_fingerprint: requestFingerprint,
    proof_issued_at: issuedAt,
    proof_expires_at: expiresAt,
  });
  const activation = authorizeActivation ? await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_activation",
    activationAuthorization,
  ) : null;
  const verifierAuthorization = Object.freeze({
    lifecycle_authorization_id: lifecycleAuthorizationId,
    operation: "register",
    ...authority.principal,
    installation_id: issued.installation_id,
    device_key_fingerprint: deviceKeyFingerprint,
    device_public_key_spki_sha256: deviceKeyFingerprint,
    expected_state_version: 1,
    request_fingerprint: requestFingerprint,
    proof_transcript_sha256: proofTranscript,
    nonce_hash: nonceHash,
    device_signature_sha256: signatureDigest,
    proof_receipt_sha256: authorityDigest(`proof-receipt-${suffix}`),
    issued_challenge_sha256: issuedChallengeSha256,
    activation_authorization_id: activationReference,
    release_authority_sha256: issued.release_authority_sha256,
    lifecycle_challenge_id: null,
    request_id: issueRequest.issue_request_id,
    event_id: issued.registration_event_id,
    idempotency_key: issueRequest.issue_request_id,
    retire_intent_id: null,
    proof_issued_at: issuedAt,
    proof_expires_at: expiresAt,
  });
  if (mintLifecycle) {
    if (!authorizeActivation) {
      throw new TypeError("activation authorization is required before minting");
    }
    await roleJsonCall(
      authority.verifierPool,
      authority.tenantId,
      "mint_outlook_desktop_lifecycle_verifier_receipt",
      verifierAuthorization,
    );
  }
  const registration = {
    installation_id: issued.installation_id,
    ...authority.principal,
    device_public_key: devicePublicKey.toString("base64"),
    device_key_fingerprint: deviceKeyFingerprint,
    platform: authority.release.platform,
    app_version: authority.release.app_version,
    source_sha: authority.release.source_sha,
    activation_authorization_id: activationReference,
    lifecycle_authorization_id: lifecycleAuthorizationId,
    proof_transcript_sha256: proofTranscript,
    device_command_sha256: deviceCommandSha256,
    issued_challenge_sha256: issuedChallengeSha256,
    request_id: issueRequest.issue_request_id,
    event_id: issued.registration_event_id,
    idempotency_key: issueRequest.issue_request_id,
    request_fingerprint: requestFingerprint,
    nonce_hash: nonceHash,
    device_signature_sha256: signatureDigest,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  return Object.freeze({
    pair, issued, attachment, activation, registration,
    issueAuthority, issueAuthorityRequest,
    activationAuthorization, evidenceRequest, issueRequest,
    operatorPacketEvidence, verifierAuthorization,
  });
}

export async function authorizeAndRegister(authority, suffix = "1") {
  const prepared = await prepareRegistration(authority, suffix);
  const result = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    prepared.registration,
  );
  return Object.freeze({ ...prepared, result });
}

export async function prepareLifecycleAuthorization(
  authority,
  registered,
  operation,
  expectedStateVersion,
  suffix,
  {
    challengeLifetimeMilliseconds,
    lifecycleAuthorizationId = `lifecycle-${operation}-${suffix}`,
  } = {},
) {
  if (!new Set(["heartbeat", "retire"]).has(operation)) {
    throw new TypeError("heartbeat or retire is required");
  }
  const requestFingerprint = authorityDigest(`request-${operation}-${suffix}`);
  const proofTranscript = authorityDigest(`transcript-${operation}-${suffix}`);
  const signatureDigest = authorityDigest(`signature-${operation}-${suffix}`);
  const installationId = registered.registration.installation_id;
  const deviceKeyFingerprint = registered.registration.device_key_fingerprint;
  const requestId = `request-${operation}-${suffix}`;
  const eventId = `event-${operation}-${suffix}`;
  const idempotencyKey = `idempotency-${operation}-${suffix}`;
  const challenge = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "issue_outlook_desktop_lifecycle_challenge",
    {
      operation,
      ...authority.principal,
      installation_id: installationId,
      device_key_fingerprint: deviceKeyFingerprint,
      expected_state_version: expectedStateVersion,
      request_id: requestId,
      event_id: eventId,
      idempotency_key: idempotencyKey,
    },
    { testLifecycleChallengeMilliseconds: challengeLifetimeMilliseconds },
  );
  const authorization = Object.freeze({
    lifecycle_authorization_id: lifecycleAuthorizationId,
    operation,
    ...authority.principal,
    installation_id: installationId,
    device_key_fingerprint: deviceKeyFingerprint,
    device_public_key_spki_sha256: deviceKeyFingerprint,
    expected_state_version: expectedStateVersion,
    request_fingerprint: requestFingerprint,
    proof_transcript_sha256: proofTranscript,
    nonce_hash: challenge.challenge_nonce_sha256,
    device_signature_sha256: signatureDigest,
    proof_receipt_sha256: authorityDigest(`proof-receipt-${operation}-${suffix}`),
    issued_challenge_sha256: challenge.issued_challenge_sha256,
    activation_authorization_id: null,
    release_authority_sha256: null,
    lifecycle_challenge_id: challenge.lifecycle_challenge_id,
    request_id: requestId,
    event_id: eventId,
    idempotency_key: idempotencyKey,
    retire_intent_id: challenge.retire_intent_id,
    proof_issued_at: challenge.issued_at,
    proof_expires_at: challenge.valid_until,
  });
  const command = Object.freeze({
    installation_id: installationId,
    ...authority.principal,
    device_key_fingerprint: deviceKeyFingerprint,
    expected_state_version: expectedStateVersion,
    lifecycle_authorization_id: lifecycleAuthorizationId,
    lifecycle_challenge_id: challenge.lifecycle_challenge_id,
    issued_challenge_sha256: challenge.issued_challenge_sha256,
    proof_transcript_sha256: proofTranscript,
    request_id: requestId,
    event_id: eventId,
    idempotency_key: idempotencyKey,
    request_fingerprint: requestFingerprint,
    nonce_hash: challenge.challenge_nonce_sha256,
    device_signature_sha256: signatureDigest,
    issued_at: challenge.issued_at,
    expires_at: challenge.valid_until,
    ...(operation === "retire" ? {
      retire_intent_id: challenge.retire_intent_id,
      retire_reason: "device_disconnect",
    } : {}),
  });
  return Object.freeze({ authorization, challenge, command });
}

export async function authorizeLifecycle(
  authority,
  registered,
  operation,
  expectedStateVersion,
  suffix,
  options,
) {
  const prepared = await prepareLifecycleAuthorization(
    authority,
    registered,
    operation,
    expectedStateVersion,
    suffix,
    options,
  );
  await roleJsonCall(
    authority.verifierPool,
    authority.tenantId,
    "mint_outlook_desktop_lifecycle_verifier_receipt",
    prepared.authorization,
  );
  return prepared.command;
}
