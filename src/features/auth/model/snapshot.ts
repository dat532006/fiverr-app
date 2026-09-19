import { toUserId, type UserId } from '../../../shared/models/user-id';
import type { SessionRole } from './session';

const SNAPSHOT_VERSION = 1;
const ROLES: readonly SessionRole[] = ['USER', 'ADMIN', 'UNKNOWN'];
const ALLOWED_KEYS: readonly string[] = ['v', 'token', 'userId', 'role', 'exp'];

// Exactly what is persisted: nothing about the password, the user record or any cache.
export interface SessionSnapshot {
  readonly token: string;
  readonly userId: UserId;
  readonly role: SessionRole;
  readonly exp?: number;
}

export function encodeSnapshot(snapshot: SessionSnapshot): string {
  return JSON.stringify({
    v: SNAPSHOT_VERSION,
    token: snapshot.token,
    userId: Number(snapshot.userId),
    role: snapshot.role,
    ...(snapshot.exp !== undefined && { exp: snapshot.exp }),
  });
}

function isRole(value: unknown): value is SessionRole {
  return ROLES.some((role) => role === value);
}

// The stored string is untrusted input (tampering, another version, corruption). Anything
// that is not exactly the v1 shape is rejected as a whole; there is no repair. UserId mint
// site 3 of 3: the decoded `userId` stays untrusted until E50 admission and E39 consistency.
export function decodeSnapshot(raw: string): SessionSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  if (Object.keys(parsed).some((key) => !ALLOWED_KEYS.includes(key))) return null;

  const { v, token, userId, role, exp } = parsed as Record<string, unknown>;
  if (v !== SNAPSHOT_VERSION) return null;
  if (typeof token !== 'string' || token.length === 0) return null;
  if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) return null;
  if (!isRole(role)) return null;
  if (exp !== undefined && (typeof exp !== 'number' || !Number.isFinite(exp))) return null;

  return {
    token,
    userId: toUserId(userId),
    role,
    ...(exp !== undefined && { exp }),
  };
}
