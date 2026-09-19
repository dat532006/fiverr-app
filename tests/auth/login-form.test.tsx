import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { LoginPage } from '../../src/features/auth/public';
import { LoginForm } from '../../src/features/auth/components/LoginForm';
import { ConfigurationError } from '../../src/infrastructure/http/config';
import { mockServer } from '../support/server';
import { renderBootstrap } from '../support/render';
import {
  PATHS,
  USER_TOKEN,
  deferred,
  enter,
  overrideTestClient,
  recordRequests,
  signinBody,
  stopRecordingRequests,
} from '../support/session-kit';

vi.mock('../../src/infrastructure/http/client', async () => {
  const kit = await import('../support/session-kit');
  return { getHttpClient: () => kit.currentTestClient() };
});

vi.setConfig({ testTimeout: 20_000 });

afterEach(() => {
  stopRecordingRequests();
  overrideTestClient(null);
});

const EMAIL = 'thu@example.invalid';
const PASSWORD = 'synthetic-typed-secret';
const REJECTED = 'Đăng nhập không thành công. Vui lòng thử lại.';

const emailField = () => screen.getByLabelText('Email') as HTMLInputElement;
const passwordField = () => screen.getByLabelText('Mật khẩu') as HTMLInputElement;
const submit = () => screen.getByRole('button', { name: /^Đăng nhập|^Đang đăng nhập/ });

async function fill(user: ReturnType<typeof userEvent.setup>, email = EMAIL, password = PASSWORD) {
  if (email) await enter(user, emailField(), email);
  if (password) await enter(user, passwordField(), password);
}

function mountPage() {
  return renderBootstrap(<LoginPage returnTo="/" />, '/login');
}

describe('TASK-013 T17 login form — validation and feedback', () => {
  it('shows the field errors on submit, sends nothing, and focuses the first invalid field', async () => {
    const requests = recordRequests();
    const user = userEvent.setup();
    mountPage();
    await user.click(submit());

    expect(await screen.findByText('Vui lòng nhập email.')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeTruthy();
    expect(requests).toHaveLength(0);
    expect(document.activeElement).toBe(emailField());
  });

  it('links each error to its field: aria-invalid plus aria-describedby pointing at the message', async () => {
    const user = userEvent.setup();
    mountPage();
    await user.click(submit());
    await screen.findByText('Vui lòng nhập email.');

    for (const [field, message] of [
      [emailField(), 'Vui lòng nhập email.'],
      [passwordField(), 'Vui lòng nhập mật khẩu.'],
    ] as const) {
      expect(field.getAttribute('aria-invalid')).toBe('true');
      const describedBy = field.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy ?? '')?.textContent).toContain(message);
    }
  });

  it('validates on blur, not on every keystroke', async () => {
    const user = userEvent.setup();
    mountPage();
    await user.type(emailField(), 'not-an-email');
    expect(screen.queryByText('Email chưa đúng định dạng.')).toBeNull();
    await user.tab();
    expect(await screen.findByText('Email chưa đúng định dạng.')).toBeTruthy();
    expect(emailField().getAttribute('aria-invalid')).toBe('true');
  });

  it.each(['plain', 'a@', '@b.com', 'a b@c.com'])('rejects the email format %s', async (value) => {
    const user = userEvent.setup();
    mountPage();
    await fill(user, value, PASSWORD);
    await user.click(submit());
    expect(await screen.findByText('Email chưa đúng định dạng.')).toBeTruthy();
  });

  it('sends the password exactly as typed: never trimmed', async () => {
    let body: { email?: string; password?: string } = {};
    mockServer.use(
      http.post(PATHS.signin, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json(signinBody());
      }),
    );
    const user = userEvent.setup();
    mountPage();
    await fill(user, EMAIL, '  padded secret  ');
    await user.click(submit());
    expect(await screen.findByText('Đã đăng nhập.')).toBeTruthy();
    expect(body).toEqual({ email: EMAIL, password: '  padded secret  ' });
  });

  it('sets the right autocomplete hints and keeps a visible label on every input', () => {
    mountPage();
    expect(emailField().getAttribute('autocomplete')).toBe('username');
    expect(passwordField().getAttribute('autocomplete')).toBe('current-password');
    expect(passwordField().type).toBe('password');
  });

  describe('a server response other than success or a server fault', () => {
    it.each([400, 401, 403, 404])(
      'a %s → one generic form-level summary, no field claimed, values kept, focus on the summary',
      async (status) => {
        mockServer.use(
          http.post(PATHS.signin, () =>
            HttpResponse.json({ statusCode: status, content: 'synthetic' }, { status }),
          ),
        );
        const requests = recordRequests();
        const user = userEvent.setup();
        mountPage();
        await fill(user);
        await user.click(submit());

        const summary = await screen.findByRole('alert');
        expect(summary.textContent).toContain(REJECTED);
        expect(document.activeElement).toBe(summary);
        // No cause is claimed and no field is marked.
        expect(emailField().getAttribute('aria-invalid')).toBeNull();
        expect(passwordField().getAttribute('aria-invalid')).toBeNull();
        expect(screen.queryByText('Vui lòng nhập email.')).toBeNull();
        // Values are kept for another try.
        expect(emailField().value).toBe(EMAIL);
        expect(passwordField().value).toBe(PASSWORD);
        expect(requests).toHaveLength(1);
        // Never echoes the password.
        expect(document.body.innerHTML).not.toContain('synthetic-detail');
        expect(summary.textContent).not.toContain(PASSWORD);
      },
    );

    it('moves focus to the summary again on a repeated identical failure', async () => {
      mockServer.use(http.post(PATHS.signin, () => new HttpResponse(null, { status: 401 })));
      const user = userEvent.setup();
      mountPage();
      await fill(user);
      await user.click(submit());
      const first = await screen.findByRole('alert');
      expect(document.activeElement).toBe(first);
      await user.click(passwordField());
      await user.click(submit());
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));
    });
  });

  it.each([
    [
      'a 5xx',
      () => new HttpResponse(null, { status: 503 }),
      'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    ],
    [
      'no response',
      () => HttpResponse.error(),
      'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.',
    ],
    [
      'an undecodable 200',
      () => HttpResponse.json({ statusCode: 200, content: 'oops' }),
      'Không đọc được dữ liệu trả về.',
    ],
  ])('%s → the fixed AppError copy for that kind', async (_label, respond, copy) => {
    mockServer.use(http.post(PATHS.signin, respond));
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.click(submit());
    const summary = await screen.findByRole('alert');
    expect(summary.textContent).toContain(copy);
    expect(emailField().value).toBe(EMAIL);
    expect(passwordField().value).toBe(PASSWORD);
  });

  it('a configuration failure uses the fixed configuration copy and sends nothing', async () => {
    overrideTestClient(axios.create({ adapter: () => Promise.reject(new ConfigurationError()) }));
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.click(submit());
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Cấu hình kết nối chưa hợp lệ.',
    );
  });

  it('shows the pending state: "Đang đăng nhập…", disabled, one request, stable width class', async () => {
    const gate = deferred();
    const requests = recordRequests();
    mockServer.use(
      http.post(PATHS.signin, async () => {
        await gate.promise;
        return HttpResponse.json(signinBody());
      }),
    );
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    const before = submit();
    const widthClass = before.className.split(' ').filter((name) => name.startsWith('w-'));
    await user.click(before);

    const pending = await screen.findByRole('button', { name: 'Đang đăng nhập…' });
    expect((pending as HTMLButtonElement).disabled).toBe(true);
    expect(pending.className.split(' ').filter((name) => name.startsWith('w-'))).toEqual(
      widthClass,
    );
    expect(pending.closest('form')?.getAttribute('aria-busy')).toBe('true');
    expect(requests).toHaveLength(1);
    gate.resolve();
    // Let the sign-in finish so nothing is written after the test ends.
    expect(await screen.findByText('Đã đăng nhập.')).toBeTruthy();
  });

  it('Enter plus a double click still sends exactly one E02', async () => {
    const gate = deferred();
    const requests = recordRequests();
    mockServer.use(
      http.post(PATHS.signin, async () => {
        await gate.promise;
        return HttpResponse.json(signinBody());
      }),
    );
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.keyboard('{Enter}');
    await user.dblClick(submit());
    await user.keyboard('{Enter}');
    await new Promise((done) => setTimeout(done, 30));
    gate.resolve();
    expect(await screen.findByText('Đã đăng nhập.')).toBeTruthy();
    expect(requests.filter((request) => request.url === PATHS.signin)).toHaveLength(1);
  });
});

describe('TASK-013 T13 timeout and offline', () => {
  it('a timeout shows the failure and stays at exactly one request through refocus and an online event', async () => {
    let calls = 0;
    overrideTestClient(
      axios.create({
        adapter: () => {
          calls += 1;
          return Promise.reject(new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED'));
        },
      }),
    );
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.click(submit());

    const summary = await screen.findByRole('alert');
    expect(summary.textContent).toContain('Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
    expect(calls).toBe(1);

    // No automatic resend on timers, window refocus, visibility change or reconnection.
    await new Promise((done) => setTimeout(done, 80));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
    await new Promise((done) => setTimeout(done, 80));
    expect(calls).toBe(1);
    expect(emailField().value).toBe(EMAIL);
    expect(passwordField().value).toBe(PASSWORD);
  });

  it('offline → the offline copy, values kept, and NOTHING is sent', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const requests = recordRequests();
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.click(submit());

    const summary = await screen.findByRole('alert');
    expect(summary.textContent).toContain('Bạn đang ngoại tuyến. Hãy kết nối mạng rồi thử lại.');
    expect(document.activeElement).toBe(summary);
    expect(requests).toHaveLength(0);
    expect(emailField().value).toBe(EMAIL);
    expect(passwordField().value).toBe(PASSWORD);
    expect((submit() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('TASK-013 T17 the password does not outlive the form', () => {
  it('is cleared after a successful sign-in', async () => {
    mockServer.use(http.post(PATHS.signin, () => HttpResponse.json(signinBody())));
    const user = userEvent.setup();
    renderBootstrap(<LoginForm />, '/login');
    await fill(user);
    await user.click(submit());
    await waitFor(() => expect(passwordField().value).toBe(''));
    expect(document.body.innerHTML).not.toContain(PASSWORD);
    expect(document.body.innerHTML).not.toContain(USER_TOKEN);
  });

  it('is gone from the document on unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderBootstrap(<LoginForm />, '/login');
    await enter(user, passwordField(), PASSWORD);
    unmount();
    expect(document.body.innerHTML).not.toContain(PASSWORD);
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('never reaches the DOM as text, an attribute or an error message on a failed attempt', async () => {
    mockServer.use(http.post(PATHS.signin, () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    mountPage();
    await fill(user);
    await user.click(submit());
    await screen.findByRole('alert');
    const html = document.body.outerHTML;
    // The controlled password input holds its value as a property, not markup text.
    expect(html.replace(/value="[^"]*"/g, '')).not.toContain(PASSWORD);
  });
});
