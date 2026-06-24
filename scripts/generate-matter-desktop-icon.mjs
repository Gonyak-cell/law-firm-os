#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceLogoPath = join(repoRoot, "docs/ui-reference/brand/matter-by-amic-logo.png");
const buildDir = join(repoRoot, "apps/desktop/build");
const webAssetMarkPath = join(repoRoot, "apps/web/src/assets/matter-mark.svg");
const webPublicMarkPath = join(repoRoot, "apps/web/public/matter-mark.svg");
const webAssetLogoPath = join(repoRoot, "apps/web/src/assets/matter-logo.svg");
const sourceMarkPath = join(buildDir, "icon-source-mark.png");
const svgIconPath = join(buildDir, "icon.svg");
const pngIconPath = join(buildDir, "icon.png");
const macIconPath = join(buildDir, "icon.icns");
const winIconPath = join(buildDir, "icon.ico");
const iconsetEntries = [
  ["icon_16x16.png", 16],
  ["icon_16x16@2x.png", 32],
  ["icon_32x32.png", 32],
  ["icon_32x32@2x.png", 64],
  ["icon_128x128.png", 128],
  ["icon_128x128@2x.png", 256],
  ["icon_256x256.png", 256],
  ["icon_256x256@2x.png", 512],
  ["icon_512x512.png", 512],
  ["icon_512x512@2x.png", 1024]
];
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

function pngDataUrlToBuffer(dataUrl) {
  const [, base64] = dataUrl.split(",");
  if (!base64) throw new Error("Expected a PNG data URL.");
  return Buffer.from(base64, "base64");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function createIco(entries) {
  const headerSize = 6;
  const directorySize = entries.length * 16;
  let imageOffset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(directorySize);
  for (const [index, entry] of entries.entries()) {
    const offset = index * 16;
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, offset);
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, offset + 1);
    directory.writeUInt8(0, offset + 2);
    directory.writeUInt8(0, offset + 3);
    directory.writeUInt16LE(1, offset + 4);
    directory.writeUInt16LE(32, offset + 6);
    directory.writeUInt32LE(entry.buffer.length, offset + 8);
    directory.writeUInt32LE(imageOffset, offset + 12);
    imageOffset += entry.buffer.length;
  }

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.buffer)]);
}

if (!existsSync(sourceLogoPath)) {
  throw new Error("Original matter logo image not found at docs/ui-reference/brand/matter-by-amic-logo.png.");
}

await mkdir(buildDir, { recursive: true });

const sourceLogo = await readFile(sourceLogoPath);
const sourceLogoDataUrl = `data:image/png;base64,${sourceLogo.toString("base64")}`;
const browser = await chromium.launch({ headless: true });

let generated;
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  generated = await page.evaluate(async ({ sourceLogoDataUrl, iconsetSizes, icoSizes }) => {
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load image: ${src.slice(0, 80)}`));
        image.src = src;
      });
    }

    function roundRectPath(context, x, y, width, height, radius) {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + width, y, x + width, y + height, radius);
      context.arcTo(x + width, y + height, x, y + height, radius);
      context.arcTo(x, y + height, x, y, radius);
      context.arcTo(x, y, x + width, y, radius);
      context.closePath();
    }

    const sourceImage = await loadImage(sourceLogoDataUrl);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceImage.naturalWidth;
    sourceCanvas.height = sourceImage.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    sourceContext.drawImage(sourceImage, 0, 0);

    const sourcePixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sourceCanvas.height; y += 1) {
      for (let x = 0; x < Math.min(sourceCanvas.width, 310); x += 1) {
        const alpha = sourcePixels[(y * sourceCanvas.width + x) * 4 + 3];
        if (alpha <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) {
      throw new Error("Unable to detect the left matter mark in the original logo image.");
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropContext = cropCanvas.getContext("2d");
    cropContext.drawImage(sourceCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 1024;
    iconCanvas.height = 1024;
    const iconContext = iconCanvas.getContext("2d");
    iconContext.save();
    roundRectPath(iconContext, 64, 64, 896, 896, 208);
    iconContext.fillStyle = "#FFFFFF";
    iconContext.fill();
    iconContext.strokeStyle = "#D9E1EC";
    iconContext.lineWidth = 8;
    iconContext.stroke();
    iconContext.restore();

    const targetWidth = 720;
    const targetHeight = targetWidth * (cropHeight / cropWidth);
    const targetX = (iconCanvas.width - targetWidth) / 2;
    const targetY = (iconCanvas.height - targetHeight) / 2;
    iconContext.imageSmoothingEnabled = true;
    iconContext.imageSmoothingQuality = "high";
    iconContext.drawImage(cropCanvas, targetX, targetY, targetWidth, targetHeight);

    const svgX = (targetX / 8).toFixed(3);
    const svgY = (targetY / 8).toFixed(3);
    const svgWidth = (targetWidth / 8).toFixed(3);
    const svgHeight = (targetHeight / 8).toFixed(3);
    const cropDataUrl = cropCanvas.toDataURL("image/png");
    const cropBase64 = cropDataUrl.split(",")[1];
    const iconDataUrl = iconCanvas.toDataURL("image/png");
    const sizes = [...new Set([...iconsetSizes, ...icoSizes])];
    const pngBySize = {};
    for (const size of sizes) {
      const sizedCanvas = document.createElement("canvas");
      sizedCanvas.width = size;
      sizedCanvas.height = size;
      const sizedContext = sizedCanvas.getContext("2d");
      sizedContext.imageSmoothingEnabled = true;
      sizedContext.imageSmoothingQuality = "high";
      sizedContext.drawImage(iconCanvas, 0, 0, size, size);
      pngBySize[size] = sizedCanvas.toDataURL("image/png");
    }

    const markSvg = `<svg width="238" height="160" viewBox="0 0 238 160" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="matter-mark-title">
  <title id="matter-mark-title">matter mark</title>
  <metadata>source: docs/ui-reference/brand/matter-by-amic-logo.png; crop: ${JSON.stringify({ minX, minY, maxX, maxY, cropWidth, cropHeight })}</metadata>
  <image href="data:image/png;base64,${cropBase64}" width="238" height="160" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
    const logoSvg = `<svg width="360" height="160" viewBox="0 0 360 160" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="matter-logo-title">
  <title id="matter-logo-title">matter</title>
  <metadata>source: docs/ui-reference/brand/matter-by-amic-logo.png; crop: ${JSON.stringify({ minX, minY, maxX, maxY, cropWidth, cropHeight })}</metadata>
  <image href="data:image/png;base64,${cropBase64}" x="0" y="0" width="238" height="160" preserveAspectRatio="xMidYMid meet"/>
  <text x="254" y="101" fill="#06102D" font-family="Avenir Next, Comfortaa, Inter, Arial, sans-serif" font-size="64" font-weight="300">matter</text>
</svg>
`;

    return {
      cropBounds: { minX, minY, maxX, maxY, cropWidth, cropHeight },
      cropDataUrl,
      iconDataUrl,
      markSvg,
      logoSvg,
      pngBySize,
      svg: `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="matter-icon-title">
  <title id="matter-icon-title">matter app icon</title>
  <metadata>source: docs/ui-reference/brand/matter-by-amic-logo.png; crop: ${JSON.stringify({ minX, minY, maxX, maxY, cropWidth, cropHeight })}</metadata>
  <rect x="8" y="8" width="112" height="112" rx="26" fill="#FFFFFF"/>
  <rect x="8.5" y="8.5" width="111" height="111" rx="25.5" stroke="#D9E1EC"/>
  <image href="data:image/png;base64,${cropBase64}" x="${svgX}" y="${svgY}" width="${svgWidth}" height="${svgHeight}" preserveAspectRatio="xMidYMid meet"/>
</svg>
`
    };
  }, {
    sourceLogoDataUrl,
    iconsetSizes: iconsetEntries.map(([, size]) => size),
    icoSizes
  });
} finally {
  await browser.close();
}

const sourceMarkBuffer = pngDataUrlToBuffer(generated.cropDataUrl);
const pngIconBuffer = pngDataUrlToBuffer(generated.iconDataUrl);
const icoEntries = icoSizes.map((size) => ({
  size,
  buffer: pngDataUrlToBuffer(generated.pngBySize[size])
}));
const icoBuffer = createIco(icoEntries);
const iconsetRoot = await mkdtemp(join(tmpdir(), "matter-desktop-iconset-"));
const iconsetDir = join(iconsetRoot, "matter.iconset");

try {
  await mkdir(iconsetDir, { recursive: true });
  await writeFile(sourceMarkPath, sourceMarkBuffer);
  await writeFile(webAssetMarkPath, generated.markSvg);
  await writeFile(webPublicMarkPath, generated.markSvg);
  await writeFile(webAssetLogoPath, generated.logoSvg);
  await writeFile(svgIconPath, generated.svg);
  await writeFile(pngIconPath, pngIconBuffer);
  await writeFile(winIconPath, icoBuffer);
  for (const [fileName, size] of iconsetEntries) {
    await writeFile(join(iconsetDir, fileName), pngDataUrlToBuffer(generated.pngBySize[size]));
  }
  await execFileAsync("/usr/bin/iconutil", ["-c", "icns", "-o", macIconPath, iconsetDir]);
} finally {
  await rm(iconsetRoot, { recursive: true, force: true });
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      source: "docs/ui-reference/brand/matter-by-amic-logo.png",
      crop: generated.cropBounds,
      outputs: {
        source_mark: "apps/desktop/build/icon-source-mark.png",
        web_asset_mark: "apps/web/src/assets/matter-mark.svg",
        web_public_mark: "apps/web/public/matter-mark.svg",
        web_asset_logo: "apps/web/src/assets/matter-logo.svg",
        svg: "apps/desktop/build/icon.svg",
        png: "apps/desktop/build/icon.png",
        icns: "apps/desktop/build/icon.icns",
        ico: "apps/desktop/build/icon.ico"
      },
      sha256: {
        source_mark: sha256(sourceMarkBuffer),
        web_asset_mark: sha256(Buffer.from(generated.markSvg)),
        web_asset_logo: sha256(Buffer.from(generated.logoSvg)),
        svg: sha256(Buffer.from(generated.svg)),
        png: sha256(pngIconBuffer),
        icns: sha256(await readFile(macIconPath)),
        ico: sha256(icoBuffer)
      }
    },
    null,
    2
  )
);
