declare const brand: unique symbol;

type Branded<Tag extends string> = string & { readonly [brand]: Tag };

export type HireId = Branded<'HireId'>;

// Declared here for the later hire-display consumer. It is intentionally not called by
// session admission: the E50 admission projection inspects only the envelope and array.
export function toHireId(raw: number): HireId {
  if (!Number.isSafeInteger(raw) || raw <= 0) {
    throw new RangeError('A hire id must be a positive safe integer.');
  }
  return String(raw) as HireId;
}
