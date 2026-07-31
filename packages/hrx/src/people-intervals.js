const OFFSET_TIMESTAMP = /(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validTimezone(timezone) {
  if (typeof timezone !== "string" || !timezone.trim()) throw new TypeError("timezone is required");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch {
    throw new TypeError("timezone must be a valid IANA timezone");
  }
  return timezone;
}

function datePartsAt(timestampMs, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function offsetAt(timestampMs, timezone) {
  const parts = datePartsAt(timestampMs, timezone);
  const wallAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallAsUtc - Math.floor(timestampMs / 1000) * 1000;
}

function localMidnightUtc(date, timezone) {
  if (!DATE_KEY.test(date)) throw new TypeError("date must be YYYY-MM-DD");
  const [year, month, day] = date.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day);
  let instant = wall - offsetAt(wall, timezone);
  instant = wall - offsetAt(instant, timezone);
  const parts = datePartsAt(instant, timezone);
  if (
    Number(parts.year) !== year
    || Number(parts.month) !== month
    || Number(parts.day) !== day
    || Number(parts.hour) !== 0
    || Number(parts.minute) !== 0
  ) {
    throw new RangeError(`local midnight does not exist for ${date} in ${timezone}`);
  }
  return instant;
}

export function peopleLocalTimeIso(date, time, timezone = "Asia/Seoul") {
  const zone = validTimezone(timezone);
  if (!DATE_KEY.test(date)) throw new TypeError("date must be YYYY-MM-DD");
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time ?? "");
  if (!match) throw new TypeError("time must be HH:mm");
  const [year, month, day] = date.split("-").map(Number);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wall - offsetAt(wall, zone);
  instant = wall - offsetAt(instant, zone);
  const parts = datePartsAt(instant, zone);
  if (
    Number(parts.year) !== year
    || Number(parts.month) !== month
    || Number(parts.day) !== day
    || Number(parts.hour) !== hour
    || Number(parts.minute) !== minute
  ) {
    throw new RangeError(`local time does not exist for ${date} ${time} in ${zone}`);
  }
  return new Date(instant).toISOString();
}

function nextDateKey(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function peopleLocalDateKey(value, timezone = "Asia/Seoul") {
  const zone = validTimezone(timezone);
  const timestampMs = timestamp(value, "value");
  const parts = datePartsAt(timestampMs, zone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function peopleDateKeyPlusDays(date, days) {
  if (!DATE_KEY.test(date)) throw new TypeError("date must be YYYY-MM-DD");
  if (!Number.isInteger(days)) throw new TypeError("days must be an integer");
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function timestamp(value, field) {
  if (typeof value !== "string" || !OFFSET_TIMESTAMP.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO timestamp with an explicit UTC offset`);
  }
  return Date.parse(value);
}

function minuteFloor(timestampMs) {
  return Math.floor(timestampMs / 60000);
}

function minuteCeil(timestampMs) {
  return Math.ceil(timestampMs / 60000);
}

function freezeInterval(startMinute, endMinute, source = null) {
  return Object.freeze({
    start_minute: startMinute,
    end_minute: endMinute,
    duration_minutes: endMinute - startMinute,
    source,
  });
}

export function peopleDayBounds({ date, timezone = "Asia/Seoul" } = {}) {
  const zone = validTimezone(timezone);
  const startMs = localMidnightUtc(date, zone);
  const endMs = localMidnightUtc(nextDateKey(date), zone);
  return Object.freeze({
    date,
    timezone: zone,
    start_at: new Date(startMs).toISOString(),
    end_at: new Date(endMs).toISOString(),
    start_minute: minuteFloor(startMs),
    end_minute: minuteFloor(endMs),
    duration_minutes: Math.round((endMs - startMs) / 60000),
  });
}

export function normalizePeopleInterval(interval, {
  date,
  timezone = "Asia/Seoul",
} = {}) {
  if (!interval || typeof interval !== "object" || Array.isArray(interval)) {
    throw new TypeError("interval must be an object");
  }
  if (interval.status === "cancelled") return null;
  const bounds = peopleDayBounds({ date, timezone });
  let startMs;
  let endMs;
  if (interval.all_day === true) {
    const startDate = interval.start_date ?? interval.starts_at;
    const endDate = interval.end_date ?? interval.ends_at ?? nextDateKey(startDate);
    if (!DATE_KEY.test(startDate) || !DATE_KEY.test(endDate)) {
      throw new TypeError("all-day interval dates must be YYYY-MM-DD");
    }
    startMs = localMidnightUtc(startDate, bounds.timezone);
    endMs = localMidnightUtc(endDate, bounds.timezone);
  } else {
    startMs = timestamp(interval.starts_at, "starts_at");
    endMs = timestamp(interval.ends_at, "ends_at");
  }
  if (endMs < startMs) throw new RangeError("interval ends_at must be on or after starts_at");
  if (endMs === startMs) return null;
  const clippedStart = Math.max(startMs, Date.parse(bounds.start_at));
  const clippedEnd = Math.min(endMs, Date.parse(bounds.end_at));
  if (clippedEnd <= clippedStart) return null;
  return freezeInterval(
    minuteFloor(clippedStart),
    minuteCeil(clippedEnd),
    interval.source ?? interval.kind ?? null,
  );
}

export function unionPeopleIntervals(intervals = []) {
  const rows = (Array.isArray(intervals) ? intervals : [])
    .filter(Boolean)
    .map((interval) => {
      if (!Number.isInteger(interval.start_minute) || !Number.isInteger(interval.end_minute)) {
        throw new TypeError("normalized intervals require integer minute boundaries");
      }
      if (interval.end_minute < interval.start_minute) throw new RangeError("interval minute range is reversed");
      return { start_minute: interval.start_minute, end_minute: interval.end_minute };
    })
    .filter(({ start_minute: start, end_minute: end }) => end > start)
    .sort((left, right) => left.start_minute - right.start_minute || left.end_minute - right.end_minute);
  const merged = [];
  for (const row of rows) {
    const previous = merged[merged.length - 1];
    if (!previous || row.start_minute > previous.end_minute) {
      merged.push({ ...row });
    } else {
      previous.end_minute = Math.max(previous.end_minute, row.end_minute);
    }
  }
  return Object.freeze(merged.map(({ start_minute: start, end_minute: end }) => freezeInterval(start, end)));
}

export function peopleIntervalOverlapMinutes(left, right) {
  if (!left || !right) return 0;
  return Math.max(
    0,
    Math.min(left.end_minute, right.end_minute) - Math.max(left.start_minute, right.start_minute),
  );
}

export function peopleIntervalTotalMinutes(intervals = []) {
  return unionPeopleIntervals(intervals)
    .reduce((total, { duration_minutes: minutes }) => total + minutes, 0);
}

export function peopleIntervalLayout(interval, {
  range_start_minute,
  range_end_minute,
} = {}) {
  if (!Number.isInteger(range_start_minute) || !Number.isInteger(range_end_minute)) {
    throw new TypeError("layout range requires integer minute boundaries");
  }
  if (range_end_minute <= range_start_minute) throw new RangeError("layout range must have positive duration");
  const start = Math.max(interval.start_minute, range_start_minute);
  const end = Math.min(interval.end_minute, range_end_minute);
  if (end <= start) return null;
  const range = range_end_minute - range_start_minute;
  return Object.freeze({
    offset_minutes: start - range_start_minute,
    duration_minutes: end - start,
    top_percent: ((start - range_start_minute) / range) * 100,
    height_percent: ((end - start) / range) * 100,
  });
}
