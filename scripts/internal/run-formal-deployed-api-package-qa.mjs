#!/usr/bin/env node
import {
  claimFormalPackageLoopbackNativeLauncher,
} from "../lib/formal-package-loopback-qa.mjs";
import {
  authorizeFormalDeployedApiLauncher,
} from "../lib/formal-deployed-api-launcher.mjs";

const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : null;

try {
  const nativeCapability = claimFormalPackageLoopbackNativeLauncher({ platform });
  authorizeFormalDeployedApiLauncher(nativeCapability, { platform });
  await import("./formal-deployed-api-package-qa-main.mjs");
} catch {
  process.stderr.write(`${JSON.stringify({ verdict: "BLOCKED_BY_AUTHORITY", error_code: "FORMAL_DEPLOYED_API_QA_LAUNCHER_REQUIRED", actual_deployment_pass: false, production_contact_count: 0 })}\n`);
  process.exitCode = 2;
}
