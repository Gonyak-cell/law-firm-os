export const DEFAULT_PROTECTED_RESET_EMAILS = Object.freeze(["jwsuh@amic.kr"]);
export const DEFAULT_QA_RESET_EMAIL = "matter.desktop.qa@amic.kr";
export const ALLOW_PROTECTED_RESET_ENV = "MATTER_ALLOW_PROTECTED_ACCOUNT_RESET";
export const PROTECTED_RESET_EMAILS_ENV = "MATTER_PROTECTED_RESET_EMAILS";
export const QA_RESET_EMAIL_ENV = "MATTER_DESKTOP_QA_EMAIL";

export class ProtectedResetAccountError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ProtectedResetAccountError";
    this.code = "PROTECTED_RESET_ACCOUNT";
    this.details = details;
  }
}

export function normalizeResetEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function splitEmailList(value) {
  return String(value ?? "")
    .split(/[,\s]+/)
    .map((item) => normalizeResetEmail(item))
    .filter(Boolean);
}

export function protectedResetEmails({ env = process.env, defaults = DEFAULT_PROTECTED_RESET_EMAILS } = {}) {
  return [
    ...new Set([
      ...defaults.map((email) => normalizeResetEmail(email)).filter(Boolean),
      ...splitEmailList(env[PROTECTED_RESET_EMAILS_ENV])
    ])
  ];
}

export function protectedResetOverrideEnabled({ env = process.env } = {}) {
  return /^(1|true|yes|y)$/i.test(String(env[ALLOW_PROTECTED_RESET_ENV] ?? "").trim());
}

export function isProtectedResetEmail(email, options = {}) {
  const normalized = normalizeResetEmail(email);
  return protectedResetEmails(options).includes(normalized);
}

export function assertResetAllowed(email, { env = process.env, context = "password reset QA" } = {}) {
  const normalized = normalizeResetEmail(email);
  const protectedEmail = isProtectedResetEmail(normalized, { env });
  const overrideEnabled = protectedResetOverrideEnabled({ env });
  if (protectedEmail && !overrideEnabled) {
    throw new ProtectedResetAccountError(
      `${context}: ${normalized} is protected from password reset by default; set ${ALLOW_PROTECTED_RESET_ENV}=1 only with an explicit dangerous-reset receipt.`,
      {
        email: normalized,
        context,
        protected: true,
        override_enabled: false,
        token_material_returned: false
      }
    );
  }
  return {
    email: normalized,
    protected: protectedEmail,
    override_enabled: overrideEnabled,
    reset_allowed: true,
    token_material_returned: false
  };
}

function roleIdsFor(account = {}) {
  return Array.isArray(account.role_ids) ? account.role_ids : Array.isArray(account.roles) ? account.roles : [];
}

export function selectQaResetAccount(users = [], { env = process.env } = {}) {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("No registered accounts are available for password reset QA.");
  }

  const preferredEmail = normalizeResetEmail(env[QA_RESET_EMAIL_ENV] || DEFAULT_QA_RESET_EMAIL);
  const candidates = users.filter((user) => normalizeResetEmail(user.email));
  const preferred = candidates.find((user) => normalizeResetEmail(user.email) === preferredEmail);

  if (!preferred) {
    throw new Error(`${QA_RESET_EMAIL_ENV}=${preferredEmail} is not present in the registered account ledger.`);
  }

  if (preferred && roleIdsFor(preferred).includes("system_super_admin")) {
    throw new Error(`${QA_RESET_EMAIL_ENV}=${preferredEmail} points to a system_super_admin account; choose a non-admin QA account.`);
  }

  const resetPolicy = assertResetAllowed(preferred.email, { env, context: "password reset QA account selection" });
  return {
    ...preferred,
    email: normalizeResetEmail(preferred.email),
    reset_policy: resetPolicy
  };
}

export function resetProtectionSummary({ env = process.env } = {}) {
  return {
    protected_emails: protectedResetEmails({ env }),
    default_qa_reset_email: DEFAULT_QA_RESET_EMAIL,
    allow_protected_reset_env: ALLOW_PROTECTED_RESET_ENV,
    protected_reset_emails_env: PROTECTED_RESET_EMAILS_ENV,
    qa_reset_email_env: QA_RESET_EMAIL_ENV,
    override_enabled: protectedResetOverrideEnabled({ env }),
    token_material_returned: false
  };
}
