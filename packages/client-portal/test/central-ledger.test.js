import assert from "node:assert/strict";
import test from "node:test";
import { handlePortalPostgresApiRequest } from "../../../apps/api/src/portal-runtime-context.js";
import {
  PORTAL_APPEND_ONLY_RECORD_TYPES,
  PORTAL_DOMAIN_DESCRIPTOR,
  accessExternalSecureLink,
  consumeMagicLinkInvite,
  createClientPortalRepository,
  createExternalUser,
  createMagicLinkInvite,
  createPortalDomainSnapshot,
  createRfiRequest,
  createSecureLink,
  reconcilePortalRecords,
  revokeMagicLinkInvite,
  revokeSecureLink,
  runPortalPostgresCommand,
  submitExternalRfiResponse,
} from "../src/index.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";

const TENANT = "tenant-rs-dom-portal";
const MATTER = "matter-rs-dom-portal";
const ACTOR = "user-rs-dom-portal";
const EXTERNAL_USER = "external-user-rs-dom-portal";
const RFI = "rfi-rs-dom-portal";

function permissionContext() {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: TENANT,
      role_ids: ["partner"],
      scopes: ["portal.write"],
    },
    rules: [{ id: "allow-portal-rs-dom", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function createLink(repository, id, idempotencyKey) {
  return createSecureLink({
    repository,
    secure_link: {
      secure_link_id: id,
      tenant_id: TENANT,
      matter_id: MATTER,
      target_object_id: `document-${id}`,
      expires_at: "2999-01-01T00:00:00.000Z",
      dms_acl_inherited: true,
      watermark_enabled: true,
      external_share_boundary_checked: true,
      document_bytes: "must-not-persist",
      raw_payload: "must-not-persist",
      token: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
  });
}

function buildPortalSource() {
  const repository = createClientPortalRepository();
  createExternalUser({
    repository,
    external_user: {
      external_user_id: EXTERNAL_USER,
      tenant_id: TENANT,
      client_group_id: "client-group-rs-dom-portal",
      email: "rs-dom-portal@example.invalid",
    },
    actor_id: ACTOR,
    idempotency_key: "external-user-rs-dom-portal",
  });
  createRfiRequest({
    repository,
    rfi_request: {
      rfi_request_id: RFI,
      tenant_id: TENANT,
      matter_id: MATTER,
      external_user_id: EXTERNAL_USER,
      title: "Synthetic central-ledger RFI",
    },
    actor_id: ACTOR,
    idempotency_key: "rfi-rs-dom-portal",
  });

  const usedLink = createLink(repository, "secure-link-used-rs-dom-portal", "secure-link-used-rs-dom-portal");
  const usedInvite = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "invite-used-rs-dom-portal",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: RFI,
      secure_link_id: usedLink.secure_link.secure_link_id,
      expires_at: "2999-01-02T00:00:00.000Z",
      one_time_url: "must-not-persist",
      token: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "invite-used-rs-dom-portal",
    base_url: "https://portal.example.invalid/client",
  });
  const token = new URL(usedInvite.invite_delivery.one_time_url).searchParams.get("portal_invite");
  assert.ok(token);
  const consumed = consumeMagicLinkInvite({
    repository,
    token,
    now: "2026-07-16T00:00:00.000Z",
  });
  submitExternalRfiResponse({
    repository,
    external_session_id: consumed.external_session.external_session_id,
    rfi_response: {
      rfi_response_id: "rfi-response-rs-dom-portal",
      tenant_id: TENANT,
      rfi_request_id: RFI,
      dms_acl_inherited: true,
      malware_scan_passed: true,
      upload_name: "synthetic.pdf",
      document_bytes: "must-not-persist",
      raw_payload: "must-not-persist",
    },
    idempotency_key: "rfi-response-rs-dom-portal",
  });
  accessExternalSecureLink({
    repository,
    tenant_id: TENANT,
    secure_link_id: usedLink.secure_link.secure_link_id,
    external_session_id: consumed.external_session.external_session_id,
    now: "2026-07-16T00:00:00.000Z",
  });
  revokeSecureLink({
    repository,
    tenant_id: TENANT,
    secure_link_id: usedLink.secure_link.secure_link_id,
    actor_id: ACTOR,
    idempotency_key: "secure-link-revoke-rs-dom-portal",
  });

  const revocableLink = createLink(repository, "secure-link-active-rs-dom-portal", "secure-link-active-rs-dom-portal");
  const revocableInvite = createMagicLinkInvite({
    repository,
    invite: {
      invite_id: "invite-revoked-rs-dom-portal",
      tenant_id: TENANT,
      external_user_id: EXTERNAL_USER,
      matter_id: MATTER,
      rfi_request_id: RFI,
      secure_link_id: revocableLink.secure_link.secure_link_id,
      expires_at: "2999-01-02T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invite-revoked-rs-dom-portal",
  });
  revokeMagicLinkInvite({
    repository,
    tenant_id: TENANT,
    invite_id: revocableInvite.invite.invite_id,
    actor_id: ACTOR,
    idempotency_key: "invite-revoke-rs-dom-portal",
  });
  return { repository, token };
}

test("Portal domain snapshot preserves invite, secure-link, revocation, audit, and secret boundaries", () => {
  const { repository, token } = buildPortalSource();
  try {
    const source = createPortalDomainSnapshot({
      repositories: [{ source_id: "portal-file-v2", repository }],
      tenant_id: TENANT,
    });
    assert.equal(source.inventory.reconciliation.used_invite_count, 1);
    assert.equal(source.inventory.reconciliation.revoked_invite_count, 1);
    assert.equal(source.inventory.reconciliation.active_secure_link_count, 1);
    assert.equal(source.inventory.reconciliation.revoked_secure_link_count, 1);
    assert.equal(source.inventory.reconciliation.external_session_count, 1);
    assert.equal(source.inventory.reconciliation.rfi_response_count, 1);
    assert.equal(source.inventory.reconciliation.invariant_passed, true);
    assert.deepEqual(source.inventory.append_only_record_types, PORTAL_APPEND_ONLY_RECORD_TYPES);
    const serialized = JSON.stringify(source.snapshot);
    assert.equal(serialized.includes(token), false);
    assert.equal(serialized.includes("must-not-persist"), false);
    assert.ok(source.snapshot.audit_events.some((event) => event.event_type === "portal.magic_link_invite.consume"));
    assert.ok(source.snapshot.audit_events.some((event) => event.event_type === "portal.secure_link.revoke"));

    const tamperedRecords = repository.snapshot().records.map((record) => structuredClone(record));
    tamperedRecords.find((record) => record.model_type === "PortalMagicLinkInvite").token = "plaintext-token";
    assert.throws(
      () => reconcilePortalRecords(tamperedRecords),
      (error) => error?.safe_error_code === "PORTAL_PERSISTED_SECRET_REJECTED",
    );

    const tamperedRepository = createClientPortalRepository({
      seedRecords: repository.snapshot().records,
      preserveSeedRecords: true,
    });
    tamperedRepository.recordIdempotency({
      tenant_id: TENANT,
      idempotency_key: "tampered-idempotency-rs-dom-portal",
      operation: "tampered",
      response: { token: "plaintext-token" },
    });
    assert.throws(
      () => createPortalDomainSnapshot({ repositories: [tamperedRepository], tenant_id: TENANT }),
      (error) => error?.safe_error_code === "PORTAL_PERSISTED_SECRET_REJECTED",
    );
    tamperedRepository.close();
  } finally {
    repository.close();
  }
});

test("Portal PostgreSQL import, async API, append-only guard, shadow, and rehearsal preserve invariants", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T22:00:00.000Z"),
  });
  const { repository } = buildPortalSource();
  const source = createPortalDomainSnapshot({
    repositories: [{ source_id: "portal-file-v2", repository }],
    tenant_id: TENANT,
  });
  repository.close();

  const imported = await ledger.importSnapshot(source.snapshot);
  assert.equal(imported.replayed, false);
  assert.equal(imported.receipt.rejected_count, 0);
  const secondImport = await ledger.importSnapshot(source.snapshot);
  assert.equal(secondImport.replayed, true);
  const shadow = await ledger.compareSnapshot(source.snapshot);
  assert.equal(shadow.comparison.equal, true);

  const link = await handlePortalPostgresApiRequest({
    ledger,
    pathname: "/api/portal/secure-links",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-rs-dom-portal",
      audit_hint_ref: "audit-rs-dom-portal",
      actor_id: ACTOR,
      idempotency_key: "api-secure-link-rs-dom-portal",
      secure_link: {
        secure_link_id: "api-secure-link-rs-dom-portal",
        tenant_id: TENANT,
        matter_id: MATTER,
        target_object_id: "document-api-rs-dom-portal",
        expires_at: "2999-01-01T00:00:00.000Z",
        dms_acl_inherited: true,
        watermark_enabled: true,
        external_share_boundary_checked: true,
        document_bytes: "must-not-persist",
      },
    },
    context: permissionContext(),
    requestId: "request-secure-link-rs-dom-portal",
  });
  assert.equal(link.response.status, 201);
  assert.equal(link.persistence.shadow_equal, true);
  assert.equal(link.persistence.production_migrated, false);

  const invite = await handlePortalPostgresApiRequest({
    ledger,
    pathname: "/api/portal/invites",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-rs-dom-portal",
      audit_hint_ref: "audit-rs-dom-portal",
      actor_id: ACTOR,
      idempotency_key: "api-invite-rs-dom-portal",
      base_url: "https://portal.example.invalid/client",
      invite: {
        invite_id: "api-invite-rs-dom-portal",
        tenant_id: TENANT,
        external_user_id: EXTERNAL_USER,
        matter_id: MATTER,
        rfi_request_id: RFI,
        secure_link_id: "api-secure-link-rs-dom-portal",
        expires_at: "2999-01-02T00:00:00.000Z",
        token: "must-not-persist",
      },
    },
    context: permissionContext(),
    requestId: "request-invite-rs-dom-portal",
  });
  assert.equal(invite.response.status, 201);
  const token = new URL(invite.response.body.invite_delivery.one_time_url).searchParams.get("portal_invite");
  assert.ok(token);

  const consumed = await handlePortalPostgresApiRequest({
    ledger,
    pathname: "/api/portal/invites/consume",
    method: "POST",
    query: {},
    body: { tenant_id: TENANT, token, now: "2026-07-16T00:00:00.000Z" },
    context: permissionContext(),
    requestId: "request-consume-rs-dom-portal",
  });
  assert.equal(consumed.response.status, 200);
  assert.equal(consumed.response.body.item.status, "active");
  assert.equal(consumed.persistence.shadow_equal, true);

  const revoked = await handlePortalPostgresApiRequest({
    ledger,
    pathname: "/api/portal/secure-links/api-secure-link-rs-dom-portal/revoke",
    method: "POST",
    query: {},
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-rs-dom-portal",
      audit_hint_ref: "audit-rs-dom-portal",
      actor_id: ACTOR,
      idempotency_key: "api-secure-link-revoke-rs-dom-portal",
    },
    context: permissionContext(),
    requestId: "request-revoke-rs-dom-portal",
  });
  assert.equal(revoked.response.status, 201);
  assert.equal(revoked.response.body.item.status, "revoked");

  await assert.rejects(
    runPortalPostgresCommand({
      ledger,
      tenant_id: TENANT,
      command(materializedRepository) {
        return materializedRepository.update(
          { tenant_id: TENANT, model_type: "RfiResponse", rfi_response_id: "rfi-response-rs-dom-portal" },
          { status: "tampered" },
        );
      },
    }),
  );

  const targetRecords = await ledger.list({ tenant_id: TENANT, domain_id: PORTAL_DOMAIN_DESCRIPTOR.domain_id });
  const reconciliation = reconcilePortalRecords(targetRecords.map((record) => record.payload));
  assert.equal(reconciliation.used_invite_count, 2);
  assert.equal(reconciliation.revoked_secure_link_count, 2);
  assert.equal(reconciliation.invariant_passed, true);
  assert.equal(JSON.stringify(targetRecords).includes("must-not-persist"), false);

  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: PORTAL_DOMAIN_DESCRIPTOR.domain_id,
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      adapter: "portal-postgres-domain-ledger",
      source_import_equal: true,
      async_api_command_equal: consumed.persistence.shadow_equal,
      revocation_preserved: revoked.response.body.item.status === "revoked",
      portal_invariant_hash: reconciliation.invariant_hash,
      production_migrated: false,
    },
  });
  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source: source.snapshot, imported, secondImport, shadow, rehearsal });
});
