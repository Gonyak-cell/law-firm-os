const THUMBPRINT = /^[0-9A-F]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const CERTIFICATE_SHA256 = /^[0-9A-F]{64}$/u;
const CERTIFICATE_SERIAL = /^[0-9A-F]+$/u;
const OID = /^\d+(?:\.\d+)+$/u;
const CODE_SIGNING_EKU_OID = "1.3.6.1.5.5.7.3.3";
const TIME_STAMPING_EKU_OID = "1.3.6.1.5.5.7.3.8";
const ALLOWED_TIMESTAMP_URLS = new Set([
  "https://timestamp.digicert.com",
  "https://timestamp.sectigo.com",
  "http://ts.ssl.com",
]);

const CERTIFICATE_FIELDS = [
  "subject",
  "issuer",
  "serial_number",
  "thumbprint",
  "certificate_sha256",
  "not_before",
  "not_after",
  "public_key_algorithm_oid",
  "signature_algorithm_oid",
  "eku_oids",
];

function certificateMetadata(record, prefix, requiredEku) {
  const value = Object.fromEntries(
    CERTIFICATE_FIELDS.map((field) => [field, record?.[`${prefix}_${field}`]]),
  );
  if (typeof value.subject !== "string" || value.subject.length === 0
    || typeof value.issuer !== "string" || value.issuer.length === 0
    || !CERTIFICATE_SERIAL.test(value.serial_number ?? "")
    || !THUMBPRINT.test(value.thumbprint ?? "")
    || !CERTIFICATE_SHA256.test(value.certificate_sha256 ?? "")
    || !Number.isFinite(Date.parse(value.not_before ?? ""))
    || !Number.isFinite(Date.parse(value.not_after ?? ""))
    || Date.parse(value.not_before) >= Date.parse(value.not_after)
    || !OID.test(value.public_key_algorithm_oid ?? "")
    || !OID.test(value.signature_algorithm_oid ?? "")
    || !Array.isArray(value.eku_oids)
    || value.eku_oids.length === 0
    || value.eku_oids.some((oid) => !OID.test(oid))
    || !value.eku_oids.includes(requiredEku)) {
    throw new Error(`Authenticode ${prefix} certificate metadata or EKU validation failed`);
  }
  return Object.freeze({
    ...value,
    eku_oids: Object.freeze([...value.eku_oids]),
  });
}

export function matterDesktopAuthenticodePowerShell() {
  return [
    "function Get-EkuOids($certificate) {",
    "  if ($null -eq $certificate) { return @() }",
    "  $extension = $certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' } | Select-Object -First 1",
    "  if ($null -eq $extension) { return @() }",
    "  $eku = [System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($extension.RawData, $extension.Critical)",
    "  return @($eku.EnhancedKeyUsages | ForEach-Object { $_.Value })",
    "}",
    "function Get-CertificateSha256($certificate) {",
    "  if ($null -eq $certificate) { return $null }",
    "  $hasher = [System.Security.Cryptography.SHA256]::Create()",
    "  try { return ([BitConverter]::ToString($hasher.ComputeHash($certificate.RawData))).Replace('-', '') } finally { $hasher.Dispose() }",
    "}",
    "$signature = Get-AuthenticodeSignature -LiteralPath $env:MATTER_AUTHENTICODE_PATH",
    "$signer = $signature.SignerCertificate",
    "$timestamp = $signature.TimeStamperCertificate",
    "[PSCustomObject]@{",
    "  status = [string]$signature.Status",
    "  status_message = if ($signature.Status -eq 'Valid') { 'Signature verified.' } else { [string]$signature.StatusMessage }",
    "  signature_type = [string]$signature.SignatureType",
    "  time_stamper_certificate_present = ($null -ne $timestamp)",
    "  signer_subject = if ($signer) { [string]$signer.Subject } else { $null }",
    "  signer_issuer = if ($signer) { [string]$signer.Issuer } else { $null }",
    "  signer_serial_number = if ($signer) { ([string]$signer.SerialNumber).ToUpperInvariant() } else { $null }",
    "  signer_thumbprint = if ($signer) { ([string]$signer.Thumbprint).ToUpperInvariant() } else { $null }",
    "  signer_certificate_sha256 = Get-CertificateSha256 $signer",
    "  signer_not_before = if ($signer) { $signer.NotBefore.ToUniversalTime().ToString('o') } else { $null }",
    "  signer_not_after = if ($signer) { $signer.NotAfter.ToUniversalTime().ToString('o') } else { $null }",
    "  signer_public_key_algorithm_oid = if ($signer) { [string]$signer.PublicKey.Oid.Value } else { $null }",
    "  signer_signature_algorithm_oid = if ($signer) { [string]$signer.SignatureAlgorithm.Value } else { $null }",
    "  signer_eku_oids = @(Get-EkuOids $signer)",
    "  timestamp_subject = if ($timestamp) { [string]$timestamp.Subject } else { $null }",
    "  timestamp_issuer = if ($timestamp) { [string]$timestamp.Issuer } else { $null }",
    "  timestamp_serial_number = if ($timestamp) { ([string]$timestamp.SerialNumber).ToUpperInvariant() } else { $null }",
    "  timestamp_thumbprint = if ($timestamp) { ([string]$timestamp.Thumbprint).ToUpperInvariant() } else { $null }",
    "  timestamp_certificate_sha256 = Get-CertificateSha256 $timestamp",
    "  timestamp_not_before = if ($timestamp) { $timestamp.NotBefore.ToUniversalTime().ToString('o') } else { $null }",
    "  timestamp_not_after = if ($timestamp) { $timestamp.NotAfter.ToUniversalTime().ToString('o') } else { $null }",
    "  timestamp_public_key_algorithm_oid = if ($timestamp) { [string]$timestamp.PublicKey.Oid.Value } else { $null }",
    "  timestamp_signature_algorithm_oid = if ($timestamp) { [string]$timestamp.SignatureAlgorithm.Value } else { $null }",
    "  timestamp_eku_oids = @(Get-EkuOids $timestamp)",
    "} | ConvertTo-Json -Depth 4 -Compress",
  ].join("\n");
}

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
  );
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

export function validateMatterDesktopAuthenticodeSignatures(
  records = [],
  { expectedCertificateSha1 } = {},
) {
  if (!Array.isArray(records) || records.length !== 2) {
    throw new Error("installer and packaged executable Authenticode records are required");
  }
  const expectedThumbprint = String(expectedCertificateSha1 ?? "").toUpperCase();
  if (!THUMBPRINT.test(expectedThumbprint)) {
    throw new Error("expected Authenticode certificate SHA-1 thumbprint is required");
  }
  const validated = [];
  for (const record of records) {
    if (record?.status !== "Valid"
      || record?.status_message !== "Signature verified."
      || record?.signature_type !== "Authenticode"
      || record?.time_stamper_certificate_present !== true) {
      throw new Error("Authenticode signature or RFC3161 timestamp validation failed");
    }
    const signer = certificateMetadata(record, "signer", CODE_SIGNING_EKU_OID);
    const timestamp = certificateMetadata(record, "timestamp", TIME_STAMPING_EKU_OID);
    if (signer.thumbprint !== expectedThumbprint) {
      throw new Error("Authenticode signer does not match the expected certificate SHA-1 thumbprint");
    }
    validated.push({ signer, timestamp });
  }
  if (new Set(validated.map(({ signer }) => JSON.stringify(signer))).size !== 1) {
    throw new Error("installer and packaged executable use different Authenticode signers");
  }
  return Object.freeze({
    signature_count: 2,
    signer_certificate_sha1: expectedThumbprint,
    signer: validated[0].signer,
    timestamps: Object.freeze(validated.map(({ timestamp }) => timestamp)),
    signer_code_signing_eku_verified: true,
    timestamp_eku_verified: true,
    timestamp_verified: true,
  });
}

export async function runAfterMatterDesktopAuthenticodeVerification({
  records,
  expectedCertificateSha1,
  expectedExecutableSha256,
  actualExecutableSha256,
  action,
} = {}) {
  if (typeof action !== "function") throw new TypeError("verified Authenticode action is required");
  const verification = validateMatterDesktopAuthenticodeSignatures(
    records,
    { expectedCertificateSha1 },
  );
  let executableParity = null;
  if (expectedExecutableSha256 !== undefined || actualExecutableSha256 !== undefined) {
    if (!SHA256.test(expectedExecutableSha256 ?? "")
      || !SHA256.test(actualExecutableSha256 ?? "")
      || actualExecutableSha256 !== expectedExecutableSha256) {
      throw new Error("installed executable bytes do not match the packaged executable");
    }
    executableParity = Object.freeze({
      packaged_executable_sha256: expectedExecutableSha256,
      installed_executable_sha256: actualExecutableSha256,
      byte_identical: true,
    });
  }
  return {
    verification,
    executable_parity: executableParity,
    value: await action(),
  };
}
