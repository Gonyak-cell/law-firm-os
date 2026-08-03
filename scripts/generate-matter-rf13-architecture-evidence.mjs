import {
  chmodSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  MatterRf13ArchitectureEvidenceError,
  architectureEvidenceTemplate,
  createArchitectureEvidence,
  serializeArchitectureEvidence,
} from "./lib/matter-rf13-architecture-evidence.mjs";

function usage() {
  return [
    "usage:",
    "  node scripts/generate-matter-rf13-architecture-evidence.mjs --input <config.json> --output <evidence.json> [--repo-root <path>] [--source-sha <40-hex>]",
    "  node scripts/generate-matter-rf13-architecture-evidence.mjs --template",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--template") {
      options.template = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      options._.push(arg);
      continue;
    }
    const key = arg.slice(2).replaceAll("-", "_");
    if (!["input", "output", "repo_root", "source_sha"].includes(key)) throw new Error(`unknown option --${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new MatterRf13ArchitectureEvidenceError("INPUT_JSON_INVALID", `${label} JSON is invalid`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serializeArchitectureEvidence(value), { encoding: "utf8", mode: 0o644 });
  chmodSync(path, 0o644);
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.template) {
    if (options.input || options.output || options.repo_root || options.source_sha || options._.length) {
      throw new MatterRf13ArchitectureEvidenceError("CLI_USAGE", "--template cannot be combined with other options");
    }
    process.stdout.write(`${JSON.stringify(architectureEvidenceTemplate(), null, 2)}\n`);
    return 0;
  }
  if (!options.input || !options.output || options._.length > 0) throw new MatterRf13ArchitectureEvidenceError("CLI_USAGE", usage());
  const repoRoot = resolve(options.repo_root ?? process.cwd());
  const inputPath = resolve(options.input);
  const outputPath = isAbsolute(options.output) ? options.output : resolve(options.output);
  const input = readJson(inputPath, "input");
  const evidence = createArchitectureEvidence({ repoRoot, input, sourceSha: options.source_sha });
  writeJson(outputPath, evidence);
  process.stdout.write(serializeArchitectureEvidence(evidence));
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  if (error instanceof MatterRf13ArchitectureEvidenceError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
  } else {
    process.stderr.write("ARCHITECTURE_EVIDENCE_FAILED: generation failed\n");
  }
  process.exitCode = 1;
}

