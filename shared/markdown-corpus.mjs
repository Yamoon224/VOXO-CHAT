export const markdownCases = [
  { input: '**gras**', selector: 'strong', text: 'gras' },
  { input: '_italique_', selector: 'em', text: 'italique' },
  { input: '`code`', selector: 'code', text: 'code' },
  { input: '```js\nconst a = 1 < 2;\n```', selector: 'pre code', text: 'const a = 1 < 2;' },
  { input: '- un\n- deux', selector: 'ul li', text: 'un' },
  { input: '1. un\n2. deux', selector: 'ol li', text: 'un' },
  { input: '[VOXO](https://voxo.fr)', selector: 'a[href="https://voxo.fr"]', text: 'VOXO' }
];

export const xssCases = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '[x](javascript:alert(1))',
  '[x](JaVaScRiPt:alert(1))',
  '[x](data:text/html,alert(1))',
  '[x](vbscript:alert(1))',
  '[x](//evil.example)',
  '[x](https://safe.example" onmouseover="alert(1))',
  '**<svg onload=alert(1)>**'
];
