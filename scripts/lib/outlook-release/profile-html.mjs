const INERT_CONTEXT_TAG = /<!--|-->|<\/?(?:template|noscript|textarea|xmp|iframe|noembed|noframes|plaintext|listing|style|svg|math)\b/iu;

function assertCanonicalMarkup(html, profile) {
  let insideTag = false;
  let quote = "";
  for (let index = 0; index < html.length; index += 1) {
    const char = html[index];
    if (!insideTag) {
      if (char !== "<") continue;
      if (html.startsWith("<?", index)) {
        throw new Error(`${profile} task pane contains a processing instruction`);
      }
      if (html.startsWith("<!", index)) {
        const end = html.indexOf(">", index + 2);
        const declaration = end >= 0 ? html.slice(index, end + 1).toLowerCase() : "";
        if (declaration !== "<!doctype html>") {
          throw new Error(`${profile} task pane contains a non-canonical markup declaration`);
        }
        index = end;
        continue;
      }
      insideTag = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      else if (char === "<") throw new Error(`${profile} task pane contains nested markup in a tag`);
      continue;
    }
    if (char === "\"" || char === "'") quote = char;
    else if (char === "<") throw new Error(`${profile} task pane contains nested markup in a tag`);
    else if (char === ">") insideTag = false;
  }
  if (insideTag || quote) throw new Error(`${profile} task pane contains an unclosed HTML tag or attribute`);
}

export function assertActiveScriptContext(html, profile) {
  assertCanonicalMarkup(html, profile);
  if (INERT_CONTEXT_TAG.test(html)) throw new Error(`${profile} task pane contains an inert or unsupported HTML context`);
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/giu)];
  const titleOpenings = [...html.matchAll(/<title\b[^>]*>/giu)];
  const titleClosings = [...html.matchAll(/<\/title\s*>/giu)];
  if (titleOpenings.length !== 1 || titleClosings.length !== titleOpenings.length
    || titles.length !== titleOpenings.length || titles.some(([, body]) => /<script\b/iu.test(body))) {
    throw new Error(`${profile} task pane contains a malformed or script-bearing title context`);
  }
}
