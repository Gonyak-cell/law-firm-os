const THUMBPRINT = /^[0-9A-F]{40}$/u;
const ALLOWED_TIMESTAMP_URLS = new Set([
  "https://timestamp.digicert.com",
  "https://timestamp.sectigo.com",
]);

export function resolveMatterDesktopAuthenticodeConfiguration({
  env = process.env,
  platform = process.platform,
  formalRelease = false,
} = {}) {
  if (env.MATTER_DESKTOP_AUTHENTICODE !== "1") return null;
  if (!formalRelease) throw new Error("Authenticode is permitted only for the formal release channel");
  if (platform !== "win32") throw new Error("Authenticode requires a Windows host");
  const certificateSha1 = String(env.MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1 ?? "")
    .replaceAll(/\s/gu, "")
    .toUpperCase();
  const timestampUrl = String(
    env.MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL ?? "https://timestamp.digicert.com",
  ).trim();
  if (!THUMBPRINT.test(certificateSha1)) {
    throw new Error("MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1 must be a 40-character certificate-store thumbprint");
  }
  if (!ALLOWED_TIMESTAMP_URLS.has(timestampUrl)) {
    throw new Error("Authenticode timestamp URL is not approved");
  }
  return Object.freeze({
    certificate_sha1: certificateSha1,
    timestamp_url: timestampUrl,
  });
}

export function injectMatterDesktopAuthenticodeConfiguration(source, configuration) {
  if (!configuration) return source;
  const markers = String(source).match(/^win:[ \t]*$/gmu) ?? [];
  if (markers.length !== 1) {
    throw new Error("electron-builder configuration must contain exactly one win block");
  }
  return String(source).replace(
    /^win:[ \t]*$/mu,
    [
      "win:",
      "  signtoolOptions:",
      `    certificateSha1: ${JSON.stringify(configuration.certificate_sha1)}`,
      `    rfc3161TimeStampServer: ${JSON.stringify(configuration.timestamp_url)}`,
      "    signingHashAlgorithms:",
      "      - sha256",
    ].join("\n"),
  );
}

export function validateMatterDesktopAuthenticodeSignatures(records = []) {
  if (!Array.isArray(records) || records.length !== 2) {
    throw new Error("installer and packaged executable Authenticode records are required");
  }
  for (const record of records) {
    if (record?.status !== "Valid"
      || record?.status_message !== "Signature verified."
      || record?.signature_type !== "Authenticode"
      || record?.time_stamper_certificate_present !== true
      || !/^[0-9A-F]{40}$/u.test(record.signer_thumbprint ?? "")) {
      throw new Error("Authenticode signature or RFC3161 timestamp validation failed");
    }
  }
  if (new Set(records.map((record) => record.signer_thumbprint)).size !== 1) {
    throw new Error("installer and packaged executable use different Authenticode signers");
  }
  return Object.freeze({
    signature_count: 2,
    signer_thumbprint_sha256_source: records[0].signer_thumbprint,
    timestamp_verified: true,
  });
}
