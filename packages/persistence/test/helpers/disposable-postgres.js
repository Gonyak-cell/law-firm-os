import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createPostgresPool } from "../../src/postgres/pool.js";
import { runPostgresMigrations } from "../../src/postgres/migration-runner.js";

const execFileAsync = promisify(execFile);

async function executableAvailable(command) {
  try {
    await execFileAsync(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

export async function disposablePostgresAvailable() {
  return (await executableAvailable("initdb")) && (await executableAvailable("pg_ctl"));
}

export async function startDisposablePostgres(t) {
  if (!(await disposablePostgresAvailable())) {
    t.skip("local PostgreSQL binaries are unavailable");
    return null;
  }
  const root = mkdtempSync(join(tmpdir(), "lawos-postgres-v2-"));
  const dataDir = join(root, "data");
  const socketDir = join(root, "socket");
  const username = userInfo().username;
  const port = await reservePort();
  mkdirSync(socketDir, { recursive: true, mode: 0o700 });
  let stopped = false;
  const stop = async () => {
    if (!stopped) {
      stopped = true;
      await execFileAsync("pg_ctl", ["-D", dataDir, "-m", "immediate", "-w", "stop"]).catch(() => {});
    }
    rmSync(root, { recursive: true, force: true });
  };
  try {
    await execFileAsync("initdb", [
      "-D", dataDir,
      "-A", "trust",
      "--no-locale",
      "--encoding=UTF8",
      `--username=${username}`,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await execFileAsync("pg_ctl", [
      "-D", dataDir,
      "-l", join(root, "postgres.log"),
      "-o", `-p ${port} -h 127.0.0.1 -k ${socketDir} -F -c fsync=off -c synchronous_commit=off -c full_page_writes=off`,
      "-w",
      "start",
    ], { maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    await stop();
    throw error;
  }
  return Object.freeze({
    root,
    data_dir: dataDir,
    port,
    username,
    connection_string: `postgresql://${encodeURIComponent(username)}@127.0.0.1:${port}/postgres`,
    stop,
  });
}

export async function createMigratedPostgresFixture(t) {
  const instance = await startDisposablePostgres(t);
  if (!instance) return null;
  const adminPool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-postgres-v2-admin-test",
  });
  let appPool;
  try {
    await runPostgresMigrations(adminPool, { appliedBy: "disposable-contract-test" });
    await adminPool.query("CREATE ROLE lawos_app LOGIN");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_runtime TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_runtime.records TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_runtime.idempotency_keys TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_runtime.audit_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_runtime.outbox_events TO lawos_app");
    const appUrl = new URL(instance.connection_string);
    appUrl.username = "lawos_app";
    appPool = createPostgresPool({
      connectionString: appUrl.toString(),
      sslMode: "disable",
      allowInsecureLocal: true,
      applicationName: "lawos-postgres-v2-app-test",
    });
  } catch (error) {
    await appPool?.end().catch(() => {});
    await adminPool.end().catch(() => {});
    await instance.stop();
    throw error;
  }
  t.after(async () => {
    await appPool.end();
    await adminPool.end();
    await instance.stop();
  });
  return Object.freeze({ instance, adminPool, appPool });
}
