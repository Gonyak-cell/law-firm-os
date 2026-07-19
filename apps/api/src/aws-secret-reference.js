import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
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
