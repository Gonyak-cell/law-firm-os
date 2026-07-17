# Law Firm OS Runtime-Safety 147-TUW Command Catalog

## Status and authority

- Purpose: freeze every TUW rerun recipe before goal creation so execution cannot invent commands, reuse a shared result, or infer an approval.
- Governing plan: `.omo/plans/lawos-runtime-safety-goal-recovery-20260717.md`.
- Catalog cardinality: exactly 147 unique TUW rows: 113 historical rows and 34 DMS/PRJ/OFF/CUT rows.
- Materialization: Todo 5 must parse this document into `workbook/lawos-runtime-safety-evidence/evidence-rerun-manifest-v0.2.json` without changing a target rule, recipe, command, selector, parser, timeout, or result slice. The materializer records this file's SHA-256 and rejects any unknown row or recipe.
- Execution unit: one fresh process group per TUW. A command result may not be shared across rows even when two rows use the same recipe. The complete ordered output for row `<ID>` is always `isolated:<ID>:all`.
- Human decisions: a recipe validates an already-existing authority artifact; it never generates, replays, or infers the human decision.

## Closed execution envelope

All recipes use the following envelope unless a recipe explicitly narrows it:

```json
{
  "cwd": "{{TARGET_CHECKOUT}}",
  "shell": false,
  "stdin": "closed",
  "env": {
    "CI": "1",
    "TZ": "UTC",
    "LANG": "C.UTF-8",
    "LC_ALL": "C.UTF-8",
    "GIT_OPTIONAL_LOCKS": "0",
    "AWS_EC2_METADATA_DISABLED": "true",
    "NO_PROXY": "127.0.0.1,localhost,::1"
  },
  "unset_env_prefixes": [
    "AWS_",
    "AZURE_",
    "GOOGLE_",
    "MSAL_",
    "POPBILL_"
  ],
  "allowed_injected_env": [
    "LAWOS_TEST_POSTGRES_URL",
    "LAWOS_APPROVAL_TRUST_REGISTRY_SHA256"
  ],
  "timeout_ms": 900000,
  "kill_grace_ms": 5000,
  "parser": "ordered-process-results-v1",
  "result_slice": "isolated:{{TUW_ID}}:all"
}
```

`LAWOS_TEST_POSTGRES_URL` may name only the lane-owned disposable loopback PostgreSQL instance created by the dependency materializer; the receipt stores a redacted endpoint hash and requires `skipped=0`. `LAWOS_APPROVAL_TRUST_REGISTRY_SHA256` is accepted only by a real approval recipe. The runner rejects any other injected variable, any network target other than loopback and the separately ledgered standalone-clone Git/npm read, any shell metacharacter, or any command not listed below.

## Exact target-source rules

| Rule | Exact source |
| --- | --- |
| `T_GOV` | `1d2df30e235d3080aaa877bb6e01b0a43be8e5c5` |
| `T_SA` | `6429851bc161007984c78d36bc7ea04b1aeaf03d` |
| `T_SB` | `b323b4bc2fc554f1df3fa9f400056c754aac3876` |
| `T_DUR` | `90e241bf4f06004974e7a97592f07309873f0131` |
| `T_STO` | `3cdbd3db10d22b02aac5c718324702e0d96520ac` |
| `T_BKP` | `79025ea354b4e7009f916e74eba21713ae927a6d` |
| `T_DBF` | `86f4566eac262f82b10220f78bc9e2b4721135eb` |
| `T_IDN` | `81593387661b40046fcdd91482397d74dbd6c3df` |
| `T_DOM` | `49768ead507457e03a9036d8720873c1e45ccf00` |
| `T_DMS` | exact recorded `S_DMS` SHA/tree from Todo 28 |
| `T_PRJ` | exact recorded `S_PRJ` SHA/tree from Todo 39 |
| `T_OFF` | exact recorded `S_OFF_SELECTED` SHA/tree and selected outcome from Todo 45 |
| `T_CUT` | exact identical `S_CUT === S_INTEGRATION` SHA/tree from Todo 47 |

Every symbolic rule must resolve from the signed lineage ledger to one 40-hex SHA and one tree before execution. A missing, ambiguous, ancestor-only, or changed resolution fails before the first command.

## Recipe registry

Each `argv` value is a literal argv array. `{{...}}` interpolation is limited to the named, hash-recorded lineage/evidence paths below and is performed without a shell. Every `*_APPROVAL_RECEIPT_OR_NONE` resolves either to the validated absolute receipt path recorded in the lineage ledger or to the literal nonexistent sentinel `/private/tmp/lawos-approvals/ABSENT`; validators must map that sentinel to `APPROVAL_REQUIRED` without opening a network connection or writing product state. `TUW_OUTPUT_DIR` is `/private/tmp/lawos-runtime-safety-tuw-runs-20260717/<TUW-ID>/<outcome>`. `PRJ_DECISION_SOURCE_SHA` is `D_PRJ`; `OFF_DECISION_SOURCE_SHA` is `D_OFF`; packet blobs and final-source variables resolve only from the signed lineage ledger. No interpolation may insert an argv element, remove an argv element, or contain whitespace/control characters.

### Historical governance recipes

`R_GOV_BASE`

```json
[
  ["git", "fetch", "--prune", "origin", "main"],
  ["git", "rev-parse", "HEAD", "HEAD^{tree}", "origin/main"],
  ["git", "merge-base", "--is-ancestor", "b46a686f719875c6980ecba9bc213a605f58fa45", "origin/main"],
  ["git", "status", "--porcelain=v1"]
]
```

`R_GOV_ROOT`

```json
[
  ["node", "{{TOOLCHAIN}}/scripts/verify-runtime-safety-root-sentinel.mjs", "--target", "{{TARGET_CHECKOUT}}", "--expected-source-sha", "{{TARGET_SOURCE_SHA}}", "--require-git-optional-locks-zero"]
]
```

`R_GOV_WRITER`

```json
[
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"],
  ["node", "scripts/validate-runtime-safety-governance.mjs"]
]
```

`R_GOV_PLAN`

```json
[
  ["node", "scripts/validate-runtime-safety-governance.mjs"]
]
```

`R_GOV_BASELINES`

```json
[
  ["node", "--test", "apps/desktop/test/single-instance.test.mjs", "apps/desktop/test/app-protocol.test.mjs", "apps/api/test/cors-negative.test.js", "packages/persistence/test/durable-file.test.js", "packages/persistence/test/postgres-transaction.test.js"],
  ["node", "scripts/validate-matter-desktop-security.mjs"],
  ["node", "scripts/validate-hrx-security-negative-tests.mjs"],
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"],
  ["node", "scripts/validate-runtime-safety-governance.mjs"]
]
```

`R_GOV_GOAL`

```json
[
  ["node", "{{TOOLCHAIN}}/scripts/validate-runtime-safety-goal-authority.mjs", "--goal-record", "{{PLATFORM_GOAL_RECORD}}", "--expected-goal-id", "{{PLATFORM_GOAL_ID}}", "--expected-plan-sha256", "{{FINAL_PLAN_SHA256}}", "--expected-status", "active"]
]
```

### Historical source/local recipes

`R_SA_INSTANCE`

```json
[
  ["node", "--test", "apps/desktop/test/single-instance.test.mjs", "apps/desktop/test/auth-coordinator.test.mjs"]
]
```

`R_SA_STEPUP`

```json
[
  ["node", "--test", "apps/api/test/hrx/step-up-route.test.js", "apps/api/test/operational-step-up-preflight.test.js", "packages/authz/test/hrx-step-up-session.test.js"],
  ["node", "scripts/validate-hrx-security-negative-tests.mjs"]
]
```

`R_SA_TERMINAL`

```json
[
  ["node", "--test", "apps/desktop/test/single-instance.test.mjs", "apps/desktop/test/auth-coordinator.test.mjs", "apps/api/test/hrx/step-up-route.test.js", "apps/api/test/operational-step-up-preflight.test.js", "packages/authz/test/hrx-step-up-session.test.js"],
  ["node", "scripts/validate-matter-desktop-security.mjs"],
  ["node", "scripts/validate-hrx-security-negative-tests.mjs"]
]
```

`R_SB_PROTOCOL`

```json
[
  ["node", "--test", "apps/desktop/test/app-protocol.test.mjs", "apps/desktop/test/shell-smoke.test.mjs", "apps/api/test/cors-negative.test.js"],
  ["node", "scripts/validate-matter-desktop-security.mjs"]
]
```

`R_SB_NATIVE`

```json
[
  ["node", "--test", "apps/desktop/test/app-protocol.test.mjs"],
  ["./node_modules/.bin/electron", "apps/desktop/test/fixtures/app-protocol-electron.mjs"]
]
```

`R_SB_PACKAGE`

```json
[
  ["npm", "run", "prepare:web-renderer"],
  ["npm", "run", "build"],
  ["node", "{{TOOLCHAIN}}/scripts/run-runtime-safety-internal-package-smoke.mjs", "--repo", "{{TARGET_CHECKOUT}}", "--unsigned", "--unnotarized", "--no-distribute"]
]
```

`R_DUR`

```json
[
  ["node", "--test", "packages/persistence/test/durable-file.test.js", "packages/persistence/test/multi-process-generation.test.js", "packages/persistence/test/store-fault-injection.test.js", "packages/persistence/test/store-permissions.test.js", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_WRITER`

```json
[
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"]
]
```

`R_STO_MATTER`

```json
[
  ["npm", "--workspace", "packages/matter", "test"],
  ["node", "--test", "apps/api/test/matter-vault-persistence.test.js", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_CRM_INTAKE`

```json
[
  ["npm", "--workspace", "packages/crm", "test"],
  ["npm", "--workspace", "packages/intake", "test"],
  ["node", "--test", "apps/api/test/crm-intake-api.test.js", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_MASTER`

```json
[
  ["npm", "--workspace", "packages/master-data", "test"],
  ["node", "--test", "apps/api/test/master-data-runtime.test.js", "apps/api/test/master-data-api.test.js", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_HRX`

```json
[
  ["npm", "--workspace", "packages/hrx", "test"],
  ["node", "--test", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_FINANCE`

```json
[
  ["npm", "--workspace", "packages/billing", "test"],
  ["node", "--test", "packages/persistence/test/store-adapter-cas.test.js"],
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"]
]
```

`R_STO_ANALYTICS`

```json
[
  ["npm", "--workspace", "packages/analytics", "test"],
  ["node", "--test", "apps/api/test/home-dashboard-api.test.js", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_PORTAL_AI`

```json
[
  ["npm", "--workspace", "packages/client-portal", "test"],
  ["npm", "--workspace", "packages/ai-governance", "test"],
  ["node", "--test", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_STO_DMS`

```json
[
  ["npm", "--workspace", "packages/dms", "test"],
  ["node", "--test", "apps/api/test/vault-dms-postgres-runtime.test.js", "packages/persistence/test/store-adapter-cas.test.js", "packages/persistence/test/durable-file.test.js", "packages/persistence/test/multi-process-generation.test.js", "packages/persistence/test/store-fault-injection.test.js", "packages/persistence/test/store-permissions.test.js"]
]
```

`R_STO_READINESS`

```json
[
  ["node", "--test", "packages/platform/test/ui-readiness-runtime.test.js", "packages/enterprise/test/enterprise-readiness-runtime.test.js", "packages/persistence/test/store-adapter-cas.test.js"],
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"]
]
```

`R_STO_AUTH`

```json
[
  ["node", "--test", "apps/api/test/session-auth-api.test.js", "apps/api/test/auth-restart-revocation.test.js", "apps/api/test/auth-concurrency.test.js", "packages/persistence/test/store-adapter-cas.test.js"],
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"]
]
```

`R_STO_AUDIT`

```json
[
  ["node", "--test", "apps/api/test/admin-security-durable-audit.test.js", "packages/persistence/test/durable-file.test.js", "packages/persistence/test/multi-process-generation.test.js", "packages/persistence/test/store-fault-injection.test.js", "packages/persistence/test/store-permissions.test.js"]
]
```

`R_STO_TERMINAL`

```json
[
  ["node", "scripts/validate-runtime-store-writer-coverage.mjs"],
  ["node", "scripts/validate-runtime-safety-governance.mjs"],
  ["node", "--test", "packages/persistence/test/store-adapter-cas.test.js"]
]
```

`R_BKP`

```json
[
  ["node", "--test", "packages/persistence/test/s3-backup-queue.test.js", "scripts/test/runtime-store-backup-restore.test.mjs", "scripts/test/matter-vault-backup-restore.test.mjs", "packages/persistence/test/store-permissions.test.js"],
  ["npm", "--workspace", "packages/persistence", "test"]
]
```

`R_DBF`

```json
[
  ["node", "--test", "packages/persistence/test/postgres-transaction.test.js", "packages/persistence/test/postgres-repository-contract.test.js", "apps/api/test/persistence-authority.test.js"],
  ["npm", "--workspace", "packages/persistence", "test"],
  ["npm", "--workspace", "packages/matter", "test"],
  ["node", "{{TOOLCHAIN}}/scripts/run-runtime-safety-disposable-postgres-qa.mjs", "--repo", "{{TARGET_CHECKOUT}}", "--source-sha", "{{TARGET_SOURCE_SHA}}", "--require-skipped", "0"],
  ["node", "scripts/validate-hrx-security-negative-tests.mjs"]
]
```

`R_IDN`

```json
[
  ["node", "--test", "packages/persistence/test/postgres-transaction.test.js", "packages/persistence/test/postgres-repository-contract.test.js", "apps/api/test/session-auth-api.test.js", "apps/api/test/auth-restart-revocation.test.js", "apps/api/test/auth-concurrency.test.js", "apps/api/test/admin-security-api.test.js", "apps/api/test/hrx/step-up-route.test.js", "packages/runtime-auth/test/step-up-provider.test.js", "apps/desktop/test/auth-coordinator.test.mjs", "apps/desktop/test/session-cleanup.test.mjs"],
  ["node", "{{TOOLCHAIN}}/scripts/run-runtime-safety-disposable-postgres-qa.mjs", "--repo", "{{TARGET_CHECKOUT}}", "--source-sha", "{{TARGET_SOURCE_SHA}}", "--scenario", "identity", "--require-skipped", "0"],
  ["node", "scripts/validate-matter-desktop-security.mjs"],
  ["node", "scripts/validate-runtime-safety-governance.mjs"]
]
```

`R_DOM_FOUNDATION`

```json
[
  ["node", "--test", "packages/persistence/test/postgres-transaction.test.js", "packages/persistence/test/postgres-repository-contract.test.js"]
]
```

`R_DOM_MASTER`

```json
[
  ["npm", "--workspace", "packages/master-data", "test"],
  ["node", "--test", "apps/api/test/master-data-runtime.test.js", "apps/api/test/master-data-api.test.js"]
]
```

`R_DOM_MATTER`

```json
[
  ["npm", "--workspace", "packages/matter", "test"],
  ["node", "--test", "apps/api/test/matter-vault-persistence.test.js", "apps/api/test/matter-worktree-authorization.test.js"]
]
```

`R_DOM_CRM_INTAKE`

```json
[
  ["npm", "--workspace", "packages/crm", "test"],
  ["npm", "--workspace", "packages/intake", "test"],
  ["node", "--test", "apps/api/test/crm-intake-api.test.js"]
]
```

`R_DOM_HRX`

```json
[
  ["npm", "--workspace", "packages/hrx", "test"],
  ["node", "--test", "apps/api/test/hrx-durable-runtime.test.js"]
]
```

`R_DOM_FINANCE`

```json
[
  ["npm", "--workspace", "packages/billing", "test"],
  ["node", "--test", "apps/api/test/finance-postgres-adapter.test.js"]
]
```

`R_DOM_PORTAL_AI`

```json
[
  ["npm", "--workspace", "packages/client-portal", "test"],
  ["npm", "--workspace", "packages/ai-governance", "test"]
]
```

`R_DOM_TERMINAL`

```json
[
  ["node", "scripts/validate-central-ledger-domain-completeness.mjs"],
  ["node", "scripts/validate-runtime-safety-governance.mjs"]
]
```

### Post-legacy recipes

`R_DMS_DECISION`

```json
[
  ["node", "scripts/validate-dms-provider-authority-decision.mjs", "--packet", "workbook/lawos-dms-provider-authority-decision-packet-2026-07-16.md", "--source-sha", "{{S_DMS}}", "--action", "dms-provider-authority", "--environment", "source-local", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--approval-receipt", "{{DMS_APPROVAL_RECEIPT_OR_NONE}}"]
]
```

`R_DMS_SOURCE`

```json
[
  ["node", "--test", "packages/dms/test/central-ledger.test.js", "packages/dms/test/upload-reconciliation.test.js", "packages/dms/test/document-state-machine.test.js", "packages/dms/test/runtime-services.test.js", "apps/api/test/vault-dms-postgres-runtime.test.js", "apps/api/test/vault-search-preferences.test.js", "apps/api/test/e2e/vault-search-acl.test.js", "apps/api/test/e2e/vault-storage-security.test.js", "packages/persistence/test/postgres-transaction.test.js", "packages/persistence/test/postgres-repository-contract.test.js"],
  ["node", "scripts/run-dms-source-driver.mjs", "--profile", "local-disposable-postgres", "--scenario", "all", "--source-sha", "{{S_DMS}}", "--output-dir", "{{TUW_OUTPUT_DIR}}/driver"],
  ["node", "scripts/validate-dms-source-readiness.mjs", "--source-only", "--expected-source-sha", "{{S_DMS}}"]
]
```

`R_DMS_PROVIDER`

```json
[
  ["node", "scripts/run-dms-provider-preflight.mjs", "--source-sha", "{{S_DMS}}", "--packet", "workbook/lawos-dms-provider-authority-decision-packet-2026-07-16.md", "--approval-receipt", "{{DMS_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--preflight-only", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_PRJ_HOME`

```json
[
  ["node", "--test", "apps/api/test/home-dashboard-api.test.js", "packages/persistence/test/postgres-transaction.test.js", "packages/persistence/test/postgres-repository-contract.test.js", "apps/web/test/home-dashboard-r1.test.mjs"]
]
```

`R_PRJ_ANALYTICS`

```json
[
  ["node", "--test", "packages/analytics/test/runtime-services.test.js", "apps/api/test/cmp-r4-g8-analytics.test.js"]
]
```

`R_PRJ_DECISION`

```json
[
  ["node", "scripts/validate-readiness-authority-decision.mjs", "--packet", "workbook/lawos-readiness-authority-decision-packet-2026-07-17.json", "--source-sha", "{{PRJ_DECISION_SOURCE_SHA}}", "--action", "readiness-authority", "--environment", "source-local", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--approval-receipt", "{{PRJ_APPROVAL_RECEIPT_OR_NONE}}"]
]
```

`R_PRJ_TERMINAL`

```json
[
  ["node", "scripts/validate-project-readiness-outcome.mjs", "--source-sha", "{{S_PRJ}}", "--decision-source-sha", "{{PRJ_DECISION_SOURCE_SHA}}", "--packet", "workbook/lawos-readiness-authority-decision-packet-2026-07-17.json", "--approval-receipt", "{{PRJ_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_OFF_DECISION`

```json
[
  ["node", "scripts/validate-offline-capability-decision.mjs", "--packet", "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "--source-sha", "{{OFF_DECISION_SOURCE_SHA}}", "--action", "offline-capability", "--environment", "desktop-local", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--approval-receipt", "{{OFF_APPROVAL_RECEIPT_OR_NONE}}"]
]
```

`R_OFF_SELECTED`

```json
{
  "enabled": [
    ["node", "scripts/run-offline-capability-outcome.mjs", "--source-sha", "{{S_OFF_SELECTED}}", "--outcome", "enabled", "--packet", "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "--decision-receipt", "{{OFF_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"],
    ["node", "--test", "apps/desktop/test/offline-runtime-probe.test.mjs", "apps/desktop/test/offline-cache.test.mjs", "apps/desktop/test/offline-replay-conflict.test.mjs", "apps/desktop/test/session-cleanup.test.mjs", "apps/desktop/test/shell-smoke.test.mjs"]
  ],
  "disabled": [
    ["node", "scripts/run-offline-capability-outcome.mjs", "--source-sha", "{{S_OFF_SELECTED}}", "--outcome", "disabled", "--packet", "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "--decision-receipt", "{{OFF_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"],
    ["node", "--test", "apps/desktop/test/offline-disabled.test.mjs", "apps/desktop/test/shell-smoke.test.mjs", "scripts/test/offline-capability-decision.test.mjs"]
  ],
  "pending": [
    ["node", "scripts/run-offline-capability-outcome.mjs", "--source-sha", "{{S_OFF_SELECTED}}", "--outcome", "pending", "--packet", "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "--decision-receipt", "/private/tmp/lawos-approvals/ABSENT", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"],
    ["node", "--test", "scripts/test/offline-capability-decision.test.mjs", "apps/desktop/test/shell-smoke.test.mjs"]
  ]
}
```

`R_OFF_TERMINAL`

```json
[
  ["node", "scripts/run-offline-capability-outcome.mjs", "--source-sha", "{{S_OFF_SELECTED}}", "--outcome", "pending", "--packet", "workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "--decision-receipt", "/private/tmp/lawos-approvals/ABSENT", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_001`

```json
[
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "CUT-001", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-001/approval-packet.json", "--action", "central-ledger-cutover-plan", "--environment", "source-local", "--approval-receipt", "{{CUT_001_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_002`

```json
[
  ["node", "scripts/generate-central-ledger-cutover-inventory.mjs", "--source-sha", "{{S_CUT}}", "--dependency-receipt-bundle", "{{CUT_DEPENDENCY_RECEIPT_BUNDLE}}", "--output", "{{TUW_OUTPUT_DIR}}/source-inventory.json"],
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "CUT-002", "--source-sha", "{{S_CUT}}", "--packet", "{{TUW_OUTPUT_DIR}}/source-inventory.json", "--dependency-receipt-bundle", "{{CUT_DEPENDENCY_RECEIPT_BUNDLE}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_003`

```json
[
  ["node", "scripts/run-central-ledger-cutover.mjs", "--phase", "{{CUT_003_PHASE}}", "--mode", "dependency-preflight", "--source-sha", "{{S_CUT}}", "--packet", "{{CUT_002_INVENTORY}}", "--prior-receipt", "{{CUT_002_RECEIPT}}", "--dependency-receipt", "{{S_CUT_DEPENDENCY_RECEIPT}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"],
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "CUT-003", "--source-sha", "{{S_CUT}}", "--packet", "{{TUW_OUTPUT_DIR}}/status.json", "--prior-receipt", "{{CUT_002_RECEIPT}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_004`

```json
[
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "CUT-004", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json", "--action", "central-ledger-staging-acceptance", "--environment", "staging", "--approval-receipt", "{{CUT_004_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_005`

```json
[
  ["node", "scripts/run-central-ledger-cutover.mjs", "--phase", "staging-freeze-delta", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json", "--approval-receipt", "{{CUT_004_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--prior-receipt", "{{CUT_003_RECEIPT}}", "--mode", "{{CUT_STAGING_MODE}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_006`

```json
[
  ["node", "scripts/run-central-ledger-cutover.mjs", "--phase", "staging-db-only-switch", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json", "--approval-receipt", "{{CUT_004_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--prior-receipt", "{{CUT_005_RECEIPT}}", "--mode", "{{CUT_STAGING_MODE}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_007`

```json
[
  ["node", "scripts/run-central-ledger-cutover.mjs", "--phase", "staging-smoke", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json", "--approval-receipt", "{{CUT_004_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--prior-receipt", "{{CUT_006_RECEIPT}}", "--mode", "{{CUT_STAGING_MODE}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_008`

```json
[
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "CUT-008", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-008/production-authorization.json", "--action", "central-ledger-production-authorization", "--environment", "production", "--approval-receipt", "{{CUT_008_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--prior-receipt", "{{CUT_007_RECEIPT}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

`R_CUT_PRODUCTION`

```json
[
  ["node", "scripts/run-central-ledger-cutover.mjs", "--phase", "{{CUT_PRODUCTION_PHASE}}", "--source-sha", "{{S_CUT}}", "--packet", "workbook/lawos-runtime-safety-evidence/RS-CUT-008/production-authorization.json", "--approval-receipt", "{{CUT_008_APPROVAL_RECEIPT_OR_NONE}}", "--trust-registry", "/private/tmp/lawos-approval-trust/registry.v1.json", "--expected-trust-registry-sha256", "{{LAWOS_APPROVAL_TRUST_REGISTRY_SHA256}}", "--prior-receipt", "{{CUT_PREDECESSOR_RECEIPT}}", "--mode", "{{CUT_PRODUCTION_MODE}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"],
  ["node", "scripts/validate-central-ledger-cutover-readiness.mjs", "--stage", "{{CUT_STAGE}}", "--source-sha", "{{S_CUT}}", "--packet", "{{TUW_OUTPUT_DIR}}/status.json", "--prior-receipt", "{{CUT_PREDECESSOR_RECEIPT}}", "--output-dir", "{{TUW_OUTPUT_DIR}}"]
]
```

## 147-row manifest

The `selector` column is closed. `command` has no branch. `approval-three-way` permits exactly signed-approved, signed-rejected, or unsigned-pending. `enabled-disabled-pending` permits exactly those three OFF outcomes. `dependency-aware` selects execute only when the validated predecessor claim is verified; otherwise it selects preflight-only and must remain non-verified. `external-three-way` permits authorized execution, approval-required zero-contact preflight, or signed-but-unavailable single safe attempt.

| TUW ID | Target | Recipe | Selector | Result slice |
| --- | --- | --- | --- | --- |
| RS-GOV-001 | T_GOV | R_GOV_BASE | command | isolated:RS-GOV-001:all |
| RS-GOV-002 | T_GOV | R_GOV_ROOT | command | isolated:RS-GOV-002:all |
| RS-GOV-003 | T_GOV | R_GOV_WRITER | command | isolated:RS-GOV-003:all |
| RS-GOV-004 | T_GOV | R_GOV_PLAN | command | isolated:RS-GOV-004:all |
| RS-GOV-005 | T_GOV | R_GOV_PLAN | command | isolated:RS-GOV-005:all |
| RS-GOV-006 | T_GOV | R_GOV_PLAN | command | isolated:RS-GOV-006:all |
| RS-GOV-007 | T_GOV | R_GOV_BASELINES | command | isolated:RS-GOV-007:all |
| RS-GOV-008 | T_GOV | R_GOV_GOAL | platform-goal | isolated:RS-GOV-008:all |
| RS-SA-001 | T_SA | R_SA_INSTANCE | command | isolated:RS-SA-001:all |
| RS-SA-002 | T_SA | R_SA_INSTANCE | command | isolated:RS-SA-002:all |
| RS-SA-003 | T_SA | R_SA_INSTANCE | command | isolated:RS-SA-003:all |
| RS-SA-004 | T_SA | R_SA_INSTANCE | command | isolated:RS-SA-004:all |
| RS-SA-005 | T_SA | R_SA_STEPUP | command | isolated:RS-SA-005:all |
| RS-SA-006 | T_SA | R_SA_STEPUP | command | isolated:RS-SA-006:all |
| RS-SA-007 | T_SA | R_SA_STEPUP | command | isolated:RS-SA-007:all |
| RS-SA-008 | T_SA | R_SA_TERMINAL | command | isolated:RS-SA-008:all |
| RS-SB-001 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-001:all |
| RS-SB-002 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-002:all |
| RS-SB-003 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-003:all |
| RS-SB-004 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-004:all |
| RS-SB-005 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-005:all |
| RS-SB-006 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-006:all |
| RS-SB-007 | T_SB | R_SB_NATIVE | command | isolated:RS-SB-007:all |
| RS-SB-008 | T_SB | R_SB_PROTOCOL | command | isolated:RS-SB-008:all |
| RS-SB-009 | T_SB | R_SB_PACKAGE | internal-unsigned-package | isolated:RS-SB-009:all |
| RS-SB-010 | T_SB | R_SB_PACKAGE | internal-unsigned-package | isolated:RS-SB-010:all |
| RS-DUR-001 | T_DUR | R_DUR | command | isolated:RS-DUR-001:all |
| RS-DUR-002 | T_DUR | R_DUR | command | isolated:RS-DUR-002:all |
| RS-DUR-003 | T_DUR | R_DUR | command | isolated:RS-DUR-003:all |
| RS-DUR-004 | T_DUR | R_DUR | command | isolated:RS-DUR-004:all |
| RS-DUR-005 | T_DUR | R_DUR | command | isolated:RS-DUR-005:all |
| RS-DUR-006 | T_DUR | R_DUR | command | isolated:RS-DUR-006:all |
| RS-DUR-007 | T_DUR | R_DUR | command | isolated:RS-DUR-007:all |
| RS-DUR-008 | T_DUR | R_DUR | command | isolated:RS-DUR-008:all |
| RS-DUR-009 | T_DUR | R_DUR | command | isolated:RS-DUR-009:all |
| RS-DUR-010 | T_DUR | R_DUR | command | isolated:RS-DUR-010:all |
| RS-DUR-011 | T_DUR | R_DUR | command | isolated:RS-DUR-011:all |
| RS-DUR-012 | T_DUR | R_DUR | command | isolated:RS-DUR-012:all |
| RS-STO-001 | T_STO | R_STO_WRITER | command | isolated:RS-STO-001:all |
| RS-STO-002 | T_STO | R_STO_MATTER | command | isolated:RS-STO-002:all |
| RS-STO-003 | T_STO | R_STO_CRM_INTAKE | command | isolated:RS-STO-003:all |
| RS-STO-004 | T_STO | R_STO_CRM_INTAKE | command | isolated:RS-STO-004:all |
| RS-STO-005 | T_STO | R_STO_MASTER | command | isolated:RS-STO-005:all |
| RS-STO-006 | T_STO | R_STO_HRX | command | isolated:RS-STO-006:all |
| RS-STO-007 | T_STO | R_STO_FINANCE | command | isolated:RS-STO-007:all |
| RS-STO-008 | T_STO | R_STO_ANALYTICS | command | isolated:RS-STO-008:all |
| RS-STO-009 | T_STO | R_STO_PORTAL_AI | command | isolated:RS-STO-009:all |
| RS-STO-010 | T_STO | R_STO_PORTAL_AI | command | isolated:RS-STO-010:all |
| RS-STO-011 | T_STO | R_STO_DMS | command | isolated:RS-STO-011:all |
| RS-STO-012 | T_STO | R_STO_READINESS | command | isolated:RS-STO-012:all |
| RS-STO-013 | T_STO | R_STO_AUTH | command | isolated:RS-STO-013:all |
| RS-STO-014 | T_STO | R_STO_AUDIT | command | isolated:RS-STO-014:all |
| RS-STO-015 | T_STO | R_STO_TERMINAL | command | isolated:RS-STO-015:all |
| RS-BKP-001 | T_BKP | R_BKP | command | isolated:RS-BKP-001:all |
| RS-BKP-002 | T_BKP | R_BKP | command | isolated:RS-BKP-002:all |
| RS-BKP-003 | T_BKP | R_BKP | command | isolated:RS-BKP-003:all |
| RS-BKP-004 | T_BKP | R_BKP | command | isolated:RS-BKP-004:all |
| RS-BKP-005 | T_BKP | R_BKP | approval-packet-local-only | isolated:RS-BKP-005:all |
| RS-BKP-006 | T_BKP | R_BKP | command | isolated:RS-BKP-006:all |
| RS-BKP-007 | T_BKP | R_BKP | command | isolated:RS-BKP-007:all |
| RS-BKP-008 | T_BKP | R_BKP | command | isolated:RS-BKP-008:all |
| RS-DBF-001 | T_DBF | R_DBF | command | isolated:RS-DBF-001:all |
| RS-DBF-002 | T_DBF | R_DBF | command | isolated:RS-DBF-002:all |
| RS-DBF-003 | T_DBF | R_DBF | command | isolated:RS-DBF-003:all |
| RS-DBF-004 | T_DBF | R_DBF | command | isolated:RS-DBF-004:all |
| RS-DBF-005 | T_DBF | R_DBF | command | isolated:RS-DBF-005:all |
| RS-DBF-006 | T_DBF | R_DBF | command | isolated:RS-DBF-006:all |
| RS-DBF-007 | T_DBF | R_DBF | command | isolated:RS-DBF-007:all |
| RS-DBF-008 | T_DBF | R_DBF | command | isolated:RS-DBF-008:all |
| RS-DBF-009 | T_DBF | R_DBF | command | isolated:RS-DBF-009:all |
| RS-DBF-010 | T_DBF | R_DBF | command | isolated:RS-DBF-010:all |
| RS-DBF-011 | T_DBF | R_DBF | command | isolated:RS-DBF-011:all |
| RS-DBF-012 | T_DBF | R_DBF | command | isolated:RS-DBF-012:all |
| RS-IDN-001 | T_IDN | R_IDN | command | isolated:RS-IDN-001:all |
| RS-IDN-002 | T_IDN | R_IDN | command | isolated:RS-IDN-002:all |
| RS-IDN-003 | T_IDN | R_IDN | command | isolated:RS-IDN-003:all |
| RS-IDN-004 | T_IDN | R_IDN | command | isolated:RS-IDN-004:all |
| RS-IDN-005 | T_IDN | R_IDN | command | isolated:RS-IDN-005:all |
| RS-IDN-006 | T_IDN | R_IDN | command | isolated:RS-IDN-006:all |
| RS-IDN-007 | T_IDN | R_IDN | command | isolated:RS-IDN-007:all |
| RS-IDN-008 | T_IDN | R_IDN | source-browser-local | isolated:RS-IDN-008:all |
| RS-IDN-009 | T_IDN | R_IDN | provider-neutral-local | isolated:RS-IDN-009:all |
| RS-IDN-010 | T_IDN | R_IDN | command | isolated:RS-IDN-010:all |
| RS-DOM-001 | T_DOM | R_DOM_FOUNDATION | command | isolated:RS-DOM-001:all |
| RS-DOM-002 | T_DOM | R_DOM_MASTER | command | isolated:RS-DOM-002:all |
| RS-DOM-003 | T_DOM | R_DOM_MASTER | command | isolated:RS-DOM-003:all |
| RS-DOM-004 | T_DOM | R_DOM_MASTER | command | isolated:RS-DOM-004:all |
| RS-DOM-005 | T_DOM | R_DOM_MASTER | command | isolated:RS-DOM-005:all |
| RS-DOM-006 | T_DOM | R_DOM_MATTER | command | isolated:RS-DOM-006:all |
| RS-DOM-007 | T_DOM | R_DOM_MATTER | command | isolated:RS-DOM-007:all |
| RS-DOM-008 | T_DOM | R_DOM_MATTER | command | isolated:RS-DOM-008:all |
| RS-DOM-009 | T_DOM | R_DOM_MATTER | command | isolated:RS-DOM-009:all |
| RS-DOM-010 | T_DOM | R_DOM_MATTER | command | isolated:RS-DOM-010:all |
| RS-DOM-011 | T_DOM | R_DOM_CRM_INTAKE | command | isolated:RS-DOM-011:all |
| RS-DOM-012 | T_DOM | R_DOM_CRM_INTAKE | command | isolated:RS-DOM-012:all |
| RS-DOM-013 | T_DOM | R_DOM_CRM_INTAKE | command | isolated:RS-DOM-013:all |
| RS-DOM-014 | T_DOM | R_DOM_CRM_INTAKE | command | isolated:RS-DOM-014:all |
| RS-DOM-015 | T_DOM | R_DOM_CRM_INTAKE | command | isolated:RS-DOM-015:all |
| RS-DOM-016 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-016:all |
| RS-DOM-017 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-017:all |
| RS-DOM-018 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-018:all |
| RS-DOM-019 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-019:all |
| RS-DOM-020 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-020:all |
| RS-DOM-021 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-021:all |
| RS-DOM-022 | T_DOM | R_DOM_HRX | command | isolated:RS-DOM-022:all |
| RS-DOM-023 | T_DOM | R_DOM_FINANCE | command | isolated:RS-DOM-023:all |
| RS-DOM-024 | T_DOM | R_DOM_FINANCE | command | isolated:RS-DOM-024:all |
| RS-DOM-025 | T_DOM | R_DOM_FINANCE | command | isolated:RS-DOM-025:all |
| RS-DOM-026 | T_DOM | R_DOM_FINANCE | command | isolated:RS-DOM-026:all |
| RS-DOM-027 | T_DOM | R_DOM_FINANCE | command | isolated:RS-DOM-027:all |
| RS-DOM-028 | T_DOM | R_DOM_PORTAL_AI | command | isolated:RS-DOM-028:all |
| RS-DOM-029 | T_DOM | R_DOM_PORTAL_AI | command | isolated:RS-DOM-029:all |
| RS-DOM-030 | T_DOM | R_DOM_TERMINAL | command | isolated:RS-DOM-030:all |
| RS-DMS-001 | T_DMS | R_DMS_DECISION | approval-three-way | isolated:RS-DMS-001:all |
| RS-DMS-002 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-002:all |
| RS-DMS-003 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-003:all |
| RS-DMS-004 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-004:all |
| RS-DMS-005 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-005:all |
| RS-DMS-006 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-006:all |
| RS-DMS-007 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-007:all |
| RS-DMS-008 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-008:all |
| RS-DMS-009 | T_DMS | R_DMS_SOURCE | command | isolated:RS-DMS-009:all |
| RS-DMS-010 | T_DMS | R_DMS_PROVIDER | external-three-way | isolated:RS-DMS-010:all |
| RS-PRJ-001 | T_PRJ | R_PRJ_HOME | command | isolated:RS-PRJ-001:all |
| RS-PRJ-002 | T_PRJ | R_PRJ_HOME | command | isolated:RS-PRJ-002:all |
| RS-PRJ-003 | T_PRJ | R_PRJ_HOME | command | isolated:RS-PRJ-003:all |
| RS-PRJ-004 | T_PRJ | R_PRJ_ANALYTICS | command | isolated:RS-PRJ-004:all |
| RS-PRJ-005 | T_PRJ | R_PRJ_DECISION | approval-three-way | isolated:RS-PRJ-005:all |
| RS-PRJ-006 | T_PRJ | R_PRJ_TERMINAL | approval-three-way | isolated:RS-PRJ-006:all |
| RS-OFF-001 | T_OFF | R_OFF_DECISION | enabled-disabled-pending | isolated:RS-OFF-001:all |
| RS-OFF-002 | T_OFF | R_OFF_SELECTED | enabled-disabled-pending | isolated:RS-OFF-002:all |
| RS-OFF-003 | T_OFF | R_OFF_SELECTED | enabled-disabled-pending | isolated:RS-OFF-003:all |
| RS-OFF-004 | T_OFF | R_OFF_SELECTED | enabled-disabled-pending | isolated:RS-OFF-004:all |
| RS-OFF-005 | T_OFF | R_OFF_SELECTED | enabled-disabled-pending | isolated:RS-OFF-005:all |
| RS-OFF-006 | T_OFF | R_OFF_TERMINAL | enabled-disabled-pending | isolated:RS-OFF-006:all |
| RS-CUT-001 | T_CUT | R_CUT_001 | approval-three-way | isolated:RS-CUT-001:all |
| RS-CUT-002 | T_CUT | R_CUT_002 | dependency-aware | isolated:RS-CUT-002:all |
| RS-CUT-003 | T_CUT | R_CUT_003 | dependency-aware | isolated:RS-CUT-003:all |
| RS-CUT-004 | T_CUT | R_CUT_004 | approval-three-way | isolated:RS-CUT-004:all |
| RS-CUT-005 | T_CUT | R_CUT_005 | external-three-way | isolated:RS-CUT-005:all |
| RS-CUT-006 | T_CUT | R_CUT_006 | external-three-way | isolated:RS-CUT-006:all |
| RS-CUT-007 | T_CUT | R_CUT_007 | external-three-way | isolated:RS-CUT-007:all |
| RS-CUT-008 | T_CUT | R_CUT_008 | approval-three-way | isolated:RS-CUT-008:all |
| RS-CUT-009 | T_CUT | R_CUT_PRODUCTION | external-three-way | isolated:RS-CUT-009:all |
| RS-CUT-010 | T_CUT | R_CUT_PRODUCTION | external-three-way | isolated:RS-CUT-010:all |
| RS-CUT-011 | T_CUT | R_CUT_PRODUCTION | external-three-way | isolated:RS-CUT-011:all |
| RS-CUT-012 | T_CUT | R_CUT_PRODUCTION | external-three-way | isolated:RS-CUT-012:all |

## Closed selector bindings

- `approval-three-way`: exactly one of:
  - signed-approved: valid registry/receipt and exact packet/source/action/environment binding;
  - signed-rejected: valid registry/receipt with `decision=rejected`, zero product/external writes, disabled disposition where the governing state table permits it;
  - unsigned-pending: missing/invalid receipt, zero product/external writes, `APPROVAL_REQUIRED`, `claims.verified=false`.
- PRJ exact states: approved maps PRJ-005/006 to `VERIFIED/NOT_APPLICABLE`; rejected maps PRJ-005 to `VERIFIED/NOT_APPLICABLE` and PRJ-006 to `DISABLED_BY_APPROVED_DECISION/NOT_APPLICABLE`; pending maps PRJ-005 to `READY/APPROVAL_REQUIRED` and PRJ-006 to `PLANNED/APPROVAL_REQUIRED`, both non-verified. Rejected and pending cannot satisfy CUT-002.
- `enabled-disabled-pending`: enabled maps all six OFF rows to `VERIFIED/NOT_APPLICABLE`; disabled maps OFF-001/006 to `VERIFIED/NOT_APPLICABLE` and OFF-002~005 to `DISABLED_BY_APPROVED_DECISION/NOT_APPLICABLE`; pending maps OFF-001 to `READY/APPROVAL_REQUIRED` and OFF-002~006 to `PLANNED/APPROVAL_REQUIRED`, all non-verified. Disabled never runs capability tests as proof of capability, and pending never emits a terminal claim.
- `dependency-aware`: `CUT_003_PHASE=synthetic-import` only when the canonical CUT-002 receipt is verified. Otherwise `CUT_003_PHASE=dependency-preflight`, external/database mutation count is 0, and the receipt remains non-verified.
- `external-three-way`: authorized execution requires both the real approval bundle and a later exact user instruction. Missing either selects preflight-only with zero prohibited contacts/writes. `BLOCKED_EXTERNAL` requires one already-authorized named-environment attempt and hashed safe unavailability proof.
- CUT staging row bindings are fixed and serial: CUT-005=`phase=staging-freeze-delta` with CUT-003 predecessor; CUT-006=`phase=staging-db-only-switch` with CUT-005 predecessor; CUT-007=`phase=staging-smoke` with CUT-006 predecessor. Each row gets its own process, canonical receipt, output hash, and isolated result slice.
- CUT production row bindings are fixed: CUT-009=`phase=production,stage=CUT-009`; CUT-010=`phase=dr-restore,stage=CUT-010`; CUT-011=`phase=no-fallback,stage=CUT-011`; CUT-012=`phase=terminal-assembly,stage=CUT-012`. Each predecessor is selected from the immediately preceding canonical receipt, never from a workbook placeholder.

## Catalog validation

Before goal creation, the structural validator must prove:

1. exactly 147 table rows and 147 unique TUW IDs;
2. expected workstream counts `8,8,10,12,15,8,12,10,30,10,6,6,12`;
3. every target rule and recipe resolves;
4. every row's result slice equals `isolated:<TUW-ID>:all`;
5. no shell command, wildcard argv, unspecified environment, implicit default recipe, or unbounded timeout;
6. all 29 previously prose-only legacy receipts now resolve to literal argv recipes;
7. all 34 post-legacy rows have a literal argv recipe and a closed selector;
8. every real approval argv contains the trust registry and expected digest flags;
9. every CUT row consumes only an already-materialized canonical predecessor path;
10. no recipe authorizes push, PR, merge, tag, release, AWS/provider/IdP/staging/production/real-data mutation, Windows signing, cutover, or go-live without the separately required exact approval and instruction.
