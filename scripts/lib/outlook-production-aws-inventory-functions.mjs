import {
  FUNCTION_METRICS,
} from "./outlook-production-aws-inventory-contract.mjs";
import { captureAuditorRollbackCode } from "./outlook-production-aws-inventory-secure-store.mjs";
import { validateFunctionResponsePair } from "./outlook-production-aws-inventory-function-boundary.mjs";
import {
  emptyFunctionRecord,
  projectDirectInvoke,
  projectFunction,
  projectLogs,
  projectMetric,
  projectTags,
} from "./outlook-production-aws-inventory-projection.mjs";

function errorProjection(code) {
  return { status: "ERROR", error_code: code, complete: false };
}

function functionRequest(name, operation, args = []) {
  return { service: "lambda", operation, args: ["--function-name", name, ...args], target: name };
}

function tagsRequest(name, arn) {
  return { service: "lambda", operation: "list-tags", args: ["--resource", arn], target: name };
}

function metricRequest({ namespace, metricName, dimensionName, dimensionValue, startTime, endTime }) {
  return ["--namespace", namespace, "--metric-name", metricName, "--dimensions", `Name=${dimensionName},Value=${dimensionValue}`, "--start-time", startTime, "--end-time", endTime, "--period", "300", "--statistics", "Sum"];
}

function firstFailure(current, code) {
  return current ?? code ?? null;
}

function concurrencyProjection(reservedResult, provisionedResult) {
  const reservedResponse = reservedResult.ok ? reservedResult.value : null;
  const provisionedResponse = provisionedResult.ok ? provisionedResult.value : null;
  const hasReserved = Boolean(reservedResponse && Object.prototype.hasOwnProperty.call(reservedResponse, "ReservedConcurrentExecutions"));
  const reserved = hasReserved ? reservedResponse.ReservedConcurrentExecutions : null;
  const provisioned = Array.isArray(provisionedResponse?.ProvisionedConcurrencyConfigs) ? provisionedResponse.ProvisionedConcurrencyConfigs : [];
  const malformedReserved = hasReserved && (!Number.isInteger(reserved) || reserved < 0);
  const malformedProvisioned = provisionedResult.ok && (!Array.isArray(provisionedResponse?.ProvisionedConcurrencyConfigs) || provisioned.some((entry) => !entry || typeof entry !== "object" || typeof entry.Qualifier !== "string" || !entry.Qualifier || !Number.isInteger(entry.RequestedProvisionedConcurrentExecutions) || entry.RequestedProvisionedConcurrentExecutions < 0));
  return { reserved: malformedReserved ? null : reserved, provisioned, malformed: malformedReserved || malformedProvisioned };
}

export async function collectFunctionRecords({ selected, run, expectedKeys, observedAt, lookbackMinutes, maxLogEvents, rollbackDir, download, note, repoRoot }) {
  const functionRecords = [];
  const now = Date.parse(observedAt);
  const startTime = new Date((Number.isFinite(now) ? now : Date.now()) - lookbackMinutes * 60_000).toISOString();
  const endTime = new Date(Number.isFinite(now) ? now : Date.now()).toISOString();
  for (const name of selected) {
    const getFunctionResult = await run(functionRequest(name, "get-function"));
    const configurationResult = await run(functionRequest(name, "get-function-configuration"));
    const concurrencyResult = await run(functionRequest(name, "get-function-concurrency"));
    const provisionedResult = await run(functionRequest(name, "list-provisioned-concurrency-configs"));
    const getFunction = getFunctionResult.ok ? getFunctionResult.value : {};
    const configuration = configurationResult.ok ? configurationResult.value : {};
    const responseBoundary = getFunctionResult.ok
      ? validateFunctionResponsePair({ name, getFunctionResponse: getFunction, configurationResponse: configuration, configurationError: configurationResult.ok ? null : configurationResult.error_code })
      : { error_code: getFunctionResult.error_code, configuration: {} };
    const getFunctionMalformed = responseBoundary.error_code === "AWS_RESPONSE_INVALID";
    const identityMalformed = responseBoundary.error_code === "AWS_FUNCTION_IDENTITY_INVALID";
    if (responseBoundary.error_code) note(responseBoundary.error_code);
    if (!getFunctionResult.ok) note(getFunctionResult.error_code);
    if (!configurationResult.ok && configurationResult.error_code !== "AWS_ACCESS_DENIED") note(configurationResult.error_code);
    if (!concurrencyResult.ok) note(concurrencyResult.error_code);
    if (!provisionedResult.ok) note(provisionedResult.error_code);
    if (provisionedResult.ok && provisionedResult.value?.NextMarker) note("AWS_PROVISIONED_CONCURRENCY_TRUNCATED");
    const directResult = await run(functionRequest(name, "get-function-url-config"));
    if (!directResult.ok && directResult.error_code !== "AWS_RESOURCE_NOT_FOUND") note(directResult.error_code);
    const arn = responseBoundary.error_code
      ? null
      : responseBoundary.configuration?.FunctionArn ?? responseBoundary.getFunction?.FunctionArn ?? null;
    const tagsResult = typeof arn === "string" && arn.length > 0
      ? await run(tagsRequest(name, arn))
      : { ok: false, error_code: "AWS_FUNCTION_ARN_UNAVAILABLE" };
    if (!tagsResult.ok) note(tagsResult.error_code);
    const logsResult = await run({ service: "logs", operation: "filter-log-events", args: ["--log-group-name", `/aws/lambda/${name}`, "--start-time", String(Date.parse(startTime)), "--end-time", String(Date.parse(endTime)), "--limit", String(maxLogEvents)], target: name });
    let logs;
    if (logsResult.ok) {
      try { logs = projectLogs(logsResult.value, null, maxLogEvents); } catch (error) { logs = errorProjection(error.message); }
    } else logs = projectLogs({}, logsResult.error_code, maxLogEvents);
    if (logs.status !== "PASS") note(logs.error_code ?? "AWS_LOGS_INCOMPLETE");
    const metrics = [];
    for (const metricName of FUNCTION_METRICS) {
      const metricResult = await run({ service: "cloudwatch", operation: "get-metric-statistics", args: metricRequest({ namespace: "AWS/Lambda", metricName, dimensionName: "FunctionName", dimensionValue: name, startTime, endTime }), target: name });
      const metric = projectMetric(metricName, metricResult.ok ? metricResult.value : null, metricResult.ok ? null : metricResult.error_code);
      metrics.push(metric);
      if (metric.status !== "PASS") note(metric.error_code);
    }
    const concurrency = concurrencyProjection(concurrencyResult, provisionedResult);
    if (concurrency.malformed) note("AWS_RESPONSE_INVALID");
    const expected = expectedKeys[name] ?? { expected_keys: [], logical_id: null, complete: false };
    const row = projectFunction({
      name,
      getFunctionResponse: responseBoundary.getFunction ?? {},
      configurationResponse: responseBoundary.configurationResponse ?? {},
      configurationError: configurationResult.ok ? null : configurationResult.error_code,
      expectedKeyInfo: expected,
      directInvoke: projectDirectInvoke(directResult.ok ? directResult.value : null, directResult.ok ? null : directResult.error_code, name),
      tags: projectTags(tagsResult.ok ? tagsResult.value : null, tagsResult.ok ? null : tagsResult.error_code),
      logs,
      metrics,
      reservedConcurrency: concurrency.reserved,
      provisionedConcurrency: concurrency.provisioned,
      rollbackCode: { status: "NOT_REQUESTED", error_code: null, path: null, manifest_path: null, bytes: null, zip_sha256: null, code_sha256_base64: null, matches_code_sha256: null },
      responseBoundaryError: responseBoundary.error_code,
      validatedResponseBoundary: responseBoundary,
    });
    if (row.status !== "PASS") note(row.error_code);
    if (row.direct_invoke.status === "ERROR") note(row.direct_invoke.error_code);
    if (row.tags.status !== "PASS") note(row.tags.error_code);
    if (name === "lawos-production-projection-auditor" && !responseBoundary.error_code) {
      row.rollback_code = await captureAuditorRollbackCode({ functionName: name, location: responseBoundary.code_location, codeSha256Base64: row.code.code_sha256_base64, rollbackDir, repoRoot, download });
      if (row.rollback_code.status !== "CAPTURED") note(row.rollback_code.error_code ?? row.rollback_code.status);
    }
    const rowReadFailure = [
      getFunctionResult.ok ? null : getFunctionResult.error_code,
      getFunctionMalformed ? "AWS_RESPONSE_INVALID" : null,
      identityMalformed ? "AWS_FUNCTION_IDENTITY_INVALID" : null,
      configurationResult.ok || configurationResult.error_code === "AWS_ACCESS_DENIED" ? null : configurationResult.error_code,
      concurrencyResult.ok ? null : concurrencyResult.error_code,
      provisionedResult.ok && !provisionedResult.value?.NextMarker ? null : provisionedResult.ok ? "AWS_PROVISIONED_CONCURRENCY_TRUNCATED" : provisionedResult.error_code,
      concurrency.malformed ? "AWS_RESPONSE_INVALID" : null,
      row.direct_invoke.status === "PASS" || row.direct_invoke.status === "NOT_CONFIGURED" ? null : row.direct_invoke.error_code,
      tagsResult.ok ? null : tagsResult.error_code,
      logs.status === "PASS" ? null : logs.error_code,
      ...metrics.filter((metric) => metric.status !== "PASS").map((metric) => metric.error_code),
    ].reduce(firstFailure, null);
    if (rowReadFailure && row.status === "PASS") {
      row.status = "ERROR";
      row.error_code = rowReadFailure;
    }
    functionRecords.push(row);
  }
  const observedNames = new Set(functionRecords.map((row) => row.name));
  for (const name of selected) if (!observedNames.has(name)) functionRecords.push(emptyFunctionRecord(name));
  return functionRecords;
}

export { functionRequest, tagsRequest };
