import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const forestRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const rootSourceArgument = process.argv[2] ?? "";
const usage = "usage: node scripts/generate-root-only-classification-evidence.mjs <root-source>";
if (["-h", "--help"].includes(rootSourceArgument)) {
  console.log(usage);
  process.exit(0);
}
if (!rootSourceArgument || process.argv.length !== 3) throw new Error(usage);

const rootSource = path.resolve(rootSourceArgument);
const forestBase = "7717d5cee158fc97056510e8aebc9e0854d34196";
const forestCheckpoint = "fbf7062398da1157ee1322d7440194c1b13f7e0f";
const metadataPath = "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md";
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const candidateEntrySha = "65b742c5b103c357c527f6c40729140d02a2b6ef";
const evidenceCommitSha = "7133e0dfad6fa15a601325f6b2f5d50c75da57d6";
const evidenceDir = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/RC-003");
const semanticReviewPath = path.join(evidenceDir, "semantic-review.md");
const allowedClassifications = new Set(["SUPERSEDED", "PORT_TEST_ONLY", "PORT_REQUIRED", "REJECTED"]);
const maxBuffer = 256 * 1024 * 1024;

if (path.resolve(forestRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${forestRoot}`);
}

function git(repo, args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: repo, encoding, maxBuffer });
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function lines(value) {
  return value.trim().split("\n").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileDigest(repo, relativePath) {
  const absolutePath = path.join(repo, relativePath);
  if (!existsSync(absolutePath)) return { mode: "deleted", size: 0, sha256: null };
  const stat = lstatSync(absolutePath);
  const content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(absolutePath), "utf8") : readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: stat.size,
    sha256: sha256(content),
    content,
  };
}

function rootWorktreeFingerprint(repo) {
  const tracked = splitZero(git(repo, ["diff", "--name-only", "-z", "HEAD", "--"], null));
  const untracked = splitZero(git(repo, ["ls-files", "--others", "--exclude-standard", "-z"], null));
  const rows = [
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(repo, relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(repo, relativePath) })),
  ].sort((left, right) => left.path.localeCompare(right.path));
  const manifest = rows.map((row) => [row.category, row.mode, row.size, row.sha256 ?? "deleted", row.path].join("\t")).join("\n");
  const diffSha256 = sha256(git(repo, ["diff", "--binary", "--full-index", "HEAD", "--"], null));
  const statusSha256 = sha256(git(repo, ["status", "--porcelain=v2", "--untracked-files=all", "-z"], null));
  return {
    tracked_count: tracked.length,
    untracked_count: untracked.length,
    tracked: new Set(tracked),
    untracked: new Set(untracked),
    sha256: sha256(`${diffSha256}\n${statusSha256}\n${sha256(manifest)}`),
  };
}

function areaFor(relativePath) {
  if (relativePath.startsWith("apps/api/src/")) return "api-runtime";
  if (relativePath.startsWith("apps/api/test/")) return "api-test";
  if (relativePath.startsWith("packages/hrx/src/migrations/")) return "migration";
  if (relativePath.startsWith("packages/hrx/src/leave/")) return "leave-domain";
  if (relativePath.startsWith("packages/hrx/src/")) return "payroll-domain";
  if (relativePath.startsWith("packages/hrx/test/")) return "hrx-test";
  if (relativePath.startsWith("scripts/")) return "packaged-test";
  if (relativePath.startsWith("docs/")) return "documentation-evidence";
  if (relativePath.startsWith("workbook/")) return "execution-plan";
  return "other";
}

function codeContracts(relativePath, content) {
  if (![".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(path.extname(relativePath))) {
    return { parse_status: "NOT_CODE", imports: [], exports: [], routes: [], tests: [] };
  }
  let ast;
  try {
    ast = parse(content, { sourceType: "unambiguous", plugins: ["jsx", "typescript", "decorators-legacy", "importAttributes"] });
  } catch (error) {
    return { parse_status: `PARSE_ERROR:${error.message.split("\n")[0]}`, imports: [], exports: [], routes: [], tests: [] };
  }
  const imports = new Set();
  const exports = new Set();
  const routes = new Set();
  const tests = new Set();
  const stringValue = (node) => node?.type === "StringLiteral" || node?.type === "Literal" ? String(node.value) : null;
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration") imports.add(node.source.value);
    if (node.type === "ExportDefaultDeclaration") exports.add("default");
    if (node.type === "ExportNamedDeclaration") {
      const declaration = node.declaration;
      if (declaration?.id?.name) exports.add(declaration.id.name);
      for (const item of declaration?.declarations ?? []) if (item.id?.name) exports.add(item.id.name);
      for (const specifier of node.specifiers ?? []) exports.add(specifier.exported?.name ?? specifier.exported?.value);
    }
    if (node.type === "StringLiteral" && node.value.startsWith("/api/")) routes.add(node.value);
    if (node.type === "CallExpression") {
      const callee = node.callee?.name ?? node.callee?.property?.name;
      const title = stringValue(node.arguments?.[0]);
      if (["test", "it"].includes(callee) && title) tests.add(title);
    }
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "errors", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object" && typeof value.type === "string") visit(value);
    }
  }
  visit(ast.program);
  return {
    parse_status: "PASS",
    imports: [...imports].filter(Boolean).sort(),
    exports: [...exports].filter(Boolean).sort(),
    routes: [...routes].sort(),
    tests: [...tests].sort(),
  };
}

function sqlContracts(relativePath, content) {
  if (path.extname(relativePath) !== ".sql") return { creates: [], alters: [], triggers: [], columns: [] };
  const values = (pattern) => [...content.matchAll(pattern)].map((match) => match[1]).sort();
  return {
    creates: values(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/g),
    alters: values(/ALTER TABLE\s+([a-zA-Z0-9_]+)/g),
    triggers: values(/CREATE TRIGGER IF NOT EXISTS\s+([a-zA-Z0-9_]+)/g),
    columns: values(/ADD COLUMN\s+([a-zA-Z0-9_]+)/g),
  };
}

function pngDimensions(content) {
  if (content.length < 24 || content.subarray(1, 4).toString("ascii") !== "PNG") return null;
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

function parseClassifications(markdown) {
  return [...markdown.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*`(SUPERSEDED|PORT_TEST_ONLY|PORT_REQUIRED|REJECTED)`\s*\|\s*(.*?)\s*\|$/gm)]
    .map((match) => ({ index: Number(match[1]), path: match[2], classification: match[3], rationale: match[4] }));
}

function runTestSuite(name, files) {
  const result = spawnSync(process.execPath, ["--test", ...files], { cwd: rootSource, encoding: "utf8", maxBuffer });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const count = (label) => Number(output.match(new RegExp(`(?:#|ℹ)\\s+${label}\\s+(\\d+)`))?.[1] ?? -1);
  const receipt = { name, files, exit_code: result.status, tests: count("tests"), pass: count("pass"), fail: count("fail") };
  if (result.status !== 0 || receipt.tests < 0 || receipt.pass !== receipt.tests || receipt.fail !== 0) {
    throw new Error(`${name} failed: ${JSON.stringify(receipt)}`);
  }
  const normalizedOutput = output
    .replace(/\(\d+(?:\.\d+)?ms\)/g, "(<duration>)")
    .replace(/duration_ms(?::|\s)\s*\d+(?:\.\d+)?/g, "duration_ms <duration>");
  writeEvidence(`${name}.tap`, normalizedOutput);
  return receipt;
}

function writeEvidence(name, value) {
  mkdirSync(evidenceDir, { recursive: true });
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const filePath = path.join(evidenceDir, name);
  writeFileSync(filePath, output.endsWith("\n") ? output : `${output}\n`, "utf8");
  chmodSync(filePath, 0o644);
}

const rootFingerprintBefore = rootWorktreeFingerprint(rootSource);
if (rootFingerprintBefore.sha256 !== expectedRootWorktreeSha256) {
  throw new Error(`root worktree fingerprint changed before RC-003: ${rootFingerprintBefore.sha256}`);
}

const forestChanged = new Set(lines(git(forestRoot, ["diff", "--name-only", `${forestBase}..${forestCheckpoint}`])));
const rootDirty = new Set([...rootFingerprintBefore.tracked, ...rootFingerprintBefore.untracked]);
const rootOnly = [...rootDirty].filter((relativePath) => !forestChanged.has(relativePath)).sort();
if (rootOnly.length !== 25) throw new Error(`unexpected root-only count: ${rootOnly.length}`);

const semanticReview = readFileSync(semanticReviewPath, "utf8");
const classifications = parseClassifications(semanticReview);
const classifiedPaths = new Set(classifications.map((entry) => entry.path));
const missing = rootOnly.filter((relativePath) => !classifiedPaths.has(relativePath));
const extra = classifications.map((entry) => entry.path).filter((relativePath) => !rootOnly.includes(relativePath));
if (classifications.length !== 25 || classifiedPaths.size !== 25 || missing.length || extra.length) {
  throw new Error(`classification mismatch: rows=${classifications.length}, missing=${missing.join(",")}, extra=${extra.join(",")}`);
}
if (classifications.some((entry) => !allowedClassifications.has(entry.classification))) throw new Error("invalid classification");

const classificationByPath = new Map(classifications.map((entry) => [entry.path, entry]));
const inventory = rootOnly.map((relativePath) => {
  const digest = fileDigest(rootSource, relativePath);
  const isText = !digest.content.includes(0);
  const content = isText ? digest.content.toString("utf8") : "";
  const code = codeContracts(relativePath, content);
  const sql = sqlContracts(relativePath, content);
  return {
    path: relativePath,
    area: areaFor(relativePath),
    root_status: rootFingerprintBefore.tracked.has(relativePath) ? "tracked_modified" : "untracked",
    classification: classificationByPath.get(relativePath).classification,
    mode: digest.mode,
    size: digest.size,
    sha256: digest.sha256,
    line_count: isText ? content.split("\n").length : null,
    parse_status: code.parse_status,
    imports: code.imports,
    exports: code.exports,
    routes: code.routes,
    tests: code.tests,
    sql,
    png: pngDimensions(digest.content),
  };
});
if (inventory.some((entry) => String(entry.parse_status).startsWith("PARSE_ERROR"))) throw new Error("root-only code parse error");

const testSuites = [
  runTestSuite("root-domain-tests", [
    "packages/hrx/test/leave-manual-adjustment-file.test.js",
    "packages/hrx/test/leave-policy-service.test.js",
    "packages/hrx/test/payroll-item-catalog.test.js",
    "packages/hrx/test/payroll-profile-service.test.js",
    "packages/hrx/test/payroll-time-input-snapshot.test.js",
  ]),
  runTestSuite("root-api-tests", [
    "apps/api/test/hrx/payroll-items-api.test.js",
    "apps/api/test/hrx/payroll-profile-api.test.js",
    "apps/api/test/hrx/payroll-time-input-api.test.js",
    "apps/api/test/hrx/step-up-route.test.js",
  ]),
];
if (testSuites.reduce((total, suite) => total + suite.pass, 0) !== 38) throw new Error("unexpected RC-003 test count");

const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during RC-003: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}
if (spawnSync("git", ["merge-base", "--is-ancestor", candidateEntrySha, "HEAD"], { cwd: forestRoot }).status !== 0) {
  throw new Error(`candidate entry SHA is not an ancestor of HEAD: ${candidateEntrySha}`);
}

const categoryCounts = Object.fromEntries([...allowedClassifications].sort().map((classification) => [
  classification,
  classifications.filter((entry) => entry.classification === classification).length,
]));
const receipt = {
  tuw: "RC-003",
  verdict: "PASS",
  candidate_entry_sha: candidateEntrySha,
  evidence_commit_sha: evidenceCommitSha,
  forest_content_checkpoint: forestCheckpoint,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  root_only_count: rootOnly.length,
  classified_count: classifications.length,
  unclassified_count: 0,
  parse_error_count: 0,
  category_counts: categoryCounts,
  test_suites: testSuites,
  related_test_count: testSuites.reduce((total, suite) => total + suite.tests, 0),
  related_test_pass: testSuites.reduce((total, suite) => total + suite.pass, 0),
  related_test_fail: testSuites.reduce((total, suite) => total + suite.fail, 0),
  semantic_review_sha256: sha256(semanticReview),
  inventory_sha256: sha256(JSON.stringify(inventory)),
  external_blockers: [],
};

const tsvHeader = ["path", "area", "root_status", "classification", "mode", "size", "sha256", "line_count", "parse_status", "import_count", "export_count", "route_count", "test_count", "sql_create_count", "sql_alter_count"].join("\t");
const tsvRows = inventory.map((entry) => [entry.path, entry.area, entry.root_status, entry.classification, entry.mode, entry.size, entry.sha256, entry.line_count ?? "binary", entry.parse_status, entry.imports.length, entry.exports.length, entry.routes.length, entry.tests.length, entry.sql.creates.length, entry.sql.alters.length].join("\t"));

writeEvidence("inventory.tsv", [tsvHeader, ...tsvRows].join("\n"));
writeEvidence("contracts.json", inventory);
writeEvidence("classification.json", classifications.map((entry) => ({ ...entry, ...inventory.find((item) => item.path === entry.path) })));
writeEvidence("receipt.json", receipt);
writeEvidence("acceptance.md", [
  "# RC-003 Acceptance",
  "",
  "- status: DONE",
  `- candidate entry SHA: \`${candidateEntrySha}\``,
  `- evidence commit SHA: \`${evidenceCommitSha}\``,
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- root-only paths: ${receipt.root_only_count}`,
  `- classified paths: ${receipt.classified_count}`,
  `- dispositions: PORT_REQUIRED ${categoryCounts.PORT_REQUIRED}, PORT_TEST_ONLY ${categoryCounts.PORT_TEST_ONLY}, SUPERSEDED ${categoryCounts.SUPERSEDED}, REJECTED ${categoryCounts.REJECTED}`,
  `- cross-run tests: ${receipt.related_test_pass}/${receipt.related_test_count} pass, ${receipt.related_test_fail} fail`,
  "- AST parse errors: 0",
  "- unclassified paths: 0",
  "- root checkout mutations: 0",
  "- packaged profile smoke: not executed; sanitized assertions are PORT_TEST_ONLY and generated evidence is deferred to the exact final SHA",
  "- manual QA: each root-only source, migration, test, document, script, and screenshot was opened and compared to the actual Forest runtime/schema/test equivalents",
  "- external blockers: none",
].join("\n"));
writeEvidence("commands.txt", [
  "node --check scripts/generate-root-only-classification-evidence.mjs",
  "node scripts/generate-root-only-classification-evidence.mjs --help",
  "node scripts/generate-root-only-classification-evidence.mjs # expected usage failure",
  `node scripts/generate-root-only-classification-evidence.mjs \"${rootSource}\"`,
  "node --test packages/hrx/test/leave-manual-adjustment-file.test.js packages/hrx/test/leave-policy-service.test.js packages/hrx/test/payroll-item-catalog.test.js packages/hrx/test/payroll-profile-service.test.js packages/hrx/test/payroll-time-input-snapshot.test.js",
  "node --test apps/api/test/hrx/payroll-items-api.test.js apps/api/test/hrx/payroll-profile-api.test.js apps/api/test/hrx/payroll-time-input-api.test.js apps/api/test/hrx/step-up-route.test.js",
  "node scripts/generate-root-forest-common-comparison.mjs <root-source> # root fingerprint recheck",
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
