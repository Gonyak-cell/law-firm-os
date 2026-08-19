import {
  catalogReadbackCanonicalSha256,
  catalogReadbackCanonicalSnapshot,
} from "./catalog-readback-canonical.js";
import {
  createCatalogReadbackLineage,
  validateCatalogReadbackLineage,
} from "./catalog-readback-lineage.js";
import {
  validatePostgresMigrationCatalogReadback,
} from "./migration-catalog-readback.js";
import path from "node:path";

export const CATALOG_READBACK_PREFLIGHT_RECEIPT_SCHEMA_VERSION =
  "law-firm-os.production-migration-catalog-readback-preflight-receipt.v3";
export const CATALOG_READBACK_CATALOG_RECEIPT_SCHEMA_VERSION =
  "law-firm-os.production-migration-catalog-readback-catalog-receipt.v2";

const SHA256 = /^[a-f0-9]{64}$/u;
const PREFLIGHT_KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "lineage",
  "source_envelope_sha256",
  "validate_locator",
  "provider_action_count",
  "receipt_sha256",
]);
const CATALOG_KEYS = Object.freeze([
  "schema_version",
  "lineage",
  "preflight_receipt_sha256",
  "catalog",
  "receipt_sha256",
]);
const VALIDATE_LOCATOR_KEYS = Object.freeze(["path", "bytes", "sha256"]);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail("LAWOS_CATALOG_READBACK_RECEIPT_SCHEMA", `${label} fields are invalid`);
  }
}

function selfDigest(value) {
  return catalogReadbackCanonicalSha256({ ...value, receipt_sha256: "" });
}

function validateLocator(value) {
  const locator = catalogReadbackCanonicalSnapshot(value);
  exactKeys(locator, VALIDATE_LOCATOR_KEYS, "validate locator binding");
  if (!path.isAbsolute(locator.path ?? "")
    || !Number.isSafeInteger(locator.bytes) || locator.bytes < 1
    || locator.bytes > 1024 * 1024
    || !SHA256.test(locator.sha256 ?? "")) {
    fail(
      "LAWOS_CATALOG_READBACK_RECEIPT_BINDING",
      "validate locator binding is invalid",
    );
  }
  return locator;
}

function matchExpected(lineage, expected = {}) {
  if ((expected.packetSha256
      && lineage.packet_sha256 !== expected.packetSha256)
    || (expected.sourceSha && lineage.source_sha !== expected.sourceSha)
    || (expected.sourceTree && lineage.source_tree !== expected.sourceTree)) {
    fail("LAWOS_CATALOG_READBACK_RECEIPT_BINDING", "receipt lineage drifted");
  }
  if (expected.packet && expected.approval) {
    const recomputed = createCatalogReadbackLineage({
      packet: expected.packet,
      packetSha256: expected.packetSha256,
      approval: expected.approval,
    });
    if (catalogReadbackCanonicalSha256(recomputed)
        !== catalogReadbackCanonicalSha256(lineage)) {
      fail("LAWOS_CATALOG_READBACK_RECEIPT_BINDING", "receipt lineage does not match the packet and approval");
    }
  }
}

export function createCatalogReadbackPreflightReceipt({
  lineage,
  sourceEnvelopeSha256,
  validateLocator: validateLocatorBinding,
} = {}) {
  const receipt = {
    schema_version: CATALOG_READBACK_PREFLIGHT_RECEIPT_SCHEMA_VERSION,
    outcome: "AUTHORIZED_READY",
    lineage: validateCatalogReadbackLineage(lineage),
    source_envelope_sha256: sourceEnvelopeSha256,
    validate_locator: validateLocator(validateLocatorBinding),
    provider_action_count: 0,
    receipt_sha256: "",
  };
  receipt.receipt_sha256 = selfDigest(receipt);
  return validateCatalogReadbackPreflightReceipt(receipt);
}

export function validateCatalogReadbackPreflightReceipt(
  value,
  expected = {},
) {
  const receipt = catalogReadbackCanonicalSnapshot(value);
  exactKeys(receipt, PREFLIGHT_KEYS, "catalog readback preflight receipt");
  const lineage = validateCatalogReadbackLineage(receipt.lineage);
  const validateLocatorBinding = validateLocator(receipt.validate_locator);
  if (receipt.schema_version
      !== CATALOG_READBACK_PREFLIGHT_RECEIPT_SCHEMA_VERSION
    || receipt.outcome !== "AUTHORIZED_READY"
    || receipt.provider_action_count !== 0
    || !SHA256.test(receipt.source_envelope_sha256 ?? "")
    || (expected.sourceEnvelopeSha256
      && receipt.source_envelope_sha256
        !== expected.sourceEnvelopeSha256)
    || !SHA256.test(receipt.receipt_sha256 ?? "")
    || receipt.receipt_sha256 !== selfDigest(receipt)) {
    fail("LAWOS_CATALOG_READBACK_RECEIPT_BINDING", "preflight receipt is invalid");
  }
  if (expected.validateLocator
    && catalogReadbackCanonicalSha256(validateLocator(expected.validateLocator))
      !== catalogReadbackCanonicalSha256(validateLocatorBinding)) {
    fail(
      "LAWOS_CATALOG_READBACK_RECEIPT_BINDING",
      "validate locator binding drifted",
    );
  }
  matchExpected(lineage, expected);
  return receipt;
}

export function createCatalogReadbackCatalogReceipt({
  lineage,
  preflightReceiptSha256,
  catalog,
} = {}) {
  const receipt = {
    schema_version: CATALOG_READBACK_CATALOG_RECEIPT_SCHEMA_VERSION,
    lineage: validateCatalogReadbackLineage(lineage),
    preflight_receipt_sha256: preflightReceiptSha256,
    catalog: validatePostgresMigrationCatalogReadback(catalog),
    receipt_sha256: "",
  };
  receipt.receipt_sha256 = selfDigest(receipt);
  return validateCatalogReadbackCatalogReceipt(receipt);
}

export function validateCatalogReadbackCatalogReceipt(
  value,
  expected = {},
) {
  const receipt = catalogReadbackCanonicalSnapshot(value);
  exactKeys(receipt, CATALOG_KEYS, "migration catalog receipt");
  const lineage = validateCatalogReadbackLineage(receipt.lineage);
  const catalog = validatePostgresMigrationCatalogReadback(receipt.catalog);
  if (receipt.schema_version !== CATALOG_READBACK_CATALOG_RECEIPT_SCHEMA_VERSION
    || !SHA256.test(receipt.preflight_receipt_sha256 ?? "")
    || (expected.preflightReceiptSha256
      && receipt.preflight_receipt_sha256
        !== expected.preflightReceiptSha256)
    || !SHA256.test(receipt.receipt_sha256 ?? "")
    || receipt.receipt_sha256 !== selfDigest(receipt)
    || catalog.catalog_sha256 !== receipt.catalog.catalog_sha256) {
    fail("LAWOS_CATALOG_READBACK_RECEIPT_BINDING", "catalog receipt is invalid");
  }
  matchExpected(lineage, expected);
  return receipt;
}
