import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtml, truncateText } from '../src/lib/sanitize';

describe('sanitizeHtml', () => {
  it('strips <script> tags and their contents', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).not.toContain('alert');
    expect(sanitizeHtml('<script src=evil.js></script>hello')).toBe('hello');
  });

  it('strips <style> tags', () => {
    expect(sanitizeHtml('<style>body{display:none}</style><p>x</p>')).not.toContain('display:none');
  });

  it('removes inline event handlers', () => {
    expect(sanitizeHtml('<img src="ok.png" onerror="alert(1)">')).not.toContain('onerror');
    expect(sanitizeHtml('<a href="#" onclick="bad()">x</a>')).not.toContain('onclick');
    expect(sanitizeHtml('<div onmouseover=alert(1)>x</div>')).not.toContain('onmouseover');
  });

  it('neutralises javascript: URLs in href/src', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('neutralises entity-encoded javascript: URLs', () => {
    const out = sanitizeHtml('<a href="&#x6A;avascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
    expect(out).not.toMatch(/&#x6a;avascript/i);
  });

  it('neutralises vbscript: URLs', () => {
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>')).not.toContain('vbscript:');
  });

  it('strips the style attribute entirely', () => {
    const out = sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('javascript');
  });

  it('allows data:image/png base64 in img src', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">');
    expect(out).toContain('data:image/png');
  });

  it('rejects data:text/html URIs', () => {
    const out = sanitizeHtml('<iframe src="data:text/html,<script>alert(1)</script>"></iframe>');
    // src cleared, body wiped — neither original URI nor inline script survive
    expect(out).not.toContain('text/html');
    expect(out).not.toContain('alert(1)');
  });

  it('keeps iframes from allowlisted hosts', () => {
    const out = sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>');
    expect(out).toContain('youtube.com/embed/abc');
  });

  it('clears src on non-allowlisted iframe hosts', () => {
    const out = sanitizeHtml('<iframe src="https://evil.example.com/clickjack"></iframe>');
    expect(out).not.toContain('evil.example.com');
    expect(out).toContain('src=""');
  });

  it('preserves benign markup unchanged', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes all tags', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>a</p>\n\n  <p>b</p>')).toBe('a b');
  });
});

describe('truncateText', () => {
  it('returns input under limit unchanged', () => {
    expect(truncateText('short', 100)).toBe('short');
  });

  it('truncates at word boundary with ellipsis', () => {
    const out = truncateText('one two three four five six seven', 12);
    expect(out.endsWith('...')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(15);
  });
});
