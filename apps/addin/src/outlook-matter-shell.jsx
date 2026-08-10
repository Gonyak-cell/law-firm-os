import { OutlookCompactShell } from "./outlook-compact-shell.jsx";

export const OUTLOOK_MATTER_RAIL = Object.freeze([
  Object.freeze({ featureId: "mail.save-with-attachments", label: "보관 옵션" }),
  Object.freeze({ featureId: "matter.search", label: "Matter 선택 또는 변경" }),
  Object.freeze({ featureId: "task.create", label: "업무 만들기" }),
  Object.freeze({ featureId: "time-entry.draft", label: "시간기록 초안" }),
  Object.freeze({ featureId: "all-functions", label: "전체 기능", view: "catalog" }),
]);

const MATTER_PROFILE = "matter-full";

export function OutlookMatterCompactShell({
  profile = MATTER_PROFILE,
  railItems: _railItems,
  ...props
}) {
  if (profile !== MATTER_PROFILE) return null;
  return (
    <OutlookCompactShell
      {...props}
      profile={MATTER_PROFILE}
      railItems={OUTLOOK_MATTER_RAIL}
      layout="filing"
    />
  );
}
