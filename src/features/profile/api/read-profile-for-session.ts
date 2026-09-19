import { isAxiosError, type AxiosInstance } from 'axios';
import { getHttpClient } from '../../../infrastructure/http/client';
import { mapTransportError } from '../../../infrastructure/http/map-transport-error';
import { decodeUserReadResponse } from '../../../shared/api-contracts/user-read/user-read.dto';
import { AppError } from '../../../shared/models/app-error';
import type { UserId } from '../../../shared/models/user-id';
import {
  SessionRejectedError,
  StaleSessionError,
  type SessionRequestContext,
} from '../../auth/public';
import { mapSessionProfile, type SessionProfile } from '../model/session-profile';

type ReadProfileForSessionOptions = Readonly<{
  client?: AxiosInstance | undefined;
  signal?: AbortSignal | undefined;
}>;

// E39 consistency read for session restore. Success alone never authenticates: the caller
// compares the returned identity with the snapshot. The user token goes out as the `token`
// header from the explicit context, and the path id is the same captured user id.
// Rejects with SessionRejectedError (HTTP 401), StaleSessionError (nothing sent) or an
// AppError.
export async function readProfileForSession(
  userId: UserId,
  ctx: SessionRequestContext,
  { client = getHttpClient(), signal }: ReadProfileForSessionOptions = {},
): Promise<SessionProfile> {
  // A user id that is not the captured context's, or a context that is no longer current,
  // sends nothing.
  if (userId !== ctx.userId || !ctx.isCurrent()) throw new StaleSessionError();

  let body: unknown;
  try {
    const response = await client.get<unknown>(`/api/users/${encodeURIComponent(userId)}`, {
      headers: { token: ctx.accessToken },
      ...(signal && { signal }),
    });
    body = response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) throw new SessionRejectedError();
    throw mapTransportError(error);
  }

  try {
    return mapSessionProfile(decodeUserReadResponse(body));
  } catch {
    throw new AppError('decode');
  }
}
