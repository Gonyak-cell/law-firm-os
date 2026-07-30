import { createHash, randomUUID } from "node:crypto";
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { resolveAwsJsonSecret } from "./aws-secret-reference.js";

const CREDENTIAL_REF_PREFIX = "aws-secrets-manager:";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function secretIdFromReference(value) {
  const reference = requiredString(value, "credential_ref");
  if (!reference.startsWith(CREDENTIAL_REF_PREFIX)) {
    throw new TypeError("credential_ref must use AWS Secrets Manager");
  }
  return requiredString(
    reference.slice(CREDENTIAL_REF_PREFIX.length),
    "credential_ref secret ID",
  );
}

function credentialReference(secretId) {
  return `${CREDENTIAL_REF_PREFIX}${secretId}`;
}

function tokenBundle(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("token_bundle is required");
  }
  const accessToken = requiredString(input.access_token, "access_token");
  const refreshToken = requiredString(input.refresh_token, "refresh_token");
  return Object.freeze({
    ...structuredClone(input),
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

function secretName(prefix, tenantId, userId) {
  const base = requiredString(prefix, "secret_prefix").replace(/\/+$/u, "");
  if (!/^[A-Za-z0-9/_+=.@-]+$/u.test(base)) {
    throw new TypeError("secret_prefix is invalid");
  }
  const digest = createHash("sha256")
    .update(JSON.stringify({
      tenant_id: requiredString(tenantId, "tenant_id"),
      user_id: requiredString(userId, "user_id"),
    }))
    .digest("hex");
  return `${base}/${digest}`;
}

function resourceExists(error) {
  return error?.name === "ResourceExistsException"
    || error?.Code === "ResourceExistsException";
}

export function createAwsM365CredentialVault({
  region,
  secret_prefix,
  client,
  idFactory = randomUUID,
  recovery_window_days = 7,
} = {}) {
  const resolvedRegion = requiredString(region, "region");
  const secrets = client ?? new SecretsManagerClient({
    region: resolvedRegion,
  });
  if (
    !Number.isSafeInteger(recovery_window_days)
    || recovery_window_days < 7
    || recovery_window_days > 30
  ) {
    throw new TypeError("recovery_window_days must be between 7 and 30");
  }

  async function putSecret(secretId, secretString) {
    await secrets.send(new PutSecretValueCommand({
      SecretId: secretId,
      SecretString: secretString,
      ClientRequestToken: idFactory(),
    }));
  }

  return Object.freeze({
    provider: "aws-secrets-manager",
    credential_material_returned_to_client: false,
    async storeDelegatedCredential({
      tenant_id,
      user_id,
      token_bundle,
      credential_ref = null,
    } = {}) {
      const bundle = tokenBundle(token_bundle);
      const secretId = credential_ref
        ? secretIdFromReference(credential_ref)
        : secretName(secret_prefix, tenant_id, user_id);
      const secretString = JSON.stringify(bundle);
      if (credential_ref) {
        await putSecret(secretId, secretString);
      } else {
        try {
          await secrets.send(new CreateSecretCommand({
            Name: secretId,
            Description:
              "Law Firm OS delegated Microsoft 365 credential",
            SecretString: secretString,
            ClientRequestToken: idFactory(),
            Tags: [{
              Key: "lawos-purpose",
              Value: "m365-delegated-user",
            }],
          }));
        } catch (error) {
          if (!resourceExists(error)) throw error;
          await putSecret(secretId, secretString);
        }
      }
      return credentialReference(secretId);
    },
    async resolveDelegatedCredential({ credential_ref } = {}) {
      return tokenBundle(await resolveAwsJsonSecret({
        secretId: secretIdFromReference(credential_ref),
        region: resolvedRegion,
        client: secrets,
      }));
    },
    async deleteDelegatedCredential({
      credential_ref,
      reason,
    } = {}) {
      const secretId = secretIdFromReference(credential_ref);
      const deletedAt = new Date().toISOString();
      await putSecret(secretId, JSON.stringify({
        revoked: true,
        revoked_at: deletedAt,
        reason_hash: createHash("sha256")
          .update(requiredString(reason, "reason"))
          .digest("hex"),
        credential_material_included: false,
      }));
      await secrets.send(new DeleteSecretCommand({
        SecretId: secretId,
        RecoveryWindowInDays: recovery_window_days,
      }));
      return Object.freeze({
        credential_ref,
        revoked_at: deletedAt,
        deletion_scheduled: true,
        credential_material_included: false,
      });
    },
  });
}
