import {
  validateFormalPackageLoopbackNativeLauncherCapability,
} from "./formal-package-loopback-qa.mjs";
import { fail } from "./formal-deployed-api-io.mjs";

const CAPABILITIES = new WeakSet();
let activeCapability = null;

export function authorizeFormalDeployedApiLauncher(nativeCapability, { platform } = {}) {
  try {
    validateFormalPackageLoopbackNativeLauncherCapability(nativeCapability, { platform });
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_LAUNCHER_REQUIRED", "formal deployed API execution requires the sanitized OS launcher");
  }
  const capability = Object.freeze({ platform, nativeCapability });
  CAPABILITIES.add(capability);
  activeCapability = capability;
  return capability;
}

export function validateFormalDeployedApiLauncherCapability(capability, { platform } = {}) {
  if (!CAPABILITIES.has(capability) || capability !== activeCapability || capability.platform !== platform) {
    fail("FORMAL_DEPLOYED_API_QA_LAUNCHER_REQUIRED", "formal deployed API execution requires the sanitized OS launcher");
  }
  return capability;
}

export function consumeFormalDeployedApiLauncherCapability({ platform } = {}) {
  const capability = validateFormalDeployedApiLauncherCapability(activeCapability, { platform });
  activeCapability = null;
  CAPABILITIES.delete(capability);
  return capability;
}
