import { readFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { opaqueSha256 } from "./formal-deployed-api-transcript.mjs";
import { fail, sha256Bytes } from "./formal-deployed-api-io.mjs";

function httpOrigin(raw) {
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

function operatorHeaderCount(value) {
  const text = JSON.stringify(value ?? {});
  return (text.match(/(?:x-lawos-operator-token|x-matter-operator-token|authorization)/giu) ?? []).length;
}

function sequence(rows) {
  return rows.map((row, index) => ({ sequence: index + 1, ...row }));
}

function netLogRows(path) {
  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_TELEMETRY", "whole-process Chromium net log is missing or invalid");
  }
  const rows = [];
  for (const event of value.events ?? []) {
    const params = event?.params ?? {};
    const urls = [];
    const visit = (child, key = "") => {
      if (typeof child === "string" && /url$/iu.test(key)) urls.push(child);
      else if (Array.isArray(child)) child.forEach((item) => visit(item, key));
      else if (child && typeof child === "object") Object.entries(child).forEach(([name, item]) => visit(item, name));
    };
    visit(params);
    for (const rawUrl of new Set(urls)) {
      const origin = httpOrigin(rawUrl);
      if (!origin) continue;
      rows.push({
        phase: "whole-process-netlog",
        method: String(params.method ?? "GET").toUpperCase(),
        status: Number.isInteger(params.status_code) ? params.status_code : null,
        failed: Number(params.net_error ?? 0) < 0,
        origin_sha256: sha256Bytes(origin),
        operator_header_count: operatorHeaderCount(params),
      });
    }
  }
  return rows;
}

export function createFormalRuntimeTelemetry({ endpoint, netLogPath, artifactSha256, manifestSha256, executableSha256, executablePath }) {
  const consoleEvents = [];
  const processErrorEvents = [];
  const observedNetwork = [];
  const requestState = new WeakMap();
  const telemetryBoundaries = [{ kind: "configured_before_launch" }];
  const processEvents = [];
  const endpointOrigin = new URL(endpoint).origin;
  let child = null;

  const observePage = (page) => {
    page.on("console", (message) => {
      if (message.type() === "error") consoleEvents.push({ event_sha256: opaqueSha256(message.text()) });
    });
    page.on("pageerror", (error) => consoleEvents.push({ event_sha256: opaqueSha256(error?.message ?? "pageerror") }));
    page.on("request", async (request) => {
      const origin = httpOrigin(request.url());
      if (!origin) return;
      const headers = await request.allHeaders().catch(() => ({}));
      requestState.set(request, { origin, method: request.method(), operator_header_count: operatorHeaderCount(headers) });
    });
    page.on("requestfinished", async (request) => {
      const state = requestState.get(request);
      if (!state) return;
      const response = await request.response().catch(() => null);
      observedNetwork.push({ phase: "renderer", method: state.method, status: response?.status() ?? null, failed: false, origin_sha256: sha256Bytes(state.origin), operator_header_count: state.operator_header_count });
    });
    page.on("requestfailed", (request) => {
      const state = requestState.get(request);
      if (state) observedNetwork.push({ phase: "renderer", method: state.method, status: null, failed: true, origin_sha256: sha256Bytes(state.origin), operator_header_count: state.operator_header_count });
    });
  };

  return Object.freeze({
    launchArgs: Object.freeze(["--disable-gpu", `--log-net-log=${netLogPath}`, "--net-log-capture-mode=Default"]),
    launchEnv: Object.freeze({ ELECTRON_ENABLE_LOGGING: "1" }),
    endpointSha256: sha256Bytes(endpointOrigin),
    recordHealth(status) {
      observedNetwork.push({ phase: "authority-health", method: "GET", status, failed: false, origin_sha256: sha256Bytes(endpointOrigin), operator_header_count: 0 });
    },
    attach(app, startedAt) {
      child = app.process();
      const spawnfile = realpathSync(child.spawnfile);
      if (spawnfile !== realpathSync(executablePath)) fail("FORMAL_DEPLOYED_API_QA_PROCESS", "spawned executable is not the artifact executable");
      processEvents.push({ kind: "launch", phase: "startup", artifact_sha256: artifactSha256, manifest_sha256: manifestSha256, executable_sha256: executableSha256, spawnfile_sha256: sha256Bytes(spawnfile), pid_fingerprint_sha256: opaqueSha256(`${child.pid}:${startedAt}:${spawnfile}`) });
      telemetryBoundaries.push({ kind: "process_spawn_observed" });
      child.on("error", (error) => processErrorEvents.push({ event_sha256: opaqueSha256(error?.message ?? "process-error") }));
      for (const stream of [child.stdout, child.stderr].filter(Boolean)) {
        stream.on("data", (chunk) => {
          for (const line of String(chunk).split(/\r?\n/u).filter((item) => /(?:^|\W)(?:error|fatal)(?:\W|$)/iu.test(item))) {
            consoleEvents.push({ event_sha256: opaqueSha256(line) });
          }
        });
      }
      app.on("window", observePage);
      app.windows().forEach(observePage);
    },
    observePage,
    async close(app) {
      await app.close();
      const exitCode = child.exitCode ?? await new Promise((resolve) => child.once("exit", (code) => resolve(code)));
      processEvents.push({ kind: "exit", phase: "shutdown", exit_code: exitCode ?? 1 });
      telemetryBoundaries.push({ kind: "shutdown_observed" });
    },
    finish() {
      observedNetwork.push(...netLogRows(netLogPath));
      telemetryBoundaries.push({ kind: "telemetry_flushed_after_shutdown" });
      return Object.freeze({
        process_events: sequence(processEvents),
        telemetry_boundary_events: sequence(telemetryBoundaries),
        network_events: sequence(observedNetwork),
        console_events: sequence(consoleEvents),
        process_error_events: sequence(processErrorEvents),
      });
    },
  });
}
