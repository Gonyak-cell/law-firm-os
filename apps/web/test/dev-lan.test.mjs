import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer as createViteServer } from "vite";

import viteConfig from "../vite.config.js";
import {
  DEV_LAN_TEMP_PREFIX,
  createSyntheticRuntimeWorkspace,
  parsePort,
  terminateChild,
} from "../scripts/dev-lan.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const repoRoot = resolve(webRoot, "../..");
const launcherPath = resolve(webRoot, "scripts/dev-lan.mjs");
const apiLauncherPath = resolve(webRoot, "scripts/dev-lan-api.mjs");

function runtimeDirectories() {
  return new Set(readdirSync(tmpdir())
    .filter((name) => name.startsWith(DEV_LAN_TEMP_PREFIX))
    .map((name) => join(tmpdir(), name)));
}

function mode(path) {
  return statSync(path).mode & 0o777;
}

function availablePort(host) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

function bindPort(port, host) {
  return new Promise((resolveBind, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, host, () => {
      server.close((error) => error ? reject(error) : resolveBind());
    });
  });
}

async function availablePortOrSkip(t, host) {
  try {
    return await availablePort(host);
  } catch (error) {
    if (error?.code !== "EPERM") throw error;
    t.skip("sandbox forbids local listen sockets");
    return null;
  }
}

function waitForExit(child, timeoutMs = 20_000) {
  return new Promise((resolveExit, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveExit({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    const timer = setTimeout(() => reject(new Error("launcher did not exit in time")), timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolveExit({ code, signal });
    });
  });
}

function launch({ webPort, apiPort }) {
  const child = spawn(process.execPath, [launcherPath], {
    cwd: webRoot,
    env: {
      PATH: process.env.PATH,
      LANG: process.env.LANG ?? "C",
      TMPDIR: tmpdir(),
      NO_COLOR: "1",
      LAWOS_WEB_PORT: String(webPort),
      LAWOS_API_PORT: String(apiPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  return { child, output: () => output };
}

function waitForOutput(running, pattern, timeoutMs = 20_000) {
  return new Promise((resolveOutput, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const output = running.output();
      if (pattern.test(output)) {
        resolveOutput(output);
        return;
      }
      if (running.child.exitCode !== null || running.child.signalCode !== null) {
        reject(new Error(`launcher exited before readiness:\n${output}`));
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error(`launcher readiness timed out:\n${output}`));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

function waitForRuntimeDirectory(before, timeoutMs = 5_000) {
  return new Promise((resolveDirectory, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const created = [...runtimeDirectories()].filter((path) => !before.has(path));
      if (created.length === 1) {
        resolveDirectory(created[0]);
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error(`expected one runtime directory, found ${created.length}`));
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
}

function externalIpv4() {
  return Object.values(networkInterfaces()).flat()
    .find((address) => address?.family === "IPv4" && !address.internal)?.address ?? null;
}

function requestViteMiddleware(vite, url) {
  return new Promise((resolveResponse, rejectResponse) => {
    const request = new EventEmitter();
    request.method = "GET";
    request.url = url;
    request.originalUrl = url;
    request.headers = { accept: "*/*", host: "127.0.0.1" };

    const headers = new Map();
    const chunks = [];
    const response = new EventEmitter();
    response.statusCode = 200;
    response.headersSent = false;
    response.setHeader = (name, value) => headers.set(name.toLowerCase(), value);
    response.getHeader = (name) => headers.get(name.toLowerCase());
    response.getHeaders = () => Object.fromEntries(headers);
    response.hasHeader = (name) => headers.has(name.toLowerCase());
    response.removeHeader = (name) => headers.delete(name.toLowerCase());
    response.writeHead = (statusCode, nextHeaders) => {
      response.statusCode = statusCode;
      response.headersSent = true;
      for (const [name, value] of Object.entries(nextHeaders ?? {})) response.setHeader(name, value);
    };
    response.write = (chunk) => {
      response.headersSent = true;
      chunks.push(Buffer.from(chunk));
      return true;
    };
    response.end = (chunk) => {
      response.headersSent = true;
      if (chunk) chunks.push(Buffer.from(chunk));
      resolveResponse({
        status: response.statusCode,
        headers: Object.fromEntries(headers),
        body: Buffer.concat(chunks).toString("utf8"),
      });
    };

    vite.middlewares(request, response, (error) => {
      if (error) rejectResponse(error);
      else resolveResponse({ status: 404, headers: Object.fromEntries(headers), body: "" });
    });
  });
}

test("dev LAN ports use bounded integer defaults and reject unsafe overrides", () => {
  assert.equal(parsePort(undefined, { name: "LAWOS_WEB_PORT", defaultValue: 5173 }), 5173);
  assert.equal(parsePort("4180", { name: "LAWOS_API_PORT", defaultValue: 4180 }), 4180);
  for (const value of ["", "0", "65536", "12.5", "not-a-port", " 5173"] ) {
    assert.throws(
      () => parsePort(value, { name: "LAWOS_WEB_PORT", defaultValue: 5173 }),
      /LAWOS_WEB_PORT must be an integer from 1 to 65535/,
    );
  }
});

test("synthetic runtime workspace is private, fixture-backed, and removable", () => {
  const workspace = createSyntheticRuntimeWorkspace();
  try {
    assert.equal(mode(workspace.path), 0o700);
    for (const directory of [
      workspace.homePath,
      workspace.tmpPath,
      workspace.xdgPath,
      workspace.cloudPath,
      workspace.photoPath,
    ]) assert.equal(mode(directory), 0o700);
    assert.equal(mode(workspace.registrationPath), 0o600);
    assert.equal(mode(workspace.rosterPath), 0o600);
    assert.equal(mode(workspace.credentialsPath), 0o600);
    assert.equal(mode(workspace.awsCredentialsPath), 0o600);
    assert.equal(mode(workspace.awsConfigPath), 0o600);
    assert.equal(workspace.login.email.endsWith("@runtime.example.test"), true);
    assert.equal(workspace.login.password, `local-dev-only:${workspace.login.email}`);
    assert.deepEqual(JSON.parse(readFileSync(workspace.credentialsPath, "utf8")), workspace.login);
    assert.equal(workspace.env.LAWOS_RUNTIME_PROFILE, "local-dev");
    assert.equal(Object.values(workspace.env)
      .filter((value) => typeof value === "string" && value.includes("store"))
      .every((value) => value.startsWith(workspace.path)), true);
    assert.deepEqual(workspace.childEnv, {
      HOME: workspace.homePath,
      USERPROFILE: workspace.homePath,
      TMPDIR: workspace.tmpPath,
      TMP: workspace.tmpPath,
      TEMP: workspace.tmpPath,
      XDG_CONFIG_HOME: workspace.xdgPath,
      AWS_SHARED_CREDENTIALS_FILE: workspace.awsCredentialsPath,
      AWS_CONFIG_FILE: workspace.awsConfigPath,
      AWS_EC2_METADATA_DISABLED: "true",
    });
  } finally {
    workspace.dispose();
  }
  assert.throws(() => statSync(workspace.path), /ENOENT/u);
});

test("Vite allows only browser-required files and denies repository content through /@fs/", async () => {
  const hmrServer = createHttpServer();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: webRoot,
    server: {
      ...viteConfig.server,
      middlewareMode: true,
      hmr: { server: hmrServer },
    },
  });
  try {
    const appRoot = await requestViteMiddleware(vite, "/");
    assert.equal(appRoot.status, 200);
    assert.match(appRoot.body, /<div id="root"><\/div>/u);

    const practiceAreaPath = resolve(repoRoot, "packages/matter/src/practice-area.js");
    const practiceArea = await requestViteMiddleware(vite, `/@fs/${practiceAreaPath}`);
    assert.equal(practiceArea.status, 200);
    assert.match(practiceArea.body, /classifyMatterPracticeArea/u);

    for (const repositoryFile of ["AGENTS.md", "docs/ui-workstream-conventions.md"]) {
      const response = await requestViteMiddleware(vite, `/@fs/${repoRoot}/${repositoryFile}`);
      assert.equal(response.status, 403, `${repositoryFile} must not be exposed by Vite /@fs/`);
    }
    const packageSibling = await requestViteMiddleware(
      vite,
      `/@fs/${repoRoot}/packages/matter/src/index.js`,
    );
    assert.equal(packageSibling.status, 403, "the rest of packages/matter/src must stay denied");

    for (const workspacePackage of ["api", "authz"]) {
      const response = await requestViteMiddleware(
        vite,
        `/@fs/${repoRoot}/node_modules/@law-firm-os/${workspacePackage}/package.json`,
      );
      assert.equal(
        response.status,
        403,
        `the ${workspacePackage} workspace symlink must not be exposed by Vite /@fs/`,
      );
    }
  } finally {
    await vite.close();
  }
});

test("Vite proxy matching excludes routes that only share an API prefix", async () => {
  const proxy = Object.fromEntries(Object.entries(viteConfig.server.proxy)
    .map(([route, target]) => [route, { target, bypass: () => "/package.json" }]));
  const hmrServer = createHttpServer();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: webRoot,
    server: {
      ...viteConfig.server,
      middlewareMode: true,
      hmr: { server: hmrServer },
      proxy,
    },
  });
  try {
    for (const apiRoute of ["/api/health", "/master-data/records"]) {
      const response = await requestViteMiddleware(vite, apiRoute);
      assert.equal(response.status, 200);
      assert.match(response.headers["content-type"] ?? "", /application\/json/u);
      assert.equal(JSON.parse(response.body).name, "@law-firm-os/web");
    }
    for (const appRoute of ["/api-extra", "/master-data-extra"]) {
      const response = await requestViteMiddleware(vite, appRoute);
      assert.equal(response.status, 200);
      assert.match(response.headers["content-type"] ?? "", /text\/html/u);
      assert.match(response.body, /<div id="root"><\/div>/u);
    }
  } finally {
    await vite.close();
  }
});

test("dev:lan serves Vite on LAN, proxies only the loopback API paths, and cleans up on SIGTERM", async (t) => {
  const before = runtimeDirectories();
  const apiPort = await availablePortOrSkip(t, "127.0.0.1");
  if (apiPort === null) return;
  let webPort = await availablePortOrSkip(t, "0.0.0.0");
  if (webPort === null) return;
  while (webPort === apiPort) webPort = await availablePort("0.0.0.0");
  const running = launch({ webPort, apiPort });
  t.after(() => {
    if (running.child.exitCode === null && running.child.signalCode === null) running.child.kill("SIGKILL");
  });

  const output = await waitForOutput(running, /Synthetic login:/u);
  assert.match(output, new RegExp(`Loopback: http://127\\.0\\.0\\.1:${webPort}/`));
  assert.match(output, /Synthetic login: member01@runtime\.example\.test/u);
  assert.match(output, /Credentials file: .*\/login-credentials\.json/u);
  assert.doesNotMatch(output, /LAWOS_API_SESSION_SECRET|AWS_SECRET_ACCESS_KEY|token|local-dev-only:|password/iu);
  const printedEmails = output.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? [];
  assert.equal(printedEmails.every((email) => email.endsWith("@runtime.example.test")), true);

  const appRoot = await fetch(`http://127.0.0.1:${webPort}/`);
  assert.equal(appRoot.status, 200);
  assert.match(await appRoot.text(), /<div id="root"><\/div>/u);

  const created = [...runtimeDirectories()].filter((path) => !before.has(path));
  assert.equal(created.length, 1);
  assert.equal(mode(created[0]), 0o700);
  const credentials = JSON.parse(readFileSync(join(created[0], "login-credentials.json"), "utf8"));
  assert.equal(output.includes(credentials.password), false);

  const loopbackHealth = await fetch(`http://127.0.0.1:${webPort}/api/health`);
  assert.equal(loopbackHealth.status, 200);
  assert.equal((await loopbackHealth.json()).synthetic_login_enabled, true);
  const masterData = await fetch(`http://127.0.0.1:${webPort}/master-data/not-a-route`);
  assert.match(masterData.headers.get("content-type") ?? "", /application\/json/u);
  for (const appRoute of ["/api-extra", "/master-data-extra"]) {
    const response = await fetch(`http://127.0.0.1:${webPort}${appRoute}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/u);
  }

  const lanAddress = externalIpv4();
  if (lanAddress) {
    const lanHealth = await fetch(`http://${lanAddress}:${webPort}/api/health`);
    assert.equal(lanHealth.status, 200);
    await assert.rejects(
      fetch(`http://${lanAddress}:${apiPort}/api/health`, { signal: AbortSignal.timeout(1_500) }),
    );
  }

  running.child.kill("SIGTERM");
  const stopped = await waitForExit(running.child);
  assert.equal(stopped.code, 0);
  assert.deepEqual([...runtimeDirectories()].filter((path) => !before.has(path)), []);
  await Promise.all([
    bindPort(apiPort, "127.0.0.1"),
    bindPort(webPort, "0.0.0.0"),
  ]);
});

test("SIGTERM during API startup prevents Vite startup and releases the selected ports", async (t) => {
  const before = runtimeDirectories();
  const apiPort = await availablePortOrSkip(t, "127.0.0.1");
  if (apiPort === null) return;
  let webPort = await availablePortOrSkip(t, "0.0.0.0");
  if (webPort === null) return;
  while (webPort === apiPort) webPort = await availablePort("0.0.0.0");
  const running = launch({ webPort, apiPort });
  t.after(() => {
    if (running.child.exitCode === null && running.child.signalCode === null) running.child.kill("SIGKILL");
  });

  await waitForRuntimeDirectory(before);
  running.child.kill("SIGTERM");
  const stopped = await waitForExit(running.child);

  assert.equal(stopped.code, 0);
  assert.doesNotMatch(running.output(), /Loopback:|VITE .* ready|Synthetic login:/u);
  assert.deepEqual([...runtimeDirectories()].filter((path) => !before.has(path)), []);
  await Promise.all([
    bindPort(apiPort, "127.0.0.1"),
    bindPort(webPort, "0.0.0.0"),
  ]);
});

test("terminateChild escalates SIGTERM-resistant children to SIGKILL and waits for exit", async () => {
  let output = "";
  const child = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000);",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const running = { child, output: () => output };
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  await waitForOutput(running, /ready/u);

  await terminateChild(child, { graceMs: 20 });

  assert.equal(child.signalCode, "SIGKILL");
  assert.equal(child.exitCode !== null || child.signalCode !== null, true);
});

test("startup failure terminates children and removes the synthetic workspace", async () => {
  const before = runtimeDirectories();
  const occupied = createServer();
  let socketDenied = false;
  try {
    await new Promise((resolveListen, reject) => {
      occupied.once("error", reject);
      occupied.listen(0, "127.0.0.1", resolveListen);
    });
  } catch (error) {
    if (error?.code !== "EPERM") throw error;
    socketDenied = true;
  }
  const apiPort = socketDenied ? 41_980 : occupied.address().port;
  let webPort = socketDenied ? 51_730 : await availablePort("0.0.0.0");
  while (webPort === apiPort) webPort = await availablePort("0.0.0.0");
  try {
    const running = launch({ webPort, apiPort });
    const stopped = await waitForExit(running.child);
    assert.notEqual(stopped.code, 0);
    assert.match(running.output(), /Web LAN startup failed:/u);
    assert.deepEqual([...runtimeDirectories()].filter((path) => !before.has(path)), []);
  } finally {
    if (!socketDenied) await new Promise((resolveClose) => occupied.close(resolveClose));
  }
});

test("web package exposes the canonical one-command LAN launcher", () => {
  const packageJson = JSON.parse(readFileSync(resolve(webRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["dev:lan"], "node scripts/dev-lan.mjs");
});

test("LAN launcher keeps the API loopback-only and proxies only exact API path boundaries", () => {
  const launcherSource = readFileSync(launcherPath, "utf8");
  const apiLauncherSource = readFileSync(apiLauncherPath, "utf8");
  assert.match(launcherSource, /const API_HOST = "127\.0\.0\.1"/u);
  assert.match(launcherSource, /const WEB_HOST = "0\.0\.0\.0"/u);
  assert.match(launcherSource, /const apiEntry = resolve\(scriptDirectory, "dev-lan-api\.mjs"\)/u);
  assert.match(apiLauncherSource, /started\.host !== EXPECTED_API_HOST/u);
  assert.match(apiLauncherSource, /process\.once\("SIGTERM", onSignal\)/u);
  assert.match(apiLauncherSource, /started\.server\.close/u);
  assert.match(launcherSource, /\["--host", WEB_HOST, "--port", String\(webPort\)\]/u);
  assert.equal(viteConfig.server.fs.strict, true);
  assert.deepEqual(viteConfig.server.fs.allow.map((path) => resolve(path)), [
    webRoot,
    resolve(repoRoot, "packages/matter/src/practice-area.js"),
  ]);
  const apiBoundary = "^/api(?:/|$)";
  const masterDataBoundary = "^/master-data(?:/|$)";
  assert.deepEqual(Object.keys(viteConfig.server.proxy).sort(), [apiBoundary, masterDataBoundary]);
  assert.equal(viteConfig.server.proxy[apiBoundary], "http://127.0.0.1:4180");
  assert.equal(viteConfig.server.proxy[masterDataBoundary], "http://127.0.0.1:4180");
  assert.equal(new RegExp(apiBoundary).test("/api/health"), true);
  assert.equal(new RegExp(apiBoundary).test("/api-extra"), false);
  assert.equal(new RegExp(masterDataBoundary).test("/master-data/records"), true);
  assert.equal(new RegExp(masterDataBoundary).test("/master-data-extra"), false);
});
