export const PASSWORD_RESET_EMAIL_LOGO_CONTENT_ID = "amic-law-email-logo";
export const PASSWORD_RESET_EMAIL_LOGO_FILE_NAME = "amic-law-email-logo.png";
export const PASSWORD_RESET_EMAIL_LOGO_MIME_TYPE = "image/png";
export const DEFAULT_PASSWORD_RESET_EMAIL_LOGO_URL =
  "https://d2mthcc8vp3cr2.cloudfront.net/amic-law-email-logo.png";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeLogoSource(value) {
  const source = String(value ?? "").trim();
  if (/^cid:[A-Za-z0-9._-]+$/u.test(source)) return source;
  try {
    const parsed = new URL(source);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function passwordResetEmailSubject() {
  return "AMIC LAW · LawOS 비밀번호 설정";
}

export function passwordResetEmailText({ resetUrl, resetOpenUrl = resetUrl, expiresAt } = {}) {
  return [
    "AMIC LAW · LawOS 비밀번호 설정",
    "",
    "LawOS 계정의 비밀번호 설정 요청을 받았습니다.",
    "아래 링크를 열어 새 비밀번호를 설정하세요.",
    resetOpenUrl,
    "",
    "버튼이나 링크가 앱을 바로 열지 않으면 열린 화면에서 LawOS 열기를 다시 선택하세요.",
    "",
    `링크 유효 시간: ${expiresAt}`,
    "이 링크는 한 번만 사용할 수 있습니다.",
    "",
    "본인이 요청하지 않았다면 이 메일을 무시하세요.",
    "이 메일만으로 기존 비밀번호나 로그인 세션은 변경되지 않습니다.",
  ].join("\n");
}

export function passwordResetEmailHtml({
  resetUrl,
  resetOpenUrl = resetUrl,
  expiresAt,
  logoSrc = "",
} = {}) {
  const safeResetUrl = escapeHtml(resetUrl);
  const safeResetOpenUrl = escapeHtml(resetOpenUrl);
  const safeExpiresAt = escapeHtml(expiresAt);
  const safeLogoSrc = escapeHtml(safeLogoSource(logoSrc));
  const brandMark = safeLogoSrc
    ? `<img src="${safeLogoSrc}" width="175" height="28" alt="AMIC LAW" style="display:block;width:175px;height:28px;border:0;outline:none;text-decoration:none;">`
    : '<span style="font-size:18px;line-height:28px;font-weight:700;letter-spacing:0.08em;color:#0F3A32;">AMIC LAW</span>';
  return [
    "<!doctype html>",
    '<html lang="ko">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AMIC LAW · LawOS 비밀번호 설정</title></head>',
    '<body style="margin:0;padding:0;background:#f4f5f2;color:#17212b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,Malgun Gothic,sans-serif;">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">AMIC LAW LawOS 비밀번호 설정 링크입니다.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f5f2;margin:0;padding:28px 0;">',
    '<tr><td align="center" style="padding:0 16px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #d9ded9;border-radius:8px;overflow:hidden;">',
    '<tr><td style="padding:22px 28px 0;background:#ffffff;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">',
    "<tr>",
    `<td align="left" style="padding:0;vertical-align:middle;">${brandMark}</td>`,
    '<td align="right" style="padding:0;vertical-align:middle;font-size:13px;line-height:20px;font-weight:700;color:#0F3A32;">LawOS</td>',
    "</tr>",
    '<tr><td colspan="2" style="height:18px;border-bottom:3px solid #26C260;font-size:0;line-height:0;">&nbsp;</td></tr>',
    "</table>",
    "</td></tr>",
    '<tr><td style="padding:28px;">',
    '<h1 style="margin:0 0 12px;font-size:24px;line-height:32px;font-weight:700;letter-spacing:0;color:#17212b;">비밀번호를 설정하세요</h1>',
    '<p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#374151;">LawOS 계정의 비밀번호 설정 요청을 받았습니다. 아래 버튼을 눌러 새 비밀번호를 설정하세요.</p>',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;">',
    '<tr><td bgcolor="#0F3A32" style="background:#0F3A32;border-radius:6px;">',
    `<a href="${safeResetOpenUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;">비밀번호 설정하기</a>`,
    "</td></tr>",
    "</table>",
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #dfe4df;border-radius:6px;background:#f8faf8;margin:0 0 20px;">',
    '<tr><td style="padding:15px 16px;">',
    '<div style="font-size:13px;line-height:20px;font-weight:700;color:#0F3A32;margin-bottom:7px;">버튼이 열리지 않나요?</div>',
    `<div style="font-size:12px;line-height:18px;color:#5f6b65;word-break:break-all;">브라우저 링크: <a href="${safeResetOpenUrl}" style="color:#0F3A32;text-decoration:underline;">${safeResetOpenUrl}</a></div>`,
    `<div style="font-size:0;line-height:0;color:#ffffff;max-height:0;overflow:hidden;">${safeResetUrl}</div>`,
    "</td></tr>",
    "</table>",
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6eae6;margin:0 0 16px;">',
    '<tr><td style="padding:15px 0 0;">',
    '<div style="font-size:12px;line-height:18px;color:#6b746f;margin-bottom:3px;">링크 유효 시간</div>',
    `<div style="font-size:13px;line-height:20px;font-weight:700;color:#17212b;">${safeExpiresAt}</div>`,
    '<div style="font-size:12px;line-height:18px;color:#6b746f;margin-top:3px;">이 링크는 한 번만 사용할 수 있습니다.</div>',
    "</td></tr>",
    "</table>",
    '<p style="margin:0;font-size:13px;line-height:21px;color:#5f6863;">본인이 요청하지 않았다면 이 메일을 무시하세요. 이 메일만으로 기존 비밀번호나 로그인 세션은 변경되지 않습니다.</p>',
    "</td></tr>",
    '<tr><td style="padding:17px 28px;border-top:1px solid #e6eae6;background:#fafbfa;">',
    '<p style="margin:0;font-size:12px;line-height:18px;color:#6b746f;">본 메일은 AMIC LAW의 LawOS 계정 보안 알림입니다.</p>',
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}
