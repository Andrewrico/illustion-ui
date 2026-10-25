import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {map, STATUS} from '../src/wcag-map.mjs';
import {SETTINGS} from '../src/widget.js';
import {diff, compact} from '../scripts/wcag-sync.mjs';
import {report} from '../scripts/wcag-report.mjs';

const snapshot = JSON.parse(await readFile(new URL('../wcag/snapshot.json', import.meta.url), 'utf8'));
const byNum = new Map(snapshot.criteria.map(c => [c.num, c]));

test('snapshot comes from W3C', () => {
  assert.match(snapshot.source, /^https:\/\/www\.w3\.org\/WAI\//);
  assert.ok(snapshot.criteria.length > 80);
});

test('every current Level A and AA criterion is classified', () => {
  const missing = snapshot.criteria.filter(c => !c.obsolete && ['A', 'AA'].includes(c.level) && !map[c.num]).map(c => `${c.num} ${c.handle}`);
  assert.deepEqual(missing, [], 'W3C added or changed criteria — classify them in src/wcag-map.mjs');
});

test('the map only references real, current criteria with a valid status', () => {
  for (const [num, entry] of Object.entries(map)) {
    assert.ok(byNum.has(num), `${num} is not in the W3C snapshot`);
    assert.equal(byNum.get(num).obsolete, false, `${num} is obsolete`);
    assert.ok(STATUS.includes(entry.status), `${num} status ${entry.status}`);
    assert.ok(entry.how.length > 10, `${num} needs an explanation`);
  }
});

test('every "framework" claim names a test that exists', async () => {
  for (const [num, entry] of Object.entries(map)) {
    if (entry.status !== 'framework') continue;
    assert.ok(entry.verify?.length, `${num} claims framework but names no test`);
    for (const file of entry.verify) await access(new URL(`../${file}`, import.meta.url));
  }
});

test('every widget setting maps to current criteria', () => {
  for (const s of SETTINGS) {
    assert.ok(Array.isArray(s.wcag), s.key);
    for (const num of s.wcag) assert.ok(byNum.has(num) && !byNum.get(num).obsolete && map[num], `${s.key} → ${num}`);
  }
});

test('WCAG.md is up to date', async () => {
  const committed = await readFile(new URL('../WCAG.md', import.meta.url), 'utf8');
  assert.equal(committed, await report(), 'run npm run wcag:report');
});

test('sync detects added, changed and removed criteria', () => {
  const official = level => ({principles: [{guidelines: [{successcriteria: [
    {num: '9.9.9', id: 'x', handle: 'New', level, versions: ['2.2']},
  ]}]}]});
  const before = compact(official('AA'));
  assert.deepEqual(diff(before, before), []);
  assert.deepEqual(diff(before, compact(official('A'))), ['changed 9.9.9 level: AA → A']);
  assert.deepEqual(diff([], before), ['added 9.9.9 New (AA)']);
  assert.deepEqual(diff(before, []), ['removed 9.9.9 New']);
  assert.equal(compact(official(''))[0].obsolete, true);
});
