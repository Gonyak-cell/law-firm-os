import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const archiveDir = process.env.LAWOS_UI_ARCHIVE_DIR ?? path.join(root, "Law Firm OS UI");
const sourceDir = path.join(archiveDir, "Amplitude web Feb 2025");
const outDir = path.join(root, "docs", "ui-reference", "amplitude-feb-2025");
const parityDir = path.join(outDir, "visual-parity");

const sampleIds = [
  0, 1, 4, 5, 8, 11, 14, 20, 41, 45, 69, 120, 148, 179, 196, 216, 249, 280, 297, 299, 303, 306, 312, 317
];

function readPng(filePath) {
  const bytes = fs.readFileSync(filePath);
  const signature = bytes.subarray(0, 8);
  if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`${filePath} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`${filePath} uses unsupported PNG format bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);

  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[read];
    read += 1;
    const row = inflated.subarray(read, read + stride);
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value = row[x];

      if (filter === 1) value = (value + left) & 0xff;
      if (filter === 2) value = (value + up) & 0xff;
      if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      if (filter === 4) value = (value + paeth(left, up, upLeft)) & 0xff;

      out[x] = value;
    }
    read += stride;
  }

  return { width, height, channels, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function hex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function quantize(value) {
  return Math.min(255, Math.round(value / 8) * 8);
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function collectPalette(image) {
  const counts = new Map();
  const { width, height, channels, pixels } = image;
  const sampleBottom = Math.max(0, height - 120);

  for (let y = 0; y < sampleBottom; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const index = (y * width + x) * channels;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      if (channels === 4 && pixels[index + 3] < 200) continue;
      const key = hex(quantize(r), quantize(g), quantize(b));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([color, count]) => ({ color, count }));
}

function samplePoint(image, x, y) {
  const { width, height, channels, pixels } = image;
  const clampedX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(height - 1, Math.round(y)));
  const index = (clampedY * width + clampedX) * channels;
  return hex(pixels[index], pixels[index + 1], pixels[index + 2]);
}

function representativeSamples(id, image) {
  const { width, height } = image;
  return {
    screenshot_id: id,
    shell_topbar: samplePoint(image, width * 0.5, 24),
    shell_sidebar: samplePoint(image, 34, height * 0.24),
    page_canvas: samplePoint(image, width * 0.5, height * 0.16),
    panel_surface: samplePoint(image, width * 0.46, height * 0.25),
    panel_border_candidate: samplePoint(image, width * 0.5, height * 0.49),
    primary_action_candidate: samplePoint(image, width * 0.9, 36),
    modal_overlay_candidate: samplePoint(image, width * 0.2, height * 0.2),
    modal_surface_candidate: samplePoint(image, width * 0.5, height * 0.28),
    dark_theme_candidate: samplePoint(image, width * 0.5, height * 0.25)
  };
}

function classifyPalette(palette) {
  const buckets = {
    neutral_light: [],
    neutral_mid: [],
    neutral_dark: [],
    blue: [],
    green: [],
    red_or_pink: [],
    purple: [],
    yellow_or_orange: []
  };

  for (const entry of palette) {
    const r = Number.parseInt(entry.color.slice(1, 3), 16);
    const g = Number.parseInt(entry.color.slice(3, 5), 16);
    const b = Number.parseInt(entry.color.slice(5, 7), 16);
    const lum = luminance(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;

    if (saturation < 18) {
      if (lum > 216) buckets.neutral_light.push(entry);
      else if (lum > 96) buckets.neutral_mid.push(entry);
      else buckets.neutral_dark.push(entry);
    } else if (b > r + 22 && b > g - 6) {
      buckets.blue.push(entry);
    } else if (g > r + 20 && g > b + 5) {
      buckets.green.push(entry);
    } else if (r > g + 32 && b > g + 8) {
      buckets.red_or_pink.push(entry);
    } else if (b > g + 12 && r > g + 8) {
      buckets.purple.push(entry);
    } else if (r > b + 24 && g > b + 12) {
      buckets.yellow_or_orange.push(entry);
    }
  }

  return Object.fromEntries(
    Object.entries(buckets).map(([bucket, entries]) => [bucket, entries.slice(0, 8)])
  );
}

const extracted = [];
const sampleRows = [];

for (const id of sampleIds) {
  const file = path.join(sourceDir, `Amplitude web Feb 2025 ${id}.png`);
  const image = readPng(file);
  const palette = collectPalette(image);
  extracted.push({
    screenshot_id: id,
    file: path.relative(root, file),
    width: image.width,
    height: image.height,
    palette,
    buckets: classifyPalette(palette)
  });
  sampleRows.push(representativeSamples(id, image));
}

const tokenDoc = {
  schema_version: "matter.amplitude.visual-tokens.v1",
  generated_at: new Date().toISOString(),
  source_corpus: "Law Firm OS UI/Amplitude web Feb 2025",
  sample_screenshot_ids: sampleIds,
  extraction_note:
    "Palette values are sampled from the Amplitude corpus and quantized to 8-point RGB buckets. The bottom Mobbin attribution band is excluded from sampling.",
  token_contract: {
    color: {
      canvas: { value: "#f5f7fa", source: "dominant app canvas and auth background samples" },
      canvas_muted: { value: "#eef2f6", source: "sidebar and auth shell samples" },
      surface: { value: "#ffffff", source: "panel, modal, table, and topbar samples" },
      surface_subtle: { value: "#f8fafc", source: "table header, hover row, setup card samples" },
      border: { value: "#d8dee8", source: "panel and table grid candidate samples" },
      border_soft: { value: "#e7ebf1", source: "subtle dividers and input borders" },
      text: { value: "#202428", source: "primary text candidates" },
      text_muted: { value: "#64707d", source: "secondary labels and sidebar text" },
      text_faint: { value: "#8a96a4", source: "placeholder and helper text" },
      active_blue: { value: "#0b65e5", source: "primary CTA and selected navigation candidates" },
      active_blue_hover: { value: "#0758cf", source: "observed darker primary action states" },
      active_blue_soft: { value: "#e8f1ff", source: "selected rows, cards, tabs, and blue notices" },
      teal: { value: "#00a88f", source: "invite/setup completion accents" },
      success: { value: "#13a66b", source: "positive validation and setup states" },
      warning: { value: "#f5a524", source: "warning badges and plan notices" },
      danger: { value: "#d93025", source: "destructive modal and error states" },
      dark_canvas: { value: "#14181d", source: "dark-mode screenshots 297-302" },
      dark_sidebar: { value: "#181d23", source: "dark-mode navigation samples" },
      dark_surface: { value: "#1f242b", source: "dark-mode panels" },
      dark_border: { value: "#343b45", source: "dark-mode dividers" }
    },
    radius: {
      xs: "2px",
      sm: "4px",
      md: "6px",
      modal: "4px",
      pill: "999px"
    },
    spacing: {
      unit: "4px",
      shell_topbar_height: "48px",
      sidebar_icon_rail_width: "56px",
      sidebar_width: "216px",
      content_padding_x: "20px",
      content_padding_y: "16px",
      panel_padding: "16px",
      compact_panel_padding: "12px",
      table_row_height: "34px",
      table_header_height: "32px",
      toolbar_height: "44px",
      input_height: "32px",
      button_height: "32px",
      modal_width_sm: "420px",
      modal_width_md: "560px",
      side_panel_width: "360px"
    },
    shadow: {
      panel: "0 1px 2px rgba(15, 23, 42, 0.08)",
      floating: "0 16px 44px rgba(15, 23, 42, 0.24)",
      modal: "0 24px 70px rgba(15, 23, 42, 0.28)"
    }
  },
  extracted_samples: extracted,
  semantic_samples: sampleRows
};

const layoutRows = [
  ["metric", "value", "reference", "implementation_target"],
  ["viewport", "1920x1320", "all screenshots", "Playwright parity desktop capture"],
  ["topbar height", "48px", "14-317 app chrome", "var(--am-topbar-height)"],
  ["icon rail width", "56px", "14-317 left rail", "var(--am-rail-width)"],
  ["secondary sidebar width", "216px", "analytics/admin side navigation", "var(--am-sidebar-width)"],
  ["page gutter", "20px x 16px", "home, builder, profile pages", "var(--am-page-pad-x/y)"],
  ["panel padding", "16px standard / 12px compact", "dashboard cards and builder blocks", "var(--am-panel-pad)"],
  ["table row height", "34px", "all-content, profiles, heatmap, team tables", "var(--am-table-row-height)"],
  ["table header height", "32px", "table surfaces", "var(--am-table-header-height)"],
  ["input/button height", "32px", "toolbar, filters, auth forms", "var(--am-control-height)"],
  ["radius", "2px, 4px, 6px, 999px", "buttons, inputs, panels, pills", "tokenized radius scale"],
  ["modal width", "420px small / 560px medium", "auth, save/share/invite dialogs", "modal size variants"],
  ["side panel width", "360px", "resource, recommendation, setup panels", "var(--am-side-panel-width)"],
  ["dark theme", "dark canvas/surface/border tokens", "297-302", "data-theme=dark token override"]
];

const parityPlan = `# matter Amplitude Visual Parity Plan

## Purpose

This gate turns the Amplitude Feb 2025 corpus into a measurable visual contract for the matter rebuild. The implementation must not stop at an Amplitude-like mood: layout, spacing, radius, color, elevation, density, modal/dropdown states, and dark theme all need traceable parity evidence.

## Source Contract

- Corpus: \`Law Firm OS UI/Amplitude web Feb 2025\`
- Screenshot count: 318
- Native viewport: 1920 x 1320
- Existing mapping: \`amplitude-screenshot-inventory.json\`, \`amplitude-coverage-matrix.csv\`
- Token source: \`amplitude-visual-tokens.json\`
- Layout source: \`amplitude-layout-metrics.csv\`

## Required Token Families

- Color: canvas, sidebars, panels, table headers, borders, text, muted text, active blue, soft blue, success, warning, danger, dark theme.
- Spacing: 4px base grid, topbar, rail, sidebar, page gutters, panel padding, table row/header heights, controls, modal/body/footer paddings.
- Shape: 2px micro radius, 4px default radius, 6px larger surface radius, pill radius only for chips.
- Elevation: mostly flat surfaces, 1px borders first, floating/modal shadows only for overlays.
- Gradients: only on surfaces where the screenshots show actual gradient/illustration treatment. No decorative gradient backgrounds in app chrome.
- State: hover, active, selected, disabled, focus, validation, empty, loading, dimmed overlay, dark mode.

## Implementation Rule

All app chrome and reusable UI must consume CSS custom properties prefixed with \`--am-\`. Hardcoded hex, one-off padding, one-off radius, and non-token shadows fail the parity gate unless the fidelity ledger records a deliberate exception.

## Per-Phase Evidence

For every implementation phase:

1. List reference screenshot IDs in \`phase-XX-reference-list.md\`.
2. Capture Korean and English at 1920 x 1320.
3. Capture Korean and English at mobile width.
4. Write \`phase-XX-fidelity-ledger.md\` with at least these checks:
   - shell dimensions
   - page gutter and panel spacing
   - table/header row density
   - control height/radius/colors
   - modal/dropdown/side-panel anatomy
   - font loading and bilingual overflow
   - dark-mode behavior when applicable

## Acceptance

A screenshot moves from \`planned\` to \`verified\` only when the corresponding component, flow state, and visual parity evidence exist. A screenshot can be \`componentized\` when its exact state is represented by a reusable component family and documented in the fidelity ledger.
`;

fs.mkdirSync(parityDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "amplitude-visual-tokens.json"), `${JSON.stringify(tokenDoc, null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, "amplitude-layout-metrics.csv"),
  `${layoutRows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")}\n`
);
fs.writeFileSync(path.join(outDir, "matter-amplitude-visual-parity-plan.md"), parityPlan);

console.log(`Extracted ${sampleIds.length} Amplitude visual-token samples`);
console.log(path.join(outDir, "amplitude-visual-tokens.json"));
console.log(path.join(outDir, "amplitude-layout-metrics.csv"));
console.log(path.join(outDir, "matter-amplitude-visual-parity-plan.md"));
