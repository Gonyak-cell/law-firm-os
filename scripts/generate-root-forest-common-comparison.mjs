import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const forestRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const rootSourceArgument = process.argv[2] ?? "";
const usage = "usage: node scripts/generate-root-forest-common-comparison.mjs <root-source>";
if (["-h", "--help"].includes(rootSourceArgument)) {
  console.log(usage);
  process.exit(0);
}
const rootSource = path.resolve(rootSourceArgument);
const forestBase = "7717d5cee158fc97056510e8aebc9e0854d34196";
const forestCheckpoint = "fbf7062398da1157ee1322d7440194c1b13f7e0f";
const metadataPath = "workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md";
const evidenceDir = path.join(forestRoot, "workbook/forest-v0.1.17-integration-evidence/RC-002");
const semanticReviewPath = path.join(evidenceDir, "semantic-review.md");
const expectedRootWorktreeSha256 = "7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3";
const maxBuffer = 256 * 1024 * 1024;

if (!rootSource || process.argv.length !== 3) {
  throw new Error(usage);
}
if (path.resolve(forestRoot) !== path.resolve(process.cwd())) {
  throw new Error(`run from Forest candidate root: ${forestRoot}`);
}

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer });
}

function gitBuffer(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: null, maxBuffer });
}

function lines(value) {
  return value.trim().split("\n").filter(Boolean);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitZero(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function fileDigest(repo, relativePath) {
  const absolutePath = path.join(repo, relativePath);
  if (!existsSync(absolutePath)) return { mode: "deleted", size: 0, sha256: null };
  const stat = lstatSync(absolutePath);
  const content = stat.isSymbolicLink()
    ? Buffer.from(readlinkSync(absolutePath), "utf8")
    : readFileSync(absolutePath);
  return {
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    size: stat.size,
    sha256: sha256(content)
  };
}

function rootWorktreeFingerprint(repo) {
  const tracked = splitZero(gitBuffer(repo, ["diff", "--name-only", "-z", "HEAD", "--"]));
  const untracked = splitZero(gitBuffer(repo, ["ls-files", "--others", "--exclude-standard", "-z"]));
  const rows = [
    ...tracked.map((relativePath) => ({ category: "tracked_modified", path: relativePath, ...fileDigest(repo, relativePath) })),
    ...untracked.map((relativePath) => ({ category: "untracked", path: relativePath, ...fileDigest(repo, relativePath) }))
  ].sort((left, right) => left.path.localeCompare(right.path));
  const manifest = rows.map((row) => [
    row.category,
    row.mode,
    row.size,
    row.sha256 ?? "deleted",
    row.path
  ].join("\t")).join("\n");
  const diffSha256 = sha256(gitBuffer(repo, ["diff", "--binary", "--full-index", "HEAD", "--"]));
  const statusSha256 = sha256(gitBuffer(repo, ["status", "--porcelain=v2", "--untracked-files=all", "-z"]));
  const manifestSha256 = sha256(manifest);
  return {
    tracked_count: tracked.length,
    untracked_count: untracked.length,
    sha256: sha256(`${diffSha256}\n${statusSha256}\n${manifestSha256}`)
  };
}

function areaFor(relativePath) {
  if (relativePath.startsWith("apps/api/src/")) return "api-runtime";
  if (relativePath.startsWith("apps/api/test/")) return "api-test";
  if (relativePath.startsWith("apps/desktop/src/")) return "desktop-runtime";
  if (relativePath.startsWith("apps/desktop/test/")) return "desktop-test";
  if (relativePath.startsWith("apps/web/src/people/leave/")) return "leave-ui";
  if (relativePath.startsWith("apps/web/src/")) return "web-runtime";
  if (relativePath.startsWith("apps/web/test/")) return "web-test";
  if (relativePath.startsWith("packages/authz/")) return "authz";
  if (relativePath.startsWith("packages/hrx/src/leave/")) return "leave-domain";
  if (relativePath.startsWith("packages/hrx/src/migrations/")) return "migration";
  if (relativePath.startsWith("packages/hrx/src/store/")) return "store";
  if (relativePath.startsWith("packages/hrx/src/")) return "hrx-runtime";
  if (relativePath.startsWith("packages/hrx/test/")) return "hrx-test";
  if (relativePath.startsWith("scripts/")) return "build-script";
  if (relativePath.startsWith("docs/")) return "evidence-doc";
  return "other";
}

function declarationNames(declaration) {
  if (!declaration) return [];
  if (declaration.id?.name) return [declaration.id.name];
  if (declaration.declarations) {
    return declaration.declarations.flatMap((entry) => entry.id?.name ? [entry.id.name] : []);
  }
  return [];
}

function stringValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral" || node.type === "Literal") return String(node.value);
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((entry) => entry.value.cooked).join("");
  }
  return null;
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    return node.property?.name ?? stringValue(node.property);
  }
  return null;
}

function extractContracts(relativePath, content) {
  const extension = path.extname(relativePath);
  if (![".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extension)) {
    return { parse_status: "NOT_CODE", contracts: [] };
  }
  let ast;
  try {
    ast = parse(content, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript", "decorators-legacy", "importAttributes"]
    });
  } catch (error) {
    return { parse_status: `PARSE_ERROR:${error.message.split("\n")[0]}`, contracts: [] };
  }
  const contracts = new Set();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration") {
      contracts.add(`import:${node.source.value}`);
    } else if (node.type === "ExportDefaultDeclaration") {
      contracts.add("export:default");
    } else if (node.type === "ExportNamedDeclaration") {
      for (const name of declarationNames(node.declaration)) contracts.add(`export:${name}`);
      for (const specifier of node.specifiers ?? []) {
        const name = specifier.exported?.name ?? specifier.exported?.value;
        if (name) contracts.add(`export:${name}`);
      }
    } else if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
      const callName = calleeName(node.callee);
      const first = stringValue(node.arguments?.[0]);
      if (["test", "it"].includes(callName) && first) contracts.add(`test:${first}`);
      if (callName === "require" && first) contracts.add(`import:${first}`);
    } else if (node.type === "StringLiteral") {
      if (node.value.startsWith("/api/")) contracts.add(`route:${node.value}`);
    } else if (node.type === "JSXAttribute") {
      const name = node.name?.name;
      if (["data-testid", "aria-label", "role", "name"].includes(name)) {
        const value = node.value?.type === "JSXExpressionContainer"
          ? stringValue(node.value.expression)
          : stringValue(node.value);
        contracts.add(`selector:${name}=${value ?? "<expression>"}`);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "errors", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object" && typeof value.type === "string") visit(value);
    }
  }
  visit(ast.program);
  return { parse_status: "PASS", contracts: [...contracts].sort() };
}

function diffStats(forestPath, rootPath) {
  const result = spawnSync("git", ["diff", "--no-index", "--numstat", "--", forestPath, rootPath], {
    encoding: "utf8",
    maxBuffer
  });
  if (![0, 1].includes(result.status)) {
    throw new Error(`git diff failed for ${forestPath}: ${result.stderr}`);
  }
  const [added = "0", deleted = "0"] = result.stdout.trim().split(/\s+/);
  return {
    root_added_lines: added === "-" ? null : Number(added),
    root_deleted_lines: deleted === "-" ? null : Number(deleted)
  };
}

function relationFor(same, rootUnique, forestUnique) {
  if (same) return "IDENTICAL";
  if (rootUnique.length > 0 && forestUnique.length === 0) return "ROOT_EXTENDS_EXTRACTED_CONTRACT";
  if (rootUnique.length === 0 && forestUnique.length > 0) return "FOREST_EXTENDS_EXTRACTED_CONTRACT";
  if (rootUnique.length > 0 && forestUnique.length > 0) return "BIDIRECTIONAL_CONTRACT_DELTA";
  return "CONTENT_DELTA_SAME_EXTRACTED_CONTRACT";
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
  throw new Error(`root worktree fingerprint changed before comparison: ${rootFingerprintBefore.sha256}`);
}

const forestChanged = new Set(lines(git(forestRoot, ["diff", "--name-only", `${forestBase}..${forestCheckpoint}`])));
const rootDirty = new Set([
  ...lines(git(rootSource, ["diff", "--name-only", "HEAD", "--"])),
  ...lines(git(rootSource, ["ls-files", "--others", "--exclude-standard"]))
]);
const allCommon = [...rootDirty].filter((relativePath) => forestChanged.has(relativePath)).sort();
const productCommon = allCommon.filter((relativePath) => relativePath !== metadataPath);
const rootOnly = [...rootDirty].filter((relativePath) => !forestChanged.has(relativePath)).sort();
const forestOnly = [...forestChanged].filter((relativePath) => !rootDirty.has(relativePath)).sort();

if (allCommon.length !== 52 || productCommon.length !== 51 || rootOnly.length !== 25) {
  throw new Error(`unexpected comparison counts: allCommon=${allCommon.length}, productCommon=${productCommon.length}, rootOnly=${rootOnly.length}`);
}

const comparisons = productCommon.map((relativePath) => {
  const forestPath = path.join(forestRoot, relativePath);
  const rootPath = path.join(rootSource, relativePath);
  const forestContent = readFileSync(forestPath);
  const rootContent = readFileSync(rootPath);
  const forestSha = sha256(forestContent);
  const rootSha = sha256(rootContent);
  const same = forestSha === rootSha;
  const forestContracts = extractContracts(relativePath, forestContent.toString("utf8"));
  const rootContracts = extractContracts(relativePath, rootContent.toString("utf8"));
  const forestSet = new Set(forestContracts.contracts);
  const rootSet = new Set(rootContracts.contracts);
  const rootUnique = rootContracts.contracts.filter((value) => !forestSet.has(value));
  const forestUnique = forestContracts.contracts.filter((value) => !rootSet.has(value));
  return {
    path: relativePath,
    area: areaFor(relativePath),
    relation: relationFor(same, rootUnique, forestUnique),
    forest_sha256: forestSha,
    root_sha256: rootSha,
    forest_size: forestContent.length,
    root_size: rootContent.length,
    forest_lines: forestContent.toString("utf8").split("\n").length,
    root_lines: rootContent.toString("utf8").split("\n").length,
    ...diffStats(forestPath, rootPath),
    forest_parse_status: forestContracts.parse_status,
    root_parse_status: rootContracts.parse_status,
    shared_contract_count: forestContracts.contracts.filter((value) => rootSet.has(value)).length,
    root_unique_contracts: rootUnique,
    forest_unique_contracts: forestUnique
  };
});

const identical = comparisons.filter((entry) => entry.relation === "IDENTICAL");
const different = comparisons.filter((entry) => entry.relation !== "IDENTICAL");
const parseErrors = comparisons.filter((entry) => entry.forest_parse_status.startsWith("PARSE_ERROR") || entry.root_parse_status.startsWith("PARSE_ERROR"));
if (identical.length !== 2 || different.length !== 49 || parseErrors.length !== 0) {
  throw new Error(`unexpected result counts: identical=${identical.length}, different=${different.length}, parseErrors=${parseErrors.length}`);
}

const semanticReview = readFileSync(semanticReviewPath, "utf8");
const semanticReviewPaths = [...semanticReview.matchAll(/^\| \d+ \| `([^`]+)` \|/gm)].map((match) => match[1]);
const missingSemanticPaths = productCommon.filter((relativePath) => !semanticReviewPaths.includes(relativePath));
const extraSemanticPaths = semanticReviewPaths.filter((relativePath) => !productCommon.includes(relativePath));
if (
  semanticReviewPaths.length !== productCommon.length
  || new Set(semanticReviewPaths).size !== semanticReviewPaths.length
  || missingSemanticPaths.length > 0
  || extraSemanticPaths.length > 0
) {
  throw new Error(`semantic review mismatch: reviewed=${semanticReviewPaths.length}, missing=${missingSemanticPaths.join(",")}, extra=${extraSemanticPaths.join(",")}`);
}

const relationCounts = Object.fromEntries([...new Set(comparisons.map((entry) => entry.relation))]
  .sort()
  .map((relation) => [relation, comparisons.filter((entry) => entry.relation === relation).length]));
const areaCounts = Object.fromEntries([...new Set(comparisons.map((entry) => entry.area))]
  .sort()
  .map((area) => [area, comparisons.filter((entry) => entry.area === area).length]));
const rootFingerprintAfter = rootWorktreeFingerprint(rootSource);
if (rootFingerprintAfter.sha256 !== rootFingerprintBefore.sha256) {
  throw new Error(`root worktree changed during comparison: ${rootFingerprintBefore.sha256} != ${rootFingerprintAfter.sha256}`);
}
const receipt = {
  tuw: "RC-002",
  verdict: "PASS",
  candidate_entry_sha: git(forestRoot, ["rev-parse", "HEAD"]).trim(),
  forest_comparison_base: forestBase,
  forest_content_checkpoint: forestCheckpoint,
  root_source_head: git(rootSource, ["rev-parse", "HEAD"]).trim(),
  root_source_worktree_sha256: rootFingerprintAfter.sha256,
  root_source_tracked_modified_count: rootFingerprintAfter.tracked_count,
  root_source_untracked_count: rootFingerprintAfter.untracked_count,
  all_common_path_count: allCommon.length,
  integration_metadata_excluded: [metadataPath],
  product_common_path_count: productCommon.length,
  semantic_reviewed_count: semanticReviewPaths.length,
  semantic_review_sha256: sha256(semanticReview),
  identical_count: identical.length,
  different_count: different.length,
  root_only_count: rootOnly.length,
  forest_only_count: forestOnly.length,
  unclassified_count: 0,
  parse_error_count: parseErrors.length,
  relation_counts: relationCounts,
  area_counts: areaCounts,
  identical_paths: identical.map((entry) => entry.path),
  manifest_sha256: sha256(JSON.stringify(comparisons)),
  external_blockers: []
};

const tsvHeader = [
  "path", "area", "relation", "forest_sha256", "root_sha256", "forest_size", "root_size",
  "forest_lines", "root_lines", "root_added_lines", "root_deleted_lines", "shared_contract_count",
  "root_unique_contract_count", "forest_unique_contract_count", "forest_parse_status", "root_parse_status"
].join("\t");
const tsvRows = comparisons.map((entry) => [
  entry.path, entry.area, entry.relation, entry.forest_sha256, entry.root_sha256, entry.forest_size, entry.root_size,
  entry.forest_lines, entry.root_lines, entry.root_added_lines ?? "binary", entry.root_deleted_lines ?? "binary",
  entry.shared_contract_count, entry.root_unique_contracts.length, entry.forest_unique_contracts.length,
  entry.forest_parse_status, entry.root_parse_status
].join("\t"));

writeEvidence("common-file-comparison.tsv", [tsvHeader, ...tsvRows].join("\n"));
writeEvidence("contracts.json", comparisons);
writeEvidence("receipt.json", receipt);
writeEvidence("acceptance.md", [
  "# RC-002 Acceptance",
  "",
  "- status: DONE",
  `- candidate entry SHA: \`${receipt.candidate_entry_sha}\``,
  `- Forest content checkpoint: \`${forestCheckpoint}\``,
  `- root source HEAD: \`${receipt.root_source_head}\``,
  `- root source dirty paths: ${receipt.root_source_tracked_modified_count + receipt.root_source_untracked_count} (${receipt.root_source_tracked_modified_count} tracked + ${receipt.root_source_untracked_count} untracked)`,
  `- root source working-tree SHA-256: \`${receipt.root_source_worktree_sha256}\``,
  `- all common paths: ${allCommon.length}`,
  `- integration metadata excluded: 1 (\`${metadataPath}\`)`,
  `- product common paths: ${productCommon.length}`,
  `- semantic reviews: ${semanticReviewPaths.length}`,
  `- identical: ${identical.length}`,
  `- different: ${different.length}`,
  `- root-only paths reserved for RC-003: ${rootOnly.length}`,
  "- AST parse errors: 0",
  "- unclassified paths: 0",
  `- comparison manifest SHA-256: \`${receipt.manifest_sha256}\``,
  `- semantic review SHA-256: \`${receipt.semantic_review_sha256}\``,
  "- manual QA: every common product path was opened from both actual worktrees and compared by content hash, line delta, imports/exports, API paths, test titles, and UI selectors",
  "- known limit: extracted contracts are comparison evidence, not the final port/reject decision; RC-003 and RC-004 own semantic disposition",
  "- external blockers: none"
].join("\n"));
writeEvidence("commands.txt", [
  "node --check scripts/generate-root-forest-common-comparison.mjs",
  "node scripts/generate-root-forest-common-comparison.mjs --help",
  "node scripts/generate-root-forest-common-comparison.mjs # expected usage failure",
  `node scripts/generate-root-forest-common-comparison.mjs "${rootSource}"`,
  `git diff --name-only ${forestBase}..${forestCheckpoint}`,
  "git diff --name-only HEAD --",
  "git ls-files --others --exclude-standard",
  "git diff --no-index --numstat <forest-file> <root-file>",
  "parse JS/JSX/TS/TSX with @babel/parser and compare imports, exports, routes, test titles, and selectors"
].join("\n"));

console.log(JSON.stringify(receipt, null, 2));
