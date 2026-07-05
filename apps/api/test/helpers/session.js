import assert from "node:assert/strict";
import {
  findRegisteredAccountByEmail,
  highestPrivilegeRegisteredAccount,
} from "../../src/matter-vault-account-registry.js";

const sessionHeaderCache = new Map();

export function registeredAccount(email) {
  const account = findRegisteredAccountByEmail(email);
  assert.ok(account, `registered account ${email} should exist`);
  return account;
}

export async function apiLogin(baseUrl, account = highestPrivilegeRegisteredAccount()) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: account.email,
      password: account.local_dev.synthetic_token,
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.session_token, /^lawos_session_v1\./);
  return body;
}

export async function apiSessionHeaders(baseUrl, account = highestPrivilegeRegisteredAccount()) {
  const signed = await apiLogin(baseUrl, account);
  return { authorization: `Bearer ${signed.session_token}` };
}

function sessionHeaderCacheKey(baseUrl, account) {
  return `${baseUrl}|${account?.email ?? "highest-privilege"}`;
}

export async function signedHeaders(baseUrl, account = highestPrivilegeRegisteredAccount()) {
  const key = sessionHeaderCacheKey(baseUrl, account);
  if (!sessionHeaderCache.has(key)) sessionHeaderCache.set(key, await apiSessionHeaders(baseUrl, account));
  return sessionHeaderCache.get(key);
}

export async function authedJson(baseUrl, path, options = {}) {
  const { account, noAuth, ...requestOptions } = options;
  const headers = {
    ...(noAuth ? {} : await signedHeaders(baseUrl, account)),
    ...(options.headers ?? {}),
  };
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[key];
  }
  const body =
    options.body && typeof options.body === "object" && !(options.body instanceof ArrayBuffer)
      ? JSON.stringify(options.body)
      : options.body;
  if (body !== undefined && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers, body });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
