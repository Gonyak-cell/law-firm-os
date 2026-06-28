#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  PEOPLE_FEATURE_GROUPS,
  PEOPLE_FEATURE_ITEMS,
  PEOPLE_FEATURE_STATES,
  getPeopleFeatureBySection
} from "../apps/web/src/people/peopleFeatureCatalog.js";

const expectedGroups = [
  "관리",
  "근무일정",
  "출퇴근기록",
  "휴가",
  "요청/전자결재",
  "리포트",
  "마감 및 급여",
  "메시지",
  "전자계약",
  "회사 설정"
];

const requiredTerms = [
  "구성원",
  "근무표",
  "외부일정",
  "현재 근무 상황 조회",
  "출근/퇴근 기록",
  "무일정 근무 출퇴근",
  "출퇴근기록 엑셀 업로드",
  "휴게시간 기록",
  "출퇴근 누락 알림",
  "출퇴근기록 확정",
  "출퇴근 인증 방식",
  "휴가관리",
  "휴가 그룹/유형",
  "휴가 자동 발생",
  "휴가 수동 발생",
  "휴가 사용 내역",
  "요청 관리",
  "승인 규칙",
  "커스텀 요청",
  "근무일정 요청",
  "근무기록 요청",
  "휴가 요청",
  "증명서 발급 요청",
  "비용 처리 요청",
  "실시간 리포트",
  "리포트 스냅샷",
  "마감 관리",
  "급여정산",
  "급여명세서",
  "메시지 전송",
  "메시지 자동화",
  "공지사항",
  "전자계약 전송",
  "전자계약 템플릿",
  "근로계약서",
  "연차휴가 사용 촉진 문서",
  "일반",
  "알림",
  "권한",
  "조직",
  "회사방침",
  "인사기록",
  "보안",
  "연동"
];

const externalTerms = ["법원", "검찰", "우체국", "세무서", "관청"];
const forbiddenPattern = /법률 People|관계망|충돌·윤리벽|활동 기록|권한 관리|인사 현황|관계자 관리|인물 목록|연결 관계|Client\/Matter 연결/;

const groupLabels = PEOPLE_FEATURE_GROUPS.map((group) => group.label);
assert.deepEqual(groupLabels, expectedGroups);
assert.equal(PEOPLE_FEATURE_ITEMS.length, 71);

const sectionIds = new Set();
for (const item of PEOPLE_FEATURE_ITEMS) {
  assert.equal(typeof item.label, "string", "feature label required");
  assert.equal(typeof item.section, "string", `${item.label}: section required`);
  assert.equal(sectionIds.has(item.section), false, `duplicate section: ${item.section}`);
  sectionIds.add(item.section);
  assert.ok(PEOPLE_FEATURE_STATES[item.state], `${item.label}: unknown state ${item.state}`);
  assert.ok(Array.isArray(item.capabilities) && item.capabilities.length > 0, `${item.label}: capabilities required`);
  if (item.state !== "active") assert.ok(item.badge, `${item.label}: gated feature needs a badge`);
}

const catalogText = JSON.stringify(PEOPLE_FEATURE_GROUPS);
for (const term of requiredTerms) {
  assert.ok(catalogText.includes(term), `catalog missing term: ${term}`);
}
for (const term of externalTerms) {
  assert.ok(catalogText.includes(term), `external schedule missing term: ${term}`);
}
assert.equal(forbiddenPattern.test(catalogText), false, "catalog reintroduced removed People terminology");

const workSchedule = PEOPLE_FEATURE_GROUPS.find((group) => group.label === "근무일정");
assert.ok(workSchedule, "work schedule group missing");
assert.ok(workSchedule.children.some((item) => item.section === "people-work-schedule-external" && item.label === "외부일정"));
for (const group of PEOPLE_FEATURE_GROUPS.filter((item) => item.label !== "근무일정")) {
  assert.equal(group.children.some((item) => item.section === "people-work-schedule-external"), false, "external schedule must only live under 근무일정");
}

assert.equal(getPeopleFeatureBySection("people-work-schedule-external")?.groupLabel, "근무일정");
assert.equal(getPeopleFeatureBySection("people-company-organization")?.label, "조직");
assert.equal(catalogText.includes("조직/지점"), false, "branchless law firm menu must not expose 조직/지점 as a primary label");
assert.ok(catalogText.includes("지점 비활성"), "branchless law firm setting must preserve disabled-branch classification");

console.log(JSON.stringify({
  verdict: "PASS",
  groups: PEOPLE_FEATURE_GROUPS.length,
  feature_items: PEOPLE_FEATURE_ITEMS.length,
  active_items: PEOPLE_FEATURE_ITEMS.filter((item) => item.state === "active").length,
  setup_required_items: PEOPLE_FEATURE_ITEMS.filter((item) => item.state === "setup_required").length,
  integration_required_items: PEOPLE_FEATURE_ITEMS.filter((item) => item.state === "integration_required").length,
  audit_required_items: PEOPLE_FEATURE_ITEMS.filter((item) => item.state === "audit_required").length,
  external_schedule_group: getPeopleFeatureBySection("people-work-schedule-external")?.groupLabel
}, null, 2));
