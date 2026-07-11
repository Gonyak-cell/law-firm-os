export const MATTER_PRACTICE_AREA_SOURCE_FIELDS = Object.freeze([
  "matter_type_english",
  "matter_axis",
  "matter_profile_kind",
  "profile_kind",
]);

export const MATTER_PRACTICE_AREAS = Object.freeze([
  Object.freeze({ id: "litigation", code: "LIT", label: "송무", aliases: Object.freeze(["LIT", "Litigation", "송무"]) }),
  Object.freeze({ id: "corporate-advisory", code: "ADV", label: "기업 자문", aliases: Object.freeze(["ADV", "Advisory", "Corporate Advisory", "기업 자문"]) }),
  Object.freeze({ id: "dispute", code: "Dispute", label: "분쟁", aliases: Object.freeze(["Dispute", "분쟁"]) }),
  Object.freeze({ id: "transaction", code: "DEAL", label: "트랜잭션", aliases: Object.freeze(["DEAL", "Transaction", "트랜잭션"]) }),
]);

function normalizePracticeAreaValue(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ");
}

export function classifyMatterPracticeArea(matter) {
  for (const field of MATTER_PRACTICE_AREA_SOURCE_FIELDS) {
    const value = normalizePracticeAreaValue(matter?.[field]);
    if (!value) continue;
    const practiceArea = MATTER_PRACTICE_AREAS.find(({ aliases }) =>
      aliases.some((alias) => normalizePracticeAreaValue(alias) === value),
    );
    if (practiceArea) return practiceArea.id;
  }
  return "unclassified";
}
