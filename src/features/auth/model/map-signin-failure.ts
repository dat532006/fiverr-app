import { mapTransportError } from '../../../infrastructure/http/map-transport-error';
import { AppError } from '../../../shared/models/app-error';
import { SigninDecodeError } from '../api/signin.dto';

// `rejected`: the server answered with something other than success or a server fault.
// The invalid-credential response is UNKNOWN (Q-E02-1), so every such response is one
// generic failure that names no field and claims no cause. `failed`: a fault with fixed
// copy of its own (server, network, timeout, configuration, decode).
export type SigninFailure =
  Readonly<{ kind: 'rejected' }> | Readonly<{ kind: 'failed'; error: AppError }>;

export function classifySigninFailure(error: unknown): SigninFailure {
  if (error instanceof SigninDecodeError) return { kind: 'failed', error: new AppError('decode') };
  const mapped = error instanceof AppError ? error : mapTransportError(error);
  if (mapped.kind === 'forbidden' || mapped.kind === 'unknown') return { kind: 'rejected' };
  return { kind: 'failed', error: mapped };
}
