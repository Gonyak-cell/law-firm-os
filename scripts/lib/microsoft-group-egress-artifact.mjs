export const MICROSOFT_GROUP_EGRESS_ARTIFACT_SCHEMA =
  "law-firm-os.microsoft-group-egress-artifact.v1";

export const MICROSOFT_GROUP_EGRESS_SOURCE_PATHS = Object.freeze([
  "apps/microsoft-group-egress-controller/bounded-request.mjs",
  "apps/microsoft-group-egress-controller/configuration.mjs",
  "apps/microsoft-group-egress-controller/contract.mjs",
  "apps/microsoft-group-egress-controller/graph-membership.mjs",
  "apps/microsoft-group-egress-controller/http-client.mjs",
  "apps/microsoft-group-egress-controller/index.mjs",
  "apps/microsoft-group-egress-controller/lambda.mjs",
  "apps/microsoft-group-egress-controller/response-json.mjs",
]);

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const EXPECTED_ARCHIVE_ENTRIES = Object.freeze([
  ...MICROSOFT_GROUP_EGRESS_SOURCE_PATHS.map((value) => value.split("/").at(-1)),
  "package.json",
  "deployment-manifest.json",
].sort());

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} is invalid`);
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== expected.length
    || keys.some((key, index) => key !== [...expected].sort()[index])) {
    throw new TypeError(`${label} is invalid`);
  }
}

function validateSources(sources) {
  if (!Array.isArray(sources) || sources.length !== MICROSOFT_GROUP_EGRESS_SOURCE_PATHS.length) {
    throw new TypeError("Microsoft group egress artifact manifest is invalid");
  }
  for (const [index, source] of sources.entries()) {
    exactKeys(source, ["source_path", "archive_path", "sha256", "byte_size"], "source binding");
    const sourcePath = MICROSOFT_GROUP_EGRESS_SOURCE_PATHS[index];
    if (
      source.source_path !== sourcePath
      || source.archive_path !== sourcePath.split("/").at(-1)
      || !SHA256.test(source.sha256)
      || !Number.isSafeInteger(source.byte_size)
      || source.byte_size < 1
    ) {
      throw new TypeError("Microsoft group egress artifact manifest is invalid");
    }
  }
  return sources.map((source) => Object.freeze({ ...source }));
}

export function createMicrosoftGroupEgressArtifactManifest({
  sourceSha,
  sourceTree,
  sources,
} = {}) {
  if (!SHA1.test(String(sourceSha)) || !SHA1.test(String(sourceTree))) {
    throw new TypeError("Microsoft group egress artifact source identity is invalid");
  }
  return Object.freeze({
    schema_version: MICROSOFT_GROUP_EGRESS_ARTIFACT_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    account_id: "770880870480",
    region: "ap-northeast-2",
    function_name: "lawos-microsoft-group-egress-prod",
    runtime: "nodejs22.x",
    architecture: "x86_64",
    handler: "lambda.handler",
    contract_version: "lawos.microsoft-group-egress.v1",
    provider_mutation_default: false,
    raw_secrets_in_artifact: false,
    secret_resolution: "exact-secretsmanager-arn-awscurrent-per-invocation",
    network_origins: Object.freeze([
      "https://login.microsoftonline.com",
      "https://graph.microsoft.com",
    ]),
    external_runtime_dependencies: Object.freeze([
      "@aws-sdk/client-secrets-manager",
    ]),
    sources: Object.freeze(validateSources(sources)),
  });
}

export function validateMicrosoftGroupEgressArtifactManifest(value) {
  exactKeys(value, [
    "schema_version", "source_sha", "source_tree", "account_id", "region",
    "function_name", "runtime", "architecture", "handler", "contract_version",
    "provider_mutation_default", "raw_secrets_in_artifact", "secret_resolution",
    "network_origins", "external_runtime_dependencies", "sources",
  ], "Microsoft group egress artifact manifest");
  if (
    value.schema_version !== MICROSOFT_GROUP_EGRESS_ARTIFACT_SCHEMA
    || !SHA1.test(value.source_sha)
    || !SHA1.test(value.source_tree)
    || value.account_id !== "770880870480"
    || value.region !== "ap-northeast-2"
    || value.function_name !== "lawos-microsoft-group-egress-prod"
    || value.runtime !== "nodejs22.x"
    || value.architecture !== "x86_64"
    || value.handler !== "lambda.handler"
    || value.contract_version !== "lawos.microsoft-group-egress.v1"
    || value.provider_mutation_default !== false
    || value.raw_secrets_in_artifact !== false
    || value.secret_resolution !== "exact-secretsmanager-arn-awscurrent-per-invocation"
    || JSON.stringify(value.network_origins) !== JSON.stringify([
      "https://login.microsoftonline.com",
      "https://graph.microsoft.com",
    ])
    || JSON.stringify(value.external_runtime_dependencies) !== JSON.stringify([
      "@aws-sdk/client-secrets-manager",
    ])
  ) {
    throw new TypeError("Microsoft group egress artifact manifest is invalid");
  }
  validateSources(value.sources);
  return Object.freeze({ verdict: "PASS", source_count: value.sources.length });
}

export function validateMicrosoftGroupEgressArtifactEntries(entries) {
  if (!Array.isArray(entries)
    || entries.some((entry) => typeof entry !== "string")) {
    throw new TypeError("Microsoft group egress artifact entries are invalid");
  }
  const sorted = [...entries].sort();
  if (sorted.length !== EXPECTED_ARCHIVE_ENTRIES.length
    || sorted.some((entry, index) => entry !== EXPECTED_ARCHIVE_ENTRIES[index])) {
    throw new TypeError("Microsoft group egress artifact entries are invalid");
  }
  return Object.freeze({ entry_count: sorted.length, forbidden_entry_count: 0 });
}
