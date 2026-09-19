import type { UserId } from '../../../shared/models/user-id';

export type SessionStatus =
  'booting' | 'anonymous' | 'restoring' | 'authenticated' | 'restore-unavailable' | 'expired';

// `signing-out` completes synchronously, so it is never observable between renders; it is
// part of the vocabulary so a future asynchronous sign-out cannot be double-entered.
export type SessionPhase = 'idle' | 'signing-in' | 'signing-out';

// An unrecognised role stays UNKNOWN. It is never defaulted to USER or ADMIN.
export type SessionRole = 'USER' | 'ADMIN' | 'UNKNOWN';

export type PersistenceMode = 'session-storage' | 'memory-only';

export interface SafeIdentity {
  readonly userId: UserId;
  readonly role: SessionRole;
  readonly displayName: string;
}

// What display code may read. It deliberately has no token.
export interface SessionView {
  readonly status: SessionStatus;
  readonly phase: SessionPhase;
  readonly identity: SafeIdentity | null;
  readonly persistence: PersistenceMode;
}

// Captured once per command by whoever sends a user-token request. `isCurrent()` is
// re-checked immediately before sending so a request from session A never leaves after
// session B started.
export interface SessionRequestContext {
  readonly userId: UserId;
  readonly accessToken: string;
  readonly epoch: number;
  isCurrent(): boolean;
}
