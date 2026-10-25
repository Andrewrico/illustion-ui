// Rewrites document-level selectors for use inside a shadow root:
//   :root[data-a11y-x="v"] .c   →  :host([data-a11y-x="v"]) .c
//   [data-a11y-x="v"] body *    →  :host([data-a11y-x="v"]) *
// The host carries a mirror of <html>'s data-a11y-* attributes (see shadow.js),
// so this works in every browser (no :host-context()).

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === separator && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

function leadingCompound(selector) {
  let depth = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (/\s/.test(ch) && depth === 0) return [selector.slice(0, i), selector.slice(i)];
  }
  return [selector, ''];
}

export function shadowSelector(selector) {
  const s = selector.trim();
  let [compound, rest] = leadingCompound(s);
  if (compound.startsWith(':root')) compound = compound.slice(5);
  else if (!compound.startsWith('[data-a11y-') && !compound.startsWith(':is([data-a11y-')) return s;
  const host = compound ? `:host(${compound})` : ':host';
  rest = rest.replace(/^\s+body(?=\s|$)/, '');
  return `${host}${rest}`;
}

/** Rewrite every selector list in a stylesheet (comments removed). */
export function toShadow(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[{};])(\s*)([^{}@;\s][^{}]*?)\s*\{/g, (m, before, space, selectors) =>
      `${before}${space}${splitTopLevel(selectors, ',').map(shadowSelector).join(', ')} {`);
}
