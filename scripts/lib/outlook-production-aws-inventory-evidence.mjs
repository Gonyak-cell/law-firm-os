import path from "node:path";

import {
  bindBoundEvidenceRoot,
  bindSourceRoot,
  closeBinding,
  ensureBoundEvidenceRoot,
} from "./desktop-installed-outlook-source-envelope-posix.mjs";
import {
  publishBoundEvidencePair,
  readBoundEvidencePair,
} from "./desktop-installed-outlook-source-envelope-publish.mjs";
import {
  EXPECTED_CLOUDFORMATION_STACKS,
  READ_ONLY_AWS_OPERATIONS,
  SCHEMA_VERSION,
  canonicalJson,
  sha256,
} from "./outlook-production-aws-inventory-contract.mjs";
import { validateInventoryEvidence } from "./outlook-production-aws-inventory-validator.mjs";

const COMPLETION_SCHEMA = "amic-os.outlook.production-aws-inventory-completion.v1";
export const TASK2_EVIDENCE_NAMES = Object.freeze({
  payloadName: "inventory.json",
  completionName: "inventory.json.complete",
  journalName: ".inventory.publishing",
  lockName: ".inventory.lock",
});

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalEvidence(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalKnownAlias(value) {
  const resolved = path.resolve(value);
  if (process.platform === "darwin" && (resolved === "/tmp" || resolved.startsWith("/tmp/"))) {
    return resolved.replace(/^\/tmp/u, "/private/tmp");
  }
  if (process.platform === "darwin" && (resolved === "/var" || resolved.startsWith("/var/"))) {
    return resolved.replace(/^\/var/u, "/private/var");
  }
  return resolved;
}

function pathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveEvidenceTarget(target) {
  if (typeof target !== "string" || !path.isAbsolute(target) || target.includes("\0") || target.includes("\\")) {
    fail("EVIDENCE_PATH_MUST_BE_ABSOLUTE", "absolute evidence path required");
  }
  const rawComponents = target.slice(1).split(path.sep);
  if (rawComponents.some((part) => !part || part === "." || part === "..")) {
    fail("EVIDENCE_PATH_UNSAFE", "evidence path contains an invalid component");
  }
  const resolved = canonicalKnownAlias(target);
  if (path.basename(resolved) !== TASK2_EVIDENCE_NAMES.payloadName) {
    fail("EVIDENCE_NAME_FIXED", `payload basename must be ${TASK2_EVIDENCE_NAMES.payloadName}`);
  }
  const parent = path.dirname(resolved);
  const relative = path.relative("/", parent);
  if (!relative || path.isAbsolute(relative) || relative.split(path.sep).some((part) => !part || part === "." || part === "..")) {
    fail("EVIDENCE_PATH_UNSAFE", "evidence directory must be a non-root relative path");
  }
  return { resolved, relative };
}

function parseEvidencePayload(bytes) {
  const text = Buffer.from(bytes).toString("utf8");
  let evidence;
  try {
    evidence = JSON.parse(text);
  } catch (error) {
    fail("EVIDENCE_INCOMPLETE", error instanceof Error ? error.message : "invalid evidence JSON");
  }
  if (canonicalEvidence(evidence) !== text) fail("EVIDENCE_INCOMPLETE", "payload is not canonical");
  validateInventoryEvidence(evidence);
  return evidence;
}

function completionFor(evidence, payloadIdentity, evidenceIdentity, payload) {
  const unsigned = {
    schema_version: COMPLETION_SCHEMA,
    status: "COMPLETE",
    evidence_root_identity: evidenceIdentity,
    payload_sha256: sha256(payload),
    payload_identity: payloadIdentity,
    inventory_sha256: evidence.inventory_sha256,
  };
  return { ...unsigned, completion_sha256: sha256(canonicalEvidence(unsigned)) };
}

function parseCompletion(bytes, pair, evidence) {
  const text = Buffer.from(bytes).toString("utf8");
  let completion;
  try {
    completion = JSON.parse(text);
  } catch (error) {
    fail("EVIDENCE_INCOMPLETE", error instanceof Error ? error.message : "invalid completion JSON");
  }
  const expectedKeys = [
    "completion_sha256",
    "evidence_root_identity",
    "inventory_sha256",
    "payload_identity",
    "payload_sha256",
    "schema_version",
    "status",
  ];
  if (!completion || typeof completion !== "object" || Array.isArray(completion) || Object.keys(completion).sort().join("\n") !== expectedKeys.join("\n")) {
    fail("EVIDENCE_INCOMPLETE", "completion schema mismatch");
  }
  const { completion_sha256: completionSha256, ...unsigned } = completion;
  if (
    canonicalEvidence(completion) !== text
    || completion.schema_version !== COMPLETION_SCHEMA
    || completion.status !== "COMPLETE"
    || completionSha256 !== sha256(canonicalEvidence(unsigned))
    || completion.payload_sha256 !== sha256(pair.payload)
    || !same(completion.payload_identity, pair.payloadIdentity)
    || !same(completion.evidence_root_identity, pair.evidenceIdentity)
    || completion.inventory_sha256 !== evidence.inventory_sha256
  ) {
    fail("EVIDENCE_INCOMPLETE", "completion does not bind the locked payload and evidence root");
  }
  return completion;
}

function verifyPair(pair) {
  const evidence = parseEvidencePayload(pair.payload);
  parseCompletion(pair.completion, pair, evidence);
  return evidence;
}

async function withEvidenceBinding(target, create, operation) {
  const { resolved, relative } = resolveEvidenceTarget(target);
  const source = bindSourceRoot("/");
  try {
    const binding = create
      ? ensureBoundEvidenceRoot(source, relative)
      : bindBoundEvidenceRoot(source, relative);
    return await operation(binding, resolved);
  } finally {
    closeBinding(source);
  }
}

export async function readInventoryEvidence(target) {
  try {
    return await withEvidenceBinding(target, false, async (binding) => {
      const pair = await readBoundEvidencePair({
        binding,
        names: TASK2_EVIDENCE_NAMES,
        verify: verifyPair,
      });
      return pair.verified;
    });
  } catch (error) {
    if (error?.code?.startsWith("SOURCE_ENVELOPE_") || error?.code === "EVIDENCE_INCOMPLETE") {
      fail("EVIDENCE_INCOMPLETE", "descriptor-relative evidence pair is not complete");
    }
    throw error;
  }
}

export async function writeInventoryEvidence(target, evidence) {
  validateInventoryEvidence(evidence);
  const payload = Buffer.from(canonicalEvidence(evidence), "utf8");
  return withEvidenceBinding(target, true, async (binding, resolved) => {
    await publishBoundEvidencePair({
      binding,
      names: TASK2_EVIDENCE_NAMES,
      payload,
      verify: ({ payloadIdentity, evidenceIdentity }) => {
        const lockedEvidence = parseEvidencePayload(payload);
        if (!payloadIdentity || !evidenceIdentity || lockedEvidence.inventory_sha256 !== evidence.inventory_sha256) {
          fail("EVIDENCE_INCOMPLETE", "locked candidate did not match the validated inventory");
        }
      },
      buildCompletion: ({ payloadIdentity, evidenceIdentity }) => Buffer.from(
        canonicalEvidence(completionFor(evidence, payloadIdentity, evidenceIdentity, payload)),
        "utf8",
      ),
    });
    return resolved;
  });
}

export function buildInventoryEvidence({ outcome, blockedReason, observedAt, profile, region, identity, selected, cloudformation, functions, topology, alarms, rds, calls }) {
  const mutationCount = calls.filter((call) => !READ_ONLY_AWS_OPERATIONS.has(`${call.service}:${call.operation}`)).length;
  const secretReadCount = calls.filter((call) => call.service === "secretsmanager" || /secret/iu.test(call.operation)).length;
  const core = {
    schema_version: SCHEMA_VERSION,
    outcome,
    blocked_reason: blockedReason ?? null,
    observed_at: observedAt,
    profile,
    region,
    cloudformation_stacks: [...EXPECTED_CLOUDFORMATION_STACKS],
    identity: identity ?? { account_id: null, account_matches: false, readonly_role_matches: false, arn_sha256: null, user_id_sha256: null },
    function_allowlist: [...selected].sort(),
    cloudformation,
    functions: [...functions].sort((left, right) => left.name.localeCompare(right.name)),
    topology,
    cloudwatch_alarms: alarms,
    rds,
    read_only: { mode: "read-only", mutation_count: mutationCount, secret_read_count: secretReadCount, lambda_invoke_count: calls.filter((call) => call.service === "lambda" && call.operation === "invoke").length, command_allowlist: [...READ_ONLY_AWS_OPERATIONS].sort() },
    aws_calls: calls.map(({ service, operation, target }) => ({ service, operation, target: target ?? null })),
    inventory_sha256: null,
  };
  const evidence = { ...core, inventory_sha256: sha256(canonicalJson(core)) };
  validateInventoryEvidence(evidence);
  return evidence;
}

export { validateInventoryEvidence, pathInside };
