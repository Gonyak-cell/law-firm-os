import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const HRX_CLIENT_PATH = "apps/web/src/people/hrxApiClient.ts";
const HRX_ROUTE_POLICY_PATH = "apps/api/src/routes/hrx/route-policy-map.js";
const POLICY_PARAMETER_CANDIDATES = [
  "inventory-ref", "approve", "reject", "cancel", "reschedule-response",
  "additional-information", "request-info", "reschedule", "revoke", "expire",
  "execute", "retry", "first-notice", "second-notice", "evidence", "response",
  "review", "publish", "legal-approve", "snapshot", "preview", "close",
  "generate", "deliver", "collect", "calculate", "validate", "correct", "submit"
];

function parseClient(repoRoot) {
  const absolutePath = path.join(repoRoot, HRX_CLIENT_PATH);
  return ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

function functionNodes(repoRoot) {
  const nodes = new Map();
  const exported = new Set();
  for (const statement of parseClient(repoRoot).statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
    nodes.set(statement.name.text, statement);
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      exported.add(statement.name.text);
    }
  }
  return { nodes, exported };
}

function expressionParameterName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isCallExpression(expression) && expression.arguments.length > 0) {
    return expressionParameterName(expression.arguments[0]);
  }
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return "value";
}

function apiPathFromExpression(expression) {
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === "withQuery") {
    return expression.arguments[0] ? apiPathFromExpression(expression.arguments[0]) : null;
  }
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (!ts.isTemplateExpression(expression)) return null;
  let result = expression.head.text;
  for (const span of expression.templateSpans) {
    result += `:${expressionParameterName(span.expression)}${span.literal.text}`;
  }
  return result;
}

function requestMethod(call) {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return "GET";
  const method = options.properties.find((property) => (
    ts.isPropertyAssignment(property)
    && property.name.getText().replace(/^["']|["']$/g, "") === "method"
    && ts.isStringLiteralLike(property.initializer)
  ));
  return method ? method.initializer.text.toUpperCase() : "GET";
}

function directFunctionOperations(node) {
  const operations = new Set();
  const calledFunctions = new Set();
  const visit = (child) => {
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) {
      const name = child.expression.text;
      calledFunctions.add(name);
      if (name === "requestJson") {
        const rawPath = child.arguments[0] ? apiPathFromExpression(child.arguments[0]) : null;
        if (rawPath?.startsWith("/api/")) {
          operations.add(`${requestMethod(child)} ${rawPath.split("?")[0].replace(/\/+$/, "") || "/"}`);
        }
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return { operations, calledFunctions };
}

export function clientFunctionOperations(repoRoot, functionNames) {
  const { nodes, exported } = functionNodes(repoRoot);
  const cache = new Map();
  const resolve = (name, stack = new Set()) => {
    if (cache.has(name)) return cache.get(name);
    if (stack.has(name) || !nodes.has(name)) return new Set();
    const nextStack = new Set(stack).add(name);
    const { operations, calledFunctions } = directFunctionOperations(nodes.get(name));
    for (const calledName of calledFunctions) {
      if (!nodes.has(calledName) || calledName === "requestJson") continue;
      for (const operation of resolve(calledName, nextStack)) operations.add(operation);
    }
    cache.set(name, operations);
    return operations;
  };

  const operations = new Set();
  for (const name of functionNames) {
    if (!exported.has(name)) throw new Error(`People route imports a non-exported HRX client function: ${name}`);
    for (const operation of resolve(name)) operations.add(operation);
  }
  return [...operations].sort();
}

function parameterizedPathCandidates(template) {
  const tokens = template.match(/:[^/]+/g) ?? [];
  let candidates = [template];
  for (const token of tokens) {
    candidates = candidates.flatMap((candidate) => (
      POLICY_PARAMETER_CANDIDATES.map((value) => candidate.replace(token, value))
    ));
  }
  return candidates;
}

export async function registeredPolicyIds(repoRoot, apiRoutes) {
  const modulePath = path.join(repoRoot, HRX_ROUTE_POLICY_PATH);
  const { resolveHrxRoutePolicy } = await import(`${pathToFileURL(modulePath).href}?inventory=${Date.now()}`);
  const registrations = {};
  for (const operation of apiRoutes) {
    const separator = operation.indexOf(" ");
    const method = operation.slice(0, separator);
    const pathname = operation.slice(separator + 1);
    if (!pathname.startsWith("/api/hrx/")) continue;
    const policy = parameterizedPathCandidates(pathname)
      .map((candidate) => resolveHrxRoutePolicy({ method, pathname: candidate }))
      .find(Boolean);
    if (!policy) throw new Error(`HRX client operation has no route policy registration: ${operation}`);
    registrations[operation] = policy.id;
  }
  return registrations;
}
