import { execFileSync } from "node:child_process";
import test from "node:test";

test("UPL-B-13 local withholding proof stays green while vendor sandbox remains explicit", () => {
  execFileSync(process.execPath, ["scripts/run-upl-b13-withholding-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-b13-withholding.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

test("UPL-B-13 Popbill sandbox proof stays hash-only until operator issue approval", () => {
  execFileSync(process.execPath, ["scripts/run-upl-b13-tax-invoice-sandbox-proof.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-b13-tax-invoice-sandbox.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
