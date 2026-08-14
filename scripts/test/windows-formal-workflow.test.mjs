import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { desktopReleaseChannelConfig } from "../lib/matter-desktop-provenance.mjs";

const workflowPath = fileURLToPath(
  new URL("../../.github/workflows/windows-formal-package-qa.yml", import.meta.url),
);
const rootPath = fileURLToPath(new URL("../../", import.meta.url));
const desktopPackagePath = fileURLToPath(
  new URL("../../apps/desktop/package.json", import.meta.url),
);
const authenticodeWorkflowPath = fileURLToPath(
  new URL("../../.github/workflows/windows-authenticode-package-qa.yml", import.meta.url),
);
const privateHandoffOidcWorkflowPath = fileURLToPath(
  new URL("../../.github/workflows/windows-signed-artifact-private-handoff-oidc.yml", import.meta.url),
);
const formalQaPath = fileURLToPath(
  new URL("../run-formal-windows-package-qa.mjs", import.meta.url),
);
const installerBuilderPath = fileURLToPath(
  new URL("../build-matter-desktop-win-installer.mjs", import.meta.url),
);
const authenticodeBuilderToolchainPackagePath = fileURLToPath(
  new URL("../../.github/toolchains/windows-authenticode-electron-builder/package.json", import.meta.url),
);
const authenticodeBuilderToolchainLockPath = fileURLToPath(
  new URL("../../.github/toolchains/windows-authenticode-electron-builder/package-lock.json", import.meta.url),
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function workflowStep(workflow, name) {
  const marker = `      - name: ${name}`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  const next = workflow.indexOf("\n      - name:", start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

function workflowJob(workflow, name) {
  const marker = `  ${name}:`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow job: ${name}`);
  const remainder = workflow.slice(start + marker.length);
  const next = remainder.search(/\n  [a-zA-Z0-9_-]+:\n/u);
  return workflow.slice(start, next === -1 ? workflow.length : start + marker.length + next);
}

function assertFrozenCertificateAuthority(workflow) {
  const signJob = workflowJob(workflow, "sign-and-qa");
  assert.doesNotMatch(
    signJob,
    /\$\{\{ vars\.SSL_COM_ESIGNER_(?:CKA_INSTALLER_(?:SUBJECT|CERTIFICATE_SHA1|CERTIFICATE_SHA256)|CERTIFICATE_SHA1) \}\}/u,
    "sign job must not re-read mutable certificate identity variables after preflight",
  );
  for (const [output, expectedReferences] of [
    ["cka_installer_subject", 2],
    ["cka_installer_certificate_sha1", 2],
    ["cka_installer_certificate_sha256", 2],
    ["signing_certificate_sha1", 7],
  ]) {
    assert.equal(
      signJob.match(new RegExp(`needs\\.environment-preflight\\.outputs\\.${output}`, "gu"))?.length,
      expectedReferences,
      `every sign-job ${output} consumer must use the frozen preflight output`,
    );
  }
}

function githubOutputLineValue(name, value) {
  const firstLine = `${name}=${value}\n`.split(/\r?\n/u, 1)[0];
  return firstLine.slice(`${name}=`.length);
}

function certificateSubjectOutputSafe(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 512 && !/\p{Cc}/u.test(value);
}

function uppercaseCertificateDigestOutputSafe(value, length) {
  return (
    typeof value === "string"
    && value.length === length
    && [...value].every((character) => /[0-9A-F]/u.test(character))
  );
}

test("Windows formal workflow preserves current-version provenance outside the worktree", async () => {
  const [workflow, desktopPackage] = await Promise.all([
    readFile(workflowPath, "utf8"),
    readFile(desktopPackagePath, "utf8").then(JSON.parse),
  ]);
  const artifactStem = `${desktopReleaseChannelConfig("formal").artifactPrefix}-${desktopPackage.version}`;
  const expectedEvidence = [
    `apps\\desktop\\dist\\win\\${artifactStem}-win-build-manifest.json`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win-installer-manifest.json`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win-installer-manifest.json.sig`,
    `apps\\desktop\\dist\\${artifactStem}-win-x64.exe`,
    `apps\\desktop\\dist\\${artifactStem}-win-x64.exe.blockmap`,
    `apps\\desktop\\dist\\win\\${artifactStem}-win32-x64-unsigned.zip`,
  ];
  const expandedWorkflow = workflow.replaceAll("$desktopVersion", desktopPackage.version);
  const artifactRoot = "${{ runner.temp }}\\matter-formal-package-qa-${{ github.run_id }}-${{ github.run_attempt }}";
  const uploadedArtifactRoot = artifactRoot.replaceAll("\\", "/");
  const buildReceiptPath = "${{ runner.temp }}\\matter-desktop-windows-receipt-${{ github.run_id }}-${{ github.run_attempt }}\\windows-build.md";
  const nativeQa = workflowStep(workflow, "Run native install, login, leave, payroll, restart, and uninstall QA");
  const verifyResult = workflowStep(workflow, "Verify native result and preserve signing boundary");
  const copyProvenance = workflowStep(workflow, "Copy build provenance");
  const successUpload = workflowStep(workflow, "Upload Windows QA evidence");
  const failureUpload = workflowStep(workflow, "Upload failed Windows QA diagnostics");

  assert.match(workflow, new RegExp(`MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH: ${escapeRegExp(buildReceiptPath)}`));
  assert.match(nativeQa, new RegExp(`MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR: ${escapeRegExp(artifactRoot)}`));
  assert.match(verifyResult, new RegExp(`MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR: ${escapeRegExp(artifactRoot)}`));
  assert.match(copyProvenance, new RegExp(`MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR: ${escapeRegExp(artifactRoot)}`));
  assert.match(verifyResult, /Get-Content -Raw -LiteralPath \(Join-Path \$env:MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR "formal-windows-package-qa\.json"\)/u);
  assert.match(
    workflow,
    /\$desktopVersion = \(Get-Content -Raw "apps\\desktop\\package\.json" \| ConvertFrom-Json\)\.version/,
  );
  for (const expectedPath of expectedEvidence) {
    assert.match(expandedWorkflow, new RegExp(escapeRegExp(expectedPath)));
  }
  assert.match(workflow, /Test-Path -LiteralPath \$path -PathType Leaf/);
  assert.match(copyProvenance, /\$env:MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH/u);
  assert.match(copyProvenance, /Copy-Item -LiteralPath \$path -Destination \$buildDir/u);
  assert.match(copyProvenance, /Copy-Item -LiteralPath \$path -Destination \$artifactsDir/u);
  assert.match(successUpload, /if: success\(\)/u);
  assert.match(successUpload, /name: windows-formal-package-qa-\$\{\{ env\.QA_SOURCE_SHA \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.match(successUpload, new RegExp(`path: ${escapeRegExp(`${uploadedArtifactRoot}/`)}`));
  assert.match(successUpload, /if-no-files-found: error/u);
  assert.match(failureUpload, /if: failure\(\)/u);
  assert.match(failureUpload, /name: windows-formal-package-qa-failure-\$\{\{ env\.QA_SOURCE_SHA \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  const failurePathBlock = failureUpload.slice(
    failureUpload.indexOf("          path: |"),
    failureUpload.indexOf("          include-hidden-files:"),
  );
  for (const allowedPath of [
    `${uploadedArtifactRoot}/build/`,
    `${uploadedArtifactRoot}/artifacts/`,
    `${uploadedArtifactRoot}/formal-windows-failure-cleanup.json`,
    `${uploadedArtifactRoot}/windows-installed-tree-sbom.cdx.json`,
    `${uploadedArtifactRoot}/*.png`,
  ]) {
    assert.match(failurePathBlock, new RegExp(`^            ${escapeRegExp(allowedPath)}$`, "mu"));
  }
  assert.equal(failurePathBlock.match(/^            \$\{\{ runner\.temp \}\}\//gmu)?.length, 5);
  assert.doesNotMatch(failurePathBlock, /\/formal-windows-package-qa\.json$/mu);
  assert.doesNotMatch(workflow, /github\.workspace.*artifacts\\QA-006|artifacts[\\/]QA-006/u);
  assert.match(workflow, /include-hidden-files: true/);
  assert.match(workflow, /^\s+- scripts\/lib\/matter-desktop-authenticode\.mjs$/mu);
  assert.doesNotMatch(workflow, /matter-0\.1\.17-win-(?:build|installer)-manifest\.json/);
  assert.doesNotMatch(
    workflow,
    /Copy-Item "(?:apps\\desktop\\dist\\win|docs\\lazycodex).*?-ErrorAction SilentlyContinue/,
  );
});

test("formal Windows QA refuses an existing artifact leaf without touching a stale receipt", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "matter-formal-qa-existing-artifact-"));
  const artifactDir = path.join(temporaryRoot, "current-run-attempt");
  const receiptPath = path.join(artifactDir, "formal-windows-package-qa.json");
  const sentinel = '{"verdict":"STALE_SENTINEL"}\n';
  await mkdir(artifactDir);
  await writeFile(receiptPath, sentinel, "utf8");
  try {
    const result = spawnSync(process.execPath, [formalQaPath], {
      cwd: rootPath,
      env: {
        ...process.env,
        MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR: artifactDir,
      },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EEXIST[\s\S]*mkdir/u);
    assert.equal(await readFile(receiptPath, "utf8"), sentinel);
    assert.deepEqual(await readdir(artifactDir), ["formal-windows-package-qa.json"]);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("Windows Authenticode workflow is manual, environment-bound, exact-input-bound, and immutable", async () => {
  const workflow = await readFile(authenticodeWorkflowPath, "utf8");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request):/mu);
  assert.match(workflow, /name: \$\{\{ needs\.environment-preflight\.outputs\.environment_name \}\}/u);
  assert.match(workflow, /needs: environment-preflight/u);
  const publicPreflight = workflowStep(workflow, "Verify public dispatch and signing constants before environment read token");
  assert.doesNotMatch(publicPreflight, /secrets\.|ENVIRONMENT_READ_TOKEN/u);
  const environmentPreflight = workflowStep(workflow, "Verify exact protected environment, variables, and secret names through GitHub API");
  assert.match(environmentPreflight, /environments\/\$environmentName/u);
  assert.match(environmentPreflight, /protection_rules/u);
  assert.match(environmentPreflight, /required_reviewers/u);
  assert.match(environmentPreflight, /prevent_self_review -ne \$true/u);
  assert.match(environmentPreflight, /can_admins_bypass -ne \$false/u);
  assert.match(environmentPreflight, /protected_branches -ne \$true/u);
  assert.match(environmentPreflight, /\$baseUri\/variables\?per_page=100/u);
  assert.match(environmentPreflight, /\$baseUri\/secrets\?per_page=100/u);
  assert.match(environmentPreflight, /repository or organization fallback is forbidden/iu);
  assert.match(environmentPreflight, /secrets\.SSL_COM_ESIGNER_ENVIRONMENT_READ_TOKEN/u);
  assert.match(environmentPreflight, /environmentVariables\[\$expectedVariable\.Key\] -cne \$expectedVariable\.Value/u);
  assert.equal(
    workflow.match(/-notmatch '\\A\[\^\\p\{Cc\}\]\{1,512\}\\z'/gu)?.length,
    3,
    "every installer subject boundary must use the .NET absolute end anchor",
  );
  assert.doesNotMatch(
    workflow,
    /-notmatch '\\\\A\[\^\\\\p\{Cc\}\]\{1,512\}\\\\z'/u,
    "PowerShell single-quoted regexes must not double-escape .NET anchors or categories",
  );
  assert.doesNotMatch(
    workflow,
    /-notmatch '\^\[\^\\r\\n\]\{1,512\}\$'/u,
    "the .NET $ anchor accepts a terminal LF and cannot protect GITHUB_OUTPUT identity bytes",
  );
  const terminalLfSubject = "CN=SSL.com test publisher\n";
  assert.notEqual(
    githubOutputLineValue("cka_installer_subject", terminalLfSubject),
    terminalLfSubject,
    "a terminal LF would be stripped by single-line GITHUB_OUTPUT serialization",
  );
  for (const invalidSubject of [
    terminalLfSubject,
    "CN=SSL.com test publisher\r",
    "CN=SSL.com\ntest publisher",
    "CN=SSL.com\0test publisher",
  ]) {
    assert.equal(
      certificateSubjectOutputSafe(invalidSubject),
      false,
      "control characters must be rejected before certificate identity output",
    );
  }
  assert.equal(certificateSubjectOutputSafe("CN=SSL.com test publisher"), true);
  assert.equal(
    workflow.match(/-notmatch '\\A\[0-9A-F\]\{40\}\\z'/gu)?.length,
    6,
    "every certificate SHA-1 boundary must use the .NET absolute end anchor",
  );
  assert.equal(
    workflow.match(/-notmatch '\\A\[0-9A-F\]\{64\}\\z'/gu)?.length,
    3,
    "every certificate SHA-256 boundary must use the .NET absolute end anchor",
  );
  assert.doesNotMatch(
    workflow,
    /-notmatch '\^\[0-9A-F\]\{(?:40|64)\}\$'/u,
    "certificate digests must not use the .NET terminal-LF-tolerant $ anchor",
  );
  for (const { name, digest, length } of [
    { name: "cka_installer_certificate_sha1", digest: "A".repeat(40), length: 40 },
    { name: "cka_installer_certificate_sha256", digest: "B".repeat(64), length: 64 },
    { name: "signing_certificate_sha1", digest: "C".repeat(40), length: 40 },
  ]) {
    assert.equal(uppercaseCertificateDigestOutputSafe(digest, length), true);
    assert.equal(githubOutputLineValue(name, digest), digest, `${name} must round-trip through GITHUB_OUTPUT`);
    for (const invalidDigest of [
      `${digest}\n`,
      `${digest}\r`,
      `${digest.slice(0, 20)}\n${digest.slice(20)}`,
      `${digest.slice(0, 20)}\0${digest.slice(20)}`,
    ]) {
      assert.equal(
        uppercaseCertificateDigestOutputSafe(invalidDigest, length),
        false,
        `${name} controls must be rejected before GITHUB_OUTPUT serialization`,
      );
    }
    for (const delimiterDigest of [`${digest}\n`, `${digest}\r`, `${digest.slice(0, 20)}\n${digest.slice(20)}`]) {
      assert.notEqual(
        githubOutputLineValue(name, delimiterDigest),
        delimiterDigest,
        `${name} line delimiters would change identity under GITHUB_OUTPUT serialization`,
      );
    }
  }
  const expectedVariableMap = environmentPreflight.match(
    /\$expectedVariables = \[ordered\]@\{(?<map>[\s\S]*?)\n\s*\}\n\s*foreach \(\$expectedVariable/u,
  )?.groups?.map;
  assert.ok(expectedVariableMap, "expected-variable comparison map is missing");
  for (const [certificateBinding, jsonBinding] of [
    ["SSL_COM_ESIGNER_CKA_INSTALLER_SUBJECT", "cka_installer_subject"],
    ["SSL_COM_ESIGNER_CKA_INSTALLER_CERTIFICATE_SHA1", "cka_installer_certificate_sha1"],
    ["SSL_COM_ESIGNER_CKA_INSTALLER_CERTIFICATE_SHA256", "cka_installer_certificate_sha256"],
    ["SSL_COM_ESIGNER_CERTIFICATE_SHA1", "signing_certificate_sha1"],
  ]) {
    assert.match(expectedVariableMap, new RegExp(`${certificateBinding} = \\[string\\]\\$certificateBindings\\.${jsonBinding}`, "u"));
  }
  assert.match(environmentPreflight, /INPUT_CERTIFICATE_BINDINGS_JSON: \$\{\{ inputs\.certificate_bindings_json \}\}/u);
  assert.match(environmentPreflight, /environment_name=\$environmentName/u);
  for (const [output, jsonBinding] of [
    ["cka_installer_subject", "cka_installer_subject"],
    ["cka_installer_certificate_sha1", "cka_installer_certificate_sha1"],
    ["cka_installer_certificate_sha256", "cka_installer_certificate_sha256"],
    ["signing_certificate_sha1", "signing_certificate_sha1"],
  ]) {
    assert.match(
      environmentPreflight,
      new RegExp(`${output}=\\$\\(\\[string\\]\\$certificateBindings\\.${jsonBinding}\\)`, "u"),
      `${output} must freeze the strict-parsed dispatch identity`,
    );
    assert.match(
      workflow,
      new RegExp(`${output}: \\$\\{\\{ steps\\.protected-environment\\.outputs\\.${output} \\}\\}`, "u"),
      `${output} must be exposed by environment-preflight`,
    );
  }
  assertFrozenCertificateAuthority(workflow);
  const mutableCertificateAuthority = workflow.replace(
    "CKA_INSTALLER_SUBJECT: ${{ needs.environment-preflight.outputs.cka_installer_subject }}",
    "CKA_INSTALLER_SUBJECT: ${{ vars.SSL_COM_ESIGNER_CKA_INSTALLER_SUBJECT }}",
  );
  assert.notEqual(mutableCertificateAuthority, workflow, "certificate authority mutation fixture must apply");
  assert.throws(
    () => assertFrozenCertificateAuthority(mutableCertificateAuthority),
    /must not re-read mutable certificate identity variables/u,
    "a between-job environment mutation must not become sign-job execution authority",
  );
  assert.match(workflow, /ENVIRONMENT_GUARD: \$\{\{ vars\.SSL_COM_ESIGNER_ENVIRONMENT_GUARD \}\}/u);
  assert.match(workflow, /protected environment is missing or unconfigured/u);
  assert.match(workflow, /GITHUB_REPOSITORY -cne 'Gonyak-cell\/law-firm-os'/u);
  assert.match(workflow, /GITHUB_REF -cne 'refs\/heads\/main'/u);
  assert.match(workflow, /RUNNER_ENVIRONMENT -cne 'github-hosted'/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /cancel-in-progress: false/u);
  const workflowDispatchBlock = workflow.match(/workflow_dispatch:\n(?<block>[\s\S]*?)\npermissions:/u)?.groups?.block;
  assert.ok(workflowDispatchBlock, "workflow_dispatch input block is missing");
  assert.deepEqual(
    [...workflowDispatchBlock.matchAll(/^      (?<name>[a-z][a-z0-9_]*):\s*$/gmu)].map((match) => match.groups.name),
    [
      "source_sha",
      "source_tree",
      "approval_id",
      "approval_expires_at",
      "pilot_id",
      "lawos_tenant_id",
      "entra_tenant_id",
      "app_id",
      "certificate_bindings_json",
      "handoff_bindings_json",
    ],
    "workflow_dispatch must retain its exact closed ten-input schema",
  );

  for (const binding of [
    "SOURCE_SHA",
    "SOURCE_TREE",
    "APPROVAL_ID",
    "APPROVAL_EXPIRES_AT",
    "PILOT_ID",
    "LAWOS_TENANT_ID",
    "ENTRA_TENANT_ID",
    "APP_ID",
  ]) {
    assert.match(workflow, new RegExp(`INPUT_${binding}: \\$\\{\\{ inputs\\.`, "u"));
    assert.match(workflow, new RegExp(`APPROVED_${binding}: \\$\\{\\{ vars\\.SSL_COM_ESIGNER_`, "u"));
    assert.match(workflow, new RegExp(`\\$env:INPUT_${binding}, \\$env:APPROVED_${binding}`, "u"));
  }
  assert.match(workflow, /git rev-parse 'HEAD\^\{tree\}'/u);
  assert.match(workflow, /git status --porcelain/u);
  assert.match(workflow, /TryParseExact\(/u);
  assert.match(workflow, /expiry -le \[DateTimeOffset\]::UtcNow/u);

  for (const variable of [
    "SSL_COM_ESIGNER_CKA_VERSION",
    "SSL_COM_ESIGNER_CKA_URL",
    "SSL_COM_ESIGNER_CKA_SHA256",
    "SSL_COM_ESIGNER_TIMESTAMP_URL",
    "SSL_COM_ESIGNER_CKA_INSTALLER_SUBJECT",
    "SSL_COM_ESIGNER_CKA_INSTALLER_CERTIFICATE_SHA1",
    "SSL_COM_ESIGNER_CKA_INSTALLER_CERTIFICATE_SHA256",
    "SSL_COM_ESIGNER_CERTIFICATE_SHA1",
  ]) {
    assert.match(workflow, new RegExp(variable, "u"));
  }
  assert.match(workflow, /'1\.1\.2'/u);
  assert.match(workflow, /https:\/\/github\.com\/SSLcom\/eSignerCKA\/releases\/download\/v1\.1\.2\/SSL\.COM-eSigner-CKA_1\.1\.2\.zip/u);
  assert.match(workflow, /071ca52986795e7a00dfbd87cc5818d03af74daac32dfe32afd4171b676c4d13/u);
  assert.match(workflow, /MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: http:\/\/ts\.ssl\.com/u);

  for (const action of [
    "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
    "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
    "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
  ]) assert.match(workflow, new RegExp(`uses: ${escapeRegExp(action)}`, "u"));
  for (const action of workflow.matchAll(/uses:\s+([^\s]+)/gu)) {
    if (action[1] === "./.github/workflows/windows-signed-artifact-private-handoff-oidc.yml") continue;
    assert.match(action[1], /@[0-9a-f]{40}$/u);
  }
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d/iu);
  assert.doesNotMatch(workflow, /continue-on-error:/u);
});

test("Windows private handoff isolates AWS OIDC authority in an exact same-commit reusable workflow", async () => {
  const [workflow, privateHandoffOidcWorkflow] = await Promise.all([
    readFile(authenticodeWorkflowPath, "utf8"),
    readFile(privateHandoffOidcWorkflowPath, "utf8"),
  ]);
  const verifierJob = workflowJob(workflow, "verify-private-handoff-bridge");
  const callerJob = workflowJob(workflow, "private-immutable-handoff");
  const oidcJob = workflowJob(privateHandoffOidcWorkflow, "private-immutable-handoff");

  assert.match(privateHandoffOidcWorkflow, /^name: Windows Signed Artifact Private Handoff OIDC$/mu);
  assert.match(privateHandoffOidcWorkflow, /^  workflow_call:$/mu);
  assert.doesNotMatch(privateHandoffOidcWorkflow, /^    secrets:/mu);
  const workflowCallInputs = privateHandoffOidcWorkflow.match(
    /workflow_call:\n    inputs:\n(?<block>[\s\S]*?)\n    outputs:/u,
  )?.groups?.block;
  assert.ok(workflowCallInputs, "private handoff workflow_call inputs are missing");
  assert.deepEqual(
    [...workflowCallInputs.matchAll(/^      (?<name>[a-z][a-z0-9_]*):\s*$/gmu)].map((match) => match.groups.name),
    [
      "source_sha",
      "source_tree",
      "account_id",
      "region",
      "uploader_role_arn",
      "bucket",
      "artifact_kms_key_arn",
      "retain_until",
      "wrapping_kms_key_arn",
      "wrapping_public_key_spki_b64",
      "wrapping_public_key_sha256",
      "candidate_role",
      "verified_bundle_artifact_id",
      "verified_bundle_artifact_digest",
      "verified_bundle_manifest_sha256",
      "encrypted_bridge_envelope_sha256",
    ],
    "private handoff workflow_call must retain its exact closed input schema",
  );
  const workflowCallOutputs = privateHandoffOidcWorkflow.match(
    /    outputs:\n(?<block>[\s\S]*?)\n\npermissions: \{\}/u,
  )?.groups?.block;
  assert.ok(workflowCallOutputs, "private handoff workflow_call outputs are missing");
  const outputNames = [...workflowCallOutputs.matchAll(/^      (?<name>[a-z][a-z0-9_]*):\s*$/gmu)]
    .map((match) => match.groups.name);
  assert.deepEqual(outputNames, [
    "private_receipt_sha256",
    "private_locator_artifact_name",
    "private_locator_artifact_id",
    "private_locator_artifact_digest",
    "private_locator_envelope_sha256",
    "public_evidence_artifact_id",
    "public_evidence_artifact_digest",
    "cleanup_verified",
  ]);
  assert.doesNotMatch(outputNames.join("\n"), /bucket|object_key|version_id|kms/u);

  assert.match(verifierJob, /permissions:\n      contents: read/u);
  assert.doesNotMatch(verifierJob, /id-token:\s*write/u);
  assert.match(verifierJob, /law-firm-os\.windows-signed-artifact-no-oidc-verified-bundle\.v1/u);
  assert.match(verifierJob, /verified_bundle_manifest_sha256=\$manifestSha256/u);
  assert.match(verifierJob, /plaintext_signed_artifact_included = \$false/u);
  assert.match(verifierJob, /cross_run_artifact = \$false/u);
  assert.match(verifierJob, /verified_without_oidc = \$true/u);
  assert.match(verifierJob, /Compare-Object -ReferenceObject \$expectedRelativePaths -DifferenceObject \$actualRelativePaths/u);
  const verifiedBundleUpload = workflowStep(workflow, "Upload no-OIDC-verified current-run handoff bundle");
  assert.match(verifiedBundleUpload, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
  assert.match(verifiedBundleUpload, /windows-signed-verified-handoff-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.doesNotMatch(verifiedBundleUpload, /github-token|repository:|run-id:/u);

  assert.match(callerJob, /needs:[\s\S]*- verify-private-handoff-bridge/u);
  assert.match(callerJob, /uses: \.\/\.github\/workflows\/windows-signed-artifact-private-handoff-oidc\.yml/u);
  assert.match(callerJob, /permissions:\n      actions: read\n      contents: read\n      id-token: write/u);
  assert.doesNotMatch(callerJob, /\n    (?:runs-on|environment|steps|secrets):/u);
  for (const verifiedInput of [
    "verified_bundle_artifact_id",
    "verified_bundle_artifact_digest",
    "verified_bundle_manifest_sha256",
    "encrypted_bridge_envelope_sha256",
  ]) {
    assert.match(
      callerJob,
      new RegExp(`${verifiedInput}: \\$\\{\\{ needs\\.verify-private-handoff-bridge\\.outputs\\.${verifiedInput} \\}\\}`, "u"),
    );
  }
  assert.doesNotMatch(callerJob, /needs\.sign-and-qa\.outputs\.(?:encrypted_bridge|pre_handoff_evidence)/u);
  assert.doesNotMatch(callerJob, /secrets:/u);

  assert.match(
    oidcJob,
    /github\.workflow_ref == 'Gonyak-cell\/law-firm-os\/\.github\/workflows\/windows-authenticode-package-qa\.yml@refs\/heads\/main'/u,
  );
  assert.match(oidcJob, /github\.event_name == 'workflow_dispatch'/u);
  assert.match(oidcJob, /permissions:\n      actions: read\n      contents: read\n      id-token: write/u);
  assert.match(oidcJob, /environment:\n      name: windows-signed-artifact-handoff/u);
  const downloadStart = oidcJob.indexOf("Download exact no-OIDC-verified current-run handoff bundle by immutable artifact ID");
  const checkoutStart = oidcJob.indexOf("Checkout exact source SHA for protected handoff code");
  const setupStart = oidcJob.indexOf("Set up reviewed Node runtime without dependency installation");
  const configureStart = oidcJob.indexOf("Acquire short-lived AWS credentials from the independently verified current-run bundle gate");
  const firstShell = oidcJob.search(/\n        (?:shell|run):/u);
  assert.ok(
    downloadStart >= 0
      && downloadStart < checkoutStart
      && checkoutStart < setupStart
      && setupStart < configureStart
      && configureStart < firstShell,
    "only pinned download, checkout, runtime setup, and AWS exchange may precede repository or shell execution",
  );
  const verifiedBundleDownload = workflowStep(
    privateHandoffOidcWorkflow,
    "Download exact no-OIDC-verified current-run handoff bundle by immutable artifact ID",
  );
  assert.match(verifiedBundleDownload, /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/u);
  assert.match(verifiedBundleDownload, /artifact-ids: \$\{\{ inputs\.verified_bundle_artifact_id \}\}/u);
  assert.doesNotMatch(verifiedBundleDownload, /github-token|repository:|run-id:/u);
  assert.match(oidcJob, /verified bundle manifest digest differs/u);
  assert.match(oidcJob, /artifact\.digest -cne "sha256:\$env:VERIFIED_BUNDLE_ARTIFACT_DIGEST"/u);
  assert.match(oidcJob, /artifact\.workflow_run\.id -cne \$env:GITHUB_RUN_ID/u);
  assert.match(oidcJob, /downloaded verified bundle file set is not exact/u);
  assert.match(oidcJob, /VERIFIED_BUNDLE_ARTIFACT_DIGEST -notmatch '\\A\[0-9a-f\]\{64\}\\z'/u);
  for (const action of privateHandoffOidcWorkflow.matchAll(/uses:\s+([^\s]+)/gu)) {
    assert.match(action[1], /@[0-9a-f]{40}$/u);
  }
  assert.doesNotMatch(privateHandoffOidcWorkflow, /uses:\s+[^\s]+@v\d/iu);
  assert.doesNotMatch(privateHandoffOidcWorkflow, /\$\{\{\s*secrets\./u);
});

test("Windows Authenticode workflow validates public inputs and vendor bytes before secrets", async () => {
  const workflow = await readFile(authenticodeWorkflowPath, "utf8");
  const noSecretPublicPreflight = workflowStep(
    workflow,
    "Verify public dispatch and signing constants before environment read token",
  );
  assert.match(noSecretPublicPreflight, /INPUT_CERTIFICATE_BINDINGS_JSON: \$\{\{ inputs\.certificate_bindings_json \}\}/u);
  assert.match(noSecretPublicPreflight, /ConvertFrom-Json -AsHashtable/u);
  assert.match(noSecretPublicPreflight, /certificateBindings -isnot \[Collections\.IDictionary\]/u);
  assert.match(noSecretPublicPreflight, /certificateBindings\.Count -ne \$certificateBindingKeys\.Count/u);
  assert.match(noSecretPublicPreflight, /certificate_bindings_json must contain exactly four valid public certificate identities/u);
  assert.doesNotMatch(noSecretPublicPreflight, /secrets\./u);
  const publicPreflightStart = workflow.indexOf(
    "Verify public dispatch and signing constants before environment read token",
  );
  const environmentReadToken = workflow.indexOf("secrets.SSL_COM_ESIGNER_ENVIRONMENT_READ_TOKEN");
  assert.ok(publicPreflightStart >= 0 && publicPreflightStart < environmentReadToken);
  assert.deepEqual(
    [...workflow.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/gu)].map((match) => match[1]),
    [
      "SSL_COM_ESIGNER_ENVIRONMENT_READ_TOKEN",
      "SSL_COM_ESIGNER_USERNAME",
      "SSL_COM_ESIGNER_PASSWORD",
      "SSL_COM_ESIGNER_TOTP_SECRET",
    ],
  );
  const sourceGuard = workflow.indexOf("Verify exact source, tree, approval, pilot, tenant, and app bindings");
  const publicGuard = workflow.indexOf("Verify protected public SSL.com configuration before signing credential access");
  const vendorGuard = workflow.indexOf("Download, validate, and install exact SSL.com eSigner CKA");
  const dependencies = workflow.indexOf("Install exact dependencies before signing credential access");
  const builderToolchain = workflow.indexOf("Materialize verified local electron-builder before signing credential access");
  const approvalRecheck = workflow.indexOf("Recheck approval window immediately before signing credential access");
  const firstSigningCredential = workflow.indexOf("secrets.SSL_COM_ESIGNER_USERNAME");
  assert.ok(
    sourceGuard >= 0
      && sourceGuard < publicGuard
      && publicGuard < vendorGuard
      && vendorGuard < dependencies
      && dependencies < builderToolchain
      && builderToolchain < approvalRecheck
      && approvalRecheck < firstSigningCredential,
    "all source, protected-public, vendor-byte, and dependency checks must precede signing credentials",
  );

  const vendorStep = workflowStep(workflow, "Download, validate, and install exact SSL.com eSigner CKA");
  for (const guard of [
    "Get-FileHash -LiteralPath $zipPath -Algorithm SHA256",
    "[IO.Compression.ZipFile]::OpenRead($zipPath)",
    "archive contains an unsafe path",
    "archive expands beyond the safe limit",
    "archive must contain exactly one installer executable",
    "ReparsePoint",
    "Get-AuthenticodeSignature -LiteralPath $installerPath",
    "TimeStamperCertificate",
    "1.3.6.1.5.5.7.3.3",
    "1.3.6.1.5.5.7.3.8",
    "Get-CertificateSha256 $vendorSignature.SignerCertificate",
    "SignerCertificate.Subject -cne $env:EXPECTED_CKA_INSTALLER_SUBJECT",
    "SignerCertificate.Thumbprint.ToUpperInvariant() -cne $env:EXPECTED_CKA_INSTALLER_CERTIFICATE_SHA1",
    "vendorCertificateSha256 -cne $env:EXPECTED_CKA_INSTALLER_CERTIFICATE_SHA256",
  ]) {
    assert.match(vendorStep, new RegExp(escapeRegExp(guard), "u"));
  }
  const digestGuard = vendorStep.indexOf("archive digest mismatch");
  const extraction = vendorStep.indexOf("Expand-Archive");
  const vendorSignature = vendorStep.indexOf("Get-AuthenticodeSignature");
  const installerExecution = vendorStep.indexOf("& $installerPath /CURRENTUSER");
  assert.ok(digestGuard >= 0 && digestGuard < extraction);
  assert.ok(extraction < vendorSignature && vendorSignature < installerExecution);
  assert.doesNotMatch(vendorStep, /secrets\.|SSL_COM_ESIGNER_(?:USERNAME|PASSWORD|TOTP_SECRET)/u);
  assert.doesNotMatch(vendorStep, /SignerCertificate\.Subject -notmatch|Select-Object\s+-First\s+1/iu);

  const [toolchainStep, toolchainPackage, toolchainLockBody] = await Promise.all([
    Promise.resolve(workflowStep(workflow, "Materialize verified local electron-builder before signing credential access")),
    readFile(authenticodeBuilderToolchainPackagePath, "utf8").then(JSON.parse),
    readFile(authenticodeBuilderToolchainLockPath, "utf8"),
  ]);
  const toolchainLock = JSON.parse(toolchainLockBody);
  assert.equal(toolchainPackage.dependencies["electron-builder"], "26.15.3");
  assert.equal(toolchainLock.packages["node_modules/electron-builder"].version, "26.15.3");
  assert.equal(toolchainLock.packages["node_modules/app-builder-lib"].version, "26.15.3");
  assert.equal(
    createHash("sha256").update(toolchainLockBody).digest("hex"),
    "d13063e65f5c6f07f78b7319fe562b68a0072fb264a7a207b5cef185350d72f6",
  );
  for (const [packagePath, lockedPackage] of Object.entries(toolchainLock.packages)) {
    if (!packagePath || !lockedPackage.resolved?.startsWith("https://registry.npmjs.org/")) continue;
    assert.match(lockedPackage.integrity ?? "", /^sha512-/u, `${packagePath} must have a reviewed npm integrity`);
  }
  assert.match(toolchainStep, /\.github\\toolchains\\windows-authenticode-electron-builder/u);
  assert.match(toolchainStep, /d13063e65f5c6f07f78b7319fe562b68a0072fb264a7a207b5cef185350d72f6/u);
  assert.doesNotMatch(toolchainStep, /npm install|package-lock-only/u);
  assert.match(toolchainStep, /NPM_CONFIG_AUDIT: 'false'/u);
  assert.match(toolchainStep, /NPM_CONFIG_FUND: 'false'/u);
  assert.match(toolchainStep, /npm ci --ignore-scripts --prefix \$toolRoot/u);
  assert.match(toolchainStep, /electron-v42\.7\.0-win32-x64\.zip/u);
  assert.match(workflow, /LAWOS_ELECTRON_VERSION: 42\.7\.0/u);
  assert.match(workflow, /LAWOS_ELECTRON_SHA256: 56ef74c90fd8d145a5b41a7d3be6e2207fcc838538f8e92a713cecce54a7d667/u);
  assert.match(toolchainStep, /-cne \$env:LAWOS_ELECTRON_SHA256/u);
  assert.match(workflow, /electron_version = \$env:LAWOS_ELECTRON_VERSION/u);
  assert.match(workflow, /electron_url = \$env:LAWOS_ELECTRON_URL/u);
  assert.match(workflow, /electron_sha256 = \$env:LAWOS_ELECTRON_SHA256/u);
  assert.match(toolchainStep, /MATTER_DESKTOP_BUILD_RECEIPT: '0'/u);
  const unsignedRendererPreparation = toolchainStep.indexOf("run prepare:web-renderer");
  const unsignedInstallerBuild = toolchainStep.indexOf("run build:win:installer");
  assert.ok(
    unsignedRendererPreparation >= 0 && unsignedRendererPreparation < unsignedInstallerBuild,
    "clean-checkout renderer preparation must precede the unsigned installer cache exercise",
  );
  assert.match(toolchainStep, /apps\\web\\dist/u);
  assert.match(toolchainStep, /apps\\desktop\\src\\renderer\\web/u);
  assert.match(toolchainStep, /unsigned renderer preflight residue cleanup failed/u);
  assert.match(toolchainStep, /unsigned packaging toolchain preflight failed/u);
  assert.match(toolchainStep, /@electron\\windows-sign\\package\.json/u);
  assert.match(toolchainStep, /signToolPackage\.version -cne '2\.0\.3'/u);
  assert.match(toolchainStep, /a36f5e81ce208137acc8fa9c00547c020fa10f044583002ccd23799b7f64078e/u);
  assert.match(toolchainStep, /Get-FileHash -LiteralPath \$env:SIGNTOOL_PATH/u);

  const approvalStep = workflowStep(workflow, "Recheck approval window immediately before signing credential access");
  assert.match(approvalStep, /UtcNow\.AddMinutes\(60\)/u);
  assert.doesNotMatch(approvalStep, /secrets\./u);
});

test("Windows Authenticode credentials are product-only, suppressed, and excluded from evidence", async () => {
  const [workflow, privateHandoffOidcWorkflow] = await Promise.all([
    readFile(authenticodeWorkflowPath, "utf8"),
    readFile(privateHandoffOidcWorkflowPath, "utf8"),
  ]);
  const environmentPreflight = workflowStep(
    workflow,
    "Verify exact protected environment, variables, and secret names through GitHub API",
  );
  assert.doesNotMatch(environmentPreflight, /Write-(?:Host|Output|Debug|Verbose|Information)|echo|Tee-Object/iu);
  assert.match(environmentPreflight, /environment_name=\$environmentName/u);
  const secretStep = workflowStep(workflow, "Configure SSL.com eSigner CKA in product mode and load certificate");
  assert.match(secretStep, /-mode product/u);
  assert.match(secretStep, /-user \$env:SSL_COM_ESIGNER_USERNAME/u);
  assert.match(secretStep, /-pass \$env:SSL_COM_ESIGNER_PASSWORD/u);
  assert.match(secretStep, /-totp \$env:SSL_COM_ESIGNER_TOTP_SECRET/u);
  assert.match(secretStep, /config .* \*> \$null/u);
  assert.match(secretStep, /load \*> \$null/u);
  assert.doesNotMatch(secretStep, /Write-(?:Host|Output|Debug|Verbose|Information)|echo|Tee-Object|Out-File|Set-Content|GITHUB_(?:ENV|OUTPUT)/iu);

  const evidenceStep = workflowStep(workflow, "Record sanitized signed PASS or fail closed");
  for (const secret of [
    "SSL_COM_ESIGNER_USERNAME",
    "SSL_COM_ESIGNER_PASSWORD",
    "SSL_COM_ESIGNER_TOTP_SECRET",
    "SSL_COM_ESIGNER_ENVIRONMENT_READ_TOKEN",
    "master.key",
  ]) assert.doesNotMatch(evidenceStep, new RegExp(escapeRegExp(secret), "u"));
  assert.match(evidenceStep, /secrets_recorded = \$false/u);
  assert.match(evidenceStep, /provider_logs_uploaded = \$false/u);
  assert.match(evidenceStep, /signed_package_uploaded = \$false/u);
  assert.match(evidenceStep, /installed_tree_sbom_uploaded = \$false/u);

  const uploadStep = workflowStep(privateHandoffOidcWorkflow, "Upload sanitized public evidence only");
  assert.match(uploadStep, /if: \$\{\{ success\(\) && steps\.private-handoff-cleanup\.outputs\.verified == 'true' \}\}/u);
  assert.match(uploadStep, /path: \$\{\{ runner\.temp \}\}\/lawos-windows-handoff-public-evidence\/receipt\.json/u);
  assert.doesNotMatch(
    uploadStep,
    /apps\/desktop\/dist|eSignerCKA|matter-desktop-windows-qa|lawos-windows-private|lawos-windows-handoff-decrypted|\*\*/u,
  );
});

test("Windows Authenticode workflow requires the exact certificate, shared signed QA PASS, and always cleans up", async () => {
  const [workflow, installerBuilder] = await Promise.all([
    readFile(authenticodeWorkflowPath, "utf8"),
    readFile(installerBuilderPath, "utf8"),
  ]);
  const certificateStep = workflowStep(workflow, "Require exactly one matching CurrentUser code-signing certificate");
  assert.match(certificateStep, /Cert:\\CurrentUser\\My -CodeSigningCert/u);
  assert.match(certificateStep, /Thumbprint\.ToUpperInvariant\(\) -ceq \$env:EXPECTED_CERTIFICATE_SHA1/u);
  assert.match(certificateStep, /matchingCertificates\.Count -ne 1/u);
  assert.match(certificateStep, /HasPrivateKey -ne \$true/u);
  assert.doesNotMatch(workflow, /Select-Object\s+-First\s+1/iu);

  const buildStep = workflowStep(workflow, "Build exact-source signed formal Windows package");
  assert.match(buildStep, /MATTER_DESKTOP_RELEASE_CHANNEL: formal/u);
  assert.match(buildStep, /MATTER_DESKTOP_AUTHENTICODE: '1'/u);
  assert.match(buildStep, /MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1:/u);
  assert.match(buildStep, /MATTER_DESKTOP_ELECTRON_BUILDER_EXECUTABLE:/u);
  assert.match(buildStep, /MATTER_DESKTOP_ELECTRON_DIST:/u);
  assert.match(buildStep, /SIGNTOOL_PATH:/u);
  assert.match(buildStep, /MATTER_DESKTOP_SIGNTOOL_SHA256:/u);
  assert.match(buildStep, /ELECTRON_BUILDER_CACHE:/u);
  assert.match(buildStep, /NPM_CONFIG_OFFLINE: 'true'/u);
  assert.match(buildStep, /approval expired before signing/u);
  assert.match(buildStep, /build:win:installer/u);
  assert.match(installerBuilder, /formal Authenticode builds require a preinstalled electron-builder executable/u);
  assert.match(installerBuilder, /formal Authenticode builds require a preverified Electron distribution/u);
  assert.match(installerBuilder, /formal Authenticode builds require a preverified explicit signtool/u);
  assert.match(installerBuilder, /preverified signtool digest mismatch/u);
  assert.match(installerBuilder, /-c\.electronDist=/u);
  assert.match(installerBuilder, /explicitBuilderExecutable \? process\.execPath : npxExecutable/u);
  const networkBlockStep = workflowStep(workflow, "Block Node network during the signed packaging boundary");
  assert.match(networkBlockStep, /New-NetFirewallRule/u);
  assert.match(networkBlockStep, /-Program \$nodePath -Action Block/u);
  const unloadStep = workflowStep(workflow, "Unload signing authority and restore Node network before native QA");
  assert.match(unloadStep, /eSignerCKATool\.exe/u);
  assert.match(unloadStep, /Remove-NetFirewallRule/u);
  const qaStep = workflowStep(workflow, "Run shared native install, login, leave, payroll, restart, and uninstall QA");
  assert.match(qaStep, /node scripts\/run-formal-windows-package-qa\.mjs/u);
  assert.match(qaStep, /MATTER_DESKTOP_AUTHENTICODE: '1'/u);

  const evidenceStep = workflowStep(workflow, "Record sanitized signed PASS or fail closed");
  for (const requirement of [
    "PRIOR_JOB_STATUS -ceq 'success'",
    "qa.verdict -ceq 'PASS'",
    "qa.native_verdict -ceq 'PASS'",
    "qa.source.revision -ceq $env:INPUT_SOURCE_SHA",
    "qa.source.source_tree -ceq $env:INPUT_SOURCE_TREE",
    "qa.package.channel -ceq 'formal'",
    "qa.package.app_id -ceq $env:INPUT_APP_ID",
    "qa.authenticode.valid -eq $true",
    "qa.authenticode.expected_signer_certificate_sha1 -ceq $env:EXPECTED_CERTIFICATE_SHA1",
    "qa.authenticode.signer_code_signing_eku_verified -eq $true",
    "qa.authenticode.timestamp_eku_verified -eq $true",
    "qa.sbom.schema_version -ceq 'law-firm-os.matter-desktop-installed-tree-sbom.v1'",
    "qa.sbom.format -ceq 'CycloneDX'",
    "qa.sbom.spec_version -ceq '1.5'",
    "qa.sbom.installed_binary_complete -eq $true",
    "qa.sbom.alternate_data_stream_count -eq 0",
    "qa.sbom.authenticode_bound -eq $true",
    "approvalCurrent",
  ]) assert.match(evidenceStep, new RegExp(escapeRegExp(requirement), "u"));
  assert.match(evidenceStep, /state = if \(\$signedPass\) \{ 'PENDING_CLEANUP' \} else \{ 'BLOCKED' \}/u);
  assert.match(evidenceStep, /qa_state = if \(\$signedPass\) \{ 'PASS' \} else \{ 'BLOCKED' \}/u);
  assert.match(evidenceStep, /if \(-not \$signedPass\) \{ throw 'SIGNED_WINDOWS_QA_BLOCKED' \}/u);
  assert.match(evidenceStep, /if: always\(\)/u);

  const cleanupStep = workflowStep(workflow, "Always remove certificates, credentials, vendor files, and private QA residue");
  assert.match(cleanupStep, /if: always\(\)/u);
  for (const cleanup of [
    "& $toolPath unload *> $null",
    "Remove-Item -Force",
    "unins*.exe",
    "lawos-esigner",
    "eSignerCKA",
    "matter-desktop-windows-qa",
    "matter-desktop-windows-receipt",
    "apps\\desktop\\dist",
    "apps\\web\\dist",
    "apps\\desktop\\src\\renderer\\web",
    "pathResidue",
    "firewallResidue",
    "cleanup.verified = $cleanupVerified",
    "receipt.qa_state -ceq 'PASS' -and $cleanupVerified",
    "{ 'PASS' } else { 'BLOCKED' }",
    "signing residue cleanup failed",
  ]) assert.match(cleanupStep, new RegExp(escapeRegExp(cleanup), "u"));
});

test("formal Windows QA structurally gates every NSIS execution and app launch on Authenticode", async () => {
  const source = await readFile(formalQaPath, "utf8");
  assert.match(source, /authenticodeConfiguration === null\s*\? runAfterUnsignedMatterDesktopTechnicalCandidateInspection\(options\)\s*:\s*runAfterMatterDesktopAuthenticodeVerification/u);
  assert.ok((source.match(/runAfterFormalWindowsTrustInspection\(\{/gu)?.length ?? 0) >= 3);
  const preinstallProbe = source.indexOf("installerLockedSession = await openWindowsLockedExecutable({ executablePath: INSTALLER_PATH })");
  const installAction = source.indexOf("action: async () => installPackage(installerLockedSession)");
  const installedProbe = source.indexOf("initialLockedSession = await openWindowsLockedExecutable({ executablePath: installed.executablePath })");
  const installedHash = source.indexOf("actualExecutableSha256: initialLockedSession.inspection.sha256");
  const inventory = source.indexOf("installedTreeInventory = captureStableInstalledTreeInventory(installDir)");
  const sbomWrite = source.indexOf("writeFileSync(INSTALLED_TREE_SBOM_PATH");
  const firstLaunch = source.indexOf("return launchFormalApp");
  const restartProbe = source.indexOf("restartLockedSession = await openWindowsLockedExecutable({ executablePath: installed.executablePath })");
  const restartHash = source.indexOf("actualExecutableSha256: restartLockedSession.inspection.sha256", installedHash + 1);
  const restartLaunch = source.indexOf("action: async () => launchFormalApp", firstLaunch + 1);
  assert.ok(preinstallProbe >= 0 && preinstallProbe < installAction);
  assert.ok(installedProbe > installAction && installedProbe < firstLaunch);
  assert.ok(installedHash > installedProbe && installedHash < firstLaunch);
  assert.ok(inventory > installedHash && inventory < sbomWrite && sbomWrite < firstLaunch);
  assert.ok(restartProbe > firstLaunch && restartProbe < restartLaunch);
  assert.ok(restartHash > restartProbe && restartHash < restartLaunch);
  assert.match(source, /executable_byte_parity_prelaunch: installedExecutablePrelaunchParity/u);
  assert.match(source, /executable_byte_parity_restart_prelaunch: installedExecutableRestartPrelaunchParity/u);
  assert.match(source, /captureStableInstalledTreeInventory\(installDir\)/u);
  assert.match(source, /captureWindowsInstalledTreeNativeSnapshot/u);
  assert.match(source, /native_fixed_point_sequence: installedTreeInventory\.native\.fixed_point_sequence/u);
  assert.match(source, /native_fixed_point_exact: installedTreeInventory\.native\.fixed_point_exact/u);
  assert.match(source, /native_snapshot: \{/u);
  assert.match(source, /equality_proof: installedTreeInventory\.native\.equality_proof/u);
  assert.match(source, /phases: installedTreeInventory\.native\.phases/u);
  assert.match(source, /native_directory_count: installedTreeInventory\.native\.directory_count/u);
  assert.match(source, /native_identity_sha256: installedTreeInventory\.native\.identity_sha256/u);
  assert.match(source, /alternate_data_stream_count: installedTreeInventory\.native\.alternate_data_stream_count/u);
  assert.match(source, /validateMatterDesktopAuthenticodeSignatures\(/u);
  assert.match(source, /Windows installer changed after trust inspection/u);
  assert.match(source, /installed_binary_complete: true/u);
  assert.match(source, /reparse_point_count: installedTreeInventory\.native\.reparse_point_count/u);
  assert.match(source, /installed tree changed during native QA/u);
  assert.match(source, /post_runtime_tree_sha256: installedTreePostRuntimeInventory\.sha256/u);
  assert.match(source, /post_runtime_byte_identical: true/u);
  assert.match(source, /lockedSession\.launch\(\["\/S", `\/D=\$\{installDir\}`\]/u);
  assert.match(source, /lockedSession\.waitForProcessExit\(processRecord\.pid\)/u);
  assert.match(source, /executablePath: lockedSession\.path/u);
  const launchHelper = source.slice(
    source.indexOf("async function launchFormalApp"),
    source.indexOf("async function login"),
  );
  const launchTry = launchHelper.indexOf("try {");
  const launchCatch = launchHelper.indexOf("} catch (error) {");
  for (const protectedStep of [
    "const electronPid = await app.evaluate(() => process.pid)",
    "const adopted = await lockedSession.adoptProcess(electronPid)",
    "const page = await findProductPage(app)",
    "await page.setViewportSize",
    "await page.emulateMedia",
    "const initialUrl = new URL(page.url())",
    "assert.equal(initialUrl.searchParams.get(\"desktop\"), \"1\")",
    "return { app, page, processPid: adopted.pid }",
  ]) {
    const position = launchHelper.indexOf(protectedStep);
    assert.ok(position > launchTry && position < launchCatch, `${protectedStep} must be inside launch cleanup catch`);
  }
  assert.match(launchHelper, /return cleanupFailedWindowsElectronLaunch\(\{ app, lockedSession, error \}\)/u);
  assert.doesNotMatch(source, /app\.process\(\)\?\.pid/u);
  assert.match(source, /await initialLockedSession\.waitForProcessExit\(initialProcessPid\)/u);
  assert.match(source, /await restartLockedSession\.waitForProcessExit\(restartProcessPid\)/u);
  const finalCleanup = source.slice(source.lastIndexOf("} finally {"));
  assert.match(finalCleanup, /const cleanupErrors = \[\]/u);
  assert.match(finalCleanup, /try \{ await cleanup\(\); \} catch \(cleanupError\) \{ cleanupErrors\.push\(cleanupError\); \}/u);
  assert.match(finalCleanup, /settleLockedSession\(initialLockedSession, initialProcessPid\)/u);
  assert.match(finalCleanup, /settleLockedSession\(restartLockedSession, restartProcessPid\)/u);
  assert.match(finalCleanup, /settleLockedSession\(installerLockedSession\)/u);
  assert.match(finalCleanup, /await attemptCleanup\(async \(\) => \{\s*failureCleanup = await cleanupFailedWindowsNsisInstallation/u);
  assert.match(finalCleanup, /cleanupTemporaryDirectories\([\s\S]*priorError: null/u);
  assert.match(finalCleanup, /warning\.warning === "temporary_directory_cleanup_deferred"[\s\S]*cleanupErrors\.push/u);
  assert.match(finalCleanup, /new AggregateError\(\s*\[\.\.\.\(qaError \? \[qaError\] : \[\]\), \.\.\.cleanupErrors\]/u);
  assert.doesNotMatch(finalCleanup, /\.catch\(\(\) => \{\}\)|windows_locked_executable_.*_cleanup_failed/u);
  const mainTry = source.indexOf("try {", source.indexOf("let successReceipt = null"));
  const outerFinally = source.lastIndexOf("} finally {");
  const postCleanup = source.indexOf("\n}\n\nassert.ok(successReceipt", outerFinally);
  const receiptStage = source.indexOf("successReceipt = {", mainTry);
  const receiptWrite = source.indexOf("writeFileSync(RECEIPT_PATH");
  const passEmission = source.indexOf("process.stdout.write", receiptWrite);
  const artifactParentCreation = source.indexOf("mkdirSync(path.dirname(ARTIFACT_DIR), { recursive: true });");
  const artifactLeafCreation = source.indexOf("mkdirSync(ARTIFACT_DIR);");
  const firstTemporaryWork = source.indexOf("const userDataPath = mkdtempSync");
  assert.ok(mainTry >= 0 && receiptStage > mainTry && receiptStage < outerFinally);
  assert.ok(postCleanup > outerFinally && receiptWrite > postCleanup && passEmission > receiptWrite);
  assert.doesNotMatch(source.slice(mainTry, postCleanup), /writeFileSync\(RECEIPT_PATH|process\.stdout\.write/u);
  assert.ok(artifactParentCreation >= 0 && artifactParentCreation < artifactLeafCreation);
  assert.ok(artifactLeafCreation < firstTemporaryWork);
  assert.equal(source.match(/mkdirSync\(ARTIFACT_DIR\)/gu)?.length, 1);
  assert.doesNotMatch(source, /mkdirSync\(ARTIFACT_DIR, \{ recursive: true \}\)|\brmSync\b/u);
  assert.doesNotMatch(source, /execFileSync\(INSTALLER_PATH/u);
  assert.match(
    source,
    /uninstallerReceipt = await runLockedUninstaller\(\{\s*installed,\s*inventory: installedTreePostRuntimeInventory,\s*\}\)/u,
  );
  assert.match(source, /exactInstalledInventoryEntry\(inventory, installDir, installed\.uninstallerPath\)/u);
  assert.match(source, /openWindowsLockedExecutable\(\{ executablePath: installed\.uninstallerPath \}\)/u);
  assert.match(source, /session\.inspection\.sha256,\s*inventoryBinding\.entry\.sha256/u);
  assert.match(source, /validateMatterDesktopAuthenticodeSignature\(/u);
  assert.match(source, /processRecord = await session\.launch\(\["\/S"\]/u);
  assert.match(source, /await session\.waitForProcessExit\(processRecord\.pid\)/u);
  assert.doesNotMatch(source, /execFileSync\(installed\.uninstallerPath/u);
  assert.match(source, /executeLocked: async \(filePath, args\)/u);
  assert.match(source, /uninstaller: uninstallerReceipt/u);
  assert.match(source, /uninstaller_bytes: session\.inspection\.bytes/u);
  assert.match(source, /runLockedUninstaller[\s\S]*authenticode_valid: trust\.verification\?\.signature_count === 1/u);
  assert.match(source, /cleanupFailedWindowsNsisInstallation/u);
  assert.match(source, /primary_error_preserved: qaError !== null/u);
});
