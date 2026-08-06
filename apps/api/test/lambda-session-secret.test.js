import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
  CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION,
  CTI_CLIENT_DISPLAY_NAME_REPAIR_APPROVAL_REF,
  CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION,
  CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_APPROVAL_REF,
  CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION,
  CTI_MATTER_STORE_READ_MODEL_PROOF_APPROVAL_REF,
  CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
  CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
  DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION,
  HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
  HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
  HRX_ROSTER_RECONCILE_ACTION,
  HRX_ROSTER_RECONCILE_APPROVAL_REF,
  LCX_AUTH_RESET_RECOVERY_ACTION,
  LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
  buildCtiS1GAuthenticatedProductionProbeReceipt,
  buildDirectReceiptAllocationMigrationFromRuntime,
  buildDirectReceiptAllocationMigrationReceipt,
  buildHomeFinanceDashboardSmokeFromRuntime,
  buildHomeFinanceDashboardSmokeReceipt,
  buildCtiS5EnrichmentExecuteReceipt,
  buildCtiCutoverExecuteRetryReceipt,
  buildHrxRosterReconcileReceipt,
  buildLcxAuthResetRecoveryReceipt,
  classifySesDeliveryFailure,
  createLambdaHttpHandler,
  createRetryablePromiseCache,
  createLambdaPasswordResetEmailDelivery,
  handler,
  resolveLambdaHrxStepUpSecrets,
  resolveLambdaSessionSecret,
} from "../src/lambda.js";
import { passwordResetEmailHtml } from "../src/password-reset-email-template.js";
import { STORE_PATH_MANIFEST } from "../src/store-path-manifest.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";

const OPERATIONAL_STEP_UP_OPTIONS = Object.freeze({
  hrxStepUpSecret: "lambda-test-operational-step-up-secret-32-bytes",
  hrxStepUpTotpSecret: "lambda-test-operational-step-up-totp-secret-32-bytes",
});

test("Lambda runtime startup cache retries after a rejected initialization", async () => {
  let attempts = 0;
  const cache = createRetryablePromiseCache(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("synthetic startup failure");
    return Object.freeze({ outcome: "PASS" });
  });
  const first = cache.get();
  assert.equal(cache.get(), first);
  await assert.rejects(first, /synthetic startup failure/u);
  const recovered = cache.get();
  assert.notEqual(recovered, first);
  assert.deepEqual(await recovered, { outcome: "PASS" });
  assert.equal(cache.get(), recovered);
  assert.equal(attempts, 2);
  assert.equal(cache.take(), recovered);
  assert.equal(cache.take(), undefined);
});

test("Lambda HTTP bootstrap passes provider verification and leave integration authority to the API server", async () => {
  const verifier = Object.freeze({
    async verify() {
      return { ok: true };
    },
  });
  const leaveIntegrationProviders = Object.freeze({
    payroll: Object.freeze({
      operational_authority: true,
      provider_id: "payroll-authority",
    }),
  });
  const leaveIntegrationProviderEnabled = Object.freeze({ payroll: true });
  const peopleOutlookRuntimeFactory = () => Object.freeze({});
  const m365GraphConfig = Object.freeze({
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
  });
  const microsoftEgressTransport = Object.freeze({});
  let peopleResolverOptions;
  let clientResolverOptions;
  let startupOptions;
  let forwardedRequest;
  const lambdaHandler = createLambdaHttpHandler({
    payrollStatementProviderVerifier: verifier,
    leaveIntegrationProviders,
    leaveIntegrationProviderEnabled,
    startApiServerFn: async (options) => {
      startupOptions = options;
      return { port: 32123 };
    },
    createMatterRepositoryFn: async () => null,
    resolveHrxStepUpSecretsFn: async () => ({}),
    loadHrxRelationalProjectionFn: async () => null,
    resolveSessionSecretFn: async () => "lambda-provider-test-session-secret-32-bytes",
    createPasswordResetEmailDeliveryFn: () => undefined,
    createMicrosoftEgressBrokerTransportFn: () => microsoftEgressTransport,
    resolvePeopleOutlookRuntimeFactoryFn: async (options) => {
      peopleResolverOptions = options;
      return peopleOutlookRuntimeFactory;
    },
    resolveClientOutlookM365GraphConfigFn: async (options) => {
      clientResolverOptions = options;
      return m365GraphConfig;
    },
    fetchFn: async (url, options) => {
      forwardedRequest = { url, options };
      return new Response(JSON.stringify({ outcome: "blocked" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await lambdaHandler({
    rawPath: "/api/hrx/payroll/provider-callbacks/statement-delivery",
    requestContext: { http: { method: "POST" } },
    headers: {
      "content-type": "application/json",
      "x-lawos-provider-tenant-id": "tenant-provider-bootstrap",
      "x-provider-signature": "signed-test-payload",
    },
    body: JSON.stringify({ tenant_id: "tenant-provider-bootstrap" }),
  });

  assert.equal(startupOptions.payrollStatementProviderVerifier, verifier);
  assert.equal(
    startupOptions.peopleOutlookRuntimeFactory,
    peopleOutlookRuntimeFactory,
  );
  assert.equal(startupOptions.m365GraphConfig, m365GraphConfig);
  assert.equal(
    peopleResolverOptions.microsoft_egress_transport,
    microsoftEgressTransport,
  );
  assert.equal(
    clientResolverOptions.microsoft_egress_transport,
    microsoftEgressTransport,
  );
  assert.equal(
    startupOptions.leaveIntegrationProviders,
    leaveIntegrationProviders,
  );
  assert.equal(
    startupOptions.leaveIntegrationProviderEnabled,
    leaveIntegrationProviderEnabled,
  );
  assert.equal(forwardedRequest.url, "http://127.0.0.1:32123/api/hrx/payroll/provider-callbacks/statement-delivery");
  assert.equal(forwardedRequest.options.method, "POST");
  assert.equal(forwardedRequest.options.redirect, "manual");
  assert.equal(forwardedRequest.options.headers["x-provider-signature"], "signed-test-payload");
  assert.equal(result.statusCode, 503);
});

test("Lambda HTTP proxy logs only safe Outlook failure metadata", async () => {
  const logs = [];
  const lambdaHandler = createLambdaHttpHandler({
    runtimeCache: Object.freeze({
      async get() {
        return { port: 32123 };
      },
    }),
    fetchFn: async () => new Response(JSON.stringify({
      request_id: "req-outlook-file-1",
      safe_error_codes: ["OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH"],
      message: "must-not-be-logged",
      authorization_code: "must-not-be-logged",
    }), {
      status: 409,
      headers: { "content-type": "application/json" },
    }),
    logFn: (entry) => logs.push(entry),
  });

  const result = await lambdaHandler({
    rawPath: "/api/outlook/email/file",
    requestContext: { http: { method: "POST" } },
    headers: { authorization: "Bearer must-not-be-logged" },
    body: JSON.stringify({ access_token: "must-not-be-logged" }),
  });

  assert.equal(result.statusCode, 409);
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    event: "lawos.outlook.request_failed",
    method: "POST",
    path: "/api/outlook/email/file",
    request_id: "req-outlook-file-1",
    safe_error_codes: ["OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH"],
    status: 409,
  });
  assert.equal(logs[0].includes("must-not-be-logged"), false);
});

async function createDurableStorePaths(root) {
  const paths = {};
  for (const entry of STORE_PATH_MANIFEST) {
    paths[entry.key] = join(root, entry.fileName);
    await mkdir(join(root, entry.fileName.split("/").slice(0, -1).join("/")), { recursive: true });
  }
  await mkdir(`${paths.dmsStorePath}.objects`, { recursive: true });
  return paths;
}

test("Lambda bootstrap fetches LAWOS_API_SESSION_SECRET with the AWS SDK", async () => {
  const resolved = await resolveLambdaSessionSecret({
    env: {
      LAWOS_API_SESSION_SECRET_SECRET_ID: "/amic-vault/prod/api/session-signing",
      AWS_REGION: "ap-northeast-2",
    },
    client: {
      async send(command) {
        assert.equal(command.constructor.name, "GetSecretValueCommand");
        assert.deepEqual(command.input, { SecretId: "/amic-vault/prod/api/session-signing" });
        return { SecretString: "operational-session-secret-32-bytes" };
      },
    },
  });

  assert.equal(resolved, "operational-session-secret-32-bytes");
});

test("Lambda bootstrap derives separated HRX step-up keys from an exact secret reference", async () => {
  const rootSecret = "operational-hrx-step-up-root-secret-32-bytes";
  const resolved = await resolveLambdaHrxStepUpSecrets({
    env: {
      LAWOS_HRX_STEP_UP_ROOT_SECRET_ID: "/lawos/private-staging/hrx/step-up-root",
      AWS_REGION: "ap-northeast-2",
    },
    client: {
      async send(command) {
        assert.equal(command.constructor.name, "GetSecretValueCommand");
        assert.deepEqual(command.input, { SecretId: "/lawos/private-staging/hrx/step-up-root" });
        return { SecretString: rootSecret };
      },
    },
  });
  const expected = (purpose) => createHmac("sha256", rootSecret)
    .update(`lawos:hrx-step-up:${purpose}:v1`, "utf8")
    .digest("base64url");

  assert.equal(resolved.hrxStepUpSecret, expected("token-signing"));
  assert.equal(resolved.hrxStepUpTotpSecret, expected("totp"));
  assert.notEqual(resolved.hrxStepUpSecret, resolved.hrxStepUpTotpSecret);
});

test("Lambda password reset email delivery uses SESv2 simple content and never returns token material", async () => {
  const delivery = createLambdaPasswordResetEmailDelivery({
    env: {
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_IDENTITY_ARN: "arn:aws:ses:ap-northeast-2:770880870480:identity/no-reply@amic.kr",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME: "Matter OS",
      LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
      LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL: "https://matter.example.test/api/auth/password-reset/open",
      LAWOS_AUTH_PASSWORD_RESET_EMAIL_LOGO_URL: "https://assets.example.test/amic-law-email-logo.png",
      AWS_REGION: "ap-northeast-2",
    },
    client: {
      async send(command) {
        assert.equal(command.constructor.name, "SendEmailCommand");
        const body = command.input;
        assert.equal(body.FromEmailAddress, "no-reply@amic.kr");
        assert.equal(body.FromEmailAddressIdentityArn, undefined);
        assert.deepEqual(body.Destination.ToAddresses, ["jwsuh@amic.kr"]);
        assert.equal(body.Content.Raw, undefined);
        assert.equal(body.Content.Simple.Subject.Data, "AMIC LAW · LawOS 비밀번호 설정");
        assert.equal(body.Content.Simple.Subject.Charset, "UTF-8");
        const textPart = body.Content.Simple.Body.Text.Data;
        const htmlPart = body.Content.Simple.Body.Html.Data;
        assert.equal(body.Content.Simple.Body.Text.Charset, "UTF-8");
        assert.equal(body.Content.Simple.Body.Html.Charset, "UTF-8");
        assert.match(textPart, /AMIC LAW · LawOS 비밀번호 설정/);
        assert.match(textPart, /https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value/);
        assert.match(textPart, /링크 유효 시간:/);
        assert.doesNotMatch(textPart, /코드|직접 입력/u);
        assert.match(htmlPart, /<h1[^>]*>비밀번호를 설정하세요<\/h1>/);
        assert.match(htmlPart, /<img src="https:\/\/assets\.example\.test\/amic-law-email-logo\.png" width="175" height="28" alt="AMIC LAW"/);
        assert.match(htmlPart, />LawOS<\/td>/);
        assert.match(htmlPart, /border-bottom:3px solid #26C260/);
        assert.match(htmlPart, /bgcolor="#0F3A32"/);
        assert.match(htmlPart, /비밀번호 설정하기/);
        assert.match(htmlPart, /href="https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value"/);
        assert.match(htmlPart, /브라우저 링크: <a href="https:\/\/matter\.example\.test\/api\/auth\/password-reset\/open#token=reset-token-value"/);
        assert.match(htmlPart, /matter:\/\/password-reset\/confirm\?token=reset-token-value/);
        assert.match(htmlPart, /본 메일은 AMIC LAW의 LawOS 계정 보안 알림입니다/);
        assert.doesNotMatch(htmlPart, /코드|직접 입력/u);
        return { MessageId: "ses-message-1" };
      },
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

test("password reset email accepts only HTTPS or CID logo sources and escapes visible metadata", () => {
  const html = passwordResetEmailHtml({
    resetUrl: "matter://password-reset/confirm?token=safe-test-token",
    resetOpenUrl: "https://matter.example.test/password-reset#token=safe-test-token",
    expiresAt: "<2026-07-27 20:30 KST>",
    logoSrc: "javascript:alert(1)",
  });

  assert.doesNotMatch(html, /javascript:/u);
  assert.doesNotMatch(html, /<img /u);
  assert.match(html, />AMIC LAW<\/span>/u);
  assert.match(html, /&lt;2026-07-27 20:30 KST&gt;/u);
});

test("Lambda password reset email delivery classifies authorization failures without logging provider details", async () => {
  assert.equal(classifySesDeliveryFailure(new Error("because no VPC endpoint policy allows the ses:SendEmail action")), "vpc_endpoint_policy");
  assert.equal(classifySesDeliveryFailure(new Error("because no identity-based policy allows the ses:SendEmail action")), "identity_policy");
  assert.equal(classifySesDeliveryFailure(new Error("with an explicit deny in a service control policy")), "service_control_policy");
  assert.equal(classifySesDeliveryFailure(new Error("with an explicit deny in a permissions boundary")), "permissions_boundary");
  assert.equal(classifySesDeliveryFailure(new Error("with an explicit deny in a session policy")), "session_policy");
  assert.equal(classifySesDeliveryFailure(new Error("because no resource-based policy allows the ses:SendEmail action")), "resource_policy");
  assert.equal(classifySesDeliveryFailure(new Error("is not authorized to perform: ses:SendEmail on resource")), "ses_sendemail_authorization");
  assert.equal(classifySesDeliveryFailure(new Error("Email address is not verified")), "ses_service");
  assert.equal(classifySesDeliveryFailure(new Error("Your account remains in the SES sandbox")), "ses_service");
  assert.equal(classifySesDeliveryFailure(new Error("Access denied")), "unclassified");
  const genericAccessDenied = new Error("Access denied");
  genericAccessDenied.name = "AccessDeniedException";
  genericAccessDenied.$metadata = { httpStatusCode: 403 };
  assert.equal(classifySesDeliveryFailure(genericAccessDenied), "authorization_policy");

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (line) => warnings.push(String(line));
  try {
    const delivery = createLambdaPasswordResetEmailDelivery({
      env: {
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_IDENTITY_ARN: "arn:aws:ses:ap-northeast-2:770880870480:identity/no-reply@amic.kr",
        LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
        AWS_REGION: "ap-northeast-2",
      },
      client: {
        async send() {
          const error = new Error("because no identity-based policy allows reset-token-value for private@example.test request-id-secret");
          error.name = "AccessDeniedException";
          error.$metadata = { httpStatusCode: 403, requestId: "request-id-secret" };
          throw error;
        },
      },
    });
    const result = await delivery({
      to: "private@example.test",
      token: "reset-token-value",
      expires_at: "2026-07-06T01:00:00.000Z",
    });
    assert.equal(result.status, "failed");
    assert.equal(result.reason, "sesv2_send_failed_403");
    assert.equal(result.failure_class, "identity_policy");
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  const warning = JSON.parse(warnings[0]);
  assert.equal(warning.failure_class, "identity_policy");
  assert.equal(warning.authorization_failure_layer, "identity_policy");
  assert.deepEqual(warning.authorization_diagnostic, {
    resource_binding: "not_present",
    configured_sender_referenced: false,
    approved_recipient_referenced: true,
    assumed_api_role_referenced: false,
    explicit_deny_referenced: false,
  });
  assert.equal(warning.provider_status_code, 403);
  assert.equal(warnings[0].includes("reset-token-value"), false);
  assert.equal(warnings[0].includes("private@example.test"), false);
  assert.equal(warnings[0].includes("request-id-secret"), false);
  assert.equal(Object.hasOwn(warning, "provider_message"), false);
});

test("Lambda password reset email authorization diagnostics expose only fixed classifications", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (line) => warnings.push(String(line));
  try {
    const delivery = createLambdaPasswordResetEmailDelivery({
      env: {
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_IDENTITY_ARN: "arn:aws:ses:ap-northeast-2:770880870480:identity/no-reply@amic.kr",
        LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
        AWS_REGION: "ap-northeast-2",
      },
      client: {
        async send() {
          const error = new Error("User arn:aws:sts::770880870480:assumed-role/lawos-private-staging-api-role/opaque is not authorized to perform ses:SendEmail on resource arn:aws:ses:ap-northeast-2:770880870480:identity/no-reply@amic.kr with an explicit deny; hidden-token");
          error.name = "AccessDeniedException";
          error.$metadata = { httpStatusCode: 403, requestId: "hidden-request-id" };
          throw error;
        },
      },
    });
    const result = await delivery({
      to: "approved-recipient@amic.kr",
      token: "hidden-token",
      expires_at: "2026-07-06T01:00:00.000Z",
    });
    assert.equal(result.status, "failed");
  } finally {
    console.warn = originalWarn;
  }

  const warning = JSON.parse(warnings[0]);
  assert.deepEqual(warning.authorization_diagnostic, {
    resource_binding: "configured_identity",
    configured_sender_referenced: true,
    approved_recipient_referenced: false,
    assumed_api_role_referenced: true,
    explicit_deny_referenced: true,
  });
  assert.equal(warnings[0].includes("hidden-token"), false);
  assert.equal(warnings[0].includes("hidden-request-id"), false);
  assert.equal(warnings[0].includes("approved-recipient@amic.kr"), false);
  assert.equal(warnings[0].includes("no-reply@amic.kr"), false);
});

test("Lambda password reset email delivery safely classifies message preparation failures", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (line) => warnings.push(String(line));
  try {
    const delivery = createLambdaPasswordResetEmailDelivery({
      env: {
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
        LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: "no-reply@amic.kr",
        LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "https://matter.example.test/api/auth/password-reset/confirm",
        AWS_REGION: "ap-northeast-2",
      },
      client: {
        async send() {
          assert.fail("provider send must not run after message preparation fails");
        },
      },
    });
    const result = await delivery({
      to: "private@example.test",
      token: Symbol("hidden-reset-token"),
      expires_at: "2026-07-06T01:00:00.000Z",
    });
    assert.equal(result.status, "failed");
    assert.equal(result.failure_class, "message_preparation");
    assert.equal(JSON.stringify(result).includes("hidden-reset-token"), false);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  const warning = JSON.parse(warnings[0]);
  assert.equal(warning.failure_class, "message_preparation");
  assert.equal(warning.authorization_failure_layer, null);
  assert.equal(warnings[0].includes("hidden-reset-token"), false);
  assert.equal(warnings[0].includes("private@example.test"), false);
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

test("operational startup rejects legacy JSON authority before reading a corrupt HRX store", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-hrx-corrupt-startup-test-"));
  const paths = await createDurableStorePaths(root);
  try {
    await writeFile(paths.hrxStorePath, "");
    await assert.rejects(startApiServer({
        port: 0,
        runtimeProfile: "operational",
        persistenceAuthority: "file-current",
        sessionSecret: "operational-session-secret-32-bytes",
        ...OPERATIONAL_STEP_UP_OPTIONS,
        ...paths,
      }),
      (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
        && /requires postgres-v2/u.test(error.message),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("operational startup rejects legacy JSON authority before reading a corrupt finance store", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-finance-corrupt-startup-test-"));
  const paths = await createDurableStorePaths(root);
  try {
    await writeFile(paths.financeStorePath, '{"records":[]}\nnot-json');
    await assert.rejects(startApiServer({
        port: 0,
        runtimeProfile: "operational",
        persistenceAuthority: "file-current",
        sessionSecret: "operational-session-secret-32-bytes",
        ...OPERATIONAL_STEP_UP_OPTIONS,
        ...paths,
      }),
      (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
        && /requires postgres-v2/u.test(error.message),
    );
  } finally {
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

test("I18 S1-G legacy credential JSON probe is disabled for operational authority", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-cti-i18-test-"));
  const paths = await createDurableStorePaths(root);
  try {
    let apiStarted = false;
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
        apiStarted = true;
        throw new Error("operational JSON probe must fail before API startup");
      },
    });

    assert.equal(receipt.ok, false);
    assert.equal(receipt.status, "BLOCKED_CREDENTIAL_STORE_PRECONDITION_FAILED");
    assert.equal(receipt.reason, "operational_credential_json_authority_disabled");
    assert.equal(receipt.boundary.direct_invoke_only, true);
    assert.equal(receipt.boundary.credential_store_write_executed, false);
    assert.equal(apiStarted, false);
    await assert.rejects(
      readFile(paths.authCredentialStorePath, "utf8"),
      /ENOENT/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("I18 S1-G legacy credential JSON probe remains disabled when roster verification is requested", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-cti-i18-roster-test-"));
  const paths = await createDurableStorePaths(root);
  try {
    let apiStarted = false;
    const receipt = await buildCtiS1GAuthenticatedProductionProbeReceipt({
      event: {
        lawos_maintenance_action: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_ACTION,
        approval_signature_ref: CTI_S1G_AUTHENTICATED_PRODUCTION_PROBE_APPROVAL_REF,
        request_id: "unit-test-i18-current-roster",
        verify_current_hrx_roster: true,
      },
      env: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT: root,
        LAWOS_AUTH_CREDENTIAL_STORE_PATH: paths.authCredentialStorePath,
        AWS_LAMBDA_FUNCTION_NAME: "matter-lawos-api-prod",
      },
      apiBaseUrlFn: async () => {
        apiStarted = true;
        throw new Error("operational JSON probe must fail before API startup");
      },
    });

    assert.equal(receipt.status, "BLOCKED_CREDENTIAL_STORE_PRECONDITION_FAILED");
    assert.equal(receipt.reason, "operational_credential_json_authority_disabled");
    assert.equal(receipt.boundary.credential_store_write_executed, false);
    assert.equal(apiStarted, false);
  } finally {
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

test("Home finance production smoke reconciles dashboard numbers without returning row-level data", () => {
  const tenantId = "tenant_amic_matter_vault";
  const records = [
    {
      model_type: "BankImportBatch",
      bank_import_batch_id: "dashboard-smoke-batch",
      tenant_id: tenantId,
      transaction_count: 6,
      status: "reconciled",
      created_at: "2026-07-30T00:00:00.000Z",
    },
    ...[
      ["sales-current", "2026-07-05", "inflow", 21_000_000, 80_000_000],
      ["payroll-partner", "2026-07-25", "outflow", 6_000_000, 74_000_000],
      ["payroll-staff", "2026-07-25", "outflow", 3_000_000, 71_000_000],
      ["payroll-advisor", "2026-07-25", "outflow", 1_000_000, 70_000_000],
      ["rent-current", "2026-07-26", "outflow", 2_000_000, 68_000_000],
      ["sales-previous", "2026-06-12", "inflow", 10_000_000, 47_000_000],
    ].map(([id, date, direction, amount, balance], index) => ({
      model_type: "BankTransaction",
      bank_transaction_id: `dashboard-smoke-${id}`,
      bank_import_batch_id: "dashboard-smoke-batch",
      tenant_id: tenantId,
      account_ref: "dashboard-smoke-account",
      transaction_fingerprint: String(index + 1).repeat(64),
      date,
      occurred_at: `${date}T12:00:00+09:00`,
      direction,
      amount,
      balance_after: balance,
      currency: "KRW",
      classification_state: "confirmed",
    })),
    ...[
      ["sales-current", "2026-07-05", "inflow", 21_000_000, "sales", "client_receipt", null, null],
      ["payroll-partner", "2026-07-25", "outflow", 6_000_000, "payroll", "salary_payment", "partner", "employee-partner"],
      ["payroll-staff", "2026-07-25", "outflow", 3_000_000, "payroll", "salary_payment", "staff", "employee-staff"],
      ["payroll-advisor", "2026-07-25", "outflow", 1_000_000, "payroll", "salary_payment", "advisor", "employee-advisor"],
      ["rent-current", "2026-07-26", "outflow", 2_000_000, "operating_expense", "rent_office", null, null],
      ["sales-previous", "2026-06-12", "inflow", 10_000_000, "sales", "client_receipt", null, null],
    ].map(([id, date, direction, amount, primaryType, category, payrollCategory, employeeId]) => ({
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: `dashboard-smoke-classification-${id}`,
      tenant_id: tenantId,
      bank_transaction_id: `dashboard-smoke-${id}`,
      account_ref: "dashboard-smoke-account",
      transaction_date: date,
      transaction_month: date.slice(0, 7),
      transaction_direction: direction,
      amount,
      currency: "KRW",
      primary_type: primaryType,
      category,
      category_label: category === "rent_office" ? "임차·사무실" : category,
      payroll_category: payrollCategory,
      employee_id: employeeId,
      status: "confirmed",
    })),
  ];
  const repository = {
    list({ tenant_id, model_type }) {
      return records.filter((record) =>
        record.tenant_id === tenant_id && record.model_type === model_type);
    },
  };
  const receipt = buildHomeFinanceDashboardSmokeReceipt({
    financeRepository: repository,
    tenantId,
    now: () => new Date("2026-07-30T03:00:00.000Z"),
    requireCurrentActivity: true,
  });

  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.metrics.current_sales_krw, 21_000_000);
  assert.equal(receipt.metrics.current_payroll_krw, 10_000_000);
  assert.equal(receipt.metrics.current_non_payroll_outflow_krw, 2_000_000);
  assert.deepEqual(receipt.metrics.six_month_sales_krw, [0, 0, 0, 0, 10_000_000, 21_000_000]);
  assert.equal(Object.values(receipt.checks).every(Boolean), true);
  assert.equal(receipt.production_write_executed, false);
  assert.equal(receipt.raw_transaction_values_returned, false);
  assert.equal(receipt.individual_payroll_values_returned, false);
  assert.equal(JSON.stringify(receipt).includes("employee-partner"), false);
});

test("Home finance production smoke reads PostgreSQL finance data inside the request authority boundary", async () => {
  const tenantId = "tenant_amic_matter_vault";
  const calls = [];
  const repository = {
    list({ model_type }) {
      if (model_type === "BankImportBatch") {
        return [{
          model_type,
          tenant_id: tenantId,
          bank_import_batch_id: "postgres-dashboard-smoke-batch",
          transaction_count: 0,
          status: "reconciled",
        }];
      }
      return [];
    },
  };
  const receipt = await buildHomeFinanceDashboardSmokeFromRuntime({
    tenantId,
    runtime: {
      requestRuntimeAuthority: {
        run(input) {
          calls.push(input);
          return input.command({
            analyticsRuntime: { financeRepository: repository },
          });
        },
      },
    },
  });

  assert.equal(receipt.status, "PASS");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenant_id, tenantId);
  assert.equal(calls[0].request_context.method, "GET");
  assert.match(calls[0].request_context.pathname, /home-finance-dashboard-smoke/u);
});

test("Home finance production smoke fails closed for HTTP access, missing approval, and incomplete classification", async () => {
  const httpResponse = await handler({
    rawPath: "/api/maintenance/home-finance-dashboard-smoke",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
    approval_signature_ref: HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
  });
  assert.equal(httpResponse.statusCode, 403);
  assert.equal(
    JSON.parse(httpResponse.body).reason,
    "home_finance_dashboard_smoke_direct_invoke_only",
  );

  const approvalResponse = await handler({
    lawos_maintenance_action: HOME_FINANCE_DASHBOARD_SMOKE_ACTION,
  });
  assert.equal(approvalResponse.statusCode, 403);
  assert.equal(
    JSON.parse(approvalResponse.body).required_approval_signature_ref,
    HOME_FINANCE_DASHBOARD_SMOKE_APPROVAL_REF,
  );

  const records = [{
    model_type: "BankTransaction",
    bank_transaction_id: "dashboard-smoke-unclassified",
    tenant_id: "tenant_amic_matter_vault",
    account_ref: "dashboard-smoke-account",
    date: "2026-07-30",
    occurred_at: "2026-07-30T12:00:00+09:00",
    direction: "inflow",
    amount: 1_000,
    balance_after: 1_000,
    currency: "KRW",
    classification_state: "unreviewed",
  }];
  const receipt = buildHomeFinanceDashboardSmokeReceipt({
    financeRepository: {
      list({ tenant_id, model_type }) {
        return records.filter((record) =>
          record.tenant_id === tenant_id && record.model_type === model_type);
      },
    },
    now: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  assert.equal(receipt.status, "BLOCKED_HOME_FINANCE_DASHBOARD_CONTRACT");
  assert.equal(receipt.reason, "dashboard_numeric_contract_failed");
  assert.equal(receipt.checks.classifications_reconciled, false);
});

test("direct receipt allocation migration is dry-run first, idempotent, and never auto-promotes revenue", () => {
  const tenantId = "tenant_direct_receipt_migration_test";
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice-direct-receipt-migration",
        tenant_id: tenantId,
        matter_id: "matter-direct-receipt-migration",
        client_group_id: "client-direct-receipt-migration",
        amount_due: 100,
        amount_paid: 100,
        currency: "KRW",
        issued_at: "2026-07-30",
        status: "paid",
      },
      {
        model_type: "Payment",
        payment_id: "payment-direct-receipt-migration",
        tenant_id: tenantId,
        matter_id: "matter-direct-receipt-migration",
        client_group_id: "client-direct-receipt-migration",
        amount: 100,
        applied_amount: 100,
        unapplied_amount: 0,
        currency: "KRW",
        received_at: "2026-07-30",
        status: "matched",
      },
      {
        model_type: "PaymentMatch",
        payment_match_id: "match-direct-receipt-migration",
        tenant_id: tenantId,
        payment_id: "payment-direct-receipt-migration",
        invoice_id: "invoice-direct-receipt-migration",
        matter_id: "matter-direct-receipt-migration",
        amount: 100,
        currency: "KRW",
        matched_at: "2026-07-30",
        status: "matched",
      },
    ],
  });
  const dryRun = buildDirectReceiptAllocationMigrationReceipt({
    financeRepository,
    tenantId,
  });
  assert.equal(dryRun.status, "PASS_DRY_RUN");
  assert.equal(dryRun.before.pending_backfill_count, 1);
  assert.equal(dryRun.production_write_executed, false);
  assert.equal(
    financeRepository.list({ tenant_id: tenantId, model_type: "PaymentAllocation" }).length,
    0,
  );

  const execute = buildDirectReceiptAllocationMigrationReceipt({
    financeRepository,
    tenantId,
    execute: true,
    idempotencyKey: "direct-receipt-migration-test",
  });
  assert.equal(execute.status, "PASS");
  assert.equal(execute.created_count, 1);
  assert.equal(execute.after.pending_backfill_count, 0);
  assert.equal(execute.after.payment_allocation_count, 1);
  assert.equal(execute.auto_promoted_revenue_count, 0);
  assert.equal(execute.production_write_executed, true);

  const replay = buildDirectReceiptAllocationMigrationReceipt({
    financeRepository,
    tenantId,
    execute: true,
    idempotencyKey: "direct-receipt-migration-test",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.production_write_executed, false);
  assert.equal(replay.after.payment_allocation_count, 1);
});

test("direct receipt allocation migration uses the PostgreSQL request authority for read and write modes", async () => {
  const tenantId = "tenant_direct_receipt_runtime_test";
  const financeRepository = createFinanceRepository();
  const calls = [];
  const runtime = {
    requestRuntimeAuthority: {
      run: async (request) => {
        calls.push(request);
        return request.command({ financeRuntime: { repository: financeRepository } });
      },
    },
  };
  const dryRun = await buildDirectReceiptAllocationMigrationFromRuntime({
    runtime,
    tenantId,
  });
  assert.equal(dryRun.status, "PASS_DRY_RUN");
  assert.equal(calls[0].tenant_id, tenantId);
  assert.equal(calls[0].request_context.method, "GET");

  const execute = await buildDirectReceiptAllocationMigrationFromRuntime({
    runtime,
    tenantId,
    execute: true,
    idempotencyKey: "direct-receipt-runtime-test",
  });
  assert.equal(execute.status, "PASS");
  assert.equal(calls[1].request_context.method, "POST");
  assert.equal(calls[1].request_context.idempotency_key, "direct-receipt-runtime-test");
});

test("direct receipt allocation migration blocks HTTP, missing approval, and incomplete execute confirmation", async () => {
  const httpResponse = await handler({
    rawPath: "/api/maintenance/direct-receipt-allocation-migration",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
    approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
  });
  assert.equal(httpResponse.statusCode, 403);
  assert.equal(
    JSON.parse(httpResponse.body).reason,
    "direct_receipt_allocation_migration_direct_invoke_only",
  );

  const approvalResponse = await handler({
    lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
  });
  assert.equal(approvalResponse.statusCode, 403);
  assert.equal(
    JSON.parse(approvalResponse.body).required_approval_signature_ref,
    DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
  );

  const confirmationResponse = await handler({
    lawos_maintenance_action: DIRECT_RECEIPT_ALLOCATION_MIGRATION_ACTION,
    approval_signature_ref: DIRECT_RECEIPT_ALLOCATION_MIGRATION_APPROVAL_REF,
    execute: true,
    idempotency_key: "direct-receipt-migration-confirmation-test",
  });
  assert.equal(confirmationResponse.statusCode, 403);
  assert.equal(
    JSON.parse(confirmationResponse.body).required_confirmation,
    DIRECT_RECEIPT_ALLOCATION_MIGRATION_CONFIRMATION,
  );
});

test("approved HRX roster reconciliation creates the current members and reporting lines with backup-safe evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-hrx-roster-reconcile-"));
  const paths = await createDurableStorePaths(root);
  try {
    const receipt = await buildHrxRosterReconcileReceipt({
      env: {
        LAWOS_RUNTIME_PROFILE: "local-dev",
        LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT: root,
        LAWOS_HRX_STORE_PATH: paths.hrxStorePath,
      },
      now: () => new Date("2026-07-11T05:30:00.000Z"),
    });
    assert.equal(receipt.ok, true);
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.reconciliation.employees, 10);
    assert.equal(receipt.reconciliation.employees_created, 10);
    assert.equal(receipt.reconciliation.employment_profiles, 10);
    assert.equal(receipt.reconciliation.employment_profiles_created, 10);
    assert.equal(receipt.production_write_executed, true);
    assert.equal(receipt.employee_pii_returned, false);
    assert.equal(receipt.secret_value_returned, false);

    const repository = createSqlHrxRepository({ store: createFileHrxStore({ filePath: paths.hrxStorePath }) });
    assert.equal(repository.listEmployees({ tenant_id: "tenant_amic_matter_vault" }).length, 10);
    const profiles = repository.listEmploymentProfiles({ tenant_id: "tenant_amic_matter_vault" });
    assert.equal(profiles.find((profile) => profile.employee_id === "emp_amic_wsjo")?.manager_employee_id, "emp_amic_ytkim");
    assert.equal(profiles.find((profile) => profile.employee_id === "emp_amic_sypark")?.manager_employee_id, "emp_amic_ytkim");
    assert.equal(profiles.find((profile) => profile.employee_id === "emp_amic_yjlee")?.manager_employee_id, "emp_amic_tryoon");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("operational legacy migration writers fail closed without touching JSON stores", async () => {
  const env = { LAWOS_RUNTIME_PROFILE: "operational" };
  const receipts = await Promise.all([
    buildCtiS5EnrichmentExecuteReceipt({ env }),
    buildCtiCutoverExecuteRetryReceipt({ env }),
    buildHrxRosterReconcileReceipt({ env }),
  ]);
  assert.deepEqual(
    receipts.map((receipt) => receipt.status),
    [
      "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED",
      "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED",
      "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED",
    ],
  );
  assert.equal(receipts.every((receipt) => receipt.production_write_executed === false), true);
  assert.equal(receipts.every((receipt) => receipt.json_fallback === false), true);
  assert.equal(receipts.every((receipt) => receipt.dual_write === false), true);
});

test("approved legacy Matter JSON maintenance actions remain disabled in operational", async () => {
  const previousProfile = process.env.LAWOS_RUNTIME_PROFILE;
  process.env.LAWOS_RUNTIME_PROFILE = "operational";
  try {
    const actions = [
      [CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_ACTION, CTI_MATTER_DB_SNAPSHOT_MATERIALIZE_APPROVAL_REF],
      [CTI_MATTER_STORE_READ_MODEL_PROOF_ACTION, CTI_MATTER_STORE_READ_MODEL_PROOF_APPROVAL_REF],
      [CTI_CLIENT_DISPLAY_NAME_REPAIR_ACTION, CTI_CLIENT_DISPLAY_NAME_REPAIR_APPROVAL_REF],
    ];
    for (const [lawos_maintenance_action, approval_signature_ref] of actions) {
      const response = await handler({ lawos_maintenance_action, approval_signature_ref });
      assert.equal(response.statusCode, 424);
      const body = JSON.parse(response.body);
      assert.equal(body.status, "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED");
      assert.equal(body.production_write_executed, false);
      assert.equal(body.json_fallback, false);
      assert.equal(body.dual_write, false);
    }
  } finally {
    if (previousProfile === undefined) delete process.env.LAWOS_RUNTIME_PROFILE;
    else process.env.LAWOS_RUNTIME_PROFILE = previousProfile;
  }
});

test("HRX roster reconciliation surface is direct-invoke only and approval gated", async () => {
  const httpResponse = await handler({
    rawPath: "/api/maintenance/hrx-roster-reconcile",
    requestContext: { http: { method: "POST" } },
    maintenance_action: HRX_ROSTER_RECONCILE_ACTION,
    approval_signature_ref: HRX_ROSTER_RECONCILE_APPROVAL_REF,
  });
  assert.equal(httpResponse.statusCode, 403);
  assert.equal(JSON.parse(httpResponse.body).reason, "hrx_roster_reconcile_direct_invoke_only");

  const approvalResponse = await handler({ maintenance_action: HRX_ROSTER_RECONCILE_ACTION });
  assert.equal(approvalResponse.statusCode, 403);
  const approvalBody = JSON.parse(approvalResponse.body);
  assert.equal(approvalBody.reason, "hrx_roster_reconcile_approval_ref_required");
  assert.equal(approvalBody.required_approval_signature_ref, HRX_ROSTER_RECONCILE_APPROVAL_REF);
});

test("LCX-AUTH legacy reset JSON writer is disabled for operational authority", async () => {
  const artifactsRoot = resolve("artifacts", "tmp");
  await mkdir(artifactsRoot, { recursive: true });
  const root = await mkdtemp(join(artifactsRoot, "lawos-lcx-auth-reset-test-"));
  const paths = await createDurableStorePaths(root);
  const issuedAt = Date.now();
  try {
    const receipt = await buildLcxAuthResetRecoveryReceipt({
      event: {
        lawos_maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
        approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
        request_id: "unit-test-lcx-auth-reset",
        target_email: "jwsuh@amic.kr",
      },
      env: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_READONLY_SNAPSHOT_ALLOWED_ROOT: root,
        LAWOS_AUTH_PASSWORD_RESET_STORE_PATH: paths.authPasswordResetStorePath,
        LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
        LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL: "https://matter.example.test/api/auth/password-reset/open",
      },
      now: () => issuedAt,
    });

    assert.equal(receipt.ok, false);
    assert.equal(receipt.status, "BLOCKED_OPERATIONAL_JSON_AUTHORITY_DISABLED");
    assert.equal(receipt.reason, "operational_password_reset_json_authority_disabled");
    assert.equal(receipt.credential_store_write_executed, false);
    assert.equal(receipt.reset_token_store_write_executed, false);
    assert.equal(receipt.token_material_returned_to_caller, false);
    assert.equal(receipt.reset_url_returned_to_caller, false);
    assert.equal(receipt.production_ready_claim, false);
    assert.equal(receipt.go_live_claim, false);
    await assert.rejects(readFile(paths.authPasswordResetStorePath, "utf8"), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("LCX-AUTH reset recovery surface rejects HTTP and missing approval", async () => {
  const httpResponse = await handler({
    rawPath: "/api/maintenance/lcx-auth-reset-recovery",
    requestContext: { http: { method: "POST" } },
    lawos_maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
    approval_signature_ref: LCX_AUTH_RESET_RECOVERY_APPROVAL_REF,
  });

  assert.equal(httpResponse.statusCode, 403);
  const httpBody = JSON.parse(httpResponse.body);
  assert.equal(httpBody.reason, "lcx_auth_reset_recovery_direct_invoke_only");
  assert.equal(httpBody.public_http_endpoint, false);
  assert.equal(httpBody.token_material_returned_to_caller, false);
  assert.equal(httpBody.reset_url_returned_to_caller, false);

  const approvalResponse = await handler({
    lawos_maintenance_action: LCX_AUTH_RESET_RECOVERY_ACTION,
  });
  assert.equal(approvalResponse.statusCode, 403);
  const approvalBody = JSON.parse(approvalResponse.body);
  assert.equal(approvalBody.reason, "lcx_auth_reset_recovery_approval_ref_required");
  assert.equal(approvalBody.required_approval_signature_ref, LCX_AUTH_RESET_RECOVERY_APPROVAL_REF);
});
