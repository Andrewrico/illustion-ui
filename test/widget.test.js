import test from 'node:test';
import assert from 'node:assert/strict';
import {SETTINGS, STORAGE_KEY, defaults, sanitize, applySettings, loadState, saveState, describe} from '../src/widget.js';

const fakeRoot = () => {
  const attrs = new Map();
  return {attrs, setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k)};
};
const memoryStorage = () => {
  const data = new Map();
  return {data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
};

test('every setting has a unique key and its default among its options', () => {
  assert.equal(new Set(SETTINGS.map(s => s.key)).size, SETTINGS.length);
  for (const s of SETTINGS) {
    assert.ok(s.options.some(([v]) => v === s.default), s.key);
    if (s.type === 'toggle') assert.equal(s.options.length, 2, s.key);
  }
});

test('sanitize drops unknown keys and disallowed values', () => {
  const state = sanitize({text: '200', theme: 'neon', evil: '<script>', contrast: 'high'});
  assert.equal(state.text, '200');
  assert.equal(state.theme, 'auto');
  assert.equal(state.contrast, 'high');
  assert.ok(!('evil' in state));
  assert.deepEqual(sanitize(null), defaults());
  assert.deepEqual(sanitize('nope'), defaults());
});

test('applySettings sets non-defaults and removes defaults', () => {
  const root = fakeRoot();
  applySettings(root, {text: '150', spacing: 'on'});
  assert.equal(root.attrs.get('data-ax-text'), '150');
  assert.equal(root.attrs.get('data-ax-spacing'), 'on');
  assert.equal(root.attrs.size, 2);
  applySettings(root, {text: '100'});
  assert.equal(root.attrs.size, 0);
});

test('save stores only changed values and round-trips', () => {
  const storage = memoryStorage();
  assert.equal(saveState(storage, {...defaults(), text: '130', motion: 'reduce'}), true);
  assert.deepEqual(JSON.parse(storage.data.get(STORAGE_KEY)), {text: '130', motion: 'reduce'});
  assert.equal(loadState(storage).text, '130');
  saveState(storage, defaults());
  assert.equal(storage.data.has(STORAGE_KEY), false);
});

test('load and save survive broken or blocked storage', () => {
  const broken = {getItem: () => '{not json', setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); }};
  assert.deepEqual(loadState(broken), defaults());
  assert.deepEqual(loadState(null), defaults());
  assert.equal(saveState(broken, {text: '200'}), false);
});

test('describe gives a readable announcement', () => {
  assert.equal(describe('text', '150'), 'Text size: 150%');
  assert.equal(describe('spacing', 'on'), 'Wider text spacing: On');
});
