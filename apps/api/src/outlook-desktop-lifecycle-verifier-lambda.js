import {
  OutlookDesktopLifecycleVerifierError,
  executeOutlookDesktopLifecycleVerifier,
} from "./outlook-desktop-lifecycle-verifier.js";

export const OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ENABLED_ENV =
  "LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ENABLED";

export function createOutlookDesktopLifecycleVerifierHandler({
  env = process.env,
  execute = executeOutlookDesktopLifecycleVerifier,
} = {}) {
  if (!env || typeof env !== "object" || typeof execute !== "function") {
    throw new TypeError("lifecycle verifier handler configuration is invalid");
  }
  return async function outlookDesktopLifecycleVerifierHandler(event) {
    if (env[OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ENABLED_ENV] !== "true") {
      throw new OutlookDesktopLifecycleVerifierError(
        "OUTLOOK_LIFECYCLE_RUNTIME_DISABLED",
        "isolated Outlook lifecycle verifier is disabled",
        503,
      );
    }
    return execute({ event, env });
  };
}

// Infrastructure must opt in explicitly; importing the module never enables the runtime.
export const handler = createOutlookDesktopLifecycleVerifierHandler();
