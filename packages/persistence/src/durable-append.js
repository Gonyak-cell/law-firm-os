import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname } from "node:path";
import {
  acquireExclusiveFileLock,
  appendFileWithFsync,
  ensurePrivateDirectory,
  hashDurableValue,
  releaseExclusiveFileLock,
} from "./durable-file.js";

export const LAWOS_DURABLE_APPEND_SCHEMA_VERSION = "law-firm-os.durable-append.v0.1";

function codedError(message, code, fields = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, fields);
  return error;
}

function payloadFromEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw codedError("durable append entry must be an object", "LAWOS_APPEND_ENTRY_INVALID");
  }
  const { __lawos_append: metadata, ...value } = entry;
  if (
    metadata?.schema_version !== LAWOS_DURABLE_APPEND_SCHEMA_VERSION
    || !Number.isSafeInteger(metadata.sequence)
    || metadata.sequence < 1
    || !(metadata.previous_sha256 === null || /^[a-f0-9]{64}$/u.test(metadata.previous_sha256))
    || !/^[a-f0-9]{64}$/u.test(metadata.entry_sha256 ?? "")
    || !Number.isSafeInteger(metadata.writer?.pid)
    || metadata.writer.pid < 1
    || typeof metadata.writer?.host !== "string"
    || typeof metadata.writer?.token !== "string"
    || !Number.isFinite(Date.parse(metadata.writer?.written_at ?? ""))
  ) {
    throw codedError("durable append metadata is invalid", "LAWOS_APPEND_ENTRY_INVALID");
  }
  return { metadata, value };
}

function entryHash({ sequence, previousSha256, writer, value }) {
  return hashDurableValue({ sequence, previous_sha256: previousSha256, writer, value });
}

export function verifyDurableNdjsonFile({ filePath } = {}) {
  if (!filePath) throw new TypeError("durable append filePath is required");
  if (!existsSync(filePath)) return { sequence: 0, lastSha256: null, entries: [] };
  const body = readFileSync(filePath, "utf8");
  const lines = body.split("\n").filter((line) => line.length > 0);
  const entries = [];
  let previousSha256 = null;
  for (const [index, line] of lines.entries()) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw codedError("durable append line is not valid JSON", "LAWOS_APPEND_PARSE_FAILED", { line: index + 1, cause: error });
    }
    const { metadata, value } = payloadFromEntry(parsed);
    const expectedSequence = index + 1;
    if (metadata.sequence !== expectedSequence || metadata.previous_sha256 !== previousSha256) {
      throw codedError("durable append sequence or previous hash is discontinuous", "LAWOS_APPEND_CONTINUITY_FAILED", {
        line: expectedSequence,
      });
    }
    const actualSha256 = entryHash({
      sequence: metadata.sequence,
      previousSha256: metadata.previous_sha256,
      writer: metadata.writer,
      value,
    });
    if (actualSha256 !== metadata.entry_sha256) {
      throw codedError("durable append entry hash does not match", "LAWOS_APPEND_HASH_MISMATCH", {
        line: expectedSequence,
      });
    }
    entries.push(parsed);
    previousSha256 = metadata.entry_sha256;
  }
  return { sequence: entries.length, lastSha256: previousSha256, entries };
}

export function appendNdjsonDurably({
  filePath,
  value,
  expectedSequence,
  now = new Date(),
  lockWaitTimeoutMs = 2_000,
  faultInjector,
} = {}) {
  if (!filePath) throw new TypeError("durable append filePath is required");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("durable append value must be an object");
  if (Object.hasOwn(value, "__lawos_append")) {
    throw codedError("durable append value uses the reserved metadata key", "LAWOS_APPEND_RESERVED_KEY");
  }
  const writtenAt = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(writtenAt.getTime())) throw new TypeError("durable append now must be a valid date");
  ensurePrivateDirectory(dirname(filePath));
  const lock = acquireExclusiveFileLock({
    resourcePath: filePath,
    lockPath: `${filePath}.append.lock`,
    waitTimeoutMs: lockWaitTimeoutMs,
    now: writtenAt,
  });
  try {
    const current = verifyDurableNdjsonFile({ filePath });
    if (expectedSequence !== undefined && expectedSequence !== current.sequence) {
      throw codedError("durable append sequence conflict", "LAWOS_APPEND_SEQUENCE_CONFLICT", {
        expected_sequence: expectedSequence,
        current_sequence: current.sequence,
      });
    }
    const sequence = current.sequence + 1;
    const writer = {
      pid: process.pid,
      host: hostname(),
      token: lock.token,
      written_at: writtenAt.toISOString(),
    };
    const entrySha256 = entryHash({ sequence, previousSha256: current.lastSha256, writer, value });
    const entry = {
      __lawos_append: {
        schema_version: LAWOS_DURABLE_APPEND_SCHEMA_VERSION,
        sequence,
        previous_sha256: current.lastSha256,
        entry_sha256: entrySha256,
        writer,
      },
      ...value,
    };
    appendFileWithFsync({
      filePath,
      data: `${JSON.stringify(entry)}\n`,
      faultInjector: (point, context) => faultInjector?.(point, { ...context, sequence }),
    });
    return { filePath, sequence, previousSha256: current.lastSha256, entrySha256, writer };
  } finally {
    releaseExclusiveFileLock(lock);
  }
}
