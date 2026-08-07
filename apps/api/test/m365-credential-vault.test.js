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
    entra_subject_id: "subject-vault-synthetic",
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
    entra_subject_id: "subject-not-used-for-existing-ref",
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

test("CL-P3-W00-T01 AWS M365 credential vault는 새 연결마다 삭제 예약과 충돌하지 않는 참조를 만든다", async () => {
  const names = [];
  let request = 0;
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client: {
      async send(command) {
        if (command.constructor.name === "CreateSecretCommand") {
          names.push(command.input.Name);
        }
        return {};
      },
    },
    idFactory: () => `00000000-0000-4000-8000-${String(++request).padStart(12, "0")}`,
  });
  const input = {
    tenant_id: "tenant-vault-synthetic",
    user_id: "user-vault-synthetic",
    entra_subject_id: "subject-vault-synthetic",
    token_bundle: {
      access_token: "vault-access-token-synthetic",
      refresh_token: "vault-refresh-token-synthetic",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
    },
  };

  const first = await vault.storeDelegatedCredential(input);
  const second = await vault.storeDelegatedCredential(input);

  assert.notEqual(first, second);
  assert.equal(new Set(names).size, 2);
});

test("AWS M365 credential vault는 같은 connection state generation에 같은 복구 가능 ref를 사용한다", async () => {
  const commands = [];
  let storedSecret = null;
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client: {
      async send(command) {
        commands.push(command.constructor.name);
        if (command.constructor.name === "CreateSecretCommand") {
          if (storedSecret !== null) {
            throw Object.assign(new Error("generation already exists"), {
              name: "ResourceExistsException",
            });
          }
          storedSecret = command.input.SecretString;
          return {};
        }
        throw new Error(`unexpected command: ${command.constructor.name}`);
      },
    },
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });
  const identity = {
    tenant_id: "tenant-vault-deterministic",
    user_id: "user-vault-deterministic",
    entra_subject_id: "subject-vault-deterministic",
    credential_generation: "m365-connection-state-2",
  };
  const expected = vault.referenceForGeneration(identity);
  assert.notEqual(vault.referenceForGeneration({
    ...identity,
    entra_subject_id: "different-subject-vault-deterministic",
  }), expected);
  const input = {
    ...identity,
    token_bundle: {
      access_token: "deterministic-access",
      refresh_token: "deterministic-refresh",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
    },
  };

  const first = await vault.storeDelegatedCredential(input);
  const retry = await vault.storeDelegatedCredential({
    ...input,
    token_bundle: {
      ...input.token_bundle,
      access_token: "losing-distinct-access",
      refresh_token: "losing-distinct-refresh",
    },
  });
  assert.equal(first, expected);
  assert.equal(retry, expected);
  assert.equal(expected.includes(identity.tenant_id), false);
  assert.equal(expected.includes(identity.user_id), false);
  assert.deepEqual(commands, ["CreateSecretCommand", "CreateSecretCommand"]);
  assert.equal(JSON.parse(storedSecret).access_token, "deterministic-access");
  assert.equal(JSON.parse(storedSecret).refresh_token, "deterministic-refresh");
});

test("AWS M365 credential vault cleanup은 이미 삭제 예약된 참조를 성공으로 처리한다", async () => {
  let calls = 0;
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client: {
      async send() {
        calls += 1;
        throw Object.assign(new Error("secret is scheduled for deletion"), {
          name: "InvalidRequestException",
        });
      },
    },
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });

  const result = await vault.deleteDelegatedCredential({
    credential_ref:
      "aws-secrets-manager:lawos/test/m365/already-scheduled",
    reason: "retired credential cleanup retry",
  });

  assert.equal(result.deletion_scheduled, true);
  assert.equal(calls, 1);
});

test("AWS M365 credential vault는 삭제 예약이 지연돼도 tombstone 뒤 token을 다시 열지 않는다", async () => {
  let secretString = JSON.stringify({
    access_token: "must-be-erased-before-delete-retry",
    refresh_token: "must-be-erased-before-delete-retry",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
  });
  let deleteAttempts = 0;
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client: {
      async send(command) {
        const name = command.constructor.name;
        if (name === "PutSecretValueCommand") {
          secretString = command.input.SecretString;
          return {};
        }
        if (name === "GetSecretValueCommand") {
          return { SecretString: secretString };
        }
        if (name === "DeleteSecretCommand") {
          deleteAttempts += 1;
          if (deleteAttempts === 1) {
            throw Object.assign(new Error("temporary delete failure"), {
              name: "ServiceUnavailableException",
            });
          }
          return {};
        }
        throw new Error(`Unexpected command: ${name}`);
      },
    },
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });
  const credentialRef =
    "aws-secrets-manager:lawos/test/m365/delete-retry";

  await assert.rejects(vault.deleteDelegatedCredential({
    credential_ref: credentialRef,
    reason: "connection revoked",
  }), /temporary delete failure/u);
  assert.equal(JSON.parse(secretString).credential_tombstone, true);
  assert.equal(secretString.includes("must-be-erased-before-delete-retry"), false);
  await assert.rejects(vault.resolveDelegatedCredential({
    credential_ref: credentialRef,
  }), (error) => (
    error.safe_error_code === "M365_REAUTHORIZATION_REQUIRED"
    && error.status === 401
  ));

  const cleaned = await vault.deleteDelegatedCredential({
    credential_ref: credentialRef,
    reason: "connection revoked cleanup retry",
  });
  assert.equal(cleaned.deletion_scheduled, true);
  assert.equal(deleteAttempts, 2);
});

test("AWS M365 credential vault cleanup은 다른 InvalidRequest를 성공으로 숨기지 않는다", async () => {
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client: {
      async send() {
        throw Object.assign(new Error("secret is managed by another service"), {
          name: "InvalidRequestException",
        });
      },
    },
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });

  await assert.rejects(vault.deleteDelegatedCredential({
    credential_ref:
      "aws-secrets-manager:lawos/test/m365/managed-secret",
    reason: "retired credential cleanup retry",
  }), /managed by another service/u);
});

test("AWS M365 vault는 아직 없는 deterministic ref도 tombstone 삭제 예약으로 선점한다", async () => {
  const commands = [];
  let secretString = null;
  let scheduled = false;
  const client = {
    async send(command) {
      const name = command.constructor.name;
      commands.push(name);
      if (name === "PutSecretValueCommand") {
        if (secretString === null) {
          throw Object.assign(new Error("missing"), {
            name: "ResourceNotFoundException",
          });
        }
        if (scheduled) {
          throw Object.assign(new Error("secret is scheduled for deletion"), {
            name: "InvalidRequestException",
          });
        }
        secretString = command.input.SecretString;
        return {};
      }
      if (name === "CreateSecretCommand") {
        if (secretString !== null || scheduled) {
          throw Object.assign(new Error("exists"), {
            name: "ResourceExistsException",
          });
        }
        secretString = command.input.SecretString;
        return {};
      }
      if (name === "DeleteSecretCommand") {
        scheduled = true;
        return {};
      }
      if (name === "GetSecretValueCommand") {
        if (scheduled) {
          throw Object.assign(new Error("secret is scheduled for deletion"), {
            name: "InvalidRequestException",
          });
        }
        return { SecretString: secretString };
      }
      throw new Error(`unexpected command: ${name}`);
    },
  };
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client,
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });
  const identity = {
    tenant_id: "tenant-missing-generation",
    user_id: "user-missing-generation",
    entra_subject_id: "subject-missing-generation",
    credential_generation: "m365-connection-state-2",
  };
  const credentialRef = vault.referenceForGeneration(identity);

  await vault.deleteDelegatedCredential({
    credential_ref: credentialRef,
    reason: "concurrent revoke",
  });
  assert.deepEqual(commands, [
    "PutSecretValueCommand",
    "CreateSecretCommand",
    "DeleteSecretCommand",
  ]);
  assert.equal(scheduled, true);
  assert.equal(JSON.parse(secretString).credential_tombstone, true);
  assert.equal(secretString.includes("access_token"), false);
  assert.equal(secretString.includes("refresh_token"), false);

  const storedRef = await vault.storeDelegatedCredential({
    ...identity,
    token_bundle: {
      access_token: "late-access-must-not-persist",
      refresh_token: "late-refresh-must-not-persist",
      refresh_profile: "client",
      refresh_profile_proof: CLIENT_REFRESH_PROOF,
    },
  });
  assert.equal(storedRef, credentialRef);
  assert.equal(secretString.includes("late-access-must-not-persist"), false);
  await assert.rejects(vault.resolveDelegatedCredential({
    credential_ref: credentialRef,
  }), (error) => (
    error.safe_error_code === "M365_REAUTHORIZATION_REQUIRED"
    && error.status === 401
  ));
});

test("AWS M365 vault cleanup과 deterministic Create가 경합하면 tombstone 삭제가 이긴다", async () => {
  const commands = [];
  let secretString = null;
  let scheduled = false;
  const client = {
    async send(command) {
      const name = command.constructor.name;
      commands.push(name);
      if (name === "PutSecretValueCommand") {
        if (secretString === null) {
          throw Object.assign(new Error("missing"), {
            name: "ResourceNotFoundException",
          });
        }
        secretString = command.input.SecretString;
        return {};
      }
      if (name === "CreateSecretCommand") {
        secretString = JSON.stringify({
          access_token: "racing-access-must-be-erased",
          refresh_token: "racing-refresh-must-be-erased",
        });
        throw Object.assign(new Error("racing create won"), {
          name: "ResourceExistsException",
        });
      }
      if (name === "DeleteSecretCommand") {
        scheduled = true;
        return {};
      }
      throw new Error(`unexpected command: ${name}`);
    },
  };
  const vault = createAwsM365CredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/m365",
    client,
    idFactory: () => "00000000-0000-4000-8000-000000000001",
  });

  await vault.deleteDelegatedCredential({
    credential_ref:
      "aws-secrets-manager:lawos/test/m365/racing-generation",
    reason: "concurrent revoke",
  });
  assert.deepEqual(commands, [
    "PutSecretValueCommand",
    "CreateSecretCommand",
    "PutSecretValueCommand",
    "DeleteSecretCommand",
  ]);
  assert.equal(scheduled, true);
  assert.equal(JSON.parse(secretString).credential_tombstone, true);
  assert.equal(secretString.includes("racing-access-must-be-erased"), false);
  assert.equal(secretString.includes("racing-refresh-must-be-erased"), false);
});
