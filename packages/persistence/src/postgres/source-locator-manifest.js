import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";

export const JSON_POSTGRES_SOURCE_LOCATOR_MANIFEST_VERSION =
  "law-firm-os.json-postgres-source-locator-manifest.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_REF = /^[a-f0-9]{32}$/u;
const ROOT_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function material(value) {
  return {
    schema_version: value.schema_version,
    inventory_content_sha256: value.inventory_content_sha256,
    sources: value.sources,
  };
}

export function createJsonPostgresSourceLocatorManifest({
  inventory,
  locators = [],
} = {}) {
  if (!SHA256.test(inventory?.inventory_content_sha256 ?? "")
    || !Array.isArray(inventory?.sources)
    || !Array.isArray(locators)) {
    throw new TypeError("source locator manifest requires an exact source inventory");
  }
  const inventoryByRef = new Map(inventory.sources.map((source) => [source.source_ref, source]));
  const rows = [];
  for (const locator of locators) {
    const source = inventoryByRef.get(locator?.source_ref);
    if (!source
      || !SOURCE_REF.test(locator.source_ref ?? "")
      || !ROOT_REF.test(locator.root_ref ?? "")
      || source.root_ref !== locator.root_ref
      || source.sha256 !== locator.sha256
      || source.byte_size !== locator.byte_size
      || !isAbsolute(locator.source_path ?? "")
      || !isAbsolute(locator.root_path ?? "")) {
      throw new TypeError("source locator drifted from the exact inventory");
    }
    rows.push(Object.freeze({
      source_ref: locator.source_ref,
      root_ref: locator.root_ref,
      root_path: locator.root_path,
      source_path: locator.source_path,
      sha256: locator.sha256,
      byte_size: locator.byte_size,
    }));
  }
  rows.sort((left, right) => left.source_ref.localeCompare(right.source_ref));
  if (rows.length !== inventory.sources.length
    || new Set(rows.map((row) => row.source_ref)).size !== rows.length) {
    throw new TypeError("source locator manifest must cover every inventoried source exactly once");
  }
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_LOCATOR_MANIFEST_VERSION,
    inventory_content_sha256: inventory.inventory_content_sha256,
    sources: Object.freeze(rows),
  });
  return Object.freeze({
    ...value,
    locator_manifest_sha256: sha256(material(value)),
  });
}

export function validateJsonPostgresSourceLocatorManifest(manifest, { inventory } = {}) {
  if (manifest?.schema_version !== JSON_POSTGRES_SOURCE_LOCATOR_MANIFEST_VERSION
    || !SHA256.test(manifest?.locator_manifest_sha256 ?? "")) {
    throw new TypeError("source locator manifest schema is invalid");
  }
  const rebuilt = createJsonPostgresSourceLocatorManifest({
    inventory,
    locators: manifest.sources,
  });
  if (stableJson(rebuilt) !== stableJson(manifest)) {
    throw new TypeError("source locator manifest digest or inventory binding drifted");
  }
  return Object.freeze({
    valid: true,
    locator_manifest_sha256: manifest.locator_manifest_sha256,
    source_count: manifest.sources.length,
  });
}
