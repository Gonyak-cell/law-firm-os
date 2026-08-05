const status = document.getElementById("status");

function fail(message) {
  if (status) status.textContent = message;
}

try {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const authorizationUrl = params.get("authorization_url") || "";
  const state = params.get("state") || "";
  const target = new URL(authorizationUrl);
  const allowedPath = /^\/[0-9a-f-]{36}\/oauth2\/v2\.0\/authorize$/iu
    .test(target.pathname);
  if (
    target.protocol !== "https:"
    || target.hostname !== "login.microsoftonline.com"
    || !allowedPath
    || !state
    || target.searchParams.get("state") !== state
  ) {
    throw new Error("invalid_oauth_target");
  }
  window.location.replace(target.href);
} catch {
  fail("연결 주소를 확인할 수 없습니다. 이 창을 닫고 다시 시도해 주세요.");
}
