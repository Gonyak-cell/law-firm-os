import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { findRegisteredAccountByEmail } from "../src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "./helpers/session.js";

function account(email) {
  const found = findRegisteredAccountByEmail(email);
  assert.ok(found, `registered account ${email} should exist`);
  return found;
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  });
  return { status: response.status, body: await response.json() };
}

test("admin security audit events persist to LAWOS_AUDIT_STORE_PATH across server restarts", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-security-audit-store-"));
  const auditStorePath = join(root, "audit", "security-audit-events.ndjson");
  const target = account("yjlee@amic.kr");

  await mkdir(join(root, "audit"), { recursive: true });
  await withServer({ securityAuditStorePath: auditStorePath }, async (baseUrl) => {
    const adminHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
    const disabled = await json(baseUrl, `/api/admin/security/users/${encodeURIComponent(target.user_id)}/disable`, {
      method: "POST",
      headers: { ...adminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true, reason: "durable audit persistence proof" }),
    });
    assert.equal(disabled.status, 200);
  });

  const rawAudit = await readFile(auditStorePath, "utf8");
  assert.match(rawAudit, /admin\.security\.user\.disabled/);
  assert.doesNotMatch(rawAudit, /synthetic_token/);

  await withServer({ securityAuditStorePath: auditStorePath }, async (baseUrl) => {
    const adminHeaders = await apiSessionHeaders(baseUrl, account("jwsuh@amic.kr"));
    const audit = await json(baseUrl, "/api/admin/security/audit", { headers: adminHeaders });
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((item) => item.action === "admin.security.user.disabled" && item.object_id === target.user_id));
  });
});
