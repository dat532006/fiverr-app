declare const brand: unique symbol;

type Branded<Tag extends string> = string & { readonly [brand]: Tag };

export type JobId = Branded<'JobId'>;

// Called only at the mapper site decoding the job's own `id` field, so a JobId
// is never produced from an unrelated numeric field (creator id, category id).
export function toJobId(raw: number): JobId {
  return String(raw) as JobId;
}
