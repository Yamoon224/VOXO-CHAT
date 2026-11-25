const paths = {
  brand: '<circle fill="#267CB5" stroke="none" cx="12" cy="12" r="12"/><path fill="#fff" stroke="none" d="M19 7H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h4v3l4-3h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z"/>',
  chat: '<path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H11l-4.75 4v-4.4A3.5 3.5 0 0 1 5 10.5v-4Z"/><path d="M8.5 8.5h.01M12 8.5h.01M15.5 8.5h.01"/>',
  close: '<path d="m7 7 10 10M17 7 7 17"/>',
  chevronDown: '<path d="m7 9 5 5 5-5"/>',
  send: '<path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
  retry: '<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 5v6h-6"/>',
  sparkle: '<path d="m12 3 .8 2.2L15 6l-2.2.8L12 9l-.8-2.2L9 6l2.2-.8L12 3ZM6 12l1.1 2.9L10 16l-2.9 1.1L6 20l-1.1-2.9L2 16l2.9-1.1L6 12Zm11-2 .8 2.2L20 13l-2.2.8L17 16l-.8-2.2L14 13l2.2-.8L17 10Z"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  thumbUp: '<path d="M7 10v10H4V10h3Zm0 9h9.2a2 2 0 0 0 1.9-1.4l1.5-5A2 2 0 0 0 17.7 10H14l.7-3.1A2.4 2.4 0 0 0 12.4 4L7 10Z"/>',
  thumbDown: '<path d="M7 14V4H4v10h3Zm0-9h9.2a2 2 0 0 1 1.9 1.4l1.5 5a2 2 0 0 1-1.9 2.6H14l.7 3.1a2.4 2.4 0 0 1-2.3 2.9L7 14Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m6 12 4 4 8-8"/>',
  alert: '<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  paperclip: '<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7-7l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.8 1.8 0 0 1-2.5-2.5l7.4-7.4"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>'
};

export function icon(name, size = 20) {
  const wrapper = document.createElement('span');
  wrapper.className = 'vx-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.chat}</svg>`;
  return wrapper;
}
