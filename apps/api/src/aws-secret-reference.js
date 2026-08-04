import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export const LAWOS_M365_CONFIG_SECRET_ID_ENV =
  "LAWOS_M365_CONFIG_SECRET_ID";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function resolveM365ConfigSecretId({
  env = process.env,
  specificEnvName,
} = {}) {
  const specificName = requiredText(
    specificEnvName,
    "specific M365 config Secret environment name",
  );
  for (const name of [specificName, LAWOS_M365_CONFIG_SECRET_ID_ENV]) {
    const secretId = String(env?.[name] ?? "").trim();
    if (secretId) return secretId;
  }
  throw new TypeError(
    `${specificName} or ${LAWOS_M365_CONFIG_SECRET_ID_ENV} is required`,
  );
}

export async function resolveAwsSecretString({ secretId, region, client } = {}) {
  const id = requiredText(secretId, "secretId");
  const resolvedRegion = requiredText(region, "region");
  const secrets = client ?? new SecretsManagerClient({ region: resolvedRegion });
  const response = await secrets.send(new GetSecretValueCommand({ SecretId: id }));
  if (typeof response.SecretString === "string") return response.SecretString;
  if (response.SecretBinary) return Buffer.from(response.SecretBinary).toString("utf8");
  throw new Error("AWS secret reference resolved without secret material");
}

export async function resolveAwsJsonSecret(options = {}) {
  const value = JSON.parse(await resolveAwsSecretString(options));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("AWS secret reference must contain a JSON object");
  }
  return Object.freeze({ ...value });
}
