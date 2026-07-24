#!/usr/bin/env node
import { join } from "node:path";
import {
  createJsonPostgresRehearsalDmsManifest,
} from "./lib/json-postgres-rehearsal-dms-manifest.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name, { required = true } = {}) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (required && (!value || value.startsWith("--"))) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

const corpus = readPrivateProgramJson(
  option("--corpus"),
  "migration corpus",
);
const authoritySummary = readPrivateProgramJson(
  option("--authority-summary"),
  "authority bundle summary",
);
const retentionContract = readPrivateProgramJson(
  option("--retention-contract"),
  "backup retention contract",
);
const sourceObjectPath = option("--source-object-map", { required: false });
const sourceObjectMap = sourceObjectPath
  ? readPrivateProgramJson(sourceObjectPath, "DMS source object map")
  : null;
const created = createJsonPostgresRehearsalDmsManifest({
  corpus,
  authorityManifestSha256: authoritySummary.authority_manifest_sha256,
  retentionContract,
  sourceObjectMap,
});
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const manifest = writePrivateProgramJson(
  join(outputDir, "dms-object-manifest.json"),
  created.manifest,
);
const classification = writePrivateProgramJson(
  join(outputDir, "dms-object-classification.json"),
  created.classification,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  output_dir: outputDir,
  manifest_path: manifest.path,
  manifest_file_sha256: manifest.sha256,
  manifest_sha256: created.manifest.manifest_sha256,
  classification_path: classification.path,
  classification_file_sha256: classification.sha256,
  classification_sha256: created.classification.classification_sha256,
  real_object_count: created.classification.real_object_count,
  excluded_synthetic_metadata_count:
    created.classification.excluded_synthetic_metadata_count,
  unclassified_file_object_count:
    created.classification.unclassified_file_object_count,
  document_bytes_returned: false,
  pii_returned: false,
}, null, 2)}\n`);
