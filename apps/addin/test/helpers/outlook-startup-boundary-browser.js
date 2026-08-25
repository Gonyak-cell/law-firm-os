import { readyOutlookReadinessResponse } from "./outlook-readiness-fixture.js";

export const STARTUP_PATHS = Object.freeze([
  "/api/auth/session",
  "/api/outlook/connection",
  "/api/outlook/readiness",
  "/api/outlook/bootstrap",
]);

const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

export async function installStartupBoundaryHost(page, {
  initialOfficeReady = false,
  captureOfficeTimeout = false,
  throwingLocalStorage = false,
} = {}) {
  await page.addInitScript((options) => {
    const subscriptions = { add: 0, remove: 0 };
    const item = {
      itemId: "office-startup-boundary",
      subject: "Startup boundary",
      internetMessageId: "<startup-boundary@example.invalid>",
      conversationId: "startup-boundary-conversation",
      from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
      to: [],
      attachments: [],
      body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "body" }); } },
      getAllInternetHeadersAsync(callback) {
        callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" });
      },
    };
    const mailbox = {
      item,
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { subscriptions.add += 1; this.handler = handler; },
      removeHandlerAsync() { subscriptions.remove += 1; this.handler = null; },
      convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    const context = { requirements: { isSetSupported: () => false } };
    if (options.initialOfficeReady) context.mailbox = mailbox;
    let readyCallback = null;
    let readyCalls = 0;
    window.Office = {
      onReady(callback) {
        readyCallback = callback;
        if (options.initialOfficeReady) {
          readyCalls += 1;
          callback({ host: "Outlook", platform: "web" });
        }
      },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } },
      context,
    };
    window.OfficeRuntime = { storage: {
      async getItem() { return null; },
      async setItem() {},
      async removeItem() {},
    } };
    let timeoutCallback = null;
    let timeoutTriggered = false;
    if (options.captureOfficeTimeout) {
      const nativeSetTimeout = window.setTimeout.bind(window);
      const nativeClearTimeout = window.clearTimeout.bind(window);
      const timeoutToken = 900_009;
      window.setTimeout = (callback, delay, ...args) => {
        if (delay === 5_000 && timeoutCallback === null) {
          timeoutCallback = () => callback(...args);
          return timeoutToken;
        }
        return nativeSetTimeout(callback, delay, ...args);
      };
      window.clearTimeout = (token) => {
        if (token === timeoutToken) timeoutCallback = null;
        else nativeClearTimeout(token);
      };
    }
    window.__TODO9_OFFICE_BOUNDARY = () => ({
      readyCalls,
      timeoutCaptured: timeoutCallback !== null,
      timeoutTriggered,
      ...subscriptions,
    });
    window.__TODO9_TRIGGER_OFFICE_TIMEOUT = () => {
      const callback = timeoutCallback;
      timeoutCallback = null;
      timeoutTriggered = true;
      callback?.();
    };
    window.__TODO9_RELEASE_OFFICE = () => {
      context.mailbox = mailbox;
      readyCalls += 1;
      readyCallback?.({ host: "Outlook", platform: "web" });
    };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.todo9-boundary");
    if (options.throwingLocalStorage) {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() { throw new DOMException("blocked by policy", "SecurityError"); },
      });
    }
  }, { initialOfficeReady, captureOfficeTimeout, throwingLocalStorage });
}

export async function installStartupBoundaryApi(page, requests) {
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, search: url.search });
    if (url.pathname === "/api/auth/office-sso/config") return route.fulfill(json({ item: {
      configured: true,
      client_id: "browser-client",
      tenant_id: "organizations",
      api_scope: "api://browser-client/access_as_user",
      scopes: ["api://browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } }));
    if (url.pathname === "/api/auth/session") return route.fulfill(json({
      authenticated: true,
      session: {
        tenant_id: "todo9-tenant",
        user_id: "todo9-user",
        outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}`,
      },
    }));
    if (url.pathname === "/api/outlook/connection") return route.fulfill(json({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_todo9_boundary",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } }));
    if (url.pathname === "/api/outlook/readiness") {
      return route.fulfill(json(readyOutlookReadinessResponse()));
    }
    if (url.pathname === "/api/outlook/bootstrap") {
      return route.fulfill(json({ item: { ready: true, marker: "todo9-boundary" } }));
    }
    return route.fulfill(json({ items: [] }));
  });
}

export const startupCounts = (requests) => STARTUP_PATHS.map(
  (path) => requests.filter((request) => request.path === path).length,
);
