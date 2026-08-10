import { UserPlus } from "lucide-react";
import { OutlookCompactShell } from "./outlook-compact-shell.jsx";

export const OUTLOOK_INQUIRY_RAIL = Object.freeze([
  Object.freeze({ featureId: "inquiry.entry", label: "문의 기능", Icon: UserPlus, view: "catalog" }),
]);

const INQUIRY_PROFILE = "inquiry-only";

export function OutlookInquiryCompactShell({
  profile = INQUIRY_PROFILE,
  railItems: _railItems,
  ...props
}) {
  if (profile !== INQUIRY_PROFILE) return null;
  return (
    <OutlookCompactShell
      {...props}
      profile={INQUIRY_PROFILE}
      railItems={OUTLOOK_INQUIRY_RAIL}
    />
  );
}
