import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, deriveAccent, mix, normalizeHex } from '../src/color.js';

const ACCENTS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ffffff', '#000000', '#ffff00'
];

test('normalizeHex accepts short colors and rejects invalid input', () => {
  assert.equal(normalizeHex('#abc'), '#aabbcc');
  assert.equal(normalizeHex('not-a-color'), '#3b82f6');
});

test('derived solid accents keep white text at WCAG AA contrast', () => {
  for (const accent of ACCENTS) {
    const colors = deriveAccent(accent);
    assert.ok(
      contrastRatio(colors.accentSolid, colors.accentFg) >= 4.5,
      `${accent} produced an insufficient solid accent`
    );
    assert.ok(contrastRatio(colors.accentText, colors.accentSoft) >= 4.5);
    assert.ok(contrastRatio(colors.accentTextDark, '#111827') >= 4.5);
    assert.ok(contrastRatio(mix(colors.accentSolid, '#0b1220', 0.24), '#ffffff') >= 4.5);
  }
});
