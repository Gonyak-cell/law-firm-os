import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(__dirname, "..");

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonIfExists(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function formatKst(date) {
  return (
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(" ", "T") + "+09:00"
  );
}

function dayKey(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function labelFromKst(kst) {
  return kst.slice(0, 16).replace("T", " ");
}

function sumUnits(rows) {
  return rows.reduce((sum, row) => sum + row.units, 0);
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function listPackManifests(root) {
  const packsRoot = path.join(root, "docs/closeout-packs");
  return fs
    .readdirSync(packsRoot)
    .filter((name) => /^cp00-\d+$/.test(name))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
    .map((dir) => {
      const manifest = readJson(root, path.join("docs/closeout-packs", dir, "manifest.json"));
      return {
        dir,
        pack: manifest.pack_id || dir.toUpperCase(),
        risk: manifest.risk_class || manifest.planned_risk_class || "A",
        units: manifest.unit_count ?? (Array.isArray(manifest.included_units) ? manifest.included_units.length : 0),
      };
    });
}

function readActivePack(root, nextQueue) {
  if (!nextQueue?.pack_id) return null;

  const packDir = nextQueue.pack_id.toLowerCase();
  const manifestPath = path.join("docs/closeout-packs", packDir, "manifest.json");
  const manifest = readJsonIfExists(root, manifestPath);
  if (!manifest) return null;

  const receiptPath = path.join("artifacts/closeout-pack-claude-review", packDir, "review-receipt.json");
  const validReceipts = manifest.pack_level_claude_review?.valid_review_receipts || manifest.valid_review_receipts || [];
  const invalidAttempts = manifest.pack_level_claude_review?.invalid_review_attempts || manifest.invalid_review_attempts || [];

  return {
    pack: manifest.pack_id || nextQueue.pack_id,
    status: manifest.status || "unknown",
    productionReady: manifest.production_ready === true,
    implementationLayer: manifest.implementation_layer || "unknown",
    runtimeReady: manifest.runtime_ready === true,
    productionReadyFlag: manifest.production_ready_flag || null,
    reviewStatus: manifest.pack_level_claude_review?.status || "unknown",
    validReceiptCount: Array.isArray(validReceipts) ? validReceipts.length : 0,
    invalidAttemptCount: Array.isArray(invalidAttempts) ? invalidAttempts.length : 0,
    canonicalReceiptPresent: fs.existsSync(path.join(root, receiptPath)),
    units: manifest.unit_count ?? nextQueue.unit_count ?? 0,
    risk: manifest.risk_class || nextQueue.risk_class || "A",
    range: nextQueue.range_description || manifest.plan_binding_snapshot?.range?.description || null,
    primarySubphase: manifest.primary_subphase_id || null,
    nextSubphase: manifest.next_subphase || null,
    deliveryCounts: manifest.delivery_counts || {},
    manifestPath,
    receiptPath,
  };
}

function readCloseoutCommits(root, manifestUnits) {
  const output = execSync("git log --date=iso-strict --pretty=format:'%h%x09%cI%x09%s' --all --max-count=2000", {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (!output) return [];

  return output
    .split("\n")
    .map((line) => {
      const [hash, iso, subject] = line.split("\t");
      const match = subject?.match(/Close (CP00-\d+)/i);
      if (!match) return null;
      const pack = match[1].toUpperCase();
      return {
        hash,
        t: new Date(iso),
        iso,
        pack,
        units: manifestUnits.get(pack) || 0,
        subject,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);
}

export function getProgressSnapshot({ root = defaultRoot, now = new Date() } = {}) {
  const manifests = listPackManifests(root);
  const manifestUnits = new Map(manifests.map((manifest) => [manifest.pack, manifest.units]));
  const rows = readCloseoutCommits(root, manifestUnits);
  const plan = readJson(root, "docs/closeout-pack-plan/closeout-pack-plan.json");
  const queue = readJson(root, "docs/closeout-pack-plan/next-pack-queue.json");
  const implementationLayerLedger = readJsonIfExists(root, "docs/closeout-pack-plan/implementation-layer-ledger.json");
  const nextQueue = queue.packs[0] || null;
  const activePack = readActivePack(root, nextQueue);

  const total = plan.expanded_product_scope.expanded_total_units;
  const hrxUnitsInPlan = plan.expanded_product_scope.hrx_units_in_plan_source === true;
  const plannedHrxUnits = plan.summary.planned_unit_distribution_by_program?.RP30 ?? 0;
  const remainingHrx = hrxUnitsInPlan ? plannedHrxUnits : plan.expanded_product_scope.hrx_embedded_people_units;
  const remainingLaw = hrxUnitsInPlan ? plan.summary.planned_unit_count - remainingHrx : plan.summary.planned_unit_count;
  const remaining = remainingLaw + remainingHrx;
  const completed = total - remaining;
  const completedPackUnits = sumUnits(rows);
  const latest = rows.at(-1) || null;

  const windows = [1, 3, 6, 12, 24, 48].map((hours) => {
    const start = new Date(now.getTime() - hours * 3600 * 1000);
    const windowRows = rows.filter((row) => row.t >= start && row.t <= now);
    const units = sumUnits(windowRows);
    return {
      hours,
      units,
      rate: round(units / hours),
      packs: windowRows.length,
      ids: windowRows.map((row) => `${row.pack}:${row.units}`),
    };
  });

  const daily = [...new Set(rows.map((row) => dayKey(row.t)))].slice(-5).map((date) => {
    const dayRows = rows.filter((row) => dayKey(row.t) === date);
    const units = sumUnits(dayRows);
    const activeHours = dayRows.length > 1 ? (dayRows.at(-1).t - dayRows[0].t) / 3600000 : 0;
    return {
      date,
      label: date.slice(5),
      packs: dayRows.length,
      units,
      fullRate: round(units / 24),
      activeRate: activeHours ? round(units / activeHours) : 0,
      first: dayRows[0]?.pack || null,
      last: dayRows.at(-1)?.pack || null,
    };
  });

  const riskCounts = {};
  const riskUnits = {};
  for (const manifest of manifests) {
    riskCounts[manifest.risk] = (riskCounts[manifest.risk] || 0) + 1;
    riskUnits[manifest.risk] = (riskUnits[manifest.risk] || 0) + manifest.units;
  }

  const etaScenarioRates = [
    150, 175, 200, 225, 250,
    300, 350, 400, 450, 500,
    550, 600, 650, 700,
  ];
  const oneHourRate = windows.find((window) => window.hours === 1)?.rate || 200;
  const activeEtaRate = etaScenarioRates.reduce((best, rate) => (
    Math.abs(rate - oneHourRate) < Math.abs(best - oneHourRate) ? rate : best
  ), etaScenarioRates[0]);

  const etaRates = etaScenarioRates.map((rate) => {
    const hours = remaining / rate;
    const eta = new Date(now.getTime() + hours * 3600 * 1000);
    return {
      rate,
      days: round(hours / 24, 1),
      eta: labelFromKst(formatKst(eta)),
      active: rate === activeEtaRate,
    };
  });

  const nowKst = formatKst(now);
  const implementationLayers = implementationLayerLedger
    ? {
        summary: implementationLayerLedger.summary,
        byLayer: implementationLayerLedger.summary?.layer_counts ?? {},
        bySource: implementationLayerLedger.summary?.layer_source_counts ?? {},
        runtimeReadyPacks: implementationLayerLedger.summary?.runtime_ready_packs ?? 0,
      }
    : null;
  return {
    now: nowKst,
    snapshotLabel: labelFromKst(nowKst),
    liveCursor: plan.live_state,
    total,
    completed,
    remaining,
    remainingLaw,
    remainingHrx,
    hrxUnitsInPlan,
    progress: round((completed / total) * 100),
    packCount: rows.length,
    completedPackUnits,
    latest: latest
      ? {
          hash: latest.hash,
          pack: latest.pack,
          units: latest.units,
          time: formatKst(latest.t).slice(11, 16),
          committedAt: formatKst(latest.t),
          subject: latest.subject.replace(/^Close /, ""),
        }
      : null,
    windows,
    daily,
    riskCounts,
    riskUnits,
    recent: rows.slice(-14).map((row) => ({
      pack: row.pack,
      units: row.units,
      time: formatKst(row.t).slice(11, 16),
      subject: row.subject.replace(/^Close /, "").replace(/^CP00-\d+\s+/, ""),
      hash: row.hash,
    })),
    etaRates,
    implementationLayers,
    activePack,
    nextQueue,
    planSummary: plan.summary,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(getProgressSnapshot(), null, 2)}\n`);
}
