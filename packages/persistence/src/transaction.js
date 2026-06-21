export function runPersistenceTransaction(connection, callback) {
  if (!connection || typeof connection.transaction !== "function") {
    throw new TypeError("Runtime Spine persistence connection with transaction support is required");
  }
  if (typeof callback !== "function") {
    throw new TypeError("transaction callback is required");
  }
  return connection.transaction(callback);
}
