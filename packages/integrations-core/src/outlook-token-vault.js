import { createHash, randomUUID } from "node:crypto";
import {
  assertOpaqueTokenRef,
  assertOperationalOutlookTokenVault,
  assertOutlookTokenVaultPort,
  createInMemoryOpaqueTokenVault,
  createTestOnlyInMemoryOpaqueTokenVault,
} from "./outlook-token-vault-port.js";
import {
  assertOperationalOutlookConsentRepository,
  assertOutlookConsentRepository,
  createDurableOutlookConsentRepository,
  createTestOutlookConsentRepository,
} from "./outlook-consent-repository.js";
import { createOutlookConsentTransitionCoordinator } from "./outlook-consent-transition.js";

export {
  assertOperationalOutlookConsentRepository,
  assertOperationalOutlookTokenVault,
  assertOpaqueTokenRef,
  createDurableOutlookConsentRepository,
  createInMemoryOpaqueTokenVault,
  createTestOnlyInMemoryOpaqueTokenVault,
  createTestOutlookConsentRepository,
};

export const OUTLOOK_PEOPLE_DELEGATED_SCOPE = "Calendars.ReadBasic";

function safeId(value, field) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,200}$/.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

function optionalId(value, field) {
  return value == null ? null : safeId(value, field);
}

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function scopeHash(scopes) {
  return `sha256:${createHash("sha256").update([...scopes].sort().join(" ")).digest("hex")}`;
}

function assertIso(value, field) {
  const result = String(value ?? "");
  if (!Number.isFinite(Date.parse(result))) throw new TypeError(`${field} must be an ISO timestamp`);
  return result;
}

function publicConsent(record) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    provider_identity_id: record.provider_identity_id,
    consent_ref: record.consent_ref,
    connection_state: record.connection_state,
    access_token_ref: record.access_token_ref,
    refresh_token_ref: record.refresh_token_ref,
    expires_at: record.expires_at,
    scope_hash: record.scope_hash,
    key_version: record.key_version,
    revoked_at: record.revoked_at,
    transition: record.pending_operation?.transition ?? null,
  });
}

export function createOutlookConsentService({
  vault,
  repository = createTestOutlookConsentRepository(),
  clock = () => new Date().toISOString(),
  operational = false,
} = {}) {
  const tokenVault = assertOutlookTokenVaultPort(vault, { operational });
  const consentRepository = assertOutlookConsentRepository(repository, { operational });
  const transitions = createOutlookConsentTransitionCoordinator({
    vault: tokenVault,
    repository: consentRepository,
    operationIdFactory: () => `outlook-op:${randomUUID()}`,
    clock,
  });

  return Object.freeze({
    grant(input = {}) {
      const tenantId = safeId(input.tenant_id, "tenant_id");
      const providerIdentityId = safeId(input.provider_identity_id, "provider_identity_id");
      const consentRef = safeId(input.consent_ref, "consent_ref");
      const scopes = Array.isArray(input.scopes) ? input.scopes : [];
      if (
        scopes.length !== 1
        || scopes[0] !== OUTLOOK_PEOPLE_DELEGATED_SCOPE
        || input.grant_type !== "delegated"
      ) {
        throw failure("OUTLOOK_SCOPE_NOT_ALLOWED", "Only delegated Calendars.ReadBasic is allowed");
      }
      if (typeof input.access_token !== "string" || input.access_token === "") {
        throw new TypeError("access_token is required");
      }
      if (typeof input.refresh_token !== "string" || input.refresh_token === "") {
        throw new TypeError("refresh_token is required");
      }
      if (transitions.recordExists(tenantId, consentRef)) {
        throw failure("OUTLOOK_CONSENT_ALREADY_EXISTS", "Outlook consent reference already exists");
      }
      const expiresAt = assertIso(input.expires_at, "expires_at");
      const keyVersion = safeId(input.key_version ?? "v1", "key_version");
      const occurredAt = assertIso(clock(), "clock");
      return publicConsent(transitions.execute({
        tenantId,
        consentRef,
        transition: "grant",
        previousRecord: null,
        creates: [
          {
            key: "access",
            kind: "outlook-access",
            value: input.access_token,
            key_version: keyVersion,
          },
          {
            key: "refresh",
            kind: "outlook-refresh",
            value: input.refresh_token,
            key_version: keyVersion,
          },
        ],
        revokeRefs: [],
        targetFromRefs: (refs) => ({
          tenant_id: tenantId,
          provider_identity_id: providerIdentityId,
          consent_ref: consentRef,
          connection_state: "active",
          access_token_ref: refs.access,
          refresh_token_ref: refs.refresh,
          expires_at: expiresAt,
          scope_hash: scopeHash(scopes),
          key_version: keyVersion,
          revoked_at: null,
        }),
        auditAction: "outlook.consent.granted",
        actorId: optionalId(input.actor_id, "actor_id"),
        occurredAt,
      }));
    },

    resolveCredential({ tenant_id, consent_ref, refresh } = {}) {
      const tenantId = safeId(tenant_id, "tenant_id");
      const consentRef = safeId(consent_ref, "consent_ref");
      let record = transitions.stableRecord(tenantId, consentRef);
      if (record.connection_state !== "active") {
        throw failure("OUTLOOK_CONSENT_REVOKED", "Outlook consent is revoked");
      }
      if (Date.parse(record.expires_at) <= Date.parse(String(clock()))) {
        if (typeof refresh !== "function") throw failure("OUTLOOK_TOKEN_EXPIRED", "Outlook token is expired");
        const refreshed = refresh({
          refresh_token: tokenVault.resolveForProvider({
            tenant_id: tenantId,
            ref: record.refresh_token_ref,
          }),
          consent_ref: consentRef,
        });
        const nextExpiresAt = assertIso(refreshed?.expires_at, "refreshed.expires_at");
        if (typeof refreshed?.access_token !== "string" || refreshed.access_token === "") {
          throw failure("OUTLOOK_REFRESH_FAILED", "Outlook refresh did not return an access token");
        }
        const creates = [{
          key: "access",
          kind: "outlook-access",
          value: refreshed.access_token,
          key_version: record.key_version,
        }];
        const revokeRefs = [record.access_token_ref];
        if (typeof refreshed.refresh_token === "string" && refreshed.refresh_token) {
          creates.push({
            key: "refresh",
            kind: "outlook-refresh",
            value: refreshed.refresh_token,
            key_version: record.key_version,
          });
          revokeRefs.push(record.refresh_token_ref);
        }
        const previous = record;
        record = transitions.execute({
          tenantId,
          consentRef,
          transition: "refresh",
          previousRecord: previous,
          creates,
          revokeRefs,
          targetFromRefs: (refs) => ({
            ...previous,
            access_token_ref: refs.access,
            refresh_token_ref: refs.refresh ?? previous.refresh_token_ref,
            expires_at: nextExpiresAt,
          }),
          auditAction: "outlook.consent.refreshed",
          actorId: null,
          occurredAt: assertIso(clock(), "clock"),
        });
      }
      return Object.freeze({
        credential_ref: record.access_token_ref,
        expires_at: record.expires_at,
        scope_hash: record.scope_hash,
      });
    },

    rotateKey({ tenant_id, consent_ref, key_version, actor_id = null } = {}) {
      const tenantId = safeId(tenant_id, "tenant_id");
      const consentRef = safeId(consent_ref, "consent_ref");
      const record = transitions.stableRecord(tenantId, consentRef);
      if (record.connection_state !== "active") {
        throw failure("OUTLOOK_CONSENT_REVOKED", "Outlook consent is revoked");
      }
      const keyVersion = safeId(key_version, "key_version");
      const rotated = transitions.execute({
        tenantId,
        consentRef,
        transition: "rotate",
        previousRecord: record,
        creates: [
          {
            key: "access",
            kind: "outlook-access",
            copy_ref: record.access_token_ref,
            key_version: keyVersion,
          },
          {
            key: "refresh",
            kind: "outlook-refresh",
            copy_ref: record.refresh_token_ref,
            key_version: keyVersion,
          },
        ],
        revokeRefs: [record.access_token_ref, record.refresh_token_ref],
        targetFromRefs: (refs) => ({
          ...record,
          access_token_ref: refs.access,
          refresh_token_ref: refs.refresh,
          key_version: keyVersion,
        }),
        auditAction: "outlook.consent.key_rotated",
        actorId: optionalId(actor_id, "actor_id"),
        occurredAt: assertIso(clock(), "clock"),
      });
      return publicConsent(rotated);
    },

    revoke({ tenant_id, consent_ref, actor_id = null } = {}) {
      const tenantId = safeId(tenant_id, "tenant_id");
      const consentRef = safeId(consent_ref, "consent_ref");
      const record = transitions.stableRecord(tenantId, consentRef);
      if (record.connection_state === "revoked") return publicConsent(record);
      const revokedAt = assertIso(clock(), "clock");
      const revoked = transitions.execute({
        tenantId,
        consentRef,
        transition: "revoke",
        previousRecord: record,
        creates: [],
        revokeRefs: [record.access_token_ref, record.refresh_token_ref],
        targetFromRefs: () => ({
          ...record,
          connection_state: "revoked",
          revoked_at: revokedAt,
        }),
        auditAction: "outlook.consent.revoked",
        actorId: optionalId(actor_id, "actor_id"),
        occurredAt: revokedAt,
      });
      return publicConsent(revoked);
    },

    resumePendingTransitions: transitions.recoverPendingTransitions,

    snapshot() {
      return Object.freeze(transitions.snapshotRecords().map(publicConsent));
    },

    auditSnapshot() {
      return Object.freeze(transitions.snapshotAudit().map((event) => Object.freeze(event)));
    },

    recoverySnapshot() {
      return Object.freeze(
        transitions.startupRecoveryFailures().map((entry) => Object.freeze(entry)),
      );
    },

    repositoryState() {
      return Object.freeze({
        durable: consentRepository.durable === true,
        test_only: consentRepository.test_only === true,
      });
    },
  });
}
