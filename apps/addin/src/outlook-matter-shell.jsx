import { OutlookCompactShell } from "./outlook-compact-shell.jsx";

export const OUTLOOK_MATTER_RAIL = Object.freeze([
  Object.freeze({ featureId: "mail.save-with-attachments", label: "저장 옵션" }),
  Object.freeze({ featureId: "matter.search", label: "저장 위치 선택" }),
  Object.freeze({ featureId: "task.create", label: "관련 작업 만들기" }),
  Object.freeze({ featureId: "time-entry.draft", label: "시간 기록 초안" }),
  Object.freeze({ featureId: "all-functions", label: "추가 작업", view: "catalog" }),
]);

export const OUTLOOK_VAULT_ATTACHMENT_RAIL_ITEM = Object.freeze({
  featureId: "vault.attach-exact-version",
  label: "Vault에서 첨부",
});

export function outlookMatterRailForContext({
  itemMode,
  vaultExactAttachmentEnabled = false,
} = {}) {
  return itemMode === "compose" && vaultExactAttachmentEnabled === true
    ? Object.freeze([OUTLOOK_VAULT_ATTACHMENT_RAIL_ITEM, ...OUTLOOK_MATTER_RAIL])
    : OUTLOOK_MATTER_RAIL;
}

const MATTER_PROFILE = "matter-full";

export function OutlookMatterCompactShell({
  profile = MATTER_PROFILE,
  itemMode,
  vaultExactAttachmentEnabled = false,
  ...props
}) {
  if (profile !== MATTER_PROFILE) return null;
  return (
    <OutlookCompactShell
      {...props}
      profile={MATTER_PROFILE}
      railItems={outlookMatterRailForContext({
        itemMode,
        vaultExactAttachmentEnabled,
      })}
      layout="filing"
    />
  );
}
