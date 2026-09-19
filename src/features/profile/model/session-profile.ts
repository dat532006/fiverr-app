import type { UserReadDto } from '../../../shared/api-contracts/user-read/user-read.dto';
import { toUserId, type UserId } from '../../../shared/models/user-id';
import type { SessionRole } from '../../auth/public';

// The only identity facts a session restore consumes. No password, token, email or
// `bookingJob`: none of them is copied from the wire record.
export interface SessionProfile {
  readonly userId: UserId;
  readonly role: SessionRole;
  readonly displayName: string;
}

// An unrecognised role is UNKNOWN, never defaulted to USER or ADMIN. Mirrors the E02
// mapping so a snapshot role and an E39 role are compared under the same rule.
function toSessionRole(raw: string): SessionRole {
  return raw === 'USER' || raw === 'ADMIN' ? raw : 'UNKNOWN';
}

// UserId mint site 2 of 3: E39 `content.id`. Throws RangeError for anything that is not a
// positive safe integer; the caller reports that as a decode failure.
export function mapSessionProfile(dto: UserReadDto): SessionProfile {
  return {
    userId: toUserId(dto.id),
    role: toSessionRole(dto.role),
    displayName: dto.name,
  };
}
