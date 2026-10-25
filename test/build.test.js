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

test('grid.css ships with standard names only: same values, same structure', async () => {
  const {standardizeGrid, GRID_CLASSES, GRID_VARS} = await import('../src/naming.js');
  const components = css.slice(css.indexOf('@layer components {'), css.indexOf('@layer atomic {'));
  const standard = standardizeGrid(grid);
  assert.ok(components.includes(standard));
  for (const old of Object.keys(GRID_CLASSES)) assert.ok(!standard.includes(`.${old}`), old);
  for (const v of GRID_VARS) assert.ok(!new RegExp(`--${v}(?![\\w-])`).test(standard), v);
  // Renaming back gives the original declarations (only the duplicate alias selector is gone).
  const values = text => [...text.matchAll(/:\s*([^;{}]+);/g)].map(m => m[1].replace(/--ax-grid-/g, '--').trim());
  assert.deepEqual(values(standard), values(grid));
});

test('Tailwind class names and values match', () => {
  for (const rule of [
    '.ax-p-4 { padding: calc(var(--ax-spacing) * 4); }',
    '.ax-flex { display: flex; }',
    '.ax-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }',
    '.ax-col-span-full { grid-column: 1 / -1; }',
    '.ax-text-lg { font-size: var(--ax-text-lg); line-height: var(--ax-text-lg--line-height); }',
    '.ax-rounded-md { border-radius: var(--ax-radius-md); }',
    '.\\32 xl\\:ax-grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }',
    '.lg\\:ax-col-span-2 { grid-column: span 2 / span 2; }',
    '.ax-w-1\\/2 { width: 50%; }',
    '.ax-p-0\\.5 { padding: calc(var(--ax-spacing) * 0.5); }',
  ]) assert.ok(css.includes(rule), rule);
  assert.ok(css.includes('--ax-spacing: 0.25rem;'));
  const hoverBlock = css.slice(css.indexOf('@media (hover: hover) {'));
  assert.ok(hoverBlock.slice(0, hoverBlock.indexOf('\n}')).includes('.hover\\:ax-bg-primary:hover { background-color: var(--ax-color-primary); }'));
});

test('breakpoints: lg/xl/2xl are the grid.css breakpoints', () => {
  for (const [v, px] of [['lg', '1024px'], ['xl', '1268px'], ['2xl', '1440px']]) assert.equal(VARIANTS[v].ctx[0][1], `(min-width: ${px})`);
  for (const px of ['1024px', '1268px', '1440px']) assert.ok(grid.includes(px));
});

test('our own variants follow the widget and the OS', () => {
  assert.ok(css.includes(':root:is([data-ax-text="150"], [data-ax-text="175"], [data-ax-text="200"]) .large-text\\:ax-flex-col'));
  assert.ok(css.includes(':root[data-ax-contrast="high"] .contrast-more\\:ax-border-4'));
  const more = css.slice(css.indexOf('@media (prefers-contrast: more) {\n  :root:not'));
  assert.ok(more.slice(0, more.indexOf('\n}')).includes(':root:not([data-ax-contrast="normal"]) .contrast-more\\:ax-border-4'));
  assert.ok(css.includes(':root[data-ax-motion="reduce"] .motion-reduce\\:ax-transition-none'));
  assert.ok(css.includes(':root[data-ax-theme="dark"] .dark\\:ax-bg-surface'));
});

test('every colour token is a class and every theme defines it', () => {
  for (const c of Object.keys(themes.light)) {
    assert.ok(css.includes(`--ax-color-${c}:`), c);
    for (const p of ['text', 'bg', 'border']) assert.ok(names.includes(`${p}-${c}`), `${p}-${c}`);
  }
});

test('every non-default widget value has CSS that reacts to it', () => {
  const noSelector = new Set(['theme=light', 'contrast=normal', 'motion=allow']);
  const missing = [];
  for (const s of SETTINGS) for (const [value] of s.options) {
    if (value === s.default || noSelector.has(`${s.key}=${value}`)) continue;
    if (!css.includes(`[data-ax-${s.key}="${value}"]`)) missing.push(`${s.key}=${value}`);
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

test('durations are multiplied by --ax-a11y-motion', () => {
  assert.ok(css.includes('.ax-duration-300 { transition-duration: calc(300ms * var(--ax-a11y-motion)); }'));
});

test('escaping handles leading digits, dots, slashes and colons', () => {
  assert.equal(esc('2xl:p-4'), '\\32 xl\\:p-4');
  assert.equal(esc('w-1/2'), 'w-1\\/2');
  assert.equal(esc('p-0.5'), 'p-0\\.5');
});

test('content scan keeps only the classes a page uses', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-atomic-'));
  await writeFile(path.join(dir, 'page.html'), '<div class="ax-flex ax-p-4 lg:ax-grid-cols-3 hover:ax-bg-primary"></div>');
  const small = await build({content: ['*.html'], cwd: dir});
  const utilitiesLayer = small.slice(small.indexOf('@layer utilities {'), small.indexOf('@layer a11y {'));
  for (const s of ['.ax-flex {', '.ax-p-4 {', '.lg\\:ax-grid-cols-3 {', '.hover\\:ax-bg-primary:hover']) assert.ok(utilitiesLayer.includes(s), s);
  assert.ok(!utilitiesLayer.includes('.ax-p-8 {'));
  assert.ok(!utilitiesLayer.includes('.ax-grid-cols-3 {'));
  assert.ok(small.length < css.length / 5, `${small.length} vs ${css.length}`);
});

test('Eleventy plugin writes scanned CSS after a build', async () => {
  const {default: plugin} = await import('../src/eleventy.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-11ty-'));
  await writeFile(path.join(dir, 'index.html'), '<main class="ax-grid ax-grid-cols-2 ax-gap-4 ax-text-muted"></main>');
  let handler;
  plugin({on: (event, fn) => { if (event === 'eleventy.after') handler = fn; }}, {content: [path.join(dir, '*.html')], out: 'css/site.css'});
  await handler({dir: {output: dir}});
  const out = await readFile(path.join(dir, 'css/site.css'), 'utf8');
  assert.ok(out.includes('.ax-grid-cols-2{grid-template-columns:repeat(2, minmax(0, 1fr))}') || out.includes('.ax-grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}'));
  assert.ok(!out.includes('.ax-grid-cols-5{'));
});

test('per page: only the classes a page uses, grid.css only when the page uses the grid', async () => {
  const {buildPage, buildCore} = await import('../scripts/build.mjs');
  const small = await buildPage('<main class="ax-flex ax-p-4 hover:ax-bg-primary"><p class="ax-text-muted">Hi</p></main>');
  for (const s of ['.ax-flex{', '.ax-p-4{', '.hover\\:ax-bg-primary:hover', '.ax-text-muted{']) assert.ok(small.includes(s), s);
  assert.ok(!small.includes('.ax-p-8{'));
  assert.ok(!small.includes('ax-grid-wrapper'), 'no grid.css without grid classes');
  assert.ok(!small.includes('@layer atomic'), 'no atomic rules without atomic classes');
  assert.ok(small.length < 1500, `${small.length} bytes`);
  const withGrid = await buildPage('<div class="ax-grid-wrapper"></div>');
  assert.ok(withGrid.includes('.ax-grid-wrapper{'));
  const core = await buildCore();
  assert.ok(core.startsWith('/*! a11y-atomic core') && core.includes('@layer theme,base,components,atomic,utilities,a11y'));
  assert.ok(!core.includes('.ax-flex{'), 'core has no utilities');
});

test('per page: atomic classes found in the HTML bring only their own rules', async () => {
  const {buildPage, atomicRules} = await import('../scripts/build.mjs');
  const [one, two] = atomicRules();
  const page = await buildPage(`<div class="${one.className}"></div>`);
  assert.ok(page.includes(`.${one.className}`));
  assert.ok(!page.includes(`.${two.className}{`));
});

test('inlinePage swaps the full bundle for core + page style, and is idempotent', async () => {
  const {inlinePage} = await import('../scripts/build.mjs');
  const html = '<html><head><link rel="stylesheet" href="dist/a11y-atomic.css"></head><body></body></html>';
  const once = inlinePage(html, '.ax-flex{display:flex}', '/css/a11y-core.css');
  assert.ok(!once.includes('a11y-atomic.css'));
  assert.ok(once.includes('<link rel="stylesheet" href="/css/a11y-core.css" data-ax-core><style data-ax-page>.ax-flex{display:flex}</style>'));
  const twice = inlinePage(once, '.ax-block{display:block}', '/css/a11y-core.css');
  assert.equal(twice.match(/data-ax-page/g).length, 1);
  assert.ok(twice.includes('.ax-block{display:block}') && !twice.includes('.ax-flex{display:flex}'));
});

test('buildPages rewrites each page with its own CSS', async () => {
  const {buildPages} = await import('../scripts/build.mjs');
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-pages-'));
  await writeFile(path.join(dir, 'a.html'), '<html><head></head><body class="ax-flex"></body></html>');
  await writeFile(path.join(dir, 'b.html'), '<html><head></head><body class="ax-grid ax-grid-cols-3"></body></html>');
  const result = await buildPages(['*.html'], {cwd: dir});
  const a = await readFile(path.join(dir, 'a.html'), 'utf8');
  const b = await readFile(path.join(dir, 'b.html'), 'utf8');
  // compiled by default: markup has atomic classes; each page only has its own rules
  assert.match(a, /<body class="ax_[0-9a-z]+">/);
  assert.ok(a.includes('{display:flex}') && !a.includes('repeat(3,'));
  assert.ok(b.includes('repeat(3, minmax(0, 1fr))') || b.includes('repeat(3,minmax(0,1fr))'));
  assert.ok(!b.includes('{display:flex}'));
  await writeFile(path.join(dir, 'c.html'), '<html><head></head><body class="ax-flex"></body></html>');
  await buildPages(['c.html'], {cwd: dir, compile: false});
  assert.ok((await readFile(path.join(dir, 'c.html'), 'utf8')).includes('.ax-flex{'), 'compile: false keeps readable classes');
  assert.ok((await readFile(path.join(dir, 'css/a11y-core.css'), 'utf8')).includes('--ax-color-text'));
  assert.equal(result.pages.length, 2);
});

test('Eleventy perPage transform inlines each page and writes the core', async () => {
  const {default: plugin} = await import('../src/eleventy.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'a11y-11ty-pp-'));
  let transform, after;
  plugin({addTransform: (name, fn) => { transform = fn; }, on: (e, fn) => { if (e === 'eleventy.after') after = fn; }}, {perPage: true});
  const out = await transform.call({page: {outputPath: path.join(dir, 'index.html')}}, '<html><head></head><body class="ax-p-2"></body></html>');
  assert.ok(/class="ax_[0-9a-z]+"/.test(out) && out.includes('padding:calc(var(--ax-spacing) * 2)') && out.includes('href="/css/a11y-core.css"'));
  assert.equal(await transform.call({page: {outputPath: 'feed.xml'}}, '<rss/>'), '<rss/>');
  await after({dir: {output: dir}});
  assert.ok((await readFile(path.join(dir, 'css/a11y-core.css'), 'utf8')).length > 1000);
});

test('shadow DOM: document selectors are rewritten for :host', async () => {
  const {shadowSelector, toShadow} = await import('../src/shadow-css.js');
  assert.equal(shadowSelector(':root[data-ax-theme="dark"] .x1'), ':host([data-ax-theme="dark"]) .x1');
  assert.equal(shadowSelector(':root:not([data-ax-motion="allow"]) *'), ':host(:not([data-ax-motion="allow"])) *');
  assert.equal(shadowSelector('[data-ax-spacing="on"] body *'), ':host([data-ax-spacing="on"]) *');
  assert.equal(shadowSelector(':is([data-ax-font="readable"], [data-ax-font="dyslexic"]) body p'), ':host(:is([data-ax-font="readable"], [data-ax-font="dyslexic"])) p');
  assert.equal(shadowSelector('.x1:hover'), '.x1:hover');
  assert.equal(toShadow('@media print { [data-ax-links="underline"] a, .y { color: red; } }'), '@media print { :host([data-ax-links="underline"]) a, .y { color: red; } }');
  const generated = (await import('../dist/a11y-shadow.js')).default;
  assert.ok(generated.includes(':host([data-ax-spacing="on"]) *') && !generated.includes('saturation') && !generated.includes(':root'));
});

test('variable utilities: one declaration per rule, breakpoint chains, registered non-inheriting variables', async () => {
  const {varUtility, VAR_UTILITIES} = await import('../scripts/build.mjs');
  for (const key of Object.keys(VAR_UTILITIES)) {
    const rules = varUtility(key);
    for (const r of rules.filter(x => x.css)) assert.equal((r.css.match(/;/g) || []).length, 1, r.css);
    assert.ok(rules.some(r => r.property === `@property --ax--${key} { syntax: "*"; inherits: false; }`));
  }
  const p = varUtility('p').map(r => r.css).filter(Boolean);
  assert.ok(p.includes('.ax--p { padding: var(--ax--p-now, revert-layer); }'));
  assert.ok(p.includes('.ax--p { --ax--p-now: var(--ax--p); }'));
  assert.ok(p.includes('@media (min-width: 1024px) { .ax--p { --ax--p-now: var(--ax--p-lg, var(--ax--p-md, var(--ax--p-sm, var(--ax--p)))); } }'));
  assert.ok(varUtility('bg').some(r => r.css?.includes('.ax--bg:hover')));
  const {buildPage} = await import('../scripts/build.mjs');
  const page = await buildPage('<div class="ax--p"></div>');
  assert.ok(page.includes('@property --ax--p{') || page.includes('@property --ax--p {'));
  assert.ok(!page.includes('--ax--cols'), 'unused variable utilities are left out');
});

test('compile: readable classes become one-declaration atomic classes, layers preserved', async () => {
  const {compileHtml, compileToken, buildPage, atomicRules} = await import('../scripts/build.mjs');
  const lg = compileToken('ax-text-lg');
  assert.equal(Object.keys(lg).length, 2, 'ax-text-lg = font-size + line-height → 2 atomic classes');
  const rules = {get: cls => atomicRules().find(r => r.className === cls)};
  for (const cls of Object.values(lg)) {
    assert.match(cls, /^ax_[0-9a-z]+$/);
    assert.equal(rules.get(cls).layer, 'utilities');
    assert.equal((rules.get(cls).css.match(/;/g) || []).length, 1);
  }
  const hover = rules.get(Object.values(compileToken('hover:ax-bg-primary'))[0]).css;
  assert.match(hover, /^@media \(hover: hover\) \{ \.ax_[0-9a-z]+:hover \{ background-color: var\(--ax-color-primary\); \} \}$/);
  assert.equal(rules.get(Object.values(compileToken('ax-grid-wrapper'))[0]).layer, 'components');
  assert.equal(compileToken('group-hover:ax-block'), null, 'needs an ancestor selector: stays readable');
  assert.equal(compileToken('ax-space-y-4'), null, 'needs a child selector: stays readable');
  assert.equal(compileToken('my-own-class'), null);

  const {html} = compileHtml('<div class="my-own-class ax-p-2 ax-p-4"></div><script>x = "ax-flex"</script>');
  const tokens = html.match(/class="([^"]*)"/)[1].split(' ');
  assert.equal(tokens[0], 'my-own-class');
  assert.equal(tokens.length, 2, 'last padding wins: one class left for padding');
  assert.ok(html.includes('x = "ax-flex"'), 'scripts are untouched');

  const page = await buildPage('<p class="ax-text-muted ax--p" style="--ax--p: 1rem">Hi</p>', {compile: true});
  assert.ok(!page.html.includes('ax-text-muted') && page.html.includes('ax_'));
  assert.ok(page.css.includes('@property --ax--p{') || page.css.includes('@property --ax--p {'));
  assert.ok(page.css.includes('color:var(--ax-color-muted)'));
});
