import { spawnSync as defaultSpawnSync } from "node:child_process";
import { AWS_READ_TIMEOUT_MS, READ_ONLY_AWS_OPERATIONS, requiredString } from "./outlook-production-aws-inventory-contract.mjs";

const GLOBAL_ARGS = Object.freeze(["--no-cli-pager", "--no-paginate", "--output", "json"]);
const AUTH_PATTERN = /(?:expiredtoken|expired token|sso.*expired|expired.*sso|token has expired|unable to locate credentials|unable to refresh|invalid.?grant|security token included in the request is invalid|the sso session associated)/iu;
const CODE_PATTERN = /\b(?:[A-Z][A-Za-z0-9]+Exception|AWS_[A-Z0-9_]+|AccessDenied|ThrottlingException|ResourceNotFoundException)\b/u;

export class AwsReadError extends Error {
  constructor(code, message = "AWS read failed", { service = null, operation = null } = {}) {
    super(message);
    this.name = "AwsReadError";
    this.code = code;
    this.service = service;
    this.operation = operation;
  }
}

export function isAwsAuthFailure(error) {
  const text = `${error?.message ?? ""}\n${error?.stderr ?? ""}\n${error?.stdout ?? ""}`;
  return error?.code === "AWS_SSO_SESSION_EXPIRED" || error?.code === "AWS_AUTH_FAILURE" || AUTH_PATTERN.test(text);
}

export function assertReadOnlyOperation(service, operation) {
  if (!READ_ONLY_AWS_OPERATIONS.has(`${service}:${operation}`)) {
    throw new AwsReadError("AWS_NON_READ_ONLY_OPERATION", `AWS operation ${service}:${operation} is not allowlisted for read-only inventory`, { service, operation });
  }
}

function failureCode(result, service, operation) {
  const text = `${result?.stderr ?? ""}\n${result?.stdout ?? ""}`;
  if (AUTH_PATTERN.test(text)) return "AWS_SSO_SESSION_EXPIRED";
  const match = text.match(CODE_PATTERN)?.[0];
  if (match === "ResourceNotFoundException") return "AWS_RESOURCE_NOT_FOUND";
  if (match === "AccessDeniedException" || match === "AccessDenied") return "AWS_ACCESS_DENIED";
  return match ?? "AWS_READ_FAILED";
}

export function createAwsCliExecutor({ spawnSync: injectedSpawnSync, spawnSyncImpl, env = process.env } = {}) {
  const spawnSync = injectedSpawnSync ?? spawnSyncImpl ?? defaultSpawnSync;
  return async ({ service, operation, args = [], profile, region }) => {
    assertReadOnlyOperation(service, operation);
    const explicitProfile = requiredString(profile, "profile");
    const explicitRegion = requiredString(region, "region");
    const commandArgs = [service, operation, ...args, "--profile", explicitProfile, "--region", explicitRegion, ...GLOBAL_ARGS];
    let result;
    try {
      result = spawnSync("aws", commandArgs, {
        encoding: "utf8",
        env: { ...env, AWS_CLI_AUTO_PROMPT: "off", AWS_PAGER: "" },
        maxBuffer: 32 * 1024 * 1024,
        timeout: AWS_READ_TIMEOUT_MS,
        killSignal: "SIGKILL",
      });
    } catch (error) {
      throw new AwsReadError("AWS_CLI_UNAVAILABLE", "AWS CLI execution failed", { service, operation, cause: error });
    }
    if (result?.error?.code === "ETIMEDOUT" || result?.signal === "SIGKILL") throw new AwsReadError("AWS_READ_TIMEOUT", "AWS read command timed out", { service, operation });
    if (result?.error) throw new AwsReadError("AWS_CLI_UNAVAILABLE", "AWS CLI execution failed", { service, operation });
    if (result?.status !== 0) throw new AwsReadError(failureCode(result, service, operation), "AWS read command failed", { service, operation });
    const stdout = typeof result?.stdout === "string" ? result.stdout.trim() : "";
    if (!stdout) return {};
    try {
      return JSON.parse(stdout);
    } catch (error) {
      throw new AwsReadError("AWS_RESPONSE_INVALID", "AWS response was not JSON", { service, operation, cause: error });
    }
  };
}

export async function readOnlyCall(execute, request, calls) {
  assertReadOnlyOperation(request.service, request.operation);
  calls.push({ service: request.service, operation: request.operation, target: request.target ?? null });
  try {
    return { ok: true, value: await execute(request) };
  } catch (error) {
    if (isAwsAuthFailure(error)) {
      const blocked = new AwsReadError("AWS_SSO_SESSION_EXPIRED", "AWS authentication could not be resolved", request);
      throw blocked;
    }
    const candidate = typeof error?.code === "string" ? error.code : "";
    const safeCandidate = /^(?:AWS|E)[A-Z0-9_]+$|^[A-Z][A-Za-z0-9]*Exception$/u.test(candidate) ? candidate : null;
    const errorCode = safeCandidate === "ResourceNotFoundException" ? "AWS_RESOURCE_NOT_FOUND" : safeCandidate;
    return { ok: false, error_code: errorCode ?? "AWS_READ_FAILED" };
  }
}
