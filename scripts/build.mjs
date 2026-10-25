// Builds dist/a11y-atomic.css (+ .min.css) and dist/a11y-init.js from src/.
// Order matters: tokens → modes → grid → grid helpers → atomics → widget,
// so atomic classes win over grid defaults at equal specificity.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import * as tokens from '../src/tokens.mjs';
import {SETTINGS} from '../src/widget.js';

const read = file => readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

export const BREAKPOINTS = {md: '1024px', lg: '1440px'}; // same breakpoints as grid.css

const esc = name => name.replace(/[:/.%]/g, ch => `\\${ch}`);
const decls = obj => Object.entries(obj).map(([k, v]) => `${k}: ${v};`).join(' ');
const vars = obj => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');
const colorVars = palette => vars(Object.fromEntries(Object.entries(palette).map(([k, v]) => [`color-${k}`, v])));

// ---------- Tokens + colour themes ----------
function tokenCss() {
  const {a11y, space, text, radius, shadow, duration, themes} = tokens;
  const scale = {
    ...Object.fromEntries(Object.entries(space).map(([k, v]) => [`space-${k}`, v])),
    ...Object.fromEntries(Object.entries(text).map(([k, [size]]) => [`text-${k}`, size])),
    ...Object.fromEntries(Object.entries(radius).map(([k, v]) => [`radius-${k}`, v])),
    ...Object.fromEntries(Object.entries(shadow).map(([k, v]) => [`shadow-${k}`, v])),
    ...Object.fromEntries(Object.entries(duration).map(([k, v]) => [`duration-${k}`, `calc(${v} * var(--a11y-motion))`])),
    'measure': '70ch',
  };
  const theme = (selector, name, scheme) => `${selector} {\n  color-scheme: ${scheme};\n${colorVars(themes[name])}\n}`;
  const darkMq = '(prefers-color-scheme: dark)';
  const moreMq = '(prefers-contrast: more)';
  // Every way "dark" and "high contrast" can be switched on: explicit attribute, or OS preference without an opposing attribute.
  const dark = [['[data-a11y-theme="dark"]'], [':not([data-a11y-theme="light"])', darkMq]];
  const high = [['[data-a11y-contrast="high"]'], [':not([data-a11y-contrast="normal"])', moreMq]];
  const wrap = (mqs, css) => (mqs.length ? `@media ${mqs.join(' and ')} {\n${css}\n}` : css);
  const out = [`:root {\n${vars(a11y)}\n${vars(scale)}\n}`, theme(':root', 'light', 'light')];
  for (const [sel, mq] of dark) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'dark', 'dark')));
  for (const [sel, mq] of high) out.push(wrap(mq ? [mq] : [], theme(`:root${sel}`, 'high-light', 'light')));
  for (const [hs, hm] of high) for (const [ds, dm] of dark) {
    out.push(wrap([hm, dm].filter(Boolean), theme(`:root${hs}${ds}`, 'high-dark', 'dark')));
  }
  return out.join('\n\n');
}

// ---------- Grid helpers (drive the variables grid.css already reads) ----------
function gridHelpers() {
  const out = [];
  const cols = n => `repeat(${n}, minmax(0, 1fr))`;
  for (let n = 1; n <= 12; n++) {
    out.push(`.cols-${n} { --column-count: ${cols(n)}; }`);
    out.push(`.cols-m-${n} { --column-mobile: ${cols(n)}; }`);
    out.push(`.cols-t-${n} { --column-table: ${cols(n)}; }`);
    out.push(`.cols-l-${n} { --column-laptop: ${cols(n)}; }`);
    out.push(`.cols-d-${n} { --column-desktop: ${cols(n)}; }`);
    out.push(`.span-${n} { grid-column: span ${n} / span ${n}; }`);
    out.push(`.row-span-${n} { grid-row: span ${n} / span ${n}; }`);
  }
  out.push('.span-full { grid-column: 1 / -1; }');
  // Spans above 1 create implicit tracks on the 1-column mobile grid, so offer md:/lg: variants.
  for (const [bp, min] of Object.entries(BREAKPOINTS)) {
    const rules = [];
    for (let n = 1; n <= 12; n++) rules.push(`  .${bp}\\:span-${n} { grid-column: span ${n} / span ${n}; }`);
    rules.push(`  .${bp}\\:span-full { grid-column: 1 / -1; }`);
    out.push(`@media (min-width: ${min}) {\n${rules.join('\n')}\n}`);
  }
  out.push('.cols-auto { --column-count: repeat(auto-fit, minmax(min(100%, var(--min-column, 16rem)), 1fr)); --column-mobile: var(--column-count); }');
  out.push('.mobile-first { --mobile-column-first: -1; }');
  for (const k of Object.keys(tokens.space)) out.push(`.grid-gap-${k} { --gap: var(--space-${k}); }`);
  for (const k of ['transparent', 'bg', 'surface', 'surface-2', 'primary']) {
    out.push(`.section-${k} { --background: ${k === 'transparent' ? 'transparent' : `var(--color-${k})`}; }`);
  }
  return out.join('\n');
}

// ---------- Atomic utilities ----------
// Each entry: [className, declarations, responsive?]
function atomics() {
  const u = [];
  const add = (name, d, responsive = false) => u.push([name, d, responsive]);
  const {space, text, radius, shadow, themes} = tokens;
  const colors = Object.keys(themes.light);

  for (const [n, v] of [['block', 'block'], ['inline-block', 'inline-block'], ['inline', 'inline'], ['flex', 'flex'], ['inline-flex', 'inline-flex'], ['grid', 'grid'], ['contents', 'contents'], ['hidden', 'none']]) add(n, {display: v}, true);

  for (const [n, v] of [['row', 'row'], ['col', 'column'], ['row-reverse', 'row-reverse'], ['col-reverse', 'column-reverse']]) add(`flex-${n}`, {'flex-direction': v}, true);
  add('flex-wrap', {'flex-wrap': 'wrap'}, true); add('flex-nowrap', {'flex-wrap': 'nowrap'}, true);
  add('flex-1', {flex: '1 1 0%'}); add('flex-auto', {flex: '1 1 auto'}); add('flex-none', {flex: 'none'});
  add('grow', {'flex-grow': '1'}); add('shrink-0', {'flex-shrink': '0'});
  for (const v of ['start', 'center', 'end', 'stretch', 'baseline']) add(`items-${v}`, {'align-items': ['start', 'end'].includes(v) ? `flex-${v}` : v}, true);
  for (const [n, v] of [['start', 'flex-start'], ['center', 'center'], ['end', 'flex-end'], ['between', 'space-between'], ['around', 'space-around'], ['evenly', 'space-evenly']]) add(`justify-${n}`, {'justify-content': v}, true);
  for (const v of ['start', 'center', 'end', 'stretch']) add(`self-${v}`, {'align-self': v});
  add('place-center', {'place-items': 'center'});

  const sides = {p: ['padding'], px: ['padding-inline'], py: ['padding-block'], pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'],
    m: ['margin'], mx: ['margin-inline'], my: ['margin-block'], mt: ['margin-top'], mr: ['margin-right'], mb: ['margin-bottom'], ml: ['margin-left']};
  for (const k of Object.keys(space)) {
    add(`gap-${k}`, {gap: `var(--space-${k})`}, true);
    add(`gap-x-${k}`, {'column-gap': `var(--space-${k})`});
    add(`gap-y-${k}`, {'row-gap': `var(--space-${k})`});
    for (const [p, props] of Object.entries(sides)) add(`${p}-${k}`, Object.fromEntries(props.map(prop => [prop, `var(--space-${k})`])), true);
  }
  add('mx-auto', {'margin-inline': 'auto'}, true); add('ml-auto', {'margin-left': 'auto'}); add('mr-auto', {'margin-right': 'auto'});
  add('stack', {display: 'flex', 'flex-direction': 'column', gap: 'var(--stack-gap, var(--space-4))'});
  add('cluster', {display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', gap: 'var(--cluster-gap, var(--space-3))'});

  for (const [n, v] of [['full', '100%'], ['auto', 'auto'], ['screen', '100vw'], ['fit', 'fit-content'], ['1/2', '50%'], ['1/3', '33.3333%'], ['2/3', '66.6667%'], ['1/4', '25%'], ['3/4', '75%']]) add(`w-${n}`, {width: v}, true);
  add('h-full', {height: '100%'}); add('h-auto', {height: 'auto'}); add('min-h-screen', {'min-height': '100dvh'});
  add('max-w-measure', {'max-width': 'var(--measure)'}); add('max-w-full', {'max-width': '100%'}); add('max-w-none', {'max-width': 'none'});
  for (const [n, v] of [['sm', '40rem'], ['md', '48rem'], ['lg', '64rem'], ['xl', '80rem']]) add(`max-w-${n}`, {'max-width': v});
  add('aspect-square', {'aspect-ratio': '1 / 1'}); add('aspect-video', {'aspect-ratio': '16 / 9'});

  for (const [k, [, lh]] of Object.entries(text)) add(`text-${k}`, {'font-size': `var(--text-${k})`, 'line-height': lh}, true);
  for (const v of ['left', 'center', 'right', 'start', 'end']) add(`text-${v}`, {'text-align': v}, true);
  for (const [n, v] of [['normal', 400], ['medium', 500], ['semibold', 600], ['bold', 700], ['black', 900]]) add(`font-${n}`, {'font-weight': v});
  add('font-mono', {'font-family': 'var(--a11y-font-mono)'}); add('font-body', {'font-family': 'var(--a11y-font-body)'});
  for (const [n, v] of [['tight', '1.2'], ['snug', '1.35'], ['normal', 'var(--a11y-line-height)'], ['relaxed', '1.75']]) add(`leading-${n}`, {'line-height': v});
  add('italic', {'font-style': 'italic'}); add('not-italic', {'font-style': 'normal'});
  add('uppercase', {'text-transform': 'uppercase', 'letter-spacing': 'max(0.04em, var(--a11y-letter-spacing))'}); add('normal-case', {'text-transform': 'none'});
  add('underline', {'text-decoration-line': 'underline'}); add('no-underline', {'text-decoration-line': 'none'});
  add('truncate', {overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap'});
  add('break-words', {'overflow-wrap': 'anywhere'}); add('nowrap', {'white-space': 'nowrap'});
  add('text-balance', {'text-wrap': 'balance'}); add('text-pretty', {'text-wrap': 'pretty'});
  add('list-none', {'list-style': 'none', 'padding-left': '0'});

  for (const c of colors) {
    add(`fg-${c}`, {color: `var(--color-${c})`});
    add(`bg-${c}`, {'background-color': `var(--color-${c})`});
    add(`bd-${c}`, {'border-color': `var(--color-${c})`});
  }
  add('bg-transparent', {'background-color': 'transparent'}); add('fg-inherit', {color: 'inherit'});

  add('border', {border: '1px solid var(--color-border)'}); add('border-2', {border: '2px solid var(--color-border)'});
  add('border-0', {border: '0'}); add('border-t', {'border-top': '1px solid var(--color-border)'}); add('border-b', {'border-bottom': '1px solid var(--color-border)'});
  for (const k of Object.keys(radius)) add(`rounded-${k}`, {'border-radius': `var(--radius-${k})`});
  for (const k of Object.keys(shadow)) add(`shadow-${k}`, {'box-shadow': `var(--shadow-${k})`});
  add('shadow-none', {'box-shadow': 'none'});

  for (const v of ['static', 'relative', 'absolute', 'fixed', 'sticky']) add(v, {position: v});
  add('inset-0', {inset: '0'}); add('top-0', {top: '0'}); add('right-0', {right: '0'}); add('bottom-0', {bottom: '0'}); add('left-0', {left: '0'});
  for (const z of [0, 10, 20, 50, 100]) add(`z-${z}`, {'z-index': z});
  for (const v of ['hidden', 'auto', 'visible', 'clip']) add(`overflow-${v}`, {overflow: v});
  add('overflow-x-auto', {'overflow-x': 'auto'});
  add('cursor-pointer', {cursor: 'pointer'}); add('select-none', {'user-select': 'none'});
  add('opacity-0', {opacity: '0'}); add('opacity-100', {opacity: '1'});
  add('transition', {'transition-property': 'color, background-color, border-color, box-shadow, transform, opacity', 'transition-duration': 'var(--duration-base)', 'transition-timing-function': 'cubic-bezier(.2, 0, 0, 1)'});
  add('transition-none', {transition: 'none'});

  // Accessibility primitives
  add('sr-only', {position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', 'clip-path': 'inset(50%)', 'white-space': 'nowrap', border: '0'});
  add('not-sr-only', {position: 'static', width: 'auto', height: 'auto', margin: '0', overflow: 'visible', clip: 'auto', 'clip-path': 'none', 'white-space': 'normal'});
  add('tap-target', {'min-height': 'var(--a11y-target-min)', 'min-width': 'var(--a11y-target-min)'});
  add('focus-ring', {outline: 'var(--a11y-focus-width) solid var(--color-focus)', 'outline-offset': 'var(--a11y-focus-offset)'});
  add('reading', {'max-width': 'var(--measure)', 'line-height': 'var(--a11y-line-height)'});

  const lines = [];
  const media = {md: [], lg: []};
  const hover = [];
  for (const [name, d, responsive] of u) {
    lines.push(`.${esc(name)} { ${decls(d)} }`);
    if (responsive) for (const bp of Object.keys(media)) media[bp].push(`  .${esc(`${bp}:${name}`)} { ${decls(d)} }`);
    if (/^(fg|bg|bd)-/.test(name) || ['underline', 'no-underline', 'shadow-md', 'shadow-lg'].includes(name)) hover.push(`.${esc(`hover:${name}`)}:hover { ${decls(d)} }`);
  }
  return [
    lines.join('\n'),
    hover.join('\n'),
    '.skip-link { position: absolute; left: var(--space-2); top: var(--space-2); z-index: 1000; padding: var(--space-2) var(--space-4); background: var(--color-primary); color: var(--color-on-primary); border-radius: var(--radius-md); transform: translateY(-200%); }',
    '.skip-link:focus { transform: none; }',
    '.focus-within\\:ring:focus-within { outline: var(--a11y-focus-width) solid var(--color-focus); outline-offset: var(--a11y-focus-offset); }',
    '.focus\\:not-sr-only:focus { position: static; width: auto; height: auto; margin: 0; overflow: visible; clip: auto; clip-path: none; white-space: normal; }',
    ...Object.entries(media).map(([bp, rules]) => `@media (min-width: ${BREAKPOINTS[bp]}) {\n${rules.join('\n')}\n}`),
    '@media (prefers-reduced-motion: no-preference) { .motion-safe\\:transition { transition-property: color, background-color, border-color, box-shadow, transform, opacity; transition-duration: var(--duration-base); } }',
  ].join('\n\n');
}

// Pre-paint script: applies saved settings before first render so pages do not flash.
function initScript() {
  const allowed = Object.fromEntries(SETTINGS.map(s => [s.key, s.options.map(([v]) => v).filter(v => v !== s.default)]));
  return `/*! a11y-atomic init v${pkg.version} — load in <head> before CSS paints */
(function(){try{var a=${JSON.stringify(allowed)},s=JSON.parse(localStorage.getItem("a11y-atomic")||"{}"),r=document.documentElement;for(var k in a)if(a[k].indexOf(s[k])>-1)r.setAttribute("data-a11y-"+k,s[k])}catch(e){}})();
`;
}

const minify = css => css.replace(/\/\*(?!!)[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}').trim();

export async function build() {
  const banner = `/*! a11y-atomic v${pkg.version} | MIT | atomic CSS driven by an accessibility widget */`;
  const css = [
    banner,
    '/* ===== Tokens (generated from src/tokens.mjs) ===== */', tokenCss(),
    '/* ===== Base + accessibility modes (src/modes.css) ===== */', await read('modes.css'),
    '/* ===== Grid (src/grid.css, from andrewrico eleventy) ===== */', await read('grid.css'),
    '/* ===== Grid helpers ===== */', gridHelpers(),
    '/* ===== Atomic utilities ===== */', atomics(),
    '/* ===== Widget (src/widget.css) ===== */', await read('widget.css'),
  ].join('\n\n') + '\n';
  await mkdir(new URL('../dist/', import.meta.url), {recursive: true});
  await writeFile(new URL('../dist/a11y-atomic.css', import.meta.url), css);
  await writeFile(new URL('../dist/a11y-atomic.min.css', import.meta.url), minify(css) + '\n');
  await writeFile(new URL('../dist/a11y-init.js', import.meta.url), initScript());
  return css;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = await build();
  console.log(`dist/a11y-atomic.css ${(css.length / 1024).toFixed(1)} KB`);
}
