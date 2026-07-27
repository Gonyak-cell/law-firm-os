import assert from "node:assert/strict";
import test from "node:test";

function desktopLocation() {
  return {
    protocol: "matter-app:",
    hostname: "app",
    port: "",
    username: "",
    password: "",
    search: "?desktop=1"
  };
}

test("password reset uses the packaged desktop bridge without returning sensitive inputs", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.window = {
    location: desktopLocation(),
    matterSession: {
      async requestPasswordReset(payload) {
        calls.push({ command: "request", payload });
        return { ok: true, accepted: true, token_material_returned: false };
      },
      async confirmPasswordReset(payload) {
        calls.push({ command: "confirm", payload });
        return { ok: true, accepted: true, activated: true, token_material_returned: false };
      }
    }
  };
  globalThis.fetch = async () => {
    throw new Error("desktop password reset must not bypass the main-process bridge");
  };

  try {
    const mod = await import(`../src/data/apiClient.js?password-reset-desktop=${Date.now()}`);
    const requested = await mod.requestLawosPasswordReset({ email: "staff@amic.kr" });
    const confirmed = await mod.confirmLawosPasswordReset({
      token: "reset-token-from-email",
      password: "new-password-123"
    });

    assert.deepEqual(requested, { ok: true, status: 200, reason: "" });
    assert.deepEqual(confirmed, { ok: true, status: 200, reason: "" });
    assert.deepEqual(calls, [
      { command: "request", payload: { email: "staff@amic.kr" } },
      {
        command: "confirm",
        payload: { token: "reset-token-from-email", password: "new-password-123" }
      }
    ]);
    assert.equal(JSON.stringify({ requested, confirmed }).includes("reset-token-from-email"), false);
    assert.equal(JSON.stringify({ requested, confirmed }).includes("new-password-123"), false);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});

test("password reset falls back to the public non-session API in a web renderer", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.window = { location: { protocol: "https:", search: "" } };
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const confirmation = input === "/api/auth/password-reset/confirm";
    return {
      status: confirmation ? 200 : 202,
      async json() {
        return confirmation
          ? { ok: true, accepted: true, activated: true }
          : { ok: true, accepted: true };
      }
    };
  };

  try {
    const mod = await import(`../src/data/apiClient.js?password-reset-web=${Date.now()}`);
    assert.equal((await mod.requestLawosPasswordReset({ email: "staff@amic.kr" })).ok, true);
    assert.equal((await mod.confirmLawosPasswordReset({
      token: "reset-token-from-email",
      password: "new-password-123"
    })).ok, true);

    assert.deepEqual(calls.map(({ input, init }) => ({
      input,
      method: init.method,
      body: JSON.parse(init.body)
    })), [
      {
        input: "/api/auth/password-reset/request",
        method: "POST",
        body: { email: "staff@amic.kr" }
      },
      {
        input: "/api/auth/password-reset/confirm",
        method: "POST",
        body: { token: "reset-token-from-email", password: "new-password-123" }
      }
    ]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
