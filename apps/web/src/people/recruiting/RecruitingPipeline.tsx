/// <reference path="../../react-jsx.d.ts" />
import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, GitBranch, UserPlus } from "lucide-react";
import { DataTable, Panel } from "../../components/primitives.jsx";
import {
  convertHrxApplicationToEmployee,
  createHrxRecruitingPipeline,
  fetchRecruitingPipeline,
  updateHrxApplicationStage,
  updateHrxOfferStage
} from "../hrxApiClient.ts";

type RecruitingRecord = Record<string, unknown>;
type RecruitingData = {
  kind: "data";
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

const DEFAULT_FORM: FormState = {
  job_title: "소송팀 어소시에이트",
  candidate_name: "신규 지원자",
  candidate_email: "candidate@example.test",
  interview_date: currentDateValue(),
  interview_time: "10:00",
  offer_document_ref: "Vault:offer-letter:new",
  compensation_ref: "CompPackage:new",
  employee_title: "소송팀 어소시에이트",
  effective_from: currentDateValue()
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

function suffixFromApplication(application: RecruitingRecord) {
  const value = recordString(application, "application_id").replace(/^app_ui_/, "");
  return value || undefined;
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
  return value ? "참조 등록" : "참조 확인";
}

function nextStageActionLabel(stage: string | undefined) {
  if (stage === "hired") return "합격 전환";
  return "다음 단계";
}

export function RecruitingPipeline() {
  const [result, setResult] = useState<RecruitingResult | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [createdRefs, setCreatedRefs] = useState<RecruitingRecord | null>(null);
  const [pendingAction, setPendingAction] = useState("");
  const [statusText, setStatusText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    fetchRecruitingPipeline().then((next) => {
      if (cancelled) return;
      if (next.kind !== "data") {
        setResult({ kind: "error" });
        return;
      }
      setResult({
        kind: "data",
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
    setForm((current: FormState) => ({ ...current, [name]: value }));
  }

  async function createPipeline(event: FormSubmitEvent) {
    event.preventDefault();
    setPendingAction("create");
    setStatusText("");
    const created = await createHrxRecruitingPipeline(form);
    if (created.kind === "data" && created.ids) {
      setCreatedRefs(created.ids);
      setStatusText("파이프라인 생성 완료");
      setRefreshKey((key: number) => key + 1);
    } else {
      setStatusText("파이프라인 생성 실패");
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
    const updated = await updateHrxOfferStage(offerId, "accepted", recordString(offer, "approval_ref"));
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
    const converted = await convertHrxApplicationToEmployee(applicationId, form, {
      suffix: createdRefs?.application_id === applicationId ? createdRefs.suffix : suffixFromApplication(application)
    });
    if (converted.kind === "data") {
      setStatusText("구성원 등록 완료");
      setRefreshKey((key: number) => key + 1);
    } else {
      setStatusText("구성원 등록 실패");
    }
    setPendingAction("");
  }

  let body;
  if (result === null) {
    body = <div className="live-data-state live-data-loading">구성원 등록 정보를 불러오는 중입니다</div>;
  } else if (result.kind === "error") {
    body = <div className="live-data-state live-data-error">구성원 등록 정보를 불러오지 못했습니다.</div>;
  } else {
    const candidateById = byField(result.candidates, "candidate_id");
    const jobById = byField(result.job_openings, "job_opening_id");
    const interviewByApplication = new Map(result.interviews.map((interview: RecruitingRecord) => [recordString(interview, "application_id"), interview]));
    const offerByApplication = new Map(result.offers.map((offer: RecruitingRecord) => [recordString(offer, "application_id"), offer]));
    body = (
      <>
        <form className="recruiting-create-form" onSubmit={createPipeline}>
          <div className="recruiting-field-grid">
            <label>
              <span>공고명</span>
              <input name="job_title" value={form.job_title} onChange={updateForm} />
            </label>
            <label>
              <span>지원자명</span>
              <input name="candidate_name" value={form.candidate_name} onChange={updateForm} />
            </label>
            <label>
              <span>이메일</span>
              <input name="candidate_email" type="email" value={form.candidate_email} onChange={updateForm} />
            </label>
            <label>
              <span>면접일</span>
              <input name="interview_date" type="date" value={form.interview_date} onChange={updateForm} />
            </label>
            <label>
              <span>면접시간</span>
              <input name="interview_time" type="time" value={form.interview_time} onChange={updateForm} />
            </label>
            <label>
              <span>합격자 문서</span>
              <input name="offer_document_ref" value={form.offer_document_ref} onChange={updateForm} />
            </label>
            <label>
              <span>보상 참조</span>
              <input name="compensation_ref" value={form.compensation_ref} onChange={updateForm} />
            </label>
            <label>
              <span>전환 직무</span>
              <input name="employee_title" value={form.employee_title} onChange={updateForm} />
            </label>
            <label>
              <span>적용일</span>
              <input name="effective_from" type="date" value={form.effective_from} onChange={updateForm} />
            </label>
          </div>
          <div className="recruiting-form-footer">
            <span>{statusText}</span>
            <button className="primary-button" disabled={pendingAction === "create"} type="submit">
              <UserPlus size={14} />
              파이프라인 생성
            </button>
          </div>
        </form>
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
            offer.document_ref ? "준비됨" : "미등록"
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
            const canConvert = recordString(application, "stage") === "hired" && offerAccepted;
            const usesCurrentForm = createdRefs?.application_id === applicationId;
            return (
              <div className="approval-row recruiting-application-row" key={applicationId || `application-${index}`} data-recruiting-application-state={recordString(application, "stage", "unknown")}>
                <div>
                  <strong>{recordString(candidate, "legal_name", `지원 ${index + 1}`)}</strong>
                  <span>{recordString(job, "title", "지원자 / 구성원 등록")}</span>
                  <div className="recruiting-row-detail">
                    <span><strong>이메일</strong>{recordString(candidate, "email", "이메일 확인")}</span>
                    <span><strong>면접일</strong>{dateTimeLabel(recordString(interview, "scheduled_for"))}</span>
                    <span><strong>합격자 문서</strong>{referenceLabel(recordString(offer, "document_ref"))}</span>
                    <span><strong>보상 참조</strong>{referenceLabel(recordString(offer, "compensation_ref"))}</span>
                    <span><strong>전환 직무</strong>{usesCurrentForm ? form.employee_title : recordString(job, "title", "직무 확인")}</span>
                    <span><strong>적용일</strong>{usesCurrentForm ? form.effective_from : "전환 시 확정"}</span>
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
      {body}
    </Panel>
  );
}
