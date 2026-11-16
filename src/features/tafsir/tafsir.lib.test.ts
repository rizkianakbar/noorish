// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './tafsir.lib.ts';

describe('sanitizeHtml', () => {
  it('drops scripts, styles and every attribute, and unwraps unknown tags', () => {
    expect(
      sanitizeHtml(
        '<img src=x onerror=alert(1)><script>x()</script><style>p{}</style><p style="color:red">ok <a href="javascript:x">link</a></p>',
      ),
    ).toBe('<p>ok link</p>');
  });

  it('keeps raw-text tricks as escaped text', () => {
    expect(sanitizeHtml('<textarea><img src=x onerror=alert(1)></textarea>')).not.toContain('<img');
  });
});
