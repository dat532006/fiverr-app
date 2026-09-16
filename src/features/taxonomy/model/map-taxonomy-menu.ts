import type { DetailCategoryDto, GroupDto, TopCategoryDto } from '../api/taxonomy-menu.dto';
import { toDetailCategoryId, toGroupId, toTopCategoryId } from './ids';
import type {
  DetailCategory,
  DetailCategoryOccurrence,
  Group,
  TaxonomyMenu,
  TopCategory,
} from './taxonomy.model';

function parseImageUrl(hinhAnh: string): string | null {
  if (!hinhAnh) return null;
  try {
    const url = new URL(hinhAnh);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return hinhAnh;
  } catch {
    return null;
  }
}

function mapDetail(dto: DetailCategoryDto): DetailCategory {
  return { id: toDetailCategoryId(dto.id), name: dto.tenChiTiet };
}

// Maps each group's details independently (never through a single cross-tree
// id-keyed map), so a detail shared by multiple groups stays multiple occurrences.
function mapGroup(dto: GroupDto, parentTopCategoryId: TopCategory['id']): Group {
  const groupId = toGroupId(dto.id);
  return {
    id: groupId,
    name: dto.tenNhom,
    imageUrl: parseImageUrl(dto.hinhAnh),
    details: dto.dsChiTietLoai.map((detailDto): DetailCategoryOccurrence => ({
      detail: mapDetail(detailDto),
      parentGroupId: groupId,
      parentTopCategoryId,
    })),
  };
}

function mapTop(dto: TopCategoryDto): TopCategory {
  const topId = toTopCategoryId(dto.id);
  return {
    id: topId,
    name: dto.tenLoaiCongViec,
    groups: dto.dsNhomChiTietLoai.map((groupDto) => mapGroup(groupDto, topId)),
  };
}

export function mapTaxonomyMenu(dtos: readonly TopCategoryDto[]): TaxonomyMenu {
  return dtos.map(mapTop);
}
