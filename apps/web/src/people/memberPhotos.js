const PROFILE_PHOTO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

function imageSignatureMatches(type, bytes) {
  if (type === "png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes.charCodeAt(index) === byte);
  if (type === "jpeg") return bytes.length >= 3 && bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255;
  return bytes.length >= 12 && bytes.slice(0, 4) === "RIFF" && bytes.slice(8, 12) === "WEBP";
}

export function memberPhotoFor(member) {
  const photoUrl = typeof member?.photo_url === "string" ? member.photo_url.trim() : "";
  const match = PROFILE_PHOTO_DATA_URL.exec(photoUrl);
  if (!match) return undefined;
  try {
    return imageSignatureMatches(match[1], globalThis.atob(match[2])) ? photoUrl : undefined;
  } catch {
    return undefined;
  }
}
