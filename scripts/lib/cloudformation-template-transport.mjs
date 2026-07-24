export const CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES = 51_200;

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
    const parsed = new URL(templateUrl);
    if (parsed.protocol !== "https:"
      || !parsed.hostname.endsWith(".amazonaws.com")
      || !parsed.searchParams.get("versionId")) {
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
