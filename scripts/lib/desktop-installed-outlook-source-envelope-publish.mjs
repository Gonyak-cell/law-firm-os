import { createHash } from "node:crypto";

import {
  beginBoundPairPublication,
  beginBoundPairRead,
} from "./desktop-installed-outlook-source-envelope-posix.mjs";

export const OUTPUT_NAME = "task-1-source-envelope.json";
export const COMPLETION_NAME = `${OUTPUT_NAME}.complete`;
export const TASK1_PAIR_NAMES = Object.freeze({
  payloadName: OUTPUT_NAME,
  completionName: COMPLETION_NAME,
  journalName: ".task-1-source-envelope.publishing",
  lockName: ".task-1-source-envelope.lock",
});

export function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function payloadBytes(record) {
  const body = { ...record, output_sha256: sha256(canonical(record)) };
  return { body, bytes: Buffer.from(canonical(body)) };
}

function parsePayload(bytes) {
  const text = bytes.toString("utf8");
  let value;
  try { value = JSON.parse(text); } catch (error) { fail("SOURCE_ENVELOPE_OUTPUT_INTEGRITY", error.message); }
  const { output_sha256: outputSha256, ...unsigned } = value;
  if (value.status !== "CANDIDATE" || canonical(value) !== text || outputSha256 !== sha256(canonical(unsigned))) {
    fail("SOURCE_ENVELOPE_OUTPUT_INTEGRITY", "payload is not exact canonical candidate evidence");
  }
  return value;
}

function completionFor(record, payloadIdentity, evidenceIdentity) {
  const unsigned = {
    schema_version: "law-firm-os.desktop-installed-outlook-auto-provisioning-source-envelope-completion.v3",
    status: "COMPLETE",
    evidence_root_identity: evidenceIdentity,
    output_sha256: record.output_sha256,
    output_identity: payloadIdentity,
  };
  return { ...unsigned, completion_sha256: sha256(canonical(unsigned)) };
}

function parseTask1Pair(pair) {
  const record = parsePayload(pair.payload);
  const text = pair.completion.toString("utf8");
  let completion;
  try { completion = JSON.parse(text); } catch (error) { fail("SOURCE_ENVELOPE_INCOMPLETE", error.message); }
  const { completion_sha256: completionSha256, ...unsigned } = completion;
  if (
    completion.status !== "COMPLETE"
    || completion.schema_version !== "law-firm-os.desktop-installed-outlook-auto-provisioning-source-envelope-completion.v3"
    || canonical(completion) !== text
    || completionSha256 !== sha256(canonical(unsigned))
    || completion.output_sha256 !== record.output_sha256
    || !same(completion.output_identity, pair.payloadIdentity)
    || !same(completion.evidence_root_identity, pair.evidenceIdentity)
  ) {
    fail("SOURCE_ENVELOPE_INCOMPLETE", "completion does not bind the locked payload and evidence root");
  }
  return { record, completion };
}

export async function publishBoundEvidencePair({ binding, names, payload, verify, buildCompletion }) {
  const transaction = await beginBoundPairPublication(binding, names, payload);
  let committed = false;
  try {
    await verify?.({ payloadIdentity: transaction.payloadIdentity, evidenceIdentity: transaction.evidenceIdentity });
    const completion = await buildCompletion({
      payloadIdentity: transaction.payloadIdentity,
      evidenceIdentity: transaction.evidenceIdentity,
    });
    const identities = await transaction.commit(completion);
    committed = true;
    return { ...identities, payload: Buffer.from(payload), completion: Buffer.from(completion) };
  } catch (error) {
    if (!committed) await transaction.abort();
    throw error;
  }
}

export async function readBoundEvidencePair({ binding, names, verify }) {
  const transaction = await beginBoundPairRead(binding, names);
  const pair = {
    payload: transaction.payload,
    completion: transaction.completion,
    payloadIdentity: transaction.payloadIdentity,
    completionIdentity: transaction.completionIdentity,
    evidenceIdentity: transaction.evidenceIdentity,
  };
  try {
    const verified = await verify(pair);
    await transaction.finish();
    return { ...pair, verified };
  } catch (error) {
    await transaction.abort();
    throw error;
  }
}

export async function publishEvidence(binding, record, verifySource) {
  const { body, bytes } = payloadBytes(record);
  await publishBoundEvidencePair({
    binding,
    names: TASK1_PAIR_NAMES,
    payload: bytes,
    verify: verifySource,
    buildCompletion: ({ payloadIdentity, evidenceIdentity }) => Buffer.from(canonical(completionFor(body, payloadIdentity, evidenceIdentity))),
  });
  return { outputPath: OUTPUT_NAME, completionPath: COMPLETION_NAME, record: body };
}

export async function readCompleteEvidence(binding, verifyCurrent) {
  const pair = await readBoundEvidencePair({
    binding,
    names: TASK1_PAIR_NAMES,
    verify: async (locked) => {
      const parsed = parseTask1Pair(locked);
      await verifyCurrent(parsed);
      return parsed;
    },
  });
  return {
    outputPath: OUTPUT_NAME,
    completionPath: COMPLETION_NAME,
    record: pair.verified.record,
  };
}
