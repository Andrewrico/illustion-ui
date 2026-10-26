// Web components: bring Illustion UI into shadow roots.
//
//   class MyCard extends AtomicElement {
//     connectedCallback() { this.shadowRoot.innerHTML = `<div class="${classes(s.card)}">…</div>`; }
//   }
//   // or, for an existing component: adopt(this.shadowRoot)
//
// Shadow DOM blocks document styles, so adopt() attaches ONE constructable
// stylesheet shared by every shadow root: base essentials, the widget modes
// rewritten for :host, and the atomic rules in use (kept up to date). Tokens are
// CSS variables, which inherit into shadow trees on their own. Each host mirrors
// <html>'s data-ax-* attributes so mode and @condition selectors match inside.
import {rules, used, onUse} from './atomic.js';
import {toShadow} from './shadow-css.js';
import shadowBase from '../dist/illustionui-shadow.js';

const LAYERS = '@layer theme, base, components, atomic, utilities, a11y;';
const hosts = new Set();
let sheet = null;
let observer = null;

const sheetText = () => `${LAYERS}\n${shadowBase}\n@layer atomic {\n${rules().filter(r => used.has(r.className)).map(r => toShadow(r.css)).join('\n')}\n}`;

function mirror(host) {
  const html = host.ownerDocument.documentElement;
  for (const {name} of [...host.attributes]) if (name.startsWith('data-ax-') && !html.hasAttribute(name)) host.removeAttribute(name);
  for (const {name, value} of html.attributes) if (name.startsWith('data-ax-') && host.getAttribute(name) !== value) host.setAttribute(name, value);
}

/**
 * Style a shadow root with Illustion UI. Options: css (extra stylesheet text,
 * e.g. Tailwind classes from buildPage(template)). Returns the shared sheet.
 */
export function adopt(root, {css} = {}) {
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(sheetText());
    onUse(() => sheet.replaceSync(sheetText()));
  }
  const extra = [];
  if (css) {
    const own = new CSSStyleSheet();
    own.replaceSync(css);
    extra.push(own);
  }
  root.adoptedStyleSheets = [...root.adoptedStyleSheets.filter(s => s !== sheet), sheet, ...extra];
  const host = root.host;
  if (host) {
    hosts.add(host);
    mirror(host);
    if (!observer) {
      observer = new MutationObserver(() => {
        for (const h of hosts) h.isConnected ? mirror(h) : hosts.delete(h);
      });
      observer.observe(host.ownerDocument.documentElement, {attributes: true});
    }
  }
  return sheet;
}

/** Base class: an open shadow root with Illustion UI adopted. */
// (Falls back to a plain class outside browsers so the module can be imported by the build.)
export class AtomicElement extends (globalThis.HTMLElement ?? class {}) {
  constructor() {
    super();
    adopt(this.shadowRoot || this.attachShadow({mode: 'open'}));
  }
  connectedCallback() {
    hosts.add(this);
    mirror(this);
  }
}
