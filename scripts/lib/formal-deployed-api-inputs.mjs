import { readFileSync } from "node:fs";
import {
  PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS,
} from "./private-staging-execution-receipt.mjs";
import {
  exactKeys,
  fail,
  privateRegularFile,
  sha256Bytes,
} from "./formal-deployed-api-io.mjs";

export const FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA =
  "law-firm-os.formal-deployed-api-package-qa-credential.v2";
export const FORMAL_DEPLOYED_API_QA_CREDENTIAL_ACCOUNT_CAPABILITY_SCHEMA =
  "law-firm-os.formal-deployed-api-credential-account-capability.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+=-]{2,256}$/u;
const API_ID = /^[a-z0-9]{8,32}$/u;
const PRODUCTION_API_IDS = new Set(["9mg4liadm6"]);
const LOADED_CREDENTIAL_ACCOUNTS = new WeakMap();
const CREDENTIAL_ACCOUNT_CAPABILITIES = new WeakMap();

function safeText(value, label, pattern = SAFE_ID) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("FORMAL_DEPLOYED_API_QA_VALUE", `${label} is invalid`);
  }
  return value;
}

export function validatePrivateStagingEndpointContract(endpoint) {
  exactKeys(endpoint, [
    "account_id", "api_base_url", "api_id", "data_scope", "environment",
    "production", "region", "stack_name",
  ], "credential endpoint");
  if (endpoint.environment !== "lawos-staging"
    || endpoint.stack_name !== "lawos-private-staging"
    || endpoint.account_id !== "770880870480"
    || endpoint.region !== "ap-northeast-2"
    || endpoint.data_scope !== "synthetic-only"
    || endpoint.production !== false
    || !API_ID.test(endpoint.api_id)
    || PRODUCTION_API_IDS.has(endpoint.api_id)) {
    fail("FORMAL_DEPLOYED_API_QA_ENDPOINT", "endpoint is not an allowed LawOS private-staging API");
  }
  let parsed;
  try {
    parsed = new URL(endpoint.api_base_url);
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_ENDPOINT", "endpoint URL is invalid");
  }
  const host = `${endpoint.api_id}.execute-api.${endpoint.region}.amazonaws.com`;
  if (parsed.protocol !== "https:"
    || parsed.hostname !== host
    || parsed.port !== ""
    || parsed.username !== ""
    || parsed.password !== ""
    || !["", "/"].includes(parsed.pathname)
    || parsed.search !== ""
    || parsed.hash !== "") {
    fail("FORMAL_DEPLOYED_API_QA_ENDPOINT", "endpoint must be the exact private-staging HTTPS API origin");
  }
  return Object.freeze({ ...endpoint, api_base_url: parsed.origin, endpoint_sha256: sha256Bytes(parsed.origin) });
}

function validateAuthorityInputs(value) {
  exactKeys(value, [
    "approval_receipt_path", "approval_signature_path", "exact_head_packet_path",
    "execution_receipts", "package_artifact_path", "package_manifest_path",
    "package_qa_receipt_path", "synthetic_identity_manifest_path",
    "trust_registry_path", "trust_registry_sha256",
  ], "credential authority");
  if (!SHA256.test(value.trust_registry_sha256 ?? "")) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "trust registry digest is invalid");
  }
  for (const key of Object.keys(value).filter((key) => key.endsWith("_path"))) {
    safeText(value[key], `authority.${key}`, /^.{1,4096}$/u);
  }
  if (!Array.isArray(value.execution_receipts)
    || value.execution_receipts.length !== PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.length) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "all pre-suite execution receipts are required");
  }
  const kinds = [];
  for (const entry of value.execution_receipts) {
    exactKeys(entry, ["kind", "receipt_path", "signature_path"], "execution receipt input");
    safeText(entry.kind, "execution receipt kind");
    safeText(entry.receipt_path, "execution receipt path", /^.{1,4096}$/u);
    safeText(entry.signature_path, "execution receipt signature path", /^.{1,4096}$/u);
    kinds.push(entry.kind);
  }
  if (JSON.stringify([...kinds].sort()) !== JSON.stringify([...PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS].sort())) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "execution receipt kinds are incomplete or duplicated");
  }
  return value;
}

export function validateFormalDeployedApiCredential(value) {
  exactKeys(value, ["account", "authority", "endpoint", "schema_version"], "credential file");
  if (value.schema_version !== FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "credential schema is invalid");
  }
  const endpoint = validatePrivateStagingEndpointContract(value.endpoint);
  exactKeys(value.account, ["email", "matter_id", "other_tenant_id", "password", "tenant_id"], "credential account");
  for (const field of ["tenant_id", "other_tenant_id", "matter_id"]) safeText(value.account[field], `account.${field}`);
  if (value.account.tenant_id === value.account.other_tenant_id) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "negative tenant must differ from the synthetic staging tenant");
  }
  if (typeof value.account.email !== "string" || !/^\S+@\S+$/u.test(value.account.email)) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "credential email is invalid");
  }
  if (typeof value.account.password !== "string" || value.account.password.length < 1 || value.account.password.length > 1024) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "credential password is invalid");
  }
  return Object.freeze({
    schema_version: value.schema_version,
    endpoint,
    account: Object.freeze({ ...value.account }),
    authority: Object.freeze(validateAuthorityInputs(value.authority)),
  });
}

export function readFormalDeployedApiCredentialFile(path, { rootDir = process.cwd() } = {}) {
  const input = privateRegularFile(path, rootDir, "credential file");
  try {
    const credential = validateFormalDeployedApiCredential(JSON.parse(readFileSync(input, "utf8")));
    LOADED_CREDENTIAL_ACCOUNTS.set(credential, Object.freeze({
      email: credential.account.email,
      matter_id: credential.account.matter_id,
      other_tenant_id: credential.account.other_tenant_id,
      password: credential.account.password,
      tenant_id: credential.account.tenant_id,
    }));
    return credential;
  } catch (error) {
    if (error?.code) throw error;
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "credential file is not valid JSON");
  }
}

export function mintFormalDeployedApiCredentialAccountCapability(credential, { tenantId, otherTenantId, matterId } = {}) {
  const account = LOADED_CREDENTIAL_ACCOUNTS.get(credential);
  if (!account
    || account.tenant_id !== safeText(tenantId, "credential capability tenant")
    || account.other_tenant_id !== safeText(otherTenantId, "credential capability negative tenant")
    || account.other_tenant_id === account.tenant_id
    || account.matter_id !== safeText(matterId, "credential capability Matter")) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY", "credential account capability requires the canonical tenant-bound credential loader");
  }
  const capability = Object.freeze({
    schema_version: FORMAL_DEPLOYED_API_QA_CREDENTIAL_ACCOUNT_CAPABILITY_SCHEMA,
  });
  CREDENTIAL_ACCOUNT_CAPABILITIES.set(capability, account);
  return capability;
}

export function validateFormalDeployedApiCredentialAccountCapability(capability, { tenantId, otherTenantId, matterId } = {}) {
  const account = CREDENTIAL_ACCOUNT_CAPABILITIES.get(capability);
  if (!account
    || capability?.schema_version !== FORMAL_DEPLOYED_API_QA_CREDENTIAL_ACCOUNT_CAPABILITY_SCHEMA
    || account.other_tenant_id === account.tenant_id) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY", "credential account capability was not issued by the canonical credential loader");
  }
  if ((tenantId !== undefined && account.tenant_id !== safeText(tenantId, "credential capability tenant"))
    || (otherTenantId !== undefined && account.other_tenant_id !== safeText(otherTenantId, "credential capability negative tenant"))
    || (matterId !== undefined && account.matter_id !== safeText(matterId, "credential capability Matter"))) {
    fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL_CAPABILITY", "credential account capability does not match the expected tenant and Matter");
  }
  return account;
}
