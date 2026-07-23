export const PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN = /^(?:lawos-staging-[a-z0-9-]+@[^@\s]+|[a-z0-9._%+-]+\+lawos-staging-(?:admin|attorney|disabled)@amic\.kr)$/u;

export const PRIVATE_STAGING_APPROVED_SYNTHETIC_AMIC_EMAIL_PATTERN = /(?<![a-z0-9._%+-])(?:lawos-staging-[a-z0-9-]+@amic\.(?:kr|law)|[a-z0-9._%+-]+\+lawos-staging-(?:admin|attorney|disabled)@amic\.kr)\b/giu;
