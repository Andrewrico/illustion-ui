#!/usr/bin/env node
// a11y-atomic build: Tailwind-compatible class names on our own accessibility tokens.
//
//   node scripts/build.mjs                          → full dist/ bundle
//   node scripts/build.mjs --content "_site/**/*.html" --out site.css
//                                                   → only the Tailwind classes those files use
//   … --styles "src/**/*.styles.js"                  → plus atomic rules from your create() modules
//
// Cascade layers:
//   theme → base → components (grid.css) → atomic (Facebook/StyleX-style classes
//   from create(): grid, widget, your style modules) → utilities (Tailwind names) → a11y (widget modes)
// so Tailwind classes can override atomic styles, your own unlayered CSS beats
// both, and the reader's widget choices (!important in a layer) beat everything.
import {readFile, writeFile, mkdir, glob} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import * as tokens from '../src/tokens.mjs';
import {SETTINGS} from '../src/widget.js'; // also registers the widget's atomic styles
import {rules, create, props as mergeStyles, registry} from '../src/atomic.js';
import {gridStyles} from '../src/grid.styles.js';
import {VARIANTS} from '../src/conditions.js';
import {PREFIX, standardizeGrid} from '../src/naming.js';
import {toShadow} from '../src/shadow-css.js';
export {VARIANTS};
import '../src/grid.styles.js';

const read = file => readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// ---------- helpers ----------
export const esc = name => name
  .replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`)
  .replace(/^(\d)/, d => `\\3${d} `);
const decls = d => Object.entries(d).map(([k, v]) => `${k}: ${v};`).join(' ');
const vars = (obj, prefix = '') => Object.entries(obj).map(([k, v]) => `  --${PREFIX}-${prefix}${k}: ${v};`).join('\n');
const named = name => `${PREFIX}-${name}`; // utility class name per the naming standard
const key = k => (k === 'DEFAULT' ? '' : `-${k}`);
const step = s => (s === 'px' ? '1px' : s === '0' ? '0' : `calc(var(--ax-spacing) * ${s})`);

// ---------- theme (tokens + colour themes) ----------
function themeCss() {
  const {a11y, spacing, spaceSteps, text, radius, shadow, duration, ease, fluid, themes} = tokens;
  const fluidVar = ([min, max]) => {
    const slope = (max - min) / (90 - 20); // 320px → 1440px, in rem (20rem → 90rem)
    const intercept = min - slope * 20;
    return `clamp(${min}rem, ${+intercept.toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${max}rem)`;
  };
  const root = {
    ...a11y,
    spacing,
    ...Object.fromEntries(spaceSteps.map(s => [`space-${s.replace('.', '_')}`, step(s)])),
    ...Object.fromEntries(Object.entries(text).flatMap(([k, [size, lh]]) => [[`text-${k}`, size], [`text-${k}--line-height`, lh]])),
    ...Object.fromEntries(Object.entries(radius).map(([k, v]) => [`radius${key(k)}`, v])),
    ...Object.fromEntries(Object.entries(shadow).map(([k, v]) => [`shadow${key(k)}`, v])),
    ...Object.fromEntries(Object.entries(duration).map(([k, v]) => [`duration-${k}`, `calc(${v} * var(--ax-a11y-motion))`])),
    ...Object.fromEntries(Object.entries(ease).map(([k, v]) => [`ease-${k}`, v])),
    ...Object.fromEntries(Object.entries(fluid).map(([k, v]) => [`space-fluid-${k}`, fluidVar(v)])),
    measure: '70ch',
  };
  const theme = (selector, name, scheme) => `${selector} {\n  color-scheme: ${scheme};\n${vars(themes[name], 'color-')}\n}`;
  const wrap = (mqs, css) => (mqs.length ? `@media ${mqs.join(' and ')} {\n${css}\n}` : css);
  // Each way "dark" / "high contrast" turns on: widget attribute, or OS preference not overridden.
  const dark = [['[data-ax-theme="dark"]'], [':not([data-ax-theme="light"])', '(prefers-color-scheme: dark)']];
  const high = [['[data-ax-contrast="high"]'], [':not([data-ax-contrast="normal"])', '(prefers-contrast: more)']];
  const out = [`:root {\n${vars(root)}\n}`, theme(':root', 'light', 'light')];
  for (const [sel, mq] of dark) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'dark', 'dark')));
  for (const [sel, mq] of high) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'high-light', 'light')));
  for (const [hs, hm] of high) for (const [ds, dm] of dark) out.push(wrap([hm, dm].filter(Boolean), theme(`:root${hs}${ds}`, 'high-dark', 'dark')));
  return out.join('\n\n');
}

// ---------- variants ----------
// Each context = [selector prefix, media query]; pseudo is appended to the class.
const bp = Object.entries(tokens.breakpoints);
const RESP = bp.map(([name]) => name);
const STATES = ['hover', 'focus', 'focus-visible', 'focus-within', 'active', 'disabled', 'group-hover', 'group-focus-within'];
const A11Y = ['dark', 'contrast-more', 'motion-safe', 'motion-reduce', 'large-text', 'text-spacing', 'forced-colors', 'print'];
const LAYOUT = ['large-text', 'text-spacing', 'print', ...RESP];
const VARIANT_ORDER = [...STATES, ...A11Y, ...RESP]; // later = wins at equal specificity

// ---------- utilities (Tailwind names, our tokens) ----------
// [className, declarations, variants[]]
export function utilities() {
  const u = [];
  const add = (name, d, v = []) => u.push([name, d, v]);
  const {spaceSteps, text, radius, shadow, ease, fluid, maxWidth, themes} = tokens;
  const colors = Object.keys(themes.light);
  const SIZES = ['0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
  const DIMS = spaceSteps;
  const fractions = {'1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%', '1/4': '25%', '3/4': '75%', '1/5': '20%', '2/5': '40%', '3/5': '60%', '4/5': '80%'};

  // Accessibility
  add('sr-only', {position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', 'white-space': 'nowrap', 'border-width': '0'}, ['focus', 'focus-within', ...RESP]);
  add('not-sr-only', {position: 'static', width: 'auto', height: 'auto', padding: '0', margin: '0', overflow: 'visible', clip: 'auto', 'white-space': 'normal'}, ['focus', 'focus-within', ...RESP]);

  // Layout
  for (const v of ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'flow-root', 'table', 'list-item']) add(v, {display: v}, [...A11Y, ...RESP, 'group-hover', 'group-focus-within', 'focus-within']);
  add('hidden', {display: 'none'}, [...A11Y, ...RESP, 'group-hover', 'group-focus-within', 'focus-within']);
  add('container', {width: '100%'});
  for (const v of ['static', 'relative', 'absolute', 'fixed', 'sticky']) add(v, {position: v}, [...RESP, 'focus']);
  for (const [n, p] of [['inset', 'inset'], ['inset-x', 'inset-inline'], ['inset-y', 'inset-block'], ['top', 'top'], ['right', 'right'], ['bottom', 'bottom'], ['left', 'left']]) {
    for (const s of ['0', 'px', '1', '2', '4', '8']) add(`${n}-${s}`, {[p]: step(s)}, ['focus']);
    add(`${n}-auto`, {[p]: 'auto'}); add(`${n}-full`, {[p]: '100%'});
  }
  for (const z of ['0', '10', '20', '30', '40', '50', 'auto']) add(`z-${z}`, {'z-index': z}, ['focus']);
  for (const v of ['auto', 'hidden', 'clip', 'visible', 'scroll']) {
    add(`overflow-${v}`, {overflow: v}, RESP);
    add(`overflow-x-${v}`, {'overflow-x': v}); add(`overflow-y-${v}`, {'overflow-y': v});
  }
  add('visible', {visibility: 'visible'}, RESP); add('invisible', {visibility: 'hidden'}, RESP);
  add('isolate', {isolation: 'isolate'});
  for (const v of ['auto', 'square', 'video']) add(`aspect-${v}`, {'aspect-ratio': {auto: 'auto', square: '1 / 1', video: '16 / 9'}[v]});
  for (const v of ['contain', 'cover', 'fill', 'none', 'scale-down']) add(`object-${v}`, {'object-fit': v});
  add('object-center', {'object-position': 'center'});

  // Flexbox & grid
  for (const [n, v] of [['row', 'row'], ['row-reverse', 'row-reverse'], ['col', 'column'], ['col-reverse', 'column-reverse']]) add(`flex-${n}`, {'flex-direction': v}, LAYOUT);
  for (const v of ['wrap', 'wrap-reverse', 'nowrap']) add(`flex-${v}`, {'flex-wrap': v}, LAYOUT);
  for (const [n, v] of [['1', '1 1 0%'], ['auto', '1 1 auto'], ['initial', '0 1 auto'], ['none', 'none']]) add(`flex-${n}`, {flex: v}, LAYOUT);
  add('grow', {'flex-grow': '1'}, LAYOUT); add('grow-0', {'flex-grow': '0'}, LAYOUT); add('shrink', {'flex-shrink': '1'}); add('shrink-0', {'flex-shrink': '0'});
  for (const [n, v] of [['0', '0'], ['auto', 'auto'], ['full', '100%'], ...Object.entries(fractions)]) add(`basis-${n}`, {'flex-basis': v}, LAYOUT);
  // Every Layout's Switcher in two classes: parent "flex flex-wrap", children "grow basis-switch".
  // The threshold is in rem, so larger text switches to stacked sooner — reflow for free.
  add('basis-switch', {'flex-basis': 'calc((var(--ax-switch-at, 30rem) - 100%) * 999)'});
  add('grow-999', {'flex-grow': '999'});
  for (let n = 1; n <= 12; n++) add(`order-${n}`, {order: n}, LAYOUT);
  for (const [n, v] of [['first', '-9999'], ['last', '9999'], ['none', '0']]) add(`order-${n}`, {order: v}, LAYOUT);

  for (let n = 1; n <= 12; n++) {
    add(`grid-cols-${n}`, {'grid-template-columns': `repeat(${n}, minmax(0, 1fr))`}, LAYOUT);
    add(`col-span-${n}`, {'grid-column': `span ${n} / span ${n}`}, LAYOUT);
    add(`col-start-${n}`, {'grid-column-start': n}, RESP);
    add(`row-span-${n}`, {'grid-row': `span ${n} / span ${n}`}, RESP);
  }
  for (let n = 1; n <= 6; n++) add(`grid-rows-${n}`, {'grid-template-rows': `repeat(${n}, minmax(0, 1fr))`}, RESP);
  add('grid-cols-none', {'grid-template-columns': 'none'}, LAYOUT);
  add('grid-cols-auto', {'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, var(--ax-min-col, 16rem)), 1fr))'}, LAYOUT);
  add('col-span-full', {'grid-column': '1 / -1'}, LAYOUT); add('col-auto', {'grid-column': 'auto'}, LAYOUT);
  for (const v of ['row', 'col', 'dense', 'row-dense', 'col-dense']) add(`grid-flow-${v}`, {'grid-auto-flow': v.replace('col', 'column').replace('-', ' ')});

  for (const [n, v] of [['start', 'flex-start'], ['end', 'flex-end'], ['center', 'center'], ['between', 'space-between'], ['around', 'space-around'], ['evenly', 'space-evenly'], ['stretch', 'stretch']]) add(`justify-${n}`, {'justify-content': v}, LAYOUT);
  for (const v of ['start', 'end', 'center', 'stretch']) add(`justify-items-${v}`, {'justify-items': v}, RESP);
  for (const [n, v] of [['start', 'flex-start'], ['end', 'flex-end'], ['center', 'center'], ['baseline', 'baseline'], ['stretch', 'stretch']]) add(`items-${n}`, {'align-items': v}, LAYOUT);
  for (const [n, v] of [['start', 'flex-start'], ['end', 'flex-end'], ['center', 'center'], ['between', 'space-between'], ['stretch', 'stretch']]) add(`content-${n}`, {'align-content': v}, RESP);
  for (const v of ['auto', 'start', 'end', 'center', 'stretch', 'baseline']) add(`self-${v}`, {'align-self': ['start', 'end'].includes(v) ? `flex-${v}` : v}, RESP);
  for (const v of ['start', 'end', 'center', 'stretch']) {
    add(`place-items-${v}`, {'place-items': v}, RESP); add(`place-content-${v}`, {'place-content': v}, RESP);
  }

  // Spacing
  const sides = {p: 'padding', px: 'padding-inline', py: 'padding-block', pt: 'padding-top', pr: 'padding-right', pb: 'padding-bottom', pl: 'padding-left', ps: 'padding-inline-start', pe: 'padding-inline-end',
    m: 'margin', mx: 'margin-inline', my: 'margin-block', mt: 'margin-top', mr: 'margin-right', mb: 'margin-bottom', ml: 'margin-left', ms: 'margin-inline-start', me: 'margin-inline-end'};
  for (const s of SIZES) {
    for (const [n, p] of Object.entries(sides)) add(`${n}-${s}`, {[p]: step(s)}, [...RESP, 'focus']);
    add(`gap-${s}`, {gap: step(s)}, LAYOUT); add(`gap-x-${s}`, {'column-gap': step(s)}, RESP); add(`gap-y-${s}`, {'row-gap': step(s)}, RESP);
    add(`space-y-${s}`, {'margin-block-start': step(s)}, RESP);
    add(`space-x-${s}`, {'margin-inline-start': step(s)}, RESP);
  }
  for (const n of ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me']) add(`${n}-auto`, {[sides[n]]: 'auto'}, RESP);
  // Utopia fluid space: grows smoothly from 320px to 1440px.
  for (const k of Object.keys(fluid)) for (const n of ['p', 'px', 'py', 'pt', 'pb', 'm', 'my', 'mt', 'mb', 'gap']) add(`${n}-fluid-${k}`, {[n === 'gap' ? 'gap' : sides[n]]: `var(--ax-space-fluid-${k})`});

  // Sizing
  const extra = {auto: 'auto', full: '100%', min: 'min-content', max: 'max-content', fit: 'fit-content', ...fractions};
  for (const [n, p, screen] of [['w', 'width', '100vw'], ['h', 'height', '100vh']]) {
    for (const s of DIMS) add(`${n}-${s}`, {[p]: step(s)}, RESP);
    for (const [k, v] of Object.entries(extra)) add(`${n}-${k}`, {[p]: v}, RESP);
    add(`${n}-screen`, {[p]: screen}, RESP); add(`${n}-dv${n === 'w' ? 'w' : 'h'}`, {[p]: `100dv${n === 'w' ? 'w' : 'h'}`});
  }
  for (const s of ['0', '4', '6', '8', '10', '12', '16']) add(`size-${s}`, {width: step(s), height: step(s)});
  add('size-full', {width: '100%', height: '100%'});
  for (const [n, v] of [['0', '0'], ['full', '100%'], ['min', 'min-content'], ['max', 'max-content'], ['1/2', '50%']]) add(`min-w-${n}`, {'min-width': v}, RESP);
  for (const [n, v] of [['0', '0'], ['full', '100%'], ['screen', '100vh'], ['dvh', '100dvh']]) add(`min-h-${n}`, {'min-height': v}, RESP);
  for (const [k, v] of Object.entries(maxWidth)) add(`max-w-${k}`, {'max-width': v}, RESP);
  for (const [n, v] of [['full', '100%'], ['screen', '100vh'], ['none', 'none']]) add(`max-h-${n}`, {'max-height': v});
  // Our own field: target sizes follow the widget (24px → 44px in "Larger click targets").
  add('min-h-target', {'min-height': 'var(--ax-a11y-target-min)'}); add('min-w-target', {'min-width': 'var(--ax-a11y-target-min)'});
  add('size-target', {width: 'var(--ax-a11y-target-min)', height: 'var(--ax-a11y-target-min)'});

  // Typography
  add('font-sans', {'font-family': 'var(--ax-a11y-font-body)'}); add('font-mono', {'font-family': 'var(--ax-a11y-font-mono)'});
  for (const k of Object.keys(text)) add(`text-${k}`, {'font-size': `var(--ax-text-${k})`, 'line-height': `var(--ax-text-${k}--line-height)`}, LAYOUT);
  for (const [n, w] of [['thin', 100], ['extralight', 200], ['light', 300], ['normal', 400], ['medium', 500], ['semibold', 600], ['bold', 700], ['extrabold', 800], ['black', 900]]) add(`font-${n}`, {'font-weight': w}, ['contrast-more']);
  add('italic', {'font-style': 'italic'}); add('not-italic', {'font-style': 'normal'});
  // Tracking never drops below the widget's letter spacing (WCAG 1.4.12).
  for (const [n, v] of [['tighter', '-0.05em'], ['tight', '-0.025em'], ['normal', '0em'], ['wide', '0.025em'], ['wider', '0.05em'], ['widest', '0.1em']]) add(`tracking-${n}`, {'letter-spacing': `max(${v}, var(--ax-a11y-letter-spacing))`});
  for (const [n, v] of [['none', '1'], ['tight', '1.25'], ['snug', '1.375'], ['normal', 'var(--ax-a11y-line-height)'], ['relaxed', '1.625'], ['loose', '2']]) add(`leading-${n}`, {'line-height': v});
  for (const v of ['left', 'center', 'right', 'justify', 'start', 'end']) add(`text-${v}`, {'text-align': v}, LAYOUT);
  for (const [n, v] of [['underline', 'underline'], ['overline', 'overline'], ['line-through', 'line-through'], ['no-underline', 'none']]) add(n, {'text-decoration-line': v}, [...STATES, 'contrast-more']);
  for (const n of ['1', '2', '4', '8']) add(`underline-offset-${n}`, {'text-underline-offset': `${n}px`});
  for (const n of ['1', '2', '4']) add(`decoration-${n}`, {'text-decoration-thickness': `${n}px`});
  for (const [n, v] of [['uppercase', 'uppercase'], ['lowercase', 'lowercase'], ['capitalize', 'capitalize'], ['normal-case', 'none']]) add(n, {'text-transform': v});
  add('truncate', {overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap'});
  add('text-ellipsis', {'text-overflow': 'ellipsis'}); add('text-clip', {'text-overflow': 'clip'});
  for (const v of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) add(`whitespace-${v}`, {'white-space': v});
  for (const v of ['wrap', 'nowrap', 'balance', 'pretty']) add(`text-${v}`, {'text-wrap': v});
  add('break-words', {'overflow-wrap': 'break-word'}); add('break-all', {'word-break': 'break-all'}); add('break-normal', {'overflow-wrap': 'normal'});
  for (const v of ['none', 'disc', 'decimal']) add(`list-${v}`, {'list-style-type': v});
  add('list-inside', {'list-style-position': 'inside'}); add('list-outside', {'list-style-position': 'outside'});
  for (const v of ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom']) add(`align-${v}`, {'vertical-align': v});

  // Colour: semantic tokens only — every pair is contrast-tested in all four themes.
  const COLOR_V = [...STATES, 'dark', 'contrast-more', 'forced-colors', 'print'];
  for (const c of colors) {
    add(`text-${c}`, {color: `var(--ax-color-${c})`}, COLOR_V);
    add(`bg-${c}`, {'background-color': `var(--ax-color-${c})`}, COLOR_V);
    add(`border-${c}`, {'border-color': `var(--ax-color-${c})`}, COLOR_V);
    add(`outline-${c}`, {'outline-color': `var(--ax-color-${c})`}, ['focus', 'focus-visible']);
    add(`decoration-${c}`, {'text-decoration-color': `var(--ax-color-${c})`});
    add(`fill-${c}`, {fill: `var(--ax-color-${c})`}); add(`stroke-${c}`, {stroke: `var(--ax-color-${c})`});
    add(`accent-${c}`, {'accent-color': `var(--ax-color-${c})`}); add(`caret-${c}`, {'caret-color': `var(--ax-color-${c})`});
  }
  for (const [n, v] of [['transparent', 'transparent'], ['current', 'currentColor'], ['inherit', 'inherit']]) {
    add(`text-${n}`, {color: v}, COLOR_V); add(`bg-${n}`, {'background-color': v}, COLOR_V); add(`border-${n}`, {'border-color': v}, COLOR_V);
  }
  add('fill-current', {fill: 'currentColor'}); add('stroke-current', {stroke: 'currentColor'});

  // Borders, radius, outline
  const BORDER_V = ['contrast-more', 'forced-colors', ...STATES];
  for (const [w, n] of [['1px', ''], ['0', '-0'], ['2px', '-2'], ['4px', '-4'], ['8px', '-8']]) {
    add(`border${n}`, {'border-width': w}, BORDER_V);
    for (const [s, p] of [['x', 'border-inline-width'], ['y', 'border-block-width'], ['t', 'border-top-width'], ['r', 'border-right-width'], ['b', 'border-bottom-width'], ['l', 'border-left-width']]) add(`border-${s}${n}`, {[p]: w}, ['contrast-more']);
  }
  for (const v of ['solid', 'dashed', 'dotted', 'double', 'none']) add(`border-${v}`, {'border-style': v});
  for (const k of Object.keys(radius)) {
    add(`rounded${key(k)}`, {'border-radius': `var(--ax-radius${key(k)})`}, ['focus']);
    for (const [s, ps] of [['t', ['top-left', 'top-right']], ['b', ['bottom-left', 'bottom-right']], ['l', ['top-left', 'bottom-left']], ['r', ['top-right', 'bottom-right']]]) {
      add(`rounded-${s}${key(k)}`, Object.fromEntries(ps.map(p => [`border-${p}-radius`, `var(--ax-radius${key(k)})`])));
    }
  }
  add('outline-none', {outline: '2px solid transparent'}); add('outline-hidden', {'outline-style': 'none'});
  for (const n of ['0', '1', '2', '4', '8']) {
    add(`outline-${n}`, {'outline-width': `${n}px`}, ['focus', 'focus-visible']);
    add(`outline-offset-${n}`, {'outline-offset': `${n}px`}, ['focus', 'focus-visible']);
  }
  add('outline', {'outline-style': 'solid'}, ['focus', 'focus-visible']); add('outline-dashed', {'outline-style': 'dashed'});
  // Our own field: the focus ring follows the widget's focus width and colour.
  add('outline-focus-ring', {outline: 'var(--ax-a11y-focus-width) solid var(--ax-color-focus)'}, ['focus', 'focus-visible', 'focus-within']);

  // Effects
  for (const k of Object.keys(shadow)) add(`shadow${key(k)}`, {'box-shadow': `var(--ax-shadow${key(k)})`}, ['hover', 'focus-visible', 'group-hover', 'contrast-more']);
  for (const n of ['0', '5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '95', '100']) add(`opacity-${n}`, {opacity: `${n / 100}`}, [...STATES, 'motion-reduce']);
  // Material state layer, as one declaration per state: a currentColor wash over any background.
  const wash = pct => `linear-gradient(color-mix(in srgb, currentColor ${pct}%, transparent) 0 0)`;
  for (const n of ['8', '12', '16']) add(`wash-${n}`, {'background-image': wash(n)}, ['hover', 'focus-visible', 'active', 'group-hover']);

  // Transitions & animation — every duration is multiplied by --ax-a11y-motion.
  const props = {DEFAULT: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate', all: 'all', colors: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke', opacity: 'opacity', shadow: 'box-shadow', transform: 'transform, translate, scale, rotate'};
  for (const [k, v] of Object.entries(props)) add(`transition${key(k)}`, {'transition-property': v, 'transition-timing-function': 'var(--ax-ease-in-out)', 'transition-duration': 'calc(150ms * var(--ax-a11y-motion))'}, ['motion-safe']);
  add('transition-none', {'transition-property': 'none'}, ['motion-reduce']);
  for (const n of ['0', '75', '100', '150', '200', '300', '500', '700', '1000']) add(`duration-${n}`, {'transition-duration': `calc(${n}ms * var(--ax-a11y-motion))`});
  for (const n of ['0', '75', '100', '150', '200', '300', '500', '700', '1000']) add(`delay-${n}`, {'transition-delay': `calc(${n}ms * var(--ax-a11y-motion))`});
  for (const k of Object.keys(ease)) add(`ease-${k}`, {'transition-timing-function': `var(--ax-ease-${k})`});
  add('animate-none', {animation: 'none'}, ['motion-reduce']);
  for (const n of ['95', '100', '105', '110']) add(`scale-${n}`, {scale: `${n / 100}`}, ['hover', 'focus-visible', 'active', 'group-hover', 'motion-safe']);
  for (const n of ['0', '45', '90', '180']) add(`rotate-${n}`, {rotate: `${n}deg`});

  // Interactivity
  for (const v of ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed']) add(`cursor-${v}`, {cursor: v});
  add('pointer-events-none', {'pointer-events': 'none'}); add('pointer-events-auto', {'pointer-events': 'auto'});
  for (const v of ['none', 'text', 'all', 'auto']) add(`select-${v}`, {'user-select': v});
  add('appearance-none', {appearance: 'none'}); add('resize-none', {resize: 'none'}); add('resize-y', {resize: 'vertical'});
  add('scroll-smooth', {'scroll-behavior': 'smooth'}, ['motion-safe']); add('scroll-auto', {'scroll-behavior': 'auto'});
  add('touch-manipulation', {'touch-action': 'manipulation'});
  add('border-collapse', {'border-collapse': 'collapse'}); add('table-fixed', {'table-layout': 'fixed'}); add('table-auto', {'table-layout': 'auto'});

  add('forced-color-adjust-auto', {'forced-color-adjust': 'auto'}); add('forced-color-adjust-none', {'forced-color-adjust': 'none'});
  // Bootstrap's stretched link: the whole card (nearest .relative) becomes the link's hit area.
  add('stretched-link', {});
  return u;
}

// ---------- variable utilities (andrewrico grid.css pattern, framework-wide) ----------
// One class per property reads a chain of variables, one per breakpoint, each
// falling back to the one below — exactly how grid.css picks columns. Any value,
// any breakpoint, no class per value:
//   <div class="ax--p ax--cols" style="--ax--p: 1rem; --ax--p-lg: 2rem; --ax--cols-lg: repeat(3, 1fr); --ax--cols-large: 1fr">
// --ax--KEY-large applies when the reader picks 150%+ text; --ax--KEY-hover for colours.
// Unset everywhere → revert-layer, as if the class were absent. Variables are
// registered with inherits: false, so a parent's value never leaks into a child.
export const VAR_UTILITIES = {
  p: 'padding', px: 'padding-inline', py: 'padding-block', pt: 'padding-top', pr: 'padding-right', pb: 'padding-bottom', pl: 'padding-left',
  m: 'margin', mx: 'margin-inline', my: 'margin-block', mt: 'margin-top', mb: 'margin-bottom', gap: 'gap',
  w: 'width', h: 'height', 'min-w': 'min-width', 'max-w': 'max-width', 'min-h': 'min-height',
  display: 'display', flow: 'flex-direction', wrap: 'flex-wrap', items: 'align-items', justify: 'justify-content',
  basis: 'flex-basis', grow: 'flex-grow', order: 'order', cols: 'grid-template-columns', rows: 'grid-template-rows', span: 'grid-column',
  text: 'font-size', leading: 'line-height', weight: 'font-weight', align: 'text-align',
  fg: 'color', bg: 'background-color', bd: 'border-color', radius: 'border-radius', shadow: 'box-shadow', opacity: 'opacity',
};
const HOVERABLE = new Set(['fg', 'bg', 'bd', 'shadow', 'opacity']);
const LARGE_TEXT = ':root:is([data-ax-text="150"], [data-ax-text="175"], [data-ax-text="200"]) ';

/**
 * Rules for one variable utility — every rule has one declaration. The breakpoint
 * chain resolves once into --ax--KEY-now (like grid.css's per-breakpoint rules),
 * so large-text and hover each need a single short rule.
 */
export function varUtility(key) {
  const prop = VAR_UTILITIES[key];
  const v = suffix => `--${PREFIX}--${key}${suffix}`;
  const cls = `.${PREFIX}--${key}`;
  const steps = ['', ...Object.keys(tokens.breakpoints).map(b => `-${b}`)];
  const vars = [...steps, '-now', '-large', ...(HOVERABLE.has(key) ? ['-hover'] : [])];
  const out = vars.map(suffix => ({property: `@property ${v(suffix)} { syntax: "*"; inherits: false; }`}));
  steps.forEach((suffix, i) => {
    const bp = suffix.slice(1);
    const chain = steps.slice(1, i + 1).reverse().reduceRight((fb, sf) => `var(${v(sf)}, ${fb})`, `var(${v('')})`);
    const css = `${cls} { ${v('-now')}: ${chain}; }`;
    out.push({css: bp ? `@media (min-width: ${tokens.breakpoints[bp]}) { ${css} }` : css});
  });
  out.push({css: `${cls} { ${prop}: var(${v('-now')}, revert-layer); }`});
  out.push({css: `${LARGE_TEXT}${cls} { ${prop}: var(${v('-large')}, var(${v('-now')}, revert-layer)); }`});
  if (HOVERABLE.has(key)) out.push({css: `${cls}:hover { ${prop}: var(${v('-hover')}, var(${v('-now')}, revert-layer)); }`});
  return out;
}

function varUtilitiesCss(used) {
  const keys = Object.keys(VAR_UTILITIES).filter(k => !used || used.has(`${PREFIX}--${k}`));
  const rules = keys.flatMap(varUtility);
  return {css: rules.filter(r => r.css).map(r => r.css).join('\n'), properties: rules.filter(r => r.property).map(r => r.property).join('\n')};
}

// Rules that need a pseudo-element or child selector, keyed by class name.
const SPECIAL = {
  'stretched-link': s => `${s}::after { content: ""; position: absolute; inset: 0; z-index: 1; }\n${s}:focus-visible { outline: none; }\n${s}:focus-visible::after { outline: var(--ax-a11y-focus-width) solid var(--ax-color-focus); outline-offset: var(--ax-a11y-focus-offset); }`,
};
const childSelector = name => /^space-[xy]-/.test(name); // Tailwind: applies to children after the first

function rule(name, d, variant) {
  const cls = `.${esc(variant ? `${variant}:${named(name)}` : named(name))}`;
  const target = childSelector(name) ? `${cls} > :not(:first-child)` : cls;
  if (SPECIAL[name] && !variant) return [{prefix: '', media: null, css: SPECIAL[name](cls)}];
  if (!variant) return [{prefix: '', media: null, css: `${target} { ${decls(d)} }`}];
  const v = VARIANTS[variant];
  return v.ctx.map(([prefix, media]) => {
    const sel = childSelector(name) ? `${prefix}${cls}${v.pseudo || ''} > :not(:first-child)` : `${prefix}${cls}${v.pseudo || ''}`;
    return {media, css: `${sel} { ${decls(d)} }`};
  });
}

// Content scan: every token that could be a class name in the given files.
const tokenize = (source, into = new Set()) => {
  for (const token of source.split(/[\s"'`<>={}()\[\],;]+/)) if (token) into.add(token);
  return into;
};

export async function scan(patterns, cwd = process.cwd()) {
  const used = new Set();
  for (const pattern of [].concat(patterns)) {
    for await (const file of glob(pattern, {cwd})) tokenize(await readFile(path.resolve(cwd, file), 'utf8'), used);
  }
  return used;
}

function utilitiesCss(used) {
  const keep = name => !used || used.has(name);
  // names below are unprefixed; the page uses the standard names
  const base = [];
  const byVariant = new Map(VARIANT_ORDER.map(v => [v, new Map()])); // variant → media → rules
  for (const [name, d, variants] of utilities()) {
    if (keep(named(name))) base.push(...rule(name, d).map(r => r.css));
    for (const v of variants) {
      if (!keep(`${v}:${named(name)}`)) continue;
      for (const r of rule(name, d, v)) {
        const bucket = byVariant.get(v);
        if (!bucket.has(r.media)) bucket.set(r.media, []);
        bucket.get(r.media).push(r.css);
      }
    }
  }
  const out = [base.join('\n')];
  for (const [, buckets] of byVariant) for (const [media, rules] of buckets) {
    out.push(media ? `@media ${media} {\n${rules.map(r => `  ${r}`).join('\n')}\n}` : rules.join('\n'));
  }
  return out.filter(Boolean).join('\n');
}

// ---------- atomic layer ----------
export const atomicRules = rules; // rules registered by create(), from src/atomic.js

/** Import style modules (they register rules by calling create()). */
export async function loadStyles(patterns, cwd = process.cwd()) {
  for (const pattern of [].concat(patterns || [])) {
    for await (const file of glob(pattern, {cwd})) await import(pathToFileURL(path.resolve(cwd, file)).href);
  }
}

// Pre-paint script: applies saved settings before first render so pages do not flash.
function initScript() {
  const allowed = Object.fromEntries(SETTINGS.map(s => [s.key, s.options.map(([v]) => v).filter(v => v !== s.default)]));
  return `/*! a11y-atomic init v${pkg.version} — load in <head> before CSS paints */
(function(){try{var a=${JSON.stringify(allowed)},s=JSON.parse(localStorage.getItem("a11y-atomic")||"{}"),r=document.documentElement;for(var k in a)if(a[k].indexOf(s[k])>-1)r.setAttribute("data-ax-"+k,s[k])}catch(e){}})();
`;
}

export const minify = css => css.replace(/\/\*(?!!)[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}').trim();

const layer = (name, css) => `@layer ${name} {\n${css}\n}`;

/** Build the CSS. Pass {content: globs} to keep only classes those files use. */
export async function build({content, styles, cwd} = {}) {
  await loadStyles(styles, cwd);
  const used = content ? await scan(content, cwd) : null;
  return [
    `/*! a11y-atomic v${pkg.version} | MIT | Tailwind-compatible atomic CSS on accessibility tokens */`,
    '@layer theme, base, components, atomic, utilities, a11y;',
    varUtilitiesCss(used).properties,
    layer('theme', themeCss()),
    layer('base', await read('base.css')),
    layer('components', `/* src/grid.css (andrewrico eleventy grid) with standard names */\n${standardizeGrid(await read('grid.css'))}`),
    layer('atomic', atomicRules().filter(r => r.layer === 'atomic').map(r => r.css).join('\n')),
    layer('utilities', `${utilitiesCss(used)}\n/* variable utilities */\n${varUtilitiesCss(used).css}`),
    layer('a11y', await read('modes.css')),
  ].join('\n\n') + '\n';
}

// ---------- per page: shared core + only what each page uses ----------
const LAYERS = '@layer theme, base, components, atomic, utilities, a11y;';

/** Same on every page (cache it): layer order, tokens/themes, base, widget modes. */
export async function buildCore() {
  return minify([
    `/*! a11y-atomic core v${pkg.version} | MIT */`, LAYERS,
    layer('theme', themeCss()), layer('base', await read('base.css')), layer('a11y', await read('modes.css')),
  ].join('\n')) + '\n';
}

/** Only what this page's HTML uses: grid.css if it uses the grid, used atomic and Tailwind classes. */
// CSS for a set of used class tokens: grid.css if used, atomic rules (in their
// layers, optionally renamed), readable utilities, variable utilities + registrations.
async function assembleCss(used, varKeys = [], rename = null) {
  const name = r => (rename?.has(r.className) ? r.css.split(`.${r.className}`).join(`.${rename.get(r.className)}`) : r.css);
  const atomicIn = layerName => atomicRules().filter(r => r.layer === layerName && used.has(r.className)).map(name).join('\n');
  const parts = [];
  const gridCss = [...used].some(t => t.startsWith(`${PREFIX}-grid-`)) ? standardizeGrid(await read('grid.css')) : '';
  const components = [gridCss, atomicIn('components')].filter(Boolean).join('\n');
  if (components) parts.push(layer('components', components));
  const atomic = atomicIn('atomic');
  if (atomic) parts.push(layer('atomic', atomic));
  const vu = varUtilitiesCss(used);
  const util = [utilitiesCss(used), vu.css, atomicIn('utilities')].filter(t => t.trim()).join('\n');
  if (util) parts.push(layer('utilities', util));
  const registrations = [vu.properties, ...[...varKeys].map(k => varUtility(k).filter(r => r.property).map(r => r.property).join('\n'))].filter(Boolean);
  if (registrations.length) parts.unshift([...new Set(registrations.join('\n').split('\n'))].join('\n'));
  return minify(parts.join('\n'));
}

export async function buildPage(html, {styles, cwd, compile = false} = {}) {
  await loadStyles(styles, cwd);
  const compiled = compile ? compileHtml(html) : null;
  const css = await assembleCss(tokenize(compiled ? compiled.html : html), compiled?.varKeys);
  return compiled ? {css, html: compiled.html} : css;
}

// ---------- site mode: one shared, cached stylesheet + short atomic names ----------
const CLASS_ATTR = /(<(script|style)\b[\s\S]*?<\/\2>)|\bclass="([^"]*)"/gi;
const markupClasses = html => [...html.matchAll(CLASS_ATTR)].filter(m => !m[1]).flatMap(m => m[3].split(/\s+/)).filter(Boolean);

/**
 * Facebook-style site build: compile every page, then give the most used atomic
 * classes the shortest names (ax_0, ax_1, …) and put core + every page's rules in
 * one stylesheet that browsers cache once. pages: {name: html}. Returns {css, pages}.
 */
export async function compileSite(pages, {styles, cwd} = {}) {
  await loadStyles(styles, cwd);
  const compiled = {}, used = new Set(), varKeys = new Set(), counts = new Map();
  for (const [name, html] of Object.entries(pages)) {
    const c = compileHtml(html);
    compiled[name] = c.html;
    c.varKeys.forEach(k => varKeys.add(k));
    tokenize(c.html, used);
    for (const t of markupClasses(c.html)) if (registry.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const rename = new Map();
  let n = 0;
  for (const [cls] of [...counts].sort((a, b) => b[1] - a[1])) {
    let short;
    do short = `${PREFIX}_${(n++).toString(36)}`; while (registry.has(short));
    rename.set(cls, short);
  }
  const out = {};
  for (const [name, html] of Object.entries(compiled)) {
    out[name] = html.replace(CLASS_ATTR, (m, block, tag, value) => (block ? block : `class="${value.split(/\s+/).filter(Boolean).map(t => rename.get(t) || t).join(' ')}"`));
  }
  const css = minify(`${await buildCore()}\n${await assembleCss(used, varKeys, rename)}`);
  return {css, pages: out};
}

/** Link the shared site stylesheet, replacing full-bundle / core / page-style tags. Idempotent. */
export function linkSite(html, href) {
  const cleaned = html
    .replace(/<link[^>]+href="[^"]*a11y-atomic(\.min)?\.css"[^>]*>\s*/g, '')
    .replace(/<link[^>]+data-ax-(core|site)[^>]*>(<style data-ax-page>[\s\S]*?<\/style>)?\s*/g, '');
  return cleaned.replace(/<\/head>/i, `<link rel="stylesheet" href="${href}" data-ax-site>\n</head>`);
}

/** Rewrite every built page in place and write one shared stylesheet. */
export async function buildSite(patterns, {cwd = process.cwd(), styles, out = 'css/a11y-site.css', hrefRoot = ''} = {}) {
  const files = [];
  for (const pattern of [].concat(patterns)) for await (const file of glob(pattern, {cwd})) files.push(file);
  const pages = Object.fromEntries(await Promise.all(files.map(async f => [f, await readFile(path.resolve(cwd, f), 'utf8')])));
  const site = await compileSite(pages, {styles, cwd});
  const href = `/${(hrefRoot ? path.relative(hrefRoot, out) : out).replace(/^\/+/, '')}`;
  await mkdir(path.dirname(path.resolve(cwd, out)), {recursive: true});
  await writeFile(path.resolve(cwd, out), site.css + '\n');
  for (const [f, html] of Object.entries(site.pages)) await writeFile(path.resolve(cwd, f), linkSite(html, href));
  return {css: site.css.length, pages: files.length};
}

// ---------- compile: readable classes → atomic classes (Facebook style) ----------
// Each readable framework class becomes the generated classes for its declarations
// (one declaration each). Rules keep their original layer, so the cascade is
// unchanged: grid → components, utilities → utilities. Classes that need an
// ancestor or child selector (group-*, space-x/y) cannot be atomic and stay readable.
const VARIANT_CONDITION = {
  hover: v => ({'@media (hover: hover)': {':hover': v}}),
  focus: v => ({':focus': v}), 'focus-visible': v => ({':focus-visible': v}), 'focus-within': v => ({':focus-within': v}),
  active: v => ({':active': v}), disabled: v => ({':disabled': v}),
  ...Object.fromEntries(['dark', 'contrast-more', 'motion-safe', 'motion-reduce', 'large-text', 'text-spacing', 'forced-colors', 'print', ...Object.keys(tokens.breakpoints)]
    .map(name => [name, v => ({[`@${name}`]: v})])),
};
const GRID_PARTS = {'grid-section': 'section', 'grid-title': 'title', 'grid-wrapper': 'wrapper', 'grid-row': 'row', 'grid-column': 'column'};
const STRETCHED = {
  outline: {':focus-visible': 'none'},
  '::after': {
    content: '""', position: 'absolute', inset: '0', zIndex: '1',
    outline: {':focus-visible': 'var(--ax-a11y-focus-width) solid var(--ax-color-focus)'},
    outlineOffset: {':focus-visible': 'var(--ax-a11y-focus-offset)'},
  },
};
const tokenCache = new Map();
let utilIndex = null;
let gridCompiled = null;

function varStyleDef(key) {
  const v = suffix => `--${PREFIX}--${key}${suffix}`;
  const bps = Object.keys(tokens.breakpoints);
  const now = {default: `var(${v('')})`};
  bps.forEach((bp, i) => { now[`@${bp}`] = bps.slice(0, i + 1).map(b => `-${b}`).reverse().reduceRight((fb, sf) => `var(${v(sf)}, ${fb})`, `var(${v('')})`); });
  const value = {default: `var(${v('-now')}, revert-layer)`, '@large-text': `var(${v('-large')}, var(${v('-now')}, revert-layer))`};
  if (HOVERABLE.has(key)) value[':hover'] = `var(${v('-hover')}, var(${v('-now')}, revert-layer))`;
  return {[v('-now')]: now, [VAR_UTILITIES[key]]: value};
}

/** The compiled style for one readable class, or null if it must stay readable. */
export function compileToken(token) {
  if (tokenCache.has(token)) return tokenCache.get(token);
  let style = null;
  const p = `${PREFIX}-`;
  if (token.startsWith(`${p}grid-`) && GRID_PARTS[token.slice(p.length)]) {
    gridCompiled ??= create(gridStyles, {layer: 'components'});
    style = gridCompiled[GRID_PARTS[token.slice(p.length)]];
  } else if (token.startsWith(`${PREFIX}--`) && VAR_UTILITIES[token.slice(PREFIX.length + 2)]) {
    style = create({s: varStyleDef(token.slice(PREFIX.length + 2))}, {layer: 'utilities'}).s;
  } else {
    const i = token.lastIndexOf(':');
    const variant = i < 0 ? null : token.slice(0, i);
    const name = token.slice(i + 1);
    utilIndex ??= new Map(utilities().map(([n, d, v]) => [n, {d, v}]));
    const u = name.startsWith(p) && utilIndex.get(name.slice(p.length));
    const base = name.slice(p.length);
    if (u && (!variant || (u.v.includes(variant) && VARIANT_CONDITION[variant])) && !childSelector(base)) {
      const def = base === 'stretched-link'
        ? (variant ? null : STRETCHED)
        : Object.fromEntries(Object.entries(u.d).map(([prop, value]) => [prop, variant ? VARIANT_CONDITION[variant](value) : value]));
      if (def) style = create({s: def}, {layer: 'utilities'}).s;
    }
  }
  tokenCache.set(token, style);
  return style;
}

/** Rewrite class attributes (outside <script>/<style>) to atomic classes. */
export function compileHtml(html) {
  const varKeys = new Set();
  const rewrite = value => {
    const keep = [], components = [], utilitiesStyles = [];
    for (const t of value.split(/\s+/).filter(Boolean)) {
      const style = compileToken(t);
      if (!style) { keep.push(t); continue; }
      (t.startsWith(`${PREFIX}-grid-`) ? components : utilitiesStyles).push(style);
      if (t.startsWith(`${PREFIX}--`)) varKeys.add(t.slice(PREFIX.length + 2));
    }
    // Lower layer first, then classes in order: last wins per property, like the cascade.
    return [...keep, mergeStyles(...components, ...utilitiesStyles).className].filter(Boolean).join(' ');
  };
  const out = html.replace(/(<(script|style)\b[\s\S]*?<\/\2>)|\bclass=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi,
    (m, block, tag, dq, sq, bare) => (block ? block : `class="${rewrite(dq ?? sq ?? bare)}"`));
  return {html: out, varKeys};
}

/** Put the core link and the page's own <style> in <head>, replacing any full-bundle link. Idempotent. */
export function inlinePage(html, pageCss, coreHref) {
  const head = `<link rel="stylesheet" href="${coreHref}" data-ax-core><style data-ax-page>${pageCss}</style>`;
  const cleaned = html
    .replace(/<link[^>]+href="[^"]*a11y-atomic(\.min)?\.css"[^>]*>\s*/g, '')
    .replace(/<link[^>]+data-ax-core[^>]*>(<style data-ax-page>[\s\S]*?<\/style>)?/g, '');
  return cleaned.replace(/<\/head>/i, `${head}\n</head>`);
}

/** Rewrite every built HTML page in place and write the shared core file. */
export async function buildPages(patterns, {cwd = process.cwd(), styles, core = 'css/a11y-core.css', compile = false} = {}) {
  await loadStyles(styles, cwd);
  const corePath = path.resolve(cwd, core);
  await mkdir(path.dirname(corePath), {recursive: true});
  const coreCss = await buildCore();
  await writeFile(corePath, coreCss);
  const pages = [];
  for (const pattern of [].concat(patterns)) {
    for await (const file of glob(pattern, {cwd})) {
      const full = path.resolve(cwd, file);
      const html = await readFile(full, 'utf8');
      const result = await buildPage(html, {compile});
      const [css, body] = compile ? [result.css, result.html] : [result, html];
      await writeFile(full, inlinePage(body, css, `/${core.replace(/^\/+/, '')}`));
      pages.push({file, bytes: css.length});
    }
  }
  return {core: coreCss.length, pages};
}

// Saturation filters already reach shadow content through the page; repeating them would double the effect.
const withoutSaturation = css => css.replace(/\/\* -+ Saturation[\s\S]*?(?=\/\* -+ Motion)/, '');

export async function writeDist() {
  const css = await build();
  const dist = new URL('../dist/', import.meta.url);
  await mkdir(dist, {recursive: true});
  await writeFile(new URL('a11y-atomic.css', dist), css);
  await writeFile(new URL('a11y-atomic.min.css', dist), minify(css) + '\n');
  await writeFile(new URL('a11y-init.js', dist), initScript());
  await writeFile(new URL('a11y-core.css', dist), await buildCore());
  // Base + widget modes rewritten for shadow roots (imported by src/shadow.js).
  const shadow = minify(`@layer base {\n${await read('shadow-base.css')}\n}\n@layer a11y {\n${toShadow(withoutSaturation(await read('modes.css')))}\n}`);
  await writeFile(new URL('a11y-shadow.js', dist), `// Generated by scripts/build.mjs from src/shadow-base.css + src/modes.css. Do not edit.\nexport default ${JSON.stringify(shadow)};\n`);
  return css;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = flag => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : undefined; };
  const t = performance.now();
  if (opt('--site')) {
    const out = opt('--out') || 'css/a11y-site.css';
    const r = await buildSite(opt('--site').split(','), {styles: opt('--styles')?.split(','), out});
    console.log(`${r.pages} pages compiled; one shared stylesheet ${out} ${(r.css / 1024).toFixed(1)} KB, in ${Math.round(performance.now() - t)} ms`);
  } else if (opt('--pages')) {
    const {core, pages} = await buildPages(opt('--pages').split(','), {styles: opt('--styles')?.split(','), core: opt('--core'), compile: args.includes('--compile')});
    const avg = pages.reduce((n, p) => n + p.bytes, 0) / Math.max(1, pages.length);
    console.log(`${pages.length} pages: shared core ${(core / 1024).toFixed(1)} KB + ${(avg / 1024).toFixed(1)} KB average inline per page, in ${Math.round(performance.now() - t)} ms`);
  } else if (opt('--content')) {
    const css = minify(await build({content: opt('--content').split(','), styles: opt('--styles')?.split(',')}));
    const out = opt('--out') || 'a11y-atomic.site.css';
    await writeFile(out, css + '\n');
    console.log(`${out} ${(css.length / 1024).toFixed(1)} KB in ${Math.round(performance.now() - t)} ms`);
  } else {
    const css = await writeDist();
    console.log(`dist/a11y-atomic.css ${(css.length / 1024).toFixed(1)} KB, ${utilities().length} utilities, in ${Math.round(performance.now() - t)} ms`);
  }
}
