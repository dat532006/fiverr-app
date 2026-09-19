import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot } from '../../src/features/auth/model/snapshot';
import { toUserId } from '../../src/shared/models/user-id';
import { makeToken } from '../support/session-kit';

const token = makeToken({ id: '7' });
const valid = { v: 1, token, userId: 7, role: 'USER' };

describe('TASK-013 T10 snapshot v1 (untrusted input)', () => {
  it('round-trips exactly v, token, userId, role and an optional exp', () => {
    const raw = encodeSnapshot({ token, userId: toUserId(7), role: 'ADMIN', exp: 1_900_000_000 });
    expect(JSON.parse(raw)).toEqual({
      v: 1,
      token,
      userId: 7,
      role: 'ADMIN',
      exp: 1_900_000_000,
    });
    expect(decodeSnapshot(raw)).toEqual({
      token,
      userId: '7',
      role: 'ADMIN',
      exp: 1_900_000_000,
    });
  });

  it('omits exp when there is none', () => {
    const raw = encodeSnapshot({ token, userId: toUserId(7), role: 'USER' });
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['role', 'token', 'userId', 'v']);
  });

  it('accepts UNKNOWN as a role without upgrading it', () => {
    expect(decodeSnapshot(JSON.stringify({ ...valid, role: 'UNKNOWN' }))?.role).toBe('UNKNOWN');
  });

  it.each([
    ['not JSON', 'not json at all'],
    ['empty string', ''],
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"token"'],
    ['unknown schema version', JSON.stringify({ ...valid, v: 2 })],
    ['missing version', JSON.stringify({ token, userId: 7, role: 'USER' })],
    ['a string version', JSON.stringify({ ...valid, v: '1' })],
    ['empty token', JSON.stringify({ ...valid, token: '' })],
    ['non-string token', JSON.stringify({ ...valid, token: 12 })],
    ['zero user id', JSON.stringify({ ...valid, userId: 0 })],
    ['negative user id', JSON.stringify({ ...valid, userId: -3 })],
    ['fractional user id', JSON.stringify({ ...valid, userId: 1.5 })],
    ['unsafe user id', JSON.stringify({ ...valid, userId: 2 ** 53 })],
    ['string user id', JSON.stringify({ ...valid, userId: '7' })],
    ['unknown role', JSON.stringify({ ...valid, role: 'SUPERUSER' })],
    ['lower-case role', JSON.stringify({ ...valid, role: 'admin' })],
    ['missing role', JSON.stringify({ v: 1, token, userId: 7 })],
    ['string exp', JSON.stringify({ ...valid, exp: '1900000000' })],
    ['extra key', JSON.stringify({ ...valid, displayName: 'x' })],
    ['a stored password', JSON.stringify({ ...valid, password: 'x' })],
  ])('rejects %s as a whole', (_label, raw) => {
    expect(decodeSnapshot(raw)).toBeNull();
  });
});
