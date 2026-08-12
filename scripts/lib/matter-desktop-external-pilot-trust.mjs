import {
  ExternalReleaseTrustError,
  verifyProductionTrustedRegistry,
  verifyTrustedRegistry,
} from "./external-release-trust.mjs";

export function resolveExternalPilotTrustRegistry({ testOnlyTrustRoot = null, now = Date.now() } = {}) {
  if (testOnlyTrustRoot == null) return verifyProductionTrustedRegistry();
  if (process.env.NODE_ENV !== "test"
      || !testOnlyTrustRoot
      || typeof testOnlyTrustRoot !== "object"
      || Array.isArray(testOnlyTrustRoot)
      || testOnlyTrustRoot.test_only !== true
      || Object.keys(testOnlyTrustRoot).sort().join("\0") !== [
        "registryPath",
        "registrySha256",
        "rootDir",
        "test_only",
      ].sort().join("\0")) {
    throw new ExternalReleaseTrustError(
      "TEST_TRUST_ROOT_FORBIDDEN",
      "a caller-selected trust registry is allowed only through the explicit NODE_ENV=test API",
    );
  }
  return verifyTrustedRegistry({
    rootDir: testOnlyTrustRoot.rootDir,
    registryPath: testOnlyTrustRoot.registryPath,
    registrySha256: testOnlyTrustRoot.registrySha256,
    now,
  });
}
