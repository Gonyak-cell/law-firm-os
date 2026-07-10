import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  IdCard,
  MapPin,
  Pencil,
  ShieldCheck
} from "lucide-react";
import { fetchUserProfile, readDesktopMatterSessionStatus, readLawosApiSession, readLawosSessionEnvelope } from "../data/apiClient.js";
import profileHeroBuilding from "../assets/profile-hero-building.jpg";
import { localHrxRosterMemberForSession } from "../people/hrxLocalRoster.ts";
import { memberPhotoFor } from "../people/memberPhotos.js";

function profileState(result) {
  if (result === null) return "loading";
  if (result.kind === "error") return "error";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review" || result.outcome === "review_required") return "review";
  if (result.kind === "empty" || result.item === null) return "empty";
  return "populated";
}

function profileStatusCopy(state) {
  if (state === "loading") return { title: "프로필을 불러오는 중입니다.", className: "live-data-loading" };
  if (state === "error") return { title: "프로필 API 응답을 확인하지 못했습니다.", className: "live-data-error" };
  if (state === "denied") return { title: "현재 권한으로는 프로필 정보를 볼 수 없습니다.", className: "live-data-denied" };
  if (state === "review") return { title: "담당자 검토 후 프로필 정보를 표시할 수 있습니다.", className: "live-data-review" };
  if (state === "empty") return { title: "표시할 프로필 항목이 없습니다.", className: "live-data-empty" };
  return { title: "", className: "" };
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function stringList(value) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

function uniqueStrings(values) {
  return [...new Set(values.map(stringValue).filter(Boolean))];
}

function memberField(member, key, fallback = "미등록") {
  return stringValue(member?.[key]) || fallback;
}

function dateLabel(value) {
  const text = stringValue(value);
  if (!text) return "미등록";
  return text.replaceAll("-", ". ");
}

function infoRows(member) {
  return [
    ["직위", memberField(member, "title")],
    ["부서", memberField(member, "department")],
    ["소속", memberField(member, "affiliation")],
    ["조직", memberField(member, "organization_group")],
    ["입사일", dateLabel(member?.start_date)],
    ["위치", memberField(member, "country")]
  ];
}

const PROFILE_OVERRIDE_KEY_PREFIX = "lawos.profile.override.";

function profileOverrideKey(employeeId) {
  return `${PROFILE_OVERRIDE_KEY_PREFIX}${employeeId || "unknown"}`;
}

function readProfileOverride(employeeId) {
  try {
    const value = window.localStorage.getItem(profileOverrideKey(employeeId));
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeProfileOverride(employeeId, patch) {
  try {
    window.localStorage.setItem(profileOverrideKey(employeeId), JSON.stringify({
      ...patch,
      profile_override_version: 1,
      updated_at: new Date().toISOString()
    }));
    return true;
  } catch {
    return false;
  }
}

function mergeProfileOverride(member, override) {
  if (!member || !override) return member;
  const nextOverride = { ...override };
  if (nextOverride.profile_override_version !== 1 && !stringValue(member.start_date) && nextOverride.start_date === "2025-12-30") {
    nextOverride.start_date = "";
  }
  return {
    ...member,
    ...nextOverride,
    professional_profile: {
      ...objectValue(member.professional_profile),
      ...objectValue(nextOverride.professional_profile)
    }
  };
}

function listToText(values) {
  return stringList(values).join("\n");
}

function textToList(value) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileDraftFromMember(member) {
  const professionalProfile = objectValue(member?.professional_profile);
  return {
    display_name: memberField(member, "display_name", ""),
    title: memberField(member, "title", ""),
    department: memberField(member, "department", ""),
    affiliation: memberField(member, "affiliation", ""),
    organization_group: memberField(member, "organization_group", ""),
    start_date: stringValue(member?.start_date),
    country: memberField(member, "country", ""),
    work_email: memberField(member, "work_email", ""),
    experience: listToText(professionalProfile.experience),
    education: listToText(professionalProfile.education),
    qualifications: listToText(professionalProfile.qualifications),
    practice_areas: listToText(professionalProfile.practice_areas)
  };
}

function profilePatchFromDraft(draft, member) {
  return {
    display_name: draft.display_name.trim() || memberField(member, "display_name", ""),
    title: draft.title.trim(),
    department: draft.department.trim(),
    affiliation: draft.affiliation.trim(),
    organization_group: draft.organization_group.trim(),
    start_date: draft.start_date.trim(),
    country: draft.country.trim(),
    work_email: draft.work_email.trim(),
    professional_profile: {
      ...objectValue(member?.professional_profile),
      experience: textToList(draft.experience),
      education: textToList(draft.education),
      qualifications: textToList(draft.qualifications),
      practice_areas: textToList(draft.practice_areas)
    }
  };
}

function EditableFieldRow({ label, value, editing, onChange, type = "text" }) {
  if (editing) {
    return (
      <label className="matter-profile-field-row matter-profile-field-row-edit">
        <span>{label}</span>
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }
  return (
    <div className="matter-profile-field-row">
      <span>{label}</span>
      <strong>{value || "미등록"}</strong>
    </div>
  );
}

function ProfileList({ title, items, icon: Icon, emptyText = "미등록", editing = false, editValue = "", onEditChange = () => {} }) {
  const visibleItems = items.length > 0 ? items : [emptyText];
  return (
    <article className="matter-profile-card panel">
      <div className="matter-profile-card-title">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {editing ? (
        <textarea
          className="matter-profile-list-editor"
          value={editValue}
          onChange={(event) => onEditChange(event.target.value)}
          rows={Math.max(4, textToList(editValue).length + 1)}
        />
      ) : (
        <ul className={items.length > 0 ? "matter-profile-timeline" : "matter-profile-timeline is-empty"}>
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function UserProfileSurface({ liveCtx = "allow", onNavigate = () => {}, onReturnToWork }) {
  const [profileResult, setProfileResult] = useState(null);
  const [desktopSession, setDesktopSession] = useState(null);
  const [profileOverride, setProfileOverride] = useState(null);
  const [profileDraft, setProfileDraft] = useState(profileDraftFromMember(null));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveState, setSaveState] = useState("");
  const currentState = profileState(profileResult);
  const statusCopy = profileStatusCopy(currentState);
  const profile = profileResult?.item ?? null;
  const sessionMember = useMemo(() => {
    const apiSession = readLawosApiSession() ?? {};
    const sessionEnvelope = readLawosSessionEnvelope() ?? {};
    return localHrxRosterMemberForSession([
      profile,
      desktopSession,
      apiSession.session,
      apiSession.account,
      apiSession.user,
      apiSession.principal,
      apiSession,
      sessionEnvelope
    ]);
  }, [desktopSession, profile]);

  useEffect(() => {
    let cancelled = false;
    readDesktopMatterSessionStatus().then((status) => {
      if (!cancelled) setDesktopSession(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProfileResult(null);
    fetchUserProfile({ ctx: liveCtx }).then((result) => {
      if (!cancelled) setProfileResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx]);

  const baseMember = sessionMember;
  const employeeId = memberField(baseMember, "employee_id", "unknown");
  const selectedMember = useMemo(() => mergeProfileOverride(baseMember, profileOverride), [baseMember, profileOverride]);
  const professionalProfile = objectValue(selectedMember?.professional_profile);
  const photo = memberPhotoFor(selectedMember?.display_name);
  const initial = memberField(selectedMember, "display_name", "구성원").slice(0, 1);
  const practiceAreas = stringList(professionalProfile.practice_areas);
  const careerItems = stringList(professionalProfile.experience);
  const educationItems = stringList(professionalProfile.education);
  const qualificationItems = stringList(professionalProfile.qualifications);
  const workPlaces = uniqueStrings([
    memberField(selectedMember, "affiliation", ""),
    memberField(selectedMember, "department", ""),
    memberField(selectedMember, "organization_group", "")
  ]);

  useEffect(() => {
    const override = readProfileOverride(employeeId);
    setProfileOverride(override);
    setIsEditingProfile(false);
    setSaveState("");
  }, [employeeId]);

  useEffect(() => {
    if (!isEditingProfile) setProfileDraft(profileDraftFromMember(selectedMember));
  }, [isEditingProfile, selectedMember]);

  function updateProfileDraft(key, value) {
    setProfileDraft((current) => ({ ...current, [key]: value }));
    setSaveState("");
  }

  function handleProfileEditToggle() {
    if (!isEditingProfile) {
      setProfileDraft(profileDraftFromMember(selectedMember));
      setIsEditingProfile(true);
      setSaveState("");
      return;
    }
    const patch = profilePatchFromDraft(profileDraft, selectedMember);
    const saved = writeProfileOverride(employeeId, patch);
    setProfileOverride(patch);
    setIsEditingProfile(false);
    setSaveState(saved ? "저장됨" : "저장 실패");
  }

  function handleReturnToWork() {
    if (typeof onReturnToWork === "function") {
      onReturnToWork();
      return;
    }
    onNavigate("home", "home-dashboard");
  }

  return (
    <section
      className="matter-profile-surface surface"
      data-user-profile-surface="my-profile"
      data-profile-api-backed="true"
      data-profile-api-state={currentState}
      data-profile-data-state={currentState}
      data-profile-member={memberField(selectedMember, "employee_id", "unknown")}
      data-profile-editing={isEditingProfile ? "true" : "false"}
    >
      <header className="matter-profile-cover" aria-label="내 프로필">
        <img className="matter-profile-hero-image" src={profileHeroBuilding} alt="" />
        <div className="matter-profile-hero-shade" />
        <button
          type="button"
          className="matter-profile-return-button"
          onClick={handleReturnToWork}
          data-profile-return-to-work="true"
        >
          <ArrowLeft size={15} />
          <span>업무로 돌아가기</span>
        </button>
      </header>

      {statusCopy.title && (
        <div className={`live-data-state ${statusCopy.className}`} role="status" data-profile-api-notice="true">
          <strong>{statusCopy.title}</strong>
        </div>
      )}

      <div className="matter-profile-layout">
        <aside className="matter-profile-sidebar" aria-label="내 프로필 정보">
          <div className="matter-profile-identity">
            <div className="matter-profile-photo matter-profile-photo-large" aria-hidden="true">
              {photo ? <img src={photo} alt="" /> : <span>{initial}</span>}
            </div>
            {isEditingProfile ? (
              <input
                className="matter-profile-name-input"
                value={profileDraft.display_name}
                onChange={(event) => updateProfileDraft("display_name", event.target.value)}
                aria-label="이름"
              />
            ) : (
              <h1>{memberField(selectedMember, "display_name", "구성원")}</h1>
            )}
            <div className="matter-profile-role-line">
              {isEditingProfile ? (
                <div className="matter-profile-role-edit">
                  <input
                    value={profileDraft.title}
                    onChange={(event) => updateProfileDraft("title", event.target.value)}
                    aria-label="직위"
                  />
                  <input
                    value={profileDraft.affiliation}
                    onChange={(event) => updateProfileDraft("affiliation", event.target.value)}
                    aria-label="소속"
                  />
                </div>
              ) : (
                <p>{memberField(selectedMember, "title")} / {memberField(selectedMember, "affiliation")}</p>
              )}
              <button
                className="secondary-button matter-profile-edit-button"
                type="button"
                onClick={handleProfileEditToggle}
                disabled={isEditingProfile && !profileDraft.display_name.trim()}
              >
                <Pencil size={15} />
                {isEditingProfile ? "Save" : "Edit"}
              </button>
            </div>
            {saveState && <span className="matter-profile-save-state">{saveState}</span>}
          </div>

          <article className="matter-profile-card panel">
            <div className="matter-profile-card-title">
              <IdCard size={18} />
              <h2>기본 정보</h2>
            </div>
            <div className="matter-profile-field-list">
              {isEditingProfile ? (
                <>
                  <EditableFieldRow label="직위" value={profileDraft.title} editing onChange={(value) => updateProfileDraft("title", value)} />
                  <EditableFieldRow label="부서" value={profileDraft.department} editing onChange={(value) => updateProfileDraft("department", value)} />
                  <EditableFieldRow label="소속" value={profileDraft.affiliation} editing onChange={(value) => updateProfileDraft("affiliation", value)} />
                  <EditableFieldRow label="조직" value={profileDraft.organization_group} editing onChange={(value) => updateProfileDraft("organization_group", value)} />
                  <EditableFieldRow label="입사일" value={profileDraft.start_date} editing onChange={(value) => updateProfileDraft("start_date", value)} />
                  <EditableFieldRow label="위치" value={profileDraft.country} editing onChange={(value) => updateProfileDraft("country", value)} />
                </>
              ) : (
                infoRows(selectedMember).map(([label, value]) => (
                  <EditableFieldRow key={label} label={label} value={value} editing={false} />
                ))
              )}
            </div>
          </article>
          <article className="matter-profile-card panel">
            <div className="matter-profile-card-title">
              <MapPin size={18} />
              <h2>연락처</h2>
            </div>
            {isEditingProfile ? (
              <div className="matter-profile-field-list">
                <EditableFieldRow label="이메일" value={profileDraft.work_email} editing type="email" onChange={(value) => updateProfileDraft("work_email", value)} />
                <EditableFieldRow label="위치" value={profileDraft.country} editing onChange={(value) => updateProfileDraft("country", value)} />
              </div>
            ) : (
              <div className="matter-profile-contact-row matter-profile-contact-column">
                <span>{memberField(selectedMember, "work_email")}</span>
                <span>{memberField(selectedMember, "country")}</span>
              </div>
            )}
          </article>
        </aside>

        <div className="matter-profile-main-stack">
          <ProfileList title="경력" items={careerItems} icon={ClipboardList} emptyText="경력 미등록" editing={isEditingProfile} editValue={profileDraft.experience} onEditChange={(value) => updateProfileDraft("experience", value)} />
          <ProfileList title="학력" items={educationItems} icon={GraduationCap} emptyText="학력 미등록" editing={isEditingProfile} editValue={profileDraft.education} onEditChange={(value) => updateProfileDraft("education", value)} />
          <ProfileList title="자격" items={qualificationItems} icon={ShieldCheck} emptyText="자격 미등록" editing={isEditingProfile} editValue={profileDraft.qualifications} onEditChange={(value) => updateProfileDraft("qualifications", value)} />

          {(practiceAreas.length > 0 || isEditingProfile) && (
            <article className="matter-profile-card panel">
              <div className="matter-profile-card-title">
                <ShieldCheck size={18} />
                <h2>전문 분야</h2>
              </div>
              {isEditingProfile ? (
                <textarea
                  className="matter-profile-list-editor"
                  value={profileDraft.practice_areas}
                  onChange={(event) => updateProfileDraft("practice_areas", event.target.value)}
                  rows={Math.max(3, textToList(profileDraft.practice_areas).length + 1)}
                />
              ) : (
                <div className="matter-profile-practice-list">
                  {practiceAreas.map((item) => <span key={item}>{item}</span>)}
                </div>
              )}
            </article>
          )}

          <article className="matter-profile-card panel">
            <div className="matter-profile-card-title">
              <IdCard size={18} />
              <h2>소속</h2>
            </div>
            <div className="matter-profile-contact-row">
              {workPlaces.map((item) => <span key={item}>{item}</span>)}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
