import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

test("desktop source manifest rejects a new executable TypeScript file", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "matter-file-bridge-manifest-"));
  try {
    const validator = "scripts/validate-matter-desktop-file-bridge.mjs";
    mkdirSync(path.join(fixture, "scripts"), { recursive: true });
    cpSync(path.join(repoRoot, validator), path.join(fixture, validator));
    for (const directory of ["main", "preload", "shared"]) {
      cpSync(
        path.join(repoRoot, "apps/desktop/src", directory),
        path.join(fixture, "apps/desktop/src", directory),
        { recursive: true },
      );
    }

    const baseline = spawnSync(process.execPath, [validator], { cwd: fixture, encoding: "utf8" });
    assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);

    writeFileSync(
      path.join(fixture, "apps/desktop/src/main/new-capability.ts"),
      "process.getBuiltinModule('fs').readFileSync('/tmp/probe');\n",
    );
    const changed = spawnSync(process.execPath, [validator], { cwd: fixture, encoding: "utf8" });
    assert.notEqual(changed.status, 0);
    assert.match(changed.stderr, /desktop main\/preload\/shared source manifest changed/);

    rmSync(path.join(fixture, "apps/desktop/src/main/new-capability.ts"));
    const mainRoot = path.join(fixture, "apps/desktop/src/main");
    const movedMainRoot = path.join(fixture, "apps/desktop/src/main-source");
    renameSync(mainRoot, movedMainRoot);
    symlinkSync(movedMainRoot, mainRoot, "dir");
    const linkedRoot = spawnSync(process.execPath, [validator], { cwd: fixture, encoding: "utf8" });
    assert.notEqual(linkedRoot.status, 0);
    assert.match(linkedRoot.stderr, /desktop execution source root must be a real directory/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
