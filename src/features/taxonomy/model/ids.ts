declare const brand: unique symbol;

type Branded<Tag extends string> = string & { readonly [brand]: Tag };

export type TopCategoryId = Branded<'TopCategoryId'>;
export type GroupId = Branded<'GroupId'>;
export type DetailCategoryId = Branded<'DetailCategoryId'>;

// Each factory is called only at the mapper site matching its DTO field, so tier is
// always determined by provenance (which field it was decoded from), never inferred
// from the raw numeric value — required because the same numeric id can legitimately
// appear at more than one tier in the taxonomy tree.
export function toTopCategoryId(raw: number): TopCategoryId {
  return String(raw) as TopCategoryId;
}

export function toGroupId(raw: number): GroupId {
  return String(raw) as GroupId;
}

export function toDetailCategoryId(raw: number): DetailCategoryId {
  return String(raw) as DetailCategoryId;
}
