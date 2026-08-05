import assert from "node:assert/strict";
import test from "node:test";
import { createAwsM365CredentialVault } from "../src/m365-credential-vault.js";

const CLIENT_REFRESH_PROOF = "C".repeat(43);

test("CL-P3-W00-T01 AWS M365 credential vault는 token 대신 불투명 참조만 반환하고 해제 시 현재 값을 폐기한다", async () => {
  const commands = [];
  const secretValues = new Map();
  const client = {
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      if (name === "CreateSecretCommand") {
        secretValues.set(command.input.Name, command.input.SecretString);
        return { ARN: `arn:aws:secretsmanager:test:${command.input.Name}` };
      }
      if (name === "PutSecretValueCommand") {
        secretValues.set(command.input.SecretId, command.input.SecretString);
        return { VersionId: command.input.ClientRequestToken };
      }
      if (name === "GetSecretValueCommand") {
        return { SecretString: secretValues.get(command.input.SecretId) };
      }
      if (name === "DeleteSecretCommand") {
        return { DeletionDate: new Date("2026-08-06T00:00:00.000Z") };
      }
      throw new Error(`Unexpected command: ${name}`);
    },
  };
  let request = 0;
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client,
    idFactory: () => `00000000-0000-4000-8000-${String(++request).padStart(12, "0")}`,
  });
  const credentialRef = await vault.storeDelegatedCredential({
    tenant_id: "tenant-vault-synthetic",
    user_id: "user-vault-synthetic",
    token_bundle: {
      access_token: "vault-access-token-synthetic",
      refresh_token: "vault-refresh-token-synthetic",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
      expires_at: "2026-08-30T00:00:00.000Z",
    },
  });
  assert.match(
    credentialRef,
    /^aws-secrets-manager:lawos\/test\/m365\/[a-f0-9]{64}$/u,
  );
  assert.equal(credentialRef.includes("tenant-vault-synthetic"), false);
  assert.equal(credentialRef.includes("user-vault-synthetic"), false);

  const resolved = await vault.resolveDelegatedCredential({
    credential_ref: credentialRef,
  });
  assert.equal(resolved.access_token, "vault-access-token-synthetic");
  assert.equal(resolved.refresh_token, "vault-refresh-token-synthetic");
  assert.equal(resolved.refresh_profile, "client");
  assert.equal(resolved.refresh_profile_proof, CLIENT_REFRESH_PROOF);

  const deleted = await vault.deleteDelegatedCredential({
    credential_ref: credentialRef,
    reason: "사용자 연결 해제",
  });
  assert.equal(deleted.deletion_scheduled, true);
  const finalSecret = [...secretValues.values()].at(-1);
  assert.equal(finalSecret.includes("vault-access-token-synthetic"), false);
  assert.equal(finalSecret.includes("vault-refresh-token-synthetic"), false);
  assert.equal(JSON.parse(finalSecret).credential_material_included, false);
  const deleteCommand = commands.find(
    (command) => command.constructor.name === "DeleteSecretCommand",
  );
  assert.equal(deleteCommand.input.RecoveryWindowInDays, 7);
  assert.equal(deleteCommand.input.ForceDeleteWithoutRecovery, undefined);
});

test("CL-P3-W00-T01 AWS M365 credential vault는 기존 참조를 새 secret으로 바꾸지 않는다", async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      return {};
    },
  };
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client,
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });
  const existing =
    "aws-secrets-manager:lawos/test/m365/existing-reference";
  const result = await vault.storeDelegatedCredential({
    tenant_id: "tenant-not-used-for-existing-ref",
    user_id: "user-not-used-for-existing-ref",
    credential_ref: existing,
    token_bundle: {
      access_token: "replacement-access",
      refresh_token: "replacement-refresh",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
    },
  });
  assert.equal(result, existing);
  assert.deepEqual(
    commands.map((command) => command.constructor.name),
    ["PutSecretValueCommand"],
  );
});
