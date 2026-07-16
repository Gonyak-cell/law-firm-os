import { execFileSync } from "node:child_process";
import test from "node:test";

test("UPL-A-06 all-domain durable roundtrip proof stays green", () => {
  execFileSync(process.execPath, ["scripts/run-upl-a06-all-domain-durable-roundtrip-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
