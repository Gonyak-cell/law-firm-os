import { execFileSync } from "node:child_process";
import test from "node:test";

test("UPL-A-08 packaged desktop restart proof stays green", () => {
  execFileSync(process.execPath, ["scripts/run-upl-a08-packaged-desktop-restart-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-a08-packaged-desktop-restart.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
