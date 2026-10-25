// Real-browser check: axe-core (WCAG 2.2 A/AA) on the demo in every theme and
// contrast mode, widget keyboard flow, persistence, 320px reflow at 200% text,
// and OS preference fallbacks. Requires dev dependencies playwright + axe-core.
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {build, minify, buildCore, buildPage, inlinePage} from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 8095);
const base = `http://127.0.0.1:${port}/`;
const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
let checks = 0;
const expect = (where, condition, message) => { checks++; if (!condition) fail(where, message); };

const server = spawn(process.execPath, ['scripts/serve.mjs'], {cwd: root, env: {...process.env, PORT: String(port)}, stdio: 'ignore'});
const browser = await chromium.launch();
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (attempt > 50) throw new Error('Server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async function open(contextOptions, where, state) {
    const context = await browser.newContext(contextOptions);
    if (state) await context.addInitScript(s => localStorage.setItem('a11y-atomic', s), JSON.stringify(state));
    const page = await context.newPage();
    page.on('pageerror', error => fail(where, error.message));
    page.on('console', message => { if (message.type() === 'error') fail(where, message.text()); });
    await page.goto(base);
    await page.waitForFunction(() => globalThis.a11yWidget);
    return {context, page};
  }

  async function axe(page, where, withPanel = false) {
    if (withPanel) await page.evaluate(() => globalThis.a11yWidget.open());
    await page.addScriptTag({content: axeSource});
    const result = await page.evaluate(() => globalThis.axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']}));
    checks++;
    for (const v of result.violations) fail(where, `axe ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`);
  }

  // 1. axe in every theme/contrast combination, panel open (so widget is audited too).
  const desktop = {viewport: {width: 1440, height: 900}};
  const combos = [
    ['light', {}, {}], ['dark-os', {colorScheme: 'dark'}, {}], ['dark-attr', {}, {theme: 'dark'}],
    ['high', {}, {contrast: 'high'}], ['high-dark', {}, {contrast: 'high', theme: 'dark'}],
    ['all-modes', {}, {text: '150', spacing: 'on', font: 'dyslexic', links: 'underline', focus: 'strong', target: 'large', align: 'left'}],
  ];
  for (const [name, ctx, state] of combos) {
    const {context, page} = await open({...desktop, ...ctx}, `axe/${name}`, state);
    await axe(page, `axe/${name}`, true);
    await context.close();
  }

  // 2. Keyboard flow + persistence.
  {
    const where = 'keyboard';
    const {context, page} = await open(desktop, where);
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => { const a = document.activeElement; return a.getAttribute('href') === '#main' && a.getBoundingClientRect().width > 50; });
    expect(where, skip, 'first Tab should reach a visible skip link');
    await page.focus('[data-ax-part="toggle"]');
    await page.keyboard.press('Enter');
    expect(where, await page.getAttribute('[data-ax-part="toggle"]', 'aria-expanded') === 'true', 'Enter should open the panel');
    expect(where, await page.evaluate(() => document.activeElement.dataset.axPart === 'title'), 'focus should move into the panel');
    await page.keyboard.press('Tab'); // close button
    await page.keyboard.press('Tab'); // first radio of "Text size" (checked one)
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    expect(where, await page.getAttribute('html', 'data-ax-text') === '130', 'arrow keys should change text size to 130');
    const status = await page.waitForFunction(() => document.querySelector('[data-ax-status]').textContent === 'Text size: 130%', null, {timeout: 2000})
      .then(() => 'Text size: 130%', () => page.textContent('[data-ax-status]'));
    expect(where, status === 'Text size: 130%', `live region should announce, got "${status}"`);
    await page.check('input[role="switch"][name="spacing"]');
    expect(where, await page.getAttribute('html', 'data-ax-spacing') === 'on', 'switch should turn spacing on');
    await page.keyboard.press('Escape');
    expect(where, await page.getAttribute('[data-ax-part="toggle"]', 'aria-expanded') === 'false', 'Escape should close');
    expect(where, await page.evaluate(() => document.activeElement.dataset.axPart === 'toggle'), 'focus should return to the toggle');
    await page.keyboard.press('Alt+Shift+KeyA');
    expect(where, await page.isVisible('[data-ax-part="panel"]'), 'Alt+Shift+A should open');
    await page.mouse.click(10, 450);
    expect(where, !(await page.isVisible('[data-ax-part="panel"]')), 'outside click should close');
    await page.reload();
    await page.waitForFunction(() => globalThis.a11yWidget);
    expect(where, await page.getAttribute('html', 'data-ax-text') === '130', 'setting should persist after reload');
    const fontPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(where, Math.abs(fontPx - 20.8) < 0.1, `root font should be 20.8px at 130%, got ${fontPx}`);
    await page.evaluate(() => globalThis.a11yWidget.reset());
    expect(where, (await page.evaluate(() => document.documentElement.getAttributeNames().filter(n => n.startsWith('data-a11y')))).length === 0, 'reset should clear every attribute');
    await context.close();
  }

  // 3. Pre-paint init applies stored state before the widget module runs.
  {
    const where = 'init';
    const context = await browser.newContext(desktop);
    await context.addInitScript(() => localStorage.setItem('a11y-atomic', JSON.stringify({contrast: 'high', text: 'x<script>'})));
    const page = await context.newPage();
    await page.route('**/src/auto.js', route => route.abort());
    await page.goto(base);
    expect(where, await page.getAttribute('html', 'data-ax-contrast') === 'high', 'init script should apply contrast before the widget loads');
    expect(where, await page.getAttribute('html', 'data-ax-text') === null, 'init script should ignore invalid values');
    const bg = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(where, bg === 'rgb(0, 0, 0)', `high contrast text should be black, got ${bg}`);
    await context.close();
  }

  // 4. Reflow (1.4.10): 320px wide at 200% text and with spacing on — no horizontal scroll.
  for (const [name, state] of [['200', {text: '200'}], ['200-spacing', {text: '200', spacing: 'on'}]]) {
    const where = `reflow/${name}`;
    const {context, page} = await open({viewport: {width: 320, height: 640}}, where, state);
    expect(where, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'horizontal scroll at 320px');
    await page.evaluate(() => globalThis.a11yWidget.open());
    const box = await page.evaluate(() => { const r = document.querySelector('[data-ax-part="panel"]').getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top}; });
    expect(where, box.left >= 0 && box.right <= 320 && box.top >= 0, `panel off-screen ${JSON.stringify(box)}`);
    await context.close();
  }

  // 5. Grid: column counts follow grid.css breakpoints.
  for (const [width, expected] of [[390, 1], [1100, 2], [1300, 3], [1500, 4]]) {
    const where = `grid/${width}`;
    const {context, page} = await open({viewport: {width, height: 900}}, where);
    const count = await page.evaluate(() => getComputedStyle(document.querySelector('#grid .ax-grid-wrapper')).gridTemplateColumns.split(' ').length);
    expect(where, count === expected, `expected ${expected} columns, got ${count}`);
    await context.close();
  }

  // 6. OS reduced motion zeroes durations unless the user allows motion.
  for (const [name, state, expected] of [['os-reduce', {}, '0'], ['os-reduce-allow', {motion: 'allow'}, '1'], ['widget-reduce', {motion: 'reduce'}, '0']]) {
    const where = `motion/${name}`;
    const {context, page} = await open({...desktop, reducedMotion: name.startsWith('os') ? 'reduce' : 'no-preference'}, where, state);
    const value = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ax-a11y-motion').trim());
    expect(where, value === expected, `--ax-a11y-motion should be ${expected}, got ${value}`);
    await context.close();
  }

  // 7. OS "more contrast" applies the high-contrast palette unless the user picks Standard.
  for (const [name, state, expected] of [['os-more', {}, 'rgb(0, 0, 0)'], ['os-more-normal', {contrast: 'normal'}, 'rgb(22, 25, 29)']]) {
    const where = `contrast/${name}`;
    const {context, page} = await open({...desktop, contrast: 'more'}, where, state);
    const color = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(where, color === expected, `body color should be ${expected}, got ${color}`);
    await context.close();
  }
  // 8. Our own variants + borrowed layouts react to the widget.
  {
    const where = 'variants';
    const {context, page} = await open(desktop, where, {text: '200'});
    const nav = await page.evaluate(() => getComputedStyle(document.querySelector('nav')).flexDirection);
    expect(where, nav === 'column', `large-text:flex-col should stack the nav, got ${nav}`);
    const tops = await page.evaluate(() => [...document.querySelectorAll('.ax-basis-switch')].map(el => Math.round(el.getBoundingClientRect().top)));
    expect(where, new Set(tops).size === tops.length, `switcher should stack at 200% text, tops ${tops}`);
    await context.close();
    const normal = await open(desktop, `${where}/100`);
    const tops100 = await normal.page.evaluate(() => [...document.querySelectorAll('.ax-basis-switch')].map(el => Math.round(el.getBoundingClientRect().top)));
    expect(where, new Set(tops100).size === 1, `switcher should be one row at 100%, tops ${tops100}`);
    const card = await normal.page.evaluate(() => { const a = document.querySelector('.ax-stretched-link'); a.closest('article').scrollIntoView({block: 'center', behavior: 'instant'}); const r = a.closest('article').getBoundingClientRect(); const hit = document.elementFromPoint(r.right - 10, r.bottom - 10); return hit === a; });
    expect(where, card, 'stretched link should cover the card corner');
    const border = await normal.page.evaluate(() => { const c = getComputedStyle(document.querySelector('#lineage article')); return `${c.borderTopStyle} ${c.borderTopWidth}`; });
    expect(where, border === 'solid 1px', `.border should draw a 1px solid border, got ${border}`);
    await normal.context.close();
  }

  // 9. Content scan: the page with only its used classes renders identically.
  {
    const where = 'content-scan';
    const t = performance.now();
    const small = minify(await build({content: ['index.html', 'src/widget.js'], cwd: root}));
    const ms = Math.round(performance.now() - t);
    const full = await readFile(new URL('../dist/a11y-atomic.css', import.meta.url), 'utf8');
    expect(where, small.length < full.length / 8, `scanned CSS ${small.length} B vs full ${full.length} B`);
    const signature = async page => page.evaluate(() => [...document.querySelectorAll('body *')].map(el => {
      const c = getComputedStyle(el);
      return [c.display, c.gridTemplateColumns, c.padding, c.margin, c.color, c.backgroundColor, c.fontSize, c.flexDirection, c.borderWidth, c.order].join('|');
    }).join('\n'));
    for (const [vp, label] of [[desktop, 'desktop'], [{viewport: {width: 390, height: 844}}, 'mobile']]) {
      const a = await open(vp, `${where}/${label}`);
      const fullSig = await signature(a.page);
      await a.context.close();
      const context = await browser.newContext(vp);
      await context.route('**/dist/a11y-atomic.css', route => route.fulfill({contentType: 'text/css', body: small}));
      const page = await context.newPage();
      await page.goto(base);
      await page.waitForFunction(() => globalThis.a11yWidget);
      expect(`${where}/${label}`, (await signature(page)) === fullSig, 'computed styles differ between scanned and full CSS');
      await context.close();
    }
    console.log(`  content scan: ${(small.length / 1024).toFixed(1)} KB (full ${(full.length / 1024).toFixed(0)} KB) in ${ms} ms`);
  }
  // 10. The atomic grid (create() styles) renders exactly like grid.css.
  for (const width of [390, 1024, 1100, 1300, 1500]) {
    const where = `atomic-grid/${width}`;
    const context = await browser.newContext({viewport: {width, height: 900}});
    const page = await context.newPage();
    page.on('pageerror', error => fail(where, error.message));
    await page.goto(base + 'test/fixtures/grid.html');
    await page.waitForSelector('body[data-ready]');
    const diffs = await page.evaluate(() => {
      const props = ['display', 'gridTemplateColumns', 'rowGap', 'columnGap', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginLeft', 'marginRight', 'width', 'maxWidth', 'flexDirection', 'alignItems', 'justifyContent', 'order', 'textAlign', 'overflow', 'backgroundColor', 'gridColumnStart', 'gridColumnEnd'];
      const a = [...document.querySelectorAll('#classic *')], b = [...document.querySelectorAll('#atomic *')];
      if (a.length !== b.length) return [`element count ${a.length} vs ${b.length}`];
      const out = [];
      a.forEach((el, i) => {
        const x = getComputedStyle(el), y = getComputedStyle(b[i]);
        for (const p of props) if (x[p] !== y[p]) out.push(`${el.tagName.toLowerCase()}.${el.className} ${p}: ${x[p]} vs ${y[p]}`);
      });
      return out;
    });
    checks++;
    for (const d of diffs.slice(0, 5)) fail(where, d);
    await context.close();
  }
  // 11. The demo's atomic card: one declaration per class, shown on the page.
  {
    const where = 'atomic-demo';
    const {context, page} = await open(desktop, where);
    const info = await page.evaluate(() => {
      const card = document.getElementById('atomic-card');
      const rows = [...document.querySelectorAll('#atomic-rules tr')].map(r => r.cells[1].textContent);
      return {classes: card.className.split(' '), rows, padding: getComputedStyle(card).paddingTop, dir: getComputedStyle(card).flexDirection};
    });
    expect(where, info.classes.length >= 8 && info.classes.every(c => /^ax_[0-9a-z]+$/.test(c)), `atomic classes ${info.classes}`);
    expect(where, info.rows.length === info.classes.length && info.rows.every(r => r.split('\n').every(l => (l.match(/;/g) || []).length === 1)), 'each class should show one declaration');
    expect(where, info.padding === '24px' && info.dir === 'row', `card styles not applied: ${info.padding} ${info.dir}`);
    await context.close();
    const big = await open(desktop, `${where}/200`, {text: '200'});
    const dir = await big.page.evaluate(() => getComputedStyle(document.getElementById('atomic-card')).flexDirection);
    expect(where, dir === 'column', `@large-text should stack the card, got ${dir}`);
    await big.context.close();
  }
  // 12. Per page: shared core + only this page's classes inline; the widget injects
  //     just the rules it renders. Must look identical to the full bundle.
  {
    const where = 'per-page';
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const pageCss = await buildPage(html);
    const core = await buildCore();
    const full = await readFile(new URL('../dist/a11y-atomic.css', import.meta.url), 'utf8');
    const rewritten = inlinePage(html, pageCss, '/dist/a11y-core.css');
    expect(where, !rewritten.includes('dist/a11y-atomic.css'), 'full bundle link should be removed');
    console.log(`  per page: core ${(core.length / 1024).toFixed(1)} KB (cached) + page ${(pageCss.length / 1024).toFixed(1)} KB inline, vs full ${(full.length / 1024).toFixed(0)} KB`);
    const signature = async page => page.evaluate(() => [...document.querySelectorAll('body *')].map(el => {
      const c = getComputedStyle(el);
      return `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)} ` + [c.display, c.gridTemplateColumns, c.padding, c.margin, c.color, c.backgroundColor, c.fontSize, c.flexDirection, c.borderWidth, c.borderRadius, c.order].join('|');
    }).join('\n'));
    const firstDiff = (x, y) => { const a = x.split('\n'), b = y.split('\n'); const i = a.findIndex((l, k) => l !== b[k]); return i < 0 ? '' : `\n      full: ${a[i]}\n      page: ${b[i]}`; };
    for (const [vp, label, state] of [[desktop, 'desktop'], [{viewport: {width: 390, height: 844}}, 'mobile'], [desktop, 'high-200', {contrast: 'high', text: '200'}]]) {
      const a = await open(vp, `${where}/${label}`, state);
      await a.page.evaluate(() => globalThis.a11yWidget.open());
      await a.page.waitForTimeout(400); // let the open-state colour transition finish
      const fullSig = await signature(a.page);
      await a.context.close();
      const context = await browser.newContext(vp);
      if (state) await context.addInitScript(s => localStorage.setItem('a11y-atomic', s), JSON.stringify(state));
      await context.route(base, route => route.fulfill({contentType: 'text/html', body: rewritten}));
      await context.route('**/dist/a11y-core.css', route => route.fulfill({contentType: 'text/css', body: core}));
      const page = await context.newPage();
      page.on('pageerror', error => fail(`${where}/${label}`, error.message));
      await page.goto(base);
      await page.waitForFunction(() => globalThis.a11yWidget);
      await page.evaluate(() => globalThis.a11yWidget.open());
      await page.waitForTimeout(400);
      const injected = await page.evaluate(() => document.querySelector('style[data-ax-runtime]')?.textContent.split('\n').length - 2);
      const pageSig = await signature(page);
      expect(`${where}/${label}`, pageSig === fullSig, `computed styles differ from the full bundle${firstDiff(fullSig, pageSig)}`);
      expect(`${where}/${label}`, injected > 50 && injected < 200, `widget should inject only its own rules, got ${injected}`);
      await context.close();
    }
  }
  // 13. Web components: styles, tokens and every mode reach into shadow roots; the
  //     widget works when mounted in its own shadow root.
  {
    const where = 'shadow';
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    page.on('pageerror', error => fail(where, error.message));
    page.on('console', message => { if (message.type() === 'error') fail(where, message.text()); });
    await page.goto(base + 'test/fixtures/shadow.html');
    await page.waitForSelector('body[data-ready]');
    const card = () => page.evaluate(() => {
      const root = document.querySelector('a11y-card').shadowRoot;
      const div = root.querySelector('div'), p = root.querySelector('p'), a = root.querySelector('a');
      const c = getComputedStyle(div), pc = getComputedStyle(p), ac = getComputedStyle(a);
      return {display: c.display, padding: c.paddingTop, dir: c.flexDirection, bg: c.backgroundColor, color: c.color, letter: pc.letterSpacing, linkBg: ac.backgroundColor};
    });
    const set = async (name, value) => { await page.evaluate(([n, v]) => v === null ? document.documentElement.removeAttribute(n) : document.documentElement.setAttribute(n, v), [name, value]); await page.waitForTimeout(60); };
    let c = await card();
    expect(where, c.display === 'flex' && c.padding === '24px' && c.dir === 'row', `atomic classes should style shadow content: ${JSON.stringify(c)}`);
    expect(where, c.bg === 'rgb(243, 245, 248)', `tokens should inherit into shadow: ${c.bg}`);
    await set('data-ax-text', '200');
    c = await card();
    expect(where, c.dir === 'column' && c.padding === '48px', `@large-text and text size should apply inside shadow: ${c.dir} ${c.padding}`);
    await set('data-ax-spacing', 'on');
    expect(where, (await card()).letter !== 'normal', 'text spacing mode should reach shadow text');
    await set('data-ax-theme', 'dark');
    expect(where, (await card()).color === 'rgb(238, 241, 244)', 'dark theme should reach shadow content');
    await set('data-ax-links', 'underline');
    expect(where, (await card()).linkBg !== 'rgba(0, 0, 0, 0)', 'highlight links should reach shadow links');
    for (const n of ['data-ax-text', 'data-ax-spacing', 'data-ax-theme', 'data-ax-links']) await set(n, null);
    expect(where, (await card()).dir === 'row', 'removing the attribute should be mirrored too');

    // Widget mounted in a shadow root
    const w = () => page.evaluate(() => {
      const root = document.querySelector('div.ax-widget').shadowRoot;
      const t = root.querySelector('[data-ax-part="toggle"]');
      return {display: getComputedStyle(t).display, open: !root.querySelector('[data-ax-part="panel"]').hidden, expanded: t.getAttribute('aria-expanded')};
    });
    expect(where, (await w()).display === 'grid', 'shadow widget should be styled');
    await page.locator('div.ax-widget [data-ax-part="toggle"]').click();
    expect(where, (await w()).open, 'shadow widget should open on click');
    await page.locator('div.ax-widget input[name="text"][value="150"]').check();
    expect(where, await page.getAttribute('html', 'data-ax-text') === '150', 'shadow widget should set modes on <html>');
    await page.mouse.click(10, 10);
    expect(where, !(await w()).open, 'click outside should close the shadow widget');
    await page.locator('div.ax-widget [data-ax-part="toggle"]').click();
    await page.keyboard.press('Escape');
    expect(where, !(await w()).open && (await w()).expanded === 'false', 'Escape should close the shadow widget');
    await page.addScriptTag({content: axeSource});
    const result = await page.evaluate(() => globalThis.axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']}));
    checks++;
    for (const v of result.violations) fail(where, `axe ${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n` + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✔ browser check passed (${checks} checks)`);
