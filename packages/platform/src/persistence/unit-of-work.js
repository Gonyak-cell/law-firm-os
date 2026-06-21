export function runUnitOfWork({ repositories = [], work } = {}) {
  if (typeof work !== "function") throw new TypeError("work function is required");
  const snapshots = repositories.map((repository) => ({
    repository,
    snapshot: typeof repository.snapshot === "function" ? repository.snapshot() : null,
  }));
  try {
    return work();
  } catch (error) {
    for (const item of snapshots.reverse()) {
      if (item.snapshot && typeof item.repository.restore === "function") item.repository.restore(item.snapshot);
    }
    throw error;
  }
}
