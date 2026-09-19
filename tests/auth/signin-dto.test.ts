import { describe, expect, it } from 'vitest';
import { SigninDecodeError, decodeSigninResponse } from '../../src/features/auth/api/signin.dto';
import { mapSigninIdentity, toSessionRole } from '../../src/features/auth/model/map-signin';
import {
  SHARED_TOKEN,
  SYNTHETIC_BOOKING,
  SYNTHETIC_PASSWORD_FIELD,
  USER_TOKEN,
  signinBody,
  userRecord,
} from '../support/session-kit';

const envelope = (body: unknown) => body as never;

describe('TASK-013 T06/T07 E02 strict decoder and safe identity', () => {
  it('decodes content.user and content.token', () => {
    const dto = decodeSigninResponse(envelope(signinBody()));
    expect(dto.token).toBe(USER_TOKEN);
    expect(dto.user).toMatchObject({ id: 4242, name: 'Người Dùng Thử', role: 'USER' });
  });

  it('copies only the allowlisted user fields: password, skill, certification, bookingJob stay behind', () => {
    const { user } = decodeSigninResponse(envelope(signinBody()));
    expect(Object.keys(user).sort()).toEqual([
      'avatar',
      'birthday',
      'email',
      'gender',
      'id',
      'name',
      'phone',
      'role',
    ]);
    const serialised = JSON.stringify(user);
    expect(serialised).not.toContain(SYNTHETIC_PASSWORD_FIELD);
    expect(serialised).not.toContain(SYNTHETIC_BOOKING.synthetic);
  });

  it('SafeIdentity holds only id, role and display name — no password, token or user record', () => {
    const dto = decodeSigninResponse(envelope(signinBody()));
    const identity = mapSigninIdentity(dto.user);
    expect(identity).toEqual({ userId: '4242', role: 'USER', displayName: 'Người Dùng Thử' });
    const serialised = JSON.stringify(identity);
    expect(serialised).not.toContain(SYNTHETIC_PASSWORD_FIELD);
    expect(serialised).not.toContain(USER_TOKEN);
    expect(serialised).not.toContain(SHARED_TOKEN);
  });

  it('maps an unrecognised role to UNKNOWN, never to USER or ADMIN', () => {
    expect(toSessionRole('USER')).toBe('USER');
    expect(toSessionRole('ADMIN')).toBe('ADMIN');
    expect(toSessionRole('admin')).toBe('UNKNOWN');
    expect(toSessionRole('')).toBe('UNKNOWN');
    expect(toSessionRole('MODERATOR')).toBe('UNKNOWN');
  });

  it('treats a null optional field as absent but a wrong-typed one as a decode failure', () => {
    const lenient = decodeSigninResponse(
      envelope(signinBody({ avatar: null, phone: undefined, birthday: null })),
    );
    expect(lenient.user).not.toHaveProperty('avatar');
    expect(lenient.user).not.toHaveProperty('phone');
    expect(() => decodeSigninResponse(envelope(signinBody({ email: 5 })))).toThrow(
      SigninDecodeError,
    );
    expect(() => decodeSigninResponse(envelope(signinBody({ gender: 'yes' })))).toThrow(
      SigninDecodeError,
    );
  });

  it.each([
    ['a non-object body', 'text'],
    ['a null body', null],
    ['an array body', []],
    ['a missing content', { statusCode: 200 }],
    ['a string content', { statusCode: 200, content: 'oops' }],
    ['a null content', { statusCode: 200, content: null }],
    ['an array content', { statusCode: 200, content: [] }],
    ['a missing user', { content: { token: USER_TOKEN } }],
    ['a null user', { content: { user: null, token: USER_TOKEN } }],
    ['an array user', { content: { user: [], token: USER_TOKEN } }],
    ['a missing token', { content: { user: userRecord() } }],
    ['an empty token', { content: { user: userRecord(), token: '' } }],
    ['a non-string token', { content: { user: userRecord(), token: 12 } }],
    ['a string user id', { content: { user: userRecord({ id: '4242' }), token: USER_TOKEN } }],
    ['a non-finite user id', { content: { user: userRecord({ id: null }), token: USER_TOKEN } }],
    ['a missing name', { content: { user: userRecord({ name: undefined }), token: USER_TOKEN } }],
    ['a missing role', { content: { user: userRecord({ role: undefined }), token: USER_TOKEN } }],
  ])('rejects %s as a decode failure', (_label, body) => {
    expect(() => decodeSigninResponse(body)).toThrow(SigninDecodeError);
  });

  it('a user id that is not a positive safe integer never becomes an identity', () => {
    for (const id of [0, -5, 1.5]) {
      const dto = decodeSigninResponse(envelope(signinBody({ id })));
      expect(() => mapSigninIdentity(dto.user)).toThrow(SigninDecodeError);
    }
  });

  it('the decode error message never contains the token or the password', () => {
    try {
      decodeSigninResponse({ content: { user: userRecord({ id: 'x' }), token: USER_TOKEN } });
      throw new Error('expected a decode failure');
    } catch (error) {
      expect(String(error)).not.toContain(USER_TOKEN);
      expect(String(error)).not.toContain(SYNTHETIC_PASSWORD_FIELD);
    }
  });
});
