import { sign } from "node:crypto";

import { canonicalBytes } from "./outlook-desktop-activation-contract-fixture.js";

export function useActivationTestEnvironment() {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  return () => {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  };
}

export function hasCode(code) {
  return (error) => error?.code === code;
}

export function clone(value) {
  return structuredClone(value);
}

export function withRequest(item, mutate) {
  const request = clone(item.request);
  mutate(request);
  return { ...item.verification_input, activation_request: request };
}

export function withReceipt(item, mutate, key = item.keys.operator.privateKey) {
  const receipt = clone(item.receipt);
  mutate(receipt);
  const bytes = canonicalBytes(receipt);
  return {
    ...item.verification_input,
    operator_receipt_bytes: bytes,
    operator_receipt_signature_bytes: sign(null, bytes, key),
  };
}
