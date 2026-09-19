import { SessionRejectedError, type RestoreSession } from '../../features/auth/public';
import { readMineAdmission } from '../../features/hires/public';
import { readProfileForSession } from '../../features/profile/public';

// App owns the cross-feature sequence and interprets its combined result. Auth receives
// only a session outcome to publish under its captured epoch, never individual reads.
export function createRestoreSession(
  readAdmission: typeof readMineAdmission = readMineAdmission,
  readProfile: typeof readProfileForSession = readProfileForSession,
): RestoreSession {
  return async (ctx, expectedRole) => {
    try {
      if (!ctx.isCurrent()) return { kind: 'stale' };
      await readAdmission(ctx);
      if (!ctx.isCurrent()) return { kind: 'stale' };
      const profile = await readProfile(ctx.userId, ctx);
      if (!ctx.isCurrent()) return { kind: 'stale' };
      if (profile.userId !== ctx.userId || profile.role !== expectedRole) {
        return { kind: 'rejected' };
      }
      return { kind: 'completed', displayName: profile.displayName };
    } catch (error) {
      if (!ctx.isCurrent()) return { kind: 'stale' };
      return { kind: error instanceof SessionRejectedError ? 'expired' : 'unavailable' };
    }
  };
}
