import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = "scripts/run-central-ledger-staging-rehearsal.mjs";

test("the alternate staging rehearsal is retired before approval, secret, or database work", () => {
  const source = readFileSync(script, "utf8");
  assert.doesNotMatch(source, /resolvePostgresConnectionString|resolvePostgresTenantContextSecret|createPostgresPool|runPostgresMigrations/u);

  const result = spawnSync(process.execPath, [script, "--approval-ref", "unsigned"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      LAWOS_POSTGRES_URL: "must-not-be-read",
      LAWOS_POSTGRES_SECRET_ARN: "must-not-be-read",
    },
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /retired unsafe staging mutation path/u);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /must-not-be-read/u);
});
