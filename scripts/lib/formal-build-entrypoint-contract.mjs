const PROVENANCE_IMPORT = "./lib/matter-desktop-provenance.mjs";
const FORMAL_GATE_EXPORT = "assertDesktopFormalBuildProvenance";
const PREFLIGHT_MAX_LINES = 72;

const MUTATING_EXPORTS = new Set([
  "appendFile", "appendFileSync", "chmod", "chmodSync", "copyFile", "copyFileSync",
  "cp", "cpSync", "createWriteStream", "exec", "execFile", "execFileSync", "link",
  "linkSync", "mkdir", "mkdirSync", "mkdtemp", "mkdtempSync", "open", "openSync",
  "rename", "renameSync", "rm", "rmSync", "spawn", "spawnSync", "symlink",
  "symlinkSync", "truncate", "truncateSync", "unlink", "unlinkSync", "write",
  "writeFile", "writeFileSync", "writeSync", "writeDesktopBuildManifest", "packager",
]);

const MUTATION_IMPORTS = new Set([
  "node:child_process",
  "node:fs",
  "node:fs/promises",
]);

const REFERENCE_UNSAFE_EXPORTS = new Set([
  "appendFile", "appendFileSync", "chmod", "chmodSync", "copyFile", "copyFileSync",
  "cp", "cpSync", "createWriteStream", "link", "linkSync", "mkdir", "mkdirSync",
  "mkdtemp", "mkdtempSync", "open", "openSync", "rename", "renameSync", "rm",
  "rmSync", "symlink", "symlinkSync", "truncate", "truncateSync", "unlink",
  "unlinkSync", "write", "writeFile", "writeFileSync", "writeSync",
  "writeDesktopBuildManifest", "packager",
  "exec", "execFile", "execFileSync", "spawn", "spawnSync",
]);

const CHILD_PROCESS_EXPORTS = new Set(["exec", "execFile", "execFileSync", "spawn", "spawnSync"]);

const PREFLIGHT_SAFE_IMPORTS = new Map([
  ["node:fs/promises", new Set(["readFile"])],
  ["node:path", new Set(["dirname", "join", "resolve"])],
  ["node:url", new Set(["fileURLToPath"])],
  ["node:util", new Set(["promisify"])],
  ["./lib/matter-desktop-authenticode.mjs", new Set(["resolveMatterDesktopAuthenticodeConfiguration"])],
  ["./lib/matter-desktop-provenance.mjs", new Set(["desktopReleaseChannelConfig", "readDesktopBuildSourceIdentity"])],
]);

const GROUPING_KEYWORDS = new Set(["catch", "for", "if", "switch", "while", "with"]);
const TRUSTED_STATIC_IMPORTS = new Set([
  "@electron/notarize",
  "@electron/osx-sign",
  "@electron/packager",
  "./lib/matter-desktop-authenticode.mjs",
  "./lib/matter-desktop-artifact-privacy.mjs",
  "./lib/matter-desktop-provenance.mjs",
  "./lib/matter-desktop-release-paths.mjs",
  "./lib/matter-desktop-runtime.mjs",
]);

const LOCAL_IMPORT_BINDINGS = new Map([
  ["scripts/build-matter-desktop-mac.mjs", new Map([
    [PROVENANCE_IMPORT, new Set([
      FORMAL_GATE_EXPORT, "createDesktopBuildManifest", "desktopReleaseChannelConfig",
      "directoryDigest", "readDesktopBuildSourceIdentity", "writeDesktopBuildManifest",
    ])],
    ["./lib/matter-desktop-runtime.mjs", new Set(["copyDesktopLocalApiRuntime"])],
    ["./lib/matter-desktop-artifact-privacy.mjs", new Set([
      "buildDesktopArtifactPrivacyCorpus", "createRf13DistPrivacyMemberReceipt",
      "desktopArtifactPrivacyCorpusSha256", "inspectDmgDesktopArtifact",
      "inspectExpandedDesktopArtifact", "inspectZipDesktopArtifact",
      "writeDesktopArtifactPrivacyJson",
    ])],
  ])],
  ["scripts/build-matter-desktop-win.mjs", new Map([
    [PROVENANCE_IMPORT, new Set([
      FORMAL_GATE_EXPORT, "createDesktopBuildManifest", "desktopReleaseChannelConfig",
      "directoryDigest", "readDesktopBuildSourceIdentity", "writeDesktopBuildManifest",
    ])],
    ["./lib/matter-desktop-runtime.mjs", new Set(["copyDesktopLocalApiRuntime"])],
    ["./lib/matter-desktop-artifact-privacy.mjs", new Set([
      "buildDesktopArtifactPrivacyCorpus", "createRf13DistPrivacyMemberReceipt",
      "desktopArtifactPrivacyCorpusSha256", "expandedDesktopArtifactDescriptor",
      "inspectExpandedDesktopArtifact", "inspectZipDesktopArtifact",
      "writeDesktopArtifactPrivacyJson",
    ])],
  ])],
  ["scripts/build-matter-desktop-win-installer.mjs", new Map([
    [PROVENANCE_IMPORT, new Set([
      FORMAL_GATE_EXPORT, "createDesktopBuildManifest", "desktopReleaseChannelConfig",
      "directoryDigest", "readDesktopBuildSourceIdentity",
    ])],
    ["./lib/matter-desktop-authenticode.mjs", new Set([
      "injectMatterDesktopAuthenticodeConfiguration", "resolveMatterDesktopAuthenticodeConfiguration",
      "validateMatterDesktopAuthenticodeSignatures",
    ])],
    ["./lib/matter-desktop-artifact-privacy.mjs", new Set([
      "buildDesktopArtifactPrivacyCorpus", "createWindowsInstallerPrivacyBuilderReceipt",
      "desktopArtifactPrivacyCorpusSha256", "inspectDesktopArtifactBytes",
      "inspectExpandedDesktopArtifact", "writeDesktopArtifactPrivacyJson",
    ])],
    ["./lib/matter-desktop-runtime.mjs", new Set(["copyDesktopLocalApiRuntime"])],
  ])],
  ["scripts/release-matter-desktop-formal.mjs", new Map([
    [PROVENANCE_IMPORT, new Set([FORMAL_GATE_EXPORT, "readDesktopBuildSourceIdentity"])],
    ["./lib/matter-desktop-release-paths.mjs", new Set([
      "readDesktopReleaseArtifactStage", "requireDesktopReleaseArtifact",
    ])],
  ])],
]);

function tokenize(source) {
  const tokens = [];
  let index = source.startsWith("#!") ? source.indexOf("\n") + 1 : 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index + 2);
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new Error("unterminated block comment");
      index = end + 2;
      continue;
    }
    if (char === "/") {
      const start = index;
      let escaped = false;
      let inCharacterClass = false;
      index += 1;
      while (index < source.length) {
        const current = source[index];
        if (!escaped && current === "[") inCharacterClass = true;
        if (!escaped && current === "]") inCharacterClass = false;
        if (!escaped && current === "/" && !inCharacterClass) break;
        if (!escaped && /[\r\n]/.test(current)) throw new Error("unsupported slash expression before formal preflight");
        escaped = !escaped && current === "\\";
        if (current !== "\\") escaped = false;
        index += 1;
      }
      if (index >= source.length) throw new Error("unterminated regular expression literal");
      index += 1;
      while (index < source.length && /[A-Za-z]/.test(source[index])) index += 1;
      tokens.push({ type: "regex", value: source.slice(start, index), start });
      continue;
    }
    if (["\"", "'", "`"].includes(char)) {
      const quote = char;
      const start = index;
      let escaped = false;
      index += 1;
      while (index < source.length) {
        const current = source[index];
        if (!escaped && current === quote) break;
        escaped = !escaped && current === "\\";
        if (current !== "\\") escaped = false;
        index += 1;
      }
      if (index >= source.length) throw new Error("unterminated string literal");
      index += 1;
      tokens.push({ type: quote === "`" ? "template" : "string", value: source.slice(start + 1, index - 1), start });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) index += 1;
      tokens.push({ type: "identifier", value: source.slice(start, index), start });
      continue;
    }
    tokens.push({ type: "punctuator", value: char, start: index });
    index += 1;
  }
  return tokens;
}

function annotateDepth(tokens) {
  const depth = { paren: 0, bracket: 0, brace: 0 };
  for (const token of tokens) {
    token.depth = { ...depth };
    if (token.value === "(") depth.paren += 1;
    if (token.value === ")") depth.paren -= 1;
    if (token.value === "[") depth.bracket += 1;
    if (token.value === "]") depth.bracket -= 1;
    if (token.value === "{") depth.brace += 1;
    if (token.value === "}") depth.brace -= 1;
    if (Object.values(depth).some((value) => value < 0)) throw new Error("unbalanced source delimiters");
  }
  if (Object.values(depth).some(Boolean)) throw new Error("unbalanced source delimiters");
}

function isTopLevel(token) {
  return token.depth.paren === 0 && token.depth.bracket === 0 && token.depth.brace === 0;
}

function assertNoReExports(tokens) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value !== "export" || !isTopLevel(tokens[index])) continue;
    let end = index + 1;
    while (end < tokens.length && !(tokens[end].value === ";" && isTopLevel(tokens[end]))) end += 1;
    if (tokens.slice(index + 1, end).some((token) => token.value === "from")) {
      throw new Error("re-export-from declarations are not allowed in formal build entrypoints");
    }
    index = end;
  }
}

function importDeclarations(tokens, relativePath) {
  const declarations = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value !== "import" || !isTopLevel(tokens[index]) || tokens[index + 1]?.value === "(") continue;
    if (tokens[index + 1]?.type === "string") {
      throw new Error("side-effect-only imports are not allowed before formal preflight");
    }
    let end = index + 1;
    while (end < tokens.length && !(tokens[end].value === ";" && isTopLevel(tokens[end]))) end += 1;
    const declaration = tokens.slice(index, end + 1);
    const fromIndex = declaration.findIndex((token) => token.value === "from");
    const source = fromIndex >= 0 ? declaration[fromIndex + 1] : undefined;
    if (source?.type !== "string") continue;
    if (declaration[fromIndex + 2]?.value !== ";") {
      throw new Error("static imports must terminate with a semicolon before formal preflight");
    }
    if (!source.value.startsWith("node:") && !TRUSTED_STATIC_IMPORTS.has(source.value)) {
      throw new Error(`untrusted static import before formal preflight: ${source.value}`);
    }
    const named = new Map();
    const open = declaration.findIndex((token) => token.value === "{");
    const close = declaration.findIndex((token, tokenIndex) => tokenIndex > open && token.value === "}");
    if (open >= 0 && close > open) {
      for (let cursor = open + 1; cursor < close;) {
        if (declaration[cursor].value === ",") {
          cursor += 1;
          continue;
        }
        const imported = declaration[cursor]?.value;
        const hasAlias = declaration[cursor + 1]?.value === "as";
        const local = hasAlias ? declaration[cursor + 2]?.value : imported;
        if (imported && local) named.set(imported, local);
        cursor += hasAlias ? 3 : 1;
      }
    }
    const star = declaration.findIndex((token) => token.value === "*");
    const namespace = star >= 0 && declaration[star + 1]?.value === "as" ? declaration[star + 2]?.value : undefined;
    if (source.value.startsWith(".")) {
      const allowedBindings = LOCAL_IMPORT_BINDINGS.get(relativePath)?.get(source.value);
      if (!allowedBindings) throw new Error(`untrusted local import before formal preflight: ${source.value}`);
      if (open !== 1 || namespace || [...named.keys()].some((imported) => !allowedBindings.has(imported))) {
        throw new Error(`unexpected local import binding before formal preflight: ${source.value}`);
      }
    }
    declarations.push({ source: source.value, named, namespace, startIndex: index, endIndex: end });
    index = end;
  }
  return declarations;
}

function findClosingParen(tokens, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index += 1) {
    if (tokens[index].value === "(") depth += 1;
    if (tokens[index].value === ")") depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function findOpeningParen(tokens, closeIndex) {
  let depth = 0;
  for (let index = closeIndex; index >= 0; index -= 1) {
    if (tokens[index].value === ")") depth += 1;
    if (tokens[index].value === "(") depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function containsSequence(tokens, sequence) {
  return tokens.some((_, start) => sequence.every((value, offset) => tokens[start + offset]?.value === value));
}

function containsTopLevelSequence(tokens, sequence) {
  return tokens.some((token, start) => (
    isTopLevel(token) && sequence.every((value, offset) => tokens[start + offset]?.value === value)
  ));
}

function formalChannelBinding(tokens, argumentsTokens, gateStart) {
  const channelKeys = argumentsTokens.filter((token) => (
    (token.type === "identifier" || token.type === "string") && token.value === "releaseChannel"
  ));
  if (
    channelKeys.length !== 1
    || argumentsTokens.some((token) => ["[", "]"].includes(token.value))
    || containsSequence(argumentsTokens, [".", ".", "."])
    || argumentsTokens.some((token) => token.type === "string" && token.value.includes("\\"))
  ) return undefined;
  for (let index = 0; index < argumentsTokens.length - 2; index += 1) {
    if (
      argumentsTokens[index].value === "releaseChannel"
      && argumentsTokens[index + 1].value === ":"
      && argumentsTokens[index + 2].type === "string"
      && argumentsTokens[index + 2].value === "formal"
    ) return "literal_formal";
  }
  if (!containsSequence(argumentsTokens, ["releaseChannel", ","])) return undefined;
  const preflightTokens = tokens.slice(0, gateStart);
  const releaseChannelReferences = tokens
    .slice(0, gateStart + argumentsTokens.length + 2)
    .filter((token) => token.type === "identifier" && token.value === "releaseChannel");
  if (releaseChannelReferences.length !== 2) return undefined;
  if (containsTopLevelSequence(preflightTokens, ["const", "releaseChannel", "=", "formal", ";"])) {
    const binding = preflightTokens.findIndex((token, index) => (
      token.value === "const"
      && preflightTokens[index + 1]?.value === "releaseChannel"
      && preflightTokens[index + 2]?.value === "="
    ));
    if (preflightTokens[binding + 3]?.type === "string" && preflightTokens[binding + 3]?.value === "formal") {
      return "literal_formal";
    }
  }
  if (
    containsTopLevelSequence(preflightTokens, ["const", "releaseChannel", "=", "channelConfig", ".", "channel", ";"])
    && containsTopLevelSequence(preflightTokens, [
      "const", "channelConfig", "=", "desktopReleaseChannelConfig", "(",
      "process", ".", "env", ".", "MATTER_DESKTOP_RELEASE_CHANNEL",
    ])
  ) return "canonical_channel_policy";
  return undefined;
}

function canonicalSourceIdentityBinding(tokens, argumentsTokens, gateStart) {
  const identityKeys = argumentsTokens.filter((token) => (
    (token.type === "identifier" || token.type === "string") && token.value === "sourceIdentity"
  ));
  if (identityKeys.length !== 1 || !containsSequence(argumentsTokens, ["sourceIdentity", ","])) return false;
  const throughGate = tokens.slice(0, gateStart + argumentsTokens.length + 2);
  if (throughGate.filter((token) => token.type === "identifier" && token.value === "sourceIdentity").length !== 2) {
    return false;
  }
  const preflightTokens = tokens.slice(0, gateStart);
  const readsRepoRoot = containsTopLevelSequence(preflightTokens, [
    "const", "sourceIdentity", "=", "readDesktopBuildSourceIdentity", "(", "repoRoot", ")", ";",
  ]);
  const canonicalRepoRoot = containsTopLevelSequence(preflightTokens, [
    "const", "scriptDir", "=", "dirname", "(", "fileURLToPath", "(", "import", ".", "meta", ".", "url", ")", ")", ";",
  ]) && containsTopLevelSequence(preflightTokens, [
    "const", "repoRoot", "=", "resolve", "(", "scriptDir", ",", "..", ")", ";",
  ]);
  const readsCwdRoot = containsTopLevelSequence(preflightTokens, [
    "const", "sourceIdentity", "=", "readDesktopBuildSourceIdentity", "(", "ROOT", ")", ";",
  ]);
  const canonicalCwdRoot = containsTopLevelSequence(preflightTokens, [
    "const", "ROOT", "=", "process", ".", "cwd", "(", ")", ";",
  ]);
  return (readsRepoRoot && canonicalRepoRoot) || (readsCwdRoot && canonicalCwdRoot);
}

function canonicalExpectedSourceSha(argumentsTokens) {
  const keys = argumentsTokens.filter((token) => (
    (token.type === "identifier" || token.type === "string") && token.value === "expectedSourceSha"
  ));
  if (keys.length !== 1 || keys[0].type !== "identifier") return false;
  const keyIndex = argumentsTokens.indexOf(keys[0]);
  const sequence = [
    "expectedSourceSha", ":", "process", ".", "env", ".", "MATTER_DESKTOP_EXPECTED_SOURCE_SHA",
  ];
  if (!sequence.every((value, offset) => argumentsTokens[keyIndex + offset]?.value === value)) return false;
  return [undefined, ","].includes(argumentsTokens[keyIndex + sequence.length]?.value);
}

function findFormalGate(tokens, gateLocal) {
  const candidates = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index].value !== gateLocal || tokens[index + 1].value !== "(" || !isTopLevel(tokens[index])) continue;
    let statementStart = index - 1;
    while (statementStart >= 0 && !(tokens[statementStart].value === ";" && isTopLevel(tokens[statementStart]))) statementStart -= 1;
    const prefix = tokens.slice(statementStart + 1, index).map((token) => token.value);
    if (prefix.length && !(prefix.length === 1 && prefix[0] === "await")) continue;
    const close = findClosingParen(tokens, index + 1);
    if (close < 0 || tokens[close + 1]?.value !== ";") continue;
    const argumentsTokens = tokens.slice(index + 2, close);
    if (!canonicalExpectedSourceSha(argumentsTokens)) continue;
    candidates.push({
      start: index,
      end: close,
      channelBinding: formalChannelBinding(tokens, argumentsTokens, index),
      canonicalSourceIdentity: canonicalSourceIdentityBinding(tokens, argumentsTokens, index),
    });
  }
  if (candidates.length !== 1) {
    throw new Error(`expected exactly one top-level formal provenance gate call; found ${candidates.length}`);
  }
  return candidates[0];
}

function allowedMemberCall(tokens, openParenIndex) {
  const member = tokens[openParenIndex - 1]?.value;
  const receiver = tokens[openParenIndex - 3]?.value;
  const receiverReferences = tokens
    .slice(0, openParenIndex)
    .filter((token) => token.type === "identifier" && token.value === receiver).length;
  if (member === "parse" && receiver === "JSON") return receiverReferences === 1;
  if (member === "cwd" && receiver === "process") return receiverReferences === 1;
  if (member === "readFile" && receiver === "fs") {
    return receiverReferences === 2 && containsSequence(tokens.slice(0, openParenIndex + 1), [
      "then", "(", "(", "fs", ")", "=", ">", "fs", ".", "readFile", "(",
    ]);
  }
  if (member !== "then" || tokens[openParenIndex - 3]?.value !== ")") return false;
  const dynamicImportClose = openParenIndex - 3;
  const dynamicImportOpen = findOpeningParen(tokens, dynamicImportClose);
  return dynamicImportOpen > 0
    && tokens[dynamicImportOpen - 1]?.value === "import"
    && tokens[dynamicImportOpen + 1]?.type === "string"
    && tokens[dynamicImportOpen + 1]?.value === "node:fs/promises";
}

function mutationBindings(imports) {
  const direct = new Set(MUTATING_EXPORTS);
  const namespaces = new Set();
  for (const declaration of imports) {
    if (!MUTATION_IMPORTS.has(declaration.source)) continue;
    for (const [imported, local] of declaration.named) {
      if (MUTATING_EXPORTS.has(imported)) direct.add(local);
    }
    if (declaration.namespace) namespaces.add(declaration.namespace);
  }
  return { direct, namespaces };
}

function firstMutation(tokens, imports) {
  const { direct, namespaces } = mutationBindings(imports);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (direct.has(tokens[index].value) && tokens[index + 1].value === "(") return tokens[index];
    if (
      namespaces.has(tokens[index].value)
      && tokens[index + 1]?.value === "."
      && MUTATING_EXPORTS.has(tokens[index + 2]?.value)
      && tokens[index + 3]?.value === "("
    ) return tokens[index];
  }
  return undefined;
}

function isImportToken(index, imports) {
  return imports.some((declaration) => index >= declaration.startIndex && index <= declaration.endIndex);
}

function assertNoUnsafePreflightIndirection(tokens, imports, gate) {
  const mutationNamespaces = new Set(
    imports.filter((declaration) => MUTATION_IMPORTS.has(declaration.source)).map((declaration) => declaration.namespace).filter(Boolean),
  );
  const referenceUnsafeLocals = new Set(REFERENCE_UNSAFE_EXPORTS);
  const promisifiableChildProcessLocals = new Set();
  const safeDirectCallLocals = new Set(["import"]);
  for (const declaration of imports) {
    for (const [imported, local] of declaration.named) {
      if (REFERENCE_UNSAFE_EXPORTS.has(imported)) referenceUnsafeLocals.add(local);
      if (declaration.source === "node:child_process" && CHILD_PROCESS_EXPORTS.has(imported)) {
        promisifiableChildProcessLocals.add(local);
      }
      if (PREFLIGHT_SAFE_IMPORTS.get(declaration.source)?.has(imported)) safeDirectCallLocals.add(local);
    }
  }

  for (let index = 0; index <= gate.end; index += 1) {
    const token = tokens[index];
    if (isImportToken(index, imports)) continue;
    if (token.value === "\\") throw new Error("escaped code identifiers are not allowed before formal preflight");
    if (
      token.value === "delete"
      || ((token.value === "+" || token.value === "-") && tokens[index + 1]?.value === token.value)
    ) throw new Error("unary mutation is not allowed before formal preflight");
    if (
      token.value === "import"
      && tokens[index + 1]?.value === "("
      && (tokens[index + 2]?.type !== "string" || tokens[index + 2]?.value !== "node:fs/promises")
    ) throw new Error("untrusted dynamic import before formal preflight");
    if (
      token.value === "="
      && tokens[index + 1]?.value !== ">"
      && tokens[index + 1]?.value !== "="
      && !["=", "!", "<", ">"].includes(tokens[index - 1]?.value)
      && !(tokens[index - 2]?.value === "const" && tokens[index - 1]?.type === "identifier")
    ) {
      throw new Error("non-declaration assignment appears before the formal provenance gate");
    }
    if (token.type === "regex" || token.type === "template") {
      throw new Error("dynamic literal evaluation appears before the formal provenance gate");
    }
    if (
      (token.type === "identifier" || token.type === "string")
      && referenceUnsafeLocals.has(token.value)
    ) {
      const safePromisifyReference = promisifiableChildProcessLocals.has(token.value)
        && tokens[index - 1]?.value === "("
        && tokens[index - 2]?.value === "promisify"
        && tokens[index + 1]?.value === ")";
      if (safePromisifyReference) continue;
      throw new Error("filesystem or artifact mutation binding is referenced before the formal provenance gate");
    }
    if (token.type === "identifier" && mutationNamespaces.has(token.value)) {
      throw new Error("filesystem or process namespace is referenced before the formal provenance gate");
    }
    if (token.value !== "(") continue;
    if (index === gate.start + 1) continue;
    const previous = tokens[index - 1];
    if (!previous) continue;
    if (previous.value === "." && tokens[index - 2]?.value === "?") {
      throw new Error("optional indirect call appears before the formal provenance gate");
    }
    if ([")", "]"].includes(previous.value)) {
      throw new Error("indirect call appears before the formal provenance gate");
    }
    if (previous.type !== "identifier") continue;
    if (GROUPING_KEYWORDS.has(previous.value)) continue;
    const memberCall = tokens[index - 2]?.value === ".";
    const allowed = memberCall
      ? allowedMemberCall(tokens, index)
      : safeDirectCallLocals.has(previous.value);
    if (!allowed) throw new Error(`unapproved preflight call ${previous.value}() appears before the formal provenance gate`);
  }
}

export function validateFormalBuildEntrypointSource(source, { relativePath = "entrypoint.mjs" } = {}) {
  const tokens = tokenize(source);
  annotateDepth(tokens);
  assertNoReExports(tokens);
  const imports = importDeclarations(tokens, relativePath);
  const gateImports = imports.filter((declaration) => declaration.source === PROVENANCE_IMPORT);
  const gateLocals = gateImports
    .map((declaration) => declaration.named.get(FORMAL_GATE_EXPORT))
    .filter(Boolean);
  if (gateLocals.length !== 1) {
    throw new Error(`${relativePath}: expected one named ${FORMAL_GATE_EXPORT} import from ${PROVENANCE_IMPORT}`);
  }
  const gate = findFormalGate(tokens, gateLocals[0]);
  const gateLine = source.slice(0, tokens[gate.start].start).split(/\r?\n/).length;
  if (gateLine > PREFLIGHT_MAX_LINES) {
    throw new Error(`${relativePath}: formal provenance preflight must appear within the first ${PREFLIGHT_MAX_LINES} lines`);
  }
  assertNoUnsafePreflightIndirection(tokens, imports, gate);
  const mutation = firstMutation(tokens, imports);
  if (mutation && mutation.start < tokens[gate.end].start) {
    throw new Error(`${relativePath}: filesystem or artifact mutation appears before the formal provenance gate`);
  }
  if (!gate.channelBinding) throw new Error(`${relativePath}: formal release channel binding is not canonical`);
  if (!gate.canonicalSourceIdentity) throw new Error(`${relativePath}: source identity is not read from the canonical Git root`);
  return {
    relative_path: relativePath,
    gate_invocation: "top_level",
    formal_channel_binding: gate.channelBinding,
    no_mutation_before_gate: true,
    preflight_max_lines: PREFLIGHT_MAX_LINES,
  };
}
