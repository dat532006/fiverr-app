import type { DetailCategoryId, GroupId, TopCategoryId } from '../../features/taxonomy/public';
import type { JobId } from '../../features/jobs/public';

export function categoryPath(topCategoryId: TopCategoryId): string {
  return `/category/${topCategoryId}`;
}

export function categoryGroupPath(topCategoryId: TopCategoryId, groupId: GroupId): string {
  return `/category/${topCategoryId}/group/${groupId}`;
}

export function categoryGroupDetailPath(
  topCategoryId: TopCategoryId,
  groupId: GroupId,
  detailCategoryId: DetailCategoryId,
): string {
  return `/category/${topCategoryId}/group/${groupId}/detail/${detailCategoryId}`;
}

export function jobPath(jobId: JobId): string {
  return `/job/${jobId}`;
}
