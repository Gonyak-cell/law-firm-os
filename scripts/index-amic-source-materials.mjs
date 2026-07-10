#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [sourceRootArgument, outputRootArgument] = process.argv.slice(2);
const sourceRoot = path.resolve(sourceRootArgument ?? "");
const outputRoot = path.resolve(outputRootArgument ?? "");
const activeLanes = new Map([
  ["1. 민사", "civil_litigation"],
  ["2. 형사", "criminal_litigation"],
  ["3. 행정", "administrative_litigation"],
  ["4. 기업 자문", "corporate_advisory"],
  ["5. 기업 인수&합병", "deal"],
]);

function requiredDirectory(value, label) {
  if (!value || value === path.resolve(".")) throw new Error(`${label} is required`);
  return value;
}

function sourceScope(segments) {
  if (activeLanes.has(segments[0])) return "current";
  if (segments[0] === "999_이전 자료들") return "legacy";
  return "operations";
}

function fileKind(extension) {
  if ([".pdf", ".doc", ".docx", ".hwp", ".hwpx", ".txt", ".rtf"].includes(extension)) return "document";
  if ([".xls", ".xlsx", ".xlsb", ".xlsm", ".csv"].includes(extension)) return "spreadsheet";
  if ([".eml", ".msg", ".mbox"].includes(extension)) return "email";
  if ([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".heic"].includes(extension)) return "image";
  if ([".mp4", ".mov", ".avi", ".mkv"].includes(extension)) return "video";
  if ([".m4a", ".mp3", ".wav"].includes(extension)) return "audio";
  return "other";
}

function extractability(extension, kind) {
  if ([".docx", ".hwpx", ".txt", ".rtf", ".csv", ".eml", ".mbox"].includes(extension)) return "native_text";
  if ([".pdf", ".doc", ".xls", ".xlsx", ".xlsb", ".xlsm", ".msg"].includes(extension)) return "text_or_conversion_required";
  if (extension === ".hwp") return "hwp_conversion_required";
  if (kind === "image") return "ocr_required";
  return "metadata_only";
}

function documentKind(relativePath) {
  const source = relativePath.toLowerCase().normalize("NFC");
  if (/위임장|선임계|소송대리인|변호인/.test(source)) return "authority_document";
  if (/소장|답변서|준비서면|항소장|고소장|의견서|신청서|진정서/.test(source)) return "filing";
  if (/판결|결정|기일|법원|검찰|경찰|수사결과|송치/.test(source)) return "official_case_record";
  if (/계약|mou|spa|nda|term.?sheet|투자/.test(source)) return "engagement_or_transaction";
  if (/재무|회계|valuation|실사|due.?diligence|손익|비용/.test(source)) return "financial_or_due_diligence";
  if (/등기|사업자|법인/.test(source)) return "client_identity_record";
  if (/증거|증빙|자료/.test(source)) return "evidence";
  return "unclassified";
}

export function classifySourcePath(relativePath, lane) {
  const source = relativePath.toLowerCase().normalize("NFC");
  if (/경찰|검찰|고소|고발|수사|형사/.test(source)) return "criminal_litigation";
  if (/행정심판|처분|세무|관세|국세|지방세/.test(source)) return "administrative_litigation";
  if (/mou|spa|매각|인수|투자|due.?diligence|실사/.test(source)) return "deal";
  if (/자문|retainer|유권해석|정기.?자문/.test(source)) return "corporate_advisory";
  return activeLanes.get(lane) ?? "unknown";
}

function hasLaneMismatch(lane, hint) {
  return activeLanes.has(lane) && activeLanes.get(lane) !== hint;
}

function safeCaseFolder(segments, scope) {
  return scope === "current" && segments.length > 1 ? segments[1] : null;
}

function recordId(relativePath, size, modifiedAt) {
  return createHash("sha256").update(`${relativePath}\u0000${size}\u0000${modifiedAt}`).digest("hex");
}

function increment(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function writeLine(stream, record) {
  if (!stream.write(`${JSON.stringify(record)}\n`)) {
    return new Promise((resolve, reject) => {
      stream.once("drain", resolve);
      stream.once("error", reject);
    });
  }
  return Promise.resolve();
}

async function listFiles(directory, context) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    context.unreadablePaths.push({ relative_path: path.relative(context.root, directory), reason: error.code ?? "READ_ERROR" });
    return;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "ko"))) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await listFiles(absolutePath, context);
      continue;
    }
    if (!entry.isFile()) continue;
    let metadata;
    try {
      metadata = await stat(absolutePath);
    } catch (error) {
      context.unreadablePaths.push({ relative_path: path.relative(context.root, absolutePath), reason: error.code ?? "STAT_ERROR" });
      continue;
    }
    await context.visitFile(absolutePath, metadata);
  }
}

async function closeStream(stream) {
  await new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.end(resolve);
  });
}

async function main() {
  requiredDirectory(sourceRootArgument, "source root");
  requiredDirectory(outputRootArgument, "output root");
  await mkdir(outputRoot, { recursive: true });
  const manifestPath = path.join(outputRoot, "source-manifest.jsonl");
  const temporaryManifestPath = `${manifestPath}.partial`;
  const manifest = createWriteStream(temporaryManifestPath, { encoding: "utf8" });
  const summary = {
    schema_version: "law-firm-os.amic_source_index.v1",
    generated_at: new Date().toISOString(),
    source_root: sourceRoot,
    source_content_written: false,
    total_files: 0,
    by_scope: {},
    by_lane: {},
    by_extension: {},
    by_file_kind: {},
    by_extractability: {},
    by_profile_hint: {},
    lane_mismatch_review_count: 0,
    current_case_folders: {},
    unreadable_paths: [],
  };

  try {
    await listFiles(sourceRoot, {
      root: sourceRoot,
      unreadablePaths: summary.unreadable_paths,
      visitFile: async (absolutePath, metadata) => {
      const relativePath = path.relative(sourceRoot, absolutePath).split(path.sep).join("/");
      const segments = relativePath.split("/");
      const normalizedSegments = segments.map((segment) => segment.normalize("NFC"));
      const lane = normalizedSegments[0] ?? "";
      const scope = sourceScope(normalizedSegments);
      const extension = path.extname(relativePath).toLowerCase() || "[none]";
      const kind = fileKind(extension);
      const hint = classifySourcePath(relativePath, lane);
      const mismatch = hasLaneMismatch(lane, hint);
      const caseFolder = safeCaseFolder(segments, scope);
      const record = {
        source_record_id: recordId(relativePath, metadata.size, metadata.mtime.toISOString()),
        relative_path: relativePath,
        source_scope: scope,
        source_lane: activeLanes.has(lane) ? lane : null,
        case_folder_hint: caseFolder,
        extension,
        file_kind: kind,
        extractability: extractability(extension, kind),
        document_kind_hint: documentKind(relativePath),
        profile_kind_hint: hint,
        lane_mismatch_review_required: mismatch,
        byte_size: metadata.size,
        modified_at: metadata.mtime.toISOString(),
        content_hash: null,
        content_hash_status: "pending",
      };
      await writeLine(manifest, record);
      summary.total_files += 1;
      increment(summary.by_scope, scope);
      increment(summary.by_extension, extension);
      increment(summary.by_file_kind, kind);
      increment(summary.by_extractability, record.extractability);
      increment(summary.by_profile_hint, hint);
      if (record.source_lane) increment(summary.by_lane, record.source_lane);
      if (mismatch) summary.lane_mismatch_review_count += 1;
      if (caseFolder) increment(summary.current_case_folders, `${lane}/${caseFolder}`);
      },
    });
  } finally {
    await closeStream(manifest);
  }

  await rename(temporaryManifestPath, manifestPath);
  await writeFile(path.join(outputRoot, "source-index-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  if (summary.total_files === 0 || (summary.by_scope.current ?? 0) === 0) throw new Error("source index must contain current AMIC materials");
  console.log(JSON.stringify({
    verdict: "PASS",
    total_files: summary.total_files,
    current_files: summary.by_scope.current ?? 0,
    legacy_files: summary.by_scope.legacy ?? 0,
    lane_mismatch_review_count: summary.lane_mismatch_review_count,
    output_root: outputRoot,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
