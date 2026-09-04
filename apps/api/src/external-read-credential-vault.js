import { createHash, randomUUID } from "node:crypto";
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";

export const EXTERNAL_READ_CREDENTIAL_SCHEMA_VERSION =
  "law-firm-os.external-read-api-key.v1";
export const LAWOS_EXTERNAL_READ_SECRET_PREFIX_ENV =
  "LAWOS_EXTERNAL_READ_SECRET_PREFIX";
export const LAWOS_EXTERNAL_READ_KMS_KEY_ARN_ENV =
  "LAWOS_EXTERNAL_READ_KMS_KEY_ARN";

const REFERENCE_PREFIX = "aws-secrets-manager:";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const PROVIDER_ID = /^[a-z][a-z0-9._-]{1,63}$/u;
const CREDENTIAL_GENERATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const KMS_KEY_ARN =
  /^arn:(?:aws|aws-us-gov|aws-cn):kms:([a-z0-9-]+):[0-9]{12}:key\/[0-9a-f-]{36}$/u;

function requiredText(value, field, pattern = SAFE_ID) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || (pattern && !pattern.test(text))) throw new TypeError(`${field} is invalid`);
  return text;
}

function normalizeApiKey(value) {
  if (typeof value !== "string"
    || value.length < 1
    || value.length > 8192
    || value !== value.trim()
    || /[\r\n\0]/u.test(value)) {
    throw new TypeError("api_key is invalid");
  }
  return value;
}

function normalizeScope(input = {}) {
  return Object.freeze({
    tenant_id: requiredText(input.tenant_id, "tenant_id"),
    legal_entity_id: requiredText(input.legal_entity_id, "legal_entity_id"),
    connection_id: requiredText(input.connection_id, "connection_id"),
    provider_id: requiredText(input.provider_id, "provider_id", PROVIDER_ID),
  });
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function scopeDigest(scope) {
  return digest(JSON.stringify({
    schema_version: EXTERNAL_READ_CREDENTIAL_SCHEMA_VERSION,
    ...scope,
  }));
}

function credentialGeneration(value) {
  return requiredText(value ?? "initial", "credential_generation", CREDENTIAL_GENERATION);
}

function normalizePrefix(value) {
  const prefix = String(value ?? "").trim().replace(/\/+$/u, "");
  if (!prefix || !/^[A-Za-z0-9/_+=.@-]+$/u.test(prefix)) {
    throw new TypeError("secret_prefix is invalid");
  }
  return prefix;
}

function reference(secretId) {
  return `${REFERENCE_PREFIX}${secretId}`;
}

function secretIdFromReference(value) {
  const ref = String(value ?? "");
  if (!ref.startsWith(REFERENCE_PREFIX)) {
    throw new TypeError("credential_ref must use AWS Secrets Manager");
  }
  const secretId = ref.slice(REFERENCE_PREFIX.length);
  if (!secretId) throw new TypeError("credential_ref secret ID is required");
  return secretId;
}

function errorCode(error) {
  return error?.name ?? error?.Code ?? error?.code;
}

function resourceExists(error) {
  return errorCode(error) === "ResourceExistsException";
}

function resourceMissing(error) {
  return errorCode(error) === "ResourceNotFoundException";
}

function alreadyDeleted(error) {
  const message = String(error?.message ?? error?.Message ?? error?.Error?.Message ?? "");
  return resourceMissing(error)
    || (errorCode(error) === "InvalidRequestException"
      && /(?:marked|scheduled) for deletion/iu.test(message));
}

function revokedError(cause) {
  return Object.assign(new Error("External provider credential is revoked"), {
    name: "ExternalReadCredentialRevokedError",
    safe_error_code: "EXTERNAL_READ_CREDENTIAL_REVOKED",
    status: 401,
    cause,
  });
}

function scopeMatches(value, expected, expectedGeneration) {
  return value?.schema_version === EXTERNAL_READ_CREDENTIAL_SCHEMA_VERSION
    && value.tenant_id === expected.tenant_id
    && value.legal_entity_id === expected.legal_entity_id
    && value.connection_id === expected.connection_id
    && value.provider_id === expected.provider_id
    && value.credential_generation === expectedGeneration;
}

function assertExpectedReference(prefix, scope, credentialRef) {
  const expectedPrefix = `${prefix}/${scopeDigest(scope)}/`;
  const actualSecretId = secretIdFromReference(credentialRef);
  if (!actualSecretId.startsWith(expectedPrefix)) {
    throw Object.assign(new Error("External provider credential scope mismatch"), {
      safe_error_code: "EXTERNAL_READ_CREDENTIAL_SCOPE_MISMATCH",
      status: 403,
    });
  }
  const generation = actualSecretId.slice(expectedPrefix.length);
  if (!CREDENTIAL_GENERATION.test(generation)) {
    throw Object.assign(new Error("External provider credential scope mismatch"), {
      safe_error_code: "EXTERNAL_READ_CREDENTIAL_SCOPE_MISMATCH",
      status: 403,
    });
  }
  return Object.freeze({ secret_id: actualSecretId, credential_generation: generation });
}

export function createAwsExternalReadCredentialVault({
  region,
  secret_prefix,
  kms_key_id,
  client,
  idFactory = randomUUID,
  recovery_window_days = 7,
} = {}) {
  const resolvedRegion = requiredText(region, "region", null);
  const prefix = normalizePrefix(secret_prefix);
  const kmsKeyArn = requiredText(kms_key_id, "kms_key_id", KMS_KEY_ARN);
  if (KMS_KEY_ARN.exec(kmsKeyArn)?.[1] !== resolvedRegion) {
    throw new TypeError("kms_key_id region differs from credential vault region");
  }
  if (!Number.isSafeInteger(recovery_window_days)
    || recovery_window_days < 7
    || recovery_window_days > 30) {
    throw new TypeError("recovery_window_days must be between 7 and 30");
  }
  const secrets = client ?? new SecretsManagerClient({ region: resolvedRegion });

  async function resolveBoundSecret(scope, credentialRef) {
    const binding = assertExpectedReference(prefix, scope, credentialRef);
    let value;
    try {
      value = await resolveAwsJsonSecret({
        secretId: binding.secret_id,
        region: resolvedRegion,
        client: secrets,
      });
    } catch (error) {
      if (alreadyDeleted(error)) throw revokedError(error);
      throw error;
    }
    if (value.credential_tombstone === true) throw revokedError();
    if (!scopeMatches(value, scope, binding.credential_generation)) {
      throw Object.assign(new Error("External provider credential scope mismatch"), {
        safe_error_code: "EXTERNAL_READ_CREDENTIAL_SCOPE_MISMATCH",
        status: 403,
      });
    }
    return value;
  }

  async function putTombstone(secretId, secretString) {
    try {
      await secrets.send(new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretString,
        ClientRequestToken: idFactory(),
      }));
      return;
    } catch (error) {
      if (!resourceMissing(error)) throw error;
    }
    try {
      await secrets.send(new CreateSecretCommand({
        Name: secretId,
        Description: "Law Firm OS revoked external read credential generation",
        KmsKeyId: kmsKeyArn,
        SecretString: secretString,
        ClientRequestToken: idFactory(),
        Tags: [{ Key: "lawos-purpose", Value: "external-read-tombstone" }],
      }));
    } catch (error) {
      if (!resourceExists(error)) throw error;
      await secrets.send(new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretString,
        ClientRequestToken: idFactory(),
      }));
    }
  }

  return Object.freeze({
    provider: "aws-secrets-manager",
    operational: true,
    durable: true,
    credential_material_returned_to_client: false,
    referenceForConnection(input = {}) {
      const scope = normalizeScope(input);
      return reference(`${prefix}/${scopeDigest(scope)}/${credentialGeneration(input.credential_generation)}`);
    },
    async storeApiKey(input = {}) {
      const scope = normalizeScope(input);
      const generation = credentialGeneration(input.credential_generation);
      const key = normalizeApiKey(input.api_key);
      const credentialRef = reference(`${prefix}/${scopeDigest(scope)}/${generation}`);
      const secretId = secretIdFromReference(credentialRef);
      const secretString = JSON.stringify({
        schema_version: EXTERNAL_READ_CREDENTIAL_SCHEMA_VERSION,
        ...scope,
        credential_generation: generation,
        api_key: key,
      });
      try {
        await secrets.send(new CreateSecretCommand({
          Name: secretId,
          Description: "Law Firm OS tenant-scoped external read credential",
          KmsKeyId: kmsKeyArn,
          SecretString: secretString,
          ClientRequestToken: idFactory(),
          Tags: [{ Key: "lawos-purpose", Value: "external-read" }],
        }));
      } catch (error) {
        if (!resourceExists(error)) {
          if (alreadyDeleted(error)) throw revokedError(error);
          throw error;
        }
        const existing = await resolveBoundSecret(scope, credentialRef);
        if (existing.api_key !== key) {
          throw Object.assign(new Error("External provider credential generation conflict"), {
            safe_error_code: "EXTERNAL_READ_CREDENTIAL_GENERATION_CONFLICT",
            status: 409,
          });
        }
      }
      return credentialRef;
    },
    async resolveApiKey(input = {}) {
      const scope = normalizeScope(input);
      const value = await resolveBoundSecret(
        scope,
        requiredText(input.credential_ref, "credential_ref", null),
      );
      return Object.freeze({ api_key: normalizeApiKey(value.api_key) });
    },
    async revokeApiKey(input = {}) {
      const scope = normalizeScope(input);
      const credentialRef = requiredText(input.credential_ref, "credential_ref", null);
      const binding = assertExpectedReference(prefix, scope, credentialRef);
      const revokedAt = new Date().toISOString();
      const tombstone = JSON.stringify({
        schema_version: EXTERNAL_READ_CREDENTIAL_SCHEMA_VERSION,
        credential_tombstone: true,
        credential_generation: binding.credential_generation,
        credential_material_included: false,
        binding_sha256: scopeDigest(scope),
        reason_sha256: digest(requiredText(input.reason, "reason", null)),
        revoked_at: revokedAt,
      });
      try {
        await putTombstone(binding.secret_id, tombstone);
        await secrets.send(new DeleteSecretCommand({
          SecretId: binding.secret_id,
          RecoveryWindowInDays: recovery_window_days,
        }));
      } catch (error) {
        if (!alreadyDeleted(error)) throw error;
      }
      return Object.freeze({
        credential_ref: credentialRef,
        revoked_at: revokedAt,
        deletion_scheduled: true,
        credential_material_included: false,
      });
    },
  });
}
