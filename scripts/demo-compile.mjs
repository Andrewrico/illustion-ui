#!/usr/bin/env node
// Writes compiled.html: the demo page as it ships — readable classes compiled to
// atomic ax_ classes, shared core linked, this page's CSS inlined.
import {readFile, writeFile} from 'node:fs/promises';
import {buildPage, inlinePage, compileSite, linkSite} from './build.mjs';

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const {css, html} = await buildPage(source, {compile: true});
await writeFile(new URL('../compiled.html', import.meta.url), inlinePage(html, css, 'dist/a11y-core.css'));
const count = h => [...h.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean);
const tokens = count(html);
console.log(`compiled.html: ${tokens.filter(t => t.startsWith('ax_')).length} atomic class uses, ${tokens.filter(t => !t.startsWith('ax_')).length} readable left (${[...new Set(tokens.filter(t => !t.startsWith('ax_')))].join(' ') || 'none'}); page CSS ${(css.length / 1024).toFixed(1)} KB`);

// Site mode: one shared stylesheet with short names (ax_0, ax_1, …).
const site = await compileSite({'index.html': source});
await writeFile(new URL('../compiled-site.html', import.meta.url), linkSite(site.pages['index.html'], '/dist/a11y-site.css'));
await writeFile(new URL('../dist/a11y-site.css', import.meta.url), site.css + '\n');
console.log(`compiled-site.html + dist/a11y-site.css (${(site.css.length / 1024).toFixed(1)} KB, shared)`);
