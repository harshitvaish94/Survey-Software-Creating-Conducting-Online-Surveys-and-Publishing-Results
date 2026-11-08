import { describe, expect, it } from 'vitest';
import { SanitizePipe, sanitize } from './sanitize';

describe('sanitize (SMS-33)', () => {
  it('removes NUL and other control characters but keeps tabs and line breaks', () => {
    expect(sanitize('Bad\u0000ti\u0007tle\u007f')).toBe('Badtitle');
    expect(sanitize('line 1\nline 2\r\n\tindented')).toBe(
      'line 1\nline 2\r\n\tindented',
    );
  });

  it('leaves normal text, unicode and HTML-looking text unchanged (React escapes it on output)', () => {
    for (const s of [
      'Café – naïve 😀',
      "O'Brien",
      '<script>alert(1)</script>',
      "' OR 1=1 --",
    ]) {
      expect(sanitize(s)).toBe(s);
    }
  });

  it('cleans strings inside nested objects and arrays', () => {
    expect(
      sanitize({
        title: 'a\u0000b',
        questions: [{ text: 'q\u0000', options: ['x\u0001'] }],
      }),
    ).toEqual({
      title: 'ab',
      questions: [{ text: 'q', options: ['x'] }],
    });
  });

  it('drops prototype-polluting keys', () => {
    const input = JSON.parse(
      '{"title":"t","__proto__":{"admin":true},"constructor":{"x":1},"nested":{"prototype":1}}',
    );
    const clean = sanitize(input) as Record<string, unknown>;
    expect(clean).toEqual({ title: 't', nested: {} });
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });

  it('passes numbers, booleans and null through', () => {
    expect(sanitize({ n: 4, b: true, z: null })).toEqual({
      n: 4,
      b: true,
      z: null,
    });
  });

  it('stops at a maximum depth instead of recursing forever', () => {
    let deep: unknown = 'x\u0000';
    for (let i = 0; i < 30; i++) deep = [deep];
    expect(() => sanitize(deep)).not.toThrow();
  });
});

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();
  it('cleans bodies and query strings only', () => {
    expect(pipe.transform({ a: 'x\u0000' }, { type: 'body' })).toEqual({
      a: 'x',
    });
    expect(pipe.transform({ q: 'x\u0000' }, { type: 'query' })).toEqual({
      q: 'x',
    });
    expect(pipe.transform('7\u0000', { type: 'param' })).toBe('7\u0000');
  });
});

describe('allowedOrigins (CORS)', () => {
  it('keeps the SMS-24 local origins and adds FRONTEND_ORIGIN, comma-separated, without duplicates', async () => {
    const { allowedOrigins } = await import('../app.setup');
    expect(allowedOrigins({})).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://10.249.140.189:5173',
    ]);
    expect(
      allowedOrigins({
        FRONTEND_ORIGIN: 'https://app.example.com, https://staging.example.com',
      }),
    ).toEqual([
      'https://app.example.com',
      'https://staging.example.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://10.249.140.189:5173',
    ]);
  });
});
