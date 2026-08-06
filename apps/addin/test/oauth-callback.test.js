import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const addinRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const callbackSource = await readFile(path.join(addinRoot, "public/oauth-callback.js"), "utf8");

function executeCallback(history) {
  const delivered = [];
  const output = [];
  const status = { textContent: "" };
  const window = {
    history,
    location: {
      hash: "#code=test-code&state=test-state",
      origin: "https://addin.example.test",
      pathname: "/addin/oauth-callback.html",
    },
    Office: {
      onReady(callback) {
        callback();
      },
      context: {
        ui: {
          messageParent(message, options) {
            delivered.push({ message, options });
          },
        },
      },
    },
  };

  vm.runInNewContext(callbackSource, {
    document: {
      getElementById() {
        return status;
      },
    },
    console: {
      error(...values) {
        output.push(...values);
      },
      log(...values) {
        output.push(...values);
      },
      warn(...values) {
        output.push(...values);
      },
    },
    URLSearchParams,
    window,
  });

  return { delivered, output, status };
}

test("OAuth callback still reaches Office when history replacement is unavailable", async (t) => {
  for (const [name, history] of [
    ["missing history", undefined],
    ["non-function replaceState", { replaceState: null }],
    [
      "throwing replaceState",
      {
        replaceState() {
          throw new TypeError("replaceState is unavailable");
        },
      },
    ],
  ]) {
    await t.test(name, () => {
      const result = executeCallback(history);

      assert.equal(result.delivered.length, 1);
      assert.deepEqual(JSON.parse(result.delivered[0].message), {
        type: "lawos-outlook-oauth",
        state: "test-state",
        code: "test-code",
        error: "",
      });
      assert.equal(result.delivered[0].options.targetOrigin, "https://addin.example.test");
      assert.equal(result.status.textContent, "연결 응답을 전달했습니다. 이 창을 닫아도 됩니다.");
      assert.equal(result.output.length, 0);
      assert.equal(result.status.textContent.includes("test-code"), false);
      assert.equal(result.status.textContent.includes("test-state"), false);
    });
  }
});

test("OAuth callback scrubs the authorization response from the dialog URL", () => {
  const replacements = [];
  const result = executeCallback({
    replaceState(...args) {
      replacements.push(args);
    },
  });

  assert.deepEqual(replacements, [[null, "", "/addin/oauth-callback.html"]]);
  assert.equal(replacements.flat().includes("test-code"), false);
  assert.equal(replacements.flat().includes("test-state"), false);
  assert.equal(result.delivered.length, 1);
});
