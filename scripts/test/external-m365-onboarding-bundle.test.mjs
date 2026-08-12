import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  mkdtemp,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalJson,
  derivePublicEvidence,
  generateExternalM365OnboardingBundle,
  loadExternalM365OnboardingContracts,
  renderExternalM365OnboardingMarkdown,
  sha256,
  validateExternalM365OnboardingBundle,
  writeExternalM365OnboardingBundle,
} from "../lib/external-m365-onboarding.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const manifestBytes = await readFile(path.join(repoRoot, "apps/addin/manifest.production.xml"));
const contracts = await loadExternalM365OnboardingContracts(repoRoot);

function input(overrides = {}) {
  return {
    schema_version: "amic-os.external-m365-onboarding-bundle.v2.input",
    lawos_tenant_id: "tenant-firm-a",
    entra_tenant_id: "11111111-1111-4111-8111-111111111111",
    client_id: "22222222-2222-4222-8222-222222222222",
    admin_contact: "admin@example.test",
    profile: "matter-full",
    target_runtime_url: "https://firm-tenant.example.test/lawos",
    runtime_config_digest_sha256: "a".repeat(64),
    tenant_pinned: true,
    pilot_group: { display_name: "LawOS Pilot Group", expected_member_count: 2 },
    ...overrides,
  };
}

async function bundle(overrides = {}) {
  return generateExternalM365OnboardingBundle({
    input: input(overrides),
    manifestBytes,
    repoRoot,
  });
}

test("generates and validates a v2 tenant-pinned handoff from the exact production manifest", async () => {
  const value = await bundle();
  await validateExternalM365OnboardingBundle(value, {
    input: input(),
    manifestBytes,
    repoRoot,
    contracts,
  });
  assert.equal(value.private, true);
  assert.equal(value.schema_version, "amic-os.external-m365-onboarding-bundle.v2");
  assert.equal(value.deployment_model, "tenant_pinned_single_tenant");
  assert.equal(value.shared_runtime_claim, false);
  assert.deepEqual(value.private_admin_metadata, {
    lawos_tenant_id: input().lawos_tenant_id,
    entra_tenant_id: input().entra_tenant_id,
    client_id: input().client_id,
    admin_contact: input().admin_contact,
  });
  assert.equal(value.target_runtime.config_receipt_sha256, value.target_runtime.config_digest_sha256);
  assert.equal(value.target_runtime.binding, "tenant_pinned_single_tenant");
  assert.equal(value.target_runtime.hostname, "firm-tenant.example.test");
  assert.equal(value.target_runtime.binding_sha256.length, 64);
  assert.equal(value.no_provider_calls, true);
  assert.equal(value.external_mutations, 0);
  assert.equal(value.appsource_claim, false);
  assert.equal(value.manifest.sha256, sha256(manifestBytes));
  assert.equal(value.manifest_sha256, value.manifest.sha256);
  assert.equal(value.runtime_config_digest_sha256, value.target_runtime.config_digest_sha256);
  assert.equal(value.auth.expected_redirect_uri, contracts.redirects.client);
  assert.deepEqual(value.auth.oauth_scopes, contracts.release.client_outlook_oauth_scopes);
  assert.deepEqual(value.auth.graph_connection_scopes, [...contracts.release.client_outlook_graph_connection_scopes].sort());
  assert.deepEqual(
    value.checklist.map(({ id }) => id),
    [
      "M365-ADMIN-01", "M365-ADMIN-02", "M365-ADMIN-03", "M365-PILOT-POS-01",
      "M365-PILOT-POS-02", "M365-PILOT-NEG-01", "M365-PILOT-NEG-02", "M365-ROLLBACK-01",
    ],
  );
  assert.ok(value.checklist.every(({ status }) => status === "pending_external_verification"));
  assert.equal(value.rollback.baseline_version, "1.0.1.1");
  assert.equal(value.rollback.assignment_restore_policy, "reconcile_to_validated_single_visible_distribution");
});

test("public evidence is an exact closed projection with no raw private metadata", async () => {
  const value = await bundle();
  assert.deepEqual(value.public_evidence, derivePublicEvidence(value));
  const publicText = canonicalJson(value.public_evidence);
  for (const secret of [
    input().lawos_tenant_id,
    input().entra_tenant_id,
    input().client_id,
    input().admin_contact,
    input().target_runtime_url,
    input().pilot_group.display_name,
  ]) assert.equal(publicText.includes(secret), false);
  assert.equal(value.public_evidence.schema_version, "amic-os.external-m365-onboarding-public-evidence.v2");
  assert.equal(value.public_evidence.private_bundle, true);
  assert.equal(value.public_evidence.public_data_redacted, true);
  assert.equal(value.public_evidence.provider_calls, 0);
  assert.equal(value.public_evidence.external_mutations, 0);
  assert.equal(value.public_evidence.appsource_claim, false);
  assert.equal(value.public_evidence.lawos_tenant_fingerprint_sha256.length, 64);
  assert.equal(value.public_evidence.entra_tenant_fingerprint_sha256.length, 64);
});

test("binding digest changes when either tenant namespace changes", async () => {
  const lawos = await bundle();
  const entra = await bundle({ lawos_tenant_id: "tenant-firm-b" });
  const otherEntra = await bundle({ entra_tenant_id: "33333333-3333-4333-8333-333333333333" });
  assert.notEqual(lawos.target_runtime.binding_sha256, entra.target_runtime.binding_sha256);
  assert.notEqual(lawos.target_runtime.binding_sha256, otherEntra.target_runtime.binding_sha256);
  assert.notEqual(lawos.public_evidence.target_runtime_binding_sha256, entra.public_evidence.target_runtime_binding_sha256);
});

test("fails closed for legacy aliases, unknown raw fields, and a shared runtime", async () => {
  await assert.rejects(
    () => bundle({ tenant_id: "11111111-1111-4111-8111-111111111111" }),
    /unsupported fields/u,
  );
  await assert.rejects(
    () => bundle({ lawos_tenant_id: "ｔenant-firm-a" }),
    /ASCII LawOS namespace/u,
  );
  await assert.rejects(
    () => bundle({ external_firm: { display_name: "raw firm" } }),
    /unsupported fields/u,
  );
  await assert.rejects(
    () => bundle({ pilot_group: { display_name: "LawOS Pilot Group", expected_member_count: 2, email: "raw@example.test" } }),
    /unsupported fields/u,
  );
  await assert.rejects(
    () => bundle({
      runtime_config_receipt: {
        target_runtime_url: "https://firm-tenant.example.test/lawos",
        lawos_tenant_id: "tenant-firm-a",
        entra_tenant_id: "11111111-1111-4111-8111-111111111111",
        config_digest_sha256: "a".repeat(64),
        host: "firm-tenant.example.test",
        raw_runtime_alias: "https://private.example.test",
      },
    }),
    /unsupported fields/u,
  );
  await assert.rejects(
    () => bundle({ tenant_pinned: false }),
    /tenant_pinned=true/u,
  );
  await assert.rejects(
    () => bundle({ runtime_config_digest_sha256: undefined }),
    /runtime_config_digest_sha256/u,
  );
});

test("requires a numeric named-canary member count at the API boundary", async () => {
  for (const expected_member_count of ["2", true, null, 1.5, Number.MAX_SAFE_INTEGER + 1, 1001, 1, 0, -1, undefined]) {
    await assert.rejects(
      () => bundle({
        pilot_group: { display_name: "LawOS Pilot Group", expected_member_count },
      }),
      /pilot_group\.expected_member_count/u,
      String(expected_member_count),
    );
  }
});

test("rejects unsafe target runtime URL hosts and aliases", async () => {
  const unsafeUrls = [
    "https://*.firm.example.test/lawos",
    "https://127.0.0.1/lawos",
    "https://0.0.0.0/lawos",
    "https://10.0.0.1/lawos",
    "https://172.16.0.1/lawos",
    "https://192.168.1.1/lawos",
    "https://8.8.8.8/lawos",
    "https://[::1]/lawos",
    "https://[::]/lawos",
    "https://[fc00::1]/lawos",
    "https://[fe80::1]/lawos",
    "https://例え.テスト/lawos",
    "https://Ｆirm.example.test/lawos",
    "https://xn--r8jz45g.xn--zckzah/lawos",
    "https://firm.example.test./lawos",
    "https://localhost/lawos",
    "https://localhost.example.test/lawos",
    "https://metadata.google.internal/lawos",
  ];
  for (const target_runtime_url of unsafeUrls) {
    await assert.rejects(
      () => bundle({ target_runtime_url }),
      /target_runtime_url/u,
      target_runtime_url,
    );
  }
});

test("accepts and checks an exact tenant runtime receipt binding", async () => {
  const value = await bundle({
    runtime_config_receipt: {
      target_runtime_url: "https://firm-tenant.example.test/lawos",
      lawos_tenant_id: "tenant-firm-a",
      entra_tenant_id: "11111111-1111-4111-8111-111111111111",
      config_digest_sha256: "a".repeat(64),
      host: "firm-tenant.example.test",
    },
  });
  assert.equal(value.target_runtime.receipt_present, true);
  await assert.rejects(
    () => bundle({
      runtime_config_receipt: {
        target_runtime_url: "https://other.example.test/lawos",
        lawos_tenant_id: "tenant-firm-a",
        entra_tenant_id: "11111111-1111-4111-8111-111111111111",
        config_digest_sha256: "a".repeat(64),
        host: "other.example.test",
      },
    }),
    /exactly bound/u,
  );
});

test("rejects a split machine-readable redirect export", async (t) => {
  const root = await mkdtemp(path.join(repoRoot, ".external-m365-redirect-export-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "contracts"), { recursive: true });
  await mkdir(path.join(root, "apps/api/src"), { recursive: true });
  for (const file of [
    "outlook-addin-release-gates.json",
    "outlook-addin-surfaces.json",
    "outlook-addin-deployment-baseline.json",
    "outlook-addin-rollback.json",
  ]) {
    await copyFile(path.join(repoRoot, "contracts", file), path.join(root, "contracts", file));
  }
  await writeFile(
    path.join(root, "apps/api/src/microsoft-egress-broker-transport.js"),
    `export const MICROSOFT_EGRESS_REDIRECT_URIS = Object.freeze({
  people: "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
  client: "https://attacker.example.test/callback",
});\n`,
    { mode: 0o600 },
  );
  await assert.rejects(
    () => loadExternalM365OnboardingContracts(root),
    /missing or split/u,
  );
});

test("rejects a non-exact production manifest before emitting a handoff", async () => {
  const mutated = Buffer.from(manifestBytes.toString("utf8").replace("<Version>1.1.0.0</Version>", "<Version>1.1.0.1</Version>"));
  await assert.rejects(
    () => generateExternalM365OnboardingBundle({ input: input(), manifestBytes: mutated, repoRoot }),
    /exact production manifest/u,
  );
});

test("rejects the legacy inquiry production manifest when it embeds a tenant-specific query", async () => {
  const inquiryBytes = await readFile(path.join(repoRoot, "apps/addin/manifest.inquiry.production.xml"));
  await assert.rejects(
    () => generateExternalM365OnboardingBundle({
      input: input({ profile: "inquiry-only" }),
      manifestBytes: inquiryBytes,
      repoRoot,
    }),
    /tenant-specific runtime query/u,
  );
});

test("validator rejects scope, redirect, closed-schema, payload, and rollback drift", async () => {
  const value = await bundle();
  const cases = [
    ["scope", (copy) => { copy.auth.oauth_scopes = ["Mail.Read"]; }, /redirect\/scope expectations/u],
    ["redirect", (copy) => { copy.auth.expected_redirect_uri = "https://attacker.example.test/callback"; }, /redirect\/scope expectations/u],
    ["rollback", (copy) => { copy.rollback.baseline_version = "1.0.0.0"; }, /rollback instructions/u],
    ["payload", (copy) => { copy.pilot_group.expected_member_count = 3; }, /bundle payload digest/u],
    ["public-extra", (copy) => { copy.public_evidence.unexpected = true; }, /unsupported fields/u],
    ["private-extra", (copy) => { copy.private_admin_metadata.tenant_id = "legacy"; }, /unsupported fields/u],
    ["runtime-extra", (copy) => { copy.target_runtime.raw_runtime_url = "https://private.example.test"; }, /unsupported fields/u],
  ];
  for (const [name, mutate, expected] of cases) {
    const copy = structuredClone(value);
    mutate(copy);
    await assert.rejects(
      () => validateExternalM365OnboardingBundle(copy, { repoRoot, contracts }),
      expected,
      name,
    );
  }
});

test("writes private JSON/Markdown operator output with restrictive file modes", async (t) => {
  const value = await bundle();
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-external-m365-bundle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const jsonPath = path.join(root, "handoff.json");
  const markdownPath = path.join(root, "handoff.md");
  await writeFile(jsonPath, "stale private output\n", { mode: 0o644 });
  await chmod(jsonPath, 0o644);
  const result = await writeExternalM365OnboardingBundle(value, jsonPath, markdownPath);
  assert.equal(result.sha256, sha256(await readFile(jsonPath)));
  assert.equal((await stat(jsonPath)).mode & 0o777, 0o600);
  assert.equal((await stat(markdownPath)).mode & 0o777, 0o600);
  const markdown = renderExternalM365OnboardingMarkdown(value);
  assert.equal(markdown.includes(input().entra_tenant_id), false);
  assert.equal(markdown.includes(input().admin_contact), false);
  assert.equal(canonicalJson(JSON.parse(await readFile(jsonPath, "utf8"))).includes(input().admin_contact), true);
  assert.deepEqual((await readdir(root)).sort(), ["handoff.json", "handoff.md"]);
});

test("validator CLI reports local validity while keeping external handoff pending", async (t) => {
  const value = await bundle();
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-external-m365-cli-status-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const jsonPath = path.join(root, "handoff.json");
  await writeExternalM365OnboardingBundle(value, jsonPath);
  const output = JSON.parse(execFileSync(
    process.execPath,
    [
      path.join(repoRoot, "scripts/validate-external-m365-onboarding-bundle.mjs"),
      "--bundle",
      jsonPath,
      "--manifest",
      path.join(repoRoot, "apps/addin/manifest.production.xml"),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  ));
  assert.equal(output.local_validation_status, "VALID");
  assert.equal(output.handoff_status, "PENDING_EXTERNAL_VERIFICATION");
  assert.equal(output.external_success_claim, false);
  assert.equal(output.checklist_status, "PENDING_EXTERNAL_VERIFICATION");
  assert.equal(Object.prototype.hasOwnProperty.call(output, "verdict"), false);
  assert.equal(/\b(?:PASS|READY|VERIFIED)\b/u.test(JSON.stringify(output)), false);
});

test("generator CLI rejects coerced or out-of-range named-canary counts", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-external-m365-cli-count-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const generatorPath = path.join(repoRoot, "scripts/generate-external-m365-onboarding-bundle.mjs");
  const manifestPath = path.join(repoRoot, "apps/addin/manifest.production.xml");
  for (const [index, expected_member_count] of ["2", true, null, 1.5, Number.MAX_SAFE_INTEGER + 1, 1001, 1, 0, -1, undefined].entries()) {
    const inputPath = path.join(root, `input-${index}.json`);
    const outputPath = path.join(root, `handoff-${index}.json`);
    await writeFile(inputPath, `${JSON.stringify(input({
      pilot_group: { display_name: "LawOS Pilot Group", expected_member_count },
    }), null, 2)}\n`, { mode: 0o600 });
    const result = spawnSync(
      process.execPath,
      [generatorPath, "--input", inputPath, "--manifest", manifestPath, "--output", outputPath],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0, String(expected_member_count));
    assert.match(`${result.stderr}${result.stdout}`, /expected_member_count/u, String(expected_member_count));
  }
});
