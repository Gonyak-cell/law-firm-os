#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "../packages/master-data/src/amic-client-candidates.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_PATH = path.join(
  ROOT,
  "docs/lazycodex/evidence/matter-desktop/artifacts/amic-onedrive-client-candidates-2026-07-01.json",
);
const SOURCE_REVISION = "amic_current_onedrive_matter_code_inventory_2026_07_01";
const GENERATED_AT = "2026-07-01T00:00:00.000+09:00";

const LANE_TO_AXIS = Object.freeze({
  "1. 민사": "LIT",
  "2. 형사": "LIT",
  "3. 행정": "LIT",
  "4. 기업 자문": "ADV",
  "5. 기업 인수&합병": "DEAL",
});

const LANE_ROOT_DIR = Object.freeze({
  "1. 민사": "1. 민사",
  "2. 형사": "2. 형사",
  "3. 행정": "3. 행정",
  "4. 기업 자문": "4. 기업 자문",
  "5. 기업 인수&합병": "5. 기업 인수&합병",
});

const LANE_DEFAULT_DETAIL = Object.freeze({
  "1. 민사": "민사사건",
  "2. 형사": "형사사건",
  "3. 행정": "행정사건",
  "4. 기업 자문": "retainer",
});

const GROUPED_PROJECT_OVERRIDES = Object.freeze({
  "홀딩핸즈앤코 외 12명|5. 기업 인수&합병": Object.freeze({
    detail: "Covenant",
    source_ref:
      "5. 기업 인수&합병/99_Archives/01_Pjt. Covenant",
    confidence: "verified_contract_party_group",
  }),
  "한흥수 외 6명|5. 기업 인수&합병": Object.freeze({
    detail: "Jade",
    source_ref:
      "5. 기업 인수&합병/99_Archives/07_Pjt. Jade",
    confidence: "verified_contract_party_group",
  }),
  "노윤현 외 19명|5. 기업 인수&합병": Object.freeze({
    detail: "Max",
    source_ref:
      "5. 기업 인수&합병/99_Archives/13_Pjt. Max",
    confidence: "verified_contract_party_group",
  }),
  "최재헌 외 2명|5. 기업 인수&합병": Object.freeze({
    detail: "Next",
    source_ref:
      "5. 기업 인수&합병/04_Pjt. Next",
    confidence: "verified_contract_party_group",
  }),
  "이강명 외 1명|5. 기업 인수&합병": Object.freeze({
    detail: "Project S",
    source_ref:
      "5. 기업 인수&합병/99_Archives/01_Pjt. P",
    confidence: "verified_contract_party_group",
  }),
  "강상도 외 16명|5. 기업 인수&합병": Object.freeze({
    detail: "Phoenix",
    source_ref:
      "5. 기업 인수&합병/99_Archives/Pjt. Phoenix",
    confidence: "verified_contract_party_group",
  }),
  "박민규 외 5명|5. 기업 인수&합병": Object.freeze({
    detail: "Tempus",
    source_ref:
      "5. 기업 인수&합병/99_Archives/Pjt. Tempus",
    confidence: "verified_contract_party_group",
  }),
  "권도균 외 11명|5. 기업 인수&합병": Object.freeze({
    detail: "Washington",
    source_ref:
      "5. 기업 인수&합병/17_Pjt. Washington",
    confidence: "verified_contract_party_group",
  }),
  "펜타스톤-오라이언-온앤업 신기술투자조합|5. 기업 인수&합병": Object.freeze({
    detail: "Wiz",
    source_ref:
      "5. 기업 인수&합병/99_Archives/02_Pjt. Wiz",
    confidence: "verified_contract_party_group",
  }),
  "봉경환 외 4명|5. 기업 인수&합병": Object.freeze({
    detail: "Fausta",
    source_ref:
      "5. 기업 인수&합병/02_Project Fausta",
    confidence: "verified_contract_party_group",
  }),
  "박태오|5. 기업 인수&합병": Object.freeze({
    detail: "Puma",
    source_ref:
      "5. 기업 인수&합병/07_Project Puma",
    confidence: "verified_contract_party_group",
  }),
  "SMEJ Holdings, INC. 외 1명|1. 민사": Object.freeze({
    detail: "Kingston dispute",
    source_ref:
      "1. 민사/Project Kingston_dispute",
    confidence: "verified_contract_party_group",
  }),
  "롯데에너지머티리얼즈|5. 기업 인수&합병": Object.freeze({
    detail: "Lion",
    source_ref:
      "5. 기업 인수&합병/09_Pjt. Lion",
    confidence: "verified_mou_party_group",
  }),
  "김정환|5. 기업 인수&합병": Object.freeze({
    detail: "Switch",
    source_ref:
      "5. 기업 인수&합병/12_Pjt. Switch",
    confidence: "verified_mou_party_group",
  }),
  "오윤록 외 1명|5. 기업 인수&합병": Object.freeze({
    detail: "Titan",
    source_ref:
      "5. 기업 인수&합병/99_Archives/03_Pjt. Titan",
    confidence: "verified_mou_party_group",
  }),
  "에이치엘엘중앙|5. 기업 인수&합병": Object.freeze({
    detail: "Horizon",
    source_ref:
      "5. 기업 인수&합병/Project Horizon",
    confidence: "verified_mou_party_group",
  }),
});

const ATU_DEAL_MATTER_OVERRIDES = Object.freeze([
  Object.freeze({
    detail: "IBK-ATU콘텐츠미디어테크PEF 설립",
    source_ref: "5. 기업 인수&합병/06_ATU/01_블라인드펀드",
    confidence: "verified_atu_pef_formation",
  }),
  Object.freeze({
    detail: "에이티유컬쳐테크6호PEF 설립",
    source_ref: "5. 기업 인수&합병/06_ATU/02_프로젝트펀드",
    confidence: "verified_atu_pef_formation",
  }),
  Object.freeze({
    detail: "PEF 동업기업과세특례 신청",
    source_ref: "5. 기업 인수&합병/06_ATU/03_동업기업과세특례 신청",
    confidence: "verified_atu_pef_tax_election",
  }),
  Object.freeze({
    detail: "Kubo",
    source_ref: "5. 기업 인수&합병/06_ATU/Pjt. Kubo",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "Day",
    source_ref: "5. 기업 인수&합병/06_ATU/Project Day.pdf",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "Wonder",
    source_ref:
      "5. 기업 인수&합병/06_ATU/01_블라인드펀드/신규 투자 프로젝트 계약서 검토/260113 수임제안서_Pjt Wonder.docx",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "휴민트",
    source_ref:
      "5. 기업 인수&합병/06_ATU/01_블라인드펀드/신규 투자 프로젝트 계약서 검토/11. 휴민트_투자계약서(ATU)(30.0).docx",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "AMP 앨범",
    source_ref:
      "5. 기업 인수&합병/06_ATU/01_블라인드펀드/신규 투자 프로젝트 계약서 검토/AMP 앨범 투자계약서_ATU_초안_2026.01.15_revised.docx",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "영화 HOPE 투자",
    source_ref: "5. 기업 인수&합병/06_ATU/콘텐츠(영화) 프로젝트 투자계약서_draft_251208.docx",
    confidence: "verified_atu_individual_investment",
  }),
]);

const DETAIL_PATTERNS = Object.freeze([
  ["건물등철거", "건물철거청구"],
  ["건물철거", "건물철거청구"],
  ["토지인도", "토지인도청구"],
  ["건물인도", "건물인도청구"],
  ["부동산인도", "부동산인도청구"],
  ["명도", "부동산인도청구"],
  ["소유권이전등기", "소유권이전등기청구"],
  ["주주총회결의 취소", "주주총회결의취소"],
  ["주주총회결의취소", "주주총회결의취소"],
  ["특허권침해금지", "특허권침해금지"],
  ["제소전화해", "제소전화해"],
  ["손해배상", "손해배상청구"],
  ["손배", "손해배상청구"],
  ["약정금", "약정금청구"],
  ["대여금", "대여금청구"],
  ["청구이의", "청구이의의소"],
  ["부당이득", "부당이득반환청구"],
  ["사해행위", "사해행위취소"],
  ["가압류", "가압류"],
  ["가처분", "가처분"],
  ["지급명령", "지급명령"],
  ["공사대금", "공사대금청구"],
  ["용역대금", "용역대금청구"],
  ["매매대금", "매매대금청구"],
  ["주주", "주주분쟁"],
  ["분쟁", "분쟁"],
  ["피해", "피해구제"],
  ["사기", "사기"],
  ["업무상배임", "업무상배임"],
  ["배임", "배임"],
  ["횡령", "횡령"],
  ["강제집행면탈", "강제집행면탈"],
  ["조세범", "조세범처벌법위반"],
  ["탈세", "조세범처벌법위반"],
  ["형사고소", "형사고소"],
  ["고소", "형사고소"],
  ["수사대응", "수사대응"],
  ["세무조사", "세무조사"],
  ["조세불복", "조세불복"],
  ["징계", "징계"],
  ["행정심판", "행정심판"],
  ["처분취소", "처분취소"],
  ["유권해석", "유권해석"],
]);

const CIVIL_DETAIL_PATTERNS = Object.freeze([
  [/건물\s*등?\s*철거/u, "건물철거청구"],
  [/토지\s*인도/u, "토지인도청구"],
  [/건물\s*인도/u, "건물인도청구"],
  [/부동산\s*인도|명도/u, "부동산인도청구"],
  [/소유권\s*이전\s*등기/u, "소유권이전등기청구"],
  [/주주총회\s*결의\s*취소/u, "주주총회결의취소"],
  [/특허권\s*침해\s*금지/u, "특허권침해금지"],
  [/손해\s*배상(?:금)?|손배/u, "손해배상청구"],
  [/중개\s*보수/u, "중개보수청구"],
  [/대여금/u, "대여금청구"],
  [/약정금/u, "약정금청구"],
  [/청구\s*이의/u, "청구이의의소"],
  [/부당\s*이득/u, "부당이득반환청구"],
  [/사해\s*행위/u, "사해행위취소"],
  [/가압류\s*이의/u, "가압류이의"],
  [/가압류/u, "가압류"],
  [/가처분/u, "가처분"],
  [/지급\s*명령/u, "지급명령"],
  [/공사\s*대금/u, "공사대금청구"],
  [/용역\s*대금/u, "용역대금청구"],
  [/매매\s*대금/u, "매매대금청구"],
  [/원상\s*복구\s*공사\s*대금|임대차목적물원상복구/u, "원상복구공사대금청구"],
  [/제소\s*전\s*화해/u, "제소전화해"],
]);

const CRIMINAL_DETAIL_PATTERNS = Object.freeze([
  [/특정\s*경제\s*범죄.*사기|특경법.*사기/u, "특정경제범죄가중처벌법위반(사기)"],
  [/특정\s*경제\s*범죄.*배임|특경법.*배임/u, "특정경제범죄가중처벌법위반(배임)"],
  [/특정\s*경제\s*범죄.*횡령|특경법.*횡령/u, "특정경제범죄가중처벌법위반(횡령)"],
  [/보험\s*사기/u, "보험사기"],
  [/업무상\s*배임/u, "업무상배임"],
  [/배임\s*수재/u, "배임수재"],
  [/배임\s*증재/u, "배임증재"],
  [/강제\s*집행\s*면탈/u, "강제집행면탈"],
  [/조세범|조세범처벌/u, "조세범처벌법위반"],
  [/명예\s*훼손/u, "명예훼손"],
  [/업무\s*방해/u, "업무방해"],
  [/공갈/u, "공갈"],
  [/협박/u, "협박"],
  [/무고/u, "무고"],
  [/위증/u, "위증"],
  [/(^|[^가-힣])사기([^가-힣]|$)/u, "사기"],
  [/횡령/u, "횡령"],
  [/배임/u, "배임"],
]);

const ADMIN_DETAIL_PATTERNS = Object.freeze([
  [/감봉.*징계부가금.*처분\s*취소|징계.*처분\s*취소|징계/u, "징계처분취소"],
  [/행정\s*심판/u, "행정심판"],
  [/조세\s*불복/u, "조세불복"],
  [/세무\s*조사/u, "세무조사대응"],
  [/탈세\s*제보/u, "탈세제보"],
  [/처분\s*취소/u, "처분취소"],
  [/1\s*세대\s*2\s*주택/u, "1세대2주택"],
  [/명의\s*신탁\s*환원/u, "명의신탁환원"],
]);

const DOCUMENT_PREVIEW_EXTENSIONS = Object.freeze(new Set([".doc", ".docx", ".pdf", ".rtf", ".txt", ".md"]));
const MAX_EVIDENCE_DEPTH = 8;
const MAX_EVIDENCE_ENTRIES = 5000;

function cleanSegment(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replaceAll("/", "-")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLegalName(value) {
  return cleanSegment(value)
    .replace(/^\(주\)\s*/u, "")
    .replace(/^㈜\s*/u, "")
    .replace(/\s*(주식회사|유한회사|유한책임회사)$/u, "")
    .trim();
}

function cleanRequestedClientLabelNoise(value) {
  return String(value ?? "")
    .replace(/\s*RCPS\s*상환\s*관련/giu, "")
    .replace(/(^|[^가-힣])인천\s+(?=더드림병원)/gu, "$1")
    .replace(/귀한\s+사람들/gu, "귀한사람들")
    .replace(/\s*유튜브\s*영상/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFolderName(value) {
  return cleanRequestedClientLabelNoise(stripLegalName(value)
    .replace(/^\d+[_\-. ]*/u, "")
    .replace(/^Pjt\.\s*/iu, "")
    .replace(/^Project\s+/iu, "")
    .replace(/\s+관련\s*검토$/u, " 관련")
    .replace(/\s+대응$/u, " 대응"));
}

function cleanClientMatchKey(value) {
  return cleanFolderName(value)
    .replace(/\([^)]*\)/gu, " ")
    .replace(/\b(v\.?|vs\.?)\b.*$/iu, " ")
    .replace(/\s*(선생님|회장님|원장님|교수님|작가|변호사|대표님|대표|PD)\s*$/iu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clientMatchKeys(client) {
  return [
    cleanClientMatchKey(client.display_name),
    cleanClientMatchKey(client.canonical_display_name),
  ].filter(Boolean);
}

function splitSourceLanes(value) {
  return String(value ?? "")
    .split(/\s*;\s*/u)
    .map((lane) => lane.trim())
    .filter(Boolean);
}

function rowNames(row) {
  return [row?.client_name, ...String(row?.raw_folder_names ?? "").split(/\s*\|\s*/u)]
    .map(cleanClientMatchKey)
    .filter(Boolean);
}

function namesMatch(left, right) {
  if (!left || !right) return false;
  return left === right || left.startsWith(`${right} `) || right.startsWith(`${left} `);
}

function sourceRowsForClient({ client, lane }) {
  const keys = clientMatchKeys(client);
  return inventory.rows
    .filter((row) => splitSourceLanes(row.source_lanes).includes(lane))
    .filter((row) => !String(row.representative_path ?? "").normalize("NFC").includes("/999_이전 자료들/"))
    .filter((row) => rowNames(row).some((rowName) => keys.some((key) => namesMatch(rowName, key))))
    .sort((left, right) => {
      const leftExact = rowNames(left).some((rowName) => keys.includes(rowName)) ? 1 : 0;
      const rightExact = rowNames(right).some((rowName) => keys.includes(rowName)) ? 1 : 0;
      return rightExact - leftExact;
    });
}

function relativeSourcePath(sourcePath) {
  return cleanRequestedClientLabelNoise(cleanSegment(String(sourcePath ?? "").normalize("NFC").replace(`${inventory.root.normalize("NFC")}/`, "")));
}

function isInsideLane(sourcePath, lane) {
  return String(sourcePath ?? "").normalize("NFC").includes(`/${lane}/`);
}

function directoryMatchesClient(dirName, keys) {
  const normalized = cleanClientMatchKey(dirName);
  return keys.some((key) => namesMatch(normalized, key));
}

function findLaneDirectories(client, lane) {
  const laneRoot = path.join(inventory.root, LANE_ROOT_DIR[lane] ?? "");
  if (!laneRoot || !existsSync(laneRoot)) return [];
  const keys = clientMatchKeys(client);
  const matches = [];
  const visit = (dir, depth) => {
    if (depth > 3) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      const normalized = fullPath.normalize("NFC");
      if (normalized.includes("/999_이전 자료들/")) continue;
      if (directoryMatchesClient(entry.name, keys)) matches.push(fullPath);
      visit(fullPath, depth + 1);
    }
  };
  visit(laneRoot, 0);
  return matches;
}

function candidateSourceRoots({ client, lane, sourceRows }) {
  const roots = [
    ...sourceRows.map((row) => row.representative_path).filter((sourcePath) => isInsideLane(sourcePath, lane)),
    ...findLaneDirectories(client, lane),
  ];
  return [...new Set(roots.map((sourcePath) => String(sourcePath ?? "")))].filter((sourcePath) => sourcePath && existsSync(sourcePath));
}

const evidenceEntryCache = new Map();
function evidenceEntries(rootPath) {
  const cacheKey = rootPath.normalize("NFC");
  if (evidenceEntryCache.has(cacheKey)) return evidenceEntryCache.get(cacheKey);
  const entries = [];
  const visit = (currentPath, depth) => {
    if (depth > MAX_EVIDENCE_DEPTH || entries.length >= MAX_EVIDENCE_ENTRIES) return;
    let dirEntries = [];
    try {
      dirEntries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of dirEntries) {
      if (entry.name.startsWith(".") || entries.length >= MAX_EVIDENCE_ENTRIES) continue;
      const fullPath = path.join(currentPath, entry.name);
      const normalized = fullPath.normalize("NFC");
      if (normalized.includes("/999_이전 자료들/")) continue;
      if (normalized.includes("AI작업")) continue;
      if (entry.isDirectory()) {
        entries.push({ path: fullPath, kind: "dir" });
        visit(fullPath, depth + 1);
      } else {
        entries.push({ path: fullPath, kind: "file" });
      }
    }
  };
  visit(rootPath, 0);
  evidenceEntryCache.set(cacheKey, entries);
  return entries;
}

function detailFromText(text, fallback) {
  const normalized = cleanFolderName(text);
  for (const [needle, detail] of DETAIL_PATTERNS) {
    if (normalized.includes(needle)) return detail;
  }
  return normalized || fallback;
}

function detailPatternsForText(text, lane) {
  const normalized = cleanSegment(text);
  const criminalFirst = lane === "2. 형사" || /고소장|공소장|죄명|형사/u.test(normalized);
  const patternGroups = lane === "2. 형사"
    ? [CRIMINAL_DETAIL_PATTERNS]
    : lane === "3. 행정"
      ? [ADMIN_DETAIL_PATTERNS]
      : criminalFirst
        ? [CRIMINAL_DETAIL_PATTERNS, CIVIL_DETAIL_PATTERNS, ADMIN_DETAIL_PATTERNS]
        : [CIVIL_DETAIL_PATTERNS, CRIMINAL_DETAIL_PATTERNS, ADMIN_DETAIL_PATTERNS];
  for (const patterns of patternGroups) {
    for (const [pattern, detail] of patterns) {
      if (pattern.test(normalized)) return detail;
    }
  }
  return null;
}

function detailFromPatternGroup(patterns, text) {
  const normalized = cleanSegment(text);
  for (const [pattern, detail] of patterns) {
    if (pattern.test(normalized)) return detail;
  }
  return null;
}

function stripFileExtension(value) {
  return cleanSegment(value).replace(/\.[^.]+$/u, "").trim();
}

function cleanCaseTitle(value) {
  return stripFileExtension(value)
    .replace(/^[\d._\-\s]+/u, "")
    .replace(/^(서울|수원|인천|부산|대구|대전|광주|울산|창원|의정부|춘천|청주|전주|제주|남양주|부천|중앙|북부|동부|서부|남부)?\s*(지방법원|고등법원|대법원)?\s*/u, "")
    .replace(/\d{2,4}(가합|가단|가소|나|다|머|카합|카단|카기|차전|자|구합|구단|누|두|고합|고단|고정|노|도)\d+/gu, "")
    .replace(/\(\d{2,4}\.\d{1,2}\.\d{1,2}\)/gu, "")
    .replace(/^\(?\d{2,4}\.\d{1,2}\.\d{1,2}\)?/u, "")
    .replace(/^(소장|고소장|공소장|준비서면|답변서|판결문|결정문|신청서)[_\s-]*/u, "")
    .replace(/청구의\s*소$/u, "청구")
    .replace(/\s+외\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromCaseNumberText(value) {
  const normalized = stripFileExtension(value);
  const match = normalized.match(/\d{2,4}(?:가합|가단|가소|나|다|머|카합|카단|카기|차전|자|구합|구단|누|두|고합|고단|고정|노|도)\d+\s*[_\-\s]*(.+)$/u);
  if (!match) return null;
  const title = cleanCaseTitle(match[1]);
  if (!title || /^(소송서류|소송문서|사건기록|소송기록|갑호증|을호증|첨부|참고자료)$/u.test(title)) return null;
  return title;
}

function titleFromDocumentText(text, lane) {
  const normalized = cleanSegment(String(text ?? "").slice(0, 8000));
  const explicit = normalized.match(/(?:사건명|죄\s*명)\s*[:：]?\s*([^\n\r]+)/u);
  if (explicit?.[1]) return cleanCaseTitle(explicit[1]);
  if (lane === "2. 형사" || /고소장|공소장|죄명/u.test(normalized)) {
    const crime = detailPatternsForText(normalized, "2. 형사");
    if (crime) return crime;
  }
  const civilTitle = normalized.match(/([가-힣A-Za-z0-9·()\s]{2,40}청구의\s*소)/u);
  if (civilTitle?.[1]) return cleanCaseTitle(civilTitle[1]);
  const adminTitle = normalized.match(/([가-힣A-Za-z0-9·()\s]{2,40}(?:처분\s*취소|행정\s*심판|조세\s*불복)[가-힣A-Za-z0-9·()\s]{0,20})/u);
  if (adminTitle?.[1]) return cleanCaseTitle(adminTitle[1]);
  return null;
}

function readDocumentPreview(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!DOCUMENT_PREVIEW_EXTENSIONS.has(extension)) return "";
  try {
    if (extension === ".pdf") {
      return execFileSync("pdftotext", ["-l", "2", filePath, "-"], {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
    }
    if (extension === ".txt" || extension === ".md") return readFileSync(filePath, "utf8");
    return execFileSync("textutil", ["-convert", "txt", "-stdout", filePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function isPrimaryPleadingPath(value, lane) {
  const normalized = stripFileExtension(value);
  if (/소송위임장|사업자등록증|등기사항|등기부|첨부|서증|갑\d|을\d/u.test(normalized)) return false;
  if (lane === "2. 형사") return /(^|[_\s()[\]-])(고소장|공소장)($|[_\s()[\]-])/u.test(normalized);
  return /(^|[_\s()[\]-])(소장|고소장|공소장)($|[_\s()[\]-])/u.test(normalized);
}

function evidenceScore(entry, lane) {
  const sourcePath = entry.path.normalize("NFC");
  const baseName = path.basename(sourcePath);
  const rel = relativeSourcePath(sourcePath);
  const caseTitle = titleFromCaseNumberText(baseName);
  const relDetail = detailPatternsForText(rel, lane);
  const civilRelDetail = detailFromPatternGroup(CIVIL_DETAIL_PATTERNS, rel);
  const criminalOnlyCivilLane = lane === "1. 민사" && !civilRelDetail && detailFromPatternGroup(CRIMINAL_DETAIL_PATTERNS, rel);
  if (entry.kind === "dir" && relDetail) return criminalOnlyCivilLane ? 80 : 160;
  if (caseTitle && detailPatternsForText(caseTitle, lane) && entry.kind === "dir") return 170;
  if (caseTitle && detailPatternsForText(caseTitle, lane) && /사건기록|소송기록|소송서류|소송문서/u.test(rel)) return 140;
  if (caseTitle && detailPatternsForText(caseTitle, lane)) return 120;
  if (entry.kind === "dir" && caseTitle && lane !== "2. 형사") return 95;
  if (entry.kind === "file" && isPrimaryPleadingPath(baseName, lane) && detailPatternsForText(baseName, lane)) return lane === "2. 형사" ? 175 : 145;
  if (entry.kind === "file" && isPrimaryPleadingPath(baseName, lane) && lane === "2. 형사") return 165;
  if (entry.kind === "file" && isPrimaryPleadingPath(baseName, lane)) return /고소장|공소장/u.test(baseName) || lane === "2. 형사" ? 135 : 115;
  if (relDetail) {
    if (criminalOnlyCivilLane) return 60;
    return /사건기록|소송기록|소송서류|소송문서/u.test(rel) ? 100 : 70;
  }
  return 0;
}

function detailFromEvidenceEntry(entry, lane) {
  const sourcePath = entry.path.normalize("NFC");
  const baseName = path.basename(sourcePath);
  const rel = relativeSourcePath(sourcePath);
  const title = titleFromCaseNumberText(baseName);
  const candidateTexts = [title, baseName, rel].filter(Boolean);
  for (const text of candidateTexts) {
    const detail = detailPatternsForText(text, lane);
    if (detail) return { detail, confidence: title ? "court_record_case_title" : "legal_document_filename" };
  }
  if (entry.kind === "dir" && title && lane !== "2. 형사") return { detail: cleanCaseTitle(title), confidence: "court_record_case_title" };
  if (entry.kind === "file" && isPrimaryPleadingPath(baseName, lane)) {
    const documentTitle = titleFromDocumentText(readDocumentPreview(entry.path), lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? documentTitle;
    if (detail) return { detail, confidence: "legal_document_text" };
  }
  return null;
}

function detailFromSourceEvidence({ client, lane, sourceRows, sourceRoots }) {
  const roots = sourceRoots ?? candidateSourceRoots({ client, lane, sourceRows });
  const hasSeparateCriminalLane = lane === "1. 민사" && client.source_lanes.includes("2. 형사");
  const candidates = roots
    .flatMap((rootPath) => evidenceEntries(rootPath))
    .map((entry) => ({ entry, score: evidenceScore(entry, lane) }))
    .filter((candidate) => candidate.score > 0)
    .filter((candidate) => {
      if (!hasSeparateCriminalLane) return true;
      return !/형사고소|고소장|공소장|수사/u.test(relativeSourcePath(candidate.entry.path));
    })
    .sort((left, right) => right.score - left.score || relativeSourcePath(left.entry.path).length - relativeSourcePath(right.entry.path).length);
  for (const candidate of candidates) {
    const detail = detailFromEvidenceEntry(candidate.entry, lane);
    if (detail?.detail) {
      return {
        ...detail,
        source_ref: relativeSourcePath(candidate.entry.path),
      };
    }
  }
  return null;
}

function detailFromSourceFolderNames({ lane, sourceRows, sourceRoots }) {
  for (const row of sourceRows) {
    for (const rawName of String(row?.raw_folder_names ?? "").split(/\s*\|\s*/u).filter(Boolean)) {
      const detail = detailPatternsForText(rawName, lane);
      if (!detail) continue;
      const sourceRoot = sourceRoots.find((rootPath) => {
        const rel = relativeSourcePath(rootPath);
        return rel.includes(detail) || rel.includes(cleanFolderName(rawName));
      });
      return {
        detail,
        confidence: "folder_case_name",
        source_ref: sourceRoot ? relativeSourcePath(sourceRoot) : relativeSourcePath(row.representative_path),
      };
    }
  }
  return null;
}

function detailForLane({ client, lane, sourceRows }) {
  if (lane === "4. 기업 자문") {
    const sourceRoots = candidateSourceRoots({ client, lane, sourceRows });
    return {
      detail: "retainer",
      confidence: "rule_retainer",
      source_ref: sourceRoots[0] ? relativeSourcePath(sourceRoots[0]) : null,
    };
  }
  const override = GROUPED_PROJECT_OVERRIDES[`${client.display_name}|${lane}`];
  if (override) return override;
  if (lane === "5. 기업 인수&합병") {
    const sourceRoots = candidateSourceRoots({ client, lane, sourceRows });
    const sourceRow = sourceRows[0];
    const projectName = sourceRoots[0] ? path.basename(sourceRoots[0]) : sourceRow?.raw_folder_names;
    return {
      detail: detailFromText(projectName ?? client.display_name, client.display_name),
      confidence: "folder_project_name",
      source_ref: sourceRoots[0] ? relativeSourcePath(sourceRoots[0]) : null,
    };
  }
  const sourceRoots = candidateSourceRoots({ client, lane, sourceRows });
  if (lane === "2. 형사" || lane === "3. 행정") {
    const folderNameResult = detailFromSourceFolderNames({ lane, sourceRows, sourceRoots });
    if (folderNameResult) return folderNameResult;
  }
  const evidenceResult = detailFromSourceEvidence({ client, lane, sourceRows, sourceRoots });
  if (evidenceResult) return evidenceResult;
  const fallback = LANE_DEFAULT_DETAIL[lane] ?? "사건";
  const sourceRow = sourceRows[0];
  const rawNames = String(sourceRow?.raw_folder_names ?? "").split(/\s*\|\s*/u).filter(Boolean);
  const rawForLane = rawNames.find((name) => detailFromText(name, "") !== stripLegalName(client.display_name)) ?? rawNames[0];
  const detail = detailFromText(rawForLane ?? client.display_name, fallback);
  const defaulted =
    !rawForLane ||
    cleanClientMatchKey(detail) === cleanClientMatchKey(client.display_name) ||
    cleanClientMatchKey(detail) === cleanClientMatchKey(client.canonical_display_name) ||
    (lane === "2. 형사" && !detailPatternsForText(detail, lane)) ||
    (lane === "3. 행정" && !detailPatternsForText(detail, lane));
  return {
    detail: defaulted ? fallback : detail,
    confidence: defaulted ? "lane_default_review" : "folder_case_name",
    source_ref: sourceRoots[0] ? relativeSourcePath(sourceRoots[0]) : null,
  };
}

function detailResultsForLane({ client, lane, sourceRows }) {
  if (client.display_name === "ATU" && lane === "5. 기업 인수&합병") {
    return ATU_DEAL_MATTER_OVERRIDES;
  }
  return [detailForLane({ client, lane, sourceRows })];
}

function matterStatusForLane(lane) {
  return lane === "5. 기업 인수&합병" || lane === "4. 기업 자문" ? "open" : "opening";
}

function sourceRef(sourceRow, fallback = null) {
  const raw = fallback ?? sourceRow?.representative_path ?? "";
  return relativeSourcePath(raw);
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function boundedMatterCode(clientName, axis, detail) {
  const code = `${clientName}/${axis}/${detail}`;
  if (code.length <= 120) return code;
  const room = Math.max(12, 120 - clientName.length - axis.length - 4 - 9);
  return `${clientName}/${axis}/${detail.slice(0, room).trim()}-${shortHash(code)}`;
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
const clients = AMIC_CURRENT_CLIENT_CANDIDATES.map((candidate, index) => ({
  client_id: `client_rp05_amic_current_${String(index + 1).padStart(3, "0")}`,
  client_display_name: candidate.display_name,
  client_short_name: stripLegalName(candidate.display_name),
  canonical_display_name: candidate.canonical_display_name,
  legal_form: candidate.legal_form,
  candidate_type: candidate.candidate_type,
  source_lanes: candidate.source_lanes,
  source_revision: SOURCE_REVISION,
}));

const seenCodes = new Set();
const matters = [];
for (const [clientIndex, clientCandidate] of AMIC_CURRENT_CLIENT_CANDIDATES.entries()) {
  const client = clients[clientIndex];
  for (const lane of clientCandidate.source_lanes) {
    const axis = LANE_TO_AXIS[lane];
    if (!axis) continue;
    const sourceRows = sourceRowsForClient({ client: clientCandidate, lane });
    for (const detailResult of detailResultsForLane({ client: clientCandidate, lane, sourceRows })) {
      const detail = cleanSegment(detailResult.detail);
      const matterCode = boundedMatterCode(client.client_short_name, axis, detail);
      const duplicateSuffix = seenCodes.has(matterCode) ? `-${shortHash(`${matterCode}:${lane}:${matters.length}`)}` : "";
      const finalMatterCode = duplicateSuffix ? boundedMatterCode(client.client_short_name, axis, `${detail}${duplicateSuffix}`) : matterCode;
      seenCodes.add(finalMatterCode);
      const sequence = String(matters.length + 1).padStart(3, "0");
      matters.push({
        matter_id: `matter_rp05_amic_current_${sequence}`,
        tenant_id: "tenant_rp05_synthetic",
        client_id: client.client_id,
        client_display_name: client.client_display_name,
        client_short_name: client.client_short_name,
        matter_code: finalMatterCode,
        matter_number: `AMIC-MC-${sequence}`,
        matter_name: finalMatterCode,
        title: finalMatterCode,
        matter_axis: axis,
        matter_type_english: axis,
        matter_detail_type_korean: detail,
        source_lane: lane,
        source_ref: sourceRef(sourceRows[0], detailResult.source_ref),
        source_revision: SOURCE_REVISION,
        status: matterStatusForLane(lane),
        confidence: detailResult.confidence,
        review_required: detailResult.confidence === "lane_default_review",
      });
    }
  }
}

const js = `// Generated by scripts/generate-amic-matter-code-candidates.mjs on 2026-07-01.
// Source: ${SOURCE_REVISION}. Do not edit by hand.

export const AMIC_CURRENT_MATTER_CLIENTS = Object.freeze(
${JSON.stringify(clients, null, 2)}
);

export const AMIC_CURRENT_MATTER_CODE_CANDIDATES = Object.freeze(
${JSON.stringify(matters, null, 2)}
);
`;

const json = {
  generated_at: GENERATED_AT,
  source_revision: SOURCE_REVISION,
  client_count: clients.length,
  matter_count: matters.length,
  axis_counts: matters.reduce((acc, row) => {
    acc[row.matter_axis] = (acc[row.matter_axis] ?? 0) + 1;
    return acc;
  }, {}),
  clients,
  matters,
};

const csvHeaders = [
  "matter_id",
  "client_display_name",
  "matter_axis",
  "matter_detail_type_korean",
  "matter_code",
  "source_lane",
  "confidence",
  "review_required",
];
const csv = [
  csvHeaders.join(","),
  ...matters.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(",")),
].join("\n");

const md = `# AMIC Matter Code Candidates

Generated at: ${GENERATED_AT}

- Source revision: \`${SOURCE_REVISION}\`
- Clients: ${clients.length}
- Matter codes: ${matters.length}
- LIT: ${json.axis_counts.LIT ?? 0}
- ADV: ${json.axis_counts.ADV ?? 0}
- DEAL: ${json.axis_counts.DEAL ?? 0}

| Client | Axis | Detail | Matter code | Confidence |
| --- | --- | --- | --- | --- |
${matters
  .map((row) => `| ${row.client_display_name} | ${row.matter_axis} | ${row.matter_detail_type_korean} | \`${row.matter_code}\` | ${row.confidence} |`)
  .join("\n")}
`;

writeFileSync(path.join(ROOT, "packages/matter/src/amic-matter-code-candidates.js"), js);
writeFileSync(
  path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/amic-matter-code-candidates-2026-07-01.json"),
  `${JSON.stringify(json, null, 2)}\n`,
);
writeFileSync(
  path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/amic-matter-code-candidates-2026-07-01.csv"),
  `${csv}\n`,
);
writeFileSync(
  path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/amic-matter-code-candidates-2026-07-01.md"),
  md,
);

console.log(JSON.stringify({ clients: clients.length, matters: matters.length, axis_counts: json.axis_counts }, null, 2));
