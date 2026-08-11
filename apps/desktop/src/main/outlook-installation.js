import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPair,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

import {
  OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS,
  outlookDesktopPublicKeyFingerprint,
  signOutlookDesktopLifecycleRequest,
} from "../../../../packages/email-dms/src/outlook-desktop-installation-proof.js";

const ENVELOPE_SCHEMA =
  "lawos.outlook-desktop-installation-secure-store.v1";
const PAYLOAD_SCHEMA =
  "lawos.outlook-desktop-installation-identities.v1";
const IDENTITY_SCHEMA =
  "lawos.outlook-desktop-installation-identity.v1";
const PRINCIPAL_DOMAIN = "lawos.outlook-desktop-principal.v1";
const MAX_SECURE_FILE_BYTES = 1024 * 1024;
const INSTALLATION_ID_PATTERN = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const PRINCIPAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/u;
const APP_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/u;
const SOURCE_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const RETIRE_REASON_PATTERN = /^[a-z][a-z0-9_:-]{0,99}$/u;
const PRINCIPAL_REF_PATTERN = /^odpr_[A-Za-z0-9_-]{43}$/u;
const PUBLIC_SAFE_ERROR_CODE_PATTERN =
  /^(?:AUTH_[A-Z0-9_]+|M365_[A-Z0-9_]+|OUTLOOK_DESKTOP_[A-Z0-9_]+)$/u;
const AUTHORITATIVE_RECONCILIATION_ERRORS = new Set([
  "OUTLOOK_DESKTOP_INSTALLATION_RETIRED",
  "OUTLOOK_DESKTOP_PROOF_FRESHNESS_INVALID",
  "OUTLOOK_DESKTOP_STATE_VERSION_CONFLICT",
]);
const DEFAULT_HEARTBEAT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([5_000, 30_000, 120_000]);
const BUILD_MANIFEST_SCHEMA =
  "law-firm-os.matter-desktop-build-provenance.v1";

function identityError(code, reason, status = 400) {
  return Object.assign(new Error(reason), {
    safe_error_code: code,
    reason,
    status,
  });
}

function invalid(code, reason, status) {
  throw identityError(code, reason, status);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, expected) {
  return isPlainObject(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...expected].sort());
}

function canonicalBase64(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("base64_value_required");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0 || decoded.toString("base64") !== value) {
    throw new TypeError("base64_value_noncanonical");
  }
  return decoded;
}

function normalizePrincipal(principal) {
  if (PRINCIPAL_REF_PATTERN.test(principal?.principal_ref ?? "")) {
    return Object.freeze({ principal_ref: principal.principal_ref });
  }
  const normalized = {
    tenant_id: principal?.tenant_id,
    user_id: principal?.user_id,
    entra_subject_id: principal?.entra_subject_id,
  };
  if (Object.values(normalized).some((value) => (
    typeof value !== "string" || !PRINCIPAL_ID_PATTERN.test(value)
  ))) {
    invalid(
      "OUTLOOK_DESKTOP_IDENTITY_PRINCIPAL_INVALID",
      "outlook_desktop_identity_principal_invalid",
      403,
    );
  }
  return Object.freeze(normalized);
}

function principalBinding(principal) {
  const normalized = normalizePrincipal(principal);
  if (normalized.principal_ref) {
    return createHash("sha256")
      .update(JSON.stringify([PRINCIPAL_DOMAIN, normalized.principal_ref]))
      .digest("hex");
  }
  return createHash("sha256")
    .update(JSON.stringify([
      PRINCIPAL_DOMAIN,
      normalized.tenant_id,
      normalized.user_id,
      normalized.entra_subject_id,
    ]))
    .digest("hex");
}

function validateIdentityRecord(record, binding) {
  if (!exactFields(record, [
    "schema_version",
    "principal_binding",
    "device_public_key",
    "private_key_pkcs8",
    "device_key_fingerprint",
    "installation_id",
    "state_version",
  ])) {
    throw new TypeError("identity_record_invalid");
  }
  if (
    record.schema_version !== IDENTITY_SCHEMA
    || record.principal_binding !== binding
  ) {
    throw new TypeError("identity_binding_invalid");
  }
  if (
    record.installation_id !== null
    && !INSTALLATION_ID_PATTERN.test(record.installation_id)
  ) {
    throw new TypeError("installation_id_invalid");
  }
  if (
    record.state_version !== null
    && (!Number.isSafeInteger(record.state_version) || record.state_version < 1)
  ) {
    throw new TypeError("state_version_invalid");
  }
  if ((record.installation_id === null) !== (record.state_version === null)) {
    throw new TypeError("identity_registration_state_invalid");
  }

  const privateKey = createPrivateKey({
    key: canonicalBase64(record.private_key_pkcs8),
    format: "der",
    type: "pkcs8",
  });
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new TypeError("identity_private_key_invalid");
  }
  const derivedPublicKey = createPublicKey(privateKey)
    .export({ format: "der", type: "spki" })
    .toString("base64");
  if (derivedPublicKey !== record.device_public_key) {
    throw new TypeError("identity_key_pair_mismatch");
  }
  if (
    outlookDesktopPublicKeyFingerprint(record.device_public_key)
      !== record.device_key_fingerprint
  ) {
    throw new TypeError("identity_key_fingerprint_mismatch");
  }
  return Object.freeze({ record, privateKey });
}

function publicIdentity(record) {
  return Object.freeze({
    state: record.installation_id === null ? "candidate" : "registered",
    installation_id: record.installation_id,
    state_version: record.state_version,
    device_public_key: record.device_public_key,
    device_key_fingerprint: record.device_key_fingerprint,
    token_material_returned: false,
    private_key_material_returned: false,
  });
}

function generateEd25519KeyPair() {
  return new Promise((resolve, reject) => {
    generateKeyPair("ed25519", {
      publicKeyEncoding: { format: "der", type: "spki" },
      privateKeyEncoding: { format: "der", type: "pkcs8" },
    }, (error, publicKey, privateKey) => {
      if (error) reject(error);
      else resolve({ publicKey, privateKey });
    });
  });
}

async function createIdentityRecord(binding) {
  const { publicKey, privateKey } = await generateEd25519KeyPair();
  const devicePublicKey = publicKey.toString("base64");
  return Object.freeze({
    schema_version: IDENTITY_SCHEMA,
    principal_binding: binding,
    device_public_key: devicePublicKey,
    private_key_pkcs8: privateKey.toString("base64"),
    device_key_fingerprint:
      outlookDesktopPublicKeyFingerprint(devicePublicKey),
    installation_id: null,
    state_version: null,
  });
}

function assertProofFields(input) {
  if (!isPlainObject(input)) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_PROOF_INVALID",
      "outlook_desktop_installation_proof_invalid",
    );
  }
  return {
    idempotency_key: input.idempotency_key,
    nonce: input.nonce,
    issued_at: input.issued_at,
    expires_at: input.expires_at,
  };
}

function signRequest(record, request, responseBody) {
  const privateKey = createPrivateKey({
    key: Buffer.from(record.private_key_pkcs8, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return Object.freeze({
    ...responseBody,
    signature: signOutlookDesktopLifecycleRequest(request, privateKey),
  });
}

function registeredRecord(payload, binding) {
  const record = payload.entries[binding];
  if (!record || record.installation_id === null) {
    invalid(
      "OUTLOOK_DESKTOP_INSTALLATION_IDENTITY_REQUIRED",
      "outlook_desktop_installation_identity_required",
      409,
    );
  }
  return record;
}

export function projectOutlookInstallationIdentity(identity) {
  return Object.freeze({
    state: identity?.state === "registered" ? "registered" : "candidate",
    registered: identity?.state === "registered",
    token_material_returned: false,
    private_key_material_returned: false,
  });
}

export function createOutlookInstallationIdentityStore({
  filePath,
  safeStorage,
  platform = process.platform,
} = {}) {
  if (typeof filePath !== "string" || !isAbsolute(filePath)) {
    throw new TypeError("absolute outlook installation identity path required");
  }

  let operationTail = Promise.resolve();
  const serialized = (operation) => {
    const current = operationTail.then(operation, operation);
    operationTail = current.catch(() => undefined);
    return current;
  };

  const assertSafeStorage = (operation) => {
    let available = false;
    try {
      available = Boolean(
        ["darwin", "win32"].includes(platform)
        && safeStorage?.isEncryptionAvailable?.()
        && typeof safeStorage?.decryptString === "function"
        && (operation !== "encrypt"
          || typeof safeStorage?.encryptString === "function"),
      );
    } catch {
      available = false;
    }
    if (!available) {
      invalid(
        "OUTLOOK_DESKTOP_SECURE_STORAGE_UNAVAILABLE",
        "outlook_desktop_secure_storage_unavailable",
        503,
      );
    }
  };

  const freshPayload = () => ({
    schema_version: PAYLOAD_SCHEMA,
    entries: Object.create(null),
  });

  const load = async () => {
    assertSafeStorage("decrypt");
    let raw;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return freshPayload();
      throw identityError(
        "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
        "outlook_desktop_secure_identity_unavailable",
        503,
      );
    }
    try {
      if (Buffer.byteLength(raw, "utf8") > MAX_SECURE_FILE_BYTES) {
        throw new TypeError("identity_file_too_large");
      }
      const envelope = JSON.parse(raw);
      if (
        !exactFields(envelope, ["schema_version", "ciphertext"])
        || envelope.schema_version !== ENVELOPE_SCHEMA
      ) {
        throw new TypeError("identity_envelope_invalid");
      }
      const decrypted = safeStorage.decryptString(
        canonicalBase64(envelope.ciphertext),
      );
      const payload = JSON.parse(decrypted);
      if (
        !exactFields(payload, ["schema_version", "entries"])
        || payload.schema_version !== PAYLOAD_SCHEMA
        || !isPlainObject(payload.entries)
      ) {
        throw new TypeError("identity_payload_invalid");
      }
      const entries = Object.create(null);
      for (const [binding, record] of Object.entries(payload.entries)) {
        if (!/^[a-f0-9]{64}$/u.test(binding)) {
          throw new TypeError("identity_partition_invalid");
        }
        validateIdentityRecord(record, binding);
        entries[binding] = record;
      }
      return { schema_version: PAYLOAD_SCHEMA, entries };
    } catch {
      throw identityError(
        "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
        "outlook_desktop_secure_identity_unavailable",
        503,
      );
    }
  };

  const persist = async (payload) => {
    assertSafeStorage("encrypt");
    if (Object.keys(payload.entries).length === 0) {
      try {
        await unlink(filePath);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw identityError(
            "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
            "outlook_desktop_secure_identity_unavailable",
            503,
          );
        }
      }
      return;
    }

    let encrypted;
    try {
      encrypted = Buffer.from(safeStorage.encryptString(JSON.stringify({
        schema_version: PAYLOAD_SCHEMA,
        entries: payload.entries,
      }))).toString("base64");
    } catch {
      throw identityError(
        "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
        "outlook_desktop_secure_identity_unavailable",
        503,
      );
    }

    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
      await writeFile(temporaryPath, JSON.stringify({
        schema_version: ENVELOPE_SCHEMA,
        ciphertext: encrypted,
      }), { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporaryPath, filePath);
    } catch {
      try {
        await unlink(temporaryPath);
      } catch {
        // The temporary file either never existed or was already renamed.
      }
      throw identityError(
        "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
        "outlook_desktop_secure_identity_unavailable",
        503,
      );
    }
  };

  const getOrCreateRecord = async (payload, binding) => {
    if (payload.entries[binding]) return payload.entries[binding];
    const record = await createIdentityRecord(binding);
    payload.entries[binding] = record;
    await persist(payload);
    return record;
  };

  return Object.freeze({
    getOrCreate(principal) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        const payload = await load();
        return publicIdentity(await getOrCreateRecord(payload, binding));
      });
    },

    markRegistered(principal, { installation_id: installationId, state_version: stateVersion } = {}) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        if (
          !INSTALLATION_ID_PATTERN.test(installationId ?? "")
          || !Number.isSafeInteger(stateVersion)
          || stateVersion < 1
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_RESPONSE_INVALID",
            "outlook_desktop_installation_response_invalid",
          );
        }
        const payload = await load();
        const record = payload.entries[binding];
        if (!record) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_IDENTITY_REQUIRED",
            "outlook_desktop_installation_identity_required",
            409,
          );
        }
        if (
          (record.installation_id !== null
            && record.installation_id !== installationId)
          || (record.state_version !== null
            && stateVersion < record.state_version)
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_BINDING_CONFLICT",
            "outlook_desktop_installation_binding_conflict",
            409,
          );
        }
        const updated = Object.freeze({
          ...record,
          installation_id: installationId,
          state_version: stateVersion,
        });
        validateIdentityRecord(updated, binding);
        payload.entries[binding] = updated;
        await persist(payload);
        return publicIdentity(updated);
      });
    },

    confirmRetire(principal, { installation_id: installationId } = {}) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        const payload = await load();
        const record = registeredRecord(payload, binding);
        if (record.installation_id !== installationId) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_BINDING_CONFLICT",
            "outlook_desktop_installation_binding_conflict",
            409,
          );
        }
        delete payload.entries[binding];
        await persist(payload);
        return Object.freeze({
          removed: true,
          identity_material_removed: true,
          token_material_returned: false,
        });
      });
    },

    signRegistration(principal, input = {}) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        if (
          input.platform !== platform
          || !APP_VERSION_PATTERN.test(input.app_version ?? "")
          || !SOURCE_SHA_PATTERN.test(input.source_sha ?? "")
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_METADATA_INVALID",
            "outlook_desktop_installation_metadata_invalid",
          );
        }
        const proof = assertProofFields(input);
        const payload = await load();
        const record = await getOrCreateRecord(payload, binding);
        if (record.installation_id !== null) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_ALREADY_REGISTERED",
            "outlook_desktop_installation_already_registered",
            409,
          );
        }
        const body = Object.freeze({
          platform,
          app_version: input.app_version,
          source_sha: input.source_sha,
          device_public_key: record.device_public_key,
        });
        const request = Object.freeze({
          method: "POST",
          path: "/api/desktop/installations",
          body,
          installation_id: "NEW",
          ...proof,
        });
        return signRequest(record, request, { ...body, ...proof });
      });
    },

    signHeartbeat(principal, input = {}) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        if (
          !Number.isSafeInteger(input.expected_state_version)
          || input.expected_state_version < 1
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_STATE_VERSION_INVALID",
            "outlook_desktop_installation_state_version_invalid",
          );
        }
        const proof = assertProofFields(input);
        const payload = await load();
        const record = registeredRecord(payload, binding);
        const body = Object.freeze({
          expected_state_version: input.expected_state_version,
        });
        const path = `/api/desktop/installations/${record.installation_id}/heartbeat`;
        const request = Object.freeze({
          method: "POST",
          path,
          body,
          installation_id: record.installation_id,
          ...proof,
        });
        return signRequest(record, request, { ...body, ...proof });
      });
    },

    signRetire(principal, input = {}) {
      return serialized(async () => {
        const binding = principalBinding(principal);
        if (
          !Number.isSafeInteger(input.expected_state_version)
          || input.expected_state_version < 1
          || !RETIRE_REASON_PATTERN.test(input.retire_reason ?? "")
        ) {
          invalid(
            "OUTLOOK_DESKTOP_INSTALLATION_RETIRE_INVALID",
            "outlook_desktop_installation_retire_invalid",
          );
        }
        const proof = assertProofFields(input);
        const payload = await load();
        const record = registeredRecord(payload, binding);
        const body = Object.freeze({
          expected_state_version: input.expected_state_version,
          retire_reason: input.retire_reason,
        });
        const path = `/api/desktop/installations/${record.installation_id}/retire`;
        const request = Object.freeze({
          method: "POST",
          path,
          body,
          installation_id: record.installation_id,
          ...proof,
        });
        return signRequest(record, request, { ...body, ...proof });
      });
    },
  });
}

function lifecycleStatus({
  state = "idle",
  nextAction = null,
  browserRequired = false,
  safeErrorCodes = [],
  retryScheduled = false,
} = {}) {
  return Object.freeze({
    state,
    next_action: nextAction,
    browser_required: browserRequired === true,
    safe_error_codes: Object.freeze([...new Set(safeErrorCodes)]
      .filter((code) => PUBLIC_SAFE_ERROR_CODE_PATTERN.test(code))
      .slice(0, 8)),
    retry_scheduled: retryScheduled === true,
    token_material_returned: false,
    private_key_material_returned: false,
    production_ready_claim: false,
  });
}

function validBuildIdentity(value) {
  return Boolean(
    isPlainObject(value)
      && ["darwin", "win32"].includes(value.platform)
      && APP_VERSION_PATTERN.test(value.app_version ?? "")
      && SOURCE_SHA_PATTERN.test(value.source_sha ?? ""),
  );
}

export async function readOutlookDesktopBuildIdentity({
  manifestPath,
  platform = process.platform,
  appVersion,
} = {}) {
  if (typeof manifestPath !== "string" || !isAbsolute(manifestPath)) {
    return null;
  }
  try {
    const raw = await readFile(manifestPath, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_SECURE_FILE_BYTES) return null;
    const manifest = JSON.parse(raw);
    if (
      !isPlainObject(manifest)
      || manifest.schema_version !== BUILD_MANIFEST_SCHEMA
      || manifest.package_name !== "@law-firm-os/desktop"
      || manifest.platform !== platform
      || manifest.version !== appVersion
      || manifest.source_dirty !== false
      || !SOURCE_SHA_PATTERN.test(manifest.source_sha ?? "")
    ) return null;
    return Object.freeze({
      platform,
      app_version: appVersion,
      source_sha: manifest.source_sha,
    });
  } catch {
    return null;
  }
}

function responseStatus(value) {
  return Number(value?.http_status ?? value?.status ?? 0);
}

function responseBody(value) {
  return isPlainObject(value?.body) ? value.body : null;
}

function responseSafeErrorCodes(value) {
  const body = responseBody(value);
  return [
    ...(Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : []),
    body?.safe_error_code,
  ].filter((code) => typeof code === "string");
}

function transientLifecycleFailure(value) {
  const status = responseStatus(value);
  return status === 0 || status === 429 || status >= 500;
}

function boundedInstallationResponse(value) {
  const status = responseStatus(value);
  const body = responseBody(value);
  const installation = body?.installation;
  if (
    ![200, 201].includes(status)
    || !isPlainObject(installation)
    || !INSTALLATION_ID_PATTERN.test(installation.installation_id ?? "")
    || !Number.isSafeInteger(installation.state_version)
    || installation.state_version < 1
  ) return null;
  return Object.freeze({
    outcome: body.outcome,
    installation_id: installation.installation_id,
    state_version: installation.state_version,
  });
}

function boundedRetireResponse(value, installationId) {
  const result = boundedInstallationResponse(value);
  const installation = responseBody(value)?.installation;
  if (
    !result
    || result.installation_id !== installationId
    || !["retired", "already_retired"].includes(result.outcome)
    || installation?.status !== "retired"
    || typeof installation.retired_at !== "string"
    || !Number.isFinite(Date.parse(installation.retired_at))
  ) return null;
  return result;
}

function boundedInstallationReadResponse(value, installationId) {
  const body = responseBody(value);
  const installation = body?.installation;
  if (
    responseStatus(value) !== 200
    || body?.outcome !== "read"
    || !isPlainObject(installation)
    || installation.installation_id !== installationId
    || !new Set(["active", "expired", "retired"]).has(installation.status)
    || !Number.isSafeInteger(installation.state_version)
    || installation.state_version < 1
    || typeof installation.lease_expires_at !== "string"
    || !Number.isFinite(Date.parse(installation.lease_expires_at))
    || !(
      installation.retired_at === null
      || (
        typeof installation.retired_at === "string"
        && Number.isFinite(Date.parse(installation.retired_at))
      )
    )
    || (installation.status === "retired") !== (installation.retired_at !== null)
  ) return null;
  return Object.freeze({
    installation_id: installation.installation_id,
    status: installation.status,
    state_version: installation.state_version,
    lease_expires_at: installation.lease_expires_at,
    retired_at: installation.retired_at,
  });
}

function requiresAuthoritativeReconciliation(value) {
  const status = responseStatus(value);
  if (![401, 409].includes(status)) return false;
  return responseSafeErrorCodes(value).some((code) => (
    AUTHORITATIVE_RECONCILIATION_ERRORS.has(code)
  ));
}

function boundedReadinessResponse(value) {
  const body = responseBody(value);
  const item = body?.item;
  if (
    responseStatus(value) !== 200
    || body?.outcome !== "passed"
    || !isPlainObject(item)
    || typeof item.next_action !== "string"
    || typeof item.browser_required !== "boolean"
    || !Array.isArray(item.safe_error_codes)
  ) return null;
  return Object.freeze({
    next_action: item.next_action,
    browser_required: item.browser_required,
    safe_error_codes: Object.freeze(item.safe_error_codes
      .filter((code) => typeof code === "string")),
  });
}

function readinessStatus(readiness) {
  const common = {
    nextAction: readiness.next_action,
    browserRequired: readiness.browser_required,
    safeErrorCodes: readiness.safe_error_codes,
  };
  if (readiness.next_action === "none" && !readiness.browser_required) {
    return lifecycleStatus({ state: "ready", ...common });
  }
  if (
    readiness.next_action === "confirm_microsoft"
    && readiness.browser_required
    && readiness.safe_error_codes.includes("M365_INTERACTION_REQUIRED")
  ) {
    return lifecycleStatus({ state: "interaction_required", ...common });
  }
  if (readiness.next_action === "relaunch_outlook") {
    return lifecycleStatus({ state: "propagation_pending", ...common });
  }
  if (["contact_admin", "sign_in"].includes(readiness.next_action)) {
    return lifecycleStatus({ state: "blocked", ...common });
  }
  return lifecycleStatus({ state: "unknown", ...common });
}

function proofEnvelope({ now, randomBytesFn, counter, operation }) {
  const issuedAt = new Date(now);
  if (!Number.isFinite(issuedAt.getTime())) {
    throw new TypeError("outlook desktop lifecycle clock is invalid");
  }
  const entropy = Buffer.from(randomBytesFn(24));
  if (entropy.length !== 24) {
    throw new TypeError("outlook desktop lifecycle entropy is invalid");
  }
  const nonce = createHash("sha256")
    .update(entropy)
    .update(String(counter))
    .digest()
    .subarray(0, 24)
    .toString("base64url");
  return Object.freeze({
    idempotency_key:
      `outlook-desktop-${operation}-${counter}-${entropy.toString("base64url")}`,
    nonce,
    issued_at: issuedAt.toISOString(),
    expires_at: new Date(
      issuedAt.getTime() + OUTLOOK_DESKTOP_PROOF_MAX_LIFETIME_MS,
    ).toISOString(),
  });
}

export function createOutlookInstallationLifecycleCoordinator({
  identityStore,
  requestApi,
  buildIdentity,
  now = () => Date.now(),
  randomBytesFn = randomBytes,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  onInteractionRequired = null,
} = {}) {
  if (
    !identityStore
    || typeof identityStore.getOrCreate !== "function"
    || typeof identityStore.markRegistered !== "function"
    || typeof identityStore.confirmRetire !== "function"
    || typeof identityStore.signRegistration !== "function"
    || typeof identityStore.signHeartbeat !== "function"
    || typeof identityStore.signRetire !== "function"
  ) {
    throw new TypeError("outlook installation identity store is required");
  }
  if (typeof requestApi !== "function") {
    throw new TypeError("outlook installation request API is required");
  }
  const safeRetryDelays = Array.isArray(retryDelaysMs)
    ? retryDelaysMs.filter((delay) => (
      Number.isSafeInteger(delay) && delay >= 0 && delay <= 10 * 60 * 1000
    )).slice(0, 5)
    : [];
  if (
    !Number.isSafeInteger(heartbeatIntervalMs)
    || heartbeatIntervalMs < 60_000
  ) {
    throw new TypeError("outlook installation heartbeat interval is invalid");
  }

  let generation = 0;
  let requestCounter = 0;
  let principal = null;
  let scheduledTimer = null;
  let lastReadiness = null;
  let currentIdentity = null;
  let pendingLifecycleWrite = null;
  let pendingRetire = null;
  let currentStatus = lifecycleStatus();
  let operationTail = Promise.resolve();

  const clearScheduledTimer = () => {
    if (scheduledTimer !== null) {
      clearTimeoutImpl(scheduledTimer);
      scheduledTimer = null;
    }
  };

  const schedule = (callback, delay, expectedGeneration) => {
    clearScheduledTimer();
    scheduledTimer = setTimeoutImpl(async () => {
      scheduledTimer = null;
      if (expectedGeneration !== generation || !principal) {
        return currentStatus;
      }
      return callback();
    }, delay);
    scheduledTimer?.unref?.();
  };

  const proof = (operation) => proofEnvelope({
    now: now(),
    randomBytesFn,
    counter: ++requestCounter,
    operation,
  });

  const request = async (input) => {
    try {
      return await requestApi(input);
    } catch {
      return Object.freeze({
        http_status: 0,
        body: Object.freeze({
          outcome: "blocked",
          safe_error_codes: Object.freeze([
            "OUTLOOK_DESKTOP_RUNTIME_UNAVAILABLE",
          ]),
        }),
      });
    }
  };

  const clearPendingForInstallation = (expectedPrincipal, installationId) => {
    if (
      pendingLifecycleWrite?.principal_ref === expectedPrincipal.principal_ref
      && pendingLifecycleWrite.installation_id === installationId
    ) {
      pendingLifecycleWrite = null;
    }
    if (
      pendingRetire?.principal_ref === expectedPrincipal.principal_ref
      && pendingRetire.installation_id === installationId
    ) {
      pendingRetire = null;
    }
  };

  const reconcileInstallation = async (identity, expectedPrincipal) => {
    const response = await request({
      path: `/api/desktop/installations/${identity.installation_id}`,
      method: "GET",
    });
    const installation = boundedInstallationReadResponse(
      response,
      identity.installation_id,
    );
    if (!installation) {
      return Object.freeze({
        ok: false,
        response,
        safe_error_codes: Object.freeze(responseSafeErrorCodes(response)),
      });
    }
    clearPendingForInstallation(expectedPrincipal, identity.installation_id);
    if (installation.status === "retired") {
      return Object.freeze({
        ok: true,
        terminal: true,
        installation,
      });
    }
    try {
      const updated = await identityStore.markRegistered(expectedPrincipal, {
        installation_id: installation.installation_id,
        state_version: installation.state_version,
      });
      return Object.freeze({
        ok: true,
        terminal: false,
        installation,
        identity: updated,
      });
    } catch (error) {
      return Object.freeze({
        ok: false,
        response: Object.freeze({ http_status: Number(error?.status ?? 0) }),
        safe_error_codes: Object.freeze([
          PUBLIC_SAFE_ERROR_CODE_PATTERN.test(error?.safe_error_code ?? "")
            ? error.safe_error_code
            : "OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE",
        ]),
      });
    }
  };

  const lifecycleWrite = async (
    identity,
    expectedPrincipal,
    allowRekey,
    allowReconcile = true,
  ) => {
    const operation = identity.state === "candidate" ? "register" : "heartbeat";
    const pendingMatches = pendingLifecycleWrite
      && pendingLifecycleWrite.principal_ref === expectedPrincipal.principal_ref
      && pendingLifecycleWrite.operation === operation
      && pendingLifecycleWrite.installation_id === identity.installation_id
      && pendingLifecycleWrite.state_version === identity.state_version;
    if (!pendingMatches) {
      let signed;
      let path;
      if (identity.state === "candidate") {
        signed = await identityStore.signRegistration(expectedPrincipal, {
          ...buildIdentity,
          ...proof("register"),
        });
        path = "/api/desktop/installations";
      } else {
        signed = await identityStore.signHeartbeat(expectedPrincipal, {
          expected_state_version: identity.state_version,
          ...proof("heartbeat"),
        });
        path = `/api/desktop/installations/${identity.installation_id}/heartbeat`;
      }
      pendingLifecycleWrite = Object.freeze({
        principal_ref: expectedPrincipal.principal_ref,
        operation,
        installation_id: identity.installation_id,
        state_version: identity.state_version,
        request: Object.freeze({
          path,
          method: "POST",
          body: JSON.stringify(signed),
        }),
      });
    }
    const attemptedWrite = pendingLifecycleWrite;
    const response = await request(attemptedWrite.request);
    const result = boundedInstallationResponse(response);
    if (result) {
      const updated = await identityStore.markRegistered(expectedPrincipal, {
        installation_id: result.installation_id,
        state_version: result.state_version,
      });
      if (pendingLifecycleWrite === attemptedWrite) {
        pendingLifecycleWrite = null;
      }
      return Object.freeze({ ok: true, identity: updated });
    }
    const safeErrorCodes = responseSafeErrorCodes(response);
    if (
      allowReconcile
      && identity.state === "registered"
      && requiresAuthoritativeReconciliation(response)
    ) {
      const reconciled = await reconcileInstallation(
        identity,
        expectedPrincipal,
      );
      if (!reconciled.ok) return reconciled;
      if (!reconciled.terminal) {
        return lifecycleWrite(
          reconciled.identity,
          expectedPrincipal,
          allowRekey,
          false,
        );
      }
      await identityStore.confirmRetire(expectedPrincipal, {
        installation_id: identity.installation_id,
      });
      if (allowRekey) {
        const replacement = await identityStore.getOrCreate(expectedPrincipal);
        return lifecycleWrite(replacement, expectedPrincipal, false, false);
      }
    }
    if (
      allowRekey
      && identity.state === "registered"
      && responseStatus(response) === 409
      && safeErrorCodes.includes("OUTLOOK_DESKTOP_INSTALLATION_RETIRED")
    ) {
      if (pendingLifecycleWrite === attemptedWrite) {
        pendingLifecycleWrite = null;
      }
      await identityStore.confirmRetire(expectedPrincipal, {
        installation_id: identity.installation_id,
      });
      const replacement = await identityStore.getOrCreate(expectedPrincipal);
      return lifecycleWrite(replacement, expectedPrincipal, false, false);
    }
    if (
      !transientLifecycleFailure(response)
      && pendingLifecycleWrite === attemptedWrite
    ) {
      pendingLifecycleWrite = null;
    }
    return Object.freeze({
      ok: false,
      response,
      safe_error_codes: Object.freeze(safeErrorCodes),
    });
  };

  const statusForFailure = (failure, retryScheduled) => lifecycleStatus({
    state: "unknown",
    nextAction: "retry",
    safeErrorCodes: failure.safe_error_codes.length > 0
      ? failure.safe_error_codes
      : ["OUTLOOK_DESKTOP_LIFECYCLE_UNAVAILABLE"],
    retryScheduled,
  });

  const synchronizeOnce = async (expectedGeneration, retryIndex) => {
    if (expectedGeneration !== generation || !principal) return currentStatus;
    clearScheduledTimer();
    lastReadiness = null;
    if (!validBuildIdentity(buildIdentity)) {
      currentStatus = lifecycleStatus({
        state: "blocked",
        nextAction: "contact_admin",
        safeErrorCodes: ["OUTLOOK_DESKTOP_BUILD_PROVENANCE_REQUIRED"],
      });
      return currentStatus;
    }

    const expectedPrincipal = principal;
    let write;
    try {
      const identity = await identityStore.getOrCreate(expectedPrincipal);
      write = await lifecycleWrite(identity, expectedPrincipal, true);
    } catch (error) {
      write = Object.freeze({
        ok: false,
        response: Object.freeze({ http_status: Number(error?.status ?? 0) }),
        safe_error_codes: Object.freeze([
          PUBLIC_SAFE_ERROR_CODE_PATTERN.test(error?.safe_error_code ?? "")
            ? error.safe_error_code
            : "OUTLOOK_DESKTOP_LIFECYCLE_UNAVAILABLE",
        ]),
      });
    }
    if (expectedGeneration !== generation || expectedPrincipal !== principal) {
      return currentStatus;
    }
    if (!write.ok) {
      const canRetry = transientLifecycleFailure(write.response)
        && retryIndex < safeRetryDelays.length;
      currentStatus = statusForFailure(write, canRetry);
      if (canRetry) {
        schedule(
          () => synchronize(retryIndex + 1),
          safeRetryDelays[retryIndex],
          expectedGeneration,
        );
      }
      return currentStatus;
    }
    currentIdentity = write.identity;

    const readinessResponse = await request({
      path: `/api/outlook/readiness?installation_id=${encodeURIComponent(
        write.identity.installation_id,
      )}`,
      method: "GET",
    });
    if (expectedGeneration !== generation || expectedPrincipal !== principal) {
      return currentStatus;
    }
    const readiness = boundedReadinessResponse(readinessResponse);
    if (!readiness) {
      const failure = Object.freeze({
        response: readinessResponse,
        safe_error_codes: Object.freeze(responseSafeErrorCodes(
          readinessResponse,
        )),
      });
      const canRetry = transientLifecycleFailure(readinessResponse)
        && retryIndex < safeRetryDelays.length;
      currentStatus = statusForFailure(failure, canRetry);
      if (canRetry) {
        schedule(
          () => synchronize(retryIndex + 1),
          safeRetryDelays[retryIndex],
          expectedGeneration,
        );
      }
      return currentStatus;
    }
    lastReadiness = readiness;
    currentStatus = readinessStatus(readiness);
    schedule(
      () => synchronize(0),
      heartbeatIntervalMs,
      expectedGeneration,
    );
    return currentStatus;
  };

  const synchronize = (retryIndex = 0) => {
    const expectedGeneration = generation;
    const current = operationTail.then(
      () => synchronizeOnce(expectedGeneration, retryIndex),
      () => synchronizeOnce(expectedGeneration, retryIndex),
    );
    operationTail = current.catch(() => undefined);
    return current;
  };

  return Object.freeze({
    sessionAvailable(session) {
      clearScheduledTimer();
      generation += 1;
      const principalRef = session?.state === "signed_in"
        ? session.outlook_desktop_principal_ref
        : null;
      if (!PRINCIPAL_REF_PATTERN.test(principalRef ?? "")) {
        principal = null;
        currentIdentity = null;
        lastReadiness = null;
        currentStatus = lifecycleStatus({
          state: "blocked",
          nextAction: "sign_in",
          safeErrorCodes: ["OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED"],
        });
        return Promise.resolve(currentStatus);
      }
      principal = Object.freeze({ principal_ref: principalRef });
      currentIdentity = null;
      currentStatus = lifecycleStatus({ state: "syncing" });
      return synchronize(0);
    },

    refresh() {
      if (!principal) return Promise.resolve(currentStatus);
      return synchronize(0);
    },

    status() {
      return currentStatus;
    },

    async confirmMicrosoft({ confirmed = false } = {}, handoff = null) {
      if (!confirmed) {
        return Object.freeze({
          handoff_accepted: false,
          reason: "explicit_confirmation_required",
          token_material_returned: false,
        });
      }
      if (
        !principal
        || !lastReadiness
        || lastReadiness.next_action !== "confirm_microsoft"
        || lastReadiness.browser_required !== true
        || !lastReadiness.safe_error_codes.includes(
          "M365_INTERACTION_REQUIRED",
        )
      ) {
        return Object.freeze({
          handoff_accepted: false,
          reason: "microsoft_interaction_not_required",
          token_material_returned: false,
        });
      }
      const interactionHandoff = typeof handoff === "function"
        ? handoff
        : onInteractionRequired;
      if (typeof interactionHandoff !== "function") {
        return Object.freeze({
          handoff_accepted: false,
          reason: "microsoft_handoff_unavailable",
          token_material_returned: false,
        });
      }
      try {
        const result = await interactionHandoff();
        return Object.freeze({
          handoff_accepted: result?.handoff_accepted === true,
          ...(result?.handoff_accepted === true
            ? {}
            : { reason: "microsoft_handoff_failed" }),
          token_material_returned: false,
        });
      } catch {
        return Object.freeze({
          handoff_accepted: false,
          reason: "microsoft_handoff_failed",
          token_material_returned: false,
        });
      }
    },

    disconnectDevice() {
      const expectedGeneration = generation;
      const expectedPrincipal = principal;
      if (!expectedPrincipal) {
        return Promise.resolve(Object.freeze({
          retired: false,
          reason: "device_disconnect_unavailable",
          token_material_returned: false,
        }));
      }
      const finalizeDisconnect = async (identity) => {
        try {
          await identityStore.confirmRetire(expectedPrincipal, {
            installation_id: identity.installation_id,
          });
          pendingRetire = null;
        } catch {
          if (
            expectedGeneration === generation
            && expectedPrincipal === principal
          ) {
            generation += 1;
            clearScheduledTimer();
            principal = null;
            currentIdentity = null;
            lastReadiness = null;
            currentStatus = lifecycleStatus({
              state: "blocked",
              nextAction: "sign_in",
              safeErrorCodes: ["OUTLOOK_DESKTOP_SECURE_IDENTITY_UNAVAILABLE"],
            });
          }
          return Object.freeze({
            retired: false,
            reason: "device_disconnect_failed",
            token_material_returned: false,
          });
        }
        if (
          expectedGeneration === generation
          && expectedPrincipal === principal
        ) {
          generation += 1;
          clearScheduledTimer();
          principal = null;
          currentIdentity = null;
          lastReadiness = null;
          currentStatus = lifecycleStatus({
            state: "idle",
            nextAction: "sign_in",
          });
        }
        return Object.freeze({
          retired: true,
          reason: "device_disconnect",
          token_material_returned: false,
        });
      };
      const disconnectOnce = async (retryIndex = 0, allowReconcile = true) => {
        if (
          expectedGeneration !== generation
          || expectedPrincipal !== principal
          || currentIdentity?.state !== "registered"
        ) {
          return Object.freeze({
            retired: false,
            reason: "device_disconnect_unavailable",
            token_material_returned: false,
          });
        }
        const identity = currentIdentity;
        let response;
        try {
          const pendingMatches = pendingRetire
            && pendingRetire.principal_ref === expectedPrincipal.principal_ref
            && pendingRetire.installation_id === identity.installation_id
            && pendingRetire.state_version === identity.state_version;
          if (!pendingMatches) {
            const signed = await identityStore.signRetire(expectedPrincipal, {
              expected_state_version: identity.state_version,
              retire_reason: "device_disconnect",
              ...proof("retire"),
            });
            pendingRetire = Object.freeze({
              principal_ref: expectedPrincipal.principal_ref,
              installation_id: identity.installation_id,
              state_version: identity.state_version,
              request: Object.freeze({
                path: `/api/desktop/installations/${identity.installation_id}/retire`,
                method: "POST",
                body: JSON.stringify(signed),
              }),
            });
          }
          response = await request(pendingRetire.request);
        } catch {
          return Object.freeze({
            retired: false,
            reason: "device_disconnect_failed",
            token_material_returned: false,
          });
        }
        if (!boundedRetireResponse(response, identity.installation_id)) {
          if (
            allowReconcile
            && requiresAuthoritativeReconciliation(response)
          ) {
            const reconciled = await reconcileInstallation(
              identity,
              expectedPrincipal,
            );
            if (reconciled.ok) {
              if (reconciled.terminal) {
                return finalizeDisconnect(identity);
              }
              currentIdentity = reconciled.identity;
              return disconnectOnce(retryIndex, false);
            }
            response = reconciled.response;
          }
          const canRetry = responseStatus(response) === 0
            && retryIndex < safeRetryDelays.length;
          if (!transientLifecycleFailure(response)) {
            pendingRetire = null;
          }
          if (canRetry) {
            currentStatus = lifecycleStatus({
              state: "unknown",
              nextAction: "retry",
              safeErrorCodes: responseSafeErrorCodes(response),
              retryScheduled: true,
            });
            schedule(() => {
              const retry = operationTail.then(
                () => disconnectOnce(retryIndex + 1, allowReconcile),
                () => disconnectOnce(retryIndex + 1, allowReconcile),
              );
              operationTail = retry.catch(() => undefined);
              return retry;
            }, safeRetryDelays[retryIndex], expectedGeneration);
          }
          return Object.freeze({
            retired: false,
            reason: "device_disconnect_failed",
            token_material_returned: false,
          });
        }
        return finalizeDisconnect(identity);
      };
      const current = operationTail.then(
        () => disconnectOnce(0),
        () => disconnectOnce(0),
      );
      operationTail = current.catch(() => undefined);
      return current;
    },

    stop({ reason = "stopped" } = {}) {
      generation += 1;
      clearScheduledTimer();
      principal = null;
      currentIdentity = null;
      lastReadiness = null;
      currentStatus = lifecycleStatus({
        state: "idle",
        nextAction: reason === "logout" ? "sign_in" : null,
      });
      return currentStatus;
    },
  });
}
