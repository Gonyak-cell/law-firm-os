import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
  jsonPostgresStageProbeRequirements,
} from "./program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
  jsonPostgresProgramStageRequirements,
} from "./program-stage-gates.js";

export const JSON_POSTGRES_PROGRAM_STAGE_EVIDENCE_VERSION =
  "law-firm-os.json-postgres-program-stage-evidence.v1";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const COUNT_KEY = /^[a-z][a-z0-9_]{1,95}$/u;
const SENSITIVE_KEY =
  /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;

const COMMON_KEYS = Object.freeze([
  "schema_version", "evidence_id", "stage", "probe_kind",
  "source_sha", "source_tree", "packet_sha256", "bindings_sha256",
  "operator_role", "started_at", "finished_at", "command_sha256",
  "source_artifacts", "checks", "safe_counts", "claims", "result_sha256",
]);
const ARTIFACT_KEYS = Object.freeze(["kind", "sha256"]);
const CLAIM_KEYS = Object.freeze([
  "real_data_read", "real_data_mutated", "rehearsal_database_write",
  "production_contacted", "production_write", "external_email_sent",
  "source_mutated", "raw_value_returned", "pii_returned",
  "secret_material_returned", "document_bytes_returned",
]);

const W12_ARTIFACTS = Object.freeze({
  "source-inventory-adjudication": Object.freeze([
    "source-inventory", "authority-decisions", "authority-bundle",
  ]),
  "record-type-and-reference": Object.freeze([
    "record-type-catalog", "field-crosswalk", "source-transform",
    "logical-reference-reconciliation",
  ]),
  "w12-infrastructure": Object.freeze([
    "rehearsal-target-state", "database-security-state", "backup-target-state",
  ]),
  "w12-sink": Object.freeze([
    "sink-policy", "negative-recipient-probe", "sink-audit",
  ]),
  "w12-migration": Object.freeze([
    "execution-result", "database-readback", "dms-migration-result",
  ]),
  "w12-replay": Object.freeze([
    "first-execution-result", "replay-execution-result", "stability-readback",
  ]),
  "w12-tenant-rls": Object.freeze([
    "rls-negative-read", "rls-negative-write", "cross-tenant-transaction",
  ]),
  "w12-failure-injection": Object.freeze([
    "transaction-faults", "checkpoint-resume", "dms-provider-fault",
    "outbox-fault",
  ]),
  "w12-capacity": Object.freeze(["performance-acceptance"]),
  "w12-dms": Object.freeze([
    "dms-migration-result", "dms-governance-readback", "dms-delete-negative",
  ]),
  "w12-reconciliation": Object.freeze([
    "source-target-reconciliation", "logical-reference-validation",
    "identity-hrx-reconciliation",
  ]),
  "w12-restore": Object.freeze([
    "isolated-restore", "restore-reconciliation", "restore-dms-readback",
  ]),
  "w12-owner-sampling": Object.freeze([
    "owner-sample-manifest", "owner-sample-verdict",
  ]),
  "w12-terminal": Object.freeze(["component-receipt-set"]),
});

const ARTIFACTS = Object.freeze({
  ...Object.fromEntries(Object.entries(W12_ARTIFACTS).map(([stage, kinds]) => [
    stage,
    Object.freeze({ [stage]: kinds }),
  ])),
  "cut-008": Object.freeze({
    "exact-main-gates": Object.freeze([
      "exact-main-ci", "security-review", "postgres-test-execution",
    ]),
    "production-infrastructure": Object.freeze([
      "production-stack-state", "iam-review", "protected-resource-diff",
    ]),
    "database-bootstrap": Object.freeze([
      "database-bootstrap-result", "migration-checksum-state",
      "rls-identity-audit-state",
    ]),
    "dms-controls": Object.freeze([
      "dms-bucket-state", "dms-governance-negative-tests",
    ]),
  }),
  "cut-009": Object.freeze({
    "migration-commit": Object.freeze([
      "production-migration-result", "dms-migration-result",
      "authority-switch-result",
    ]),
    "identity-flow": Object.freeze([
      "identity-import-result", "individual-first-use-flow",
      "disabled-account-denial",
    ]),
    "migration-readback": Object.freeze([
      "warm-readback", "cold-readback", "logical-reference-validation",
    ]),
    "migration-reconciliation": Object.freeze([
      "source-target-reconciliation", "cross-domain-reconciliation",
    ]),
  }),
});

const ROLES = Object.freeze({
  "source-inventory-adjudication": Object.freeze({
    "source-inventory-adjudication": "matter-readonly-auditor",
  }),
  "record-type-and-reference": Object.freeze({
    "record-type-and-reference": "matter-readonly-auditor",
  }),
  "w12-infrastructure": Object.freeze({
    "w12-infrastructure": "matter-staging-admin",
  }),
  "w12-sink": Object.freeze({ "w12-sink": "matter-staging-admin" }),
  "w12-migration": Object.freeze({ "w12-migration": "matter-staging-admin" }),
  "w12-replay": Object.freeze({ "w12-replay": "matter-staging-admin" }),
  "w12-tenant-rls": Object.freeze({
    "w12-tenant-rls": "matter-readonly-auditor",
  }),
  "w12-failure-injection": Object.freeze({
    "w12-failure-injection": "matter-staging-admin",
  }),
  "w12-capacity": Object.freeze({
    "w12-capacity": "matter-readonly-auditor",
  }),
  "w12-dms": Object.freeze({ "w12-dms": "matter-readonly-auditor" }),
  "w12-reconciliation": Object.freeze({
    "w12-reconciliation": "matter-readonly-auditor",
  }),
  "w12-restore": Object.freeze({ "w12-restore": "matter-staging-admin" }),
  "w12-owner-sampling": Object.freeze({
    "w12-owner-sampling": "matter-readonly-auditor",
  }),
  "w12-terminal": Object.freeze({
    "w12-terminal": "matter-readonly-auditor",
  }),
  "cut-008": Object.freeze({
    "exact-main-gates": "matter-readonly-auditor",
    "production-infrastructure": "matter-prod-deploy-admin",
    "database-bootstrap": "matter-prod-deploy-admin",
    "dms-controls": "matter-readonly-auditor",
  }),
  "cut-009": Object.freeze({
    "migration-commit": "matter-cutover-operator",
    "identity-flow": "matter-readonly-auditor",
    "migration-readback": "matter-readonly-auditor",
    "migration-reconciliation": "matter-readonly-auditor",
  }),
});

const COUNT_OWNERS = Object.freeze({
  "cut-008": Object.freeze({
    "exact-main-gates": Object.freeze(["required_postgres_test_skip_count"]),
    "production-infrastructure": Object.freeze([
      "temporary_eni_allow_count", "public_resource_count",
      "excess_iam_allow_count", "protected_resource_mutation_count",
    ]),
    "database-bootstrap": Object.freeze([]),
    "dms-controls": Object.freeze([]),
  }),
  "cut-009": Object.freeze({
    "migration-commit": Object.freeze([
      "json_fallback_count", "json_writer_count", "dual_write_count",
      "file_current_authority_count", "offline_mutation_count",
      "memory_fallback_count", "unexpected_rejection_count",
    ]),
    "identity-flow": Object.freeze(["bulk_reset_send_count"]),
    "migration-readback": Object.freeze(["tenant_negative_visible_count"]),
    "migration-reconciliation": Object.freeze([
      "unexplained_variance_count", "dms_digest_mismatch_count",
      "dms_retention_failure_count", "dms_legal_hold_failure_count",
    ]),
  }),
});

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJson(value))
    .digest("hex");
}

function fail(message) {
  throw new Error(message);
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length) fail(`${label} contains unsupported fields: ${extras.join(",")}`);
}

function expectedClaims(stage) {
  const production = stage === "cut-008" || stage === "cut-009";
  const durableMutation = stage === "w12-migration" || stage === "cut-009";
  return Object.freeze({
    real_data_read: true,
    real_data_mutated: durableMutation,
    rehearsal_database_write: stage === "w12-migration",
    production_contacted: production,
    production_write: stage === "cut-009",
    external_email_sent: false,
    source_mutated: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
    document_bytes_returned: false,
  });
}

function ownedZeroCounts(stage, probeKind) {
  const requirements = jsonPostgresProgramStageRequirements(stage);
  if (COUNT_OWNERS[stage]) return COUNT_OWNERS[stage][probeKind] ?? [];
  return requirements.zero_counts;
}

function evidenceMaterial(evidence) {
  return Object.fromEntries(COMMON_KEYS
    .filter((key) => key !== "result_sha256")
    .map((key) => [key, evidence[key]]));
}

function validateSpecifications() {
  for (const [stage, probeKinds] of Object.entries(ARTIFACTS)) {
    const expectedProbeKinds = Object.keys(jsonPostgresStageProbeRequirements(stage)).sort();
    if (JSON.stringify(Object.keys(probeKinds).sort()) !== JSON.stringify(expectedProbeKinds)
      || JSON.stringify(Object.keys(ROLES[stage] ?? {}).sort()) !== JSON.stringify(expectedProbeKinds)) {
      fail(`program stage evidence routing is incomplete for ${stage}`);
    }
    const requiredZeroCounts = jsonPostgresProgramStageRequirements(stage).zero_counts;
    const assigned = expectedProbeKinds.flatMap((probeKind) =>
      ownedZeroCounts(stage, probeKind));
    if (new Set(assigned).size !== assigned.length
      || JSON.stringify([...assigned].sort())
        !== JSON.stringify([...requiredZeroCounts].sort())) {
      fail(`program stage evidence count ownership is incomplete for ${stage}`);
    }
  }
}

validateSpecifications();

export function jsonPostgresProgramStageEvidenceRequirements(stage, probeKind) {
  const artifactKinds = ARTIFACTS[stage]?.[probeKind];
  const operatorRole = ROLES[stage]?.[probeKind];
  const checks = jsonPostgresStageProbeRequirements(stage)?.[probeKind];
  if (!artifactKinds || !operatorRole || !checks) {
    fail("program stage evidence route is unsupported");
  }
  return Object.freeze({
    artifact_kinds: Object.freeze([...artifactKinds]),
    check_keys: Object.freeze([...checks]),
    zero_count_keys: Object.freeze([...ownedZeroCounts(stage, probeKind)]),
    operator_role: operatorRole,
    claims: expectedClaims(stage),
  });
}

export function createJsonPostgresProgramStageEvidence({
  evidenceId,
  stage,
  probeKind,
  packet,
  operatorRole,
  startedAt,
  finishedAt,
  commandSha256,
  sourceArtifacts,
  checks,
  safeCounts,
} = {}) {
  const evidence = {
    schema_version: JSON_POSTGRES_PROGRAM_STAGE_EVIDENCE_VERSION,
    evidence_id: evidenceId,
    stage,
    probe_kind: probeKind,
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    packet_sha256: packet?.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    operator_role: operatorRole,
    started_at: startedAt,
    finished_at: finishedAt,
    command_sha256: commandSha256,
    source_artifacts: (sourceArtifacts ?? []).map((item) => ({ ...item })),
    checks: { ...checks },
    safe_counts: { ...safeCounts },
    claims: expectedClaims(stage),
  };
  evidence.result_sha256 = sha256(evidenceMaterial(evidence));
  validateJsonPostgresProgramStageEvidence(evidence, { packet });
  return Object.freeze(evidence);
}

export function validateJsonPostgresProgramStageEvidence(evidence, {
  packet,
} = {}) {
  closed(evidence, COMMON_KEYS, "program stage evidence");
  const requirements = jsonPostgresProgramStageEvidenceRequirements(
    evidence.stage,
    evidence.probe_kind,
  );
  if (evidence.schema_version !== JSON_POSTGRES_PROGRAM_STAGE_EVIDENCE_VERSION
    || !TOKEN.test(evidence.evidence_id ?? "")
    || evidence.source_sha !== packet?.source_sha
    || evidence.source_tree !== packet?.source_tree
    || evidence.packet_sha256 !== packet?.packet_sha256
    || evidence.bindings_sha256 !== jsonPostgresProgramBindingsSha256(packet)
    || !packet?.authorized_stages?.includes(evidence.stage)
    || !packet?.operators?.includes(requirements.operator_role)
    || evidence.operator_role !== requirements.operator_role
    || !SHA1.test(evidence.source_sha ?? "")
    || !SHA1.test(evidence.source_tree ?? "")
    || !SHA256.test(evidence.packet_sha256 ?? "")
    || !SHA256.test(evidence.bindings_sha256 ?? "")
    || !TIME.test(evidence.started_at ?? "")
    || !TIME.test(evidence.finished_at ?? "")
    || Date.parse(evidence.finished_at) < Date.parse(evidence.started_at)
    || !SHA256.test(evidence.command_sha256 ?? "")) {
    fail("program stage evidence binding or execution metadata drifted");
  }
  if (!Array.isArray(evidence.source_artifacts)
    || JSON.stringify(evidence.source_artifacts.map((item) => item?.kind))
      !== JSON.stringify(requirements.artifact_kinds)) {
    fail("program stage evidence artifact set is incomplete or out of order");
  }
  for (const artifact of evidence.source_artifacts) {
    closed(artifact, ARTIFACT_KEYS, "program stage evidence artifact");
    if (!TOKEN.test(artifact.kind ?? "") || !SHA256.test(artifact.sha256 ?? "")) {
      fail("program stage evidence artifact binding is invalid");
    }
  }
  closed(evidence.checks, requirements.check_keys, "program stage evidence checks");
  if (JSON.stringify(Object.keys(evidence.checks).sort())
      !== JSON.stringify([...requirements.check_keys].sort())
    || Object.values(evidence.checks).some((value) => value !== true)) {
    fail("program stage evidence checks are incomplete or failed");
  }
  if (!evidence.safe_counts
    || typeof evidence.safe_counts !== "object"
    || Array.isArray(evidence.safe_counts)) {
    fail("program stage evidence safe_counts must be an object");
  }
  const allStageZeroCounts =
    jsonPostgresProgramStageRequirements(evidence.stage).zero_counts;
  for (const [key, value] of Object.entries(evidence.safe_counts)) {
    if (!COUNT_KEY.test(key) || SENSITIVE_KEY.test(key)
      || !Number.isSafeInteger(value) || value < 0) {
      fail("program stage evidence contains an invalid safe count");
    }
    if (allStageZeroCounts.includes(key)
      && !requirements.zero_count_keys.includes(key)) {
      fail("program stage evidence claims a zero count owned by another probe");
    }
  }
  if (requirements.zero_count_keys.some((key) => evidence.safe_counts[key] !== 0)
    || !Number.isSafeInteger(evidence.safe_counts.monthly_cost_forecast_krw)
    || evidence.safe_counts.monthly_cost_forecast_krw > 300_000) {
    fail("program stage evidence required zero counts or cost failed");
  }
  closed(evidence.claims, CLAIM_KEYS, "program stage evidence claims");
  if (CLAIM_KEYS.some((key) =>
    evidence.claims[key] !== requirements.claims[key])) {
    fail("program stage evidence claims drifted");
  }
  if (!SHA256.test(evidence.result_sha256 ?? "")
    || evidence.result_sha256 !== sha256(evidenceMaterial(evidence))) {
    fail("program stage evidence digest drifted");
  }
  return Object.freeze({
    valid: true,
    stage: evidence.stage,
    probe_kind: evidence.probe_kind,
    result_sha256: evidence.result_sha256,
  });
}

export function verifyJsonPostgresProgramStageEvidenceArtifacts({
  evidence,
  artifacts,
} = {}) {
  if (!Array.isArray(artifacts)
    || artifacts.length !== evidence?.source_artifacts?.length) {
    fail("program stage evidence source artifact files are incomplete");
  }
  const expected = new Map(
    evidence.source_artifacts.map((artifact) => [artifact.kind, artifact.sha256]),
  );
  const seen = new Set();
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)
      || !TOKEN.test(artifact.kind ?? "")
      || !Buffer.isBuffer(artifact.bytes)
      || artifact.bytes.byteLength > 128 * 1024 * 1024
      || seen.has(artifact.kind)
      || expected.get(artifact.kind) !== sha256(artifact.bytes)) {
      fail("program stage evidence source artifact file drifted");
    }
    seen.add(artifact.kind);
  }
  if ([...expected.keys()].some((kind) => !seen.has(kind))) {
    fail("program stage evidence source artifact file is missing");
  }
  return Object.freeze({
    valid: true,
    artifact_count: artifacts.length,
  });
}

export function createJsonPostgresProgramStageProbeFromEvidence({
  packet,
  evidence,
  probeId,
} = {}) {
  validateJsonPostgresProgramStageEvidence(evidence, { packet });
  return createJsonPostgresStageProbe({
    probeId,
    stage: evidence.stage,
    probeKind: evidence.probe_kind,
    collectorRef: "collect-json-postgres-program-stage-probe.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt: evidence.started_at,
    finishedAt: evidence.finished_at,
    command: `node scripts/collect-json-postgres-program-stage-probe.mjs --stage ${evidence.stage} --probe-kind ${evidence.probe_kind}`,
    checks: evidence.checks,
    safeCounts: evidence.safe_counts,
    evidenceSha256: evidence.result_sha256,
  });
}
