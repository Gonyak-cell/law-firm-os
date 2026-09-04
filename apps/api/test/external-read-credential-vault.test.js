import assert from "node:assert/strict";
import test from "node:test";
import { createAwsExternalReadCredentialVault } from "../src/external-read-credential-vault.js";

const SCOPE = Object.freeze({
  tenant_id: "tenant-synthetic",
  legal_entity_id: "company-synthetic",
  connection_id: "external-connection:synthetic-1",
  provider_id: "future-bank",
});
const KMS_KEY_ARN =
  "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-3333-4444-555555555555";

function fakeSecrets() {
  const values = new Map();
  const deleted = new Set();
  const commands = [];
  return {
    values,
    deleted,
    commands,
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      if (name === "CreateSecretCommand") {
        if (values.has(command.input.Name)) {
          throw Object.assign(new Error("exists"), { name: "ResourceExistsException" });
        }
        if (deleted.has(command.input.Name)) {
          throw Object.assign(new Error("secret is scheduled for deletion"), { name: "InvalidRequestException" });
        }
        values.set(command.input.Name, command.input.SecretString);
        return {};
      }
      if (name === "PutSecretValueCommand") {
        if (!values.has(command.input.SecretId)) {
          throw Object.assign(new Error("missing"), { name: "ResourceNotFoundException" });
        }
        if (deleted.has(command.input.SecretId)) {
          throw Object.assign(new Error("secret is scheduled for deletion"), { name: "InvalidRequestException" });
        }
        values.set(command.input.SecretId, command.input.SecretString);
        return {};
      }
      if (name === "GetSecretValueCommand") {
        if (deleted.has(command.input.SecretId)) {
          throw Object.assign(new Error("secret is scheduled for deletion"), { name: "InvalidRequestException" });
        }
        if (!values.has(command.input.SecretId)) {
          throw Object.assign(new Error("missing"), { name: "ResourceNotFoundException" });
        }
        return { SecretString: values.get(command.input.SecretId) };
      }
      if (name === "DeleteSecretCommand") {
        deleted.add(command.input.SecretId);
        return {};
      }
      throw new Error(`Unexpected command: ${name}`);
    },
  };
}

function createVault(client = fakeSecrets()) {
  let id = 0;
  return {
    client,
    vault: createAwsExternalReadCredentialVault({
      region: "ap-northeast-2",
      secret_prefix: "lawos/test/external-read",
      kms_key_id: KMS_KEY_ARN,
      client,
      idFactory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    }),
  };
}

test("AWS external-read vault stores only an opaque deterministic reference and resolves an exact scope", async () => {
  const { client, vault } = createVault();
  const credentialRef = await vault.storeApiKey({ ...SCOPE, api_key: "synthetic-api-key" });

  assert.match(credentialRef, /^aws-secrets-manager:lawos\/test\/external-read\/[a-f0-9]{64}\/initial$/u);
  assert.equal(credentialRef.includes(SCOPE.tenant_id), false);
  assert.equal(credentialRef.includes(SCOPE.legal_entity_id), false);
  assert.equal(vault.referenceForConnection(SCOPE), credentialRef);
  assert.deepEqual(await vault.resolveApiKey({ ...SCOPE, credential_ref: credentialRef }), {
    api_key: "synthetic-api-key",
  });
  assert.equal(client.commands[0].input.Tags[0].Value, "external-read");
  assert.equal(client.commands[0].input.KmsKeyId, KMS_KEY_ARN);
});

test("credential rotation uses an isolated immutable generation under the same exact scope", async () => {
  const { client, vault } = createVault();
  const initial = await vault.storeApiKey({ ...SCOPE, api_key: "initial-synthetic-key" });
  const rotated = await vault.storeApiKey({
    ...SCOPE,
    credential_generation: "rotation-002",
    api_key: "rotated-synthetic-key",
  });

  assert.notEqual(rotated, initial);
  assert.equal(rotated.endsWith("/rotation-002"), true);
  assert.equal(client.values.size, 2);
  assert.deepEqual(await vault.resolveApiKey({ ...SCOPE, credential_ref: initial }), {
    api_key: "initial-synthetic-key",
  });
  assert.deepEqual(await vault.resolveApiKey({ ...SCOPE, credential_ref: rotated }), {
    api_key: "rotated-synthetic-key",
  });
});

test("AWS external-read vault rejects cross-tenant, cross-entity, and cross-provider references before reading", async () => {
  const { client, vault } = createVault();
  const credentialRef = await vault.storeApiKey({ ...SCOPE, api_key: "synthetic-api-key" });
  const readsBefore = client.commands.filter((command) => command.constructor.name === "GetSecretValueCommand").length;

  for (const patch of [
    { tenant_id: "tenant-other" },
    { legal_entity_id: "company-other" },
    { connection_id: "external-connection:other" },
    { provider_id: "other-bank" },
  ]) {
    await assert.rejects(
      vault.resolveApiKey({ ...SCOPE, ...patch, credential_ref: credentialRef }),
      (error) => error.safe_error_code === "EXTERNAL_READ_CREDENTIAL_SCOPE_MISMATCH",
    );
  }
  const readsAfter = client.commands.filter((command) => command.constructor.name === "GetSecretValueCommand").length;
  assert.equal(readsAfter, readsBefore);
});

test("a retry with the same key is idempotent but a different key cannot overwrite the generation", async () => {
  const { client, vault } = createVault();
  const first = await vault.storeApiKey({ ...SCOPE, api_key: "synthetic-api-key" });
  const retry = await vault.storeApiKey({ ...SCOPE, api_key: "synthetic-api-key" });
  assert.equal(retry, first);

  await assert.rejects(
    vault.storeApiKey({ ...SCOPE, api_key: "different-synthetic-key" }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CREDENTIAL_GENERATION_CONFLICT",
  );
  const secret = [...client.values.values()][0];
  assert.equal(JSON.parse(secret).api_key, "synthetic-api-key");
});

test("revocation overwrites credential material with a tombstone before scheduling deletion", async () => {
  const { client, vault } = createVault();
  const credentialRef = await vault.storeApiKey({ ...SCOPE, api_key: "must-not-survive-revocation" });
  const result = await vault.revokeApiKey({
    ...SCOPE,
    credential_ref: credentialRef,
    reason: "provider validation failed",
  });

  assert.equal(result.deletion_scheduled, true);
  assert.equal(result.credential_material_included, false);
  const stored = [...client.values.values()][0];
  assert.equal(stored.includes("must-not-survive-revocation"), false);
  assert.equal(JSON.parse(stored).credential_tombstone, true);
  const deletion = client.commands.find((command) => command.constructor.name === "DeleteSecretCommand");
  assert.equal(deletion.input.RecoveryWindowInDays, 7);
  assert.equal(deletion.input.ForceDeleteWithoutRecovery, undefined);
  await assert.rejects(
    vault.resolveApiKey({ ...SCOPE, credential_ref: credentialRef }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CREDENTIAL_REVOKED",
  );
});

test("revoking a missing deterministic generation creates a tombstone that fences late creation", async () => {
  const { client, vault } = createVault();
  const credentialRef = vault.referenceForConnection(SCOPE);
  await vault.revokeApiKey({
    ...SCOPE,
    credential_ref: credentialRef,
    reason: "uncertain credential store result",
  });
  const secretId = credentialRef.slice("aws-secrets-manager:".length);
  assert.equal(JSON.parse(client.values.get(secretId)).credential_tombstone, true);
  assert.equal(client.deleted.has(secretId), true);

  await assert.rejects(
    vault.storeApiKey({ ...SCOPE, api_key: "late-key-must-not-persist" }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CREDENTIAL_REVOKED",
  );
  assert.equal(client.values.get(secretId).includes("late-key-must-not-persist"), false);
});

test("the AWS external-read vault rejects malformed keys and unscoped arbitrary secret references", async () => {
  const { vault } = createVault();
  await assert.rejects(vault.storeApiKey({ ...SCOPE, api_key: " line " }), /api_key is invalid/u);
  await assert.rejects(vault.storeApiKey({ ...SCOPE, api_key: "line\nbreak" }), /api_key is invalid/u);
  await assert.rejects(
    vault.resolveApiKey({ ...SCOPE, credential_ref: "aws-secrets-manager:other/application/secret" }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CREDENTIAL_SCOPE_MISMATCH",
  );
});

test("the AWS external-read vault requires a same-region customer-managed KMS key", () => {
  assert.throws(() => createAwsExternalReadCredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/external-read",
    client: fakeSecrets(),
  }), /kms_key_id is invalid/u);
  assert.throws(() => createAwsExternalReadCredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/external-read",
    kms_key_id:
      "arn:aws:kms:us-east-1:770880870480:key/11111111-2222-3333-4444-555555555555",
    client: fakeSecrets(),
  }), /region differs/u);
});
