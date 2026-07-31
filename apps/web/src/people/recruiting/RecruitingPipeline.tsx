/// <reference path="../../react-jsx.d.ts" />
import React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarPlus, CheckCircle2, FileCheck2, GitBranch, UserPlus } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  convertHrxApplicationToEmployee,
  createHrxEmploymentProfile,
  createHrxRecruitingPipeline,
  fetchHrxEmployees,
  fetchRecruitingPipeline,
  updateHrxApplicationStage,
  updateHrxOfferStage
} from "../hrxApiClient.ts";
import { safeEmployeeLabel, safePeopleLabel } from "../peoplePresentation.ts";
import { EmployeeEditorDrawer } from "../employees/EmployeeEditorDrawer.tsx";

type RecruitingRecord = Record<string, unknown>;
type RecruitingData = {
  kind: "data";
  employees: RecruitingRecord[];
  roster_available: boolean;
  pipeline_creation_state: string;
  job_openings: RecruitingRecord[];
  candidates: RecruitingRecord[];
  applications: RecruitingRecord[];
  interviews: RecruitingRecord[];
  offers: RecruitingRecord[];
};
type RecruitingResult = RecruitingData | { kind: "error" };
type FormState = Record<string, string>;
type FormInputEvent = { currentTarget: { name: string; value: string } };
type FormSubmitEvent = { preventDefault: () => void };
type RegistrationMode = "direct" | "planned" | "candidate";

const NEXT_STAGE = {
  submitted: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired"
};

function currentDateValue() {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function newRecruitingPipelineAttemptKey() {
  return `recruiting-pipeline:${crypto.randomUUID()}`;
}

const DEFAULT_FORM: FormState = {
  job_title: "",
  department_ref: "",
  position_count: "",
  hiring_manager_employee_id: "",
  candidate_name: "",
  candidate_email: "",
  interview_date: "",
  interview_time: "",
  interviewer_employee_id: "",
  consent_expires_at: "",
  retention_expires_at: "",
  effective_from: ""
};

function recordString(record: RecruitingRecord | undefined, field: string, fallback = "") {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recordNumber(record: RecruitingRecord | undefined, field: string, fallback = 0) {
  const value = record?.[field];
  return typeof value === "number" ? value : fallback;
}

function byField(rows: RecruitingRecord[], field: string) {
  const next = new Map<string, RecruitingRecord>();
  for (const row of rows) {
    const value = recordString(row, field);
    if (value) next.set(value, row);
  }
  return next;
}

function stageLabel(value: unknown) {
  if (value === "submitted") return "접수";
  if (value === "screening") return "검토";
  if (value === "interview") return "면접";
  if (value === "offer") return "합격자";
  if (value === "hired") return "구성원 등록";
  if (value === "accepted") return "수락";
  if (value === "open") return "진행 중";
  if (value === "sent") return "발송";
  if (value === "scheduled") return "예정";
  if (value === "completed") return "완료";
  return "확인 필요";
}

function dateTimeLabel(value: string) {
  if (!value) return "일정 확인";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "일정 확인";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function referenceLabel(value: string) {
  return value ? "연계 정보 있음" : "연계 정보 확인 필요";
}

function nextStageActionLabel(stage: string | undefined) {
  if (stage === "hired") return "합격 전환";
  return "다음 단계";
}

function privacyStateLabel(value: unknown) {
  if (value === "active") return "동의 유효";
  if (value === "retention_hold") return "보관 유지";
  if (value === "retention_expired") return "보관 종료 처리 필요";
  if (value === "deletion_requested") return "삭제 요청 처리 필요";
  if (value === "consent_expired") return "동의 만료";
  if (value === "consent_revoked") return "동의 철회";
  if (value === "consent_missing") return "동의 확인 필요";
  if (value === "access_denied") return "접근 권한 없음";
  return "상태 확인 필요";
}

function conversionOutcomeLabel(value: unknown) {
  if (value === "created") return "등록 완료";
  if (value === "reused") return "기존 결과 확인";
  if (value === "not_requested") return "연결 안 함";
  return "결과 확인 필요";
}

function recruitingFormReady(form: FormState) {
  const requiredFields = [
    "job_title",
    "department_ref",
    "position_count",
    "hiring_manager_employee_id",
    "candidate_name",
    "candidate_email",
    "interview_date",
    "interview_time",
    "interviewer_employee_id",
    "consent_expires_at",
    "retention_expires_at"
  ];
  const count = Number(form.position_count);
  return (
    requiredFields.every((field) => form[field]?.trim()) &&
    Number.isInteger(count) &&
    count > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.candidate_email)
  );
}

function employeeRosterOptionLabel(employee: RecruitingRecord) {
  return safeEmployeeLabel(employee, "");
}

function candidateDisplayName(candidate: RecruitingRecord | undefined) {
  return safePeopleLabel(recordString(candidate, "legal_name"), {
    identifiers: [
      candidate?.candidate_id,
      candidate?.user_id,
      candidate?.employee_id,
    ],
    fallback: "지원자 이름 확인 필요",
  });
}

export function RecruitingPipeline() {
  const [result, setResult] = useState<RecruitingResult | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [pendingAction, setPendingAction] = useState("");
  const [statusText, setStatusText] = useState("");
  const [conversionReceipt, setConversionReceipt] = useState<RecruitingRecord | null>(null);
  const pipelineAttemptKey = useRef("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("direct");
  const [employeeEditorMode, setEmployeeEditorMode] = useState<"direct" | "planned" | null>(null);
  const [plannedProfile, setPlannedProfile] = useState({
    effective_from: currentDateValue(),
    title: "",
    employment_type: "full_time"
  });

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    Promise.all([fetchRecruitingPipeline(), fetchHrxEmployees()]).then(([next, roster]) => {
      if (cancelled) return;
      if (next.kind !== "data") {
        setResult({ kind: "error" });
        return;
      }
      const capabilities = next.capabilities && typeof next.capabilities === "object"
        ? next.capabilities as RecruitingRecord
        : {};
      const capability = capabilities.pipeline_creation;
      const pipelineCreationState = capability && typeof capability === "object"
        ? recordString(capability as RecruitingRecord, "state", "integration_required")
        : "integration_required";
      setResult({
        kind: "data",
        employees: roster.kind === "data"
          ? roster.employees.filter((employee: RecruitingRecord) => (
              recordString(employee, "status") === "active" && employeeRosterOptionLabel(employee)
            ))
          : [],
        roster_available: roster.kind === "data",
        pipeline_creation_state: pipelineCreationState,
        job_openings: Array.isArray(next.job_openings) ? next.job_openings : [],
        candidates: Array.isArray(next.candidates) ? next.candidates : [],
        applications: Array.isArray(next.applications) ? next.applications : [],
        interviews: Array.isArray(next.interviews) ? next.interviews : [],
        offers: Array.isArray(next.offers) ? next.offers : []
      });
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function updateForm(event: FormInputEvent) {
    const { name, value } = event.currentTarget;
    pipelineAttemptKey.current = "";
    setForm((current: FormState) => ({ ...current, [name]: value }));
  }

  async function createPipeline(event: FormSubmitEvent) {
    event.preventDefault();
    if (
      result?.kind !== "data" ||
      result.pipeline_creation_state !== "ready" ||
      !result.roster_available ||
      !recruitingFormReady(form)
    ) return;
    setPendingAction("create");
    setStatusText("");
    const idempotencyKey = pipelineAttemptKey.current || newRecruitingPipelineAttemptKey();
    pipelineAttemptKey.current = idempotencyKey;
    const created = await createHrxRecruitingPipeline(form, idempotencyKey);
    if (created.kind === "data" && created.ids) {
      pipelineAttemptKey.current = "";
      setStatusText("채용 절차를 시작했습니다");
      setRefreshKey((key: number) => key + 1);
    } else if (created.reason === "HRX_RECRUITING_SOURCE_AUTHORITY_REQUIRED") {
      setStatusText("채용 자료 연계 상태가 변경되었습니다. 연계 상태를 다시 확인해 주세요.");
      setRefreshKey((key: number) => key + 1);
    } else {
      setStatusText("채용 절차를 시작하지 못했습니다");
    }
    setPendingAction("");
  }

  async function advance(application: RecruitingRecord) {
    const stage = NEXT_STAGE[recordString(application, "stage") as keyof typeof NEXT_STAGE];
    if (!stage) return;
    setPendingAction(recordString(application, "application_id"));
    const updated = await updateHrxApplicationStage(recordString(application, "application_id"), stage);
    if (updated.kind === "data") setRefreshKey((key: number) => key + 1);
    else setResult({ kind: "error" });
    setPendingAction("");
  }

  async function acceptOffer(offer: RecruitingRecord) {
    const offerId = recordString(offer, "offer_id");
    setPendingAction(offerId);
    const updated = await updateHrxOfferStage(offerId, "accepted");
    if (updated.kind === "data") {
      setStatusText("합격자 수락 완료");
      setRefreshKey((key: number) => key + 1);
    } else {
      setStatusText("합격자 수락 실패");
    }
    setPendingAction("");
  }

  async function convert(application: RecruitingRecord) {
    const applicationId = recordString(application, "application_id");
    setPendingAction(`convert:${applicationId}`);
    const converted = await convertHrxApplicationToEmployee(applicationId, form);
    if (converted.kind === "data") {
      setConversionReceipt(
        converted.receipt && typeof converted.receipt === "object"
          ? converted.receipt as RecruitingRecord
          : null
      );
      setStatusText("구성원 등록 완료");
      setRefreshKey((key: number) => key + 1);
    } else {
      setStatusText("구성원 등록 실패");
    }
    setPendingAction("");
  }

  async function completeDirectRegistration(employee: RecruitingRecord) {
    const employeeId = recordString(employee, "employee_id");
    if (employeeEditorMode === "planned") {
      const history = await createHrxEmploymentProfile(employeeId, {
        effective_from: plannedProfile.effective_from,
        title: plannedProfile.title.trim() || null,
        employment_type: plannedProfile.employment_type,
        status: "future"
      });
      if (history.kind !== "data") {
        setStatusText("구성원은 등록됐지만 입사 예정 정보를 저장하지 못했습니다. 구성원 상세에서 이어서 등록해 주세요.");
        setEmployeeEditorMode(null);
        return true;
      }
    }
    const readback = await fetchHrxEmployees();
    if (readback.kind !== "data" || !readback.employees.some(
      (candidate: RecruitingRecord) => recordString(candidate, "employee_id") === employeeId
    )) {
      return false;
    }
    setStatusText(employeeEditorMode === "planned" ? "입사 예정 구성원 등록 완료" : "구성원 등록 완료");
    setEmployeeEditorMode(null);
    return true;
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 등록 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 등록 정보를 불러오지 못했습니다.</div>;
  } else {
    const candidateById = byField(result.candidates, "candidate_id");
    const jobById = byField(result.job_openings, "job_opening_id");
    const pipelineCreationReady = result.pipeline_creation_state === "ready";
    const formReady = recruitingFormReady(form);
    const interviewByApplication = new Map(result.interviews.map((interview: RecruitingRecord) => [recordString(interview, "application_id"), interview]));
    const offerByApplication = new Map(result.offers.map((offer: RecruitingRecord) => [recordString(offer, "application_id"), offer]));
    body = (
      <>
        <form className="recruiting-create-form" onSubmit={createPipeline}>
          <div className="recruiting-field-grid">
            <label>
              <span>공고명</span>
              <input name="job_title" value={form.job_title} onChange={updateForm} placeholder="예: 송무팀 어소시에이트" required />
            </label>
            <label>
              <span>담당 부서</span>
              <input name="department_ref" value={form.department_ref} onChange={updateForm} placeholder="예: 송무팀" required />
            </label>
            <label>
              <span>모집 인원</span>
              <input name="position_count" type="number" min="1" step="1" value={form.position_count} onChange={updateForm} placeholder="1" required />
            </label>
            <label>
              <span>채용 책임자</span>
              <select name="hiring_manager_employee_id" value={form.hiring_manager_employee_id} onChange={updateForm} required>
                <option value="">구성원 선택</option>
                {result.employees.map((employee) => {
                  const employeeId = recordString(employee, "employee_id");
                  return <option key={employeeId} value={employeeId}>{employeeRosterOptionLabel(employee)}</option>;
                })}
              </select>
            </label>
            <label>
              <span>지원자명</span>
              <input name="candidate_name" value={form.candidate_name} onChange={updateForm} placeholder="지원자 실명" required />
            </label>
            <label>
              <span>이메일</span>
              <input name="candidate_email" type="email" value={form.candidate_email} onChange={updateForm} placeholder="name@example.com" required />
            </label>
            <label>
              <span>면접일</span>
              <input name="interview_date" type="date" value={form.interview_date} onChange={updateForm} required />
            </label>
            <label>
              <span>면접시간</span>
              <input name="interview_time" type="time" value={form.interview_time} onChange={updateForm} required />
            </label>
            <label>
              <span>면접 담당자</span>
              <select name="interviewer_employee_id" value={form.interviewer_employee_id} onChange={updateForm} required>
                <option value="">구성원 선택</option>
                {result.employees.map((employee) => {
                  const employeeId = recordString(employee, "employee_id");
                  return <option key={employeeId} value={employeeId}>{employeeRosterOptionLabel(employee)}</option>;
                })}
              </select>
            </label>
            <label>
              <span>동의 만료일</span>
              <input name="consent_expires_at" type="date" value={form.consent_expires_at} onChange={updateForm} required />
            </label>
            <label>
              <span>보관 종료일</span>
              <input name="retention_expires_at" type="date" value={form.retention_expires_at} onChange={updateForm} required />
            </label>
            <label>
              <span>구성원 등록 적용일</span>
              <input name="effective_from" type="date" value={form.effective_from} onChange={updateForm} />
            </label>
          </div>
          <div className="recruiting-form-footer" data-recruiting-source-authority={result.pipeline_creation_state}>
            <span role="status">
              {statusText || (
                !pipelineCreationReady
                  ? "채용 자료 연계 필요: 승인·동의·문서·보상·일정 연계를 설정한 뒤 시작할 수 있습니다."
                  : !result.roster_available
                    ? "구성원 목록을 불러올 수 없어 채용 책임자와 면접 담당자를 선택할 수 없습니다."
                    : "필수 항목을 입력한 뒤 채용 절차를 시작하세요."
              )}
            </span>
            <button
              className="primary-button"
              disabled={pendingAction === "create" || !pipelineCreationReady || !result.roster_available || !formReady}
              type="submit"
            >
              <UserPlus size={14} />
              채용 절차 시작
            </button>
          </div>
        </form>
        <div className="recruiting-privacy-list" data-recruiting-privacy-state="true">
          <header>
            <strong>지원자 개인정보</strong>
            <span>열람 권한: 채용 담당자, 인사 담당자</span>
          </header>
          {result.candidates.length === 0 && <span>등록된 지원자 없음</span>}
          {result.candidates.map((candidate, index) => (
            <div key={recordString(candidate, "candidate_id", `candidate-privacy-${index}`)}>
              <strong>{candidateDisplayName(candidate)}</strong>
              <span>{privacyStateLabel(candidate.privacy_state)}</span>
              <small>
                동의 {recordString(candidate, "consent_expires_at", "만료일 확인 필요")}
                {", "}
                보관 {recordString(candidate, "retention_expires_at", "종료일 확인 필요")}
              </small>
            </div>
          ))}
        </div>
        {conversionReceipt && (
          <section className="recruiting-conversion-receipt" data-recruiting-conversion-receipt="completed">
            <div>
              <strong>구성원 전환 결과</strong>
              <span>같은 등록 요청을 다시 보내도 이 결과가 그대로 사용됩니다.</span>
            </div>
            <dl>
              {[
                ["구성원", "employee"],
                ["근로정보", "employment_profile"],
                ["로그인 계정", "employee_user_link"]
              ].map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{conversionOutcomeLabel(
                    ((conversionReceipt.results as RecruitingRecord | undefined)?.[key] as RecruitingRecord | undefined)?.outcome
                  )}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <DataTable
          columns={["공고", "제목", "상태", "모집"]}
          rows={result.job_openings.map((job, index) => [
            `공고 ${index + 1}`,
            recordString(job, "title"),
            stageLabel(job.state),
            recordNumber(job, "position_count") ? "모집 중" : "확인 필요"
          ])}
        />
        <DataTable
          columns={["면접", "지원", "상태", "일정"]}
          rows={result.interviews.map((interview, index) => [
            `면접 ${index + 1}`,
            `지원 ${index + 1}`,
            stageLabel(interview.state),
            interview.schedule_source_ref ? "등록됨" : "미등록"
          ])}
        />
        <DataTable
          columns={["합격자", "지원", "상태", "문서"]}
          rows={result.offers.map((offer, index) => [
            `합격자 ${index + 1}`,
            `지원 ${index + 1}`,
            stageLabel(offer.state),
            referenceLabel(recordString(offer, "document_ref"))
          ])}
        />
        <div className="approval-queue">
          {result.applications.map((application, index) => {
            const applicationId = recordString(application, "application_id");
            const candidate = candidateById.get(recordString(application, "candidate_id"));
            const job = jobById.get(recordString(application, "job_opening_id"));
            const interview = interviewByApplication.get(applicationId);
            const offer = offerByApplication.get(applicationId);
            const nextStage = NEXT_STAGE[recordString(application, "stage") as keyof typeof NEXT_STAGE];
            const offerAccepted = recordString(offer, "state") === "accepted";
            const canConvert = recordString(application, "stage") === "hired" && offerAccepted && Boolean(form.effective_from);
            return (
              <div className="approval-row recruiting-application-row" key={applicationId || `application-${index}`} data-recruiting-application-state={recordString(application, "stage", "unknown")}>
                <div>
                  <strong>{candidateDisplayName(candidate)}</strong>
                  <span>{recordString(job, "title", "지원자 / 구성원 등록")}</span>
                  <div className="recruiting-row-detail">
                    <span><strong>이메일</strong>{recordString(candidate, "email", "이메일 확인")}</span>
                    <span><strong>면접일</strong>{dateTimeLabel(recordString(interview, "scheduled_for"))}</span>
                    <span><strong>합격자 문서</strong>{referenceLabel(recordString(offer, "document_ref"))}</span>
                    <span><strong>보상 참조</strong>{referenceLabel(recordString(offer, "compensation_ref"))}</span>
                    <span><strong>전환 직무</strong>{recordString(job, "title", "직무 확인")}</span>
                    <span><strong>적용일</strong>{form.effective_from || "입사일 입력 필요"}</span>
                  </div>
                </div>
                <em>{stageLabel(application.stage)}</em>
                <div className="approval-actions">
                  <button type="button" className="secondary-button" disabled={!nextStage || pendingAction === applicationId} onClick={() => advance(application)}>
                    <GitBranch size={14} />
                    {nextStageActionLabel(nextStage)}
                  </button>
                  <button type="button" className="secondary-button" disabled={recordString(offer, "state") !== "sent" || pendingAction === recordString(offer, "offer_id")} onClick={() => offer && acceptOffer(offer)}>
                    <FileCheck2 size={14} />
                    합격자 수락
                  </button>
                  <button type="button" className="secondary-button" disabled={!canConvert || pendingAction === `convert:${applicationId}`} onClick={() => convert(application)}>
                    <CheckCircle2 size={14} />
                    구성원 등록
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <Panel id="people-recruiting" className="people-panel span-2" title="구성원 등록">
      <nav className="people-registration-tabs" aria-label="구성원 등록 방식">
        {[
          ["direct", "직접 등록"],
          ["planned", "입사 예정"],
          ["candidate", "채용 절차"]
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={registrationMode === mode ? "active" : ""}
            aria-pressed={registrationMode === mode}
            onClick={() => {
              if (registrationMode !== mode) pipelineAttemptKey.current = "";
              setRegistrationMode(mode as RegistrationMode);
              setStatusText("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {registrationMode === "direct" && (
        <section className="people-registration-direct" data-people-registration-mode="direct">
          <div>
            <strong>현재 함께 일하는 구성원 등록</strong>
            <p>이름, 업무용 이메일과 재직 상태를 먼저 저장합니다. 직위, 조직과 로그인 계정은 구성원 상세에서 이어서 설정할 수 있습니다.</p>
          </div>
          <button type="button" className="primary-button" onClick={() => setEmployeeEditorMode("direct")}>
            <UserPlus size={15} />
            구성원 정보 입력
          </button>
          {statusText && <div className="live-data-state live-data-review" role="status">{statusText}</div>}
        </section>
      )}
      {registrationMode === "planned" && (
        <section className="people-registration-planned" data-people-registration-mode="planned">
          <div>
            <strong>입사 예정 정보</strong>
            <p>입사일 전에는 현재 구성원 목록과 조직도에 포함되지 않습니다.</p>
          </div>
          <div className="people-registration-planned-fields">
            <label>
              <span>입사일</span>
              <input
                type="date"
                value={plannedProfile.effective_from}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlannedProfile((current) => ({ ...current, effective_from: value }));
                }}
              />
            </label>
            <label>
              <span>직위</span>
              <input
                value={plannedProfile.title}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlannedProfile((current) => ({ ...current, title: value }));
                }}
                placeholder="예: 어소시에이트 변호사"
              />
            </label>
            <label>
              <span>고용 형태</span>
              <select
                value={plannedProfile.employment_type}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlannedProfile((current) => ({ ...current, employment_type: value }));
                }}
              >
                <option value="full_time">정규직</option>
                <option value="part_time">파트타임</option>
                <option value="contractor">계약직</option>
                <option value="intern">인턴</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={!plannedProfile.effective_from}
            onClick={() => setEmployeeEditorMode("planned")}
          >
            <CalendarPlus size={15} />
            입사 예정 구성원 입력
          </button>
          {statusText && <div className="live-data-state live-data-review" role="status">{statusText}</div>}
        </section>
      )}
      {registrationMode === "candidate" && (
        <section data-people-registration-mode="candidate">
          {body}
        </section>
      )}
      {employeeEditorMode && (
        <EmployeeEditorDrawer
          mode="create"
          defaultStatus={employeeEditorMode === "planned" ? "onboarding" : "active"}
          onClose={() => setEmployeeEditorMode(null)}
          onSaved={completeDirectRegistration}
        />
      )}
    </Panel>
  );
}
