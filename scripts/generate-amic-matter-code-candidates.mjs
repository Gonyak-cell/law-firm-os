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
  "4. 기업 자문": "Advisory",
  "5. 기업 인수&합병": "DEAL",
});

const LANE_TO_LITIGATION_AXIS = Object.freeze({
  "1. 민사": "CIV",
  "2. 형사": "CRM",
  "3. 행정": "ADM",
});

const LANE_ROOT_DIR = Object.freeze({
  "1. 민사": "1. 민사",
  "2. 형사": "2. 형사",
  "3. 행정": "3. 행정",
  "4. 기업 자문": "4. 기업 자문",
  "5. 기업 인수&합병": "5. 기업 인수&합병",
});

const LANE_DEFAULT_DETAIL = Object.freeze({
  "1. 민사": "사건명검토필요",
  "2. 형사": "죄명검토필요",
  "3. 행정": "행정사건명검토필요",
  "4. 기업 자문": "retainer",
});

const EXCLUDED_CLIENT_DISPLAY_NAMES = Object.freeze(new Set([
  "홀딩핸즈앤코 외 12명",
  "노윤현 외 19명",
]));

const EXCLUDED_MATTER_LANE_KEYS = Object.freeze(new Set([
  "베스트이노베이션|1. 민사",
  "형제유지|5. 기업 인수&합병",
  "NEPA|5. 기업 인수&합병",
]));

const GROUPED_PROJECT_OVERRIDES = Object.freeze({
  "홀딩핸즈앤코 외 12명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Covenant",
    source_ref:
      "5. 기업 인수&합병/99_Archives/01_Pjt. Covenant",
    confidence: "verified_contract_party_group",
  }),
  "한흥수 외 3명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Jade",
    source_ref:
      "5. 기업 인수&합병/99_Archives/07_Pjt. Jade",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "제이에스테크",
  }),
  "노윤현 외 19명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Max",
    source_ref:
      "5. 기업 인수&합병/99_Archives/13_Pjt. Max",
    confidence: "verified_contract_party_group",
  }),
  "최재헌 외 2명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Next",
    source_ref:
      "5. 기업 인수&합병/04_Pjt. Next",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "NX3게임즈",
  }),
  "이강명 외 1명|5. 기업 인수&합병": Object.freeze({
    detail: "Project S",
    source_ref:
      "5. 기업 인수&합병/99_Archives/01_Pjt. P",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "성일하이텍",
  }),
  "강상도|5. 기업 인수&합병": Object.freeze({
    detail: "Project Phoenix",
    source_ref:
      "5. 기업 인수&합병/99_Archives/Pjt. Phoenix",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "엠피닉스",
  }),
  "박민규 외 5명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Tempus",
    source_ref:
      "5. 기업 인수&합병/99_Archives/Pjt. Tempus",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "새빗켐",
  }),
  "권도균 외 11명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Washington",
    source_ref:
      "5. 기업 인수&합병/17_Pjt. Washington",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "워시스왓",
  }),
  "펜타스톤-오라이언-온앤업 신기술투자조합|5. 기업 인수&합병": Object.freeze({
    detail: "Project Wiz",
    source_ref:
      "5. 기업 인수&합병/99_Archives/02_Pjt. Wiz",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "위즈코어",
  }),
  "봉경환 외 4명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Fausta",
    source_ref:
      "5. 기업 인수&합병/02_Project Fausta",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "포이스",
  }),
  "박태오|5. 기업 인수&합병": Object.freeze({
    detail: "Project Puma",
    source_ref:
      "5. 기업 인수&합병/07_Project Puma",
    confidence: "verified_contract_party_group",
    matter_code_client_name: "팸텍",
  }),
  "K Enter Holdings Inc.|1. 민사": Object.freeze({
    detail: "Kingston dispute",
    source_ref:
      "1. 민사/Project Kingston_dispute",
    confidence: "verified_contract_party_group",
  }),
  "롯데에너지머티리얼즈|5. 기업 인수&합병": Object.freeze({
    detail: "Project Lion",
    source_ref:
      "5. 기업 인수&합병/09_Pjt. Lion",
    confidence: "verified_mou_party_group",
  }),
  "김정환|5. 기업 인수&합병": Object.freeze({
    detail: "Project Switch",
    source_ref:
      "5. 기업 인수&합병/12_Pjt. Switch",
    confidence: "verified_mou_party_group",
    matter_code_client_name: "성진종합전기",
  }),
  "오윤록 외 2명|5. 기업 인수&합병": Object.freeze({
    detail: "Project Titan",
    source_ref:
      "5. 기업 인수&합병/99_Archives/03_Pjt. Titan",
    confidence: "verified_mou_party_group",
    matter_code_client_name: "타이탄컴퍼니",
  }),
  "유진이엔티|5. 기업 인수&합병": Object.freeze({
    detail: "Project Horizon",
    source_ref:
      "5. 기업 인수&합병/Project Horizon",
    confidence: "verified_mou_party_group",
  }),
  "Peyto|5. 기업 인수&합병": Object.freeze({
    detail: "건물매각",
    source_ref:
      "5. 기업 인수&합병/18_Peyto",
    confidence: "owner_reviewed_deal_detail",
  }),
  "벨로크|5. 기업 인수&합병": Object.freeze({
    detail: "주식매각",
    source_ref:
      "5. 기업 인수&합병/01_벨로크",
    confidence: "owner_reviewed_deal_detail",
  }),
  "한양화스너|5. 기업 인수&합병": Object.freeze({
    detail: "인수자문",
    source_ref:
      "5. 기업 인수&합병/99_Archives/14_한양화스너",
    confidence: "owner_reviewed_deal_detail",
  }),
  "KWM|5. 기업 인수&합병": Object.freeze({
    detail: "MOU",
    source_ref:
      "5. 기업 인수&합병/07_KWM/우리투자증권_KWM_MOU_260322_AMIC clean.docx",
    confidence: "deal_document_detail",
  }),
  "SLL|5. 기업 인수&합병": Object.freeze({
    detail: "자산매각",
    source_ref:
      "5. 기업 인수&합병/08_SLL/자산매각 검토_w페트라_202606",
    confidence: "deal_folder_detail",
  }),
  "언코어|5. 기업 인수&합병": Object.freeze({
    detail: "인수자문",
    source_ref:
      "5. 기업 인수&합병/05_언코어/언코어/11_Due_Diligence",
    confidence: "deal_folder_detail",
  }),
  "헬스앤바이오|5. 기업 인수&합병": Object.freeze({
    detail: "주식매각",
    source_ref:
      "5. 기업 인수&합병/99_Archives/21_헬스앤바이오/[법무법인 아믹] 헬스앤바이오 주식 매각 법률자문 수임제안서.docx",
    confidence: "deal_document_detail",
  }),
});

const MERGED_CLIENT_LANE_MATTER_OVERRIDES = Object.freeze({
  "그래비티랩스|4. 기업 자문": Object.freeze([
    Object.freeze({
      detail: "유권해석",
      source_ref: "4. 기업 자문/5. 그래비티 유권해석",
      confidence: "owner_reviewed_advisory_detail",
      matter_axis: "Advisory",
      matter_litigation_axis: null,
    }),
  ]),
  "더드림병원|2. 형사": Object.freeze([
    Object.freeze({
      detail: "직권남용권리행사방해",
      source_ref: "2. 형사/인천 더드림병원/고소장.docx",
      confidence: "merged_criminal_complaint_detail",
      client_case_role: "고소인",
      client_case_role_confidence: "merged_criminal_complaint_detail",
    }),
  ]),
  "한흥수|1. 민사": Object.freeze([
    Object.freeze({
      detail: "골프연습장개발부지소유권이전및손실보상분쟁",
      source_ref: "1. 민사/한흥수/260515_내용증명(진만희).docx",
      confidence: "merged_pre_litigation_project_dispute",
      matter_axis: "Dispute",
      matter_litigation_axis: null,
      client_case_role: "의뢰인",
      client_case_role_confidence: "merged_pre_litigation_project_dispute",
    }),
  ]),
  "류현우|3. 행정": Object.freeze([
    Object.freeze({
      detail: "징계처분취소",
      source_ref: "3. 행정/류현우_변호사 징계/진정서",
      confidence: "folder_admin_case_title",
      client_case_role: "진정인",
      client_case_role_confidence: "folder_admin_case_title",
    }),
    Object.freeze({
      detail: "상이등급구분신체검사등급판정처분취소",
      source_ref: "3. 행정/류현우_행정심판/1_2025-19462_상이등급구분 신체검사 등급판정처분 취소청구",
      confidence: "folder_admin_case_title",
      client_case_role: "청구인",
      client_case_role_confidence: "folder_admin_case_title",
    }),
  ]),
  "대흥리츠|3. 행정": Object.freeze([
    Object.freeze({
      detail: "법인세부과처분취소",
      source_ref: "3. 행정/대흥리츠/01_사건기록/05_첨부/가상계좌_소송비용_대전26구합200083 법인세부과처분취소.pdf",
      confidence: "court_record_case_title",
      client_case_role: "원고",
      client_case_role_confidence: "court_record_case_title",
    }),
  ]),
  "황진수|3. 행정": Object.freeze([
    Object.freeze({
      detail: "양도소득세과세전적부심사",
      source_ref: "3. 행정/황진수 교수님(1세대 2주택)/00_사건요지·진행경과/자료분류_불복용(목차).md",
      confidence: "folder_admin_tax_review",
      client_case_role: "청구인",
      client_case_role_confidence: "folder_admin_tax_review",
    }),
  ]),
  "에이치유알|1. 민사": Object.freeze([
    Object.freeze({
      detail: "retainer",
      source_ref: "1. 민사/에이치유알",
      confidence: "folder_contract_advisory",
      matter_axis: "Advisory",
      matter_litigation_axis: null,
    }),
  ]),
  "이지훈|1. 민사": Object.freeze([
    Object.freeze({
      detail: "부동산권리관계검토",
      source_ref: "1. 민사/이지훈/부동산 등기사항전부증명서",
      confidence: "folder_pre_litigation_property_review",
      matter_axis: "Dispute",
      matter_litigation_axis: null,
      client_case_role: "의뢰인",
      client_case_role_confidence: "folder_pre_litigation_property_review",
    }),
  ]),
  "임지원|2. 형사": Object.freeze([
    Object.freeze({
      detail: "사기",
      source_ref: "2. 형사/임지원/260618 고소대리인위임장(임지원).pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "고소인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "김충규|2. 형사": Object.freeze([
    Object.freeze({
      detail: "직권남용권리행사방해",
      source_ref: "2. 형사/김충규/1. 사건기록/260618 수사결과통지서(김충규).pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "고소인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "비엔엠홀딩스|2. 형사": Object.freeze([
    Object.freeze({
      detail: "정보통신망법위반(명예훼손)",
      source_ref: "2. 형사/비엔엠홀딩스/01_사건기록/260601_고소장_강남경찰서_주식회사 비엔엠홀딩스.pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "고소인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "윤진어패럴|2. 형사": Object.freeze([
    Object.freeze({
      detail: "부정경쟁방지법위반(영업비밀누설)",
      source_ref: "2. 형사/윤진어패럴/01_사건기록/260519_불송치 결정 이의신청서_경기북부경찰청_윤진어패럴.pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "고소인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "박동순|2. 형사": Object.freeze([
    Object.freeze({
      detail: "강제추행",
      source_ref: "2. 형사/박동순/241017 송달된 공소장 (241010).pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "피고인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "지오소프트|2. 형사": Object.freeze([
    Object.freeze({
      detail: "조세범처벌법위반",
      source_ref: "2. 형사/주식회사 지오소프트/공소장.pdf",
      confidence: "scanned_criminal_cover_review",
      client_case_role: "피고인",
      client_case_role_confidence: "scanned_criminal_cover_review",
    }),
  ]),
  "B&M Holdings|5. 기업 인수&합병": Object.freeze([
    Object.freeze({
      detail: "TAKE Foundation",
      source_ref: "5. 기업 인수&합병/14_TAKE Foundation",
      confidence: "folder_project_name",
    }),
  ]),
  "바이포엠스튜디오|5. 기업 인수&합병": Object.freeze([
    Object.freeze({
      detail: "K-PLUS",
      source_ref: "5. 기업 인수&합병/15_K-PLUS",
      confidence: "folder_project_name",
    }),
  ]),
  "오윤록 외 2명|4. 기업 자문": Object.freeze([
    Object.freeze({
      detail: "retainer",
      source_ref: "4. 기업 자문/6. Titan",
      confidence: "rule_retainer",
    }),
  ]),
  "귀한사람들|1. 민사": Object.freeze([
    Object.freeze({
      detail: "retainer",
      source_ref: "1. 민사/고구려푸드 주식회사",
      confidence: "absorbed_client_contract_advisory",
      matter_axis: "Advisory",
      matter_litigation_axis: null,
    }),
  ]),
});

const ATU_MATTER_OVERRIDES = Object.freeze([
  Object.freeze({
    detail: "PEF설립",
    source_ref: "5. 기업 인수&합병/06_ATU/01_블라인드펀드; 5. 기업 인수&합병/06_ATU/02_프로젝트펀드",
    confidence: "verified_atu_pef_formation_merged",
    matter_axis: "Advisory",
    matter_litigation_axis: null,
  }),
  Object.freeze({
    detail: "PEF 동업기업과세특례 신청",
    source_ref: "5. 기업 인수&합병/06_ATU/03_동업기업과세특례 신청",
    confidence: "verified_atu_pef_tax_election",
    matter_axis: "Advisory",
    matter_litigation_axis: null,
  }),
  Object.freeze({
    detail: "Project Kubo",
    source_ref: "5. 기업 인수&합병/06_ATU/Pjt. Kubo",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "Project Day",
    source_ref: "5. 기업 인수&합병/06_ATU/Project Day.pdf",
    confidence: "verified_atu_individual_investment",
  }),
  Object.freeze({
    detail: "Project Wonder",
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
  ["주주총회결의효력정지가처분", "주주총회결의효력정지가처분"],
  ["자기주식취득금지가처분", "자기주식취득금지가처분"],
  ["상환금", "상환금청구"],
  ["건물등철거", "건물철거청구"],
  ["건물철거", "건물철거청구"],
  ["토지인도", "토지인도청구"],
  ["건물인도", "건물인도청구"],
  ["부동산인도", "부동산인도청구"],
  ["명도", "부동산인도청구"],
  ["소유권이전등기", "소유권이전등기청구"],
  ["회계장부열람등사", "회계장부열람등사청구"],
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
  ["법인세부과처분취소", "법인세부과처분취소"],
  ["상이등급구분 신체검사 등급판정처분 취소", "상이등급구분신체검사등급판정처분취소"],
  ["신체검사 결과 및 보훈보상대상자 비해당 결정처분 취소", "신체검사결과및보훈보상대상자비해당결정처분취소"],
  ["양도소득세", "양도소득세과세전적부심사"],
  ["행정심판", "행정심판"],
  ["처분취소", "처분취소"],
  ["유권해석", "유권해석"],
]);

const CIVIL_DETAIL_PATTERNS = Object.freeze([
  [/주주총회\s*결의\s*효력\s*정지.*가처분/u, "주주총회결의효력정지가처분"],
  [/자기\s*주식\s*취득\s*금지.*가처분/u, "자기주식취득금지가처분"],
  [/상환\s*금/u, "상환금청구"],
  [/건물\s*등?\s*철거/u, "건물철거청구"],
  [/토지\s*인도/u, "토지인도청구"],
  [/건물\s*인도/u, "건물인도청구"],
  [/부동산\s*인도|명도/u, "부동산인도청구"],
  [/소유권\s*이전\s*등기/u, "소유권이전등기청구"],
  [/회계\s*장부\s*열람\s*등사/u, "회계장부열람등사청구"],
  [/주주총회\s*결의\s*취소/u, "주주총회결의취소"],
  [/특허권\s*침해\s*금지/u, "특허권침해금지"],
  [/손해\s*배상(?:금)?|손배/u, "손해배상청구"],
  [/중개\s*보수/u, "중개보수청구"],
  [/대여(?:한)?\s*금전[\s\S]{0,80}(?:카드|결제대금)[\s\S]{0,80}반환\s*청구|(?:카드|결제대금)[\s\S]{0,80}대여(?:한)?\s*금전[\s\S]{0,80}반환\s*청구/u, "대여금등반환청구"],
  [/대여(?:한)?\s*금전[\s\S]{0,80}반환\s*청구/u, "대여금반환청구"],
  [/대여금/u, "대여금청구"],
  [/약정금/u, "약정금청구"],
  [/청구\s*이의/u, "청구이의의소"],
  [/부당\s*이득\s*금|부당\s*이득/u, "부당이득반환청구"],
  [/사해\s*행위/u, "사해행위취소"],
  [/압류\s*해제.*집행\s*취소|집행\s*취소.*압류\s*해제/u, "압류해제및집행취소신청"],
  [/채권\s*가압류/u, "채권가압류"],
  [/주식\s*가압류/u, "주식가압류"],
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

const DISPUTE_DETAIL_PATTERNS = Object.freeze([
  [/누수|침수|필터\s*교체/u, "누수사고손해배상"],
  [/임대차\s*계약\s*갱신|계약\s*갱신\s*요구|차임\s*통지|차임/u, "임대차계약갱신및차임분쟁"],
  [/저작권\s*침해/u, "저작권침해중단요구"],
  [/미정산\s*대금|미지급\s*대금|미회수\s*채권|대금\s*지급\s*최고/u, "미정산대금지급청구"],
  [/소유권\s*이전\s*등기|부동산\s*매매\s*계약/u, "소유권이전등기협조촉구"],
  [/무단\s*점유|점유.*철거|철거\s*요청/u, "무단점유철거요청"],
  [/손실\s*보상|손해\s*배상|협의\s*요청/u, "손실보상협의"],
  [/합의서\s*이행|합의\s*이행/u, "합의서이행촉구"],
  [/성과\s*도용|불법\s*행위\s*중단/u, "성과도용및불법행위중단요구"],
  [/임시\s*주주총회/u, "임시주주총회관련입장안내"],
  [/계약\s*해제/u, "계약해제통지"],
  [/금전\s*소비대차|연대\s*보증|대여금/u, "대여금상환분쟁"],
]);

const CRIMINAL_DETAIL_PATTERNS = Object.freeze([
  [/특정\s*경제\s*범죄.*사기|특경법.*사기/u, "특정경제범죄가중처벌법위반(사기)"],
  [/특정\s*경제\s*범죄.*배임|특경법.*배임/u, "특정경제범죄가중처벌법위반(배임)"],
  [/특정\s*경제\s*범죄.*횡령|특경법.*횡령/u, "특정경제범죄가중처벌법위반(횡령)"],
  [/정보\s*통신망.*명예\s*훼손/u, "정보통신망법위반(명예훼손)"],
  [/근로\s*기준\s*법\s*위반/u, "근로기준법위반"],
  [/뇌물\s*공여/u, "뇌물공여"],
  [/직권\s*남용.*권리\s*행사\s*방해/u, "직권남용권리행사방해"],
  [/부정\s*경쟁\s*방지.*영업\s*비밀|영업\s*비밀\s*누설/u, "부정경쟁방지법위반(영업비밀누설)"],
  [/강제\s*추행/u, "강제추행"],
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
  [/법인\s*세\s*부과\s*처분\s*취소/u, "법인세부과처분취소"],
  [/상이\s*등급\s*구분[\s\S]{0,40}신체\s*검사[\s\S]{0,40}등급\s*판정\s*처분\s*취소/u, "상이등급구분신체검사등급판정처분취소"],
  [/신체\s*검사\s*결과[\s\S]{0,40}보훈\s*보상\s*대상자\s*비해당\s*결정\s*처분\s*취소/u, "신체검사결과및보훈보상대상자비해당결정처분취소"],
  [/양도\s*소득\s*세[\s\S]{0,40}과세\s*전\s*적부\s*심|과세\s*전\s*적부\s*심[\s\S]{0,40}양도\s*소득\s*세/u, "양도소득세과세전적부심사"],
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
      if (normalized.includes("/node_modules") || entry.name === "node_modules") continue;
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

function disputeDetailForText(text) {
  const normalized = cleanSegment(text);
  for (const [pattern, detail] of DISPUTE_DETAIL_PATTERNS) {
    if (pattern.test(normalized)) return detail;
  }
  return null;
}

function isGenericNoticeDetail(detail) {
  return detail === "내용증명" || detail === "내용증명회신";
}

function specificDisputeDetailForText(text) {
  const detail = disputeDetailForText(text);
  return detail && !isGenericNoticeDetail(detail) ? detail : null;
}

function titleFromNoticeText(text) {
  const lines = String(text ?? "")
    .normalize("NFC")
    .split(/\r?\n/u)
    .map((line) => cleanSegment(line))
    .filter(Boolean);
  for (const line of lines.slice(0, 80)) {
    const match = line.match(/제\s*목\s*[:：]?\s*(.+)$/u);
    if (!match?.[1]) continue;
    const title = cleanCaseTitle(match[1])
      .replace(/^(내용\s*증명|통지서|회신)\s*/u, "")
      .replace(/(?:의\s*건|건)$/u, "")
      .trim();
    if (title && !/^(내용\s*증명|회신)$/u.test(title) && !/대리인\s*선임\s*통지/u.test(title)) return title;
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
  if (!title || isNonMatterEvidenceTitle(title) || /^(소송서류|소송문서|사건기록|소송기록|갑호증|을호증|첨부|참고자료)$/u.test(title)) return null;
  return title;
}

function titleFromDocumentText(text, lane) {
  const raw = String(text ?? "").normalize("NFC").slice(0, 8000);
  const lines = raw.split(/\r?\n/u).map((line) => cleanSegment(line)).filter(Boolean);
  for (const line of lines.slice(0, 80)) {
    const explicit = line.match(/(?:사\s*건\s*명|죄\s*명)\s*[:：]?\s*(.+)$/u);
    if (explicit?.[1]) {
      const title = cleanCaseTitle(explicit[1]);
      if (title && !isNonMatterEvidenceTitle(title)) return title;
    }
    const barViaCaseNumber = line.match(/\d{2,4}(?:가합|가단|가소|나|다|머|카합|카단|카기|차전|자|구합|구단|누|두|고합|고단|고정|노|도)\d+(?:\([^)]*\))?\s+(.+)$/u);
    if (barViaCaseNumber?.[1]) {
      const title = cleanCaseTitle(barViaCaseNumber[1]);
      if (title && !isNonMatterEvidenceTitle(title)) return title;
    }
  }
  const normalized = cleanSegment(raw);
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

function isLitigationPowerOfAttorneyPath(value) {
  const normalized = stripFileExtension(value);
  return /소송\s*위임장|변호인\s*선임서/u.test(normalized);
}

function isCourtRecordDecisionPath(value) {
  const normalized = stripFileExtension(value);
  return /화해\s*권고\s*결정|판결|결정|이의\s*신청/u.test(normalized);
}

function isCaseRecordSubmissionPath(value) {
  const normalized = stripFileExtension(value);
  return /준비\s*서면|답변서|문서\s*제출|변호인\s*의견서|의견서|불송치\s*결정\s*이의\s*신청서|이의\s*신청서|수사\s*결과\s*통지서/u.test(normalized);
}

function isPreLitigationNoticePath(value) {
  const normalized = stripFileExtension(value);
  return /내용\s*증명|통지서|최고서|경고장|회신|입장\s*안내/u.test(normalized);
}

function isCriminalMeritsDocumentPath(value) {
  const normalized = stripFileExtension(value);
  return /고소장|공소장|변호인\s*의견서|의견서|불송치\s*결정\s*이의\s*신청서|이의\s*신청서|수사\s*결과\s*통지서|피의자\s*신문\s*조서/u.test(normalized);
}

function clientCaseRoleForText(text, lane) {
  const normalized = cleanSegment(text);
  if (!normalized) return null;
  const criminal = lane === "2. 형사" || /고소장|공소장|피의자|피고인|변호인|불송치/u.test(normalized);
  if (criminal) {
    const sourceTypePatterns = [
      [/고소\s*대리인|고소장|불송치\s*결정\s*이의\s*신청서/u, "고소인"],
      [/공소\s*장/u, "피고인"],
    ];
    for (const [pattern, role] of sourceTypePatterns) {
      if (pattern.test(normalized)) return { role, confidence: "role_text" };
    }
    const roleMentions = [
      [/피고소\s*인/u, "피고소인"],
      [/피\s*의\s*자|피의자\s*신문\s*조서/u, "피의자"],
      [/피\s*고\s*인/u, "피고인"],
      [/고소\s*인/u, "고소인"],
      [/고발\s*인|고발장/u, "고발인"],
    ]
      .map(([pattern, role]) => ({ index: normalized.search(pattern), role }))
      .filter((match) => match.index >= 0)
      .sort((left, right) => left.index - right.index);
    if (roleMentions[0]) return { role: roleMentions[0].role, confidence: "role_text" };
    if (/변호인\s*의견서/u.test(normalized)) return { role: "피의자", confidence: "role_text" };
  }
  const civilPatterns = [
    [/원고\s*대리인|(^|[^가-힣])원고($|[^가-힣])/u, "원고"],
    [/피고\s*대리인|(^|[^가-힣])피고($|[^가-힣])/u, "피고"],
    [/채권자\s*대리인|(^|[^가-힣])채권자($|[^가-힣])/u, "채권자"],
    [/채무자\s*대리인|(^|[^가-힣])채무자($|[^가-힣])/u, "채무자"],
    [/신청인\s*대리인|(^|[^가-힣])신청인($|[^가-힣])/u, "신청인"],
    [/피신청인\s*대리인|피\s*신청인/u, "피신청인"],
    [/항소인\s*대리인|(^|[^가-힣])항소인($|[^가-힣])/u, "항소인"],
    [/피항소인\s*대리인|피\s*항소인/u, "피항소인"],
  ];
  for (const [pattern, role] of civilPatterns) {
    if (pattern.test(normalized)) return { role, confidence: "role_text" };
  }
  return null;
}

function attachClientCaseRole(result, { entry, lane, preview = "" } = {}) {
  if (!result) return null;
  const sourceText = entry?.path ? relativeSourcePath(entry.path) : "";
  const role = clientCaseRoleForText(`${sourceText} ${preview} ${result.detail}`, lane);
  if (!role) return result;
  return {
    ...result,
    client_case_role: role.role,
    client_case_role_confidence: role.confidence,
  };
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
  if (entry.kind === "file" && lane === "2. 형사" && isCriminalMeritsDocumentPath(baseName)) return 130;
  if (entry.kind === "file" && isLitigationPowerOfAttorneyPath(baseName)) return 96;
  if (entry.kind === "file" && isCaseRecordPath(sourcePath) && isCourtRecordDecisionPath(baseName)) return 110;
  if (entry.kind === "file" && isCaseRecordPath(sourcePath) && isCaseRecordSubmissionPath(baseName)) return 106;
  if (relDetail) {
    if (criminalOnlyCivilLane) return 60;
    return /사건기록|소송기록|소송서류|소송문서/u.test(rel) ? 100 : 70;
  }
  return 0;
}

function isEvidenceAttachmentPath(value) {
  return /(갑호증|을호증|서증|첨부|참고자료|관련 판결)/u.test(relativeSourcePath(value));
}

function isCaseRecordPath(value) {
  return /사건기록|소송기록|소송서류|소송문서/u.test(relativeSourcePath(value));
}

function isCivilLaneCriminalNoise(value) {
  const rel = relativeSourcePath(value);
  const hasCivilDetail = detailFromPatternGroup(CIVIL_DETAIL_PATTERNS, rel);
  const hasCriminalDetail = detailFromPatternGroup(CRIMINAL_DETAIL_PATTERNS, rel);
  return !hasCivilDetail && (Boolean(hasCriminalDetail) || /형사고소|고소장|공소장|수사|\d{2,4}고(?:정|단|합)|피의자|피고인/u.test(rel));
}

function suppressBroadDetails(results) {
  const details = new Set(results.map((result) => result.detail));
  return results.filter((result) => {
    if (result.detail === "가처분" && [...details].some((detail) => detail !== "가처분" && detail.endsWith("가처분"))) return false;
    if (result.detail === "가압류" && (details.has("채권가압류") || details.has("주식가압류"))) return false;
    if (result.detail === "배임" && [...details].some((detail) => detail !== "배임" && detail.endsWith("배임"))) return false;
    if (result.detail === "사기" && [...details].some((detail) => detail !== "사기" && detail.includes("사기"))) return false;
    if (result.detail === "횡령" && [...details].some((detail) => detail !== "횡령" && detail.includes("횡령"))) return false;
    return true;
  });
}

function isNonMatterEvidenceTitle(value) {
  const title = cleanSegment(value);
  if (!/[가-힣A-Za-z0-9]/u.test(title)) return true;
  return /^(비컴제출서류|제출서류|제공자료|회신자료|회사제공자료|증거정리|관련 판결|판결(?:[).”"'\s].*)?|소송관계정리표|자료)$/u.test(title);
}

function courtCaseNumberKey(value) {
  const normalized = cleanSegment(value);
  const match = normalized.match(/\d{2,4}(?:가합|가단|가소|나|다|머|카합|카단|카기|차전|자|구합|구단|누|두|고합|고단|고정|노|도)\d+/u);
  return match?.[0] ?? null;
}

function detailFromEvidenceEntry(entry, lane) {
  const sourcePath = entry.path.normalize("NFC");
  const baseName = path.basename(sourcePath);
  const rel = relativeSourcePath(sourcePath);
  const title = titleFromCaseNumberText(baseName);
  const candidateTexts = [title, baseName, rel].filter(Boolean);
  for (const text of candidateTexts) {
    const detail = detailPatternsForText(text, lane);
    if (detail) return attachClientCaseRole({ detail, confidence: title ? "court_record_case_title" : "legal_document_filename" }, { entry, lane });
  }
  if (entry.kind === "dir" && title && lane !== "2. 형사") {
    return attachClientCaseRole({ detail: cleanCaseTitle(title), confidence: "court_record_case_title" }, { entry, lane });
  }
  if (entry.kind === "file" && isPrimaryPleadingPath(baseName, lane)) {
    const preview = readDocumentPreview(entry.path);
    const documentTitle = titleFromDocumentText(preview, lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? documentTitle;
    if (detail) return attachClientCaseRole({ detail, confidence: "legal_document_text" }, { entry, lane, preview });
  }
  if (entry.kind === "file" && isLitigationPowerOfAttorneyPath(baseName)) {
    const preview = readDocumentPreview(entry.path);
    const documentTitle = titleFromDocumentText(preview, lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? documentTitle;
    if (detail) return attachClientCaseRole({ detail, confidence: "power_of_attorney_case_title" }, { entry, lane, preview });
  }
  if (entry.kind === "file" && isCaseRecordPath(sourcePath) && isCourtRecordDecisionPath(baseName)) {
    const preview = readDocumentPreview(entry.path);
    const documentTitle = titleFromDocumentText(preview, lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? detailPatternsForText(preview, lane) ?? documentTitle;
    if (detail) return attachClientCaseRole({ detail, confidence: "court_record_document_text" }, { entry, lane, preview });
  }
  if (entry.kind === "file" && isCaseRecordPath(sourcePath) && isCaseRecordSubmissionPath(baseName)) {
    const preview = readDocumentPreview(entry.path);
    const documentTitle = titleFromDocumentText(preview, lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? detailPatternsForText(preview, lane) ?? documentTitle;
    if (detail) return attachClientCaseRole({ detail, confidence: "court_record_document_text" }, { entry, lane, preview });
  }
  if (entry.kind === "file" && lane === "2. 형사" && isCriminalMeritsDocumentPath(baseName)) {
    const preview = readDocumentPreview(entry.path);
    const documentTitle = titleFromDocumentText(preview, lane);
    const detail = detailPatternsForText(documentTitle, lane) ?? detailPatternsForText(preview, lane) ?? documentTitle;
    if (detail) return attachClientCaseRole({ detail, confidence: "criminal_document_text" }, { entry, lane, preview });
  }
  return null;
}

function detailResultsFromSourceEvidence({ client, lane, sourceRows, sourceRoots }) {
  if (!LANE_TO_LITIGATION_AXIS[lane]) return [];
  const roots = sourceRoots ?? candidateSourceRoots({ client, lane, sourceRows });
  const hasSeparateCriminalLane = lane === "1. 민사" && client.source_lanes.includes("2. 형사");
  const candidates = roots
    .flatMap((rootPath) => evidenceEntries(rootPath))
    .map((entry) => ({ entry, score: evidenceScore(entry, lane) }))
    .filter((candidate) => candidate.score >= 95)
    .filter((candidate) => isLitigationPowerOfAttorneyPath(path.basename(candidate.entry.path)) || !isEvidenceAttachmentPath(candidate.entry.path))
    .filter((candidate) => lane !== "1. 민사" || !isCivilLaneCriminalNoise(candidate.entry.path))
    .filter((candidate) => {
      if (candidate.entry.kind === "dir") return true;
      if (isPrimaryPleadingPath(path.basename(candidate.entry.path), lane)) return true;
      if (isLitigationPowerOfAttorneyPath(path.basename(candidate.entry.path))) return true;
      if (isCaseRecordSubmissionPath(path.basename(candidate.entry.path))) return true;
      return isCaseRecordPath(candidate.entry.path);
    })
    .filter((candidate) => {
      if (!hasSeparateCriminalLane) return true;
      return !/형사고소|고소장|공소장|수사/u.test(relativeSourcePath(candidate.entry.path));
    })
    .sort((left, right) => right.score - left.score || relativeSourcePath(left.entry.path).length - relativeSourcePath(right.entry.path).length);
  const byDetail = new Map();
  const seenCaseNumbers = new Set();
  for (const candidate of candidates) {
    const result = detailFromEvidenceEntry(candidate.entry, lane);
    const detail = cleanSegment(result?.detail);
    if (!detail || byDetail.has(detail)) continue;
    if (isNonMatterEvidenceTitle(detail)) continue;
    if (result.confidence === "power_of_attorney_case_title" && byDetail.size > 0) continue;
    if (result.confidence === "legal_document_text" && detail.length > 24 && !detailPatternsForText(detail, lane)) continue;
    if (result.confidence === "power_of_attorney_case_title" && detail.length > 24 && !detailPatternsForText(detail, lane)) continue;
    const caseNumber = courtCaseNumberKey(candidate.entry.path);
    if (caseNumber && seenCaseNumbers.has(caseNumber)) continue;
    byDetail.set(detail, {
      detail,
      confidence: result.confidence,
      source_ref: relativeSourcePath(candidate.entry.path),
      client_case_role: result.client_case_role ?? null,
      client_case_role_confidence: result.client_case_role_confidence ?? null,
    });
    if (caseNumber) seenCaseNumbers.add(caseNumber);
    if (byDetail.size >= 12) break;
  }
  return suppressBroadDetails([...byDetail.values()]).sort((left, right) => left.source_ref.localeCompare(right.source_ref, "ko"));
}

function detailFromPreLitigationEntry(entry) {
  const sourcePath = entry.path.normalize("NFC");
  const baseName = path.basename(sourcePath);
  const rel = relativeSourcePath(sourcePath);
  const filenameDetail = specificDisputeDetailForText(baseName) ?? specificDisputeDetailForText(rel);
  if (filenameDetail) {
    return { detail: filenameDetail, confidence: "pre_litigation_notice_filename" };
  }
  const preview = entry.kind === "file" ? readDocumentPreview(entry.path) : "";
  const previewDetail = specificDisputeDetailForText(preview);
  if (previewDetail) return { detail: previewDetail, confidence: "pre_litigation_notice_text" };
  const subjectTitle = titleFromNoticeText(preview);
  const subjectDetail = specificDisputeDetailForText(subjectTitle) ?? cleanCaseTitle(subjectTitle);
  if (subjectDetail && !isGenericNoticeDetail(subjectDetail)) {
    return { detail: subjectDetail, confidence: "pre_litigation_notice_subject" };
  }
  return null;
}

function detailResultsFromDisputeEvidence({ client, lane, sourceRows, sourceRoots }) {
  if (lane !== "1. 민사") return [];
  const roots = sourceRoots ?? candidateSourceRoots({ client, lane, sourceRows });
  const candidates = roots
    .flatMap((rootPath) => evidenceEntries(rootPath))
    .filter((entry) => entry.kind === "file" && isPreLitigationNoticePath(entry.path))
    .sort((left, right) => relativeSourcePath(left.path).length - relativeSourcePath(right.path).length);
  const byDetail = new Map();
  for (const entry of candidates) {
    const result = detailFromPreLitigationEntry(entry);
    const detail = cleanSegment(result?.detail);
    if (!detail || byDetail.has(detail)) continue;
    byDetail.set(detail, {
      detail,
      confidence: result.confidence,
      source_ref: relativeSourcePath(entry.path),
      matter_axis: "Dispute",
      matter_litigation_axis: null,
    });
    if (byDetail.size >= 4) break;
  }
  return [...byDetail.values()].sort((left, right) => left.source_ref.localeCompare(right.source_ref, "ko"));
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
  const mergedOverride = MERGED_CLIENT_LANE_MATTER_OVERRIDES[`${client.display_name}|${lane}`];
  if (mergedOverride) return mergedOverride;
  if (client.display_name === "ATU Partners" && lane === "5. 기업 인수&합병") {
    return ATU_MATTER_OVERRIDES;
  }
  const sourceRoots = candidateSourceRoots({ client, lane, sourceRows });
  const evidenceResults = detailResultsFromSourceEvidence({ client, lane, sourceRows, sourceRoots });
  if (evidenceResults.length > 0) return evidenceResults;
  const disputeResults = detailResultsFromDisputeEvidence({ client, lane, sourceRows, sourceRoots });
  if (disputeResults.length > 0) return disputeResults;
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

function boundedMatterCode(clientName, axis, detail, litigationAxis = null) {
  const code = litigationAxis ? `${clientName}/${axis}/${litigationAxis}/${detail}` : `${clientName}/${axis}/${detail}`;
  if (code.length <= 120) return code;
  const prefixLength = clientName.length + axis.length + (litigationAxis ? litigationAxis.length + 3 : 2);
  const room = Math.max(12, 120 - prefixLength - 1 - 9);
  const boundedDetail = `${detail.slice(0, room).trim()}-${shortHash(code)}`;
  return litigationAxis ? `${clientName}/${axis}/${litigationAxis}/${boundedDetail}` : `${clientName}/${axis}/${boundedDetail}`;
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
const activeClientCandidates = AMIC_CURRENT_CLIENT_CANDIDATES.filter(
  (candidate) => !EXCLUDED_CLIENT_DISPLAY_NAMES.has(candidate.display_name),
);
const clients = activeClientCandidates.map((candidate, index) => ({
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
for (const [clientIndex, clientCandidate] of activeClientCandidates.entries()) {
  const client = clients[clientIndex];
  for (const lane of clientCandidate.source_lanes) {
    const axis = LANE_TO_AXIS[lane];
    if (!axis) continue;
    if (EXCLUDED_MATTER_LANE_KEYS.has(`${clientCandidate.display_name}|${lane}`)) continue;
    const litigationAxis = LANE_TO_LITIGATION_AXIS[lane] ?? null;
    const sourceRows = sourceRowsForClient({ client: clientCandidate, lane });
    for (const detailResult of detailResultsForLane({ client: clientCandidate, lane, sourceRows })) {
      const detail = cleanSegment(detailResult.detail);
      const matterAxis = detailResult.matter_axis ?? axis;
      const matterLitigationAxis = matterAxis === "LIT" ? (detailResult.matter_litigation_axis ?? litigationAxis) : null;
      const matterCodeClientName = cleanSegment(detailResult.matter_code_client_name ?? client.client_short_name);
      const matterCode = boundedMatterCode(matterCodeClientName, matterAxis, detail, matterLitigationAxis);
      const duplicateSuffix = seenCodes.has(matterCode) ? `-${shortHash(`${matterCode}:${lane}:${matters.length}`)}` : "";
      const finalMatterCode = duplicateSuffix ? boundedMatterCode(matterCodeClientName, matterAxis, `${detail}${duplicateSuffix}`, matterLitigationAxis) : matterCode;
      seenCodes.add(finalMatterCode);
      const sequence = String(matters.length + 1).padStart(3, "0");
      const sourceRefValue = sourceRef(sourceRows[0], detailResult.source_ref);
      const fallbackRole = detailResult.client_case_role
        ? {
            role: detailResult.client_case_role,
            confidence: detailResult.client_case_role_confidence ?? detailResult.confidence,
          }
        : clientCaseRoleForText(`${sourceRefValue} ${detail}`, lane);
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
        matter_axis: matterAxis,
        matter_litigation_axis: matterLitigationAxis,
        matter_type_english: matterAxis,
        matter_litigation_axis_english: matterLitigationAxis,
        matter_detail_type_korean: detail,
        source_lane: lane,
        source_ref: sourceRefValue,
        client_case_role: fallbackRole?.role ?? null,
        client_case_role_confidence: fallbackRole?.confidence ?? null,
        source_revision: SOURCE_REVISION,
        status: matterStatusForLane(lane),
        confidence: detailResult.confidence,
        review_required: detailResult.confidence === "lane_default_review" || /검토필요/u.test(detail),
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
  "matter_litigation_axis",
  "matter_detail_type_korean",
  "matter_code",
  "client_case_role",
  "client_case_role_confidence",
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
- Advisory: ${json.axis_counts.Advisory ?? 0}
- Dispute: ${json.axis_counts.Dispute ?? 0}
- DEAL: ${json.axis_counts.DEAL ?? 0}

| Client | Axis | LIT sub-axis | Detail | Matter code | Client role | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
${matters
  .map((row) => `| ${row.client_display_name} | ${row.matter_axis} | ${row.matter_litigation_axis ?? ""} | ${row.matter_detail_type_korean} | \`${row.matter_code}\` | ${row.client_case_role ?? ""} | ${row.confidence} |`)
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
