import { createHash } from "node:crypto";
import {
  PROFILE_PHOTO_SLOT_REFS,
  validateProfilePhotoManifest,
} from "../validate-profile-photo-replacement-manifest.mjs";
import { validatePngBytes } from "./profile-photo-png.mjs";
import { validateGenerationRef } from "./profile-photo-operation-root.mjs";
import { evidenceFail } from "./profile-media-evidence-shared.mjs";

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
export const PROFILE_HTTP_RESPONSE_MAX_BYTES = 36 * 1024 * 1024;

const PROFILE_RESPONSE_KEYS = Object.freeze([
  "request_id",
  "outcome",
  "item",
  "safe_error_codes",
  "audit_hint_ref",
  "ui_state",
  "count_leak_prevented",
  "production_ready_claim",
]);
const PROFILE_ITEM_KEYS = Object.freeze([
  "profile_ref",
  "actor_ref",
  "tenant_ref",
  "display_name",
  "english_name",
  "primary_role_label",
  "employee_id",
  "work_email",
  "mobile_phone",
  "title",
  "department",
  "affiliation",
  "organization_group",
  "start_date",
  "country",
  "professional_profile",
  "photo_url",
  "role_count",
  "contract_summary",
  "account_summary",
  "contact_policy",
  "secret_material_included",
  "direct_identifier_included",
  "photo_included",
  "production_ready_claim",
]);
const PROFESSIONAL_PROFILE_KEYS = Object.freeze([
  "schema_version",
  "profile_kind",
  "public_role_labels",
  "practice_areas",
  "experience",
  "education",
  "qualifications",
  "source_refs",
  "source_notes",
  "excluded_claim_refs",
]);

function exactKeys(value, expected) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nullableString(value) {
  return value === null || typeof value === "string";
}

export function isExactJsonContentType(value) {
  if (typeof value !== "string"
    || /[\u0000-\u0008\u000a-\u001f\u007f,]/u.test(value)) return false;
  const parts = value.split(";");
  if (parts.shift().replace(/^[\t ]+|[\t ]+$/gu, "").toLowerCase() !== "application/json") {
    return false;
  }
  if (parts.length === 0) return true;
  return parts.length === 1
    && /^[\t ]*charset[\t ]*=[\t ]*(?:utf-8|"utf-8")[\t ]*$/iu.test(parts[0]);
}

function validProfileResponseBody(body) {
  if (!exactKeys(body, PROFILE_RESPONSE_KEYS)
    || !exactKeys(body.item, PROFILE_ITEM_KEYS)
    || !exactKeys(body.item.contract_summary, ["state", "visible_contract_count", "source_ref"])
    || !exactKeys(body.item.account_summary, ["state", "session_principal_source", "session_source_ref", "employee_user_link_resolved"])
    || !exactKeys(body.item.contact_policy, ["visibility", "allowed_fields", "public_renderer_literals_allowed"])
    || (body.item.professional_profile !== null
      && !exactKeys(body.item.professional_profile, PROFESSIONAL_PROFILE_KEYS))) return false;
  const item = body.item;
  const textFields = [
    body.request_id,
    body.audit_hint_ref,
    item.profile_ref,
    item.actor_ref,
    item.tenant_ref,
    item.display_name,
    item.english_name,
    item.primary_role_label,
    item.work_email,
    item.mobile_phone,
    item.title,
    item.department,
    item.affiliation,
    item.organization_group,
    item.start_date,
    item.country,
    item.photo_url,
    item.contract_summary.source_ref,
  ];
  if (textFields.some((value) => typeof value !== "string")
    || !nullableString(item.employee_id)
    || body.outcome !== "passed"
    || body.ui_state !== "populated"
    || !stringArray(body.safe_error_codes)
    || body.safe_error_codes.length !== 0
    || body.count_leak_prevented !== true
    || body.production_ready_claim !== false
    || !Number.isSafeInteger(item.role_count)
    || item.role_count < 0
    || item.contract_summary.state !== "connected"
    || !Number.isSafeInteger(item.contract_summary.visible_contract_count)
    || item.contract_summary.visible_contract_count < 0
    || item.account_summary.state !== "connected"
    || typeof item.account_summary.session_principal_source !== "string"
    || !nullableString(item.account_summary.session_source_ref)
    || typeof item.account_summary.employee_user_link_resolved !== "boolean"
    || item.contact_policy.visibility !== "authenticated_internal"
    || JSON.stringify(item.contact_policy.allowed_fields) !== JSON.stringify(["work_email", "mobile_phone"])
    || item.contact_policy.public_renderer_literals_allowed !== false
    || item.secret_material_included !== false
    || typeof item.direct_identifier_included !== "boolean"
    || item.photo_included !== true
    || item.production_ready_claim !== false) return false;
  const professional = item.professional_profile;
  return professional === null || (
    professional.schema_version === "law-firm-os.people-professional-profile.v0.1"
    && typeof professional.profile_kind === "string"
    && PROFESSIONAL_PROFILE_KEYS.slice(2).every((key) => stringArray(professional[key]))
  );
}

async function boundedResponseBytes(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("HTTP response body is not a bounded byte stream");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!(value instanceof Uint8Array)) {
      try { await reader.cancel(); } catch {}
      throw new Error("HTTP response stream is invalid");
    }
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error("HTTP response exceeded its byte limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function readBoundedJsonResponseBody(response, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1
    || !isExactJsonContentType(response?.headers?.get?.("content-type"))) {
    throw new Error("HTTP JSON response contract is invalid");
  }
  const rawLength = response?.headers?.get?.("content-length");
  let declaredLength = null;
  if (rawLength !== null && rawLength !== undefined) {
    const match = String(rawLength).match(/^[\t ]*((?:0|[1-9]\d*))[\t ]*$/u);
    if (!match) throw new Error("HTTP content length is invalid");
    declaredLength = Number(match[1]);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
      throw new Error("HTTP content length exceeded its limit");
    }
  }
  const bytes = await boundedResponseBytes(response, maxBytes);
  if (bytes.byteLength < 1 || declaredLength !== null && declaredLength !== bytes.byteLength) {
    throw new Error("HTTP response length drifted");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

async function readProfileResponse(response, expectedUrl) {
  if (response?.status !== 200
    || response.redirected !== false
    || response.url !== expectedUrl) {
    evidenceFail("PROFILE_API_RESPONSE_INVALID", "profile API response transport contract is invalid");
  }
  let body;
  try { body = await readBoundedJsonResponseBody(response, PROFILE_HTTP_RESPONSE_MAX_BYTES); } catch {
    evidenceFail("PROFILE_API_RESPONSE_INVALID", "profile API response is not one bounded JSON document");
  }
  if (!validProfileResponseBody(body)) {
    evidenceFail("PROFILE_API_RESPONSE_INVALID", "profile API response shape drifted");
  }
  return body;
}

export function validateProfileReadRefs(refs) {
  if (!Array.isArray(refs) || refs.length !== 10 || new Set(refs).size !== 10
    || refs.some((ref, index) => ref !== PROFILE_PHOTO_SLOT_REFS[index])) {
    evidenceFail("PROFILE_REF_SET_INVALID", "profile read harness requires the exact ordered ten opaque refs");
  }
  return Object.freeze([...refs]);
}

function decodeProfilePng(value) {
  if (typeof value !== "string" || !value.startsWith(PNG_DATA_URL_PREFIX)) {
    evidenceFail("PROFILE_PNG_DATA_URL_INVALID", "profile API did not return a PNG data URL");
  }
  const encoded = value.slice(PNG_DATA_URL_PREFIX.length);
  if (!encoded || !CANONICAL_BASE64.test(encoded)) {
    evidenceFail("PROFILE_PNG_BASE64_INVALID", "profile API returned non-canonical base64");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) evidenceFail("PROFILE_PNG_BASE64_INVALID", "profile API returned ambiguous base64");
  try { validatePngBytes(bytes); } catch { evidenceFail("PROFILE_PNG_DECODE_INVALID", "profile API payload is not a decodable PNG"); }
  return bytes;
}

export async function runTenProfileApiRead({
  refs = PROFILE_PHOTO_SLOT_REFS,
  readProfile,
  expectedManifest,
  expectedGenerationRef,
} = {}) {
  const validatedRefs = validateProfileReadRefs(refs);
  if (typeof readProfile !== "function") evidenceFail("PROFILE_ADAPTER_REQUIRED", "profile read adapter is required");
  const manifest = validateProfilePhotoManifest(expectedManifest);
  const generationRef = validateGenerationRef(expectedGenerationRef);
  const expectedBySlot = new Map(manifest.entries.map((entry) => [entry.slot_ref, entry.content_sha256]));
  const counts = {
    expected: 10,
    passed: 0,
    http_200: 0,
    outcome_passed: 0,
    ui_state_populated: 0,
    photo_included: 0,
    png_decoded: 0,
    generation_match: 0,
    content_digest_match: 0,
  };
  for (const ref of validatedRefs) {
    let response;
    try { response = await readProfile(ref); } catch { evidenceFail("PROFILE_API_READ_FAILED", "profile API read failed"); }
    const checks = {
      http_200: response?.status === 200,
      outcome_passed: response?.body?.outcome === "passed",
      ui_state_populated: response?.body?.ui_state === "populated",
      photo_included: response?.body?.item?.photo_included === true,
      png_decoded: false,
      generation_match: response?.generation_ref === generationRef,
      content_digest_match: false,
    };
    const bytes = decodeProfilePng(response?.body?.item?.photo_url);
    checks.png_decoded = true;
    checks.content_digest_match = createHash("sha256").update(bytes).digest("hex") === expectedBySlot.get(ref);
    for (const [key, passed] of Object.entries(checks)) if (passed) counts[key] += 1;
    if (Object.values(checks).every(Boolean)) counts.passed += 1;
    else evidenceFail("PROFILE_API_COHORT_FAILED", "profile API payload did not match the expected active generation and slot digest");
  }
  return Object.freeze({ ...counts });
}

export function createProfileHttpAdapter({ baseUrl, sessionTokens, fetchImpl = fetch } = {}) {
  let endpoint;
  try { endpoint = new URL(baseUrl); } catch { evidenceFail("PROFILE_API_URL_INVALID", "profile API base URL is invalid"); }
  if (endpoint.protocol !== "https:") evidenceFail("PROFILE_API_URL_INVALID", "production profile API must use HTTPS");
  if (!Array.isArray(sessionTokens) || sessionTokens.length !== 10 || new Set(sessionTokens).size !== 10
    || sessionTokens.some((token) => typeof token !== "string" || token.length < 16)) {
    evidenceFail("PROFILE_SESSION_SET_INVALID", "ten distinct private session tokens are required");
  }
  return async (ref) => {
    const index = PROFILE_PHOTO_SLOT_REFS.indexOf(ref);
    if (index < 0) evidenceFail("PROFILE_REF_SET_INVALID", "profile ref is outside the ten-slot cohort");
    const url = new URL("/api/profile/me", endpoint);
    url.searchParams.set("permission_ref", "ui_profile_me");
    url.searchParams.set("audit_hint_ref", "profile_media_operability");
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${sessionTokens[index]}`,
      },
    });
    const body = await readProfileResponse(response, url.href);
    return {
      status: response.status,
      body,
      generation_ref: response.headers?.get?.("x-lawos-profile-photo-generation") ?? null,
    };
  };
}
