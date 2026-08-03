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

function normalizedSigner(record) {
  return {
    thumbprint_sha1: String(record?.signer_thumbprint ?? "").replaceAll(/\s/gu, "").toUpperCase(),
    subject: String(record?.signer_subject ?? "").trim(),
    issuer: String(record?.signer_issuer ?? "").trim(),
    team_equivalent: String(record?.signer_team_equivalent ?? "").trim(),
  };
}

export function validateMatterDesktopAuthenticodeSignatures(records = [], { expectedSigner } = {}) {
  if (!Array.isArray(records) || records.length !== 2) {
    throw new Error("installer and packaged executable Authenticode records are required");
  }
  for (const record of records) {
    const signer = normalizedSigner(record);
    if (record?.status !== "Valid"
      || record?.signature_type !== "Authenticode"
      || record?.signer_certificate_present !== true
      || record?.time_stamper_certificate_present !== true
      || !THUMBPRINT.test(signer.thumbprint_sha1)) {
      throw new Error("Authenticode signature or RFC3161 timestamp validation failed");
    }
  }
  const signers = records.map(normalizedSigner);
  if (new Set(signers.map(({ thumbprint_sha1 }) => thumbprint_sha1)).size !== 1) {
    throw new Error("installer and packaged executable use different Authenticode signers");
  }
  if (expectedSigner) {
    const expected = {
      thumbprint_sha1: String(expectedSigner.thumbprint_sha1 ?? "").replaceAll(/\s/gu, "").toUpperCase(),
      subject: String(expectedSigner.subject ?? "").trim(),
      issuer: String(expectedSigner.issuer ?? "").trim(),
      team_equivalent: String(expectedSigner.team_equivalent ?? "").trim(),
    };
    if (!THUMBPRINT.test(expected.thumbprint_sha1)
      || !expected.subject
      || !expected.issuer
      || !expected.team_equivalent
      || signers.some((signer) => Object.keys(expected).some((key) => signer[key] !== expected[key]))) {
      throw new Error("Authenticode signer does not match the approved Windows signing authority");
    }
  }
  return Object.freeze({
    signature_count: 2,
    signer_thumbprint_sha256_source: signers[0].thumbprint_sha1,
    signer_subject: signers[0].subject || null,
    signer_issuer: signers[0].issuer || null,
    signer_team_equivalent: signers[0].team_equivalent || null,
    timestamp_verified: true,
  });
}
