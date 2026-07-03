import { execFileSync } from "node:child_process";
import test from "node:test";

test("UPL-E-10 Wave-1 hygiene proof stays green", () => {
  execFileSync(process.execPath, ["scripts/run-upl-e10-wave1-hygiene-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-e10-wave1-hygiene.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
