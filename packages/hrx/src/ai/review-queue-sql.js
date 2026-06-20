import { createHrxAiReviewItem } from "./review-queue.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function serializeReviewItem(item) {
  const { source_refs: sourceRefs, ...rest } = item;
  return {
    ...rest,
    source_refs_json: JSON.stringify(sourceRefs ?? []),
  };
}

function rowToReviewItem(row) {
  if (!row) return undefined;
  return createHrxAiReviewItem({
    tenant_id: row.tenant_id,
    review_id: row.review_id,
    interaction_id: row.interaction_id,
    state: row.state,
    risk_level: row.risk_level,
    reason: row.reason,
    answer_status: row.answer_status,
    decision_domain: row.decision_domain,
    source_refs: JSON.parse(row.source_refs_json ?? "[]"),
    created_by: row.created_by,
    resolved_by: row.resolved_by,
  });
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createSqlHrxAiReviewQueue({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL HRX AI review queue requires store.query");

  return Object.freeze({
    enqueue(input) {
      const item = createHrxAiReviewItem(input);
      const now = clock();
      return rowToReviewItem(
        store.query("insert", {
          table: "hrx_ai_review_items",
          row: {
            ...serializeReviewItem(item),
            created_at: now,
            updated_at: now,
          },
        }),
      );
    },
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.state) where.state = query.state;
      return Object.freeze(
        store
          .query("select", { table: "hrx_ai_review_items", where })
          .map((row) => rowToReviewItem(clone(row))),
      );
    },
    resolve(ref = {}, input = {}) {
      const current = store.query("selectOne", {
        table: "hrx_ai_review_items",
        where: { tenant_id: ref.tenant_id, review_id: ref.review_id },
      });
      if (!current) throw new Error("HRX_AI_REVIEW_NOT_FOUND");
      const currentItem = rowToReviewItem(current);
      if (currentItem.state !== "pending_review") throw new TypeError("AI review item must be pending_review before resolution");
      const next = createHrxAiReviewItem({
        ...currentItem,
        state: requiredString(input, "state"),
        resolved_by: requiredString(input, "resolved_by"),
      });
      return rowToReviewItem(
        store.query("updateOne", {
          table: "hrx_ai_review_items",
          where: { tenant_id: next.tenant_id, review_id: next.review_id },
          patch: {
            ...serializeReviewItem(next),
            updated_at: clock(),
          },
        }),
      );
    },
  });
}
