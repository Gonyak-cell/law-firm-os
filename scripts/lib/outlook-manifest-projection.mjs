import { createHash } from "node:crypto";
import { DOMParser, onWarningStopParsing } from "@xmldom/xmldom";

function parseXml(xml) {
  const source = String(xml ?? "");
  const lower = source.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<!entity")) {
    throw new TypeError("Outlook manifest XML declarations are not allowed");
  }
  try {
    const document = new DOMParser({ locator: false, onError: onWarningStopParsing })
      .parseFromString(source, "application/xml");
    if (!document.documentElement || document.documentElement.localName !== "OfficeApp") {
      throw new TypeError("OfficeApp root is missing");
    }
    return document;
  } catch {
    throw new TypeError("Outlook manifest XML is invalid");
  }
}

function elementChildren(node) {
  return Array.from(node?.childNodes ?? []).filter((child) => child.nodeType === 1);
}

function allElements(document) {
  const result = [];
  const visit = (node) => {
    if (node.nodeType === 1) result.push(node);
    for (const child of elementChildren(node)) visit(child);
  };
  visit(document.documentElement);
  return result;
}

function directChild(root, localName) {
  const values = elementChildren(root).filter((node) => node.localName === localName);
  if (values.length !== 1) throw new Error(`expected one direct ${localName}, got ${values.length}`);
  return values[0];
}

function text(node) {
  return String(node?.textContent ?? "").trim();
}

function requiredText(root, localName) {
  const value = text(directChild(root, localName));
  if (!value) throw new Error(`${localName} is empty`);
  return value;
}

function requiredAttribute(node, name) {
  const value = String(node?.getAttribute(name) ?? "").trim();
  if (!value) throw new Error(`${node?.localName ?? "node"}.${name} is missing`);
  return value;
}

function xsiType(node) {
  return String(
    node?.getAttributeNS("http://www.w3.org/2001/XMLSchema-instance", "type")
      ?? node?.getAttribute("xsi:type")
      ?? "",
  ).trim();
}

function sorted(values) {
  return [...values].sort();
}

function closestAncestor(node, localName) {
  for (let current = node?.parentNode; current; current = current.parentNode) {
    if (current.nodeType === 1 && current.localName === localName) return current;
  }
  return null;
}

function resourceEntries(elements, localName) {
  return sorted(
    elements
      .filter((node) => node.localName === localName && node.hasAttribute("id") && node.hasAttribute("DefaultValue"))
      .map((node) => `${requiredAttribute(node, "id")}=${requiredAttribute(node, "DefaultValue")}`),
  );
}

function canonicalElement(node) {
  const attributes = Array.from(node.attributes ?? [], (attribute) => [
    `${attribute.namespaceURI ?? ""}|${attribute.localName ?? attribute.name}`,
    attribute.value,
  ]).sort(([left], [right]) => left.localeCompare(right));
  const children = [];
  for (const child of Array.from(node.childNodes ?? [])) {
    if (child.nodeType === 1) children.push(canonicalElement(child));
    if (child.nodeType === 3 || child.nodeType === 4) {
      const value = String(child.nodeValue ?? "").trim();
      if (value) children.push(node.localName === "Version" ? "__VERSION__" : value);
    }
  }
  return [`${node.namespaceURI ?? ""}|${node.localName ?? node.nodeName}`, attributes, children];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseOutlookManifest(xml) {
  const document = parseXml(xml);
  const root = document.documentElement;
  const elements = allElements(document);
  const ruleElements = elements.filter((node) => node.localName === "Rule");
  const stringResources = resourceEntries(elements, "String");
  const urlResources = resourceEntries(elements, "Url");
  const imageResources = resourceEntries(elements, "Image");
  const residReferences = sorted(
    elements.flatMap((node) => Array.from(node.attributes ?? []))
      .filter((attribute) => attribute.localName === "resid")
      .map((attribute) => attribute.value),
  );
  const definedResourceIds = new Set(
    [...stringResources, ...urlResources, ...imageResources]
      .map((value) => value.slice(0, value.indexOf("="))),
  );
  const undefinedReferences = sorted(
    [...new Set(residReferences.filter((id) => !definedResourceIds.has(id)))],
  );
  if (undefinedReferences.length > 0) {
    throw new Error(`undefined manifest resid references: ${undefinedReferences.join(", ")}`);
  }

  return {
    product_id: requiredText(root, "Id"),
    version: requiredText(root, "Version"),
    provider_name: requiredText(root, "ProviderName"),
    display_name: requiredAttribute(directChild(root, "DisplayName"), "DefaultValue"),
    description: requiredAttribute(directChild(root, "Description"), "DefaultValue"),
    permission: requiredText(root, "Permissions"),
    semantic_manifest_sha256: sha256(JSON.stringify(canonicalElement(root))),
    mailbox_versions: sorted(elements.flatMap((node) => {
      if (node.localName === "Set" && node.getAttribute("Name") === "Mailbox" && node.hasAttribute("MinVersion")) {
        return [requiredAttribute(node, "MinVersion")];
      }
      if (node.localName === "Sets" && node.hasAttribute("DefaultMinVersion")) {
        return [requiredAttribute(node, "DefaultMinVersion")];
      }
      return [];
    })),
    top_level_hosts: sorted(elements
      .filter((node) => node.localName === "Host" && node.hasAttribute("Name"))
      .map((node) => requiredAttribute(node, "Name"))),
    override_host_types: sorted(elements
      .filter((node) => node.localName === "Host" && xsiType(node))
      .map((node) => xsiType(node))),
    version_override_types: sorted(elements
      .filter((node) => node.localName === "VersionOverrides")
      .map((node) => xsiType(node))),
    form_types: sorted(elements.filter((node) => node.localName === "Form").map((node) => xsiType(node))),
    rule_fingerprints: sorted(ruleElements
      .filter((node) => node.hasAttribute("ItemType"))
      .map((node) => `${requiredAttribute(node, "ItemType")}:${requiredAttribute(node, "FormType")}`)),
    rule_collection_modes: sorted(ruleElements
      .filter((node) => xsiType(node) === "RuleCollection")
      .map((node) => requiredAttribute(node, "Mode"))),
    extension_points: sorted(elements
      .filter((node) => node.localName === "ExtensionPoint")
      .map((node) => xsiType(node))),
    launch_events: sorted(elements.filter((node) => node.localName === "LaunchEvent").map((node) => [
      requiredAttribute(node, "Type"),
      requiredAttribute(node, "FunctionName"),
      requiredAttribute(node, "SendMode"),
    ].join(":"))),
    requested_heights: sorted(elements.filter((node) => node.localName === "RequestedHeight").map(text)),
    disable_entity_highlighting: requiredText(root, "DisableEntityHighlighting"),
    action_types: sorted(elements.filter((node) => node.localName === "Action").map((node) => xsiType(node))),
    supports_pinning: sorted(elements.filter((node) => node.localName === "SupportsPinning").map((node) => {
      const action = closestAncestor(node, "Action");
      const extensionPoint = closestAncestor(node, "ExtensionPoint");
      const versionOverrides = closestAncestor(node, "VersionOverrides");
      return [xsiType(versionOverrides), xsiType(extensionPoint), xsiType(action), text(node)].join(":");
    })),
    office_tab_ids: sorted(elements.filter((node) => node.localName === "OfficeTab").map((node) => requiredAttribute(node, "id"))),
    group_ids: sorted(elements.filter((node) => node.localName === "Group").map((node) => requiredAttribute(node, "id"))),
    control_fingerprints: sorted(elements.filter((node) => node.localName === "Control").map((node) => (
      `${xsiType(node)}:${requiredAttribute(node, "id")}`
    ))),
    resid_references: residReferences,
    string_resources: stringResources,
    url_resources: urlResources,
    image_resources: imageResources,
    form_source_locations: sorted(elements
      .filter((node) => node.localName === "SourceLocation" && node.hasAttribute("DefaultValue"))
      .map((node) => requiredAttribute(node, "DefaultValue"))),
    icon_url: requiredAttribute(directChild(root, "IconUrl"), "DefaultValue"),
    high_resolution_icon_url: requiredAttribute(directChild(root, "HighResolutionIconUrl"), "DefaultValue"),
    support_url: requiredAttribute(directChild(root, "SupportUrl"), "DefaultValue"),
    app_domains: sorted(elements.filter((node) => node.localName === "AppDomain").map(text)),
  };
}
