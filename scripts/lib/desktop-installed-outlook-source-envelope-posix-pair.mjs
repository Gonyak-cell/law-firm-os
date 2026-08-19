import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createInterface } from "node:readline";

import {
  childEnvironment,
  verifyToolchainBinding,
} from "./desktop-installed-outlook-source-envelope-posix-bootstrap.mjs";
import { POSIX_PYTHON_SCRIPT } from "./desktop-installed-outlook-source-envelope-posix-python.mjs";

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
}

function encodedConfig(binding, extra) {
  return Buffer.from(JSON.stringify({
    source_path: binding.sourcePath,
    source_identity: binding.sourceIdentity,
    filesystem_root_identity: binding.filesystemRootIdentity,
    python_path: binding.tools.python.actual_path,
    python_identity: binding.tools.python.actual_identity,
    git_path: binding.tools.git.actual_path,
    git_identity: binding.tools.git.actual_identity,
    evidence_relative: binding.evidenceRelative,
    evidence_identity: binding.evidenceIdentity,
    ...extra,
  })).toString("base64");
}

function evidenceBasename(raw) {
  if (typeof raw !== "string" || !raw || Buffer.byteLength(raw) > 96 || raw === "." || raw === ".." || /[\/\\\0]/.test(raw)) {
    fail("SOURCE_ENVELOPE_EVIDENCE_NAME", "invalid fixed evidence basename");
  }
  return raw;
}

function pairConfig(binding, names) {
  if (!binding.evidenceRelative) fail("SOURCE_ENVELOPE_EVIDENCE_ROOT_UNBOUND", "evidence binding required");
  const config = {
    payload_name: evidenceBasename(names.payloadName),
    completion_name: evidenceBasename(names.completionName),
    journal_name: evidenceBasename(names.journalName),
    lock_name: evidenceBasename(names.lockName),
  };
  if (new Set(Object.values(config)).size !== Object.keys(config).length) {
    fail("SOURCE_ENVELOPE_EVIDENCE_NAME", "evidence pair basenames must be distinct");
  }
  return config;
}

class InteractiveProtocol {
  constructor(binding, operation, extra, payload) {
    verifyToolchainBinding(binding.tools);
    this.binding = binding;
    this.child = spawn(binding.tools.python.actual_path, ["-I", "-S", "-c", POSIX_PYTHON_SCRIPT, operation, encodedConfig(binding, extra)], {
      env: childEnvironment({ PYTHONNOUSERSITE: "1" }),
      stdio: ["pipe", "pipe", "pipe", binding.rootFd],
    });
    this.stderr = "";
    this.child.stdin.on("error", () => {});
    this.child.stderr.on("data", (chunk) => { if (this.stderr.length < 65536) this.stderr += chunk.toString("utf8"); });
    this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity })[Symbol.asyncIterator]();
    this.exit = once(this.child, "exit");
    if (payload) this.child.stdin.write(payload);
  }

  async message() {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        this.child.kill("SIGKILL");
        reject(Object.assign(new Error("SOURCE_ENVELOPE_POSIX_TIMEOUT"), { code: "SOURCE_ENVELOPE_POSIX_TIMEOUT" }));
      }, 60_000);
    });
    let next;
    try { next = await Promise.race([this.lines.next(), timeout]); } finally { clearTimeout(timer); }
    if (next.done) fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", this.stderr.trim() || "interactive child exited early");
    let value;
    try { value = JSON.parse(next.value); } catch (error) { fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", error.message); }
    if (!value.ok) fail(value.code || "SOURCE_ENVELOPE_POSIX_FAILED", value.detail || this.stderr.trim());
    return value;
  }

  send(value) { this.child.stdin.write(`${JSON.stringify(value)}\n`); }

  async close() {
    this.child.stdin.end();
    const [status, signal] = await this.exit;
    if (status !== 0) fail("SOURCE_ENVELOPE_POSIX_FAILED", this.stderr.trim() || signal || String(status));
  }

  async abort() {
    try { this.send({ command: "ABORT" }); } catch {}
    if (this.child.exitCode === null && this.child.signalCode === null) {
      let timer;
      try {
        await Promise.race([
          this.message(),
          new Promise((resolve) => { timer = setTimeout(resolve, 2_000); }),
        ]);
      } catch {} finally {
        clearTimeout(timer);
      }
    }
    this.child.stdin.end();
    if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGKILL");
    try { await this.exit; } catch {}
  }
}

export async function beginBoundPairPublication(binding, names, payload) {
  const bytes = Buffer.from(payload);
  const protocol = new InteractiveProtocol(binding, "publish_pair", {
    ...pairConfig(binding, names),
    payload_length: bytes.length,
    payload_sha256: createHash("sha256").update(bytes).digest("hex"),
  }, bytes);
  let ready;
  try { ready = await protocol.message(); } catch (error) { await protocol.abort(); throw error; }
  if (ready.phase !== "READY") fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", "publisher did not enter READY phase");
  return {
    payloadIdentity: ready.payload_identity,
    evidenceIdentity: ready.evidence_identity,
    async commit(completion) {
      verifyToolchainBinding(binding.tools);
      protocol.send({ command: "COMMIT", completion: Buffer.from(completion).toString("base64") });
      const done = await protocol.message();
      if (done.phase !== "DONE") fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", "publisher did not finish");
      await protocol.close();
      return { payloadIdentity: done.payload_identity, completionIdentity: done.completion_identity };
    },
    abort: () => protocol.abort(),
  };
}

export async function beginBoundPairRead(binding, names) {
  const protocol = new InteractiveProtocol(binding, "read_pair", pairConfig(binding, names));
  let ready;
  try { ready = await protocol.message(); } catch (error) { await protocol.abort(); throw error; }
  if (ready.phase !== "READY") fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", "reader did not enter READY phase");
  return {
    payload: Buffer.from(ready.payload, "base64"),
    completion: Buffer.from(ready.completion, "base64"),
    payloadIdentity: ready.payload_identity,
    completionIdentity: ready.completion_identity,
    evidenceIdentity: ready.evidence_identity,
    async finish() {
      verifyToolchainBinding(binding.tools);
      protocol.send({ command: "FINISH" });
      const done = await protocol.message();
      if (done.phase !== "DONE") fail("SOURCE_ENVELOPE_POSIX_PROTOCOL", "reader did not finish");
      await protocol.close();
    },
    abort: () => protocol.abort(),
  };
}
