// Atomic CSS engine, Facebook/StyleX style.
//
//   const s = create({
//     card: {padding: vars.space[4], color: {default: vars.color.text, ':hover': vars.color.primary, '@contrast-more': vars.color.text}},
//   });
//   el.className = classes(s.card, isActive && s.active);
//
// Every property/value/condition becomes ONE class with ONE declaration, named by
// a stable hash, so identical styles anywhere share a class and the stylesheet
// stops growing. Merging is decided here, not by specificity: the last style
// wins per property, and a later shorthand removes earlier longhands.
// The build (scripts/build.mjs) imports style modules and emits every
// registered rule; in the browser create() only computes class names.

import {VARIANTS} from './conditions.js';

export const registry = new Map(); // className → {property, value, conditions, pseudoElement}

// Our own field: condition names the build turns into widget/OS-aware selectors.
export const SHORTCUTS = ['@sm', '@md', '@lg', '@xl', '@2xl', '@dark', '@contrast-more', '@motion-safe', '@motion-reduce', '@large-text', '@text-spacing', '@forced-colors', '@print'];

const SHORTHANDS = {
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block', 'padding-inline-start', 'padding-inline-end', 'padding-block-start', 'padding-block-end'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block', 'margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end'],
  inset: ['top', 'right', 'bottom', 'left', 'inset-inline', 'inset-block'],
  border: ['border-width', 'border-style', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color'],
  'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'border-color': ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'],
  gap: ['row-gap', 'column-gap'],
  overflow: ['overflow-x', 'overflow-y'],
  outline: ['outline-width', 'outline-style', 'outline-color'],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  background: ['background-color', 'background-image'],
  transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
  'grid-column': ['grid-column-start', 'grid-column-end'],
  'place-items': ['align-items', 'justify-items'],
};
export const isShorthand = property => property in SHORTHANDS;

const kebab = p => (p.startsWith('--') ? p : p.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`));

// FNV-1a, 32-bit: same result in Node and browsers.
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function register(property, value, conditions, pseudoElement) {
  const signature = `${conditions.join('&')}|${pseudoElement || ''}|${property}:${value}`;
  const className = `x${hash(signature)}`;
  const existing = registry.get(className);
  if (existing && existing.signature !== signature) throw new Error(`atomic class collision: ${className} (${existing.signature} vs ${signature})`);
  if (!existing) registry.set(className, {signature, property, value: String(value), conditions, pseudoElement});
  return className;
}

// Walks {default, ':hover': …, '@lg': {default, ':focus-visible': …}} into [conditions, value] pairs.
function expand(value, conditions = []) {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [[conditions, value]];
  return Object.entries(value).flatMap(([key, inner]) => {
    if (key === 'default') return expand(inner, conditions);
    if (!(key.startsWith(':') || key.startsWith('@'))) throw new Error(`unknown condition "${key}" (use default, :pseudo, @media/@supports/@container or ${SHORTCUTS.join(' ')})`);
    if (key.startsWith('@') && !/^@(media|supports|container) /.test(key) && !SHORTCUTS.includes(key)) throw new Error(`unknown condition "${key}"`);
    return expand(inner, [...conditions, key]);
  });
}

function compileStyle(style, pseudoElement = null) {
  const out = {}; // merge key → className
  for (const [prop, value] of Object.entries(style)) {
    if (prop.startsWith('::')) {
      Object.assign(out, compileStyle(value, prop));
      continue;
    }
    const property = kebab(prop);
    for (const [conditions, v] of expand(value)) {
      const key = `${pseudoElement || ''}|${conditions.join('&')}|${property}`;
      out[key] = register(property, v, conditions, pseudoElement);
    }
  }
  return out;
}

/** Compile a map of named styles. Each result is an opaque object for props()/classes(). */
export function create(styles) {
  return Object.fromEntries(Object.entries(styles).map(([name, style]) => [name, Object.freeze(compileStyle(style))]));
}

/** Merge styles left to right (falsy values skipped) and return {className}. */
export function props(...styles) {
  const merged = {};
  for (const style of styles.flat(Infinity)) {
    if (!style) continue;
    for (const [key, className] of Object.entries(style)) {
      const [pseudo, conditions, property] = key.split('|');
      // A later shorthand replaces earlier longhands in the same context.
      for (const longhand of SHORTHANDS[property] || []) delete merged[`${pseudo}|${conditions}|${longhand}`];
      delete merged[key]; // re-insert so order reflects the latest style
      merged[key] = className;
    }
  }
  return {className: Object.values(merged).join(' ')};
}

export const classes = (...styles) => props(...styles).className;

// ---------- CSS output (used by the build, and by inject() in development) ----------
const minWidth = text => Math.max(0, ...[...String(text).matchAll(/min-width:\s*(\d+)px/g)].map(m => Number(m[1])));

/** Every registered atomic rule as {className, css, order}; one declaration each. */
export function rules() {
  const out = [];
  let index = 0;
  for (const [className, rule] of registry) {
    const pseudos = rule.conditions.filter(c => c.startsWith(':')).join('');
    const atRules = rule.conditions.filter(c => /^@(media|supports|container) /.test(c));
    const shortcuts = rule.conditions.filter(c => c.startsWith('@') && !atRules.includes(c)).map(c => VARIANTS[c.slice(1)]);
    if (shortcuts.filter(v => v.ctx.some(([prefix]) => prefix)).length > 1) throw new Error(`${className}: combine at most one widget condition (${rule.conditions})`);
    let contexts = [['', []]];
    for (const v of shortcuts) contexts = contexts.flatMap(([prefix, media]) => v.ctx.map(([p, m]) => [prefix + p, m ? [...media, `@media ${m}`] : media]));
    const decl = `${rule.property}: ${rule.value};`;
    const weight = minWidth(rule.conditions.join(' ')) || Math.max(0, ...shortcuts.map(v => minWidth(v.ctx[0][1] || '')));
    const rank = (pseudos ? 1 : 0) + (atRules.length || shortcuts.length ? 2 : 0);
    const order = [rank, weight, isShorthand(rule.property) ? 0 : 1, index++];
    const css = contexts.map(([prefix, media]) => {
      const selector = `${prefix}.${className}${pseudos}${rule.pseudoElement || ''}`;
      return [...atRules, ...media].reduceRight((inner, at) => `${at} { ${inner} }`, `${selector} { ${decl} }`);
    }).join('\n');
    out.push({className, css, order});
  }
  const cmp = (a, b) => a.order.findIndex((v, i) => v !== b.order[i]);
  return out.sort((a, b) => { const i = cmp(a, b); return i < 0 ? 0 : a.order[i] - b.order[i]; });
}

/**
 * Development helper (like StyleX's dev runtime): writes every registered rule
 * into one <style> in @layer atomic, so styles created in the page work without
 * a rebuild. Production pages should use the built CSS (npx a11y-atomic --styles).
 */
export function inject(doc = globalThis.document) {
  let el = doc.querySelector('style[data-atomic-dev]');
  if (!el) {
    el = doc.createElement('style');
    el.dataset.atomicDev = '';
    doc.head.append(el);
  }
  el.textContent = `@layer atomic {\n${rules().map(r => r.css).join('\n')}\n}`;
  return el;
}
