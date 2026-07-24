import { createHash } from "node:crypto";

export const CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES = 51_200;
export const CLOUDFORMATION_NO_ECHO_PLACEHOLDER = "****";

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function cloudFormationTemplateSha256(template) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new TypeError("CloudFormation template body is invalid");
  }
  return createHash("sha256").update(stableJson(template)).digest("hex");
}

export function isVersionedCloudFormationS3TemplateUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:"
      && parsed.hostname.endsWith(".amazonaws.com")
      && parsed.searchParams.has("versionId")
      && parsed.searchParams.get("versionId").length > 0
      && parsed.username === ""
      && parsed.password === ""
      && parsed.hash === "";
  } catch {
    return false;
  }
}

export function validateCloudFormationChangeSetTemplate({
  response,
  expectedSha256,
} = {}) {
  let template = response?.TemplateBody;
  if (typeof template === "string") {
    try {
      template = JSON.parse(template);
    } catch {
      throw new Error("CloudFormation change-set template is not JSON");
    }
  }
  const actualSha256 = cloudFormationTemplateSha256(template);
  if (!/^[a-f0-9]{64}$/u.test(expectedSha256 ?? "")
    || actualSha256 !== expectedSha256) {
    throw new Error("CloudFormation change-set template digest drifted");
  }
  return Object.freeze({
    template_sha256: actualSha256,
  });
}

export function cloudFormationTemplateRequiresUrl(byteSize) {
  if (!Number.isSafeInteger(byteSize) || byteSize < 1) {
    throw new TypeError("CloudFormation template byte size is invalid");
  }
  return byteSize > CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES;
}

export function buildVersionedS3TemplateUrl({
  bucket,
  region,
  key,
  versionId,
} = {}) {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(bucket ?? "")
    || !/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/u.test(region ?? "")
    || typeof key !== "string"
    || key.length < 1
    || key.startsWith("/")
    || key.includes("..")
    || typeof versionId !== "string"
    || versionId.length < 1) {
    throw new TypeError("versioned CloudFormation S3 template locator is invalid");
  }
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(
    `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`,
  );
  url.searchParams.set("versionId", versionId);
  return url.toString();
}

export function cloudFormationTemplateArgs({
  templatePath,
  templateByteSize,
  templateUrl = null,
} = {}) {
  if (typeof templatePath !== "string" || templatePath.length < 1) {
    throw new TypeError("CloudFormation template path is invalid");
  }
  const requiresUrl = cloudFormationTemplateRequiresUrl(templateByteSize);
  if (templateUrl !== null) {
    if (!isVersionedCloudFormationS3TemplateUrl(templateUrl)) {
      throw new TypeError("CloudFormation template URL is not version-bound S3 HTTPS");
    }
    return Object.freeze({
      args: Object.freeze(["--template-url", templateUrl]),
      byte_size: templateByteSize,
      transport: "versioned-s3-url",
    });
  }
  if (requiresUrl) {
    throw new Error("CloudFormation template exceeds TemplateBody limit and requires TemplateURL");
  }
  return Object.freeze({
    args: Object.freeze(["--template-body", `file://${templatePath}`]),
    byte_size: templateByteSize,
    transport: "inline-body",
  });
}

export function cloudFormationParameterArgs(parameters) {
  const entries = Array.isArray(parameters)
    ? parameters
    : Object.entries(parameters ?? {}).map(([key, value]) => ({ key, value }));
  return Object.freeze(entries.map(({ key, value }) => {
    if (!/^[A-Za-z0-9]+$/u.test(key ?? "")) {
      throw new TypeError("CloudFormation parameter key is invalid");
    }
    if (value === CLOUDFORMATION_NO_ECHO_PLACEHOLDER) {
      return `ParameterKey=${key},UsePreviousValue=true`;
    }
    if (value === undefined || value === null) {
      throw new TypeError(`CloudFormation parameter ${key} has no value`);
    }
    return `ParameterKey=${key},ParameterValue=${value}`;
  }));
}
