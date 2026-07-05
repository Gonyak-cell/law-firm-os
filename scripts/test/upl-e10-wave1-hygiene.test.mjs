import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("UPL-E-10 Wave-1 hygiene proof stays green", () => {
  const artifactDir = mkdtempSync(join(tmpdir(), "lawos-upl-e10-proof-"));
  const env = {
    ...process.env,
    LAWOS_UPL_E10_ARTIFACT_JSON: join(artifactDir, "upl-e10-wave1-hygiene-proof.json"),
    LAWOS_UPL_E10_ARTIFACT_MD: join(artifactDir, "upl-e10-wave1-hygiene-proof.md"),
  };
  execFileSync(process.execPath, ["scripts/run-upl-e10-wave1-hygiene-proof.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-upl-e10-wave1-hygiene.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "pipe",
  });
});
