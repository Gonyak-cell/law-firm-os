#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const PROGRAM = "SF-CLIENT-MATTER-PARITY";
const SCREENSHOT_DIR = "Law Firm OS UI/Salesforce web Mar 2026";
const SHOWCASE_PATH = `${SCREENSHOT_DIR}/showcase.html`;
const OUTPUT_PATH = "docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json";
const SOURCE_RE = /^Salesforce web Mar 2026 (\d+)\.png$/;

const featureTaxonomy = Object.freeze([
  {
    id: "SF-SHOT-F01",
    capability: "global_navigation_and_object_tabs",
    showcase_markers: ["클라이언트", "계정", "사건", "청구", "문서", "분석"],
    parity_lane: "SF-A-W01"
  },
  {
    id: "SF-SHOT-F02",
    capability: "record_workspace_list_detail_right_panel",
    showcase_markers: ["최근 본 항목", "정보", "연락처", "활동"],
    parity_lane: "SF-A-W01"
  },
  {
    id: "SF-SHOT-F03",
    capability: "record_actions_path_owner_and_inline_edit",
    showcase_markers: ["전환", "소유자 변경", "편집", "상태 완료 표시"],
    parity_lane: "SF-B-W02"
  },
  {
    id: "SF-SHOT-F04",
    capability: "activity_calendar_channel",
    showcase_markers: ["Matter Channel", "캘린더 / 일정", "새 이벤트"],
    parity_lane: "SF-B-W03"
  },
  {
    id: "SF-SHOT-F05",
    capability: "documents_email_builder_and_dms",
    showcase_markers: ["DMS 파일", "문서 / 이메일 빌더", "승인 요청"],
    parity_lane: "SF-B-W04"
  },
  {
    id: "SF-SHOT-F06",
    capability: "billing_erp_and_finance_grid",
    showcase_markers: ["ERP 청구", "ERP 그리드 / 예측", "청구 예측표 검색"],
    parity_lane: "SF-A-W05"
  },
  {
    id: "SF-SHOT-F07",
    capability: "import_data_mapping",
    showcase_markers: ["임포트 / 데이터 매핑", "파일 업로드", "Matter 필드 매핑"],
    parity_lane: "SF-B-W05"
  },
  {
    id: "SF-SHOT-F08",
    capability: "admin_permission_data_cloud",
    showcase_markers: ["관리자 설정 / 권한", "권한 세트", "객체 관리자", "연결 앱", "Data Cloud"],
    parity_lane: "SF-B-W06/SF-B-W07"
  },
  {
    id: "SF-SHOT-F09",
    capability: "analytics_reports_and_dashboards",
    showcase_markers: ["보고서 보기", "내 분석", "비즈니스 개요 대시보드", "생성"],
    parity_lane: "SF-B-W08"
  },
  {
    id: "SF-SHOT-F10",
    capability: "empty_state_and_recommendations",
    showcase_markers: ["빈 상태 / 추천 패널", "추천 보기"],
    parity_lane: "SF-A-W06"
  }
]);

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function extractShowcaseDeclaredMaxIndex(showcaseSource) {
  const match = showcaseSource.match(/for \(let index = 0; index <= (\d+); index \+= 1\)/);
  if (!match) throw new Error("Unable to find showcase source screenshot loop.");
  return Number(match[1]);
}

function extractContactRanges(showcaseSource) {
  const match = showcaseSource.match(/const contactRanges = \[([\s\S]*?)\];/);
  if (!match) throw new Error("Unable to find showcase contactRanges.");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function linesWithMarkers(showcaseSource, markers) {
  const lines = showcaseSource.split("\n");
  return markers.map((marker) => {
    const lineIndex = lines.findIndex((line) => line.includes(marker));
    return {
      marker,
      present: lineIndex >= 0,
      showcase_line: lineIndex >= 0 ? lineIndex + 1 : null
    };
  });
}

const screenshotAbs = join(ROOT, SCREENSHOT_DIR);
if (!existsSync(screenshotAbs)) throw new Error(`Missing screenshot directory: ${SCREENSHOT_DIR}`);

const showcase = read(SHOWCASE_PATH);
const declaredMaxIndex = extractShowcaseDeclaredMaxIndex(showcase);
const contactSheetRanges = extractContactRanges(showcase);
const entries = readdirSync(screenshotAbs).sort();
const sourceScreenshots = [];
const derivedPngAssets = [];

for (const entry of entries) {
  if (!entry.endsWith(".png")) continue;
  const sourceMatch = entry.match(SOURCE_RE);
  const stats = statSync(join(screenshotAbs, entry));
  const row = {
    file: entry,
    relative_path: `${SCREENSHOT_DIR}/${entry}`,
    bytes: stats.size
  };
  if (sourceMatch) {
    sourceScreenshots.push({
      screenshot_index: Number(sourceMatch[1]),
      ...row
    });
  } else {
    derivedPngAssets.push(row);
  }
}

sourceScreenshots.sort((a, b) => a.screenshot_index - b.screenshot_index);
const sourceIndices = new Set(sourceScreenshots.map((item) => item.screenshot_index));
const expectedIndices = Array.from({ length: declaredMaxIndex + 1 }, (_, index) => index);
const missingSourceIndices = expectedIndices.filter((index) => !sourceIndices.has(index));
const extraSourceIndices = sourceScreenshots
  .map((item) => item.screenshot_index)
  .filter((index) => index < 0 || index > declaredMaxIndex);

const inventory = {
  schema_version: "law-firm-os.sf-client-matter-parity.salesforce-screenshot-inventory.v0.1",
  program: PROGRAM,
  inventory_date: "2026-06-24",
  source_dir: SCREENSHOT_DIR,
  showcase_ref: SHOWCASE_PATH,
  boundary: {
    screenshot_inventory_only: true,
    no_ui_implementation_claim: true,
    no_backend_completion_claim: true,
    production_ready_claim: false,
    go_live_claim: false,
    enterprise_trust_claim: false
  },
  counts: {
    source_screenshot_count: sourceScreenshots.length,
    showcase_declared_source_count: declaredMaxIndex + 1,
    derived_png_asset_count: derivedPngAssets.length,
    png_total_count: sourceScreenshots.length + derivedPngAssets.length,
    contact_sheet_range_count: contactSheetRanges.length,
    missing_source_index_count: missingSourceIndices.length,
    extra_source_index_count: extraSourceIndices.length
  },
  source_index_coverage: {
    first_index: sourceScreenshots[0]?.screenshot_index ?? null,
    last_index: sourceScreenshots[sourceScreenshots.length - 1]?.screenshot_index ?? null,
    missing_source_indices: missingSourceIndices,
    extra_source_indices: extraSourceIndices
  },
  contact_sheet_ranges: contactSheetRanges,
  feature_taxonomy: featureTaxonomy.map((feature) => ({
    ...feature,
    marker_evidence: linesWithMarkers(showcase, feature.showcase_markers)
  })),
  source_screenshots: sourceScreenshots,
  derived_png_assets: derivedPngAssets
};

mkdirSync(dirname(join(ROOT, OUTPUT_PATH)), { recursive: true });
writeFileSync(join(ROOT, OUTPUT_PATH), `${JSON.stringify(inventory, null, 2)}\n`);

console.log(JSON.stringify({
  inventory: OUTPUT_PATH,
  source_screenshot_count: inventory.counts.source_screenshot_count,
  derived_png_asset_count: inventory.counts.derived_png_asset_count,
  png_total_count: inventory.counts.png_total_count,
  missing_source_index_count: inventory.counts.missing_source_index_count,
  extra_source_index_count: inventory.counts.extra_source_index_count,
  feature_taxonomy_count: inventory.feature_taxonomy.length
}, null, 2));
