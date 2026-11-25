const HEX_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/i;

export function normalizeHex(value, fallback = '#3b82f6') {
  const input = String(value || '').trim();
  if (!HEX_PATTERN.test(input)) return fallback;
  const raw = input.replace('#', '').toLowerCase();
  const expanded = raw.length === 3
    ? raw.split('').map(part => part + part).join('')
    : raw;
  return `#${expanded}`;
}

export function hexToRgb(value) {
  const hex = normalizeHex(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

export function mix(first, second, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const amount = Math.max(0, Math.min(1, weight));
  const channel = key => Math.round(a[key] * (1 - amount) + b[key] * amount)
    .toString(16)
    .padStart(2, '0');
  return `#${channel('r')}${channel('g')}${channel('b')}`;
}

export function rgba(value, alpha) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(value) {
  const { r, g, b } = hexToRgb(value);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(first, second) {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

export function deriveAccent(value) {
  const accent = normalizeHex(value);
  let accentSolid = accent;

  for (let amount = 0; amount <= 0.8 && contrastRatio(accentSolid, '#ffffff') < 4.5; amount += 0.03) {
    accentSolid = mix(accent, '#000000', amount);
  }

  const accentFg = contrastRatio(accentSolid, '#ffffff') >= 4.5 ? '#ffffff' : '#0b1220';
  const accentSoft = mix(accent, '#ffffff', 0.88);
  const accentSoftDark = mix(accent, '#111827', 0.78);
  let accentText = accentSolid;
  let accentTextDark = accent;
  for (let amount = 0; amount <= 0.85 && contrastRatio(accentText, accentSoft) < 4.5; amount += 0.03) {
    accentText = mix(accentSolid, '#000000', amount);
  }
  for (let amount = 0; amount <= 0.9 && contrastRatio(accentTextDark, '#111827') < 4.5; amount += 0.03) {
    accentTextDark = mix(accent, '#ffffff', amount);
  }
  return {
    accent,
    accentSolid,
    accentFg,
    accentSoft,
    accentSoftDark,
    accentText,
    accentTextDark,
    accentRing: accentSolid
  };
}

export function auditAccent(value) {
  const colors = deriveAccent(value);
  return {
    ...colors,
    solidOnWhite: contrastRatio(colors.accentSolid, '#ffffff'),
    textOnSoft: contrastRatio(colors.accentText, colors.accentSoft),
    textDarkOnSurface: contrastRatio(colors.accentTextDark, '#111827'),
    ringOnWhite: contrastRatio(colors.accentSolid, '#ffffff')
  };
}
