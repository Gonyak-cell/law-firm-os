import { scryptSync } from "node:crypto";

export const IDENTITY_LEDGER_CONTRACT_VERSION = "law-firm-os.identity-ledger.v4";
export const IDENTITY_LEDGER_METHODS = Object.freeze([
  "provisionDirectoryUser",
  "findDirectoryUserByEmail",
  "findDirectoryUserByUserId",
  "listDirectoryUsers",
  "ensureAccount",
  "getAccount",
  "setCredential",
  "ensureFederatedAccount",
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
  "enqueuePasswordReset",
  "claimPasswordResetJobs",
  "finishPasswordResetJob",
  "createBreakGlassRequest",
  "transitionBreakGlassRequest",
  "listBreakGlassRequests",
  "appendSecurityAudit",
  "listSecurityAudit",
]);

export function hashIdentityToken(token) {
  return scryptSync(String(token ?? ""), "lawos-identity-challenge-v1", 32, {
    N: 1_024,
    r: 8,
    p: 1,
    maxmem: 4 * 1024 * 1024,
  }).toString("hex");
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
