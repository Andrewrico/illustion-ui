import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from '../scripts/build.mjs';
import {SETTINGS} from '../src/widget.js';
import {themes} from '../src/tokens.mjs';

const css = await build();
const grid = await readFile(new URL('../src/grid.css', import.meta.url), 'utf8');
const modes = await readFile(new URL('../src/modes.css', import.meta.url), 'utf8');

test('grid.css is included unchanged', () => {
  assert.ok(css.includes(grid));
});

test('every colour token is emitted for every theme', () => {
  for (const key of Object.keys(themes.light)) assert.ok(css.includes(`--color-${key}:`), key);
  for (const name of ['light', 'dark']) assert.ok(css.includes(`color-scheme: ${name}`));
});

test('every non-default widget value has CSS that reacts to it', () => {
  // Values handled only via the OS fallback or by turning something off need no selector.
  const noSelector = new Set(['theme=light', 'contrast=normal', 'motion=allow']);
  const missing = [];
  for (const s of SETTINGS) for (const [value] of s.options) {
    if (value === s.default || noSelector.has(`${s.key}=${value}`)) continue;
    if (!css.includes(`[data-a11y-${s.key}="${value}"]`)) missing.push(`${s.key}=${value}`);
  }
  assert.deepEqual(missing, []);
});

test('atomic utilities read variables, not hard-coded values', () => {
  for (const rule of ['.p-4 { padding: var(--space-4); }', '.fg-text { color: var(--color-text); }', '.text-lg { font-size: var(--text-lg);']) {
    assert.ok(css.includes(rule), rule);
  }
});

test('responsive and grid helpers are generated', () => {
  assert.ok(css.includes('@media (min-width: 1024px)'));
  assert.ok(css.includes('.md\\:flex { display: flex; }'));
  assert.ok(css.includes('.lg\\:hidden { display: none; }'));
  assert.ok(css.includes('.cols-d-3 { --column-desktop: repeat(3, minmax(0, 1fr)); }'));
  assert.ok(css.includes('.span-full { grid-column: 1 / -1; }'));
});

test('no class selector is defined twice outside media queries', () => {
  const top = css.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const atomicPart = top.split('/* ===== Atomic utilities ===== */')[1].split('/* ===== Widget')[0];
  const selectors = [...atomicPart.matchAll(/^(\.[^\s{]+) \{/gm)].map(m => m[1]);
  const dupes = selectors.filter((s, i) => selectors.indexOf(s) !== i);
  assert.deepEqual(dupes, []);
});

test('OS preferences are honoured unless the user overrides them', () => {
  assert.ok(modes.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('@media (prefers-contrast: more)'));
  assert.ok(css.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(modes.includes('@media (forced-colors: active)'));
});
