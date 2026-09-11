#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { lawosDurableStoreEnv } from "../../api/src/local-durable-store-paths.js";
import {
  SYNTHETIC_PROFILE_PNG_BASE64,
  createSyntheticPrivateRuntimeSources,
} from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

export const DEV_LAN_TEMP_PREFIX = "lawos-web-lan-";
const API_HOST = "127.0.0.1";
const WEB_HOST = "0.0.0.0";
const DEFAULT_WEB_PORT = 5173;
const DEFAULT_API_PORT = 4180;
const STARTUP_TIMEOUT_MS = 20_000;
const STOP_TIMEOUT_MS = 3_000;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repoRoot = resolve(webRoot, "../..");
const apiEntry = resolve(scriptDirectory, "dev-lan-api.mjs");
const require = createRequire(import.meta.url);
const vitePackagePath = require.resolve("vite/package.json");
const viteEntry = join(dirname(vitePackagePath), "bin/vite.js");

export function parsePort(value, { name, defaultValue }) {
  if (value === undefined) return defaultValue;
  if (!/^[1-9][0-9]{0,4}$/u.test(String(value))) {
    throw new TypeError(`${name} must be an integer from 1 to 65535`);
  }
  const port = Number(value);
  if (port > 65_535) {
    throw new TypeError(`${name} must be an integer from 1 to 65535`);
  }
  return port;
}

export function createSyntheticRuntimeWorkspace({ baseDirectory = tmpdir() } = {}) {
  const previousUmask = process.umask(0o077);
  let directory;
  try {
    directory = mkdtempSync(join(baseDirectory, DEV_LAN_TEMP_PREFIX));
    chmodSync(directory, 0o700);
    const { registration, roster } = createSyntheticPrivateRuntimeSources();
    const registrationPath = join(directory, "registration.json");
    const rosterPath = join(directory, "roster.json");
    const photoPath = join(directory, "photos");
    const storeRoot = join(directory, "stores");
    const homePath = join(directory, "home");
    const tmpPath = join(directory, "tmp");
    const xdgPath = join(directory, "xdg");
    const cloudPath = join(directory, "cloud");
    for (const path of [photoPath, storeRoot, homePath, tmpPath, xdgPath, cloudPath]) {
      mkdirSync(path, { mode: 0o700 });
      chmodSync(path, 0o700);
    }
    const awsCredentialsPath = join(cloudPath, "credentials");
    const awsConfigPath = join(cloudPath, "config");
    writeFileSync(awsCredentialsPath, "", { mode: 0o600 });
    writeFileSync(awsConfigPath, "", { mode: 0o600 });
    writeFileSync(registrationPath, JSON.stringify(registration), { mode: 0o600 });
    const rosterBytes = Buffer.from(JSON.stringify(roster));
    writeFileSync(rosterPath, rosterBytes, { mode: 0o600 });
    const png = Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64");
    for (const member of roster.members) {
      const ref = createHash("sha256").update(member.employee_id).digest("hex");
      writeFileSync(join(photoPath, `${ref}.png`), png, { mode: 0o600 });
    }
    const login = registration.users[0];
    if (!login?.email.endsWith("@runtime.example.test") || !login.local_dev?.synthetic_only) {
      throw new Error("synthetic runtime fixture did not provide a safe local login");
    }
    const credentialsPath = join(directory, "login-credentials.json");
    const credentials = Object.freeze({
      email: login.email,
      password: login.local_dev.synthetic_token,
    });
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
    return {
      path: directory,
      registrationPath,
      rosterPath,
      photoPath,
      homePath,
      tmpPath,
      xdgPath,
      cloudPath,
      credentialsPath,
      awsCredentialsPath,
      awsConfigPath,
      login: credentials,
      childEnv: Object.freeze({
        HOME: homePath,
        USERPROFILE: homePath,
        TMPDIR: tmpPath,
        TMP: tmpPath,
        TEMP: tmpPath,
        XDG_CONFIG_HOME: xdgPath,
        AWS_SHARED_CREDENTIALS_FILE: awsCredentialsPath,
        AWS_CONFIG_FILE: awsConfigPath,
        AWS_EC2_METADATA_DISABLED: "true",
      }),
      env: Object.freeze({
        ...lawosDurableStoreEnv({ root: storeRoot, includeSessionSecret: false }),
        LAWOS_EMAIL_DMS_STORE_PATH: join(storeRoot, "email-dms-store.json"),
        LAWOS_DMS_QUARANTINE_STORE_PATH: join(storeRoot, "dms-quarantine"),
        LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: registrationPath,
        LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: rosterPath,
        LAWOS_HRX_MEMBER_ROSTER_SOURCE_SHA256: createHash("sha256").update(rosterBytes).digest("hex"),
        LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: photoPath,
        LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: "",
      }),
      dispose() {
        rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (directory) rmSync(directory, { recursive: true, force: true });
    throw error;
  } finally {
    process.umask(previousUmask);
  }
}

function inheritedProcessEnv(env) {
  const inherited = {};
  for (const name of [
    "PATH", "LANG", "LC_ALL",
    "SystemRoot", "WINDIR", "PATHEXT", "COMSPEC", "NO_COLOR",
  ]) {
    if (typeof env[name] === "string") inherited[name] = env[name];
  }
  return inherited;
}

function spawnManaged(label, entry, args, { cwd, env }) {
  const previousUmask = process.umask(0o077);
  let child;
  try {
    child = spawn(process.execPath, [entry, ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    process.umask(previousUmask);
  }
  let output = "";
  const managed = {
    label,
    child,
    output: () => output,
    termination: null,
  };
  managed.termination = new Promise((resolveTermination) => {
    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      managed.terminationResult = result;
      resolveTermination(result);
    };
    child.once("exit", (code, signal) => settle({ code, signal, error: null }));
    child.once("error", (error) => settle({ code: null, signal: null, error }));
  });
  const collect = (chunk) => {
    output = `${output}${chunk}`.slice(-8_192);
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  return managed;
}

function exited(managed) {
  return managed.child.exitCode !== null || managed.child.signalCode !== null;
}

async function waitUntil(managed, predicate, label) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (managed.terminationResult || exited(managed)) {
      const detail = managed.terminationResult?.error?.message;
      throw new Error(`${managed.label} exited before ${label}${detail ? `: ${detail}` : ""}`);
    }
    if (await predicate()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`${managed.label} timed out before ${label}`);
}

function httpReady(url) {
  return new Promise((resolveReady) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolveReady(response.statusCode === 200);
    });
    request.setTimeout(500, () => request.destroy());
    request.once("error", () => resolveReady(false));
  });
}

function lanUrls(port) {
  return [...new Set(Object.values(networkInterfaces()).flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}/`))];
}

export async function terminateChild(child, { graceMs = STOP_TIMEOUT_MS } = {}) {
  if (!Number.isInteger(graceMs) || graceMs < 0) {
    throw new TypeError("graceMs must be a non-negative integer");
  }
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exitedPromise = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  let timer;
  const stopped = await Promise.race([
    exitedPromise.then(() => true),
    new Promise((resolveWait) => {
      timer = setTimeout(() => resolveWait(false), graceMs);
    }),
  ]);
  clearTimeout(timer);
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
  await exitedPromise;
}

export async function runDevLan({ env = process.env, stopGraceMs = STOP_TIMEOUT_MS } = {}) {
  const webPort = parsePort(env.LAWOS_WEB_PORT, {
    name: "LAWOS_WEB_PORT",
    defaultValue: DEFAULT_WEB_PORT,
  });
  const apiPort = parsePort(env.LAWOS_API_PORT, {
    name: "LAWOS_API_PORT",
    defaultValue: DEFAULT_API_PORT,
  });
  if (webPort === apiPort) throw new Error("LAWOS_WEB_PORT and LAWOS_API_PORT must be different");

  let runtime = null;
  const children = [];
  let stopRequested = false;
  let signalRequested = false;
  let cleanupPromise;
  const cleanup = (exitCode) => {
    if (cleanupPromise) return cleanupPromise;
    stopRequested = true;
    cleanupPromise = (async () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      try {
        for (const managed of [...children].reverse()) {
          await terminateChild(managed.child, { graceMs: stopGraceMs });
        }
      } finally {
        runtime?.dispose();
        process.exitCode = exitCode;
      }
    })();
    return cleanupPromise;
  };
  const onSignal = () => {
    signalRequested = true;
    stopRequested = true;
    void cleanup(0);
  };
  const observe = (managed) => {
    managed.termination.then(({ code, signal, error }) => {
      if (stopRequested || cleanupPromise) return;
      stopRequested = true;
      const reason = error?.message ?? signal ?? code ?? "unknown";
      console.error(`${managed.label} stopped unexpectedly (${reason})`);
      void cleanup(1);
    });
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    runtime = createSyntheticRuntimeWorkspace();
    const baseEnv = inheritedProcessEnv(env);
    if (stopRequested) return { cleanup, apiPort, webPort };
    const api = spawnManaged("API", apiEntry, [], {
      cwd: repoRoot,
      env: {
        ...baseEnv,
        ...runtime.childEnv,
        ...runtime.env,
        NODE_ENV: "development",
        LAWOS_API_PORT: String(apiPort),
        LAWOS_API_SESSION_SECRET: randomBytes(32).toString("hex"),
      },
    });
    children.push(api);
    observe(api);
    await waitUntil(
      api,
      () => api.output().includes(`law-firm-os api listening on http://${API_HOST}:${apiPort}`),
      "loopback readiness",
    );
    if (stopRequested) {
      await cleanup(signalRequested ? 0 : 1);
      return { cleanup, apiPort, webPort };
    }

    const vite = spawnManaged("Vite", viteEntry, ["--host", WEB_HOST, "--port", String(webPort)], {
      cwd: webRoot,
      env: {
        ...baseEnv,
        ...runtime.childEnv,
        NODE_ENV: "development",
        LAWOS_WEB_API_PROXY_TARGET: `http://${API_HOST}:${apiPort}`,
      },
    });
    children.push(vite);
    observe(vite);
    await waitUntil(vite, () => httpReady(`http://${API_HOST}:${webPort}/`), "LAN readiness");
    if (stopRequested) {
      await cleanup(signalRequested ? 0 : 1);
      return { cleanup, apiPort, webPort };
    }

    console.log("Law Firm OS web is ready with synthetic local data only.");
    console.log(`Loopback: http://${API_HOST}:${webPort}/`);
    const urls = lanUrls(webPort);
    if (urls.length === 0) console.log("LAN: no active IPv4 interface detected");
    else for (const url of urls) console.log(`LAN: ${url}`);
    console.log("API routes: same-origin /api and /master-data (API listener is loopback-only)");
    console.log(`Synthetic login: ${runtime.login.email}`);
    console.log(`Credentials file: ${runtime.credentialsPath}`);
    return { cleanup, apiPort, webPort };
  } catch (error) {
    await cleanup(signalRequested ? 0 : 1);
    if (signalRequested) return { cleanup, apiPort, webPort };
    throw error;
  }
}

async function main() {
  try {
    await runDevLan();
  } catch (error) {
    console.error(`Web LAN startup failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main();
}
