import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
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

export async function startDisposablePostgres(t, {
  outlookAuthorityAdmin = false,
} = {}) {
  if (!(await disposablePostgresAvailable())) {
    t.skip("local PostgreSQL binaries are unavailable");
    return null;
  }
  const root = mkdtempSync(join(tmpdir(), "lawos-postgres-v2-"));
  const dataDir = join(root, "data");
  const rootSocketDir = join(root, "socket");
  const separateSocketDir = outlookAuthorityAdmin
    || Buffer.byteLength(rootSocketDir, "utf8") >= 80;
  const socketDir = separateSocketDir
    ? mkdtempSync("/tmp/lawos-pg-socket-")
    : rootSocketDir;
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
    if (separateSocketDir) {
      rmSync(socketDir, { recursive: true, force: true });
    }
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

export async function createMigratedPostgresFixture(t, {
  appPoolMax = 10,
  foundationMigrations,
  outlookAuthorityAdmin = false,
} = {}) {
  const baseInstance = await startDisposablePostgres(t, {
    outlookAuthorityAdmin,
  });
  if (!baseInstance) return null;
  let instance = baseInstance;
  let bootstrapPool;
  let adminPool;
  if (outlookAuthorityAdmin) {
    bootstrapPool = createPostgresPool({
      connectionString: baseInstance.connection_string,
      sslMode: "disable",
      allowInsecureLocal: true,
      applicationName: "lawos-postgres-v2-bootstrap-test",
    });
    try {
      await bootstrapPool.query(`CREATE ROLE lawos_admin LOGIN NOSUPERUSER
        CREATEDB CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
      await bootstrapPool.query("CREATE DATABASE lawos OWNER lawos_admin");
      await bootstrapPool.end();
      const bootstrapUrl = new URL(baseInstance.connection_string);
      bootstrapUrl.pathname = "/lawos";
      bootstrapPool = createPostgresPool({
        connectionString: bootstrapUrl.toString(),
        sslMode: "disable",
        allowInsecureLocal: true,
        applicationName: "lawos-postgres-v2-bootstrap-test",
      });
    } catch (error) {
      await bootstrapPool.end().catch(() => {});
      await baseInstance.stop();
      throw error;
    }
    const adminUrl = new URL(baseInstance.connection_string);
    adminUrl.username = "lawos_admin";
    adminUrl.pathname = "/lawos";
    instance = Object.freeze({
      ...baseInstance,
      username: "lawos_admin",
      connection_string: adminUrl.toString(),
    });
  }
  adminPool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-postgres-v2-admin-test",
  });
  let appPool;
  const tenantContextSecret = randomBytes(32).toString("base64url");
  try {
    await runPostgresMigrations(adminPool, {
      appliedBy: "disposable-contract-test", migrations: foundationMigrations,
    });
    await adminPool.query(outlookAuthorityAdmin
      ? `CREATE ROLE lawos_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
           NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 64`
      : "CREATE ROLE lawos_app LOGIN");
    if (outlookAuthorityAdmin) {
      await adminPool.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
      await adminPool.query("ALTER ROLE lawos_app SET lock_timeout = '5s'");
      await adminPool.query(
        "ALTER ROLE lawos_app SET idle_in_transaction_session_timeout = '30s'",
      );
    }
    await (outlookAuthorityAdmin ? bootstrapPool : adminPool).query(
      `ALTER DATABASE ${outlookAuthorityAdmin ? "lawos" : "postgres"}
         SET lawos.environment = 'synthetic-test'`,
    );
    await adminPool.query(
      `INSERT INTO lawos_security.tenant_context_authorities
         (database_role, tenant_id, context_secret, synthetic_wildcard)
       VALUES ('lawos_app', '*', $1, true)`,
      [Buffer.from(tenantContextSecret, "utf8")],
    );
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_meta TO lawos_app");
    await adminPool.query("GRANT SELECT ON lawos_meta.schema_migrations TO lawos_app");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_runtime TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_runtime.records TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_runtime.idempotency_keys TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_runtime.audit_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_runtime.outbox_events TO lawos_app");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_identity TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.accounts TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.account_memberships TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.directory_idempotency_keys TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.directory_outbox_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.sessions TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.challenges TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.password_reset_jobs TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_identity.break_glass_requests TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_identity.break_glass_approvals TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_identity.security_audit_events TO lawos_app");
    await adminPool.query("GRANT SELECT ON lawos_identity.tenants TO lawos_app");
    await adminPool.query("GRANT SELECT ON lawos_identity.tenant_provisioning_requests TO lawos_app");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_domain TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_domain.records TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.record_references TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.idempotency_keys TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.audit_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_domain.outbox_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.import_receipts TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.shadow_receipts TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_domain.rehearsal_receipts TO lawos_app");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_dms TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.upload_sessions TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.documents TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.file_objects TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_dms.document_versions TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_dms.idempotency_keys TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_dms.audit_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.outbox_events TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.legal_holds TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.retention_policies TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.delete_intents TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_dms.precedent_sources TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_dms.precedent_extraction_receipts TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON lawos_dms.precedent_search_index TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_dms.document_privilege_labels TO lawos_app");
    await adminPool.query("GRANT USAGE ON SCHEMA lawos_integrations TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT, UPDATE ON lawos_integrations.docusign_requests TO lawos_app");
    await adminPool.query("GRANT SELECT, INSERT ON lawos_integrations.docusign_webhook_receipts TO lawos_app");
    const appUrl = new URL(instance.connection_string);
    appUrl.username = "lawos_app";
    appPool = createPostgresPool({
      connectionString: appUrl.toString(),
      sslMode: "disable",
      allowInsecureLocal: true,
      applicationName: "lawos-postgres-v2-app-test",
      tenantContextSecret,
      max: appPoolMax,
    });
  } catch (error) {
    await appPool?.end().catch(() => {});
    await adminPool.end().catch(() => {});
    await bootstrapPool?.end().catch(() => {});
    await baseInstance.stop();
    throw error;
  }
  t.after(async () => {
    await appPool.end();
    await adminPool.end();
    await bootstrapPool?.end();
    await baseInstance.stop();
  });
  return Object.freeze({
    instance,
    adminPool,
    appPool,
    tenantContextSecret,
    ...(bootstrapPool ? { bootstrapPool } : {}),
  });
}
