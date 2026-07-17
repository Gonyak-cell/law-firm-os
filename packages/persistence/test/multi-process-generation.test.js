import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { readDurableJsonFile } from "../src/durable-file.js";

const execFileAsync = promisify(execFile);

test("Matter and HRX processes produce one write, one conflict and no lost generation", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-generation-race-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "shared-store.json");
  const fixture = fileURLToPath(new URL("./fixtures/write-generation.mjs", import.meta.url));

  const runs = ["matter", "hrx"].map((writer) => execFileAsync(
    process.execPath,
    [fixture, filePath, writer],
    { timeout: 10_000, env: { ...process.env, LAWOS_RUNTIME_BACKUP_BUCKET: "", LAWOS_S3_BACKUP_BUCKET: "" } },
  ));
  const results = (await Promise.all(runs)).map(({ stdout }) => JSON.parse(stdout.trim()));

  assert.equal(results.filter((row) => row.status === "written").length, 1);
  assert.equal(results.filter((row) => row.status === "conflict").length, 1);
  const final = readDurableJsonFile({ filePath });
  assert.equal(final.generation, 1);
  assert.equal(final.metadata.previous_generation, 0);
  assert.equal(["matter", "hrx"].includes(final.value.writer), true);
  assert.equal(final.value.records.length, 1);
});
