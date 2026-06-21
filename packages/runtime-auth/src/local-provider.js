import { createAuthProviderInterface, readRequestHeader } from "./provider.js";
import { createRuntimeAuthSession } from "./session.js";

function bearerToken(request) {
  const authorization = readRequestHeader(request, "authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization));
  return match?.[1];
}

export function createLocalDevAuthProvider({ subjects = [] } = {}) {
  const byToken = new Map();
  for (const subject of subjects) {
    if (typeof subject.synthetic_token !== "string" || subject.synthetic_token.trim() === "") {
      throw new TypeError("local dev subjects require synthetic_token");
    }
    byToken.set(subject.synthetic_token, Object.freeze({ ...subject }));
  }

  return createAuthProviderInterface({
    kind: "local-dev",
    synthetic_only: true,
    oidc: { supported: false },
    saml: { supported: false },
    authenticateRequest(request = {}) {
      const token = bearerToken(request);
      if (!token) return Object.freeze({ ok: false, reason: "missing_bearer_token" });
      const subject = byToken.get(token);
      if (!subject) return Object.freeze({ ok: false, reason: "unknown_synthetic_subject" });
      return Object.freeze({
        ok: true,
        session: createRuntimeAuthSession({
          session_id: subject.session_id ?? `sess_${subject.user_id}`,
          user_id: subject.user_id,
          auth_subject: subject.auth_subject ?? subject.user_id,
          provider: "local-dev",
          assurance_level: subject.assurance_level ?? "password",
          tenant_memberships: subject.tenant_memberships ?? []
        })
      });
    }
  });
}
