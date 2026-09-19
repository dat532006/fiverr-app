import { describe, expect, it } from 'vitest';
import { readTokenHints } from '../../src/features/auth/api/token-hints';
import { makeToken } from '../support/session-kit';

describe('TASK-013 token hints (unverified integrity hints only)', () => {
  it('reads a string id and a numeric exp', () => {
    expect(readTokenHints(makeToken({ id: '42', exp: 1_900_000_000 }))).toEqual({
      id: '42',
      exp: 1_900_000_000,
    });
  });

  it('reads no hint that is absent or of the wrong type', () => {
    expect(readTokenHints(makeToken({}))).toEqual({});
    expect(readTokenHints(makeToken({ id: 42, exp: '1900000000' }))).toEqual({});
    expect(readTokenHints(makeToken({ id: '' }))).toEqual({});
  });

  it('never reads a role from the token', () => {
    expect(readTokenHints(makeToken({ id: '1', role: 'ADMIN' }))).toEqual({ id: '1' });
  });

  it.each([
    ['two segments', 'a.b'],
    ['four segments', 'a.b.c.d'],
    ['an empty payload segment', 'a..c'],
    ['a payload that is not base64', 'a.@@@.c'],
    ['a payload that is not JSON', `a.${btoa('not json')}.c`],
    ['a payload that is a JSON string', `a.${btoa('"text"')}.c`],
    ['no dots', 'opaque'],
    ['empty', ''],
  ])('yields no hints for %s', (_label, token) => {
    expect(readTokenHints(token)).toEqual({});
  });
});
