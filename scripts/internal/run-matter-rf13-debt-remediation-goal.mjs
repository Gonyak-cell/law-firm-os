#!/usr/bin/env node

import {
  claimFormalPackageLoopbackNativeLauncher,
} from "../lib/formal-package-loopback-launcher.mjs";
import { main } from "../validate-matter-rf13-debt-remediation-goal.mjs";

try {
  const launcherCapability = claimFormalPackageLoopbackNativeLauncher({ platform: "macos" });
  process.exitCode = await main(process.argv.slice(2), { launcherCapability });
} catch {
  process.stderr.write(`${JSON.stringify({
    validator: "matter-rf13-debt-remediation-goal",
    verdict: "BLOCKED_BY_AUTHORITY",
    code: "RF13_GOAL_OPERATIONAL_LAUNCHER_REQUIRED",
  })}\n`);
  process.exitCode = 2;
}
