import { execFileSync } from "node:child_process";
import test from "node:test";

test("Wave-1 remediation strict verification remains partial and externally gated", () => {
  execFileSync(process.execPath, ["scripts/run-wave1-remediation-strict-verification-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-wave1-remediation-strict-verification.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
