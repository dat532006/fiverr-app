import { describe, expect, it } from 'vitest';
import {
  UserReadDecodeError,
  decodeUserReadResponse,
} from '../../src/shared/api-contracts/user-read/user-read.dto';
import { SYNTHETIC_BOOKING, SYNTHETIC_PASSWORD_FIELD, userRecord } from '../support/session-kit';

describe('TASK-013 shared E39 wire decoder (allowlist, mints nothing)', () => {
  it('copies only the allowlisted fields and preserves birthday verbatim', () => {
    const dto = decodeUserReadResponse({
      statusCode: 200,
      content: userRecord({ birthday: '2000-01-01T00:00:00.000Z' }),
    });
    expect(Object.keys(dto).sort()).toEqual([
      'avatar',
      'birthday',
      'email',
      'gender',
      'id',
      'name',
      'phone',
      'role',
    ]);
    expect(dto.birthday).toBe('2000-01-01T00:00:00.000Z');
    expect(dto.id).toBe(4242);
    const serialised = JSON.stringify(dto);
    expect(serialised).not.toContain(SYNTHETIC_PASSWORD_FIELD);
    expect(serialised).not.toContain(SYNTHETIC_BOOKING.synthetic);
  });

  it('accepts an empty name (the header shows "Tài khoản" for it)', () => {
    expect(decodeUserReadResponse({ content: userRecord({ name: '' }) }).name).toBe('');
  });

  it('does not mint a UserId: the id stays a number', () => {
    expect(typeof decodeUserReadResponse({ content: userRecord() }).id).toBe('number');
  });

  it.each([
    ['a non-object body', 'text'],
    ['a null body', null],
    ['a missing content', { statusCode: 200 }],
    ['a string content', { content: 'oops' }],
    ['an array content', { content: [] }],
    ['a null content', { content: null }],
    ['a missing id', { content: userRecord({ id: undefined }) }],
    ['a string id', { content: userRecord({ id: '4242' }) }],
    ['a non-finite id', { content: userRecord({ id: Number.NaN }) }],
    ['a missing name', { content: userRecord({ name: undefined }) }],
    ['a non-string name', { content: userRecord({ name: 5 }) }],
    ['a missing role', { content: userRecord({ role: undefined }) }],
    ['a wrong-typed email', { content: userRecord({ email: 7 }) }],
    ['a wrong-typed gender', { content: userRecord({ gender: 'true' }) }],
  ])('rejects %s', (_label, body) => {
    expect(() => decodeUserReadResponse(body)).toThrow(UserReadDecodeError);
  });
});
