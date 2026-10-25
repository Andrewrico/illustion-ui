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
import {registry, isShorthand} from '../src/atomic.js';
import '../src/grid.styles.js';

const read = file => readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// ---------- helpers ----------
export const esc = name => name
  .replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`)
  .replace(/^(\d)/, d => `\\3${d} `);
const decls = d => Object.entries(d).map(([k, v]) => `${k}: ${v};`).join(' ');
const vars = (obj, prefix = '') => Object.entries(obj).map(([k, v]) => `  --${prefix}${k}: ${v};`).join('\n');
const key = k => (k === 'DEFAULT' ? '' : `-${k}`);
const step = s => (s === 'px' ? '1px' : s === '0' ? '0' : `calc(var(--spacing) * ${s})`);

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
    ...Object.fromEntries(Object.entries(duration).map(([k, v]) => [`duration-${k}`, `calc(${v} * var(--a11y-motion))`])),
    ...Object.fromEntries(Object.entries(ease).map(([k, v]) => [`ease-${k}`, v])),
    ...Object.fromEntries(Object.entries(fluid).map(([k, v]) => [`space-fluid-${k}`, fluidVar(v)])),
    measure: '70ch',
  };
  const theme = (selector, name, scheme) => `${selector} {\n  color-scheme: ${scheme};\n${vars(themes[name], 'color-')}\n}`;
  const wrap = (mqs, css) => (mqs.length ? `@media ${mqs.join(' and ')} {\n${css}\n}` : css);
  // Each way "dark" / "high contrast" turns on: widget attribute, or OS preference not overridden.
  const dark = [['[data-a11y-theme="dark"]'], [':not([data-a11y-theme="light"])', '(prefers-color-scheme: dark)']];
  const high = [['[data-a11y-contrast="high"]'], [':not([data-a11y-contrast="normal"])', '(prefers-contrast: more)']];
  const out = [`:root {\n${vars(root)}\n}`, theme(':root', 'light', 'light')];
  for (const [sel, mq] of dark) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'dark', 'dark')));
  for (const [sel, mq] of high) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'high-light', 'light')));
  for (const [hs, hm] of high) for (const [ds, dm] of dark) out.push(wrap([hm, dm].filter(Boolean), theme(`:root${hs}${ds}`, 'high-dark', 'dark')));
  return out.join('\n\n');
}

// ---------- variants ----------
// Each context = [selector prefix, media query]; pseudo is appended to the class.
const bp = Object.entries(tokens.breakpoints);
export const VARIANTS = {
  hover: {pseudo: ':hover', ctx: [['', '(hover: hover)']]},
  focus: {pseudo: ':focus', ctx: [['']]},
  'focus-visible': {pseudo: ':focus-visible', ctx: [['']]},
  'focus-within': {pseudo: ':focus-within', ctx: [['']]},
  active: {pseudo: ':active', ctx: [['']]},
  disabled: {pseudo: ':disabled', ctx: [['']]},
  'group-hover': {ctx: [['.group:hover ', '(hover: hover)']]},
  'group-focus-within': {ctx: [['.group:focus-within ']]},
  // Our own field: variants follow the widget AND the OS, like the tokens do.
  dark: {ctx: [[':root[data-a11y-theme="dark"] '], [':root:not([data-a11y-theme="light"]) ', '(prefers-color-scheme: dark)']]},
  'contrast-more': {ctx: [[':root[data-a11y-contrast="high"] '], [':root:not([data-a11y-contrast="normal"]) ', '(prefers-contrast: more)']]},
  'motion-safe': {ctx: [[':root[data-a11y-motion="allow"] '], [':root:not([data-a11y-motion="reduce"]) ', '(prefers-reduced-motion: no-preference)']]},
  'motion-reduce': {ctx: [[':root[data-a11y-motion="reduce"] '], [':root:not([data-a11y-motion="allow"]) ', '(prefers-reduced-motion: reduce)']]},
  'large-text': {ctx: [[':root:is([data-a11y-text="150"], [data-a11y-text="175"], [data-a11y-text="200"]) ']]},
  'text-spacing': {ctx: [[':root[data-a11y-spacing="on"] ']]},
  'forced-colors': {ctx: [['', '(forced-colors: active)']]},
  print: {ctx: [['', 'print']]},
  ...Object.fromEntries(bp.map(([name, min]) => [name, {ctx: [['', `(min-width: ${min})`]]}])),
};
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
  add('basis-switch', {'flex-basis': 'calc((var(--switch-at, 30rem) - 100%) * 999)'});
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
  add('grid-cols-auto', {'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, var(--min-col, 16rem)), 1fr))'}, LAYOUT);
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
  for (const k of Object.keys(fluid)) for (const n of ['p', 'px', 'py', 'pt', 'pb', 'm', 'my', 'mt', 'mb', 'gap']) add(`${n}-fluid-${k}`, {[n === 'gap' ? 'gap' : sides[n]]: `var(--space-fluid-${k})`});

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
  add('min-h-target', {'min-height': 'var(--a11y-target-min)'}); add('min-w-target', {'min-width': 'var(--a11y-target-min)'});
  add('size-target', {width: 'var(--a11y-target-min)', height: 'var(--a11y-target-min)'});

  // Typography
  add('font-sans', {'font-family': 'var(--a11y-font-body)'}); add('font-mono', {'font-family': 'var(--a11y-font-mono)'});
  for (const k of Object.keys(text)) add(`text-${k}`, {'font-size': `var(--text-${k})`, 'line-height': `var(--text-${k}--line-height)`}, LAYOUT);
  for (const [n, w] of [['thin', 100], ['extralight', 200], ['light', 300], ['normal', 400], ['medium', 500], ['semibold', 600], ['bold', 700], ['extrabold', 800], ['black', 900]]) add(`font-${n}`, {'font-weight': w}, ['contrast-more']);
  add('italic', {'font-style': 'italic'}); add('not-italic', {'font-style': 'normal'});
  // Tracking never drops below the widget's letter spacing (WCAG 1.4.12).
  for (const [n, v] of [['tighter', '-0.05em'], ['tight', '-0.025em'], ['normal', '0em'], ['wide', '0.025em'], ['wider', '0.05em'], ['widest', '0.1em']]) add(`tracking-${n}`, {'letter-spacing': `max(${v}, var(--a11y-letter-spacing))`});
  for (const [n, v] of [['none', '1'], ['tight', '1.25'], ['snug', '1.375'], ['normal', 'var(--a11y-line-height)'], ['relaxed', '1.625'], ['loose', '2']]) add(`leading-${n}`, {'line-height': v});
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
    add(`text-${c}`, {color: `var(--color-${c})`}, COLOR_V);
    add(`bg-${c}`, {'background-color': `var(--color-${c})`}, COLOR_V);
    add(`border-${c}`, {'border-color': `var(--color-${c})`}, COLOR_V);
    add(`outline-${c}`, {'outline-color': `var(--color-${c})`}, ['focus', 'focus-visible']);
    add(`decoration-${c}`, {'text-decoration-color': `var(--color-${c})`});
    add(`fill-${c}`, {fill: `var(--color-${c})`}); add(`stroke-${c}`, {stroke: `var(--color-${c})`});
    add(`accent-${c}`, {'accent-color': `var(--color-${c})`}); add(`caret-${c}`, {'caret-color': `var(--color-${c})`});
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
    add(`rounded${key(k)}`, {'border-radius': `var(--radius${key(k)})`}, ['focus']);
    for (const [s, ps] of [['t', ['top-left', 'top-right']], ['b', ['bottom-left', 'bottom-right']], ['l', ['top-left', 'bottom-left']], ['r', ['top-right', 'bottom-right']]]) {
      add(`rounded-${s}${key(k)}`, Object.fromEntries(ps.map(p => [`border-${p}-radius`, `var(--radius${key(k)})`])));
    }
  }
  add('outline-none', {outline: '2px solid transparent'}); add('outline-hidden', {'outline-style': 'none'});
  for (const n of ['0', '1', '2', '4', '8']) {
    add(`outline-${n}`, {'outline-width': `${n}px`}, ['focus', 'focus-visible']);
    add(`outline-offset-${n}`, {'outline-offset': `${n}px`}, ['focus', 'focus-visible']);
  }
  add('outline', {'outline-style': 'solid'}, ['focus', 'focus-visible']); add('outline-dashed', {'outline-style': 'dashed'});
  // Our own field: the focus ring follows the widget's focus width and colour.
  add('outline-focus-ring', {outline: 'var(--a11y-focus-width) solid var(--color-focus)'}, ['focus', 'focus-visible', 'focus-within']);

  // Effects
  for (const k of Object.keys(shadow)) add(`shadow${key(k)}`, {'box-shadow': `var(--shadow${key(k)})`}, ['hover', 'focus-visible', 'group-hover', 'contrast-more']);
  for (const n of ['0', '5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '95', '100']) add(`opacity-${n}`, {opacity: `${n / 100}`}, [...STATES, 'motion-reduce']);
  // Material state layer, as one declaration per state: a currentColor wash over any background.
  const wash = pct => `linear-gradient(color-mix(in srgb, currentColor ${pct}%, transparent) 0 0)`;
  for (const n of ['8', '12', '16']) add(`wash-${n}`, {'background-image': wash(n)}, ['hover', 'focus-visible', 'active', 'group-hover']);

  // Transitions & animation — every duration is multiplied by --a11y-motion.
  const props = {DEFAULT: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate', all: 'all', colors: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke', opacity: 'opacity', shadow: 'box-shadow', transform: 'transform, translate, scale, rotate'};
  for (const [k, v] of Object.entries(props)) add(`transition${key(k)}`, {'transition-property': v, 'transition-timing-function': 'var(--ease-in-out)', 'transition-duration': 'calc(150ms * var(--a11y-motion))'}, ['motion-safe']);
  add('transition-none', {'transition-property': 'none'}, ['motion-reduce']);
  for (const n of ['0', '75', '100', '150', '200', '300', '500', '700', '1000']) add(`duration-${n}`, {'transition-duration': `calc(${n}ms * var(--a11y-motion))`});
  for (const n of ['0', '75', '100', '150', '200', '300', '500', '700', '1000']) add(`delay-${n}`, {'transition-delay': `calc(${n}ms * var(--a11y-motion))`});
  for (const k of Object.keys(ease)) add(`ease-${k}`, {'transition-timing-function': `var(--ease-${k})`});
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

// Rules that need a pseudo-element or child selector, keyed by class name.
const SPECIAL = {
  'stretched-link': s => `${s}::after { content: ""; position: absolute; inset: 0; z-index: 1; }\n${s}:focus-visible { outline: none; }\n${s}:focus-visible::after { outline: var(--a11y-focus-width) solid var(--color-focus); outline-offset: var(--a11y-focus-offset); }`,
};
const childSelector = name => /^space-[xy]-/.test(name); // Tailwind: applies to children after the first

function rule(name, d, variant) {
  const cls = `.${esc(variant ? `${variant}:${name}` : name)}`;
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
export async function scan(patterns, cwd = process.cwd()) {
  const used = new Set();
  for (const pattern of [].concat(patterns)) {
    for await (const file of glob(pattern, {cwd})) {
      const source = await readFile(path.resolve(cwd, file), 'utf8');
      for (const token of source.split(/[\s"'`<>={}()\[\],;]+/)) if (token) used.add(token);
    }
  }
  return used;
}

function utilitiesCss(used) {
  const keep = name => !used || used.has(name);
  const base = [];
  const byVariant = new Map(VARIANT_ORDER.map(v => [v, new Map()])); // variant → media → rules
  for (const [name, d, variants] of utilities()) {
    if (keep(name)) base.push(...rule(name, d).map(r => r.css));
    for (const v of variants) {
      if (!keep(`${v}:${name}`)) continue;
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

// ---------- atomic layer (rules registered by create()) ----------
const minWidth = text => Math.max(0, ...[...String(text).matchAll(/min-width:\s*(\d+)px/g)].map(m => Number(m[1])));

/** Every registered atomic rule as {className, css, order}; one declaration each. */
export function atomicRules() {
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
(function(){try{var a=${JSON.stringify(allowed)},s=JSON.parse(localStorage.getItem("a11y-atomic")||"{}"),r=document.documentElement;for(var k in a)if(a[k].indexOf(s[k])>-1)r.setAttribute("data-a11y-"+k,s[k])}catch(e){}})();
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
    layer('theme', themeCss()),
    layer('base', await read('base.css')),
    layer('components', `/* src/grid.css — andrewrico eleventy grid, unchanged */\n${await read('grid.css')}`),
    layer('atomic', atomicRules().map(r => r.css).join('\n')),
    layer('utilities', utilitiesCss(used)),
    layer('a11y', await read('modes.css')),
  ].join('\n\n') + '\n';
}

export async function writeDist() {
  const css = await build();
  const dist = new URL('../dist/', import.meta.url);
  await mkdir(dist, {recursive: true});
  await writeFile(new URL('a11y-atomic.css', dist), css);
  await writeFile(new URL('a11y-atomic.min.css', dist), minify(css) + '\n');
  await writeFile(new URL('a11y-init.js', dist), initScript());
  return css;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = flag => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : undefined; };
  const t = performance.now();
  if (opt('--content')) {
    const css = minify(await build({content: opt('--content').split(','), styles: opt('--styles')?.split(',')}));
    const out = opt('--out') || 'a11y-atomic.site.css';
    await writeFile(out, css + '\n');
    console.log(`${out} ${(css.length / 1024).toFixed(1)} KB in ${Math.round(performance.now() - t)} ms`);
  } else {
    const css = await writeDist();
    console.log(`dist/a11y-atomic.css ${(css.length / 1024).toFixed(1)} KB, ${utilities().length} utilities, in ${Math.round(performance.now() - t)} ms`);
  }
}
