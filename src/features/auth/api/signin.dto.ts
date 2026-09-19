export class SigninDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu đăng nhập.');
    this.name = 'SigninDecodeError';
  }
}

// Allowlisted E02 `content.user`. The wire record also carries `password` (never read),
// `skill`, `certification` and `bookingJob` (never spread into the model).
export interface SigninUserDto {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly email?: string;
  readonly phone?: string;
  readonly birthday?: string;
  readonly avatar?: string;
  readonly gender?: boolean;
}

// `token` is handed to the session controller only. It never enters a query key or cache.
export interface SigninDto {
  readonly user: SigninUserDto;
  readonly token: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new SigninDecodeError();
  return value;
}

function decodeUser(input: unknown): SigninUserDto {
  if (!isRecord(input)) throw new SigninDecodeError();
  const { id, name, role, gender } = input;
  if (typeof id !== 'number' || !Number.isFinite(id)) throw new SigninDecodeError();
  if (typeof name !== 'string' || typeof role !== 'string') throw new SigninDecodeError();
  if (gender !== undefined && gender !== null && typeof gender !== 'boolean') {
    throw new SigninDecodeError();
  }
  const email = optionalString(input, 'email');
  const phone = optionalString(input, 'phone');
  const birthday = optionalString(input, 'birthday');
  const avatar = optionalString(input, 'avatar');

  return {
    id,
    name,
    role,
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(birthday !== undefined && { birthday }),
    ...(avatar !== undefined && { avatar }),
    ...(typeof gender === 'boolean' && { gender }),
  };
}

export function decodeSigninResponse(input: unknown): SigninDto {
  if (!isRecord(input) || !isRecord(input['content'])) throw new SigninDecodeError();
  const { user, token } = input['content'];
  if (typeof token !== 'string' || token.length === 0) throw new SigninDecodeError();
  return { user: decodeUser(user), token };
}
