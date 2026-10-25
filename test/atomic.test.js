import test from 'node:test';
import assert from 'node:assert/strict';
import {create, props, classes, registry, hash} from '../src/atomic.js';
import {atomicRules} from '../scripts/build.mjs';
import {vars} from '../src/vars.js';

test('one class per property/value/condition, shared across styles', () => {
  const a = create({x: {color: 'red', padding: '1rem'}});
  const b = create({y: {padding: '1rem', margin: '0'}});
  const pad = c => Object.entries(c).find(([k]) => k.endsWith('|padding'))[1];
  assert.equal(pad(a.x), pad(b.y));
  assert.equal(Object.keys(a.x).length, 2);
  assert.match(pad(a.x), /^ax_[0-9a-z]+$/);
});

test('every generated rule has exactly one declaration', () => {
  const multi = atomicRules().filter(r => r.css.split('\n').some(line => (line.match(/;/g) || []).length !== 1));
  assert.deepEqual(multi, []);
  assert.ok(atomicRules().length > 100);
});

test('last style wins per property; falsy styles are skipped', () => {
  const s = create({base: {color: 'red', margin: '0'}, blue: {color: 'blue'}});
  const merged = classes(s.base, false, null, s.blue);
  const blue = Object.values(s.blue)[0];
  const red = Object.entries(s.base).find(([k]) => k.endsWith('|color'))[1];
  assert.ok(merged.split(' ').includes(blue));
  assert.ok(!merged.split(' ').includes(red));
  assert.equal(merged.split(' ').length, 2);
});

test('a later shorthand removes earlier longhands; a later longhand keeps the shorthand', () => {
  const s = create({top: {paddingTop: '2rem'}, all: {padding: '1rem'}});
  assert.equal(classes(s.top, s.all).split(' ').length, 1);
  assert.equal(classes(s.all, s.top).split(' ').length, 2);
  const rules = atomicRules();
  const at = cls => rules.findIndex(r => r.className === cls);
  assert.ok(at(Object.values(s.all)[0]) < at(Object.values(s.top)[0]), 'shorthands are emitted before longhands');
});

test('conditions: pseudo-classes, media, our own field, nesting, pseudo-elements', () => {
  const s = create({c: {
    color: {default: 'black', ':hover': 'blue', '@lg': {default: 'green', ':focus-visible': 'purple'}, '@contrast-more': 'black'},
    '::after': {content: {default: '""', ':checked': '"✓"'}},
  }});
  const css = atomicRules().filter(r => Object.values(s.c).includes(r.className)).map(r => r.css).join('\n');
  assert.match(css, /\.ax_[0-9a-z]+:hover \{ color: blue; \}/);
  assert.match(css, /@media \(min-width: 1024px\) \{ \.ax_[0-9a-z]+ \{ color: green; \} \}/);
  assert.match(css, /@media \(min-width: 1024px\) \{ \.ax_[0-9a-z]+:focus-visible \{ color: purple; \} \}/);
  assert.match(css, /:root\[data-ax-contrast="high"\] \.ax_[0-9a-z]+ \{ color: black; \}/);
  assert.match(css, /@media \(prefers-contrast: more\) \{ :root:not\(\[data-ax-contrast="normal"\]\) \.ax_[0-9a-z]+ \{ color: black; \} \}/);
  assert.match(css, /\.ax_[0-9a-z]+:checked::after \{ content: "✓"; \}/);
});

test('larger breakpoints come later than smaller ones', () => {
  const s = create({r: {width: {'@xl': '50%', '@md': '75%'}}});
  const rules = atomicRules();
  const [xl, md] = Object.values(s.r).map(c => rules.findIndex(r => r.className === c));
  assert.ok(md < xl);
});

test('unknown conditions are rejected', () => {
  assert.throws(() => create({bad: {color: {hover: 'red'}}}), /unknown condition/);
  assert.throws(() => create({bad: {color: {'@tablet': 'red'}}}), /unknown condition/);
});

test('hash is stable', () => {
  assert.equal(hash('color:red'), hash('color:red'));
  assert.notEqual(hash('color:red'), hash('color:blue'));
  assert.equal(hash(''), (0x811c9dc5).toString(36));
});

test('vars point at token variables', () => {
  assert.equal(vars.color.text, 'var(--ax-color-text)');
  assert.equal(vars.space['0.5'], 'var(--ax-space-0_5)');
  assert.equal(vars.a11y.focusWidth, 'var(--ax-a11y-focus-width)');
  assert.ok(registry.size > 0);
});

test('props returns {className}', () => {
  const s = create({p: {display: 'flex'}});
  assert.deepEqual(Object.keys(props(s.p)), ['className']);
});

test('runtime tracks which classes a page actually uses', async () => {
  const {used} = await import('../src/atomic.js');
  const s = create({only: {letterSpacing: '0.01em'}});
  const cls = Object.values(s.only)[0];
  assert.ok(!used.has(cls));
  classes(s.only);
  assert.ok(used.has(cls));
});
