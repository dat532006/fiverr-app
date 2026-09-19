declare const brand: unique symbol;

type Branded<Tag extends string> = string & { readonly [brand]: Tag };

export type UserId = Branded<'UserId'>;

// Called only where a user identity is decoded from its own provenanced field: the E02
// `content.user.id` mapper, the E39 `content.id` mapper, and the strict session-snapshot
// decoder (whose value stays untrusted until E50 admission and E39 consistency). Never
// from a creator id, hire id or any other numeric field. Rejects anything that is not a
// positive safe integer instead of minting an unusable identity.
export function toUserId(raw: number): UserId {
  if (!Number.isSafeInteger(raw) || raw <= 0) {
    throw new RangeError('A user id must be a positive safe integer.');
  }
  return String(raw) as UserId;
}
