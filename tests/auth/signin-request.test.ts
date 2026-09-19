import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { postSignin } from '../../src/features/auth/api/signin.endpoint';
import { mockServer } from '../support/server';
import { PATHS, SHARED_TOKEN, sessionTestClient, signinBody } from '../support/session-kit';

afterEach(() => mockServer.events.removeAllListeners());

describe('TASK-013 T08 E02 request', () => {
  it('sends a body of exactly { email, password }, even with extra form values', async () => {
    let body: unknown;
    let headers: Headers | undefined;
    mockServer.use(
      http.post(PATHS.signin, async ({ request }) => {
        body = await request.json();
        headers = new Headers(request.headers);
        return HttpResponse.json(signinBody());
      }),
    );
    const formValues = {
      email: 'thu@example.invalid',
      password: '  keeps  spaces  ',
      rememberMe: true,
      role: 'ADMIN',
      id: 1,
    };
    await postSignin(formValues, { client: sessionTestClient });

    expect(body).toEqual({ email: 'thu@example.invalid', password: '  keeps  spaces  ' });
    expect(Object.keys(body as object).sort()).toEqual(['email', 'password']);
    // Only the shared key goes out: no user token exists yet, and never an Authorization.
    expect(headers?.get('tokenCybersoft')).toBe(SHARED_TOKEN);
    expect(headers?.has('token')).toBe(false);
    expect(headers?.has('authorization')).toBe(false);
  });

  it('puts neither credential in the URL', async () => {
    let url = '';
    mockServer.use(
      http.post(PATHS.signin, ({ request }) => {
        url = request.url;
        return HttpResponse.json(signinBody());
      }),
    );
    await postSignin(
      { email: 'thu@example.invalid', password: 'synthetic-typed-secret' },
      { client: sessionTestClient },
    );
    expect(url).toBe(PATHS.signin);
  });
});
