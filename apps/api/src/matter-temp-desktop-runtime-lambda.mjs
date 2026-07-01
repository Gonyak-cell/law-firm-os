import https from "node:https";
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  MATTER_VAULT_USER_REGISTRATION_SEED,
  findRegisteredAccountByEmail,
  normalizeAccountEmail,
  registeredAccountPublicRef,
} from "./matter-vault-account-registry.js";

const seed = MATTER_VAULT_USER_REGISTRATION_SEED;

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-matter-actor-email"
});
const HTML_HEADERS = Object.freeze({
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
});

const FEATURE_CATALOG = Object.freeze([
  {
    feature_id: "matter_vault_dashboard",
    label: "Matter-Vault dashboard",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_search",
    label: "Matter-Vault search",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_file_bridge",
    label: "Desktop file bridge handoff",
    minimum_role: "matter_vault_user",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_audit",
    label: "Matter-Vault audit read",
    minimum_role: "matter_vault_admin",
    synthetic_runtime_supported: true
  },
  {
    feature_id: "matter_vault_admin",
    label: "Matter-Vault admin controls",
    minimum_role: "system_super_admin",
    synthetic_runtime_supported: true
  }
]);

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const PASSWORD_HASH_ITERATIONS = 120_000;
const PASSWORD_MIN_LENGTH = 8;
const MAX_PERSISTED_RESET_TOKENS = 20;
const MAX_PERSISTED_OUTBOX_MESSAGES = 20;
const PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 = "sesv2";
const PASSWORD_RESET_LOGO_CONTENT_ID = "matter-app-logo";
const PASSWORD_RESET_LOGO_FILE_NAME = "icon-source-mark.png";
const PASSWORD_RESET_LOGO_MIME_TYPE = "image/png";
const PASSWORD_RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;
const PASSWORD_RESET_LOGO_CANDIDATES = Object.freeze([
  new URL(`./${PASSWORD_RESET_LOGO_FILE_NAME}`, import.meta.url),
  new URL("../../desktop/build/icon-source-mark.png", import.meta.url)
]);

const memoryAuthState = (globalThis.__matterDesktopAuthState ??= {
  passwordCredentials: new Map(),
  resetTokens: new Map(),
  outbox: [],
  sessionGeneration: new Map()
});

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  };
}

function htmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: HTML_HEADERS,
    body
  };
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function hashOpaqueToken(token) {
  return `sha256:${sha256Hex(token)}`;
}

function normalizeEmail(email) {
  return normalizeAccountEmail(email);
}

function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(String(password), salt, PASSWORD_HASH_ITERATIONS, 32, "sha256").toString("hex");
  return {
    algorithm: "pbkdf2-sha256",
    iterations: PASSWORD_HASH_ITERATIONS,
    salt,
    hash
  };
}

function verifyPassword(credential, password) {
  if (!credential?.hash || !credential?.salt) return false;
  const candidate = hashPassword(password, credential.salt);
  return safeEqualHex(candidate.hash, credential.hash);
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(String(left)) || !/^[a-f0-9]{64}$/i.test(String(right))) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function persistentAuthStateSecretName() {
  return process.env.MATTER_DESKTOP_AUTH_STATE_SECRET_NAME ?? process.env.AUTH_STATE_SECRET_NAME ?? "";
}

function emptyAuthState() {
  return {
    passwordCredentials: new Map(),
    resetTokens: new Map(),
    outbox: [],
    sessionGeneration: new Map()
  };
}

function pruneAuthState(state) {
  const now = Date.now();
  const activeResetEntries = [...state.resetTokens.entries()]
    .filter(([, reset]) => !reset.used_at && Date.parse(reset.expires_at) > now)
    .sort(([, left], [, right]) => Date.parse(right.expires_at) - Date.parse(left.expires_at))
    .slice(0, MAX_PERSISTED_RESET_TOKENS);
  const activeResetHashes = new Set(activeResetEntries.map(([tokenHash]) => tokenHash));

  state.resetTokens.clear();
  for (const [tokenHash, reset] of activeResetEntries) state.resetTokens.set(tokenHash, reset);

  state.outbox = state.outbox
    .filter((message) => {
      const resetToken = String(message.reset_token ?? "");
      return Date.parse(message.expires_at) > now && activeResetHashes.has(hashOpaqueToken(resetToken));
    })
    .slice(-MAX_PERSISTED_OUTBOX_MESSAGES);

  return state;
}

function authStateToSecretString(state) {
  pruneAuthState(state);
  return JSON.stringify({
    schema_version: "law-firm-os.matter-desktop-auth-state.v0.1",
    updated_at: new Date().toISOString(),
    password_credentials: Object.fromEntries(state.passwordCredentials),
    reset_tokens: Object.fromEntries(state.resetTokens),
    outbox: state.outbox.slice(-100),
    session_generation: Object.fromEntries(state.sessionGeneration)
  });
}

function authStateFromSecretString(secretString = "{}") {
  const parsed = JSON.parse(secretString || "{}");
  return {
    passwordCredentials: new Map(Object.entries(parsed.password_credentials ?? {})),
    resetTokens: new Map(Object.entries(parsed.reset_tokens ?? {})),
    outbox: Array.isArray(parsed.outbox) ? parsed.outbox : [],
    sessionGeneration: new Map(Object.entries(parsed.session_generation ?? {}).map(([key, value]) => [key, Number(value) || 0]))
  };
}

function awsJsonRpcRequest({ service, target, body }) {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-northeast-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  if (!accessKeyId || !secretAccessKey) throw new Error("aws_credentials_unavailable");

  const host = `${service}.${region}.amazonaws.com`;
  const payload = JSON.stringify(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers = {
    "content-type": "application/x-amz-json-1.1",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": target
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, sha256Hex(payload)].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");

  return new Promise((resolvePromise, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: host,
        path: "/",
        headers: {
          ...headers,
          authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
          "content-length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            const error = new Error(parsed.__type ?? parsed.code ?? `aws_${service}_error`);
            error.statusCode = res.statusCode;
            error.body = parsed;
            reject(error);
            return;
          }
          resolvePromise(parsed);
        });
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function awsRestJsonRequest({ service, method = "POST", hostname, path, body, region: requestedRegion }) {
  const region = requestedRegion ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-northeast-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  if (!accessKeyId || !secretAccessKey) throw new Error("aws_credentials_unavailable");

  const payload = JSON.stringify(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers = {
    "content-type": "application/json",
    host: hostname,
    "x-amz-date": amzDate
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, sha256Hex(payload)].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");

  return new Promise((resolvePromise, reject) => {
    const request = https.request(
      {
        method,
        hostname,
        path,
        headers: {
          ...headers,
          authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
          "content-length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            const error = new Error(parsed.__type ?? parsed.code ?? `aws_${service}_error`);
            error.statusCode = res.statusCode;
            error.body = parsed;
            reject(error);
            return;
          }
          resolvePromise(parsed);
        });
      }
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function loadAuthState() {
  const secretName = persistentAuthStateSecretName();
  if (!secretName) return memoryAuthState;
  try {
    const result = await awsJsonRpcRequest({
      service: "secretsmanager",
      target: "secretsmanager.GetSecretValue",
      body: { SecretId: secretName }
    });
    return authStateFromSecretString(result.SecretString);
  } catch (error) {
    if (String(error.message).includes("ResourceNotFoundException")) return emptyAuthState();
    throw error;
  }
}

async function saveAuthState(state) {
  const secretName = persistentAuthStateSecretName();
  if (!secretName) return;
  await awsJsonRpcRequest({
    service: "secretsmanager",
    target: "secretsmanager.PutSecretValue",
    body: {
      SecretId: secretName,
      SecretString: authStateToSecretString(state),
      ClientRequestToken: randomUUID()
    }
  });
}

function headerValue(headers = {}, name) {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === normalizedName) return value;
  }
  return undefined;
}

function bearerToken(event = {}) {
  const authorization = headerValue(event.headers, "authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization));
  return match?.[1]?.trim();
}

function requireOperatorToken(event = {}) {
  const expectedHash = process.env.OPERATOR_TOKEN_SHA256 ?? "";
  if (!expectedHash) {
    return response(503, {
      ok: false,
      reason: "operator_token_not_configured",
      token_material_returned: false
    });
  }
  const token = bearerToken(event);
  if (!token) {
    return response(401, {
      ok: false,
      reason: "operator_token_required",
      token_material_returned: false
    });
  }
  if (!safeEqualHex(sha256Hex(token), expectedHash)) {
    return response(403, {
      ok: false,
      reason: "operator_token_invalid",
      token_material_returned: false
    });
  }
  return null;
}

function parseBody(event = {}) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(raw);
}

function users(state) {
  return seed.users.map((user) => ({
    ...registeredAccountPublicRef(user),
    password_state: state.passwordCredentials.has(normalizeEmail(user.email)) ? "password_set" : "reset_required"
  }));
}

function findUser(email) {
  return findRegisteredAccountByEmail(email, seed);
}

function sessionFor(user, state) {
  const email = normalizeEmail(user.email);
  return {
    state: "signed_in",
    mode: "aws-temporary-execute-api",
    synthetic_only: true,
    tenant_id: seed.tenant_id,
    user_id: user.user_id,
    email: user.email,
    display_name: user.display_name,
    highest_privilege: user.highest_privilege,
    privilege_rank: user.privilege_rank,
    role_ids: user.role_ids,
    group_ids: user.group_ids,
    scopes: user.scopes,
    session_generation: state.sessionGeneration.get(email) ?? 0,
    token_material_returned: false
  };
}

function featureAccessFor(user) {
  return FEATURE_CATALOG.map((feature) => {
    const allowed =
      feature.minimum_role === "matter_vault_user"
        ? user.role_ids.includes("matter_vault_user")
        : user.role_ids.includes(feature.minimum_role);
    return {
      ...feature,
      allowed,
      decision: allowed ? "allow" : "deny"
    };
  });
}

function actorFromEvent(event = {}, body = {}) {
  return (
    body.email ??
    body.actor_email ??
    event.headers?.["x-matter-actor-email"] ??
    event.headers?.["X-Matter-Actor-Email"] ??
    event.queryStringParameters?.email ??
    event.queryStringParameters?.actor_email
  );
}

function publicResetUrl(token) {
  return `matter://password-reset/confirm?token=${encodeURIComponent(token)}`;
}

function publicResetOpenUrl(token, event = {}, env = process.env) {
  const configured = String(
    env.MATTER_PASSWORD_RESET_OPEN_BASE_URL ??
      env.MATTER_DESKTOP_PASSWORD_RESET_OPEN_BASE_URL ??
      ""
  ).trim().replace(/\/+$/, "");
  if (configured) {
    return `${configured}/api/desktop/password-reset/open?token=${encodeURIComponent(token)}`;
  }
  const host = headerValue(event.headers, "x-forwarded-host") ??
    headerValue(event.headers, "host") ??
    event.requestContext?.domainName;
  if (!host) return publicResetUrl(token);
  const protocol = headerValue(event.headers, "x-forwarded-proto") ?? "https";
  const stage = event.requestContext?.stage;
  const stagePrefix = stage && stage !== "$default" ? `/${stage}` : "";
  return `${protocol}://${host}${stagePrefix}/api/desktop/password-reset/open?token=${encodeURIComponent(token)}`;
}

function passwordResetOpenPage(token) {
  const resetUrl = publicResetUrl(token);
  const safeResetUrl = escapeHtml(resetUrl);
  const safeResetToken = escapeHtml(token);
  return htmlResponse(200, [
    "<!doctype html>",
    '<html lang="ko">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>matter 비밀번호 설정</title>",
    '<style>body{margin:0;background:#f7f6f2;color:#17212b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Apple SD Gothic Neo,Noto Sans KR,sans-serif}.wrap{max-width:560px;margin:48px auto;padding:0 20px}.panel{background:#fff;border:1px solid #ded8cc;border-radius:8px;padding:28px}h1{margin:0 0 12px;font-size:26px;line-height:34px}p{font-size:15px;line-height:24px;color:#4b5563}.button{display:inline-block;margin:8px 0 22px;background:#17212b;color:#fff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700}.code{font-family:SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace;word-break:break-all;background:#faf9f6;border:1px solid #e5dfd4;border-radius:6px;padding:12px;color:#111827}.hint{font-size:13px;color:#6b7280}</style>',
    "</head>",
    "<body>",
    '<main class="wrap"><section class="panel">',
    "<h1>비밀번호를 설정하세요</h1>",
    "<p>아래 버튼을 눌러 matter 앱을 열고 새 비밀번호를 설정하세요. 브라우저가 앱 열기를 묻는 경우 허용을 선택하세요.</p>",
    `<a class="button" href="${safeResetUrl}">matter 앱에서 열기</a>`,
    '<p class="hint">앱이 자동으로 열리지 않으면 로그인 화면의 비밀번호 설정 화면에서 아래 코드를 직접 입력하세요.</p>',
    `<div class="code">${safeResetToken}</div>`,
    "</section></main>",
    "</body>",
    "</html>"
  ].join(""));
}

let passwordResetLogoPngBase64;

function passwordResetLogo() {
  if (passwordResetLogoPngBase64) return passwordResetLogoPngBase64;
  for (const candidate of PASSWORD_RESET_LOGO_CANDIDATES) {
    try {
      passwordResetLogoPngBase64 = readFileSync(candidate).toString("base64");
      return passwordResetLogoPngBase64;
    } catch {
      // Try the next packaged/source-tree logo location.
    }
  }
  return "";
}

function passwordResetEmailConfig(env = process.env) {
  const delivery = String(env.MATTER_PASSWORD_RESET_EMAIL_DELIVERY ?? env.MATTER_DESKTOP_PASSWORD_RESET_EMAIL_DELIVERY ?? "")
    .trim()
    .toLowerCase();
  const requested = delivery === PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 || delivery === "ses" || delivery === "aws_ses_v2";
  const fromEmail = String(env.MATTER_PASSWORD_RESET_EMAIL_FROM ?? env.MATTER_DESKTOP_PASSWORD_RESET_EMAIL_FROM ?? "").trim();
  const fromName = String(
    env.MATTER_PASSWORD_RESET_EMAIL_FROM_NAME ??
      env.MATTER_DESKTOP_PASSWORD_RESET_EMAIL_FROM_NAME ??
      "Matter Desktop App Services"
  ).trim();
  const replyToEmail = String(env.MATTER_PASSWORD_RESET_EMAIL_REPLY_TO ?? env.MATTER_DESKTOP_PASSWORD_RESET_EMAIL_REPLY_TO ?? "").trim();
  const region = String(
    env.MATTER_PASSWORD_RESET_EMAIL_REGION ?? env.MATTER_DESKTOP_PASSWORD_RESET_EMAIL_REGION ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "ap-northeast-2"
  ).trim();
  return {
    requested,
    configured: requested && Boolean(fromEmail),
    mode: requested ? "sesv2_email" : "synthetic_email_outbox",
    provider: requested ? PASSWORD_RESET_EMAIL_DELIVERY_SES_V2 : "synthetic_outbox",
    fromEmail,
    fromName,
    replyToEmail,
    region,
    reason: requested && !fromEmail ? "password_reset_email_from_required" : undefined
  };
}

function passwordResetEmailSubject() {
  return "matter 비밀번호 설정";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formattedEmailAddress({ name, email }) {
  const address = String(email ?? "").trim();
  const displayName = String(name ?? "").trim();
  return displayName ? `${displayName} <${address}>` : address;
}

function emailHeaderValue(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function base64Utf8(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function base64MimeLines(value) {
  return String(value).match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function encodedMimeWord(value) {
  return `=?UTF-8?B?${base64Utf8(value)}?=`;
}

function passwordResetEmailText({ resetUrl, resetOpenUrl, resetToken, expiresAt }) {
  return [
    "matter OS 비밀번호 설정",
    "",
    "요청하신 matter OS 비밀번호 설정 링크입니다.",
    "아래 링크를 열어 새 비밀번호를 설정하세요.",
    resetOpenUrl,
    "",
    "브라우저에서 앱이 열리지 않는 경우 아래 앱 링크를 직접 열 수 있습니다.",
    resetUrl,
    "",
    "앱에서 코드를 직접 입력해야 하는 경우 아래 설정 코드를 사용하세요.",
    resetToken,
    "",
    `이 링크와 코드는 ${expiresAt}까지 한 번만 사용할 수 있습니다.`,
    "본인이 요청하지 않았다면 이 메일을 무시하세요."
  ].join("\n");
}

function passwordResetEmailHtml({ resetUrl, resetOpenUrl, resetToken, expiresAt, logoSrc = `cid:${PASSWORD_RESET_LOGO_CONTENT_ID}` }) {
  const safeResetUrl = escapeHtml(resetUrl);
  const safeResetOpenUrl = escapeHtml(resetOpenUrl);
  const safeResetToken = escapeHtml(resetToken);
  const safeExpiresAt = escapeHtml(expiresAt);
  const safeLogoSrc = escapeHtml(logoSrc);
  return [
    "<!doctype html>",
    '<html lang="ko">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f5f4f0;color:#1f2933;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,Malgun Gothic,sans-serif;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f4f0;margin:0;padding:28px 0;">',
    '<tr><td align="center" style="padding:0 16px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #ded8cc;border-radius:8px;overflow:hidden;">',
    '<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #ece7de;background:#ffffff;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">',
    '<tr>',
    `<td style="padding:0 12px 0 0;vertical-align:middle;"><img src="${safeLogoSrc}" width="58" height="39" alt="matter" style="display:block;width:58px;height:39px;border:0;outline:none;text-decoration:none;"></td>`,
    '<td style="padding:0;vertical-align:middle;">',
    '<div style="font-size:17px;line-height:23px;font-weight:700;letter-spacing:0;color:#17212b;">Matter Desktop App Services</div>',
    '<div style="font-size:12px;line-height:18px;color:#6b7280;margin-top:3px;">AMIC 내부 계정 보안 알림</div>',
    "</td>",
    "</tr>",
    "</table>",
    "</td></tr>",
    '<tr><td style="padding:28px;">',
    '<h1 style="margin:0 0 12px;font-size:24px;line-height:32px;font-weight:700;letter-spacing:0;color:#17212b;">비밀번호를 설정하세요</h1>',
    '<p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#374151;">요청하신 matter OS 비밀번호 설정 링크입니다. 아래 버튼을 열어 새 비밀번호를 설정하세요.</p>',
    `<p style="margin:0 0 24px;"><a href="${safeResetOpenUrl}" style="display:inline-block;background:#17212b;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-size:15px;line-height:20px;font-weight:700;">비밀번호 설정 열기</a></p>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5dfd4;border-radius:8px;background:#faf9f6;margin:0 0 20px;">',
    '<tr><td style="padding:16px 18px;">',
    '<div style="font-size:13px;line-height:20px;color:#4b5563;margin-bottom:8px;">앱에서 코드를 직접 입력해야 하는 경우</div>',
    `<div style="font-family:SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace;font-size:15px;line-height:22px;color:#111827;word-break:break-all;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;">${safeResetToken}</div>`,
    `<div style="font-size:12px;line-height:18px;color:#6b7280;margin-top:10px;word-break:break-all;">앱 링크: ${safeResetUrl}</div>`,
    "</td></tr>",
    "</table>",
    `<p style="margin:0 0 10px;font-size:13px;line-height:21px;color:#4b5563;">이 링크와 코드는 <strong style="color:#17212b;">${safeExpiresAt}</strong>까지 한 번만 사용할 수 있습니다.</p>`,
    '<p style="margin:0;font-size:13px;line-height:21px;color:#6b7280;">본인이 요청하지 않았다면 이 메일을 무시하세요. 기존 비밀번호나 세션은 이 메일만으로 변경되지 않습니다.</p>',
    "</td></tr>",
    '<tr><td style="padding:18px 28px;border-top:1px solid #ece7de;background:#fbfaf8;">',
    '<p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">matter OS는 AMIC 내부 업무 계정에 한해 이 알림을 보냅니다.</p>',
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>"
  ].join("");
}

function passwordResetRawEmail({ config, to, resetUrl, resetOpenUrl, resetToken, expiresAt }) {
  const rootBoundary = `matter-reset-root-${randomUUID()}`;
  const alternativeBoundary = `matter-reset-alt-${randomUUID()}`;
  const from = emailHeaderValue(formattedEmailAddress({ name: config.fromName, email: config.fromEmail }));
  const recipient = emailHeaderValue(to);
  const logoBase64 = passwordResetLogo();
  const headers = [
    `From: ${from}`,
    `To: ${recipient}`,
    `Subject: ${encodedMimeWord(passwordResetEmailSubject())}`,
    "MIME-Version: 1.0",
    ...(config.replyToEmail ? [`Reply-To: ${emailHeaderValue(config.replyToEmail)}`] : []),
    `Content-Type: multipart/related; boundary="${rootBoundary}"`
  ];
  const textBody = base64MimeLines(base64Utf8(passwordResetEmailText({ resetUrl, resetOpenUrl, resetToken, expiresAt })));
  const htmlBody = base64MimeLines(base64Utf8(passwordResetEmailHtml({ resetUrl, resetOpenUrl, resetToken, expiresAt })));
  const parts = [
    ...headers,
    "",
    `--${rootBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    textBody,
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlBody,
    `--${alternativeBoundary}--`
  ];
  if (logoBase64) {
    parts.push(
      `--${rootBoundary}`,
      `Content-Type: ${PASSWORD_RESET_LOGO_MIME_TYPE}; name="matter-logo.png"`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${PASSWORD_RESET_LOGO_CONTENT_ID}>`,
      'Content-Disposition: inline; filename="matter-logo.png"',
      "",
      base64MimeLines(logoBase64)
    );
  }
  parts.push(`--${rootBoundary}--`, "");
  return Buffer.from(parts.join("\r\n"), "utf8").toString("base64");
}

async function sendPasswordResetSesEmail({ config, to, resetUrl, resetOpenUrl, resetToken, expiresAt }) {
  const result = await awsRestJsonRequest({
    service: "ses",
    region: config.region,
    hostname: `email.${config.region}.amazonaws.com`,
    path: "/v2/email/outbound-emails",
    body: {
      FromEmailAddress: formattedEmailAddress({ name: config.fromName, email: config.fromEmail }),
      Destination: {
        ToAddresses: [to]
      },
      ...(config.replyToEmail ? { ReplyToAddresses: [config.replyToEmail] } : {}),
      Content: {
        Raw: {
          Data: passwordResetRawEmail({ config, to, resetUrl, resetOpenUrl, resetToken, expiresAt })
        }
      }
    }
  });
  return result.MessageId;
}

async function deliverPasswordResetEmail({ to, resetUrl, resetOpenUrl, resetToken, expiresAt }) {
  const config = passwordResetEmailConfig();
  if (!config.configured) {
    return {
      mode: config.mode,
      provider: config.provider,
      status: "stored",
      reason: config.reason,
      token_material_returned: false
    };
  }

  try {
    const messageId = await sendPasswordResetSesEmail({ config, to, resetUrl, resetOpenUrl, resetToken, expiresAt });
    return {
      mode: config.mode,
      provider: config.provider,
      status: "sent",
      message_id: messageId,
      token_material_returned: false
    };
  } catch (error) {
    return {
      mode: config.mode,
      provider: config.provider,
      status: "failed",
      reason: error.body?.message ?? error.message ?? "password_reset_email_send_failed",
      token_material_returned: false
    };
  }
}

function passwordResetPublicDelivery() {
  const config = passwordResetEmailConfig();
  return {
    mode: config.mode,
    status: "accepted",
    token_material_returned: false,
    message_id_returned: false
  };
}

async function requestPasswordReset(body = {}, state, event = {}) {
  const email = normalizeEmail(body.email);
  const user = findUser(email);
  if (user) {
    const token = createOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
    const normalizedUserEmail = normalizeEmail(user.email);
    for (const reset of state.resetTokens.values()) {
      if (reset.email === normalizedUserEmail && !reset.used_at) reset.used_at = new Date().toISOString();
    }
    state.resetTokens.set(tokenHash, {
      token_hash: tokenHash,
      email: normalizedUserEmail,
      user_id: user.user_id,
      expires_at: expiresAt,
      used_at: null
    });
    const message = {
      id: `synthetic-reset-${state.outbox.length + 1}`,
      to: user.email,
      subject: "matter password reset",
      body: "Use this one-time matter reset link to set your desktop password.",
      reset_url: publicResetUrl(token),
      reset_open_url: publicResetOpenUrl(token, event),
      reset_token: token,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
    state.outbox.push(message);
    message.delivery = await deliverPasswordResetEmail({
      to: user.email,
      resetUrl: message.reset_url,
      resetOpenUrl: message.reset_open_url,
      resetToken: token,
      expiresAt
    });
    pruneAuthState(state);
  }
  return response(200, {
    ok: true,
    accepted: true,
    email_delivery: passwordResetPublicDelivery(),
    token_material_returned: false
  });
}

function latestSyntheticResetEmail(body = {}, state) {
  const email = normalizeEmail(body.email);
  const latest = [...state.outbox].reverse().find((message) => normalizeEmail(message.to) === email);
  if (!latest) {
    return response(404, {
      ok: false,
      reason: "reset_email_not_found",
      token_material_returned: false
    });
  }
  return response(200, {
    ok: true,
    email_message: latest,
    synthetic_only: true,
    token_material_returned: true
  });
}

function confirmPasswordReset(body = {}, state) {
  const token = String(body.token ?? body.reset_token ?? "");
  const password = String(body.password ?? body.new_password ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return response(400, {
      ok: false,
      reason: "password_too_short",
      minimum_length: PASSWORD_MIN_LENGTH,
      token_material_returned: false
    });
  }
  const tokenHash = hashOpaqueToken(token);
  const reset = state.resetTokens.get(tokenHash);
  if (!reset || reset.used_at || Date.parse(reset.expires_at) <= Date.now()) {
    return response(401, {
      ok: false,
      reason: "invalid_reset_token",
      token_material_returned: false
    });
  }
  const user = findUser(reset.email);
  if (!user) {
    return response(401, {
      ok: false,
      reason: "invalid_reset_token",
      token_material_returned: false
    });
  }
  reset.used_at = new Date().toISOString();
  state.passwordCredentials.set(normalizeEmail(user.email), hashPassword(password));
  state.sessionGeneration.set(normalizeEmail(user.email), (state.sessionGeneration.get(normalizeEmail(user.email)) ?? 0) + 1);
  return response(200, {
    ok: true,
    accepted: true,
    activated: true,
    token_material_returned: false
  });
}

function loginWithPassword(body = {}, state) {
  const allowedKeys = new Set(["email", "password"]);
  const unexpectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length > 0) {
    return response(400, {
      ok: false,
      reason: "email_password_only",
      unexpected_fields: unexpectedKeys,
      token_material_returned: false
    });
  }
  if (!body.email || !body.password) {
    return response(400, {
      ok: false,
      reason: "email_password_required",
      token_material_returned: false
    });
  }
  const user = findUser(body.email);
  if (!user) {
    return response(401, {
      ok: false,
      reason: "auth_required",
      token_material_returned: false
    });
  }
  const credential = state.passwordCredentials.get(normalizeEmail(user.email));
  if (!credential) {
    return response(403, {
      ok: false,
      reason: "password_reset_required",
      token_material_returned: false
    });
  }
  if (!verifyPassword(credential, body.password)) {
    return response(401, {
      ok: false,
      reason: "auth_required",
      token_material_returned: false
    });
  }
  return response(200, {
    ok: true,
    session: sessionFor(user, state),
    features: featureAccessFor(user),
    token_material_returned: false
  });
}

function routeFromEvent(event = {}) {
  const method = event.httpMethod ?? event.requestContext?.http?.method ?? "GET";
  const path = event.path ?? event.rawPath ?? "/";
  return { method: method.toUpperCase(), path: path.replace(/\/+$/, "") || "/" };
}

function health() {
  const emailConfig = passwordResetEmailConfig();
  return response(200, {
    ok: true,
    service: "matter-temp-desktop-runtime",
    mode: "aws-temporary-execute-api",
    custom_domain_required: false,
    tenant_id: seed.tenant_id,
    registered_account_count: seed.users.length,
    highest_privilege_account: seed.highest_privilege_account.email,
    synthetic_only: true,
    operator_token_required_for_runtime_routes: true,
    operator_token_configured: Boolean(process.env.OPERATOR_TOKEN_SHA256),
    password_login_required: true,
    password_reset_delivery_mode: emailConfig.mode,
    password_reset_email_provider: emailConfig.provider,
    password_reset_email_configured: emailConfig.configured,
    password_reset_email_reason: emailConfig.reason,
    password_credential_store: persistentAuthStateSecretName() ? "aws_secrets_manager" : "ephemeral_lambda_memory",
    production_ready_completed: false,
    public_release_completed: false
  });
}

export async function handler(event = {}) {
  const { method, path } = routeFromEvent(event);
  if (method === "OPTIONS") return response(204, {});

  if ((path === "/" || path === "/health") && method === "GET") return health();

  if (path === "/api/desktop/password-reset/open" && method === "GET") {
    const token = String(event.queryStringParameters?.token ?? "");
    if (!PASSWORD_RESET_TOKEN_PATTERN.test(token)) {
      return htmlResponse(400, "<!doctype html><html><body>Invalid password reset link.</body></html>");
    }
    return passwordResetOpenPage(token);
  }

  if (path === "/api/desktop/accounts" && method === "GET") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return response(200, {
      ok: true,
      tenant_id: seed.tenant_id,
      count: seed.users.length,
      users: users(state),
      token_material_returned: false
    });
  }

  if (path === "/api/desktop/login" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return loginWithPassword(parseBody(event), state);
  }

  if (path === "/api/desktop/password-reset/request" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const result = await requestPasswordReset(parseBody(event), state, event);
    await saveAuthState(state);
    return result;
  }

  if (path === "/api/desktop/password-reset/latest-email" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    return latestSyntheticResetEmail(parseBody(event), state);
  }

  if (path === "/api/desktop/password-reset/confirm" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const result = confirmPasswordReset(parseBody(event), state);
    if (result.statusCode === 200) await saveAuthState(state);
    return result;
  }

  if (path === "/api/matter-vault/features" && method === "GET") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const state = await loadAuthState();
    const user = findUser(actorFromEvent(event));
    if (!user) return response(401, { ok: false, reason: "unknown_seed_account" });
    return response(200, {
      ok: true,
      session: sessionFor(user, state),
      features: featureAccessFor(user)
    });
  }

  if (path === "/api/matter-vault/smoke" && method === "POST") {
    const authError = requireOperatorToken(event);
    if (authError) return authError;
    const body = parseBody(event);
    const user = findUser(actorFromEvent(event, body));
    if (!user) return response(401, { ok: false, reason: "unknown_seed_account" });
    const requestedFeature = body.feature_id ?? "matter_vault_dashboard";
    const feature = featureAccessFor(user).find((candidate) => candidate.feature_id === requestedFeature);
    if (!feature) return response(404, { ok: false, reason: "unknown_feature" });
    return response(feature.allowed ? 200 : 403, {
      ok: feature.allowed,
      decision: feature.decision,
      feature_id: feature.feature_id,
      actor_email: user.email,
      tenant_id: seed.tenant_id,
      synthetic_only: true,
      real_client_data_used: false,
      production_ready_completed: false
    });
  }

  return response(404, {
    ok: false,
    reason: "not_found",
    path,
    method
  });
}
