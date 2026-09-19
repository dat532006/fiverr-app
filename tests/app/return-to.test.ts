import { describe, expect, it } from 'vitest';
import { loginPath } from '../../src/app/routes/paths';
import { sanitizeReturnTo } from '../../src/app/routes/return-to';

describe('TASK-013 T11 sanitizeReturnTo', () => {
  it.each([
    ['/', '/'],
    ['/search', '/search'],
    ['/search?q=logo', '/search?q=logo'],
    ['/job/12', '/job/12'],
    ['/category/1/group/2', '/category/1/group/2'],
    ['/search?q=a%20b#top', '/search?q=a%20b#top'],
  ])('keeps the same-origin path %s', (raw, expected) => {
    expect(sanitizeReturnTo(raw)).toBe(expected);
  });

  it.each([
    ['//evil.example', 'a protocol-relative URL'],
    ['/\\evil.example', 'a slash-backslash URL'],
    ['\\\\evil.example', 'a backslash URL'],
    ['https://evil.example', 'an absolute URL'],
    ['http://evil.example/x', 'an http URL'],
    ['javascript:alert(1)', 'a javascript: URL'],
    ['data:text/html,x', 'a data: URL'],
    ['evil.example', 'a bare host'],
    ['search', 'a relative path'],
    ['', 'an empty string'],
    ['/\t/evil.example', 'a tab-smuggled protocol-relative URL'],
    ['/\n/evil.example', 'a newline-smuggled protocol-relative URL'],
    ['/\r/evil.example', 'a carriage-return-smuggled URL'],
    ['/a\\b', 'a backslash inside the path'],
    ['/login', 'the login page itself'],
    ['/login/', 'the login page with a trailing slash'],
    ['/LOGIN', 'the login page in upper case'],
    ['/login?returnTo=%2Fx', 'the login page with a query'],
    ['/register', 'the register page'],
    ['/register#x', 'the register page with a fragment'],
    ['/a/../login', 'a dot-segment path that resolves to login'],
    [`/${'a'.repeat(2100)}`, 'an over-long path'],
  ])('falls back to / for %s (%s)', (raw) => {
    expect(sanitizeReturnTo(raw)).toBe('/');
  });

  it('falls back to / for null and undefined', () => {
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(undefined)).toBe('/');
  });

  it('never returns anything other than a path with a single leading slash', () => {
    for (const raw of ['/x', '//x', '/%2F%2Fx', '/x//y', 'x']) {
      const result = sanitizeReturnTo(raw);
      expect(result.startsWith('/')).toBe(true);
      expect(result.startsWith('//')).toBe(false);
    }
  });
});

describe('TASK-013 loginPath', () => {
  it('has no query without a return target', () => {
    expect(loginPath()).toBe('/login');
  });

  it('encodes the return target exactly once', () => {
    expect(loginPath('/search?q=a b')).toBe('/login?returnTo=%2Fsearch%3Fq%3Da%20b');
    const url = new URL(loginPath('/search?q=a b'), 'https://x.invalid');
    expect(url.searchParams.get('returnTo')).toBe('/search?q=a b');
  });
});
