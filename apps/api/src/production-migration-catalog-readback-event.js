import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_ENVIRONMENT,
  CATALOG_READBACK_OPERATION,
  validateCatalogReadbackAuthorizationPacket,
  verifyCatalogReadbackApprovalPayload,
} from "../../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  catalogReadbackCanonicalSnapshot,
} from "../../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  catalogReadbackApprovalBinding,
  createCatalogReadbackLineage,
} from "../../../packages/persistence/src/postgres/catalog-readback-lineage.js";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
} from "./client-operations-schema.js";
import {
  PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS,
  validateProductionMigrationCatalogReadbackLiveAuthority,
} from "./production-migration-catalog-readback-live-authority.js";

export const PRODUCTION_MIGRATION_CATALOG_READBACK_EVENT_SCHEMA_VERSION =
  "law-firm-os.production-migration-catalog-readback-event.v1";

export {
  PRODUCTION_MIGRATION_CATALOG_READBACK_REQUIRED_ENV_KEYS,
  validateProductionMigrationCatalogReadbackLiveAuthority,
} from "./production-migration-catalog-readback-live-authority.js";

const EVENT_KEYS = Object.freeze([
  "schema_version",
  "action",
  "operation",
  "packet",
  "authorization",
  "preflight_receipt_sha256",
]);
const AUTHORIZATION_KEYS = Object.freeze([
  "trust_registry_json",
  "approval_receipt_json",
  "approval_signature_base64",
]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail("LAWOS_CATALOG_READBACK_EVENT", `${label} fields are invalid`);
  }
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) fail("LAWOS_CATALOG_READBACK_RUNTIME", `${label} is required`);
  return text;
}

function safeRuntimeFailure(code) {
  return Object.assign(
    new Error("production migration catalog readback failed at a protected boundary"),
    { code },
  );
}

export function loadEmbeddedCatalogReadbackDeploymentManifest() {
  try {
    return JSON.parse(readFileSync(
      new URL("../../../deployment-manifest.json", import.meta.url),
      "utf8",
    ));
  } catch {
    throw safeRuntimeFailure("LAWOS_CATALOG_READBACK_DEPLOYMENT_MANIFEST");
  }
}

function signatureBytes(value) {
  if (typeof value !== "string" || value.length > 4_096) {
    fail("LAWOS_CATALOG_READBACK_EVENT", "approval signature is invalid");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength !== 64 || bytes.toString("base64") !== value) {
    fail("LAWOS_CATALOG_READBACK_EVENT", "approval signature is invalid");
  }
  return bytes;
}

export function validateProductionMigrationCatalogReadbackEvent({
  event,
  env = process.env,
  now = Date.now(),
  verifyApproval = verifyCatalogReadbackApprovalPayload,
  deploymentManifest = loadEmbeddedCatalogReadbackDeploymentManifest(),
} = {}) {
  const snapshot = catalogReadbackCanonicalSnapshot(event);
  const manifest = catalogReadbackCanonicalSnapshot(deploymentManifest);
  exactKeys(snapshot, EVENT_KEYS, "catalog readback event");
  exactKeys(
    snapshot.authorization,
    AUTHORIZATION_KEYS,
    "catalog readback authorization",
  );
  if (snapshot.schema_version
      !== PRODUCTION_MIGRATION_CATALOG_READBACK_EVENT_SCHEMA_VERSION
    || snapshot.action !== CATALOG_READBACK_ACTION
    || snapshot.operation !== CATALOG_READBACK_OPERATION
    || !SHA256.test(snapshot.preflight_receipt_sha256 ?? "")) {
    fail("LAWOS_CATALOG_READBACK_EVENT", "catalog readback event is invalid");
  }
  const validatedPacket = validateCatalogReadbackAuthorizationPacket(
    snapshot.packet,
    {
      sourceCatalogCount:
        CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
      sourceCatalogSha256: CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
    },
  );
  if (!manifest
    || manifest.schema_version
      !== "law-firm-os.json-postgres-production-artifact.v1"
    || !SHA1.test(manifest.source_sha ?? "")
    || !SHA1.test(manifest.source_tree ?? "")
    || manifest.source_sha !== validatedPacket.packet.source_sha
    || manifest.source_tree !== validatedPacket.packet.source_tree
    || manifest.operational_authority !== "postgres-v2"
    || manifest.json_fallback !== false
    || manifest.json_writer !== false
    || manifest.dual_write !== false
    || manifest.file_current_authority !== false
    || manifest.offline_mutation !== false
    || manifest.memory_fallback !== false) {
    fail(
      "LAWOS_CATALOG_READBACK_DEPLOYMENT_MANIFEST",
      "embedded deployment manifest drifted",
    );
  }
  const account = requiredText(env.LAWOS_AWS_ACCOUNT_ID, "LAWOS_AWS_ACCOUNT_ID");
  const region = requiredText(
    env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
    "AWS region",
  );
  const functionName = requiredText(
    env.AWS_LAMBDA_FUNCTION_NAME,
    "AWS_LAMBDA_FUNCTION_NAME",
  );
  const executionRole = requiredText(
    env.LAWOS_PROGRAM_EXECUTION_ROLE,
    "LAWOS_PROGRAM_EXECUTION_ROLE",
  );
  if (account !== validatedPacket.packet.target.aws_account
    || region !== validatedPacket.packet.target.aws_region
    || functionName !== validatedPacket.packet.target.function_name
    || executionRole !== validatedPacket.packet.target.execution_role
    || executionRole !== "projection-auditor") {
    fail("LAWOS_CATALOG_READBACK_TARGET", "catalog readback runtime target drifted");
  }
  const registryJson = snapshot.authorization.trust_registry_json;
  const receiptJson = snapshot.authorization.approval_receipt_json;
  if (typeof registryJson !== "string"
    || Buffer.byteLength(registryJson, "utf8") > 128 * 1_024
    || typeof receiptJson !== "string"
    || Buffer.byteLength(receiptJson, "utf8") > 64 * 1_024) {
    fail("LAWOS_CATALOG_READBACK_EVENT", "catalog readback authorization bytes are invalid");
  }
  const registrySha256 = requiredText(
    env.LAWOS_OWNER_TRUST_REGISTRY_SHA256,
    "LAWOS_OWNER_TRUST_REGISTRY_SHA256",
  );
  if (!SHA256.test(registrySha256)
    || createHash("sha256").update(registryJson).digest("hex")
      !== registrySha256) {
    fail("LAWOS_CATALOG_READBACK_APPROVAL_ROOT", "owner trust registry binding drifted");
  }
  const approval = verifyApproval({
    packet: validatedPacket.packet,
    trustRegistryBytes: Buffer.from(registryJson),
    approvalReceiptBytes: Buffer.from(receiptJson),
    approvalSignatureBytes: signatureBytes(
      snapshot.authorization.approval_signature_base64,
    ),
    expectedRegistrySha256: registrySha256,
    now,
    expected: {
      sourceCatalogCount:
        CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
      sourceCatalogSha256: CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
    },
  });
  if (approval?.valid !== true || approval?.decision !== "approved"
    || approval.packet_sha256 !== validatedPacket.packet_sha256) {
    fail("LAWOS_CATALOG_READBACK_APPROVAL", "catalog readback approval is invalid");
  }
  validateProductionMigrationCatalogReadbackLiveAuthority({
    env,
    liveAuthority: validatedPacket.packet.live_authority,
    ownerTrustRegistrySha256: registrySha256,
  });
  const approvalBinding = catalogReadbackApprovalBinding({
    approval,
    authorization: snapshot.authorization,
    packetSha256: validatedPacket.packet_sha256,
  });
  return catalogReadbackCanonicalSnapshot({
    event: snapshot,
    packet: validatedPacket.packet,
    packet_sha256: validatedPacket.packet_sha256,
    approval,
    approval_binding: approvalBinding,
    lineage: createCatalogReadbackLineage({
      packet: validatedPacket.packet,
      packetSha256: validatedPacket.packet_sha256,
      approval: approvalBinding,
    }),
  });
}

export {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_ENVIRONMENT,
  CATALOG_READBACK_OPERATION,
};
