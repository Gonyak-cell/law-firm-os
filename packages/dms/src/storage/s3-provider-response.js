export function isS3NotFound(error) {
  return error?.$metadata?.httpStatusCode === 404
    || ["NotFound", "NoSuchKey", "NoSuchVersion"].includes(error?.name);
}

export async function readS3ResponseBody(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
