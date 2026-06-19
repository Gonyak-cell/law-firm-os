import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const referenceDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");
const registryPath = path.join(referenceDir, "matter-amplitude-screenshot-state-registry.json");
const outJson = path.join(referenceDir, "matter-amplitude-pixel-parity-audit.json");
const outCsv = path.join(referenceDir, "matter-amplitude-pixel-parity-audit.csv");
const outMd = path.join(referenceDir, "visual-parity", "phase-01-pixel-parity-audit.md");
const baseUrl = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const viewport = { width: 1920, height: 1320 };

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const rows = registry.rows;
const uniqueRoutes = [...new Set(rows.map((row) => row.matter_route))];

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const round = (value, places = 4) => Number(value.toFixed(places));
const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const imageDataUrl = (filePath) => {
  const bytes = fs.readFileSync(path.join(root, filePath));
  return `data:image/png;base64,${bytes.toString("base64")}`;
};

const screenshotDataUrl = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`;

const compareImages = async (page, sourceDataUrl, matterDataUrl) =>
  page.evaluate(
    async ({ sourceDataUrl: sourceUrl, matterDataUrl: matterUrl }) => {
      const loadImage = (url) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("image-load-failed"));
          image.src = url;
        });

      const [sourceImage, matterImage] = await Promise.all([loadImage(sourceUrl), loadImage(matterUrl)]);
      const width = 160;
      const height = 110;
      const sourceCropHeight = Math.floor(sourceImage.naturalHeight * 0.9);
      const matterCropHeight = Math.floor(matterImage.naturalHeight * 0.9);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(sourceImage, 0, 0, sourceImage.naturalWidth, sourceCropHeight, 0, 0, width, height);
      const source = ctx.getImageData(0, 0, width, height).data;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(matterImage, 0, 0, matterImage.naturalWidth, matterCropHeight, 0, 0, width, height);
      const matter = ctx.getImageData(0, 0, width, height).data;

      let rgbDelta = 0;
      let changed = 0;
      let sourceWhite = 0;
      let matterWhite = 0;
      let sourceBlue = 0;
      let matterBlue = 0;
      const sourceAvg = [0, 0, 0];
      const matterAvg = [0, 0, 0];
      const pixelCount = width * height;

      for (let offset = 0; offset < source.length; offset += 4) {
        const sr = source[offset];
        const sg = source[offset + 1];
        const sb = source[offset + 2];
        const mr = matter[offset];
        const mg = matter[offset + 1];
        const mb = matter[offset + 2];
        const delta = Math.abs(sr - mr) + Math.abs(sg - mg) + Math.abs(sb - mb);

        rgbDelta += delta;
        if (delta / 3 > 24) changed += 1;
        if (sr > 245 && sg > 245 && sb > 245) sourceWhite += 1;
        if (mr > 245 && mg > 245 && mb > 245) matterWhite += 1;
        if (sb > 120 && sb > sr + 24 && sb > sg + 10) sourceBlue += 1;
        if (mb > 120 && mb > mr + 24 && mb > mg + 10) matterBlue += 1;
        sourceAvg[0] += sr;
        sourceAvg[1] += sg;
        sourceAvg[2] += sb;
        matterAvg[0] += mr;
        matterAvg[1] += mg;
        matterAvg[2] += mb;
      }

      const meanDelta = rgbDelta / (pixelCount * 3);
      const sourceAverage = sourceAvg.map((value) => value / pixelCount);
      const matterAverage = matterAvg.map((value) => value / pixelCount);
      const brightnessDelta =
        Math.abs(sourceAverage[0] + sourceAverage[1] + sourceAverage[2] - (matterAverage[0] + matterAverage[1] + matterAverage[2])) / 3;

      return {
        sample_width: width,
        sample_height: height,
        source_crop_height_ratio: sourceCropHeight / sourceImage.naturalHeight,
        matter_crop_height_ratio: matterCropHeight / matterImage.naturalHeight,
        mean_absolute_rgb_delta: meanDelta,
        lowres_similarity: 1 - meanDelta / 255,
        changed_pixel_ratio: changed / pixelCount,
        source_white_ratio: sourceWhite / pixelCount,
        matter_white_ratio: matterWhite / pixelCount,
        source_blue_ratio: sourceBlue / pixelCount,
        matter_blue_ratio: matterBlue / pixelCount,
        white_ratio_delta: Math.abs(sourceWhite - matterWhite) / pixelCount,
        blue_ratio_delta: Math.abs(sourceBlue - matterBlue) / pixelCount,
        brightness_delta: brightnessDelta,
        source_average_rgb: sourceAverage,
        matter_average_rgb: matterAverage
      };
    },
    { sourceDataUrl, matterDataUrl }
  );

const routeScreenshots = new Map();
const browser = await chromium.launch();
const appPage = await browser.newPage({ viewport });
const comparePage = await browser.newPage();

for (const route of uniqueRoutes) {
  await appPage.setViewportSize(viewport);
  await appPage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await appPage.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  routeScreenshots.set(route, await appPage.screenshot({ fullPage: false }));
  console.log(`captured ${route}`);
}

const auditRows = [];
for (const row of rows) {
  const sourceExists = fs.existsSync(path.join(root, row.source_file));
  if (!sourceExists) {
    auditRows.push({
      ...row,
      audit_status: "source_missing",
      audit_note: "Source Amplitude screenshot file was not found."
    });
    continue;
  }

  const metrics = await compareImages(
    comparePage,
    imageDataUrl(row.source_file),
    screenshotDataUrl(routeScreenshots.get(row.matter_route))
  );

  const lowresSimilarity = round(metrics.lowres_similarity);
  const changedPixelRatio = round(metrics.changed_pixel_ratio);
  const whiteRatioDelta = round(metrics.white_ratio_delta);
  const blueRatioDelta = round(metrics.blue_ratio_delta);
  const brightnessDelta = round(metrics.brightness_delta, 2);
  const auditStatus =
    lowresSimilarity >= 0.86 && changedPixelRatio <= 0.4
      ? "pixel_baseline_close"
      : lowresSimilarity >= 0.78 && changedPixelRatio <= 0.55
        ? "layout_baseline_aligned"
        : "needs_pixel_tuning";

  auditRows.push({
    ...row,
    audit_status: auditStatus,
    lowres_similarity: lowresSimilarity,
    mean_absolute_rgb_delta: round(metrics.mean_absolute_rgb_delta, 2),
    changed_pixel_ratio: changedPixelRatio,
    source_white_ratio: round(metrics.source_white_ratio),
    matter_white_ratio: round(metrics.matter_white_ratio),
    white_ratio_delta: whiteRatioDelta,
    source_blue_ratio: round(metrics.source_blue_ratio),
    matter_blue_ratio: round(metrics.matter_blue_ratio),
    blue_ratio_delta: blueRatioDelta,
    brightness_delta: brightnessDelta,
    audit_note:
      auditStatus === "needs_pixel_tuning"
        ? "Route/state exists, but source-to-matter low-resolution pixel metrics require a screenshot-specific tuning pass."
        : "Route/state exists and low-resolution layout/color metrics are within the current baseline threshold."
  });
}

await browser.close();

const statusSummary = Object.entries(
  auditRows.reduce((acc, row) => {
    acc[row.audit_status] = (acc[row.audit_status] ?? 0) + 1;
    return acc;
  }, {})
).map(([status, count]) => ({ status, count }));

const measuredRows = auditRows.filter((row) => typeof row.lowres_similarity === "number");
const phaseSummary = Object.values(
  auditRows.reduce((acc, row) => {
    const phase = row.implementation_phase;
    acc[phase] ??= {
      phase,
      count: 0,
      mean_lowres_similarity: [],
      mean_changed_pixel_ratio: [],
      status_counts: {}
    };
    acc[phase].count += 1;
    if (typeof row.lowres_similarity === "number") acc[phase].mean_lowres_similarity.push(row.lowres_similarity);
    if (typeof row.changed_pixel_ratio === "number") acc[phase].mean_changed_pixel_ratio.push(row.changed_pixel_ratio);
    acc[phase].status_counts[row.audit_status] = (acc[phase].status_counts[row.audit_status] ?? 0) + 1;
    return acc;
  }, {})
).map((phase) => ({
  ...phase,
  mean_lowres_similarity: phase.mean_lowres_similarity.length ? round(mean(phase.mean_lowres_similarity)) : null,
  mean_changed_pixel_ratio: phase.mean_changed_pixel_ratio.length ? round(mean(phase.mean_changed_pixel_ratio)) : null
}));

const sortedDriftRows = [...measuredRows].sort((a, b) => a.lowres_similarity - b.lowres_similarity).slice(0, 24);
const summary = {
  schema_version: "matter.amplitude.pixel-parity-audit.v1",
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  screenshot_count: rows.length,
  unique_route_count: uniqueRoutes.length,
  sample: { width: 160, height: 110 },
  policy:
    "This is a low-resolution quantitative audit for prioritizing pixel tuning. It excludes the bottom Mobbin attribution band from source screenshots and is not a final per-screenshot pixel parity pass.",
  thresholds: {
    pixel_baseline_close: "lowres_similarity >= 0.86 and changed_pixel_ratio <= 0.40",
    layout_baseline_aligned: "lowres_similarity >= 0.78 and changed_pixel_ratio <= 0.55",
    needs_pixel_tuning: "below the current baseline thresholds"
  },
  status_summary: statusSummary,
  aggregate: measuredRows.length
    ? {
        mean_lowres_similarity: round(mean(measuredRows.map((row) => row.lowres_similarity))),
        min_lowres_similarity: round(Math.min(...measuredRows.map((row) => row.lowres_similarity))),
        max_lowres_similarity: round(Math.max(...measuredRows.map((row) => row.lowres_similarity))),
        mean_changed_pixel_ratio: round(mean(measuredRows.map((row) => row.changed_pixel_ratio))),
        mean_white_ratio_delta: round(mean(measuredRows.map((row) => row.white_ratio_delta))),
        mean_blue_ratio_delta: round(mean(measuredRows.map((row) => row.blue_ratio_delta)))
      }
    : null,
  phase_summary: phaseSummary,
  largest_drifts: sortedDriftRows.map((row) => ({
    screenshot_id: row.screenshot_id,
    flow_id: row.flow_id,
    implementation_phase: row.implementation_phase,
    matter_route: row.matter_route,
    lowres_similarity: row.lowres_similarity,
    changed_pixel_ratio: row.changed_pixel_ratio,
    audit_status: row.audit_status
  })),
  rows: auditRows
};

const csvHeaders = [
  "screenshot_id",
  "source_file",
  "flow_id",
  "screen_family",
  "implementation_phase",
  "matter_route",
  "audit_status",
  "lowres_similarity",
  "changed_pixel_ratio",
  "white_ratio_delta",
  "blue_ratio_delta",
  "brightness_delta",
  "audit_note"
];

const csv = [
  csvHeaders.join(","),
  ...auditRows.map((row) => csvHeaders.map((header) => csvCell(row[header])).join(","))
].join("\n");

const md = `# phase-01 Pixel Parity Audit

Generated at: ${summary.generated_at}

## Policy

This is a quantitative low-resolution audit for prioritizing screenshot-specific tuning. It excludes the bottom Mobbin attribution band from source screenshots and proves that all Amplitude screenshots can be compared against a reachable matter route/state, but it does not claim final per-screenshot pixel parity.

## Summary

- Screenshot rows audited: ${summary.screenshot_count}
- Unique matter route captures: ${summary.unique_route_count}
- Sample size per comparison: ${summary.sample.width} x ${summary.sample.height}
- Mean low-resolution similarity: ${summary.aggregate?.mean_lowres_similarity ?? "n/a"}
- Mean changed pixel ratio: ${summary.aggregate?.mean_changed_pixel_ratio ?? "n/a"}

| Status | Screenshot count |
| --- | ---: |
${statusSummary.map((entry) => `| ${entry.status} | ${entry.count} |`).join("\n")}

## Phase Summary

| Phase | Screenshots | Mean similarity | Mean changed ratio | Status counts |
| --- | ---: | ---: | ---: | --- |
${phaseSummary
  .map(
    (phase) =>
      `| ${phase.phase} | ${phase.count} | ${phase.mean_lowres_similarity ?? "n/a"} | ${
        phase.mean_changed_pixel_ratio ?? "n/a"
      } | ${Object.entries(phase.status_counts)
        .map(([status, count]) => `${status}: ${count}`)
        .join("; ")} |`
  )
  .join("\n")}

## Largest Drift Rows

| Screenshot | Flow | Phase | Route | Similarity | Changed ratio | Status |
| ---: | --- | --- | --- | ---: | ---: | --- |
${sortedDriftRows
  .map(
    (row) =>
      `| ${row.screenshot_id} | ${row.flow_id} | ${row.implementation_phase} | \`${row.matter_route}\` | ${row.lowres_similarity} | ${row.changed_pixel_ratio} | ${row.audit_status} |`
  )
  .join("\n")}

## Next Gate

- Use the largest-drift rows to tune auth modal placement, public/auth overlays, specific dropdowns, date pickers, heatmaps, and admin/settings panels.
- Re-run this audit after each tuning pass and promote rows only when source-to-matter visual metrics and direct screenshot inspection both pass.
`;

fs.writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(outCsv, `${csv}\n`);
fs.writeFileSync(outMd, md);

console.log(`pixel parity audit rows: ${auditRows.length}`);
for (const entry of statusSummary) {
  console.log(`${entry.status}: ${entry.count}`);
}
