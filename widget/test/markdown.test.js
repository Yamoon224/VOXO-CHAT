import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { markdownCases, xssCases } from '../../shared/markdown-corpus.mjs';

function withDocument(run) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    run(dom.window.document);
  } finally {
    dom.window.close();
  }
}

test('renders the supported Markdown subset as DOM nodes', async () => {
  const { renderMarkdown } = await import('../src/markdown.js');
  withDocument(() => {
    for (const entry of markdownCases) {
      const container = document.createElement('div');
      container.appendChild(renderMarkdown(entry.input));
      const match = container.querySelector(entry.selector);
      assert.ok(match, `Missing ${entry.selector} for ${entry.input}`);
      assert.match(match.textContent, new RegExp(entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

test('keeps hostile HTML and URLs inert', async () => {
  const { renderMarkdown } = await import('../src/markdown.js');
  withDocument(() => {
    for (const input of xssCases) {
      const container = document.createElement('div');
      container.appendChild(renderMarkdown(input));
      assert.equal(container.querySelector('script,img,svg'), null, input);
      assert.equal([...container.querySelectorAll('*')].some(node => (
        [...node.attributes].some(attribute => attribute.name.startsWith('on'))
      )), false, input);
      assert.equal([...container.querySelectorAll('a')].some(link => (
        ['javascript:', 'data:', 'vbscript:'].includes(new URL(link.href).protocol)
      )), false, input);
    }
  });
});

test('falls back to plain text for oversized messages', async () => {
  const { renderMarkdown } = await import('../src/markdown.js');
  withDocument(() => {
    const container = document.createElement('div');
    container.appendChild(renderMarkdown(`**${'a'.repeat(9000)}**`));
    assert.equal(container.querySelector('strong'), null);
    assert.match(container.textContent, /^\*\*/);
  });
});
