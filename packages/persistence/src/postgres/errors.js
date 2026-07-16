const RETRYABLE_POSTGRES_CODES = new Set(["40001", "40P01"]);

export class PostgresOperationError extends Error {
  constructor({ code = "LAWOS_POSTGRES_OPERATION_FAILED", safeErrorCode = "POSTGRES_OPERATION_FAILED", status = 503, retryable = false, postgresCode = null } = {}) {
    super("PostgreSQL operation failed");
    this.name = "PostgresOperationError";
    this.code = code;
    this.safe_error_code = safeErrorCode;
    this.status = status;
    this.retryable = retryable;
    this.postgres_code = postgresCode;
  }
}

export function isRetryablePostgresError(error) {
  return RETRYABLE_POSTGRES_CODES.has(error?.code);
}

export function sanitizePostgresError(error) {
  if (error?.code?.startsWith?.("LAWOS_")) return error;
  if (!error?.code) return error;
  if (error?.code === "23505") {
    return new PostgresOperationError({
      code: "LAWOS_POSTGRES_CONFLICT",
      safeErrorCode: "POSTGRES_UNIQUE_CONFLICT",
      status: 409,
      postgresCode: error.code,
    });
  }
  if (error?.code === "42501") {
    return new PostgresOperationError({
      code: "LAWOS_POSTGRES_ACCESS_DENIED",
      safeErrorCode: "POSTGRES_ACCESS_DENIED",
      status: 403,
      postgresCode: error.code,
    });
  }
  if (isRetryablePostgresError(error)) {
    return new PostgresOperationError({
      code: "LAWOS_POSTGRES_RETRY_EXHAUSTED",
      safeErrorCode: "POSTGRES_TRANSACTION_RETRY_EXHAUSTED",
      status: 503,
      retryable: true,
      postgresCode: error.code,
    });
  }
  return new PostgresOperationError({ postgresCode: error?.code ?? null });
}
