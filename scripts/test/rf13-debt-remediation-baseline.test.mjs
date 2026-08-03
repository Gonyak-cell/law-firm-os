import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  Rf13BaselineError,
  captureStableRf13Source,
  generateRf13DebtRemediationBaseline,
  validateRf13DebtRemediationBaseline,
} from "../lib/rf13-debt-remediation-baseline.mjs";

const HASH = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function fixtureRepo(t) {
  const root = await mkdtemp(join(tmpdir(), "lawos-rfd-tuw-001-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "qa@example.test"], { cwd: root });
  execFileSync("git", ["config", "user.name", "RFD QA"], { cwd: root });
  await mkdir(join(root, ".git", "info"), { recursive: true });
  await writeFile(join(root, ".git", "info", "exclude"), ".omo/\n", { mode: 0o600 });
  await mkdir(join(root, "workbook"), { recursive: true });
  await writeFile(join(root, "workbook", "plan.md"), "# plan\nRFD-TUW-001\n", { mode: 0o600 });
  await writeFile(join(root, "workbook", "goal.md"), "# goal\nRF13-DIST\n", { mode: 0o600 });
  await writeFile(join(root, "source.txt"), "baseline\n", { mode: 0o600 });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });

  const historical = join(root, ".omo", "evidence", "rf13-final-gate-test");
  await mkdir(historical, { recursive: true });
  const hashSet = (name, hash, extra = "") => `${hash}  apps/desktop/dist/matter-${name}.zip\n${extra}`;
  await writeFile(join(historical, "artifact-hashes.txt"), hashSet("internal", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"));
  await writeFile(join(historical, "artifact-hashes.rerun2.txt"), hashSet("internal", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"));
  await writeFile(join(historical, "artifact-hashes.rerun3.txt"), hashSet("internal", "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"));
  const state = (tree) => JSON.stringify({
    captured_at: `2026-07-31T00:00:0${tree}.000Z`,
    source_sha: "1111111111111111111111111111111111111111",
    source_tree: "2222222222222222222222222222222222222222",
    source_dirty: true,
    diff_sha256: tree.repeat(64),
    status_sha256: tree.repeat(64),
    manifest_sha256: tree.repeat(64),
    working_tree_sha256: tree.repeat(64),
    goal_sha256: "3333333333333333333333333333333333333333333333333333333333333333",
    goal_bytes: 10,
  }, null, 2) + "\n";
  await writeFile(join(historical, "source-state-before.json"), state("a"));
  await writeFile(join(historical, "source-state-rerun2-before.json"), state("b"));
  await writeFile(join(historical, "source-state-rerun3-before.json"), state("b"));
  for (const name of ["status-before.porcelain-v2", "status-after.porcelain-v2", "status-rerun2-before.porcelain-v2", "status-rerun2-after.porcelain-v2", "status-rerun3-before.porcelain-v2", "status-rerun3-after.porcelain-v2"]) await writeFile(join(historical, name), `${name}\n`);
  await writeFile(join(historical, "rf13-evidence-manifest.json"), JSON.stringify({ artifacts: { zip: { path: "apps/desktop/dist/matter-internal.zip", sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } } }) + "\n");
  await writeFile(join(historical, "packaged-restart-receipt.rerun2.generated.json"), JSON.stringify({ status: "passed", generation: "rerun2" }) + "\n");
  await writeFile(join(historical, "packaged-restart-receipt.rerun3.generated.json"), JSON.stringify({ status: "passed", generation: "rerun3" }) + "\n");
  return { root, historical };
}

async function generateFixtureBaseline(t) {
  const fixture = await fixtureRepo(t);
  const result = await generateRf13DebtRemediationBaseline({
    cwd: fixture.root,
    outputDir: ".omo/evidence/rf13-debt-remediation-test",
    historicalDir: ".omo/evidence/rf13-final-gate-test",
    goalPaths: ["workbook/plan.md", "workbook/goal.md"],
    maxAttempts: 2,
    now: () => "2026-07-31T00:00:00.000Z",
  });
  return { ...fixture, ...result, evidence: join(fixture.root, ".omo", "evidence", "rf13-debt-remediation-test") };
}

test("RFD-TUW-001 raw captures are independently byte-bound and schema-shaped", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const manifest = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  for (const capture of [manifest.capture.first, manifest.capture.second]) {
    assert.equal(capture.capture_id, capture.metadata.path.replace(/\.json$/u, ""));
    for (const kind of ["status", "diff", "manifest", "head", "tree"]) {
      const descriptor = capture.raw[kind];
      const bytes = await readFile(join(fixture.evidence, descriptor.path));
      assert.equal(bytes.length, descriptor.bytes, `${capture.capture_id}.${kind} bytes`);
      assert.equal(HASH(bytes), descriptor.sha256, `${capture.capture_id}.${kind} hash`);
    }
  }
  const receipt = validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root });
  assert.equal(receipt.baseline_authenticity, "VERIFIED");
  assert.equal(receipt.capture.byte_equivalent, true);
  assert.deepEqual(receipt.historical.generations, ["initial", "rerun2", "rerun3"]);
  assert.equal(receipt.historical.formal_release_allowed, false);
  const statusConflict = manifest.historical_rf13.conflicts.find((conflict) => conflict.key === "source:status_sha256");
  assert.deepEqual(statusConflict.values.map(({ generation }) => generation), ["initial", "rerun2", "rerun3"]);
  assert.equal(manifest.historical_rf13.files.filter((file) => file.role.startsWith("status-")).length, 6);
});

test("RFD-TUW-001 retries changing captures and fails clearly at the bound", () => {
  const snapshot = (suffix) => ({
    raw: {
      status: Buffer.from(`status-${suffix}`),
      diff: Buffer.from("diff"),
      manifest: Buffer.from("manifest"),
      head: Buffer.from(`${"1".repeat(40)}\n`),
      tree: Buffer.from(`${"2".repeat(40)}\n`),
    },
  });
  let reads = 0;
  assert.throws(
    () => captureStableRf13Source({
      maxAttempts: 2,
      readSnapshot: () => snapshot(`${reads++}`),
    }),
    (error) => error instanceof Rf13BaselineError && error.code === "SOURCE_CHANGED_BETWEEN_CAPTURES" && error.details.attempts === 2,
  );
});

test("RFD-TUW-001 rejects impossible retry metadata bounds", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const original = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  for (const mutation of [
    { retry_limit: 0, attempts: 1 },
    { retry_limit: 999, attempts: 999 },
    { retry_limit: 5, attempts: 6 },
  ]) {
    const baseline = structuredClone(original);
    baseline.capture.retry_limit = mutation.retry_limit;
    baseline.capture.attempts = mutation.attempts;
    await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`, { mode: 0o600 });
    assert.throws(
      () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
      (error) => error.code === "CAPTURE_RETRY_METADATA_INVALID",
    );
  }
});

test("RFD-TUW-001 rejects missing and tampered raw capture artifacts", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const rawPath = join(fixture.evidence, "capture-1.diff.binary");
  await rename(rawPath, `${rawPath}.missing`);
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "RAW_CAPTURE_MISSING" && !error.message.includes(rawPath),
  );
  await rename(`${rawPath}.missing`, rawPath);
  const original = await readFile(rawPath);
  await writeFile(rawPath, Buffer.concat([original, Buffer.from("tamper")]), { mode: 0o600 });
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "RAW_CAPTURE_HASH_MISMATCH" && !error.message.includes("tamper"),
  );
  await rm(rawPath, { force: true });
  await symlink("/etc/hosts", rawPath);
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "RAW_CAPTURE_UNSAFE" && !error.message.includes("/etc/hosts"),
  );
});

test("RFD-TUW-001 rejects a byte-valid but non-equivalent second capture", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const manifest = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  const second = manifest.capture.second;
  const diffPath = join(fixture.evidence, second.raw.diff.path);
  const replacement = Buffer.from("different-but-byte-valid-diff\n");
  await writeFile(diffPath, replacement, { mode: 0o600 });
  const diffSha = HASH(replacement);
  second.raw.diff.bytes = replacement.length;
  second.raw.diff.sha256 = diffSha;
  second.source_state.diff_sha256 = diffSha;
  second.source_state.working_tree_sha256 = HASH(Buffer.from([
    second.source_state.source_sha,
    diffSha,
    second.source_state.status_sha256,
    second.source_state.manifest_sha256,
  ].join("\n")));
  const metadataPath = join(fixture.evidence, second.metadata.path);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  metadata.raw.diff = { ...metadata.raw.diff, bytes: replacement.length, sha256: diffSha };
  metadata.source_state = { ...second.source_state };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
  const metadataBytes = await readFile(metadataPath);
  second.metadata.bytes = metadataBytes.length;
  second.metadata.sha256 = HASH(metadataBytes);
  await writeFile(fixture.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "CAPTURES_NOT_EQUIVALENT",
  );
});

test("RFD-TUW-001 fails closed when historical conflict generations are collapsed", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const baseline = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  baseline.historical_rf13.conflicts = [];
  await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`, { mode: 0o600 });
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "HISTORICAL_CONFLICT_COLLAPSED",
  );
});

test("RFD-TUW-001 binds every historical conflict value, not only its key", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const baseline = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  baseline.historical_rf13.conflicts[0].values.pop();
  await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`, { mode: 0o600 });
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "HISTORICAL_CONFLICT_VALUES_MISMATCH",
  );
});

test("RFD-TUW-001 rejects private roster/photo values without echoing them", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const baseline = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  baseline.repository.private_roster_value = "PRIVATE_ROSTER_VALUE_should_not_leak";
  await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`, { mode: 0o600 });
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "PRIVATE_MATERIAL"
      && !error.message.includes("PRIVATE_ROSTER_VALUE")
      && !error.message.includes("repository"),
  );
});

test("RFD-TUW-001 reports source drift and Goal/hash drift without invalidating stored authenticity", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  await writeFile(join(fixture.root, "source.txt"), "later source change\n", { mode: 0o600 });
  await writeFile(join(fixture.root, "workbook", "goal.md"), "# goal changed\nRF13-DIST\n", { mode: 0o600 });
  const receipt = validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root });
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.baseline_authenticity, "VERIFIED");
  assert.equal(receipt.current_drift.classification, "DRIFT_FROM_CAPTURE");
  assert.ok(receipt.current_drift.source_fields.length > 0);
  assert.deepEqual(receipt.current_drift.goals.map((entry) => entry.path), ["workbook/goal.md"]);
});

test("RFD-TUW-001 binds repository identity and false non-claims to captures", async (t) => {
  const fixture = await generateFixtureBaseline(t);
  const baseline = JSON.parse(await readFile(fixture.manifestPath, "utf8"));
  baseline.repository.head = "f".repeat(40);
  await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`);
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "BASELINE_REPOSITORY_BINDING",
  );
  baseline.repository.head = baseline.capture.first.source_state.source_sha;
  baseline.non_claims.formal_distribution = true;
  await writeFile(fixture.manifestPath, `${JSON.stringify(baseline, null, 2)}\n`);
  assert.throws(
    () => validateRf13DebtRemediationBaseline({ manifestPath: fixture.manifestPath, cwd: fixture.root }),
    (error) => error.code === "BASELINE_NON_CLAIMS_INVALID",
  );
});

test("RFD-TUW-001 redacts protected values in the stored diff and binds the privacy authority decision", async (t) => {
  const fixture = await fixtureRepo(t);
  await writeFile(join(fixture.root, "source.txt"), "changed owner jwsuh@amic.kr user_amic_jwsuh\n", { mode: 0o600 });
  const result = await generateRf13DebtRemediationBaseline({
    cwd: fixture.root,
    outputDir: ".omo/evidence/rf13-debt-remediation-test",
    historicalDir: ".omo/evidence/rf13-final-gate-test",
    goalPaths: ["workbook/plan.md", "workbook/goal.md"],
    maxAttempts: 2,
    now: () => "2026-07-31T00:00:00.000Z",
  });
  const diff = await readFile(join(fixture.root, ".omo/evidence/rf13-debt-remediation-test", "capture-1.diff.binary"), "utf8");
  assert.doesNotMatch(diff, /jwsuh@amic\.kr|user_amic_jwsuh/iu);
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
  assert.equal(manifest.capture.first.raw_privacy.policy, "protected-source-values-v1");
  assert.equal(manifest.capture.first.raw_privacy.authority_status, "NOT_APPLICABLE_MISSING_AUTHORITY");
  assert.equal(validateRf13DebtRemediationBaseline({ manifestPath: result.manifestPath, cwd: fixture.root }).verdict, "PASS");
});

test("RFD-TUW-001 fails closed when the protected roster authority is unreadable", async (t) => {
  const fixture = await fixtureRepo(t);
  const roster = join(fixture.root, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
  await mkdir(join(fixture.root, "docs/reorganization/client-matter-os/matter-vault-r4/launch"), { recursive: true });
  await writeFile(roster, "{not-json\n", { mode: 0o600 });
  await assert.rejects(
    generateRf13DebtRemediationBaseline({
      cwd: fixture.root,
      outputDir: ".omo/evidence/rf13-debt-remediation-test",
      historicalDir: ".omo/evidence/rf13-final-gate-test",
      goalPaths: ["workbook/plan.md", "workbook/goal.md"],
      maxAttempts: 2,
    }),
    (error) => error.code === "PRIVATE_AUTHORITY_UNREADABLE" && !error.message.includes("not-json"),
  );
});
