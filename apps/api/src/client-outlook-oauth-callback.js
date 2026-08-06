export const CLIENT_OUTLOOK_OAUTH_CALLBACK_DESTINATION =
  "https://d2mthcc8vp3cr2.cloudfront.net/addin/oauth-callback.html";

const CLIENT_OUTLOOK_OAUTH_STATE_PATTERN =
  /^(?=.{1,4096}$)v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const AUTHORIZATION_CODE_PATTERN = /^(?=.{1,4096}$)[\x21-\x7e]+$/u;
const AUTHORIZATION_ERROR_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u;
const AUTHORIZATION_ERROR_DESCRIPTION_PATTERN =
  /^(?=.{1,2048}$)[^\u0000-\u001f\u007f]+$/u;
const AUTHORIZATION_ERROR_URI_PATTERN =
  /^(?=.{1,2048}$)https:\/\/[^\u0000-\u001f\u007f]+$/u;
const SESSION_STATE_PATTERN = /^(?=.{1,512}$)[\x21-\x7e]+$/u;
const CALLBACK_QUERY_KEYS = Object.freeze([
  "code",
  "error",
  "error_description",
  "error_uri",
  "state",
  "session_state",
]);

export function isClientOutlookOAuthState(value) {
  return CLIENT_OUTLOOK_OAUTH_STATE_PATTERN.test(String(value ?? ""));
}

export function parseClientOutlookAuthorizationCallback(searchParams) {
  if (!(searchParams instanceof URLSearchParams)) {
    throw new TypeError("Client Outlook callback query is required");
  }
  for (const key of searchParams.keys()) {
    if (!CALLBACK_QUERY_KEYS.includes(key)) {
      throw new TypeError("Client Outlook callback query is invalid");
    }
  }
  for (const key of CALLBACK_QUERY_KEYS) {
    if (searchParams.getAll(key).length > 1) {
      throw new TypeError("Client Outlook callback query is duplicated");
    }
  }

  const code = searchParams.get("code") ?? "";
  const callbackError = searchParams.get("error") ?? "";
  const errorDescription = searchParams.get("error_description");
  const errorUri = searchParams.get("error_uri");
  const state = searchParams.get("state") ?? "";
  const sessionState = searchParams.get("session_state");
  const hasCode = searchParams.has("code");
  const hasCallbackError = searchParams.has("error");
  if (
    hasCode === hasCallbackError
    || (hasCode && !code)
    || (hasCallbackError && !callbackError)
    || (code && !AUTHORIZATION_CODE_PATTERN.test(code))
    || (callbackError && !AUTHORIZATION_ERROR_PATTERN.test(callbackError))
    || (
      errorDescription !== null
      && (
        !callbackError
        || !AUTHORIZATION_ERROR_DESCRIPTION_PATTERN.test(errorDescription)
      )
    )
    || (
      errorUri !== null
      && (
        !callbackError
        || !AUTHORIZATION_ERROR_URI_PATTERN.test(errorUri)
        || !URL.canParse(errorUri)
      )
    )
    || !isClientOutlookOAuthState(state)
    || (
      sessionState !== null
      && !SESSION_STATE_PATTERN.test(sessionState)
    )
  ) {
    throw new TypeError("Client Outlook callback query is invalid");
  }

  return Object.freeze({
    code: code || null,
    error: callbackError || null,
    state,
  });
}

export function createClientOutlookAddinCallbackLocation(status) {
  if (!new Set(["connected", "failed"]).has(status)) {
    throw new TypeError("Client Outlook callback status is invalid");
  }
  const callback = new URL(CLIENT_OUTLOOK_OAUTH_CALLBACK_DESTINATION);
  callback.hash = new URLSearchParams({ status }).toString();
  return callback.toString();
}

export function createClientOutlookLegacyAddinCallbackLocation(searchParams) {
  const result = parseClientOutlookAuthorizationCallback(searchParams);
  const callback = new URL(CLIENT_OUTLOOK_OAUTH_CALLBACK_DESTINATION);
  const fragment = new URLSearchParams({ state: result.state });
  if (result.code) fragment.set("code", result.code);
  else fragment.set("error", result.error);
  callback.hash = fragment.toString();
  return callback.toString();
}
