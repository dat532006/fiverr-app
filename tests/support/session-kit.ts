import type { AxiosInstance } from 'axios';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { SessionRequestContext } from '../../src/features/auth/public';
import { createHttpClient } from '../../src/infrastructure/http/create-http-client';
import { toUserId } from '../../src/shared/models/user-id';
import { mockServer } from './server';

// Synthetic, non-resolving origin and a plainly synthetic shared token. No captured
// credential, real token or CyberSoft endpoint appears anywhere in the session tests.
export const API_ORIGIN = 'https://session.invalid';
export const SHARED_TOKEN = 'synthetic-shared-token';
const syntheticEnv = {
  VITE_APP_ENV: 'development',
  VITE_API_BASE_URL: API_ORIGIN,
  VITE_CYBERSOFT_TOKEN: SHARED_TOKEN,
};

export const sessionTestClient: AxiosInstance = createHttpClient(syntheticEnv, [API_ORIGIN]);

// A test may swap the transport (for example to simulate a timeout deterministically).
let override: AxiosInstance | null = null;
export function overrideTestClient(client: AxiosInstance | null) {
  override = client;
}
export function currentTestClient(): AxiosInstance {
  return override ?? sessionTestClient;
}

export const PATHS = {
  signin: `${API_ORIGIN}/api/auth/signin`,
  myHires: `${API_ORIGIN}/api/thue-cong-viec/lay-danh-sach-da-thue`,
  user: (id: number | string) => `${API_ORIGIN}/api/users/${id}`,
} as const;

function base64Url(value: string): string {
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// A three-segment token whose every part is plainly synthetic. The signature segment is
// not a signature. Never a real token, never one copied from evidence.
export function makeToken(claims: Record<string, unknown> = {}): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'SYNTHETIC' }));
  const payload = base64Url(JSON.stringify({ synthetic: true, ...claims }));
  return `${header}.${payload}.synthetic-not-a-signature`;
}

export const USER_ID = 4242;
export const SYNTHETIC_PASSWORD_FIELD = 'synthetic-password-field-value';
export const SYNTHETIC_BOOKING = { synthetic: 'booking-job-entry' };

export function userRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Người Dùng Thử',
    email: 'thu@example.invalid',
    password: SYNTHETIC_PASSWORD_FIELD,
    phone: '0900000000',
    birthday: '2000-01-01',
    avatar: '',
    gender: true,
    role: 'USER',
    skill: [],
    certification: [],
    bookingJob: [SYNTHETIC_BOOKING],
    ...overrides,
  };
}

export const USER_TOKEN = makeToken({ id: String(USER_ID) });

export function signinBody(
  user: Record<string, unknown> = {},
  token: string = USER_TOKEN,
): JsonBodyType {
  return { statusCode: 200, content: { user: userRecord(user), token } };
}

export function seedSnapshot(
  overrides: Record<string, unknown> = {},
  storage: Storage = window.sessionStorage,
) {
  storage.setItem(
    'servio-session',
    JSON.stringify({ v: 1, token: USER_TOKEN, userId: USER_ID, role: 'USER', ...overrides }),
  );
}

export function readSnapshotRaw(): string | null {
  return window.sessionStorage.getItem('servio-session');
}

export type CapturedRequest = Readonly<{ method: string; url: string; headers: Headers }>;

// Records every request that reaches the mock server (a request the test did not handle is
// still an error, because the server runs with `onUnhandledRequest: 'error'`).
export function recordRequests(): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  mockServer.events.on('request:start', ({ request }) => {
    captured.push({
      method: request.method,
      url: request.url,
      headers: new Headers(request.headers),
    });
  });
  return captured;
}

export function stopRecordingRequests() {
  mockServer.events.removeAllListeners();
}

export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function okHires(content: unknown = []) {
  return http.get(PATHS.myHires, () => HttpResponse.json({ statusCode: 200, content }));
}

export function okUser(overrides: Record<string, unknown> = {}) {
  return http.get(PATHS.user(USER_ID), () =>
    HttpResponse.json({ statusCode: 200, content: userRecord(overrides) }),
  );
}

export function makeCtx(
  overrides: Partial<{
    accessToken: string;
    epoch: number;
    userId: number;
    isCurrent: () => boolean;
  }> = {},
): SessionRequestContext {
  return {
    userId: toUserId(overrides.userId ?? USER_ID),
    accessToken: overrides.accessToken ?? USER_TOKEN,
    epoch: overrides.epoch ?? 0,
    isCurrent: overrides.isCurrent ?? (() => true),
  };
}

// Types a value in one paste rather than key by key: the field still receives a real input
// event, but a form-heavy test stays fast under a loaded parallel run.
export async function enter(user: UserEvent, field: HTMLElement, value: string) {
  await user.click(field);
  await user.paste(value);
}
