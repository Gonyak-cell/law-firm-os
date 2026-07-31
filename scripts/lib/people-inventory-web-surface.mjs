import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

const PEOPLE_HOME_PATH = "apps/web/src/people/PeopleHome.tsx";
const HRX_CLIENT_PATH = "apps/web/src/people/hrxApiClient.ts";
const PEOPLE_SOURCE_ROOT = "apps/web/src/people";
const GENERIC_RENDERERS = new Set(["PeopleFeatureStatePanel"]);

function repoPath(repoRoot, relativePath) {
  return path.join(repoRoot, relativePath);
}

function posixRelative(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function sourceKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function parseSource(repoRoot, relativePath) {
  const absolutePath = repoPath(repoRoot, relativePath);
  return ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    sourceKind(relativePath)
  );
}

function resolveRelativeModule(repoRoot, fromRelativePath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const unresolved = path.resolve(path.dirname(repoPath(repoRoot, fromRelativePath)), specifier);
  const candidates = [
    unresolved,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((extension) => `${unresolved}${extension}`),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => path.join(unresolved, name))
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  return resolved ? posixRelative(repoRoot, resolved) : null;
}

function namedImports(repoRoot, relativePath) {
  const result = [];
  for (const statement of parseSource(repoRoot, relativePath).statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const resolvedPath = resolveRelativeModule(repoRoot, relativePath, statement.moduleSpecifier.text);
    for (const specifier of clause.namedBindings.elements) {
      if (specifier.isTypeOnly) continue;
      result.push({
        imported: specifier.propertyName?.text ?? specifier.name.text,
        local: specifier.name.text,
        resolved_path: resolvedPath
      });
    }
  }
  return result;
}

function currentSectionRoutes(node) {
  const routes = new Set();
  const visit = (child) => {
    if (
      ts.isBinaryExpression(child)
      && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(child.operatorToken.kind)
    ) {
      const leftIsSection = ts.isIdentifier(child.left) && child.left.text === "currentSection";
      const rightIsSection = ts.isIdentifier(child.right) && child.right.text === "currentSection";
      const literal = leftIsSection ? child.right : rightIsSection ? child.left : null;
      if (literal && ts.isStringLiteralLike(literal)) routes.add(literal.text);
    }
    if (
      ts.isCallExpression(child)
      && ts.isPropertyAccessExpression(child.expression)
      && child.expression.name.text === "includes"
      && ts.isArrayLiteralExpression(child.expression.expression)
      && child.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === "currentSection")
    ) {
      for (const element of child.expression.expression.elements) {
        if (ts.isStringLiteralLike(element)) routes.add(element.text);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return routes;
}

function rendererDescriptors(node) {
  const descriptors = new Map();
  const visit = (child) => {
    if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
      const name = child.tagName.getText();
      if (/^[A-Z][A-Za-z0-9]*$/.test(name) && !GENERIC_RENDERERS.has(name)) {
        const staticProps = {};
        for (const property of child.attributes.properties) {
          if (!ts.isJsxAttribute(property) || !property.initializer) continue;
          if (ts.isStringLiteral(property.initializer)) {
            staticProps[property.name.getText()] = property.initializer.text;
          } else if (
            ts.isJsxExpression(property.initializer)
            && property.initializer.expression
            && ts.isStringLiteralLike(property.initializer.expression)
          ) {
            staticProps[property.name.getText()] = property.initializer.expression.text;
          }
        }
        descriptors.set(name, staticProps);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return descriptors;
}

export function peopleHomeRouteRenderers(repoRoot) {
  const sourceFile = parseSource(repoRoot, PEOPLE_HOME_PATH);
  const imports = new Map(namedImports(repoRoot, PEOPLE_HOME_PATH).map((entry) => [entry.local, entry]));
  const routeDescriptors = new Map();
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const routes = currentSectionRoutes(node.left);
      const descriptors = rendererDescriptors(node.right);
      for (const route of routes) {
        const bucket = routeDescriptors.get(route) ?? new Map();
        for (const [name, props] of descriptors) {
          if (imports.get(name)?.resolved_path) bucket.set(name, props);
        }
        routeDescriptors.set(route, bucket);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return new Map([...routeDescriptors].map(([route, descriptors]) => {
    const rendererNames = [...descriptors.keys()].sort();
    return [route, {
      renderer_components: rendererNames,
      renderer_variants: Object.fromEntries([...descriptors].sort(([left], [right]) => left.localeCompare(right))),
      component_sources: rendererNames.map((name) => imports.get(name).resolved_path).sort()
    }];
  }));
}

export function routeClientFunctions(repoRoot, componentSources) {
  const queue = [...componentSources];
  const visited = new Set();
  const sourceFiles = new Set();
  const clientFunctions = new Set();
  while (queue.length > 0) {
    const relativePath = queue.shift();
    if (!relativePath || visited.has(relativePath)) continue;
    visited.add(relativePath);
    sourceFiles.add(relativePath);
    for (const entry of namedImports(repoRoot, relativePath)) {
      if (entry.resolved_path === HRX_CLIENT_PATH) {
        clientFunctions.add(entry.imported);
      } else if (entry.resolved_path?.startsWith(`${PEOPLE_SOURCE_ROOT}/`)) {
        queue.push(entry.resolved_path);
      }
    }
  }
  return {
    client_functions: [...clientFunctions].sort(),
    source_files: [...sourceFiles].sort()
  };
}
