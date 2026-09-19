import axios, { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { SigninDecodeError } from '../../src/features/auth/api/signin.dto';
import { postSignin } from '../../src/features/auth/api/signin.endpoint';
import { classifySigninFailure } from '../../src/features/auth/model/map-signin-failure';
import { ConfigurationError } from '../../src/infrastructure/http/config';
import { AppError } from '../../src/shared/models/app-error';
import { mockServer } from '../support/server';
import { PATHS, USER_TOKEN, sessionTestClient, signinBody } from '../support/session-kit';

const credentials = { email: 'thu@example.invalid', password: 'synthetic-typed-secret' };
const send = () => postSignin(credentials, { client: sessionTestClient });

async function outcomeOf(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('expected the sign-in to fail');
  } catch (error) {
    return classifySigninFailure(error);
  }
}

describe('TASK-013 T07 E02 endpoint matrix', () => {
  it('decodes a 200 into the token and the allowlisted user', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
    const dto = await send();
    expect(dto.token).toBe(USER_TOKEN);
    expect(dto.user.id).toBe(4242);
  });

  it.each([
    ['a missing content', { statusCode: 200 }],
    ['a string content', { statusCode: 200, content: 'oops' }],
    ['an empty token', { statusCode: 200, content: { user: signinBody(), token: '' } }],
    ['a missing user', { statusCode: 200, content: { token: USER_TOKEN } }],
  ])('a 200 with %s is a decode failure with the fixed decode copy', async (_label, body) => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(body)));
    await expect(send()).rejects.toBeInstanceOf(SigninDecodeError);
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(body)));
    const failure = await outcomeOf(send());
    expect(failure).toEqual({ kind: 'failed', error: new AppError('decode') });
  });

  it.each([400, 401, 403, 404, 409, 422])(
    'a %s is one generic rejection that claims no cause',
    async (status) => {
      mockServer.use(
        http.post(PATHS.signin, () =>
          HttpResponse.json({ statusCode: status, content: 'synthetic-detail' }, { status }),
        ),
      );
      expect(await outcomeOf(send())).toEqual({ kind: 'rejected' });
    },
  );

  it.each([500, 502, 503])('a %s uses the fixed server copy', async (status) => {
    mockServer.use(http.post(PATHS.signin, () => new HttpResponse(null, { status })));
    const failure = await outcomeOf(send());
    expect(failure).toMatchObject({ kind: 'failed', error: { kind: 'server' } });
  });

  it('no response uses the fixed network copy', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.error()));
    const failure = await outcomeOf(send());
    expect(failure).toMatchObject({ kind: 'failed', error: { kind: 'network' } });
  });

  it('a transport timeout uses the fixed timeout copy', async () => {
    const client = axios.create({
      adapter: () => Promise.reject(new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED')),
    });
    const failure = await outcomeOf(postSignin(credentials, { client }));
    expect(failure).toMatchObject({ kind: 'failed', error: { kind: 'timeout' } });
  });

  it('a configuration failure uses the fixed configuration copy', async () => {
    const client = axios.create({ adapter: () => Promise.reject(new ConfigurationError()) });
    const failure = await outcomeOf(postSignin(credentials, { client }));
    expect(failure).toMatchObject({ kind: 'failed', error: { kind: 'configuration' } });
  });

  it('never leaks the password or the token into a failure the UI can render', async () => {
    mockServer.use(http.post(PATHS.signin, () => new HttpResponse(null, { status: 500 })));
    const failure = await outcomeOf(send());
    const rendered = JSON.stringify(failure) + String(failure.kind === 'failed' && failure.error);
    expect(rendered).not.toContain(credentials.password);
    expect(rendered).not.toContain(USER_TOKEN);
  });
});
