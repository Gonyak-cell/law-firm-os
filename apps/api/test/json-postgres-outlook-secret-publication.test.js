import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  normalizeJsonPostgresOutlookSecretReference,
  publishJsonPostgresOutlookDatabaseSecret,
} from "../src/json-postgres-outlook-secret-publication.js";

const OPERATION_SHA256 = "1".repeat(64);
const CLAIM_SHA256 = "2".repeat(64);
const SECRET_STRING = canonicalizeJson({
  schema_version: "law-firm-os.outlook-database-secret.v1",
  username: "lawos_outlook_control_operator",
  password: "outlook-control-password",
});
const SECRET_ARNS = Object.freeze([
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:/lawos/production/postgres/outlook-control-operator-a1b2c3",
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:/lawos/production/postgres/outlook-assignment-worker-d4e5f6",
]);
const SECRET_NAMES = Object.freeze([
  "/lawos/production/postgres/outlook-control-operator",
  "/lawos/production/postgres/outlook-assignment-worker",
]);

function input(overrides = {}) {
  return {
    secretId: SECRET_NAMES[0],
    secretString: SECRET_STRING,
    operationBindingSha256: OPERATION_SHA256,
    claimSha256: CLAIM_SHA256,
    ...overrides,
  };
}

function version({ arn = SECRET_ARNS[0], versionId,
  secretString = SECRET_STRING }) {
  return {
    ARN: arn,
    VersionId: versionId,
    VersionStages: ["AWSCURRENT"],
    SecretString: secretString,
  };
}

test("Outlook secret publication uses distinct deterministic version tokens", async () => {
  const tokens = [];
  for (let index = 0; index < SECRET_NAMES.length; index += 1) {
    const secretId = SECRET_NAMES[index];
    const receipt = await publishJsonPostgresOutlookDatabaseSecret(input({
      secretId,
      putSecretValue: async ({ clientRequestToken }) => {
        tokens.push(clientRequestToken);
        return version({ arn: SECRET_ARNS[index], versionId: clientRequestToken });
      },
      getSecretValue: async () => assert.fail("successful Put must not read"),
    }));
    assert.deepEqual(Object.keys(receipt).sort(), [
      "intended_secret_sha256",
      "outcome",
      "schema_version",
      "secret_id_sha256",
      "secret_write_attempted",
      "secret_write_commit_ambiguous",
      "secret_write_committed",
      "version_id",
    ]);
    assert.equal(receipt.outcome, "COMMITTED");
    assert.equal(receipt.secret_write_attempted, true);
    assert.equal(receipt.secret_write_committed, true);
    assert.equal(receipt.secret_write_commit_ambiguous, false);
    assert.equal(JSON.stringify(receipt).includes(SECRET_STRING), false);
    assert.equal(JSON.stringify(receipt).includes(secretId), false);
  }
  assert.match(tokens[0], /^[0-9a-f]{64}$/u);
  assert.notEqual(tokens[0], tokens[1]);

  const repeated = [];
  for (let index = 0; index < 2; index += 1) {
    await publishJsonPostgresOutlookDatabaseSecret(input({
      putSecretValue: async ({ clientRequestToken }) => {
        repeated.push(clientRequestToken);
        return version({ versionId: clientRequestToken });
      },
      getSecretValue: async () => assert.fail("successful Put must not read"),
    }));
  }
  assert.equal(repeated[0], repeated[1]);
});

test("Outlook secret publication reconciles response loss from two exact views", async () => {
  let token;
  const gets = [];
  const receipt = await publishJsonPostgresOutlookDatabaseSecret(input({
    putSecretValue: async ({ clientRequestToken }) => {
      token = clientRequestToken;
      throw new Error("synthetic response loss");
    },
    getSecretValue: async (request) => {
      gets.push(request);
      return version({ versionId: token });
    },
  }));
  assert.equal(receipt.secret_write_committed, true);
  assert.deepEqual(gets, [
    { secretId: SECRET_NAMES[0], versionId: token },
    { secretId: SECRET_NAMES[0], versionStage: "AWSCURRENT" },
  ]);
});

test("Outlook secret publication distinguishes no commit from unknown commit", async () => {
  for (const getSecretValue of [
    async () => {
      throw Object.assign(new Error("missing"), {
        name: "ResourceNotFoundException",
      });
    },
    async ({ versionId }) => version({
      arn: SECRET_ARNS[1],
      versionId: versionId ?? "f".repeat(64),
      secretString: `${SECRET_STRING} `,
    }),
    async () => version({
      versionId: "f".repeat(64),
    }),
  ]) {
    let failure;
    await assert.rejects(
      publishJsonPostgresOutlookDatabaseSecret(input({
        putSecretValue: async () => {
          throw new Error("synthetic response loss");
        },
        getSecretValue,
      })),
      (error) => {
        failure = error;
        return error?.code === "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED"
          && error.outlook_secret_publication?.secret_write_committed === false
          && !error.outlook_secret_publication
            .secret_write_commit_ambiguous;
      },
    );
    assert.equal(JSON.stringify(failure).includes(SECRET_STRING), false);
    assert.equal(JSON.stringify(failure).includes(SECRET_NAMES[0]), false);
  }

  for (const readbackError of [
    new Error("synthetic readback loss"),
    Object.assign(new Error("generic 404"), {
      $metadata: { httpStatusCode: 404 },
    }),
  ]) {
    let ambiguous;
    await assert.rejects(publishJsonPostgresOutlookDatabaseSecret(input({
      putSecretValue: async () => { throw new Error("response loss"); },
      getSecretValue: async () => { throw readbackError; },
    })), (error) => {
      ambiguous = error;
      return error?.code === "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN"
        && error.outlook_secret_publication?.secret_write_committed === null
        && error.outlook_secret_publication.secret_write_commit_ambiguous;
    });
    assert.equal(JSON.stringify(ambiguous).includes(SECRET_STRING), false);
    assert.equal(JSON.stringify(ambiguous).includes(SECRET_NAMES[0]), false);
  }
});

test("Outlook secret publication snapshots each AWS response field once", async () => {
  const reads = new Map();
  const once = (name, value) => ({
    enumerable: true,
    get() {
      reads.set(name, (reads.get(name) ?? 0) + 1);
      return value;
    },
  });
  let token;
  const response = {};
  Object.defineProperties(response, {
    ARN: once("ARN", SECRET_ARNS[0]),
    VersionId: {
      enumerable: true,
      get() {
        reads.set("VersionId", (reads.get("VersionId") ?? 0) + 1);
        return token;
      },
    },
    VersionStages: once("VersionStages", ["AWSCURRENT"]),
  });
  await publishJsonPostgresOutlookDatabaseSecret(input({
    putSecretValue: async ({ clientRequestToken }) => {
      token = clientRequestToken;
      return response;
    },
    getSecretValue: async () => assert.fail("successful Put must not read"),
  }));
  assert.deepEqual(Object.fromEntries(reads), {
    ARN: 1,
    VersionId: 1,
    VersionStages: 1,
  });

  const readbackCounts = new Map();
  let readbackToken;
  let readIndex = 0;
  await publishJsonPostgresOutlookDatabaseSecret(input({
    putSecretValue: async ({ clientRequestToken }) => {
      readbackToken = clientRequestToken;
      throw new Error("synthetic response loss");
    },
    getSecretValue: async () => {
      const prefix = `read-${readIndex}`;
      readIndex += 1;
      const value = {};
      const field = (name, fieldValue) => ({
        enumerable: true,
        get() {
          const key = `${prefix}:${name}`;
          readbackCounts.set(key, (readbackCounts.get(key) ?? 0) + 1);
          return fieldValue;
        },
      });
      Object.defineProperties(value, {
        ARN: field("ARN", SECRET_ARNS[0]),
        VersionId: field("VersionId", readbackToken),
        VersionStages: field("VersionStages", ["AWSCURRENT"]),
        SecretString: field("SecretString", SECRET_STRING),
      });
      return value;
    },
  }));
  assert.equal(readbackCounts.size, 8);
  assert.ok([...readbackCounts.values()].every((count) => count === 1));
});

test("Outlook secret publication rejects invalid input before AWS access", async () => {
  const rdsManagedArn = "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:rds!db-00000000-0000-4000-8000-000000000000-a1b2c3";
  for (const overrides of [{ secretString: `${SECRET_STRING} ` },
    { secretId: "lawos/outlook!invalid" },
    { secretId: rdsManagedArn }]) {
    let calls = 0;
    await assert.rejects(publishJsonPostgresOutlookDatabaseSecret(input({
      ...overrides, putSecretValue: async () => { calls += 1; },
      getSecretValue: async () => { calls += 1; },
    })), (error) => error?.code === "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED");
    assert.equal(calls, 0);
  }
  assert.equal(normalizeJsonPostgresOutlookSecretReference(rdsManagedArn, {
    allowRdsManagedArn: true,
  }).secret_name, "rds!db-00000000-0000-4000-8000-000000000000");
});
