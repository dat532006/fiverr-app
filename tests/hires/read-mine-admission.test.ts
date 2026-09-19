import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getMyHires } from '../../src/features/hires/api/my-hires.endpoint';
import { readMineAdmission } from '../../src/features/hires/public';
import { SessionRejectedError, StaleSessionError } from '../../src/features/auth/public';
import { AppError } from '../../src/shared/models/app-error';
import { mockServer } from '../support/server';
import {
  PATHS,
  SHARED_TOKEN,
  USER_TOKEN,
  makeCtx,
  okHires,
  recordRequests,
  sessionTestClient,
  stopRecordingRequests,
} from '../support/session-kit';

afterEach(() => stopRecordingRequests());

const read = (ctx = makeCtx()) => readMineAdmission(ctx, { client: sessionTestClient });

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the read to fail');
}

describe('TASK-013 T07 E50 admission read — envelope and error matrix', () => {
  it('admits an empty and a non-empty envelope', async () => {
    mockServer.use(okHires([]));
    expect(await read()).toEqual({ admitted: true, itemCount: 0 });
    mockServer.use(okHires([{ id: 1, congViec: { id: 2 } }]));
    expect(await read()).toEqual({ admitted: true, itemCount: 1 });
  });

  it.each([
    ['a string content on a 200', { statusCode: 200, content: 'oops' }],
    ['a missing content', { statusCode: 200 }],
    ['the flat E46 paging object', { content: { pageIndex: 1, totalRow: 3, data: [] } }],
  ])('%s is a decode failure', async (_label, body) => {
    mockServer.use(http.get(PATHS.myHires, () => HttpResponse.json(body)));
    expect(await failureOf(read())).toEqual(new AppError('decode'));
  });

  it('a 403 with a string content (the verified missing-token case) is forbidden, not "signed out"', async () => {
    mockServer.use(
      http.get(PATHS.myHires, () =>
        HttpResponse.json({ statusCode: 403, content: 'forbidden' }, { status: 403 }),
      ),
    );
    const error = await failureOf(read());
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'forbidden' });
    expect(error).not.toBeInstanceOf(SessionRejectedError);
  });

  it('a 401 is a SessionRejectedError', async () => {
    mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status: 401 })));
    expect(await failureOf(read())).toBeInstanceOf(SessionRejectedError);
  });

  it.each([500, 503])('a %s is the server kind', async (status) => {
    mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status })));
    expect(await failureOf(read())).toMatchObject({ kind: 'server' });
  });

  it.each([400, 404, 409])(
    'another 4xx (%s) is the unknown kind, not a session signal',
    async (status) => {
      mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status })));
      const error = await failureOf(read());
      expect(error).toMatchObject({ kind: 'unknown' });
      expect(error).not.toBeInstanceOf(SessionRejectedError);
    },
  );

  it('no response is the network kind', async () => {
    mockServer.use(http.get(PATHS.myHires, () => HttpResponse.error()));
    expect(await failureOf(read())).toMatchObject({ kind: 'network' });
  });

  it('a timeout is the timeout kind', async () => {
    const client = axios.create({
      adapter: () => Promise.reject(new AxiosError('timeout', 'ECONNABORTED')),
    });
    expect(await failureOf(readMineAdmission(makeCtx(), { client }))).toMatchObject({
      kind: 'timeout',
    });
  });

  it('a failure never carries the request (and so never the user token)', async () => {
    mockServer.use(http.get(PATHS.myHires, () => new HttpResponse(null, { status: 500 })));
    const error = await failureOf(read());
    expect(error).toBeInstanceOf(AppError);
    expect(String(error)).not.toContain(USER_TOKEN);
    expect(JSON.stringify(error)).not.toContain(USER_TOKEN);
    expect(Object.keys(error as object).sort()).toEqual(['kind', 'name']);
  });
});

describe('TASK-013 T08/T09 E50 request', () => {
  it('sends the captured token in the `token` header, plus tokenCybersoft, and never Authorization', async () => {
    const requests = recordRequests();
    mockServer.use(okHires());
    await read();
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.method).toBe('GET');
    expect(request?.url).toBe(PATHS.myHires);
    expect(request?.headers.get('token')).toBe(USER_TOKEN);
    expect(request?.headers.get('tokenCybersoft')).toBe(SHARED_TOKEN);
    expect(request?.headers.has('authorization')).toBe(false);
  });

  it('sends nothing at all when the context is no longer current', async () => {
    const requests = recordRequests();
    mockServer.use(okHires());
    await expect(read(makeCtx({ isCurrent: () => false }))).rejects.toBeInstanceOf(
      StaleSessionError,
    );
    await expect(
      getMyHires(makeCtx({ isCurrent: () => false }), { client: sessionTestClient }),
    ).rejects.toBeInstanceOf(StaleSessionError);
    expect(requests).toHaveLength(0);
  });

  it('checks the context immediately before sending, not earlier', async () => {
    const requests = recordRequests();
    mockServer.use(okHires());
    let current = true;
    const ctx = makeCtx({ isCurrent: () => current });
    const pending = read(ctx);
    current = false;
    // The check ran synchronously inside the call, so this request was already allowed.
    await pending;
    expect(requests).toHaveLength(1);
  });
});
