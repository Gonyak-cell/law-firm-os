import assert from "node:assert/strict";
import { highestPrivilegeRegisteredAccount } from "../../src/matter-vault-account-registry.js";

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
