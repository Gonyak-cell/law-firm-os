export async function runBehindAdvisoryBarrier({
  adminPool,
  calls,
  lockKey,
  queryNeedle,
  settled = false,
  beforeRelease,
}) {
  if (!Array.isArray(calls) || calls.length < 1) {
    throw new TypeError("at least one concurrent call is required");
  }
  if (beforeRelease !== undefined && typeof beforeRelease !== "function") {
    throw new TypeError("beforeRelease must be a function");
  }
  const blocker = await adminPool.connect();
  let transactionOpen = false;
  const pending = [];
  try {
    await blocker.query("BEGIN");
    transactionOpen = true;
    await blocker.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      [lockKey],
    );
    pending.push(...calls.map((call) => Promise.resolve().then(call).then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error }),
    )));
    let waiterCount = 0;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await blocker.query("SELECT pg_stat_clear_snapshot()");
      waiterCount = Number((await blocker.query(
        `SELECT count(*)::int AS count
           FROM pg_stat_activity
          WHERE datname=current_database()
            AND pid<>pg_backend_pid()
            AND wait_event_type='Lock' AND wait_event='advisory'
            AND position($1 IN query)>0`,
        [queryNeedle],
      )).rows[0].count);
      if (waiterCount === calls.length) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (waiterCount !== calls.length) {
      const activity = (await blocker.query(
        `SELECT usename,wait_event_type,wait_event,left(query,200) AS query
           FROM pg_stat_activity
          WHERE datname=current_database() AND pid<>pg_backend_pid()
          ORDER BY pid`,
      )).rows;
      throw new Error(
        `expected ${calls.length} advisory waiters, observed ${waiterCount}: ${JSON.stringify(activity)}`,
      );
    }
    await beforeRelease?.({ blocker, waiter_count: waiterCount });
    await blocker.query("COMMIT");
    transactionOpen = false;
    const outcomes = await Promise.all(pending);
    if (settled) {
      return Object.freeze({
        waiter_count: waiterCount,
        results: Object.freeze(outcomes.map((outcome) => outcome.ok
          ? Object.freeze({ status: "fulfilled", value: outcome.value })
          : Object.freeze({ status: "rejected", reason: outcome.error }))),
      });
    }
    const failed = outcomes.find(({ ok }) => !ok);
    if (failed) throw failed.error;
    return Object.freeze({
      waiter_count: waiterCount,
      values: Object.freeze(outcomes.map(({ value }) => value)),
    });
  } finally {
    if (transactionOpen) await blocker.query("ROLLBACK").catch(() => {});
    blocker.release();
    await Promise.all(pending).catch(() => {});
  }
}
