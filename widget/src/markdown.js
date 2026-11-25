const MAX_MARKDOWN_LENGTH = 8000;
const INLINE_PATTERN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<]+)/gi;

export function safeUrl(value) {
  const input = String(value || '').trim();
  if (!input || /[\u0000-\u001f\u007f]/.test(input)) return null;
  if (input.startsWith('/') && !input.startsWith('//')) return input;
  try {
    const parsed = new URL(input);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol.toLowerCase())
      ? input
      : null;
  } catch {
    return null;
  }
}

function appendLink(container, label, rawUrl) {
  const href = safeUrl(rawUrl);
  if (!href) {
    container.appendChild(document.createTextNode(label));
    return;
  }
  const link = document.createElement('a');
  link.textContent = label;
  link.href = href;
  if (/^https?:/i.test(href)) link.target = '_blank';
  link.rel = 'noopener noreferrer nofollow';
  container.appendChild(link);
}

function splitTrailingPunctuation(value) {
  const trailing = value.match(/[),.!?;:]+$/)?.[0] || '';
  return {
    url: trailing ? value.slice(0, -trailing.length) : value,
    trailing
  };
}

function appendInline(container, value) {
  let cursor = 0;
  String(value).replace(INLINE_PATTERN, (token, _capture, offset) => {
    container.appendChild(document.createTextNode(value.slice(cursor, offset)));
    cursor = offset + token.length;

    if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      const strong = document.createElement('strong');
      appendInline(strong, token.slice(2, -2));
      container.appendChild(strong);
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      const emphasis = document.createElement('em');
      appendInline(emphasis, token.slice(1, -1));
      container.appendChild(emphasis);
    } else if (token.startsWith('[')) {
      const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) appendLink(container, match[1], match[2]);
      else container.appendChild(document.createTextNode(token));
    } else {
      const { url, trailing } = splitTrailingPunctuation(token);
      appendLink(container, url, url);
      if (trailing) container.appendChild(document.createTextNode(trailing));
    }
    return token;
  });
  container.appendChild(document.createTextNode(value.slice(cursor)));
}

export function renderPlainText(value) {
  const fragment = document.createDocumentFragment();
  String(value ?? '').split('\n').forEach((line, index) => {
    if (index) fragment.appendChild(document.createElement('br'));
    const parts = line.split(/(https?:\/\/[^\s<]+)/gi);
    parts.forEach(part => {
      if (/^https?:\/\//i.test(part)) {
        const { url, trailing } = splitTrailingPunctuation(part);
        appendLink(fragment, url, url);
        if (trailing) fragment.appendChild(document.createTextNode(trailing));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });
  });
  return fragment;
}

export function renderMarkdown(value) {
  const text = String(value ?? '');
  if (text.length > MAX_MARKDOWN_LENGTH) return renderPlainText(text);

  const fragment = document.createDocumentFragment();
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const content = [];
      index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) content.push(lines[index++]);
      if (index < lines.length) index++;
      code.textContent = content.join('\n');
      pre.appendChild(code);
      fragment.appendChild(pre);
      continue;
    }

    const listMatch = line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
        if (!item || /\d+\./.test(item[1]) !== ordered) break;
        const listItem = document.createElement('li');
        appendInline(listItem, item[2]);
        list.appendChild(listItem);
        index++;
      }
      fragment.appendChild(list);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length
      && lines[index].trim()
      && !/^\s*```/.test(lines[index])
      && !/^\s*([-+*]|\d+\.)\s+/.test(lines[index])) {
      paragraphLines.push(lines[index++]);
    }
    const paragraph = document.createElement('p');
    paragraphLines.forEach((paragraphLine, lineIndex) => {
      if (lineIndex) paragraph.appendChild(document.createElement('br'));
      appendInline(paragraph, paragraphLine);
    });
    fragment.appendChild(paragraph);
  }

  return fragment;
}

export function renderMessageContent(value, markdown = false) {
  return markdown ? renderMarkdown(value) : renderPlainText(value);
}
