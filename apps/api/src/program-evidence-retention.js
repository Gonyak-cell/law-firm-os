export const LAWOS_PROGRAM_EVIDENCE_MINIMUM_RETENTION_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVAL_BUFFER_DAYS = 30;

export function programEvidenceRetainUntil({
  approvalExpiresAt,
  now = Date.now(),
} = {}) {
  const expiresAt = Date.parse(approvalExpiresAt ?? "");
  if (!Number.isFinite(now)
    || !Number.isFinite(expiresAt)
    || expiresAt <= now) {
    throw new TypeError(
      "program evidence retention requires an unexpired approval",
    );
  }
  return new Date(Math.max(
    now + LAWOS_PROGRAM_EVIDENCE_MINIMUM_RETENTION_DAYS * DAY_MS,
    expiresAt + APPROVAL_BUFFER_DAYS * DAY_MS,
  ));
}
