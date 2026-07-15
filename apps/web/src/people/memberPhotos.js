export function memberPhotoFor(member) {
  const photoUrl = typeof member?.photo_url === "string" ? member.photo_url.trim() : "";
  return photoUrl.startsWith("data:image/") ? photoUrl : undefined;
}
