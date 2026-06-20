import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createJournalEntry({ repository, journal_entry, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(journal_entry, "tenant_id");
  requiredString(journal_entry, "source_ref");
  if (!Array.isArray(journal_entry.lines) || journal_entry.lines.length < 2) throw new Error("journal entry requires balanced lines");
  const debit = journal_entry.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const credit = journal_entry.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
  if (Math.abs(debit - credit) > 0.001) throw new Error("journal entry is not balanced");
  const replay = repository.getIdempotency({ tenant_id: journal_entry.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...journal_entry,
      model_type: "JournalEntry",
      status: "posted",
      posted_at: journal_entry.posted_at ?? new Date().toISOString(),
      posts_gl_entries: true,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "journal.entry.post",
        object_type: "JournalEntry",
        object_id: record.journal_entry_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", journal_entry: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "journal_entry_post", response });
    return response;
  });
}
