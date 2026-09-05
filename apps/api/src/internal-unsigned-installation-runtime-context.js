import { resolveAwsJsonSecret } from "./aws-secret-reference.js";
import { verifyInternalUnsignedInstallationAuthorityReadback } from "../../../packages/email-dms/src/internal-unsigned-installation-authority-readback.js";
import {
  createPostgresInternalUnsignedInstallationAuthority,
  INTERNAL_UNSIGNED_INSTALLATION_PATH,
  INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_PATH,
} from "./internal-unsigned-installation-authority.js";
import {
  evaluateOutlookDesktopLifecycleAuthority,
  isOutlookDesktopInstallationId,
  OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES,
  projectOutlookDesktopLegacyServiceResult,
} from "./outlook-desktop-installation-runtime-context.js";

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const CONFIG_PREFIX = "LAWOS_INTERNAL_INSTALLATION_ATTESTATION_";
const PROOF_FIELDS = ["idempotency_key", "nonce", "issued_at", "expires_at", "signature"];
const BODY_FIELDS = Object.freeze({
  register: ["release_authorization_id", "device_public_key", "installed_receipt_sha256"],
  heartbeat: ["expected_state_version"],
  retire: ["expected_state_version", "retire_reason"],
  attest: ["adoption_id", "request_sha256", "installation_id"],
});

function exactFields(value, fields) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

export async function createInternalUnsignedInstallationRuntimeFromEnv({
  env = process.env, pool, tenant_id, resolveSecret = resolveAwsJsonSecret,
  verifyAuthority = verifyInternalUnsignedInstallationAuthorityReadback,
} = {}) {
  const secretId = String(env[`${CONFIG_PREFIX}SECRET_ID`] ?? "").trim();
  if (["KEY_ID", "PUBLIC_KEY_SHA256", "PRIVATE_KEY", "PRIVATE_KEY_PEM"]
    .some((key) => Object.hasOwn(env, `${CONFIG_PREFIX}${key}`))) {
    throw new TypeError("Internal installation signer requires only a Secrets Manager reference");
  }
  if (!secretId) return null;
  const region = String(env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "").trim();
  if (!region) {
    throw new TypeError("Internal installation signer configuration is incomplete");
  }
  const secret = await resolveSecret({ secretId, region });
  if (!exactFields(secret, ["key_id", "private_key_pem", "public_key_sha256"])
    || typeof secret.key_id !== "string" || !ID.test(secret.key_id)
    || typeof secret.public_key_sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(secret.public_key_sha256)
    || typeof secret.private_key_pem !== "string" || !secret.private_key_pem.trim()) {
    throw new TypeError("Internal installation signer secret is invalid");
  }
  const service = createPostgresInternalUnsignedInstallationAuthority({
    pool, tenant_id,
    attestation_key_id: secret.key_id,
    attestation_private_key: secret.private_key_pem,
    expected_attestation_public_key_sha256: secret.public_key_sha256,
  });
  await verifyAuthority(pool);
  return service;
}

export function composeInternalUnsignedInstallationRuntime(runtime, service) {
  if (!service) return runtime;
  return Object.freeze({
    ...runtime,
    internal_unsigned_installation_service: service,
    legacy_installation_service: Object.freeze({
      ...runtime.legacy_installation_service,
      ...Object.fromEntries(["register", "heartbeat", "retire"].map((operation) => [operation,
        async (command, options) => {
          const result = await service[`${operation}Legacy`](command, options);
          return result === null
            ? runtime.legacy_installation_service[operation](command, options)
            : result;
        },
      ])),
    }),
    installation_service: Object.freeze({
      ...runtime.installation_service,
      readTrustedCurrent: async (request) => {
        const installation = await service.readTrustedCurrent(request);
        return installation === null
          ? runtime.installation_service.readTrustedCurrent(request)
          : installation;
      },
    }),
  });
}

function route(pathname) {
  if (pathname === INTERNAL_UNSIGNED_INSTALLATION_PATH) return { operation: "register", installation_id: "NEW" };
  if (pathname === INTERNAL_UNSIGNED_INSTALLATION_ATTESTATION_PATH) return { operation: "attest" };
  const match = typeof pathname === "string"
    ? pathname.match(/^\/api\/desktop\/internal-installations\/(odi_[A-Za-z0-9_-]{20,128})\/(heartbeat|retire)$/u)
    : null;
  return match ? { operation: match[2], installation_id: match[1] } : null;
}

export function isInternalUnsignedInstallationApiPath(pathname) {
  return route(pathname) !== null;
}

function response(status, requestId, fields = {}) {
  return { status, body: {
    request_id: String(requestId ?? "request-internal-installation"),
    outcome: "blocked", safe_error_codes: [], token_material_returned: false,
    production_ready_claim: false, ...fields,
  } };
}

function failure(status, requestId, code) {
  return response(status, requestId, { safe_error_codes: [code] });
}

export async function handleInternalUnsignedInstallationApiRequest({
  pathname, method, body = {}, principal, context, requestId, runtime,
} = {}) {
  const matched = route(pathname);
  if (!matched) return failure(404, requestId, "OUTLOOK_DESKTOP_INSTALLATION_NOT_FOUND");
  if (method !== "POST") return failure(405, requestId, "OUTLOOK_DESKTOP_INSTALLATION_METHOD_NOT_ALLOWED");
  if (!principal) return failure(401, requestId, "AUTH_SESSION_REQUIRED");
  let bodyBytes;
  try { bodyBytes = Buffer.byteLength(JSON.stringify(body), "utf8"); } catch { bodyBytes = Infinity; }
  if (bodyBytes > OUTLOOK_DESKTOP_INSTALLATION_MAX_BODY_BYTES) return failure(413, requestId, "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_TOO_LARGE");
  const fields = BODY_FIELDS[matched.operation];
  if (!exactFields(body, matched.operation === "attest" ? fields : [...fields, ...PROOF_FIELDS])
    || (matched.operation === "attest" && (!isOutlookDesktopInstallationId(body.installation_id)
      || !ID.test(body.adoption_id ?? "")
      || !/^[a-f0-9]{64}$/u.test(body.request_sha256 ?? "")))) {
    return failure(400, requestId, "OUTLOOK_DESKTOP_INSTALLATION_REQUEST_INVALID");
  }
  const authority = evaluateOutlookDesktopLifecycleAuthority({
    principal, context, roster: runtime?.entitlement_roster,
    targetId: matched.installation_id ?? body.installation_id,
  });
  if (!authority.allowed) return failure(authority.status, requestId, authority.safe_error_code);
  const service = runtime?.internal_unsigned_installation_service;
  if (typeof service?.[matched.operation] !== "function") return failure(503, requestId, "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE");
  const signedPrincipal = Object.freeze({ tenant_id: principal.tenant_id, user_id: principal.user_id, entra_subject_id: principal.entra_subject_id });
  try {
    if (matched.operation === "attest") {
      const attestation = await service.attest({ principal: signedPrincipal, ...body });
      if (!exactFields(attestation, ["document_base64", "signature_base64", "key_id"])
        || !["document_base64", "signature_base64"].every((key) => typeof attestation[key] === "string"
          && attestation[key].length > 0 && attestation[key].length <= 64 * 1024
          && Buffer.from(attestation[key], "base64").toString("base64") === attestation[key])
        || Buffer.from(attestation.document_base64, "base64").length > 16 * 1024
        || Buffer.from(attestation.signature_base64, "base64").length !== 64
        || typeof attestation.key_id !== "string" || !ID.test(attestation.key_id)) {
        throw new Error("Internal installation attestation projection is invalid");
      }
      return response(200, requestId, { outcome: "attested", attestation });
    }
    const envelope = await service[matched.operation]({
      principal: signedPrincipal,
      request_id: String(requestId ?? "request-internal-installation"),
      request: Object.freeze({
        method: "POST", path: pathname, installation_id: matched.installation_id,
        body: Object.freeze(Object.fromEntries(fields.map((key) => [key, body[key]]))),
        ...Object.fromEntries(PROOF_FIELDS.filter((key) => key !== "signature").map((key) => [key, body[key]])),
      }),
      signature: body.signature,
    });
    const projected = projectOutlookDesktopLegacyServiceResult(envelope, matched.operation,
      matched.operation === "register" ? null : matched.installation_id);
    return response(projected.response_status, requestId, { outcome: projected.outcome, installation: projected.installation });
  } catch (error) {
    const code = /^(?:OUTLOOK_DESKTOP_|INTERNAL_INSTALLATION_|POSTGRES_)[A-Z0-9_]+$/u.test(error?.safe_error_code ?? "")
      ? error.safe_error_code : "OUTLOOK_DESKTOP_INSTALLATION_FAILED";
    return failure(new Set([400, 401, 403, 404, 409, 413, 503]).has(error?.status) ? error.status : 503, requestId, code);
  }
}
