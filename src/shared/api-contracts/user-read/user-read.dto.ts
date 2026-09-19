export class UserReadDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu người dùng.');
    this.name = 'UserReadDecodeError';
  }
}

// Allowlisted projection of the E39 `content` user record. The wire record also carries
// `password`, `skill`, `certification` and `bookingJob`: none of them is ever read out of
// the payload. This decoder returns a DTO and mints no semantic ID; the owning mapper
// (`profile/api`) converts `id` to a `UserId`.
export interface UserReadDto {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly email?: string;
  readonly phone?: string;
  readonly birthday?: string;
  readonly avatar?: string;
  readonly gender?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A missing or null optional field is simply absent; a present field of the wrong type is
// a decode failure. `birthday` is preserved verbatim (never timezone-shifted).
function optionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new UserReadDecodeError();
  return value;
}

function optionalBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw new UserReadDecodeError();
  return value;
}

export function decodeUserReadResponse(input: unknown): UserReadDto {
  if (!isRecord(input) || !isRecord(input['content'])) {
    throw new UserReadDecodeError();
  }
  const user = input['content'];
  const { id, name, role } = user;
  if (typeof id !== 'number' || !Number.isFinite(id)) throw new UserReadDecodeError();
  if (typeof name !== 'string' || typeof role !== 'string') throw new UserReadDecodeError();

  const email = optionalString(user, 'email');
  const phone = optionalString(user, 'phone');
  const birthday = optionalString(user, 'birthday');
  const avatar = optionalString(user, 'avatar');
  const gender = optionalBoolean(user, 'gender');

  return {
    id,
    name,
    role,
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(birthday !== undefined && { birthday }),
    ...(avatar !== undefined && { avatar }),
    ...(gender !== undefined && { gender }),
  };
}
