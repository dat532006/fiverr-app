import type { Group, TaxonomyMenuData, TopCategoryId } from '../../taxonomy/public';

export interface FlattenedGroup {
  readonly group: Group;
  readonly parentTopCategoryId: TopCategoryId;
}

export function flattenGroups(menu: TaxonomyMenuData): readonly FlattenedGroup[] {
  return menu.flatMap((top) =>
    top.groups.map((group): FlattenedGroup => ({ group, parentTopCategoryId: top.id })),
  );
}
