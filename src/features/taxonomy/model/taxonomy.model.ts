import type { DetailCategoryId, GroupId, TopCategoryId } from './ids';

export interface DetailCategory {
  readonly id: DetailCategoryId;
  readonly name: string;
}

// A detail category can legitimately belong to more than one group; each
// membership is its own occurrence rather than a single deduped entity.
export interface DetailCategoryOccurrence {
  readonly detail: DetailCategory;
  readonly parentGroupId: GroupId;
  readonly parentTopCategoryId: TopCategoryId;
}

export interface Group {
  readonly id: GroupId;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly details: readonly DetailCategoryOccurrence[];
}

export interface TopCategory {
  readonly id: TopCategoryId;
  readonly name: string;
  readonly groups: readonly Group[];
}

export type TaxonomyMenu = readonly TopCategory[];
