import {
  Archive,
  ListTodo,
  Menu,
  Search,
  TimerReset,
} from "lucide-react";
import { OutlookCompactShell } from "./outlook-compact-shell.jsx";

export const OUTLOOK_MATTER_RAIL = Object.freeze([
  Object.freeze({ featureId: "mail.save-with-attachments", label: "메일과 첨부 저장", Icon: Archive }),
  Object.freeze({ featureId: "matter.search", label: "Matter 찾기", Icon: Search }),
  Object.freeze({ featureId: "task.create", label: "업무 만들기", Icon: ListTodo }),
  Object.freeze({ featureId: "time-entry.draft", label: "시간기록 초안", Icon: TimerReset }),
  Object.freeze({ featureId: "all-functions", label: "전체 기능", Icon: Menu, view: "catalog" }),
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
    />
  );
}
