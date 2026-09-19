import { toUserId, type UserId } from '../../../shared/models/user-id';
import { SigninDecodeError, type SigninUserDto } from '../api/signin.dto';
import type { SafeIdentity, SessionRole } from './session';

export function toSessionRole(raw: string): SessionRole {
  return raw === 'USER' || raw === 'ADMIN' ? raw : 'UNKNOWN';
}

// UserId mint site 1 of 3: E02 `content.user.id`. `password` and every other user field
// stay behind: the safe identity is only id, role and display name.
export function mapSigninIdentity(user: SigninUserDto): SafeIdentity {
  let userId: UserId;
  try {
    userId = toUserId(user.id);
  } catch {
    throw new SigninDecodeError();
  }
  return { userId, role: toSessionRole(user.role), displayName: user.name };
}
