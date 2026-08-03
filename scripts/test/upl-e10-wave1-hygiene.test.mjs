import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { summarizeSloplintFindings } from "../lib/upl-e10-sloplint-escapes.mjs";

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

  const artifact = JSON.parse(readFileSync(env.LAWOS_UPL_E10_ARTIFACT_JSON, "utf8"));
  assert.equal(artifact.status, "PASS");
  assert.equal(artifact.sloplint.strong_count, 0);
  assert.equal(artifact.sloplint.no_verify_count, 0);
  assert.equal(artifact.sloplint.documented_escapes.length, 7);
  assert.deepEqual(
    Object.fromEntries(
      [
        "apps/web/src/components/MattersSurface.jsx",
        "apps/web/src/components/matter-small-firm/MatterOperationsSurface.jsx",
        "apps/web/src/data/apiClient.js",
      ].map((file) => [
        file,
        artifact.sloplint.documented_escapes.filter((item) => item.file === file).length,
      ]),
    ),
    {
      "apps/web/src/components/MattersSurface.jsx": 2,
      "apps/web/src/components/matter-small-firm/MatterOperationsSurface.jsx": 2,
      "apps/web/src/data/apiClient.js": 3,
    },
  );
  assert.equal(artifact.sloplint.finding_count, 0);
});

test("UPL-E-10 keeps unknown strong and every no-verify finding gating", () => {
  const knownFinding = {
    file: "apps/web/src/data/apiClient.js",
    line: 1,
    rule_id: "ai-buzzword-stack",
    severity: "strong",
    excerpt: "unlock",
  };
  const source = {
    sourceLine: 'if (!actorId || !weekStart || (action === "unlock" && !String(reason ?? "").trim())) {',
    sourceContext: [
      "function matterOpsWeekMutation(action, {",
      'matterOpsMutationPath(`/api/matter/ops/time-weeks/${action}`)',
    ].join("\n"),
  };
  const unknownStrong = { ...knownFinding, line: 2 };
  const noVerify = { ...knownFinding, line: 3, severity: "no-verify" };
  const summary = summarizeSloplintFindings(
    [knownFinding, unknownStrong, noVerify],
    {
      allowedFiles: [knownFinding.file],
      readSource(finding) {
        if (finding === knownFinding) return source;
        if (finding === unknownStrong) {
          return {
            sourceLine: 'if (action === "unlock") showCapabilityClaim();',
            sourceContext: "function unrelatedUnlockFeature(action) {}",
          };
        }
        return source;
      },
    },
  );

  assert.equal(summary.documented_escapes.length, 1);
  assert.equal(summary.strong_count, 1);
  assert.equal(summary.no_verify_count, 1);
  assert.deepEqual(summary.findings, [unknownStrong, noVerify]);
  assert.equal(summary.strong_count === 0, false);
  assert.equal(summary.no_verify_count === 0, false);
});
