import { collectRenderedTextUi } from "./outlook-ui-browser-text.js";

export const SEMANTIC_CONTROL_SELECTOR = 'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="tab"], [role="searchbox"], [role="textbox"], [role="combobox"], [role="listbox"], [role="option"], [role="slider"], [role="spinbutton"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="treeitem"], [contenteditable]:not([contenteditable="false"])';

export async function collectRenderedUi(shell, legacySelectors) {
  const base = await shell.evaluate((root, selector) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) !== 0
        && rect.width > 1
        && rect.height > 1;
    };
    const renderedControlText = (element) => {
      const chunks = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent?.replace(/\s+/gu, " ").trim();
        const parent = node.parentElement;
        if (text && parent && visible(parent) && !parent.closest('[aria-hidden="true"], [hidden]')) {
          const range = document.createRange();
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some((rect) => rect.width > 1 && rect.height > 1)) chunks.push(text);
        }
        node = walker.nextNode();
      }
      return chunks.join(" ").trim();
    };
    const durationMs = (value) => value.split(",").some((part) => {
      const amount = Number.parseFloat(part);
      if (!Number.isFinite(amount)) return false;
      return part.trim().endsWith("s") && !part.trim().endsWith("ms") ? amount * 1000 > 0.01 : amount > 0.01;
    });
    const motionFailures = [];
    for (const element of [document.documentElement, document.body, root, ...root.querySelectorAll("*")]) {
      const style = getComputedStyle(element);
      if (durationMs(style.transitionDuration) || durationMs(style.animationDuration) || style.scrollBehavior === "smooth") {
        motionFailures.push(element.tagName.toLowerCase());
      }
    }
    const controls = [...root.querySelectorAll(selector)];
    const semanticRole = (element) => {
      if (element.getAttribute("role")) return element.getAttribute("role");
      if (element.isContentEditable) return "textbox";
      const tag = element.tagName.toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button") return "button";
      if (tag === "textarea") return "textbox";
      if (tag === "select") return element.multiple ? "listbox" : "combobox";
      if (tag === "input") {
        return {
          checkbox: "checkbox",
          radio: "radio",
          button: "button", submit: "button", reset: "button", image: "button", file: "button",
          range: "slider",
          number: "spinbutton",
          search: "searchbox",
        }[element.type] || "textbox";
      }
      return null;
    };
    const semanticControls = controls.map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        role: semanticRole(element),
        visible: visible(element),
        ariaHidden: Boolean(element.closest('[aria-hidden="true"], [hidden]')),
        visibleText: renderedControlText(element),
        width: rect.width,
        height: rect.height,
        contentEditable: Boolean(element.isContentEditable),
      };
    });
    const visuallyHidden = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const tiny = rect.width <= 1 && rect.height <= 1;
      const clipped = style.clip !== "auto" || style.clipPath !== "none";
      const positioned = ["absolute", "fixed"].includes(style.position) && style.overflow === "hidden";
      return style.display !== "none"
        && style.visibility !== "hidden"
        && tiny
        && (clipped || positioned || style.overflow === "hidden");
    };
    const liveRegions = [...root.querySelectorAll("[aria-live]")].map((element) => ({
      id: element.id,
      hidden: element.hidden,
      ariaHidden: element.getAttribute("aria-hidden") === "true",
      display: getComputedStyle(element).display,
      visibility: getComputedStyle(element).visibility,
      textLength: (element.textContent || "").trim().length,
      visuallyHidden: visuallyHidden(element),
    }));
    const associationTokens = (element) => ["aria-controls", "aria-describedby", "aria-labelledby"]
      .flatMap((attribute) => (element.getAttribute(attribute) || "").split(/\s+/u).filter(Boolean));
    const criticalValues = [...root.querySelectorAll("[data-ui-critical-value]")].map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const id = element.id;
      const associatedControlIndexes = id
        ? controls.flatMap((control, index) => (
          (associationTokens(control).includes(id) || element.contains(control)) && document.getElementById(id) === element ? [index] : []
        ))
        : [];
      return {
        id,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        overflowX: style.overflowX,
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
        userSelect: style.userSelect,
        width: rect.width,
        associatedControlIndexes,
      };
    });
    const placeholderFields = [...root.querySelectorAll("[placeholder]")].map((element) => {
      const labelledBy = (element.getAttribute("aria-labelledby") || "").split(/\s+/u).filter(Boolean);
      const visibleLabels = [...(element.labels || [])].some(visible);
      const visibleLabelledBy = labelledBy.some((id) => {
        const label = document.getElementById(id);
        return label && visible(label) && label.textContent?.trim();
      });
      return {
        tag: element.tagName.toLowerCase(),
        placeholder: element.getAttribute("placeholder"),
        explicitName: Boolean(element.getAttribute("aria-label")?.trim() || labelledBy.length || element.labels?.length),
        visibleLabels,
        visibleLabelledBy,
      };
    });
    return {
      shellScrollWidth: root.scrollWidth,
      shellClientWidth: root.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      motionFailures,
      semanticControls,
      liveRegions,
      placeholderFields,
      titleCount: (root.matches("[title]") ? 1 : 0) + root.querySelectorAll("[title]").length,
      criticalValues,
    };
  }, SEMANTIC_CONTROL_SELECTOR);
  const text = await collectRenderedTextUi(shell, legacySelectors);
  return { ...base, ...text };
}
