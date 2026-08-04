export const PEOPLE_OUTLOOK_OAUTH_STATE_PREFIX = "people_";

const PEOPLE_OUTLOOK_OAUTH_STATE_PATTERN =
  /^people_[A-Za-z0-9_-]{43}$/u;
const AUTHORIZATION_CODE_PATTERN = /^(?=.{1,4096}$)[\x21-\x7e]+$/u;
const AUTHORIZATION_ERROR_PATTERN = /^access_denied$/u;
const AUTHORIZATION_ERROR_DESCRIPTION_PATTERN =
  /^(?=.{1,2048}$)[^\u0000-\u001f\u007f]+$/u;
const SESSION_STATE_PATTERN = /^(?=.{1,512}$)[\x21-\x7e]+$/u;
const CALLBACK_QUERY_KEYS = Object.freeze([
  "code",
  "error",
  "error_description",
  "state",
  "session_state",
]);

export function isPeopleOutlookOAuthState(value) {
  return PEOPLE_OUTLOOK_OAUTH_STATE_PATTERN.test(String(value ?? ""));
}

export function createPeopleOutlookDesktopCallbackLocation(searchParams) {
  if (!(searchParams instanceof URLSearchParams)) {
    throw new TypeError("People Outlook callback query is required");
  }
  for (const key of searchParams.keys()) {
    if (!CALLBACK_QUERY_KEYS.includes(key)) {
      throw new TypeError("People Outlook callback query is invalid");
    }
  }
  for (const key of CALLBACK_QUERY_KEYS) {
    if (searchParams.getAll(key).length > 1) {
      throw new TypeError("People Outlook callback query is duplicated");
    }
  }

  const code = searchParams.get("code") ?? "";
  const callbackError = searchParams.get("error") ?? "";
  const errorDescription = searchParams.get("error_description");
  const state = searchParams.get("state") ?? "";
  const sessionState = searchParams.get("session_state");
  if (
    Boolean(code) === Boolean(callbackError)
    || (code && !AUTHORIZATION_CODE_PATTERN.test(code))
    || (callbackError && !AUTHORIZATION_ERROR_PATTERN.test(callbackError))
    || (
      errorDescription !== null
      && (
        !callbackError
        || !AUTHORIZATION_ERROR_DESCRIPTION_PATTERN.test(errorDescription)
      )
    )
    || !isPeopleOutlookOAuthState(state)
    || (
      sessionState !== null
      && !SESSION_STATE_PATTERN.test(sessionState)
    )
  ) {
    throw new TypeError("People Outlook callback query is invalid");
  }

  const callback = new URL("matter://auth/callback");
  if (code) callback.searchParams.set("code", code);
  else callback.searchParams.set("error", callbackError);
  callback.searchParams.set("state", state);
  return callback.toString();
}
