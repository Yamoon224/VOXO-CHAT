import { deriveAccent, mix } from './color.js';

const VALID_POSITIONS = new Set(['bottom-right', 'bottom-left', 'top-right', 'top-left']);
const VALID_SCHEMES = new Set(['auto', 'light', 'dark']);

export function applyTokens(host, config) {
  if (!host || !config) return;
  const colors = deriveAccent(config.theme?.primaryColor);
  const ui = config.options?.ui || {};
  const radius = /^\d+(\.\d+)?(px|rem|em)$/.test(String(ui.borderRadius || ''))
    ? ui.borderRadius
    : '16px';

  host.style.setProperty('--vx-accent', colors.accent);
  host.style.setProperty('--vx-accent-solid', colors.accentSolid);
  host.style.setProperty('--vx-accent-fg', colors.accentFg);
  host.style.setProperty('--vx-accent-soft', colors.accentSoft);
  host.style.setProperty('--vx-accent-soft-dark', colors.accentSoftDark);
  host.style.setProperty('--vx-accent-text-light', colors.accentText);
  host.style.setProperty('--vx-accent-text-dark', colors.accentTextDark);
  host.style.setProperty('--vx-accent-ring', colors.accentRing);
  host.style.setProperty('--vx-header-start', colors.accentSolid);
  host.style.setProperty('--vx-header-end', mix(colors.accentSolid, '#0b1220', 0.24));
  host.style.setProperty('--vx-radius-panel', radius);
  host.style.setProperty('--vx-shadow-panel', ui.shadows === false ? 'none' : '0 24px 64px rgba(15, 23, 42, .18)');
  host.style.setProperty('--vx-shadow-launcher', ui.shadows === false ? 'none' : '0 12px 30px rgba(15, 23, 42, .22)');
  host.style.setProperty('--vx-duration-fast', ui.animations === false ? '1ms' : '160ms');
  host.style.setProperty('--vx-duration-base', ui.animations === false ? '1ms' : '240ms');

  host.dataset.position = VALID_POSITIONS.has(config.theme?.position)
    ? config.theme.position
    : 'bottom-right';
  host.dataset.theme = VALID_SCHEMES.has(ui.colorScheme) ? ui.colorScheme : 'light';
  host.dataset.mobileFullscreen = ui.mobileFullScreen === false ? 'false' : 'true';
}
