import assert from "node:assert/strict";
import test from "node:test";
import {
  STEP_UP_PROVIDER_CONTRACT_VERSION,
  createLocalInternalStepUpProvider,
  createStepUpProviderInterface,
} from "../src/index.js";

test("local/internal step-up has no default proof or production-provider claim", () => {
  assert.throws(
    () => createLocalInternalStepUpProvider(),
    /verifyProof is required; no default proof is available/,
  );
  const provider = createLocalInternalStepUpProvider({
    factors: ["totp", "passkey"],
    verifyProof: async () => ({ ok: false, reason: "proof_invalid" }),
  });

  assert.equal(provider.contract_version, STEP_UP_PROVIDER_CONTRACT_VERSION);
  assert.equal(provider.local_internal, true);
  assert.equal(provider.production_provider_claim, false);
});

test("step-up provider rejects unsupported factors without calling the adapter", async () => {
  let calls = 0;
  const provider = createStepUpProviderInterface({
    providerId: "test-provider",
    factors: ["totp"],
    verify: async () => {
      calls += 1;
      return { ok: true, assertion_id: "unexpected" };
    },
  });

  const result = await provider.verify({ factor: "passkey", proof: "must-not-return" });

  assert.deepEqual(result, {
    ok: false,
    reason: "step_up_factor_unsupported",
    provider_id: "test-provider",
    factor: "passkey",
  });
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(result).includes("must-not-return"), false);
});

test("explicit local/internal adapter returns only assertion metadata", async () => {
  const observed = [];
  const provider = createLocalInternalStepUpProvider({
    providerId: "test-local-provider",
    factors: ["totp"],
    verifyProof: async (input) => {
      observed.push(input);
      return input.proof === "123456"
        ? { ok: true, assertion_id: "assertion-001", secret: "must-not-return" }
        : { ok: false, reason: "proof_invalid", secret: "must-not-return" };
    },
  });

  const rejected = await provider.verify({ factor: "totp", proof: "000000", purpose: "security_audit" });
  const accepted = await provider.verify({ factor: "totp", proof: "123456", purpose: "security_audit" });

  assert.equal(observed.length, 2);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "step_up_verification_failed");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.assertion_id, "assertion-001");
  assert.equal(accepted.provider_id, "test-local-provider");
  assert.equal(accepted.production_provider_claim, false);
  assert.equal(JSON.stringify([rejected, accepted]).includes("123456"), false);
  assert.equal(JSON.stringify([rejected, accepted]).includes("must-not-return"), false);
});

test("provider exceptions fail closed without returning adapter error material", async () => {
  const provider = createStepUpProviderInterface({
    providerId: "failing-provider",
    factors: ["passkey"],
    verify: async () => {
      throw new Error("provider response included reusable-proof-material");
    },
  });

  const result = await provider.verify({ factor: "passkey", proof: "reusable-proof-material" });

  assert.deepEqual(result, {
    ok: false,
    reason: "step_up_verification_failed",
    provider_id: "failing-provider",
    factor: "passkey",
    assertion_id: null,
    production_provider_claim: false,
  });
  assert.equal(JSON.stringify(result).includes("reusable-proof-material"), false);
});
