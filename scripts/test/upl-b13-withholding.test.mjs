import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const artifactDir = mkdtempSync(join(tmpdir(), "lawos-upl-b13-"));
  const env = {
    ...process.env,
    LAWOS_UPL_B13_ARTIFACT_JSON: join(artifactDir, "proof.json"),
    LAWOS_UPL_B13_ARTIFACT_MD: join(artifactDir, "proof.md"),
    POPBILL_LINK_ID: "synthetic-test-link-id",
    POPBILL_SECRET_KEY: "synthetic-test-secret-key",
    POPBILL_CORP_NUM: "0000000000",
    POPBILL_USER_ID: "synthetic-test-user",
    POPBILL_TEST_MODE: "1",
    POPBILL_ALLOW_SANDBOX_ISSUE: "0",
  };
  execFileSync(process.execPath, ["scripts/run-upl-b13-tax-invoice-sandbox-proof.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-b13-tax-invoice-sandbox.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "pipe",
  });
});
