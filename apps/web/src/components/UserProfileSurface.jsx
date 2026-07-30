import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  IdCard,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck
} from "lucide-react";
import { fetchUserProfile, readDesktopMatterSessionStatus } from "../data/apiClient.js";
import profileHeroBuilding from "../assets/profile-hero-building.jpg";
import { memberPhotoFor } from "../people/memberPhotos.js";

function profileState(result) {
  if (result === null) return "loading";
  if (result.kind === "error") return "error";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review" || result.outcome === "review_required") return "review";
  if (result.kind === "guarded") return "error";
  if (result.kind === "empty" || result.item === null) return "empty";
  return "populated";
}

function profileStatusCopy(state) {
  if (state === "loading") return { title: "프로필을 불러오는 중입니다.", className: "live-data-loading" };
  if (state === "error") return { title: "프로필을 불러오지 못했습니다.", className: "live-data-error" };
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

function memberField(member, key, fallback = "") {
  return stringValue(member?.[key]) || fallback;
}

function dateLabel(value) {
  const text = stringValue(value);
  if (!text) return "";
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
  ].filter(([, value]) => Boolean(value));
}

const GENERIC_PROFILE_NAMES = new Set(["사용자", "세션 사용자"]);

function resolvedProfileMember(profile, desktopSession, fallbackDesktopSession) {
  const members = [profile, desktopSession, fallbackDesktopSession].filter(Boolean);
  if (members.length === 0) return null;
  const displayName = members
    .map((member) => memberField(member, "display_name"))
    .find((name) => name && !GENERIC_PROFILE_NAMES.has(name)) ?? "";
  return {
    ...fallbackDesktopSession,
    ...desktopSession,
    ...profile,
    display_name: displayName
  };
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
      profile_override_version: 2,
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
  if (!nextOverride.profile_override_version && !stringValue(member.start_date) && nextOverride.start_date === "2025-12-30") {
    nextOverride.start_date = "";
  }
  const baseProfessionalProfile = objectValue(member.professional_profile);
  const professionalProfileOverride = { ...objectValue(nextOverride.professional_profile) };
  if (nextOverride.profile_override_version === 1) {
    for (const key of ["experience", "education", "qualifications", "practice_areas"]) {
      if (stringList(baseProfessionalProfile[key]).length > 0
        && Array.isArray(professionalProfileOverride[key])
        && stringList(professionalProfileOverride[key]).length === 0) {
        delete professionalProfileOverride[key];
      }
    }
  }
  return {
    ...member,
    ...nextOverride,
    professional_profile: {
      ...baseProfessionalProfile,
      ...professionalProfileOverride
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
    english_name: memberField(member, "english_name", memberField(member, "display_name", "")),
    title: memberField(member, "title", ""),
    department: memberField(member, "department", ""),
    affiliation: memberField(member, "affiliation", ""),
    organization_group: memberField(member, "organization_group", ""),
    start_date: stringValue(member?.start_date),
    country: memberField(member, "country", ""),
    work_email: memberField(member, "work_email", ""),
    mobile_phone: memberField(member, "mobile_phone", ""),
    experience: listToText(professionalProfile.experience),
    education: listToText(professionalProfile.education),
    qualifications: listToText(professionalProfile.qualifications),
    practice_areas: listToText(professionalProfile.practice_areas)
  };
}

function profilePatchFromDraft(draft, member) {
  return {
    display_name: draft.display_name.trim() || memberField(member, "display_name", ""),
    english_name: draft.english_name.trim() || memberField(member, "english_name", ""),
    title: draft.title.trim(),
    department: draft.department.trim(),
    affiliation: draft.affiliation.trim(),
    organization_group: draft.organization_group.trim(),
    start_date: draft.start_date.trim(),
    country: draft.country.trim(),
    work_email: draft.work_email.trim(),
    mobile_phone: draft.mobile_phone.trim(),
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
      <strong>{value}</strong>
    </div>
  );
}

function ProfileList({ title, items, icon: Icon, editing = false, editValue = "", onEditChange = () => {} }) {
  if (!editing && items.length === 0) return null;
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
        <ul className="matter-profile-timeline">
          {items.map((item, index) => (
            <li key={`${title}-${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function UserProfileSurface({ liveCtx = "allow", desktopSession = null, onNavigate = () => {}, onReturnToWork }) {
  const [profileResult, setProfileResult] = useState(null);
  const [profileRequestVersion, setProfileRequestVersion] = useState(0);
  const [fallbackDesktopSession, setFallbackDesktopSession] = useState(null);
  const [profileOverride, setProfileOverride] = useState(null);
  const [profileDraft, setProfileDraft] = useState(profileDraftFromMember(null));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveState, setSaveState] = useState("");
  const currentState = profileState(profileResult);
  const statusCopy = profileStatusCopy(currentState);
  const profile = profileResult?.item ?? null;

  useEffect(() => {
    if (desktopSession) return undefined;
    let cancelled = false;
    readDesktopMatterSessionStatus().then((status) => {
      if (!cancelled) setFallbackDesktopSession(status);
    });
    return () => {
      cancelled = true;
    };
  }, [desktopSession]);

  useEffect(() => {
    let cancelled = false;
    setProfileResult(null);
    fetchUserProfile({ ctx: liveCtx }).then((result) => {
      if (!cancelled) setProfileResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, profileRequestVersion]);

  const sessionMember = resolvedProfileMember(null, desktopSession, fallbackDesktopSession);
  const baseMember = currentState === "populated"
    ? resolvedProfileMember(profile, desktopSession, fallbackDesktopSession)
    : null;
  const identityMember = baseMember ?? sessionMember;
  const employeeId = memberField(identityMember, "employee_id", memberField(identityMember, "user_id", "unknown"));
  const selectedMember = useMemo(() => mergeProfileOverride(baseMember, profileOverride), [baseMember, profileOverride]);
  const professionalProfile = objectValue(selectedMember?.professional_profile);
  const photo = memberPhotoFor(selectedMember);
  const portraitName = memberField(
    selectedMember,
    "english_name",
    memberField(selectedMember, "display_name", "프로필")
  );
  const initial = portraitName.slice(0, 1);
  const practiceAreas = stringList(professionalProfile.practice_areas);
  const careerItems = stringList(professionalProfile.experience);
  const educationItems = stringList(professionalProfile.education);
  const qualificationItems = stringList(professionalProfile.qualifications);
  const workPlaces = uniqueStrings([
    memberField(selectedMember, "affiliation", ""),
    memberField(selectedMember, "department", ""),
    memberField(selectedMember, "organization_group", "")
  ]);
  const profileRows = infoRows(selectedMember);
  const contactItems = uniqueStrings([
    memberField(selectedMember, "work_email", ""),
    memberField(selectedMember, "mobile_phone", ""),
    memberField(selectedMember, "country", "")
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
      data-profile-member={employeeId}
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
          {currentState === "error" && (
            <button
              type="button"
              className="secondary-button matter-profile-retry-button"
              onClick={() => setProfileRequestVersion((version) => version + 1)}
            >
              <RefreshCw size={15} />
              <span>다시 시도</span>
            </button>
          )}
        </div>
      )}

      {selectedMember && <div className="matter-profile-layout">
        <aside className="matter-profile-sidebar" aria-label="내 프로필 정보">
          <div className="matter-profile-identity" data-profile-portrait-panel="true">
            <div className="matter-profile-portrait-media" aria-hidden="true">
              {photo
                ? <img className="matter-profile-portrait-image" src={photo} alt="" />
                : <span className="matter-profile-portrait-fallback">{initial}</span>}
            </div>
            <div className="matter-profile-portrait-fade" aria-hidden="true" />
            {isEditingProfile ? (
              <div className="matter-profile-portrait-copy matter-profile-portrait-edit">
                <input
                  className="matter-profile-name-input"
                  value={profileDraft.english_name}
                  onChange={(event) => updateProfileDraft("english_name", event.target.value)}
                  aria-label="영문 이름"
                />
                <input
                  value={profileDraft.title}
                  onChange={(event) => updateProfileDraft("title", event.target.value)}
                  aria-label="직책"
                />
                <input
                  value={profileDraft.department}
                  onChange={(event) => updateProfileDraft("department", event.target.value)}
                  aria-label="담당 부서"
                />
              </div>
            ) : (
              <div className="matter-profile-portrait-copy">
                <h1 data-profile-english-name="true">{portraitName}</h1>
                <p data-profile-title="true">{memberField(selectedMember, "title", "")}</p>
                <p data-profile-department="true">{memberField(selectedMember, "department", "")}</p>
              </div>
            )}
          </div>

          {(isEditingProfile || profileRows.length > 0) && <article className="matter-profile-card panel">
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
                profileRows.map(([label, value]) => (
                  <EditableFieldRow key={label} label={label} value={value} editing={false} />
                ))
              )}
            </div>
          </article>}
          {(isEditingProfile || contactItems.length > 0) && <article className="matter-profile-card panel">
            <div className="matter-profile-card-title">
              <MapPin size={18} />
              <h2>연락처</h2>
            </div>
            {isEditingProfile ? (
              <div className="matter-profile-field-list">
                <EditableFieldRow label="이메일" value={profileDraft.work_email} editing type="email" onChange={(value) => updateProfileDraft("work_email", value)} />
                <EditableFieldRow label="연락처" value={profileDraft.mobile_phone} editing type="tel" onChange={(value) => updateProfileDraft("mobile_phone", value)} />
                <EditableFieldRow label="위치" value={profileDraft.country} editing onChange={(value) => updateProfileDraft("country", value)} />
              </div>
            ) : (
              <div className="matter-profile-contact-row matter-profile-contact-column">
                {contactItems.map((item) => <span key={item}>{item}</span>)}
              </div>
            )}
          </article>}
        </aside>

        <div className="matter-profile-main-stack">
          <section className="matter-profile-details-panel panel" aria-label="프로필 상세" data-profile-details-panel="true">
            <div className="matter-profile-main-actions">
              {saveState && <span className="matter-profile-save-state" role="status">{saveState}</span>}
              <button
                className="secondary-button matter-profile-edit-button"
                type="button"
                onClick={handleProfileEditToggle}
                disabled={isEditingProfile && !profileDraft.english_name.trim()}
              >
                {isEditingProfile ? <Save size={15} /> : <Pencil size={15} />}
                {isEditingProfile ? "Save" : "Edit"}
              </button>
            </div>
            <ProfileList title="경력" items={careerItems} icon={ClipboardList} editing={isEditingProfile} editValue={profileDraft.experience} onEditChange={(value) => updateProfileDraft("experience", value)} />
            <ProfileList title="학력" items={educationItems} icon={GraduationCap} editing={isEditingProfile} editValue={profileDraft.education} onEditChange={(value) => updateProfileDraft("education", value)} />
            <ProfileList title="자격" items={qualificationItems} icon={ShieldCheck} editing={isEditingProfile} editValue={profileDraft.qualifications} onEditChange={(value) => updateProfileDraft("qualifications", value)} />

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

            {workPlaces.length > 0 && <article className="matter-profile-card panel">
              <div className="matter-profile-card-title">
                <IdCard size={18} />
                <h2>소속</h2>
              </div>
              <div className="matter-profile-contact-row">
                {workPlaces.map((item) => <span key={item}>{item}</span>)}
              </div>
            </article>}
          </section>
        </div>
      </div>}
    </section>
  );
}
