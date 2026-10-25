import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build, utilities, esc, VARIANTS} from '../scripts/build.mjs';
import {SETTINGS} from '../src/widget.js';
import {themes} from '../src/tokens.mjs';

const css = await build();
const grid = await readFile(new URL('../src/grid.css', import.meta.url), 'utf8');
const list = utilities();
const names = list.map(([n]) => n);

test('layers: Tailwind v4 names, atomic before utilities, a11y last', () => {
  assert.ok(css.includes('@layer theme, base, components, atomic, utilities, a11y;'));
  const order = ['theme', 'base', 'components', 'atomic', 'utilities', 'a11y'].map(l => css.indexOf(`@layer ${l} {`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('grid.css ships unchanged in the components layer', () => {
  const components = css.slice(css.indexOf('@layer components {'), css.indexOf('@layer atomic {'));
  assert.ok(components.includes(grid));
});

test('Tailwind class names and values match', () => {
  for (const rule of [
    '.p-4 { padding: calc(var(--spacing) * 4); }',
    '.flex { display: flex; }',
    '.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }',
    '.col-span-full { grid-column: 1 / -1; }',
    '.text-lg { font-size: var(--text-lg); line-height: var(--text-lg--line-height); }',
    '.rounded-md { border-radius: var(--radius-md); }',
    '.\\32 xl\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }',
    '.lg\\:col-span-2 { grid-column: span 2 / span 2; }',
    '.w-1\\/2 { width: 50%; }',
    '.p-0\\.5 { padding: calc(var(--spacing) * 0.5); }',
  ]) assert.ok(css.includes(rule), rule);
  assert.ok(css.includes('--spacing: 0.25rem;'));
  const hoverBlock = css.slice(css.indexOf('@media (hover: hover) {'));
  assert.ok(hoverBlock.slice(0, hoverBlock.indexOf('\n}')).includes('.hover\\:bg-primary:hover { background-color: var(--color-primary); }'));
});

test('breakpoints: lg/xl/2xl are the grid.css breakpoints', () => {
  for (const [v, px] of [['lg', '1024px'], ['xl', '1268px'], ['2xl', '1440px']]) assert.equal(VARIANTS[v].ctx[0][1], `(min-width: ${px})`);
  for (const px of ['1024px', '1268px', '1440px']) assert.ok(grid.includes(px));
});

test('our own variants follow the widget and the OS', () => {
  assert.ok(css.includes(':root:is([data-a11y-text="150"], [data-a11y-text="175"], [data-a11y-text="200"]) .large-text\\:flex-col'));
  assert.ok(css.includes(':root[data-a11y-contrast="high"] .contrast-more\\:border-4'));
  const more = css.slice(css.indexOf('@media (prefers-contrast: more) {\n  :root:not'));
  assert.ok(more.slice(0, more.indexOf('\n}')).includes(':root:not([data-a11y-contrast="normal"]) .contrast-more\\:border-4'));
  assert.ok(css.includes(':root[data-a11y-motion="reduce"] .motion-reduce\\:transition-none'));
  assert.ok(css.includes(':root[data-a11y-theme="dark"] .dark\\:bg-surface'));
});

test('every colour token is a class and every theme defines it', () => {
  for (const c of Object.keys(themes.light)) {
    assert.ok(css.includes(`--color-${c}:`), c);
    for (const p of ['text', 'bg', 'border']) assert.ok(names.includes(`${p}-${c}`), `${p}-${c}`);
  }
});

test('every non-default widget value has CSS that reacts to it', () => {
  const noSelector = new Set(['theme=light', 'contrast=normal', 'motion=allow']);
  const missing = [];
  for (const s of SETTINGS) for (const [value] of s.options) {
    if (value === s.default || noSelector.has(`${s.key}=${value}`)) continue;
    if (!css.includes(`[data-a11y-${s.key}="${value}"]`)) missing.push(`${s.key}=${value}`);
  }
  assert.deepEqual(missing, []);
});

test('class names are unique', () => {
  assert.equal(new Set(names).size, names.length);
});

test('one property per class, except the multi-property utilities Tailwind also has', () => {
  const allowed = /^(text-(xs|sm|base|lg|[2-9]?xl)|sr-only|not-sr-only|truncate|transition(-.+)?|size-.+|rounded-[tblr](-.+)?|stretched-link)$/;
  const multi = list.filter(([n, d]) => Object.keys(d).length > 1 && !allowed.test(n)).map(([n]) => n);
  assert.deepEqual(multi, []);
});

test('durations are multiplied by --a11y-motion', () => {
  assert.ok(css.includes('.duration-300 { transition-duration: calc(300ms * var(--a11y-motion)); }'));
});

test('escaping handles leading digits, dots, slashes and colons', () => {
  assert.equal(esc('2xl:p-4'), '\\32 xl\\:p-4');
  assert.equal(esc('w-1/2'), 'w-1\\/2');
  assert.equal(esc('p-0.5'), 'p-0\\.5');
});

test('content scan keeps only the classes a page uses', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-atomic-'));
  await writeFile(path.join(dir, 'page.html'), '<div class="flex p-4 lg:grid-cols-3 hover:bg-primary"></div>');
  const small = await build({content: ['*.html'], cwd: dir});
  const utilitiesLayer = small.slice(small.indexOf('@layer utilities {'), small.indexOf('@layer a11y {'));
  for (const s of ['.flex {', '.p-4 {', '.lg\\:grid-cols-3 {', '.hover\\:bg-primary:hover']) assert.ok(utilitiesLayer.includes(s), s);
  assert.ok(!utilitiesLayer.includes('.p-8 {'));
  assert.ok(!utilitiesLayer.includes('.grid-cols-3 {'));
  assert.ok(small.length < css.length / 5, `${small.length} vs ${css.length}`);
});

test('Eleventy plugin writes scanned CSS after a build', async () => {
  const {default: plugin} = await import('../src/eleventy.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-11ty-'));
  await writeFile(path.join(dir, 'index.html'), '<main class="grid grid-cols-2 gap-4 text-muted"></main>');
  let handler;
  plugin({on: (event, fn) => { if (event === 'eleventy.after') handler = fn; }}, {content: [path.join(dir, '*.html')], out: 'css/site.css'});
  await handler({dir: {output: dir}});
  const out = await readFile(path.join(dir, 'css/site.css'), 'utf8');
  assert.ok(out.includes('.grid-cols-2{grid-template-columns:repeat(2, minmax(0, 1fr))}') || out.includes('.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}'));
  assert.ok(!out.includes('.grid-cols-5{'));
});
