import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import {
  CTI_READONLY_EFS_SNAPSHOT_ACTION,
  CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF,
  CTI_DB_CONNECTION_PROOF_ACTION,
  CTI_DB_CONNECTION_PROOF_APPROVAL_REF,
  CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
  CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
  buildCtiS1GAuthenticatedProductionProbeReceipt,
  createLambdaPasswordResetEmailDelivery,
  handler,
  resolveLambdaSessionSecret,
} from "../src/lambda.js";
import { STORE_PATH_MANIFEST } from "../src/store-path-manifest.js";

async function createDurableStorePaths(root) {
  const paths = {};
  for (const entry of STORE_PATH_MANIFEST) {
    paths[entry.key] = join(root, entry.fileName);
    await mkdir(join(root, entry.fileName.split("/").slice(0, -1).join("/")), { recursive: true });
  }
  await mkdir(`${paths.dmsStorePath}.objects`, { recursive: true });
  return paths;
}

function decodeBase64MimePart(rawEmail, contentTypePrefix) {
  const marker = rawEmail.indexOf(contentTypePrefix);
  assert.notEqual(marker, -1, `${contentTypePrefix} part must exist`);
  const encodedStart = rawEmail.indexOf("\r\n\r\n", marker);
  assert.notEqual(encodedStart, -1, `${contentTypePrefix} body separator must exist`);
  const bodyStart = encodedStart + 4;
  const boundaryStart = rawEmail.indexOf("\r\n--", bodyStart);
  assert.notEqual(boundaryStart, -1, `${contentTypePrefix} boundary must exist`);
  return Buffer.from(rawEmail.slice(bodyStart, boundaryStart).replace(/\s+/g, ""), "base64").toString("utf8");
}

test("Lambda bootstrap fetches LAWOS_API_SESSION_SECRET from Secrets Manager secret id", async () => {
  const resolved = await resolveLambdaSessionSecret({
    env: {
      LAWOS_API_SESSION_SECRET_SECRET_ID: "/amic-vault/prod/api/session-signing",
      AWS_REGION: "ap-northeast-2",
      AWS_ACCESS_KEY_ID: "AKIATESTACCESSKEY",
      AWS_SECRET_ACCESS_KEY: "test-secret-access-key",
      AWS_SESSION_TOKEN: "test-session-token",
    },
    now: () => new Date("2026-07-06T00:00:00.000Z"),
    fetchFn: async (url, options) => {
      assert.equal(url, "https://secretsmanager.ap-northeast-2.amazonaws.com/");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-amz-target"], "secretsmanager.GetSecretValue");
      assert.equal(options.headers["x-amz-security-token"], "test-session-token");
      assert.match(options.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIATESTACCESSKEY\/20260706\/ap-northeast-2\/secretsmanager\/aws4_request/);
      assert.deepEqual(JSON.parse(options.body), { SecretId: "/amic-vault/prod/api/session-signing" });
      return new Response(JSON.stringify({ SecretString: "operational-session-secret-32-bytes" }), {
        status: 200,
      });
    },
  });

  assert.equal(resolved, "operational-session-secret-32-bytes");
});

test("Lambda password reset email delivery signs SESv2 without returning token material", async () => {
  const delivery = createLambdaPasswordResetEmailDelivery({
    env: {
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME: "Matter OS",
      LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
      LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL: "https://matter.example.test/api/auth/password-reset/open",
      AWS_REGION: "ap-northeast-2",
      AWS_ACCESS_KEY_ID: "AKIATESTACCESSKEY",
      AWS_SECRET_ACCESS_KEY: "test-secret-access-key",
      AWS_SESSION_TOKEN: "test-session-token",
    },
    now: () => new Date("2026-07-06T00:00:00.000Z"),
    fetchFn: async (url, options) => {
      assert.equal(url, "https://email.ap-northeast-2.amazonaws.com/v2/email/outbound-emails");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-amz-security-token"], "test-session-token");
      assert.match(options.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIATESTACCESSKEY\/20260706\/ap-northeast-2\/ses\/aws4_request/);
      const body = JSON.parse(options.body);
      assert.equal(body.FromEmailAddress, "Matter OS <no-reply@amic.kr>");
      assert.deepEqual(body.Destination.ToAddresses, ["jwsuh@amic.kr"]);
      assert.equal(body.Content.Simple, undefined);
      assert.ok(body.Content.Raw.Data);
      const rawEmail = Buffer.from(body.Content.Raw.Data, "base64").toString("utf8");
      assert.match(rawEmail, /^From: Matter OS <no-reply@amic\.kr>/m);
      assert.match(rawEmail, /^Subject: =\?UTF-8\?B\?/m);
      assert.match(rawEmail, /Content-Type: multipart\/related/);
      const textPart = decodeBase64MimePart(rawEmail, "Content-Type: text/plain");
      const htmlPart = decodeBase64MimePart(rawEmail, "Content-Type: text/html");
      assert.match(textPart, /matter OS 비밀번호 설정/);
      assert.match(textPart, /https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value/);
      assert.match(htmlPart, /<h1[^>]*>비밀번호를 설정하세요<\/h1>/);
      assert.match(htmlPart, /Matter OS/);
      assert.match(htmlPart, /AMIC 내부 계정 보안 알림/);
      assert.match(htmlPart, /비밀번호 설정 열기/);
      assert.match(htmlPart, /href="https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value"/);
      assert.match(htmlPart, /브라우저 링크: https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value/);
      assert.match(htmlPart, /matter:\/\/password-reset\/confirm\?token=reset-token-value/);
      return new Response(JSON.stringify({ MessageId: "ses-message-1" }), { status: 200 });
    },
  });

  assert.equal(typeof delivery, "function");
  const result = await delivery({
    to: "jwsuh@amic.kr",
    token: "reset-token-value",
    expires_at: "2026-07-06T01:00:00.000Z",
  });

  assert.equal(result.status, "sent");
  assert.equal(result.provider, "sesv2");
  assert.equal(result.message_id, "ses-message-1");
  assert.equal(result.token_material_returned, false);
  assert.equal(result.reset_url_returned, false);
  assert.equal(JSON.stringify(result).includes("reset-token-value"), false);
});

test("Lambda password reset email delivery remains unconfigured without an approved mail surface", () => {
  const delivery = createLambdaPasswordResetEmailDelivery({
    env: {
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
    },
  });
  assert.equal(delivery, undefined);
});

test("operational auth stays available when the HRX store is unreadable", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-hrx-corrupt-startup-test-"));
  const paths = await createDurableStorePaths(root);
  let started = null;
  try {
    await writeFile(paths.hrxStorePath, "");
    started = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: "operational-session-secret-32-bytes",
      ...paths,
    });

    const baseUrl = `http://${started.host}:${started.port}`;
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-a-real-user@example.invalid", password: "not-a-real-password" }),
    });
    assert.equal(login.status, 401);
    const body = await login.json();
    assert.equal(body.reason, "auth_credential_invalid");
    assert.deepEqual(body.safe_error_codes, ["AUTH_CREDENTIAL_INVALID"]);
  } finally {
    await new Promise((resolveClose) => started?.server?.close(resolveClose) ?? resolveClose());
    await rm(root, { recursive: true, force: true });
  }
});

test("operational auth stays available when the finance store is unreadable", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-finance-corrupt-startup-test-"));
  const paths = await createDurableStorePaths(root);
  let started = null;
  try {
    await writeFile(paths.financeStorePath, '{"records":[]}\nnot-json');
    started = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: "operational-session-secret-32-bytes",
      ...paths,
    });

    const baseUrl = `http://${started.host}:${started.port}`;
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-a-real-user@example.invalid", password: "not-a-real-password" }),
    });
    assert.equal(login.status, 401);
    const body = await login.json();
    assert.equal(body.reason, "auth_credential_invalid");
    assert.deepEqual(body.safe_error_codes, ["AUTH_CREDENTIAL_INVALID"]);
  } finally {
    await new Promise((resolveClose) => started?.server?.close(resolveClose) ?? resolveClose());
    await rm(root, { recursive: true, force: true });
  }
});

test("I14 read-only EFS snapshot direct invoke returns only hash/count evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-cti-snapshot-test-"));
  const originalEnv = { ...process.env };
  try {
    const matterStorePath = join(root, "matter-store.json");
    const auditStorePath = join(root, "audit", "security-audit-events.ndjson");
    const dmsStorePath = join(root, "dms-store.json");
    const dmsObjectStorePath = join(root, "dms-store.json.objects");
    await mkdir(join(root, "audit"), { recursive: true });
    await mkdir(dmsObjectStorePath, { recursive: true });
    await writeFile(matterStorePath, JSON.stringify({ matters: [{ matter_id: "m1", client_name: "Secret Client Ltd" }] }));
    await writeFile(auditStorePath, `${JSON.stringify({ event: "probe", actor: "private@example.test" })}\n`);
    await writeFile(dmsStorePath, JSON.stringify({ documents: [{ document_id: "d1" }] }));
    await writeFile(join(dmsObjectStorePath, "private-object.bin"), "private object bytes");

    process.env = {
      ...originalEnv,
      LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT: root,
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_MATTER_STORE_PATH: matterStorePath,
      LAWOS_AUDIT_STORE_PATH: auditStorePath,
      LAWOS_DMS_STORE_PATH: dmsStorePath,
      LAWOS_DMS_OBJECT_STORE_PATH: dmsObjectStorePath,
      AWS_LAMBDA_FUNCTION_NAME: "matter-lawos-api-prod",
    };

    const response = await handler({
      lawos_maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
      approval_signature_ref: CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF,
      request_id: "unit-test-i14",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.isBase64Encoded, false);
    const responseText = response.body;
    assert.doesNotMatch(responseText, /Secret Client Ltd/);
    assert.doesNotMatch(responseText, /private@example\.test/);
    assert.doesNotMatch(responseText, /private object bytes/);

    const receipt = JSON.parse(responseText);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.boundary.public_http_endpoint, false);
    assert.equal(receipt.boundary.plaintext_file_content_returned, false);
    assert.equal(receipt.boundary.production_write_executed, false);
    assert.equal(receipt.boundary.production_restore_executed, false);
    assert.match(receipt.snapshot_hash, /^[a-f0-9]{64}$/);
    assert.equal(receipt.restore_rehearsal.status, "PASS");
    assert.equal(receipt.restore_rehearsal.production_restore_executed, false);
    assert.equal(receipt.restore_rehearsal.restored_file_count, 4);
    const matterStore = receipt.store_files.find((entry) => entry.env === "LAWOS_MATTER_STORE_PATH");
    assert.equal(matterStore.readable, true);
    assert.equal(matterStore.record_count, 1);
    const objectStore = receipt.derived_store_directories.find((entry) => entry.env === "LAWOS_DMS_OBJECT_STORE_PATH");
    assert.equal(objectStore.file_count, 1);
    assert.equal(objectStore.details_truncated, false);
  } finally {
    process.env = originalEnv;
    await rm(root, { recursive: true, force: true });
  }
});

test("I14 read-only EFS snapshot surface is not reachable as an HTTP event", async () => {
  const response = await handler({
    rawPath: "/api/maintenance/cti-snapshot",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: CTI_READONLY_EFS_SNAPSHOT_ACTION,
    approval_signature_ref: CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF,
  });

  assert.equal(response.statusCode, 403);
  const body = JSON.parse(response.body);
  assert.equal(body.reason, "cti_snapshot_surface_direct_invoke_only");
  assert.equal(body.public_http_endpoint, false);
});

test("I26 DB connection proof surface is direct-invoke only and approval gated", async () => {
  const httpResponse = await handler({
    rawPath: "/api/maintenance/cti-db-connection-proof",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
    approval_signature_ref: CTI_DB_CONNECTION_PROOF_APPROVAL_REF,
  });
  assert.equal(httpResponse.statusCode, 403);
  const httpBody = JSON.parse(httpResponse.body);
  assert.equal(httpBody.reason, "cti_db_connection_proof_direct_invoke_only");
  assert.equal(httpBody.public_http_endpoint, false);

  const approvalResponse = await handler({
    lawos_maintenance_action: CTI_DB_CONNECTION_PROOF_ACTION,
  });
  assert.equal(approvalResponse.statusCode, 403);
  const approvalBody = JSON.parse(approvalResponse.body);
  assert.equal(approvalBody.reason, "cti_db_connection_proof_approval_ref_required");
  assert.equal(approvalBody.required_approval_signature_ref, CTI_DB_CONNECTION_PROOF_APPROVAL_REF);
  assert.equal(approvalBody.secret_value_returned, false);
});

test("I18 S1-G authenticated production probe writes one credential and returns only safe evidence", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-cti-i18-test-"));
  const paths = await createDurableStorePaths(root);
  let started = null;
  try {
    const receipt = await buildCtiS1GAuthenticatedProductionProbeReceipt({
      event: {
        lawos_maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
        approval_signature_ref: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
        request_id: "unit-test-i18",
      },
      env: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT: root,
        LAWOS_AUTH_CREDENTIAL_STORE_PATH: paths.authCredentialStorePath,
        AWS_LAMBDA_FUNCTION_NAME: "matter-lawos-api-prod",
      },
      apiBaseUrlFn: async () => {
        started = await startApiServer({
          port: 0,
          runtimeProfile: "operational",
          sessionSecret: "operational-session-secret-32-bytes",
          ...paths,
        });
        return `http://${started.host}:${started.port}`;
      },
    });

    assert.equal(receipt.ok, true);
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.approval_signature_ref, CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF);
    assert.equal(receipt.credential_store.records_before_count, 0);
    assert.equal(receipt.credential_store.records_after_count, 1);
    assert.equal(receipt.credential_store.target_status, "must_change");
    assert.equal(receipt.probe_results.login.status, 200);
    assert.equal(receipt.probe_results.login.credential_provider, "lawos-internal-password-provider-v1");
    assert.equal(receipt.probe_results.login.local_dev_synthetic_only, false);
    assert.equal(receipt.probe_results.session.status, 200);
    assert.equal(receipt.probe_results.matter_readback.status, 200);
    assert.equal(receipt.probe_results.marker.status, 200);
    assert.equal(receipt.probe_results.audit_readback.matching_marker_audit_count, 1);
    assert.equal(receipt.probe_results.marker_readback.matching_marker_readback_count, 1);
    assert.equal(receipt.boundary.direct_invoke_only, true);
    assert.equal(receipt.boundary.public_http_endpoint, false);
    assert.equal(receipt.boundary.real_login_flow_used, true);
    assert.equal(receipt.boundary.debug_endpoint_used, false);
    assert.equal(receipt.boundary.direct_token_mint_used, false);
    assert.equal(receipt.boundary.temporary_backdoor_principal_used, false);
    assert.equal(receipt.boundary.token_or_password_returned, false);
    assert.equal(receipt.boundary.plaintext_password_recorded, false);
    assert.equal(receipt.boundary.credential_material_recorded_in_receipt, false);
    assert.equal(receipt.boundary.production_migration_executed, false);
    assert.equal(receipt.boundary.cutover_executed, false);

    const receiptText = JSON.stringify(receipt);
    assert.doesNotMatch(receiptText, /jwsuh@amic\.kr/);
    assert.doesNotMatch(receiptText, /lawos_session_v1\./);
    assert.doesNotMatch(receiptText, /operational-session-secret-32-bytes/);

    const credentialStore = JSON.parse(await readFile(paths.authCredentialStorePath, "utf8"));
    assert.equal(credentialStore.records.length, 1);
    assert.equal(credentialStore.records[0].email, "jwsuh@amic.kr");
    assert.equal(credentialStore.records[0].password_hash.algorithm, "node:crypto.scrypt");
  } finally {
    if (started) await new Promise((resolveClose) => started.server.close(resolveClose));
    await rm(root, { recursive: true, force: true });
  }
});

test("I18 S1-G authenticated production probe surface is direct-invoke only", async () => {
  const response = await handler({
    rawPath: "/api/maintenance/cti-s1g-probe",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
    approval_signature_ref: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
  });

  assert.equal(response.statusCode, 403);
  const body = JSON.parse(response.body);
  assert.equal(body.reason, "cti_s1g_probe_surface_direct_invoke_only");
  assert.equal(body.public_http_endpoint, false);
});
