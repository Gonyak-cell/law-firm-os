import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePeopleInterval,
  peopleDayBounds,
  peopleIntervalLayout,
  peopleIntervalOverlapMinutes,
  peopleIntervalTotalMinutes,
  unionPeopleIntervals,
} from "../src/people-intervals.js";

const DATE = "2026-07-30";
const ZONE = "Asia/Seoul";

function interval(startsAt, endsAt, extra = {}) {
  return normalizePeopleInterval({
    starts_at: startsAt,
    ends_at: endsAt,
    ...extra,
  }, { date: DATE, timezone: ZONE });
}

test("Seoul tenant day boundaries are explicit and exactly 1,440 minutes", () => {
  assert.deepEqual(peopleDayBounds({ date: DATE, timezone: ZONE }), {
    date: DATE,
    timezone: ZONE,
    start_at: "2026-07-29T15:00:00.000Z",
    end_at: "2026-07-30T15:00:00.000Z",
    start_minute: 29755620,
    end_minute: 29757060,
    duration_minutes: 1440,
  });
});

test("10, 20, and 30 minute intervals retain one-minute precision", () => {
  const rows = [
    interval("2026-07-30T00:00:00.000Z", "2026-07-30T00:10:00.000Z"),
    interval("2026-07-30T01:00:00.000Z", "2026-07-30T01:20:00.000Z"),
    interval("2026-07-30T02:00:00.000Z", "2026-07-30T02:30:00.000Z"),
  ];
  assert.deepEqual(rows.map(({ duration_minutes }) => duration_minutes), [10, 20, 30]);
});

test("union and overlap avoid double-counting partial and complete overlap", () => {
  const first = interval("2026-07-30T00:00:00.000Z", "2026-07-30T01:00:00.000Z");
  const partial = interval("2026-07-30T00:30:00.000Z", "2026-07-30T01:30:00.000Z");
  const contained = interval("2026-07-30T00:40:00.000Z", "2026-07-30T00:50:00.000Z");
  assert.equal(peopleIntervalOverlapMinutes(first, partial), 30);
  assert.equal(peopleIntervalOverlapMinutes(first, contained), 10);
  assert.equal(peopleIntervalTotalMinutes([first, partial, contained]), 90);
  assert.deepEqual(
    unionPeopleIntervals([partial, contained, first]).map(({ duration_minutes }) => duration_minutes),
    [90],
  );
});

test("midnight crossing is clipped to the requested tenant day", () => {
  const clipped = interval("2026-07-29T14:50:00.000Z", "2026-07-29T15:20:00.000Z");
  assert.equal(clipped.duration_minutes, 20);
  assert.equal(clipped.start_minute, peopleDayBounds({ date: DATE, timezone: ZONE }).start_minute);
});

test("tenant-day overlap is half-open at both midnight boundaries", () => {
  assert.equal(interval("2026-07-29T14:00:00.000Z", "2026-07-29T15:00:00.000Z"), null);
  assert.equal(interval("2026-07-30T15:00:00.000Z", "2026-07-30T15:20:00.000Z"), null);

  const intoToday = interval("2026-07-29T12:50:00.000Z", "2026-07-29T22:20:00.000Z");
  const intoTomorrow = interval("2026-07-30T14:50:00.000Z", "2026-07-30T15:20:00.000Z");
  assert.equal(intoToday.duration_minutes, 440);
  assert.equal(intoTomorrow.duration_minutes, 10);
});

test("all-day and cancelled intervals have explicit behavior", () => {
  const allDay = normalizePeopleInterval({
    all_day: true,
    start_date: DATE,
    end_date: "2026-07-31",
  }, { date: DATE, timezone: ZONE });
  assert.equal(allDay.duration_minutes, 1440);
  assert.equal(interval("2026-07-30T00:00:00.000Z", "2026-07-30T01:00:00.000Z", { status: "cancelled" }), null);
});

test("seconds round outward to minute storage without losing occupied time", () => {
  const normalized = interval("2026-07-30T00:00:59.000Z", "2026-07-30T00:10:01.000Z");
  assert.equal(normalized.duration_minutes, 11);
});

test("ambiguous local timestamps, invalid zones, and reversed intervals fail closed", () => {
  assert.throws(
    () => interval("2026-07-30T09:00:00", "2026-07-30T10:00:00"),
    /explicit UTC offset/,
  );
  assert.throws(
    () => peopleDayBounds({ date: DATE, timezone: "Not/AZone" }),
    /valid IANA timezone/,
  );
  assert.throws(
    () => interval("2026-07-30T01:00:00.000Z", "2026-07-30T00:00:00.000Z"),
    /on or after/,
  );
});

test("DST day length is derived from the timezone instead of assumed to be 1,440", () => {
  const spring = peopleDayBounds({ date: "2026-03-08", timezone: "America/New_York" });
  const fall = peopleDayBounds({ date: "2026-11-01", timezone: "America/New_York" });
  assert.equal(spring.duration_minutes, 23 * 60);
  assert.equal(fall.duration_minutes, 25 * 60);
});

test("layout percentage uses exact minute offsets inside the visible range", () => {
  const normalized = interval("2026-07-30T00:10:00.000Z", "2026-07-30T00:30:00.000Z");
  const layout = peopleIntervalLayout(normalized, {
    range_start_minute: normalized.start_minute - 10,
    range_end_minute: normalized.start_minute + 50,
  });
  assert.equal(layout.offset_minutes, 10);
  assert.equal(layout.duration_minutes, 20);
  assert.ok(Math.abs(layout.top_percent - (100 / 6)) < 1e-10);
  assert.ok(Math.abs(layout.height_percent - (100 / 3)) < 1e-10);
});
