import type { AxiosInstance } from 'axios';
import { getHttpClient } from '../../../infrastructure/http/client';
import { decodeSigninResponse, type SigninDto } from './signin.dto';

const SIGNIN_PATH = '/api/auth/signin';

export type SigninCredentials = Readonly<{ email: string; password: string }>;

type PostSigninOptions = Readonly<{
  client?: AxiosInstance;
  signal?: AbortSignal;
}>;

// A direct credential command, not a query or a TanStack mutation: the credentials must
// not sit in mutation variables or a cache. Only `tokenCybersoft` is sent (by the shared
// client); the user token does not exist yet. Errors are left raw for the caller to map,
// and are never stored, because an Axios error carries the request body.
export async function postSignin(
  credentials: SigninCredentials,
  { client = getHttpClient(), signal }: PostSigninOptions = {},
): Promise<SigninDto> {
  // The body is exactly these two keys, whatever else the caller's form state holds.
  const body = { email: credentials.email, password: credentials.password };
  const response = await client.post<unknown>(SIGNIN_PATH, body, signal ? { signal } : {});
  return decodeSigninResponse(response.data);
}
