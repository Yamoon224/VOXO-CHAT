export const WIDGET_CSS = `
:host {
  --vx-accent: #3b82f6;
  --vx-accent-solid: #2563c9;
  --vx-accent-fg: #fff;
  --vx-accent-soft: #e9f1fe;
  --vx-accent-soft-dark: #172239;
  --vx-accent-text-light: #1f56b3;
  --vx-accent-text-dark: #8fb5f4;
  --vx-accent-text: var(--vx-accent-text-light);
  --vx-accent-ring: rgba(37, 99, 201, .42);
  --vx-header-start: #2563c9;
  --vx-header-end: #1a438a;
  --vx-surface: #ffffff;
  --vx-surface-muted: #f7f8fa;
  --vx-surface-raised: #ffffff;
  --vx-text: #172033;
  --vx-text-muted: #697386;
  --vx-border: #e4e7ec;
  --vx-danger: #b42318;
  --vx-danger-soft: #fef3f2;
  --vx-radius-panel: 16px;
  --vx-shadow-panel: 0 24px 64px rgba(15, 23, 42, .18);
  --vx-shadow-launcher: 0 12px 30px rgba(15, 23, 42, .22);
  --vx-duration-fast: 160ms;
  --vx-duration-base: 240ms;
  position: fixed;
  z-index: 2147483000;
  color: var(--vx-text);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  font-size: 14px;
  line-height: 1.45;
  color-scheme: light;
}

:host([data-position="bottom-right"]) { right: 20px; bottom: 20px; }
:host([data-position="bottom-left"]) { left: 20px; bottom: 20px; }
:host([data-position="top-right"]) { right: 20px; top: 20px; }
:host([data-position="top-left"]) { left: 20px; top: 20px; }

*, *::before, *::after { box-sizing: border-box; }
button, input, textarea { font: inherit; }
button { color: inherit; }
[hidden] { display: none !important; }

.vx-shell { position: relative; }
.vx-icon { display: inline-flex; flex: 0 0 auto; line-height: 0; }

.vx-launcher {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--vx-accent-solid);
  color: var(--vx-accent-fg);
  box-shadow: var(--vx-shadow-launcher);
  cursor: pointer;
}
.vx-launcher-image { width: 100%; height: 100%; display: block; border-radius: 50%; object-fit: cover; }
.vx-panel {
  position: absolute;
  width: min(420px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 108px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--vx-border);
  border-radius: var(--vx-radius-panel);
  background: var(--vx-surface);
  box-shadow: var(--vx-shadow-panel);
  color: var(--vx-text);
  animation: vx-enter var(--vx-duration-base) cubic-bezier(.2, .8, .2, 1);
}
:host([data-position^="bottom"]) .vx-panel { bottom: 72px; }
:host([data-position^="top"]) .vx-panel { top: 72px; }
:host([data-position$="right"]) .vx-panel { right: 0; }
:host([data-position$="left"]) .vx-panel { left: 0; }

.vx-header {
  min-height: 176px;
  display: flex;
  flex-direction: column;
  padding: 11px 12px 25px;
  background: linear-gradient(180deg, var(--vx-header-start) 0%, var(--vx-header-end) 100%);
  color: #fff;
}
.vx-header-top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%; min-height: 38px; }
.vx-channel-pill { display: flex; align-items: center; gap: 8px; padding: 7px 18px; border-radius: 99px; background: rgba(8,37,112,.3); font-weight: 650; }
.vx-brand-stage { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.vx-brand-avatar-group { position: relative; flex: 0 0 auto; }
.vx-brand-avatar, .vx-message-avatar, .vx-brand-mark {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: var(--vx-accent-soft);
  color: var(--vx-accent-text);
  font-weight: 700;
  letter-spacing: -.02em;
}
.vx-brand-avatar { width: 52px; height: 52px; padding: 3px; background: #fff; color: var(--vx-accent-text); box-shadow: 0 5px 16px rgba(15, 23, 42, .2); }
.vx-brand-mark { position: absolute; right: -12px; bottom: -3px; width: 27px; height: 27px; overflow: hidden; padding: 2px; border: 2px solid #fff; background: #fff; }
.vx-avatar-image { width: 100%; height: 100%; object-fit: cover; }
.vx-brand-copy { min-width: 0; max-width: 300px; padding-top: 7px; }
.vx-title { margin: 0; overflow: hidden; font-size: 14px; font-weight: 750; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.vx-tagline { margin: 3px 0 4px; color: #fff; font-size: 14px; font-weight: 750; }
.vx-status { display: flex; align-items: center; justify-content: center; }
.vx-subtitle { display: inline-flex; align-items: center; gap: 6px; color: #fff; font-size: 10.5px; }
.vx-subtitle::before { content: ""; width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 0 3px rgba(255,255,255,.12); }
.vx-subtitle[data-connectivity="available"]::before { background: #4ade80; }
.vx-subtitle[data-connectivity="unavailable"]::before { background: #fca5a5; }
.vx-subtitle[data-connectivity="disabled"]::before { display: none; }
.vx-header-actions { display: flex; justify-self: end; gap: 2px; }
.vx-locale-select { border: 0; border-radius: 8px; background: rgba(255,255,255,.14); color: #fff; font: inherit; font-size: 12px; padding: 0 4px; }
.vx-locale-select option { color: #111827; }
.vx-icon-button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: rgba(255,255,255,.08);
  color: #fff;
  cursor: pointer;
}
.vx-icon-button:hover { background: rgba(255,255,255,.18); }

.vx-chat-view { position: relative; min-height: 0; display: flex; flex: 1; flex-direction: column; margin-top: -14px; overflow: hidden; border-radius: 18px 18px 0 0; background: var(--vx-surface); }
.vx-prechat-view, .vx-rating-view { display: none; }
.vx-panel[data-view="prechat"] .vx-chat-view,
.vx-panel[data-view="rating"] .vx-chat-view { display: none; }
.vx-panel[data-view="prechat"] .vx-prechat-view,
.vx-panel[data-view="rating"] .vx-rating-view { display: block; }
.vx-panel[data-minimized="true"] { height: auto; }
.vx-panel[data-minimized="true"] .vx-header { min-height: 56px; padding: 9px 12px; }
.vx-panel[data-minimized="true"] .vx-brand-stage { display: none; }
.vx-panel[data-minimized="true"] .vx-chat-view,
.vx-panel[data-minimized="true"] .vx-prechat-view,
.vx-panel[data-minimized="true"] .vx-rating-view,
.vx-panel[data-minimized="true"] .vx-powered { display: none; }

.vx-messages {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 24px 14px 14px;
  background: var(--vx-surface-muted);
}
.vx-message { display: flex; gap: 8px; align-items: flex-end; margin-top: 12px; }
.vx-message[data-grouped="true"] { margin-top: 4px; }
.vx-message-avatar { width: 30px; height: 30px; padding: 2px; background: var(--vx-surface); font-size: 10px; }
.vx-avatar-hidden { display: none; }
.vx-message[data-grouped="true"] .vx-message-avatar { visibility: hidden; }
.vx-message-content { min-width: 0; max-width: 78%; }
.vx-user .vx-message-content { margin-left: auto; }
.vx-bubble {
  inline-size: max-content;
  max-inline-size: 100%;
  padding: 10px 12px;
  border: 1px solid var(--vx-border);
  border-radius: 14px 14px 14px 5px;
  background: var(--vx-surface-raised);
  color: var(--vx-text);
  overflow-wrap: break-word;
  word-break: normal;
}
.vx-user .vx-bubble { margin-left: auto; border-color: var(--vx-accent-soft); border-radius: 14px 14px 5px 14px; background: var(--vx-accent-soft); color: var(--vx-accent-text); }
.vx-agent .vx-bubble { background: #15803d; color: #fff; border-color: transparent; }
.vx-message[data-welcome="true"] .vx-bubble { padding: 15px; border-color: var(--vx-accent-soft); background: linear-gradient(145deg, var(--vx-surface-raised), var(--vx-accent-soft)); box-shadow: 0 9px 26px rgba(15, 23, 42, .08); }
.vx-message[data-welcome="true"] .vx-message-avatar { width: 34px; height: 34px; }
.vx-welcome-label { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; color: var(--vx-accent-text); font-size: 11px; font-weight: 700; text-transform: uppercase; }
.vx-bubble a { color: inherit; text-decoration: underline; }
.vx-bubble.vx-error { border-color: #fecdca; background: var(--vx-danger-soft); color: var(--vx-danger); }
.vx-message-footer { display: flex; align-items: center; gap: 7px; margin-top: 4px; padding-inline: 2px; color: var(--vx-text-muted); font-size: 10px; }
.vx-user .vx-message-footer { justify-content: flex-end; }
.vx-message[data-hide-time="true"] .vx-timestamp { display: none; }
.vx-retry { margin-top: 8px; padding: 4px 8px; border: 1px solid currentColor; border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.vx-delivery-status { display: inline-flex; align-items: center; gap: 3px; }
.vx-delivery-status[data-status="failed"] { color: var(--vx-danger); }
.vx-inline-retry { padding: 0; border: 0; background: transparent; color: inherit; font-size: 10px; font-weight: 700; text-decoration: underline; cursor: pointer; }
.vx-message-actions { display: inline-flex; align-items: center; gap: 1px; opacity: 0; transition: opacity var(--vx-duration-fast); }
.vx-message:hover .vx-message-actions, .vx-message:focus-within .vx-message-actions { opacity: 1; }
.vx-message-action { width: 25px; height: 25px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 7px; background: transparent; color: var(--vx-text-muted); cursor: pointer; }
.vx-message-action:hover, .vx-message-action[aria-pressed="true"] { background: var(--vx-accent-soft); color: var(--vx-accent-text); }
.vx-date-separator { display: flex; align-items: center; gap: 8px; margin: 18px 0 10px; color: var(--vx-text-muted); font-size: 10px; text-align: center; }
.vx-date-separator::before, .vx-date-separator::after { content: ""; height: 1px; flex: 1; background: var(--vx-border); }

.vx-md p { margin: 0 0 8px; }
.vx-md p:last-child { margin-bottom: 0; }
.vx-md ul, .vx-md ol { margin: 5px 0; padding-left: 20px; }
.vx-md li + li { margin-top: 3px; }
.vx-md code { padding: 2px 4px; border-radius: 5px; background: var(--vx-surface-muted); font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; }
.vx-md pre { max-width: 100%; margin: 7px 0; overflow: auto; padding: 10px; border-radius: 9px; background: #0b1220; color: #e5e7eb; }
.vx-md pre code { padding: 0; background: transparent; color: inherit; white-space: pre; }

.vx-typing { display: flex; align-items: center; gap: 8px; margin: 12px 0 0 36px; color: var(--vx-text-muted); font-size: 11px; }
.vx-typing-dots { display: flex; gap: 3px; padding: 9px 10px; border: 1px solid var(--vx-border); border-radius: 14px 14px 14px 5px; background: var(--vx-surface); }
.vx-typing-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--vx-text-muted); }

.vx-suggestions { display: flex; gap: 6px; overflow-x: auto; padding-top: 9px; scrollbar-width: none; }
.vx-chip { flex: 0 0 auto; max-width: 220px; padding: 7px 10px; overflow: hidden; border: 1px solid var(--vx-border); border-radius: 999px; background: var(--vx-surface); color: var(--vx-text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.vx-chip:hover { border-color: var(--vx-accent); background: var(--vx-accent-soft); color: var(--vx-accent-text); }

.vx-composer-wrap { position: relative; padding: 9px 11px 11px; background: var(--vx-surface); }
.vx-composer { display: flex; flex-direction: column; gap: 2px; padding: 8px; border: 1.5px solid var(--vx-border); border-radius: 18px; background: var(--vx-surface-raised); box-shadow: 0 6px 18px rgba(15, 23, 42, .07); transition: border-color var(--vx-duration-fast), box-shadow var(--vx-duration-fast); }
.vx-composer:focus-within { border-color: var(--vx-accent-solid); box-shadow: 0 0 0 3px var(--vx-accent-ring), 0 8px 22px rgba(15,23,42,.09); }
.vx-input { width: 100%; min-width: 0; min-height: 44px; max-height: 116px; resize: none; padding: 8px 9px 5px; border: 0; outline: 0; background: transparent; color: var(--vx-text); line-height: 20px; }
.vx-input::placeholder { color: var(--vx-text-muted); }
.vx-composer-toolbar { display: flex; align-items: center; justify-content: space-between; }
.vx-composer-options { display: flex; align-items: center; gap: 2px; }
.vx-composer-action { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 11px; background: transparent; cursor: pointer; }
.vx-composer-action:hover { background: var(--vx-surface-muted); }
.vx-send { border-radius: 50%; background: var(--vx-accent-solid); color: var(--vx-accent-fg); box-shadow: 0 4px 12px rgba(15,23,42,.16); transition: transform var(--vx-duration-fast), filter var(--vx-duration-fast); }
.vx-send:hover { background: var(--vx-accent-solid); filter: brightness(.94); }
.vx-send:not(:disabled):active { transform: scale(.92); }
.vx-send:disabled { background: #c7cdd6; color: #fff; box-shadow: none; cursor: not-allowed; opacity: 1; }
.vx-menu { position: absolute; z-index: 2; left: 10px; bottom: 112px; min-width: 210px; padding: 5px; border: 1px solid var(--vx-border); border-radius: 12px; background: var(--vx-surface-raised); box-shadow: 0 12px 30px rgba(15, 23, 42, .14); }
.vx-menu-item { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--vx-danger); text-align: left; cursor: pointer; }
.vx-menu-item:hover { background: var(--vx-danger-soft); }
.vx-menu-item:first-child { color: var(--vx-text); }
.vx-menu-item:first-child:hover { background: var(--vx-surface-muted); }

.vx-attachments { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 4px 8px; }
.vx-file-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 190px; padding: 4px 6px; border: 1px solid var(--vx-border); border-radius: 10px; background: var(--vx-surface-muted); color: var(--vx-text); font-size: 11px; }
.vx-file-preview { width: 34px; height: 34px; object-fit: cover; border-radius: 6px; }
.vx-file-pending { opacity: .6; }
.vx-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vx-file-thumb { width: 22px; height: 22px; flex: 0 0 auto; border-radius: 5px; object-fit: cover; }
.vx-file-remove { width: 18px; height: 18px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--vx-text-muted); cursor: pointer; }
.vx-file-remove:hover { background: var(--vx-danger-soft); color: var(--vx-danger); }
.vx-message-files { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.vx-dropping { outline: 2px dashed var(--vx-accent-solid); outline-offset: -6px; }

.vx-powered { padding: 0 12px 8px; background: var(--vx-surface); color: var(--vx-text-muted); font-size: 9px; text-align: center; }
.vx-powered a { color: inherit; }

.vx-prechat-view, .vx-rating-view { position: relative; min-height: 0; flex: 1; overflow: auto; margin-top: -14px; padding: 32px 24px 28px; border-radius: 18px 18px 0 0; background: var(--vx-surface-muted); }
.vx-prechat-card { padding: 22px; border: 1px solid var(--vx-border); border-radius: 16px; background: var(--vx-surface); box-shadow: 0 10px 32px rgba(15, 23, 42, .07); }
.vx-prechat-card h2 { margin: 0 0 6px; font-size: 18px; }
.vx-prechat-card > p { margin: 0 0 20px; color: var(--vx-text-muted); font-size: 12px; }
.vx-field { margin-top: 14px; }
.vx-field label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
.vx-field input { width: 100%; height: 42px; padding: 0 11px; border: 1px solid var(--vx-border); border-radius: 10px; background: var(--vx-surface); color: var(--vx-text); outline: 0; }
.vx-field input[aria-invalid="true"] { border-color: var(--vx-danger); }
.vx-form-error { min-height: 18px; margin: 8px 0 0; color: var(--vx-danger); font-size: 11px; }
.vx-primary-button { width: 100%; min-height: 42px; margin-top: 10px; padding: 9px 14px; border: 0; border-radius: 11px; background: var(--vx-accent-solid); color: var(--vx-accent-fg); font-weight: 700; cursor: pointer; }
.vx-secondary-button { min-height: 42px; padding: 9px 14px; border: 1px solid var(--vx-border); border-radius: 11px; background: var(--vx-surface); color: var(--vx-text); font-weight: 650; cursor: pointer; }

.vx-rating-card { padding: 22px; border: 1px solid var(--vx-border); border-radius: 16px; background: var(--vx-surface); box-shadow: 0 10px 32px rgba(15, 23, 42, .07); }
.vx-rating-card h2 { margin: 0; font-size: 18px; text-align: center; }
.vx-rating-copy { margin: 7px 0 18px; color: var(--vx-text-muted); font-size: 12px; text-align: center; }
.vx-rating-stars { display: flex; justify-content: center; gap: 4px; margin-bottom: 20px; }
.vx-rating-star { width: 42px; height: 42px; display: grid; place-items: center; padding: 0; border: 0; background: transparent; color: #9ca3af; cursor: pointer; }
.vx-rating-star[data-selected="true"] { color: #d97706; }
.vx-rating-star[data-filled="true"] svg { fill: currentColor; }
.vx-rating-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 650; }
.vx-rating-comment { width: 100%; resize: vertical; padding: 10px; border: 1px solid var(--vx-border); border-radius: 10px; background: var(--vx-surface); color: var(--vx-text); }
.vx-rating-buttons { display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px; margin-top: 6px; }
.vx-rating-buttons .vx-primary-button { margin-top: 0; }
.vx-toast { position: absolute; z-index: 5; right: 12px; bottom: 70px; left: 12px; padding: 10px 12px; border: 1px solid var(--vx-border); border-radius: 10px; background: var(--vx-text); color: var(--vx-surface); box-shadow: 0 10px 24px rgba(15, 23, 42, .18); font-size: 12px; text-align: center; }

.vx-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
:where(button, input, textarea, a):focus-visible { outline: 3px solid var(--vx-accent-ring); outline-offset: 2px; }
.vx-input:focus-visible { outline: 0; }

:host([data-theme="dark"]) { color-scheme: dark; --vx-surface: #111827; --vx-surface-muted: #0b1220; --vx-surface-raised: #172033; --vx-text: #f3f4f6; --vx-text-muted: #aab2c0; --vx-border: #30394a; --vx-danger: #fda29b; --vx-danger-soft: #351817; --vx-accent-soft: var(--vx-accent-soft-dark); --vx-accent-text: var(--vx-accent-text-dark); }
:host([data-theme="dark"]) .vx-brand-avatar { background: #fff; color: var(--vx-accent-text-light); }

@media (prefers-color-scheme: dark) {
  :host([data-theme="auto"]) { color-scheme: dark; --vx-surface: #111827; --vx-surface-muted: #0b1220; --vx-surface-raised: #172033; --vx-text: #f3f4f6; --vx-text-muted: #aab2c0; --vx-border: #30394a; --vx-danger: #fda29b; --vx-danger-soft: #351817; --vx-accent-soft: var(--vx-accent-soft-dark); --vx-accent-text: var(--vx-accent-text-dark); }
  :host([data-theme="auto"]) .vx-brand-avatar { background: #fff; color: var(--vx-accent-text-light); }
}

@media (max-width: 640px) {
  :host { right: 12px; bottom: 12px; left: auto; top: auto; }
  .vx-launcher { width: 56px; height: 56px; }
  .vx-panel { position: fixed; inset: 12px; width: auto; height: auto; max-height: none; }
  :host([data-mobile-fullscreen="true"]) .vx-panel { inset: 0; border-width: 0; border-radius: 0; }
  .vx-icon-button, .vx-composer-action { min-width: 44px; min-height: 44px; }
  .vx-header { min-height: 176px; }
}

@media (prefers-reduced-motion: reduce) {
  :host { --vx-duration-fast: 1ms; --vx-duration-base: 1ms; }
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}

@media (hover: none), (pointer: coarse) {
  .vx-message-actions { opacity: 1; }
}

@media (forced-colors: active) {
  .vx-launcher, .vx-send, .vx-primary-button, .vx-panel, .vx-header, .vx-bubble, .vx-composer, .vx-chip { border: 1px solid ButtonText; }
}

.vx-history-item { width: 100%; padding: 12px; text-align: left; border: 0; border-bottom: 1px solid var(--vx-border); background: transparent; color: var(--vx-text); cursor: pointer; }
.vx-history-item:hover { background: var(--vx-surface); }

@keyframes vx-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } }
`;

let sharedSheet;

export function adoptStyles(root) {
  if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (!sharedSheet) {
      sharedSheet = new CSSStyleSheet();
      sharedSheet.replaceSync(WIDGET_CSS);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sharedSheet];
    return 'adoptedStyleSheets';
  }

  const style = document.createElement('style');
  style.dataset.voxoStyles = '';
  style.textContent = WIDGET_CSS;
  root.appendChild(style);
  return 'style';
}
