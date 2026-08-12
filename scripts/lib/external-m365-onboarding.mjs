import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { readFile, writeFile, chmod, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseOutlookManifest } from "../lib/outlook-manifest-projection.mjs";
import { validateOutlookAddinSurfaces } from "../validate-outlook-addin-surfaces.mjs";
import {
  CLIENT_GRAPH_SCOPES,
  CLIENT_OAUTH_SCOPES,
  CLIENT_SCOPE_FINGERPRINT_SHA256,
} from "./outlook-release/constants.mjs";

export const EXTERNAL_M365_ONBOARDING_SCHEMA =
  "amic-os.external-m365-onboarding-bundle.v2";
export const EXTERNAL_M365_ONBOARDING_INPUT_SCHEMA =
  "amic-os.external-m365-onboarding-bundle.v2.input";
export const EXTERNAL_M365_ONBOARDING_PUBLIC_SCHEMA =
  "amic-os.external-m365-onboarding-public-evidence.v2";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[a-f0-9]{64}$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const LAWOS_TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const PROFILE_NAMES = new Set(["matter-full", "inquiry-only"]);
const DEFAULT_PROFILE = "matter-full";
const CHECKLIST_STATUS = "pending_external_verification";
const DEPLOYMENT_MODEL = "tenant_pinned_single_tenant";
const MIN_PILOT_MEMBER_COUNT = 2;
const MAX_PILOT_MEMBER_COUNT = 1000;
const CHECKLIST_IDS = Object.freeze([
  "M365-ADMIN-01",
  "M365-ADMIN-02",
  "M365-ADMIN-03",
  "M365-PILOT-POS-01",
  "M365-PILOT-POS-02",
  "M365-PILOT-NEG-01",
  "M365-PILOT-NEG-02",
  "M365-ROLLBACK-01",
]);
const ALIAS_HOSTNAMES = new Set([
  "broadcasthost",
  "host.docker.internal",
  "ip6-localhost",
  "ip6-loopback",
  "kubernetes.default.svc",
  "localhost",
  "metadata",
  "metadata.google.internal",
]);
const ALIAS_HOST_LABELS = new Set([
  "broadcasthost",
  "ip6-localhost",
  "ip6-loopback",
  "localhost",
  "metadata",
]);

const INPUT_KEYS = Object.freeze([
  "schema_version",
  "lawos_tenant_id",
  "entra_tenant_id",
  "client_id",
  "admin_contact",
  "profile",
  "target_runtime_url",
  "runtime_config_digest_sha256",
  "runtime_config_receipt",
  "tenant_pinned",
  "pilot_group",
]);
const RUNTIME_RECEIPT_KEYS = Object.freeze([
  "target_runtime_url",
  "lawos_tenant_id",
  "entra_tenant_id",
  "config_digest_sha256",
  "host",
]);
const BUNDLE_KEYS = Object.freeze([
  "schema_version",
  "bundle_kind",
  "private",
  "no_provider_calls",
  "external_mutations",
  "appsource_claim",
  "deployment_model",
  "shared_runtime_claim",
  "tenant_pinned",
  "manifest_sha256",
  "runtime_config_digest_sha256",
  "private_admin_metadata",
  "target_runtime",
  "manifest",
  "auth",
  "pilot_group",
  "checklist",
  "rollback",
  "bundle_payload_sha256",
  "public_evidence",
]);
const PRIVATE_METADATA_KEYS = Object.freeze([
  "lawos_tenant_id",
  "entra_tenant_id",
  "client_id",
  "admin_contact",
]);
const TARGET_RUNTIME_KEYS = Object.freeze([
  "url",
  "url_sha256",
  "hostname",
  "host_sha256",
  "config_digest_sha256",
  "config_receipt_sha256",
  "receipt_present",
  "binding_sha256",
  "binding",
]);
const MANIFEST_KEYS = Object.freeze([
  "profile",
  "product_id",
  "version",
  "permission",
  "mailbox_min_version",
  "sha256",
  "semantic_sha256",
  "source_ref",
]);
const AUTH_KEYS = Object.freeze([
  "redirect_uris",
  "expected_redirect_uri",
  "oauth_scopes",
  "graph_connection_scopes",
  "scope_fingerprint_sha256",
  "redirect_profile",
]);
const PILOT_KEYS = Object.freeze([
  "display_name",
  "expected_member_count",
  "assignment_mode",
  "tenant_wide_assignment_allowed",
  "nested_groups_allowed",
  "max_visible_addins_per_user",
]);
const CHECKLIST_KEYS = Object.freeze([
  "id",
  "phase",
  "status",
  "requirement",
  "evidence_required",
]);
const ROLLBACK_KEYS = Object.freeze([
  "baseline_version",
  "baseline_manifest_sha256",
  "assignment_restore_policy",
  "rollback_contract_ref",
  "protected_manifest_ref",
  "raw_assignment_pii_included",
  "raw_manifest_xml_included",
  "secret_material_included",
]);
const PUBLIC_KEYS = Object.freeze([
  "schema_version",
  "private_bundle",
  "public_data_redacted",
  "tenant_binding",
  "lawos_tenant_fingerprint_sha256",
  "entra_tenant_fingerprint_sha256",
  "client_fingerprint_sha256",
  "pilot_group_binding_sha256",
  "pilot_group_expected_member_count",
  "target_runtime_url_sha256",
  "target_runtime_host_sha256",
  "runtime_config_digest_sha256",
  "target_runtime_binding_sha256",
  "deployment_model",
  "shared_runtime_claim",
  "manifest",
  "redirect_uris",
  "oauth_scopes",
  "graph_connection_scopes",
  "scope_fingerprint_sha256",
  "rollback",
  "appsource_claim",
  "provider_calls",
  "external_mutations",
  "bundle_payload_sha256",
]);
const PUBLIC_MANIFEST_KEYS = Object.freeze([
  "profile",
  "product_id",
  "version",
  "sha256",
  "semantic_sha256",
]);
const PUBLIC_ROLLBACK_KEYS = Object.freeze([
  "baseline_version",
  "baseline_manifest_sha256",
  "assignment_restore_policy",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

function bundlePayloadDigestMaterial(payload) {
  return {
    schema_version: payload.schema_version,
    bundle_kind: payload.bundle_kind,
    private: payload.private,
    no_provider_calls: payload.no_provider_calls,
    external_mutations: payload.external_mutations,
    appsource_claim: payload.appsource_claim,
    deployment_model: payload.deployment_model,
    shared_runtime_claim: payload.shared_runtime_claim,
    tenant_pinned: payload.tenant_pinned,
    manifest_sha256: payload.manifest_sha256,
    runtime_config_digest_sha256: payload.runtime_config_digest_sha256,
    private_admin_metadata: payload.private_admin_metadata,
    target_runtime: payload.target_runtime,
    manifest: payload.manifest,
    auth: {
      redirect_uris: payload.auth.redirect_uris,
      expected_redirect_uri: payload.auth.expected_redirect_uri,
      scope_fingerprint_sha256: payload.auth.scope_fingerprint_sha256,
      redirect_profile: payload.auth.redirect_profile,
    },
    pilot_group: payload.pilot_group,
    checklist: payload.checklist,
    rollback: payload.rollback,
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, allowed, name, required = allowed) {
  if (!isRecord(value)) throw new TypeError(`${name} must be an object`);
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new TypeError(`${name} contains unsupported fields: ${unknown.join(",")}`);
  }
  const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing.length > 0) {
    throw new TypeError(`${name} is missing required fields: ${missing.join(",")}`);
  }
  return value;
}

function requiredText(value, name, maxLength = 512) {
  if (typeof value !== "string") throw new TypeError(`${name} is required`);
  const text = value.normalize("NFKC").trim();
  if (!text || text.length > maxLength) throw new TypeError(`${name} is required`);
  return text;
}

function requiredUuid(value, name) {
  if (typeof value !== "string" || /[^\x00-\x7f]/u.test(value)) {
    throw new TypeError(`${name} must be an ASCII UUID`);
  }
  const text = requiredText(value, name, 64).toLowerCase();
  if (!UUID.test(text)) throw new TypeError(`${name} must be a UUID`);
  return text;
}

function requiredSha256(value, name) {
  const text = requiredText(value, name, 64).toLowerCase();
  if (!SHA256.test(text)) throw new TypeError(`${name} must be an exact SHA-256`);
  return text;
}

function requiredLawosTenantId(value) {
  if (typeof value !== "string" || /[^\x00-\x7f]/u.test(value)) {
    throw new TypeError("lawos_tenant_id must use the ASCII LawOS namespace");
  }
  const text = requiredText(value, "lawos_tenant_id", 128);
  if (!LAWOS_TENANT_ID.test(text) || UUID.test(text)) {
    throw new TypeError("lawos_tenant_id must be a LawOS tenant identity, not an Entra UUID");
  }
  return text;
}

function unsafeIpv4(hostname) {
  if (isIP(hostname) !== 4) return false;
  const octets = hostname.split(".").map(Number);
  const [a, b, c, d] = octets;
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && b >= 18 && b <= 19)
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
    || (a === 255 && b === 255 && c === 255 && d === 255);
}

function ipv6Words(hostname) {
  const text = hostname.toLowerCase();
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/u.test(part))) return null;
  if (halves.length === 1 && left.length !== 8) return null;
  if (halves.length === 2 && left.length + right.length >= 8) return null;
  const words = [...left.map((part) => Number.parseInt(part, 16)), ...Array(8 - left.length - right.length).fill(0), ...right.map((part) => Number.parseInt(part, 16))];
  return words.length === 8 ? words : null;
}

function unsafeIpv6(hostname) {
  if (isIP(hostname) !== 6) return false;
  const words = ipv6Words(hostname);
  if (!words) return true;
  const allZero = words.every((word) => word === 0);
  const loopback = allZero || words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const first = words[0];
  const uniqueLocal = (first & 0xfe00) === 0xfc00;
  const linkLocal = (first & 0xffc0) === 0xfe80;
  const multicast = (first & 0xff00) === 0xff00;
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (mapped) {
    const mappedIpv4 = `${words[6] >> 8}.${words[6] & 0xff}.${words[7] >> 8}.${words[7] & 0xff}`;
    return unsafeIpv4(mappedIpv4);
  }
  return loopback || uniqueLocal || linkLocal || multicast;
}

function targetRuntimeUrl(value) {
  if (typeof value !== "string" || /[^\x00-\x7f]/u.test(value)) {
    throw new TypeError("target_runtime_url must use an ASCII hostname and URL");
  }
  const text = requiredText(value, "target_runtime_url", 2048);
  if (text.includes("*")) throw new TypeError("target_runtime_url must not contain a wildcard host");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new TypeError("target_runtime_url must be an absolute HTTPS URL");
  }
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) hostname = hostname.slice(1, -1);
  if (
    url.protocol !== "https:"
    || !hostname
    || url.username
    || url.password
    || url.search
    || url.hash
    || hostname.endsWith(".")
    || hostname.includes("xn--")
    || /[^\x00-\x7f]/u.test(hostname)
    || ALIAS_HOSTNAMES.has(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || unsafeIpv4(hostname)
    || unsafeIpv6(hostname)
  ) {
    throw new TypeError("target_runtime_url must be a tenant-pinned HTTPS URL without credentials/query/hash or unsafe host aliases");
  }
  if (isIP(hostname) !== 0) {
    throw new TypeError("target_runtime_url host must be an ASCII DNS name; literal IP hosts are not admitted");
  }
  const labels = hostname.split(".");
  if (labels.length < 2 || labels.some((label) => !HOST_LABEL.test(label) || ALIAS_HOST_LABELS.has(label))) {
    throw new TypeError("target_runtime_url host must be an ASCII DNS name without wildcard/punycode aliases");
  }
  return {
    url: url.toString(),
    hostname,
  };
}

function optionalEmail(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = requiredText(value, "admin_contact", 320).toLowerCase();
  if (!EMAIL.test(text)) throw new TypeError("admin_contact must be an email address");
  return text;
}

function normalizeRuntimeReceipt(value, expected) {
  if (value === undefined || value === null) return null;
  assertExactKeys(value, RUNTIME_RECEIPT_KEYS, "runtime_config_receipt");
  const receiptUrl = targetRuntimeUrl(value.target_runtime_url);
  const receiptHost = requiredText(value.host, "runtime_config_receipt.host", 255).toLowerCase();
  if (
    receiptUrl.url !== expected.url
    || receiptHost !== expected.hostname
    || requiredLawosTenantId(value.lawos_tenant_id) !== expected.lawos_tenant_id
    || requiredUuid(value.entra_tenant_id, "runtime_config_receipt.entra_tenant_id") !== expected.entra_tenant_id
    || requiredSha256(value.config_digest_sha256, "runtime_config_receipt.config_digest_sha256") !== expected.configDigest
  ) {
    throw new Error("runtime_config_receipt is not exactly bound to the tenant-pinned target");
  }
  return {
    target_runtime_url: expected.url,
    lawos_tenant_id: expected.lawos_tenant_id,
    entra_tenant_id: expected.entra_tenant_id,
    config_digest_sha256: expected.configDigest,
    host: expected.hostname,
  };
}

function normalizeInput(input = {}) {
  assertExactKeys(input, INPUT_KEYS, "external M365 onboarding input", ["schema_version"]);
  if (input.schema_version !== EXTERNAL_M365_ONBOARDING_INPUT_SCHEMA) {
    throw new TypeError("external M365 onboarding input schema must be v2 with explicit tenant namespaces");
  }
  const lawosTenantId = requiredLawosTenantId(input.lawos_tenant_id);
  const entraTenantId = requiredUuid(input.entra_tenant_id, "entra_tenant_id");
  if (lawosTenantId.toLowerCase() === entraTenantId) {
    throw new TypeError("lawos_tenant_id and entra_tenant_id must not share a value");
  }
  const clientId = requiredUuid(input.client_id, "client_id");
  const profile = requiredText(input.profile ?? DEFAULT_PROFILE, "profile", 32);
  if (!PROFILE_NAMES.has(profile)) throw new TypeError("profile must be matter-full or inquiry-only");
  const runtime = targetRuntimeUrl(input.target_runtime_url);
  const configDigest = requiredSha256(input.runtime_config_digest_sha256, "runtime_config_digest_sha256");
  if (input.tenant_pinned !== true) {
    throw new Error("tenant_pinned=true is required; a shared or multi-tenant runtime is not admitted");
  }
  const runtimeConfigReceipt = normalizeRuntimeReceipt(input.runtime_config_receipt, {
    url: runtime.url,
    hostname: runtime.hostname,
    lawos_tenant_id: lawosTenantId,
    entra_tenant_id: entraTenantId,
    configDigest,
  });
  assertExactKeys(input.pilot_group, ["display_name", "expected_member_count"], "pilot_group");
  const groupDisplayName = requiredText(input.pilot_group.display_name, "pilot_group.display_name", 256);
  if (EMAIL.test(groupDisplayName)) throw new TypeError("pilot group display name must not be an email address");
  const expectedMemberCount = input.pilot_group.expected_member_count;
  if (typeof expectedMemberCount !== "number"
    || !Number.isSafeInteger(expectedMemberCount)
    || expectedMemberCount < MIN_PILOT_MEMBER_COUNT
    || expectedMemberCount > MAX_PILOT_MEMBER_COUNT) {
    throw new TypeError(`pilot_group.expected_member_count must be an integer JSON number from ${MIN_PILOT_MEMBER_COUNT} to ${MAX_PILOT_MEMBER_COUNT}`);
  }
  return {
    schema_version: EXTERNAL_M365_ONBOARDING_INPUT_SCHEMA,
    lawos_tenant_id: lawosTenantId,
    entra_tenant_id: entraTenantId,
    client_id: clientId,
    admin_contact: optionalEmail(input.admin_contact),
    profile,
    target_runtime_url: runtime.url,
    target_runtime_hostname: runtime.hostname,
    runtime_config_digest_sha256: configDigest,
    runtime_config_receipt: runtimeConfigReceipt,
    tenant_pinned: true,
    pilot_group: {
      display_name: groupDisplayName,
      expected_member_count: expectedMemberCount,
    },
  };
}

function bindingDigest({ lawosTenantId, entraTenantId, clientId, targetRuntimeUrl, hostname, configDigest }) {
  return sha256(canonicalJson({
    lawos_tenant_id: lawosTenantId,
    entra_tenant_id: entraTenantId,
    client_id: clientId,
    target_runtime_url: targetRuntimeUrl,
    target_runtime_hostname: hostname,
    runtime_config_digest_sha256: configDigest,
  }));
}

async function loadRedirectContract(repoRoot) {
  const runtimeModule = await import(pathToFileURL(
    path.join(repoRoot, "apps/api/src/microsoft-egress-broker-transport.js"),
  ).href);
  const redirects = runtimeModule.MICROSOFT_EGRESS_REDIRECT_URIS;
  if (!isRecord(redirects) || Object.keys(redirects).sort().join(",") !== "client,people"
    || typeof redirects.client !== "string" || redirects.client !== redirects.people) {
    throw new Error("Microsoft redirect URI runtime export is missing or split");
  }
  const redirect = targetRuntimeUrl(redirects.client).url;
  if (redirect !== redirects.client) {
    throw new Error("Microsoft redirect URI runtime export is not a canonical safe HTTPS URL");
  }
  return { people: redirect, client: redirect };
}

export async function loadExternalM365OnboardingContracts(repoRoot = process.cwd()) {
  const releasePath = path.join(repoRoot, "contracts/outlook-addin-release-gates.json");
  const surfacePath = path.join(repoRoot, "contracts/outlook-addin-surfaces.json");
  const baselinePath = path.join(repoRoot, "contracts/outlook-addin-deployment-baseline.json");
  const rollbackPath = path.join(repoRoot, "contracts/outlook-addin-rollback.json");
  const [release, surface, baseline, rollback, redirects] = await Promise.all([
    readFile(releasePath, "utf8").then(JSON.parse),
    readFile(surfacePath, "utf8").then(JSON.parse),
    readFile(baselinePath, "utf8").then(JSON.parse),
    readFile(rollbackPath, "utf8").then(JSON.parse),
    loadRedirectContract(repoRoot),
  ]);
  return { release, surface, baseline, rollback, redirects };
}

async function validateExactManifest({ repoRoot, manifestBytes, profile, contracts }) {
  const profileContract = contracts.release.profiles.find((candidate) => candidate.profile === profile);
  if (!profileContract) throw new Error(`release profile is missing: ${profile}`);
  const manifestPath = profileContract.production_manifest;
  const expectedBytes = await readFile(path.join(repoRoot, manifestPath));
  const manifestSha256 = sha256(manifestBytes);
  const expectedSha256 = sha256(expectedBytes);
  if (manifestSha256 !== expectedSha256) {
    throw new Error(`${profile} manifest bytes are not the exact production manifest`);
  }
  const projection = parseOutlookManifest(manifestBytes);
  if ([...projection.url_resources, ...projection.form_source_locations].some((value) => /(?:[?&]tenantId=|tenant_[A-Za-z0-9_-]+)/u.test(value))) {
    throw new Error(`${profile} production manifest embeds a tenant-specific runtime query`);
  }
  const result = await validateOutlookAddinSurfaces({
    repoRoot,
    baseline: contracts.baseline,
    mode: "candidate",
    manifestOverrides: { [manifestPath]: manifestBytes.toString("utf8") },
  });
  const validated = result.profiles.find((candidate) => candidate.profile === profile);
  if (!validated || validated.manifest_sha256 !== manifestSha256) {
    throw new Error(`${profile} manifest did not pass the existing Outlook surface validator`);
  }
  return {
    profile: profileContract.profile,
    product_id: profileContract.product_id,
    version: projection.version,
    permission: projection.permission,
    mailbox_min_version: profileContract.mailbox_min_version,
    sha256: manifestSha256,
    semantic_sha256: projection.semantic_manifest_sha256,
    source_ref: manifestPath,
  };
}

function checklist(input, manifest, auth) {
  const included = input.pilot_group.expected_member_count;
  return [
    {
      id: "M365-ADMIN-01",
      phase: "preflight",
      status: CHECKLIST_STATUS,
      requirement: "Confirm the Entra app registration client ID and tenant match the private handoff metadata.",
      evidence_required: "Admin-center readback with tenant/client identifiers kept in the private handoff only.",
    },
    {
      id: "M365-ADMIN-02",
      phase: "preflight",
      status: CHECKLIST_STATUS,
      requirement: `Register exactly ${auth.redirect_uris.length} approved redirect URI(s) for the ${input.profile} flow: ${auth.redirect_uris.join(", ")}.`,
      evidence_required: "App registration redirect URI readback; no alternate localhost, wildcard, or query-bearing URI.",
    },
    {
      id: "M365-ADMIN-03",
      phase: "consent",
      status: CHECKLIST_STATUS,
      requirement: "Reconcile delegated and Graph connection scopes to the exact approved release-contract fingerprint.",
      evidence_required: "Granted-permission readback and admin-consent record with scope diff equal to none.",
    },
    {
      id: "M365-PILOT-POS-01",
      phase: "pilot-positive",
      status: CHECKLIST_STATUS,
      requirement: `Assign only the approved ${input.pilot_group.display_name} pilot group (${included} expected direct members) to the production-visible ${manifest.profile} profile.`,
      evidence_required: "Group assignment readback with direct-member count, ProductId, and no nested groups; keep raw roster private.",
    },
    {
      id: "M365-PILOT-POS-02",
      phase: "pilot-positive",
      status: CHECKLIST_STATUS,
      requirement: "Verify an included pilot user sees one add-in, reaches the tenant-pinned runtime URL, and completes the expected Outlook read/context scenario.",
      evidence_required: "Real Outlook host proof plus redacted callback/config receipt; do not record tokens, mailbox content, or email addresses.",
    },
    {
      id: "M365-PILOT-NEG-01",
      phase: "pilot-negative",
      status: CHECKLIST_STATUS,
      requirement: "Verify a non-member cannot see or use the assigned add-in and receives a safe denied/unassigned outcome.",
      evidence_required: "Non-member host readback with aggregate result only; no non-member identity in public evidence.",
    },
    {
      id: "M365-PILOT-NEG-02",
      phase: "pilot-negative",
      status: CHECKLIST_STATUS,
      requirement: "Verify wrong-tenant, wrong-client, redirect mismatch, and missing-scope attempts fail closed without a provider write from this bundle.",
      evidence_required: "Synthetic negative test receipt with safe error codes and zero provider mutations.",
    },
    {
      id: "M365-ROLLBACK-01",
      phase: "rollback",
      status: CHECKLIST_STATUS,
      requirement: "If pilot verification fails, stop assignment, restore the frozen baseline manifest, and reconcile one visible distribution before retrying.",
      evidence_required: "Rollback readback bound to the protected rollback contract and baseline manifest hash.",
    },
  ];
}

function publicEvidenceFromBundle(bundle) {
  const metadata = bundle.private_admin_metadata;
  const runtime = bundle.target_runtime;
  return {
    schema_version: EXTERNAL_M365_ONBOARDING_PUBLIC_SCHEMA,
    private_bundle: true,
    public_data_redacted: true,
    tenant_binding: "redacted_fingerprint_only",
    lawos_tenant_fingerprint_sha256: sha256(metadata.lawos_tenant_id),
    entra_tenant_fingerprint_sha256: sha256(metadata.entra_tenant_id),
    client_fingerprint_sha256: sha256(metadata.client_id),
    pilot_group_binding_sha256: sha256(bundle.pilot_group.display_name),
    pilot_group_expected_member_count: bundle.pilot_group.expected_member_count,
    target_runtime_url_sha256: runtime.url_sha256,
    target_runtime_host_sha256: runtime.host_sha256,
    runtime_config_digest_sha256: runtime.config_digest_sha256,
    target_runtime_binding_sha256: runtime.binding_sha256,
    deployment_model: DEPLOYMENT_MODEL,
    shared_runtime_claim: false,
    manifest: {
      profile: bundle.manifest.profile,
      product_id: bundle.manifest.product_id,
      version: bundle.manifest.version,
      sha256: bundle.manifest.sha256,
      semantic_sha256: bundle.manifest.semantic_sha256,
    },
    redirect_uris: [...bundle.auth.redirect_uris],
    oauth_scopes: [...bundle.auth.oauth_scopes],
    graph_connection_scopes: [...bundle.auth.graph_connection_scopes],
    scope_fingerprint_sha256: bundle.auth.scope_fingerprint_sha256,
    rollback: {
      baseline_version: bundle.rollback.baseline_version,
      baseline_manifest_sha256: bundle.rollback.baseline_manifest_sha256,
      assignment_restore_policy: bundle.rollback.assignment_restore_policy,
    },
    appsource_claim: false,
    provider_calls: 0,
    external_mutations: 0,
    bundle_payload_sha256: bundle.bundle_payload_sha256,
  };
}

export function derivePublicEvidence(bundle) {
  return publicEvidenceFromBundle(bundle);
}

function buildPayload({ input, manifest, auth, rollback }) {
  const base = {
    schema_version: EXTERNAL_M365_ONBOARDING_SCHEMA,
    bundle_kind: "private_admin_handoff",
    private: true,
    no_provider_calls: true,
    external_mutations: 0,
    appsource_claim: false,
    deployment_model: DEPLOYMENT_MODEL,
    shared_runtime_claim: false,
    tenant_pinned: true,
    manifest_sha256: manifest.sha256,
    runtime_config_digest_sha256: input.runtime_config_digest_sha256,
    private_admin_metadata: {
      lawos_tenant_id: input.lawos_tenant_id,
      entra_tenant_id: input.entra_tenant_id,
      client_id: input.client_id,
      admin_contact: input.admin_contact,
    },
    target_runtime: {
      url: input.target_runtime_url,
      url_sha256: sha256(input.target_runtime_url),
      hostname: input.target_runtime_hostname,
      host_sha256: sha256(input.target_runtime_hostname),
      config_digest_sha256: input.runtime_config_digest_sha256,
      config_receipt_sha256: input.runtime_config_digest_sha256,
      receipt_present: Boolean(input.runtime_config_receipt),
      binding_sha256: bindingDigest({
        lawosTenantId: input.lawos_tenant_id,
        entraTenantId: input.entra_tenant_id,
        clientId: input.client_id,
        targetRuntimeUrl: input.target_runtime_url,
        hostname: input.target_runtime_hostname,
        configDigest: input.runtime_config_digest_sha256,
      }),
      binding: DEPLOYMENT_MODEL,
    },
    manifest,
    auth,
    pilot_group: {
      display_name: input.pilot_group.display_name,
      expected_member_count: input.pilot_group.expected_member_count,
      assignment_mode: "direct_members_only",
      tenant_wide_assignment_allowed: false,
      nested_groups_allowed: false,
      max_visible_addins_per_user: 1,
    },
    checklist: checklist(input, manifest, auth),
    rollback,
  };
  const payloadDigest = sha256(Buffer.from(canonicalJson(bundlePayloadDigestMaterial(base))));
  const withDigest = { ...base, bundle_payload_sha256: payloadDigest };
  return {
    ...withDigest,
    public_evidence: publicEvidenceFromBundle(withDigest),
  };
}

function assertPublicEvidenceRedacted(value) {
  assertExactKeys(value.public_evidence, PUBLIC_KEYS, "public_evidence");
  assertExactKeys(value.public_evidence.manifest, PUBLIC_MANIFEST_KEYS, "public_evidence.manifest");
  assertExactKeys(value.public_evidence.rollback, PUBLIC_ROLLBACK_KEYS, "public_evidence.rollback");
  if (value.public_evidence.private_bundle !== true || value.public_evidence.public_data_redacted !== true) {
    throw new Error("public evidence redaction marker is missing");
  }
  if (canonicalJson(value.public_evidence) !== canonicalJson(publicEvidenceFromBundle(value))) {
    throw new Error("public evidence is not the exact projection of the validated private payload");
  }
}

function assertBundleClosedShape(bundle) {
  assertExactKeys(bundle, BUNDLE_KEYS, "external M365 onboarding bundle");
  assertExactKeys(bundle.private_admin_metadata, PRIVATE_METADATA_KEYS, "private_admin_metadata");
  assertExactKeys(bundle.target_runtime, TARGET_RUNTIME_KEYS, "target_runtime");
  assertExactKeys(bundle.manifest, MANIFEST_KEYS, "manifest");
  assertExactKeys(bundle.auth, AUTH_KEYS, "auth");
  assertExactKeys(bundle.pilot_group, PILOT_KEYS, "pilot_group");
  if (!Array.isArray(bundle.checklist)) throw new TypeError("checklist must be an array");
  for (const item of bundle.checklist) assertExactKeys(item, CHECKLIST_KEYS, "checklist item");
  assertExactKeys(bundle.rollback, ROLLBACK_KEYS, "rollback");
}

function validateBundlePrivateMetadata(bundle) {
  const metadata = bundle.private_admin_metadata;
  const lawosTenantId = requiredLawosTenantId(metadata.lawos_tenant_id);
  const entraTenantId = requiredUuid(metadata.entra_tenant_id, "private_admin_metadata.entra_tenant_id");
  if (lawosTenantId.toLowerCase() === entraTenantId) throw new Error("LawOS and Entra tenant namespaces are mixed");
  const clientId = requiredUuid(metadata.client_id, "private_admin_metadata.client_id");
  const adminContact = optionalEmail(metadata.admin_contact);
  if (metadata.lawos_tenant_id !== lawosTenantId
    || metadata.entra_tenant_id !== entraTenantId
    || metadata.client_id !== clientId
    || metadata.admin_contact !== adminContact) {
    throw new Error("private tenant/app metadata is not canonically normalized");
  }
  return { lawosTenantId, entraTenantId, clientId };
}

function validateBundleRuntime(bundle, metadata) {
  const runtime = bundle.target_runtime;
  const details = targetRuntimeUrl(runtime.url);
  const binding = bindingDigest({
    lawosTenantId: metadata.lawosTenantId,
    entraTenantId: metadata.entraTenantId,
    clientId: metadata.clientId,
    targetRuntimeUrl: runtime.url,
    hostname: details.hostname,
    configDigest: runtime.config_digest_sha256,
  });
  if (
    details.url !== runtime.url
    || details.hostname !== runtime.hostname
    || runtime.url_sha256 !== sha256(runtime.url)
    || runtime.host_sha256 !== sha256(runtime.hostname)
    || !SHA256.test(runtime.config_digest_sha256 ?? "")
    || runtime.config_receipt_sha256 !== runtime.config_digest_sha256
    || typeof runtime.receipt_present !== "boolean"
    || runtime.binding !== DEPLOYMENT_MODEL
    || runtime.binding_sha256 !== binding
  ) {
    throw new Error("tenant-pinned target runtime/config binding is invalid");
  }
}

function validateChecklist(bundle) {
  if (bundle.checklist.length !== CHECKLIST_IDS.length) throw new Error("pilot/rollback checklist is incomplete");
  const ids = bundle.checklist.map((item) => item.id);
  if (new Set(ids).size !== ids.length || CHECKLIST_IDS.some((id) => !ids.includes(id))) {
    throw new Error("pilot/rollback checklist identifiers are invalid");
  }
  if (bundle.checklist.some((item) => item.status !== CHECKLIST_STATUS)) {
    throw new Error("pilot/rollback checklist status is invalid");
  }
}

function validateAuth(bundle) {
  const auth = bundle.auth;
  if (auth.redirect_profile !== "client"
    || !Array.isArray(auth.redirect_uris)
    || auth.redirect_uris.length !== 1
    || auth.redirect_uris[0] !== auth.expected_redirect_uri
    || !Array.isArray(auth.oauth_scopes)
    || !Array.isArray(auth.graph_connection_scopes)
    || canonicalJson(auth.oauth_scopes) !== canonicalJson(CLIENT_OAUTH_SCOPES)
    || canonicalJson(auth.graph_connection_scopes) !== canonicalJson([...CLIENT_GRAPH_SCOPES].sort())
    || !SHA256.test(auth.scope_fingerprint_sha256 ?? "")
    || auth.scope_fingerprint_sha256 !== CLIENT_SCOPE_FINGERPRINT_SHA256
    || new Set(auth.oauth_scopes).size !== auth.oauth_scopes.length
    || new Set(auth.graph_connection_scopes).size !== auth.graph_connection_scopes.length) {
    throw new Error("redirect/scope expectations are invalid");
  }
}

function validateRollback(bundle) {
  const rollback = bundle.rollback;
  if (rollback.baseline_version !== "1.0.1.1"
    || !SHA256.test(rollback.baseline_manifest_sha256 ?? "")
    || rollback.assignment_restore_policy !== "reconcile_to_validated_single_visible_distribution"
    || rollback.raw_assignment_pii_included !== false
    || rollback.raw_manifest_xml_included !== false
    || rollback.secret_material_included !== false) {
    throw new Error("rollback instructions are not bound to the frozen baseline");
  }
}

export async function validateExternalM365OnboardingBundle(bundle, {
  input, manifestBytes, manifestPath, repoRoot = process.cwd(), contracts,
} = {}) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new TypeError("bundle is required");
  assertBundleClosedShape(bundle);
  if (bundle.schema_version !== EXTERNAL_M365_ONBOARDING_SCHEMA || bundle.bundle_kind !== "private_admin_handoff") {
    throw new Error("external M365 onboarding bundle schema is invalid");
  }
  if (bundle.private !== true || bundle.no_provider_calls !== true || bundle.external_mutations !== 0
    || bundle.appsource_claim !== false || bundle.deployment_model !== DEPLOYMENT_MODEL
    || bundle.shared_runtime_claim !== false || bundle.tenant_pinned !== true) {
    throw new Error("bundle overclaims provider, AppSource, or multi-tenant behavior");
  }
  if (bundle.manifest_sha256 !== bundle.manifest.sha256
    || bundle.runtime_config_digest_sha256 !== bundle.target_runtime.config_digest_sha256) {
    throw new Error("top-level manifest/runtime digest binding is invalid");
  }
  const metadata = validateBundlePrivateMetadata(bundle);
  validateBundleRuntime(bundle, metadata);
  validateAuth(bundle);
  validateChecklist(bundle);
  const pilot = bundle.pilot_group;
  const pilotDisplayName = requiredText(pilot.display_name, "pilot_group.display_name");
  if (pilotDisplayName !== pilot.display_name
    || typeof pilot.expected_member_count !== "number"
    || !Number.isSafeInteger(pilot.expected_member_count)
    || pilot.expected_member_count < MIN_PILOT_MEMBER_COUNT
    || pilot.expected_member_count > MAX_PILOT_MEMBER_COUNT
    || pilot.assignment_mode !== "direct_members_only" || pilot.tenant_wide_assignment_allowed !== false
    || pilot.nested_groups_allowed !== false || pilot.max_visible_addins_per_user !== 1) {
    throw new Error("pilot assignment safety contract is invalid");
  }
  validateRollback(bundle);
  const payload = { ...bundle };
  delete payload.bundle_payload_sha256;
  delete payload.public_evidence;
  if (bundle.bundle_payload_sha256 !== sha256(Buffer.from(canonicalJson(bundlePayloadDigestMaterial(payload))))) {
    throw new Error("bundle payload digest mismatch");
  }
  assertPublicEvidenceRedacted(bundle);
  if (input) {
    const normalized = normalizeInput(input);
    if (bundle.private_admin_metadata.lawos_tenant_id !== normalized.lawos_tenant_id
      || bundle.private_admin_metadata.entra_tenant_id !== normalized.entra_tenant_id
      || bundle.private_admin_metadata.client_id !== normalized.client_id
      || bundle.target_runtime.url !== normalized.target_runtime_url
      || bundle.target_runtime.config_digest_sha256 !== normalized.runtime_config_digest_sha256
      || bundle.target_runtime.receipt_present !== Boolean(normalized.runtime_config_receipt)) {
      throw new Error("bundle does not match external tenant/runtime input");
    }
  }
  if (contracts) {
    const expectedProfile = contracts.release.profiles.find(({ profile }) => profile === bundle.manifest.profile);
    const expectedSurface = contracts.surface.profiles.find(({ profile }) => profile === bundle.manifest.profile);
    if (!expectedProfile || !expectedSurface
      || bundle.manifest.product_id !== expectedProfile.product_id
      || bundle.manifest.version !== contracts.release.release_version
      || bundle.manifest.permission !== expectedProfile.permission
      || bundle.manifest.sha256 !== sha256(await readFile(path.join(repoRoot, expectedProfile.production_manifest)))) {
      throw new Error("bundle manifest identity drifted from the release contract");
    }
    if (bundle.auth.expected_redirect_uri !== contracts.redirects.client
      || JSON.stringify(bundle.auth.redirect_uris) !== JSON.stringify([contracts.redirects.client])
      || JSON.stringify(bundle.auth.oauth_scopes) !== JSON.stringify(contracts.release.client_outlook_oauth_scopes)
      || JSON.stringify(bundle.auth.graph_connection_scopes) !== JSON.stringify([...contracts.release.client_outlook_graph_connection_scopes].sort())
      || bundle.auth.scope_fingerprint_sha256 !== CLIENT_SCOPE_FINGERPRINT_SHA256) {
      throw new Error("redirect/scope expectations drifted from the runtime contract");
    }
    if (bundle.rollback.baseline_manifest_sha256 !== expectedSurface.baseline_manifest_sha256
      || bundle.rollback.baseline_version !== contracts.release.rollback_version) {
      throw new Error("rollback baseline drifted from the frozen contract");
    }
  }
  const suppliedManifestBytes = manifestBytes ?? (manifestPath
    ? await readFile(path.isAbsolute(manifestPath) ? manifestPath : path.join(repoRoot, manifestPath))
    : null);
  if (suppliedManifestBytes && repoRoot) {
    if (!contracts) throw new Error("manifest validation contracts are required");
    return validateExactManifest({
      repoRoot,
      manifestBytes: suppliedManifestBytes,
      profile: bundle.manifest.profile,
      contracts,
    }).then((manifest) => {
      if (manifest.sha256 !== bundle.manifest.sha256 || manifest.semantic_sha256 !== bundle.manifest.semantic_sha256) {
        throw new Error("bundle manifest binding drifted");
      }
      return bundle;
    });
  }
  return bundle;
}

export async function generateExternalM365OnboardingBundle({
  input,
  manifestBytes,
  manifestPath,
  repoRoot = process.cwd(),
} = {}) {
  const normalized = normalizeInput(input);
  const contracts = await loadExternalM365OnboardingContracts(repoRoot);
  const suppliedManifestBytes = manifestBytes ?? (manifestPath
    ? await readFile(path.isAbsolute(manifestPath) ? manifestPath : path.join(repoRoot, manifestPath))
    : null);
  const manifest = await validateExactManifest({
    repoRoot,
    manifestBytes: Buffer.isBuffer(suppliedManifestBytes)
      ? suppliedManifestBytes
      : Buffer.from(String(suppliedManifestBytes ?? "")),
    profile: normalized.profile,
    contracts,
  });
  const profileContract = contracts.release.profiles.find(({ profile }) => profile === normalized.profile);
  const contractSurface = contracts.surface.profiles.find(({ profile }) => profile === normalized.profile);
  const auth = {
    redirect_uris: [contracts.redirects.client],
    expected_redirect_uri: contracts.redirects.client,
    oauth_scopes: [...contracts.release.client_outlook_oauth_scopes],
    graph_connection_scopes: [...contracts.release.client_outlook_graph_connection_scopes].sort(),
    scope_fingerprint_sha256: CLIENT_SCOPE_FINGERPRINT_SHA256,
    redirect_profile: "client",
  };
  const rollback = {
    baseline_version: contracts.release.rollback_version,
    baseline_manifest_sha256: contractSurface.baseline_manifest_sha256,
    assignment_restore_policy: "reconcile_to_validated_single_visible_distribution",
    rollback_contract_ref: "contracts/outlook-addin-rollback.json",
    protected_manifest_ref: contracts.rollback.profiles.find(({ profile }) => profile === normalized.profile)?.protected_manifest_ref,
    raw_assignment_pii_included: false,
    raw_manifest_xml_included: false,
    secret_material_included: false,
  };
  if (!contractSurface || manifest.product_id !== profileContract.product_id) {
    throw new Error("manifest/profile identity is not bound to the existing surface contract");
  }
  const bundle = buildPayload({ input: normalized, manifest, auth, rollback });
  await validateExternalM365OnboardingBundle(bundle);
  return bundle;
}

export function renderExternalM365OnboardingMarkdown(bundle) {
  const lines = [
    "# Private M365 / Outlook Admin Handoff",
    "",
    "> Keep this file private. It is an offline checklist; it does not contact Microsoft, deploy an add-in, grant consent, or claim AppSource distribution.",
    "",
    `- Deployment model: **${bundle.deployment_model}**`,
    `- Tenant-pinned runtime: **${bundle.tenant_pinned}**`,
    `- Production manifest SHA-256: \`${bundle.manifest.sha256}\``,
    `- Runtime config digest: \`${bundle.target_runtime.config_digest_sha256}\``,
    `- Runtime host binding SHA-256: \`${bundle.target_runtime.binding_sha256}\``,
    `- Redirect URI: \`${bundle.auth.expected_redirect_uri}\``,
    `- OAuth scopes: ${bundle.auth.oauth_scopes.map((scope) => `\`${scope}\``).join(", ")}`,
    `- Graph connection scopes: ${bundle.auth.graph_connection_scopes.map((scope) => `\`${scope}\``).join(", ")}`,
    "",
    "## Pilot checklist",
    "",
    "| ID | Phase | Requirement | Evidence | Status |",
    "| --- | --- | --- | --- | --- |",
    ...bundle.checklist.map((item) => `| ${item.id} | ${item.phase} | ${item.requirement} | ${item.evidence_required} | ${item.status} |`),
    "",
    "## Rollback",
    "",
    `- Restore baseline version \`${bundle.rollback.baseline_version}\` (${bundle.rollback.baseline_manifest_sha256}).`,
    `- Follow \`${bundle.rollback.rollback_contract_ref}\`; restore policy is \`${bundle.rollback.assignment_restore_policy}\`.`,
    "- Stop assignment first, verify one visible distribution, and keep raw roster/tenant/email values out of public evidence.",
    "",
    "## Claims boundary",
    "",
    "- Provider calls performed by this generator: **0**.",
    "- External mutations performed by this generator: **0**.",
    "- AppSource/public marketplace claim: **false**.",
    "- Completion status: **pending external verification**.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function writePrivateAtomic(outputPath, bytes) {
  const targetPath = path.resolve(outputPath);
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, bytes, { mode: 0o600, flag: "wx" });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, targetPath);
    await chmod(targetPath, 0o600);
  } catch (error) {
    try {
      await unlink(temporaryPath);
    } catch {
      // Preserve the original write/rename error.
    }
    throw error;
  }
}

export async function writeExternalM365OnboardingBundle(bundle, outputPath, markdownPath) {
  const bytes = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`);
  await writePrivateAtomic(outputPath, bytes);
  if (markdownPath) {
    await writePrivateAtomic(markdownPath, Buffer.from(renderExternalM365OnboardingMarkdown(bundle)));
  }
  return { outputPath, markdownPath: markdownPath ?? null, sha256: sha256(bytes) };
}

export { normalizeInput, canonicalJson, sha256, targetRuntimeUrl };
