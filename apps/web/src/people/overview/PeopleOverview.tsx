import React, { useEffect, useState } from "react";
import { Panel } from "../../components/primitives.jsx";
import { fetchPeopleTeamOperations } from "../hrxApiClient.ts";
import { safeEmployeeLabel, safePeopleLabel } from "../peoplePresentation.ts";

type UnknownRecord = Record<string, unknown>;
type Navigate = (view: string, section?: string, routeContext?: Record<string, unknown>) => void;
type OverviewResult =
  | { kind: "loading" }
  | { kind: "error"; status?: number | null; reason?: unknown }
  | { kind: "data"; envelope: UnknownRecord };

type TimelineInterval = {
  interval: UnknownRecord;
  startMinute: number;
  endMinute: number;
  lane: number;
  laneCount: number;
  leftPercent: number;
  widthPercent: number;
};

type TimelineDetail = {
  employeeName: string;
  kindLabel: string;
  title: string;
  timeLabel: string;
};

const SOURCE_LABELS: Record<string, string> = {
  hrx: "구성원 정보",
  identity_link: "로그인 계정 연결",
  matter: "사건 정보",
  outlook: "Outlook 일정",
  leave: "휴가 정보",
};

const SOURCE_STATE_LABELS: Record<string, string> = {
  ok: "최신",
  partial: "일부 확인 필요",
  blocked: "연결 확인 필요",
  stale: "업데이트 지연",
};

const QUEUE_LABELS: Record<string, string> = {
  today_tasks: "오늘 처리할 일",
  assignee_required: "담당자 지정 필요",
  handoff_confirmation: "인계 확인",
  time_record_confirmation: "시간기록 확인",
};

const TIMELINE_KIND_LABELS: Record<string, string> = {
  matter_task: "사건 업무",
  court_hearing: "재판기일",
  outlook_calendar: "Outlook 일정",
  approved_leave: "승인 휴가",
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function rows(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function employeeLabel(employee: UnknownRecord, fallback = "구성원 이름 확인 필요"): string {
  return safeEmployeeLabel({
    employee_id: employee.employee_id,
    user_id: employee.user_id,
    display_name: employee.display_name,
  }, fallback);
}

function integer(value: unknown): number {
  return Number.isInteger(value) ? Number(value) : 0;
}

function dateTime(value: unknown, timezone: string): string {
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

function clockTime(value: unknown, timezone: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function localMinute(value: unknown, timezone: string): number | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return Number.isInteger(hour) && Number.isInteger(minute) ? (hour * 60) + minute : null;
}

function localDateKey(value: unknown, timezone: string): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : null;
}

function intervalMinutesForDate(
  interval: UnknownRecord,
  timezone: string,
  targetDate: string,
): { startMinute: number; endMinute: number } | null {
  const startsAt = interval.starts_at;
  const endsAt = interval.ends_at;
  if (
    typeof startsAt !== "string"
    || typeof endsAt !== "string"
    || !Number.isFinite(Date.parse(startsAt))
    || !Number.isFinite(Date.parse(endsAt))
    || Date.parse(endsAt) <= Date.parse(startsAt)
  ) return null;
  const startDate = localDateKey(startsAt, timezone);
  const endDate = localDateKey(endsAt, timezone);
  const localStart = localMinute(startsAt, timezone);
  const localEnd = localMinute(endsAt, timezone);
  if (!startDate || !endDate || localStart === null || localEnd === null) return null;
  const startMinute = startDate < targetDate
    ? 0
    : startDate === targetDate
      ? localStart
      : null;
  const endMinute = endDate > targetDate
    ? 24 * 60
    : endDate === targetDate
      ? localEnd
      : null;
  return startMinute !== null && endMinute !== null && endMinute > startMinute
    ? { startMinute, endMinute }
    : null;
}

function timelineDate(
  intervals: UnknownRecord[],
  timezone: string,
  asOf?: unknown,
): string | null {
  return localDateKey(asOf, timezone)
    ?? localDateKey(intervals[0]?.starts_at, timezone);
}

function minuteLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function getPeopleTimelineRange(
  teamMembers: UnknownRecord[],
  timezone: string,
  asOf?: unknown,
): { startMinute: number; endMinute: number } {
  const intervals = teamMembers.flatMap((member) => rows(member.today_intervals));
  const targetDate = timelineDate(intervals, timezone, asOf);
  const normalized = targetDate
    ? intervals
        .map((interval) => intervalMinutesForDate(interval, timezone, targetDate))
        .filter((value): value is { startMinute: number; endMinute: number } => value !== null)
    : [];
  const starts = normalized.map(({ startMinute }) => startMinute);
  const ends = normalized.map(({ endMinute }) => endMinute);
  const earliest = starts.length > 0 ? Math.min(...starts) : 9 * 60;
  const latest = ends.length > 0 ? Math.max(...ends) : 18 * 60;
  const startMinute = Math.max(6 * 60, Math.min(9 * 60, Math.floor(earliest / 30) * 30));
  const endMinute = Math.min(22 * 60, Math.max(18 * 60, Math.ceil(latest / 30) * 30));
  return endMinute > startMinute
    ? { startMinute, endMinute }
    : { startMinute: 9 * 60, endMinute: 18 * 60 };
}

export function layoutPeopleTimelineIntervals(
  intervals: UnknownRecord[],
  timezone: string,
  startMinute: number,
  endMinute: number,
  asOf?: unknown,
): TimelineInterval[] {
  const targetDate = timelineDate(intervals, timezone, asOf);
  const normalized = intervals.map((interval) => {
    const minutes = targetDate ? intervalMinutesForDate(interval, timezone, targetDate) : null;
    if (!minutes) return null;
    const clippedStart = Math.max(startMinute, minutes.startMinute);
    const clippedEnd = Math.min(endMinute, minutes.endMinute);
    return clippedEnd > clippedStart
      ? { interval, startMinute: clippedStart, endMinute: clippedEnd }
      : null;
  }).filter((value): value is { interval: UnknownRecord; startMinute: number; endMinute: number } => value !== null)
    .sort((left, right) => (
      left.startMinute - right.startMinute
      || left.endMinute - right.endMinute
      || text(left.interval.title).localeCompare(text(right.interval.title), "ko-KR")
    ));
  const laneEnds: number[] = [];
  const assigned = normalized.map((item) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.startMinute);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = item.endMinute;
    return { ...item, lane };
  });
  const laneCount = Math.max(1, laneEnds.length);
  const visibleMinutes = endMinute - startMinute;
  return assigned.map((item) => ({
    ...item,
    laneCount,
    leftPercent: ((item.startMinute - startMinute) / visibleMinutes) * 100,
    widthPercent: ((item.endMinute - item.startMinute) / visibleMinutes) * 100,
  }));
}

function sourceRows(envelope: UnknownRecord, requiredSources: string[]): UnknownRecord[] {
  const required = new Set(requiredSources);
  return rows(envelope.source_status).filter((source) => required.has(text(source.source)));
}

function SourceStatus({
  envelope,
  sources,
}: {
  envelope: UnknownRecord;
  sources: string[];
}) {
  const statusRows = sourceRows(envelope, sources);
  return (
    <div className="people-source-status" aria-label="정보 갱신 상태">
      {statusRows.map((source) => {
        const sourceName = text(source.source);
        const state = text(source.state, "blocked");
        return (
          <span key={sourceName} data-source={sourceName} data-source-state={state}>
            <strong>{SOURCE_LABELS[sourceName] ?? sourceName}</strong>
            {SOURCE_STATE_LABELS[state] ?? "확인 필요"}
          </span>
        );
      })}
    </div>
  );
}

function BlockUnavailable({ envelope }: { envelope: UnknownRecord }) {
  return (
    <div className="people-overview-block-state" data-people-overview-block-state="partial" role="status">
      <strong>일부 정보를 확인할 수 없습니다</strong>
      연결된 정보가 다시 확인되면 이 영역에 자동으로 반영됩니다.
      <SourceStatus envelope={envelope} sources={["hrx", "matter"]} />
    </div>
  );
}

function openDestination(destination: unknown, onNavigate?: Navigate) {
  const target = record(destination);
  const view = text(target.view);
  if (!view || !onNavigate) return;
  onNavigate(view, text(target.section), {
    ...(text(target.matter_id) ? { matterId: text(target.matter_id) } : {}),
    ...(text(target.employee_id) ? { employeeId: text(target.employee_id) } : {}),
  });
}

function rowMatterLabel(row: UnknownRecord): string {
  return [text(row.matter_code), text(row.matter_name)].filter(Boolean).join(" / ");
}

function ActionQueues({
  envelope,
  queues,
  timezone,
  onNavigate,
  onSelectEmployee,
}: {
  envelope: UnknownRecord;
  queues: unknown;
  timezone: string;
  onNavigate?: Navigate;
  onSelectEmployee: (employeeId: string) => void;
}) {
  if (!queues || typeof queues !== "object") return <BlockUnavailable envelope={envelope} />;
  const queueRecord = record(queues);
  return (
    <>
      <SourceStatus envelope={envelope} sources={["hrx", "matter", "outlook"]} />
      <div className="people-action-queues">
        {Object.entries(QUEUE_LABELS).map(([queueId, label]) => {
          const queue = record(queueRecord[queueId]);
          const queueRows = rows(queue.rows);
          const countUnknown = queue.count === null || text(queue.source_state) === "identity_link_required";
          return (
            <section
              key={queueId}
              className="people-action-queue"
              data-people-action-queue={queueId}
              data-queue-source-state={countUnknown ? "identity_link_required" : "ok"}
            >
              <header>
                <h3>{label}</h3>
                <span aria-label={countUnknown ? "건수 확인 필요" : `${queueRows.length}건`}>
                  {countUnknown ? "확인 필요" : queueRows.length}
                </span>
              </header>
              {countUnknown ? (
                <p className="people-overview-empty">
                  일부 구성원의 로그인 계정 연결을 확인해야 전체 업무를 볼 수 있습니다.
                </p>
              ) : null}
              {queueRows.length === 0 && !countUnknown ? (
                <p className="people-overview-empty">지금 확인할 항목이 없습니다.</p>
              ) : queueRows.length > 0 ? (
                <ul>
                  {queueRows.map((row) => {
                    const destination = record(row.destination);
                    const canOpen = text(destination.view) === "people"
                      ? Boolean(text(destination.employee_id))
                      : Boolean(onNavigate && text(destination.view));
                    const displayName = safePeopleLabel(row.display_name, {
                      identifiers: [row.employee_id],
                      fallback: "",
                    });
                    return (
                      <li key={text(row.queue_id)}>
                        <button
                          type="button"
                          disabled={!canOpen}
                          onClick={() => {
                            if (text(destination.view) === "people" && text(destination.employee_id)) {
                              onSelectEmployee(text(destination.employee_id));
                              return;
                            }
                            openDestination(destination, onNavigate);
                          }}
                          aria-label={`${text(row.title, "확인 항목")} 열기`}
                        >
                          <strong>{text(row.title, "확인 항목")}</strong>
                          <span>{[displayName, rowMatterLabel(row)].filter(Boolean).join(" / ")}</span>
                          <small>{dateTime(row.starts_at ?? row.due_at ?? row.valid_to, timezone)}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}

function TimelineGrid({
  startMinute,
  endMinute,
}: {
  startMinute: number;
  endMinute: number;
}) {
  const markers = [];
  for (let minute = startMinute; minute <= endMinute; minute += 30) markers.push(minute);
  return (
    <>
      {markers.map((minute) => {
        const left = ((minute - startMinute) / (endMinute - startMinute)) * 100;
        return (
          <span
            key={minute}
            className="people-timeline-gridline"
            data-hour={minute % 60 === 0 ? "true" : "false"}
            style={{ left: `${left}%` }}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}

function IntradayTimeline({
  envelope,
  teamMembers,
  timezone,
  onSelectEmployee,
}: {
  envelope: UnknownRecord;
  teamMembers: UnknownRecord[];
  timezone: string;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const [activeDetail, setActiveDetail] = useState<TimelineDetail | null>(null);
  const asOf = envelope.as_of;
  const range = getPeopleTimelineRange(teamMembers, timezone, asOf);
  if (teamMembers.some((member) => member.today_intervals === null)) {
    return <BlockUnavailable envelope={envelope} />;
  }
  const markerMinutes = [];
  for (let minute = range.startMinute; minute <= range.endMinute; minute += 60) markerMinutes.push(minute);
  const slotCount = Math.max(1, (range.endMinute - range.startMinute) / 30);
  return (
    <>
      <SourceStatus envelope={envelope} sources={["hrx", "matter", "outlook"]} />
      <div className="people-timeline-legend" aria-label="일정 종류">
        <span data-kind="matter_task">사건 업무</span>
        <span data-kind="court_hearing">재판기일</span>
        <span data-kind="outlook_calendar">Outlook 일정</span>
        <span data-kind="approved_leave">승인 휴가</span>
      </div>
      <div
        id="people-timeline-active-detail"
        className="people-timeline-detail"
        data-people-timeline-detail={activeDetail ? "active" : "idle"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {activeDetail ? (
          <>
            <span>{activeDetail.employeeName} · {activeDetail.kindLabel}</span>
            <strong>{activeDetail.title}</strong>
            <time>{activeDetail.timeLabel}</time>
          </>
        ) : (
          <span>짧은 일정은 선택하면 전체 제목과 시간을 확인할 수 있습니다.</span>
        )}
      </div>
      <div className="people-timeline-scroll" tabIndex={0} aria-label="구성원별 오늘 시간표. 좌우로 이동할 수 있습니다.">
        <div className="people-timeline" style={{ minWidth: `${156 + (slotCount * 48)}px` }}>
          <div className="people-timeline-axis">
            <span aria-hidden="true" />
            <div>
              {markerMinutes.map((minute) => (
                <span
                  key={minute}
                  style={{ left: `${((minute - range.startMinute) / (range.endMinute - range.startMinute)) * 100}%` }}
                >
                  {minuteLabel(minute)}
                </span>
              ))}
            </div>
          </div>
          {teamMembers.map((teamMember) => {
            const member = record(teamMember.member);
            const employeeId = text(member.employee_id);
            const employeeName = employeeLabel(member);
            const intervals = layoutPeopleTimelineIntervals(
              rows(teamMember.today_intervals),
              timezone,
              range.startMinute,
              range.endMinute,
              asOf,
            );
            const laneCount = Math.max(1, ...intervals.map((item) => item.laneCount));
            return (
              <div className="people-timeline-row" key={employeeId} data-people-timeline-member={employeeId}>
                <button type="button" className="people-timeline-member" onClick={() => onSelectEmployee(employeeId)}>
                  <strong>{employeeName}</strong>
                  <span>{text(member.title, "구성원")}</span>
                </button>
                <div className="people-timeline-track" style={{ minHeight: `${Math.max(42, (laneCount * 30) + 10)}px` }}>
                  <TimelineGrid startMinute={range.startMinute} endMinute={range.endMinute} />
                  {intervals.length === 0 && <span className="people-timeline-free">등록된 일정 없음</span>}
                  {intervals.map((item) => {
                    const kind = text(item.interval.kind, "matter_task");
                    const title = text(item.interval.title, "일정");
                    const timeLabel = `${clockTime(item.interval.starts_at, timezone)}–${clockTime(item.interval.ends_at, timezone)}`;
                    const showDetail = () => setActiveDetail({
                      employeeName,
                      kindLabel: TIMELINE_KIND_LABELS[kind] ?? "일정",
                      title,
                      timeLabel,
                    });
                    return (
                      <button
                        type="button"
                        key={`${kind}:${text(item.interval.task_id ?? item.interval.event_id ?? item.interval.calendar_event_ref, title)}:${item.startMinute}`}
                        className="people-timeline-block"
                        data-kind={kind}
                        data-duration-minutes={item.endMinute - item.startMinute}
                        style={{
                          left: `${item.leftPercent}%`,
                          width: `${item.widthPercent}%`,
                          top: `${5 + (item.lane * 30)}px`,
                        }}
                        title={`${title} / ${timeLabel}`}
                        onFocus={showDetail}
                        onMouseEnter={showDetail}
                        onClick={showDetail}
                        aria-controls="people-timeline-active-detail"
                        aria-label={`${employeeName} ${clockTime(item.interval.starts_at, timezone)}부터 ${clockTime(item.interval.ends_at, timezone)}까지 ${title} 일정 확인`}
                      >
                        <strong>{title}</strong>
                        <span>{timeLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function formatMinutes(value: unknown): string {
  const minutes = integer(value);
  if (minutes === 0) return "0분";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours > 0 ? `${hours}시간` : "", remainder > 0 ? `${remainder}분` : ""].filter(Boolean).join(" ");
}

function WorkloadStageOne({
  envelope,
  workload,
  capacity,
  timezone,
}: {
  envelope: UnknownRecord;
  workload: unknown;
  capacity: unknown;
  timezone: string;
}) {
  if (!workload || typeof workload !== "object") return <BlockUnavailable envelope={envelope} />;
  const workloadRecord = record(workload);
  const workloadRows = rows(workloadRecord.rows);
  const availableRows = workloadRows.filter((row) => text(row.workload_source_state, "ok") === "ok");
  const maxMinutes = Math.max(
    1,
    ...availableRows.flatMap((row) => [
      integer(row.confirmed_minutes),
      integer(row.time_unspecified_estimated_minutes),
    ]),
  );
  return (
    <>
      <SourceStatus envelope={envelope} sources={["hrx", "identity_link", "matter"]} />
      <p className="people-overview-note">
        {text(workloadRecord.week_start)}부터 1주일을 집계합니다. 시간 미정 업무는 남은 시간 계산에서 제외합니다.
      </p>
      <div className="people-workload-list">
        {workloadRows.map((row) => {
          const sourceState = text(row.workload_source_state, "ok");
          if (sourceState !== "ok") {
            return (
              <div
                className="people-workload-row people-workload-row-unavailable"
                data-workload-source-state={sourceState}
                key={text(row.employee_id)}
              >
                <strong>{employeeLabel(row)}</strong>
                <div className="people-workload-unavailable" role="status">
                  <span>로그인 계정 연결을 확인해 주세요</span>
                  <small>계정 연결을 확인한 뒤 사건 업무량을 표시합니다.</small>
                </div>
              </div>
            );
          }
          return (
            <div className="people-workload-row" data-workload-source-state="ok" key={text(row.employee_id)}>
              <strong>{employeeLabel(row)}</strong>
              <div className="people-workload-measure">
                <span>시간 확정</span>
                <i><b style={{ width: `${(integer(row.confirmed_minutes) / maxMinutes) * 100}%` }} /></i>
                <em>{formatMinutes(row.confirmed_minutes)}</em>
              </div>
              <div className="people-workload-measure">
                <span>시간 미정</span>
                <i><b style={{ width: `${(integer(row.time_unspecified_estimated_minutes) / maxMinutes) * 100}%` }} /></i>
                <em>{formatMinutes(row.time_unspecified_estimated_minutes)}</em>
              </div>
              <span className="people-workload-unknown">예상시간 없음 {integer(row.no_estimate_task_count)}건</span>
            </div>
          );
        })}
      </div>
      <CapacityToday envelope={envelope} capacity={capacity} timezone={timezone} />
    </>
  );
}

function capacityStatus(row: UnknownRecord): string {
  const state = text(row.state);
  if (state === "schedule_required") return "근로시간 확인 필요";
  if (state === "source_required") return "휴가 정보 확인 필요";
  if (state === "overbooked") return `${formatMinutes(row.overbooked_minutes)} 예정 초과`;
  if (state === "fully_booked") return "남은 시간 없음";
  return `${formatMinutes(row.remaining_minutes)} 남음`;
}

function CapacityEvidenceList({
  title,
  evidence,
  timezone,
}: {
  title: string;
  evidence: UnknownRecord[];
  timezone: string;
}) {
  return (
    <div>
      <strong>{title}</strong>
      {evidence.length === 0 ? (
        <span>반영된 항목 없음</span>
      ) : (
        <ul>
          {evidence.map((item, index) => (
            <li key={`${text(item.source_ref ?? item.leave_interval_ref, String(index))}:${text(item.starts_at)}`}>
              <span>{text(item.title, title)}</span>
              <time>{clockTime(item.starts_at, timezone)}–{clockTime(item.ends_at, timezone)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapacityToday({
  envelope,
  capacity,
  timezone,
}: {
  envelope: UnknownRecord;
  capacity: unknown;
  timezone: string;
}) {
  if (!capacity || typeof capacity !== "object") return null;
  const capacityRecord = record(capacity);
  const capacityRows = rows(capacityRecord.rows);
  return (
    <section className="people-capacity" data-people-capacity="true">
      <header>
        <div>
          <strong>오늘 남은 시간</strong>
          <span>근무 기준에서 시간표와 승인 휴가가 차지한 시간을 뺀 값입니다.</span>
        </div>
        <time>{text(capacityRecord.date)}</time>
      </header>
      <SourceStatus envelope={envelope} sources={["hrx", "matter", "outlook", "leave"]} />
      <div className="people-capacity-list">
        {capacityRows.map((row) => {
          const evidence = record(row.evidence);
          const hasCalculation = Number.isInteger(row.scheduled_minutes);
          return (
            <details className="people-capacity-row" data-capacity-state={text(row.state)} key={text(row.employee_id)}>
              <summary>
                <strong>{employeeLabel(row)}</strong>
                {hasCalculation ? (
                  <span>
                    근무 {formatMinutes(row.scheduled_minutes)}
                    {" / "}일정 {formatMinutes(row.calendar_reserved_minutes)}
                    {" / "}휴가 {formatMinutes(row.approved_leave_minutes)}
                  </span>
                ) : <span>계산 기준을 먼저 확인해 주세요.</span>}
                <em>{capacityStatus(row)}</em>
              </summary>
              {hasCalculation && (
                <div className="people-capacity-detail">
                  <dl>
                    <div><dt>근무 기준</dt><dd>{formatMinutes(row.scheduled_minutes)}</dd></div>
                    <div><dt>일정·휴가 합계</dt><dd>{formatMinutes(row.occupied_minutes)}</dd></div>
                    <div><dt>남은 시간</dt><dd>{integer(row.remaining_minutes) < 0 ? `-${formatMinutes(Math.abs(integer(row.remaining_minutes)))}` : formatMinutes(row.remaining_minutes)}</dd></div>
                  </dl>
                  {integer(row.calendar_leave_overlap_minutes) > 0 && (
                    <p>일정과 휴가가 겹친 {formatMinutes(row.calendar_leave_overlap_minutes)}은 한 번만 뺐습니다.</p>
                  )}
                  <div className="people-capacity-evidence">
                    <CapacityEvidenceList title="시간표" evidence={rows(evidence.calendar)} timezone={timezone} />
                    <CapacityEvidenceList title="승인 휴가" evidence={rows(evidence.leave)} timezone={timezone} />
                  </div>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

function attentionReason(reason: string): string {
  if (reason === "court_hearing") return "재판기일";
  if (reason === "deadline") return "기한";
  if (reason === "assignee_required") return "담당자 지정 필요";
  if (reason.startsWith("schedule_conflict:")) return "일정 겹침";
  if (reason.startsWith("approved_leave_conflict:")) return "휴가 일정 겹침";
  return "확인 필요";
}

function AttentionWindow({
  envelope,
  attention,
  timezone,
  onNavigate,
}: {
  envelope: UnknownRecord;
  attention: unknown;
  timezone: string;
  onNavigate?: Navigate;
}) {
  if (!attention || typeof attention !== "object") return <BlockUnavailable envelope={envelope} />;
  const attentionItems = rows(record(attention).items);
  return (
    <>
      <SourceStatus envelope={envelope} sources={["matter"]} />
      {attentionItems.length === 0 ? (
        <p className="people-overview-empty">앞으로 14일 안에 별도 확인이 필요한 일정이 없습니다.</p>
      ) : (
        <ol className="people-attention-list">
          {attentionItems.map((item) => (
            <li key={text(item.attention_id)}>
              <button type="button" onClick={() => openDestination(item.destination, onNavigate)} disabled={!onNavigate}>
                <time dateTime={text(item.starts_at)}>{dateTime(item.starts_at, timezone)}</time>
                <strong>{text(item.title, "일정 확인")}</strong>
                <span>{rowMatterLabel(item)}</span>
                <em>{Array.isArray(item.reasons) ? [...new Set(item.reasons.map((reason) => attentionReason(String(reason))))].join(", ") : "확인 필요"}</em>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function DeadlineStaffing({
  envelope,
  staffing,
  timezone,
  onNavigate,
}: {
  envelope: UnknownRecord;
  staffing: unknown;
  timezone: string;
  onNavigate?: Navigate;
}) {
  if (!staffing || typeof staffing !== "object") return <BlockUnavailable envelope={envelope} />;
  const staffingItems = rows(record(staffing).items);
  return (
    <>
      <SourceStatus envelope={envelope} sources={["matter"]} />
      {staffingItems.length === 0 ? (
        <p className="people-overview-empty">앞으로 14일 안에 예정된 재판기일이나 기한이 없습니다.</p>
      ) : (
        <div className="data-table-wrap people-staffing-table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">일시</th>
                <th scope="col">사건</th>
                <th scope="col">일정</th>
                <th scope="col">담당</th>
                <th scope="col"><span className="sr-only">열기</span></th>
              </tr>
            </thead>
            <tbody>
              {staffingItems.map((item) => {
                const attorneyNames = rows(item.attorneys).map((attorney) => employeeLabel(attorney, "")).filter(Boolean);
                return (
                  <tr key={text(item.staffing_id)} data-staffing-state={text(item.staffing_state)}>
                    <td>{dateTime(item.starts_at, timezone)}</td>
                    <td><strong>{rowMatterLabel(item)}</strong></td>
                    <td>{text(item.title, "일정")}</td>
                    <td>
                      <strong>{text(item.staffing_label, "담당 확인 필요")}</strong>
                      {attorneyNames.length > 0 && <small>{attorneyNames.join(", ")}</small>}
                    </td>
                    <td>
                      <button type="button" className="text-button" onClick={() => openDestination(item.destination, onNavigate)} disabled={!onNavigate}>
                        사건 열기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function OverallState({ result }: { result: OverviewResult }) {
  if (result.kind === "loading") {
    return (
      <div className="live-data-state" data-people-overview-state="loading" role="status">
        <strong>팀 현황을 불러오는 중입니다</strong>
        오늘 일정과 사건 업무를 확인하고 있습니다.
      </div>
    );
  }
  if (result.kind === "error") {
    const denied = result.status === 403;
    return (
      <div className={`live-data-state ${denied ? "live-data-denied" : "live-data-error"}`} data-people-overview-state={denied ? "denied" : "error"} role="alert">
        <strong>{denied ? "팀 현황을 볼 권한이 없습니다" : "팀 현황을 불러오지 못했습니다"}</strong>
        {denied ? "구성원 정보 열람 권한을 확인해 주세요." : "연결 상태를 확인한 뒤 다시 시도해 주세요."}
      </div>
    );
  }
  return null;
}

export function PeopleOverview({
  refreshKey = 0,
  onSelectEmployee,
  onNavigate,
}: {
  refreshKey?: number;
  onSelectEmployee: (employeeId: string) => void;
  onNavigate?: Navigate;
}) {
  const [result, setResult] = useState<OverviewResult>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setResult({ kind: "loading" });
    fetchPeopleTeamOperations().then((next) => {
      if (!cancelled) setResult(next as OverviewResult);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (result.kind !== "data") return <OverallState result={result} />;

  const envelope = record(result.envelope);
  const data = record(envelope.data);
  const teamMembers = rows(data.team_members);
  const timezone = text(envelope.timezone, "Asia/Seoul");
  const overallState = text(envelope.state, "partial");
  const empty = integer(data.member_count) === 0;
  if (empty) {
    return (
      <div className="live-data-state" data-people-overview-state="empty" role="status">
        <strong>표시할 구성원이 없습니다</strong>
        활성 상태의 구성원이 등록되면 오늘 현황이 표시됩니다.
        <SourceStatus envelope={envelope} sources={["hrx", "matter"]} />
      </div>
    );
  }

  return (
    <section className="people-operations-overview" data-people-overview-state={overallState}>
      <header className="people-overview-heading">
        <div>
          <span className="eyebrow">오늘의 운영</span>
          <h2>팀 현황</h2>
          <p>{dateTime(envelope.as_of, timezone)} 기준 / 활성 구성원 {integer(data.member_count)}명</p>
        </div>
        <div className="people-overview-overall-state" data-state={overallState}>
          {SOURCE_STATE_LABELS[overallState] ?? "확인 필요"}
        </div>
      </header>

      <Panel id="people-action-queues" title="오늘 처리 목록" meta="4개 목록" className="people-overview-panel people-overview-panel-wide">
        <ActionQueues
          envelope={envelope}
          queues={data.action_queues}
          timezone={timezone}
          onNavigate={onNavigate}
          onSelectEmployee={onSelectEmployee}
        />
      </Panel>

      <Panel id="people-intraday-timeline" title="구성원별 오늘 시간표" meta="분 단위" className="people-overview-panel people-overview-panel-wide">
        <IntradayTimeline envelope={envelope} teamMembers={teamMembers} timezone={timezone} onSelectEmployee={onSelectEmployee} />
      </Panel>

      <Panel id="people-workload-stage-one" title={data.people_capacity ? "업무량과 오늘 남은 시간" : "이번 주 업무량"} meta="분 단위" className="people-overview-panel">
        <WorkloadStageOne envelope={envelope} workload={data.workload_stage1} capacity={data.people_capacity} timezone={timezone} />
      </Panel>

      <Panel id="people-attention-window" title="앞으로 14일 확인 일정" className="people-overview-panel">
        <AttentionWindow envelope={envelope} attention={data.attention_window} timezone={timezone} onNavigate={onNavigate} />
      </Panel>

      <Panel id="people-deadline-staffing" title="기일·기한 담당 현황" meta="앞으로 14일" className="people-overview-panel people-overview-panel-wide">
        <DeadlineStaffing envelope={envelope} staffing={data.deadline_staffing} timezone={timezone} onNavigate={onNavigate} />
      </Panel>
    </section>
  );
}
