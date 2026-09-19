import type { AxiosInstance } from 'axios';
import { mapTransportError } from '../../../infrastructure/http/map-transport-error';
import { AppError } from '../../../shared/models/app-error';
import {
  SessionRejectedError,
  StaleSessionError,
  type SessionRequestContext,
} from '../../auth/public';
import { decodeMyHiresAdmission, type MineAdmission } from './my-hires-admission.dto';
import { getMyHires } from './my-hires.endpoint';

type ReadMineAdmissionOptions = Readonly<{
  client?: AxiosInstance | undefined;
  signal?: AbortSignal | undefined;
}>;

// E50 as the session-admission probe. Resolves only for an envelope with array `content`.
// Rejects with SessionRejectedError (HTTP 401), StaleSessionError (nothing sent) or an
// AppError; a 403 stays `forbidden`, never "signed out".
export async function readMineAdmission(
  ctx: SessionRequestContext,
  options: ReadMineAdmissionOptions = {},
): Promise<MineAdmission> {
  let body: unknown;
  try {
    body = await getMyHires(ctx, options);
  } catch (error) {
    if (error instanceof SessionRejectedError || error instanceof StaleSessionError) throw error;
    throw mapTransportError(error);
  }
  try {
    return decodeMyHiresAdmission(body);
  } catch {
    throw new AppError('decode');
  }
}
