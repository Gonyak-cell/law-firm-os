import { createHash } from "node:crypto";

export const IDENTITY_LEDGER_CONTRACT_VERSION = "law-firm-os.identity-ledger.v2";
export const IDENTITY_LEDGER_METHODS = Object.freeze([
  "ensureAccount",
  "getAccount",
  "setCredential",
  "requirePasswordReset",
  "recordLoginFailure",
  "completeLogin",
  "validateSession",
  "revokeSession",
  "setAccountStatus",
  "createChallenge",
  "validateChallenge",
  "consumeChallenge",
  "revokeChallengesForUser",
  "createBreakGlassRequest",
  "transitionBreakGlassRequest",
  "listBreakGlassRequests",
  "appendSecurityAudit",
  "listSecurityAudit",
]);

export function hashIdentityToken(token) {
  return createHash("sha256").update(String(token ?? ""), "utf8").digest("hex");
}

export function assertIdentityLedger(repository) {
  if (!repository || repository.contract_version !== IDENTITY_LEDGER_CONTRACT_VERSION) {
    throw new TypeError(`identity repository must implement ${IDENTITY_LEDGER_CONTRACT_VERSION}`);
  }
  for (const method of IDENTITY_LEDGER_METHODS) {
    if (typeof repository[method] !== "function") throw new TypeError(`identity repository method is required: ${method}`);
  }
  return repository;
}
