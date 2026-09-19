import { isAxiosError, type AxiosInstance } from 'axios';
import { getHttpClient } from '../../../infrastructure/http/client';
import {
  SessionRejectedError,
  StaleSessionError,
  type SessionRequestContext,
} from '../../auth/public';

const MY_HIRES_PATH = '/api/thue-cong-viec/lay-danh-sach-da-thue';

type GetMyHiresOptions = Readonly<{
  client?: AxiosInstance | undefined;
  signal?: AbortSignal | undefined;
}>;

// E50 transport. The owning adapter chooses the credential class: the user token goes out
// as the `token` header (never `Authorization`, never `Bearer`), taken from the explicit
// request context, which is re-checked immediately before sending. The shared client keeps
// setting only `tokenCybersoft`. The body is returned undecoded: admission and the later
// display read each apply their own purpose-specific decoder.
export async function getMyHires(
  ctx: SessionRequestContext,
  { client = getHttpClient(), signal }: GetMyHiresOptions = {},
): Promise<unknown> {
  if (!ctx.isCurrent()) throw new StaleSessionError();
  try {
    const response = await client.get<unknown>(MY_HIRES_PATH, {
      headers: { token: ctx.accessToken },
      ...(signal && { signal }),
    });
    return response.data;
  } catch (error) {
    // Recognised here, before transport mapping: mapTransportError stays unchanged and
    // never turns a status into "signed out".
    if (isAxiosError(error) && error.response?.status === 401) throw new SessionRejectedError();
    throw error;
  }
}
