#!/usr/bin/env node
const EXPECTED_API_HOST = "127.0.0.1";

let started = null;
let stopRequested = false;
let closePromise = null;

function closeServer() {
  if (!started) return Promise.resolve();
  if (!closePromise) {
    closePromise = new Promise((resolveClose, rejectClose) => {
      started.server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
  return closePromise;
}

function onSignal() {
  stopRequested = true;
  void closeServer().then(
    () => { process.exitCode = 0; },
    () => { process.exitCode = 1; },
  );
}

process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);

async function main() {
  const { startApiServer } = await import("../../api/src/server.js");
  if (stopRequested) return;

  started = await startApiServer();
  if (started.host !== EXPECTED_API_HOST) {
    await closeServer();
    throw new Error(`API refused loopback-only startup: ${started.host}`);
  }
  if (stopRequested) {
    await closeServer();
    return;
  }

  console.log(`law-firm-os api listening on http://${started.host}:${started.port}`);
  console.log(`health: http://${started.host}:${started.port}/api/health`);
}

try {
  await main();
} catch (error) {
  await closeServer().catch(() => {});
  if (!stopRequested) {
    console.error(`api startup failed: ${error?.message ?? String(error)}`);
    process.exitCode = error?.exitCode ?? 1;
  }
}
