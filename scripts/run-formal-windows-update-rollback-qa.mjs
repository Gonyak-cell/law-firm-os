#!/usr/bin/env node
import { requireConfiguredWindowsUpdateRollbackRunner } from "./lib/windows-formal-update-approval.mjs";

requireConfiguredWindowsUpdateRollbackRunner({
  platform: process.platform,
  productionApprovalVerifier: null,
});

throw new Error("unreachable: no Windows mutation runner is configured");
