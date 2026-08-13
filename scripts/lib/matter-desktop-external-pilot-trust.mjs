import { verifyProductionTrustedRegistry } from "./external-release-trust.mjs";

export function resolveExternalPilotTrustRegistry({ testOnlyTrustRoot = null, now = Date.now() } = {}) {
  if (testOnlyTrustRoot == null) return verifyProductionTrustedRegistry();
  return verifyProductionTrustedRegistry({ testOnlyPolicy: testOnlyTrustRoot, now });
}
