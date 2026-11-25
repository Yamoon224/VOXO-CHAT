import { icon } from './icons.js';

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function initials(name) {
  return String(name || 'Assistant').trim().split(/\s+/).slice(0, 2)
    .map(part => part[0]?.toUpperCase()).join('') || 'AI';
}

export function createAvatar(widget, className, sender = 'bot') {
  const avatar = element('span', className);
  const isAgent = sender === 'agent';
  const isResponder = sender === 'bot' || isAgent;
  const imageUrl = isAgent
    ? widget.getAgentAvatarUrl?.(widget.currentMessageAgentId)
    : widget.getBotAvatarUrl?.() || widget.config.options.ui.avatarUrl || widget.defaultChatIconUrl;
  if (!imageUrl) {
    avatar.textContent = initials(isResponder ? widget.config.name : widget.userInfo?.name || 'Vous');
    return avatar;
  }
  const image = element('img', 'vx-avatar-image');
  image.src = imageUrl;
  image.alt = '';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    avatar.replaceChildren(document.createTextNode(initials(
      isResponder ? widget.config.name : widget.userInfo?.name || 'Vous'
    )));
  }, { once: true });
  avatar.appendChild(image);
  return avatar;
}

export function createBrandAvatar(widget) {
  const group = element('span', 'vx-brand-avatar-group');
  const brand = element('span', 'vx-brand-avatar');
  const logoUrl = widget.getTenantLogoUrl?.() || widget.defaultChatIconUrl;
  if (logoUrl) {
    const image = element('img', 'vx-avatar-image');
    image.src = logoUrl;
    image.alt = '';
    image.addEventListener('error', () => brand.replaceChildren(icon('chat', 26)), { once: true });
    brand.appendChild(image);
  } else {
    brand.appendChild(icon('chat', 26));
  }
  group.appendChild(brand);
  const avatarUrl = widget.getBotAvatarUrl?.() || widget.config.options.ui.avatarUrl;
  if (avatarUrl) {
    const badge = element('span', 'vx-brand-mark');
    const image = element('img', 'vx-avatar-image');
    image.src = avatarUrl;
    image.alt = '';
    image.addEventListener('error', () => badge.remove(), { once: true });
    badge.appendChild(image);
    group.appendChild(badge);
  }
  return group;
}

export function renderLauncherIcon(widget, target = widget.button) {
  if (!target) return;
  if (widget.isOpen) {
    target.replaceChildren(icon('close', 22));
    return;
  }
  const imageUrl = widget.config.options.ui.launcherIconUrl;
  if (!imageUrl) {
    target.replaceChildren(icon('brand', 56));
    return;
  }
  const image = element('img', 'vx-launcher-image');
  image.src = imageUrl;
  image.alt = '';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => target.replaceChildren(icon('brand', 56)), { once: true });
  target.replaceChildren(image);
}
