import { describe, it, expect } from 'vitest';
import { parseParams, findShortcodes, replaceShortcode } from '../src/lib/shortcodes/parser';

describe('parseParams', () => {
  it('parses key=value pairs', () => {
    expect(parseParams('sayi=6 format=kart')).toEqual({ sayi: '6', format: 'kart' });
  });

  it('parses quoted values with spaces', () => {
    expect(parseParams('kategori="my slug" baska=ok')).toEqual({
      kategori: 'my slug',
      baska: 'ok',
    });
  });

  it('treats bare flags as truthy', () => {
    expect(parseParams('full-width sayi=3')).toEqual({ 'full-width': 'true', sayi: '3' });
  });

  it('returns empty object for blank input', () => {
    expect(parseParams('')).toEqual({});
    expect(parseParams('   ')).toEqual({});
  });

  it('handles single-quoted values', () => {
    expect(parseParams("name='hello world'")).toEqual({ name: 'hello world' });
  });
});

describe('findShortcodes', () => {
  it('finds a bare tag with no params', () => {
    const sc = findShortcodes('Before [son-yazilar] after');
    expect(sc).toHaveLength(1);
    expect(sc[0].name).toBe('son-yazilar');
    expect(sc[0].params).toEqual({});
  });

  it('finds a tag with params', () => {
    const sc = findShortcodes('[kategori slug=teknoloji sayi=5]');
    expect(sc).toHaveLength(1);
    expect(sc[0].name).toBe('kategori');
    expect(sc[0].params).toEqual({ slug: 'teknoloji', sayi: '5' });
  });

  it('finds a tag with inner content', () => {
    const sc = findShortcodes('[ozel-html]<p>hi</p>[/ozel-html]');
    expect(sc).toHaveLength(1);
    expect(sc[0].name).toBe('ozel-html');
    expect(sc[0].innerContent).toBe('<p>hi</p>');
  });

  it('finds multiple shortcodes in order', () => {
    const sc = findShortcodes('[a] mid [b param=1] end');
    expect(sc.map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('returns empty array when no shortcodes', () => {
    expect(findShortcodes('plain text')).toEqual([]);
    expect(findShortcodes('')).toEqual([]);
  });
});

describe('replaceShortcode', () => {
  it('replaces a shortcode with its rendered output', () => {
    const sc = findShortcodes('Pre [son-yazilar] Post')[0];
    expect(replaceShortcode('Pre [son-yazilar] Post', sc, '<ul>x</ul>')).toBe(
      'Pre <ul>x</ul> Post'
    );
  });
});
