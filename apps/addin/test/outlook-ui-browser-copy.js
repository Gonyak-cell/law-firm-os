const COPY_ACTION_NAMES = new Set([
  "원본 복사",
  "matter 원본 식별자 복사",
  "문의 원본 식별자 복사",
]);

export function isExactCopyAction(snapshot) {
  const name = snapshot?.match(/"([^"]+)"/u)?.[1]?.trim().toLocaleLowerCase("en-US");
  return Boolean(name && COPY_ACTION_NAMES.has(name));
}
