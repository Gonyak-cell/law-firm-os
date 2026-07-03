import { execFileSync } from "node:child_process";
import test from "node:test";

test("Wave-1 external receipt readiness ledger is current and non-promoting", () => {
  execFileSync(process.execPath, ["scripts/run-wave1-external-receipt-readiness.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-wave1-external-receipt-readiness.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
