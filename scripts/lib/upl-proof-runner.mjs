import { spawn } from "node:child_process";

export function runNodeProof(scriptPath, { timeoutMs = 300000 } = {}) {
  return new Promise((resolveRun) => {
    const child = spawn("node", [scriptPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 2000).unref();
    }, timeoutMs);
    timeout.unref();
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      resolveRun({ status, signal, stdout, stderr });
    });
  });
}

export async function assertNodeProofPass(scriptPath, options) {
  const result = await runNodeProof(scriptPath, options);
  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed with status ${result.status ?? "signal"}${result.signal ? ` (${result.signal})` : ""}\n${result.stderr || result.stdout}`);
  }
  return result;
}
