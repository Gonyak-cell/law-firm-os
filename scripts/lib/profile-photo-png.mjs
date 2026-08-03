import { inflateSync } from "node:zlib";

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 32 * 1024 * 1024;
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const LEGAL_DEPTHS = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);
const CHANNELS = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]);
const ADAM7 = Object.freeze([
  [0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4],
  [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2],
]);

export class ProfilePhotoPngError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProfilePhotoPngError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProfilePhotoPngError(code, message);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function passSize(size, start, step) {
  return size <= start ? 0 : Math.ceil((size - start) / step);
}

function scanlines(width, height, bitsPerPixel, interlace) {
  const passes = interlace === 0 ? [[0, 0, 1, 1]] : ADAM7;
  return passes.flatMap(([x, y, dx, dy]) => {
    const passWidth = passSize(width, x, dx);
    const passHeight = passSize(height, y, dy);
    if (passWidth === 0 || passHeight === 0) return [];
    return Array.from({ length: passHeight }, () => 1 + Math.ceil((passWidth * bitsPerPixel) / 8));
  });
}

function parseIhdr(data) {
  if (data.length !== 13) fail("PHOTO_PNG_IHDR_INVALID", "PNG IHDR must contain exactly thirteen bytes");
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  const bitDepth = data[8];
  const colorType = data[9];
  const compression = data[10];
  const filter = data[11];
  const interlace = data[12];
  if (width === 0 || height === 0 || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    fail("PHOTO_PNG_DIMENSIONS_INVALID", "PNG dimensions are outside the supported profile-photo boundary");
  }
  if (!LEGAL_DEPTHS.get(colorType)?.has(bitDepth) || compression !== 0 || filter !== 0 || ![0, 1].includes(interlace)) {
    fail("PHOTO_PNG_IHDR_INVALID", "PNG IHDR encoding fields are invalid");
  }
  return { width, height, bitDepth, colorType, interlace };
}

function validateDecodedRows(compressed, ihdr) {
  const rowSizes = scanlines(
    ihdr.width,
    ihdr.height,
    ihdr.bitDepth * CHANNELS.get(ihdr.colorType),
    ihdr.interlace,
  );
  const expectedBytes = rowSizes.reduce((sum, size) => sum + size, 0);
  if (expectedBytes > MAX_DECODED_BYTES) fail("PHOTO_PNG_DECODE_SIZE", "PNG decoded image exceeds the bounded profile-photo size");
  let result;
  try {
    result = inflateSync(compressed, { info: true, maxOutputLength: expectedBytes + 1 });
  } catch {
    fail("PHOTO_PNG_DECODE_FAILED", "PNG image data cannot be decoded");
  }
  if (result.buffer.length !== expectedBytes || result.engine.bytesWritten !== compressed.length) {
    fail("PHOTO_PNG_DECODE_SIZE", "PNG decoded scanlines or compressed stream length are invalid");
  }
  let offset = 0;
  for (const rowSize of rowSizes) {
    if (result.buffer[offset] > 4) fail("PHOTO_PNG_FILTER_INVALID", "PNG scanline filter is invalid");
    offset += rowSize;
  }
}

export function validatePngBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < PNG_SIGNATURE.length || bytes.length > MAX_FILE_BYTES) {
    fail("PHOTO_PNG_SIZE_INVALID", "profile photo PNG byte length is invalid");
  }
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    fail("PHOTO_PNG_SIGNATURE_INVALID", "profile photo file does not have the PNG signature");
  }

  let offset = PNG_SIGNATURE.length;
  let ihdr = null;
  let paletteSeen = false;
  let paletteEntries = 0;
  let idatSeen = false;
  let idatClosed = false;
  let iendSeen = false;
  const compressedParts = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail("PHOTO_PNG_CHUNK_TRUNCATED", "PNG chunk header is truncated");
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) fail("PHOTO_PNG_CHUNK_TRUNCATED", "PNG chunk payload is truncated");
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    if ([...typeBytes].some((byte) => !((byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a)))
      || (typeBytes[2] & 0x20) !== 0) {
      fail("PHOTO_PNG_CHUNK_TYPE_INVALID", "PNG chunk type must contain four ASCII letters with an uppercase reserved byte");
    }
    const type = typeBytes.toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const observedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(Buffer.concat([typeBytes, data])) !== observedCrc) {
      fail("PHOTO_PNG_CRC_MISMATCH", "PNG chunk CRC is invalid");
    }
    if (!ihdr && type !== "IHDR") fail("PHOTO_PNG_IHDR_ORDER", "PNG IHDR must be the first chunk");
    if (iendSeen) fail("PHOTO_PNG_TRAILING_DATA", "PNG contains data after IEND");

    if (type === "IHDR") {
      if (ihdr) fail("PHOTO_PNG_IHDR_DUPLICATE", "PNG contains more than one IHDR chunk");
      ihdr = parseIhdr(data);
    } else if (type === "PLTE") {
      if (paletteSeen || idatSeen || length === 0 || length > 768 || length % 3 !== 0 || [0, 4].includes(ihdr.colorType)) {
        fail("PHOTO_PNG_PALETTE_INVALID", "PNG palette is invalid or misplaced");
      }
      paletteSeen = true;
      paletteEntries = length / 3;
    } else if (type === "IDAT") {
      if (idatClosed || length === 0) fail("PHOTO_PNG_IDAT_INVALID", "PNG IDAT chunks must be non-empty and contiguous");
      idatSeen = true;
      compressedParts.push(data);
    } else if (type === "IEND") {
      if (length !== 0 || !idatSeen) fail("PHOTO_PNG_IEND_INVALID", "PNG IEND is invalid or precedes image data");
      iendSeen = true;
      if (end !== bytes.length) fail("PHOTO_PNG_TRAILING_DATA", "PNG contains bytes after IEND");
    } else {
      if (idatSeen) idatClosed = true;
      if (/^[A-Z]/u.test(type)) fail("PHOTO_PNG_CRITICAL_CHUNK_UNKNOWN", "PNG contains an unknown critical chunk");
    }
    offset = end;
  }
  if (!ihdr || !iendSeen || offset !== bytes.length || (ihdr.colorType === 3 && (!paletteSeen || paletteEntries > 2 ** ihdr.bitDepth))) {
    fail("PHOTO_PNG_STRUCTURE_INVALID", "PNG is missing a required chunk or has trailing bytes");
  }
  validateDecodedRows(Buffer.concat(compressedParts), ihdr);
  return Object.freeze({ width: ihdr.width, height: ihdr.height });
}
