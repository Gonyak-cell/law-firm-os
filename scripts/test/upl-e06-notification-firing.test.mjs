import { execFileSync } from "node:child_process";
import test from "node:test";

test("UPL-E-06 notification firing proof stays green", () => {
  execFileSync(process.execPath, ["scripts/run-upl-e06-notification-firing-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-e06-notification-firing.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
