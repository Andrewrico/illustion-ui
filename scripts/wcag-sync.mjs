#!/usr/bin/env node
// Keeps a11y-atomic tied to the W3C WAI rules.
//
//   npm run wcag:sync            → fetch W3C's official WCAG JSON, report what changed (exit 1 if anything did)
//   npm run wcag:sync -- --write → also update wcag/snapshot.json (then run npm test: new criteria must be mapped)
//
// Also reports whether axe-core (the rule engine our browser check uses) has a newer release.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

export const SOURCE = process.env.WCAG_SOURCE || 'https://www.w3.org/WAI/WCAG22/wcag.json';
const snapshotUrl = new URL('../wcag/snapshot.json', import.meta.url);

/** Reduce W3C's wcag.json to the fields the framework depends on. */
export function compact(official) {
  return official.principles.flatMap(p => p.guidelines.flatMap(g => g.successcriteria.map(sc => ({
    num: sc.num, id: sc.id, handle: sc.handle, level: sc.level || null, versions: sc.versions,
    obsolete: !sc.level || /obsolete/i.test(sc.handle),
  }))));
}

export function diff(before, after) {
  const old = new Map(before.map(c => [c.num, c]));
  const now = new Map(after.map(c => [c.num, c]));
  const changes = [];
  for (const [num, c] of now) {
    const o = old.get(num);
    if (!o) { changes.push(`added ${num} ${c.handle} (${c.level ?? 'no level'})`); continue; }
    for (const field of ['handle', 'level', 'obsolete', 'id']) if (o[field] !== c[field]) changes.push(`changed ${num} ${field}: ${o[field]} → ${c[field]}`);
    if (o.versions.join() !== c.versions.join()) changes.push(`changed ${num} versions: ${o.versions} → ${c.versions}`);
  }
  for (const num of old.keys()) if (!now.has(num)) changes.push(`removed ${num} ${old.get(num).handle}`);
  return changes;
}

function axeStatus() {
  try {
    const installed = createRequire(import.meta.url)('axe-core/package.json').version;
    const latest = execFileSync('npm', ['view', 'axe-core', 'version'], {encoding: 'utf8', timeout: 30000}).trim();
    return {installed, latest, outdated: installed !== latest};
  } catch (error) {
    return {error: error.message.split('\n')[0]};
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const response = await fetch(SOURCE, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`${SOURCE} → HTTP ${response.status}`);
  const raw = await response.text();
  const criteria = compact(JSON.parse(raw));
  const snapshot = {
    source: SOURCE,
    fetched: new Date().toISOString().slice(0, 10),
    sha256: createHash('sha256').update(raw).digest('hex'),
    criteria,
  };
  let previous = null;
  try { previous = JSON.parse(await readFile(snapshotUrl, 'utf8')); } catch {}
  const changes = previous ? diff(previous.criteria, criteria) : ['no snapshot yet'];

  const levels = criteria.reduce((acc, c) => ({...acc, [c.level ?? 'obsolete']: (acc[c.level ?? 'obsolete'] || 0) + 1}), {});
  console.log(`W3C source: ${SOURCE}`);
  console.log(`criteria: ${criteria.length} (${Object.entries(levels).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(changes.length ? `changes since snapshot (${previous?.fetched ?? 'none'}):\n${changes.map(c => `  - ${c}`).join('\n')}` : `no rule changes since snapshot ${previous.fetched}`);
  const axe = axeStatus();
  console.log(axe.error ? `axe-core: could not check (${axe.error})` : `axe-core: installed ${axe.installed}, latest ${axe.latest}${axe.outdated ? ' — run npm install -D axe-core@latest and npm run test:browser' : ''}`);

  if (write && (changes.length || previous?.sha256 !== snapshot.sha256)) {
    await writeFile(snapshotUrl, JSON.stringify(snapshot, null, 2) + '\n');
    console.log('wcag/snapshot.json updated — run npm test; any new criterion must be classified in src/wcag-map.mjs');
  }
  if (changes.length && !write) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`wcag:sync failed: ${error.message}`);
    process.exitCode = 2;
  });
}
