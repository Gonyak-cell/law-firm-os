import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  isoToLocalDateTime,
  localDateTimeToIso,
} from "../src/outlook-task-datetime.js";

test("local task due datetime becomes a canonical instant and round-trips", () => {
  const local = "2026-08-12T09:30";
  const iso = localDateTimeToIso(local);
  assert.match(iso, /^2026-08-12T[0-9]{2}:[0-9]{2}:00\.000Z$/u);
  assert.equal(isoToLocalDateTime(iso), local);
});

test("empty task due values map to the request and input empty values", () => {
  assert.equal(localDateTimeToIso(""), null);
  assert.equal(localDateTimeToIso(null), null);
  assert.equal(isoToLocalDateTime(""), "");
  assert.equal(isoToLocalDateTime(null), "");
});

test("local task due datetime rejects invalid civil, control, and noncanonical values", () => {
  for (const value of [
    "2026-02-30T09:30",
    "2026-08-12T24:00",
    "2026-08-12T09:60",
    "2026-08-12T09:30:00",
    "2026-8-12T09:30",
    "2026-08-12 09:30",
    "2026-08-12T09:30\u0000",
  ]) {
    assert.throws(() => localDateTimeToIso(value), TypeError, value);
  }
});

test("server offset and Z values render in the host local timezone", () => {
  const moduleUrl = JSON.stringify(new URL("../src/outlook-task-datetime.js", import.meta.url).href);
  for (const [timezone, expected] of [
    ["UTC", "2026-08-12T00:30"],
    ["Asia/Seoul", "2026-08-12T09:30"],
  ]) {
    const source = `
      import assert from "node:assert/strict";
      import { isoToLocalDateTime } from ${moduleUrl};
      assert.equal(isoToLocalDateTime("2026-08-12T09:30:00+09:00"), ${JSON.stringify(expected)});
      assert.equal(isoToLocalDateTime("2026-08-12T00:30:00.000Z"), ${JSON.stringify(expected)});
    `;
    execFileSync(process.execPath, ["--input-type=module", "--eval", source], {
      env: { ...process.env, TZ: timezone },
      stdio: "pipe",
    });
  }
});

test("invalid server values fail closed", () => {
  for (const value of [
    "2026-02-30T09:30:00Z",
    "2026-08-12T24:00:00Z",
    "2026-08-12T09:30",
    "2026-08-12",
    "not-a-date",
    "2026-08-12T09:30:00Z\u0000",
    42,
  ]) {
    assert.equal(isoToLocalDateTime(value), "", value);
  }
});

test("DST spring-forward gaps reject normalized civil times", () => {
  const source = `
    import assert from "node:assert/strict";
    import { localDateTimeToIso } from ${JSON.stringify(new URL("../src/outlook-task-datetime.js", import.meta.url).href)};
    assert.equal(localDateTimeToIso("2026-03-08T01:30"), "2026-03-08T06:30:00.000Z");
    assert.throws(() => localDateTimeToIso("2026-03-08T02:30"), TypeError);
  `;
  execFileSync(process.execPath, ["--input-type=module", "--eval", source], {
    env: { ...process.env, TZ: "America/New_York" },
    stdio: "pipe",
  });
});
