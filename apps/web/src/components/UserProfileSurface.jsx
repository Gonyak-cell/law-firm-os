import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { fetchUserProfile, saveUserProfile, uploadUserProfilePhoto, readDesktopMatterSessionStatus } from "../data/apiClient.js";
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
  if (profile?.person_role === "external") return profile;
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
    english_name: memberField(member, "english_name", memberField(member, "display_name", "")),
    mobile_phone: memberField(member, "mobile_phone", ""),
    contact_email: memberField(member, "contact_email", ""),
    bio: stringValue(professionalProfile.bio),
    experience: listToText(professionalProfile.experience),
    education: listToText(professionalProfile.education),
    qualifications: listToText(professionalProfile.qualifications),
    practice_areas: listToText(professionalProfile.practice_areas)
  };
}

function profilePatchFromDraft(draft) {
  return {
    english_name: draft.english_name.trim(),
    mobile_phone: draft.mobile_phone.trim(),
    contact_email: draft.contact_email.trim(),
    professional_profile: {
      bio: draft.bio.trim(),
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
          aria-label={title}
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
  const [isSaving, setIsSaving] = useState(false);
  const saveAttempt = useRef(null);
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
  const baseMember = useMemo(() => currentState === "populated"
    ? resolvedProfileMember(profile, desktopSession, fallbackDesktopSession)
    : null, [currentState, profile, desktopSession, fallbackDesktopSession]);
  const identityMember = baseMember ?? sessionMember;
  const employeeId = memberField(identityMember, "employee_id", memberField(identityMember, "user_id", "unknown"));
  const selectedMember = baseMember;
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
    memberField(selectedMember, "contact_email", ""),
    memberField(selectedMember, "country", "")
  ]);
  useEffect(() => {
    saveAttempt.current = null;
    setIsEditingProfile(false);
    setSaveState("");
  }, [employeeId]);

  useEffect(() => {
    if (!isEditingProfile) setProfileDraft(profileDraftFromMember(selectedMember));
  }, [isEditingProfile, selectedMember]);

  function updateProfileDraft(key, value) {
    if (isSaving) return;
    setProfileDraft((current) => ({ ...current, [key]: value }));
    setSaveState("");
  }

  async function handleProfileEditToggle() {
    if (isSaving) return;
    if (!isEditingProfile) {
      setProfileDraft(profileDraftFromMember(selectedMember));
      setIsEditingProfile(true);
      setSaveState("");
      return;
    }
    const patch = profilePatchFromDraft(profileDraft);
    const fingerprint = JSON.stringify(patch);
    if (saveAttempt.current?.fingerprint !== fingerprint) saveAttempt.current = { fingerprint, key: crypto.randomUUID() };
    setIsSaving(true);
    setSaveState("저장 중");
    const result = await saveUserProfile({ patch, idempotencyKey: saveAttempt.current.key });
    setIsSaving(false);
    if (result.kind !== "data") {
      setSaveState("저장을 확인하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    setProfileResult(result);
    setIsEditingProfile(false);
    saveAttempt.current = null;
    setSaveState("저장됨");
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png" || file.size > 5 * 1024 * 1024 || file.size < 33) {
      setSaveState("사진은 5MB 이하의 PNG 파일을 선택해 주세요.");
      return;
    }
    setIsSaving(true);
    const result = await uploadUserProfilePhoto({ file, idempotencyKey: crypto.randomUUID() });
    setIsSaving(false);
    if (result.kind === "data") { setProfileResult(result); setSaveState("사진 저장됨"); }
    else setSaveState("사진 저장을 확인하지 못했습니다. 다시 시도해 주세요.");
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
                <p data-profile-title="true">{memberField(selectedMember, "title", "")}</p>
                <p data-profile-department="true">{memberField(selectedMember, "department", "")}</p>
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
              {profileRows.map(([label, value]) => (
                <EditableFieldRow key={label} label={label} value={value} editing={false} />
              ))}
            </div>
          </article>}
          {(isEditingProfile || contactItems.length > 0) && <article className="matter-profile-card panel">
            <div className="matter-profile-card-title">
              <MapPin size={18} />
              <h2>연락처</h2>
            </div>
            {isEditingProfile ? (
              <div className="matter-profile-field-list">
                <EditableFieldRow label="로그인 이메일" value={selectedMember.work_email} editing={false} />
                <EditableFieldRow label="연락용 이메일" value={profileDraft.contact_email} editing type="email" onChange={(value) => updateProfileDraft("contact_email", value)} />
                <EditableFieldRow label="연락처" value={profileDraft.mobile_phone} editing type="tel" onChange={(value) => updateProfileDraft("mobile_phone", value)} />

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
                disabled={isSaving || selectedMember.profile_write_enabled !== true}
              >
                {isEditingProfile ? <Save size={15} /> : <Pencil size={15} />}
                {isEditingProfile ? "저장" : "수정"}
              </button>
            </div>
            {selectedMember.profile_write_enabled !== true && <p role="status">현재 환경에서는 프로필 수정이 제공되지 않습니다.</p>}
            {isEditingProfile && <div className="matter-profile-field-list matter-profile-editor-fields">
              <label className="matter-profile-field-row matter-profile-field-row-edit">
                <span>소개</span>
                <textarea aria-label="소개" value={profileDraft.bio} maxLength={4000} onChange={event => updateProfileDraft("bio", event.target.value)} />
              </label>
              <label className="matter-profile-field-row matter-profile-field-row-edit matter-profile-photo-field">
                <span>프로필 사진 (PNG, 최대 5MB)</span>
                <span className="secondary-button matter-profile-photo-picker" aria-disabled={isSaving || !selectedMember.person_id}>PNG 파일 선택</span>
                <input className="matter-profile-photo-input" aria-label="PNG 프로필 사진 선택" type="file" accept="image/png,.png" disabled={isSaving || !selectedMember.person_id} onChange={handlePhotoChange} />
              </label>
              {!selectedMember.person_id && <p>프로필을 먼저 저장한 후 사진을 추가할 수 있습니다.</p>}
            </div>}
            {!isEditingProfile && professionalProfile.bio && <p>{professionalProfile.bio}</p>}
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
                    aria-label="전문 분야"
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
