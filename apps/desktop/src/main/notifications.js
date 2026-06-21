import { parseMaterDeepLink } from "./deepLinks.js";

export const NOTIFICATION_TEMPLATES = Object.freeze({
  workspace_update: Object.freeze({
    title: "mater update",
    body: "Open mater to continue"
  }),
  review_required: Object.freeze({
    title: "mater review",
    body: "A workspace item needs review"
  })
});

export function createDesktopNotificationPayload({ id, routeUrl, templateId = "workspace_update" }) {
  const template = NOTIFICATION_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown desktop notification template: ${templateId}`);
  return {
    id,
    templateId,
    title: template.title,
    body: template.body,
    routeUrl
  };
}

export function notificationClickToRouteIntent(payload, { parse = parseMaterDeepLink } = {}) {
  if (!payload || typeof payload.routeUrl !== "string") {
    throw new Error("Notification click requires a routeUrl");
  }
  const intent = parse(payload.routeUrl);
  return {
    source: "notification",
    routeOnly: true,
    intent
  };
}
