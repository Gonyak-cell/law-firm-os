import React, { useEffect, useRef, useState, type ReactNode } from "react";
import {
  disconnectPeopleOutlookConnection,
  fetchPeopleDailyBrief,
  fetchPeopleOutlookConnection,
  updatePeopleOutlookConnection,
} from "../hrxApiClient.ts";
import { safeEmployeeLabel } from "../peoplePresentation.ts";
import { EmployeeProfile } from "./EmployeeProfile.tsx";

type UnknownRecord = Record<string, unknown>;
type TodayTimelineRow =
  | (UnknownRecord & { row_kind: "matter_task" })
  | (UnknownRecord & { row_kind: "court_hearing" })
  | (UnknownRecord & { row_kind: "outlook_required" });
type ScheduleTimelineRow = UnknownRecord & { row_kind: "outlook_calendar" };
export type MemberDetailTab = "today" | "matters" | "profile";
type Navigate = (view: string, section?: string, routeContext?: Record<string, unknown>) => void;
type DailyBriefResult = Awaited<ReturnType<typeof fetchPeopleDailyBrief>>;
type OutlookConnectionResult = Awaited<ReturnType<typeof fetchPeopleOutlookConnection>>;
type OutlookOAuthNotice = {
  kind: "cancelled" | "error" | "success";
  message: string;
  retry: boolean;
};
type OutlookOAuthCallback = {
  code: string | null;
  state: string;
  error: string | null;
};

const TABS: ReadonlyArray<{ id: MemberDetailTab; label: string }> = [
  { id: "today", label: "오늘" },
  { id: "matters", label: "담당 사건" },
  { id: "profile", label: "프로필" },
];
const OUTLOOK_OAUTH_CALLBACK_KEYS = [
  "code",
  "state",
  "error",
  "error_description",
  "outlook_oauth_code",
  "outlook_oauth_state",
  "outlook_oauth_error",
];

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function rows(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function safeOAuthCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return code && code.length <= 4096 && !/[\u0000-\u001F\u007F]/.test(code) ? code : null;
}

function parseOutlookOAuthCallback(value: {
  code?: unknown;
  state?: unknown;
  error?: unknown;
}): OutlookOAuthCallback | null {
  if (
    typeof value.state !== "string"
    || !value.state
    || value.state.length > 200
    || /[\u0000-\u001F\u007F]/.test(value.state)
  ) return null;
  const code = safeOAuthCode(value.code);
  const error = typeof value.error === "string" && value.error.trim()
    ? value.error.trim().slice(0, 160)
    : null;
  return code || error ? { code, state: value.state, error } : null;
}

function readOutlookOAuthCallbackFromLocation(): OutlookOAuthCallback | null {
  if (typeof window === "undefined") return null;
  const params = new URL(window.location.href).searchParams;
  const codeValues = [
    ...params.getAll("outlook_oauth_code"),
    ...params.getAll("code"),
  ];
  const stateValues = [
    ...params.getAll("outlook_oauth_state"),
    ...params.getAll("state"),
  ];
  const errorValues = [
    ...params.getAll("outlook_oauth_error"),
    ...params.getAll("error"),
  ];
  if (
    stateValues.length !== 1
    || codeValues.length > 1
    || errorValues.length > 1
    || (codeValues.length === 1 && errorValues.length === 1)
  ) {
    return codeValues.length > 0 || errorValues.length > 0
      ? { code: null, state: "invalid-callback-state", error: "invalid_callback" }
      : null;
  }
  return parseOutlookOAuthCallback({
    code: codeValues[0],
    state: stateValues[0],
    error: errorValues[0],
  });
}

function clearOutlookOAuthCallbackFromLocation(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of OUTLOOK_OAUTH_CALLBACK_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function formatDateTime(value: unknown, timezone: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function sourceLabel(value: unknown): string {
  if (value === "hrx") return "구성원 정보";
  if (value === "matter") return "사건 정보";
  if (value === "identity_link") return "로그인 계정";
  if (value === "outlook") return "Outlook 일정";
  return text(value, "연결 정보");
}

function sourceStateLabel(value: unknown): string {
  if (value === "ok") return "최신";
  if (value === "stale") return "업데이트 지연";
  if (value === "blocked") return "연결 확인 필요";
  return "일부 확인 필요";
}

function MemberSourceStatus({ envelope }: { envelope: UnknownRecord }) {
  return (
    <div className="people-source-status" aria-label="정보 갱신 상태">
      {rows(envelope.source_status).map((source) => (
        <span key={text(source.source)} data-source={text(source.source)} data-source-state={text(source.state)}>
          <strong>{sourceLabel(source.source)}</strong>
          {sourceStateLabel(source.state)}
        </span>
      ))}
    </div>
  );
}

function openMatter(row: UnknownRecord, onNavigate?: Navigate) {
  const matterId = text(row.matter_id);
  if (!matterId || !onNavigate) return;
  onNavigate("matters", "matters-list", { matterId });
}

function DailyBriefState({
  result,
  children,
}: {
  result: DailyBriefResult | null;
  children: (envelope: UnknownRecord, data: UnknownRecord) => ReactNode;
}) {
  if (result === null) {
    return <div className="live-data-state live-data-loading">오늘 업무를 불러오는 중입니다</div>;
  }
  if (result.kind !== "data") {
    const denied = result.kind === "error" && "status" in result && result.status === 403;
    return (
      <div className={`live-data-state ${denied ? "live-data-denied" : "live-data-error"}`}>
        <strong>{denied ? "이 구성원의 업무를 볼 권한이 없습니다" : "오늘 업무를 불러오지 못했습니다"}</strong>
        {denied ? "구성원과 사건 열람 권한을 확인해 주세요." : "연결 상태를 확인해 주세요."}
      </div>
    );
  }
  const envelope = record(result.envelope);
  return <>{children(envelope, record(envelope.data))}</>;
}

function matterLabel(row: UnknownRecord): string {
  return [text(row.matter_code), text(row.matter_name)].filter(Boolean).join(" / ");
}

function outlookMeetingKey(row: UnknownRecord): string {
  const reference = text(row.calendar_event_ref);
  return reference
    ? `ref:${reference}`
    : `slot:${text(row.starts_at)}:${text(row.ends_at)}:${text(row.title)}`;
}

function MemberTodayTab({
  result,
  onNavigate,
}: {
  result: DailyBriefResult | null;
  onNavigate?: Navigate;
}) {
  return (
    <DailyBriefState result={result}>
      {(envelope, data) => {
        if (data.hearings === null) {
          return (
            <div className="people-overview-block-state" data-member-today-state="partial">
              <strong>사건 업무를 확인할 수 없습니다</strong>
              구성원 정보는 유지되며 사건 연결이 복구되면 다시 표시됩니다.
              <MemberSourceStatus envelope={envelope} />
            </div>
          );
        }
        const identityLinkRequired = data.task_source_state === "identity_link_required"
          || rows(data.confirmation_items).some(
            (item) => item.kind === "employee_user_link_confirmation_required",
          );
        const tasksAvailable = data.tasks !== null;
        const timezone = text(envelope.timezone, "Asia/Seoul");
        const tasks = record(data.tasks);
        const requiredMeetings = rows(data.required_meetings);
        const requiredMeetingKeys = new Set(requiredMeetings.map(outlookMeetingKey));
        const todayTimed: TodayTimelineRow[] = [
          ...rows(tasks.time_bound).map((item): TodayTimelineRow => ({ ...item, row_kind: "matter_task" })),
          ...rows(data.hearings).map((item): TodayTimelineRow => ({ ...item, row_kind: "court_hearing" })),
          ...requiredMeetings.map((item): TodayTimelineRow => ({ ...item, row_kind: "outlook_required" })),
        ].sort((left, right) => (
          text(left.starts_at).localeCompare(text(right.starts_at))
          || text(left.title).localeCompare(text(right.title), "ko-KR")
        ));
        const scheduleTimed: ScheduleTimelineRow[] = rows(data.outlook_intervals)
          .filter((item) => !requiredMeetingKeys.has(outlookMeetingKey(item)))
          .map((item): ScheduleTimelineRow => ({ ...item, row_kind: "outlook_calendar" }))
          .sort((left, right) => (
            text(left.starts_at).localeCompare(text(right.starts_at))
            || text(left.title).localeCompare(text(right.title), "ko-KR")
          ));
        const dueOnly = rows(tasks.due_only);
        const unscheduled = rows(tasks.unscheduled);
        const todayTaskCount = todayTimed.length + dueOnly.length + unscheduled.length;
        return (
          <section className="member-today" data-member-detail-tab-panel="today">
            <MemberSourceStatus envelope={envelope} />
            <section
              className="member-today-section"
              data-member-today-section="tasks"
              aria-labelledby="member-today-tasks-heading"
            >
              <h3 id="member-today-tasks-heading">오늘 할 일</h3>
              {!tasksAvailable && (
                <div
                  className="people-overview-block-state"
                  data-member-task-state={identityLinkRequired ? "identity_link_required" : "unavailable"}
                >
                  <strong>{identityLinkRequired ? "로그인 계정 연결을 확인해 주세요" : "사건 업무를 확인할 수 없습니다"}</strong>
                  {identityLinkRequired
                    ? "계정을 연결하면 이 구성원에게 배정된 사건 업무가 표시됩니다."
                    : "업무 연결이 복구되면 다시 표시됩니다."}
                </div>
              )}
              {todayTaskCount === 0 && tasksAvailable ? (
                <p className="people-overview-empty">오늘 처리할 사건 업무나 재판기일이 없습니다.</p>
              ) : todayTaskCount > 0 ? (
                <>
                  {todayTimed.length > 0 && (
                    <ol className="member-today-timeline">
                      {todayTimed.map((item) => (
                        <li key={`${text(item.row_kind)}:${text(item.task_id ?? item.event_id ?? item.calendar_event_ref, text(item.starts_at))}`}>
                          <time>{formatDateTime(item.starts_at, timezone)}</time>
                          <button
                            type="button"
                            onClick={() => openMatter(item, onNavigate)}
                            disabled={item.row_kind === "outlook_required" || !onNavigate}
                          >
                            <strong>{text(item.title, "업무")}</strong>
                            <span>{matterLabel(item)}</span>
                            <small>
                              {item.row_kind === "court_hearing"
                                ? "담당 재판"
                                : item.row_kind === "outlook_required"
                                  ? "필수 참석 회의"
                                  : "사건 업무"}
                            </small>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {(dueOnly.length > 0 || unscheduled.length > 0) && (
                    <section className="member-today-unscheduled">
                      <h4>시간을 정할 업무</h4>
                      <ul>
                        {[...dueOnly, ...unscheduled].map((item) => (
                          <li key={text(item.task_id)}>
                            <button type="button" onClick={() => openMatter(item, onNavigate)} disabled={!onNavigate}>
                              <strong>{text(item.title, "업무")}</strong>
                              <span>{matterLabel(item)}</span>
                              <small>{item.due_at ? `오늘 마감 / ${text(item.due_at)}` : "시간 확인 필요"}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : null}
            </section>
            {scheduleTimed.length > 0 && (
              <section
                className="member-today-section"
                data-member-today-section="schedule"
                aria-labelledby="member-today-schedule-heading"
              >
                <h3 id="member-today-schedule-heading">오늘 일정</h3>
                <ol className="member-today-timeline">
                  {scheduleTimed.map((item) => (
                    <li key={`outlook_calendar:${text(item.calendar_event_ref, text(item.starts_at))}`}>
                      <time>{formatDateTime(item.starts_at, timezone)}</time>
                      <button type="button" disabled>
                        <strong>{text(item.title, "일정")}</strong>
                        <small>Outlook 일정</small>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </section>
        );
      }}
    </DailyBriefState>
  );
}

function roleLabel(value: unknown): string {
  if (value === "responsible_attorney") return "담당 변호사";
  return text(value, "담당 역할");
}

function handoffLabel(value: unknown): string {
  return value === "handoff_scheduled" ? "인계 예정" : "현재 담당";
}

function MemberMattersTab({
  result,
  onNavigate,
}: {
  result: DailyBriefResult | null;
  onNavigate?: Navigate;
}) {
  return (
    <DailyBriefState result={result}>
      {(envelope, data) => {
        if (data.assigned_matters === null) {
          return (
            <div className="people-overview-block-state" data-member-matters-state="partial">
              <strong>담당 사건을 확인할 수 없습니다</strong>
              사건 연결이 복구되면 현재 담당 중인 사건만 다시 표시됩니다.
              <MemberSourceStatus envelope={envelope} />
            </div>
          );
        }
        const timezone = text(envelope.timezone, "Asia/Seoul");
        const matters = rows(data.assigned_matters);
        return (
          <section className="member-matters" data-member-detail-tab-panel="matters">
            <MemberSourceStatus envelope={envelope} />
            {matters.length === 0 ? (
              <p className="people-overview-empty">현재 담당 변호사로 지정된 사건이 없습니다.</p>
            ) : (
              <ul>
                {matters.map((matter) => {
                  const nextEvent = record(matter.next_important_event);
                  return (
                    <li key={text(matter.matter_id)}>
                      <button type="button" onClick={() => openMatter(matter, onNavigate)} disabled={!onNavigate}>
                        <span className="member-matter-code">{text(matter.matter_code, "코드 확인 필요")}</span>
                        <strong>{text(matter.matter_name, "사건명 확인 필요")}</strong>
                        <span>{roleLabel(matter.role)} / {handoffLabel(matter.handoff_state)}</span>
                        <small>
                          {Object.keys(nextEvent).length > 0
                            ? `다음 일정 ${formatDateTime(nextEvent.starts_at, timezone)} / ${text(nextEvent.title, "중요 일정")}`
                            : "예정된 중요 일정 없음"}
                        </small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      }}
    </DailyBriefState>
  );
}

const OUTLOOK_CONNECTION_LABELS: Record<string, { title: string; detail: string }> = {
  not_connected: {
    title: "연결 안 됨",
    detail: "본인의 Outlook 일정은 연결한 뒤에만 표시됩니다.",
  },
  admin_consent_required: {
    title: "관리자 승인 필요",
    detail: "Microsoft 365 관리자가 일정 읽기 권한을 승인해야 합니다.",
  },
  consent_pending: {
    title: "연결 승인 대기",
    detail: "Microsoft 로그인에서 일정 읽기 권한을 승인해 주세요.",
  },
  connected: {
    title: "연결됨",
    detail: "필수 참석 회의는 오늘 할 일에, 나머지는 시간표에 반영됩니다.",
  },
  reauthorization_required: {
    title: "다시 연결 필요",
    detail: "동의가 만료되었거나 철회되었습니다. 다시 연결해 주세요.",
  },
};

function OutlookConnectionPanel({
  result,
  busy,
  notice,
  onAction,
  onDisconnect,
  onRefresh,
}: {
  result: OutlookConnectionResult | null;
  busy: boolean;
  notice: OutlookOAuthNotice | null;
  onAction: (action: "begin" | "retry") => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  if (result === null) {
    return <div className="member-outlook-connection" data-outlook-connection-state="loading">Outlook 연결 상태를 확인하는 중입니다</div>;
  }
  if (result.kind !== "data") {
    return (
      <div className="member-outlook-connection" data-outlook-connection-state="error">
        <div><strong>Outlook 상태를 확인하지 못했습니다</strong><span>잠시 뒤 다시 확인해 주세요.</span></div>
        <button type="button" onClick={onRefresh} disabled={busy}>다시 확인</button>
      </div>
    );
  }
  const connection = record(result.connection);
  const state = text(connection.connection_state, "not_connected");
  const copy = OUTLOOK_CONNECTION_LABELS[state] ?? OUTLOOK_CONNECTION_LABELS.not_connected;
  const canManage = connection.can_manage === true;
  return (
    <section className="member-outlook-connection" data-outlook-connection-state={state}>
      <div>
        <span>Outlook 일정</span>
        <strong>{copy.title}</strong>
        <small>{canManage ? copy.detail : "일정 연결과 해제는 해당 구성원 본인만 할 수 있습니다."}</small>
        {notice && (
          <small
            role={notice.kind === "error" ? "alert" : "status"}
            data-outlook-oauth-notice={notice.kind}
          >
            {notice.message}
          </small>
        )}
      </div>
      {canManage && state === "connected" && (
        <button type="button" onClick={onDisconnect} disabled={busy}>연결 해제</button>
      )}
      {canManage && state === "reauthorization_required" && (
        <button type="button" onClick={() => onAction("retry")} disabled={busy}>다시 연결</button>
      )}
      {canManage && state === "not_connected" && (
        <button
          type="button"
          onClick={() => onAction(notice?.retry ? "retry" : "begin")}
          disabled={busy}
        >
          {notice?.retry ? "다시 시도" : "연결"}
        </button>
      )}
      {canManage && ["admin_consent_required", "consent_pending"].includes(state) && (
        notice?.retry
          ? <button type="button" onClick={() => onAction("retry")} disabled={busy}>다시 시도</button>
          : <button type="button" onClick={onRefresh} disabled={busy}>승인 상태 확인</button>
      )}
    </section>
  );
}

export function MemberDetailPanel({
  employeeId,
  tab,
  refreshKey,
  memberBriefEnabled,
  outlookCalendarEnabled,
  onTabChange,
  onNavigate,
}: {
  employeeId: string;
  tab: MemberDetailTab;
  refreshKey?: unknown;
  memberBriefEnabled: boolean;
  outlookCalendarEnabled: boolean;
  onTabChange: (tab: MemberDetailTab) => void;
  onNavigate?: Navigate;
}) {
  const [dailyBrief, setDailyBrief] = useState<DailyBriefResult | null>(null);
  const [outlookConnection, setOutlookConnection] = useState<OutlookConnectionResult | null>(null);
  const [outlookBusy, setOutlookBusy] = useState(false);
  const [outlookNotice, setOutlookNotice] = useState<OutlookOAuthNotice | null>(null);
  const outlookCallbackRunningRef = useRef(false);
  const employeeIdRef = useRef(employeeId);
  employeeIdRef.current = employeeId;

  const refreshOutlookConnection = () => {
    if (!outlookCalendarEnabled) return;
    setOutlookConnection(null);
    fetchPeopleOutlookConnection(employeeId).then((next) => {
      setOutlookConnection(next);
      setOutlookBusy(false);
    });
  };

  const updateOutlookConnection = async (action: "begin" | "retry") => {
    setOutlookNotice(null);
    setOutlookBusy(true);
    const next = await updatePeopleOutlookConnection(employeeId, action);
    if (next.kind === "data") {
      setOutlookConnection(next);
      const authorization = next.authorization;
      if (authorization) {
        if (typeof window.matterSession?.openOutlookAuthorization === "function") {
          let opened = false;
          try {
            opened = (await window.matterSession.openOutlookAuthorization(authorization.authorize_url))?.opened === true;
          } catch {
            opened = false;
          }
          if (!opened) {
            setOutlookNotice({
              kind: "error",
              message: "Microsoft 로그인 창을 열지 못했습니다. 다시 시도해 주세요.",
              retry: true,
            });
          }
          setOutlookBusy(false);
          return;
        }
        window.location.assign(authorization.authorize_url);
        return;
      }
    } else {
      setOutlookNotice({
        kind: "error",
        message: next.reason === "OUTLOOK_AUTHORIZE_URL_NOT_ALLOWED"
          ? "허용되지 않은 Microsoft 로그인 주소가 차단되었습니다."
          : next.reason === "DOMAIN_IDEMPOTENCY_REQUIRED"
            || next.reason === "OUTLOOK_CONNECTION_IDEMPOTENCY_KEY_REQUIRED"
            ? "이전 연결 요청과 충돌했습니다. 다시 연결해 주세요."
            : "Outlook 연결을 시작하지 못했습니다. 다시 시도해 주세요.",
        retry: true,
      });
    }
    setOutlookBusy(false);
  };

  const disconnectOutlookConnection = async () => {
    setOutlookNotice(null);
    setOutlookBusy(true);
    const next = await disconnectPeopleOutlookConnection(employeeId);
    if (next.kind === "data") {
      setOutlookConnection(next);
      setDailyBrief(null);
      fetchPeopleDailyBrief(employeeId).then(setDailyBrief);
    } else {
      setOutlookNotice({
        kind: "error",
        message: "Outlook 연결을 해제하지 못했습니다. 기존 연결은 유지됩니다.",
        retry: false,
      });
    }
    setOutlookBusy(false);
  };

  const completeOutlookOAuth = async (callback: OutlookOAuthCallback) => {
    if (!outlookCalendarEnabled || outlookCallbackRunningRef.current) return;
    const callbackEmployeeId = employeeIdRef.current;
    outlookCallbackRunningRef.current = true;
    setOutlookBusy(true);
    if (callback.error) {
      const current = await fetchPeopleOutlookConnection(callbackEmployeeId);
      if (callbackEmployeeId === employeeIdRef.current) setOutlookConnection(current);
      const cancelled = callback.error === "access_denied";
      setOutlookNotice({
        kind: cancelled ? "cancelled" : "error",
        message: cancelled
          ? "Outlook 연결을 취소했습니다. 다시 시도할 수 있습니다."
          : "연결 요청을 확인하지 못했습니다. 다시 연결해 주세요.",
        retry: true,
      });
      setOutlookBusy(false);
      outlookCallbackRunningRef.current = false;
      return;
    }
    if (!callback.code) {
      const current = await fetchPeopleOutlookConnection(callbackEmployeeId);
      if (callbackEmployeeId === employeeIdRef.current) setOutlookConnection(current);
      setOutlookNotice({
        kind: "error",
        message: "Outlook 인증 코드를 받지 못했습니다. 다시 시도해 주세요.",
        retry: true,
      });
      setOutlookBusy(false);
      outlookCallbackRunningRef.current = false;
      return;
    }
    const next = await updatePeopleOutlookConnection(callbackEmployeeId, "complete", {
      authorization_code: callback.code,
      state_ref: callback.state,
    });
    if (next.kind === "data") {
      if (callbackEmployeeId === employeeIdRef.current) {
        setOutlookConnection(next);
        setDailyBrief(null);
        fetchPeopleDailyBrief(callbackEmployeeId).then(setDailyBrief);
      }
      setOutlookNotice({
        kind: "success",
        message: "Outlook 일정을 연결했습니다.",
        retry: false,
      });
    } else {
      const current = await fetchPeopleOutlookConnection(callbackEmployeeId);
      if (callbackEmployeeId === employeeIdRef.current) setOutlookConnection(current);
      const stateRejected = next.reason === "OUTLOOK_OAUTH_STATE_INVALID"
        || next.reason === "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED";
      setOutlookNotice({
        kind: "error",
        message: stateRejected
          ? "연결 요청을 확인하지 못했습니다. 다시 연결해 주세요."
          : "Outlook 연결을 마치지 못했습니다. 다시 시도해 주세요.",
        retry: true,
      });
    }
    setOutlookBusy(false);
    outlookCallbackRunningRef.current = false;
  };

  useEffect(() => {
    if (!memberBriefEnabled) {
      setDailyBrief(null);
      return undefined;
    }
    let cancelled = false;
    setDailyBrief(null);
    fetchPeopleDailyBrief(employeeId).then((next) => {
      if (!cancelled) setDailyBrief(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, memberBriefEnabled, refreshKey]);

  useEffect(() => {
    if (!outlookCalendarEnabled) {
      setOutlookConnection(null);
      setOutlookNotice(null);
      return;
    }
    if (readOutlookOAuthCallbackFromLocation()) return;
    if (outlookCallbackRunningRef.current) return;
    let cancelled = false;
    setOutlookConnection(null);
    fetchPeopleOutlookConnection(employeeId).then((next) => {
      if (!cancelled) setOutlookConnection(next);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, outlookCalendarEnabled, refreshKey]);

  useEffect(() => {
    if (!outlookCalendarEnabled) return;
    const callback = readOutlookOAuthCallbackFromLocation();
    if (!callback) return;
    clearOutlookOAuthCallbackFromLocation();
    void completeOutlookOAuth(callback);
  }, [employeeId, outlookCalendarEnabled]);

  useEffect(() => {
    if (!outlookCalendarEnabled || typeof window.matterSession?.onAuthCallbackDeepLink !== "function") {
      return undefined;
    }
    const unsubscribe = window.matterSession.onAuthCallbackDeepLink((intent) => {
      if (intent?.type !== "auth_callback" || intent.routeOnly !== true) return;
      const callback = parseOutlookOAuthCallback({
        code: intent.code,
        state: intent.state,
      });
      return callback ? completeOutlookOAuth(callback) : undefined;
    });
    return typeof unsubscribe === "function" ? unsubscribe : undefined;
  }, [employeeId, outlookCalendarEnabled]);

  const dailyData = dailyBrief?.kind === "data"
    ? record(record(dailyBrief.envelope).data)
    : {};
  const member = record(dailyData.member);
  const displayName = safeEmployeeLabel({
    employee_id: member.employee_id,
    user_id: member.user_id,
    display_name: member.display_name,
  });
  const activeTab = memberBriefEnabled ? tab : "profile";

  return (
    <div className="member-detail" data-member-detail-employee={employeeId} data-member-detail-tab={activeTab}>
      <header className="member-detail-heading">
        <span className="eyebrow">구성원</span>
        <h2>{displayName}</h2>
        {text(member.title) && <p>{text(member.title)}</p>}
      </header>

      {outlookCalendarEnabled && (
        <OutlookConnectionPanel
          result={outlookConnection}
          busy={outlookBusy}
          notice={outlookNotice}
          onAction={updateOutlookConnection}
          onDisconnect={disconnectOutlookConnection}
          onRefresh={refreshOutlookConnection}
        />
      )}

      {memberBriefEnabled && (
        <div className="member-detail-tabs" role="tablist" aria-label="구성원 상세 보기">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              aria-controls={`member-detail-panel-${item.id}`}
              id={`member-detail-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div
        id={`member-detail-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={memberBriefEnabled ? `member-detail-tab-${activeTab}` : undefined}
        className="member-detail-body"
      >
        {activeTab === "today" && <MemberTodayTab result={dailyBrief} onNavigate={onNavigate} />}
        {activeTab === "matters" && <MemberMattersTab result={dailyBrief} onNavigate={onNavigate} />}
        {activeTab === "profile" && <EmployeeProfile employeeId={employeeId} refreshKey={refreshKey} />}
      </div>
    </div>
  );
}
