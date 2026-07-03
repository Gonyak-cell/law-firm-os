import { execFileSync } from "node:child_process";
import test from "node:test";

async function hasLocalGemma() {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(1200) });
    const body = await response.json();
    return response.ok && (body.models ?? []).some((model) => model.name === "gemma4:12b" || model.model === "gemma4:12b");
  } catch {
    return false;
  }
}

test("UPL-A-12 local model gateway proof stays green when Gemma is installed", async (t) => {
  if (!await hasLocalGemma()) {
    t.skip("gemma4:12b is not installed in local Ollama");
    return;
  }
  execFileSync(process.execPath, ["scripts/run-upl-a12-local-model-gateway-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-a12-local-model-gateway.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
