#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { builtinModules, createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import parser from "@babel/parser";

const usage = "usage: node scripts/validate-cp007-packaged-runtime-boundary.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Verifies exact-SHA Mac/Windows renderer and bundled-runtime parity plus the CP-007 packaged app smoke receipt.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(ROOT) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${ROOT}`);

const EXPECTED_BUILD_SHA = "0e72dd1335c8e996388de16fbd8be441618330ed";
const EXPECTED_TREE = "6600db315c6b83d723d575fc7036cd61146156a1";
const CANONICAL_TENANT = "tenant_amic_matter_vault";
const desktopPackage = JSON.parse(readFileSync("apps/desktop/package.json", "utf8"));
const MAC_APP_ROOT = path.join(ROOT, "apps/desktop/dist/mac/matter.app/Contents/Resources/app");
const WINDOWS_PACKAGE_ROOT = path.join(
  ROOT,
  `apps/desktop/dist/win/matter-internal-${desktopPackage.version}-win32-x64`,
);
const WINDOWS_APP_ROOT = path.join(WINDOWS_PACKAGE_ROOT, "resources/app");
const MAC_RENDERER = path.join(MAC_APP_ROOT, "src/renderer/web");
const WINDOWS_RENDERER = path.join(WINDOWS_APP_ROOT, "src/renderer/web");
const MAC_RUNTIME = path.join(MAC_APP_ROOT, "runtime");
const WINDOWS_RUNTIME = path.join(WINDOWS_APP_ROOT, "runtime");
const MAC_ENTRY = path.join(MAC_RUNTIME, "apps/api/src/server.js");
const WINDOWS_ENTRY = path.join(WINDOWS_RUNTIME, "apps/api/src/server.js");
const MAC_FORMAL_MARKER = path.join(ROOT, "apps/desktop/dist/mac/matter.app/Contents/Resources/matter-formal-release.json");
const WINDOWS_FORMAL_MARKER = path.join(WINDOWS_PACKAGE_ROOT, "resources/matter-formal-release.json");
const WINDOWS_EXECUTABLE = path.join(WINDOWS_PACKAGE_ROOT, "matter.exe");
const WINDOWS_ZIP = path.join(
  ROOT,
  `apps/desktop/dist/win/matter-internal-${desktopPackage.version}-win32-x64-unsigned.zip`,
);
const MAC_EXECUTABLE = path.join(ROOT, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const MAC_ZIP = path.join(ROOT, `apps/desktop/dist/mac/matter-internal-${desktopPackage.version}-macos.zip`);
const MAC_DMG = path.join(ROOT, `apps/desktop/dist/mac/matter-internal-${desktopPackage.version}-macos.dmg`);
const SMOKE_RECEIPT = path.join(
  ROOT,
  "workbook/forest-v0.1.17-integration-evidence/CP-007/packaged-runtime-smoke.json",
);
const MATRIX_PATH = path.join(
  ROOT,
  "workbook/forest-v0.1.17-integration-evidence/CP-007/packaged-runtime-matrix.json",
);

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function directoryDigest(directoryPath) {
  const files = [];
  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
    }
  }
  visit(directoryPath);
  files.sort((left, right) => {
    const leftRelative = path.relative(directoryPath, left);
    const rightRelative = path.relative(directoryPath, right);
    return leftRelative < rightRelative ? -1 : leftRelative > rightRelative ? 1 : 0;
  });
  const manifest = files.map((filePath) => (
    `${sha256File(filePath)}  ./${path.relative(directoryPath, filePath)}\n`
  )).join("");
  const contentHash = createHash("sha256");
  for (const filePath of files) {
    contentHash.update(path.relative(directoryPath, filePath));
    contentHash.update(readFileSync(filePath));
  }
  return {
    sha256: createHash("sha256").update(manifest).digest("hex"),
    algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    content_sha256: contentHash.digest("hex"),
    file_count: files.length,
  };
}

function extractSpecifiers(filePath) {
  const source = readFileSync(filePath, "utf8");
  const ast = parser.parse(source, {
    sourceType: "unambiguous",
    plugins: ["importAttributes", "jsx"],
  });
  const specifiers = [];
  const nonLiteralDynamicImports = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (
      ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(value.type)
      && typeof value.source?.value === "string"
    ) specifiers.push(value.source.value);
    if (value.type === "CallExpression" && value.callee?.type === "Import") {
      if (typeof value.arguments?.[0]?.value === "string") specifiers.push(value.arguments[0].value);
      else nonLiteralDynamicImports.push(path.relative(ROOT, filePath));
    }
    if (value.type === "ImportExpression") {
      if (typeof value.source?.value === "string") specifiers.push(value.source.value);
      else nonLiteralDynamicImports.push(path.relative(ROOT, filePath));
    }
    for (const [key, child] of Object.entries(value)) {
      if (["loc", "start", "end", "extra", "errors"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  }
  visit(ast.program);
  return { specifiers, nonLiteralDynamicImports };
}

const extensions = ["", ".js", ".mjs", ".cjs", ".json"];
function resolveRelativeImport(importer, specifier) {
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = [
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.slice(1).map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function traceRuntimeGraph(runtimeRoot, entryPath) {
  const queue = [entryPath];
  const visited = new Set();
  const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
  const builtinImports = new Set();
  const unresolvedImports = [];
  const externalSourceImports = [];
  const nonLiteralDynamicImports = [];
  let importCount = 0;

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const { specifiers, nonLiteralDynamicImports: dynamic } = extractSpecifiers(current);
    nonLiteralDynamicImports.push(...dynamic);
    for (const specifier of specifiers) {
      importCount += 1;
      if (builtins.has(specifier)) {
        builtinImports.add(specifier);
        continue;
      }
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        const resolved = resolveRelativeImport(current, specifier);
        if (!resolved) {
          unresolvedImports.push({ importer: path.relative(runtimeRoot, current), specifier });
          continue;
        }
        const relative = path.relative(runtimeRoot, resolved);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          externalSourceImports.push({ importer: path.relative(runtimeRoot, current), specifier, resolved });
          continue;
        }
        if (/\.(?:js|mjs|cjs)$/.test(resolved)) queue.push(resolved);
        continue;
      }

      try {
        const resolved = createRequire(current).resolve(specifier);
        externalSourceImports.push({ importer: path.relative(runtimeRoot, current), specifier, resolved });
      } catch {
        unresolvedImports.push({ importer: path.relative(runtimeRoot, current), specifier });
      }
    }
  }

  return {
    entry: path.relative(runtimeRoot, entryPath),
    visited_module_count: visited.size,
    import_count: importCount,
    builtin_imports: [...builtinImports].sort(),
    external_source_import_count: externalSourceImports.length,
    external_source_imports: externalSourceImports,
    unresolved_import_count: unresolvedImports.length,
    unresolved_imports: unresolvedImports,
    nonliteral_dynamic_import_count: nonLiteralDynamicImports.length,
    nonliteral_dynamic_imports: nonLiteralDynamicImports,
  };
}

for (const requiredPath of [
  MAC_RENDERER,
  WINDOWS_RENDERER,
  MAC_RUNTIME,
  WINDOWS_RUNTIME,
  MAC_ENTRY,
  WINDOWS_ENTRY,
  MAC_EXECUTABLE,
  MAC_ZIP,
  MAC_DMG,
  WINDOWS_EXECUTABLE,
  WINDOWS_ZIP,
  SMOKE_RECEIPT,
]) assert.equal(existsSync(requiredPath), true, `required CP-007 artifact is missing: ${requiredPath}`);
assert.equal(existsSync(MAC_FORMAL_MARKER), false, "internal macOS package must not contain the formal-release marker");
assert.equal(existsSync(WINDOWS_FORMAL_MARKER), false, "internal Windows package must not contain the formal-release marker");

const currentSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const currentTree = execFileSync("git", ["rev-parse", `${EXPECTED_BUILD_SHA}^{tree}`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(currentSha, EXPECTED_BUILD_SHA, "CP-007 validator must run before its evidence commit on the exact build SHA");
assert.equal(currentTree, EXPECTED_TREE);

const macRenderer = directoryDigest(MAC_RENDERER);
const windowsRenderer = directoryDigest(WINDOWS_RENDERER);
const macRuntime = directoryDigest(MAC_RUNTIME);
const windowsRuntime = directoryDigest(WINDOWS_RUNTIME);
assert.deepEqual(windowsRenderer, macRenderer, "Mac and Windows renderer bytes must match");
assert.deepEqual(windowsRuntime, macRuntime, "Mac and Windows runtime bytes must match");

const macGraph = traceRuntimeGraph(MAC_RUNTIME, MAC_ENTRY);
const windowsGraph = traceRuntimeGraph(WINDOWS_RUNTIME, WINDOWS_ENTRY);
for (const graph of [macGraph, windowsGraph]) {
  assert.equal(graph.external_source_import_count, 0, JSON.stringify(graph.external_source_imports));
  assert.equal(graph.unresolved_import_count, 0, JSON.stringify(graph.unresolved_imports));
  assert.equal(graph.nonliteral_dynamic_import_count, 0, JSON.stringify(graph.nonliteral_dynamic_imports));
}
assert.deepEqual(windowsGraph, macGraph, "Mac and Windows runtime import graphs must match");

assert.equal(readFileSync(WINDOWS_EXECUTABLE).subarray(0, 2).toString("ascii"), "MZ");
execFileSync("/usr/bin/unzip", ["-tqq", WINDOWS_ZIP]);
execFileSync("/usr/bin/unzip", ["-tqq", MAC_ZIP]);

const smoke = JSON.parse(readFileSync(SMOKE_RECEIPT, "utf8"));
assert.equal(smoke.verdict, "PASS");
assert.equal(smoke.exact_build_sha, EXPECTED_BUILD_SHA);
assert.equal(smoke.runtime.health_status, 200);
assert.equal(smoke.runtime.local_api_default_start, true);
assert.equal(smoke.runtime.trusted_ipc_profile_status, 200);
assert.equal(smoke.runtime.packaged_runtime_entry_present, true);
assert.equal(smoke.identity.user_id, "user_amic_jwsuh");
assert.equal(smoke.identity.display_name, "서지원");
assert.equal(smoke.identity.canonical_tenant, CANONICAL_TENANT);
assert.equal(smoke.handoff.all_tenant_refs_canonical, true);
assert.equal(smoke.handoff.canonical_tenant_fallback_count, 0);
assert.equal(smoke.handoff.synthetic_tenant_ref_count, 0);
assert.equal(smoke.diagnostics.page_error_count, 0);
assert.equal(smoke.diagnostics.console_error_count, 0);
assert.equal(smoke.boundaries.synthetic_auth_fixture, true);
assert.equal(smoke.boundaries.synthetic_tenant_fallback, false);
assert.equal(smoke.boundaries.public_release, false);
assert.equal(smoke.boundaries.production_go_live, false);

const matrix = {
  schema_version: "law-firm-os.cp007-packaged-runtime-boundary.v1",
  verdict: "PASS",
  exact_build_sha: EXPECTED_BUILD_SHA,
  exact_build_tree: EXPECTED_TREE,
  package_version: desktopPackage.version,
  renderer: {
    macos: macRenderer,
    windows: windowsRenderer,
    parity: true,
  },
  runtime: {
    macos: macRuntime,
    windows: windowsRuntime,
    parity: true,
    import_graph: macGraph,
    bundled_server_present: true,
    internal_default_start: true,
    formal_release_marker_absent: {
      macos: true,
      windows: true,
    },
  },
  package_artifacts: {
    macos: {
      executable_sha256: sha256File(MAC_EXECUTABLE),
      zip_sha256: sha256File(MAC_ZIP),
      dmg_sha256: sha256File(MAC_DMG),
      native_runtime_smoke: "PASS",
      developer_id_signed: false,
      notarized: false,
    },
    windows: {
      executable_sha256: sha256File(WINDOWS_EXECUTABLE),
      zip_sha256: sha256File(WINDOWS_ZIP),
      pe_header: "MZ",
      archive_test: "PASS",
      native_runtime_smoke: "NOT_RUN_ON_DARWIN",
      authenticode_signed: false,
    },
  },
  runtime_smoke: {
    receipt: path.relative(ROOT, SMOKE_RECEIPT),
    loopback_health: "PASS",
    trusted_ipc: "PASS",
    canonical_tenant: CANONICAL_TENANT,
    canonical_tenant_fallback_count: 0,
    synthetic_tenant_ref_count: 0,
    identity: "user_amic_jwsuh/emp_amic_jwsuh/서지원",
  },
  boundaries: {
    internal_package_only: true,
    synthetic_auth_fixture: true,
    synthetic_tenant_fallback: false,
    formal_macos_release: false,
    native_windows_runtime: false,
    public_release: false,
    production_go_live: false,
  },
};

if (command === "--emit") writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
else {
  assert.equal(existsSync(MATRIX_PATH), true, `missing emitted matrix: ${MATRIX_PATH}`);
  assert.deepEqual(JSON.parse(readFileSync(MATRIX_PATH, "utf8")), matrix);
}

process.stdout.write(`${JSON.stringify({
  verdict: matrix.verdict,
  exact_build_sha: matrix.exact_build_sha,
  renderer_sha256: matrix.renderer.macos.sha256,
  runtime_sha256: matrix.runtime.macos.sha256,
  runtime_files: matrix.runtime.macos.file_count,
  visited_runtime_modules: matrix.runtime.import_graph.visited_module_count,
  external_source_import_count: matrix.runtime.import_graph.external_source_import_count,
  synthetic_tenant_fallback_count: matrix.runtime_smoke.canonical_tenant_fallback_count,
  matrix: path.relative(ROOT, MATRIX_PATH),
}, null, 2)}\n`);
