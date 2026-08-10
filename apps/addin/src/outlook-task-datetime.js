const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u;
const SERVER_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u;

function civilParts(match, count = 5) {
  return match.slice(1, count + 1).map(Number);
}

function validCivilDate(year, month, day, hour, minute, second = 0) {
  if (
    month < 1 || month > 12
    || day < 1 || day > 31
    || hour < 0 || hour > 23
    || minute < 0 || minute > 59
    || second < 0 || second > 59
  ) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second;
}

function invalidLocalDateTime() {
  throw new TypeError("Outlook task due datetime is invalid");
}

export function localDateTimeToIso(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") invalidLocalDateTime();
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) invalidLocalDateTime();
  const [year, month, day, hour, minute] = civilParts(match);
  if (!validCivilDate(year, month, day, hour, minute)) invalidLocalDateTime();
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
  ) invalidLocalDateTime();
  return date.toISOString();
}

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  if (year < 0 || year > 9999) return "";
  return `${String(year).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function isoToLocalDateTime(value) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return "";
  const match = SERVER_ISO_PATTERN.exec(value);
  if (!match) return "";
  const [year, month, day, hour, minute, second] = civilParts(match, 6);
  if (!validCivilDate(year, month, day, hour, minute, second)) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return formatLocalDateTime(new Date(timestamp));
}
