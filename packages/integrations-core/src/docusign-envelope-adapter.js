import { createHash } from "node:crypto";
import docusign from "docusign-esign";
import { isOpaqueCredentialReference } from "../../persistence/src/credential-reference.js";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOCUSIGN_SDK_VERSION = "10.0.0";

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredRef(value, field) {
  const ref = requiredText(value, field);
  if (!isOpaqueCredentialReference(ref)) throw new TypeError(`${field} must use an opaque AWS Secrets Manager reference`);
  return ref;
}

function requiredSha256(value, field = "sha256") {
  const digest = requiredText(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return digest;
}

function normalizedBaseUri(value) {
  const parsed = new URL(requiredText(value, "base_uri"));
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new TypeError("base_uri must be an HTTPS origin");
  }
  return parsed.origin;
}

export function normalizeDocusignConnection(input = {}) {
  const credentialRefs = input.credential_refs ?? {};
  return Object.freeze({
    tenant_id: requiredText(input.tenant_id, "tenant_id"),
    connection_id: requiredText(input.connection_id, "connection_id"),
    account_id: requiredText(input.account_id, "account_id"),
    base_uri: normalizedBaseUri(input.base_uri),
    credential_refs: Object.freeze({
      integration_key: requiredRef(credentialRefs.integration_key, "credential_refs.integration_key"),
      service_user_id: requiredRef(credentialRefs.service_user_id, "credential_refs.service_user_id"),
      private_key: requiredRef(credentialRefs.private_key, "credential_refs.private_key"),
    }),
    hmac_secret_ref: input.hmac_secret_ref == null
      ? null
      : requiredRef(input.hmac_secret_ref, "hmac_secret_ref"),
  });
}

function sdkCall(target, method, ...args) {
  return new Promise((resolve, reject) => {
    target[method](...args, (error, data, response) => {
      if (error) {
        const wrapped = new Error("DocuSign provider request failed");
        wrapped.provider_status = Number(error?.response?.statusCode ?? error?.response?.status ?? error?.statusCode ?? error?.status);
        wrapped.provider_code = typeof error?.response?.body?.errorCode === "string"
          ? error.response.body.errorCode
          : null;
        wrapped.cause = error;
        reject(wrapped);
        return;
      }
      resolve({ data, response });
    });
  });
}

function normalizeDocument(input = {}) {
  const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes ?? []);
  if (bytes.length === 0) throw new TypeError("approved document bytes are required");
  const expectedSha256 = requiredSha256(input.sha256, "document.sha256");
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== expectedSha256) throw new TypeError("approved document SHA-256 does not match bytes");
  if (input.mime_type !== DOCX_MIME_TYPE) throw new TypeError("DocuSign source document must be DOCX");
  return Object.freeze({
    bytes,
    sha256: expectedSha256,
    filename: requiredText(input.filename, "document.filename"),
  });
}

function normalizeSigner(input = {}) {
  const email = requiredText(input.email, "signer.email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new TypeError("signer.email is invalid");
  const routingOrder = Number(input.routing_order);
  if (!Number.isSafeInteger(routingOrder) || routingOrder < 1) throw new TypeError("signer.routing_order is invalid");
  return Object.freeze({
    recipient_ref: requiredText(input.recipient_ref, "signer.recipient_ref"),
    role: requiredText(input.role, "signer.role"),
    name: requiredText(input.name, "signer.name"),
    email,
    routing_order: routingOrder,
  });
}

function signHereTabsForRole(anchorManifest, role) {
  const anchors = (anchorManifest?.anchors ?? []).filter((anchor) => anchor?.role === role);
  if (anchors.length === 0) throw new TypeError(`signature anchor is required for role ${role}`);
  return anchors.map((anchor) => ({
    anchorString: requiredText(anchor.anchor, "anchor_manifest.anchor"),
    anchorUnits: "pixels",
    anchorXOffset: String(Number.isFinite(Number(anchor.x_offset)) ? Number(anchor.x_offset) : 0),
    anchorYOffset: String(Number.isFinite(Number(anchor.y_offset)) ? Number(anchor.y_offset) : 0),
  }));
}

export function createDocusignEnvelopeAdapter({
  sdk = docusign,
  resolveSecret,
} = {}) {
  if (typeof resolveSecret !== "function") throw new TypeError("resolveSecret is required");

  async function envelopesApiFor(connectionInput) {
    const connection = normalizeDocusignConnection(connectionInput);
    const [integrationKey, serviceUserId, privateKey] = await Promise.all([
      resolveSecret({ tenant_id: connection.tenant_id, ref: connection.credential_refs.integration_key }),
      resolveSecret({ tenant_id: connection.tenant_id, ref: connection.credential_refs.service_user_id }),
      resolveSecret({ tenant_id: connection.tenant_id, ref: connection.credential_refs.private_key }),
    ]);
    const apiClient = new sdk.ApiClient();
    apiClient.setBasePath(`${connection.base_uri}/restapi`);
    const auth = await sdkCall(
      apiClient,
      "requestJWTUserToken",
      requiredText(integrationKey, "resolved integration key"),
      requiredText(serviceUserId, "resolved service user"),
      ["signature", "impersonation"],
      Buffer.isBuffer(privateKey) ? privateKey : Buffer.from(requiredText(privateKey, "resolved private key")),
      3600,
    );
    const accessToken = requiredText(auth.data?.body?.access_token ?? auth.data?.access_token, "JWT access token");
    apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
    return Object.freeze({ connection, envelopesApi: new sdk.EnvelopesApi(apiClient) });
  }

  return Object.freeze({
    provider: "docusign",
    sdk_version: DOCUSIGN_SDK_VERSION,
    async createDraft({ connection, document, signers, anchor_manifest } = {}) {
      const source = normalizeDocument(document);
      const normalizedSigners = (signers ?? []).map(normalizeSigner);
      if (normalizedSigners.length === 0) throw new TypeError("at least one signer is required");
      const { connection: normalizedConnection, envelopesApi } = await envelopesApiFor(connection);
      const envelopeDefinition = {
        emailSubject: "AMIC OS 서명 요청",
        status: "created",
        documents: [{
          documentBase64: source.bytes.toString("base64"),
          documentId: "1",
          fileExtension: "docx",
          name: source.filename,
        }],
        recipients: {
          signers: normalizedSigners.map((signer, index) => ({
            recipientId: String(index + 1),
            routingOrder: String(signer.routing_order),
            roleName: signer.role,
            name: signer.name,
            email: signer.email,
            tabs: { signHereTabs: signHereTabsForRole(anchor_manifest, signer.role) },
          })),
        },
      };
      const result = await sdkCall(envelopesApi, "createEnvelope", normalizedConnection.account_id, {
        envelopeDefinition,
      });
      return Object.freeze({ envelope_id: requiredText(result.data?.envelopeId, "provider envelope_id") });
    },
    async send({ connection, envelope_id } = {}) {
      const { connection: normalizedConnection, envelopesApi } = await envelopesApiFor(connection);
      await sdkCall(envelopesApi, "update", normalizedConnection.account_id, requiredText(envelope_id, "envelope_id"), {
        envelope: { status: "sent" },
      });
      return Object.freeze({ status: "sent" });
    },
    async getStatus({ connection, envelope_id } = {}) {
      const { connection: normalizedConnection, envelopesApi } = await envelopesApiFor(connection);
      const result = await sdkCall(
        envelopesApi,
        "getEnvelope",
        normalizedConnection.account_id,
        requiredText(envelope_id, "envelope_id"),
      );
      return Object.freeze({ status: requiredText(result.data?.status, "provider envelope status").toLowerCase() });
    },
    async downloadDocument({ connection, envelope_id, document_id } = {}) {
      const { connection: normalizedConnection, envelopesApi } = await envelopesApiFor(connection);
      const result = await sdkCall(
        envelopesApi,
        "getDocument",
        normalizedConnection.account_id,
        requiredText(envelope_id, "envelope_id"),
        requiredText(document_id, "document_id"),
      );
      const bytes = Buffer.isBuffer(result.data) ? result.data : Buffer.from(result.data ?? []);
      if (bytes.length === 0) throw new Error("DocuSign completion document was empty");
      return bytes;
    },
  });
}
