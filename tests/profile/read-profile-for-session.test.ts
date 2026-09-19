import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { readProfileForSession } from '../../src/features/profile/public';
import { SessionRejectedError, StaleSessionError } from '../../src/features/auth/public';
import { AppError } from '../../src/shared/models/app-error';
import { toUserId } from '../../src/shared/models/user-id';
import { mockServer } from '../support/server';
import {
  PATHS,
  SHARED_TOKEN,
  SYNTHETIC_BOOKING,
  SYNTHETIC_PASSWORD_FIELD,
  USER_ID,
  USER_TOKEN,
  makeCtx,
  okUser,
  recordRequests,
  sessionTestClient,
  stopRecordingRequests,
  userRecord,
} from '../support/session-kit';

afterEach(() => stopRecordingRequests());

const userId = toUserId(USER_ID);
const read = (ctx = makeCtx()) => readProfileForSession(userId, ctx, { client: sessionTestClient });

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the read to fail');
}

describe('TASK-013 T06 SessionProfile holds no secret', () => {
  it('has exactly userId, role and displayName', async () => {
    mockServer.use(okUser());
    const profile = await read();
    expect(profile).toEqual({ userId: '4242', role: 'USER', displayName: 'Người Dùng Thử' });
    expect(Object.keys(profile).sort()).toEqual(['displayName', 'role', 'userId']);
    const serialised = JSON.stringify(profile);
    expect(serialised).not.toContain(SYNTHETIC_PASSWORD_FIELD);
    expect(serialised).not.toContain(SYNTHETIC_BOOKING.synthetic);
    expect(serialised).not.toContain(USER_TOKEN);
  });

  it('maps an unrecognised role to UNKNOWN and keeps an empty name empty', async () => {
    mockServer.use(okUser({ role: 'MODERATOR', name: '' }));
    expect(await read()).toMatchObject({ role: 'UNKNOWN', displayName: '' });
  });

  it('reports ADMIN only when the wire says exactly ADMIN', async () => {
    mockServer.use(okUser({ role: 'ADMIN' }));
    expect((await read()).role).toBe('ADMIN');
  });
});

describe('TASK-013 T07 E39 envelope and error matrix', () => {
  it.each([
    ['a missing content', { statusCode: 200 }],
    ['a string content', { statusCode: 200, content: 'oops' }],
    ['a non-object body', 'text'],
    ['a string id', { content: userRecord({ id: '4242' }) }],
    ['a zero id', { content: userRecord({ id: 0 }) }],
    ['a fractional id', { content: userRecord({ id: 1.5 }) }],
  ])('%s is a decode failure', async (_label, body) => {
    mockServer.use(http.get(PATHS.user(USER_ID), () => HttpResponse.json(body)));
    expect(await failureOf(read())).toEqual(new AppError('decode'));
  });

  it('a 403 is forbidden, not "signed out"', async () => {
    mockServer.use(http.get(PATHS.user(USER_ID), () => new HttpResponse(null, { status: 403 })));
    const error = await failureOf(read());
    expect(error).toMatchObject({ kind: 'forbidden' });
    expect(error).not.toBeInstanceOf(SessionRejectedError);
  });

  it('a 401 is a SessionRejectedError', async () => {
    mockServer.use(http.get(PATHS.user(USER_ID), () => new HttpResponse(null, { status: 401 })));
    expect(await failureOf(read())).toBeInstanceOf(SessionRejectedError);
  });

  it('a 5xx is the server kind, no response the network kind, a timeout the timeout kind', async () => {
    mockServer.use(http.get(PATHS.user(USER_ID), () => new HttpResponse(null, { status: 500 })));
    expect(await failureOf(read())).toMatchObject({ kind: 'server' });
    mockServer.use(http.get(PATHS.user(USER_ID), () => HttpResponse.error()));
    expect(await failureOf(read())).toMatchObject({ kind: 'network' });
    const client = axios.create({
      adapter: () => Promise.reject(new AxiosError('timeout', 'ECONNABORTED')),
    });
    expect(await failureOf(readProfileForSession(userId, makeCtx(), { client }))).toMatchObject({
      kind: 'timeout',
    });
  });

  it('never carries the request or the user token in the failure', async () => {
    mockServer.use(http.get(PATHS.user(USER_ID), () => new HttpResponse(null, { status: 500 })));
    const error = await failureOf(read());
    expect(String(error) + JSON.stringify(error)).not.toContain(USER_TOKEN);
  });
});

describe('TASK-013 T08/T09 E39 request', () => {
  it('takes the path id and the token from the same captured context', async () => {
    const requests = recordRequests();
    mockServer.use(okUser());
    await read();
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.url).toBe(PATHS.user(USER_ID));
    expect(request?.headers.get('token')).toBe(USER_TOKEN);
    expect(request?.headers.get('tokenCybersoft')).toBe(SHARED_TOKEN);
    expect(request?.headers.has('authorization')).toBe(false);
  });

  it('sends nothing when the context is not current', async () => {
    const requests = recordRequests();
    mockServer.use(okUser());
    await expect(read(makeCtx({ isCurrent: () => false }))).rejects.toBeInstanceOf(
      StaleSessionError,
    );
    expect(requests).toHaveLength(0);
  });

  it('sends nothing when the requested id is not the context user', async () => {
    const requests = recordRequests();
    mockServer.use(okUser());
    await expect(
      readProfileForSession(toUserId(USER_ID + 1), makeCtx(), { client: sessionTestClient }),
    ).rejects.toBeInstanceOf(StaleSessionError);
    expect(requests).toHaveLength(0);
  });
});
