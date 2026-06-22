#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const planPath = "docs/desktop/matter-desktop-temporary-release-plan.md";
const receiptPath = "docs/desktop/matter-desktop-temporary-release-receipt.md";
const packagePath = "apps/desktop/package.json";
const builderPath = "apps/desktop/electron-builder.yml";

const plan = readFileSync(planPath, "utf8");
const receipt = readFileSync(receiptPath, "utf8");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const builder = readFileSync(builderPath, "utf8");

const requiredPlanPhrases = [
  "Status: internal-temporary-release-started",
  "does not require a custom web domain",
  "does not claim public release",
  "Product name | `matter`",
  "Internal app ID | `com.amic.matter.desktop.internal`",
  "Artifact name | `matter-internal-${version}-${os}-${arch}.${ext}`",
  "Publish config | `null`",
  "Desktop internal or temporary distribution does not require a custom API domain.",
  "AWS-generated HTTPS endpoint",
  "Do not use `api.matter.example.com` unless that exact domain is owned and delegated.",
  "npm --workspace apps/desktop run test:smoke",
  "npm --workspace apps/desktop run test:file-bridge",
  "npm run matter-desktop:aws-runtime:smoke",
  "MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac",
  "npm --workspace apps/desktop run build:win",
  "node scripts/validate-matter-desktop-no-public-release-claim.mjs",
  "node scripts/validate-matter-desktop-release-boundary.mjs",
  "node scripts/validate-matter-desktop-temporary-release-plan.mjs",
  "docs/desktop/matter-desktop-temporary-release-receipt.md",
  "node scripts/release-matter-desktop-temporary.mjs",
  "apps/desktop/dist/release/matter-desktop-internal-0.1.0/release-manifest.json",
  "node scripts/validate-matter-desktop-temporary-release-bundle.mjs",
  "Custom domain requirement: false",
];

const requiredReceiptPhrases = [
  "Status: internal-temporary-release-executed-with-artifacts",
  "Release ID | `matter-desktop-internal-0.1.0`",
  "Manifest | `apps/desktop/dist/release/matter-desktop-internal-0.1.0/release-manifest.json`",
  "Custom domain requirement | false",
  "Product name | `matter`",
  "Internal app ID | `com.amic.matter.desktop.internal`",
  "`matter-staging-admin` | STS verified",
  "`matter-prod-deploy-admin` | STS verified",
  "`matter-cutover-operator` | STS verified",
  "`matter-readonly-auditor` | STS verified",
  "AWS temporary runtime | API Gateway/Lambda active",
  "Operator-token protected runtime routes | true",
  "No domain was registered.",
  "`npm --workspace apps/desktop run test:smoke` | PASS",
  "`npm --workspace apps/desktop run test:file-bridge` | PASS",
  "`npm run matter-desktop:aws-runtime:smoke` | PASS",
  "`MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac` | PASS",
  "`npm --workspace apps/desktop run build:win` | PASS",
  "`node scripts/validate-matter-desktop-release-boundary.mjs` | PASS",
  "`npm run matter-vault:r4:local-secrets:validate` | PASS, secret_values_printed=false",
  "Public release: false",
  "Production go-live: false",
  "Owner approval: false",
  "Custom-domain readiness: false",
];

for (const phrase of requiredPlanPhrases) {
  assert(plan.includes(phrase), `temporary release plan missing phrase: ${phrase}`);
}

for (const phrase of requiredReceiptPhrases) {
  assert(receipt.includes(phrase), `temporary release receipt missing phrase: ${phrase}`);
}

assert.equal(pkg.name, "@law-firm-os/desktop", "desktop package name mismatch");
assert.equal(pkg.private, true, "desktop package must remain private for internal temporary release");
assert.match(pkg.description, /matter desktop shell package/, "desktop description must identify matter shell");
assert.match(builder, /^appId:\s*com\.amic\.matter\.desktop\.internal$/m, "builder appId must remain internal");
assert.match(builder, /^productName:\s*matter$/m, "builder productName must be matter");
assert.match(builder, /^artifactName:\s*"matter-internal-\$\{version\}-\$\{os\}-\$\{arch\}\.\$\{ext\}"$/m, "builder artifactName must remain internal");
assert.match(builder, /^publish:\s*null$/m, "builder publish must remain disabled");

const forbiddenPositiveClaims = [
  /\bpublic release\s*:\s*true\b/i,
  /\bproduction go-live\s*:\s*true\b/i,
  /\bowner approval\s*:\s*true\b/i,
  /\bstore distribution\s*:\s*true\b/i,
];

for (const pattern of forbiddenPositiveClaims) {
  assert(!pattern.test(plan), `temporary release plan contains forbidden positive claim: ${pattern}`);
  assert(!pattern.test(receipt), `temporary release receipt contains forbidden positive claim: ${pattern}`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      plan: planPath,
      receipt: receiptPath,
      product_name: "matter",
      internal_app_id: "com.amic.matter.desktop.internal",
      custom_domain_required: false,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
    },
    null,
    2,
  ),
);
