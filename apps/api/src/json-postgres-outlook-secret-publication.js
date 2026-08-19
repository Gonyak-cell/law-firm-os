import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

const SCHEMA_VERSION = "law-firm-os.outlook-database-secret-publication.v1";
const TOKEN_DOMAIN = "law-firm-os/outlook-database-secret-publication-token/v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const SECRET_NAME = /^[A-Za-z0-9/_+=.@-]{1,512}$/u;
const SECRET_ARN = /^arn:(?:aws|aws-us-gov|aws-cn):secretsmanager:[a-z0-9-]+:\d{12}:secret:([A-Za-z0-9/_+=.@!-]{1,512})-([A-Za-z0-9]{6})$/u;
const RDS_MANAGED_SECRET_NAME = /^rds!db-[A-Za-z0-9-]{1,200}$/u;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function exactText(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError(`${label} is required`);
  }
  return value;
}

export function normalizeJsonPostgresOutlookSecretReference(value, { allowRdsManagedArn = false } = {}) {
  const secretId = exactText(value, "Outlook secret id");
  const arn = SECRET_ARN.exec(secretId);
  if ((!arn && !SECRET_NAME.test(secretId))
    || (arn && !SECRET_NAME.test(arn[1])
      && !(allowRdsManagedArn && RDS_MANAGED_SECRET_NAME.test(arn[1])))) {
    throw new TypeError("Outlook secret id is invalid");
  }
  return Object.freeze({ secret_id: secretId, secret_name: arn?.[1] ?? secretId, secret_arn: arn ? secretId : null });
}

function missingSecretVersion(error) {
  const name = error?.name;
  const code = error?.code;
  return name === "ResourceNotFoundException"
    || code === "ResourceNotFoundException";
}

function publicationIdentity({
  secretId,
  secretString,
  operationBindingSha256,
  claimSha256,
}) {
  let secretReference;
  let exactSecretString;
  try {
    secretReference = normalizeJsonPostgresOutlookSecretReference(secretId);
    exactSecretString = exactText(
      secretString,
      "Outlook canonical secret bytes",
    );
  } catch {
    fail(
      "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
      "Outlook secret publication binding is invalid",
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(exactSecretString);
  } catch {
    fail(
      "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
      "Outlook secret publication bytes are invalid",
    );
  }
  if (canonicalizeJson(parsed) !== exactSecretString
    || typeof operationBindingSha256 !== "string"
    || !SHA256.test(operationBindingSha256)
    || typeof claimSha256 !== "string"
    || !SHA256.test(claimSha256)) {
    fail(
      "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED",
      "Outlook secret publication binding is invalid",
    );
  }
  const secretIdSha256 = createHash("sha256")
    .update(canonicalizeJson(secretReference))
    .digest("hex");
  const secretBytes = Buffer.from(exactSecretString, "utf8");
  let intendedSecretSha256;
  try {
    intendedSecretSha256 = createHash("sha256")
      .update(secretBytes)
      .digest("hex");
  } finally {
    secretBytes.fill(0);
  }
  const clientRequestToken = createHash("sha256")
    .update(TOKEN_DOMAIN)
    .update("\0")
    .update(canonicalizeJson({
      operation_binding_sha256: operationBindingSha256,
      claim_sha256: claimSha256,
      secret_id_sha256: secretIdSha256,
      intended_secret_sha256: intendedSecretSha256,
    }))
    .digest("hex");
  return Object.freeze({
    secretId: secretReference.secret_id,
    secretReference,
    secretString: exactSecretString,
    secret_id_sha256: secretIdSha256,
    intended_secret_sha256: intendedSecretSha256,
    client_request_token: clientRequestToken,
  });
}

function publicationReceipt(identity, {
  committed,
  ambiguous,
  safeCode = null,
}) {
  const value = {
    schema_version: SCHEMA_VERSION,
    outcome: committed === true ? "COMMITTED" : "BLOCKED",
    secret_write_attempted: true,
    secret_write_committed: committed,
    secret_write_commit_ambiguous: ambiguous,
    secret_id_sha256: identity.secret_id_sha256,
    intended_secret_sha256: identity.intended_secret_sha256,
    version_id: identity.client_request_token,
  };
  if (safeCode !== null) value.safe_code = safeCode;
  return Object.freeze(value);
}

function publicationError(identity, { committed, ambiguous }) {
  const code = ambiguous
    ? "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN"
    : "LAWOS_OUTLOOK_SECRET_PUBLICATION_FAILED";
  const error = new Error(
    ambiguous
      ? "Outlook secret publication commit state is unknown"
      : "Outlook secret publication did not commit",
  );
  error.code = code;
  error.outlook_secret_publication = publicationReceipt(identity, {
    committed,
    ambiguous,
    safeCode: code,
  });
  return error;
}

function snapshotSecretVersion(value, { includeSecretString }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const arn = value.ARN;
  const versionId = value.VersionId;
  const rawStages = value.VersionStages;
  const secretString = includeSecretString ? value.SecretString : null;
  const versionStages = Array.isArray(rawStages) ? [...rawStages] : null;
  return Object.freeze({ arn, versionId, versionStages, secretString });
}

function exactObservedArn(arn, identity) {
  let observed;
  try { observed = normalizeJsonPostgresOutlookSecretReference(arn); }
  catch { return false; }
  return observed.secret_arn !== null
    && (identity.secretReference.secret_arn === null
      ? observed.secret_name === identity.secretReference.secret_name
      : observed.secret_arn === identity.secretReference.secret_arn);
}

function exactPutVersion(value, identity) {
  const snapshot = snapshotSecretVersion(value, {
    includeSecretString: false,
  });
  return exactObservedArn(snapshot?.arn, identity)
    && snapshot.versionId === identity.client_request_token
    && snapshot.versionStages?.length === 1
    && snapshot.versionStages[0] === "AWSCURRENT";
}

function exactReadVersion(value, identity) {
  const snapshot = snapshotSecretVersion(value, {
    includeSecretString: true,
  });
  return exactObservedArn(snapshot?.arn, identity)
    && snapshot.versionId === identity.client_request_token
    && snapshot.versionStages?.length === 1
    && snapshot.versionStages[0] === "AWSCURRENT"
    && snapshot.secretString === identity.secretString;
}

export async function publishJsonPostgresOutlookDatabaseSecret({
  secretId,
  secretString,
  operationBindingSha256,
  claimSha256,
  putSecretValue,
  getSecretValue,
} = {}) {
  if (typeof putSecretValue !== "function"
    || typeof getSecretValue !== "function") {
    throw new TypeError("Outlook secret publication clients are required");
  }
  const identity = publicationIdentity({
    secretId,
    secretString,
    operationBindingSha256,
    claimSha256,
  });
  try {
    if (exactPutVersion(await putSecretValue({
      secretId: identity.secretId,
      secretString: identity.secretString,
      clientRequestToken: identity.client_request_token,
    }), identity)) {
      return publicationReceipt(identity, {
        committed: true,
        ambiguous: false,
      });
    }
  } catch {
    // Reconcile both deterministic views before classifying response loss.
  }
  const observeVersion = async (request) => {
    try {
      return Object.freeze({
        conclusive: true,
        exact: exactReadVersion(await getSecretValue(request), identity),
      });
    } catch (error) {
      return missingSecretVersion(error)
        ? Object.freeze({ conclusive: true, exact: false })
        : Object.freeze({ conclusive: false, exact: false });
    }
  };
  const exactVersion = await observeVersion({
    secretId: identity.secretId,
    versionId: identity.client_request_token,
  });
  const currentVersion = await observeVersion({
    secretId: identity.secretId,
    versionStage: "AWSCURRENT",
  });
  if (!exactVersion.conclusive || !currentVersion.conclusive) {
    throw publicationError(identity, { committed: null, ambiguous: true });
  }
  if (!exactVersion.exact || !currentVersion.exact) {
    throw publicationError(identity, { committed: false, ambiguous: false });
  }
  return publicationReceipt(identity, { committed: true, ambiguous: false });
}
