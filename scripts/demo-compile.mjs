#!/usr/bin/env node
// Writes compiled.html: the demo page as it ships — readable classes compiled to
// atomic ax_ classes, shared core linked, this page's CSS inlined.
import {readFile, writeFile} from 'node:fs/promises';
import {buildPage, inlinePage} from './build.mjs';

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const {css, html} = await buildPage(source, {compile: true});
await writeFile(new URL('../compiled.html', import.meta.url), inlinePage(html, css, 'dist/a11y-core.css'));
const count = h => [...h.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean);
const tokens = count(html);
console.log(`compiled.html: ${tokens.filter(t => t.startsWith('ax_')).length} atomic class uses, ${tokens.filter(t => !t.startsWith('ax_')).length} readable left (${[...new Set(tokens.filter(t => !t.startsWith('ax_')))].join(' ') || 'none'}); page CSS ${(css.length / 1024).toFixed(1)} KB`);
