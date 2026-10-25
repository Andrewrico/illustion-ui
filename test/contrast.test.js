import test from 'node:test';
import assert from 'node:assert/strict';
import {themes, pairs} from '../src/tokens.mjs';

// WCAG 2.2 relative luminance and contrast ratio.
const channel = value => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const [name, palette] of Object.entries(themes)) {
  test(`${name} theme meets WCAG contrast for every pair`, () => {
    const high = name.startsWith('high');
    const failures = [];
    for (const [fg, bg, normal, strict] of pairs) {
      const min = high ? strict : normal;
      const ratio = contrast(palette[fg], palette[bg]);
      if (ratio < min) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
    }
    assert.deepEqual(failures, []);
  });
}

test('every theme defines the same tokens', () => {
  const keys = Object.keys(themes.light).sort();
  for (const palette of Object.values(themes)) assert.deepEqual(Object.keys(palette).sort(), keys);
});
