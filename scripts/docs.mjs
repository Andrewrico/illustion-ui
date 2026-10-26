#!/usr/bin/env node
// Builds the documentation site (docs/) from README.md, in the layout of
// getbootstrap.com/docs: top bar, grouped sidebar, breadcrumb, content and an
// "On this page" list. README.md stays the single source; nothing in docs/ is
// edited by hand except docs/assets/. Run: npm run docs
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Marked} from 'marked';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;

// Sidebar groups. Every README "##" must appear here exactly once (checked below),
// so a new section cannot silently go missing from the docs.
export const layout = [
  ['Getting started', [
    {slug: 'introduction', title: 'Introduction', intro: true},
    {slug: 'quick-start', heading: 'Quick start'},
    {slug: 'how-it-works', heading: 'How it works'},
    {slug: 'connect', heading: 'Ways to connect'},
  ]],
  ['Customize', [
    {slug: 'tokens', heading: 'Tokens'},
    {slug: 'layers', heading: 'Cascade layers'},
    {slug: 'modes', heading: 'Accessibility modes'},
    {slug: 'naming', heading: 'Naming standard'},
  ]],
  ['Layout and content', [
    {slug: 'grid', heading: 'Grid'},
    {slug: 'plain-html', heading: 'Plain HTML, already styled'},
    {slug: 'page-loads', heading: 'Only what the page loads'},
  ]],
  ['Utilities', [
    {slug: 'utilities', heading: 'Utilities'},
    {slug: 'class-names', heading: 'Class names'},
    {slug: 'variable-utilities', heading: 'Variable utilities'},
  ]],
  ['Engine', [
    {slug: 'atomic', heading: 'Atomic, Facebook style'},
    {slug: 'shipping', heading: 'What ships is atomic'},
    {slug: 'web-components', heading: 'Web components and shadow DOM'},
  ]],
  ['Widget', [
    {slug: 'widget-api', heading: 'Widget JavaScript API'},
  ]],
  ['About', [
    {slug: 'wcag', heading: 'Tied to W3C WAI'},
    {slug: 'efficiency', heading: 'Efficiency: what it costs, measured'},
    {slug: 'performance', heading: 'Performance'},
    {slug: 'lineage', heading: 'The best idea from each framework'},
    {slug: 'development', heading: 'Development'},
    {slug: 'limits', heading: 'Limits'},
    {slug: 'license', heading: 'License'},
  ]],
];

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = text => text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = tokens => tokens.map(t => t.text ?? t.raw ?? '').join('');

// ---------- split README into pages ----------
const marked = new Marked();
const all = marked.lexer(await readFile(path.join(root, 'README.md'), 'utf8'));
const sections = new Map(); // heading text → tokens after it
const intro = [];
let current = intro;
for (const token of all) {
  if (token.type === 'heading' && token.depth === 1) continue; // the page title comes from the layout
  if (token.type === 'heading' && token.depth === 2) { current = []; sections.set(token.text, current); continue; }
  current.push(token);
}

const pages = [];
for (const [group, items] of layout) {
  for (const item of items) {
    const tokens = item.intro ? intro : sections.get(item.heading);
    if (!tokens) throw new Error(`README.md has no "## ${item.heading}" section (docs layout in scripts/docs.mjs).`);
    sections.delete(item.heading);
    pages.push({...item, title: item.title ?? item.heading, group, tokens});
  }
}
if (sections.size) throw new Error(`README sections missing from the docs layout: ${[...sections.keys()].join(', ')}`);

// Where each in-page anchor lives, so "#tied-to-w3c-wai" can point at its own page.
const anchors = new Map();
for (const page of pages) {
  if (!page.intro) anchors.set(slugify(page.heading), page);
  for (const token of page.tokens) if (token.type === 'heading') anchors.set(slugify(token.text), page);
}

const hrefOf = (from, to, hash = '') => {
  const target = to.intro ? 'docs/index.html' : `docs/${to.slug}/index.html`;
  const here = from.intro ? 'docs' : `docs/${from.slug}`;
  return (path.relative(here, target.replace(/index\.html$/, '')) || '.') + '/' + hash;
};
const rootOf = page => (page.intro ? '../' : '../../');

// ---------- render ----------
function render(page) {
  const toc = [];
  const renderer = {
    heading({tokens, depth}) {
      const text = plain(tokens), id = slugify(text), level = Math.max(2, depth - 1); // README h3 → h2 on its own page
      if (level === 2) toc.push({id, text});
      return `<h${level} id="${id}">${this.parser.parseInline(tokens)}<a class="anchor" href="#${id}" aria-label="Link to this section: ${escape(text)}">#</a></h${level}>\n`;
    },
    link({href, title, tokens}) {
      let url = href;
      if (href.startsWith('#')) {
        const owner = anchors.get(href.slice(1));
        if (owner && owner !== page) url = hrefOf(page, owner, href);
      } else if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) url = rootOf(page) + href;
      return `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    code({text, lang}) {
      const label = lang ? `${lang.toUpperCase()} code` : 'Code';
      return `<div class="code"><pre tabindex="0" aria-label="${escape(label)}"><code${lang ? ` class="language-${escape(lang)}"` : ''}>${escape(text)}</code></pre></div>\n`;
    },
  };
  const parser = new Marked({gfm: true, renderer});
  const list = Object.assign([...page.tokens], {links: all.links});
  const body = parser.parser(list)
    .replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways on small screens"><table>')
    .replace(/<\/table>/g, '</table></div>');
  return {body, toc};
}

const link = (from, to, label, current = false) => `<a href="${hrefOf(from, to)}"${current ? ' aria-current="page"' : ''}>${label}</a>`;

function shell(page) {
  const {body, toc} = render(page);
  const r = rootOf(page);
  const index = pages.indexOf(page);
  const prev = pages[index - 1], next = pages[index + 1];

  const sidebar = layout.map(([group, items]) => `
        <div class="docs-group">
          <h2 class="docs-group-title" id="g-${slugify(group)}">${escape(group)}</h2>
          <ul aria-labelledby="g-${slugify(group)}">
${items.map(item => { const p = pages.find(x => x.slug === item.slug); return `            <li>${link(page, p, escape(p.title), p === page)}</li>`; }).join('\n')}
          </ul>
        </div>`).join('');

  const onThis = toc.length > 1 ? `
      <nav class="docs-toc" aria-labelledby="toc-title">
        <h2 id="toc-title" class="docs-group-title">On this page</h2>
        <ul>
${toc.map(t => `          <li><a href="#${t.id}">${escape(t.text)}</a></li>`).join('\n')}
        </ul>
      </nav>` : '';

  const pager = (prev || next) ? `
        <nav class="docs-pager" aria-label="Previous and next page">
          ${prev ? `<a rel="prev" href="${hrefOf(page, prev)}"><span>Previous</span>${escape(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a rel="next" href="${hrefOf(page, next)}"><span>Next</span>${escape(next.title)}</a>` : '<span></span>'}
        </nav>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(page.title)} · Illustion UI docs</title>
  <meta name="description" content="${escape(page.title)}: Illustion UI documentation, the accessibility-first atomic CSS framework.">
  <script>try{var k="illustion-ui",s=JSON.parse(localStorage.getItem(k)||"{}");if(!s.theme){s.theme="light";localStorage.setItem(k,JSON.stringify(s))}}catch(e){}</script>
  <script src="${r}dist/illustionui-init.js"></script>
  <link rel="stylesheet" href="${r}dist/illustionui.css">
  <link rel="stylesheet" href="${r}docs/assets/site.css">
  <script type="module" src="${r}src/auto.js"></script>
  <script type="module" src="${r}docs/assets/site.js"></script>
</head>
<body>
  <a class="ax-sr-only focus:ax-not-sr-only focus:ax-absolute focus:ax-top-2 focus:ax-left-2 focus:ax-z-50 focus:ax-px-4 focus:ax-py-2 focus:ax-bg-primary focus:ax-text-on-primary focus:ax-rounded-md" href="#content">Skip to main content</a>

  <header class="site-header">
    <nav class="site-bar" aria-label="Primary">
      <a class="site-brand" href="${r}index.html">Illustion UI</a>
      <ul class="site-links">
        <li><a href="${r}docs/" aria-current="page">Docs</a></li>
        <li><a href="${r}examples.html">Examples</a></li>
        <li><a href="${hrefOf(page, pages.find(p => p.slug === 'wcag'))}">WCAG</a></li>
      </ul>
      <span class="site-version">v${version}</span>
      <button type="button" class="site-button" data-open-widget>Accessibility settings</button>
    </nav>
  </header>

  <div class="docs">
    <details class="docs-side" open>
      <summary>Browse docs</summary>
      <nav aria-label="Docs">${sidebar}
      </nav>
    </details>
${onThis}
    <main id="content" class="docs-main">
      <nav class="docs-crumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="${r}docs/">Docs</a></li>
          <li>${escape(page.group)}</li>
          <li aria-current="page">${escape(page.title)}</li>
        </ol>
      </nav>
      <h1 class="docs-title">${escape(page.title)}</h1>
${body}${pager}
    </main>
  </div>

  <footer class="site-footer">
    <p>Illustion UI v${version} · MIT · Code and docs by Andrew Rico. The widget helps readers; it does not make a site conformant on its own.</p>
    <p><a href="${r}index.html">Home</a> · <a href="${r}docs/">Docs</a> · <a href="${r}examples.html">Examples</a> · <a href="#content">Back to top</a></p>
  </footer>
</body>
</html>
`;
}

await rm(path.join(root, 'docs/index.html'), {force: true});
for (const [, items] of layout) for (const item of items) if (!item.intro) await rm(path.join(root, 'docs', item.slug), {recursive: true, force: true});
for (const page of pages) {
  const file = path.join(root, 'docs', page.intro ? 'index.html' : `${page.slug}/index.html`);
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, shell(page));
}
console.log(`docs: ${pages.length} pages in docs/ from README.md`);
