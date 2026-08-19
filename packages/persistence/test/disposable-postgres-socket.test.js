import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { createPostgresPool } from "../src/postgres/pool.js";
import { startDisposablePostgres } from "./helpers/disposable-postgres.js";

const execFileAsync = promisify(execFile);

test("disposable PostgreSQL uses a bounded /tmp socket outside an overlong TMPDIR", async (t) => {
  const priorTmpdir = process.env.TMPDIR;
  const longRoot = mkdtempSync("/tmp/lawos-long-tmp-");
  const longTmpdir = `${longRoot}/${"nested-".repeat(18)}`;
  mkdirSync(longTmpdir, { recursive: true });
  process.env.TMPDIR = longTmpdir;
  t.after(() => {
    if (priorTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = priorTmpdir;
    rmSync(longRoot, { recursive: true, force: true });
  });

  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-short-postgres-socket-test",
  });
  let poolClosed = false;
  t.after(async () => {
    if (!poolClosed) await pool.end();
  });
  assert.equal((await pool.query("SELECT 1 AS ok")).rows[0].ok, 1);
  const socketDir = readFileSync(join(instance.data_dir, "postmaster.opts"), "utf8")
    .match(/"-k" "([^"]+)"/u)?.[1];
  assert.match(socketDir, /^\/tmp\/lawos-pg-socket-/u);
  assert.ok(Buffer.byteLength(socketDir, "utf8") < 80);

  await pool.end();
  poolClosed = true;
  await instance.stop();
  assert.equal(existsSync(instance.root), false);
  assert.equal(existsSync(socketDir), false);
  await assert.rejects(execFileAsync("pg_ctl", ["-D", instance.data_dir, "status"]));
});
