import { fetchHomeFeed, fetchMatterChannel, fetchMatterRecords } from "./apiClient.js";

const HOME_MESSAGE_LIMIT = 8;
const HOME_MESSAGE_MATTER_LIMIT = 4;

function text(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function itemTimeLabel(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "최근";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function matterIdFor(record) {
  return text(record?.matter_id ?? record?.resource_id ?? record?.id);
}

function matterTitleFor(record, matterId) {
  return text(record?.matter_name ?? record?.title ?? record?.lookup_label, matterId || "Matter");
}

function messageIdFor(message, matterId, index) {
  return text(message?.message_id ?? message?.resource_id, `matter-message:${matterId}:${index + 1}`);
}

function mapMatterMessage(message, matter, index) {
  const matterId = matterIdFor(matter) || text(message?.matter_id);
  const title = matterTitleFor(matter, matterId);
  const id = messageIdFor(message, matterId, index);
  const createdAt = text(message?.created_at);
  return Object.freeze({
    id,
    threadId: text(message?.thread_id, `matter-channel:${matterId}`),
    source: "matter-channel",
    tab: "matter",
    section: "messages-matter-channel",
    type: "Matter",
    title: `${title} 대화`,
    client: title,
    status: "읽지 않음",
    summary: text(message?.safe_message_excerpt, "안전 요약이 없는 Matter 메시지입니다."),
    time: itemTimeLabel(createdAt),
    initials: "MT",
    unread: true,
    matterId,
    createdAt
  });
}

function mapNoticeMessage(entry, index) {
  const id = text(entry?.id ?? entry?.resource_id, `home-notice:${index + 1}`);
  const title = text(entry?.title, "공지");
  const createdAt = text(entry?.published_at);
  return Object.freeze({
    id,
    threadId: id,
    source: "people-notice",
    tab: "notices",
    section: "messages-notices",
    type: "공지",
    title,
    client: text(entry?.source, "People notices"),
    status: "읽지 않음",
    summary: text(entry?.body_preview, "공지 요약이 없습니다."),
    time: itemTimeLabel(createdAt),
    initials: "공",
    unread: true,
    matterId: null,
    createdAt
  });
}

function dedupeMessages(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function collectMatterChannelMessages(ctx) {
  const result = await fetchMatterRecords({ ctx, limit: HOME_MESSAGE_MATTER_LIMIT });
  if (result.kind !== "data" || !Array.isArray(result.items)) return [];
  const matters = result.items.filter((item) => matterIdFor(item)).slice(0, HOME_MESSAGE_MATTER_LIMIT);
  const channels = await Promise.allSettled(matters.map((matter) => fetchMatterChannel({ matterId: matterIdFor(matter), ctx })));
  return channels.flatMap((value, channelIndex) => {
    if (value.status !== "fulfilled" || value.value?.kind !== "data") return [];
    const messages = Array.isArray(value.value.item?.messages) ? value.value.item.messages : [];
    return messages.map((message, messageIndex) => mapMatterMessage(message, matters[channelIndex], messageIndex));
  });
}

async function collectNoticeMessages(ctx) {
  const result = await fetchHomeFeed({ tab: "notice", ctx });
  if (!["data", "empty"].includes(result.kind) || !Array.isArray(result.entries)) return [];
  return result.entries.map(mapNoticeMessage);
}

export async function fetchHomeMessageItems({ ctx = "allow" } = {}) {
  const [matterMessages, noticeMessages] = await Promise.allSettled([
    collectMatterChannelMessages(ctx),
    collectNoticeMessages(ctx)
  ]);
  const items = [
    ...(matterMessages.status === "fulfilled" ? matterMessages.value : []),
    ...(noticeMessages.status === "fulfilled" ? noticeMessages.value : [])
  ];
  return dedupeMessages(items)
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")))
    .slice(0, HOME_MESSAGE_LIMIT);
}
