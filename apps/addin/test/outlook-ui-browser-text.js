export async function collectRenderedTextUi(shell, legacySelectors) {
  return shell.evaluate((root, selectors) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) !== 0
        && rect.width > 1
        && rect.height > 1;
    };
    const renderedText = (element) => {
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
    const directTextFailure = (element) => {
      const directNodes = [...element.childNodes];
      const textNodes = directNodes.filter((node) => node.nodeType === Node.TEXT_NODE);
      const rects = [];
      const text = [];
      for (const node of textNodes) {
        const value = node.textContent?.replace(/\s+/gu, " ").trim();
        if (!value || !visible(element) || element.closest('[aria-hidden="true"], [hidden]')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const nodeRects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
        if (nodeRects.length) {
          text.push(value);
          rects.push(...nodeRects);
        }
      }
      const hasBreak = directNodes.some((node) => node.nodeType === Node.ELEMENT_NODE
        && node.tagName === "BR" && getComputedStyle(node).display !== "none");
      if (!rects.length || (!hasBreak && rects.length === 1)) return [];
      const lines = new Set(rects.map((rect) => Math.round(rect.top * 10) / 10));
      if (hasBreak) lines.add(`br:${lines.size}`);
      return lines.size > 1 ? [{ text: text.join(" ").slice(0, 120), lines: lines.size, direct: true }] : [];
    };
    const textSurfaces = (element) => {
      const failures = directTextFailure(element);
      const all = [...element.querySelectorAll("*")];
      const candidates = all.filter((candidate) => {
        if (!visible(candidate) || !renderedText(candidate)) return false;
        const display = getComputedStyle(candidate).display;
        const blockChildren = [...candidate.children].some((child) => [
          "block", "flex", "grid", "table", "table-cell", "list-item",
        ].includes(getComputedStyle(child).display));
        return !blockChildren && display !== "contents";
      });
      const candidateSet = new Set(candidates);
      const leaves = candidates.filter((candidate) => {
        for (let ancestor = candidate.parentElement; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
          if (candidateSet.has(ancestor)) return false;
        }
        return true;
      });
      for (const surface of leaves) {
        const rects = [];
        const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          if (node.parentElement && visible(node.parentElement)
            && !node.parentElement.closest('[aria-hidden="true"], [hidden]')) {
            const range = document.createRange();
            range.selectNodeContents(node);
            rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0));
          }
          node = walker.nextNode();
        }
        const lines = new Set(rects.map((rect) => Math.round(rect.top * 10) / 10));
        const style = getComputedStyle(surface);
        const critical = surface.closest("[data-ui-critical-value]");
        const text = renderedText(surface).slice(0, 120);
        if (lines.size > 1) failures.push({ text, lines: lines.size });
        if (!critical && surface.scrollWidth > surface.clientWidth
          && (style.textOverflow !== "ellipsis" || !["hidden", "clip"].includes(style.overflowX))) {
          failures.push({ text, reason: "ordinary-value-must-ellipsis" });
        }
        if (critical && (style.whiteSpace !== "nowrap" || style.textOverflow === "ellipsis")) {
          failures.push({ text, reason: "critical-value-must-remain-full" });
        }
      }
      return failures;
    };
    const helperSurfaces = [...root.querySelectorAll("p")]
      .filter((element) => {
        if (!visible(element)) return false;
        const role = element.getAttribute("role");
        const conciseStatus = role === "status" && element.hasAttribute("aria-live")
          && renderedText(element).length <= 96;
        return role !== "alert" && !conciseStatus;
      })
      .map((element) => ({ tag: "p", text: renderedText(element).slice(0, 120) }));
    const decorativeSurfaces = [...root.querySelectorAll("section")].flatMap((element) => {
      if (!visible(element)) return [];
      const hasHeading = Boolean(element.querySelector("h1, h2, h3, h4, h5, h6"));
      const hasAction = Boolean(element.querySelector(
        'button, a[href], input, select, textarea, [role="button"], [role="link"], output, [data-ui-critical-value]',
      ));
      const role = element.getAttribute("role");
      const text = renderedText(element);
      const conciseResult = ["alert", "status"].includes(role || "") && text.length <= 96;
      return conciseResult || (hasHeading && hasAction) ? [] : [{ tag: "section", text: text.slice(0, 120) }];
    }).concat([...root.querySelectorAll('[role="status"]')].flatMap((element) => {
      if (!visible(element)) return [];
      const text = renderedText(element);
      return element.hasAttribute("aria-live") && text.length <= 96 ? [] : [{ tag: "status", text: text.slice(0, 120) }];
    }));
    const statuses = [...root.querySelectorAll('output, [role="status"]')].filter(visible);
    const groups = [...root.querySelectorAll('section, [role="group"], fieldset, form, label')];
    const nearestGroup = (status) => {
      for (let ancestor = status.parentElement; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
        if (groups.includes(ancestor)) return ancestor;
      }
      return null;
    };
    const repeatedRows = (group) => {
      const formControls = 'input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="listbox"], [role="spinbutton"], [role="slider"]';
      if ([...group.querySelectorAll(formControls)].some(visible)) return false;
      const cellSelector = 'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="tab"]';
      const textCells = (container) => [...container.children].filter((child) => visible(child)
        && renderedText(child) && !child.matches(cellSelector) && !child.querySelector(cellSelector));
      const candidates = [...group.querySelectorAll("*")].filter((container) => {
        const cells = textCells(container);
        return cells.length >= 2 && (cells.length >= 4 && cells.length % 2 === 0 || cells.length === 2);
      });
      const siblingRows = new Map();
      for (const candidate of candidates) {
        const parent = candidate.parentElement;
        if (!parent) continue;
        const rows = siblingRows.get(parent) || [];
        rows.push(candidate);
        siblingRows.set(parent, rows);
      }
      return candidates.some((candidate) => textCells(candidate).length >= 4)
        || [...siblingRows.values()].some((rows) => rows.length >= 2);
    };
    const statusGridSurfaces = groups.flatMap((group) => {
      const members = statuses.filter((status) => nearestGroup(status) === group);
      const heading = [...group.querySelectorAll("h1, h2, h3, h4, h5, h6, label, legend")].some(visible);
      const rows = repeatedRows(group);
      if (!members.length) {
        if (!(heading && rows)) return [];
        return [{ text: renderedText(group).slice(0, 120), count: 0, heading, repeatedRows: rows }];
      }
      if (members.length === 1 && !heading && !rows) return [];
      return [{ text: renderedText(group).slice(0, 120), count: members.length, heading, repeatedRows: rows }];
    });
    const ungroupedStatuses = statuses.filter((status) => !nearestGroup(status));
    if (ungroupedStatuses.length > 1) {
      statusGridSurfaces.push({ text: renderedText(root).slice(0, 120), count: ungroupedStatuses.length, heading: false, repeatedRows: false });
    }
    const alerts = [...root.querySelectorAll('[role="alert"]')].map((element, index) => ({
      index,
      visible: visible(element),
      ariaHidden: Boolean(element.closest('[aria-hidden="true"], [hidden]')),
    }));
    const legacySurfaces = [];
    for (const selector of selectors) {
      if (root.matches(selector) && visible(root)) legacySurfaces.push(selector);
      for (const element of root.querySelectorAll(selector)) {
        if (visible(element)) legacySurfaces.push(selector);
      }
    }
    const rails = [...root.querySelectorAll('nav, [role="navigation"]')]
      .map(renderedText)
      .filter(Boolean)
      .map((text) => text.slice(0, 120));
    const tooltips = [...root.querySelectorAll('[role="tooltip"]')]
      .filter(visible)
      .map((element) => renderedText(element).slice(0, 120))
      .filter(Boolean);
    return {
      lineFailures: textSurfaces(root),
      rails,
      tooltips,
      legacySurfaces,
      helperSurfaces,
      decorativeSurfaces,
      statusGridSurfaces,
      alerts,
    };
  }, legacySelectors);
}
