import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Users } from "lucide-react";

const PROFILE_DEFINITIONS = Object.freeze({
  civil_litigation: {
    label: "민사소송",
    sectionLabel: "사건 정보",
    fields: [
      ["jurisdiction_court", "관할법원"],
      ["case_number", "사건번호"],
      ["case_name", "사건명"],
      ["chamber_name", "재판부"],
      ["court_contact_stakeholder_id", "재판부 전화번호 (연락처 참조)"],
      ["court_clerk_stakeholder_id", "담당주무관 (연락처 참조)"],
    ],
  },
  criminal_litigation: {
    label: "형사소송",
    sectionLabel: "사건 정보",
    fields: [
      ["prosecution_sibling_number", "형제번호"],
      ["police_case_number", "경찰단계 사건번호"],
      ["police_station", "경찰서"],
      ["police_officer_stakeholder_id", "담당 경찰 (연락처 참조)"],
      ["prosecution_office", "검찰청"],
      ["prosecutor_stakeholder_id", "담당검사 (연락처 참조)"],
      ["criminal_case_number", "형사소송 사건번호"],
      ["case_contact_stakeholder_id", "담당자 전화번호 (연락처 참조)"],
    ],
  },
  administrative_litigation: {
    label: "행정소송",
    sectionLabel: "사건 정보",
    fields: [
      ["agency_name", "처분청·행정기관"],
      ["administrative_case_number", "행정사건번호"],
      ["case_name", "사건명"],
      ["disposition_name", "처분명"],
      ["jurisdiction_court", "관할법원"],
      ["agency_contact_stakeholder_id", "기관 담당자 (연락처 참조)"],
      ["court_clerk_stakeholder_id", "담당주무관 (연락처 참조)"],
    ],
  },
  deal: {
    label: "Deal",
    sectionLabel: "거래 정보",
    fields: [
      ["transaction_value", "거래규모"],
      ["stage", "진행단계"],
      ["counterparty_name", "상대방"],
      ["counterparty_law_firm", "상대방 자문펌"],
      ["sell_side_advisor", "매각자문"],
      ["buy_side_advisor", "인수자문"],
      ["accounting_firm", "회계법인"],
      ["direct_shareholder_contact", "주주 직접 연락"],
    ],
  },
  corporate_advisory: {
    label: "기업자문",
    sectionLabel: "자문 정보",
    fields: [
      ["advisory_topic", "자문 주제"],
      ["request_scope", "요청 범위"],
      ["engagement_mode", "수임 형태"],
      ["stage", "진행단계"],
      ["requester_stakeholder_id", "의뢰 담당자 (연락처 참조)"],
      ["due_date", "납기일"],
      ["delivery_reference", "산출물 참조"],
    ],
  },
  dispute: {
    label: "분쟁",
    sectionLabel: "분쟁 정보",
    fields: [
      ["dispute_type", "분쟁 유형"],
      ["dispute_summary", "분쟁 요약"],
      ["counterparty_name", "상대방"],
      ["counterparty_stakeholder_id", "상대방 담당자 (연락처 참조)"],
    ],
  },
});

const STAKEHOLDER_ROLE_LABELS = Object.freeze({
  court_clerk: "담당주무관",
  court_contact: "재판부 연락 담당",
  police_officer: "담당 경찰",
  prosecutor: "담당검사",
  agency_officer: "기관 담당자",
  counterparty_contact: "상대방 담당자",
  counterparty_lawyer: "상대방 변호사",
  sell_side_advisor_lawyer: "매각자문 변호사",
  buy_side_advisor_lawyer: "인수자문 변호사",
  accountant: "담당회계사",
  company_contact: "회사 담당직원",
  shareholder: "주주",
  client_contact: "Client 담당자",
  other: "기타",
});

const CONTACT_MODE_LABELS = Object.freeze({
  crm_contact: "CRM 연락처 참조",
  company_representative: "회사 대표 연락",
  shareholder_direct: "주주 직접 연락",
  no_contact: "연락처 미등록",
});

const STAKEHOLDER_FIELD_ROLES = Object.freeze({
  court_contact_stakeholder_id: ["court_contact"],
  court_clerk_stakeholder_id: ["court_clerk"],
  police_officer_stakeholder_id: ["police_officer"],
  prosecutor_stakeholder_id: ["prosecutor"],
  case_contact_stakeholder_id: ["police_officer", "prosecutor", "company_contact", "other"],
  agency_contact_stakeholder_id: ["agency_officer"],
  requester_stakeholder_id: ["client_contact", "company_contact"],
  counterparty_stakeholder_id: ["counterparty_contact", "counterparty_lawyer"],
});

const DEAL_STAGE_OPTIONS = Object.freeze(["origination", "marketing", "indicative_offer", "due_diligence", "negotiation", "signing", "closing", "post_closing", "on_hold", "terminated"]);
const ADVISORY_STAGE_OPTIONS = Object.freeze(["requested", "research", "drafting", "client_review", "delivered", "closed", "on_hold"]);

function cloneData(data) {
  return JSON.parse(JSON.stringify(data ?? {}));
}

function definitionFor(profile) {
  return PROFILE_DEFINITIONS[profile?.profile_kind] ?? PROFILE_DEFINITIONS.dispute;
}

function evidenceLabel(evidence) {
  if (evidence?.review_status === "verified") return "검증됨";
  if (evidence?.review_status === "review_required") return "검토 필요";
  return "근거 미등록";
}

function valueLabel({ field, value, stakeholders, reviewStatus }) {
  if (value === undefined || value === null || value === "") return reviewStatus === "review_required" ? "미입력 · 검토 필요" : "미입력";
  if (field.endsWith("_stakeholder_id")) {
    const stakeholder = stakeholders.find((item) => item.stakeholder_id === value);
    return stakeholder ? `${stakeholder.display_name} · 연락처 참조` : `연락처 참조 ${value}`;
  }
  if (field === "transaction_value") {
    if (typeof value?.amount !== "number") return "—";
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: value.currency ?? "KRW", maximumFractionDigits: 0 }).format(value.amount);
  }
  if (field === "direct_shareholder_contact") return value ? "예" : "아니오";
  return String(value);
}

function defaultStakeholder(profileKind) {
  return {
    display_name: "",
    organization_name: "",
    relationship_role: profileKind === "civil_litigation" ? "court_clerk" : profileKind === "criminal_litigation" ? "police_officer" : profileKind === "administrative_litigation" ? "agency_officer" : profileKind === "corporate_advisory" ? "client_contact" : "company_contact",
    contact_mode: "no_contact",
    contact_id: "",
  };
}

function FieldEditor({ field, label, value, profileKind, stakeholders, onChange }) {
  if (field.endsWith("_stakeholder_id")) {
    const eligibleStakeholders = stakeholders.filter((stakeholder) => STAKEHOLDER_FIELD_ROLES[field]?.includes(stakeholder.relationship_role));
    return (
      <label>
        <span>{label}</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">선택</option>
          {eligibleStakeholders.map((stakeholder) => (
            <option key={stakeholder.stakeholder_id} value={stakeholder.stakeholder_id}>
              {stakeholder.display_name} · {STAKEHOLDER_ROLE_LABELS[stakeholder.relationship_role] ?? stakeholder.relationship_role}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field === "transaction_value") {
    return (
      <label>
        <span>{label}</span>
        <div className="matter-profile-money-input">
          <input type="number" min="0" value={value?.amount ?? ""} onChange={(event) => onChange({ amount: Number(event.target.value || 0), currency: value?.currency ?? "KRW", basis: value?.basis ?? "equity_value" })} />
          <select value={value?.currency ?? "KRW"} onChange={(event) => onChange({ amount: Number(value?.amount ?? 0), currency: event.target.value, basis: value?.basis ?? "equity_value" })}>
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </label>
    );
  }
  if (field === "direct_shareholder_contact") {
    return (
      <label className="matter-profile-check">
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }
  if (field === "stage") {
    const options = profileKind === "deal" ? DEAL_STAGE_OPTIONS : ADVISORY_STAGE_OPTIONS;
    return (
      <label>
        <span>{label}</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">선택</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  if (field === "engagement_mode") {
    return (
      <label>
        <span>{label}</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">선택</option>
          <option value="retainer">retainer</option>
          <option value="ad_hoc">ad hoc</option>
          <option value="project">project</option>
        </select>
      </label>
    );
  }
  return (
    <label>
      <span>{label}</span>
      <input type={field === "due_date" ? "date" : "text"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function MatterProfilePanel({ profile, stakeholders = [], onSave, onRegisterStakeholder }) {
  const definition = definitionFor(profile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => cloneData(profile?.data));
  const [savePending, setSavePending] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [stakeholderFormOpen, setStakeholderFormOpen] = useState(false);
  const [stakeholderDraft, setStakeholderDraft] = useState(() => defaultStakeholder(profile?.profile_kind));
  const [stakeholderPending, setStakeholderPending] = useState(false);
  const [stakeholderResult, setStakeholderResult] = useState(null);
  const stakeholderRoles = useMemo(() => Object.entries(STAKEHOLDER_ROLE_LABELS), []);

  useEffect(() => {
    if (!editing) setDraft(cloneData(profile?.data));
  }, [editing, profile?.matter_id, profile?.profile_id, profile?.updated_at]);

  function changeField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavePending(true);
    const next = await onSave?.({
      data: draft,
      evidence: { source_ref: [profile?.evidence?.source_ref, "manual profile entry"].filter(Boolean).join("; "), confidence: "manual_verified", review_status: "review_required" },
    });
    const saved = next?.kind === "data" && next.statusOutcome === "updated";
    setSaveResult(saved ? next : { ...next, kind: "error" });
    setSavePending(false);
    if (saved) setEditing(false);
  }

  async function addStakeholder(event) {
    event.preventDefault();
    if (!stakeholderDraft.display_name.trim() || (stakeholderDraft.contact_mode === "crm_contact" && !stakeholderDraft.contact_id.trim())) return;
    setStakeholderPending(true);
    const next = await onRegisterStakeholder?.(stakeholderDraft);
    const created = next?.kind === "data" && next.statusOutcome === "created";
    setStakeholderResult(created ? next : { ...next, kind: "error" });
    setStakeholderPending(false);
    if (created) {
      setStakeholderDraft(defaultStakeholder(profile?.profile_kind));
      setStakeholderFormOpen(false);
    }
  }

  return (
    <section className="matter-profile-section" data-matter-profile-panel="true" data-matter-profile-kind={profile?.profile_kind ?? "dispute"}>
      <div className="matter-profile-heading">
        <div>
          <span className="eyebrow">{definition.sectionLabel}</span>
          <strong>{definition.label}</strong>
          <small>{evidenceLabel(profile?.evidence)}</small>
        </div>
        <button className="secondary-button" type="button" onClick={() => setEditing((current) => !current)}>
          <Pencil size={15} />
          {editing ? "취소" : "편집"}
        </button>
      </div>
      {editing ? (
        <form className="matter-profile-form" onSubmit={saveProfile}>
          {definition.fields.map(([field, label]) => (
            <FieldEditor key={field} field={field} label={label} value={draft[field]} profileKind={profile?.profile_kind} stakeholders={stakeholders} onChange={(value) => changeField(field, value)} />
          ))}
          <div className="matter-profile-actions">
            <span>{saveResult?.kind === "data" ? "저장됨" : saveResult?.kind === "error" ? "저장하지 못했습니다. 입력값을 확인하세요." : "연락처 원문은 저장하지 않습니다."}</span>
            <button className="secondary-button" type="submit" disabled={savePending}>
              <Save size={15} />
              {savePending ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="matter-profile-definition-list">
          {definition.fields.map(([field, label]) => (
            <React.Fragment key={field}>
              <dt>{label}</dt>
              <dd>{valueLabel({ field, value: profile?.data?.[field], stakeholders, reviewStatus: profile?.evidence?.review_status })}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      <div className="matter-stakeholder-heading">
        <div>
          <Users size={15} />
          <strong>관계자·자문사</strong>
        </div>
        <div className="matter-stakeholder-controls">
          <span>{stakeholders.length}명</span>
          <button className="secondary-button" type="button" onClick={() => setStakeholderFormOpen((current) => !current)}>
            <Plus size={15} />
            {stakeholderFormOpen ? "취소" : "관계자 추가"}
          </button>
        </div>
      </div>
      <div className="matter-stakeholder-list" data-matter-stakeholder-list="true">
        {stakeholders.length === 0 ? <span>등록된 관계자가 없습니다.</span> : stakeholders.map((stakeholder) => (
          <div key={stakeholder.stakeholder_id}>
            <strong>{stakeholder.display_name}</strong>
            <span>{STAKEHOLDER_ROLE_LABELS[stakeholder.relationship_role] ?? stakeholder.relationship_role}{stakeholder.organization_name ? ` · ${stakeholder.organization_name}` : ""}</span>
            <small>{CONTACT_MODE_LABELS[stakeholder.contact_mode] ?? "연락처 참조"}</small>
          </div>
        ))}
      </div>
      <p className="matter-stakeholder-contact-policy">연락처는 CRM 참조로만 연결합니다.</p>
      {profile?.evidence?.source_ref && (
        <details className="matter-profile-evidence">
          <summary>근거 보기</summary>
          <span>{profile.evidence.source_ref}</span>
        </details>
      )}
      {stakeholderFormOpen && <form className="matter-stakeholder-form" onSubmit={addStakeholder}>
        <label>
          <span>이름</span>
          <input value={stakeholderDraft.display_name} onChange={(event) => setStakeholderDraft((current) => ({ ...current, display_name: event.target.value }))} />
        </label>
        <label>
          <span>회사·기관</span>
          <input value={stakeholderDraft.organization_name} onChange={(event) => setStakeholderDraft((current) => ({ ...current, organization_name: event.target.value }))} />
        </label>
        <label>
          <span>역할</span>
          <select value={stakeholderDraft.relationship_role} onChange={(event) => setStakeholderDraft((current) => ({ ...current, relationship_role: event.target.value }))}>
            {stakeholderRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>연락 방식</span>
          <select value={stakeholderDraft.contact_mode} onChange={(event) => setStakeholderDraft((current) => ({ ...current, contact_mode: event.target.value, contact_id: event.target.value === "crm_contact" ? current.contact_id : "" }))}>
            {Object.entries(CONTACT_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {stakeholderDraft.contact_mode === "crm_contact" && (
          <label>
            <span>CRM 연락처 ID</span>
            <input value={stakeholderDraft.contact_id} onChange={(event) => setStakeholderDraft((current) => ({ ...current, contact_id: event.target.value }))} />
          </label>
        )}
        <div className="matter-profile-actions">
          <span>{stakeholderResult?.kind === "data" ? "관계자가 추가되었습니다." : stakeholderResult?.kind === "error" ? "관계자를 추가하지 못했습니다. 입력값을 확인하세요." : "전화번호·이메일은 여기서 입력하지 않습니다."}</span>
          <button className="secondary-button" type="submit" disabled={stakeholderPending}>
            <Plus size={15} />
            {stakeholderPending ? "추가 중" : "관계자 추가"}
          </button>
        </div>
      </form>}
    </section>
  );
}
