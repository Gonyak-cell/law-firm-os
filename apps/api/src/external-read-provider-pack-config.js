import { createHash } from "node:crypto";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  normalizeExternalReadProviderPack,
} from "../../../packages/integrations-core/src/external-read-provider-pack.js";
import { resolveAwsSecretString } from "./aws-secret-reference.js";

export const LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV =
  "LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON";
export const LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV =
  "LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256";
export const LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV =
  "LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID";
export const EXTERNAL_READ_PROVIDER_PACK_BUNDLE_SCHEMA_VERSION =
  "law-firm-os.external-read-provider-pack-bundle.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_BUNDLE_BYTES = 64 * 1024;
const SECRET_ID = /^[A-Za-z0-9/_+=.@-]{1,512}$/u;

function closedObject(value, field, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unsupported.length > 0) {
    throw new TypeError(`${field} contains unsupported fields: ${unsupported.join(", ")}`);
  }
  return value;
}

export function resolveExternalReadProviderPacks({ env = process.env } = {}) {
  const raw = String(env?.[LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV] ?? "");
  const expectedHash = String(env?.[LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV] ?? "").trim();
  if (!raw && !expectedHash) return Object.freeze([]);
  if (!raw || !SHA256.test(expectedHash)) {
    throw new TypeError(
      `${LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV} and ${LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV} must be configured together`,
    );
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BUNDLE_BYTES) {
    throw new TypeError("external read provider pack bundle is too large");
  }
  const actualHash = createHash("sha256").update(raw).digest("hex");
  if (actualHash !== expectedHash) {
    throw Object.assign(new Error("External read provider pack bundle hash mismatch"), {
      safe_error_code: "EXTERNAL_READ_PROVIDER_PACK_BUNDLE_HASH_MISMATCH",
      status: 500,
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError("external read provider pack bundle must be valid JSON");
  }
  closedObject(parsed, "provider pack bundle", ["schema_version", "packs"]);
  if (parsed.schema_version !== EXTERNAL_READ_PROVIDER_PACK_BUNDLE_SCHEMA_VERSION) {
    throw new TypeError("external read provider pack bundle schema_version is unsupported");
  }
  if (!Array.isArray(parsed.packs) || parsed.packs.length > 32) {
    throw new TypeError("provider pack bundle packs must contain at most 32 entries");
  }
  const packs = parsed.packs.map((pack) => normalizeExternalReadProviderPack({
    ...pack,
    schema_version: pack?.schema_version ?? EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  }));
  return Object.freeze(packs);
}

export async function resolveExternalReadProviderPacksFromConfig({
  env = process.env,
  client,
  resolveSecret = resolveAwsSecretString,
} = {}) {
  const inline = String(env?.[LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV] ?? "");
  const secretId = String(
    env?.[LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV] ?? "",
  ).trim();
  const expectedHash = String(
    env?.[LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV] ?? "",
  ).trim();
  if (inline && secretId) {
    throw new TypeError("external read provider packs must use exactly one configuration source");
  }
  if (!secretId) return resolveExternalReadProviderPacks({ env });
  if (!SECRET_ID.test(secretId) || secretId.split("/").some((part) => part === "..")) {
    throw new TypeError(`${LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV} is invalid`);
  }
  if (!SHA256.test(expectedHash)) {
    throw new TypeError(
      `${LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV} and ${LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV} must be configured together`,
    );
  }
  const region = String(env?.AWS_REGION ?? env?.AWS_DEFAULT_REGION ?? "").trim();
  if (!region) throw new TypeError("AWS region is required for provider pack secret resolution");
  const raw = await resolveSecret({ secretId, region, client });
  return resolveExternalReadProviderPacks({
    env: {
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: raw,
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]: expectedHash,
    },
  });
}

export function hashExternalReadProviderPackBundle(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(raw).digest("hex");
}
